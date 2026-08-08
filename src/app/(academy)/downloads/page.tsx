'use client';

import { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { STAGES } from '@/types';
import type { Language } from '@/types';

/** Minimum completion percentage required to unlock downloads */
const DOWNLOAD_THRESHOLD = 80;

/**
 * Calculate completion % for a set of stages.
 * Used to determine if a student has reached the 80% threshold.
 */
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
  const stats = useAcademyStore((s) => s.getGamificationStats());
  const { user, isOrgUser, effectiveTier, canAccessStage, canAccessProduct } = useAuth();

  const [generating, setGenerating] = useState<string | null>(null);

  const texts = {
    en: {
      title: 'Downloads',
      subtitle: 'Download your deployment-ready products and completion certificates',
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
      subtitle: 'Descarca produsele tale gata de deployment si certificatele de finalizare',
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
      subtitle: 'Κατεβάστε τα έτοιμα προϊόντα σας και τα πιστοποιητικά ολοκλήρωσης',
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

  // ─── Access checks ───────────────────────────────────

  /** Has the user PAID for the full LLM course? */
  function hasPaidLLM(): boolean {
    if (isOrgUser) return true;
    if (effectiveTier === 'full_access' || effectiveTier === 'llm_course') return true;
    return [2, 3, 4, 5, 6].every((s) => canAccessStage(s));
  }

  /** Has the user PAID for a specific SaaS product? */
  function hasPaidSaaS(productId: string): boolean {
    return canAccessProduct(productId);
  }

  // LLM course progress: stages 0–6
  const llmProgress = getStagesCompletion([0, 1, 2, 3, 4, 5, 6], progress);
  const llmPaid = hasPaidLLM();
  const llmMeetsThreshold = llmProgress.percentage >= DOWNLOAD_THRESHOLD;
  const llmCanDownload = llmPaid && llmMeetsThreshold;

  // GenAI SaaS progress: stage 7
  const saasProgress = getStagesCompletion([7], progress);
  const saasMeetsThreshold = saasProgress.percentage >= DOWNLOAD_THRESHOLD;

  // ─── Certificate handler ─────────────────────────────

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

  // ─── Download card component ─────────────────────────

  function DownloadCard({
    download,
    hasPaid,
    courseCompletion,
    meetsThreshold,
  }: {
    download: ProductDownload;
    hasPaid: boolean;
    courseCompletion: { completed: number; total: number; percentage: number };
    meetsThreshold: boolean;
  }) {
    const canDownload = hasPaid && meetsThreshold;

    return (
      <Card className={!canDownload ? 'opacity-70' : ''}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              {download.icon}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">
                  {download.name[language] || download.name.en}
                </h3>
                {canDownload ? (
                  <Badge className="gap-1 bg-green-600 text-[10px]">
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

              <p className="mt-1 text-sm text-muted-foreground">
                {download.description[language] || download.description.en}
              </p>

              {/* Progress bar — always shown */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{txt.courseProgress}</span>
                  <span className="font-medium">
                    {courseCompletion.completed}/{courseCompletion.total} {txt.lectures} ({courseCompletion.percentage}%)
                  </span>
                </div>
                <Progress value={courseCompletion.percentage} className="h-2" />
                {hasPaid && !meetsThreshold && (
                  <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {txt.completionRequired}
                  </p>
                )}
              </div>

              {/* File info */}
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileArchive className="h-3 w-3" />
                  {download.fileName}
                </span>
                <span>{txt.fileSize}: {download.fileSize}</span>
              </div>

              {/* What's inside */}
              <details className="mt-2 group">
                <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                  {txt.whatsInside}
                </summary>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {download.contents[language] || download.contents.en}
                </p>
              </details>

              {/* Action */}
              <div className="mt-3">
                {!hasPaid ? (
                  <Link href="/pricing">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      {txt.viewPlans}
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                ) : !meetsThreshold ? (
                  null /* message already shown in progress section */
                ) : download.downloadUrl === null ? (
                  <div className="rounded-md border border-dashed border-border bg-muted/50 px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">{txt.notAvailable}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{txt.notAvailableDesc}</p>
                  </div>
                ) : (
                  <a href={download.downloadUrl} download={download.fileName}>
                    <Button size="sm" className="gap-1.5">
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
    );
  }

  // ─── Not signed in ───────────────────────────────────

  if (!user) {
    return (
      <div className="py-16 text-center">
        <Download className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold font-heading mb-2">{txt.title}</h1>
        <p className="text-muted-foreground mb-6">{txt.signInPrompt}</p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {txt.signIn}
        </Link>
      </div>
    );
  }

  // ─── Count unlocked SaaS products ────────────────────

  const unlockedSaas = SAAS_DOWNLOADS.filter((d) => hasPaidSaaS(d.productId!) && saasMeetsThreshold);

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div className="text-center">
        <Package className="mx-auto h-16 w-16 text-secondary mb-4" />
        <h1 className="text-3xl font-bold font-heading mb-2">{txt.title}</h1>
        <p className="text-muted-foreground">{txt.subtitle}</p>
        <p className="mt-2 text-sm text-muted-foreground/80 italic">{txt.thresholdNote}</p>
        {isOrgUser && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-sm text-secondary">
            <Users className="h-3.5 w-3.5" />
            {txt.orgAccess}
          </div>
        )}
      </div>

      {/* ─── NeuralForge LLM ─────────────────────────────── */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-bold font-heading mb-4">
          <span className="text-2xl">🧠</span>
          {txt.llmSection}
        </h2>
        <DownloadCard
          download={NEURALFORGE_DOWNLOAD}
          hasPaid={llmPaid}
          courseCompletion={llmProgress}
          meetsThreshold={llmMeetsThreshold}
        />
      </section>

      {/* ─── GenAI SaaS Products (individual) ────────────── */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-bold font-heading mb-1">
          <span className="text-2xl">🚀</span>
          {txt.saasSection}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {unlockedSaas.length}/{SAAS_DOWNLOADS.length} {txt.unlocked.toLowerCase()}
        </p>

        <div className="grid gap-4">
          {SAAS_DOWNLOADS.map((download) => (
            <DownloadCard
              key={download.id}
              download={download}
              hasPaid={hasPaidSaaS(download.productId!)}
              courseCompletion={saasProgress}
              meetsThreshold={saasMeetsThreshold}
            />
          ))}
        </div>
      </section>

      {/* ─── Completion Certificates ─────────────────────── */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-bold font-heading mb-4">
          <Award className="h-5 w-5 text-secondary" />
          {txt.certificates}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* LLM Course Certificate */}
          <Card className={!llmCanDownload ? 'opacity-60' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-2xl text-white">
                  🧠
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">
                    {language === 'ro' ? 'Certificat Curs LLM' : language === 'el' ? 'Πιστοποιητικό Μαθήματος LLM' : 'LLM Course Certificate'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {llmProgress.percentage}% — {llmProgress.completed}/{llmProgress.total} {txt.lectures}
                  </p>
                </div>
                {llmCanDownload && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
              </div>

              <Progress value={llmProgress.percentage} className="h-1.5 mb-3" />

              {llmCanDownload ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleCertificateDownload('llm-from-scratch')}
                  disabled={generating === 'llm-from-scratch'}
                >
                  <Award className="h-3.5 w-3.5" />
                  {generating === 'llm-from-scratch' ? txt.generating : txt.downloadCert}
                </Button>
              ) : !llmPaid ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  {txt.subscriptionRequired}
                </p>
              ) : (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {txt.completionRequired}
                </p>
              )}
            </CardContent>
          </Card>

          {/* GenAI SaaS Certificate — requires all 5 products paid + 80% completion */}
          {(() => {
            const allSaasPaid = SAAS_DOWNLOADS.every((d) => hasPaidSaaS(d.productId!));
            const saasCanCert = allSaasPaid && saasMeetsThreshold;

            return (
              <Card className={!saasCanCert ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-2xl text-white">
                      🚀
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">
                        {language === 'ro' ? 'Certificat GenAI SaaS' : language === 'el' ? 'Πιστοποιητικό GenAI SaaS' : 'GenAI SaaS Certificate'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {saasProgress.percentage}% — {saasProgress.completed}/{saasProgress.total} {txt.lectures}
                      </p>
                    </div>
                    {saasCanCert && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                  </div>

                  <Progress value={saasProgress.percentage} className="h-1.5 mb-3" />

                  {saasCanCert ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleCertificateDownload('genai-saas')}
                      disabled={generating === 'genai-saas'}
                    >
                      <Award className="h-3.5 w-3.5" />
                      {generating === 'genai-saas' ? txt.generating : txt.downloadCert}
                    </Button>
                  ) : !allSaasPaid ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      {txt.subscriptionRequired}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {txt.completionRequired}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </section>
    </div>
  );
}
