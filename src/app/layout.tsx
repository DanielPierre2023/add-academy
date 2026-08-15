import type { Metadata } from 'next';
import { Manrope, Fraunces } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { AuthProvider } from '@/lib/auth/auth-context';
import { XPToastContainer } from '@/components/gamification/xp-toast';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';
import { HtmlLangSync } from '@/components/i18n/html-lang-sync';
import { ProgressSyncProvider } from '@/components/academy/progress-sync-provider';
import { JsonLd } from '@/components/seo/json-ld';
import { getLectureIndex } from '@/lib/lectures';

const SITE_URL = 'https://academy.add-individual-solutions.com';

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

/**
 * Dynamic metadata — pulls lecture/code-block/quiz counts from the
 * single source of truth (_index.json) so they never go stale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const index = getLectureIndex();
  const { totalLectures, totalCodeBlocks, totalQuizzes } = index;

  const statsLine = `${totalLectures} lectures, ${totalCodeBlocks} code blocks, ${totalQuizzes} quizzes across 3 languages`;

  return {
    title: {
      default: 'ADD Academica — Build LLMs from Scratch',
      template: '%s | ADD Academica',
    },
    description:
      'An interactive course that takes you from zero to building large language models from scratch. Learn transformers, attention, tokenization, training, and deployment — with hands-on code in every lecture.',
    keywords: [
      'LLM', 'large language model', 'machine learning', 'AI course',
      'transformers', 'attention mechanism', 'tokenization', 'fine-tuning',
      'PyTorch', 'deep learning', 'NLP', 'GenAI', 'build LLM from scratch',
      'AgenticAI', 'AI agents', 'ADD Individual Solutions',
    ],
    authors: [{ name: 'ADD Individual Solutions' }],
    creator: 'ADD Individual Solutions',
    publisher: 'ADD Individual Solutions',
    metadataBase: new URL('https://academy.add-individual-solutions.com'),
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: 'https://academy.add-individual-solutions.com',
      siteName: 'ADD Academica',
      title: 'ADD Academica — Build LLMs from Scratch',
      description: `Interactive course: build large language models from scratch. ${statsLine}.`,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: 'ADD Academica — Build LLMs from Scratch',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'ADD Academica — Build LLMs from Scratch',
      description: `Interactive course: build large language models from scratch. ${statsLine}.`,
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
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
    manifest: '/manifest.json',
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // W4.4 — site-wide structured data (Organization + WebSite + Course). Counts
  // come from the same _index.json source of truth used for metadata, so they
  // never drift. Purely additive; renders no visible UI.
  const index = getLectureIndex();
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'ADD Individual Solutions',
      url: SITE_URL,
      logo: `${SITE_URL}/apple-touch-icon.png`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'ADD Academica',
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: ['en', 'ro', 'el'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      '@id': `${SITE_URL}/#course`,
      name: 'Build LLMs from Scratch',
      description:
        'An interactive course that takes you from zero to building large language models from scratch — transformers, attention, tokenization, training, and deployment, with hands-on code in every lecture.',
      url: SITE_URL,
      provider: { '@id': `${SITE_URL}/#organization` },
      inLanguage: ['en', 'ro', 'el'],
      teaches: [
        'Transformers', 'Attention mechanism', 'Tokenization',
        'Neural network training', 'Fine-tuning', 'LLM deployment',
      ],
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: `${index.totalLectures} lectures, ${index.totalCodeBlocks} code blocks`,
      },
      offers: {
        '@type': 'Offer',
        category: 'Free',
        availability: 'https://schema.org/InStock',
      },
    },
  ];

  return (
    <html
      lang="en"
      className={`${manrope.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <JsonLd data={structuredData} />
        {/* Skip to content link for keyboard/screen-reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:outline-none"
        >
          Skip to content
        </a>
        <GoogleAnalytics />
        <ThemeProvider>
          <AuthProvider>
            <HtmlLangSync />
            <ProgressSyncProvider />
            {children}
            <XPToastContainer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
