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

export default function HomePage() {
  const language = useAcademyStore((s) => s.language);
  const getCompletionPercentage = useAcademyStore((s) => s.getCompletionPercentage);
  const progress = useAcademyStore((s) => s.progress);
  const index = getLectureIndex();
  const completionPct = getCompletionPercentage();
  const hasProgress = Object.keys(progress).length > 0;
  const nextLecture = index.lectures.find((l) => !progress[l.id]?.completed);

  const stats = [
    { value: 49, suffix: '', label: t('home_stats_lectures', language) },
    { value: 5, suffix: '', label: 'SaaS Products' },
    { value: 100, suffix: '+', label: t('home_stats_exercises', language) },
    { value: 3, suffix: '', label: t('home_stats_languages', language) },
  ];

  const features = [
    {
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-primary/10',
      glowColor: 'rgba(5, 4, 173, 0.25)',
      title: language === 'ro' ? 'Teoria LLM' : language === 'el' ? 'Θεωρία LLM' : 'LLM Theory',
      desc: language === 'ro'
        ? 'Înțelege transformerele, mecanismele de atenție, embedding-urile și matematica din spatele modelelor de limbaj moderne.'
        : language === 'el'
          ? 'Κατανοήστε τους transformers, τους μηχανισμούς προσοχής, τα embeddings και τα μαθηματικά πίσω από τα σύγχρονα γλωσσικά μοντέλα.'
          : 'Understand transformers, attention mechanisms, embeddings and the math behind modern language models.',
    },
    {
      icon: Code2,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      glowColor: 'rgba(212, 160, 23, 0.3)',
      title: language === 'ro' ? 'Cod Practic' : language === 'el' ? 'Πρακτικός Κώδικας' : 'Hands-On Code',
      desc: language === 'ro'
        ? 'Construiește fiecare componentă de la zero în Python — tokenizere, straturi de atenție, blocuri transformer și întreaga arhitectură GPT-2.'
        : language === 'el'
          ? 'Κατασκευάστε κάθε component από το μηδέν σε Python — tokenizers, στρώματα προσοχής, transformer blocks και ολόκληρη την αρχιτεκτονική GPT-2.'
          : 'Build every component from scratch in Python — tokenizers, attention layers, transformer blocks and the full GPT-2 architecture.',
    },
    {
      icon: Play,
      color: 'text-green-600',
      bg: 'bg-green-500/10',
      glowColor: 'rgba(16, 185, 129, 0.25)',
      title: language === 'ro' ? 'Antrenare & Implementare' : language === 'el' ? 'Εκπαίδευση & Ανάπτυξη' : 'Training & Deployment',
      desc: language === 'ro'
        ? 'Pre-antrenează pe seturi de date reale, implementează scalarea temperaturii, eșantionarea top-k și încarcă întreaga arhitectură GPT-2.'
        : language === 'el'
          ? 'Προεκπαιδεύστε σε πραγματικά datasets, υλοποιήστε temperature scaling, top-k sampling και φορτώστε ολόκληρη την αρχιτεκτονική GPT-2.'
          : 'Pretrain on real datasets, implement temperature scaling, top-k sampling and load the full GPT-2 architecture.',
    },
  ];

  return (
    <div className="space-y-16 pb-16 -mx-4 -mt-8 sm:-mx-6 lg:-mx-8">
      {/* ══════════════════════════════════════════════
          Hero Section — animated gradient + entrance
          ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-6 py-24 text-center text-primary-foreground sm:px-12 lg:px-16 lg:py-28">
        {/* Animated gradient background */}
        <div className="absolute inset-0 animate-gradient-shift bg-[length:200%_200%] bg-gradient-to-br from-primary via-[hsl(240_80%_30%)] to-[hsl(260_70%_20%)]" />

        {/* Floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-secondary/10 blur-3xl animate-float-slow" />
          <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-float-slower" />
          <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-secondary/5 blur-2xl animate-float-reverse" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <motion.div
          initial="hidden"
          animate="visible"
          className="relative mx-auto max-w-3xl"
        >
          <motion.h1
            variants={heroTitle}
            className="mb-5 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
          >
            {t('home_title', language)}
          </motion.h1>
          <motion.p
            variants={heroSubtitle}
            className="mx-auto mb-10 max-w-2xl text-base text-primary-foreground/70 sm:text-lg leading-relaxed"
          >
            {t('home_subtitle', language)}
          </motion.p>

          {/* Gold CTA button with glow */}
          <motion.div variants={heroCTA}>
            <Link
              href={nextLecture ? `/lectures/${nextLecture.id}` : '/lectures/1'}
              className="group relative inline-flex items-center gap-2 rounded-xl bg-secondary px-10 py-4 text-base font-bold text-secondary-foreground shadow-lg shadow-secondary/25 transition-all hover:shadow-2xl hover:shadow-secondary/40 hover:scale-[1.03] active:scale-[0.98]"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative">
                {hasProgress ? t('course_continue', language) : t('home_start', language)}
              </span>
              <ChevronRight className="relative h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          {/* Animated stats row */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.15, delayChildren: 0.6 } },
            }}
            className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
                }}
              >
                <div className="text-3xl font-bold text-secondary tabular-nums">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="mt-1 text-xs text-primary-foreground/60">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════
          What You'll Learn — staggered glow cards
          ══════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="mb-8 text-center text-2xl font-bold font-heading">
            {language === 'ro' ? 'Ce Vei Învăța' : language === 'el' ? 'Τι Θα Μάθετε' : "What You'll Learn"}
          </h2>
        </ScrollReveal>
        <StaggerReveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.15}>
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <GlowCard glowColor={feature.glowColor}>
                <div className="p-6 text-center">
                  <div className={cn('mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl', feature.bg)}>
                    <feature.icon className={cn('h-7 w-7', feature.color)} />
                  </div>
                  <h3 className="mb-2 text-base font-bold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </GlowCard>
            </StaggerItem>
          ))}
        </StaggerReveal>
      </section>

      {/* ══════════════════════════════════════════════
          Download Threshold Note
          ══════════════════════════════════════════════ */}
      <ScrollReveal className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-start gap-4 rounded-xl border border-secondary/30 bg-secondary/5 px-5 py-4 backdrop-blur-sm">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {language === 'ro'
                ? 'Descarcă produse gata de deployment'
                : language === 'el'
                  ? 'Κατεβάστε έτοιμα προϊόντα ανάπτυξης'
                  : 'Download deployment-ready products'}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {language === 'ro'
                ? 'Finalizeaza cel putin 80% dintr-un curs pentru a debloca NeuralForge LLM sau produsele GenAI SaaS ca ZIP-uri gata de deployment.'
                : language === 'el'
                  ? 'Ολοκληρώστε τουλάχιστον 80% ενός μαθήματος για να ξεκλειδώσετε το NeuralForge LLM ή τα GenAI SaaS ως ZIP αρχεία έτοιμα για ανάπτυξη.'
                  : 'Complete at least 80% of a course to unlock the NeuralForge LLM or GenAI SaaS products as deployment-ready ZIP downloads.'}
            </p>
          </div>
        </div>
      </ScrollReveal>

      {/* ══════════════════════════════════════════════
          Continue Learning (if user has progress)
          ══════════════════════════════════════════════ */}
      {hasProgress && (
        <ScrollReveal className="px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold">
                  {t('course_continue', language)}
                </h3>
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {Math.round(completionPct)}% {t('course_completed', language)}
                  </span>
                </div>
                <Progress value={completionPct} className="h-2 w-full max-w-md" />
              </div>
              {nextLecture && (
                <Link href={`/lectures/${nextLecture.id}`} className={cn(buttonVariants(), 'gap-2')}>
                  {t('course_continue', language)}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ══════════════════════════════════════════════
          Course Map Overview — staggered glow cards
          ══════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="mb-8 flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-secondary" />
            <h2 className="text-2xl font-bold font-heading">{t('course_map', language)}</h2>
          </div>
        </ScrollReveal>
        <StaggerReveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
          {STAGES.map((stage) => {
            const stageLectures = getLecturesByStage(stage.number);
            const completedCount = stageLectures.filter(
              (l) => progress[l.id]?.completed
            ).length;
            const firstLecture = stageLectures[0];

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
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-transform group-hover:scale-110"
                          style={{ backgroundColor: `${stage.color}20` }}
                        >
                          {stage.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold truncate">
                            {stage.name[language]}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {t('course_stage', language)} {stage.number}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {stageLectures.length} {t('course_lecture', language)}s
                        </span>
                        {completedCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {completedCount}/{stageLectures.length}
                          </Badge>
                        )}
                      </div>
                      {completedCount > 0 && (
                        <Progress
                          value={(completedCount / stageLectures.length) * 100}
                          className="mt-2 h-1.5"
                        />
                      )}
                    </div>
                  </GlowCard>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerReveal>
      </section>
    </div>
  );
}
