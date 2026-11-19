'use client';

import React, { useEffect, useState } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Log the error for operational observability
    console.error('[PM e-Vidya Error Boundary caught error]:', error);

    // Auto-recover from Next.js Server Reference ID mismatches (e.g., after new production rollout)
    const errorStr = (error?.message || '') + ' ' + (error?.digest || '');
    const isServerActionMismatch =
      errorStr.includes('Server Action') ||
      errorStr.includes('action ID') ||
      errorStr.includes('server reference') ||
      errorStr.includes('Failed to find Server Action');

    if (isServerActionMismatch) {
      try {
        const lastReload = Number(sessionStorage.getItem('pm_last_sa_reload') || '0');
        const now = Date.now();
        if (now - lastReload > 30000) {
          sessionStorage.setItem('pm_last_sa_reload', String(now));
          console.warn('[Auto-Recovery] Detected Server Action mismatch from previous deployment. Reloading active bundle...');
          window.location.reload();
        }
      } catch (_) {}
    }
  }, [error]);

  const handleRetry = () => {
    setRetrying(true);
    try {
      reset();
    } finally {
      setTimeout(() => setRetrying(false), 1000);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '42px', marginBottom: '16px' }}>⚡</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
          Portal Connection Interrupted
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
          A temporary network or database delay occurred. All portal records and financial data remain safe and intact.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleRetry}
            disabled={retrying}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: retrying ? 'not-allowed' : 'pointer',
              opacity: retrying ? 0.7 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            {retrying ? 'Reconnecting...' : 'Retry Connection'}
          </button>

          <button
            onClick={handleReload}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Reload Portal
          </button>
        </div>
      </div>
    </div>
  );
}

