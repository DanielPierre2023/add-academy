'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Crown, ArrowRight, Sparkles, Shield, GraduationCap, Building2, HeartHandshake } from 'lucide-react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { PageTransition } from '@/components/motion/page-transition';
import { useAuth } from '@/lib/auth/auth-context';
import { SUBSCRIPTION_PLANS, type PricingPlan } from '@/lib/subscriptions/plans';
import { cn } from '@/lib/utils';

const ORG_CONTACT_EMAIL = 'contact@add-individual-solutions.com';
const ORG_SEAT_CAP = 20;

const cardFade = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
} as const;

/* Everything included in All-Access (shown on each plan card) */
const ALL_ACCESS_FEATURES: Record<string, string[]> = {
  en: [
    'Full LLM course — build a large language model from scratch',
    'All 5 GenAI SaaS tools (PixelForge, ClipCraft, ProseAI, TruthLens, DocMind)',
    'Every future course, added automatically',
    'Deployable project downloads & certificates',
    'Cancel anytime',
  ],
  ro: [
    'Curs LLM complet — construiește un model lingvistic de la zero',
    'Toate cele 5 unelte GenAI SaaS (PixelForge, ClipCraft, ProseAI, TruthLens, DocMind)',
    'Fiecare curs viitor, adăugat automat',
    'Descărcări de proiecte & certificate',
    'Anulează oricând',
  ],
  el: [
    'Πλήρες μάθημα LLM — φτιάξε ένα γλωσσικό μοντέλο από την αρχή',
    'Και τα 5 εργαλεία GenAI SaaS (PixelForge, ClipCraft, ProseAI, TruthLens, DocMind)',
    'Κάθε μελλοντικό μάθημα, αυτόματα',
    'Λήψεις έργων & πιστοποιητικά',
    'Ακύρωση οποτεδήποτε',
  ],
  de: [
    'Vollständiger LLM-Kurs — baue ein großes Sprachmodell von Grund auf',
    'Alle 5 GenAI-SaaS-Tools (PixelForge, ClipCraft, ProseAI, TruthLens, DocMind)',
    'Jeder zukünftige Kurs, automatisch hinzugefügt',
    'Herunterladbare Projekte & Zertifikate',
    'Jederzeit kündbar',
  ],
  fr: [
    'Cours LLM complet — créez un grand modèle de langage à partir de zéro',
    'Les 5 outils GenAI SaaS inclus (PixelForge, ClipCraft, ProseAI, TruthLens, DocMind)',
    'Chaque futur cours, ajouté automatiquement',
    'Téléchargements de projets déployables & certificats',
    'Annulez à tout moment',
  ],
  it: [
    'Corso LLM completo — costruisci un modello linguistico di grandi dimensioni da zero',
    'Tutti i 5 strumenti GenAI SaaS inclusi (PixelForge, ClipCraft, ProseAI, TruthLens, DocMind)',
    'Ogni corso futuro, aggiunto automaticamente',
    'Download di progetti distribuibili e certificati',
    'Annulla in qualsiasi momento',
  ],
  ar: [
    'دورة نماذج اللغة الكبيرة كاملة — ابنِ نموذج لغة كبير من الصفر',
    'جميع أدوات GenAI SaaS الخمس (PixelForge وClipCraft وProseAI وTruthLens وDocMind)',
    'كل دورة مستقبلية تُضاف تلقائيًا',
    'تنزيلات مشاريع قابلة للنشر وشهادات',
    'إلغاء الاشتراك في أي وقت',
  ],
};

function tt(
  language: string,
  en: string,
  ro: string,
  el: string,
  de: string,
  fr: string,
  it: string,
  ar: string
): string {
  return language === 'ro'
    ? ro
    : language === 'el'
      ? el
      : language === 'de'
        ? de
        : language === 'fr'
          ? fr
          : language === 'it'
            ? it
            : language === 'ar'
              ? ar
              : en;
}

function PlanCard({
  plan,
  language,
  onSelect,
  isCurrentPlan,
  index,
  busy,
}: {
  plan: PricingPlan;
  language: string;
  onSelect: (plan: PricingPlan) => void;
  isCurrentPlan: boolean;
  index: number;
  busy: boolean;
}) {
  const name = plan.name[language] || plan.name.en;
  const desc = plan.description[language] || plan.description.en;
  const badge = plan.badge?.[language] || plan.badge?.en;
  const per = plan.interval === 'year'
    ? tt(language, '/ year', '/ an', '/ έτος', '/ Jahr', '/ an', '/ anno', '/ سنة')
    : tt(language, '/ month', '/ lună', '/ μήνα', '/ Monat', '/ mois', '/ mese', '/ شهر');
  const features = ALL_ACCESS_FEATURES[language] || ALL_ACCESS_FEATURES.en;

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardFade}
      className={cn(
        'group relative flex flex-col rounded-2xl border p-6 transition-all duration-300',
        plan.popular
          ? 'border-secondary/40 bg-gradient-to-b from-secondary/5 via-card to-card shadow-xl shadow-secondary/10 ring-1 ring-secondary/20 hover:shadow-2xl hover:shadow-secondary/15'
          : 'border-border bg-card hover:shadow-lg hover:border-primary/20',
        isCurrentPlan && 'ring-2 ring-green-500/40'
      )}
    >
      {plan.popular && (
        <div className="absolute -top-px -left-px -right-px h-20 rounded-t-2xl bg-gradient-to-b from-secondary/10 to-transparent pointer-events-none" />
      )}

      {badge && (
        <span className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-secondary to-secondary/90 px-3.5 py-1 text-xs font-bold text-secondary-foreground shadow-lg shadow-secondary/25">
          <Sparkles className="h-3 w-3" />
          {badge}
        </span>
      )}
      {isCurrentPlan && (
        <span className="absolute -top-3 right-6 z-10 rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-md">
          {tt(language, 'Active', 'Activ', 'Ενεργό', 'Aktiv', 'Actif', 'Attivo', 'نشط')}
        </span>
      )}

      <h3 className="relative font-heading text-lg font-bold text-foreground">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>

      <div className="mt-5 flex items-baseline gap-1.5">
        {plan.originalPrice && (
          <span className="text-lg text-muted-foreground/60 line-through">&euro;{plan.originalPrice}</span>
        )}
        <span className="text-4xl font-bold tracking-tight text-foreground">&euro;{plan.price}</span>
        <span className="text-sm text-muted-foreground">{per}</span>
      </div>

      <div className="mt-5 h-px bg-border" />

      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-green-500/10">
              <Check className="h-3 w-3 text-green-500" />
            </div>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan || busy}
        className={cn(
          'mt-6 w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300',
          plan.popular
            ? 'bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30'
            : 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25',
          (isCurrentPlan || busy) && 'cursor-default opacity-50 shadow-none'
        )}
      >
        {isCurrentPlan
          ? tt(language, 'Current plan', 'Plan activ', 'Ενεργό πλάνο', 'Aktueller Plan', 'Offre actuelle', 'Piano attuale', 'الخطة الحالية')
          : busy
            ? tt(language, 'Redirecting…', 'Se redirecționează…', 'Ανακατεύθυνση…', 'Weiterleitung…', 'Redirection…', 'Reindirizzamento…', 'جارٍ إعادة التوجيه…')
            : tt(language, 'Subscribe', 'Abonează-te', 'Εγγραφή', 'Abonnieren', 'S’abonner', 'Iscriviti', 'اشترك')}
      </button>
    </motion.div>
  );
}

/* Competitor comparison rows */
const COMPARISON: { label: Record<string, string>; add: string; others: Record<string, string> }[] = [
  {
    label: {
      en: 'Build a real LLM from scratch',
      ro: 'Construiește un LLM real de la zero',
      el: 'Φτιάξε ένα πραγματικό LLM από την αρχή',
      de: 'Baue ein echtes LLM von Grund auf',
      fr: 'Construisez un vrai LLM à partir de zéro',
      it: 'Costruisci un vero LLM da zero',
      ar: 'ابنِ نموذج لغة كبير حقيقي من الصفر',
    },
    add: 'yes',
    others: { en: 'Rarely', ro: 'Rar', el: 'Σπάνια', de: 'Selten', fr: 'Rarement', it: 'Raramente', ar: 'نادرًا' },
  },
  {
    label: {
      en: '5 GenAI SaaS tools included',
      ro: '5 unelte GenAI SaaS incluse',
      el: '5 εργαλεία GenAI SaaS',
      de: '5 GenAI-SaaS-Tools inklusive',
      fr: '5 outils GenAI SaaS inclus',
      it: '5 strumenti GenAI SaaS inclusi',
      ar: '5 أدوات GenAI SaaS مضمّنة',
    },
    add: 'yes',
    others: { en: 'No', ro: 'Nu', el: 'Όχι', de: 'Nein', fr: 'Non', it: 'No', ar: 'لا' },
  },
  {
    label: {
      en: 'All future courses included',
      ro: 'Toate cursurile viitoare incluse',
      el: 'Όλα τα μελλοντικά μαθήματα',
      de: 'Alle zukünftigen Kurse inklusive',
      fr: 'Tous les futurs cours inclus',
      it: 'Tutti i corsi futuri inclusi',
      ar: 'جميع الدورات المستقبلية مضمّنة',
    },
    add: 'yes',
    others: {
      en: 'Pay per course',
      ro: 'Plată per curs',
      el: 'Πληρωμή ανά μάθημα',
      de: 'Bezahlung pro Kurs',
      fr: 'Paiement par cours',
      it: 'Pagamento per corso',
      ar: 'الدفع لكل دورة',
    },
  },
  {
    label: {
      en: 'Free for schools & organisations',
      ro: 'Gratuit pentru școli & organizații',
      el: 'Δωρεάν για σχολεία & οργανισμούς',
      de: 'Kostenlos für Schulen & Organisationen',
      fr: 'Gratuit pour les écoles et organisations',
      it: 'Gratuito per scuole e organizzazioni',
      ar: 'مجاني للمدارس والمؤسسات',
    },
    add: 'yes',
    others: { en: 'No', ro: 'Nu', el: 'Όχι', de: 'Nein', fr: 'Non', it: 'No', ar: 'لا' },
  },
  {
    label: {
      en: 'Typical price',
      ro: 'Preț tipic',
      el: 'Τυπική τιμή',
      de: 'Typischer Preis',
      fr: 'Prix habituel',
      it: 'Prezzo tipico',
      ar: 'السعر المعتاد',
    },
    add: 'from €12/mo',
    others: {
      en: '€40–200+',
      ro: '€40–200+',
      el: '€40–200+',
      de: '€40–200+',
      fr: '€40–200+',
      it: '€40–200+',
      ar: '€40–200+',
    },
  },
];

export default function PricingView() {
  const language = useAcademyStore((s) => s.language);
  const { user, isOrgUser, effectiveTier } = useAuth();
  const [interval, setInterval] = useState<'month' | 'year'>('year');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelect = async (plan: PricingPlan) => {
    if (!user) {
      window.location.href = `/login?redirect=/pricing`;
      return;
    }
    setSelectedPlan(plan.id);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.warn('Checkout API not configured:', data);
        setSelectedPlan(null);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setSelectedPlan(null);
    }
  };

  if (isOrgUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-secondary/20 blur-3xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 text-secondary-foreground shadow-xl">
            <Crown className="h-10 w-10" />
          </div>
        </div>
        <h1 className="mt-6 font-heading text-2xl font-bold text-foreground">
          {tt(
            language,
            'Full Organization Access',
            'Acces organizațional complet',
            'Πλήρης πρόσβαση οργανισμού',
            'Vollständiger Organisationszugang',
            'Accès complet à l’organisation',
            'Accesso completo all’organizzazione',
            'وصول كامل للمؤسسة'
          )}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          {tt(
            language,
            'Your organization account includes full access to all content — no subscription needed.',
            'Contul tău de organizație include acces complet la tot conținutul. Nu este necesar un abonament.',
            'Ο λογαριασμός οργανισμού σας περιλαμβάνει πλήρη πρόσβαση. Δεν χρειάζεται συνδρομή.',
            'Ihr Organisationskonto beinhaltet vollen Zugang zu allen Inhalten — kein Abonnement erforderlich.',
            'Votre compte d’organisation inclut un accès complet à tout le contenu — aucun abonnement requis.',
            'Il tuo account organizzazione include l’accesso completo a tutti i contenuti — nessun abbonamento richiesto.',
            'يتضمن حساب مؤسستك وصولاً كاملاً إلى كل المحتوى — دون الحاجة إلى اشتراك.'
          )}
        </p>
      </div>
    );
  }

  const visiblePlans = SUBSCRIPTION_PLANS.filter((p) => p.interval === interval);

  return (
    <PageTransition>
      <div className="py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
            {tt(
              language,
              'Bootcamp depth. Streaming-service price.',
              'Profunzime de bootcamp. Preț de streaming.',
              'Βάθος bootcamp. Τιμή streaming.',
              'Bootcamp-Tiefe. Streaming-Preis.',
              'La profondeur d’un bootcamp. Le prix d’un abonnement streaming.',
              'La profondità di un bootcamp. Il prezzo di uno streaming.',
              'عمق معسكر تدريبي. بسعر خدمة بث.'
            )}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
            {tt(
              language,
              'One subscription unlocks everything. Stages 0 & 1 are free forever — no account needed.',
              'Un singur abonament deblochează totul. Etapele 0 și 1 sunt gratuite pentru totdeauna — fără cont.',
              'Μία συνδρομή ξεκλειδώνει τα πάντα. Τα Στάδια 0 & 1 είναι δωρεάν για πάντα — χωρίς λογαριασμό.',
              'Ein Abonnement schaltet alles frei. Stufe 0 & 1 sind für immer kostenlos — kein Konto erforderlich.',
              'Un seul abonnement débloque tout. Les étapes 0 et 1 sont gratuites pour toujours — aucun compte requis.',
              'Un solo abbonamento sblocca tutto. Le fasi 0 e 1 sono gratuite per sempre — nessun account richiesto.',
              'اشتراك واحد يفتح كل شيء. المرحلتان 0 و1 مجانيتان إلى الأبد — دون الحاجة إلى حساب.'
            )}
          </p>

          {/* Billing interval toggle */}
          <div className="mt-6 inline-flex items-center rounded-xl border border-border bg-muted p-1">
            <button
              onClick={() => setInterval('month')}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-semibold transition-all',
                interval === 'month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {tt(language, 'Monthly', 'Lunar', 'Μηνιαία', 'Monatlich', 'Mensuel', 'Mensile', 'شهري')}
            </button>
            <button
              onClick={() => setInterval('year')}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-semibold transition-all',
                interval === 'year' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {tt(language, 'Annual', 'Anual', 'Ετήσια', 'Jährlich', 'Annuel', 'Annuale', 'سنوي')}
              <span className="ml-1.5 rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-bold text-secondary">
                {tt(language, '2 months free', '2 luni gratis', '2 μήνες δωρεάν', '2 Monate gratis', '2 mois offerts', '2 mesi gratis', 'شهران مجانًا')}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Plan cards */}
        <div className="mx-auto grid max-w-md gap-6">
          {visiblePlans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              language={language}
              onSelect={handleSelect}
              index={i}
              busy={selectedPlan === plan.id}
              isCurrentPlan={effectiveTier === 'full_access'}
            />
          ))}
        </div>

        {/* Student discount note */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              {tt(
                language,
                'Students save 50%',
                'Studenții economisesc 50%',
                'Οι φοιτητές γλιτώνουν 50%',
                'Studierende sparen 50%',
                'Les étudiants économisent 50%',
                'Gli studenti risparmiano il 50%',
                'يوفر الطلاب 50%'
              )}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {tt(
                language,
                `Subscribe to All-Access, then send proof of enrolment to ${ORG_CONTACT_EMAIL} and we apply a 50% discount to your subscription.`,
                `Abonează-te la All-Access, apoi trimite dovada înscrierii la ${ORG_CONTACT_EMAIL} și aplicăm o reducere de 50%.`,
                `Εγγραφείτε στο All-Access και στείλτε αποδεικτικό φοίτησης στο ${ORG_CONTACT_EMAIL} για έκπτωση 50%.`,
                `Abonniere All-Access und sende anschließend einen Immatrikulationsnachweis an ${ORG_CONTACT_EMAIL} — wir gewähren dir dann 50% Rabatt auf dein Abonnement.`,
                `Abonnez-vous à All-Access, puis envoyez un justificatif d’inscription à ${ORG_CONTACT_EMAIL} et nous appliquons une remise de 50% sur votre abonnement.`,
                `Abbonati ad All-Access, poi invia una prova di iscrizione a ${ORG_CONTACT_EMAIL} e applicheremo uno sconto del 50% al tuo abbonamento.`,
                `اشترك في All-Access، ثم أرسل إثبات القيد الدراسي إلى ${ORG_CONTACT_EMAIL} وسنطبّق خصمًا بنسبة 50% على اشتراكك.`
              )}
            </p>
          </div>
        </motion.div>

        {/* Free for organisations */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 relative overflow-hidden rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/5 via-card to-card p-8"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/15">
              <Building2 className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-foreground">
                {tt(
                  language,
                  'Free for schools & organisations',
                  'Gratuit pentru școli & organizații',
                  'Δωρεάν για σχολεία & οργανισμούς',
                  'Kostenlos für Schulen & Organisationen',
                  'Gratuit pour les écoles et organisations',
                  'Gratuito per scuole e organizzazioni',
                  'مجاني للمدارس والمؤسسات'
                )}
              </h3>
              <p className="mt-2 text-muted-foreground max-w-2xl">
                {tt(
                  language,
                  `Schools and organisations get full access at no cost. Sign up as an Organisation — the registrant becomes the Org Admin, members log in with a valid organisation email, and the Org Admin receives an invitation code. Each organisation includes up to ${ORG_SEAT_CAP} learners.`,
                  `Școlile și organizațiile primesc acces complet gratuit. Înscrie-te ca Organizație — cel care se înregistrează devine Admin, membrii se conectează cu un email valid al organizației, iar Adminul primește un cod de invitație. Fiecare organizație include până la ${ORG_SEAT_CAP} cursanți.`,
                  `Σχολεία και οργανισμοί έχουν πλήρη πρόσβαση δωρεάν. Εγγραφείτε ως Οργανισμός — ο εγγράφων γίνεται Διαχειριστής, τα μέλη συνδέονται με έγκυρο email οργανισμού και ο Διαχειριστής λαμβάνει κωδικό πρόσκλησης. Κάθε οργανισμός περιλαμβάνει έως ${ORG_SEAT_CAP} μαθητές.`,
                  `Schulen und Organisationen erhalten kostenlosen Vollzugang. Registriere dich als Organisation — die registrierende Person wird zum Org-Administrator, Mitglieder melden sich mit einer gültigen Organisations-E-Mail an, und der Org-Administrator erhält einen Einladungscode. Jede Organisation umfasst bis zu ${ORG_SEAT_CAP} Lernende.`,
                  `Les écoles et organisations bénéficient d’un accès complet gratuit. Inscrivez-vous en tant qu’Organisation — la personne qui s’inscrit devient Administrateur de l’organisation, les membres se connectent avec une adresse e-mail d’organisation valide, et l’Administrateur reçoit un code d’invitation. Chaque organisation comprend jusqu’à ${ORG_SEAT_CAP} apprenants.`,
                  `Scuole e organizzazioni ottengono accesso completo gratuito. Iscriviti come Organizzazione — chi si registra diventa l’Amministratore dell’organizzazione, i membri accedono con un’email aziendale valida e l’Amministratore riceve un codice di invito. Ogni organizzazione include fino a ${ORG_SEAT_CAP} studenti.`,
                  `تحصل المدارس والمؤسسات على وصول كامل مجانًا. سجّل كمؤسسة — يصبح المسجِّل مسؤول المؤسسة، ويسجّل الأعضاء الدخول ببريد إلكتروني صالح للمؤسسة، ويحصل مسؤول المؤسسة على رمز دعوة. تشمل كل مؤسسة حتى ${ORG_SEAT_CAP} متعلمًا.`
                )}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {tt(
                  language,
                  `Need more than ${ORG_SEAT_CAP} seats? Request an extension at `,
                  `Ai nevoie de mai mult de ${ORG_SEAT_CAP} locuri? Cere o extindere la `,
                  `Χρειάζεστε πάνω από ${ORG_SEAT_CAP} θέσεις; Ζητήστε επέκταση στο `,
                  `Mehr als ${ORG_SEAT_CAP} Plätze benötigt? Fordere eine Erweiterung an unter `,
                  `Besoin de plus de ${ORG_SEAT_CAP} places ? Demandez une extension à `,
                  `Ti servono più di ${ORG_SEAT_CAP} posti? Richiedi un’estensione a `,
                  `هل تحتاج إلى أكثر من ${ORG_SEAT_CAP} مقعدًا؟ اطلب توسيعًا عبر `
                )}
                <a href={`mailto:${ORG_CONTACT_EMAIL}`} className="font-semibold text-secondary hover:underline">
                  {ORG_CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Mission / fund */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex items-start gap-4 rounded-2xl border border-border bg-card p-8"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <HeartHandshake className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              {tt(
                language,
                'Your subscription builds the next free course',
                'Abonamentul tău construiește următorul curs gratuit',
                'Η συνδρομή σας χτίζει το επόμενο δωρεάν μάθημα',
                'Dein Abonnement finanziert den nächsten kostenlosen Kurs',
                'Votre abonnement finance le prochain cours gratuit',
                'Il tuo abbonamento finanzia il prossimo corso gratuito',
                'اشتراكك يمول الدورة المجانية القادمة'
              )}
            </h3>
            <p className="mt-2 text-muted-foreground max-w-2xl">
              {tt(
                language,
                'Subscription earnings go into a fund that develops new AI courses and keeps access free for schools and organisations. When you subscribe, you help make world-class AI education accessible to everyone.',
                'Veniturile din abonamente merg într-un fond care dezvoltă noi cursuri AI și menține accesul gratuit pentru școli și organizații. Abonându-te, ajuți educația AI de top să fie accesibilă tuturor.',
                'Τα έσοδα από συνδρομές πηγαίνουν σε ταμείο που αναπτύσσει νέα μαθήματα AI και κρατά την πρόσβαση δωρεάν για σχολεία και οργανισμούς. Με τη συνδρομή σας, κάνετε την εκπαίδευση AI προσβάσιμη σε όλους.',
                'Die Einnahmen aus Abonnements fließen in einen Fonds, der neue KI-Kurse entwickelt und den Zugang für Schulen und Organisationen kostenlos hält. Mit deinem Abonnement machst du erstklassige KI-Bildung für alle zugänglich.',
                'Les revenus des abonnements alimentent un fonds qui développe de nouveaux cours d’IA et maintient l’accès gratuit pour les écoles et organisations. En vous abonnant, vous contribuez à rendre une éducation en IA de classe mondiale accessible à tous.',
                'I ricavi degli abbonamenti confluiscono in un fondo che sviluppa nuovi corsi di IA e mantiene l’accesso gratuito per scuole e organizzazioni. Abbonandoti, contribuisci a rendere accessibile a tutti un’istruzione sull’IA di livello mondiale.',
                'تذهب عائدات الاشتراكات إلى صندوق يطوّر دورات ذكاء اصطناعي جديدة ويُبقي الوصول مجانيًا للمدارس والمؤسسات. باشتراكك، تساهم في إتاحة تعليم عالمي المستوى في الذكاء الاصطناعي للجميع.'
              )}
            </p>
          </div>
        </motion.div>

        {/* Competitor comparison */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-8 overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="border-b border-border p-6">
            <h3 className="font-heading text-xl font-bold text-foreground">
              {tt(
                language,
                'How we compare',
                'Cum ne comparăm',
                'Πώς συγκρινόμαστε',
                'Wie wir uns vergleichen',
                'Comment nous nous comparons',
                'Come ci confrontiamo',
                'كيف نقارن'
              )}
            </h3>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-3 gap-2 px-6 py-3 text-sm font-semibold text-muted-foreground">
              <span />
              <span className="text-center text-primary">ADD Academica</span>
              <span className="text-center">{tt(language, 'Others', 'Alții', 'Άλλοι', 'Andere', 'Autres', 'Altri', 'الآخرون')}</span>
            </div>
            {COMPARISON.map((row) => (
              <div key={row.label.en} className="grid grid-cols-3 items-center gap-2 px-6 py-3 text-sm">
                <span className="text-foreground">{row.label[language] || row.label.en}</span>
                <span className="text-center font-medium text-foreground">
                  {row.add === 'yes' ? (
                    <Check className="mx-auto h-4 w-4 text-green-500" />
                  ) : (
                    row.add
                  )}
                </span>
                <span className="text-center text-muted-foreground">{row.others[language] || row.others.en}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Free forever tier */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-8 text-center"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-32 w-64 bg-primary/5 blur-3xl rounded-full" />
          <div className="relative">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-heading text-xl font-bold text-foreground">
              {tt(
                language,
                'Free forever',
                'Gratuit pentru totdeauna',
                'Δωρεάν για πάντα',
                'Für immer kostenlos',
                'Gratuit pour toujours',
                'Gratuito per sempre',
                'مجاني إلى الأبد'
              )}
            </h3>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              {tt(
                language,
                'Stage 0 (Getting Started) and Stage 1 (LLM Fundamentals) — free, no account required.',
                'Etapa 0 (Introducere) și Etapa 1 (Fundamentele LLM) — gratuite, fără cont necesar.',
                'Στάδιο 0 (Εισαγωγή) και Στάδιο 1 (Θεμέλια LLM) — δωρεάν, χωρίς λογαριασμό.',
                'Stufe 0 (Erste Schritte) und Stufe 1 (LLM-Grundlagen) — kostenlos, kein Konto erforderlich.',
                'Étape 0 (Prise en main) et étape 1 (Fondamentaux des LLM) — gratuites, sans compte requis.',
                'Fase 0 (Per iniziare) e Fase 1 (Fondamenti degli LLM) — gratuite, nessun account richiesto.',
                'المرحلة 0 (البدء) والمرحلة 1 (أساسيات نماذج اللغة الكبيرة) — مجانية، دون الحاجة إلى حساب.'
              )}
            </p>
            <Link
              href="/lectures/0"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg"
            >
              {tt(language, 'Start free', 'Începe gratuit', 'Ξεκίνα δωρεάν', 'Kostenlos starten', 'Commencer gratuitement', 'Inizia gratis', 'ابدأ مجانًا')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
