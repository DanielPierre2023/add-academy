'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MessagesSquare, Plus, ChevronRight, Pin, Lock } from 'lucide-react';
import type { Language } from '@/types';
import {
  listCategories,
  listThreads,
  type ForumCategory,
  type ForumThreadSummary,
} from '@/lib/forum/actions';
import { relativeTime, categoryName, categoryDesc } from '@/lib/forum/format';

export default function CommunityPage() {
  const language = useAcademyStore((s) => s.language) as Language;
  const { user } = useAuth();

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [recent, setRecent] = useState<ForumThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const t = (en: string, ro: string, el: string) =>
    language === 'ro' ? ro : language === 'el' ? el : en;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const [cats, threads] = await Promise.all([
        listCategories(),
        listThreads({ limit: 10 }),
      ]);
      if (cancelled) return;
      setCategories(cats.categories);
      setRecent(threads.threads);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="space-y-8 pb-16">
      <div className="text-center">
        <MessagesSquare className="mx-auto h-16 w-16 text-secondary mb-4" />
        <h1 className="text-3xl font-bold font-heading mb-2">
          {t('Community', 'Comunitate', 'Κοινότητα')}
        </h1>
        <p className="text-muted-foreground">
          {t(
            'Ask questions, share what you built, and help fellow learners.',
            'Pune întrebări, arată ce ai construit și ajută-i pe ceilalți cursanți.',
            'Κάντε ερωτήσεις, μοιραστείτε τι φτιάξατε και βοηθήστε συμμαθητές.'
          )}
        </p>
      </div>

      {!user && (
        <Card className="border-secondary/30">
          <CardContent className="pt-6 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t(
                'Sign in to join the discussion.',
                'Autentifică-te pentru a te alătura discuției.',
                'Συνδεθείτε για να συμμετάσχετε στη συζήτηση.'
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {user && (
        <>
          {/* Categories */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {t('Categories', 'Categorii', 'Κατηγορίες')}
              </h2>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t('Loading…', 'Se încarcă…', 'Φόρτωση…')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((c) => (
                  <Link key={c.id} href={`/community/category/${c.slug}`}>
                    <Card className="h-full border-muted transition-colors hover:border-secondary/50">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold mb-1">{categoryName(c, language)}</h3>
                            <p className="text-sm text-muted-foreground">{categoryDesc(c, language)}</p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {c.threadCount}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent threads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessagesSquare className="h-4 w-4 text-primary" />
                {t('Recent discussions', 'Discuții recente', 'Πρόσφατες συζητήσεις')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('No discussions yet.', 'Încă nu există discuții.', 'Δεν υπάρχουν συζητήσεις ακόμη.')}
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {recent.map((th) => (
                    <li key={th.id}>
                      <Link
                        href={`/community/thread/${th.id}`}
                        className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            {th.pinned && <Pin className="h-3.5 w-3.5 text-secondary" />}
                            {th.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                            <span className="truncate">{th.title}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {th.authorName} · {relativeTime(th.lastPostAt, language)} ·{' '}
                            {th.postCount}{' '}
                            {t('posts', 'postări', 'αναρτήσεις')}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* New thread affordance */}
          <div className="flex justify-center">
            <Link href={`/community/category/${categories[0]?.slug ?? 'general'}`}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('New thread', 'Discuție nouă', 'Νέα συζήτηση')}
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
