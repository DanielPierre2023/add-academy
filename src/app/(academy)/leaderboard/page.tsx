'use client';

import { useAcademyStore } from '@/lib/store/academy-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/auth-context';
import {
  Trophy,
  Medal,
  Crown,
  Flame,
  Star,
  Award,
  Users,
} from 'lucide-react';
import type { Language } from '@/types';

// Simulated leaderboard data — in production this would come from Supabase
const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Alex M.', xp: 4250, level: 12, streak: 21, lectures: 45 },
  { rank: 2, name: 'Maria C.', xp: 3890, level: 11, streak: 14, lectures: 42 },
  { rank: 3, name: 'Stefan R.', xp: 3420, level: 10, streak: 7, lectures: 38 },
  { rank: 4, name: 'Elena P.', xp: 2980, level: 9, streak: 12, lectures: 35 },
  { rank: 5, name: 'Nikos K.', xp: 2750, level: 8, streak: 5, lectures: 33 },
  { rank: 6, name: 'Ana V.', xp: 2310, level: 7, streak: 9, lectures: 30 },
  { rank: 7, name: 'Dimitris T.', xp: 1890, level: 6, streak: 3, lectures: 27 },
  { rank: 8, name: 'Ioana D.', xp: 1560, level: 5, streak: 6, lectures: 24 },
  { rank: 9, name: 'Kostas N.', xp: 1230, level: 4, streak: 2, lectures: 20 },
  { rank: 10, name: 'George B.', xp: 980, level: 3, streak: 4, lectures: 16 },
];

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function LeaderboardPage() {
  const language = useAcademyStore((s) => s.language) as Language;
  const stats = useAcademyStore((s) => s.getGamificationStats());
  const { user } = useAuth();

  const texts = {
    en: {
      title: 'Leaderboard',
      subtitle: 'See how you rank against fellow students',
      rank: 'Rank',
      student: 'Student',
      xp: 'XP',
      level: 'Level',
      streak: 'Streak',
      lectures: 'Lectures',
      you: 'You',
      yourRank: 'Your Position',
      topPerformers: 'Top Performers',
      joinToCompete: 'Sign in to see your ranking and compete with other students.',
    },
    ro: {
      title: 'Clasament',
      subtitle: 'Vezi cum te compari cu ceilalti studenti',
      rank: 'Loc',
      student: 'Student',
      xp: 'XP',
      level: 'Nivel',
      streak: 'Serie',
      lectures: 'Lectii',
      you: 'Tu',
      yourRank: 'Pozitia Ta',
      topPerformers: 'Performeri de Top',
      joinToCompete: 'Autentifica-te pentru a vedea clasamentul tau.',
    },
    el: {
      title: 'Κατάταξη',
      subtitle: 'Δείτε πώς κατατάσσεστε σε σχέση με τους συμφοιτητές σας',
      rank: 'Θέση',
      student: 'Φοιτητής',
      xp: 'XP',
      level: 'Επίπεδο',
      streak: 'Σερί',
      lectures: 'Μαθήματα',
      you: 'Εσείς',
      yourRank: 'Η Θέση σας',
      topPerformers: 'Κορυφαίοι',
      joinToCompete: 'Συνδεθείτε για να δείτε την κατάταξή σας.',
    },
  };

  const txt = texts[language] || texts.en;

  // Insert current user into leaderboard
  const userEntry = user ? {
    rank: 0,
    name: user.displayName || user.email?.split('@')[0] || txt.you,
    xp: stats.xp,
    level: stats.level,
    streak: stats.streak,
    lectures: stats.lecturesCompleted,
    isUser: true,
  } : null;

  const allEntries = [...MOCK_LEADERBOARD.map((e) => ({ ...e, isUser: false }))];
  if (userEntry) {
    // Find user's position
    let inserted = false;
    for (let i = 0; i < allEntries.length; i++) {
      if (stats.xp > allEntries[i].xp) {
        allEntries.splice(i, 0, { ...userEntry, rank: i + 1 });
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      allEntries.push({ ...userEntry, rank: allEntries.length + 1 });
    }
    // Recalculate ranks
    allEntries.forEach((e, i) => { e.rank = i + 1; });
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="text-center">
        <Trophy className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
        <h1 className="text-3xl font-bold font-heading mb-2">{txt.title}</h1>
        <p className="text-muted-foreground">{txt.subtitle}</p>
      </div>

      {/* User's quick stat card */}
      {userEntry && (
        <Card className="border-secondary/50 bg-secondary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
                  {userEntry.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{txt.yourRank}</p>
                  <p className="text-sm text-muted-foreground">#{allEntries.find((e) => e.isUser)?.rank || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-center">
                <div>
                  <div className="text-lg font-bold">{stats.xp}</div>
                  <div className="text-[10px] text-muted-foreground">{txt.xp}</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{stats.level}</div>
                  <div className="text-[10px] text-muted-foreground">{txt.level}</div>
                </div>
                <div>
                  <div className="text-lg font-bold flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    {stats.streak}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{txt.streak}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!user && (
        <Card className="border-secondary/30">
          <CardContent className="pt-6 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{txt.joinToCompete}</p>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            {txt.topPerformers}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 w-12">{txt.rank}</th>
                  <th className="text-left py-2">{txt.student}</th>
                  <th className="text-right py-2 px-3">{txt.xp}</th>
                  <th className="text-right py-2 px-3">{txt.level}</th>
                  <th className="text-right py-2 px-3">{txt.streak}</th>
                  <th className="text-right py-2 px-3">{txt.lectures}</th>
                </tr>
              </thead>
              <tbody>
                {allEntries.slice(0, 15).map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.name}`}
                    className={`border-b last:border-0 transition-colors ${
                      entry.isUser
                        ? 'bg-secondary/10 font-semibold'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <td className="py-3">{getRankIcon(entry.rank)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {entry.name}
                        {entry.isUser && (
                          <Badge variant="secondary" className="text-[10px]">{txt.you}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3 px-3 tabular-nums">
                      <span className="flex items-center justify-end gap-1">
                        <Award className="h-3 w-3 text-yellow-500" />
                        {entry.xp.toLocaleString()}
                      </span>
                    </td>
                    <td className="text-right py-3 px-3 tabular-nums">{entry.level}</td>
                    <td className="text-right py-3 px-3 tabular-nums">
                      <span className="flex items-center justify-end gap-1">
                        <Flame className="h-3 w-3 text-orange-500" />
                        {entry.streak}
                      </span>
                    </td>
                    <td className="text-right py-3 px-3 tabular-nums">{entry.lectures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
