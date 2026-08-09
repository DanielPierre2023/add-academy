import Link from 'next/link';
import { BookX } from 'lucide-react';

export default function AcademyNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <BookX className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
