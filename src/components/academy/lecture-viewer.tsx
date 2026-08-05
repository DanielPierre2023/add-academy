'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Code2,
  Trophy,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuizEngine } from '@/components/academy/quiz-engine';
import { CodeBlock } from '@/components/academy/code-block';

interface LectureContent {
  id: string;
  title: Record<string, string>;
  content: Record<string, string>;
  codeBlocks: Array<{
    id: string;
    title: string;
    code: string;
    language: string;
    runnable: boolean;
  }>;
}

interface QuizData {
  lectureId: string;
  en: { questions: Array<any> };
  ro: { questions: Array<any> };
  el: { questions: Array<any> };
  [key: string]: any;
}

interface LectureViewerProps {
  lectureId: string;
  content: LectureContent;
  quiz: QuizData | null;
  prev: string | null;
  next: string | null;
  hasQuiz: boolean;
}

export function LectureViewer({
  lectureId,
  content,
  quiz,
  prev,
  next,
  hasQuiz,
}: LectureViewerProps) {
  const {
    language,
    setCurrentLecture,
    progress,
    updateProgress,
    markCompleted,
    scrolledToBottom,
    setScrolledToBottom,
    quizScores,
  } = useAcademyStore();

  const contentRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCompleted = progress[lectureId]?.completed ?? false;
  const quizCompleted = quizScores[lectureId] !== undefined;

  // Set current lecture on mount
  useEffect(() => {
    setCurrentLecture(lectureId);
    setScrolledToBottom(false);
    timeRef.current = progress[lectureId]?.timeSpent ?? 0;
  }, [lectureId, setCurrentLecture, setScrolledToBottom, progress]);

  // Track time spent
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      timeRef.current += 1;
      updateProgress(lectureId, { timeSpent: timeRef.current });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [lectureId, updateProgress]);

  // Scroll tracking
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    const threshold = 50;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (atBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
    }
  }, [scrolledToBottom, setScrolledToBottom]);

  const handleMarkComplete = () => {
    markCompleted(lectureId);
  };

  const showCompleteButton = scrolledToBottom || quizCompleted || isCompleted;

  const lang = language as Language;
  const lectureTitle = content.title[lang] || content.title['en'] || '';
  const lectureHtml = content.content[lang] || content.content['en'] || '';
  const quizQuestions = quiz
    ? (quiz[lang]?.questions ?? quiz['en']?.questions ?? [])
    : [];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{lectureTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle2 className="h-3 w-3" />
              {t('completed', lang)}
            </Badge>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="px-4 py-6 space-y-8">
          {/* Lecture HTML Content */}
          <div
            className={cn(
              'prose prose-slate dark:prose-invert max-w-none',
              'prose-headings:scroll-mt-20',
              'prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4',
              'prose-h3:text-lg prose-h3:font-medium prose-h3:mt-6 prose-h3:mb-3',
              'prose-p:leading-7 prose-p:mb-4',
              'prose-li:leading-7',
              'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
              'prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:rounded-lg',
              'prose-img:rounded-lg prose-img:shadow-md',
              'prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:text-primary/80',
              'prose-table:border-collapse prose-th:bg-muted prose-th:p-2 prose-td:p-2 prose-td:border prose-th:border'
            )}
            dangerouslySetInnerHTML={{ __html: lectureHtml }}
          />

          {/* Code Blocks */}
          {content.codeBlocks.length > 0 && (
            <div className="space-y-6">
              <Separator />
              <div className="flex items-center gap-2 mb-4">
                <Code2 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  {t('code_examples', lang)}
                </h2>
              </div>
              {content.codeBlocks.map((block) => (
                <CodeBlock
                  key={block.id}
                  id={block.id}
                  title={block.title}
                  code={block.code}
                  language={block.language}
                  runnable={block.runnable}
                />
              ))}
            </div>
          )}

          {/* Quiz Section */}
          {quiz && quizQuestions.length > 0 && (
            <div className="space-y-6">
              <Separator />
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  {t('quiz_title', lang)}
                </h2>
              </div>
              <QuizEngine
                quiz={{ questions: quizQuestions }}
                lectureId={lectureId}
              />
            </div>
          )}

          {/* Mark as Complete */}
          {showCompleteButton && (
            <div className="flex justify-center py-4">
              <Button
                size="lg"
                onClick={handleMarkComplete}
                disabled={isCompleted}
                className={cn(
                  'gap-2',
                  isCompleted &&
                    'bg-green-600 hover:bg-green-600 cursor-default'
                )}
              >
                <CheckCircle2 className="h-5 w-5" />
                {isCompleted
                  ? t('completed', lang)
                  : t('mark_complete', lang)}
              </Button>
            </div>
          )}

          <Separator />

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between py-6">
            {prev ? (
              <Link href={`/lectures/${prev}`} className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
                <ChevronLeft className="h-4 w-4" />
                {t('prev_lecture', lang)}
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link href={`/lectures/${next}`} className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
                {t('next_lecture', lang)}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
