'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Server action to enroll a student in an organisation by invite code.
 *
 * This server action IS the authorization gate. It runs server-side so it can
 * write the sensitive columns (school_id, org_role, tier) that RLS locks
 * against client writes.
 *
 * SECURITY NOTES (004_fix_entitlement_rls.sql)
 * --------------------------------------------
 * 1. The invite-code lookup MUST use the service-role client. `invite_code` is
 *    a bearer secret and academy_schools is deliberately no longer readable by
 *    ordinary authenticated users — previously ANY logged-in user could run
 *      GET /rest/v1/academy_schools?select=invite_code
 *    and harvest every organisation's code.
 *
 * 2. The seat count must also use the service-role client: RLS scopes
 *    academy_students to the caller's own row, so a user-scoped count would
 *    always return 0 or 1 and the seat cap would never bind.
 *
 * 3. org_role is written as 'student', NOT 'member'. The CHECK constraint
 *    academy_students_org_role_check permits only 'admin' | 'teacher' |
 *    'student', so the previous 'member' value made this UPDATE fail 100% of
 *    the time — organisation enrollment has never actually worked.
 */
export async function enrollInSchool(inviteCode: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const code = inviteCode.trim().toUpperCase();
  if (!code) {
    return { error: 'Invalid organization code' };
  }

  // Best-effort brute-force protection on a secret code.
  // W1.5: durable when Upstash is configured, in-memory fallback otherwise.
  // Keyed by user so it cannot be evaded by IP rotation.
  const rl = await rateLimit(`enroll:${user.id}`, 5, 60 * 60 * 1000);
  if (!rl.success) {
    return { error: 'Too many attempts. Please try again later.' };
  }

  // Service role: invite_code is not readable by the user's own client.
  const admin = createServiceRoleClient();

  const { data: school, error: lookupError } = await admin
    .from('academy_schools')
    .select('id, name, max_students, verified')
    .eq('invite_code', code)
    .maybeSingle();

  if (lookupError) {
    console.error('School lookup failed:', lookupError);
    return { error: 'Failed to enroll. Please try again.' };
  }

  // Same message for "no such code" and "not verified" would be friendlier to
  // an attacker probing codes; but distinguishing them is genuinely useful to
  // a real student whose org is pending. Verification state is not a secret.
  if (!school) return { error: 'Invalid organization code' };
  if (!school.verified) {
    return { error: 'This organization has not been verified yet' };
  }

  // Seat check — service role, because RLS would scope this to the caller.
  const { count, error: countError } = await admin
    .from('academy_students')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', school.id);

  if (countError) {
    console.error('Seat count failed:', countError);
    return { error: 'Failed to enroll. Please try again.' };
  }

  if ((count ?? 0) >= (school.max_students ?? 0)) {
    return { error: 'Organization has reached maximum seats' };
  }

  // Check whether the user already belongs to an organisation.
  const { data: existingStudent } = await admin
    .from('academy_students')
    .select('school_id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingStudent?.school_id) {
    return { error: 'You are already enrolled in an organization' };
  }

  // Grant membership. Service role bypasses the RLS WITH CHECK that (correctly)
  // forbids clients from writing these columns themselves.
  const { error: updateError } = await admin
    .from('academy_students')
    .update({
      school_id: school.id,
      org_role: 'student', // CHECK: 'admin' | 'teacher' | 'student'
      tier: 'school',      // CHECK: 'free' | 'pro' | 'team' | 'enterprise' | 'school'
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('School enrollment failed:', updateError);
    return { error: 'Failed to enroll. Please try again.' };
  }

  return { error: null };
}
