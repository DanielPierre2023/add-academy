import { getLectureContent, getQuizData, getLectureIndex, getStageForLecture } from '@/lib/lectures';
import { LectureViewer } from '@/components/academy/lecture-viewer';
import { ContentGate } from '@/components/academy/content-gate';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { STAGES } from '@/types';

export async function generateStaticParams() {
  const index = getLectureIndex();
  return index.lectures
    .filter((l) => l.id !== 'home')
    .map((l) => ({ id: l.id }));
}

/**
 * Check whether a user can access a given stage, server-side.
 * Mirrors the logic in auth-context.tsx canAccessStage().
 */
async function canAccessStageServer(stageNumber: number): Promise<boolean> {
  // Stages 0 and 1 are always free
  if (stageNumber <= 1) return true;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if org user (full access)
    const { data: student } = await supabase
      .from('academy_students')
      .select('school_id, org_role')
      .eq('id', user.id)
      .single();

    if (student?.school_id) return true; // org users get full access

    // Check subscription
    const { data: subs } = await supabase
      .from('academy_subscriptions')
      .select('tier, unlocked_stages, current_period_end, status')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const sub = subs?.[0];
    if (!sub) return false;

    // Check expiry
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

/** Strip quiz answers from quiz data so clients cannot extract correct answers for locked content */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripQuizAnswers(quiz: any): any {
  if (!quiz) return null;
  const questions = quiz.questions;
  if (!Array.isArray(questions)) return quiz;
  return {
    ...quiz,
    questions: questions.map((q: Record<string, unknown>) => ({
      ...q,
      correct: [], // strip correct answers
      explanation: '', // strip explanations
    })),
  };
}

export default async function LecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const index = getLectureIndex();
  const entry = index.lectures.find((l) => l.id === id);
  if (!entry) notFound();

  // Determine the stage for this lecture
  const stage = getStageForLecture(id);
  const stageNumber = stage?.number ?? (STAGES.length > 0 ? STAGES[STAGES.length - 1].number : 0);

  // Server-side access check
  const hasAccess = await canAccessStageServer(stageNumber);

  if (hasAccess) {
    // Full access — load content and quiz with answers
    const [content, quiz] = await Promise.all([
      getLectureContent(id),
      getQuizData(id),
    ]);
    if (!content) notFound();

    return (
      <ContentGate lectureId={id}>
        <LectureViewer
          lectureId={id}
          content={content}
          quiz={quiz}
          prev={entry.prev ?? null}
          next={entry.next ?? null}
          hasQuiz={entry.hasQuiz ?? false}
        />
      </ContentGate>
    );
  }

  // No access — send only a teaser (first 200 chars of English content) and stripped quiz
  const content = await getLectureContent(id);
  const quiz = await getQuizData(id);

  const teaserContent = content
    ? {
        ...content,
        content: Object.fromEntries(
          Object.entries(content.content as Record<string, string>).map(([lang, html]) => {
            // Strip HTML to get plain text for teaser
            const plain = (html as string).replace(/<[^>]+>/g, '');
            const teaser = plain.slice(0, 200) + (plain.length > 200 ? '...' : '');
            return [lang, `<p class="text-muted-foreground">${teaser}</p>`];
          })
        ),
      }
    : null;

  if (!teaserContent) notFound();

  return (
    <ContentGate lectureId={id}>
      <LectureViewer
        lectureId={id}
        content={teaserContent}
        quiz={stripQuizAnswers(quiz)}
        prev={entry.prev ?? null}
        next={entry.next ?? null}
        hasQuiz={entry.hasQuiz ?? false}
      />
    </ContentGate>
  );
}
