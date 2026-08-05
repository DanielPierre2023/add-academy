'use client';

import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { getLectureIndex, getLecturesByStage } from '@/lib/lectures';
import { STAGES } from '@/types';
import {
  BookOpen,
  Code2,
  HelpCircle,
  Globe,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Play,
  Users,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

export default function HomePage() {
  const language = useAcademyStore((s) => s.language);
  const getCompletionPercentage = useAcademyStore((s) => s.getCompletionPercentage);
  const progress = useAcademyStore((s) => s.progress);
  const index = getLectureIndex();
  const completionPct = getCompletionPercentage();
  const hasProgress = Object.keys(progress).length > 0;

  // Find next incomplete lecture
  const nextLecture = index.lectures.find((l) => !progress[l.id]?.completed);

  const stats = [
    {
      icon: BookOpen,
      value: '49',
      label: t('home_stats_lectures', language),
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Code2,
      value: '176',
      label: t('home_stats_exercises', language),
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      icon: HelpCircle,
      value: '35+',
      label: t('home_stats_quizzes', language),
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
    },
    {
      icon: Globe,
      value: '3',
      label: t('home_stats_languages', language),
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative -mx-4 -mt-8 overflow-hidden px-4 pb-12 pt-16 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-600/20 dark:via-purple-600/20 dark:to-pink-600/20" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <Sparkles className="h-4 w-4" />
            ADD Academy
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            {t('home_title', language)}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {t('home_subtitle', language)}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/lectures/1" className={cn(buttonVariants({ size: 'lg' }), 'gap-2 text-base')}>
              <Play className="h-5 w-5" />
              {t('home_start', language)}
            </Link>
            <p className="text-sm text-muted-foreground">
              {t('home_free', language)}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="text-center">
            <CardContent className="pt-6">
              <div
                className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}
              >
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Continue Learning (if user has progress) */}
      {hasProgress && (
        <section>
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
            <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold">
                  {t('course_continue', language)}
                </h3>
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {Math.round(completionPct)}% {t('course_completed', language)}
                  </span>
                </div>
                <Progress value={completionPct} className="h-2 w-full max-w-md" />
              </div>
              {nextLecture && (
                <Link href={`/lectures/${nextLecture.id}`} className={cn(buttonVariants(), 'gap-2')}>
                  {t('course_continue', language)}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Course Map Overview */}
      <section>
        <div className="mb-6 flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{t('course_map', language)}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((stage) => {
            const stageLectures = getLecturesByStage(stage.number);
            const completedCount = stageLectures.filter(
              (l) => progress[l.id]?.completed
            ).length;
            const firstLecture = stageLectures[0];

            return (
              <Link
                key={stage.number}
                href={firstLecture ? `/lectures/${firstLecture.id}` : '#'}
                className="group"
              >
                <Card className="h-full transition-all hover:shadow-md hover:ring-1 hover:ring-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                        style={{ backgroundColor: `${stage.color}20` }}
                      >
                        {stage.icon}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {stage.name[language]}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {t('course_stage', language)} {stage.number}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {stageLectures.length} {t('course_lecture', language)}s
                      </span>
                      {completedCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {completedCount}/{stageLectures.length}
                        </Badge>
                      )}
                    </div>
                    {completedCount > 0 && (
                      <Progress
                        value={(completedCount / stageLectures.length) * 100}
                        className="mt-2 h-1.5"
                      />
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
