import { getLectureContent, getQuizData, getLectureIndex, getStageForLecture } from '@/lib/lectures';
import { LectureViewer } from '@/components/academy/lecture-viewer';
import { ContentGate } from '@/components/academy/content-gate';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { STAGES } from '@/types';

/**
 * Server-side auth check — best-effort only.
 * Returns true when the user is authenticated AND has access to the given stage.
 * Returns false when unauthenticated, unsubscribed, or when cookie-based auth
 * is unavailable (common with PKCE flow). A false result does NOT mean the user
 * is unauthorized — ContentGate performs the authoritative client-side check.
 *
 * Used here ONLY to decide whether to include quiz answers in the response
 * (defense-in-depth against answer extraction via dev tools).
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
  // Strip answers from each language's questions
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

export default async function LecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const index = getLectureIndex();
  const entry = index.lectures.find((l) => l.id === id);
  if (!entry) notFound();

  // Always load full lecture content — layout must be identical for all lectures.
  // Access control (who can VIEW the content) is handled client-side by ContentGate,
  // which checks the user's auth state and subscription via the AuthProvider.
  const [content, quiz] = await Promise.all([
    getLectureContent(id),
    getQuizData(id),
  ]);
  if (!content) notFound();

  // Server-side quiz answer protection (defense-in-depth):
  // Strip correct answers from quiz data for unauthenticated/unauthorized users
  // so they can't extract answers from the RSC payload via dev tools.
  const stage = getStageForLecture(id);
  const stageNumber = stage?.number ?? (STAGES.length > 0 ? STAGES[STAGES.length - 1].number : 0);
  const hasServerAuth = await isAuthenticatedForStage(stageNumber);
  const safeQuiz = hasServerAuth ? quiz : stripQuizAnswers(quiz);

  return (
    <ContentGate lectureId={id}>
      <LectureViewer
        lectureId={id}
        content={content}
        quiz={safeQuiz}
        prev={entry.prev ?? null}
        next={entry.next ?? null}
        hasQuiz={entry.hasQuiz ?? false}
      />
    </ContentGate>
  );
}
