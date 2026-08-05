import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 px-4 dark:from-slate-950 dark:via-blue-950/20 dark:to-purple-950/20">
      <div className="w-full max-w-md">{children}</div>
      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}
