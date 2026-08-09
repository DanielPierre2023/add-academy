'use client';

import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { getLectureIndex, getLecturesByStage } from '@/lib/lectures';
import { STAGES } from '@/types';
import {
  BookOpen,
  Code2,
  ChevronRight,
  GraduationCap,
  Play,
  Download,
  Terminal,
  Cpu,
  Layers,
  Award,
  Users,
  Globe,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollReveal, StaggerReveal, StaggerItem } from '@/components/motion/scroll-reveal';
import { GlowCard } from '@/components/motion/glow-card';
import { AnimatedCounter } from '@/components/motion/animated-counter';

/* ─── Hero entrance variants ────────────────────── */
const heroTitle = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] as const } },
};
const heroSubtitle = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] as const } },
};
const heroCTA = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.4, type: 'spring' as const, stiffness: 200 } },
};
const codeBlockVariant = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] as const } },
};

/* Animated code lines for the hero code preview */
const CODE_LINES = [
  { indent: 0, color: 'text-pink-400', text: 'class', rest: ' MultiHeadAttention(nn.Module):' },
  { indent: 1, color: 'text-blue-400', text: 'def', rest: ' __init__(self, d_model, n_heads):' },
  { indent: 2, color: 'text-slate-400', text: 'super().__init__()' },
  { indent: 2, color: 'text-green-400', text: 'self.', rest: 'n_heads = n_heads' },
  { indent: 2, color: 'text-green-400', text: 'self.', rest: 'head_dim = d_model // n_heads' },
  { indent: 2, color: 'text-green-400', text: 'self.', rest: 'W_q = nn.Linear(d_model, d_model)' },
  { indent: 2, color: 'text-green-400', text: 'self.', rest: 'W_k = nn.Linear(d_model, d_model)' },
  { indent: 2, color: 'text-green-400', text: 'self.', rest: 'W_v = nn.Linear(d_model, d_model)' },
  { indent: 0, text: '' },
  { indent: 1, color: 'text-blue-400', text: 'def', rest: ' forward(self, x):' },
  { indent: 2, color: 'text-amber-300', text: 'Q', rest: ' = self.W_q(x).view(B, T, H, D)' },
  { indent: 2, color: 'text-amber-300', text: 'K', rest: ' = self.W_k(x).view(B, T, H, D)' },
  { indent: 2, color: 'text-amber-300', text: 'attn', rest: ' = (Q @ K.T) / math.sqrt(D)' },
  { indent: 2, color: 'text-pink-400', text: 'return', rest: ' self.out_proj(attn @ V)' },
];

export default function HomePage() {
  const language = useAcademyStore((s) => s.language);
  const getCompletionPercentage = useAcademyStore((s) => s.getCompletionPercentage);
  const progress = useAcademyStore((s) => s.progress);
  const index = getLectureIndex();
  const completionPct = getCompletionPercentage();
  const hasProgress = Object.keys(progress).length > 0;
  const nextLecture = index.lectures.find((l) => !progress[l.id]?.completed);

  const stats = [
    { value: 49, suffix: '', label: t('home_stats_lectures', language), icon: BookOpen },
    { value: 5, suffix: '', label: 'SaaS Products', icon: Layers },
    { value: 100, suffix: '+', label: t('home_stats_exercises', language), icon: Terminal },
    { value: 3, suffix: '', label: t('home_stats_languages', language), icon: Globe },
  ];

  const features = [
    {
      icon: BookOpen,
      color: 'text-blue-400',
      bg: 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10',
      borderColor: 'border-blue-500/20',
      glowColor: 'rgba(59, 130, 246, 0.25)',
      title: language === 'ro' ? 'Teoria LLM' : language === 'el' ? 'Θεωρία LLM' : 'LLM Theory',
      desc: language === 'ro'
        ? 'Intelege transformerele, mecanismele de atentie, embedding-urile si matematica din spatele modelelor de limbaj moderne.'
        : language === 'el'
          ? 'Κατανοήστε τους transformers, τους μηχανισμούς προσοχής, τα embeddings και τα μαθηματικά πίσω από τα σύγχρονα γλωσσικά μοντέλα.'
          : 'Understand transformers, attention mechanisms, embeddings and the math behind modern language models.',
      highlights: language === 'ro'
        ? ['Transformers', 'Atentie', 'Embeddings']
        : language === 'el'
          ? ['Transformers', 'Προσοχή', 'Embeddings']
          : ['Transformers', 'Attention', 'Embeddings'],
    },
    {
      icon: Code2,
      color: 'text-amber-400',
      bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10',
      borderColor: 'border-amber-500/20',
      glowColor: 'rgba(212, 160, 23, 0.3)',
      title: language === 'ro' ? 'Cod Practic' : language === 'el' ? 'Πρακτικός Κώδικας' : 'Hands-On Code',
      desc: language === 'ro'
        ? 'Construieste fiecare componenta de la zero in Python — tokenizere, straturi de atentie, blocuri transformer si intreaga arhitectura GPT-2.'
        : language === 'el'
          ? 'Κατασκευάστε κάθε component από το μηδέν σε Python — tokenizers, στρώματα προσοχής, transformer blocks και ολόκληρη την αρχιτεκτονική GPT-2.'
          : 'Build every component from scratch in Python — tokenizers, attention layers, transformer blocks and the full GPT-2 architecture.',
      highlights: ['Python', 'GPT-2', 'Tokenizers'],
    },
    {
      icon: Play,
      color: 'text-emerald-400',
      bg: 'bg-gradient-to-br from-emerald-500/20 to-green-500/10',
      borderColor: 'border-emerald-500/20',
      glowColor: 'rgba(16, 185, 129, 0.25)',
      title: language === 'ro' ? 'Antrenare & Implementare' : language === 'el' ? 'Εκπαίδευση & Ανάπτυξη' : 'Training & Deployment',
      desc: language === 'ro'
        ? 'Pre-antreneaza pe seturi de date reale, implementeaza scalarea temperaturii, esantionarea top-k si incarca intreaga arhitectura GPT-2.'
        : language === 'el'
          ? 'Προεκπαιδεύστε σε πραγματικά datasets, υλοποιήστε temperature scaling, top-k sampling και φορτώστε ολόκληρη την αρχιτεκτονική GPT-2.'
          : 'Pretrain on real datasets, implement temperature scaling, top-k sampling and load the full GPT-2 architecture.',
      highlights: language === 'ro'
        ? ['Pre-antrenare', 'Top-k', 'Deployment']
        : language === 'el'
          ? ['Προεκπαίδευση', 'Top-k', 'Deployment']
          : ['Pretraining', 'Top-k', 'Deployment'],
    },
  ];

  const journeySteps = [
    {
      num: '01',
      title: language === 'ro' ? 'Fundamentele' : language === 'el' ? 'Θεμέλια' : 'Foundations',
      desc: language === 'ro' ? 'Intelege cum functioneaza LLM-urile' : language === 'el' ? 'Κατανοήστε πώς λειτουργούν τα LLMs' : 'Understand how LLMs work',
      icon: BookOpen,
    },
    {
      num: '02',
      title: language === 'ro' ? 'Construieste' : language === 'el' ? 'Κατασκευή' : 'Build',
      desc: language === 'ro' ? 'Codeaza GPT-2 de la zero' : language === 'el' ? 'Κωδικοποιήστε GPT-2 από το μηδέν' : 'Code GPT-2 from scratch',
      icon: Code2,
    },
    {
      num: '03',
      title: language === 'ro' ? 'Antreneaza' : language === 'el' ? 'Εκπαίδευση' : 'Train',
      desc: language === 'ro' ? 'Pre-antrenare pe date reale' : language === 'el' ? 'Προεκπαίδευση σε πραγματικά δεδομένα' : 'Pretrain on real data',
      icon: Cpu,
    },
    {
      num: '04',
      title: language === 'ro' ? 'Livreaza' : language === 'el' ? 'Παράδοση' : 'Ship',
      desc: language === 'ro' ? 'Produse SaaS gata de productie' : language === 'el' ? 'Έτοιμα SaaS προϊόντα' : 'Production-ready SaaS products',
      icon: Layers,
    },
  ];

  return (
    <div className="space-y-0 pb-16 -mx-4 -mt-8 sm:-mx-6 lg:-mx-8">
      {/* ══════════════════════════════════════════════
          Hero Section — split layout with code preview
          ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-6 py-20 text-primary-foreground sm:px-12 lg:px-16 lg:py-24">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 animate-gradient-shift bg-[length:200%_200%] bg-gradient-to-br from-[hsl(240_95%_25%)] via-[hsl(250_80%_22%)] to-[hsl(230_90%_18%)]" />

        {/* Mesh gradient overlays */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-secondary/15 to-transparent blur-3xl animate-float-slow" />
          <div className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-gradient-to-tl from-blue-400/10 to-transparent blur-3xl animate-float-slower" />
          <div className="absolute top-1/3 left-1/2 h-64 w-64 rounded-full bg-gradient-to-r from-purple-500/8 to-secondary/5 blur-2xl animate-float-reverse" />
        </div>

        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative mx-auto max-w-6xl">
          <motion.div initial="hidden" animate="visible" className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: Text content */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <motion.div variants={heroTitle}>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-primary-foreground/80 backdrop-blur-sm mb-6">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {language === 'ro' ? 'Cursuri interactive cu Python' : language === 'el' ? 'Διαδραστικά μαθήματα με Python' : 'Interactive courses with live Python'}
                </span>
              </motion.div>

              <motion.h1
                variants={heroTitle}
                className="mb-5 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]"
              >
                {t('home_title', language)}
              </motion.h1>
              <motion.p
                variants={heroSubtitle}
                className="mx-auto mb-8 max-w-xl text-base text-primary-foreground/65 sm:text-lg leading-relaxed lg:mx-0"
              >
                {t('home_subtitle', language)}
              </motion.p>

              {/* CTA buttons */}
              <motion.div variants={heroCTA} className="flex flex-col sm:flex-row items-center gap-3 lg:justify-start justify-center">
                <Link
                  href={nextLecture ? `/lectures/${nextLecture.id}` : '/lectures/1'}
                  className="group relative inline-flex items-center gap-2 rounded-xl bg-secondary px-8 py-3.5 text-base font-bold text-secondary-foreground shadow-lg shadow-secondary/25 transition-all hover:shadow-2xl hover:shadow-secondary/40 hover:scale-[1.03] active:scale-[0.98]"
                >
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative">
                    {hasProgress ? t('course_continue', language) : t('home_start', language)}
                  </span>
                  <ChevronRight className="relative h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/lectures/1"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-primary-foreground/80 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-primary-foreground"
                >
                  {language === 'ro' ? 'Exploreaza cursul' : language === 'el' ? 'Εξερευνήστε' : 'Explore curriculum'}
                </Link>
              </motion.div>
            </div>

            {/* Right: Live code preview */}
            <motion.div variants={codeBlockVariant} className="hidden lg:block">
              <div className="relative rounded-2xl border border-white/10 bg-[hsl(240_30%_12%)]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Window chrome */}
                <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="ml-2 text-[11px] text-white/30 font-mono">attention.py</span>
                  <div className="flex-1" />
                  <Terminal className="h-3.5 w-3.5 text-white/20" />
                </div>

                {/* Code content */}
                <div className="p-5 font-mono text-[13px] leading-6 overflow-hidden">
                  {CODE_LINES.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.06, duration: 0.3 }}
                      style={{ paddingLeft: `${line.indent * 24}px` }}
                      className="whitespace-pre"
                    >
                      {line.text === '' ? (
                        <span>&nbsp;</span>
                      ) : (
                        <>
                          <span className={line.color}>{line.text}</span>
                          {line.rest && <span className="text-slate-300">{line.rest}</span>}
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Glow accent */}
                <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />
              </div>
            </motion.div>
          </motion.div>

          {/* Stats row — glassmorphism cards */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.7 } },
            }}
            className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                }}
                className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center"
              >
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-secondary/80" />
                <div className="text-2xl font-bold text-secondary tabular-nums sm:text-3xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="mt-1 text-[11px] text-primary-foreground/50 uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          Trusted By / Social Proof strip
          ══════════════════════════════════════════════ */}
      <ScrollReveal>
        <div className="border-y border-border/50 bg-muted/30 px-6 py-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60 mb-4">
            {language === 'ro' ? 'Construit de' : language === 'el' ? 'Κατασκευασμένο από' : 'Built by'}
          </p>
          <div className="flex items-center justify-center gap-8 opacity-60">
            <span className="font-heading text-lg font-bold text-foreground/70">ADD Individual Solutions</span>
            <span className="hidden sm:inline text-muted-foreground/40">|</span>
            <span className="hidden sm:inline text-sm text-muted-foreground/50">
              {language === 'ro' ? 'Consultanti AI din Transilvania' : language === 'el' ? 'Σύμβουλοι AI από την Τρανσυλβανία' : 'AI Consultants from Transylvania'}
            </span>
          </div>
        </div>
      </ScrollReveal>

      {/* ══════════════════════════════════════════════
          What You'll Learn — premium feature cards
          ══════════════════════════════════════════════ */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">
              {language === 'ro' ? 'Curriculum' : language === 'el' ? 'Πρόγραμμα Σπουδών' : 'Curriculum'}
            </p>
            <h2 className="text-3xl font-bold font-heading sm:text-4xl">
              {language === 'ro' ? 'Ce Vei Invata' : language === 'el' ? 'Τι Θα Μάθετε' : "What You'll Learn"}
            </h2>
          </div>
        </ScrollReveal>
        <StaggerReveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto" stagger={0.15}>
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <GlowCard glowColor={feature.glowColor}>
                <div className="p-6">
                  <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-xl border', feature.bg, feature.borderColor)}>
                    <feature.icon className={cn('h-6 w-6', feature.color)} />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{feature.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {feature.highlights.map((h) => (
                      <span key={h} className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </section>

      {/* ══════════════════════════════════════════════
          Learning Journey — horizontal step flow
          ══════════════════════════════════════════════ */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />

        <div className="relative max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-14">
              <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">
                {language === 'ro' ? 'Parcursul tau' : language === 'el' ? 'Η πορεία σας' : 'Your journey'}
              </p>
              <h2 className="text-3xl font-bold font-heading sm:text-4xl">
                {language === 'ro' ? 'De la Teorie la Productie' : language === 'el' ? 'Από τη Θεωρία στην Παραγωγή' : 'From Theory to Production'}
              </h2>
            </div>
          </ScrollReveal>

          <StaggerReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.12}>
            {journeySteps.map((step, i) => (
              <StaggerItem key={step.num}>
                <div className="relative group">
                  {/* Connector line */}
                  {i < journeySteps.length - 1 && (
                    <div className="absolute top-10 right-0 w-4 h-px bg-gradient-to-r from-secondary/40 to-transparent hidden lg:block translate-x-full z-10" />
                  )}
                  <div className="rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-secondary/30 hover:shadow-lg hover:shadow-secondary/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/20">
                        <step.icon className="h-5 w-5 text-secondary" />
                      </div>
                      <span className="text-3xl font-bold text-secondary/20 font-heading">{step.num}</span>
                    </div>
                    <h3 className="text-base font-bold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          Download Threshold Note — premium banner
          ══════════════════════════════════════════════ */}
      <ScrollReveal className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-secondary/20 bg-gradient-to-r from-secondary/5 via-secondary/10 to-secondary/5 p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/20 border border-secondary/30">
              <Download className="h-6 w-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-foreground mb-1">
                {language === 'ro'
                  ? 'Descarca produse gata de deployment'
                  : language === 'el'
                    ? 'Κατεβάστε έτοιμα προϊόντα ανάπτυξης'
                    : 'Download deployment-ready products'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {language === 'ro'
                  ? 'Finalizeaza cel putin 80% dintr-un curs pentru a debloca NeuralForge LLM sau produsele GenAI SaaS ca ZIP-uri gata de deployment.'
                  : language === 'el'
                    ? 'Ολοκληρώστε τουλάχιστον 80% ενός μαθήματος για να ξεκλειδώσετε το NeuralForge LLM ή τα GenAI SaaS ως ZIP αρχεία έτοιμα για ανάπτυξη.'
                    : 'Complete at least 80% of a course to unlock the NeuralForge LLM or GenAI SaaS products as deployment-ready ZIP downloads.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-secondary font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  NeuralForge LLM
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-secondary font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  5 GenAI SaaS
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-secondary font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {language === 'ro' ? 'Certificate' : language === 'el' ? 'Πιστοποιητικά' : 'Certificates'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ══════════════════════════════════════════════
          Continue Learning (if user has progress)
          ══════════════════════════════════════════════ */}
      {hasProgress && (
        <ScrollReveal className="px-4 sm:px-6 lg:px-8 pt-12">
          <div className="mx-auto max-w-5xl rounded-2xl border border-secondary/20 bg-gradient-to-r from-secondary/5 to-primary/5 p-6 sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-bold font-heading">
                  {t('course_continue', language)}
                </h3>
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {Math.round(completionPct)}% {t('course_completed', language)}
                  </span>
                </div>
                <Progress value={completionPct} className="h-2.5 w-full max-w-md" />
              </div>
              {nextLecture && (
                <Link href={`/lectures/${nextLecture.id}`} className={cn(buttonVariants(), 'gap-2 shadow-lg')}>
                  {t('course_continue', language)}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ══════════════════════════════════════════════
          Course Map Overview — premium stage cards
          ══════════════════════════════════════════════ */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-5xl mx-auto mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 border border-secondary/20">
                <GraduationCap className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-heading">{t('course_map', language)}</h2>
                <p className="text-sm text-muted-foreground">
                  {language === 'ro' ? 'Toate etapele cursului' : language === 'el' ? 'Όλα τα στάδια' : 'All course stages'}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
        <StaggerReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto" stagger={0.06}>
          {STAGES.map((stage) => {
            const stageLectures = getLecturesByStage(stage.number);
            const completedCount = stageLectures.filter(
              (l) => progress[l.id]?.completed
            ).length;
            const firstLecture = stageLectures[0];
            const pct = stageLectures.length > 0 ? (completedCount / stageLectures.length) * 100 : 0;

            return (
              <StaggerItem key={stage.number}>
                <Link
                  href={firstLecture ? `/lectures/${firstLecture.id}` : '#'}
                  className="group block"
                >
                  <GlowCard glowColor={`${stage.color}40`}>
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg border transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: `${stage.color}15`,
                            borderColor: `${stage.color}30`,
                          }}
                        >
                          {stage.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold truncate">
                            {stage.name[language]}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {t('course_stage', language)} {stage.number} · {stageLectures.length} {t('course_lecture', language)}s
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-foreground group-hover:translate-x-0.5" />
                      </div>
                      {completedCount > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {completedCount}/{stageLectures.length}
                            </span>
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {Math.round(pct)}%
                            </Badge>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      ) : (
                        <div className="h-1.5 rounded-full bg-muted/50" />
                      )}
                    </div>
                  </GlowCard>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerReveal>
      </section>

      {/* ══════════════════════════════════════════════
          Bottom CTA
          ══════════════════════════════════════════════ */}
      <ScrollReveal className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary via-[hsl(245_80%_28%)] to-[hsl(235_85%_22%)] p-10 text-center text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="relative">
            <Award className="mx-auto h-10 w-10 text-secondary mb-4" />
            <h2 className="text-2xl font-bold font-heading mb-3 sm:text-3xl">
              {language === 'ro' ? 'Incepe sa construiesti astazi' : language === 'el' ? 'Ξεκινήστε σήμερα' : 'Start building today'}
            </h2>
            <p className="text-primary-foreground/60 mb-6 max-w-lg mx-auto">
              {language === 'ro'
                ? 'Etapele 0 si 1 sunt gratuite. Nici macar cont nu ai nevoie.'
                : language === 'el'
                  ? 'Τα Στάδια 0 & 1 είναι δωρεάν. Δεν χρειάζεται λογαριασμός.'
                  : 'Stages 0 & 1 are free forever. No account required.'}
            </p>
            <Link
              href={nextLecture ? `/lectures/${nextLecture.id}` : '/lectures/1'}
              className="group inline-flex items-center gap-2 rounded-xl bg-secondary px-8 py-3.5 text-base font-bold text-secondary-foreground shadow-lg shadow-secondary/25 transition-all hover:shadow-2xl hover:shadow-secondary/40 hover:scale-[1.03] active:scale-[0.98]"
            >
              {hasProgress ? t('course_continue', language) : t('home_start', language)}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
