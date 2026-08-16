'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Admin "Send email" — delivers via Resend's REST API (no SDK dependency).
 *
 * - Admin-gated (is_academy_admin verified server-side).
 * - Wraps the message in a branded, responsive HTML template.
 * - Personalises {{name}} per recipient (falls back to a friendly default).
 * - Bulk sends go out individually-addressed (Resend batch API), so each
 *   recipient gets their own personalised email — not a shared BCC.
 *
 * Config (Vercel env):
 *   RESEND_API_KEY — required
 *   EMAIL_FROM     — verified sender, e.g. "ADD Academica <noreply@add-individual-solutions.com>"
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const RESEND_BATCH_ENDPOINT = 'https://api.resend.com/emails/batch';
const BATCH_SIZE = 100; // Resend batch API: up to 100 messages per call
const SITE_URL = 'https://academy.add-individual-solutions.com';

export type AdminEmailType = 'all' | 'org' | 'individual';

interface Recipient {
  email: string;
  name: string;
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** First name from a full/display name, or a friendly fallback. */
function firstName(name: string | null | undefined): string {
  const n = (name || '').trim();
  if (!n) return 'there';
  return n.split(/\s+/)[0];
}

function personalise(text: string, name: string): string {
  return text.replace(/\{\{\s*name\s*\}\}/gi, name);
}

/** Turn the plain-text body into safe HTML paragraphs + bullet lists. */
function bodyToHtml(body: string): string {
  const blocks = body.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const lines = block.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length === 0) return '';
      const isList = lines.every((l) => /^\s*[•\-*]\s+/.test(l));
      if (isList) {
        const items = lines
          .map(
            (l) =>
              `<li style="margin:4px 0">${escapeHtml(l.replace(/^\s*[•\-*]\s+/, ''))}</li>`
          )
          .join('');
        return `<ul style="margin:0 0 16px 22px;padding:0">${items}</ul>`;
      }
      return `<p style="margin:0 0 16px 0">${escapeHtml(block.trim()).replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

/** Branded, email-client-safe HTML template (inline styles, table layout). */
function renderEmail(subject: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f5f7;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2430">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(10,10,46,.08)">
      <tr><td style="background:#0a0a2e;padding:22px 28px">
        <span style="font-weight:800;font-size:20px;color:#E8A731;letter-spacing:.5px">ADD</span>
        <span style="font-weight:700;font-size:20px;color:#ffffff;letter-spacing:.5px"> Academica</span>
      </td></tr>
      <tr><td style="padding:32px 28px 8px">
        <h1 style="font-size:20px;line-height:1.3;color:#0a0a2e;margin:0 0 20px">${escapeHtml(subject)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#2b303b">${bodyToHtml(body)}</div>
      </td></tr>
      <tr><td style="padding:24px 28px 30px">
        <a href="${SITE_URL}" style="display:inline-block;background:#05049E;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:10px">Open ADD Academica</a>
      </td></tr>
      <tr><td style="padding:18px 28px;background:#f0f1f4;color:#6b7280;font-size:12px;line-height:1.6">
        ADD Individual Solutions · Larnaca, Cyprus<br>
        <a href="${SITE_URL}" style="color:#05049E;text-decoration:none">academy.add-individual-solutions.com</a>
      </td></tr>
    </table>
    <div style="color:#9aa1ac;font-size:11px;margin-top:14px">You received this because you have an account at ADD Academica.</div>
  </td></tr></table>
</body></html>`;
}

async function resendError(res: Response): Promise<string> {
  let detail = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    detail = j?.message || j?.error || detail;
  } catch {
    /* ignore */
  }
  console.error('[admin-email] Resend rejected:', res.status, detail);
  return detail;
}

async function sendOne(
  apiKey: string,
  from: string,
  r: Recipient,
  subject: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const text = personalise(body, r.name);
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [r.email], subject, text, html: renderEmail(subject, text) }),
  });
  return res.ok ? { ok: true } : { ok: false, error: await resendError(res) };
}

async function sendBatch(
  apiKey: string,
  from: string,
  batch: Recipient[],
  subject: string,
  body: string
): Promise<{ sent: number; error?: string }> {
  const messages = batch.map((r) => {
    const text = personalise(body, r.name);
    return { from, to: [r.email], subject, text, html: renderEmail(subject, text) };
  });
  const res = await fetch(RESEND_BATCH_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  return res.ok ? { sent: batch.length } : { sent: 0, error: await resendError(res) };
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

    const admin = createServiceRoleClient();

    // ── Individual ──
    if (input.type === 'individual') {
      const to = (input.to || '').trim();
      if (!isValidEmail(to)) return { sent: 0, error: 'Enter a valid recipient email address.' };
      // Look up the recipient's name for personalisation (best-effort).
      const { data: row } = await admin
        .from('academy_students')
        .select('display_name, full_name')
        .eq('email', to)
        .maybeSingle();
      const name = firstName((row?.display_name as string) || (row?.full_name as string));
      const r = await sendOne(apiKey, from, { email: to, name }, subject, body);
      return r.ok ? { sent: 1, error: null } : { sent: 0, error: r.error || 'Send failed.' };
    }

    // ── Bulk (all / org) ──
    let query = admin.from('academy_students').select('email, display_name, full_name');
    if (input.type === 'org') query = query.not('school_id', 'is', null);
    const { data: rows, error: qErr } = await query;
    if (qErr) return { sent: 0, error: 'Could not load recipients.' };

    const seen = new Set<string>();
    const recipients: Recipient[] = [];
    for (const row of rows ?? []) {
      const email = ((row.email as string) || '').trim();
      if (!isValidEmail(email) || seen.has(email)) continue;
      seen.add(email);
      recipients.push({
        email,
        name: firstName((row.display_name as string) || (row.full_name as string)),
      });
    }
    if (recipients.length === 0) return { sent: 0, error: 'No recipients found for this audience.' };

    let sent = 0;
    const errors: string[] = [];
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const r = await sendBatch(apiKey, from, batch, subject, body);
      sent += r.sent;
      if (r.error) errors.push(r.error);
    }

    if (sent === 0) return { sent: 0, error: errors[0] || 'Send failed.' };
    return { sent, error: errors.length ? `Partial send — ${errors.length} batch(es) failed: ${errors[0]}` : null };
  } catch (e) {
    console.error('[admin-email] send failed:', e);
    return { sent: 0, error: e instanceof Error ? e.message : 'Unexpected error sending email.' };
  }
}
