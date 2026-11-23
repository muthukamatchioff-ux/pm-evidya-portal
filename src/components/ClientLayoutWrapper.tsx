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

  // Controlled recovery from Next.js Server Action Deployment Skew
  useEffect(() => {
    // 1. Network-layer check: only detect true Next-Action skew (HTTP 500 with 'failed-to-find-server-action')
    if (typeof window !== 'undefined' && !(window as any).__pm_sa_skew_shield) {
      (window as any).__pm_sa_skew_shield = true;
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        // Only inspect if this was a Next.js Server Action request that returned 404 or 500
        const requestInit = args[1] as RequestInit | undefined;
        let hasNextAction = false;
        if (requestInit?.headers) {
          const headers = requestInit.headers;
          hasNextAction = Boolean(
            (headers instanceof Headers && (headers.has('Next-Action') || headers.has('next-action'))) ||
            (typeof headers === 'object' && ('Next-Action' in headers || 'next-action' in headers))
          );
        } else if (args[0] && typeof args[0] === 'object' && 'headers' in args[0]) {
          const reqHeaders = (args[0] as Request).headers;
          hasNextAction = Boolean(reqHeaders && (reqHeaders.has('Next-Action') || reqHeaders.has('next-action')));
        }

        if (hasNextAction && response && (response.status === 500 || response.status === 404)) {
          try {
            const clone = response.clone();
            const text = await clone.text();
            if (
              text.includes('failed-to-find-server-action') ||
              text.includes('was not found on the server')
            ) {
              console.warn('[Auto-Recovery] Confirmed stale Server Action ID from previous deployment. Performing controlled reload...');
              const lastReload = Number(sessionStorage.getItem('pm_last_sa_reload') || '0');
              const now = Date.now();
              if (now - lastReload > 8000) {
                sessionStorage.setItem('pm_last_sa_reload', String(now));
                window.location.reload();
              }
            }
          } catch (_) {}
        }
        return response;
      };
    }

    // 2. Global Unhandled Rejection: handle ONLY confirmed Server Action mismatch errors
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = String(reason?.message || reason || '');
      const isStaleAction =
        (msg.includes('was not found on the server') || msg.includes('failed-to-find-server-action')) &&
        (msg.includes('Server Action') || msg.includes('action'));

      if (isStaleAction) {
        console.warn('[Auto-Recovery] Confirmed stale Server Action reference from a previous deployment. Controlled refresh...');
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
      // Note: Genuine application errors are left untouched so they propagate to error boundaries
    };

    const handleError = (event: ErrorEvent) => {
      const msg = String(event?.message || '');
      const isStaleAction =
        (msg.includes('was not found on the server') || msg.includes('failed-to-find-server-action')) &&
        (msg.includes('Server Action') || msg.includes('action'));

      if (isStaleAction) {
        console.warn('[Auto-Recovery] Confirmed stale Server Action error. Controlled refresh...');
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
