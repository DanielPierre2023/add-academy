import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // W4.3 — don't advertise the framework/version in a response header.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: self + Pyodide CDN + Next.js inline scripts
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://www.googletagmanager.com",
              // Styles: self + inline (Tailwind, component styles)
              "style-src 'self' 'unsafe-inline'",
              // Images: self + Supabase storage + Google avatars + data URIs
              "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com",
              // Fonts: self + Google Fonts CDN
              "font-src 'self' https://fonts.gstatic.com",
              // Connect: self + Supabase + Pyodide packages + Stripe + Gemini API
              // GA4 posts to regional collection hosts (e.g. region1.google-analytics.com),
              // so the wildcard is required — the exact www host alone silently drops beacons.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://api.stripe.com https://generativelanguage.googleapis.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://*.ingest.sentry.io",
              // Workers: Pyodide uses web workers
              "worker-src 'self' blob:",
              // Frames: none except Stripe checkout iframe
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              // Defence in depth alongside X-Frame-Options: DENY
              "frame-ancestors 'none'",
              // Base URI: prevent <base> hijacking
              "base-uri 'self'",
              // Form actions: self only
              "form-action 'self'",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

// W0.4 — wrap with Sentry ONLY when Sentry env is present. With no Sentry env,
// the config (and CSP) is returned untouched, so the build is identical to
// before Sentry was added. Source-map upload runs only when SENTRY_AUTH_TOKEN
// is set (i.e. in CI/Vercel), never locally.
import { withSentryConfig } from '@sentry/nextjs';

const sentryEnabled = Boolean(
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      // Only attempt source-map upload when an auth token is available.
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
    })
  : nextConfig;
