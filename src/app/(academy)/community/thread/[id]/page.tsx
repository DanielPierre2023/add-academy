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
import {
  ChevronLeft,
  Pin,
  Lock,
  ArrowBigUp,
  Pencil,
  Flag,
  EyeOff,
} from 'lucide-react';
import type { Language } from '@/types';
import {
  getThread,
  createPost,
  editPost,
  toggleUpvote,
  reportPost,
  getMyForumMute,
  type ForumThreadDetail,
  type ForumPostView,
} from '@/lib/forum/actions';
import { relativeTime } from '@/lib/forum/format';

export default function CommunityThreadPage() {
  const params = useParams<{ id: string }>();
  const threadId = params?.id ?? '';
  const language = useAcademyStore((s) => s.language) as Language;
  const { user } = useAuth();

  const [thread, setThread] = useState<ForumThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDone, setReportDone] = useState<string | null>(null);

  const t = (en: string, ro: string, el: string) =>
    language === 'ro' ? ro : language === 'el' ? el : en;

  const load = useCallback(async () => {
    const [res, mute] = await Promise.all([getThread(threadId), getMyForumMute()]);
    if (!res.thread) {
      setNotFound(true);
      setThread(null);
    } else {
      setThread(res.thread);
      setNotFound(false);
    }
    setMuted(mute.mute !== null);
    setLoading(false);
  }, [threadId]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const run = async () => {
      const [res, mute] = await Promise.all([getThread(threadId), getMyForumMute()]);
      if (cancelled) return;
      if (!res.thread) {
        setNotFound(true);
        setThread(null);
      } else {
        setThread(res.thread);
        setNotFound(false);
      }
      setMuted(mute.mute !== null);
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user, threadId]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSubmitting(true);
    const res = await createPost(threadId, reply);
    setSubmitting(false);
    if (!res.error) {
      setReply('');
      await load();
    }
  };

  const handleUpvote = async (post: ForumPostView) => {
    // Optimistic toggle.
    setThread((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((p) =>
              p.id === post.id
                ? {
                    ...p,
                    hasUpvoted: !p.hasUpvoted,
                    upvotes: p.upvotes + (p.hasUpvoted ? -1 : 1),
                  }
                : p
            ),
          }
        : prev
    );
    const res = await toggleUpvote(post.id);
    if (res.error) await load(); // revert on failure
  };

  const startEdit = (post: ForumPostView) => {
    setEditingId(post.id);
    setEditBody(post.body);
  };

  const saveEdit = async (postId: string) => {
    const res = await editPost(postId, editBody);
    if (!res.error) {
      setEditingId(null);
      setEditBody('');
      await load();
    }
  };

  const submitReport = async (postId: string) => {
    await reportPost(postId, reportReason);
    setReportingId(null);
    setReportReason('');
    setReportDone(postId);
    setTimeout(() => setReportDone(null), 2500);
  };

  if (!user) {
    return (
      <div className="space-y-6 pb-16">
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            {t('Sign in to view this thread.', 'Autentifică-te pentru a vedea această discuție.', 'Συνδεθείτε για να δείτε αυτή τη συζήτηση.')}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8">{t('Loading…', 'Se încarcă…', 'Φόρτωση…')}</p>;
  }

  if (notFound || !thread) {
    return (
      <div className="space-y-6 pb-16">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          {t('Community', 'Comunitate', 'Κοινότητα')}
        </Link>
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            {t('Thread not found.', 'Discuția nu a fost găsită.', 'Η συζήτηση δεν βρέθηκε.')}
          </CardContent>
        </Card>
      </div>
    );
  }

  const canReply = !thread.locked && !muted;

  return (
    <div className="space-y-6 pb-16">
      <Link
        href={thread.categoryId ? '/community' : '/community'}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('Community', 'Comunitate', 'Κοινότητα')}
      </Link>

      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold font-heading">
          {thread.pinned && (
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Pin className="h-3 w-3" />
              {t('Pinned', 'Fixat', 'Καρφιτσωμένο')}
            </Badge>
          )}
          {thread.locked && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Lock className="h-3 w-3" />
              {t('Locked', 'Blocat', 'Κλειδωμένο')}
            </Badge>
          )}
          {thread.hidden && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <EyeOff className="h-3 w-3" />
              {t('Hidden', 'Ascuns', 'Κρυφό')}
            </Badge>
          )}
          <span>{thread.title}</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {thread.authorName} · {relativeTime(thread.createdAt, language)}
        </p>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {thread.posts.map((post, idx) => (
          <Card key={post.id} className={post.hidden ? 'border-destructive/40 bg-destructive/5' : undefined}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{post.authorName}</span>
                  {idx === 0 && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {t('OP', 'Autor', 'Συντάκτης')}
                    </Badge>
                  )}
                  <span className="ml-2">{relativeTime(post.createdAt, language)}</span>
                  {post.edited && (
                    <span className="ml-1 italic">({t('edited', 'editat', 'επεξεργασμένο')})</span>
                  )}
                  {post.hidden && (
                    <Badge variant="destructive" className="ml-2 gap-1 text-[10px]">
                      <EyeOff className="h-3 w-3" />
                      {t('Hidden', 'Ascuns', 'Κρυφό')}
                    </Badge>
                  )}
                </div>
              </div>

              {editingId === post.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={editBody}
                    maxLength={10000}
                    rows={5}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(post.id)}>
                      {t('Save', 'Salvează', 'Αποθήκευση')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      {t('Cancel', 'Anulează', 'Ακύρωση')}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {post.body}
                </p>
              )}

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={post.hasUpvoted ? 'default' : 'outline'}
                  className="h-8 gap-1"
                  onClick={() => handleUpvote(post)}
                >
                  <ArrowBigUp className="h-4 w-4" />
                  <span className="tabular-nums">{post.upvotes}</span>
                </Button>

                {post.isMine && !post.hidden && editingId !== post.id && (
                  <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => startEdit(post)}>
                    <Pencil className="h-3.5 w-3.5" />
                    {t('Edit', 'Editează', 'Επεξεργασία')}
                  </Button>
                )}

                {!post.isMine && (
                  reportDone === post.id ? (
                    <span className="text-xs text-muted-foreground">
                      {t('Reported — thank you.', 'Raportat — mulțumim.', 'Αναφέρθηκε — ευχαριστούμε.')}
                    </span>
                  ) : reportingId === post.id ? (
                    <span className="flex items-center gap-2">
                      <input
                        value={reportReason}
                        maxLength={500}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder={t('Reason (optional)', 'Motiv (opțional)', 'Λόγος (προαιρετικό)')}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <Button size="sm" className="h-7" onClick={() => submitReport(post.id)}>
                        {t('Send', 'Trimite', 'Αποστολή')}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => setReportingId(null)}>
                        {t('Cancel', 'Anulează', 'Ακύρωση')}
                      </Button>
                    </span>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => setReportingId(post.id)}>
                      <Flag className="h-3.5 w-3.5" />
                      {t('Report', 'Raportează', 'Αναφορά')}
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reply box */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Reply', 'Răspunde', 'Απάντηση')}</CardTitle>
        </CardHeader>
        <CardContent>
          {thread.locked ? (
            <p className="text-sm text-muted-foreground">
              {t(
                'This thread is locked. No new replies can be added.',
                'Această discuție este blocată. Nu se pot adăuga răspunsuri noi.',
                'Αυτή η συζήτηση είναι κλειδωμένη. Δεν επιτρέπονται νέες απαντήσεις.'
              )}
            </p>
          ) : muted ? (
            <p className="text-sm text-destructive">
              {t(
                'You are currently muted and cannot reply.',
                'Ești în prezent redus la tăcere și nu poți răspunde.',
                'Είστε προσωρινά σε σίγαση και δεν μπορείτε να απαντήσετε.'
              )}
            </p>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={reply}
                maxLength={10000}
                rows={4}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t('Write a reply…', 'Scrie un răspuns…', 'Γράψτε μια απάντηση…')}
                disabled={!canReply}
              />
              <Button onClick={handleReply} disabled={submitting || !reply.trim()} size="sm">
                {submitting
                  ? t('Posting…', 'Se postează…', 'Ανάρτηση…')
                  : t('Post reply', 'Postează răspunsul', 'Ανάρτηση απάντησης')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
