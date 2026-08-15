'use client';

/**
 * Self-contained per-lecture discussion. Loads (or lazily creates) the forum
 * thread attached to this lecture (threads with lecture_id) and lets signed-in,
 * non-muted users post. Fails soft: any error just hides the widget rather than
 * breaking the lecture viewer.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessagesSquare, ArrowBigUp, ExternalLink } from 'lucide-react';
import type { Language } from '@/types';
import {
  listThreads,
  getThread,
  createThread,
  createPost,
  toggleUpvote,
  getMyForumMute,
  type ForumThreadDetail,
  type ForumPostView,
} from '@/lib/forum/actions';
import { relativeTime } from '@/lib/forum/format';

export function LectureDiscussion({ lectureId }: { lectureId: string }) {
  const language = useAcademyStore((s) => s.language) as Language;
  const { user } = useAuth();

  const [thread, setThread] = useState<ForumThreadDetail | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const t = (en: string, ro: string, el: string) =>
    language === 'ro' ? ro : language === 'el' ? el : en;

  const loadThread = useCallback(async (id: string) => {
    const res = await getThread(id);
    if (res.thread) setThread(res.thread);
  }, []);

  useEffect(() => {
    if (!user || !lectureId) return;
    let cancelled = false;
    const run = async () => {
      const [list, mute] = await Promise.all([
        listThreads({ lectureId, limit: 1 }),
        getMyForumMute(),
      ]);
      if (cancelled) return;
      setMuted(mute.mute !== null);
      const existing = list.threads[0];
      if (existing) {
        setThreadId(existing.id);
        const res = await getThread(existing.id);
        if (cancelled) return;
        if (res.thread) setThread(res.thread);
      }
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user, lectureId]);

  const handlePost = async () => {
    if (!body.trim() || muted) return;
    setSubmitting(true);
    if (threadId) {
      const res = await createPost(threadId, body);
      if (!res.error) {
        setBody('');
        await loadThread(threadId);
      }
    } else {
      // Create the lecture thread lazily with the first post as its body.
      const res = await createThread({
        lectureId,
        title: t('Lecture discussion', 'Discuție lecție', 'Συζήτηση μαθήματος'),
        body,
      });
      if (!res.error && res.threadId) {
        setThreadId(res.threadId);
        setBody('');
        await loadThread(res.threadId);
      }
    }
    setSubmitting(false);
  };

  const handleUpvote = async (post: ForumPostView) => {
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
    if (res.error && threadId) await loadThread(threadId);
  };

  // Signed-out learners simply don't see the widget.
  if (!user) return null;

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessagesSquare className="h-4 w-4 text-teal-500" />
          {t('Discussion', 'Discuție', 'Συζήτηση')}
          {thread && thread.posts.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              ({thread.posts.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('Loading…', 'Se încarcă…', 'Φόρτωση…')}</p>
        ) : (
          <>
            {thread && thread.posts.length > 0 ? (
              <ul className="space-y-3">
                {thread.posts.slice(0, 5).map((post) => (
                  <li key={post.id} className="rounded-md border border-border/60 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{post.authorName}</span> · {relativeTime(post.createdAt, language)}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm">{post.body}</p>
                    <Button
                      size="sm"
                      variant={post.hasUpvoted ? 'default' : 'outline'}
                      className="mt-2 h-7 gap-1"
                      onClick={() => handleUpvote(post)}
                    >
                      <ArrowBigUp className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{post.upvotes}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(
                  'No discussion yet — start the conversation about this lecture.',
                  'Încă nu există discuții — începe conversația despre această lecție.',
                  'Καμία συζήτηση ακόμη — ξεκινήστε τη συζήτηση για αυτό το μάθημα.'
                )}
              </p>
            )}

            {muted ? (
              <p className="text-sm text-destructive">
                {t(
                  'You are currently muted and cannot post.',
                  'Ești în prezent redus la tăcere și nu poți posta.',
                  'Είστε προσωρινά σε σίγαση και δεν μπορείτε να αναρτήσετε.'
                )}
              </p>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={body}
                  maxLength={10000}
                  rows={3}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t('Ask or share something…', 'Întreabă sau împărtășește ceva…', 'Ρωτήστε ή μοιραστείτε κάτι…')}
                />
                <div className="flex items-center gap-3">
                  <Button size="sm" onClick={handlePost} disabled={submitting || !body.trim()}>
                    {submitting
                      ? t('Posting…', 'Se postează…', 'Ανάρτηση…')
                      : t('Post', 'Postează', 'Ανάρτηση')}
                  </Button>
                  {threadId && (
                    <Link
                      href={`/community/thread/${threadId}`}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t('View full thread', 'Vezi discuția completă', 'Πλήρης συζήτηση')}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
