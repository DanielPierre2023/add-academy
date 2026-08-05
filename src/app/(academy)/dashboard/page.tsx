'use client';

import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { getLectureIndex, getLecturesByStage, getLectureTitle } from '@/lib/lectures';
import { STAGES } from '@/types';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/utils';
import {
  BookOpen,
  Clock,
  Trophy,
  Flame,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  const language = useAcademyStore((s) => s.language);
  const getCompletionPercentage = useAcademyStore((s) => s.getCompletionPercentage);
  const progress = useAcademyStore((s) => s.progress);
  const quizScores = useAcademyStore((s) => s.quizScores);
  const index = getLectureIndex();

  const completionPct = getCompletionPercentage();

  // Total study time
  const totalTime = Object.values(progress).reduce(
    (sum, p) => sum + (p.timeSpent || 0),
    0
  );

  // Quiz average
  const scoreValues = Object.values(quizScores);
  const quizAvg =
    scoreValues.length > 0
      ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
      : 0;

  // Recent activity (last 5 lectures by completedAt or timeSpent)
  const recentActivity = Object.values(progress)
    .filter((p) => p.timeSpent > 0)
    .sort((a, b) => {
      if (a.completedAt && b.completedAt)
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      if (a.completedAt) return -1;
      if (b.completedAt) return 1;
      return b.timeSpent - a.timeSpent;
    })
    .slice(0, 5);

  const statCards = [
    {
      icon: BookOpen,
      label: t('dash_progress', language),
      value: `${Math.round(completionPct)}%`,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      extra: <Progress value={completionPct} className="mt-2 h-2" />,
    },
    {
      icon: Clock,
      label: t('dash_time', language),
      value: totalTime > 0 ? formatTime(totalTime) : '0m',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      icon: Trophy,
      label: t('dash_quizzes', language),
      value: scoreValues.length > 0 ? `${quizAvg}%` : '--',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Flame,
      label: t('dash_streak', language),
      value: '0 days',
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Title */}
      <h1 className="text-3xl font-bold">{t('dash_title', language)}</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    card.bg
                  )}
                >
                  <card.icon className={cn('h-5 w-5', card.color)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              </div>
              {card.extra}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stage Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('course_progress', language)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {STAGES.map((stage) => {
            const stageLectures = getLecturesByStage(stage.number);
            const completedCount = stageLectures.filter(
              (l) => progress[l.id]?.completed
            ).length;
            const pct =
              stageLectures.length > 0
                ? (completedCount / stageLectures.length) * 100
                : 0;

            return (
              <div key={stage.number}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span>{stage.icon}</span>
                    <span className="font-medium">{stage.name[language]}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {completedCount}/{stageLectures.length}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('dash_recent', language)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No activity yet. Start a lecture to track your progress!
            </p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((item, i) => {
                const lecture = index.lectures.find(
                  (l) => l.id === item.lectureId
                );
                return (
                  <div key={item.lectureId}>
                    {i > 0 && <Separator className="my-1" />}
                    <Link
                      href={`/lectures/${item.lectureId}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full',
                          item.completed
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-muted'
                        )}
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {lecture
                            ? getLectureTitle(item.lectureId, language)
                            : item.lectureId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(item.timeSpent)} spent
                          {item.completedAt &&
                            ` -- completed ${new Date(item.completedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
