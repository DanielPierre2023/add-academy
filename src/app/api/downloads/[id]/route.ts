import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getDownloadById } from '@/lib/downloads/course-downloads';
import { STAGES } from '@/types';

/**
 * Gated product download (W-security H1).
 *
 * Paid deployment packages (NeuralForge LLM + the 5 GenAI SaaS kits) live in a
 * PRIVATE Supabase Storage bucket and are NEVER exposed by a public URL. This
 * route re-derives the caller's entitlement AND course completion on the server
 * (never trusting the client), and only then mints a short-lived signed URL and
 * redirects to it. Without this, hiding the button client-side is cosmetic — a
 * public object URL would be downloadable by anyone who reads it from the bundle.
 *
 * Setup required (once): create a private bucket named `product-downloads`,
 * upload each ZIP to its `storagePath` (see course-downloads.ts), and flip that
 * product's `available` flag to true.
 */

const BUCKET = 'product-downloads';
const COMPLETION_THRESHOLD = 0.8;
const LLM_STAGE_NUMBERS = [0, 1, 2, 3, 4, 5, 6];
const SAAS_STAGE_NUMBER = 7;

function lectureIdsForStages(stageNumbers: number[]): string[] {
  const ids: string[] = [];
  for (const stage of STAGES) {
    if (stageNumbers.includes(stage.number)) ids.push(...stage.lectures);
  }
  return ids;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const download = getDownloadById(id);
  if (!download) {
    return NextResponse.json({ error: 'Unknown download' }, { status: 404 });
  }
  if (!download.available) {
    return NextResponse.json({ error: 'This package is not available yet.' }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to download.' }, { status: 401 });
  }

  // ── Entitlement (server-authoritative; mirrors auth-context + lecture gate) ──
  let entitled = false;

  // Verified-organisation members get full access. Read through the
  // SECURITY DEFINER RPC (academy_schools is not directly readable).
  const { data: schoolCtx } = await supabase.rpc('current_school_context');
  const school = Array.isArray(schoolCtx) ? schoolCtx[0] : schoolCtx;
  const isOrg = Boolean(school?.school_id && school.verified === true);

  if (isOrg) {
    entitled = true;
  } else {
    const { data: subs } = await supabase
      .from('academy_subscriptions')
      .select('tier, unlocked_stages, unlocked_products, current_period_end, status')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const sub = subs?.[0];
    // A null period end means no billing period was recorded → treat as expired.
    const active = Boolean(
      sub && sub.current_period_end && sub.current_period_end >= new Date().toISOString()
    );

    if (sub && active) {
      if (download.type === 'llm') {
        const stages = (sub.unlocked_stages as number[]) || [];
        entitled =
          sub.tier === 'full_access' ||
          sub.tier === 'llm_course' ||
          (sub.tier === 'stage' && [2, 3, 4, 5, 6].every((s) => stages.includes(s)));
      } else {
        const products = (sub.unlocked_products as string[]) || [];
        entitled =
          sub.tier === 'full_access' ||
          sub.tier === 'saas_bundle' ||
          (sub.tier === 'saas_single' && !!download.productId && products.includes(download.productId));
      }
    }
  }

  if (!entitled) {
    return NextResponse.json({ error: 'Your plan does not include this download.' }, { status: 403 });
  }

  // ── Completion ≥ 80% (server-authoritative, read via service role) ──
  const admin = createServiceRoleClient();
  const stageNumbers = download.type === 'llm' ? LLM_STAGE_NUMBERS : [SAAS_STAGE_NUMBER];
  const lectureIds = lectureIdsForStages(stageNumbers);

  if (lectureIds.length > 0) {
    const { data: prog } = await admin
      .from('academy_progress')
      .select('lecture_id')
      .eq('student_id', user.id)
      .eq('completed', true)
      .in('lecture_id', lectureIds);

    const completedCount = prog?.length ?? 0;
    if (completedCount / lectureIds.length < COMPLETION_THRESHOLD) {
      return NextResponse.json(
        { error: `Complete at least ${Math.round(COMPLETION_THRESHOLD * 100)}% of the course to unlock this download.` },
        { status: 403 }
      );
    }
  }

  // ── Mint a short-lived signed URL and redirect to it ──
  const { data: signed, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(download.storagePath, 60, { download: download.fileName });

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: 'The file could not be found in storage.' }, { status: 404 });
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}
