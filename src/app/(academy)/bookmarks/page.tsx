'use client';

import Link from 'next/link';
import { useAcademyStore } from '@/lib/store/academy-store';
import { getLectureIndex } from '@/lib/lectures';
import { Card, CardContent } from '@/components/ui/card';
import { PageTransition } from '@/components/motion/page-transition';
import type { Language } from '@/types';
import { Bookmark, BookmarkX, ChevronRight, BookOpen } from 'lucide-react';

const TEXT: Record<Language, { title: string; subtitle: string; empty: string; emptyHint: string; browse: string; remove: string }> = {
  en: {
    title: 'Bookmarks',
    subtitle: 'Lectures you saved to revisit',
    empty: 'No bookmarks yet',
    emptyHint: 'Tap the bookmark icon on any lecture to save it here.',
    browse: 'Browse lectures',
    remove: 'Remove bookmark',
  },
  ro: {
    title: 'Marcaje',
    subtitle: 'Lecții pe care le-ai salvat pentru a reveni',
    empty: 'Niciun marcaj încă',
    emptyHint: 'Apasă pictograma de marcaj pe orice lecție pentru a o salva aici.',
    browse: 'Explorează lecțiile',
    remove: 'Elimină marcajul',
  },
  el: {
    title: 'Σελιδοδείκτες',
    subtitle: 'Μαθήματα που αποθηκεύσατε για να επισκεφτείτε ξανά',
    empty: 'Δεν υπάρχουν σελιδοδείκτες ακόμη',
    emptyHint: 'Πατήστε το εικονίδιο σελιδοδείκτη σε οποιοδήποτε μάθημα για να το αποθηκεύσετε εδώ.',
    browse: 'Περιήγηση μαθημάτων',
    remove: 'Αφαίρεση σελιδοδείκτη',
  },
};

export default function BookmarksPage() {
  // Stable references only — array + function — never a fresh object from the
  // selector (avoids the React #185 infinite-loop antipattern).
  const language = useAcademyStore((s) => s.language) as Language;
  const bookmarks = useAcademyStore((s) => s.bookmarks);
  const toggleBookmark = useAcademyStore((s) => s.toggleBookmark);

  const tx = TEXT[language] || TEXT.en;
  const index = getLectureIndex();
  const byId = new Map(index.lectures.map((l) => [l.id, l]));

  // Resolve bookmarked ids to lecture entries, preserving save order and
  // dropping any ids that no longer exist in the current index.
  const saved = bookmarks
    .map((id) => byId.get(id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-yellow-500/10 p-2.5">
            <Bookmark className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{tx.title}</h1>
            <p className="text-sm text-muted-foreground">{tx.subtitle}</p>
          </div>
        </div>

        {saved.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <BookmarkX className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">{tx.empty}</p>
              <p className="max-w-sm text-sm text-muted-foreground">{tx.emptyHint}</p>
              <Link
                href="/"
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <BookOpen className="h-4 w-4" />
                {tx.browse}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {saved.map((lecture) => {
              const title = lecture.title[language] || lecture.title.en || lecture.id;
              const stageLabel = lecture.stageName || `Stage ${lecture.stage}`;
              return (
                <li key={lecture.id}>
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="flex items-center gap-3 py-3">
                      <Link
                        href={`/lectures/${lecture.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">{title}</span>
                          <span className="block text-xs text-muted-foreground">{stageLabel}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                      <button
                        onClick={() => toggleBookmark(lecture.id)}
                        aria-label={tx.remove}
                        title={tx.remove}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <BookmarkX className="h-4 w-4" />
                      </button>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
