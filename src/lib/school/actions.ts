'use server';

import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const schoolApplicationSchema = z.object({
  name: z.string().min(2, 'School name must be at least 2 characters').max(200),
  country: z.string().min(2, 'Country is required').max(100),
  city: z.string().max(100).optional().default(''),
  contactName: z.string().min(2, 'Contact name is required').max(200),
  contactEmail: z.string().email('Invalid email address').max(254),
});

export interface SchoolApplication {
  name: string;
  country: string;
  city: string;
  contactName: string;
  contactEmail: string;
}

export async function submitSchoolApplication(data: SchoolApplication) {
  const parsed = schoolApplicationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid input.' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to apply.' };
  }

  // Check if user already has a school application
  const { data: existing } = await supabase
    .from('academy_schools')
    .select('id, verified')
    .eq('contact_user_id', user.id)
    .single();

  if (existing) {
    return {
      error: existing.verified
        ? 'Your school is already verified.'
        : 'You already have a pending application.',
    };
  }

  const { data: school, error } = await supabase
    .from('academy_schools')
    .insert({
      name: data.name,
      country: data.country,
      city: data.city || null,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_user_id: user.id,
      verified: false,
    })
    .select('id')
    .single();

  if (error) {
    return { error: 'Failed to submit application. Please try again.' };
  }

  return { success: true, schoolId: school.id };
}

export async function getMySchool() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: school } = await supabase
    .from('academy_schools')
    .select('*')
    .eq('contact_user_id', user.id)
    .single();

  return school;
}

export async function getSchoolStudents(schoolId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated', students: [] };

  // Verify this user owns the school
  const { data: school } = await supabase
    .from('academy_schools')
    .select('id')
    .eq('id', schoolId)
    .eq('contact_user_id', user.id)
    .single();

  if (!school) {
    return { error: 'Unauthorized', students: [] };
  }

  // Fetch students with their progress stats
  const { data: students, error } = await supabase
    .from('academy_students')
    .select(`
      id,
      email,
      full_name,
      display_name,
      avatar_url,
      tier,
      enrolled_at,
      last_active_at
    `)
    .eq('school_id', schoolId)
    .order('enrolled_at', { ascending: false });

  if (error) {
    return { error: 'Failed to fetch students', students: [] };
  }

  // Fetch progress for all school students
  const studentIds = (students || []).map((s) => s.id);

  if (studentIds.length === 0) {
    return { students: [] };
  }

  const { data: progress } = await supabase
    .from('academy_progress')
    .select('student_id, lecture_id, completed, quiz_score, time_spent_seconds')
    .in('student_id', studentIds);

  // Aggregate progress per student
  const progressMap = new Map<string, {
    lecturesCompleted: number;
    totalTime: number;
    quizScores: number[];
  }>();

  for (const p of progress || []) {
    if (!progressMap.has(p.student_id)) {
      progressMap.set(p.student_id, { lecturesCompleted: 0, totalTime: 0, quizScores: [] });
    }
    const agg = progressMap.get(p.student_id)!;
    if (p.completed) agg.lecturesCompleted++;
    agg.totalTime += p.time_spent_seconds || 0;
    if (p.quiz_score != null) agg.quizScores.push(Number(p.quiz_score));
  }

  const enrichedStudents = (students || []).map((s) => {
    const agg = progressMap.get(s.id) || { lecturesCompleted: 0, totalTime: 0, quizScores: [] };
    const quizAvg = agg.quizScores.length > 0
      ? Math.round(agg.quizScores.reduce((a, b) => a + b, 0) / agg.quizScores.length)
      : null;

    return {
      ...s,
      lecturesCompleted: agg.lecturesCompleted,
      totalTimeSeconds: agg.totalTime,
      quizAverage: quizAvg,
    };
  });

  return { students: enrichedStudents };
}

// ---------------------------------------------------------------------------
// Organisation member invitations
// ---------------------------------------------------------------------------

const inviteSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  fullName: z.string().max(120).optional(),
});

/**
 * Invite a new member to the caller's school.
 * The caller must be the school's contact user (org admin).
 * Sends a native Supabase invite email; the user sets a password on the
 * built-in confirm/reset-password page, then is enrolled as a 'member'.
 */
export async function inviteSchoolMember(data: { email: string; fullName?: string }) {
  const parsed = inviteSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid input.' };
  }
  const { email, fullName } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You must be logged in.' };
  }

  // Caller must own a school (contact_user_id).
  const { data: school } = await supabase
    .from('academy_schools')
    .select('id, name, max_students, current_students')
    .eq('contact_user_id', user.id)
    .single();

  if (!school) {
    return { error: 'Only a school administrator can invite members.' };
  }

  if (school.max_students != null && (school.current_students ?? 0) >= school.max_students) {
    return { error: 'Your school has reached its member limit.' };
  }

  const admin = createServiceRoleClient();
  const token = randomUUID();

  // Record the pending invitation.
  const { error: invError } = await admin.from('academy_invitations').insert({
    email,
    full_name: fullName ?? null,
    org_role: 'member',
    school_id: school.id,
    token,
    invited_by: user.id,
    status: 'pending',
  });
  if (invError) {
    return { error: 'Could not create the invitation.' };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://academy.add-individual-solutions.com';
  const redirectTo = `${site}/auth/callback?next=${encodeURIComponent('/auth/reset-password?welcome=1')}`;

  // Native Supabase invite (sends email + magic link).
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { school_id: school.id, full_name: fullName ?? null, invite_token: token },
    redirectTo,
  });

  if (inviteError) {
    // User may already exist -> fall back to a magic sign-in link.
    const { error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    });
    if (linkError) {
      return { error: 'Invitation saved, but the email could not be sent.' };
    }
  }

  return { success: true, email };
}

/**
 * Finalise enrollment after an invited user has authenticated (via the magic
 * link) and set a password. Enrolls them as a 'member' of the invited school.
 */
export async function acceptInvitation(token: string) {
  if (!token) return { error: 'Missing invitation token.' };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated.' };
  }

  const admin = createServiceRoleClient();

  const { data: invitation } = await admin
    .from('academy_invitations')
    .select('id, email, full_name, org_role, school_id, status, expires_at')
    .eq('token', token)
    .single();

  if (!invitation) {
    return { error: 'Invalid invitation.' };
  }
  if (invitation.status === 'accepted') {
    return { success: true };
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return { error: 'This invitation has expired.' };
  }
  if (invitation.email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
    return { error: 'This invitation was issued to a different email address.' };
  }

  // Enroll the member (never as admin).
  const { error: enrollError } = await admin
    .from('academy_students')
    .upsert(
      {
        id: user.id,
        email: invitation.email,
        full_name: invitation.full_name,
        school_id: invitation.school_id,
        org_role: 'student', // CHECK: 'admin' | 'teacher' | 'student' — 'member' violated it
        tier: 'school', // CHECK: 'free'|'pro'|'team'|'enterprise'|'school' — 'org' violated it
      },
      { onConflict: 'id' }
    );

  if (enrollError) {
    return { error: 'Could not complete enrollment.' };
  }

  // Mark the invitation accepted.
  await admin
    .from('academy_invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  // Keep the school's member count in sync (helper is optional).
  await admin
    .rpc('increment_school_students', { p_school_id: invitation.school_id })
    .then(() => {}, () => {});

  return { success: true };
}
