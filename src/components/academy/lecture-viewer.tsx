'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Trophy,
  Bookmark,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { QuizEngine } from '@/components/academy/quiz-engine';
import { Confetti } from '@/components/gamification/confetti';
import { showXPToast } from '@/components/gamification/xp-toast';
import { XP_VALUES } from '@/types';

declare global {
  interface Window {
    loadPyodide: any;
    pyodide: any;
  }
}

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

// Packages that Pyodide bundles and we can load with loadPackage
const PYODIDE_PACKAGES = new Set([
  'numpy', 'scipy', 'matplotlib', 'pandas', 'scikit-learn',
  'sympy', 'networkx', 'pillow', 'regex',
]);

// Track which packages have already been loaded this session
const loadedPackages = new Set<string>();

/** Load Pyodide runtime (shared singleton) */
async function ensurePyodide(): Promise<any> {
  if (window.pyodide) return window.pyodide;

  // Load the script if not present
  if (!window.loadPyodide) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Pyodide'));
      document.head.appendChild(script);
    });
  }

  window.pyodide = await window.loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
  });

  // Always pre-install numpy — used in nearly every lecture
  try {
    await window.pyodide.loadPackage('numpy');
    loadedPackages.add('numpy');
  } catch (e) {
    console.warn('Failed to pre-load numpy:', e);
  }

  return window.pyodide;
}

/** Scan code for import statements and load any needed Pyodide packages */
async function ensurePackages(pyodide: any, code: string): Promise<void> {
  // Match "import X" and "from X import ..."
  const importRegex = /(?:^|\n)\s*(?:import|from)\s+(\w+)/g;
  let match;
  const needed: string[] = [];

  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1];
    if (PYODIDE_PACKAGES.has(pkg) && !loadedPackages.has(pkg)) {
      needed.push(pkg);
    }
  }

  if (needed.length > 0) {
    await pyodide.loadPackage(needed);
    needed.forEach((p) => loadedPackages.add(p));
  }
}

/** Run a Python code string via Pyodide and return stdout/stderr */
async function runPythonCode(code: string): Promise<{ stdout: string; stderr: string }> {
  const pyodide = await ensurePyodide();

  // Auto-install any packages the code imports
  await ensurePackages(pyodide, code);

  pyodide.runPython(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`);

  let caughtError = '';
  try {
    await pyodide.runPythonAsync(code);
  } catch (err: any) {
    // Capture the Python traceback from the JS error
    caughtError = err.message || String(err);
  }

  const stdout = pyodide.runPython('sys.stdout.getvalue()');
  const stderr = pyodide.runPython('sys.stderr.getvalue()');

  pyodide.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`);

  // Use caught error if stderr is empty but an exception was thrown
  const finalStderr = stderr || caughtError;

  return { stdout, stderr: finalStderr };
}

// Expose runPyodideCode globally so inline onclick attributes in lecture HTML work
if (typeof window !== 'undefined') {
  (window as any).runPyodideCode = async function runPyodideCode(button: HTMLButtonElement) {
    const wrapper = button.closest('.code-block');
    if (!wrapper) return;

    const codeEl = wrapper.querySelector('pre code');
    if (!codeEl) return;
    const code = codeEl.textContent || '';

    let outputDiv = wrapper.querySelector('.output, .code-output') as HTMLDivElement;
    if (!outputDiv) {
      outputDiv = document.createElement('div');
      outputDiv.className = 'output';
      wrapper.appendChild(outputDiv);
    }

    button.textContent = '⏳ Running...';
    button.disabled = true;
    outputDiv.classList.add('visible');
    outputDiv.classList.remove('error');
    outputDiv.textContent = 'Loading Python runtime...';

    try {
      const result = await runPythonCode(code);
      if (result.stderr) {
        outputDiv.classList.add('error');
        outputDiv.textContent = result.stderr;
      } else {
        outputDiv.classList.remove('error');
        outputDiv.textContent = result.stdout || '(no output)';
      }
    } catch (err: any) {
      outputDiv.classList.add('error');
      outputDiv.textContent = err.message || 'Error running code';
    }

    button.textContent = '▶ Run';
    button.disabled = false;
  };
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
    awardXP,
    checkStreak,
    toggleBookmark,
    isBookmarked,
  } = useAcademyStore();

  const [showConfetti, setShowConfetti] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check/update streak on lecture view
  useEffect(() => {
    checkStreak();
  }, [checkStreak]);

  const isCompleted = progress[lectureId]?.completed ?? false;
  const quizCompleted = quizScores[lectureId] !== undefined;

  const lang = language as Language;
  const lectureHtml = content.content[lang] || content.content['en'] || '';
  // Fall back to EN if translated quiz questions have empty text
  const rawQuizQuestions = quiz
    ? (quiz[lang]?.questions ?? quiz['en']?.questions ?? [])
    : [];
  const quizQuestions =
    rawQuizQuestions.length > 0 && !rawQuizQuestions[0]?.text
      ? (quiz?.['en']?.questions ?? [])
      : rawQuizQuestions;

  // Set current lecture on mount (read timeSpent from store directly to avoid progress dep)
  useEffect(() => {
    setCurrentLecture(lectureId);
    setScrolledToBottom(false);
    timeRef.current = useAcademyStore.getState().progress[lectureId]?.timeSpent ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId]);

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

  // Wire up inline Run buttons for Pyodide code blocks
  useEffect(() => {
    if (!contentRef.current) return;

    const container = contentRef.current;
    const runButtons = container.querySelectorAll('.run-btn');

    const handlers: Array<{ btn: Element; handler: (e: Event) => void }> = [];

    runButtons.forEach((btn) => {
      const handler = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const button = btn as HTMLButtonElement;
        const wrapper = button.closest('.code-block');
        if (!wrapper) return;

        // Find the code content
        const codeEl = wrapper.querySelector('pre code');
        if (!codeEl) return;
        const code = codeEl.textContent || '';

        // Find or create output div
        let outputDiv = wrapper.querySelector('.output, .code-output') as HTMLDivElement;
        if (!outputDiv) {
          outputDiv = document.createElement('div');
          outputDiv.className = 'output';
          wrapper.appendChild(outputDiv);
        }

        // Show loading state
        button.textContent = '⏳ Running...';
        button.disabled = true;
        outputDiv.classList.add('visible');
        outputDiv.classList.remove('error');
        outputDiv.textContent = 'Loading Python runtime...';

        try {
          const { stdout, stderr } = await runPythonCode(code);
          if (stderr) {
            outputDiv.classList.add('error');
            outputDiv.textContent = stderr;
          } else {
            outputDiv.classList.remove('error');
            outputDiv.textContent = stdout || '(no output)';
          }

          // Award XP for running code (use getState to avoid stale closures)
          // Use block index as stable ID (data-block-id may not exist on server-rendered HTML)
          const allBlocks = container.querySelectorAll('.code-block');
          const blockIndex = Array.from(allBlocks).indexOf(wrapper as Element);
          const blockId = wrapper.getAttribute('data-block-id') || `block-${blockIndex}`;
          const latestProgress = useAcademyStore.getState().progress;
          const currentBlocks = latestProgress[lectureId]?.codeBlocksRun || [];
          if (!currentBlocks.includes(blockId)) {
            useAcademyStore.getState().updateProgress(lectureId, {
              codeBlocksRun: [...currentBlocks, blockId],
            });
            const result = useAcademyStore.getState().awardXP('code', XP_VALUES.CODE_BLOCK_RUN, lectureId);
            showXPToast({
              amount: XP_VALUES.CODE_BLOCK_RUN,
              type: 'code',
              achievements: result.newAchievements,
              levelUp: result.leveledUp ? result.newLevel : undefined,
            });
          }
        } catch (err: any) {
          outputDiv.classList.add('error');
          outputDiv.textContent = err.message || 'Error running code';
        }

        button.textContent = '▶ Run';
        button.disabled = false;
      };

      btn.addEventListener('click', handler);
      handlers.push({ btn, handler });
    });

    // Cleanup
    return () => {
      handlers.forEach(({ btn, handler }) => {
        btn.removeEventListener('click', handler);
      });
    };
  }, [lectureHtml]);

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
    if (!isCompleted) {
      markCompleted(lectureId);
      const result = awardXP('lecture', XP_VALUES.LECTURE_COMPLETE, lectureId);
      showXPToast({
        amount: XP_VALUES.LECTURE_COMPLETE,
        type: 'lecture',
        achievements: result.newAchievements,
        levelUp: result.leveledUp ? result.newLevel : undefined,
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }
  };

  const showCompleteButton = scrolledToBottom || quizCompleted || isCompleted;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <Confetti active={showConfetti} />
      {/* Content Area */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="px-4 py-6 space-y-8">
          {/* Top action bar: bookmark + completion badge */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => toggleBookmark(lectureId)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                isBookmarked(lectureId)
                  ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              aria-label={isBookmarked(lectureId) ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Bookmark
                className={cn('h-4 w-4', isBookmarked(lectureId) && 'fill-current')}
              />
              {isBookmarked(lectureId)
                ? (lang === 'ro' ? 'Marcaj salvat' : lang === 'el' ? 'Αποθηκευμένο' : 'Bookmarked')
                : (lang === 'ro' ? 'Marchează' : lang === 'el' ? 'Σελιδοδείκτης' : 'Bookmark')}
            </button>
            {isCompleted && (
              <Badge variant="default" className="gap-1 bg-green-600">
                <CheckCircle2 className="h-3 w-3" />
                {t('completed', lang)}
              </Badge>
            )}
          </div>

          {/* Lecture HTML Content — styled by globals.css lecture classes */}
          <div
            className="content"
            dangerouslySetInnerHTML={{ __html: lectureHtml }}
          />

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
                {t('course_prev', lang)}
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link href={`/lectures/${next}`} className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
                {t('course_next', lang)}
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
