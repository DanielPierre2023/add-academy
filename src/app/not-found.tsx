import Link from 'next/link';
import { FileQuestion, Home, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Custom 404 page — shown when a route or lecture is not found.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10">
        <FileQuestion className="h-8 w-8 text-secondary" />
      </div>
      <h1 className="font-heading text-3xl font-bold text-foreground">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Try navigating back to the course or returning home.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button variant="default" className="gap-2">
            <Home className="h-4 w-4" />
            Go home
          </Button>
        </Link>
        <Link href="/lectures/0">
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Start learning
          </Button>
        </Link>
      </div>
    </div>
  );
}
