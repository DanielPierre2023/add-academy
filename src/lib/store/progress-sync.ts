'use client';

import { createClient } from '@/lib/supabase/client';
import { useAcademyStore } from './academy-store';
import { syncProgress } from './progress-actions';

/**
 * Syncs local progress data from Zustand/localStorage to the
 * `academy_progress` table in Supabase via a server action.
 *
 * Progress writes go through the server action (not direct client
 * writes) because RLS enforces read-only access for clients on
 * academy_progress. Only non-authoritative fields (time spent) are
 * synced; completion status and quiz scores are written exclusively
 * by the server-side quiz validator (/api/quiz) and must never be
 * sent from the client.
 *
 * Designed to be called after key user actions (completing a lecture,
 * finishing a quiz) without blocking the UI. Failures are logged but
 * never interrupt the user experience.
 */

let syncInFlight = false;

export async function syncProgressToSupabase(userId: string): Promise<void> {
  if (syncInFlight) return;
  syncInFlight = true;

  try {
    const state = useAcademyStore.getState();
    const entries = Object.values(state.progress);

    if (entries.length === 0) return;

    // Sync only entries with meaningful activity. We no longer key off
    // completed/quizScore here because those are server-owned; we just
    // persist accumulated time so the server has an accurate record.
    const toSync = entries
      .filter((p) => p.timeSpent > 60)
      .map((p) => ({
        lectureId: p.lectureId,
        timeSpent: Math.round(p.timeSpent),
      }));

    if (toSync.length === 0) return;

    // Sync via server action (bypasses read-only RLS)
    const result = await syncProgress(toSync);

    if (result.error) {
      console.warn('[progress-sync] Server sync failed:', result.error);
    }
  } catch (err) {
    console.warn('[progress-sync] Unexpected error:', err);
  } finally {
    syncInFlight = false;
  }
}

/**
 * Loads progress from Supabase and merges with local state.
 * Server data wins for completed status; local data wins for time spent
 * (since it accumulates client-side).
 *
 * This uses the client directly since it's a SELECT (still allowed by RLS).
 */
export async function loadProgressFromSupabase(userId: string): Promise<void> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('academy_progress')
      .select('lecture_id, completed, quiz_score, time_spent_seconds, completed_at')
      .eq('student_id', userId);

    if (error || !data) {
      console.warn('[progress-sync] Failed to load server progress:', error?.message);
      return;
    }

    const state = useAcademyStore.getState();

    for (const row of data) {
      const local = state.progress[row.lecture_id];
      // Only merge if server has data the client doesn't
      if (!local || (!local.completed && row.completed)) {
        state.updateProgress(row.lecture_id, {
          completed: row.completed || local?.completed || false,
          quizScore: row.quiz_score ?? local?.quizScore ?? null,
          timeSpent: Math.max(row.time_spent_seconds || 0, local?.timeSpent || 0),
          completedAt: row.completed_at || local?.completedAt || null,
        });
      }
    }
  } catch (err) {
    console.warn('[progress-sync] Unexpected error loading:', err);
  }
}
'use client';

import { createClient } from '@/lib/supabase/client';
import { useAcademyStore } from './academy-store';
import { syncProgress } from './progress-actions';

/**
 * Syncs local progress data from Zustand/localStorage to the
 * `academy_progress` table in Supabase via a server action.
 *
 * Progress writes go through the server action (not direct client
 * writes) because RLS enforces read-only access for clients on
 * academy_progress. This prevents score forgery while allowing
 * legitimate progress tracking.
 *
 * Designed to be called after key user actions (completing a lecture,
 * finishing a quiz) without blocking the UI. Failures are logged but
 * never interrupt the user experience.
 */

let syncInFlight = false;

export async function syncProgressToSupabase(userId: string): Promise<void> {
  if (syncInFlight) return;
  syncInFlight = true;

  try {
    const state = useAcademyStore.getState();
    const entries = Object.values(state.progress);

    if (entries.length === 0) return;

    // Filter to entries worth syncing
    const toSync = entries
      .filter((p) => p.completed || p.quizScore !== null || p.timeSpent > 60)
      .map((p) => ({
        lectureId: p.lectureId,
        completed: p.completed,
        quizScore: p.quizScore,
        timeSpent: Math.round(p.timeSpent),
        completedAt: p.completedAt || null,
      }));

    if (toSync.length === 0) return;

    // Sync via server action (bypasses read-only RLS)
    const result = await syncProgress(toSync);

    if (result.error) {
      console.warn('[progress-sync] Server sync failed:', result.error);
    }
  } catch (err) {
    console.warn('[progress-sync] Unexpected error:', err);
  } finally {
    syncInFlight = false;
  }
}

/**
 * Loads progress from Supabase and merges with local state.
 * Server data wins for completed status; local data wins for time spent
 * (since it accumulates client-side).
 *
 * This uses the client directly since it's a SELECT (still allowed by RLS).
 */
export async function loadProgressFromSupabase(userId: string): Promise<void> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('academy_progress')
      .select('lecture_id, completed, quiz_score, time_spent_seconds, completed_at')
      .eq('student_id', userId);

    if (error || !data) {
      console.warn('[progress-sync] Failed to load server progress:', error?.message);
      return;
    }

    const state = useAcademyStore.getState();

    for (const row of data) {
      const local = state.progress[row.lecture_id];
      // Only merge if server has data the client doesn't
      if (!local || (!local.completed && row.completed)) {
        state.updateProgress(row.lecture_id, {
          completed: row.completed || local?.completed || false,
          quizScore: row.quiz_score ?? local?.quizScore ?? null,
          timeSpent: Math.max(row.time_spent_seconds || 0, local?.timeSpent || 0),
          completedAt: row.completed_at || local?.completedAt || null,
        });
      }
    }
  } catch (err) {
    console.warn('[progress-sync] Unexpected error loading:', err);
  }
}
