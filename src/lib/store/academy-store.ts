'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language, LectureProgress, AIMessage } from '@/types';

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
}

const TOTAL_LECTURES = 49; // 44 main + 5 genai

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
    }),
    {
      name: 'add-academy-store',
      partialize: (state) => ({
        language: state.language,
        currentLecture: state.currentLecture,
        progress: state.progress,
        quizScores: state.quizScores,
      }),
    }
  )
);
