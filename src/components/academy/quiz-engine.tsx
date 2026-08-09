'use client';

import { useState, useCallback } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import { CheckCircle2, RotateCcw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Confetti } from '@/components/gamification/confetti';
import { showXPToast } from '@/components/gamification/xp-toast';
import { XP_VALUES } from '@/types';

interface Question {
  index: number;
  text: string;
  options: string[];
  correct: number[];
  explanation: string;
  isMulti: boolean;
}

interface QuizEngineProps {
  quiz: { questions: Question[] };
  lectureId: string;
}

export function QuizEngine({ quiz, lectureId }: QuizEngineProps) {
  const { language, quizScores, setQuizScore, updateProgress, awardXP } =
    useAcademyStore();
  const lang = language as Language;

  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number[]>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const existingScore = quizScores[lectureId];

  const toggleOption = useCallback(
    (questionIndex: number, optionIndex: number, isMulti: boolean) => {
      if (submitted) return;

      setSelectedAnswers((prev) => {
        const current = prev[questionIndex] || [];

        if (isMulti) {
          // Toggle for multi-select
          if (current.includes(optionIndex)) {
            return {
              ...prev,
              [questionIndex]: current.filter((i) => i !== optionIndex),
            };
          }
          return {
            ...prev,
            [questionIndex]: [...current, optionIndex],
          };
        }

        // Single select - replace
        return {
          ...prev,
          [questionIndex]: [optionIndex],
        };
      });
    },
    [submitted]
  );

  const handleSubmit = useCallback(() => {
    let correct = 0;
    const total = quiz.questions.length;

    quiz.questions.forEach((question) => {
      const selected = selectedAnswers[question.index] || [];
      const expected = question.correct;

      const isCorrect =
        selected.length === expected.length &&
        selected.every((s) => expected.includes(s)) &&
        expected.every((e) => selected.includes(e));

      if (isCorrect) correct++;
    });

    const calculatedScore = Math.round((correct / total) * 100);
    setScore(calculatedScore);
    setSubmitted(true);
    setQuizScore(lectureId, calculatedScore);
    updateProgress(lectureId, { quizScore: calculatedScore, quizAttempted: true });

    // Award XP
    const baseXP = XP_VALUES.QUIZ_BASE;
    const scoreXP = Math.round(calculatedScore * XP_VALUES.QUIZ_SCORE_MULTIPLIER);
    let totalXP = baseXP + scoreXP;

    const result = awardXP('quiz', totalXP, lectureId);

    // Perfect score bonus
    if (calculatedScore === 100) {
      const bonusResult = awardXP('quiz_perfect', XP_VALUES.QUIZ_PERFECT_BONUS, lectureId);
      totalXP += XP_VALUES.QUIZ_PERFECT_BONUS;
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);

      showXPToast({
        amount: totalXP,
        type: 'quiz_perfect',
        achievements: [...result.newAchievements, ...bonusResult.newAchievements],
        levelUp: bonusResult.leveledUp ? bonusResult.newLevel : result.leveledUp ? result.newLevel : undefined,
      });
    } else {
      showXPToast({
        amount: totalXP,
        type: 'quiz',
        achievements: result.newAchievements,
        levelUp: result.leveledUp ? result.newLevel : undefined,
      });
    }

    setXpEarned(totalXP);
  }, [
    quiz.questions,
    selectedAnswers,
    lectureId,
    setQuizScore,
    updateProgress,
    awardXP,
  ]);

  const handleReset = useCallback(() => {
    setSelectedAnswers({});
    setSubmitted(false);
    setScore(null);
  }, []);

  const isQuestionCorrect = (question: Question): boolean => {
    const selected = selectedAnswers[question.index] || [];
    const expected = question.correct;
    return (
      selected.length === expected.length &&
      selected.every((s) => expected.includes(s)) &&
      expected.every((e) => selected.includes(e))
    );
  };

  const isOptionCorrect = (question: Question, optionIndex: number): boolean => {
    return question.correct.includes(optionIndex);
  };

  const isOptionSelected = (
    questionIndex: number,
    optionIndex: number
  ): boolean => {
    return (selectedAnswers[questionIndex] || []).includes(optionIndex);
  };

  return (
    <div className="space-y-6">
      {/* Previous score */}
      {existingScore !== undefined && !submitted && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardContent className="flex items-center justify-between py-3">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {t('quiz_score', lang)}: {existingScore}%
            </span>
            <Badge variant="secondary">{t('quiz_title', lang)}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      {quiz.questions.map((question) => {
        const qCorrect = submitted && isQuestionCorrect(question);
        const qIncorrect = submitted && !isQuestionCorrect(question);

        return (
          <Card
            key={question.index}
            className={cn(
              'transition-colors',
              qCorrect && 'border-green-300 dark:border-green-800',
              qIncorrect && 'border-red-300 dark:border-red-800'
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-medium leading-relaxed">
                  <span className="text-muted-foreground mr-2">
                    {question.index + 1}.
                  </span>
                  {question.text}
                </CardTitle>
                {submitted && (
                  <Badge
                    variant={qCorrect ? 'default' : 'destructive'}
                    className={cn(
                      'shrink-0',
                      qCorrect && 'bg-green-600'
                    )}
                  >
                    {qCorrect
                      ? t('quiz_correct', lang)
                      : t('quiz_incorrect', lang)}
                  </Badge>
                )}
              </div>
              {question.isMulti && !submitted && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('quiz_select_all', lang)}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {question.options.map((option, optIdx) => {
                const selected = isOptionSelected(question.index, optIdx);
                const correct = isOptionCorrect(question, optIdx);

                let optionStyle = '';
                if (submitted) {
                  if (correct && selected) {
                    optionStyle =
                      'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200';
                  } else if (correct && !selected) {
                    optionStyle =
                      'border-green-300 bg-green-50/50 dark:bg-green-950/20 text-green-700 dark:text-green-300';
                  } else if (!correct && selected) {
                    optionStyle =
                      'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200';
                  }
                } else if (selected) {
                  optionStyle =
                    'border-primary bg-primary/5 ring-1 ring-primary/20';
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() =>
                      toggleOption(question.index, optIdx, question.isMulti)
                    }
                    disabled={submitted}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-lg border transition-all',
                      'hover:bg-muted/50 disabled:cursor-default',
                      !submitted && !selected && 'border-border',
                      optionStyle
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-sm">{option}</span>
                      {submitted && correct && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Explanation */}
              {submitted && question.explanation && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                    {t('quiz_explanation', lang)}
                  </p>
                  <p className="text-sm leading-relaxed">
                    {question.explanation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Score & Actions */}
      {submitted && score !== null && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'text-3xl font-bold',
                  score >= 70 ? 'text-green-600' : 'text-orange-500'
                )}
              >
                {score}%
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  {t('quiz_score', lang)}
                </div>
                {xpEarned > 0 && (
                  <div className="flex items-center gap-1 text-xs text-secondary font-bold mt-0.5">
                    <Star className="h-3 w-3" />
                    +{xpEarned} XP
                  </div>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('quiz_reset', lang)}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confetti for perfect score */}
      <Confetti active={showConfetti} />

      {/* Submit Button */}
      {!submitted && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={Object.keys(selectedAnswers).length === 0}
          >
            {t('quiz_submit', lang)}
          </Button>
        </div>
      )}
    </div>
  );
}
