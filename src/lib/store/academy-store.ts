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

interface QuizAttempt {
  lectureId: string;
  questionIndex: number;
  correct: boolean;
  timestamp: string;
  difficulty: 'easy' | 'medium' | 'hard';
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

  // Adaptive Difficulty
  quizAttempts: QuizAttempt[];
  addQuizAttempt: (attempt: QuizAttempt) => void;
  getDifficultyLevel: () => 'easy' | 'medium' | 'hard';
  getWeakTopics: () => string[];

  // Bookmarks
  bookmarks: string[];
  toggleBookmark: (lectureId: string) => void;
  isBookmarked: (lectureId: string) => boolean;

  // Spaced Repetition
  reviewQueue: Array<{ lectureId: string; questionIndex: number; nextReview: string; interval: number }>;
  addToReviewQueue: (lectureId: string, questionIndex: number) => void;
  getReviewsDue: () => Array<{ lectureId: string; questionIndex: number; nextReview: string; interval: number }>;
  completeReview: (lectureId: string, questionIndex: number, correct: boolean) => void;
}

// Dynamically compute total lectures from STAGES to stay in sync
const TOTAL_LECTURES = STAGES.reduce((sum, stage) => sum + stage.lectures.length, 0);

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
      setCurrentLecture: (id) => {
        // Only update entry time if actually changing to a different lecture
        const current = get().currentLecture;
        if (current === id) return;
        set({ currentLecture: id, lectureEntryTime: Date.now(), scrolledToBottom: false });
      },
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
        // For level 1, progress starts from 0; for higher levels, from previous level threshold
        const prevLevelXP = level <= 1 ? 0 : xpForLevel(level);
        const nextLevelXP = xpForLevel(level + 1);
        const progressXP = Math.max(0, xp - prevLevelXP);
        const neededXP = nextLevelXP - prevLevelXP;
        return {
          current: progressXP,
          needed: neededXP,
          percentage: neededXP > 0 ? Math.min(100, Math.round((progressXP / neededXP) * 100)) : 100,
        };
      },

      // Adaptive Difficulty
      quizAttempts: [],
      addQuizAttempt: (attempt) =>
        set((state) => ({
          // slice AFTER appending — the previous order (slice then append)
          // let the array settle at 201 entries instead of the intended 200.
          quizAttempts: [...state.quizAttempts, attempt].slice(-200),
        })),
      getDifficultyLevel: () => {
        const { quizAttempts } = get();
        if (quizAttempts.length < 5) return 'medium';
        const recent = quizAttempts.slice(-20);
        const correctRate = recent.filter((a) => a.correct).length / recent.length;
        if (correctRate >= 0.8) return 'hard';
        if (correctRate <= 0.4) return 'easy';
        return 'medium';
      },
      getWeakTopics: () => {
        const { quizAttempts } = get();
        const byLecture: Record<string, { correct: number; total: number }> = {};
        for (const attempt of quizAttempts) {
          if (!byLecture[attempt.lectureId]) {
            byLecture[attempt.lectureId] = { correct: 0, total: 0 };
          }
          byLecture[attempt.lectureId].total++;
          if (attempt.correct) byLecture[attempt.lectureId].correct++;
        }
        return Object.entries(byLecture)
          .filter(([, stats]) => stats.total >= 2 && stats.correct / stats.total < 0.5)
          .map(([lectureId]) => lectureId);
      },

      // Bookmarks
      bookmarks: [],
      toggleBookmark: (lectureId) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(lectureId)
            ? state.bookmarks.filter((id) => id !== lectureId)
            : [...state.bookmarks, lectureId],
        })),
      isBookmarked: (lectureId) => get().bookmarks.includes(lectureId),

      // Spaced Repetition
      reviewQueue: [],
      addToReviewQueue: (lectureId, questionIndex) =>
        set((state) => {
          const exists = state.reviewQueue.some(
            (r) => r.lectureId === lectureId && r.questionIndex === questionIndex
          );
          if (exists) return state;
          return {
            reviewQueue: [
              ...state.reviewQueue,
              {
                lectureId,
                questionIndex,
                nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                interval: 1, // days
              },
            ],
          };
        }),
      getReviewsDue: () => {
        const now = new Date().toISOString();
        return get().reviewQueue.filter((r) => r.nextReview <= now);
      },
      completeReview: (lectureId, questionIndex, correct) =>
        set((state) => ({
          reviewQueue: state.reviewQueue.map((r) => {
            if (r.lectureId !== lectureId || r.questionIndex !== questionIndex) return r;
            const newInterval = correct ? Math.min(r.interval * 2.5, 30) : 1;
            return {
              ...r,
              interval: newInterval,
              nextReview: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000).toISOString(),
            };
          }),
        })),
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
        // Adaptive difficulty & features persisted
        quizAttempts: state.quizAttempts,
        bookmarks: state.bookmarks,
        reviewQueue: state.reviewQueue,
      }),
    }
  )
);
