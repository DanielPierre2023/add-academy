// Sentry browser init (W0.4). No-op unless NEXT_PUBLIC_SENTRY_DSN is set.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Session Replay off by default (privacy + free-tier friendly). Turn on later
    // by raising these if you want it.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  });
}

// Instrument client-side navigations for tracing (no-op without a DSN).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
