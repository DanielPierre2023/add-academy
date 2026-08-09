'use client';

import { useAcademyStore } from '@/lib/store/academy-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Trophy,
  Flame,
  Star,
  Award,
  Users,
  BookOpen,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { Language } from '@/types';

export default function LeaderboardPage() {
  const language = useAcademyStore((s) => s.language) as Language;
  const stats = useAcademyStore((s) => s.getGamificationStats());
  const { user } = useAuth();

  const texts = {
    en: {
      title: 'Your Progress',
      subtitle: 'Track your learning journey',
      xp: 'XP Earned',
      level: 'Level',
      streak: 'Day Streak',
      lectures: 'Lectures Completed',
      yourStats: 'Your Stats',
      comingSoon: 'Community Leaderboard',
      comingSoonDesc:
        'The community leaderboard is coming soon! Once enabled, you\'ll be able to see how you rank against fellow students. For now, keep tracking your personal progress below.',
      signIn: 'Sign in to track your learning progress and compete with other students.',
      keepGoing: 'Keep going!',
      greatStart: 'Great start!',
      onFire: 'You\'re on fire!',
      master: 'Learning master!',
      noProgress: 'Start a lecture to begin earning XP!',
    },
    ro: {
      title: 'Progresul Tau',
      subtitle: 'Urmareste parcursul tau de invatare',
      xp: 'XP Castigat',
      level: 'Nivel',
      streak: 'Zile Consecutiv',
      lectures: 'Lectii Finalizate',
      yourStats: 'Statisticile Tale',
      comingSoon: 'Clasament Comunitar',
      comingSoonDesc:
        'Clasamentul comunitar vine in curand! Odata activat, vei putea vedea cum te compari cu ceilalti studenti. Pana atunci, urmareste-ti progresul personal mai jos.',
      signIn: 'Autentifica-te pentru a-ti urmari progresul si a concura cu alti studenti.',
      keepGoing: 'Continua asa!',
      greatStart: 'Inceput excelent!',
      onFire: 'Esti in forma!',
      master: 'Maestru al invatarii!',
      noProgress: 'Incepe o lectie pentru a castiga XP!',
    },
    el: {
      title: 'Η Πρόοδός σας',
      subtitle: 'Παρακολουθήστε το μαθησιακό σας ταξίδι',
      xp: 'XP που κερδήθηκαν',
      level: 'Επίπεδο',
      streak: 'Ημέρες Σερί',
      lectures: 'Μαθήματα Ολοκληρωμένα',
      yourStats: 'Τα Στατιστικά σας',
      comingSoon: 'Κατάταξη Κοινότητας',
      comingSoonDesc:
        'Η κατάταξη κοινότητας έρχεται σύντομα! Μόλις ενεργοποιηθεί, θα μπορείτε να δείτε πώς κατατάσσεστε σε σχέση με τους συμφοιτητές σας.',
      signIn: 'Συνδεθείτε για να παρακολουθείτε την πρόοδό σας.',
      keepGoing: 'Συνεχίστε!',
      greatStart: 'Εξαιρετική αρχή!',
      onFire: 'Είστε φοβεροί!',
      master: 'Μάστερ μάθησης!',
      noProgress: 'Ξεκινήστε ένα μάθημα για να κερδίσετε XP!',
    },
  };

  const txt = texts[language] || texts.en;

  function getMotivation() {
    if (stats.xp === 0) return txt.noProgress;
    if (stats.level >= 10) return txt.master;
    if (stats.streak >= 7) return txt.onFire;
    if (stats.xp >= 500) return txt.greatStart;
    return txt.keepGoing;
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="text-center">
        <Trophy className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-3xl font-bold font-heading mb-2">{txt.title}</h1>
        <p className="text-muted-foreground">{txt.subtitle}</p>
      </div>

      {/* Community Leaderboard Coming Soon */}
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="pt-6 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-semibold text-lg mb-2">{txt.comingSoon}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {txt.comingSoonDesc}
          </p>
        </CardContent>
      </Card>

      {!user && (
        <Card className="border-secondary/30">
          <CardContent className="pt-6 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{txt.signIn}</p>
          </CardContent>
        </Card>
      )}

      {/* User Stats Grid */}
      {user && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                {txt.yourStats}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Award className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold tabular-nums">
                    {stats.xp.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">{txt.xp}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold tabular-nums">
                    {stats.level}
                  </div>
                  <div className="text-xs text-muted-foreground">{txt.level}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold tabular-nums">
                    {stats.streak}
                  </div>
                  <div className="text-xs text-muted-foreground">{txt.streak}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold tabular-nums">
                    {stats.lecturesCompleted}
                  </div>
                  <div className="text-xs text-muted-foreground">{txt.lectures}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Motivation */}
          <Card className="border-secondary/50 bg-secondary/5">
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto text-secondary mb-2" />
              <p className="font-semibold text-lg">{getMotivation()}</p>
              {stats.xp > 0 && (
                <Badge variant="secondary" className="mt-2">
                  Level {stats.level}
                </Badge>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
