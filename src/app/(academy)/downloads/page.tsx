'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/lib/auth/auth-context';
import {
  NEURALFORGE_DOWNLOAD,
  SAAS_DOWNLOADS,
  type ProductDownload,
} from '@/lib/downloads/course-downloads';
import { downloadCertificate, type CertificateData } from '@/lib/downloads/certificates';
import { COURSE_CATALOG } from '@/lib/courses/catalog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  Lock,
  CheckCircle2,
  Award,
  Package,
  FileArchive,
  ExternalLink,
  Users,
  AlertCircle,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Shield,
} from 'lucide-react';
import { STAGES } from '@/types';
import type { Language } from '@/types';
import { cn } from '@/lib/utils';

const DOWNLOAD_THRESHOLD = 80;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
} as const;

function getStagesCompletion(
  stageNumbers: number[],
  progress: Record<string, { completed?: boolean }>,
): { completed: number; total: number; percentage: number } {
  let completed = 0;
  let total = 0;
  for (const stage of STAGES) {
    if (!stageNumbers.includes(stage.number)) continue;
    for (const lectureId of stage.lectures) {
      total++;
      if (progress[lectureId]?.completed) completed++;
    }
  }
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export default function DownloadsPage() {
  const language = useAcademyStore((s) => s.language) as Language;
  const progress = useAcademyStore((s) => s.progress);
  const { getGamificationStats } = useAcademyStore();
  const stats = getGamificationStats();
  const { user, isOrgUser, effectiveTier, canAccessStage, canAccessProduct } = useAuth();

  const [generating, setGenerating] = useState<string | null>(null);

  const texts = {
    en: {
      title: 'Downloads',
      subtitle: 'Your deployment-ready products and completion certificates',
      thresholdNote: `Complete at least ${DOWNLOAD_THRESHOLD}% of a course to unlock its download.`,
      signInPrompt: 'Sign in to access your downloads',
      signIn: 'Sign in',
      llmSection: 'NeuralForge LLM',
      saasSection: 'GenAI SaaS Products',
      certificates: 'Completion Certificates',
      download: 'Download ZIP',
      downloadCert: 'Download Certificate',
      generating: 'Generating...',
      locked: 'Locked',
      unlocked: 'Ready',
      notAvailable: 'Coming soon',
      notAvailableDesc: 'The deployment package is being prepared. Check back soon.',
      subscriptionRequired: 'Subscription required',
      completionRequired: `Complete at least ${DOWNLOAD_THRESHOLD}% to unlock`,
      orgAccess: 'Full access via your organization',
      whatsInside: "What's inside",
      fileSize: 'File size',
      viewPlans: 'View plans',
      courseProgress: 'Course progress',
      lectures: 'lectures',
    },
    ro: {
      title: 'Descarcari',
      subtitle: 'Produsele tale gata de deployment si certificatele de finalizare',
      thresholdNote: `Finalizeaza cel putin ${DOWNLOAD_THRESHOLD}% dintr-un curs pentru a debloca descarcarea.`,
      signInPrompt: 'Autentifica-te pentru a accesa descarcarile',
      signIn: 'Autentificare',
      llmSection: 'NeuralForge LLM',
      saasSection: 'Produse GenAI SaaS',
      certificates: 'Certificate de Finalizare',
      download: 'Descarca ZIP',
      downloadCert: 'Descarca Certificat',
      generating: 'Se genereaza...',
      locked: 'Blocat',
      unlocked: 'Disponibil',
      notAvailable: 'In curand',
      notAvailableDesc: 'Pachetul de deployment se pregateste. Revino curand.',
      subscriptionRequired: 'Abonament necesar',
      completionRequired: `Finalizeaza cel putin ${DOWNLOAD_THRESHOLD}% pentru a debloca`,
      orgAccess: 'Acces complet prin organizatia ta',
      whatsInside: 'Ce contine',
      fileSize: 'Dimensiune',
      viewPlans: 'Vezi planuri',
      courseProgress: 'Progres curs',
      lectures: 'lectii',
    },
    el: {
      title: 'Λήψεις',
      subtitle: 'Τα έτοιμα προϊόντα σας και τα πιστοποιητικά ολοκλήρωσης',
      thresholdNote: `Ολοκληρώστε τουλάχιστον ${DOWNLOAD_THRESHOLD}% ενός μαθήματος για να ξεκλειδώσετε τη λήψη.`,
      signInPrompt: 'Συνδεθείτε για πρόσβαση στις λήψεις σας',
      signIn: 'Σύνδεση',
      llmSection: 'NeuralForge LLM',
      saasSection: 'Προϊόντα GenAI SaaS',
      certificates: 'Πιστοποιητικά Ολοκλήρωσης',
      download: 'Λήψη ZIP',
      downloadCert: 'Λήψη Πιστοποιητικού',
      generating: 'Δημιουργία...',
      locked: 'Κλειδωμένο',
      unlocked: 'Έτοιμο',
      notAvailable: 'Σύντομα',
      notAvailableDesc: 'Το πακέτο ανάπτυξης ετοιμάζεται. Ελέγξτε σύντομα.',
      subscriptionRequired: 'Απαιτείται συνδρομή',
      completionRequired: `Ολοκληρώστε τουλάχιστον ${DOWNLOAD_THRESHOLD}% για ξεκλείδωμα`,
      orgAccess: 'Πλήρης πρόσβαση μέσω του οργανισμού σας',
      whatsInside: 'Τι περιέχει',
      fileSize: 'Μέγεθος',
      viewPlans: 'Δείτε πλάνα',
      courseProgress: 'Πρόοδος μαθήματος',
      lectures: 'μαθήματα',
    },
  };

  const txt = texts[language] || texts.en;

  function hasPaidLLM(): boolean {
    if (isOrgUser) return true;
    if (effectiveTier === 'full_access' || effectiveTier === 'llm_course') return true;
    return [2, 3, 4, 5, 6].every((s) => canAccessStage(s));
  }

  function hasPaidSaaS(productId: string): boolean {
    return canAccessProduct(productId);
  }

  const llmProgress = getStagesCompletion([0, 1, 2, 3, 4, 5, 6], progress);
  const llmPaid = hasPaidLLM();
  const llmMeetsThreshold = llmProgress.percentage >= DOWNLOAD_THRESHOLD;
  const llmCanDownload = llmPaid && llmMeetsThreshold;

  const saasProgress = getStagesCompletion([7], progress);
  const saasMeetsThreshold = saasProgress.percentage >= DOWNLOAD_THRESHOLD;

  async function handleCertificateDownload(courseId: string) {
    if (!user) return;
    const course = COURSE_CATALOG.find((c) => c.id === courseId);
    if (!course) return;
    const courseProgress = courseId === 'llm-from-scratch' ? llmProgress : saasProgress;
    setGenerating(courseId);
    try {
      const certData: CertificateData = {
        studentName: user.displayName || user.email.split('@')[0],
        courseName: course.name[language] || course.name.en,
        courseIcon: course.icon,
        completionDate: new Date().toISOString(),
        completionPercentage: courseProgress.percentage,
        totalLectures: courseProgress.total,
        completedLectures: courseProgress.completed,
        level: stats.level,
        xp: stats.xp,
      };
      await downloadCertificate(certData);
    } catch (err) {
      console.error('Certificate generation failed:', err);
    } finally {
      setGenerating(null);
    }
  }

  // ─── Download card component ──────────────────────────

  function DownloadCard({
    download,
    hasPaid,
    courseCompletion,
    meetsThreshold,
    index,
  }: {
    download: ProductDownload;
    hasPaid: boolean;
    courseCompletion: { completed: number; total: number; percentage: number };
    meetsThreshold: boolean;
    index: number;
  }) {
    const canDownload = hasPaid && meetsThreshold;

    return (
      <motion.div
        custom={index}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <Card className={cn(
          'group relative overflow-hidden transition-all duration-300',
          canDownload
            ? 'hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20'
            : 'opacity-80'
        )}>
          {/* Gradient accent line */}
          {canDownload && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary" />
          )}

          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl transition-transform duration-300',
                canDownload
                  ? 'bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:scale-105'
                  : 'bg-muted/50'
              )}>
                {download.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-bold text-foreground">
                    {download.name[language] || download.name.en}
                  </h3>
                  {canDownload ? (
                    <Badge className="gap-1 bg-green-600 text-[10px] shadow-sm">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {txt.unlocked}
                    </Badge>
                  ) : !hasPaid ? (
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      <Lock className="h-2.5 w-2.5" />
                      {txt.locked}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <AlertCircle className="h-2.5 w-2.5" />
                      {courseCompletion.percentage}%
                    </Badge>
                  )}
                </div>

                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {download.description[language] || download.description.en}
                </p>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">{txt.courseProgress}</span>
                    <span className="font-semibold text-foreground">
                      {courseCompletion.completed}/{courseCompletion.total} {txt.lectures} ({courseCompletion.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        meetsThreshold
                          ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                          : 'bg-gradient-to-r from-primary to-blue-400'
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${courseCompletion.percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                  {hasPaid && !meetsThreshold && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {txt.completionRequired}
                    </p>
                  )}
                </div>

                {/* File info */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
                    <FileArchive className="h-3 w-3" />
                    {download.fileName}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
                    {txt.fileSize}: {download.fileSize}
                  </span>
                </div>

                {/* What's inside */}
                <details className="mt-3 group/details">
                  <summary className="cursor-pointer text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                    {txt.whatsInside}
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed pl-1 border-l-2 border-primary/20">
                    {download.contents[language] || download.contents.en}
                  </p>
                </details>

                {/* Action */}
                <div className="mt-4">
                  {!hasPaid ? (
                    <Link href="/pricing">
                      <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                        {txt.viewPlans}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  ) : !meetsThreshold ? (
                    null
                  ) : download.downloadUrl === null ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">{txt.notAvailable}</p>
                      <p className="text-[11px] text-muted-foreground/80 mt-0.5">{txt.notAvailableDesc}</p>
                    </div>
                  ) : (
                    <a href={download.downloadUrl} download={download.fileName}>
                      <Button size="sm" className="gap-2 rounded-xl shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all">
                        <Download className="h-3.5 w-3.5" />
                        {txt.download}
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ─── Not signed in ────────────────────────────────────

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-secondary/20 blur-2xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card">
            <Download className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold font-heading">{txt.title}</h1>
        <p className="mt-2 text-muted-foreground">{txt.signInPrompt}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25"
        >
          {txt.signIn}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const unlockedSaas = SAAS_DOWNLOADS.filter((d) => hasPaidSaaS(d.productId!) && saasMeetsThreshold);

  return (
    <div className="space-y-12 pb-16">
      {/* ── Header ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center pt-4"
      >
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 text-secondary-foreground shadow-lg shadow-secondary/25 mb-5">
          <Package className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold font-heading text-foreground">{txt.title}</h1>
        <p className="mt-2 text-muted-foreground max-w-lg mx-auto">{txt.subtitle}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-xl bg-muted px-4 py-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            {txt.thresholdNote}
          </span>
          {isOrgUser && (
            <span className="inline-flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2 text-sm text-secondary">
              <Users className="h-3.5 w-3.5" />
              {txt.orgAccess}
            </span>
          )}
        </div>
      </motion.div>

      {/* ── NeuralForge LLM ──────────────────────────────── */}
      <section>
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 mb-5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Cpu className="h-5 w-5 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground">{txt.llmSection}</h2>
        </motion.div>
        <DownloadCard
          download={NEURALFORGE_DOWNLOAD}
          hasPaid={llmPaid}
          courseCompletion={llmProgress}
          meetsThreshold={llmMeetsThreshold}
          index={0}
        />
      </section>

      {/* ── GenAI SaaS Products ──────────────────────────── */}
      <section>
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Layers className="h-5 w-5 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold font-heading text-foreground">{txt.saasSection}</h2>
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            {unlockedSaas.length}/{SAAS_DOWNLOADS.length} {txt.unlocked.toLowerCase()}
          </span>
        </motion.div>

        <div className="grid gap-4">
          {SAAS_DOWNLOADS.map((download, i) => (
            <DownloadCard
              key={download.id}
              download={download}
              hasPaid={hasPaidSaaS(download.productId!)}
              courseCompletion={saasProgress}
              meetsThreshold={saasMeetsThreshold}
              index={i + 1}
            />
          ))}
        </div>
      </section>

      {/* ── Completion Certificates ──────────────────────── */}
      <section>
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 mb-5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
            <Award className="h-5 w-5 text-secondary" />
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground">{txt.certificates}</h2>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* LLM Course Certificate */}
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
            <Card className={cn(
              'group relative overflow-hidden transition-all duration-300',
              llmCanDownload ? 'hover:shadow-lg hover:border-blue-500/20' : 'opacity-70'
            )}>
              {llmCanDownload && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-400" />
              )}
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                    <Cpu className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-sm text-foreground">
                      {language === 'ro' ? 'Certificat Curs LLM' : language === 'el' ? 'Πιστοποιητικό Μαθήματος LLM' : 'LLM Course Certificate'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {llmProgress.percentage}% — {llmProgress.completed}/{llmProgress.total} {txt.lectures}
                    </p>
                  </div>
                  {llmCanDownload && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                </div>

                <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${llmProgress.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                </div>

                {llmCanDownload ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 rounded-xl"
                    onClick={() => handleCertificateDownload('llm-from-scratch')}
                    disabled={generating === 'llm-from-scratch'}
                  >
                    <Award className="h-3.5 w-3.5" />
                    {generating === 'llm-from-scratch' ? txt.generating : txt.downloadCert}
                  </Button>
                ) : !llmPaid ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    {txt.subscriptionRequired}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    {txt.completionRequired}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* GenAI SaaS Certificate */}
          {(() => {
            const allSaasPaid = SAAS_DOWNLOADS.every((d) => hasPaidSaaS(d.productId!));
            const saasCanCert = allSaasPaid && saasMeetsThreshold;

            return (
              <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}>
                <Card className={cn(
                  'group relative overflow-hidden transition-all duration-300',
                  saasCanCert ? 'hover:shadow-lg hover:border-amber-500/20' : 'opacity-70'
                )}>
                  {saasCanCert && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-400" />
                  )}
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
                        <Layers className="h-7 w-7" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-sm text-foreground">
                          {language === 'ro' ? 'Certificat GenAI SaaS' : language === 'el' ? 'Πιστοποιητικό GenAI SaaS' : 'GenAI SaaS Certificate'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {saasProgress.percentage}% — {saasProgress.completed}/{saasProgress.total} {txt.lectures}
                        </p>
                      </div>
                      {saasCanCert && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                    </div>

                    <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${saasProgress.percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                      />
                    </div>

                    {saasCanCert ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2 rounded-xl"
                        onClick={() => handleCertificateDownload('genai-saas')}
                        disabled={generating === 'genai-saas'}
                      >
                        <Award className="h-3.5 w-3.5" />
                        {generating === 'genai-saas' ? txt.generating : txt.downloadCert}
                      </Button>
                    ) : !allSaasPaid ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Lock className="h-3 w-3" />
                        {txt.subscriptionRequired}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3" />
                        {txt.completionRequired}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })()}
        </div>
      </section>
    </div>
  );
}
