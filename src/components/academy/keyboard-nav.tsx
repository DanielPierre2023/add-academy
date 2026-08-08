'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAcademyStore } from '@/lib/store/academy-store';
import { getLectureIndex } from '@/lib/lectures';

/**
 * Keyboard navigation hook for lecture pages.
 * - Left arrow: go to previous lecture
 * - Right arrow: go to next lecture
 * - Shift+T: toggle AI tutor panel
 * - Shift+S: toggle sidebar
 */
export function KeyboardNav() {
  const router = useRouter();
  const currentLecture = useAcademyStore((s) => s.currentLecture);
  const setTutorOpen = useAcademyStore((s) => s.setTutorOpen);
  const tutorOpen = useAcademyStore((s) => s.tutorOpen);
  const setSidebarOpen = useAcademyStore((s) => s.setSidebarOpen);
  const sidebarOpen = useAcademyStore((s) => s.sidebarOpen);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Arrow keys for lecture navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!currentLecture || currentLecture === 'home') return;

        const index = getLectureIndex();
        const entry = index.lectures.find((l) => l.id === currentLecture);
        if (!entry) return;

        if (e.key === 'ArrowLeft' && entry.prev) {
          e.preventDefault();
          router.push(`/lectures/${entry.prev}`);
        } else if (e.key === 'ArrowRight' && entry.next) {
          e.preventDefault();
          router.push(`/lectures/${entry.next}`);
        }
      }

      // Shift+T: toggle AI tutor
      if (e.key === 'T' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setTutorOpen(!tutorOpen);
      }

      // Shift+S: toggle sidebar
      if (e.key === 'S' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLecture, router, setTutorOpen, tutorOpen, setSidebarOpen, sidebarOpen]);

  return null;
}
