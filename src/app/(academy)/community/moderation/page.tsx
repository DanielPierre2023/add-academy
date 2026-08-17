'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, EyeOff, Eye, Trash2, Check, Pin, Lock, MicOff } from 'lucide-react';
import type { Language } from '@/types';
import {
  listReports,
  setPostHidden,
  deletePost,
  resolveReport,
  setThreadFlags,
  muteUser,
  unmuteUser,
  type ForumReportView,
} from '@/lib/forum/actions';
import { relativeTime } from '@/lib/forum/format';

export default function ModerationPage() {
  const language = useAcademyStore((s) => s.language) as Language;
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [reports, setReports] = useState<ForumReportView[]>([]);
  const [loading, setLoading] = useState(true);

  // Thread controls
  const [threadId, setThreadId] = useState('');
  const [threadMsg, setThreadMsg] = useState<string | null>(null);

  // Mute controls
  const [muteId, setMuteId] = useState('');
  const [muteReason, setMuteReason] = useState('');
  const [muteDays, setMuteDays] = useState('');
  const [muteMsg, setMuteMsg] = useState<string | null>(null);

  const t = (en: string, ro: string, el: string, de?: string, fr?: string, it?: string, ar?: string) => {
    const map: Record<string, string> = { en, ro, el, de: de ?? en, fr: fr ?? en, it: it ?? en, ar: ar ?? en };
    return map[language] ?? en;
  };

  const refresh = useCallback(async () => {
    const res = await listReports();
    setReports(res.reports);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    let cancelled = false;
    const run = async () => {
      const res = await listReports();
      if (cancelled) return;
      setReports(res.reports);
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  if (!authLoading && (!user || !isAdmin)) {
    return (
      <div className="space-y-6 pb-16">
        <Card>
          <CardContent className="pt-6 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t(
                'This page is for moderators only.',
                'Această pagină este doar pentru moderatori.',
                'Αυτή η σελίδα είναι μόνο για συντονιστές.',
                'Diese Seite ist nur für Moderatoren.',
                'Cette page est réservée aux modérateurs.',
                'Questa pagina è riservata ai moderatori.',
                'هذه الصفحة مخصصة للمشرفين فقط.'
              )}
            </p>
            <Link href="/community" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                {t(
                  'Back to Community',
                  'Înapoi la Comunitate',
                  'Πίσω στην Κοινότητα',
                  'Zurück zur Community',
                  'Retour à la communauté',
                  'Torna alla community',
                  'العودة إلى المجتمع'
                )}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const applyFlags = async (flags: { pinned?: boolean; locked?: boolean; hidden?: boolean }) => {
    if (!threadId.trim()) return;
    const res = await setThreadFlags(threadId.trim(), flags);
    setThreadMsg(
      res.error
        ? t('Failed.', 'Eșuat.', 'Απέτυχε.', 'Fehlgeschlagen.', 'Échec.', 'Non riuscito.', 'فشلت العملية.')
        : t('Applied.', 'Aplicat.', 'Εφαρμόστηκε.', 'Angewendet.', 'Appliqué.', 'Applicato.', 'تم التطبيق.')
    );
    setTimeout(() => setThreadMsg(null), 2500);
  };

  const doMute = async (permanent: boolean) => {
    if (!muteId.trim()) return;
    let until: string | null = null;
    if (!permanent) {
      const days = parseInt(muteDays, 10);
      const d = Number.isFinite(days) && days > 0 ? days : 7;
      until = new Date(Date.now() + d * 86400000).toISOString();
    }
    const res = await muteUser(muteId.trim(), until, muteReason);
    setMuteMsg(
      res.error
        ? t('Failed.', 'Eșuat.', 'Απέτυχε.', 'Fehlgeschlagen.', 'Échec.', 'Non riuscito.', 'فشلت العملية.')
        : t(
            'User muted.',
            'Utilizator redus la tăcere.',
            'Ο χρήστης τέθηκε σε σίγαση.',
            'Benutzer stummgeschaltet.',
            'Utilisateur mis en sourdine.',
            'Utente disattivato.',
            'تم كتم صوت المستخدم.'
          )
    );
    setTimeout(() => setMuteMsg(null), 2500);
  };

  const doUnmute = async () => {
    if (!muteId.trim()) return;
    const res = await unmuteUser(muteId.trim());
    setMuteMsg(
      res.error
        ? t('Failed.', 'Eșuat.', 'Απέτυχε.', 'Fehlgeschlagen.', 'Échec.', 'Non riuscito.', 'فشلت العملية.')
        : t(
            'User unmuted.',
            'Utilizator reactivat.',
            'Ο χρήστης επανενεργοποιήθηκε.',
            'Stummschaltung des Benutzers aufgehoben.',
            'Sourdine de l\'utilisateur levée.',
            'Utente riattivato.',
            'تم إلغاء كتم صوت المستخدم.'
          )
    );
    setTimeout(() => setMuteMsg(null), 2500);
  };

  const openReports = reports.filter((r) => !r.resolved);
  const resolvedReports = reports.filter((r) => r.resolved);

  return (
    <div className="space-y-8 pb-16">
      <div className="text-center">
        <Shield className="mx-auto mb-3 h-12 w-12 text-green-500" />
        <h1 className="text-2xl font-bold font-heading">
          {t('Moderation', 'Moderare', 'Εποπτεία', 'Moderation', 'Modération', 'Moderazione', 'الإشراف')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t(
            'Review reports and manage threads and users.',
            'Analizează raportările și gestionează discuțiile și utilizatorii.',
            'Ελέγξτε αναφορές και διαχειριστείτε συζητήσεις και χρήστες.',
            'Überprüfen Sie Meldungen und verwalten Sie Themen und Benutzer.',
            'Examinez les signalements et gérez les discussions et les utilisateurs.',
            'Rivedi le segnalazioni e gestisci discussioni e utenti.',
            'راجع البلاغات وأدر المواضيع والمستخدمين.'
          )}
        </p>
      </div>

      {/* Reports queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t(
              'Open reports',
              'Raportări deschise',
              'Ανοιχτές αναφορές',
              'Offene Meldungen',
              'Signalements ouverts',
              'Segnalazioni aperte',
              'البلاغات المفتوحة'
            )}{' '}
            ({openReports.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">
              {t('Loading…', 'Se încarcă…', 'Φόρτωση…', 'Wird geladen…', 'Chargement…', 'Caricamento…', 'جارٍ التحميل…')}
            </p>
          ) : openReports.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {t(
                'No open reports.',
                'Nicio raportare deschisă.',
                'Καμία ανοιχτή αναφορά.',
                'Keine offenen Meldungen.',
                'Aucun signalement ouvert.',
                'Nessuna segnalazione aperta.',
                'لا توجد بلاغات مفتوحة.'
              )}
            </p>
          ) : (
            openReports.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {t(
                      'Reported by',
                      'Raportat de',
                      'Αναφέρθηκε από',
                      'Gemeldet von',
                      'Signalé par',
                      'Segnalato da',
                      'تم الإبلاغ بواسطة'
                    )}{' '}
                    <span className="font-medium text-foreground">{r.reporterName}</span> · {relativeTime(r.createdAt, language)}
                  </span>
                  {r.postHidden && (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <EyeOff className="h-3 w-3" />
                      {t('Hidden', 'Ascuns', 'Κρυφό', 'Verborgen', 'Masqué', 'Nascosto', 'مخفي')}
                    </Badge>
                  )}
                </div>
                {r.reason && (
                  <p className="mb-2 text-sm">
                    <span className="text-muted-foreground">
                      {t('Reason:', 'Motiv:', 'Λόγος:', 'Grund:', 'Motif :', 'Motivo:', 'السبب:')}
                    </span>{' '}
                    {r.reason}
                  </p>
                )}
                <div className="mb-3 rounded-md bg-muted/50 p-3 text-sm">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {t(
                      'Post by',
                      'Postare de',
                      'Ανάρτηση από',
                      'Beitrag von',
                      'Publié par',
                      'Pubblicato da',
                      'نشره'
                    )}{' '}
                    <span className="font-medium text-foreground">{r.postAuthorName}</span>
                  </p>
                  <p className="whitespace-pre-wrap break-words">{r.postBody}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.threadId && (
                    <Link href={`/community/thread/${r.threadId}`}>
                      <Button size="sm" variant="outline" className="h-8">
                        {t(
                          'View thread',
                          'Vezi discuția',
                          'Προβολή συζήτησης',
                          'Thema ansehen',
                          'Voir la discussion',
                          'Visualizza discussione',
                          'عرض الموضوع'
                        )}
                      </Button>
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    onClick={async () => {
                      await setPostHidden(r.postId, !r.postHidden);
                      await refresh();
                    }}
                  >
                    {r.postHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {r.postHidden
                      ? t('Unhide', 'Afișează', 'Εμφάνιση', 'Einblenden', 'Afficher', 'Mostra', 'إظهار')
                      : t('Hide post', 'Ascunde', 'Απόκρυψη', 'Beitrag verbergen', 'Masquer le message', 'Nascondi post', 'إخفاء المنشور')}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 gap-1"
                    onClick={async () => {
                      await deletePost(r.postId);
                      await refresh();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t(
                      'Delete post',
                      'Șterge',
                      'Διαγραφή',
                      'Beitrag löschen',
                      'Supprimer le message',
                      'Elimina post',
                      'حذف المنشور'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1"
                    onClick={async () => {
                      await resolveReport(r.id);
                      await refresh();
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {t('Resolve', 'Rezolvă', 'Επίλυση', 'Beheben', 'Résoudre', 'Risolvi', 'حل')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Thread controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t(
              'Thread controls',
              'Controale discuție',
              'Έλεγχοι συζήτησης',
              'Themen-Steuerung',
              'Contrôles de la discussion',
              'Controlli discussione',
              'عناصر التحكم بالموضوع'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={threadId}
            onChange={(e) => setThreadId(e.target.value)}
            placeholder={t(
              'Thread ID',
              'ID discuție',
              'ID συζήτησης',
              'Themen-ID',
              'ID de la discussion',
              'ID discussione',
              'معرّف الموضوع'
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => applyFlags({ pinned: true })}>
              <Pin className="h-3.5 w-3.5" />
              {t('Pin', 'Fixează', 'Καρφίτσωμα', 'Anheften', 'Épingler', 'Fissa', 'تثبيت')}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => applyFlags({ pinned: false })}>
              {t(
                'Unpin',
                'Anulează fixarea',
                'Ξεκαρφίτσωμα',
                'Loslösen',
                'Désépingler',
                'Rimuovi fissaggio',
                'إلغاء التثبيت'
              )}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => applyFlags({ locked: true })}>
              <Lock className="h-3.5 w-3.5" />
              {t('Lock', 'Blochează', 'Κλείδωμα', 'Sperren', 'Verrouiller', 'Blocca', 'قفل')}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => applyFlags({ locked: false })}>
              {t('Unlock', 'Deblochează', 'Ξεκλείδωμα', 'Entsperren', 'Déverrouiller', 'Sblocca', 'إلغاء القفل')}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => applyFlags({ hidden: true })}>
              <EyeOff className="h-3.5 w-3.5" />
              {t('Hide', 'Ascunde', 'Απόκρυψη', 'Verbergen', 'Masquer', 'Nascondi', 'إخفاء')}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => applyFlags({ hidden: false })}>
              <Eye className="h-3.5 w-3.5" />
              {t('Unhide', 'Afișează', 'Εμφάνιση', 'Einblenden', 'Afficher', 'Mostra', 'إظهار')}
            </Button>
          </div>
          {threadMsg && <p className="text-sm text-muted-foreground">{threadMsg}</p>}
        </CardContent>
      </Card>

      {/* Mute controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t(
              'Mute a user',
              'Redu la tăcere un utilizator',
              'Σίγαση χρήστη',
              'Benutzer stummschalten',
              'Mettre un utilisateur en sourdine',
              'Disattiva un utente',
              'كتم صوت مستخدم'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={muteId}
            onChange={(e) => setMuteId(e.target.value)}
            placeholder={t(
              'User ID',
              'ID utilizator',
              'ID χρήστη',
              'Benutzer-ID',
              'ID de l\'utilisateur',
              'ID utente',
              'معرّف المستخدم'
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Input
              value={muteDays}
              onChange={(e) => setMuteDays(e.target.value)}
              placeholder={t(
                'Days (default 7)',
                'Zile (implicit 7)',
                'Ημέρες (προεπιλογή 7)',
                'Tage (Standard 7)',
                'Jours (par défaut 7)',
                'Giorni (predefinito 7)',
                'الأيام (الافتراضي 7)'
              )}
              className="w-40"
              inputMode="numeric"
            />
            <Input
              value={muteReason}
              onChange={(e) => setMuteReason(e.target.value)}
              placeholder={t(
                'Reason (optional)',
                'Motiv (opțional)',
                'Λόγος (προαιρετικό)',
                'Grund (optional)',
                'Motif (facultatif)',
                'Motivo (facoltativo)',
                'السبب (اختياري)'
              )}
              className="flex-1 min-w-[12rem]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1" onClick={() => doMute(false)}>
              <MicOff className="h-3.5 w-3.5" />
              {t(
                'Mute (temporary)',
                'Redu la tăcere (temporar)',
                'Σίγαση (προσωρινή)',
                'Stummschalten (vorübergehend)',
                'Sourdine (temporaire)',
                'Disattiva (temporaneo)',
                'كتم الصوت (مؤقت)'
              )}
            </Button>
            <Button size="sm" variant="destructive" className="gap-1" onClick={() => doMute(true)}>
              <MicOff className="h-3.5 w-3.5" />
              {t(
                'Mute (permanent)',
                'Redu la tăcere (permanent)',
                'Σίγαση (μόνιμη)',
                'Stummschalten (dauerhaft)',
                'Sourdine (permanente)',
                'Disattiva (permanente)',
                'كتم الصوت (دائم)'
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={doUnmute}>
              {t(
                'Unmute',
                'Reactivează',
                'Άρση σίγασης',
                'Stummschaltung aufheben',
                'Réactiver le son',
                'Riattiva',
                'إلغاء كتم الصوت'
              )}
            </Button>
          </div>
          {muteMsg && <p className="text-sm text-muted-foreground">{muteMsg}</p>}
        </CardContent>
      </Card>

      {/* Recently resolved */}
      {resolvedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t(
                'Recently resolved',
                'Rezolvate recent',
                'Πρόσφατα επιλυμένα',
                'Kürzlich gelöst',
                'Récemment résolus',
                'Risolti di recente',
                'تم حلها مؤخرًا'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {resolvedReports.slice(0, 20).map((r) => (
                <li key={r.id} className="truncate">
                  {r.postAuthorName}: {r.postBody.slice(0, 80)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
