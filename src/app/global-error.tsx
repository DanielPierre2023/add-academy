'use client';

/**
 * Global error boundary — catches unhandled errors in the root layout.
 * Must provide its own <html> and <body> since the root layout may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0a0a2e', color: '#fff' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#8888bb', maxWidth: '28rem', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Our team has been notified.
            {error.digest && (
              <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.5rem', color: '#666' }}>
                Error ID: {error.digest}
              </span>
            )}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#0504AA',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: '0.625rem 1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #333',
                background: 'transparent',
                color: '#fff',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
