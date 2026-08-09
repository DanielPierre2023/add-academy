'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import {
  syncProgressToSupabase,
  loadProgressFromSupabase,
} from '@/lib/store/progress-sync';

/**
 * Invisible component that handles bi-directional progress sync
 * between localStorage (Zustand) and Supabase.
 *
 * - On login: loads server-side progress and merges with local
 * - After completing a lecture or quiz: pushes local progress to server
 *
 * Must be placed inside both AuthProvider and AcademyStore context.
 */
export function ProgressSyncProvider() {
  const { user } = useAuth();
  const progress = useAcademyStore((s) => s.progress);
  const quizScores = useAcademyStore((s) => s.quizScores);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

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

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      syncProgressToSupabase(user.id);
    }, 5000); // Sync 5 seconds after last change

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [user, progress, quizScores]);

  return null; // Invisible component
}
