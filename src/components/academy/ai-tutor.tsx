'use client';

import { useState, useRef, useEffect } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import type { AIMessage } from '@/types';

const MODE_CONFIG = {
  explain: { icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  debug: { icon: Bug, color: 'text-red-500', bg: 'bg-red-500/10' },
  build: { icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-500/10' },
} as const;

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
  } = useAcademyStore();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorMessages]);

  useEffect(() => {
    if (tutorOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [tutorOpen]);

  const handleSend = async () => {
    const message = input.trim();
    if (!message || isLoading) return;

    const userMessage: AIMessage = {
      role: 'user',
      content: message,
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
          message,
          mode: tutorMode,
          lectureId: currentLecture,
          language,
          history: tutorMessages.slice(-10),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: data.response || 'Sorry, I could not generate a response.',
        timestamp: new Date().toISOString(),
      };
      addTutorMessage(assistantMessage);
    } catch {
      addTutorMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!tutorOpen) return null;

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l bg-background shadow-2xl sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t('tutor_title', language)}</h3>
            <p className="text-xs text-muted-foreground">
              Lecture: {currentLecture}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearTutorMessages}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTutorOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-1 border-b px-4 py-2">
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

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
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
                {[
                  'What is attention mechanism?',
                  'Help me debug my code',
                  'How do I build a tokenizer?',
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="justify-start text-xs h-auto py-2 px-3"
                    onClick={() => {
                      setInput(suggestion);
                      textareaRef.current?.focus();
                    }}
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
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.lectureContext && msg.role === 'user' && (
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    Lecture {msg.lectureContext}
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
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('tutor_placeholder', language)}
            className="min-h-[44px] max-h-32 resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
