import type { Metadata } from 'next';
import { Manrope, Fraunces } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { XPToastContainer } from '@/components/gamification/xp-toast';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ADD Academy — Build LLMs from Scratch',
  description:
    'An interactive course that takes you from zero to building large language models from scratch. Learn transformers, attention, tokenization, training, and deployment — with hands-on code in every lecture.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <XPToastContainer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
