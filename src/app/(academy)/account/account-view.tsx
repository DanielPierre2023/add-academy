'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { useAcademyStore } from '@/lib/store/academy-store';
import { getIcon } from '@/lib/icons';
import {
  User,
  Mail,
  Shield,
  Crown,
  Unlock,
  BookOpen,
  Code2,
  ClipboardCheck,
  Trophy,
  Flame,
  ChevronRight,
  Check,
  Star,
  ArrowUpRight,
  Clock,
  ArrowRight,
  CreditCard,
  FileText,
  LogOut,
  Package,
  ShoppingCart,
  Gift,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { markNotificationRead } from '@/lib/notifications/actions';

/* ═══════════════════════════════════════════════════════════
   Pricing — pure recurring subscription (All-Access).
   All prices in EUR. Subscriptions renew; cancel anytime.
   ═══════════════════════════════════════════════════════════ */

const MONTHLY_PRICE = 12;
const ANNUAL_PRICE = 99;
const ANNUAL_MONTHLY_EQUIV = (ANNUAL_PRICE / 12).toFixed(2); // ≈ 8.25
const STUDENT_MONTHLY = MONTHLY_PRICE / 2; // €6
const STUDENT_ANNUAL = Math.round(ANNUAL_PRICE / 2); // €50 (advertised ~€49)
const ORG_SEATS = 20;
const CONTACT_EMAIL = 'contact@add-individual-solutions.com';

/* Real invoices come from GET /api/billing/invoices (Stripe).
   This previously read `const MOCK_INVOICES: any[] = []`, so the Invoices tab
   showed an empty state for every user forever — including paying ones. */
interface BillingInvoice {
  id: string;
  number: string | null;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  refunded: boolean;
  amountRefunded: number;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

interface AccountNotification {
  id: string;
  kind: string;
  severity: 'info' | 'warning' | 'critical';
  title_en: string; title_ro: string; title_el: string;
  body_en: string; body_ro: string; body_el: string;
  read_at: string | null;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════════ */

export default function AccountView() {
  const { user, signOut, loading } = useAuth();
  const { language, getCompletionPercentage, progress, quizScores, xp, streak, totalCodeBlocksRun } = useAcademyStore();
  const router = useRouter();

  const t = (en: string, ro: string, el: string, de: string, fr: string, it: string, ar: string) =>
    language === 'ro' ? ro : language === 'el' ? el : language === 'de' ? de : language === 'fr' ? fr : language === 'it' ? it : language === 'ar' ? ar : en;

  const ALL_ACCESS_FEATURES = [
    t('Full LLM course — all stages, 68 lectures', 'Curs LLM complet — toate etapele, 68 de lecții', 'Πλήρες μάθημα LLM — όλα τα στάδια, 68 μαθήματα', 'Vollständiger LLM-Kurs — alle Phasen, 68 Lektionen', 'Cours LLM complet — toutes les étapes, 68 leçons', 'Corso LLM completo — tutte le fasi, 68 lezioni', 'دورة LLM كاملة — جميع المراحل، 68 محاضرة'),
    t('All 5 GenAI SaaS product courses', 'Toate cele 5 cursuri de produse GenAI SaaS', 'Και τα 5 μαθήματα προϊόντων GenAI SaaS', 'Alle 5 GenAI-SaaS-Produktkurse', 'Les 5 cours de produits GenAI SaaS', 'Tutti i 5 corsi sui prodotti GenAI SaaS', 'جميع دورات منتجات GenAI SaaS الخمس'),
    t('Live in-browser Python — no setup', 'Python live în browser — fără configurare', 'Ζωντανή Python στον browser — χωρίς εγκατάσταση', 'Live-Python im Browser — keine Installation nötig', 'Python en direct dans le navigateur — sans installation', 'Python live nel browser — nessuna installazione', 'بايثون مباشر في المتصفح — بدون إعداد'),
    t('Deployable NeuralForge LLM + product downloads', 'LLM NeuralForge implementabil + descărcări de produse', 'Αναπτύξιμο LLM NeuralForge + λήψεις προϊόντων', 'Einsetzbares NeuralForge-LLM + Produkt-Downloads', 'LLM NeuralForge déployable + téléchargements de produits', 'LLM NeuralForge distribuibile + download dei prodotti', 'نموذج NeuralForge LLM قابل للنشر + تنزيلات المنتجات'),
    t('AI Tutor access', 'Acces la Tutorul AI', 'Πρόσβαση στον AI Tutor', 'Zugang zum KI-Tutor', 'Accès au tuteur IA', 'Accesso al Tutor AI', 'الوصول إلى المعلم الذكي'),
    t('Completion certificate', 'Certificat de absolvire', 'Πιστοποιητικό ολοκλήρωσης', 'Abschlusszertifikat', 'Certificat de fin de formation', 'Certificato di completamento', 'شهادة إتمام'),
    t('All future courses included', 'Toate cursurile viitoare incluse', 'Όλα τα μελλοντικά μαθήματα περιλαμβάνονται', 'Alle zukünftigen Kurse inbegriffen', 'Tous les futurs cours inclus', 'Tutti i corsi futuri inclusi', 'جميع الدورات المستقبلية مشمولة'),
  ];

  const COMPARISON_ROWS: { feature: string; add: string; udemy: string; coursera: string; bootcamp: string }[] = [
    {
      feature: t('Build an LLM from scratch', 'Construiește un LLM de la zero', 'Δημιουργία LLM από το μηδέν', 'Ein LLM von Grund auf entwickeln', 'Créer un LLM à partir de zéro', 'Costruire un LLM da zero', 'بناء نموذج LLM من الصفر'),
      add: t('Yes', 'Da', 'Ναι', 'Ja', 'Oui', 'Sì', 'نعم'),
      udemy: t('Rarely', 'Rar', 'Σπάνια', 'Selten', 'Rarement', 'Raramente', 'نادرًا'),
      coursera: t('Partial', 'Parțial', 'Μερικώς', 'Teilweise', 'Partiel', 'Parziale', 'جزئي'),
      bootcamp: t('Sometimes', 'Uneori', 'Μερικές φορές', 'Manchmal', 'Parfois', 'A volte', 'أحيانًا'),
    },
    {
      feature: t('Live in-browser Python (no setup)', 'Python live în browser (fără configurare)', 'Ζωντανή Python στον browser (χωρίς εγκατάσταση)', 'Live-Python im Browser (keine Installation)', 'Python en direct dans le navigateur (sans installation)', 'Python live nel browser (nessuna installazione)', 'بايثون مباشر في المتصفح (بدون إعداد)'),
      add: t('Yes', 'Da', 'Ναι', 'Ja', 'Oui', 'Sì', 'نعم'),
      udemy: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
      coursera: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
      bootcamp: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
    },
    {
      feature: t('Deployable SaaS products you keep', 'Produse SaaS implementabile pe care le păstrezi', 'Αναπτύξιμα προϊόντα SaaS που κρατάτε', 'Einsetzbare SaaS-Produkte, die dir gehören', 'Produits SaaS déployables que vous gardez', 'Prodotti SaaS distribuibili che ti restano', 'منتجات SaaS قابلة للنشر تحتفظ بها'),
      add: t('6 products', '6 produse', '6 προϊόντα', '6 Produkte', '6 produits', '6 prodotti', '6 منتجات'),
      udemy: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
      coursera: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
      bootcamp: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
    },
    {
      feature: t('Certificate', 'Certificat', 'Πιστοποιητικό', 'Zertifikat', 'Certificat', 'Certificato', 'شهادة'),
      add: t('Yes', 'Da', 'Ναι', 'Ja', 'Oui', 'Sì', 'نعم'),
      udemy: t('Yes', 'Da', 'Ναι', 'Ja', 'Oui', 'Sì', 'نعم'),
      coursera: t('Yes', 'Da', 'Ναι', 'Ja', 'Oui', 'Sì', 'نعم'),
      bootcamp: t('Yes', 'Da', 'Ναι', 'Ja', 'Oui', 'Sì', 'نعم'),
    },
    {
      feature: t('Free for schools', 'Gratuit pentru școli', 'Δωρεάν για σχολεία', 'Kostenlos für Schulen', 'Gratuit pour les écoles', 'Gratuito per le scuole', 'مجاني للمدارس'),
      add: t('Yes', 'Da', 'Ναι', 'Ja', 'Oui', 'Sì', 'نعم'),
      udemy: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
      coursera: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
      bootcamp: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
    },
    {
      feature: t('All future courses included', 'Toate cursurile viitoare incluse', 'Όλα τα μελλοντικά μαθήματα περιλαμβάνονται', 'Alle zukünftigen Kurse inbegriffen', 'Tous les futurs cours inclus', 'Tutti i corsi futuri inclusi', 'جميع الدورات المستقبلية مشمولة'),
      add: t('Yes', 'Da', 'Ναι', 'Ja', 'Oui', 'Sì', 'نعم'),
      udemy: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
      coursera: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
      bootcamp: t('No', 'Nu', 'Όχι', 'Nein', 'Non', 'No', 'لا'),
    },
    {
      feature: t('Price', 'Preț', 'Τιμή', 'Preis', 'Prix', 'Prezzo', 'السعر'),
      add: t('€12/mo', '€12/lună', '€12/μήνα', '€12/Monat', '€12/mois', '€12/mese', '€12/شهريًا'),
      udemy: t('~€15–130/course', '~€15–130/curs', '~€15–130/μάθημα', '~€15–130/Kurs', '~€15–130/cours', '~€15–130/corso', '~€15–130/دورة'),
      coursera: t('~$49/mo', '~$49/lună', '~$49/μήνα', '~$49/Monat', '~$49/mois', '~$49/mese', '~$49/شهريًا'),
      bootcamp: t('$500–2,000', '$500–2.000', '$500–2.000', '$500–2.000', '500–2 000 $', '$500–2.000', '$500–2,000'),
    },
  ];

  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'invoices'>('overview');

  // --- Real billing data (replaces the empty MOCK_INVOICES array) ---
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // --- Billing notifications (refund / dispute / failed payment) ---
  const [notifications, setNotifications] = useState<AccountNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    // State updates live inside the async function, not synchronously in the
    // effect body — a synchronous setState here triggers a cascading render
    // (react-hooks/set-state-in-effect).
    const load = async () => {
      if (cancelled) return;
      setInvoicesLoading(true);
      setInvoicesError(null);
      try {
        const res = await fetch('/api/billing/invoices');
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) setInvoices(data.invoices ?? []);
      } catch {
        if (!cancelled) setInvoicesError(t('Could not load your billing history.', 'Nu am putut încărca istoricul tău de facturare.', 'Δεν ήταν δυνατή η φόρτωση του ιστορικού χρεώσεών σας.', 'Deine Rechnungshistorie konnte nicht geladen werden.', 'Impossible de charger votre historique de facturation.', 'Impossibile caricare la cronologia di fatturazione.', 'تعذر تحميل سجل الفوترة الخاص بك.'));
      } finally {
        if (!cancelled) setInvoicesLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await createClient()
        .from('academy_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!cancelled && data) setNotifications(data as AccountNotification[]);
    };

    void load();
    return () => { cancelled = true; };
  }, [user]);

  const pick = useCallback(
    (n: AccountNotification, field: 'title' | 'body') => {
      const key = `${field}_${language}` as keyof AccountNotification;
      return (n[key] as string) || (n[`${field}_en` as keyof AccountNotification] as string);
    },
    [language]
  );

  const dismissNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // Server action: only read_at is writable, and ownership is checked
    // server-side. There is deliberately no client UPDATE policy on this table.
    await markNotificationRead(id);
  }, []);

  const openBillingPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setInvoicesError(data.error || t('Could not open the billing portal.', 'Nu am putut deschide portalul de facturare.', 'Δεν ήταν δυνατό το άνοιγμα της πύλης χρεώσεων.', 'Das Rechnungsportal konnte nicht geöffnet werden.', 'Impossible d’ouvrir le portail de facturation.', 'Impossibile aprire il portale di fatturazione.', 'تعذر فتح بوابة الفوترة.'));
    } catch {
      setInvoicesError(t('Could not open the billing portal.', 'Nu am putut deschide portalul de facturare.', 'Δεν ήταν δυνατό το άνοιγμα της πύλης χρεώσεων.', 'Das Rechnungsportal konnte nicht geöffnet werden.', 'Impossible d’ouvrir le portail de facturation.', 'Impossibile aprire il portale di fatturazione.', 'تعذر فتح بوابة الفوترة.'));
    } finally {
      setPortalLoading(false);
    }
  }, []);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">{t('Please log in to view your account', 'Te rugăm să te autentifici pentru a-ți vedea contul', 'Παρακαλώ συνδεθείτε για να δείτε τον λογαριασμό σας', 'Bitte melde dich an, um dein Konto zu sehen', 'Veuillez vous connecter pour voir votre compte', 'Accedi per visualizzare il tuo account', 'يرجى تسجيل الدخول لعرض حسابك')}</p>
        <Link href="/login?redirect=/account">
          <Button>{t('Log in', 'Autentificare', 'Σύνδεση', 'Anmelden', 'Connexion', 'Accedi', 'تسجيل الدخول')}</Button>
        </Link>
      </div>
    );
  }

  const completion = getCompletionPercentage();
  const completedLectures = Object.values(progress).filter(p => p.completed).length;
  const quizzesTaken = Object.keys(quizScores).length;
  const totalTime = Object.values(progress).reduce((sum, p) => sum + (p.timeSpent || 0), 0);
  const hoursSpent = Math.floor(totalTime / 3600);
  const minutesSpent = Math.floor((totalTime % 3600) / 60);

  return (
    <div className="space-y-8 pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          {t('My Account', 'Contul Meu', 'Ο Λογαριασμός Μου', 'Mein Konto', 'Mon compte', 'Il mio account', 'حسابي')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('Manage your profile, subscription, and learning progress.', 'Gestionează-ți profilul, abonamentul și progresul de învățare.', 'Διαχειριστείτε το προφίλ, τη συνδρομή και την πρόοδο μάθησής σας.', 'Verwalte dein Profil, dein Abonnement und deinen Lernfortschritt.', 'Gérez votre profil, votre abonnement et votre progression d’apprentissage.', 'Gestisci il tuo profilo, l’abbonamento e i tuoi progressi di apprendimento.', 'أدر ملفك الشخصي واشتراكك وتقدمك في التعلّم.')}
        </p>
      </div>

      {/* Billing notifications — refunds, disputes, failed renewals.
          The repo has no email provider, so this is how a user actually learns
          that their payment was refunded and access ended. */}
      {notifications.filter((n) => !n.read_at).map((n) => (
        <div
          key={n.id}
          role="status"
          className={
            'rounded-xl border p-4 flex items-start gap-3 ' +
            (n.severity === 'critical'
              ? 'border-red-500/40 bg-red-500/5'
              : n.severity === 'warning'
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-blue-500/40 bg-blue-500/5')
          }
        >
          <AlertTriangle
            className={
              'h-5 w-5 shrink-0 mt-0.5 ' +
              (n.severity === 'critical'
                ? 'text-red-500'
                : n.severity === 'warning'
                  ? 'text-amber-500'
                  : 'text-blue-500')
            }
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{pick(n, 'title')}</p>
            <p className="text-sm text-muted-foreground mt-1">{pick(n, 'body')}</p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              {new Date(n.created_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={() => dismissNotification(n.id)}
            aria-label={t('Dismiss notification', 'Închide notificarea', 'Απόρριψη ειδοποίησης', 'Benachrichtigung schließen', 'Ignorer la notification', 'Ignora la notifica', 'إغلاق الإشعار')}
          >
            {t('Dismiss', 'Închide', 'Απόρριψη', 'Schließen', 'Ignorer', 'Ignora', 'إغلاق')}
          </Button>
        </div>
      ))}

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { id: 'overview' as const, label: t('Overview', 'Prezentare', 'Επισκόπηση', 'Übersicht', 'Aperçu', 'Panoramica', 'نظرة عامة'), icon: User },
          { id: 'courses' as const, label: t('Subscription', 'Abonament', 'Συνδρομή', 'Abonnement', 'Abonnement', 'Abbonamento', 'الاشتراك'), icon: ShoppingCart },
          { id: 'invoices' as const, label: t('Invoices', 'Facturi', 'Τιμολόγια', 'Rechnungen', 'Factures', 'Fatture', 'الفواتير'), icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB: Overview ═══════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Profile card */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{user.displayName || t('Academica Student', 'Student Academica', 'Μαθητής Academica', 'Academica-Student', 'Étudiant Academica', 'Studente Academica', 'طالب في Academica')}</h2>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      <BookOpen className="mr-1 h-3 w-3" />
                      {t('Free Tier', 'Nivel Gratuit', 'Δωρεάν Επίπεδο', 'Kostenloser Tarif', 'Offre gratuite', 'Livello gratuito', 'الفئة المجانية')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: BookOpen, label: t('Lectures', 'Lecții', 'Μαθήματα', 'Lektionen', 'Leçons', 'Lezioni', 'المحاضرات'), value: `${completedLectures}/68`, color: 'text-blue-500' },
              { icon: ClipboardCheck, label: t('Quizzes', 'Teste', 'Κουίζ', 'Quizze', 'Quiz', 'Quiz', 'الاختبارات'), value: String(quizzesTaken), color: 'text-purple-500' },
              { icon: Code2, label: t('Code Runs', 'Rulări de Cod', 'Εκτελέσεις Κώδικα', 'Code-Ausführungen', 'Exécutions de code', 'Esecuzioni di codice', 'عمليات تشغيل الكود'), value: String(totalCodeBlocksRun), color: 'text-green-500' },
              { icon: Flame, label: t('Streak', 'Serie', 'Σερί', 'Serie', 'Série', 'Serie', 'التتابع'), value: `${streak} ${t('days', 'zile', 'ημέρες', 'Tage', 'jours', 'giorni', 'أيام')}`, color: 'text-orange-500' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  {stat.label}
                </div>
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* XP & Progress */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[hsl(38_80%_55%)]" />
                {t('Learning Progress', 'Progresul Învățării', 'Πρόοδος Μάθησης', 'Lernfortschritt', 'Progression d’apprentissage', 'Progressi di apprendimento', 'تقدم التعلّم')}
              </h3>
              <span className="text-sm font-medium tabular-nums">{xp} XP</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{t('Course Completion', 'Finalizarea Cursului', 'Ολοκλήρωση Μαθήματος', 'Kursabschluss', 'Achèvement du cours', 'Completamento del corso', 'إتمام الدورة')}</span>
                  <span>{Math.round(completion)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{t('Time Invested', 'Timp Investit', 'Χρόνος που Επενδύθηκε', 'Investierte Zeit', 'Temps investi', 'Tempo investito', 'الوقت المستثمر')}</span>
                  <span>{hoursSpent}h {minutesSpent}m</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-[hsl(38_80%_55%)] transition-all" style={{ width: `${Math.min(100, (totalTime / (50 * 3600)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Subscription status */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('My Subscription', 'Abonamentul Meu', 'Η Συνδρομή Μου', 'Mein Abonnement', 'Mon abonnement', 'Il mio abbonamento', 'اشتراكي')}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-green-500/10 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15">
                    {(() => { const I = getIcon('Compass'); return <I className="h-4 w-4 text-blue-500" />; })()}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{t('Getting Started + LLM Fundamentals', 'Primii Pași + Fundamentele LLM', 'Ξεκινώντας + Βασικές Αρχές LLM', 'Erste Schritte + LLM-Grundlagen', 'Premiers pas + Fondamentaux des LLM', 'Per iniziare + Fondamenti degli LLM', 'البدء + أساسيات LLM')}</p>
                    <p className="text-xs text-muted-foreground">{t('7 lectures — Free forever', '7 lecții — Gratuit pentru totdeauna', '7 μαθήματα — Δωρεάν για πάντα', '7 Lektionen — für immer kostenlos', '7 leçons — gratuites pour toujours', '7 lezioni — gratis per sempre', '7 محاضرات — مجانية إلى الأبد')}</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-0">
                  <Check className="mr-1 h-3 w-3" /> {t('Active', 'Activ', 'Ενεργό', 'Aktiv', 'Actif', 'Attivo', 'نشط')}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                    <Crown className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">All-Access</p>
                    <p className="text-xs text-muted-foreground">{t('Everything unlocked — €12/mo or €99/yr', 'Totul deblocat — €12/lună sau €99/an', 'Όλα ξεκλειδωμένα — €12/μήνα ή €99/έτος', 'Alles freigeschaltet — €12/Monat oder €99/Jahr', 'Tout débloqué — €12/mois ou €99/an', 'Tutto sbloccato — €12/mese o €99/anno', 'كل شيء متاح — €12/شهريًا أو €99/سنويًا')}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{t('Not subscribed', 'Neabonat', 'Χωρίς συνδρομή', 'Nicht abonniert', 'Non abonné', 'Non abbonato', 'غير مشترك')}</span>
              </div>
            </div>

            <Button
              className="mt-4 w-full bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] hover:bg-[hsl(38_80%_48%)] font-semibold"
              onClick={() => setActiveTab('courses')}
            >
              <ArrowUpRight className="mr-2 h-4 w-4" />
              {t('View subscription plans', 'Vezi planurile de abonament', 'Δείτε τα πλάνα συνδρομής', 'Abonnementpläne ansehen', 'Voir les formules d’abonnement', 'Visualizza i piani di abbonamento', 'عرض خطط الاشتراك')}
            </Button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => setActiveTab('courses')}
              className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('Subscription & Pricing', 'Abonament și Prețuri', 'Συνδρομή & Τιμολόγηση', 'Abonnement & Preise', 'Abonnement et tarifs', 'Abbonamento e prezzi', 'الاشتراك والتسعير')}</p>
                  <p className="text-xs text-muted-foreground">{t('One plan unlocks everything', 'Un singur plan deblochează totul', 'Ένα πλάνο ξεκλειδώνει τα πάντα', 'Ein Plan schaltet alles frei', 'Une seule formule débloque tout', 'Un solo piano sblocca tutto', 'خطة واحدة تفتح كل شيء')}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('Billing & Invoices', 'Facturare și Facturi', 'Χρεώσεις & Τιμολόγια', 'Rechnungsstellung & Rechnungen', 'Facturation et factures', 'Fatturazione e fatture', 'الفوترة والفواتير')}</p>
                  <p className="text-xs text-muted-foreground">{t('Download past invoices', 'Descarcă facturile anterioare', 'Λήψη προηγούμενων τιμολογίων', 'Frühere Rechnungen herunterladen', 'Télécharger les factures précédentes', 'Scarica le fatture precedenti', 'تنزيل الفواتير السابقة')}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
     {/* ═══════════════ TAB: Subscription & Pricing ═══════════════ */}
      {activeTab === 'courses' && (
        <div className="space-y-10">

          {/* Hero */}
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              {t('Learn AI. Build real products. Fund free education.', 'Învață AI. Construiește produse reale. Finanțează educația gratuită.', 'Μάθε AI. Δημιούργησε πραγματικά προϊόντα. Χρηματοδότησε τη δωρεάν εκπαίδευση.', 'Lerne KI. Baue echte Produkte. Finanziere kostenlose Bildung.', 'Apprenez l’IA. Créez de vrais produits. Financez l’éducation gratuite.', 'Impara l’IA. Crea prodotti reali. Finanzia l’istruzione gratuita.', 'تعلّم الذكاء الاصطناعي. اصنع منتجات حقيقية. موّل التعليم المجاني.')}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t('One subscription unlocks everything — and every euro helps keep AI education free for students and schools.', 'Un singur abonament deblochează totul — și fiecare euro ajută la menținerea educației AI gratuite pentru elevi și școli.', 'Μία συνδρομή ξεκλειδώνει τα πάντα — και κάθε ευρώ βοηθά να παραμείνει η εκπαίδευση AI δωρεάν για μαθητές και σχολεία.', 'Ein Abonnement schaltet alles frei — und jeder Euro hilft, KI-Bildung für Schüler und Schulen kostenlos zu halten.', 'Un seul abonnement débloque tout — et chaque euro contribue à maintenir l’éducation à l’IA gratuite pour les élèves et les écoles.', 'Un solo abbonamento sblocca tutto — e ogni euro aiuta a mantenere gratuita l’istruzione sull’IA per studenti e scuole.', 'اشتراك واحد يفتح كل شيء — وكل يورو يساعد في إبقاء تعليم الذكاء الاصطناعي مجانيًا للطلاب والمدارس.')}
            </p>
            <p className="mt-2 text-sm font-medium">{t('€12/month · €99/year · Cancel anytime', '€12/lună · €99/an · Anulează oricând', '€12/μήνα · €99/έτος · Ακύρωση οποτεδήποτε', '€12/Monat · €99/Jahr · Jederzeit kündbar', '€12/mois · €99/an · Résiliable à tout moment', '€12/mese · €99/anno · Annulla quando vuoi', '€12/شهريًا · €99/سنويًا · إلغاء في أي وقت')}</p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {t('Monthly', 'Lunar', 'Μηνιαία', 'Monatlich', 'Mensuel', 'Mensile', 'شهري')}
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${billing === 'annual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {t('Annual', 'Anual', 'Ετήσια', 'Jährlich', 'Annuel', 'Annuale', 'سنوي')} <span className="text-green-500 font-semibold">{t('· 2 months free', '· 2 luni gratuite', '· 2 μήνες δωρεάν', '· 2 Monate gratis', '· 2 mois offerts', '· 2 mesi gratis', '· شهران مجانًا')}</span>
            </button>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 max-w-3xl mx-auto">
            {/* All-Access */}
            <div className="relative rounded-xl border-2 border-[hsl(38_80%_55%)] bg-card p-6 shadow-lg shadow-[hsl(38_80%_55%/0.08)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] font-bold text-xs px-3 shadow-md">
                  <Star className="mr-1 h-3 w-3" /> ALL-ACCESS
                </Badge>
              </div>
              <div className="pt-2">
                <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>All-Access</h4>
                <p className="text-xs text-muted-foreground mt-0.5 mb-4">{t('Everything, plus every future course', 'Totul, plus fiecare curs viitor', 'Τα πάντα, συν κάθε μελλοντικό μάθημα', 'Alles, plus jeder zukünftige Kurs', 'Tout, plus chaque futur cours', 'Tutto, più ogni corso futuro', 'كل شيء، بالإضافة إلى كل دورة مستقبلية')}</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold tabular-nums">€{billing === 'annual' ? ANNUAL_PRICE : MONTHLY_PRICE}</span>
                  <span className="text-sm text-muted-foreground">/ {billing === 'annual' ? t('year', 'an', 'έτος', 'Jahr', 'an', 'anno', 'سنة') : t('month', 'lună', 'μήνα', 'Monat', 'mois', 'mese', 'شهر')}</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-4">
                  {billing === 'annual'
                    ? t(`Just €${ANNUAL_MONTHLY_EQUIV}/mo billed yearly — 2 months free`, `Doar €${ANNUAL_MONTHLY_EQUIV}/lună facturat anual — 2 luni gratuite`, `Μόνο €${ANNUAL_MONTHLY_EQUIV}/μήνα με ετήσια χρέωση — 2 μήνες δωρεάν`, `Nur €${ANNUAL_MONTHLY_EQUIV}/Monat bei jährlicher Abrechnung — 2 Monate gratis`, `Seulement €${ANNUAL_MONTHLY_EQUIV}/mois facturé annuellement — 2 mois offerts`, `Solo €${ANNUAL_MONTHLY_EQUIV}/mese con fatturazione annuale — 2 mesi gratis`, `فقط €${ANNUAL_MONTHLY_EQUIV}/شهريًا بفوترة سنوية — شهران مجانًا`)
                    : t('Switch to annual and get 2 months free', 'Treci la plata anuală și primești 2 luni gratuite', 'Μετάβαση σε ετήσια και κερδίστε 2 μήνες δωρεάν', 'Wechsle zur jährlichen Zahlung und erhalte 2 Monate gratis', 'Passez à l’annuel et obtenez 2 mois offerts', 'Passa al piano annuale e ottieni 2 mesi gratis', 'بدّل إلى الخطة السنوية واحصل على شهرين مجانًا')}
                </p>
                <ul className="space-y-1.5 mb-5">
                  {ALL_ACCESS_FEATURES.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 shrink-0 text-green-500" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] hover:bg-[hsl(38_80%_48%)] font-semibold shadow-md"
                  onClick={() => router.push('/pricing')}
                >
                  {t('Subscribe', 'Abonează-te', 'Εγγραφή', 'Abonnieren', 'S’abonner', 'Abbonati', 'اشترك')} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">{t('Renews automatically · cancel anytime', 'Se reînnoiește automat · anulează oricând', 'Ανανεώνεται αυτόματα · ακύρωση οποτεδήποτε', 'Verlängert sich automatisch · jederzeit kündbar', 'Renouvellement automatique · résiliable à tout moment', 'Si rinnova automaticamente · annulla quando vuoi', 'يتجدد تلقائيًا · يمكن الإلغاء في أي وقت')}</p>
              </div>
            </div>

            {/* Students */}
            <div className="rounded-xl border-2 border-border bg-card p-6 hover:border-primary/30 transition-colors">
              <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{t('Students — 50% off', 'Elevi — 50% reducere', 'Μαθητές — 50% έκπτωση', 'Studierende — 50 % Rabatt', 'Étudiants — 50 % de réduction', 'Studenti — 50% di sconto', 'الطلاب — خصم 50%')}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 mb-4">{t('Same All-Access, half the price', 'Același All-Access, la jumătate de preț', 'Το ίδιο All-Access, στη μισή τιμή', 'Derselbe All-Access, zum halben Preis', 'Le même All-Access, à moitié prix', 'Lo stesso All-Access, a metà prezzo', 'نفس باقة All-Access، بنصف السعر')}</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold tabular-nums">€{billing === 'annual' ? STUDENT_ANNUAL : STUDENT_MONTHLY}</span>
                <span className="text-sm text-muted-foreground">/ {billing === 'annual' ? t('year', 'an', 'έτος', 'Jahr', 'an', 'anno', 'سنة') : t('month', 'lună', 'μήνα', 'Monat', 'mois', 'mese', 'شهر')}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {t('Subscribe, then verify your student status (student email, ID, or enrolment letter) and we’ll apply your discount.', 'Abonează-te, apoi verifică-ți statutul de elev (email de student, legitimație sau adeverință de înscriere) și îți vom aplica reducerea.', 'Εγγραφείτε και μετά επαληθεύστε την ιδιότητά σας ως μαθητή (φοιτητικό email, ταυτότητα ή βεβαίωση εγγραφής) και θα εφαρμόσουμε την έκπτωσή σας.', 'Abonniere, bestätige anschließend deinen Studierendenstatus (Schul-/Uni-E-Mail, Ausweis oder Immatrikulationsbescheinigung) und wir wenden deinen Rabatt an.', 'Abonnez-vous, puis vérifiez votre statut d’étudiant (e-mail étudiant, carte ou attestation d’inscription) et nous appliquerons votre réduction.', 'Abbonati, poi verifica il tuo stato di studente (email universitaria, tessera o attestato di iscrizione) e applicheremo lo sconto.', 'اشترك، ثم تحقق من صفتك كطالب (البريد الإلكتروني الجامعي أو بطاقة الهوية أو شهادة القيد) وسنطبق الخصم.')}
              </p>
              <ul className="space-y-1.5 mb-5">
                {[
                  t('Everything in All-Access', 'Tot ce include All-Access', 'Τα πάντα στο All-Access', 'Alles aus All-Access', 'Tout ce qui est inclus dans All-Access', 'Tutto ciò che include All-Access', 'كل ما في باقة All-Access'),
                  t('50% student discount', '50% reducere pentru elevi', '50% έκπτωση για μαθητές', '50 % Studierendenrabatt', '50 % de réduction étudiante', '50% di sconto studenti', 'خصم 50% للطلاب'),
                  t('Verified manually by our team', 'Verificat manual de echipa noastră', 'Επαληθεύεται χειροκίνητα από την ομάδα μας', 'Manuell von unserem Team überprüft', 'Vérifié manuellement par notre équipe', 'Verificato manualmente dal nostro team', 'يتم التحقق يدويًا من قِبل فريقنا'),
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-500" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full font-semibold"
                onClick={() => router.push('/pricing')}
              >
                {t('Get student rate', 'Obține tariful pentru elevi', 'Αποκτήστε φοιτητική τιμή', 'Studierendentarif erhalten', 'Obtenir le tarif étudiant', 'Ottieni la tariffa studenti', 'احصل على سعر الطلاب')} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Free tier */}
          <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-5 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{t('Free forever — Getting Started + Stage 1', 'Gratuit pentru totdeauna — Primii Pași + Etapa 1', 'Δωρεάν για πάντα — Ξεκινώντας + Στάδιο 1', 'Für immer kostenlos — Erste Schritte + Etappe 1', 'Gratuit pour toujours — Premiers pas + Étape 1', 'Gratis per sempre — Per iniziare + Fase 1', 'مجاني إلى الأبد — البدء + المرحلة 1')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {t('7 lectures covering LLM fundamentals, Transformers, GPT architecture overview, and your Python sandbox setup. Free forever, no credit card needed.', '7 lecții care acoperă fundamentele LLM, Transformere, prezentarea arhitecturii GPT și configurarea mediului tău Python. Gratuit pentru totdeauna, fără card de credit.', '7 μαθήματα που καλύπτουν τις βασικές αρχές LLM, τα Transformers, την επισκόπηση της αρχιτεκτονικής GPT και τη ρύθμιση του Python sandbox σας. Δωρεάν για πάντα, χωρίς πιστωτική κάρτα.', '7 Lektionen zu LLM-Grundlagen, Transformern, einem Überblick über die GPT-Architektur und der Einrichtung deiner Python-Sandbox. Für immer kostenlos, keine Kreditkarte erforderlich.', '7 leçons couvrant les fondamentaux des LLM, les Transformers, un aperçu de l’architecture GPT et la configuration de votre bac à sable Python. Gratuit pour toujours, aucune carte bancaire requise.', '7 lezioni sui fondamenti degli LLM, i Transformer, una panoramica dell’architettura GPT e la configurazione del tuo sandbox Python. Gratis per sempre, nessuna carta di credito richiesta.', '7 محاضرات تغطي أساسيات LLM، والمحولات (Transformers)، ونظرة عامة على بنية GPT، وإعداد بيئة بايثون التجريبية الخاصة بك. مجاني إلى الأبد، دون الحاجة لبطاقة ائتمان.')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                t('Setup & Tools', 'Configurare și Instrumente', 'Ρύθμιση & Εργαλεία', 'Einrichtung & Werkzeuge', 'Configuration et outils', 'Configurazione e strumenti', 'الإعداد والأدوات'),
                t('LLM Basics', 'Bazele LLM', 'Βασικά LLM', 'LLM-Grundlagen', 'Bases des LLM', 'Nozioni di base sugli LLM', 'أساسيات LLM'),
                t('Transformers', 'Transformere', 'Transformers', 'Transformer', 'Transformers', 'Transformer', 'المحولات (Transformers)'),
                t('GPT-3 Deep Dive', 'Analiză Detaliată GPT-3', 'Εις Βάθος GPT-3', 'GPT-3 im Detail', 'Plongée approfondie dans GPT-3', 'Approfondimento su GPT-3', 'استكشاف متعمق لـ GPT-3'),
                t('Progress Tracking', 'Urmărirea Progresului', 'Παρακολούθηση Προόδου', 'Fortschrittsverfolgung', 'Suivi de la progression', 'Monitoraggio dei progressi', 'تتبع التقدم'),
                t('Quizzes & XP', 'Teste și XP', 'Κουίζ & XP', 'Quizze & XP', 'Quiz et XP', 'Quiz e XP', 'الاختبارات ونقاط الخبرة'),
              ].map(f => (
                <span key={f} className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                  <Check className="h-3 w-3" /> {f}
                </span>
              ))}
            </div>
          </div>

          {/* Mission / Fund */}
          <div className="rounded-xl border bg-gradient-to-br from-[hsl(240_95%_10%)] to-[hsl(240_60%_18%)] p-6 text-white max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="h-5 w-5 text-[hsl(38_80%_55%)]" />
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{t('Your subscription builds the next free course', 'Abonamentul tău construiește următorul curs gratuit', 'Η συνδρομή σας χτίζει το επόμενο δωρεάν μάθημα', 'Dein Abonnement finanziert den nächsten kostenlosen Kurs', 'Votre abonnement finance le prochain cours gratuit', 'Il tuo abbonamento finanzia il prossimo corso gratuito', 'اشتراكك يمول الدورة المجانية القادمة')}</h3>
            </div>
            <p className="text-sm text-white/80">
              {t('Revenue from subscriptions goes into a dedicated Education Fund that pays for building new courses — many released free to students and schools. When you subscribe, you help the next learner build their first LLM for free.', 'Veniturile din abonamente merg într-un Fond de Educație dedicat care finanțează crearea de noi cursuri — multe lansate gratuit pentru elevi și școli. Când te abonezi, ajuți următorul cursant să își construiască primul LLM gratuit.', 'Τα έσοδα από τις συνδρομές πηγαίνουν σε ένα ειδικό Ταμείο Εκπαίδευσης που χρηματοδοτεί τη δημιουργία νέων μαθημάτων — πολλά διατίθενται δωρεάν σε μαθητές και σχολεία. Όταν εγγράφεστε, βοηθάτε τον επόμενο μαθητή να χτίσει το πρώτο του LLM δωρεάν.', 'Die Einnahmen aus Abonnements fließen in einen speziellen Bildungsfonds, der die Entwicklung neuer Kurse finanziert — viele werden kostenlos für Schüler und Schulen veröffentlicht. Mit deinem Abonnement hilfst du dem nächsten Lernenden, sein erstes LLM kostenlos zu bauen.', 'Les revenus des abonnements alimentent un Fonds pour l’éducation dédié qui finance la création de nouveaux cours — beaucoup sont proposés gratuitement aux élèves et aux écoles. En vous abonnant, vous aidez le prochain apprenant à créer gratuitement son premier LLM.', 'I ricavi degli abbonamenti confluiscono in un Fondo per l’Istruzione dedicato che finanzia la creazione di nuovi corsi — molti resi gratuiti per studenti e scuole. Abbonandoti, aiuti il prossimo studente a costruire gratuitamente il suo primo LLM.', 'تذهب عائدات الاشتراكات إلى صندوق تعليم مخصص يموّل إنشاء دورات جديدة — يُطرح الكثير منها مجانًا للطلاب والمدارس. عندما تشترك، فإنك تساعد المتعلم القادم على بناء أول نموذج LLM له مجانًا.')}
            </p>
          </div>

          {/* Competitor comparison */}
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-bold mb-1 text-center" style={{ fontFamily: 'var(--font-heading)' }}>{t('How we compare', 'Cum ne comparăm', 'Πώς συγκρινόμαστε', 'Wie wir im Vergleich abschneiden', 'Comment nous nous comparons', 'Come ci confrontiamo', 'كيف نقارن بالآخرين')}</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">{t('Bootcamp depth. Streaming-service price.', 'Profunzime de bootcamp. Preț de serviciu de streaming.', 'Βάθος bootcamp. Τιμή υπηρεσίας streaming.', 'Bootcamp-Tiefe. Preis eines Streaming-Dienstes.', 'La profondeur d’un bootcamp. Le prix d’un service de streaming.', 'La profondità di un bootcamp. Il prezzo di un servizio di streaming.', 'عمق معسكر تدريبي. بسعر خدمة بث.')}</p>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium"></th>
                    <th className="p-3 font-semibold text-primary">ADD Academica</th>
                    <th className="p-3 font-medium text-muted-foreground">Udemy</th>
                    <th className="p-3 font-medium text-muted-foreground">Coursera</th>
                    <th className="p-3 font-medium text-muted-foreground">{t('Bootcamps', 'Bootcamp-uri', 'Bootcamps', 'Bootcamps', 'Bootcamps', 'Bootcamp', 'معسكرات تدريبية')}</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map(row => (
                    <tr key={row.feature} className="border-b last:border-0">
                      <td className="p-3 font-medium">{row.feature}</td>
                      <td className="p-3 font-semibold text-green-600 dark:text-green-400">{row.add}</td>
                      <td className="p-3 text-muted-foreground">{row.udemy}</td>
                      <td className="p-3 text-muted-foreground">{row.coursera}</td>
                      <td className="p-3 text-muted-foreground">{row.bootcamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground text-center">{t('Competitor figures are indicative market ranges and may vary.', 'Cifrele concurenței sunt intervale orientative de piață și pot varia.', 'Τα στοιχεία των ανταγωνιστών είναι ενδεικτικά εύρη αγοράς και ενδέχεται να διαφέρουν.', 'Die Angaben zu Mitbewerbern sind indikative Marktspannen und können abweichen.', 'Les chiffres des concurrents sont des fourchettes de marché indicatives et peuvent varier.', 'I dati dei concorrenti sono intervalli di mercato indicativi e possono variare.', 'أرقام المنافسين هي نطاقات سوقية إرشادية وقد تختلف.')}</p>
          </div>

          {/* Free for schools & organisations */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{t('Free for every classroom', 'Gratuit pentru fiecare clasă', 'Δωρεάν για κάθε τάξη', 'Kostenlos für jedes Klassenzimmer', 'Gratuit pour chaque salle de classe', 'Gratuito per ogni classe', 'مجاني لكل فصل دراسي')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('Every student deserves real AI education — not just those who can pay. ADD Academica is 100% free for accredited schools, universities and educational organisations: the full library, deployable products and certificates, at no cost.', 'Fiecare elev merită o educație AI reală — nu doar cei care își permit să plătească. ADD Academica este 100% gratuit pentru școli, universități și organizații educaționale acreditate: întreaga bibliotecă, produse implementabile și certificate, fără niciun cost.', 'Κάθε μαθητής αξίζει πραγματική εκπαίδευση AI — όχι μόνο όσοι μπορούν να πληρώσουν. Το ADD Academica είναι 100% δωρεάν για πιστοποιημένα σχολεία, πανεπιστήμια και εκπαιδευτικούς οργανισμούς: η πλήρης βιβλιοθήκη, τα αναπτύξιμα προϊόντα και τα πιστοποιητικά, χωρίς κόστος.', 'Jeder Schüler verdient echte KI-Bildung — nicht nur diejenigen, die dafür bezahlen können. ADD Academica ist zu 100 % kostenlos für akkreditierte Schulen, Universitäten und Bildungseinrichtungen: die vollständige Bibliothek, einsetzbare Produkte und Zertifikate, ohne Kosten.', 'Chaque élève mérite une véritable éducation à l’IA — pas seulement ceux qui peuvent payer. ADD Academica est 100 % gratuit pour les écoles, universités et organisations éducatives accréditées : la bibliothèque complète, les produits déployables et les certificats, sans aucun coût.', 'Ogni studente merita una vera istruzione sull’IA — non solo chi può permetterselo. ADD Academica è gratuito al 100% per scuole, università e organizzazioni educative accreditate: l’intera libreria, i prodotti distribuibili e i certificati, a costo zero.', 'يستحق كل طالب تعليمًا حقيقيًا في الذكاء الاصطناعي — وليس فقط من يستطيع الدفع. منصة ADD Academica مجانية بنسبة 100% للمدارس والجامعات والمؤسسات التعليمية المعتمدة: المكتبة الكاملة، والمنتجات القابلة للنشر، والشهادات، دون أي تكلفة.')}
            </p>
            <ol className="space-y-2 mb-4 text-sm">
              {[
                t('Sign up as an Organisation. The person who registers becomes the Organisation Admin (or nominates a colleague as Org Admin).', 'Înscrie-te ca Organizație. Persoana care se înregistrează devine Administratorul Organizației (sau numește un coleg ca Administrator).', 'Εγγραφείτε ως Οργανισμός. Το άτομο που εγγράφεται γίνεται Διαχειριστής του Οργανισμού (ή ορίζει έναν συνάδελφο ως Διαχειριστή).', 'Registriere dich als Organisation. Die registrierende Person wird zum Organisations-Administrator (oder benennt einen Kollegen als Org-Administrator).', 'Inscrivez-vous en tant qu’organisation. La personne qui s’inscrit devient l’administrateur de l’organisation (ou désigne un collègue comme administrateur).', 'Registrati come Organizzazione. La persona che si registra diventa l’Amministratore dell’Organizzazione (oppure nomina un collega come Amministratore).', 'سجّل كمؤسسة. يصبح الشخص الذي يسجّل مسؤول المؤسسة (أو يعيّن زميلًا ليكون مسؤول المؤسسة).'),
                t('Members join and log in using their valid organisation email.', 'Membrii se alătură și se autentifică folosind emailul valid al organizației.', 'Τα μέλη εγγράφονται και συνδέονται χρησιμοποιώντας το έγκυρο email του οργανισμού τους.', 'Mitglieder treten bei und melden sich mit ihrer gültigen Organisations-E-Mail-Adresse an.', 'Les membres rejoignent et se connectent à l’aide de leur adresse e-mail professionnelle valide.', 'I membri si uniscono e accedono utilizzando la loro email aziendale valida.', 'ينضم الأعضاء ويسجلون الدخول باستخدام بريدهم الإلكتروني الرسمي الصالح الخاص بالمؤسسة.'),
                t('The Org Admin receives an invitation code to add members.', 'Administratorul Organizației primește un cod de invitație pentru a adăuga membri.', 'Ο Διαχειριστής του Οργανισμού λαμβάνει έναν κωδικό πρόσκλησης για να προσθέσει μέλη.', 'Der Organisations-Administrator erhält einen Einladungscode, um Mitglieder hinzuzufügen.', 'L’administrateur de l’organisation reçoit un code d’invitation pour ajouter des membres.', 'L’Amministratore dell’Organizzazione riceve un codice di invito per aggiungere membri.', 'يحصل مسؤول المؤسسة على رمز دعوة لإضافة الأعضاء.'),
                t(`Each organisation includes up to ${ORG_SEATS} registered students at no cost.`, `Fiecare organizație include până la ${ORG_SEATS} elevi înregistrați fără niciun cost.`, `Κάθε οργανισμός περιλαμβάνει έως ${ORG_SEATS} εγγεγραμμένους μαθητές χωρίς κόστος.`, `Jede Organisation umfasst bis zu ${ORG_SEATS} registrierte Studierende ohne Kosten.`, `Chaque organisation inclut jusqu'à ${ORG_SEATS} étudiants inscrits sans frais.`, `Ogni organizzazione include fino a ${ORG_SEATS} studenti registrati senza alcun costo.`, `تشمل كل مؤسسة ما يصل إلى ${ORG_SEATS} طالبًا مسجلاً دون أي تكلفة.`),
                t(`Need more than ${ORG_SEATS} seats? Contact ${CONTACT_EMAIL} and our team will extend your organisation's capacity.`, `Ai nevoie de mai mult de ${ORG_SEATS} locuri? Contactează ${CONTACT_EMAIL} și echipa noastră va extinde capacitatea organizației tale.`, `Χρειάζεστε περισσότερες από ${ORG_SEATS} θέσεις; Επικοινωνήστε στο ${CONTACT_EMAIL} και η ομάδα μας θα επεκτείνει τη χωρητικότητα του οργανισμού σας.`, `Benötigst du mehr als ${ORG_SEATS} Plätze? Kontaktiere ${CONTACT_EMAIL}, und unser Team erweitert die Kapazität deiner Organisation.`, `Besoin de plus de ${ORG_SEATS} places ? Contactez ${CONTACT_EMAIL} et notre équipe augmentera la capacité de votre organisation.`, `Hai bisogno di più di ${ORG_SEATS} posti? Contatta ${CONTACT_EMAIL} e il nostro team amplierà la capacità della tua organizzazione.`, `هل تحتاج إلى أكثر من ${ORG_SEATS} مقعدًا؟ تواصل مع ${CONTACT_EMAIL} وسيقوم فريقنا بتوسيع سعة مؤسستك.`),
              ].map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <a href={`mailto:${CONTACT_EMAIL}?subject=Organisation%20access%20request`}>
              <Button className="font-semibold">
                {t('Apply as an organisation', 'Aplică ca organizație', 'Υποβολή αίτησης ως οργανισμός', 'Als Organisation bewerben', 'Postuler en tant qu’organisation', 'Candidati come organizzazione', 'التقدم كمؤسسة')} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </a>
          </div>

          {/* Trust strip */}
          <div className="text-center space-y-2 py-4">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> {t('Free for schools', 'Gratuit pentru școli', 'Δωρεάν για σχολεία', 'Kostenlos für Schulen', 'Gratuit pour les écoles', 'Gratuito per le scuole', 'مجاني للمدارس')}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t('Cancel anytime', 'Anulează oricând', 'Ακύρωση οποτεδήποτε', 'Jederzeit kündbar', 'Résiliable à tout moment', 'Annulla quando vuoi', 'إلغاء في أي وقت')}</span>
              <span className="flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" /> {t('New courses added regularly', 'Cursuri noi adăugate regulat', 'Νέα μαθήματα προστίθενται τακτικά', 'Regelmäßig neue Kurse', 'De nouveaux cours ajoutés régulièrement', 'Nuovi corsi aggiunti regolarmente', 'دورات جديدة تُضاف بانتظام')}</span>
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {t('Secure payment via Stripe', 'Plată securizată prin Stripe', 'Ασφαλής πληρωμή μέσω Stripe', 'Sichere Zahlung über Stripe', 'Paiement sécurisé via Stripe', 'Pagamento sicuro tramite Stripe', 'دفع آمن عبر Stripe')}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('Every subscription funds free education.', 'Fiecare abonament finanțează educația gratuită.', 'Κάθε συνδρομή χρηματοδοτεί τη δωρεάν εκπαίδευση.', 'Jedes Abonnement finanziert kostenlose Bildung.', 'Chaque abonnement finance l’éducation gratuite.', 'Ogni abbonamento finanzia l’istruzione gratuita.', 'كل اشتراك يموّل التعليم المجاني.')}</p>
          </div>

          {/* How it works */}
          <div className="rounded-xl border bg-card p-6 max-w-3xl mx-auto">
            <h4 className="font-semibold mb-3">{t('How it works', 'Cum funcționează', 'Πώς λειτουργεί', 'So funktioniert es', 'Comment ça marche', 'Come funziona', 'كيف يعمل')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-0.5">{t('One subscription, everything unlocked', 'Un abonament, totul deblocat', 'Μία συνδρομή, τα πάντα ξεκλειδωμένα', 'Ein Abonnement, alles freigeschaltet', 'Un seul abonnement, tout débloqué', 'Un solo abbonamento, tutto sbloccato', 'اشتراك واحد، كل شيء متاح')}</p>
                <p className="text-xs text-muted-foreground">{t('All-Access includes the full LLM course, all GenAI products, and every future course.', 'All-Access include cursul LLM complet, toate produsele GenAI și fiecare curs viitor.', 'Το All-Access περιλαμβάνει το πλήρες μάθημα LLM, όλα τα προϊόντα GenAI και κάθε μελλοντικό μάθημα.', 'All-Access umfasst den vollständigen LLM-Kurs, alle GenAI-Produkte und jeden zukünftigen Kurs.', 'All-Access comprend le cours LLM complet, tous les produits GenAI et chaque futur cours.', 'All-Access include il corso LLM completo, tutti i prodotti GenAI e ogni corso futuro.', 'تشمل باقة All-Access الدورة الكاملة لـ LLM، وجميع منتجات GenAI، وكل دورة مستقبلية.')}</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">{t('Cancel anytime', 'Anulează oricând', 'Ακύρωση οποτεδήποτε', 'Jederzeit kündbar', 'Résiliable à tout moment', 'Annulla quando vuoi', 'إلغاء في أي وقت')}</p>
                <p className="text-xs text-muted-foreground">{t('No lock-in. Manage or cancel your subscription whenever you like.', 'Fără angajamente. Gestionează sau anulează-ți abonamentul oricând dorești.', 'Χωρίς δέσμευση. Διαχειριστείτε ή ακυρώστε τη συνδρομή σας όποτε θέλετε.', 'Keine Vertragsbindung. Verwalte oder kündige dein Abonnement, wann immer du möchtest.', 'Aucun engagement. Gérez ou résiliez votre abonnement quand vous le souhaitez.', 'Nessun vincolo. Gestisci o annulla il tuo abbonamento quando vuoi.', 'بدون التزام. أدر أو ألغِ اشتراكك في أي وقت تشاء.')}</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">{t('Keep your progress', 'Păstrează-ți progresul', 'Κρατήστε την πρόοδό σας', 'Behalte deinen Fortschritt', 'Conservez votre progression', 'Mantieni i tuoi progressi', 'احتفظ بتقدمك')}</p>
                <p className="text-xs text-muted-foreground">{t('Your XP, badges, quiz scores, and completion certificate stay with your account.', 'XP-ul, insignele, scorurile la teste și certificatul de absolvire rămân în contul tău.', 'Οι πόντοι XP, τα σήματα, οι βαθμολογίες κουίζ και το πιστοποιητικό ολοκλήρωσης παραμένουν στον λογαριασμό σας.', 'Deine XP, Abzeichen, Quiz-Ergebnisse und dein Abschlusszertifikat bleiben in deinem Konto erhalten.', 'Vos XP, badges, résultats de quiz et certificat de fin de formation restent liés à votre compte.', 'I tuoi XP, badge, punteggi dei quiz e il certificato di completamento restano legati al tuo account.', 'تبقى نقاط خبرتك وشاراتك ونتائج اختباراتك وشهادة إتمامك مرتبطة بحسابك.')}</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">{t('Students & schools', 'Elevi și școli', 'Μαθητές & σχολεία', 'Studierende & Schulen', 'Étudiants et écoles', 'Studenti e scuole', 'الطلاب والمدارس')}</p>
                <p className="text-xs text-muted-foreground">{t('Students get 50% off after verification; accredited organisations get full access free.', 'Elevii primesc 50% reducere după verificare; organizațiile acreditate primesc acces complet gratuit.', 'Οι μαθητές λαμβάνουν 50% έκπτωση μετά την επαλήθευση· οι πιστοποιημένοι οργανισμοί έχουν πλήρη δωρεάν πρόσβαση.', 'Studierende erhalten nach der Verifizierung 50 % Rabatt; akkreditierte Organisationen erhalten kostenlosen Vollzugriff.', 'Les étudiants bénéficient de 50 % de réduction après vérification ; les organisations accréditées obtiennent un accès complet gratuit.', 'Gli studenti ottengono il 50% di sconto dopo la verifica; le organizzazioni accreditate ottengono l’accesso completo gratuito.', 'يحصل الطلاب على خصم 50% بعد التحقق؛ وتحصل المؤسسات المعتمدة على وصول كامل مجاني.')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: Invoices ═══════════════ */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('Billing History', 'Istoric Facturare', 'Ιστορικό Χρεώσεων', 'Rechnungsverlauf', 'Historique de facturation', 'Cronologia di fatturazione', 'سجل الفوترة')}
            </h3>

            {invoicesLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {t('Loading your billing history...', 'Se încarcă istoricul tău de facturare...', 'Φόρτωση του ιστορικού χρεώσεών σας...', 'Deine Rechnungshistorie wird geladen …', 'Chargement de votre historique de facturation…', 'Caricamento della cronologia di fatturazione…', 'جارٍ تحميل سجل الفوترة الخاص بك...')}
              </div>
            ) : invoicesError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500/60 mb-3" />
                <p className="font-medium text-muted-foreground">{invoicesError}</p>
                <Button variant="outline" size="sm" className="mt-4"
                        onClick={() => window.location.reload()}>
                  {t('Try again', 'Încearcă din nou', 'Δοκιμάστε ξανά', 'Erneut versuchen', 'Réessayer', 'Riprova', 'أعد المحاولة')}
                </Button>
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">{t('No invoices yet', 'Încă nicio factură', 'Δεν υπάρχουν τιμολόγια ακόμη', 'Noch keine Rechnungen', 'Aucune facture pour le moment', 'Nessuna fattura ancora', 'لا توجد فواتير بعد')}</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {t('Invoices will appear here once you start a subscription.', 'Facturile vor apărea aici după ce începi un abonament.', 'Τα τιμολόγια θα εμφανιστούν εδώ μόλις ξεκινήσετε μια συνδρομή.', 'Rechnungen erscheinen hier, sobald du ein Abonnement abschließt.', 'Les factures apparaîtront ici dès que vous souscrirez un abonnement.', 'Le fatture appariranno qui non appena avvierai un abbonamento.', 'ستظهر الفواتير هنا بمجرد أن تبدأ اشتراكًا.')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setActiveTab('courses')}
                >
                  {t('View subscription plans', 'Vezi planurile de abonament', 'Δείτε τα πλάνα συνδρομής', 'Abonnementpläne ansehen', 'Voir les formules d’abonnement', 'Visualizza i piani di abbonamento', 'عرض خطط الاشتراك')}
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">{t('Date', 'Data', 'Ημερομηνία', 'Datum', 'Date', 'Data', 'التاريخ')}</th>
                    <th className="pb-2 text-left font-medium">{t('Description', 'Descriere', 'Περιγραφή', 'Beschreibung', 'Description', 'Descrizione', 'الوصف')}</th>
                    <th className="pb-2 text-right font-medium">{t('Amount', 'Sumă', 'Ποσό', 'Betrag', 'Montant', 'Importo', 'المبلغ')}</th>
                    <th className="pb-2 text-right font-medium">{t('Status', 'Stare', 'Κατάσταση', 'Status', 'Statut', 'Stato', 'الحالة')}</th>
                    <th className="pb-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-3">
                        {new Date(inv.date).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </td>
                      <td className="py-3">
                        {inv.description}
                        {inv.number && (
                          <span className="block text-xs text-muted-foreground">#{inv.number}</span>
                        )}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {inv.currency === 'EUR' ? '\u20AC' : inv.currency + ' '}
                        {inv.amount.toFixed(2)}
                        {inv.refunded && (
                          <span className="block text-xs text-amber-600 dark:text-amber-500">
                            &minus;{inv.currency === 'EUR' ? '\u20AC' : ''}
                            {inv.amountRefunded.toFixed(2)} {t('refunded', 'rambursat', 'επιστράφηκε', 'erstattet', 'remboursé', 'rimborsato', 'مسترد')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Badge
                          variant={inv.refunded ? 'outline' : 'secondary'}
                          className={
                            inv.refunded
                              ? 'text-xs border-amber-500/40 text-amber-600 dark:text-amber-500'
                              : 'text-xs'
                          }
                        >
                          {inv.refunded ? t('Refunded', 'Rambursat', 'Επιστράφηκε', 'Erstattet', 'Remboursé', 'Rimborsato', 'مسترد') : inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {inv.pdfUrl ? (
                          <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                              PDF <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        ) : inv.hostedUrl ? (
                          <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                              {t('View', 'Vezi', 'Προβολή', 'Ansehen', 'Voir', 'Visualizza', 'عرض')} <ExternalLink className="h-3 w-3" />
                            </Button>
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {invoices.length > 0 && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" className="gap-1.5"
                        onClick={openBillingPortal} disabled={portalLoading}>
                  {portalLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CreditCard className="h-3.5 w-3.5" />}
                  {t('Manage billing in Stripe', 'Gestionează facturarea în Stripe', 'Διαχείριση χρεώσεων στο Stripe', 'Rechnungsstellung in Stripe verwalten', 'Gérer la facturation dans Stripe', 'Gestisci la fatturazione in Stripe', 'إدارة الفوترة في Stripe')}
                </Button>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t('Payment Method', 'Metodă de Plată', 'Μέθοδος Πληρωμής', 'Zahlungsmethode', 'Moyen de paiement', 'Metodo di pagamento', 'طريقة الدفع')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('Payments are processed securely via Stripe. No payment details are stored on our servers.', 'Plățile sunt procesate securizat prin Stripe. Niciun detaliu de plată nu este stocat pe serverele noastre.', 'Οι πληρωμές επεξεργάζονται με ασφάλεια μέσω Stripe. Δεν αποθηκεύονται στοιχεία πληρωμής στους διακομιστές μας.', 'Zahlungen werden sicher über Stripe abgewickelt. Es werden keine Zahlungsdaten auf unseren Servern gespeichert.', 'Les paiements sont traités de manière sécurisée via Stripe. Aucune donnée de paiement n’est stockée sur nos serveurs.', 'I pagamenti vengono elaborati in modo sicuro tramite Stripe. Nessun dato di pagamento viene conservato sui nostri server.', 'تتم معالجة المدفوعات بأمان عبر Stripe. لا يتم تخزين أي تفاصيل دفع على خوادمنا.')}
            </p>
          </div>
        </div>
      )}

      {/* ── Sign out ── */}
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{t('Sign out', 'Deconectare', 'Αποσύνδεση', 'Abmelden', 'Déconnexion', 'Disconnetti', 'تسجيل الخروج')}</p>
          <p className="text-xs text-muted-foreground">{t('Sign out of your ADD Academica account', 'Deconectează-te din contul tău ADD Academica', 'Αποσυνδεθείτε από τον λογαριασμό σας ADD Academica', 'Von deinem ADD Academica-Konto abmelden', 'Se déconnecter de votre compte ADD Academica', 'Disconnetti il tuo account ADD Academica', 'تسجيل الخروج من حساب ADD Academica الخاص بك')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            await signOut();
            router.push('/');
            router.refresh();
          }}
        >
          <LogOut className="h-3.5 w-3.5" />
          {t('Sign Out', 'Deconectare', 'Αποσύνδεση', 'Abmelden', 'Déconnexion', 'Disconnetti', 'تسجيل الخروج')}
        </Button>
      </div>
    </div>
  );
}
