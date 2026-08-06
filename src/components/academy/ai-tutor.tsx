'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
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
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import type { AIMessage } from '@/types';

const MODE_CONFIG = {
  explain: { icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  debug: { icon: Bug, color: 'text-red-500', bg: 'bg-red-500/10' },
  build: { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10' },
} as const;

/** Translated preset questions keyed by language */
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

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ limit?: number; used?: number } | null>(null);
  const [tutorQuestionsAsked, setTutorQuestionsAsked] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset conversation ID when switching lectures
  useEffect(() => {
    setConversationId(null);
    setRateLimited(false);
    setRateLimitInfo(null);
  }, [currentLecture]);

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
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        const data = await response.json();
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
  }, [isLoading, rateLimited, currentLecture, tutorMode, language, tutorMessages, conversationId, tutorQuestionsAsked, addTutorMessage, awardXP]);

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

  if (!tutorOpen) return null;

  const lectureLabel =
    language === 'ro' ? 'Lecția' : language === 'el' ? 'Μάθημα' : 'Lecture';

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l bg-background shadow-2xl sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
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
        className="flex-1 overflow-y-auto px-4"
      >
        <div className="space-y-4 py-4">
          {tutorMessages.length === 0 && (
            <div className="flex flex-col items-center gap-3 pt-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed px-4">
                {t('tutor_welcome', language)}
              </p>
              <Separator className="my-2" />
              <div className="grid gap-2 w-full">
                {(SUGGESTIONS[language as Language] || SUGGESTIONS.en).map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-auto py-2 px-3 text-left"
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
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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
    </div>
  );
}
