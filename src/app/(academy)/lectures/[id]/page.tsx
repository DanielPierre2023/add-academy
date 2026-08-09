import type { Metadata } from 'next';
import { getLectureContent, getQuizData, getLectureIndex, getStageForLecture } from '@/lib/lectures';
import { LectureViewer } from '@/components/academy/lecture-viewer';
import { ContentGate } from '@/components/academy/content-gate';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { STAGES } from '@/types';

const BASE_URL = 'https://academy.add-individual-solutions.com';

/**
 * Dynamic OG metadata per lecture — improves SEO and social sharing.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const index = getLectureIndex();
  const entry = index.lectures.find((l) => l.id === id);
  if (!entry) return {};

  const title = entry.title.en || `Lecture ${entry.number}`;
  const stageLabel = entry.stageName || `Stage ${entry.stage}`;

  return {
    title,
    description: `${stageLabel} — ${title}. Interactive lecture with ${entry.codeBlockCount} code blocks${entry.hasQuiz ? ' and quiz' : ''}. Part of ADD Academy's LLM course.`,
    openGraph: {
      title: `${title} | ADD Academy`,
      description: `${stageLabel} — Learn ${title.toLowerCase()} with hands-on code examples and interactive exercises.`,
      url: `${BASE_URL}/lectures/${id}`,
      type: 'article',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ADD Academy`,
      description: `${stageLabel} — Interactive lecture with ${entry.codeBlockCount} code blocks.`,
    },
  };
}

/**
 * Server-side auth check — best-effort only.
 * Returns true when the user is authenticated AND has access to the given stage.
 * Returns false when unauthenticated, unsubscribed, or when cookie-based auth
 * is unavailable (common with PKCE flow). A false result does NOT mean the user
 * is unauthorized — ContentGate performs the authoritative client-side check.
 *
 * Now that the OAuth callback route properly sets cookies, this check is
 * reliable for users who signed in via Google OAuth. It remains best-effort
 * for edge cases where cookies are unavailable.
 */
async function isAuthenticatedForStage(stageNumber: number): Promise<boolean> {
  if (stageNumber <= 1) return true;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Org users get full access
    const { data: student } = await supabase
      .from('academy_students')
      .select('school_id, org_role')
      .eq('id', user.id)
      .single();

    if (student?.school_id) return true;

    // Check active subscription
    const { data: subs } = await supabase
      .from('academy_subscriptions')
      .select('tier, unlocked_stages, current_period_end, status')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const sub = subs?.[0];
    if (!sub) return false;

    if (sub.current_period_end && sub.current_period_end < new Date().toISOString()) return false;

    switch (sub.tier) {
      case 'full_access':
      case 'llm_course':
        return true;
      case 'stage':
        return (sub.unlocked_stages as number[] || []).includes(stageNumber);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Strip quiz answers so unauthorized users cannot extract correct answers
 * from the network response (RSC payload / dev tools).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripQuizAnswers(quiz: any): any {
  if (!quiz) return null;
  const stripped = { ...quiz };
  for (const lang of ['en', 'ro', 'el']) {
    if (stripped[lang]?.questions && Array.isArray(stripped[lang].questions)) {
      stripped[lang] = {
        ...stripped[lang],
        questions: stripped[lang].questions.map((q: Record<string, unknown>) => ({
          ...q,
          correct: [],
          explanation: '',
        })),
      };
    }
  }
  return stripped;
}

/**
 * Create a content teaser from full lecture HTML.
 * Extracts the first ~800 characters, cutting at a paragraph boundary,
 * preserving the lecture header structure for consistent layout.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createContentTeaser(content: any): any {
  if (!content) return null;
  const teaser = { ...content };

  for (const lang of ['en', 'ro', 'el']) {
    const html = teaser[lang];
    if (typeof html !== 'string') continue;

    // Find a reasonable cut point: after the 3rd closing </p> or </div>
    // that appears after at least 400 characters
    const tagPattern = /<\/(?:p|div|section|h[1-6])>/gi;
    let match: RegExpExecArray | null;
    let cutIndex = -1;
    let tagCount = 0;

    while ((match = tagPattern.exec(html)) !== null) {
      tagCount++;
      if (match.index >= 400 && tagCount >= 3) {
        cutIndex = match.index + match[0].length;
        break;
      }
    }

    // If we couldn't find a good cut point, cut at 800 chars at last tag
    if (cutIndex === -1) {
      const fallbackMatch = html.substring(0, 1200).match(/[\s\S]*<\/(?:p|div|section|h[1-6])>/);
      cutIndex = fallbackMatch ? fallbackMatch[0].length : Math.min(html.length, 800);
    }

    teaser[lang] = html.substring(0, cutIndex);
  }

  return teaser;
}

export default async function LecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const index = getLectureIndex();
  const entry = index.lectures.find((l) => l.id === id);
  if (!entry) notFound();

  const [content, quiz] = await Promise.all([
    getLectureContent(id),
    getQuizData(id),
  ]);
  if (!content) notFound();

  const stage = getStageForLecture(id);
  const stageNumber = stage?.number ?? (STAGES.length > 0 ? STAGES[STAGES.length - 1].number : 0);
  const hasServerAuth = await isAuthenticatedForStage(stageNumber);

  // Server-side content gating (defense-in-depth):
  // For premium stages, only send a teaser to unauthenticated users.
  // ContentGate handles the visual lock screen; this prevents HTML extraction
  // from the RSC payload via dev tools.
  // Stages 0-1 always get full content (they're free).
  const safeContent = (stageNumber <= 1 || hasServerAuth) ? content : createContentTeaser(content);
  const safeQuiz = hasServerAuth ? quiz : stripQuizAnswers(quiz);

  return (
    <ContentGate lectureId={id}>
      <LectureViewer
        lectureId={id}
        content={safeContent}
        quiz={safeQuiz}
        prev={entry.prev ?? null}
        next={entry.next ?? null}
        hasQuiz={entry.hasQuiz ?? false}
      />
    </ContentGate>
  );
}
