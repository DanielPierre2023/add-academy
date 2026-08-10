import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
              // Styles: self + inline (Tailwind, component styles)
              "style-src 'self' 'unsafe-inline'",
              // Images: self + Supabase storage + Google avatars + data URIs
              "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com",
              // Fonts: self + Google Fonts CDN
              "font-src 'self' https://fonts.gstatic.com",
              // Connect: self + Supabase + Pyodide packages + Stripe + Gemini API
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://api.stripe.com https://generativelanguage.googleapis.com",
              // Workers: Pyodide uses web workers
              "worker-src 'self' blob:",
              // Frames: none except Stripe checkout iframe
              "frame-src https://js.stripe.com https://hooks.stripe.com",
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

export default nextConfig;
