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
    alternates: {
      canonical: `${BASE_URL}/lectures/${id}`,
    },
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
 * Server-side entitlement check — best-effort only.
 * Returns true when the user is authenticated AND has access to the given stage.
 * Returns false when unauthenticated, unsubscribed, or when cookie-based auth
 * is unavailable (common with PKCE flow). A false result does NOT mean the user
 * is unauthorized — ContentGate performs the client-side check as well.
 *
 * SECURITY (004_fix_entitlement_rls.sql): org access requires a VERIFIED school.
 * Previously this returned true for any non-null school_id, which — combined
 * with a permissive UPDATE policy that let users set their own school_id, and
 * an INSERT policy that let them create a school with verified=true — handed
 * the entire paid catalogue to any free account. Membership in a self-created
 * organisation must never be an entitlement.
 *
 * `verified` is read through the current_school_context() SECURITY DEFINER RPC
 * rather than a join, because academy_schools is deliberately no longer
 * readable by ordinary members (it carries invite_code, a bearer secret).
 */
async function isAuthenticatedForStage(stageNumber: number): Promise<boolean> {
  if (stageNumber <= 1) return true;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Org users get full access — but ONLY if their organisation is verified.
    const { data: schoolCtx } = await supabase.rpc('current_school_context');
    const school = Array.isArray(schoolCtx) ? schoolCtx[0] : schoolCtx;
    if (school?.school_id && school.verified === true) return true;

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

    // A null current_period_end means the webhook never recorded a period.
    // Treat that as EXPIRED, not unlimited — otherwise a cancelled subscription
    // whose status update also failed would grant perpetual access.
    if (!sub.current_period_end) return false;
    if (sub.current_period_end < new Date().toISOString()) return false;

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
 * Extracts the header and first paragraph only, preserving layout structure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createContentTeaser(content: any): any {
  if (!content) return null;
  const teaser = { ...content };

  for (const lang of ['en', 'ro', 'el']) {
    const html = teaser[lang];
    if (typeof html !== 'string') continue;

    // Extract only the title/header and first paragraph — nothing more.
    // This prevents scraping of premium content while giving a meaningful preview.
    const firstParagraph = html.match(/<p[^>]*>[\s\S]*?<\/p>/i);
    const header = html.match(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/i);

    let teaserHtml = '';
    if (header) teaserHtml += header[0];
    if (firstParagraph) teaserHtml += firstParagraph[0];

    // Fallback: first 200 characters if no tags found
    if (!teaserHtml) {
      teaserHtml = html.substring(0, 200);
    }

    // Strip any code blocks from the teaser — code IS the product
    teaserHtml = teaserHtml.replace(/<pre[\s\S]*?<\/pre>/gi, '');
    teaserHtml = teaserHtml.replace(/<code[\s\S]*?<\/code>/gi, '');

    teaser[lang] = teaserHtml;
  }

  // Also strip the codeBlocks JSON array — these contain the actual
  // Python/code content that students pay for.
  teaser.codeBlocks = [];

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
