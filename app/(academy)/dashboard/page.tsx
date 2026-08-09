'use client';

import dynamic from 'next/dynamic';

const DashboardView = dynamic(() => import('./dashboard-view'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardView />;
}
