'use server';

/**
 * W1.2 — server-issued, verifiable, non-forgeable certificates.
 *
 * THE PROBLEM (before this file existed)
 * -------------------------------------
 * The certificate table, its owner-read RLS policy, the verify_certificate()
 * RPC and /api/verify-certificate all existed — but no code ever wrote a
 * certificate row. So:
 *   - the public verifier returned "invalid" for every hash (table empty);
 *   - certificate/page.tsx computed eligibility from the client Zustand store
 *     and let the learner TYPE ANY NAME, then generated the file in the
 *     browser. Both the eligibility and the name were fully forgeable.
 *
 * THE GUARANTEE
 * -------------
 * A certificate is minted only here, on the server, after re-deriving
 * completion FROM THE DATABASE (never from the request). The recipient name is
 * the account's profile name, not a per-download string. Once a profile name
 * exists it cannot be overridden at issue time, so a learner cannot mint a
 * certificate in someone else's name. Issuance is idempotent (unique
 * (student_id, course_name) — migration 007).
 */

import { randomBytes } from 'crypto';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getLectureIndex } from '@/lib/lectures';

const COURSE_NAME = 'Building Large Language Models from Scratch';

/** Completion threshold, as a percentage of non-home lectures. */
const ELIGIBILITY_PERCENT = 80;

export interface IssuedCertificate {
  recipientName: string;
  courseName: string;
  completionDate: string; // ISO
  lecturesCompleted: number;
  totalLectures: number;
  quizAverage: number; // 0–100, rounded
  verificationHash: string;
  verifyUrl: string;
}

export interface CertificateStatus {
  eligible: boolean;
  percentage: number;
  completedLectures: number;
  totalLectures: number;
  /** True when the learner is eligible but has no profile name to issue under. */
  needsName: boolean;
  certificate: IssuedCertificate | null;
  error: string | null;
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://academy.add-individual-solutions.com'
  ).replace(/\/+$/, '');
}

function verifyUrlFor(hash: string): string {
  return `${siteUrl()}/verify/${hash}`;
}

function totalLectureCount(): number {
  return getLectureIndex().lectures.filter((l) => l.id !== 'home').length;
}

/**
 * Name accepted for a certificate. Allows letters from any language (RO/EL
 * diacritics included), spaces, hyphens, apostrophes and dots. 2–80 chars.
 */
function normaliseName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2 || trimmed.length > 80) return null;
  if (!/^[\p{L}][\p{L}\p{M}\s.'-]*$/u.test(trimmed)) return null;
  return trimmed;
}

/** Average of each lecture's BEST quiz score, 0–100 rounded. */
async function computeQuizAverage(
  admin: ReturnType<typeof createServiceRoleClient>,
  studentId: string
): Promise<number> {
  const { data, error } = await admin
    .from('academy_quiz_submissions')
    .select('lecture_id, score')
    .eq('student_id', studentId);

  if (error || !data || data.length === 0) return 0;

  const bestByLecture = new Map<string, number>();
  for (const row of data) {
    const score = Number(row.score) || 0;
    const prev = bestByLecture.get(row.lecture_id);
    if (prev === undefined || score > prev) bestByLecture.set(row.lecture_id, score);
  }
  const scores = [...bestByLecture.values()];
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function toIssued(row: {
  certificate_name: string;
  course_name: string | null;
  completion_date: string;
  lectures_completed: number;
  quiz_average: number | null;
  verification_hash: string;
}): IssuedCertificate {
  return {
    recipientName: row.certificate_name,
    courseName: row.course_name ?? COURSE_NAME,
    completionDate: row.completion_date,
    lecturesCompleted: row.lectures_completed,
    totalLectures: totalLectureCount(),
    quizAverage: Math.round(Number(row.quiz_average ?? 0)),
    verificationHash: row.verification_hash,
    verifyUrl: verifyUrlFor(row.verification_hash),
  };
}

/**
 * Read-only status for rendering the certificate page. Never mints anything.
 */
export async function getCertificateStatus(): Promise<CertificateStatus> {
  const base: CertificateStatus = {
    eligible: false,
    percentage: 0,
    completedLectures: 0,
    totalLectures: totalLectureCount(),
    needsName: false,
    certificate: null,
    error: null,
  };

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ...base, error: 'Not authenticated' };

    const admin = createServiceRoleClient();

    // Existing certificate short-circuits everything.
    const { data: existing } = await admin
      .from('academy_certificates')
      .select(
        'certificate_name, course_name, completion_date, lectures_completed, quiz_average, verification_hash'
      )
      .eq('student_id', user.id)
      .eq('course_name', COURSE_NAME)
      .maybeSingle();

    const total = totalLectureCount();

    const { count: completed } = await admin
      .from('academy_progress')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('completed', true);

    const completedLectures = completed ?? 0;
    const percentage = total > 0 ? Math.round((completedLectures / total) * 100) : 0;
    const eligible = percentage >= ELIGIBILITY_PERCENT;

    if (existing) {
      return {
        eligible: true,
        percentage,
        completedLectures,
        totalLectures: total,
        needsName: false,
        certificate: toIssued(existing),
        error: null,
      };
    }

    // Does the account carry a name we can issue under?
    const { data: student } = await admin
      .from('academy_students')
      .select('full_name, display_name')
      .eq('id', user.id)
      .maybeSingle();
    const profileName = normaliseName(student?.full_name) ?? normaliseName(student?.display_name);

    return {
      eligible,
      percentage,
      completedLectures,
      totalLectures: total,
      needsName: eligible && !profileName,
      certificate: null,
      error: null,
    };
  } catch (err) {
    console.error('[certificate] status error:', err);
    return { ...base, error: 'Server error' };
  }
}

/**
 * Mint (or return the existing) certificate. Re-derives eligibility from the
 * database; the request cannot assert completion or an arbitrary name.
 *
 * @param nameInput used ONLY when the profile has no name yet — it is then
 *   persisted to the profile (becoming the account identity) and used. If the
 *   profile already has a name, nameInput is ignored.
 */
export async function issueCertificate(nameInput?: string): Promise<CertificateStatus> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const s = await getCertificateStatus();
      return { ...s, error: 'Not authenticated' };
    }

    const admin = createServiceRoleClient();
    const total = totalLectureCount();

    // 1. Idempotent: return the existing certificate untouched.
    const { data: existing } = await admin
      .from('academy_certificates')
      .select(
        'certificate_name, course_name, completion_date, lectures_completed, quiz_average, verification_hash'
      )
      .eq('student_id', user.id)
      .eq('course_name', COURSE_NAME)
      .maybeSingle();
    if (existing) {
      const { count: completedNow } = await admin
        .from('academy_progress')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('completed', true);
      return {
        eligible: true,
        percentage: total > 0 ? Math.round(((completedNow ?? 0) / total) * 100) : 0,
        completedLectures: completedNow ?? 0,
        totalLectures: total,
        needsName: false,
        certificate: toIssued(existing),
        error: null,
      };
    }

    // 2. Re-derive eligibility from the database.
    const { count: completed } = await admin
      .from('academy_progress')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('completed', true);
    const completedLectures = completed ?? 0;
    const percentage = total > 0 ? Math.round((completedLectures / total) * 100) : 0;

    if (percentage < ELIGIBILITY_PERCENT) {
      return {
        eligible: false,
        percentage,
        completedLectures,
        totalLectures: total,
        needsName: false,
        certificate: null,
        error: 'not_eligible',
      };
    }

    // 3. Resolve the recipient name. Profile name wins and is authoritative.
    const { data: student } = await admin
      .from('academy_students')
      .select('full_name, display_name')
      .eq('id', user.id)
      .maybeSingle();
    let recipient = normaliseName(student?.full_name) ?? normaliseName(student?.display_name);

    if (!recipient) {
      const provided = normaliseName(nameInput);
      if (!provided) {
        return {
          eligible: true,
          percentage,
          completedLectures,
          totalLectures: total,
          needsName: true,
          certificate: null,
          error: 'name_required',
        };
      }
      // Persist to the profile so it becomes the account identity, not a
      // throwaway string, then use it.
      const { error: nameErr } = await admin
        .from('academy_students')
        .update({ full_name: provided, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (nameErr) {
        console.error('[certificate] name persist failed:', nameErr.message);
        return {
          eligible: true,
          percentage,
          completedLectures,
          totalLectures: total,
          needsName: true,
          certificate: null,
          error: 'Server error',
        };
      }
      recipient = provided;
    }

    // 4. Compute stats and mint.
    const quizAverage = await computeQuizAverage(admin, user.id);
    const hash = randomBytes(24).toString('hex'); // 48 hex chars
    const nowIso = new Date().toISOString();

    const { data: inserted, error: insErr } = await admin
      .from('academy_certificates')
      .insert({
        student_id: user.id,
        certificate_name: recipient,
        course_name: COURSE_NAME,
        completion_date: nowIso,
        quiz_average: quizAverage,
        lectures_completed: completedLectures,
        verification_hash: hash,
      })
      .select(
        'certificate_name, course_name, completion_date, lectures_completed, quiz_average, verification_hash'
      )
      .single();

    if (insErr || !inserted) {
      // Lost an idempotency race — fetch the winner rather than erroring.
      const { data: raced } = await admin
        .from('academy_certificates')
        .select(
          'certificate_name, course_name, completion_date, lectures_completed, quiz_average, verification_hash'
        )
        .eq('student_id', user.id)
        .eq('course_name', COURSE_NAME)
        .maybeSingle();
      if (raced) {
        return {
          eligible: true,
          percentage,
          completedLectures,
          totalLectures: total,
          needsName: false,
          certificate: toIssued(raced),
          error: null,
        };
      }
      console.error('[certificate] insert failed:', insErr?.message);
      return {
        eligible: true,
        percentage,
        completedLectures,
        totalLectures: total,
        needsName: false,
        certificate: null,
        error: 'Could not issue certificate',
      };
    }

    return {
      eligible: true,
      percentage,
      completedLectures,
      totalLectures: total,
      needsName: false,
      certificate: toIssued(inserted),
      error: null,
    };
  } catch (err) {
    console.error('[certificate] issue error:', err);
    const s = await getCertificateStatus().catch(() => null);
    return (
      s ?? {
        eligible: false,
        percentage: 0,
        completedLectures: 0,
        totalLectures: totalLectureCount(),
        needsName: false,
        certificate: null,
        error: 'Server error',
      }
    );
  }
}
