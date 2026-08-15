// Sentry server-side init (W0.4). No-op unless a DSN is configured, so the app
// runs identically before you provision Sentry. CSP already allows *.ingest.sentry.io.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Don't send PII by default; this is an education product.
    sendDefaultPii: false,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  });
}
