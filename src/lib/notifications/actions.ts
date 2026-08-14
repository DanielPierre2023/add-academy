'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Mark one of the caller's own notifications as read.
 *
 * This is a server action rather than a client UPDATE + RLS policy on purpose.
 * An UPDATE policy would need a WITH CHECK re-asserting every immutable column
 * (kind, severity, all six title/body fields) via subqueries against the same
 * table from inside its own policy — fragile, and getting it wrong reproduces
 * the exact defect 004_fix_entitlement_rls.sql fixed, where a missing WITH
 * CHECK let any column be rewritten.
 *
 * Here only `read_at` is ever written, and ownership is verified server-side.
 */
export async function markNotificationRead(
  notificationId: string
): Promise<{ error: string | null }> {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!notificationId || !UUID.test(notificationId)) {
    return { error: 'Invalid notification id' };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const admin = createServiceRoleClient();
    const { error } = await admin
      .from('academy_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('student_id', user.id); // ownership enforced here, not by the client

    if (error) {
      console.error('[notifications] mark read failed:', error.message);
      return { error: 'Could not update notification' };
    }
    return { error: null };
  } catch (err) {
    console.error('[notifications] unexpected error:', err);
    return { error: 'Server error' };
  }
}
