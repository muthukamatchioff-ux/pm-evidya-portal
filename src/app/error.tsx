'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Application Error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h1 style={{ color: '#0f172a', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          Database Connection Unavailable
        </h1>
        <p style={{ color: '#475569', fontSize: '16px', lineHeight: '1.5', marginBottom: '24px' }}>
          This environment (Preview) is currently running without a database connection. Certain pages or data queries cannot be loaded.
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            style={{
              backgroundColor: '#f1f5f9',
              color: '#334155',
              textDecoration: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: 'bold'
            }}
          >
            Return to Dashboard
          </Link>
        </div>
        
      </div>
    </div>
  );
}
