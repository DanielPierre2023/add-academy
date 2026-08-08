import type { Metadata } from 'next';
import { Manrope, Fraunces } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { XPToastContainer } from '@/components/gamification/xp-toast';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';

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
  title: {
    default: 'ADD Academy — Build LLMs from Scratch',
    template: '%s | ADD Academy',
  },
  description:
    'An interactive course that takes you from zero to building large language models from scratch. Learn transformers, attention, tokenization, training, and deployment — with hands-on code in every lecture.',
  keywords: [
    'LLM', 'large language model', 'machine learning', 'AI course',
    'transformers', 'attention mechanism', 'tokenization', 'fine-tuning',
    'PyTorch', 'deep learning', 'NLP', 'GenAI', 'build LLM from scratch',
  ],
  authors: [{ name: 'ADD Individual Solutions' }],
  creator: 'ADD Individual Solutions',
  publisher: 'ADD Individual Solutions',
  metadataBase: new URL('https://academy.add-individual-solutions.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://academy.add-individual-solutions.com',
    siteName: 'ADD Academy',
    title: 'ADD Academy — Build LLMs from Scratch',
    description:
      'Interactive course: build large language models from scratch. 66 lectures, 274 code blocks, 312 quiz questions across 3 languages.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ADD Academy — Build LLMs from Scratch',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ADD Academy — Build LLMs from Scratch',
    description:
      'Interactive course: build large language models from scratch. 66 lectures, 274 code blocks, 312 quiz questions.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
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
        <GoogleAnalytics />
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
