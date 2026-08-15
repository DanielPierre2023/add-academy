// Next.js instrumentation hook (W0.4). Loads the right Sentry server config per
// runtime. Both configs no-op without a DSN, so this is safe with no env set.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Report nested React Server Component / route errors to Sentry (no-op w/o DSN).
export const onRequestError = Sentry.captureRequestError;
