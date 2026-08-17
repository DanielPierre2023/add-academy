'use client';

import { useState } from 'react';
import { Bug, Send, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { value: 'bug', label: 'Bug / Error', icon: '🐛' },
  { value: 'ui', label: 'UI / Display Issue', icon: '🎨' },
  { value: 'content', label: 'Content Error', icon: '📝' },
  { value: 'feature', label: 'Feature Request', icon: '📌' },
  { value: 'performance', label: 'Slow / Performance', icon: '🐌' },
  { value: 'other', label: 'Other', icon: '📋' },
] as const;

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-blue-500/10 text-blue-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/10 text-amber-500' },
  { value: 'high', label: 'High', color: 'bg-red-500/10 text-red-500' },
] as const;

export function BugReportButton() {
  const { user } = useAuth();
  const language = useAcademyStore((s) => s.language);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>('bug');
  const [priority, setPriority] = useState<string>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // W4.1 — this helper previously took only (en, ro), so EVERY Greek user
  // silently saw English. Greek is now required, not optional.
  const t = (en: string, ro: string, el: string, de?: string, fr?: string, it?: string, ar?: string) => {
    const map: Record<string, string> = { en, ro, el, de: de ?? en, fr: fr ?? en, it: it ?? en, ar: ar ?? en };
    return map[language] ?? en;
  };

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;
    setSubmitting(true);

    const { error } = await createClient().from('academy_reports').insert({
      student_id: user.id,
      student_email: user.email,
      student_name: user.displayName || user.email,
      category,
      priority,
      title: title.trim(),
      description: description.trim(),
      page_url: typeof window !== 'undefined' ? window.location.pathname : '',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });

    setSubmitting(false);

    if (!error) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
        setTitle('');
        setDescription('');
        setCategory('bug');
        setPriority('medium');
      }, 2000);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        title={t('Report a Bug', 'Raportează o Problemă', 'Αναφορά Σφάλματος', 'Fehler melden', 'Signaler un bug', 'Segnala un bug', 'الإبلاغ عن خطأ')}
      >
        <Bug className="h-5 w-5" />
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-xs"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card p-5 shadow-2xl sm:mx-4 animate-in slide-in-from-bottom-4 fade-in duration-200">
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {submitted ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-3 font-heading text-lg font-bold text-foreground">
                  {t('Thank you!', 'Mulțumim!', 'Ευχαριστούμε!', 'Danke!', 'Merci !', 'Grazie!', 'شكرًا لك!')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('Your report has been submitted. We\'ll look into it.', 'Raportul tău a fost trimis. Vom analiza problema.', 'Η αναφορά σας υποβλήθηκε. Θα την εξετάσουμε.', 'Ihr Bericht wurde übermittelt. Wir werden uns damit befassen.', 'Votre signalement a été envoyé. Nous allons l\'examiner.', 'La tua segnalazione è stata inviata. La esamineremo.', 'تم إرسال تقريرك. سننظر فيه.')}
                </p>
              </div>
            ) : (
              <>
                <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <Bug className="h-5 w-5 text-primary" />
                  {t('Report an Issue', 'Raportează o Problemă', 'Αναφορά Προβλήματος', 'Problem melden', 'Signaler un problème', 'Segnala un problema', 'الإبلاغ عن مشكلة')}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('Help us improve ADD Academica by reporting bugs or issues.', 'Ajută-ne să îmbunătățim ADD Academica raportând probleme.', 'Βοηθήστε μας να βελτιώσουμε το ADD Academica αναφέροντας σφάλματα ή προβλήματα.', 'Helfen Sie uns, ADD Academica zu verbessern, indem Sie Fehler oder Probleme melden.', 'Aidez-nous à améliorer ADD Academica en signalant des bugs ou des problèmes.', 'Aiutaci a migliorare ADD Academica segnalando bug o problemi.', 'ساعدنا في تحسين ADD Academica من خلال الإبلاغ عن الأخطاء أو المشكلات.')}
                </p>

                <div className="mt-4 space-y-3">
                  {/* Category */}
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      {t('Category', 'Categorie', 'Κατηγορία', 'Kategorie', 'Catégorie', 'Categoria', 'الفئة')}
                    </label>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setCategory(cat.value)}
                          className={cn(
                            'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1',
                            category === cat.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <span>{cat.icon}</span>
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      {t('Priority', 'Prioritate', 'Προτεραιότητα', 'Priorität', 'Priorité', 'Priorità', 'الأولوية')}
                    </label>
                    <div className="mt-1 flex gap-1.5">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setPriority(p.value)}
                          className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                            priority === p.value
                              ? p.color + ' ring-1 ring-current'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="text-xs font-medium text-foreground" htmlFor="report-title">
                      {t('Title *', 'Titlu *', 'Τίτλος *', 'Titel *', 'Titre *', 'Titolo *', 'العنوان *')}
                    </label>
                    <input
                      id="report-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('Brief summary of the issue...', 'Rezumat scurt al problemei...', 'Σύντομη περιγραφή του προβλήματος...', 'Kurze Zusammenfassung des Problems...', 'Résumé bref du problème...', 'Breve riepilogo del problema...', 'ملخص موجز للمشكلة...')}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-medium text-foreground" htmlFor="report-desc">
                      {t('Description', 'Descriere', 'Περιγραφή', 'Beschreibung', 'Description', 'Descrizione', 'الوصف')}
                    </label>
                    <textarea
                      id="report-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('What happened? What did you expect? Steps to reproduce...', 'Ce s-a întâmplat? Ce te așteptai? Pașii pentru a reproduce...', 'Τι συνέβη; Τι περιμένατε; Βήματα αναπαραγωγής...', 'Was ist passiert? Was haben Sie erwartet? Schritte zur Reproduktion...', 'Que s\'est-il passé ? À quoi vous attendiez-vous ? Étapes pour reproduire...', 'Cosa è successo? Cosa ti aspettavi? Passaggi per riprodurre...', 'ماذا حدث؟ ماذا كنت تتوقع؟ خطوات إعادة الإنتاج...')}
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
                    />
                  </div>

                  {/* Current page */}
                  <div className="text-[10px] text-muted-foreground">
                    Page: {typeof window !== 'undefined' ? window.location.pathname : ''}
                  </div>
                </div>

                {/* Submit */}
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                    {t('Cancel', 'Anulează', 'Άκυρο', 'Abbrechen', 'Annuler', 'Annulla', 'إلغاء')}
                  </Button>
                  <Button
                    size="sm"
                    disabled={!title.trim() || submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {t('Submit Report', 'Trimite Raport', 'Υποβολή Αναφοράς', 'Bericht senden', 'Envoyer le rapport', 'Invia segnalazione', 'إرسال التقرير')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
