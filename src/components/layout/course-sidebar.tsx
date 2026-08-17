'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  BookOpen,
  Code,
  HelpCircle,
  Search,
  X,
  Star,
  Map,
  LayoutDashboard,
  CreditCard,
  Shield,
  Download,
  Lock,
  BarChart3,
  Repeat,
  Award,
  Bookmark,
  MessagesSquare,
} from 'lucide-react';
import type { Language } from '@/types';
import { STAGES } from '@/types';
import { t } from '@/lib/i18n';
import { getLectureIndex, type LectureIndexEntry } from '@/lib/lectures';
import { useAcademyStore } from '@/lib/store/academy-store';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

function findStageForLecture(lectureId: string): number {
  for (const stage of STAGES) {
    if (stage.lectures.includes(lectureId)) return stage.number;
  }
  return -1;
}

/** Stage section label mapping for the sidebar */
const STAGE_SECTIONS: Record<number, Record<string, string>> = {
  0: { en: 'GETTING STARTED', ro: 'INTRODUCERE', el: 'ΕΙΣΑΓΩΓΗ', de: 'ERSTE SCHRITTE', fr: 'POUR COMMENCER', it: 'PER INIZIARE', ar: 'البداية' },
  1: { en: 'STAGE 1: LLM FUNDAMENTALS', ro: 'ETAPA 1: FUNDAMENTELE LLM', el: 'ΣΤΑΔΙΟ 1: ΘΕΜΕΛΙΑ LLM', de: 'STUFE 1: LLM-GRUNDLAGEN', fr: 'ÉTAPE 1 : FONDAMENTAUX DES LLM', it: 'FASE 1: FONDAMENTI DEGLI LLM', ar: 'المرحلة 1: أساسيات النماذج اللغوية الكبيرة' },
  2: { en: 'STAGE 2: TOKENIZATION & DATA', ro: 'ETAPA 2: DATE & TOKENIZARE', el: 'ΣΤΑΔΙΟ 2: TOKENIZATION', de: 'STUFE 2: TOKENISIERUNG & DATEN', fr: 'ÉTAPE 2 : TOKENISATION ET DONNÉES', it: 'FASE 2: TOKENIZZAZIONE E DATI', ar: 'المرحلة 2: الترميز والبيانات' },
  3: { en: 'STAGE 3: ATTENTION MECHANISM', ro: 'ETAPA 3: MECANISMUL DE ATENȚIE', el: 'ΣΤΑΔΙΟ 3: ΜΗΧΑΝΙΣΜΟΣ ΠΡΟΣΟΧΗΣ', de: 'STUFE 3: AUFMERKSAMKEITSMECHANISMUS', fr: "ÉTAPE 3 : MÉCANISME D'ATTENTION", it: 'FASE 3: MECCANISMO DI ATTENZIONE', ar: 'المرحلة 3: آلية الانتباه' },
  4: { en: 'STAGE 4: TRANSFORMER ARCH.', ro: 'ETAPA 4: ARHITECTURA TRANSFORMER', el: 'ΣΤΑΔΙΟ 4: ΑΡΧΙΤΕΚΤΟΝΙΚΗ', de: 'STUFE 4: TRANSFORMER-ARCHITEKTUR', fr: 'ÉTAPE 4 : ARCHITECTURE TRANSFORMER', it: 'FASE 4: ARCHITETTURA TRANSFORMER', ar: 'المرحلة 4: بنية المحوّل (ترانسفورمر)' },
  5: { en: 'STAGE 5: PRETRAINING', ro: 'ETAPA 5: PRE-ANTRENAMENT', el: 'ΣΤΑΔΙΟ 5: ΠΡΟΕΚΠΑΙΔΕΥΣΗ', de: 'STUFE 5: VORTRAINING', fr: 'ÉTAPE 5 : PRÉ-ENTRAÎNEMENT', it: 'FASE 5: PRE-ADDESTRAMENTO', ar: 'المرحلة 5: التدريب المسبق' },
  6: { en: 'STAGE 6: FINE-TUNING & DEPLOY', ro: 'ETAPA 6: AJUSTARE & DEPLOYMENT', el: 'ΣΤΑΔΙΟ 6: ΜΙΚΡΟΡΥΘΜΙΣΗ', de: 'STUFE 6: FEINABSTIMMUNG & BEREITSTELLUNG', fr: 'ÉTAPE 6 : AJUSTEMENT ET DÉPLOIEMENT', it: 'FASE 6: FINE-TUNING E DEPLOY', ar: 'المرحلة 6: الضبط الدقيق والنشر' },
  7: { en: 'STAGE 7: GENAI SAAS', ro: 'ETAPA 7: GENAI SAAS', el: 'ΣΤΑΔΙΟ 7: GENAI SAAS', de: 'STUFE 7: GENAI SAAS', fr: 'ÉTAPE 7 : GENAI SAAS', it: 'FASE 7: GENAI SAAS', ar: 'المرحلة 7: GenAI SaaS' },
};

export function CourseSidebar() {
  const language = useAcademyStore((s) => s.language);
  const { user, isAdmin, isOrgUser, canAccessStage } = useAuth();
  const currentLecture = useAcademyStore((s) => s.currentLecture);
  const setCurrentLecture = useAcademyStore((s) => s.setCurrentLecture);
  const sidebarOpen = useAcademyStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAcademyStore((s) => s.setSidebarOpen);
  const progress = useAcademyStore((s) => s.progress);

  const [searchQuery, setSearchQuery] = useState('');
  const [courseMapOpen, setCourseMapOpen] = useState(true);

  // The store's `sidebarOpen` defaults to true so the sidebar is always
  // visible on desktop (where it's pinned via `lg:translate-x-0` regardless
  // of this flag). Below the `lg` breakpoint the sidebar renders as a
  // full-height overlay drawer instead, so that same default-true value used
  // to open it — and its backdrop — on top of the page on first mobile load.
  // Collapse it once, on mount, if we're below that breakpoint.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lectureIndex = useMemo(() => getLectureIndex(), []);
  const lectureMap = useMemo(() => {
    const entries: [string, LectureIndexEntry][] = lectureIndex.lectures.map(
      (entry) => [entry.id, entry] as [string, LectureIndexEntry]
    );
    return Object.fromEntries(entries) as Record<string, LectureIndexEntry>;
  }, [lectureIndex]);

  const currentStage = findStageForLecture(currentLecture);

  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>(
    () => {
      const initial: Record<number, boolean> = {};
      for (const stage of STAGES) {
        initial[stage.number] = stage.number === currentStage;
      }
      return initial;
    }
  );

  const toggleStage = useCallback((stageNumber: number) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageNumber]: !prev[stageNumber],
    }));
  }, []);

  // Filter lectures by search
  const filteredStages = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const result: Record<number, string[]> = {};
    for (const stage of STAGES) {
      const matches = stage.lectures.filter((id) => {
        const entry = lectureMap[id];
        if (!entry) return false;
        const title = (entry.title[language] || entry.title.en || '').toLowerCase();
        return title.includes(q);
      });
      if (matches.length > 0) result[stage.number] = matches;
    }
    return result;
  }, [searchQuery, lectureMap, language]);

  /** Get lecture number within its stage */
  const getLectureNumber = (lectureId: string): number => {
    for (const stage of STAGES) {
      const idx = stage.lectures.indexOf(lectureId);
      if (idx !== -1) {
        // Calculate global number from prior stages
        let offset = 0;
        for (const s of STAGES) {
          if (s.number < stage.number) offset += s.lectures.length;
          else break;
        }
        return offset + idx;
      }
    }
    return 0;
  };

  return (
    <TooltipProvider>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full w-[260px] flex-col',
          'bg-sidebar text-sidebar-foreground',
          'transition-transform duration-300 ease-in-out',
          'lg:z-30 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Search box */}
        <div className="px-3 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/40" />
            <input
              type="text"
              placeholder={t('search', language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/50 py-1.5 pl-8 pr-3 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
            />
          </div>
        </div>

        {/* Course Map toggle */}
        <button
          onClick={() => setCourseMapOpen(!courseMapOpen)}
          className="mx-3 mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
        >
          <Map className="h-4 w-4" />
          <span className="flex-1 text-left text-xs font-medium">
            {t('course_map', language)}
          </span>
          {courseMapOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Mobile close */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-3 right-3 rounded-md p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Lecture list */}
        {courseMapOpen && (
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-3 pb-4">
              {/* Navigation links */}
              <div className="mb-3 space-y-0.5">
                <Link
                  href="/"
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                    currentLecture === ''
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent'
                  )}
                >
                  <Star className="h-3.5 w-3.5 text-sidebar-primary" />
                  <span>
                    {language === 'ro' ? 'Pagina Cursului' : language === 'el' ? 'Σελίδα Μαθήματος' : language === 'de' ? 'Kursseite' : language === 'fr' ? 'Page du cours' : language === 'it' ? 'Pagina del corso' : language === 'ar' ? 'صفحة الدورة' : 'Course Page'}
                  </span>
                </Link>

                {user && (
                  <Link
                    href="/dashboard"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                    <span>{language === 'ro' ? 'Panou de control' : language === 'el' ? 'Πίνακας Ελέγχου' : language === 'de' ? 'Übersicht' : language === 'fr' ? 'Tableau de bord' : language === 'it' ? 'Pannello di controllo' : language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}</span>
                  </Link>
                )}

                {user && (
                  <Link
                    href="/progress"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                  >
                    <BarChart3 className="h-3.5 w-3.5 text-cyan-500" />
                    <span>{language === 'ro' ? 'Progres' : language === 'el' ? 'Πρόοδος' : language === 'de' ? 'Fortschritt' : language === 'fr' ? 'Progression' : language === 'it' ? 'Progressi' : language === 'ar' ? 'التقدم' : 'Progress'}</span>
                  </Link>
                )}

                {user && (
                  <Link
                    href="/review"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                  >
                    <Repeat className="h-3.5 w-3.5 text-violet-500" />
                    <span>{language === 'ro' ? 'Recapitulare' : language === 'el' ? 'Επανάληψη' : language === 'de' ? 'Wiederholung' : language === 'fr' ? 'Révision' : language === 'it' ? 'Ripasso' : language === 'ar' ? 'المراجعة' : 'Review'}</span>
                  </Link>
                )}

                {user && (
                  <Link
                    href="/achievements"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                  >
                    <Award className="h-3.5 w-3.5 text-yellow-500" />
                    <span>{language === 'ro' ? 'Realizări' : language === 'el' ? 'Επιτεύγματα' : language === 'de' ? 'Erfolge' : language === 'fr' ? 'Réussites' : language === 'it' ? 'Traguardi' : language === 'ar' ? 'الإنجازات' : 'Achievements'}</span>
                  </Link>
                )}

                {user && (
                  <Link
                    href="/bookmarks"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                  >
                    <Bookmark className="h-3.5 w-3.5 text-pink-500" />
                    <span>{language === 'ro' ? 'Marcaje' : language === 'el' ? 'Σελιδοδείκτες' : language === 'de' ? 'Lesezeichen' : language === 'fr' ? 'Signets' : language === 'it' ? 'Segnalibri' : language === 'ar' ? 'الإشارات المرجعية' : 'Bookmarks'}</span>
                  </Link>
                )}

                {user && (
                  <Link
                    href="/community"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                  >
                    <MessagesSquare className="h-3.5 w-3.5 text-teal-500" />
                    <span>{language === 'ro' ? 'Comunitate' : language === 'el' ? 'Κοινότητα' : language === 'de' ? 'Gemeinschaft' : language === 'fr' ? 'Communauté' : language === 'it' ? 'Comunità' : language === 'ar' ? 'المجتمع' : 'Community'}</span>
                  </Link>
                )}

                {user && isAdmin && (
                  <Link
                    href="/community/moderation"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                  >
                    <Shield className="h-3.5 w-3.5 text-teal-600" />
                    <span>{language === 'ro' ? 'Moderare' : language === 'el' ? 'Εποπτεία' : language === 'de' ? 'Moderation' : language === 'fr' ? 'Modération' : language === 'it' ? 'Moderazione' : language === 'ar' ? 'الإشراف' : 'Moderation'}</span>
                  </Link>
                )}

                {user && (
                  <Link
                    href="/downloads"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-amber-500" />
                    <span>{language === 'ro' ? 'Descărcări' : language === 'el' ? 'Λήψεις' : language === 'de' ? 'Downloads' : language === 'fr' ? 'Téléchargements' : language === 'it' ? 'Download' : language === 'ar' ? 'التنزيلات' : 'Downloads'}</span>
                  </Link>
                )}

                {user && !isOrgUser && (
                  <Link
                    href="/pricing"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-secondary" />
                    <span>{language === 'ro' ? 'Abonamente' : language === 'el' ? 'Συνδρομές' : language === 'de' ? 'Preise' : language === 'fr' ? 'Tarifs' : language === 'it' ? 'Prezzi' : language === 'ar' ? 'الأسعار' : 'Pricing'}</span>
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                  >
                    <Shield className="h-3.5 w-3.5 text-green-500" />
                    <span>{language === 'ro' ? 'Admin' : language === 'el' ? 'Admin' : language === 'de' ? 'Admin' : language === 'fr' ? 'Admin' : language === 'it' ? 'Admin' : language === 'ar' ? 'الإدارة' : 'Admin'}</span>
                  </Link>
                )}

                <div className="border-b border-sidebar-border my-2" />
              </div>

              {STAGES.map((stage) => {
                const isSearching = filteredStages !== null;
                const visibleLectures = isSearching
                  ? (filteredStages[stage.number] || [])
                  : stage.lectures;

                if (isSearching && visibleLectures.length === 0) return null;

                const isExpanded = isSearching || (expandedStages[stage.number] ?? false);

                // Section label
                const sectionLabel =
                  STAGE_SECTIONS[stage.number]?.[language] ||
                  STAGE_SECTIONS[stage.number]?.en ||
                  stage.name[language] || stage.name.en;

                return (
                  <div key={stage.number} className="mb-1">
                    {/* Stage section label */}
                    <button
                      onClick={() => toggleStage(stage.number)}
                      className="flex w-full items-center gap-1 px-2 pt-3 pb-1"
                    >
                      <motion.span
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0"
                      >
                        <ChevronRight className="h-3 w-3 text-sidebar-foreground/40" />
                      </motion.span>
                      <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-widest text-secondary">
                        {sectionLabel}
                      </span>
                      {stage.number > 1 && !canAccessStage(stage.number) && (
                        <Lock className="h-3 w-3 shrink-0 text-sidebar-foreground/30" />
                      )}
                      <span className="text-[10px] text-sidebar-foreground/40 tabular-nums">
                        {stage.lectures.filter((id) => progress[id]?.completed).length}/{stage.lectures.length}
                      </span>
                    </button>

                    {/* Lecture items — animated accordion */}
                    <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
                        className="space-y-0.5 overflow-hidden"
                      >
                        {visibleLectures.map((lectureId) => {
                          const entry = lectureMap[lectureId];
                          if (!entry) return null;

                          const isActive = currentLecture === lectureId;
                          const isCompleted = progress[lectureId]?.completed ?? false;
                          const title = entry.title[language] || entry.title.en || lectureId;
                          const lectureNum = getLectureNumber(lectureId);

                          return (
                            <Link
                              key={lectureId}
                              href={`/lectures/${entry.id}`}
                              onClick={() => {
                                setCurrentLecture(entry.id);
                                setSidebarOpen(false);
                              }}
                              className={cn(
                                'group flex items-start gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                                isActive
                                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                              )}
                            >
                              {/* Number circle with active pulse */}
                              <span className="relative mt-0.5 shrink-0">
                                {isActive && (
                                  <span className="absolute inset-0 rounded-full bg-sidebar-primary-foreground/30 animate-ping" style={{ animationDuration: '2s' }} />
                                )}
                                <span
                                  className={cn(
                                    'relative flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                                    isCompleted
                                      ? 'bg-green-500 text-white'
                                      : isActive
                                        ? 'bg-sidebar-primary-foreground text-sidebar-primary'
                                        : 'bg-secondary/80 text-secondary-foreground'
                                  )}
                                >
                                  {isCompleted ? '✓' : lectureNum}
                                </span>
                              </span>

                              {/* Title + badges */}
                              <span className="flex-1 leading-snug">
                                <span className="line-clamp-2">{title}</span>
                                {(entry.codeBlockCount > 0 || entry.hasQuiz) && (
                                  <span className="mt-0.5 flex items-center gap-1">
                                    {entry.codeBlockCount > 0 && (
                                      <span className="inline-flex items-center gap-0.5 rounded bg-blue-500/20 px-1 py-0.5 text-[9px] font-semibold text-blue-300">
                                        Code
                                      </span>
                                    )}
                                    {entry.hasQuiz && (
                                      <span className="inline-flex items-center gap-0.5 rounded bg-pink-500/20 px-1 py-0.5 text-[9px] font-semibold text-pink-300">
                                        Quiz
                                      </span>
                                    )}
                                  </span>
                                )}
                              </span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </aside>
    </TooltipProvider>
  );
}
