'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import {
  syncProgressToSupabase,
  loadProgressFromSupabase,
} from '@/lib/store/progress-sync';

/**
 * Invisible component handling bi-directional progress sync between
 * localStorage (Zustand) and Supabase.
 *
 * W1.1 — the debounced sync used to be the ONLY trigger, and its timer was
 * cleared on effect cleanup. Navigating away or closing the tab within 5
 * seconds of the last change meant the sync simply never fired, and the
 * progress was lost. There was no `beforeunload`, `pagehide` or
 * `visibilitychange` handler anywhere in the codebase.
 *
 * Now: the debounce still handles the common case, and `pagehide` +
 * `visibilitychange` flush immediately so a closing tab cannot lose work.
 * `pagehide` is used rather than `beforeunload` because it is the one that
 * fires reliably on mobile Safari and for bfcache navigations.
 */
export function ProgressSyncProvider() {
  const { user } = useAuth();
  const progress = useAcademyStore((s) => s.progress);
  const quizScores = useAcademyStore((s) => s.quizScores);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const isDirtyRef = useRef(false);

  // Load server progress on login
  useEffect(() => {
    if (user?.id && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadProgressFromSupabase(user.id);
    }
    if (!user) {
      hasLoadedRef.current = false;
    }
  }, [user]);

  // Debounced sync on progress/quiz changes
  useEffect(() => {
    if (!user?.id) return;

    isDirtyRef.current = true;

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      isDirtyRef.current = false;
      void syncProgressToSupabase();
    }, 5000);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [user, progress, quizScores]);

  // Flush on tab hide / close / navigation away.
  useEffect(() => {
    if (!user?.id) return;

    const flush = () => {
      if (!isDirtyRef.current) return;
      isDirtyRef.current = false;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      // Fire-and-forget: the server action posts via fetch with keepalive
      // semantics under the hood, and we must not block unload.
      void syncProgressToSupabase();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      // Final flush when the provider itself unmounts (e.g. sign-out).
      flush();
    };
  }, [user]);

  return null; // Invisible component
}
