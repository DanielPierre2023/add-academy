'use client';

import { useState, useMemo } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { getLectureIndex } from '@/lib/lectures';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export default function ReviewPage() {
  const language = useAcademyStore((s) => s.language) as Language;
  const reviewsDue = useAcademyStore((s) => s.getReviewsDue());
  const reviewQueue = useAcademyStore((s) => s.reviewQueue);
  const completeReview = useAcademyStore((s) => s.completeReview);
  const weakTopics = useAcademyStore((s) => s.getWeakTopics());
  const difficulty = useAcademyStore((s) => s.getDifficultyLevel());
  const lectureIndex = getLectureIndex();

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
      showAnswer: 'Show Answer',
      gotIt: 'Got It Right',
      needsWork: 'Needs More Work',
      nextReview: 'Next review in',
      days: 'days',
      completed: 'All caught up! Great work.',
      difficultyLabels: { easy: 'Building Foundation', medium: 'On Track', hard: 'Advanced' },
    },
    ro: {
      title: 'Revizuire Inteligenta',
      subtitle: 'Repetitia spatiata readuce intrebarile la care ai gresit la intervale optime pentru retentie pe termen lung.',
      dueNow: 'De Revizuit',
      totalInQueue: 'In Coada',
      difficulty: 'Nivelul Tau',
      weakAreas: 'Zone de Imbunatatit',
      noReviews: 'Nicio revizuire de facut acum! Revino mai tarziu sau incearca mai multe quiz-uri.',
      showAnswer: 'Arata Raspunsul',
      gotIt: 'Am Nimerit',
      needsWork: 'Mai Am de Lucru',
      nextReview: 'Urmatoarea revizuire in',
      days: 'zile',
      completed: 'La zi cu toate! Bravo.',
      difficultyLabels: { easy: 'Fundament', medium: 'Pe Drum', hard: 'Avansat' },
    },
    el: {
      title: 'Εξυπνη Επαναληψη',
      subtitle: 'Η διαστηματική επανάληψη επαναφέρει ερωτήσεις σε βέλτιστα διαστήματα για μακροχρόνια συγκράτηση.',
      dueNow: 'Ληξιπρόθεσμα',
      totalInQueue: 'Στην Ουρά',
      difficulty: 'Επίπεδό σας',
      weakAreas: 'Τομείς Βελτίωσης',
      noReviews: 'Δεν υπάρχουν επαναλήψεις τώρα! Δοκιμάστε περισσότερα quiz.',
      showAnswer: 'Εμφάνιση Απάντησης',
      gotIt: 'Σωστά',
      needsWork: 'Χρειάζεται Δουλειά',
      nextReview: 'Επόμενη επανάληψη σε',
      days: 'μέρες',
      completed: 'Ολοκληρώσατε! Μπράβο.',
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
                const title = entry ? (entry.title[language] || entry.title.en) : `Lecture ${id}`;
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
                  return entry ? (entry.title[language] || entry.title.en) : `Lecture ${currentReview.lectureId}`;
                })()}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Q{currentReview.questionIndex + 1}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {txt.nextReview}: {Math.round(currentReview.interval)} {txt.days}
            </p>

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
