'use client';

import { useState, Suspense, use } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { getLectureIndex, getQuizData } from '@/lib/lectures';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  Clock,
  Target,
  Eye,
} from 'lucide-react';
import type { Language } from '@/types';

interface QuizQuestion {
  index: number;
  text: string;
  options: string[];
  correct: number[];
  explanation: string;
  isMulti: boolean;
}

// Module-level cache so the promise passed to `use()` is stable across renders
// (a fresh promise every render would suspend forever). One entry per lecture;
// each holds all three languages, so switching language does not reload.
const quizCache = new Map<string, Promise<Record<string, { questions: QuizQuestion[] }> | null>>();
function loadQuiz(lectureId: string) {
  if (!quizCache.has(lectureId)) {
    quizCache.set(
      lectureId,
      getQuizData(lectureId) as Promise<Record<string, { questions: QuizQuestion[] }> | null>
    );
  }
  return quizCache.get(lectureId)!;
}

export default function ReviewPage() {
  // Select ONLY stable references from the store (primitives, the reviewQueue
  // array ref, and function refs). Calling getReviewsDue()/getWeakTopics()
  // *inside* a selector returns a fresh array every render, which makes
  // useSyncExternalStore's snapshot never stabilise → React error #185
  // (infinite render loop). Derive those values in the body instead.
  const language = useAcademyStore((s) => s.language) as Language;
  const reviewQueue = useAcademyStore((s) => s.reviewQueue);
  const completeReview = useAcademyStore((s) => s.completeReview);
  const getReviewsDue = useAcademyStore((s) => s.getReviewsDue);
  const getWeakTopics = useAcademyStore((s) => s.getWeakTopics);
  const getDifficultyLevel = useAcademyStore((s) => s.getDifficultyLevel);
  const lectureIndex = getLectureIndex();

  const reviewsDue = getReviewsDue();
  const weakTopics = getWeakTopics();
  const difficulty = getDifficultyLevel();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const texts = {
    en: {
      title: 'Smart Review',
      subtitle: 'Spaced repetition resurfaces questions you got wrong at optimal intervals for long-term retention.',
      dueNow: 'Due Now',
      totalInQueue: 'In Queue',
      difficulty: 'Your Level',
      weakAreas: 'Areas to Improve',
      noReviews: 'No reviews due right now! Come back later or attempt more quizzes to build your review queue.',
      recallPrompt: 'Recall the answer, then reveal it and grade yourself honestly.',
      showAnswer: 'Show Answer',
      correctLabel: 'Correct answer',
      explanationLabel: 'Why',
      gotIt: 'Got It Right',
      needsWork: 'Needs More Work',
      nextReview: 'Next review in',
      days: 'days',
      completed: 'All caught up! Great work.',
      unavailable: 'This question is no longer available — grade to reschedule.',
      loading: 'Loading question…',
      difficultyLabels: { easy: 'Building Foundation', medium: 'On Track', hard: 'Advanced' },
    },
    ro: {
      title: 'Revizuire Inteligentă',
      subtitle: 'Repetiția spațiată readuce întrebările la care ai greșit la intervale optime pentru retenție pe termen lung.',
      dueNow: 'De Revizuit',
      totalInQueue: 'În Coadă',
      difficulty: 'Nivelul Tău',
      weakAreas: 'Zone de Îmbunătățit',
      noReviews: 'Nicio revizuire de făcut acum! Revino mai târziu sau încearcă mai multe quiz-uri.',
      recallPrompt: 'Amintește-ți răspunsul, apoi dezvăluie-l și evaluează-te corect.',
      showAnswer: 'Arată Răspunsul',
      correctLabel: 'Răspuns corect',
      explanationLabel: 'De ce',
      gotIt: 'Am Nimerit',
      needsWork: 'Mai Am de Lucru',
      nextReview: 'Următoarea revizuire în',
      days: 'zile',
      completed: 'La zi cu toate! Bravo.',
      unavailable: 'Această întrebare nu mai este disponibilă — evaluează pentru reprogramare.',
      loading: 'Se încarcă întrebarea…',
      difficultyLabels: { easy: 'Fundament', medium: 'Pe Drum', hard: 'Avansat' },
    },
    el: {
      title: 'Έξυπνη Επανάληψη',
      subtitle: 'Η διαστηματική επανάληψη επαναφέρει ερωτήσεις σε βέλτιστα διαστήματα για μακροχρόνια συγκράτηση.',
      dueNow: 'Ληξιπρόθεσμα',
      totalInQueue: 'Στην Ουρά',
      difficulty: 'Επίπεδό σας',
      weakAreas: 'Τομείς Βελτίωσης',
      noReviews: 'Δεν υπάρχουν επαναλήψεις τώρα! Δοκιμάστε περισσότερα quiz.',
      recallPrompt: 'Θυμηθείτε την απάντηση, μετά αποκαλύψτε την και βαθμολογηθείτε ειλικρινά.',
      showAnswer: 'Εμφάνιση Απάντησης',
      correctLabel: 'Σωστή απάντηση',
      explanationLabel: 'Γιατί',
      gotIt: 'Σωστά',
      needsWork: 'Χρειάζεται Δουλειά',
      nextReview: 'Επόμενη επανάληψη σε',
      days: 'μέρες',
      completed: 'Ολοκληρώσατε! Μπράβο.',
      unavailable: 'Αυτή η ερώτηση δεν είναι πλέον διαθέσιμη — βαθμολογήστε για επαναπρογραμματισμό.',
      loading: 'Φόρτωση ερώτησης…',
      difficultyLabels: { easy: 'Θεμέλια', medium: 'Σωστά', hard: 'Προχωρημένο' },
    },
  };

  const txt = texts[language] || texts.en;
  const currentReview = reviewsDue[currentIndex];

  const handleAnswer = (correct: boolean) => {
    if (!currentReview) return;
    completeReview(currentReview.lectureId, currentReview.questionIndex, correct);
    setShowAnswer(false);
    if (currentIndex < reviewsDue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="text-center">
        <BookOpen className="mx-auto h-16 w-16 text-secondary mb-4" />
        <h1 className="text-3xl font-bold font-heading mb-2">{txt.title}</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">{txt.subtitle}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Clock className="h-6 w-6 mx-auto text-orange-500 mb-1" />
            <div className="text-2xl font-bold">{reviewsDue.length}</div>
            <div className="text-xs text-muted-foreground">{txt.dueNow}</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <RotateCcw className="h-6 w-6 mx-auto text-blue-500 mb-1" />
            <div className="text-2xl font-bold">{reviewQueue.length}</div>
            <div className="text-xs text-muted-foreground">{txt.totalInQueue}</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Target className="h-6 w-6 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold capitalize">{txt.difficultyLabels[difficulty]}</div>
            <div className="text-xs text-muted-foreground">{txt.difficulty}</div>
          </CardContent>
        </Card>
      </div>

      {/* Weak Areas */}
      {weakTopics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              {txt.weakAreas}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((id) => {
                const entry = lectureIndex.lectures.find((l) => l.id === id);
                const title = entry ? entry.title[language] || entry.title.en : `Lecture ${id}`;
                return (
                  <Badge key={id} variant="secondary" className="text-xs">
                    {title}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Cards */}
      {reviewsDue.length === 0 ? (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-muted-foreground">{txt.noReviews}</p>
          </CardContent>
        </Card>
      ) : currentReview ? (
        <Card className="border-secondary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {(() => {
                  const entry = lectureIndex.lectures.find((l) => l.id === currentReview.lectureId);
                  return entry
                    ? entry.title[language] || entry.title.en
                    : `Lecture ${currentReview.lectureId}`;
                })()}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Q{currentReview.questionIndex + 1}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {txt.nextReview}: {Math.round(currentReview.interval)} {txt.days}
            </p>

            <Suspense
              fallback={<p className="text-sm text-muted-foreground py-6 text-center">{txt.loading}</p>}
            >
              <ReviewQuestion
                key={`${currentReview.lectureId}:${currentReview.questionIndex}`}
                lectureId={currentReview.lectureId}
                questionIndex={currentReview.questionIndex}
                language={language}
                showAnswer={showAnswer}
                labels={{
                  recallPrompt: txt.recallPrompt,
                  correctLabel: txt.correctLabel,
                  explanationLabel: txt.explanationLabel,
                  unavailable: txt.unavailable,
                }}
              />
            </Suspense>

            {!showAnswer ? (
              <Button onClick={() => setShowAnswer(true)} className="w-full gap-2">
                <Eye className="h-4 w-4" />
                {txt.showAnswer}
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleAnswer(false)}
                  variant="outline"
                  className="flex-1 gap-2 border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  <XCircle className="h-4 w-4" />
                  {txt.needsWork}
                </Button>
                <Button
                  onClick={() => handleAnswer(true)}
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {txt.gotIt}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-muted-foreground">{txt.completed}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReviewQuestion({
  lectureId,
  questionIndex,
  language,
  showAnswer,
  labels,
}: {
  lectureId: string;
  questionIndex: number;
  language: Language;
  showAnswer: boolean;
  labels: { recallPrompt: string; correctLabel: string; explanationLabel: string; unavailable: string };
}) {
  const quiz = use(loadQuiz(lectureId));
  const byLang = quiz?.[language] ?? quiz?.en;
  const question = byLang?.questions?.[questionIndex];

  if (!question) {
    return <p className="text-sm text-amber-600">{labels.unavailable}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-base font-medium">{question.text}</p>
      <ul className="space-y-2">
        {question.options.map((opt, i) => {
          const isCorrect = question.correct.includes(i);
          return (
            <li
              key={i}
              className={cn(
                'rounded-md border px-3 py-2 text-sm flex items-center gap-2',
                showAnswer && isCorrect
                  ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400 font-medium'
                  : 'border-border'
              )}
            >
              {showAnswer && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
              <span>{opt}</span>
            </li>
          );
        })}
      </ul>
      {!showAnswer ? (
        <p className="text-xs text-muted-foreground italic">{labels.recallPrompt}</p>
      ) : (
        question.explanation && (
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span className="font-semibold">{labels.explanationLabel}: </span>
            {question.explanation}
          </div>
        )
      )}
    </div>
  );
}
