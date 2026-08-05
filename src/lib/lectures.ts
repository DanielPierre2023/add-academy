import type { Language } from '@/types';
import { STAGES } from '@/types';

// Lecture index loaded at build time
import indexData from '@/content/lectures/_index.json';

export interface LectureIndexEntry {
  id: string;
  number: number;
  stage: number;
  stageName: string;
  isGenAI: boolean;
  title: Record<string, string>;
  prev: string | null;
  next: string | null;
  codeBlockCount: number;
  hasQuiz: boolean;
}

export interface LectureIndex {
  lectures: LectureIndexEntry[];
  totalLectures: number;
  totalCodeBlocks: number;
  totalQuizzes: number;
}

export function getLectureIndex(): LectureIndex {
  return indexData as LectureIndex;
}

export function getLectureTitle(id: string, lang: Language): string {
  const entry = (indexData as LectureIndex).lectures.find((l) => l.id === id);
  if (!entry) return id;
  return entry.title[lang] || entry.title.en || id;
}

export function getLecturesByStage(stageNumber: number): LectureIndexEntry[] {
  return (indexData as LectureIndex).lectures.filter((l) => l.stage === stageNumber);
}

export async function getLectureContent(id: string) {
  try {
    const data = await import(`@/content/lectures/${id}.json`);
    return data.default || data;
  } catch {
    return null;
  }
}

export async function getQuizData(id: string) {
  try {
    const data = await import(`@/content/quizzes/${id}.json`);
    return data.default || data;
  } catch {
    return null;
  }
}

export function getStageForLecture(lectureId: string) {
  return STAGES.find((s) => s.lectures.includes(lectureId));
}
