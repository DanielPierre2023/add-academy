'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Something went wrong</h2>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>An unexpected error occurred. Please try again.</p>
      <button
        onClick={reset}
        style={{ padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #333', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}
      >
        Try again
      </button>
    </div>
  );
}
