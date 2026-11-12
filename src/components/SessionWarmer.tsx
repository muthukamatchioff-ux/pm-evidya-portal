'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SESSION_WARMED_KEY = 'pm_evidya_session_warmed_v1';

const ADMIN_WARM_ROUTES = [
  '/budget',
  '/budget/annexure-1',
  '/budget/annexure-2',
  '/budget/annexure-3',
  '/budget/annexure-4',
  '/budget/annexure-5',
  '/budget/annexure-6',
  '/reports/monthly-expenditure',
  '/reports/ncert-report',
  '/production-workflow',
  '/smes',
  '/documents',
  '/content',
  '/video-production',
  '/accounts',
  '/reports',
];

const STAFF_WARM_ROUTES = ['/video-production', '/content', '/reports'];

/**
 * Non-blocking post-login background warmer.
 * Step 1: Primes shared Vercel Data Cache across all modules in a single request (`/api/warmup?phase=all`).
 * Step 2: Gently prefetches head routes 2-at-a-time during idle time so first-click head navigation is instant
 * without creating an SSR concurrency storm on initial page load.
 */
export default function SessionWarmer({ role }: { role: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!role || role === 'VISITOR' || typeof window === 'undefined') return;
    if (sessionStorage.getItem(SESSION_WARMED_KEY) === '1') return;

    sessionStorage.setItem(SESSION_WARMED_KEY, '1');
    let cancelled = false;

    const runWarmup = async () => {
      try {
        await fetch('/api/warmup?phase=all', { cache: 'no-store' });
      } catch {}

      if (cancelled) return;

      const normalized = role.toUpperCase().trim();
      const routes =
        normalized === 'CAMERAMAN' || normalized === 'EDITOR'
          ? STAFF_WARM_ROUTES
          : ADMIN_WARM_ROUTES;

      // Staggered batches of 2 routes every 200ms so active navigation stays uncontended
      for (let i = 0; i < routes.length; i += 2) {
        if (cancelled) return;
        const batch = routes.slice(i, i + 2);
        for (const route of batch) {
          try {
            router.prefetch(route);
          } catch {}
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    };

    const timer = setTimeout(() => {
      runWarmup();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [role, router]);

  return null;
}

