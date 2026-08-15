'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  Pin,
  Lock,
  Plus,
  MessagesSquare,
} from 'lucide-react';
import type { Language } from '@/types';
import {
  listCategories,
  listThreads,
  createThread,
  getMyForumMute,
  type ForumCategory,
  type ForumThreadSummary,
} from '@/lib/forum/actions';
import { relativeTime, categoryName, categoryDesc } from '@/lib/forum/format';

export default function CommunityCategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const language = useAcademyStore((s) => s.language) as Language;
  const { user } = useAuth();

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [threads, setThreads] = useState<ForumThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const t = (en: string, ro: string, el: string) =>
    language === 'ro' ? ro : language === 'el' ? el : en;

  const load = useCallback(async () => {
    const [cats, list, mute] = await Promise.all([
      listCategories(),
      listThreads({ categorySlug: slug, limit: 50 }),
      getMyForumMute(),
    ]);
    setCategory(cats.categories.find((c) => c.slug === slug) ?? null);
    setThreads(list.threads);
    setMuted(mute.mute !== null);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const run = async () => {
      const [cats, list, mute] = await Promise.all([
        listCategories(),
        listThreads({ categorySlug: slug, limit: 50 }),
        getMyForumMute(),
      ]);
      if (cancelled) return;
      setCategory(cats.categories.find((c) => c.slug === slug) ?? null);
      setThreads(list.threads);
      setMuted(mute.mute !== null);
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user, slug]);

  const handleCreate = async () => {
    setSubmitting(true);
    setFormError(null);
    const res = await createThread({ categorySlug: slug, title, body });
    setSubmitting(false);
    if (res.error || !res.threadId) {
      setFormError(
        res.error === 'invalid_title'
          ? t('Enter a title (1–200 chars).', 'Introdu un titlu (1–200 caractere).', 'Εισάγετε τίτλο (1–200 χαρ.).')
          : res.error === 'invalid_body'
            ? t('Enter a message.', 'Introdu un mesaj.', 'Εισάγετε μήνυμα.')
            : t('Could not create thread.', 'Nu s-a putut crea discuția.', 'Αδυναμία δημιουργίας συζήτησης.')
      );
      return;
    }
    setTitle('');
    setBody('');
    setShowForm(false);
    await load();
  };

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/community"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('Community', 'Comunitate', 'Κοινότητα')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold font-heading">
          {category ? categoryName(category, language) : t('Category', 'Categorie', 'Κατηγορία')}
        </h1>
        {category && (
          <p className="text-muted-foreground text-sm mt-1">{categoryDesc(category, language)}</p>
        )}
      </div>

      {!user && (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            {t('Sign in to view and post.', 'Autentifică-te pentru a vedea și posta.', 'Συνδεθείτε για προβολή και ανάρτηση.')}
          </CardContent>
        </Card>
      )}

      {user && (
        <>
          {/* New thread */}
          {muted ? (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="pt-6 text-sm text-destructive">
                {t(
                  'You are currently muted and cannot start new threads.',
                  'Ești în prezent redus la tăcere și nu poți începe discuții noi.',
                  'Είστε προσωρινά σε σίγαση και δεν μπορείτε να ξεκινήσετε νέες συζητήσεις.'
                )}
              </CardContent>
            </Card>
          ) : !showForm ? (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('New thread', 'Discuție nouă', 'Νέα συζήτηση')}
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('Start a new thread', 'Începe o discuție nouă', 'Ξεκινήστε νέα συζήτηση')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={title}
                  maxLength={200}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('Title', 'Titlu', 'Τίτλος')}
                />
                <Textarea
                  value={body}
                  maxLength={10000}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t('Write your message…', 'Scrie mesajul tău…', 'Γράψτε το μήνυμά σας…')}
                  rows={5}
                />
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleCreate} disabled={submitting} size="sm">
                    {submitting
                      ? t('Posting…', 'Se postează…', 'Ανάρτηση…')
                      : t('Post', 'Postează', 'Ανάρτηση')}
                  </Button>
                  <Button
                    onClick={() => setShowForm(false)}
                    variant="outline"
                    size="sm"
                    disabled={submitting}
                  >
                    {t('Cancel', 'Anulează', 'Ακύρωση')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Threads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessagesSquare className="h-4 w-4 text-primary" />
                {t('Threads', 'Discuții', 'Συζητήσεις')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">{t('Loading…', 'Se încarcă…', 'Φόρτωση…')}</p>
              ) : threads.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('No threads yet — be the first!', 'Încă nu există discuții — fii primul!', 'Καμία συζήτηση ακόμη — γίνετε ο πρώτος!')}
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {threads.map((th) => (
                    <li key={th.id}>
                      <Link
                        href={`/community/thread/${th.id}`}
                        className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            {th.pinned && (
                              <Badge variant="secondary" className="gap-1 text-[10px]">
                                <Pin className="h-3 w-3" />
                                {t('Pinned', 'Fixat', 'Καρφιτσωμένο')}
                              </Badge>
                            )}
                            {th.locked && (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Lock className="h-3 w-3" />
                                {t('Locked', 'Blocat', 'Κλειδωμένο')}
                              </Badge>
                            )}
                            <span className="truncate">{th.title}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {th.authorName} · {relativeTime(th.lastPostAt, language)} · {th.postCount}{' '}
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
        </>
      )}
    </div>
  );
}
