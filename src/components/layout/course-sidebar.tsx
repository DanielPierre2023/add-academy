'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  BookOpen,
  Code,
  HelpCircle,
  X,
} from 'lucide-react';
import type { Language } from '@/types';
import { STAGES } from '@/types';
import { t } from '@/lib/i18n';
import { getLectureIndex, type LectureIndexEntry } from '@/lib/lectures';
import { useAcademyStore } from '@/lib/store/academy-store';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

function findStageForLecture(lectureId: string): number {
  for (const stage of STAGES) {
    if (stage.lectures.includes(lectureId)) return stage.number;
  }
  return -1;
}

export function CourseSidebar() {
  const language = useAcademyStore((s) => s.language);
  const currentLecture = useAcademyStore((s) => s.currentLecture);
  const setCurrentLecture = useAcademyStore((s) => s.setCurrentLecture);
  const sidebarOpen = useAcademyStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAcademyStore((s) => s.setSidebarOpen);
  const progress = useAcademyStore((s) => s.progress);

  const lectureIndex = useMemo(() => getLectureIndex(), []);
  const lectureMap = useMemo(() => {
    const map = new Map<string, LectureIndexEntry>();
    for (const entry of lectureIndex.lectures) {
      map.set(entry.id, entry);
    }
    return map;
  }, [lectureIndex]);

  const currentStage = findStageForLecture(currentLecture);

  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>(
    () => {
      const initial: Record<number, boolean> = {};
      for (const stage of STAGES) {
        initial[stage.number] = stage.number === currentStage;
      }
      return initial;
    }
  );

  const toggleStage = useCallback((stageNumber: number) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageNumber]: !prev[stageNumber],
    }));
  }, []);

  const getStageCompletion = useCallback(
    (stage: (typeof STAGES)[number]) => {
      let completed = 0;
      for (const lectureId of stage.lectures) {
        if (progress[lectureId]?.completed) completed++;
      }
      return { completed, total: stage.lectures.length };
    },
    [progress]
  );

  const overallProgress = useMemo(() => {
    const total = lectureIndex.lectures.length;
    if (total === 0) return 0;
    let completed = 0;
    for (const entry of lectureIndex.lectures) {
      if (progress[entry.id]?.completed) completed++;
    }
    return Math.round((completed / total) * 100);
  }, [lectureIndex, progress]);

  return (
    <TooltipProvider>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — dark blue brand theme */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:z-30 lg:w-80 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-sidebar-primary" />
            <h2 className="text-sm font-semibold text-sidebar-foreground">
              {t('course_map', language)}
            </h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stage list */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-2">
            {STAGES.map((stage) => {
              const { completed, total } = getStageCompletion(stage);
              const isExpanded = expandedStages[stage.number] ?? false;

              return (
                <div key={stage.number} className="mb-1">
                  {/* Stage header */}
                  <button
                    onClick={() => toggleStage(stage.number)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-sidebar-accent',
                      'border-l-[3px]'
                    )}
                    style={{ borderLeftColor: stage.color }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
                    )}
                    <span className="shrink-0">{stage.icon}</span>
                    <span className="flex-1 truncate">
                      {stage.name[language] || stage.name.en}
                    </span>
                    <span className="shrink-0 text-xs text-sidebar-foreground/50">
                      {completed}/{total}
                    </span>
                  </button>

                  {/* Lectures in stage */}
                  <div
                    className={cn(
                      'overflow-hidden transition-all duration-200 ease-in-out',
                      isExpanded
                        ? 'max-h-[2000px] opacity-100'
                        : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="ml-3 border-l border-sidebar-border pl-2 py-1">
                      {stage.lectures.map((lectureId) => {
                        const entry = lectureMap.get(lectureId);
                        if (!entry) return null;

                        const isActive = currentLecture === lectureId;
                        const isCompleted =
                          progress[lectureId]?.completed ?? false;
                        const title =
                          entry.title[language] || entry.title.en || lectureId;

                        return (
                          <Link
                            key={lectureId}
                            href={`/lectures/${entry.id}`}
                            onClick={() => {
                              setCurrentLecture(entry.id);
                              setSidebarOpen(false);
                            }}
                            className={cn(
                              'group flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                              isActive
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                            )}
                          >
                            {/* Completion icon */}
                            <span className="mt-0.5 shrink-0">
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-green-400" />
                              ) : (
                                <Circle className="h-4 w-4 text-sidebar-foreground/30" />
                              )}
                            </span>

                            {/* Title and badges */}
                            <span className="flex-1 leading-snug">
                              <span className="line-clamp-2">{title}</span>
                              <span className="mt-0.5 flex items-center gap-1">
                                {entry.codeBlockCount > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={<span />}
                                      className="inline-flex"
                                    >
                                      <Badge
                                        variant="secondary"
                                        className="h-4 gap-0.5 px-1 text-[10px]"
                                      >
                                        <Code className="h-3 w-3" />
                                        {entry.codeBlockCount}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {entry.codeBlockCount} code{' '}
                                      {entry.codeBlockCount === 1
                                        ? 'block'
                                        : 'blocks'}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {entry.hasQuiz && (
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={<span />}
                                      className="inline-flex"
                                    >
                                      <Badge
                                        variant="secondary"
                                        className="h-4 gap-0.5 px-1 text-[10px]"
                                      >
                                        <HelpCircle className="h-3 w-3" />
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {t('course_lecture', language)}{' '}
                                      quiz
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Bottom progress section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex flex-wrap gap-3">
            <span className="text-xs font-medium text-sidebar-foreground">
              {t('course_progress', language)}
            </span>
            <span className="ml-auto text-xs text-sidebar-foreground/50 tabular-nums">
              {overallProgress}% {t('course_completed', language)}
            </span>
            <Progress value={overallProgress} className="w-full bg-sidebar-accent" />
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
