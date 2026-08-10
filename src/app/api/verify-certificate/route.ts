import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/verify-certificate?hash=<verification_hash>
 *
 * Public endpoint that verifies a certificate by its hash.
 * Returns only non-PII fields: validity, certificate name,
 * completion date, and lecture count. Does NOT expose student
 * email, quiz averages, or internal IDs.
 */
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get('hash');

  if (!hash || typeof hash !== 'string' || hash.length < 8 || hash.length > 128) {
    return NextResponse.json(
      { valid: false, error: 'Invalid or missing verification hash.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Use the SECURITY DEFINER function to bypass RLS safely
    const { data, error } = await supabase
      .rpc('verify_certificate', { hash });

    if (error || !data || data.length === 0) {
      return NextResponse.json(
        { valid: false },
        { status: 404 }
      );
    }

    const cert = data[0];
    return NextResponse.json({
      valid: true,
      certificateName: cert.certificate_name,
      completionDate: cert.completion_date,
      lecturesCompleted: cert.lectures_completed,
    });
  } catch {
    return NextResponse.json(
      { valid: false, error: 'Verification service unavailable.' },
      { status: 500 }
    );
  }
}
