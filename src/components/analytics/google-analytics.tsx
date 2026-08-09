'use client';

import Script from 'next/script';
import { useState, useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CONSENT_KEY = 'add-academy-analytics-consent';

function CookieConsent({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur-sm p-4 shadow-lg">
      <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          We use cookies for analytics to improve your experience. No personal data is sold or shared with advertisers.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onDecline}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export function GoogleAnalytics() {
  const [consent, setConsent] = useState<'granted' | 'denied' | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === 'granted' || stored === 'denied') {
        setConsent(stored);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const handleAccept = () => {
    setConsent('granted');
    try { localStorage.setItem(CONSENT_KEY, 'granted'); } catch { /* ignore */ }
  };

  const handleDecline = () => {
    setConsent('denied');
    try { localStorage.setItem(CONSENT_KEY, 'denied'); } catch { /* ignore */ }
  };

  if (!GA_ID) return null;

  // Show consent banner if no choice has been made
  if (consent === null) {
    return <CookieConsent onAccept={handleAccept} onDecline={handleDecline} />;
  }

  // Only load GA if consent was granted
  if (consent !== 'granted') return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
