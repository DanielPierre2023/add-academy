'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAcademyStore } from '@/lib/store/academy-store';
import { hasMasteredPreviousStages } from '@/lib/mastery';
import { STAGES } from '@/types';
import { Lock, LogIn, Info, X } from 'lucide-react';
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
  const progress = useAcademyStore((s) => s.progress);
  const quizScores = useAcademyStore((s) => s.quizScores);
  const [advisoryDismissed, setAdvisoryDismissed] = useState(false);
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
              : language === 'de'
                ? 'Melde dich an, um auf diese Lektion zuzugreifen'
                : language === 'fr'
                  ? 'Connectez-vous pour accéder à cette leçon'
                  : language === 'it'
                    ? 'Accedi per accedere a questa lezione'
                    : language === 'ar'
                      ? 'سجّل الدخول للوصول إلى هذا الدرس'
                      : 'Sign in to access this lecture'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {language === 'ro'
            ? 'Această lecție face parte din Etapa ' + stageNumber + '. Autentifică-te și abonează-te pentru a debloca conținutul.'
            : language === 'el'
              ? 'Αυτό το μάθημα ανήκει στο Στάδιο ' + stageNumber + '. Συνδεθείτε και εγγραφείτε για πρόσβαση.'
              : language === 'de'
                ? 'Diese Lektion gehört zu Stufe ' + stageNumber + '. Melde dich an und abonniere, um diesen Inhalt freizuschalten.'
                : language === 'fr'
                  ? "Cette leçon fait partie de l'étape " + stageNumber + '. Connectez-vous et abonnez-vous pour débloquer ce contenu.'
                  : language === 'it'
                    ? 'Questa lezione fa parte della Fase ' + stageNumber + '. Accedi e abbonati per sbloccare questo contenuto.'
                    : language === 'ar'
                      ? 'هذا الدرس جزء من المرحلة ' + stageNumber + '. سجّل الدخول واشترك لفتح هذا المحتوى.'
                      : 'This lecture is part of Stage ' + stageNumber + '. Sign in and subscribe to unlock this content.'}
        </p>
        <Link href={`/login?redirect=/lectures/${lectureId}`}>
          <Button size="lg" className="gap-2">
            <LogIn className="h-4 w-4" />
            {language === 'ro'
              ? 'Autentificare'
              : language === 'el'
                ? 'Σύνδεση'
                : language === 'de'
                  ? 'Anmelden'
                  : language === 'fr'
                    ? 'Se connecter'
                    : language === 'it'
                      ? 'Accedi'
                      : language === 'ar'
                        ? 'تسجيل الدخول'
                        : 'Sign in'}
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
              : language === 'de'
                ? 'Gesperrter Inhalt — Stufe ' + stageNumber
                : language === 'fr'
                  ? 'Contenu verrouillé — Étape ' + stageNumber
                  : language === 'it'
                    ? 'Contenuto bloccato — Fase ' + stageNumber
                    : language === 'ar'
                      ? 'محتوى مقفل — المرحلة ' + stageNumber
                      : 'Locked Content — Stage ' + stageNumber}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {language === 'ro'
            ? 'Abonamentul tău actual nu include această etapă. Actualizează planul pentru a debloca tot conținutul.'
            : language === 'el'
              ? 'Η συνδρομή σας δεν περιλαμβάνει αυτό το στάδιο. Αναβαθμίστε για πλήρη πρόσβαση.'
              : language === 'de'
                ? 'Dein aktueller Plan enthält diese Stufe nicht. Upgrade, um alle Inhalte freizuschalten.'
                : language === 'fr'
                  ? "Votre forfait actuel n'inclut pas cette étape. Passez à un forfait supérieur pour débloquer tout le contenu."
                  : language === 'it'
                    ? 'Il tuo piano attuale non include questa fase. Esegui l\'upgrade per sbloccare tutti i contenuti.'
                    : language === 'ar'
                      ? 'خطتك الحالية لا تشمل هذه المرحلة. قم بالترقية لفتح جميع المحتويات.'
                      : 'Your current plan does not include this stage. Upgrade to unlock all content.'}
        </p>
        <Link href="/pricing">
          <Button size="lg" variant="secondary" className="gap-2">
            {language === 'ro'
              ? 'Vezi planurile'
              : language === 'el'
                ? 'Δείτε τα πλάνα'
                : language === 'de'
                  ? 'Pläne ansehen'
                  : language === 'fr'
                    ? 'Voir les forfaits'
                    : language === 'it'
                      ? 'Vedi i piani'
                      : language === 'ar'
                        ? 'عرض الخطط'
                        : 'View plans'}
          </Button>
        </Link>
      </div>
    );
  }

  // Access granted. W3.3: show a NON-BLOCKING advisory nudge if the learner
  // hasn't mastered the prior stages (hard-gating a paid course annoys people).
  const mastery = hasMasteredPreviousStages(stageNumber, progress, quizScores);
  const showAdvisory = !mastery.ready && !!mastery.blockingStage && !advisoryDismissed;

  return (
    <>
      {showAdvisory && mastery.blockingStage && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-foreground">
            {language === 'ro'
              ? `Poți continua, dar nu ai stăpânit încă Etapa ${mastery.blockingStage.stageNumber} — o scurtă recapitulare te-ar ajuta.`
              : language === 'el'
                ? `Μπορείτε να συνεχίσετε, αλλά δεν έχετε κατακτήσει ακόμη το Στάδιο ${mastery.blockingStage.stageNumber} — μια σύντομη επανάληψη θα βοηθούσε.`
                : language === 'de'
                  ? `Du kannst weitermachen, aber du hast Stufe ${mastery.blockingStage.stageNumber} noch nicht gemeistert — eine kurze Wiederholung würde helfen.`
                  : language === 'fr'
                    ? `Vous pouvez continuer, mais vous n'avez pas encore maîtrisé l'étape ${mastery.blockingStage.stageNumber} — une courte révision serait utile.`
                    : language === 'it'
                      ? `Puoi continuare, ma non hai ancora padroneggiato la Fase ${mastery.blockingStage.stageNumber} — un rapido ripasso sarebbe utile.`
                      : language === 'ar'
                        ? `يمكنك المتابعة، لكنك لم تُتقن المرحلة ${mastery.blockingStage.stageNumber} بعد — ستساعدك مراجعة سريعة.`
                        : `You can keep going, but you haven't mastered Stage ${mastery.blockingStage.stageNumber} yet — a quick review would help.`}
          </p>
          <button
            onClick={() => setAdvisoryDismissed(true)}
            aria-label={
              language === 'ro'
                ? 'Închide'
                : language === 'el'
                  ? 'Κλείσιμο'
                  : language === 'de'
                    ? 'Schließen'
                    : language === 'fr'
                      ? 'Fermer'
                      : language === 'it'
                        ? 'Chiudi'
                        : language === 'ar'
                          ? 'إغلاق'
                          : 'Dismiss'
            }
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {children}
    </>
  );
}
