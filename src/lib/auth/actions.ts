'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const rawRedirect = (formData.get('redirect') as string) || '/';
  // Only allow relative paths — prevent open redirect
  const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo);
}

export async function signUpWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;
  const enrollmentCode = formData.get('enrollmentCode') as string | null;

  const supabase = await createServerSupabaseClient();

  // If enrollment code provided, verify it's a valid school
  let schoolId: string | null = null;
  if (enrollmentCode) {
    // Safe projection view — verified schools only, no invite_code/contact_email.
    // See 004_fix_entitlement_rls.sql. handle_academy_signup() ignores school_id
    // in metadata, so this validates the code for UX only; membership is granted
    // exclusively by enrollInSchool().
    const { data: school } = await supabase
      .from('academy_schools_public')
      .select('id, verified')
      .eq('id', enrollmentCode)
      .maybeSingle();

    if (!school) {
      return { error: 'Invalid or unverified enrollment code.' };
    }
    schoolId = school.id;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        school_id: schoolId,
        tier: schoolId ? 'school' : 'free',
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://academy.add-individual-solutions.com'}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If school enrollment, update the student tier directly
  if (schoolId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('academy_students')
        .update({ tier: 'school', school_id: schoolId })
        .eq('id', user.id);
    }
  }

  return { success: true, message: 'Check your email to confirm your account.' };
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function getSession() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch the student profile with tier
  const { data: student } = await supabase
    .from('academy_students')
    .select('tier, school_id, full_name, display_name, avatar_url, preferred_language')
    .eq('id', user.id)
    .single();

  return {
    user: {
      id: user.id,
      email: user.email!,
      name: student?.full_name || student?.display_name || user.user_metadata?.full_name || '',
      avatarUrl: student?.avatar_url || user.user_metadata?.avatar_url || null,
      tier: (student?.tier || 'free') as 'free' | 'pro' | 'team' | 'enterprise' | 'school',
      schoolId: student?.school_id || null,
      preferredLanguage: student?.preferred_language || 'en',
    },
  };
}
