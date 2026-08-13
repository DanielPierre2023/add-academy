'use client';

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/lib/auth/auth-context';
import { t } from '@/lib/i18n';
import { getLectureTitle } from '@/lib/lectures';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { showXPToast } from '@/components/gamification/xp-toast';
import { XP_VALUES } from '@/types';
import {
  X,
  Send,
  Trash2,
  Bot,
  User,
  Lightbulb,
  Bug,
  Wrench,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import type { AIMessage } from '@/types';

const MODE_CONFIG = {
  explain: { icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  debug: { icon: Bug, color: 'text-red-500', bg: 'bg-red-500/10' },
  build: { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10' },
} as const;

/** Fallback preset questions (used on Home / when no lecture is active). */
const SUGGESTIONS: Record<Language, string[]> = {
  en: [
    'What is attention mechanism?',
    'Help me debug my code',
    'How do I build a tokenizer?',
  ],
  ro: [
    'Ce este mecanismul de atenție?',
    'Ajută-mă să depanez codul',
    'Cum construiesc un tokenizer?',
  ],
  el: [
    'Τι είναι ο μηχανισμός προσοχής;',
    'Βοήθησέ με να διορθώσω τον κώδικά μου',
    'Πώς φτιάχνω έναν tokenizer;',
  ],
};

/**
 * Build lecture-aware starter questions from the active lecture's own title,
 * so suggestions are relevant on every lecture without editing content files.
 */
function suggestionsForLecture(lectureId: string | undefined, language: Language): string[] {
  if (!lectureId || lectureId === 'home') {
    return SUGGESTIONS[language] || SUGGESTIONS.en;
  }
  const title = getLectureTitle(lectureId, language);
  switch (language) {
    case 'ro':
      return [
        `Explică simplu ideea principală din „${title}”`,
        'M-am blocat — ajută-mă să depanez codul',
        'Verifică-mă: am înțeles corect această lecție?',
      ];
    case 'el':
      return [
        `Εξήγησε απλά την κύρια ιδέα του «${title}»`,
        'Κόλλησα — βοήθησέ με να διορθώσω τον κώδικα',
        'Έλεγξέ με: κατάλαβα σωστά αυτό το μάθημα;',
      ];
    default:
      return [
        `Explain the main idea of "${title}" simply`,
        "I'm stuck — help me debug my code",
        'Quick check: did I understand this lecture?',
      ];
  }
}

// ─── Lightweight, dependency-free markdown rendering ────────────────────────
// Renders to React nodes (never dangerouslySetInnerHTML), so it is XSS-safe by
// construction. Supports fenced code (with copy), inline code, bold, italics,
// links, headings and bullet/numbered lists — the subset the tutor emits.

const PY_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
  'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
  'try', 'while', 'with', 'yield', 'self', 'print', 'range', 'len',
]);
const JS_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
  'case', 'break', 'continue', 'new', 'class', 'extends', 'import', 'from', 'export', 'default',
  'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'this', 'null',
  'undefined', 'true', 'false', 'void', 'yield',
]);

function keywordsFor(lang: string): Set<string> {
  const l = (lang || '').toLowerCase();
  if (l.startsWith('js') || l.startsWith('ts') || l === 'javascript' || l === 'typescript') return JS_KEYWORDS;
  return PY_KEYWORDS; // default to Python (the course language)
}

/** Tokenize a code line into colored spans. Best-effort; falls back to plain. */
function highlightCode(code: string, lang: string): React.ReactNode[] {
  const keywords = keywordsFor(lang);
  const nodes: React.ReactNode[] = [];
  const master =
    /(#[^\n]*|\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  try {
    while ((m = master.exec(code)) !== null) {
      if (m.index > last) nodes.push(code.slice(last, m.index));
      if (m[1]) {
        nodes.push(<span key={key++} className="text-zinc-500 italic">{m[1]}</span>);
      } else if (m[2]) {
        nodes.push(<span key={key++} className="text-emerald-400">{m[2]}</span>);
      } else if (m[3]) {
        nodes.push(<span key={key++} className="text-amber-400">{m[3]}</span>);
      } else if (m[4]) {
        if (keywords.has(m[4])) {
          nodes.push(<span key={key++} className="text-sky-400 font-medium">{m[4]}</span>);
        } else {
          nodes.push(m[4]);
        }
      }
      last = m.index + m[0].length;
    }
    if (last < code.length) nodes.push(code.slice(last));
    return nodes;
  } catch {
    return [code];
  }
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, '').split('\n');
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }, [code]);

  return (
    <div className="my-2 overflow-hidden rounded-md border border-zinc-700 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
          {lang || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-zinc-400 transition-colors hover:text-zinc-100"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2 text-xs leading-relaxed">
        <code className="font-mono text-zinc-100">
          {lines.map((line, i) => (
            <span key={i} className="block">
              {line.length ? highlightCode(line, lang) : ' '}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** Parse inline markdown (code, bold, italic, links) into React nodes. */
function parseInline(text: string, keyPrefix = ''): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*|_[^_\n]+_)|(\[[^\]]+\]\([^)\s]+\))/;
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    const m = RE.exec(rest);
    if (!m || m.index === undefined) {
      nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    const token = m[0];
    if (m[1]) {
      nodes.push(
        <code key={`${keyPrefix}c${key++}`} className="rounded bg-muted-foreground/20 px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (m[2]) {
      nodes.push(<strong key={`${keyPrefix}b${key++}`}>{parseInline(token.slice(2, -2), `${keyPrefix}b${key}`)}</strong>);
    } else if (m[3]) {
      nodes.push(<em key={`${keyPrefix}i${key++}`}>{token.slice(1, -1)}</em>);
    } else if (m[4]) {
      const linkMatch = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(token);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${keyPrefix}l${key++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }
    rest = rest.slice(m.index + token.length);
  }
  return nodes;
}

const TutorMarkdown = memo(function TutorMarkdown({ content }: { content: string }) {
  const blocks = useMemo(() => {
    const out: React.ReactNode[] = [];
    const fence = /```(\w*)\n?([\s\S]*?)```/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let key = 0;

    const renderProse = (text: string) => {
      const lines = text.split('\n');
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === '') { i++; continue; }

        const h = /^(#{1,6})\s+(.*)$/.exec(line);
        if (h) {
          const level = h[1].length;
          out.push(
            <p key={`h${key++}`} className={cn('font-semibold', level <= 2 ? 'text-sm' : 'text-[0.95em]')}>
              {parseInline(h[2], `h${key}`)}
            </p>
          );
          i++;
          continue;
        }

        if (/^\s*[-*]\s+/.test(line)) {
          const items: string[] = [];
          while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
            items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
            i++;
          }
          out.push(
            <ul key={`ul${key++}`} className="my-1 list-disc space-y-0.5 pl-5">
              {items.map((it, j) => <li key={j}>{parseInline(it, `ul${key}-${j}`)}</li>)}
            </ul>
          );
          continue;
        }

        if (/^\s*\d+\.\s+/.test(line)) {
          const items: string[] = [];
          while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
            items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
            i++;
          }
          out.push(
            <ol key={`ol${key++}`} className="my-1 list-decimal space-y-0.5 pl-5">
              {items.map((it, j) => <li key={j}>{parseInline(it, `ol${key}-${j}`)}</li>)}
            </ol>
          );
          continue;
        }

        const para: string[] = [];
        while (
          i < lines.length &&
          lines[i].trim() !== '' &&
          !/^(#{1,6})\s+/.test(lines[i]) &&
          !/^\s*[-*]\s+/.test(lines[i]) &&
          !/^\s*\d+\.\s+/.test(lines[i])
        ) {
          para.push(lines[i]);
          i++;
        }
        out.push(
          <p key={`p${key++}`} className="whitespace-pre-wrap break-words leading-relaxed">
            {parseInline(para.join('\n'), `p${key}`)}
          </p>
        );
      }
    };

    while ((m = fence.exec(content)) !== null) {
      if (m.index > last) renderProse(content.slice(last, m.index));
      out.push(<CodeBlock key={`code${key++}`} code={m[2]} lang={m[1]} />);
      last = m.index + m[0].length;
    }
    if (last < content.length) renderProse(content.slice(last));

    return out;
  }, [content]);

  return <div className="space-y-2 text-sm">{blocks}</div>;
});

export function AITutor() {
  const {
    language,
    currentLecture,
    tutorOpen,
    setTutorOpen,
    tutorMessages,
    addTutorMessage,
    clearTutorMessages,
    tutorMode,
    setTutorMode,
    awardXP,
  } = useAcademyStore();
  const { session } = useAuth();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ limit?: number; used?: number } | null>(null);
  const [tutorQuestionsAsked, setTutorQuestionsAsked] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lang = language as Language;

  // ─── Draggable + resizable floating panel ───
  // `box` is null until the user first moves/resizes; while null the panel uses
  // its default bottom-right CSS placement. Once set, it is fully controlled.
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{ px: number; py: number; ow: number; oh: number } | null>(null);

  const clampBox = useCallback((b: { x: number; y: number; w: number; h: number }) => {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const w = Math.min(b.w, maxW - 8);
    const h = Math.min(b.h, maxH - 8);
    const x = Math.min(Math.max(b.x, 0), Math.max(0, maxW - w));
    const y = Math.min(Math.max(b.y, 0), Math.max(0, maxH - h));
    return { x, y, w, h };
  }, []);

  /** Read the panel's current on-screen rect (or a sensible default) and take control of it. */
  const ensureBox = useCallback(() => {
    const rect = panelRef.current?.getBoundingClientRect();
    const base =
      rect && rect.width
        ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
        : {
            w: 384,
            h: Math.min(640, Math.round(window.innerHeight * 0.7)),
            x: Math.max(8, window.innerWidth - 384 - 16),
            y: Math.max(8, window.innerHeight - 640 - 24),
          };
    const clamped = clampBox(base);
    setBox(clamped);
    return clamped;
  }, [clampBox]);

  const onHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    // Don't start a drag when the user taps the header's action buttons.
    if ((e.target as HTMLElement).closest('button')) return;
    const b = box ?? ensureBox();
    dragRef.current = { px: e.clientX, py: e.clientY, ox: b.x, oy: b.y };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
  }, [box, ensureBox]);

  const onHeaderPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    setBox((prev) => (prev ? clampBox({ ...prev, x: d.ox + dx, y: d.oy + dy }) : prev));
  }, [clampBox]);

  const endHeaderPointer = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }, []);

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    const b = box ?? ensureBox();
    resizeRef.current = { px: e.clientX, py: e.clientY, ow: b.w, oh: b.h };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
  }, [box, ensureBox]);

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    const w = Math.max(300, r.ow + (e.clientX - r.px));
    const h = Math.max(320, r.oh + (e.clientY - r.py));
    setBox((prev) => (prev ? clampBox({ ...prev, w, h }) : prev));
  }, [clampBox]);

  const endResizePointer = useCallback((e: React.PointerEvent) => {
    resizeRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }, []);

  // Keep a moved/resized panel inside the viewport when the window changes size.
  useEffect(() => {
    if (!box) return;
    const onResize = () => setBox((prev) => (prev ? clampBox(prev) : prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [box, clampBox]);

  // Reset conversation state when switching lectures (render-time pattern —
  // applies before paint and avoids an effect-triggered cascading render).
  const [prevLecture, setPrevLecture] = useState(currentLecture);
  if (currentLecture !== prevLecture) {
    setPrevLecture(currentLecture);
    setConversationId(null);
    setRateLimited(false);
    setRateLimitInfo(null);
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tutorMessages, isLoading]);

  useEffect(() => {
    if (tutorOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [tutorOpen]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading || rateLimited) return;

    const userMessage: AIMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
      lectureContext: currentLecture,
    };
    addTutorMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: message.trim(),
          mode: tutorMode,
          lectureId: currentLecture,
          language,
          history: tutorMessages.slice(-10),
          conversationId,
        }),
      });

      if (response.status === 429) {
        const data = await response.json().catch(() => ({}));
        setRateLimited(true);
        setRateLimitInfo({ limit: data.limit, used: data.used });
        addTutorMessage({
          role: 'assistant',
          content: t('tutor_rate_limit', language),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (response.status === 401) {
        addTutorMessage({
          role: 'assistant',
          content: t('tutor_login_required', language),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: data.response || t('tutor_error', language),
        timestamp: new Date().toISOString(),
      };
      addTutorMessage(assistantMessage);

      // Award XP for first tutor question per lecture
      const newCount = tutorQuestionsAsked + 1;
      setTutorQuestionsAsked(newCount);
      if (newCount === 1) {
        const result = awardXP('tutor', XP_VALUES.TUTOR_FIRST_QUESTION, currentLecture);
        showXPToast({
          amount: XP_VALUES.TUTOR_FIRST_QUESTION,
          type: 'tutor',
          achievements: result.newAchievements,
          levelUp: result.leveledUp ? result.newLevel : undefined,
        });
      }
    } catch {
      addTutorMessage({
        role: 'assistant',
        content: t('tutor_error', language),
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    rateLimited,
    currentLecture,
    tutorMode,
    language,
    tutorMessages,
    conversationId,
    tutorQuestionsAsked,
    addTutorMessage,
    awardXP,
    session,
  ]);

  const handleSend = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clearTutorMessages();
    setConversationId(null);
    setTutorQuestionsAsked(0);
    setRateLimited(false);
    setRateLimitInfo(null);
  };

  /** Click a suggestion → send it immediately */
  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const suggestions = useMemo(
    () => suggestionsForLecture(currentLecture, lang),
    [currentLecture, lang]
  );

  const lectureLabel =
    language === 'ro' ? 'Lecția' : language === 'el' ? 'Μάθημα' : 'Lecture';

  const tutorButtonLabel =
    language === 'ro' ? 'Tutor AI' : language === 'el' ? 'AI Καθηγητής' : 'AI Tutor';

  const tutorButtonTooltip =
    language === 'ro'
      ? 'Ai o întrebare? Întreabă tutorul tău AI!'
      : language === 'el'
        ? 'Έχετε ερώτηση; Ρωτήστε τον AI καθηγητή!'
        : 'Have a question? Ask your AI tutor!';

  return (
    <>
      {/* ═══ Floating Tutor Button ═══ */}
      {!tutorOpen && (
        <button
          onClick={() => setTutorOpen(true)}
          className="fixed bottom-24 right-6 z-40 group flex items-center gap-2 rounded-full bg-primary pl-1.5 pr-4 py-1.5 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          aria-label={tutorButtonLabel}
          title={tutorButtonTooltip}
        >
          {/* Tutor avatar — friendly graduation cap image */}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg">
            🎓
          </span>
          <span className="text-sm font-semibold hidden sm:inline">{tutorButtonLabel}</span>
        </button>
      )}

      {/* ═══ Floating Panel (draggable + resizable) ═══ */}
      {!tutorOpen ? null : (
      <div
        ref={panelRef}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl',
          !box && 'bottom-6 right-4 h-[70vh] max-h-[640px] w-[calc(100vw-2rem)] max-w-sm sm:right-6'
        )}
        style={box ? { left: box.x, top: box.y, width: box.w, height: box.h } : undefined}
      >
      {/* Header — drag handle */}
      <div
        className="flex items-center justify-between border-b px-4 py-3 shrink-0 cursor-move touch-none select-none"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={endHeaderPointer}
        onPointerCancel={endHeaderPointer}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t('tutor_title', language)}</h3>
            <p className="text-xs text-muted-foreground">
              {lectureLabel}: {currentLecture || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTutorOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-1 border-b px-4 py-2 shrink-0">
        {(Object.keys(MODE_CONFIG) as Array<keyof typeof MODE_CONFIG>).map((mode) => {
          const config = MODE_CONFIG[mode];
          const Icon = config.icon;
          return (
            <Button
              key={mode}
              variant={tutorMode === mode ? 'default' : 'ghost'}
              size="sm"
              className={cn('flex-1 gap-1.5', tutorMode === mode && config.bg)}
              onClick={() => setTutorMode(mode)}
            >
              <Icon className={cn('h-3.5 w-3.5', tutorMode === mode ? '' : config.color)} />
              <span className="text-xs">{t(`tutor_mode_${mode}`, language)}</span>
            </Button>
          );
        })}
      </div>

      {/* Rate limit warning */}
      {rateLimited && rateLimitInfo && (
        <div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 dark:bg-amber-950/30 shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {t('tutor_rate_limit', language)} ({rateLimitInfo.used}/{rateLimitInfo.limit})
          </p>
        </div>
      )}

      {/* Messages — plain overflow div instead of ScrollArea for reliable scrolling */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4"
      >
        <div className="space-y-4 py-4">
          {tutorMessages.length === 0 && (
            <div className="flex flex-col items-center gap-3 pt-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                🎓
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed px-4">
                {t('tutor_welcome', language)}
              </p>
              <Separator className="my-2" />
              <div className="grid gap-2 w-full">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-auto py-2 px-3 text-left whitespace-normal"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Lightbulb className="mr-2 h-3 w-3 shrink-0 text-yellow-500" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {tutorMessages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {msg.role === 'assistant' ? (
                  <TutorMarkdown content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                )}
                {msg.lectureContext && msg.role === 'user' && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {lectureLabel} {msg.lectureContext}
                  </Badge>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('tutor_thinking', language)}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4 shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={rateLimited ? t('tutor_rate_limit', language) : t('tutor_placeholder', language)}
            className="min-h-[44px] max-h-32 resize-none text-sm"
            rows={1}
            disabled={rateLimited}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || rateLimited}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resize grip — drag to make the panel wider / taller */}
      <div
        role="separator"
        aria-label="Resize tutor panel"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={endResizePointer}
        onPointerCancel={endResizePointer}
        className="absolute bottom-0 right-0 z-10 flex h-5 w-5 cursor-nwse-resize touch-none items-end justify-end p-1"
      >
        <span className="pointer-events-none block h-2.5 w-2.5 border-b-2 border-r-2 border-muted-foreground/50" />
      </div>
    </div>
      )}
    </>
  );
}
