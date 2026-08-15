import Link from 'next/link';
import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verify Certificate — ADD Academica',
  description: 'Public verification of an ADD Academica certificate of completion.',
  robots: { index: false, follow: false },
};

interface VerifyRow {
  valid: boolean;
  certificate_name: string;
  course_name: string | null;
  completion_date: string;
  lectures_completed: number;
}

async function lookup(hash: string): Promise<VerifyRow | null> {
  // Defensive bounds — the RPC is SECURITY DEFINER and returns only non-PII.
  if (!hash || hash.length < 8 || hash.length > 128) return null;
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.rpc('verify_certificate', { hash });
    if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
    return (Array.isArray(data) ? data[0] : data) as VerifyRow;
  } catch {
    return null;
  }
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const cert = await lookup(hash);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a2e',
        color: '#fff',
        fontFamily: 'Manrope, system-ui, sans-serif',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 560,
          maxWidth: '100%',
          background: '#fff',
          color: '#060A10',
          borderRadius: 14,
          border: '3px solid #E8A731',
          padding: '40px 44px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 26, fontWeight: 700, color: '#0504AA' }}>
          ADD <span style={{ color: '#E8A731' }}>Academica</span>
        </div>

        {cert ? (
          <>
            <div
              style={{
                display: 'inline-block',
                marginTop: 20,
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(22,163,74,.12)',
                color: '#16a34a',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ✓ Valid certificate
            </div>
            <p style={{ color: '#555', marginTop: 22, fontSize: 14 }}>This certifies that</p>
            <p style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 32, fontWeight: 700, margin: '6px 0' }}>
              {cert.certificate_name}
            </p>
            <p style={{ color: '#555', fontSize: 14 }}>successfully completed</p>
            <p style={{ color: '#0504AA', fontWeight: 700, fontSize: 18, margin: '6px 0 20px' }}>
              {cert.course_name ?? 'Building Large Language Models from Scratch'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 40, fontSize: 13, color: '#666' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#060A10' }}>{cert.lectures_completed}</div>
                Lectures
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#060A10' }}>
                  {new Date(cert.completion_date).toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                Completed
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                display: 'inline-block',
                marginTop: 20,
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(220,38,38,.1)',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ✕ Certificate not found
            </div>
            <p style={{ color: '#555', marginTop: 22, fontSize: 15, lineHeight: 1.6 }}>
              We couldn&rsquo;t verify a certificate with this ID. Check that the full verification
              link was copied correctly.
            </p>
          </>
        )}

        <p style={{ marginTop: 28, fontSize: 12, color: '#999' }}>
          Issued by ADD Individual Solutions Ltd. ·{' '}
          <Link href="/" style={{ color: '#0504AA' }}>
            add-individual-solutions.com
          </Link>
        </p>
      </div>
    </main>
  );
}
