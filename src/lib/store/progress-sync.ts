'use client';

import { getSupabase } from '@/lib/auth/supabase';
import { useAcademyStore } from './academy-store';

/**
 * Syncs local progress data from Zustand/localStorage to the
 * `academy_progress` table in Supabase.
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
    const supabase = getSupabase();
    const state = useAcademyStore.getState();
    const entries = Object.values(state.progress);

    if (entries.length === 0) return;

    // Upsert each completed lecture's progress
    const rows = entries
      .filter((p) => p.completed || p.quizScore !== null || p.timeSpent > 60)
      .map((p) => ({
        student_id: userId,
        lecture_id: p.lectureId,
        completed: p.completed,
        quiz_score: p.quizScore,
        time_spent_seconds: Math.round(p.timeSpent),
        completed_at: p.completedAt || null,
        updated_at: new Date().toISOString(),
      }));

    if (rows.length === 0) return;

    // Batch upsert — uses student_id + lecture_id as the conflict key
    const { error } = await supabase
      .from('academy_progress')
      .upsert(rows, {
        onConflict: 'student_id,lecture_id',
        ignoreDuplicates: false,
      });

    if (error) {
      // Log but don't throw — sync is best-effort
      console.warn('[progress-sync] Failed to sync progress:', error.message);
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
 */
export async function loadProgressFromSupabase(userId: string): Promise<void> {
  try {
    const supabase = getSupabase();
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
