'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Medal,
} from 'lucide-react';
import type { Language } from '@/types';
import { cn } from '@/lib/utils';
import {
  getLeaderboard,
  getMyLeaderboardSettings,
  setLeaderboardParticipation,
  type LeaderboardRow,
} from '@/lib/leaderboard/actions';

export default function LeaderboardPage() {
  const language = useAcademyStore((s) => s.language) as Language;
  // Select the stable function ref and call it in the render body — returning a
  // fresh object straight from the selector destabilises useSyncExternalStore
  // and can trigger the React #185 infinite-loop crash (see /review fix).
  const getGamificationStats = useAcademyStore((s) => s.getGamificationStats);
  const stats = getGamificationStats();
  const { user } = useAuth();

  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [optIn, setOptIn] = useState(false);
  const [alias, setAlias] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const texts = {
    en: {
      title: 'Leaderboard',
      subtitle: 'See how you rank against fellow learners',
      board: 'Community Leaderboard',
      emptyBoard: 'No one has joined the leaderboard yet — be the first!',
      rank: 'Rank', learner: 'Learner', xp: 'XP', lectures: 'Lectures',
      you: 'You',
      settings: 'Leaderboard settings',
      optInLabel: 'Show me on the leaderboard',
      optInHint: 'You only appear if you opt in, and only under your chosen alias — never your real name or email.',
      aliasLabel: 'Display alias',
      aliasPlaceholder: 'e.g. NeuralNinja',
      save: 'Save', saved: 'Saved!',
      yourStats: 'Your Stats',
      xpEarned: 'XP Earned', level: 'Level', streak: 'Day Streak', lecturesCompleted: 'Lectures Completed',
      signIn: 'Sign in to track your progress and join the leaderboard.',
      keepGoing: 'Keep going!', greatStart: 'Great start!', onFire: 'You\'re on fire!', master: 'Learning master!', noProgress: 'Start a lecture to begin earning XP!',
    },
    ro: {
      title: 'Clasament',
      subtitle: 'Vezi cum te clasezi față de ceilalți cursanți',
      board: 'Clasament Comunitar',
      emptyBoard: 'Nimeni nu s-a alăturat clasamentului încă — fii primul!',
      rank: 'Loc', learner: 'Cursant', xp: 'XP', lectures: 'Lecții',
      you: 'Tu',
      settings: 'Setări clasament',
      optInLabel: 'Arată-mă în clasament',
      optInHint: 'Apari doar dacă optezi, și doar sub aliasul ales — niciodată numele real sau emailul.',
      aliasLabel: 'Alias afișat',
      aliasPlaceholder: 'ex. NeuralNinja',
      save: 'Salvează', saved: 'Salvat!',
      yourStats: 'Statisticile Tale',
      xpEarned: 'XP Câștigat', level: 'Nivel', streak: 'Zile Consecutiv', lecturesCompleted: 'Lecții Finalizate',
      signIn: 'Autentifică-te pentru a-ți urmări progresul și a intra în clasament.',
      keepGoing: 'Continuă așa!', greatStart: 'Început excelent!', onFire: 'Ești în formă!', master: 'Maestru al învățării!', noProgress: 'Începe o lecție pentru a câștiga XP!',
    },
    el: {
      title: 'Κατάταξη',
      subtitle: 'Δείτε πώς κατατάσσεστε σε σχέση με άλλους μαθητές',
      board: 'Κατάταξη Κοινότητας',
      emptyBoard: 'Κανείς δεν έχει μπει στην κατάταξη ακόμη — γίνετε ο πρώτος!',
      rank: 'Θέση', learner: 'Μαθητής', xp: 'XP', lectures: 'Μαθήματα',
      you: 'Εσείς',
      settings: 'Ρυθμίσεις κατάταξης',
      optInLabel: 'Εμφάνισέ με στην κατάταξη',
      optInHint: 'Εμφανίζεστε μόνο αν το επιλέξετε, και μόνο με το ψευδώνυμό σας — ποτέ με το πραγματικό όνομα ή email.',
      aliasLabel: 'Ψευδώνυμο',
      aliasPlaceholder: 'π.χ. NeuralNinja',
      save: 'Αποθήκευση', saved: 'Αποθηκεύτηκε!',
      yourStats: 'Τα Στατιστικά σας',
      xpEarned: 'XP που κερδήθηκαν', level: 'Επίπεδο', streak: 'Ημέρες Σερί', lecturesCompleted: 'Μαθήματα Ολοκληρωμένα',
      signIn: 'Συνδεθείτε για να παρακολουθείτε την πρόοδό σας και να μπείτε στην κατάταξη.',
      keepGoing: 'Συνεχίστε!', greatStart: 'Εξαιρετική αρχή!', onFire: 'Είστε φοβεροί!', master: 'Μάστερ μάθησης!', noProgress: 'Ξεκινήστε ένα μάθημα για να κερδίσετε XP!',
    },
  };

  const txt = texts[language] || texts.en;

  const refresh = useCallback(async () => {
    const [rows, settings] = await Promise.all([getLeaderboard(100), getMyLeaderboardSettings()]);
    setBoard(rows);
    setOptIn(settings.optIn);
    setAlias(settings.alias);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // State updates live inside the async function (after await), never
    // synchronously in the effect body (react-hooks/set-state-in-effect).
    const load = async () => {
      const [rows, settings] = await Promise.all([
        getLeaderboard(100),
        getMyLeaderboardSettings(),
      ]);
      if (cancelled) return;
      setBoard(rows);
      setOptIn(settings.optIn);
      setAlias(settings.alias);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await setLeaderboardParticipation(optIn, alias);
    await refresh();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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

      {!user && (
        <Card className="border-secondary/30">
          <CardContent className="pt-6 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{txt.signIn}</p>
          </CardContent>
        </Card>
      )}

      {user && (
        <>
          {/* Ranked board */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {txt.board}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {board.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{txt.emptyBoard}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-2 w-14">{txt.rank}</th>
                        <th className="py-2 pr-2">{txt.learner}</th>
                        <th className="py-2 pr-2 text-right">{txt.lectures}</th>
                        <th className="py-2 pl-2 text-right">{txt.xp}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.map((row) => (
                        <tr
                          key={`${row.rank}-${row.alias}`}
                          className={cn(
                            'border-t border-border/60',
                            row.isMe && 'bg-primary/5 font-semibold'
                          )}
                        >
                          <td className="py-2 pr-2">
                            {row.rank <= 3 ? (
                              <Medal
                                className={cn(
                                  'h-5 w-5',
                                  row.rank === 1 ? 'text-yellow-500' : row.rank === 2 ? 'text-slate-400' : 'text-amber-700'
                                )}
                              />
                            ) : (
                              <span className="tabular-nums text-muted-foreground">{row.rank}</span>
                            )}
                          </td>
                          <td className="py-2 pr-2">
                            {row.alias}
                            {row.isMe && (
                              <Badge variant="secondary" className="ml-2 text-[10px]">{txt.you}</Badge>
                            )}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">{row.lecturesCompleted}</td>
                          <td className="py-2 pl-2 text-right tabular-nums">{row.xp.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participation settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-yellow-500" />
                {txt.settings}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                />
                <span>
                  <span className="text-sm font-medium text-foreground">{txt.optInLabel}</span>
                  <span className="block text-xs text-muted-foreground">{txt.optInHint}</span>
                </span>
              </label>

              <div className="flex flex-col gap-1.5 sm:max-w-xs">
                <label className="text-xs font-medium text-muted-foreground">{txt.aliasLabel}</label>
                <input
                  type="text"
                  value={alias}
                  maxLength={32}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder={txt.aliasPlaceholder}
                  disabled={!optIn}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                {saved ? txt.saved : txt.save}
              </Button>
            </CardContent>
          </Card>

          {/* Your stats */}
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
                  <div className="text-2xl font-bold tabular-nums">{stats.xp.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{txt.xpEarned}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold tabular-nums">{stats.level}</div>
                  <div className="text-xs text-muted-foreground">{txt.level}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold tabular-nums">{stats.streak}</div>
                  <div className="text-xs text-muted-foreground">{txt.streak}</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold tabular-nums">{stats.lecturesCompleted}</div>
                  <div className="text-xs text-muted-foreground">{txt.lecturesCompleted}</div>
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
                  {txt.level} {stats.level}
                </Badge>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
