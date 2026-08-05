import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Deep blue branded background */}
      <div className="absolute inset-0 bg-[hsl(240_95%_10%)]" />
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240_95%_20%/0.6)] via-transparent to-[hsl(38_80%_55%/0.08)]" />
      {/* Decorative accent blurs */}
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[hsl(38_80%_55%/0.06)] blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[hsl(240_95%_34%/0.15)] blur-3xl" />

      {/* Brand header */}
      <div className="relative z-10 mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-[hsl(38_80%_55%)] flex items-center justify-center shadow-lg shadow-[hsl(38_80%_55%/0.3)]">
            <svg className="h-6 w-6 text-[hsl(240_95%_10%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            ADD Academy
          </span>
        </div>
        <p className="text-sm text-[hsl(220_20%_70%)]">
          Build LLMs from Scratch
        </p>
      </div>

      {/* Form card */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>

      {/* Back to home */}
      <div className="relative z-10 mt-8 text-center">
        <Link
          href="/"
          className="text-sm text-[hsl(220_20%_60%)] transition-colors hover:text-[hsl(38_80%_55%)] inline-flex items-center gap-1.5"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Bottom brand bar */}
      <div className="relative z-10 mt-6 text-center">
        <p className="text-[10px] tracking-widest uppercase text-[hsl(220_20%_40%)]">
          Powered by ADD Individual Solutions Ltd
        </p>
      </div>
    </div>
  );
}
