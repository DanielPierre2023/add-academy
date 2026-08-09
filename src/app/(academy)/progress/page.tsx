'use client';

import { useAcademyStore } from '@/lib/store/academy-store';
import { getLectureIndex } from '@/lib/lectures';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  BookOpen,
  Clock,
  Trophy,
  Flame,
  Target,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { STAGES } from '@/types';
import type { Language } from '@/types';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ProgressPage() {
  const language = useAcademyStore((s) => s.language) as Language;
  const progress = useAcademyStore((s) => s.progress);
  const quizScores = useAcademyStore((s) => s.quizScores);
  const stats = useAcademyStore((s) => s.getGamificationStats());
  const xpProgress = useAcademyStore((s) => s.getXPProgress());
  const completion = useAcademyStore((s) => s.getCompletionPercentage());
  const lectureIndex = getLectureIndex();

  const texts = {
    en: {
      title: 'Progress Report',
      subtitle: 'Your complete learning journey at a glance',
      export: 'Export as PDF',
      overview: 'Overview',
      lecturesCompleted: 'Lectures Completed',
      totalTime: 'Total Study Time',
      quizAverage: 'Quiz Average',
      currentLevel: 'Current Level',
      currentStreak: 'Current Streak',
      xpEarned: 'XP Earned',
      stageBreakdown: 'Stage Breakdown',
      quizPerformance: 'Quiz Performance',
      days: 'days',
    },
    ro: {
      title: 'Raport de Progres',
      subtitle: 'Calatoria ta completa de invatare',
      export: 'Exporta ca PDF',
      overview: 'Prezentare Generala',
      lecturesCompleted: 'Lectii Finalizate',
      totalTime: 'Timp Total de Studiu',
      quizAverage: 'Media Quiz',
      currentLevel: 'Nivel Curent',
      currentStreak: 'Serie Curenta',
      xpEarned: 'XP Castigat',
      stageBreakdown: 'Detalii pe Etape',
      quizPerformance: 'Performanta Quiz',
      days: 'zile',
    },
    el: {
      title: 'Αναφορά Προόδου',
      subtitle: 'Η πλήρης πορεία μάθησής σας',
      export: 'Εξαγωγή ως PDF',
      overview: 'Επισκόπηση',
      lecturesCompleted: 'Μαθήματα Ολοκληρωμένα',
      totalTime: 'Συνολικός Χρόνος',
      quizAverage: 'Μ.Ο. Quiz',
      currentLevel: 'Τρέχον Επίπεδο',
      currentStreak: 'Τρέχον Σερί',
      xpEarned: 'XP που Κερδίθηκαν',
      stageBreakdown: 'Ανάλυση Σταδίων',
      quizPerformance: 'Απόδοση Quiz',
      days: 'μέρες',
    },
  };

  const txt = texts[language] || texts.en;

  const quizValues = Object.values(quizScores);
  const quizAvg = quizValues.length > 0
    ? Math.round(quizValues.reduce((a, b) => a + b, 0) / quizValues.length)
    : 0;

  const handleExport = () => {
    // Open print dialog for PDF export
    window.print();
  };

  return (
    <div className="space-y-8 pb-16 print:pb-0">
      {/* Header */}
      <div className="text-center print:text-left">
        <BarChart3 className="mx-auto h-16 w-16 text-secondary mb-4 print:hidden" />
        <h1 className="text-3xl font-bold font-heading mb-2">{txt.title}</h1>
        <p className="text-muted-foreground">{txt.subtitle}</p>
        <div className="mt-4 print:hidden">
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {txt.export}
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{stats.lecturesCompleted}/66</div>
            <div className="text-xs text-muted-foreground">{txt.lecturesCompleted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <div className="text-2xl font-bold">{formatTime(stats.totalTimeSeconds)}</div>
            <div className="text-xs text-muted-foreground">{txt.totalTime}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-8 w-8 mx-auto text-pink-500 mb-2" />
            <div className="text-2xl font-bold">{quizAvg}%</div>
            <div className="text-xs text-muted-foreground">{txt.quizAverage}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
            <div className="text-2xl font-bold">{stats.level}</div>
            <div className="text-xs text-muted-foreground">{txt.currentLevel}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Flame className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <div className="text-2xl font-bold">{stats.streak} {txt.days}</div>
            <div className="text-xs text-muted-foreground">{txt.currentStreak}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{stats.xp}</div>
            <div className="text-xs text-muted-foreground">{txt.xpEarned}</div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{txt.overview}</span>
            <span className="text-sm text-muted-foreground">{completion}%</span>
          </div>
          <Progress value={completion} className="h-3" />
        </CardContent>
      </Card>

      {/* Stage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{txt.stageBreakdown}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {STAGES.map((stage) => {
            const done = stage.lectures.filter((id) => progress[id]?.completed).length;
            const total = stage.lectures.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const stageName = stage.name[language] || stage.name.en;

            return (
              <div key={stage.number}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">
                    {stage.icon} {stageName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {done}/{total}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quiz Performance */}
      {quizValues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{txt.quizPerformance}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(quizScores).map(([lectureId, score]) => {
                const entry = lectureIndex.lectures.find((l) => l.id === lectureId);
                const title = entry
                  ? (entry.title[language] || entry.title.en || lectureId)
                  : `Lecture ${lectureId}`;
                return (
                  <div key={lectureId} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                    <span className="text-xs line-clamp-1 flex-1 mr-2">{title}</span>
                    <Badge
                      variant={score === 100 ? 'default' : 'secondary'}
                      className={score === 100 ? 'bg-green-600' : ''}
                    >
                      {score}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
