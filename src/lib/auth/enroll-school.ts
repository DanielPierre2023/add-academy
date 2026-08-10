'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Server action to enroll a student in a school by invite code.
 * This runs server-side so it can update sensitive columns (school_id,
 * org_role, tier) that are locked by RLS WITH CHECK for client writes.
 */
export async function enrollInSchool(inviteCode: string): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Look up the school by invite code
  const { data: school } = await supabase
    .from('academy_schools')
    .select('id, name, max_students, verified')
    .eq('invite_code', inviteCode.toUpperCase())
    .single();

  if (!school) return { error: 'Invalid organization code' };
  if (!school.verified) return { error: 'This organization has not been verified yet' };

  // Check current student count
  const { count } = await supabase
    .from('academy_students')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', school.id);

  if ((count ?? 0) >= school.max_students) {
    return { error: 'Organization has reached maximum seats' };
  }

  // Check if user already has a school
  const { data: existingStudent } = await supabase
    .from('academy_students')
    .select('school_id')
    .eq('id', user.id)
    .single();

  if (existingStudent?.school_id) {
    return { error: 'You are already enrolled in an organization' };
  }

  // Update student record via service role — bypasses WITH CHECK
  // restriction on sensitive columns. The server action IS the authorization gate.
  const admin = createServiceRoleClient();
  const { error: updateError } = await admin
    .from('academy_students')
    .update({
      school_id: school.id,
      org_role: 'member',
      tier: 'school',
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('School enrollment failed:', updateError);
    return { error: 'Failed to enroll. Please try again.' };
  }

  return { error: null };
}
