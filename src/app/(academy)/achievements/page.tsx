'use client';

import { useAcademyStore } from '@/lib/store/academy-store';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PageTransition } from '@/components/motion/page-transition';
import { getIcon } from '@/lib/icons';
import { ACHIEVEMENTS } from '@/types';
import type { Language } from '@/types';
import { Lock, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEXT: Record<Language, { title: string; subtitle: string; unlocked: string; locked: string; count: (n: number, total: number) => string }> = {
  en: {
    title: 'Achievements',
    subtitle: 'Badges you earn as you progress through the course',
    unlocked: 'Unlocked',
    locked: 'Locked',
    count: (n, total) => `${n} of ${total} unlocked`,
  },
  ro: {
    title: 'Realizări',
    subtitle: 'Insigne pe care le câștigi pe măsură ce avansezi în curs',
    unlocked: 'Deblocat',
    locked: 'Blocat',
    count: (n, total) => `${n} din ${total} deblocate`,
  },
  el: {
    title: 'Επιτεύγματα',
    subtitle: 'Σήματα που κερδίζετε καθώς προχωράτε στο μάθημα',
    unlocked: 'Ξεκλειδωμένο',
    locked: 'Κλειδωμένο',
    count: (n, total) => `${n} από ${total} ξεκλειδωμένα`,
  },
  de: {
    title: 'Erfolge',
    subtitle: 'Abzeichen, die du auf deinem Weg durch den Kurs verdienst',
    unlocked: 'Freigeschaltet',
    locked: 'Gesperrt',
    count: (n, total) => `${n} von ${total} freigeschaltet`,
  },
  fr: {
    title: 'Succès',
    subtitle: 'Badges que vous gagnez en progressant dans le cours',
    unlocked: 'Débloqué',
    locked: 'Verrouillé',
    count: (n, total) => `${n} sur ${total} débloqués`,
  },
  it: {
    title: 'Obiettivi',
    subtitle: 'Distintivi che ottieni progredendo nel corso',
    unlocked: 'Sbloccato',
    locked: 'Bloccato',
    count: (n, total) => `${n} su ${total} sbloccati`,
  },
  ar: {
    title: 'الإنجازات',
    subtitle: 'شارات تكسبها أثناء تقدمك في الدورة',
    unlocked: 'مفتوح',
    locked: 'مقفل',
    count: (n, total) => `${n} من ${total} مفتوح`,
  },
};

export default function AchievementsPage() {
  // Select stable references only (array + primitive), never a freshly-built
  // object from the selector — that is the React #185 infinite-loop antipattern
  // that previously crashed /review.
  const language = useAcademyStore((s) => s.language) as Language;
  const unlockedAchievements = useAcademyStore((s) => s.unlockedAchievements);

  const tx = TEXT[language] || TEXT.en;
  const unlockedSet = new Set(unlockedAchievements);
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length;
  const pct = ACHIEVEMENTS.length > 0 ? Math.round((unlockedCount / ACHIEVEMENTS.length) * 100) : 0;

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{tx.title}</h1>
            <p className="text-sm text-muted-foreground">{tx.subtitle}</p>
          </div>
        </div>

        {/* Summary bar */}
        <Card className="mb-8">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="text-3xl font-bold tabular-nums text-primary">
              {unlockedCount}
              <span className="text-lg text-muted-foreground">/{ACHIEVEMENTS.length}</span>
            </div>
            <div className="flex-1">
              <p className="mb-1.5 text-sm font-medium text-foreground">
                {tx.count(unlockedCount, ACHIEVEMENTS.length)}
              </p>
              <Progress value={pct} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlockedSet.has(achievement.id);
            const Icon = getIcon(achievement.icon);
            const name = achievement.name[language] || achievement.name.en;
            const description = achievement.description[language] || achievement.description.en;

            return (
              <Card
                key={achievement.id}
                className={cn(
                  'relative overflow-hidden transition-colors',
                  isUnlocked ? 'border-primary/40 bg-primary/5' : 'opacity-70'
                )}
              >
                <CardContent className="flex items-start gap-3 py-4">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                      isUnlocked
                        ? 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isUnlocked ? (
                      <Icon className="h-6 w-6" />
                    ) : (
                      <Lock className="h-5 w-5" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-semibold text-foreground">{name}</h2>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                    <span
                      className={cn(
                        'mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        isUnlocked
                          ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isUnlocked ? tx.unlocked : tx.locked}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
