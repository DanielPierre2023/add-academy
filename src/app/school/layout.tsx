import { Header } from '@/components/layout/header';

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
        {children}
      </main>
    </>
  );
}
