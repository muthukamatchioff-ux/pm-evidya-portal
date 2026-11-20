'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ClientLayoutWrapper({ 
  children, 
  sidebar, 
  header 
}: { 
  children: React.ReactNode, 
  sidebar: React.ReactNode, 
  header: React.ReactNode 
}) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // Global Auto-Recovery from Server Action Reference Mismatch / Deployment Skew
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = String(reason?.message || reason || '');
      if (
        msg.includes('Server Action') ||
        msg.includes('was not found on the server') ||
        msg.includes('failed-to-find-server-action') ||
        msg.includes('server reference')
      ) {
        console.warn('[Auto-Recovery] Detected stale Server Action reference from a previous deployment. Refreshing active client bundle...');
        event.preventDefault(); // Suppress the red Next.js error banner
        try {
          const lastReload = Number(sessionStorage.getItem('pm_last_sa_reload') || '0');
          const now = Date.now();
          if (now - lastReload > 8000) {
            sessionStorage.setItem('pm_last_sa_reload', String(now));
            window.location.reload();
          }
        } catch (_) {
          window.location.reload();
        }
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = String(event?.message || '');
      if (
        msg.includes('Server Action') ||
        msg.includes('was not found on the server') ||
        msg.includes('failed-to-find-server-action') ||
        msg.includes('server reference')
      ) {
        console.warn('[Auto-Recovery] Detected stale Server Action error. Refreshing active client bundle...');
        event.preventDefault();
        try {
          const lastReload = Number(sessionStorage.getItem('pm_last_sa_reload') || '0');
          const now = Date.now();
          if (now - lastReload > 8000) {
            sessionStorage.setItem('pm_last_sa_reload', String(now));
            window.location.reload();
          }
        } catch (_) {
          window.location.reload();
        }
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
      {sidebar}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 }}>
        {header}
        <main className="main-content" style={{ flex: 1, backgroundColor: 'var(--bg-color)', overflowY: 'auto', padding: '24px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
