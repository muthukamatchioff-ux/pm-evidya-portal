'use client';

import React, { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: '#dc2626',
        color: '#ffffff',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
      role="alert"
    >
      <span>⚠️ No Internet Connection. PM e-Vidya operates in internet-only mode to protect data integrity.</span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#ffffff',
          color: '#dc2626',
          border: 'none',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  );
}
