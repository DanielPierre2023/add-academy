import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getQuizData } from '@/lib/lectures';
import { z } from 'zod';

const QuizSubmissionSchema = z.object({
  lectureId: z.string().min(1).max(20),
  language: z.enum(['en', 'ro', 'el']),
  answers: z.record(
    z.string(), // question index as string
    z.array(z.number().int().min(0).max(10))
  ),
});

/**
 * POST /api/quiz — validate quiz answers server-side.
 *
 * Accepts: { lectureId, language, answers: { "0": [1], "1": [0, 2], ... } }
 * Returns: { results: { "0": { correct: true, explanation: "..." }, ... }, score, total }
 *
 * Requires authentication. Does NOT return correctAnswers to prevent leaking.
 */
export async function POST(request: NextRequest) {
  // Require authentication
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parsed = QuizSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 422 }
    );
  }

  const { lectureId, language, answers } = parsed.data;

  // Load quiz data server-side
  const quizData = await getQuizData(lectureId);
  if (!quizData) {
    return NextResponse.json(
      { error: 'Quiz not found for this lecture' },
      { status: 404 }
    );
  }

  const quiz = quizData[language] || quizData.en;
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return NextResponse.json(
      { error: 'No quiz questions available for this language' },
      { status: 404 }
    );
  }

  // Validate each answer — do NOT return correctAnswers
  const results: Record<
    string,
    { correct: boolean; explanation: string }
  > = {};
  let correctCount = 0;

  for (const question of quiz.questions) {
    const idx = String(question.index);
    const userAnswer = answers[idx] || [];
    const correctAnswers: number[] = question.correct;

    // Check if user's answers match exactly
    const isCorrect =
      userAnswer.length === correctAnswers.length &&
      userAnswer.every((a: number) => correctAnswers.includes(a)) &&
      correctAnswers.every((a: number) => userAnswer.includes(a));

    if (isCorrect) correctCount++;

    results[idx] = {
      correct: isCorrect,
      explanation: question.explanation || '',
    };
  }

  return NextResponse.json({
    results,
    score: correctCount,
    total: quiz.questions.length,
    percentage: Math.round((correctCount / quiz.questions.length) * 100),
  });
}
