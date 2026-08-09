'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CourseSidebar } from '@/components/layout/course-sidebar';
import { AITutor } from '@/components/academy/ai-tutor';
import { KeyboardNav } from '@/components/academy/keyboard-nav';
import { BugReportButton } from '@/components/academy/bug-report';

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Sticky header */}
      <Header />

      {/* Content area below header */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — always visible on desktop */}
        <CourseSidebar />

        {/* Main content — offset by sidebar width on desktop */}
        <main id="main-content" className="flex-1 overflow-y-auto lg:ml-[260px]">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
          <Footer />
        </main>

        {/* AI Tutor sliding panel */}
        <AITutor />
      </div>

      {/* Keyboard shortcuts */}
      <KeyboardNav />

      {/* Bug report floating button */}
      <BugReportButton />
    </div>
  );
}
