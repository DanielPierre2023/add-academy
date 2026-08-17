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
import { createRoot, type Root } from 'react-dom/client';
import {
  collectAndReplaceCodeBlocks,
  decodeEntities,
  normalizeCode,
} from '@/lib/lecture-code-upgrade';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { QuizEngine } from '@/components/academy/quiz-engine';
import { LectureDiscussion } from '@/components/academy/lecture-discussion';
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

interface QuizData extends Partial<Record<Language, { questions: QuizQuestion[] }>> {
  lectureId: string;
  en: { questions: QuizQuestion[] };
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
/** Award the code-run XP once per (lecture, block). */
function awardCodeXp(lectureId: string, blockId: string) {
  const latest = useAcademyStore.getState().progress;
  const current = latest[lectureId]?.codeBlocksRun || [];
  if (current.includes(blockId)) return;
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

/** Read-only reference block (non-Python or non-runnable code). */
function ReadOnlyCodeBlock({ code, language, title }: { code: string; language: string; title?: string }) {
  const label = (language || 'python').toUpperCase();
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{title || label}</span>
        <span className="text-xs text-muted-foreground">
          {language === 'python' ? 'reference only' : label}
        </span>
      </div>
      <pre>
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}

/** Editable, runnable Python playground mounted inline in the prose (W2.6). */
function InlineRunnable({
  code,
  title,
  lectureId,
  blockId,
}: {
  code: string;
  title?: string;
  lectureId: string;
  blockId: string;
}) {
  const onRun = useCallback(
    async (src: string) => {
      const { stdout, stderr } = await runPythonCode(src);
      if (!stderr) awardCodeXp(lectureId, blockId);
      return { stdout, stderr };
    },
    [lectureId, blockId]
  );
  return <CodePlayground initialCode={code} language="python" title={title} editable onRun={onRun} />;
}

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
  const proseRef = useRef<HTMLDivElement>(null);
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

  // W2.6 — the bottom fallback list must show ONLY codeBlocks that are NOT
  // already rendered inline in the prose (otherwise every embedded block shows
  // twice — the double-render bug). A block is "inline" if the prose contains
  // an empty placeholder for its id, or the block's code appears in the prose
  // text. Empty-code blocks are dropped entirely.
  const decodedProse = normalizeCode(decodeEntities(lectureHtml));
  const bottomBlocks = (content.codeBlocks || [])
    .map((block, i) => ({ block, i }))
    .filter(({ block }) => {
      if (block.id && lectureHtml.includes(`data-block-id="${block.id}"`)) return false;
      const key = normalizeCode(block.code).slice(0, 60);
      if (key.length === 0) return false;
      return !decodedProse.includes(key);
    });
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

  // W2.6 — upgrade every code block embedded in the lecture prose into an
  // editable/runnable playground IN PLACE (next to the text that explains it),
  // replacing the old dead-`onclick` run buttons. Read-only reference blocks
  // (non-Python or non-runnable) render as a static, styled block. The bottom
  // fallback list below only renders codeBlocks that DON'T already appear here,
  // so nothing is shown twice.
  useEffect(() => {
    const container = proseRef.current;
    if (!container) return;

    // Index the JSON codeBlocks so we can (a) resolve empty placeholders and
    // (b) honour the CI-verified `runnable` flag when the same code is inline.
    const blocks = content.codeBlocks || [];
    const jsonByCode = new Map<string, LectureContent['codeBlocks'][number]>();
    const jsonById = new Map<string, LectureContent['codeBlocks'][number]>();
    for (const b of blocks) {
      jsonByCode.set(normalizeCode(b.code), b);
      if (b.id) jsonById.set(b.id, b);
    }
    const titleFor = (b: LectureContent['codeBlocks'][number] | undefined): string => {
      if (!b) return '';
      if (typeof b.title === 'object' && b.title) {
        const rec = b.title as Record<string, string>;
        return rec[lang] || rec.en || '';
      }
      return (b.title as string) || '';
    };

    const isRunnable = (code: string, cbLang: string): boolean => {
      if (cbLang !== 'python') return false;
      const j = jsonByCode.get(normalizeCode(code));
      // Inline python with no JSON entry is best-effort runnable; when it has a
      // JSON entry, honour the verified flag (bash/torch/etc. stay read-only).
      return j ? j.runnable === true : true;
    };
    const resolvePlaceholder = (blockId: string) => {
      const b = jsonById.get(blockId);
      return b
        ? { code: b.code, language: b.language, runnable: b.runnable, title: titleFor(b) }
        : undefined;
    };

    const sites = collectAndReplaceCodeBlocks(container, isRunnable, resolvePlaceholder);
    const roots: Root[] = [];

    sites.forEach((site, i) => {
      const j = jsonByCode.get(normalizeCode(site.code));
      const blockId = j?.id || `inline-${i}`;
      const title = site.title || titleFor(j);
      const root = createRoot(site.host);
      roots.push(root);
      if (site.runnable) {
        root.render(
          <InlineRunnable
            code={site.code}
            title={title}
            lectureId={lectureId}
            blockId={blockId}
          />
        );
      } else {
        root.render(
          <ReadOnlyCodeBlock code={site.code} language={site.language} title={title} />
        );
      }
    });

    // Defer unmount: React forbids synchronously unmounting a root while it may
    // be rendering (during the same commit). setTimeout(…,0) lets the current
    // work settle first, avoiding the "unmount while rendering" warning.
    return () => {
      const toUnmount = roots;
      setTimeout(() => {
        toUnmount.forEach((r) => r.unmount());
      }, 0);
    };
    // Re-run when the prose (language/lecture) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureHtml, lang, lectureId]);

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

          {/* Lecture HTML Content — styled by globals.css lecture classes.
              The effect above upgrades every <pre> in here into an inline
              playground, so code sits next to the prose that explains it. */}
          <div
            ref={proseRef}
            className="content"
            dangerouslySetInnerHTML={{ __html: lectureHtml }}
          />

          {/* Bottom fallback list — only the codeBlocks that DON'T already
              appear inline in the prose above (placeholder-only lectures, or
              blocks whose code isn't embedded in the HTML). This is what kills
              the old double-render: a block shown inline is filtered out here. */}
          {bottomBlocks.length > 0 && (
            <div className="content space-y-6">
              {bottomBlocks.map(({ block, i }) => (
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

          {/* Per-lecture community discussion (self-contained, fails soft) */}
          <LectureDiscussion lectureId={lectureId} />

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
