import { getLectureContent, getQuizData, getLectureIndex } from '@/lib/lectures';
import { LectureViewer } from '@/components/academy/lecture-viewer';
import { ContentGate } from '@/components/academy/content-gate';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const index = getLectureIndex();
  return index.lectures
    .filter((l) => l.id !== 'home')
    .map((l) => ({ id: l.id }));
}

export default async function LecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [content, quiz] = await Promise.all([
    getLectureContent(id),
    getQuizData(id),
  ]);
  if (!content) notFound();

  const index = getLectureIndex();
  const entry = index.lectures.find((l) => l.id === id);

  return (
    <ContentGate lectureId={id}>
      <LectureViewer
        lectureId={id}
        content={content}
        quiz={quiz}
        prev={entry?.prev ?? null}
        next={entry?.next ?? null}
        hasQuiz={entry?.hasQuiz ?? false}
      />
    </ContentGate>
  );
}
