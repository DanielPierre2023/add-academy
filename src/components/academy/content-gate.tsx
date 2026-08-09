'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import { STAGES } from '@/types';
import { Lock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

function findStageForLecture(lectureId: string): number {
  for (const stage of STAGES) {
    if (stage.lectures.includes(lectureId)) return stage.number;
  }
  // Unmapped lectures default to highest stage (locked) — never -1 (free)
  return STAGES.length > 0 ? STAGES[STAGES.length - 1].number : 0;
}

interface ContentGateProps {
  lectureId: string;
  children: React.ReactNode;
}

/**
 * Client-side content gate that checks subscription access before
 * rendering lecture content. Stages 0 & 1 are always free.
 */
export function ContentGate({ lectureId, children }: ContentGateProps) {
  const { user, loading, canAccessStage } = useAuth();
  const language = useAcademyStore((s) => s.language);
  const stageNumber = findStageForLecture(lectureId);

  // While auth is loading, show nothing (avoids flash of locked content)
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Stages 0 and 1 are always free for everyone (even unauthenticated)
  if (stageNumber <= 1) {
    return <>{children}</>;
  }

  // Not logged in — prompt to sign in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <LogIn className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">
          {language === 'ro'
            ? 'Autentifică-te pentru a accesa această lecție'
            : language === 'el'
              ? 'Συνδεθείτε για πρόσβαση σε αυτό το μάθημα'
              : 'Sign in to access this lecture'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {language === 'ro'
            ? 'Această lecție face parte din Etapa ' + stageNumber + '. Autentifică-te și abonează-te pentru a debloca conținutul.'
            : language === 'el'
              ? 'Αυτό το μάθημα ανήκει στο Στάδιο ' + stageNumber + '. Συνδεθείτε και εγγραφείτε για πρόσβαση.'
              : 'This lecture is part of Stage ' + stageNumber + '. Sign in and subscribe to unlock this content.'}
        </p>
        <Link href={`/login?redirect=/lectures/${lectureId}`}>
          <Button size="lg" className="gap-2">
            <LogIn className="h-4 w-4" />
            {language === 'ro' ? 'Autentificare' : language === 'el' ? 'Σύνδεση' : 'Sign in'}
          </Button>
        </Link>
      </div>
    );
  }

  // Logged in but no access to this stage
  if (!canAccessStage(stageNumber)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">
          {language === 'ro'
            ? 'Conținut blocat — Etapa ' + stageNumber
            : language === 'el'
              ? 'Κλειδωμένο περιεχόμενο — Στάδιο ' + stageNumber
              : 'Locked Content — Stage ' + stageNumber}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {language === 'ro'
            ? 'Abonamentul tău actual nu include această etapă. Actualizează planul pentru a debloca tot conținutul.'
            : language === 'el'
              ? 'Η συνδρομή σας δεν περιλαμβάνει αυτό το στάδιο. Αναβαθμίστε για πλήρη πρόσβαση.'
              : 'Your current plan does not include this stage. Upgrade to unlock all content.'}
        </p>
        <Link href="/pricing">
          <Button size="lg" variant="secondary" className="gap-2">
            {language === 'ro' ? 'Vezi planurile' : language === 'el' ? 'Δείτε τα πλάνα' : 'View plans'}
          </Button>
        </Link>
      </div>
    );
  }

  // Access granted
  return <>{children}</>;
}
