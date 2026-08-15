'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface LeaderboardRow {
  rank: number;
  alias: string;
  lecturesCompleted: number;
  xp: number;
  isMe: boolean;
}

export interface LeaderboardSettings {
  optIn: boolean;
  alias: string;
}

/**
 * Ranked, opt-in leaderboard. Reads through the SECURITY DEFINER
 * get_leaderboard() RPC, which returns only alias + server-verified score for
 * users who opted in (no names/emails). Returns [] for signed-out callers.
 */
export async function getLeaderboard(limit = 100): Promise<LeaderboardRow[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc('get_leaderboard', { p_limit: limit });
  if (error || !Array.isArray(data)) return [];

  return data.map((r: Record<string, unknown>) => ({
    rank: Number(r.rank),
    alias: String(r.alias ?? 'Learner'),
    lecturesCompleted: Number(r.lectures_completed ?? 0),
    xp: Number(r.xp ?? 0),
    isMe: Boolean(r.is_me),
  }));
}

/** The current user's own leaderboard opt-in + alias. */
export async function getMyLeaderboardSettings(): Promise<LeaderboardSettings> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { optIn: false, alias: '' };

  const { data } = await supabase
    .from('academy_students')
    .select('leaderboard_opt_in, leaderboard_alias')
    .eq('id', user.id)
    .maybeSingle();

  return {
    optIn: Boolean(data?.leaderboard_opt_in),
    alias: (data?.leaderboard_alias as string) || '',
  };
}

/**
 * Update the caller's own participation. RLS ("students_update_own_safe_fields")
 * scopes the write to their own row; the alias is trimmed and capped at 32 chars
 * (also enforced by a CHECK constraint).
 */
export async function setLeaderboardParticipation(
  optIn: boolean,
  alias: string
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const cleanAlias = (alias || '').trim().slice(0, 32);

  const { error } = await supabase
    .from('academy_students')
    .update({
      leaderboard_opt_in: optIn,
      leaderboard_alias: cleanAlias || null,
    })
    .eq('id', user.id);

  return { error: error ? error.message : null };
}
