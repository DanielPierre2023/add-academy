'use client';

import { useEffect } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';

const RTL_LANGUAGES = new Set(['ar']);

/**
 * Keeps the <html lang="..."> and <html dir="..."> attributes in sync with
 * the language stored in the Zustand academy store (client-side). Arabic
 * (and any future RTL language added to RTL_LANGUAGES) flips the document
 * direction so native RTL layout, text alignment, and scrollbars kick in.
 */
export function HtmlLangSync() {
  const language = useAcademyStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
  }, [language]);

  return null;
}
