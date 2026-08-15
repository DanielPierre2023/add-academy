/**
 * Mastery-based stage progression logic.
 *
 * Determines whether a student has demonstrated sufficient mastery
 * of a stage's content to proceed. This is separate from subscription
 * access (handled by auth-context) — a user might have paid access
 * to Stage 5 but still benefit from mastery feedback on Stage 4.
 *
 * Thresholds:
 *   - 80% of stage lectures completed
 *   - Average quiz score >= 70% across attempted quizzes in the stage
 *   - At least 1 code block run per lecture (for lectures with code)
 */

import { STAGES } from '@/types';
import type { LectureProgress } from '@/types';
import { getLectureIndex } from './lectures';

/** Minimum percentage of lectures that must be completed */
const LECTURE_COMPLETION_THRESHOLD = 0.8;

/** Minimum average quiz score (0-100) to demonstrate mastery */
const QUIZ_SCORE_THRESHOLD = 70;

export interface StageMastery {
  stageNumber: number;
  /** Overall mastery achieved (true if all criteria met) */
  mastered: boolean;
  /** Fraction of lectures completed (0-1) */
  lectureCompletion: number;
  /** Average quiz score across attempted quizzes (0-100, null if none attempted) */
  averageQuizScore: number | null;
  /** Number of lectures with at least one code block run */
  lecturesWithCodeRun: number;
  /** Total lectures in the stage */
  totalLectures: number;
  /** Human-readable summary of what's needed */
  nextStep: string | null;
}

/**
 * Evaluate mastery for a given stage based on student progress.
 */
export function evaluateStageMastery(
  stageNumber: number,
  progress: Record<string, LectureProgress>,
  quizScores: Record<string, number>
): StageMastery {
  const stage = STAGES.find((s) => s.number === stageNumber);
  if (!stage) {
    return {
      stageNumber,
      mastered: false,
      lectureCompletion: 0,
      averageQuizScore: null,
      lecturesWithCodeRun: 0,
      totalLectures: 0,
      nextStep: 'Stage not found',
    };
  }

  const lectures = stage.lectures;
  const totalLectures = lectures.length;

  // Count completed lectures
  const completedCount = lectures.filter(
    (id) => progress[id]?.completed
  ).length;
  const lectureCompletion = totalLectures > 0 ? completedCount / totalLectures : 1;

  // Calculate average quiz score
  const quizScoreValues = lectures
    .map((id) => quizScores[id])
    .filter((score): score is number => score !== undefined);
  const averageQuizScore =
    quizScoreValues.length > 0
      ? Math.round(quizScoreValues.reduce((a, b) => a + b, 0) / quizScoreValues.length)
      : null;

  // Informational only — reported in the summary but NOT part of the mastery
  // decision (in-browser code runs are a weak, easily-skipped signal). Kept so
  // the overview can show engagement without pretending it gates progress.
  const lecturesWithCodeRun = lectures.filter(
    (id) => (progress[id]?.codeBlocksRun?.length ?? 0) > 0
  ).length;

  // W3.3: a stage "expects" quizzes if any of its lectures has one. If it does,
  // skipping every quiz (averageQuizScore === null) must NOT count as mastery.
  // The old `averageQuizScore === null || …` short-circuit let a learner
  // "master" a stage without ever taking a single quiz.
  const idx = getLectureIndex();
  const expectsQuiz = lectures.some(
    (id) => idx.lectures.find((l) => l.id === id)?.hasQuiz === true
  );

  const lecturesMet = lectureCompletion >= LECTURE_COMPLETION_THRESHOLD;
  const quizMet = expectsQuiz
    ? averageQuizScore !== null && averageQuizScore >= QUIZ_SCORE_THRESHOLD
    : true;

  const mastered = lecturesMet && quizMet;

  // Determine next step
  let nextStep: string | null = null;
  if (!lecturesMet) {
    const needed = Math.ceil(totalLectures * LECTURE_COMPLETION_THRESHOLD) - completedCount;
    nextStep = `Complete ${needed} more lecture${needed === 1 ? '' : 's'} in this stage`;
  } else if (expectsQuiz && averageQuizScore === null) {
    nextStep = 'Take at least one quiz in this stage to confirm mastery';
  } else if (!quizMet && averageQuizScore !== null) {
    nextStep = `Improve quiz average to ${QUIZ_SCORE_THRESHOLD}% (currently ${averageQuizScore}%)`;
  }

  return {
    stageNumber,
    mastered,
    lectureCompletion,
    averageQuizScore,
    lecturesWithCodeRun,
    totalLectures,
    nextStep,
  };
}

/**
 * Check if a student has mastered all previous stages before a given stage.
 * Stages 0 and 1 are always considered mastered (they're introductory).
 */
export function hasMasteredPreviousStages(
  targetStage: number,
  progress: Record<string, LectureProgress>,
  quizScores: Record<string, number>
): { ready: boolean; blockingStage: StageMastery | null } {
  // Stages 0 and 1 have no prerequisites
  if (targetStage <= 1) return { ready: true, blockingStage: null };

  // Check each stage from 2 to targetStage - 1
  for (let s = 2; s < targetStage; s++) {
    const mastery = evaluateStageMastery(s, progress, quizScores);
    if (!mastery.mastered) {
      return { ready: false, blockingStage: mastery };
    }
  }

  return { ready: true, blockingStage: null };
}

/**
 * Get a mastery summary for all stages — useful for the course overview.
 */
export function getAllStageMastery(
  progress: Record<string, LectureProgress>,
  quizScores: Record<string, number>
): StageMastery[] {
  return STAGES.map((stage) =>
    evaluateStageMastery(stage.number, progress, quizScores)
  );
}
