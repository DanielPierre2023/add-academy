'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Link from 'next/link';
import { useAcademyStore } from '@/lib/store/academy-store';
import {
  markScrolledToBottom,
  evaluateLectureCompletion,
} from '@/lib/store/completion-actions';
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
import { CodePlayground } from '@/components/academy/code-playground';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { QuizEngine } from '@/components/academy/quiz-engine';
import { Confetti } from '@/components/gamification/confetti';
import { showXPToast } from '@/components/gamification/xp-toast';
import { XP_VALUES } from '@/types';

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

/** Shape of a quiz question as stored in src/content/quizzes/*.json. */
interface QuizQuestion {
  index: number;
  text: string;
  options: string[];
  correct: number[];
  explanation: string;
  isMulti: boolean;
}

interface QuizData {
  lectureId: string;
  en: { questions: QuizQuestion[] };
  ro: { questions: QuizQuestion[] };
  el: { questions: QuizQuestion[] };
  [key: string]: unknown;
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
async function ensurePyodide(): Promise<PyodideInterface> {
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
async function ensurePackages(pyodide: PyodideInterface, code: string): Promise<void> {
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
  } catch (err) {
    // Capture the Python traceback from the JS error
    caughtError = (err instanceof Error ? err.message : String(err)) || String(err);
  }

  const stdout = String(pyodide.runPython('sys.stdout.getvalue()') ?? '');
  const stderr = String(pyodide.runPython('sys.stderr.getvalue()') ?? '');

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
  (window as unknown as { runPyodideCode: (b: HTMLButtonElement) => Promise<void> }).runPyodideCode = async function runPyodideCode(button: HTMLButtonElement) {
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
    } catch (err) {
      outputDiv.classList.add('error');
      outputDiv.textContent = (err instanceof Error ? err.message : String(err)) || 'Error running code';
    }

    button.textContent = '▶ Run';
    button.disabled = false;
  };
}

/**
 * Interactive code block rendered from the codeBlocks JSON data.
 * Used for lectures where code is stored separately (not inline in HTML).
 */
function CodeBlockRunner({
  block,
  lang,
  lectureId,
  index,
}: {
  block: LectureContent['codeBlocks'][number];
  lang: string;
  lectureId: string;
  index: number;
}) {
  const title = typeof block.title === 'object'
    ? (block.title as Record<string, string>)[lang] || (block.title as Record<string, string>).en || ''
    : block.title || '';

  // W2.1 — honour the CI-verified `runnable` flag: only Python blocks that
  // genuinely execute in Pyodide are interactive. bash/yaml/html/Dockerfile and
  // torch/fastapi/openai examples stay read-only reference (clicking Run on a
  // Dockerfile used to produce a Python traceback).
  const isRunnable = block.runnable === true && (block.language || 'python') === 'python';
  const langLabel = (block.language || 'python').toUpperCase();

  // W2.6 — run handler for the editable playground. Awards the code-run XP once
  // per block on a successful run, reusing the existing progress signals.
  const handleRun = useCallback(
    async (code: string) => {
      const { stdout, stderr } = await runPythonCode(code);
      if (!stderr) {
        const blockId = block.id || `codeblock-${index}`;
        const latest = useAcademyStore.getState().progress;
        const current = latest[lectureId]?.codeBlocksRun || [];
        if (!current.includes(blockId)) {
          useAcademyStore.getState().updateProgress(lectureId, {
            codeBlocksRun: [...current, blockId],
          });
          const result = useAcademyStore.getState().awardXP('code', XP_VALUES.CODE_BLOCK_RUN, lectureId);
          showXPToast({
            amount: XP_VALUES.CODE_BLOCK_RUN,
            type: 'code',
            achievements: result.newAchievements,
            levelUp: result.leveledUp ? result.newLevel : undefined,
          });
        }
      }
      return { stdout, stderr };
    },
    [block, index, lectureId]
  );

  // W2.6 — runnable Python is now an EDITABLE playground (learners can change
  // the code and re-run). Everything else stays a read-only reference block.
  if (isRunnable) {
    return (
      <div data-block-id={block.id || `codeblock-${index}`}>
        <CodePlayground
          initialCode={block.code}
          language="python"
          title={title || `Code Block ${index + 1}`}
          editable
          onRun={handleRun}
        />
      </div>
    );
  }

  return (
    <div className="code-block" data-block-id={block.id || `codeblock-${index}`}>
      <div className="code-block-header">
        <span>{title || `${langLabel} — Code Block ${index + 1}`}</span>
        <span className="text-xs text-muted-foreground" title="This example needs packages the in-browser Python runtime does not provide.">
          {(block.language || 'python') === 'python' ? 'reference only' : langLabel}
        </span>
      </div>
      <pre>
        <code className={`language-${block.language || 'python'}`}>
          {block.code}
        </code>
      </pre>
    </div>
  );
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

  // Wire up inline Run buttons for Pyodide code blocks.
  // Handles three patterns:
  //   A) Existing .run-btn elements in lecture HTML (lectures 0, 7-10, etc.)
  //   B) <pre><code class="language-python"> blocks without a run button (lecture 54)
  //   C) Placeholder "# See Code Block N" references (lectures 52-53, 55) —
  //      these are replaced by the codeBlocks React rendering below.
  useEffect(() => {
    if (!contentRef.current) return;

    const container = contentRef.current;

    // Pattern B: Inject run buttons for bare Python code blocks that lack one.
    // Find all <pre> elements inside .code-block wrappers (or standalone)
    // whose <code> has class language-python but no sibling .run-btn.
    container.querySelectorAll('pre > code.language-python').forEach((codeEl) => {
      const pre = codeEl.parentElement;
      if (!pre) return;
      // Walk up to the .code-block wrapper, or use the <pre> itself
      const wrapper = pre.closest('.code-block') || pre.parentElement;
      if (!wrapper) return;
      // Skip if a run button already exists
      if (wrapper.querySelector('.run-btn')) return;

      // Create a header bar with a run button
      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = '<span>Python</span>';
      const runBtn = document.createElement('button');
      runBtn.className = 'run-btn';
      runBtn.textContent = '▶ Run';
      header.appendChild(runBtn);

      // Create output div
      const outputDiv = document.createElement('div');
      outputDiv.className = 'output';

      // Insert header before <pre> and output after <pre>
      pre.parentNode?.insertBefore(header, pre);
      if (pre.nextSibling) {
        pre.parentNode?.insertBefore(outputDiv, pre.nextSibling);
      } else {
        pre.parentNode?.appendChild(outputDiv);
      }
    });

    // Now attach handlers to ALL .run-btn elements (both original and injected)
    const runButtons = container.querySelectorAll('.run-btn');
    const handlers: Array<{ btn: Element; handler: (e: Event) => void }> = [];

    runButtons.forEach((btn) => {
      const handler = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();

        const button = btn as HTMLButtonElement;
        // Walk up to find the code: check .code-block wrapper, or sibling <pre>
        const wrapper = button.closest('.code-block') || button.closest('.code-block-header')?.parentElement;
        if (!wrapper) return;

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

          // Award XP for running code
          const allBlocks = container.querySelectorAll('.code-block, .code-block-header');
          const blockIndex = Array.from(allBlocks).indexOf(
            (wrapper.classList.contains('code-block') ? wrapper : button.closest('.code-block-header')) as Element
          );
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
        } catch (err) {
          outputDiv.classList.add('error');
          outputDiv.textContent = (err instanceof Error ? err.message : String(err)) || 'Error running code';
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
      // W1.1 — persist the signal server-side. Completion is decided by the
      // server from the database, never asserted by this component.
      void markScrolledToBottom(lectureId);
    }
  }, [scrolledToBottom, setScrolledToBottom, lectureId]);

  const handleMarkComplete = () => {
    if (!isCompleted) {
      // Optimistic local update for immediate feedback. The server decides
      // the authoritative value; loadProgressFromSupabase reconciles on the
      // next load, and the server never revokes a completion it granted.
      markCompleted(lectureId);
      void evaluateLectureCompletion(lectureId);
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

          {/* Render codeBlocks from JSON data (for lectures that use placeholder
              references like "See Code Block 1: ..." instead of inline HTML) */}
          {content.codeBlocks && content.codeBlocks.length > 0 && (
            <div className="content space-y-6">
              {content.codeBlocks.map((block, i) => (
                <CodeBlockRunner
                  key={block.id || `cb-${i}`}
                  block={block}
                  lang={lang}
                  lectureId={lectureId}
                  index={i}
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
