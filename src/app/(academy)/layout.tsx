'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CourseSidebar } from '@/components/layout/course-sidebar';
import { AITutor } from '@/components/academy/ai-tutor';
import { useAcademyStore } from '@/lib/store/academy-store';

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarOpen = useAcademyStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-full flex-col">
      {/* Sticky header */}
      <Header />

      {/* Content area below header */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <CourseSidebar />

        {/* Main content */}
        <main
          className={`flex-1 overflow-y-auto transition-all duration-300 ${
            sidebarOpen ? 'lg:ml-72' : 'lg:ml-0'
          }`}
        >
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
          <Footer />
        </main>

        {/* AI Tutor sliding panel */}
        <AITutor />
      </div>
    </div>
  );
}
