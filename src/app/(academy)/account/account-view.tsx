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

  const t = (en: string, ro: string, el: string) =>
    language === 'ro' ? ro : language === 'el' ? el : en;

  const ALL_ACCESS_FEATURES = [
    t('Full LLM course — all stages, 68 lectures', 'Curs LLM complet — toate etapele, 68 de lecții', 'Πλήρες μάθημα LLM — όλα τα στάδια, 68 μαθήματα'),
    t('All 5 GenAI SaaS product courses', 'Toate cele 5 cursuri de produse GenAI SaaS', 'Και τα 5 μαθήματα προϊόντων GenAI SaaS'),
    t('Live in-browser Python — no setup', 'Python live în browser — fără configurare', 'Ζωντανή Python στον browser — χωρίς εγκατάσταση'),
    t('Deployable NeuralForge LLM + product downloads', 'LLM NeuralForge implementabil + descărcări de produse', 'Αναπτύξιμο LLM NeuralForge + λήψεις προϊόντων'),
    t('AI Tutor access', 'Acces la Tutorul AI', 'Πρόσβαση στον AI Tutor'),
    t('Completion certificate', 'Certificat de absolvire', 'Πιστοποιητικό ολοκλήρωσης'),
    t('All future courses included', 'Toate cursurile viitoare incluse', 'Όλα τα μελλοντικά μαθήματα περιλαμβάνονται'),
  ];

  const COMPARISON_ROWS: { feature: string; add: string; udemy: string; coursera: string; bootcamp: string }[] = [
    {
      feature: t('Build an LLM from scratch', 'Construiește un LLM de la zero', 'Δημιουργία LLM από το μηδέν'),
      add: t('Yes', 'Da', 'Ναι'),
      udemy: t('Rarely', 'Rar', 'Σπάνια'),
      coursera: t('Partial', 'Parțial', 'Μερικώς'),
      bootcamp: t('Sometimes', 'Uneori', 'Μερικές φορές'),
    },
    {
      feature: t('Live in-browser Python (no setup)', 'Python live în browser (fără configurare)', 'Ζωντανή Python στον browser (χωρίς εγκατάσταση)'),
      add: t('Yes', 'Da', 'Ναι'),
      udemy: t('No', 'Nu', 'Όχι'),
      coursera: t('No', 'Nu', 'Όχι'),
      bootcamp: t('No', 'Nu', 'Όχι'),
    },
    {
      feature: t('Deployable SaaS products you keep', 'Produse SaaS implementabile pe care le păstrezi', 'Αναπτύξιμα προϊόντα SaaS που κρατάτε'),
      add: t('6 products', '6 produse', '6 προϊόντα'),
      udemy: t('No', 'Nu', 'Όχι'),
      coursera: t('No', 'Nu', 'Όχι'),
      bootcamp: t('No', 'Nu', 'Όχι'),
    },
    {
      feature: t('Certificate', 'Certificat', 'Πιστοποιητικό'),
      add: t('Yes', 'Da', 'Ναι'),
      udemy: t('Yes', 'Da', 'Ναι'),
      coursera: t('Yes', 'Da', 'Ναι'),
      bootcamp: t('Yes', 'Da', 'Ναι'),
    },
    {
      feature: t('Free for schools', 'Gratuit pentru școli', 'Δωρεάν για σχολεία'),
      add: t('Yes', 'Da', 'Ναι'),
      udemy: t('No', 'Nu', 'Όχι'),
      coursera: t('No', 'Nu', 'Όχι'),
      bootcamp: t('No', 'Nu', 'Όχι'),
    },
    {
      feature: t('All future courses included', 'Toate cursurile viitoare incluse', 'Όλα τα μελλοντικά μαθήματα περιλαμβάνονται'),
      add: t('Yes', 'Da', 'Ναι'),
      udemy: t('No', 'Nu', 'Όχι'),
      coursera: t('No', 'Nu', 'Όχι'),
      bootcamp: t('No', 'Nu', 'Όχι'),
    },
    {
      feature: t('Price', 'Preț', 'Τιμή'),
      add: t('€12/mo', '€12/lună', '€12/μήνα'),
      udemy: t('~€15–130/course', '~€15–130/curs', '~€15–130/μάθημα'),
      coursera: t('~$49/mo', '~$49/lună', '~$49/μήνα'),
      bootcamp: t('$500–2,000', '$500–2.000', '$500–2.000'),
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
        if (!cancelled) setInvoicesError(t('Could not load your billing history.', 'Nu am putut încărca istoricul tău de facturare.', 'Δεν ήταν δυνατή η φόρτωση του ιστορικού χρεώσεών σας.'));
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
      else setInvoicesError(data.error || t('Could not open the billing portal.', 'Nu am putut deschide portalul de facturare.', 'Δεν ήταν δυνατό το άνοιγμα της πύλης χρεώσεων.'));
    } catch {
      setInvoicesError(t('Could not open the billing portal.', 'Nu am putut deschide portalul de facturare.', 'Δεν ήταν δυνατό το άνοιγμα της πύλης χρεώσεων.'));
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
        <p className="text-lg font-medium">{t('Please log in to view your account', 'Te rugăm să te autentifici pentru a-ți vedea contul', 'Παρακαλώ συνδεθείτε για να δείτε τον λογαριασμό σας')}</p>
        <Link href="/login?redirect=/account">
          <Button>{t('Log in', 'Autentificare', 'Σύνδεση')}</Button>
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
          {t('My Account', 'Contul Meu', 'Ο Λογαριασμός Μου')}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('Manage your profile, subscription, and learning progress.', 'Gestionează-ți profilul, abonamentul și progresul de învățare.', 'Διαχειριστείτε το προφίλ, τη συνδρομή και την πρόοδο μάθησής σας.')}
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
            aria-label={t('Dismiss notification', 'Închide notificarea', 'Απόρριψη ειδοποίησης')}
          >
            {t('Dismiss', 'Închide', 'Απόρριψη')}
          </Button>
        </div>
      ))}

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { id: 'overview' as const, label: t('Overview', 'Prezentare', 'Επισκόπηση'), icon: User },
          { id: 'courses' as const, label: t('Subscription', 'Abonament', 'Συνδρομή'), icon: ShoppingCart },
          { id: 'invoices' as const, label: t('Invoices', 'Facturi', 'Τιμολόγια'), icon: FileText },
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
                  <h2 className="text-xl font-semibold">{user.displayName || t('Academica Student', 'Student Academica', 'Μαθητής Academica')}</h2>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      <BookOpen className="mr-1 h-3 w-3" />
                      {t('Free Tier', 'Nivel Gratuit', 'Δωρεάν Επίπεδο')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: BookOpen, label: t('Lectures', 'Lecții', 'Μαθήματα'), value: `${completedLectures}/68`, color: 'text-blue-500' },
              { icon: ClipboardCheck, label: t('Quizzes', 'Teste', 'Κουίζ'), value: String(quizzesTaken), color: 'text-purple-500' },
              { icon: Code2, label: t('Code Runs', 'Rulări de Cod', 'Εκτελέσεις Κώδικα'), value: String(totalCodeBlocksRun), color: 'text-green-500' },
              { icon: Flame, label: t('Streak', 'Serie', 'Σερί'), value: `${streak} ${t('days', 'zile', 'ημέρες')}`, color: 'text-orange-500' },
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
                {t('Learning Progress', 'Progresul Învățării', 'Πρόοδος Μάθησης')}
              </h3>
              <span className="text-sm font-medium tabular-nums">{xp} XP</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{t('Course Completion', 'Finalizarea Cursului', 'Ολοκλήρωση Μαθήματος')}</span>
                  <span>{Math.round(completion)}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{t('Time Invested', 'Timp Investit', 'Χρόνος που Επενδύθηκε')}</span>
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
              {t('My Subscription', 'Abonamentul Meu', 'Η Συνδρομή Μου')}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-green-500/10 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15">
                    {(() => { const I = getIcon('Compass'); return <I className="h-4 w-4 text-blue-500" />; })()}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{t('Getting Started + LLM Fundamentals', 'Primii Pași + Fundamentele LLM', 'Ξεκινώντας + Βασικές Αρχές LLM')}</p>
                    <p className="text-xs text-muted-foreground">{t('7 lectures — Free forever', '7 lecții — Gratuit pentru totdeauna', '7 μαθήματα — Δωρεάν για πάντα')}</p>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-0">
                  <Check className="mr-1 h-3 w-3" /> {t('Active', 'Activ', 'Ενεργό')}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                    <Crown className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">All-Access</p>
                    <p className="text-xs text-muted-foreground">{t('Everything unlocked — €12/mo or €99/yr', 'Totul deblocat — €12/lună sau €99/an', 'Όλα ξεκλειδωμένα — €12/μήνα ή €99/έτος')}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{t('Not subscribed', 'Neabonat', 'Χωρίς συνδρομή')}</span>
              </div>
            </div>

            <Button
              className="mt-4 w-full bg-[hsl(38_80%_55%)] text-[hsl(240_95%_10%)] hover:bg-[hsl(38_80%_48%)] font-semibold"
              onClick={() => setActiveTab('courses')}
            >
              <ArrowUpRight className="mr-2 h-4 w-4" />
              {t('View subscription plans', 'Vezi planurile de abonament', 'Δείτε τα πλάνα συνδρομής')}
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
                  <p className="text-sm font-medium">{t('Subscription & Pricing', 'Abonament și Prețuri', 'Συνδρομή & Τιμολόγηση')}</p>
                  <p className="text-xs text-muted-foreground">{t('One plan unlocks everything', 'Un singur plan deblochează totul', 'Ένα πλάνο ξεκλειδώνει τα πάντα')}</p>
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
                  <p className="text-sm font-medium">{t('Billing & Invoices', 'Facturare și Facturi', 'Χρεώσεις & Τιμολόγια')}</p>
                  <p className="text-xs text-muted-foreground">{t('Download past invoices', 'Descarcă facturile anterioare', 'Λήψη προηγούμενων τιμολογίων')}</p>
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
              {t('Learn AI. Build real products. Fund free education.', 'Învață AI. Construiește produse reale. Finanțează educația gratuită.', 'Μάθε AI. Δημιούργησε πραγματικά προϊόντα. Χρηματοδότησε τη δωρεάν εκπαίδευση.')}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {t('One subscription unlocks everything — and every euro helps keep AI education free for students and schools.', 'Un singur abonament deblochează totul — și fiecare euro ajută la menținerea educației AI gratuite pentru elevi și școli.', 'Μία συνδρομή ξεκλειδώνει τα πάντα — και κάθε ευρώ βοηθά να παραμείνει η εκπαίδευση AI δωρεάν για μαθητές και σχολεία.')}
            </p>
            <p className="mt-2 text-sm font-medium">{t('€12/month · €99/year · Cancel anytime', '€12/lună · €99/an · Anulează oricând', '€12/μήνα · €99/έτος · Ακύρωση οποτεδήποτε')}</p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {t('Monthly', 'Lunar', 'Μηνιαία')}
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${billing === 'annual' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {t('Annual', 'Anual', 'Ετήσια')} <span className="text-green-500 font-semibold">{t('· 2 months free', '· 2 luni gratuite', '· 2 μήνες δωρεάν')}</span>
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
                <p className="text-xs text-muted-foreground mt-0.5 mb-4">{t('Everything, plus every future course', 'Totul, plus fiecare curs viitor', 'Τα πάντα, συν κάθε μελλοντικό μάθημα')}</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold tabular-nums">€{billing === 'annual' ? ANNUAL_PRICE : MONTHLY_PRICE}</span>
                  <span className="text-sm text-muted-foreground">/ {billing === 'annual' ? t('year', 'an', 'έτος') : t('month', 'lună', 'μήνα')}</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-4">
                  {billing === 'annual'
                    ? t(`Just €${ANNUAL_MONTHLY_EQUIV}/mo billed yearly — 2 months free`, `Doar €${ANNUAL_MONTHLY_EQUIV}/lună facturat anual — 2 luni gratuite`, `Μόνο €${ANNUAL_MONTHLY_EQUIV}/μήνα με ετήσια χρέωση — 2 μήνες δωρεάν`)
                    : t('Switch to annual and get 2 months free', 'Treci la plata anuală și primești 2 luni gratuite', 'Μετάβαση σε ετήσια και κερδίστε 2 μήνες δωρεάν')}
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
                  {t('Subscribe', 'Abonează-te', 'Εγγραφή')} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">{t('Renews automatically · cancel anytime', 'Se reînnoiește automat · anulează oricând', 'Ανανεώνεται αυτόματα · ακύρωση οποτεδήποτε')}</p>
              </div>
            </div>

            {/* Students */}
            <div className="rounded-xl border-2 border-border bg-card p-6 hover:border-primary/30 transition-colors">
              <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{t('Students — 50% off', 'Elevi — 50% reducere', 'Μαθητές — 50% έκπτωση')}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 mb-4">{t('Same All-Access, half the price', 'Același All-Access, la jumătate de preț', 'Το ίδιο All-Access, στη μισή τιμή')}</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold tabular-nums">€{billing === 'annual' ? STUDENT_ANNUAL : STUDENT_MONTHLY}</span>
                <span className="text-sm text-muted-foreground">/ {billing === 'annual' ? t('year', 'an', 'έτος') : t('month', 'lună', 'μήνα')}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {t('Subscribe, then verify your student status (student email, ID, or enrolment letter) and we’ll apply your discount.', 'Abonează-te, apoi verifică-ți statutul de elev (email de student, legitimație sau adeverință de înscriere) și îți vom aplica reducerea.', 'Εγγραφείτε και μετά επαληθεύστε την ιδιότητά σας ως μαθητή (φοιτητικό email, ταυτότητα ή βεβαίωση εγγραφής) και θα εφαρμόσουμε την έκπτωσή σας.')}
              </p>
              <ul className="space-y-1.5 mb-5">
                {[
                  t('Everything in All-Access', 'Tot ce include All-Access', 'Τα πάντα στο All-Access'),
                  t('50% student discount', '50% reducere pentru elevi', '50% έκπτωση για μαθητές'),
                  t('Verified manually by our team', 'Verificat manual de echipa noastră', 'Επαληθεύεται χειροκίνητα από την ομάδα μας'),
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
                {t('Get student rate', 'Obține tariful pentru elevi', 'Αποκτήστε φοιτητική τιμή')} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Free tier */}
          <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-5 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{t('Free forever — Getting Started + Stage 1', 'Gratuit pentru totdeauna — Primii Pași + Etapa 1', 'Δωρεάν για πάντα — Ξεκινώντας + Στάδιο 1')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {t('7 lectures covering LLM fundamentals, Transformers, GPT architecture overview, and your Python sandbox setup. Free forever, no credit card needed.', '7 lecții care acoperă fundamentele LLM, Transformere, prezentarea arhitecturii GPT și configurarea mediului tău Python. Gratuit pentru totdeauna, fără card de credit.', '7 μαθήματα που καλύπτουν τις βασικές αρχές LLM, τα Transformers, την επισκόπηση της αρχιτεκτονικής GPT και τη ρύθμιση του Python sandbox σας. Δωρεάν για πάντα, χωρίς πιστωτική κάρτα.')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                t('Setup & Tools', 'Configurare și Instrumente', 'Ρύθμιση & Εργαλεία'),
                t('LLM Basics', 'Bazele LLM', 'Βασικά LLM'),
                t('Transformers', 'Transformere', 'Transformers'),
                t('GPT-3 Deep Dive', 'Analiză Detaliată GPT-3', 'Εις Βάθος GPT-3'),
                t('Progress Tracking', 'Urmărirea Progresului', 'Παρακολούθηση Προόδου'),
                t('Quizzes & XP', 'Teste și XP', 'Κουίζ & XP'),
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
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{t('Your subscription builds the next free course', 'Abonamentul tău construiește următorul curs gratuit', 'Η συνδρομή σας χτίζει το επόμενο δωρεάν μάθημα')}</h3>
            </div>
            <p className="text-sm text-white/80">
              {t('Revenue from subscriptions goes into a dedicated Education Fund that pays for building new courses — many released free to students and schools. When you subscribe, you help the next learner build their first LLM for free.', 'Veniturile din abonamente merg într-un Fond de Educație dedicat care finanțează crearea de noi cursuri — multe lansate gratuit pentru elevi și școli. Când te abonezi, ajuți următorul cursant să își construiască primul LLM gratuit.', 'Τα έσοδα από τις συνδρομές πηγαίνουν σε ένα ειδικό Ταμείο Εκπαίδευσης που χρηματοδοτεί τη δημιουργία νέων μαθημάτων — πολλά διατίθενται δωρεάν σε μαθητές και σχολεία. Όταν εγγράφεστε, βοηθάτε τον επόμενο μαθητή να χτίσει το πρώτο του LLM δωρεάν.')}
            </p>
          </div>

          {/* Competitor comparison */}
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-bold mb-1 text-center" style={{ fontFamily: 'var(--font-heading)' }}>{t('How we compare', 'Cum ne comparăm', 'Πώς συγκρινόμαστε')}</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">{t('Bootcamp depth. Streaming-service price.', 'Profunzime de bootcamp. Preț de serviciu de streaming.', 'Βάθος bootcamp. Τιμή υπηρεσίας streaming.')}</p>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium"></th>
                    <th className="p-3 font-semibold text-primary">ADD Academica</th>
                    <th className="p-3 font-medium text-muted-foreground">Udemy</th>
                    <th className="p-3 font-medium text-muted-foreground">Coursera</th>
                    <th className="p-3 font-medium text-muted-foreground">{t('Bootcamps', 'Bootcamp-uri', 'Bootcamps')}</th>
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
            <p className="mt-2 text-[10px] text-muted-foreground text-center">{t('Competitor figures are indicative market ranges and may vary.', 'Cifrele concurenței sunt intervale orientative de piață și pot varia.', 'Τα στοιχεία των ανταγωνιστών είναι ενδεικτικά εύρη αγοράς και ενδέχεται να διαφέρουν.')}</p>
          </div>

          {/* Free for schools & organisations */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{t('Free for every classroom', 'Gratuit pentru fiecare clasă', 'Δωρεάν για κάθε τάξη')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('Every student deserves real AI education — not just those who can pay. ADD Academica is 100% free for accredited schools, universities and educational organisations: the full library, deployable products and certificates, at no cost.', 'Fiecare elev merită o educație AI reală — nu doar cei care își permit să plătească. ADD Academica este 100% gratuit pentru școli, universități și organizații educaționale acreditate: întreaga bibliotecă, produse implementabile și certificate, fără niciun cost.', 'Κάθε μαθητής αξίζει πραγματική εκπαίδευση AI — όχι μόνο όσοι μπορούν να πληρώσουν. Το ADD Academica είναι 100% δωρεάν για πιστοποιημένα σχολεία, πανεπιστήμια και εκπαιδευτικούς οργανισμούς: η πλήρης βιβλιοθήκη, τα αναπτύξιμα προϊόντα και τα πιστοποιητικά, χωρίς κόστος.')}
            </p>
            <ol className="space-y-2 mb-4 text-sm">
              {[
                t('Sign up as an Organisation. The person who registers becomes the Organisation Admin (or nominates a colleague as Org Admin).', 'Înscrie-te ca Organizație. Persoana care se înregistrează devine Administratorul Organizației (sau numește un coleg ca Administrator).', 'Εγγραφείτε ως Οργανισμός. Το άτομο που εγγράφεται γίνεται Διαχειριστής του Οργανισμού (ή ορίζει έναν συνάδελφο ως Διαχειριστή).'),
                t('Members join and log in using their valid organisation email.', 'Membrii se alătură și se autentifică folosind emailul valid al organizației.', 'Τα μέλη εγγράφονται και συνδέονται χρησιμοποιώντας το έγκυρο email του οργανισμού τους.'),
                t('The Org Admin receives an invitation code to add members.', 'Administratorul Organizației primește un cod de invitație pentru a adăuga membri.', 'Ο Διαχειριστής του Οργανισμού λαμβάνει έναν κωδικό πρόσκλησης για να προσθέσει μέλη.'),
                t(`Each organisation includes up to ${ORG_SEATS} registered students at no cost.`, `Fiecare organizație include până la ${ORG_SEATS} elevi înregistrați fără niciun cost.`, `Κάθε οργανισμός περιλαμβάνει έως ${ORG_SEATS} εγγεγραμμένους μαθητές χωρίς κόστος.`),
                t(`Need more than ${ORG_SEATS} seats? Contact ${CONTACT_EMAIL} and our team will extend your organisation's capacity.`, `Ai nevoie de mai mult de ${ORG_SEATS} locuri? Contactează ${CONTACT_EMAIL} și echipa noastră va extinde capacitatea organizației tale.`, `Χρειάζεστε περισσότερες από ${ORG_SEATS} θέσεις; Επικοινωνήστε στο ${CONTACT_EMAIL} και η ομάδα μας θα επεκτείνει τη χωρητικότητα του οργανισμού σας.`),
              ].map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <a href={`mailto:${CONTACT_EMAIL}?subject=Organisation%20access%20request`}>
              <Button className="font-semibold">
                {t('Apply as an organisation', 'Aplică ca organizație', 'Υποβολή αίτησης ως οργανισμός')} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </a>
          </div>

          {/* Trust strip */}
          <div className="text-center space-y-2 py-4">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> {t('Free for schools', 'Gratuit pentru școli', 'Δωρεάν για σχολεία')}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t('Cancel anytime', 'Anulează oricând', 'Ακύρωση οποτεδήποτε')}</span>
              <span className="flex items-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" /> {t('New courses added regularly', 'Cursuri noi adăugate regulat', 'Νέα μαθήματα προστίθενται τακτικά')}</span>
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {t('Secure payment via Stripe', 'Plată securizată prin Stripe', 'Ασφαλής πληρωμή μέσω Stripe')}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('Every subscription funds free education.', 'Fiecare abonament finanțează educația gratuită.', 'Κάθε συνδρομή χρηματοδοτεί τη δωρεάν εκπαίδευση.')}</p>
          </div>

          {/* How it works */}
          <div className="rounded-xl border bg-card p-6 max-w-3xl mx-auto">
            <h4 className="font-semibold mb-3">{t('How it works', 'Cum funcționează', 'Πώς λειτουργεί')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-0.5">{t('One subscription, everything unlocked', 'Un abonament, totul deblocat', 'Μία συνδρομή, τα πάντα ξεκλειδωμένα')}</p>
                <p className="text-xs text-muted-foreground">{t('All-Access includes the full LLM course, all GenAI products, and every future course.', 'All-Access include cursul LLM complet, toate produsele GenAI și fiecare curs viitor.', 'Το All-Access περιλαμβάνει το πλήρες μάθημα LLM, όλα τα προϊόντα GenAI και κάθε μελλοντικό μάθημα.')}</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">{t('Cancel anytime', 'Anulează oricând', 'Ακύρωση οποτεδήποτε')}</p>
                <p className="text-xs text-muted-foreground">{t('No lock-in. Manage or cancel your subscription whenever you like.', 'Fără angajamente. Gestionează sau anulează-ți abonamentul oricând dorești.', 'Χωρίς δέσμευση. Διαχειριστείτε ή ακυρώστε τη συνδρομή σας όποτε θέλετε.')}</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">{t('Keep your progress', 'Păstrează-ți progresul', 'Κρατήστε την πρόοδό σας')}</p>
                <p className="text-xs text-muted-foreground">{t('Your XP, badges, quiz scores, and completion certificate stay with your account.', 'XP-ul, insignele, scorurile la teste și certificatul de absolvire rămân în contul tău.', 'Οι πόντοι XP, τα σήματα, οι βαθμολογίες κουίζ και το πιστοποιητικό ολοκλήρωσης παραμένουν στον λογαριασμό σας.')}</p>
              </div>
              <div>
                <p className="font-medium mb-0.5">{t('Students & schools', 'Elevi și școli', 'Μαθητές & σχολεία')}</p>
                <p className="text-xs text-muted-foreground">{t('Students get 50% off after verification; accredited organisations get full access free.', 'Elevii primesc 50% reducere după verificare; organizațiile acreditate primesc acces complet gratuit.', 'Οι μαθητές λαμβάνουν 50% έκπτωση μετά την επαλήθευση· οι πιστοποιημένοι οργανισμοί έχουν πλήρη δωρεάν πρόσβαση.')}</p>
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
              {t('Billing History', 'Istoric Facturare', 'Ιστορικό Χρεώσεων')}
            </h3>

            {invoicesLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {t('Loading your billing history...', 'Se încarcă istoricul tău de facturare...', 'Φόρτωση του ιστορικού χρεώσεών σας...')}
              </div>
            ) : invoicesError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500/60 mb-3" />
                <p className="font-medium text-muted-foreground">{invoicesError}</p>
                <Button variant="outline" size="sm" className="mt-4"
                        onClick={() => window.location.reload()}>
                  {t('Try again', 'Încearcă din nou', 'Δοκιμάστε ξανά')}
                </Button>
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground">{t('No invoices yet', 'Încă nicio factură', 'Δεν υπάρχουν τιμολόγια ακόμη')}</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {t('Invoices will appear here once you start a subscription.', 'Facturile vor apărea aici după ce începi un abonament.', 'Τα τιμολόγια θα εμφανιστούν εδώ μόλις ξεκινήσετε μια συνδρομή.')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setActiveTab('courses')}
                >
                  {t('View subscription plans', 'Vezi planurile de abonament', 'Δείτε τα πλάνα συνδρομής')}
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 text-left font-medium">{t('Date', 'Data', 'Ημερομηνία')}</th>
                    <th className="pb-2 text-left font-medium">{t('Description', 'Descriere', 'Περιγραφή')}</th>
                    <th className="pb-2 text-right font-medium">{t('Amount', 'Sumă', 'Ποσό')}</th>
                    <th className="pb-2 text-right font-medium">{t('Status', 'Stare', 'Κατάσταση')}</th>
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
                            {inv.amountRefunded.toFixed(2)} {t('refunded', 'rambursat', 'επιστράφηκε')}
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
                          {inv.refunded ? t('Refunded', 'Rambursat', 'Επιστράφηκε') : inv.status}
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
                              {t('View', 'Vezi', 'Προβολή')} <ExternalLink className="h-3 w-3" />
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
                  {t('Manage billing in Stripe', 'Gestionează facturarea în Stripe', 'Διαχείριση χρεώσεων στο Stripe')}
                </Button>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t('Payment Method', 'Metodă de Plată', 'Μέθοδος Πληρωμής')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('Payments are processed securely via Stripe. No payment details are stored on our servers.', 'Plățile sunt procesate securizat prin Stripe. Niciun detaliu de plată nu este stocat pe serverele noastre.', 'Οι πληρωμές επεξεργάζονται με ασφάλεια μέσω Stripe. Δεν αποθηκεύονται στοιχεία πληρωμής στους διακομιστές μας.')}
            </p>
          </div>
        </div>
      )}

      {/* ── Sign out ── */}
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{t('Sign out', 'Deconectare', 'Αποσύνδεση')}</p>
          <p className="text-xs text-muted-foreground">{t('Sign out of your ADD Academica account', 'Deconectează-te din contul tău ADD Academica', 'Αποσυνδεθείτε από τον λογαριασμό σας ADD Academica')}</p>
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
          {t('Sign Out', 'Deconectare', 'Αποσύνδεση')}
        </Button>
      </div>
    </div>
  );
}
