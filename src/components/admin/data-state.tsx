// src/components/admin/data-state.tsx
'use client';

import type { ReactNode } from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DataState({
  loading,
  error,
  isEmpty,
  emptyLabel = 'No data yet.',
  onRetry,
  children,
  className,
}: {
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyLabel?: string;
  onRetry?: () => void;
  children: ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex flex-col items-center justify-center py-12 text-muted-foreground',
          className,
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        <span className="mt-2 text-sm">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className={cn('flex flex-col items-center justify-center py-12 text-center', className)}
      >
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
        <p className="mt-2 text-sm text-destructive">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-12 text-muted-foreground',
          className,
        )}
      >
        <Inbox className="h-6 w-6" aria-hidden />
        <p className="mt-2 text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return <>{children}</>;
}
