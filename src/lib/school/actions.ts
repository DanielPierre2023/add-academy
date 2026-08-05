'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface SchoolApplication {
  name: string;
  country: string;
  city: string;
  contactName: string;
  contactEmail: string;
}

export async function submitSchoolApplication(data: SchoolApplication) {
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
