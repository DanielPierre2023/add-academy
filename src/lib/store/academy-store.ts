'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language, LectureProgress, AIMessage, GamificationStats } from '@/types';
import { XP_VALUES, levelFromXp, xpForLevel, ACHIEVEMENTS, STAGES } from '@/types';

interface XPEvent {
  type: 'lecture' | 'code' | 'quiz' | 'quiz_perfect' | 'daily' | 'tutor';
  amount: number;
  lectureId?: string;
  timestamp: string;
}

interface AcademyState {
  // Language & Theme
  language: Language;
  setLanguage: (lang: Language) => void;

  // Navigation
  currentLecture: string;
  setCurrentLecture: (id: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  tutorOpen: boolean;
  setTutorOpen: (open: boolean) => void;

  // Progress
  progress: Record<string, LectureProgress>;
  updateProgress: (lectureId: string, update: Partial<LectureProgress>) => void;
  markCompleted: (lectureId: string) => void;
  getCompletionPercentage: () => number;

  // Quiz
  quizScores: Record<string, number>;
  setQuizScore: (lectureId: string, score: number) => void;

  // AI Tutor
  tutorMessages: AIMessage[];
  addTutorMessage: (message: AIMessage) => void;
  clearTutorMessages: () => void;
  tutorMode: 'explain' | 'debug' | 'build';
  setTutorMode: (mode: 'explain' | 'debug' | 'build') => void;

  // Tracking
  lectureEntryTime: number;
  scrolledToBottom: boolean;
  setScrolledToBottom: (v: boolean) => void;

  // Gamification
  xp: number;
  streak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  unlockedAchievements: string[];
  xpEvents: XPEvent[]; // last 50 events for the activity feed
  totalCodeBlocksRun: number;

  // Gamification actions
  awardXP: (type: XPEvent['type'], amount: number, lectureId?: string) => {
    xpGained: number;
    leveledUp: boolean;
    newLevel: number;
    newAchievements: string[];
  };
  checkStreak: () => void;
  getGamificationStats: () => GamificationStats;
  getLevel: () => number;
  getXPProgress: () => { current: number; needed: number; percentage: number };
}

const TOTAL_LECTURES = 49; // 44 main + 5 genai

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set, get) => ({
      // Language
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),

      // Navigation
      currentLecture: 'home',
      setCurrentLecture: (id) =>
        set({ currentLecture: id, lectureEntryTime: Date.now(), scrolledToBottom: false }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      tutorOpen: false,
      setTutorOpen: (open) => set({ tutorOpen: open }),

      // Progress
      progress: {},
      updateProgress: (lectureId, update) =>
        set((state) => {
          const existing = state.progress[lectureId];
          return {
            progress: {
              ...state.progress,
              [lectureId]: {
                lectureId,
                completed: existing?.completed ?? false,
                scrolledToBottom: existing?.scrolledToBottom ?? false,
                timeSpent: existing?.timeSpent ?? 0,
                quizScore: existing?.quizScore ?? null,
                quizAttempted: existing?.quizAttempted ?? false,
                codeBlocksRun: existing?.codeBlocksRun ?? [],
                completedAt: existing?.completedAt ?? null,
                ...update,
              },
            },
          };
        }),
      markCompleted: (lectureId) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [lectureId]: {
              ...state.progress[lectureId],
              lectureId,
              completed: true,
              completedAt: new Date().toISOString(),
              scrolledToBottom: true,
              timeSpent: state.progress[lectureId]?.timeSpent ?? 0,
              quizScore: state.progress[lectureId]?.quizScore ?? null,
              quizAttempted: state.progress[lectureId]?.quizAttempted ?? false,
              codeBlocksRun: state.progress[lectureId]?.codeBlocksRun ?? [],
            },
          },
        })),
      getCompletionPercentage: () => {
        const { progress } = get();
        const completed = Object.values(progress).filter((p) => p.completed).length;
        return Math.round((completed / TOTAL_LECTURES) * 100);
      },

      // Quiz
      quizScores: {},
      setQuizScore: (lectureId, score) =>
        set((state) => ({
          quizScores: { ...state.quizScores, [lectureId]: score },
        })),

      // AI Tutor
      tutorMessages: [],
      addTutorMessage: (message) =>
        set((state) => ({
          tutorMessages: [...state.tutorMessages, message],
        })),
      clearTutorMessages: () => set({ tutorMessages: [] }),
      tutorMode: 'explain',
      setTutorMode: (mode) => set({ tutorMode: mode }),

      // Tracking
      lectureEntryTime: Date.now(),
      scrolledToBottom: false,
      setScrolledToBottom: (v) => set({ scrolledToBottom: v }),

      // Gamification state
      xp: 0,
      streak: 0,
      lastActiveDate: null,
      unlockedAchievements: [],
      xpEvents: [],
      totalCodeBlocksRun: 0,

      // Gamification actions
      awardXP: (type, amount, lectureId) => {
        const state = get();
        const prevLevel = levelFromXp(state.xp);
        const newXP = state.xp + amount;
        const newLevel = levelFromXp(newXP);
        const leveledUp = newLevel > prevLevel;

        const event: XPEvent = {
          type,
          amount,
          lectureId,
          timestamp: new Date().toISOString(),
        };

        // Update streak
        const today = todayString();
        let newStreak = state.streak;
        if (state.lastActiveDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (state.lastActiveDate === yesterdayStr) {
            newStreak = state.streak + 1;
          } else if (state.lastActiveDate !== today) {
            newStreak = 1;
          }
        }

        // Calculate new totalCodeBlocksRun
        const newCodeBlocks = state.totalCodeBlocksRun + (type === 'code' ? 1 : 0);

        // Check for new achievements
        const stats = get().getGamificationStats();
        // Override with updated values
        const updatedStats: GamificationStats = {
          ...stats,
          xp: newXP,
          level: newLevel,
          streak: newStreak,
          codeBlocksRun: newCodeBlocks,
          perfectQuizzes: stats.perfectQuizzes + (type === 'quiz_perfect' ? 1 : 0),
        };

        const newAchievements: string[] = [];
        for (const achievement of ACHIEVEMENTS) {
          if (
            !state.unlockedAchievements.includes(achievement.id) &&
            achievement.condition(updatedStats)
          ) {
            newAchievements.push(achievement.id);
          }
        }

        set({
          xp: newXP,
          streak: newStreak,
          lastActiveDate: today,
          totalCodeBlocksRun: newCodeBlocks,
          unlockedAchievements: [...state.unlockedAchievements, ...newAchievements],
          xpEvents: [event, ...state.xpEvents].slice(0, 50),
        });

        return {
          xpGained: amount,
          leveledUp,
          newLevel,
          newAchievements,
        };
      },

      checkStreak: () => {
        const state = get();
        const today = todayString();
        if (state.lastActiveDate === today) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (state.lastActiveDate === yesterdayStr) {
          // Continue streak
          set({ streak: state.streak + 1, lastActiveDate: today });
        } else {
          // Streak broken
          set({ streak: 1, lastActiveDate: today });
        }
      },

      getGamificationStats: () => {
        const state = get();
        const completedLectures = Object.values(state.progress).filter((p) => p.completed).length;
        const quizzesAttempted = Object.keys(state.quizScores).length;
        const perfectQuizzes = Object.values(state.quizScores).filter((s) => s === 100).length;
        const totalTime = Object.values(state.progress).reduce((sum, p) => sum + (p.timeSpent || 0), 0);

        // Count completed stages
        let stagesCompleted = 0;
        for (const stage of STAGES) {
          const allDone = stage.lectures.every((lid) => state.progress[lid]?.completed);
          if (allDone && stage.lectures.length > 0) stagesCompleted++;
        }

        return {
          xp: state.xp,
          level: levelFromXp(state.xp),
          streak: state.streak,
          lecturesCompleted: completedLectures,
          quizzesAttempted,
          perfectQuizzes,
          codeBlocksRun: state.totalCodeBlocksRun,
          totalTimeSeconds: totalTime,
          stagesCompleted,
        };
      },

      getLevel: () => levelFromXp(get().xp),

      getXPProgress: () => {
        const xp = get().xp;
        const level = levelFromXp(xp);
        const currentLevelXP = xpForLevel(level);
        const nextLevelXP = xpForLevel(level + 1);
        const progressXP = xp - currentLevelXP;
        const neededXP = nextLevelXP - currentLevelXP;
        return {
          current: progressXP,
          needed: neededXP,
          percentage: neededXP > 0 ? Math.round((progressXP / neededXP) * 100) : 100,
        };
      },
    }),
    {
      name: 'add-academy-store',
      partialize: (state) => ({
        language: state.language,
        currentLecture: state.currentLecture,
        progress: state.progress,
        quizScores: state.quizScores,
        // Gamification persisted
        xp: state.xp,
        streak: state.streak,
        lastActiveDate: state.lastActiveDate,
        unlockedAchievements: state.unlockedAchievements,
        xpEvents: state.xpEvents,
        totalCodeBlocksRun: state.totalCodeBlocksRun,
      }),
    }
  )
);
