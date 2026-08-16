'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Admin "Send email" — delivers via Resend's REST API (no SDK dependency).
 *
 * Security: the caller MUST be a platform admin (is_academy_admin). Recipient
 * lists for bulk sends are resolved server-side from academy_students via the
 * service role; bulk mail goes out as BCC in batches so recipients never see
 * each other's addresses.
 *
 * Config (Vercel env):
 *   RESEND_API_KEY  — required to actually send (else returns a clear error)
 *   EMAIL_FROM      — verified sender, e.g. "ADD Academica <noreply@add-individual-solutions.com>"
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const BATCH_SIZE = 50; // Resend allows up to 50 recipients per message

export type AdminEmailType = 'all' | 'org' | 'individual';

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string[];
  bcc?: string[];
  subject: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      ...(params.bcc && params.bcc.length ? { bcc: params.bcc } : {}),
      subject: params.subject,
      text: params.text,
      html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;line-height:1.5">${escapeHtml(
        params.text
      )}</div>`,
    }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j?.message || j?.error || detail;
    } catch {
      /* ignore */
    }
    console.error('[admin-email] Resend rejected:', res.status, detail);
    return { ok: false, error: detail };
  }
  return { ok: true };
}

export async function sendAdminEmail(input: {
  type: AdminEmailType;
  to?: string;
  subject: string;
  body: string;
}): Promise<{ sent: number; error: string | null }> {
 try {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sent: 0, error: 'Not authenticated' };

  // Platform-admin only.
  const { data: isAdmin } = await supabase.rpc('is_academy_admin', { check_user_id: user.id });
  if (isAdmin !== true) return { sent: 0, error: 'Forbidden' };

  const subject = (input.subject || '').trim();
  const body = (input.body || '').trim();
  if (!subject) return { sent: 0, error: 'Subject is required.' };
  if (!body) return { sent: 0, error: 'Message body is required.' };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'ADD Academica <noreply@add-individual-solutions.com>';
  if (!apiKey) {
    return { sent: 0, error: 'Email is not configured — set RESEND_API_KEY (and EMAIL_FROM) in the environment.' };
  }

  // ── Resolve recipients ──
  let recipients: string[] = [];
  if (input.type === 'individual') {
    const to = (input.to || '').trim();
    if (!isValidEmail(to)) return { sent: 0, error: 'Enter a valid recipient email address.' };
    const r = await sendViaResend({ apiKey, from, to: [to], subject, text: body });
    return r.ok ? { sent: 1, error: null } : { sent: 0, error: r.error || 'Send failed.' };
  }

  // Bulk: pull recipients server-side via the service role.
  const admin = createServiceRoleClient();
  let query = admin.from('academy_students').select('email, school_id');
  if (input.type === 'org') query = query.not('school_id', 'is', null);
  const { data: rows, error: qErr } = await query;
  if (qErr) return { sent: 0, error: 'Could not load recipients.' };

  recipients = [...new Set((rows ?? []).map((r) => (r.email as string) || '').filter(isValidEmail))];
  if (recipients.length === 0) return { sent: 0, error: 'No recipients found for this audience.' };

  // Send in BCC batches so recipients never see each other.
  let sent = 0;
  const errors: string[] = [];
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const r = await sendViaResend({ apiKey, from, to: [from], bcc: batch, subject, text: body });
    if (r.ok) sent += batch.length;
    else errors.push(r.error || 'batch failed');
  }

  if (sent === 0) return { sent: 0, error: errors[0] || 'Send failed.' };
  return { sent, error: errors.length ? `Partial send — ${errors.length} batch(es) failed.` : null };
 } catch (e) {
  console.error('[admin-email] send failed:', e);
  return { sent: 0, error: e instanceof Error ? e.message : 'Unexpected error sending email.' };
 }
}
