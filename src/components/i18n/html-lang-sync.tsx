'use client';

import { useEffect } from 'react';
import { useAcademyStore } from '@/lib/store/academy-store';

/**
 * Keeps the <html lang="..."> attribute in sync with the
 * language stored in the Zustand academy store (client-side).
 */
export function HtmlLangSync() {
  const language = useAcademyStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}
