'use client';

import { useAcademyStore } from '@/lib/store/academy-store';
import { t } from '@/lib/i18n';
import { getLectureIndex, getLecturesByStage } from '@/lib/lectures';
import { STAGES } from '@/types';
import {
  BookOpen,
  Code2,
  HelpCircle,
  Globe,
  ChevronRight,
  GraduationCap,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function HomePage() {
  const language = useAcademyStore((s) => s.language);
  const getCompletionPercentage = useAcademyStore((s) => s.getCompletionPercentage);
  const progress = useAcademyStore((s) => s.progress);
  const index = getLectureIndex();
  const completionPct = getCompletionPercentage();
  const hasProgress = Object.keys(progress).length > 0;
  const nextLecture = index.lectures.find((l) => !progress[l.id]?.completed);

  const stats = [
    { value: '49', label: t('home_stats_lectures', language) },
    { value: '5', label: 'SaaS Products' },
    { value: '100+', label: t('home_stats_exercises', language) },
    { value: '3', label: t('home_stats_languages', language) },
  ];

  return (
    <div className="space-y-12 pb-16 -mx-4 -mt-8 sm:-mx-6 lg:-mx-8">
      {/* ══════════════════════════════════════════════
          Hero Section — deep blue gradient matching reference
          ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-[hsl(240_60%_25%)] px-6 py-20 text-center text-primary-foreground sm:px-12 lg:px-16">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.08),transparent)]" />

        <div className="relative mx-auto max-w-3xl">
          <h1 className="mb-4 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {t('home_title', language)}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base text-primary-foreground/70 sm:text-lg">
            {t('home_subtitle', language)}
          </p>

          {/* Gold CTA button */}
          <Link
            href={nextLecture ? `/lectures/${nextLecture.id}` : '/lectures/1'}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-8 py-3 text-base font-bold text-secondary-foreground shadow-lg shadow-secondary/20 transition-all hover:bg-secondary/90 hover:shadow-xl hover:shadow-secondary/30"
          >
            {hasProgress ? t('course_continue', language) : t('home_start', language)} →
          </Link>

          {/* Stats row */}
          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-secondary tabular-nums">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-primary-foreground/60">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          What You'll Learn — 3-column feature cards
          ══════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-center text-2xl font-bold font-heading">
          {language === 'ro' ? 'Ce Vei Învăța' : language === 'el' ? 'Τι Θα Μάθετε' : "What You'll Learn"}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="mx-auto mb-4 text-4xl">🧠</div>
              <CardTitle className="mb-2 text-base">
                {language === 'ro' ? 'Teoria LLM' : language === 'el' ? 'Θεωρία LLM' : 'LLM Theory'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {language === 'ro'
                  ? 'Înțelege transformerele, mecanismele de atenție, embedding-urile și matematica din spatele modelelor de limbaj moderne.'
                  : language === 'el'
                    ? 'Κατανοήστε τους transformers, τους μηχανισμούς προσοχής, τα embeddings και τα μαθηματικά πίσω από τα σύγχρονα γλωσσικά μοντέλα.'
                    : 'Understand transformers, attention mechanisms, embeddings and the math behind modern language models.'}
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="mx-auto mb-4 text-4xl">💻</div>
              <CardTitle className="mb-2 text-base">
                {language === 'ro' ? 'Cod Practic' : language === 'el' ? 'Πρακτικός Κώδικας' : 'Hands-On Code'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {language === 'ro'
                  ? 'Construiește fiecare componentă de la zero în Python — tokenizere, straturi de atenție, blocuri transformer și întreaga arhitectură GPT-2.'
                  : language === 'el'
                    ? 'Κατασκευάστε κάθε component από το μηδέν σε Python — tokenizers, στρώματα προσοχής, transformer blocks και ολόκληρη την αρχιτεκτονική GPT-2.'
                    : 'Build every component from scratch in Python — tokenizers, attention layers, transformer blocks and the full GPT-2 architecture.'}
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="mx-auto mb-4 text-4xl">🚀</div>
              <CardTitle className="mb-2 text-base">
                {language === 'ro' ? 'Antrenare & Implementare' : language === 'el' ? 'Εκπαίδευση & Ανάπτυξη' : 'Training & Deployment'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {language === 'ro'
                  ? 'Pre-antrenează pe seturi de date reale, implementează scalarea temperaturii, eșantionarea top-k și încarcă întreaga arhitectură GPT-2.'
                  : language === 'el'
                    ? 'Προεκπαιδεύστε σε πραγματικά datasets, υλοποιήστε temperature scaling, top-k sampling και φορτώστε ολόκληρη την αρχιτεκτονική GPT-2.'
                    : 'Pretrain on real datasets, implement temperature scaling, top-k sampling and load the full GPT-2 architecture.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          Continue Learning (if user has progress)
          ══════════════════════════════════════════════ */}
      {hasProgress && (
        <section className="px-4 sm:px-6 lg:px-8">
          <Card className="border-secondary/30 bg-secondary/5">
            <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
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
            </CardContent>
          </Card>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          Course Map Overview
          ══════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <GraduationCap className="h-6 w-6 text-secondary" />
          <h2 className="text-2xl font-bold font-heading">{t('course_map', language)}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((stage) => {
            const stageLectures = getLecturesByStage(stage.number);
            const completedCount = stageLectures.filter(
              (l) => progress[l.id]?.completed
            ).length;
            const firstLecture = stageLectures[0];

            return (
              <Link
                key={stage.number}
                href={firstLecture ? `/lectures/${firstLecture.id}` : '#'}
                className="group"
              >
                <Card className="h-full transition-all hover:shadow-md hover:ring-1 hover:ring-secondary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                        style={{ backgroundColor: `${stage.color}20` }}
                      >
                        {stage.icon}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {stage.name[language]}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {t('course_stage', language)} {stage.number}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
