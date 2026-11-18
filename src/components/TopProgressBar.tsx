'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Complete progress bar on route change
  useEffect(() => {
    if (progress > 0) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept clicks on internal navigation links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Only handle internal app links (not mailto:, #, external, download, target="_blank")
      if (
        href.startsWith('/') &&
        !href.startsWith('//') &&
        target.target !== '_blank' &&
        !target.hasAttribute('download')
      ) {
        const url = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Don't trigger for exact same page/hash
        if (url.pathname === currentUrl.pathname && url.search === currentUrl.search) {
          return;
        }

        // Trigger immediate progress
        if (timerRef.current) clearTimeout(timerRef.current);
        setVisible(true);
        setProgress(25);

        timerRef.current = setTimeout(() => {
          setProgress(75);
        }, 100);
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 999999,
        pointerEvents: 'none',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
          boxShadow: '0 0 10px rgba(99, 102, 241, 0.6)',
          transition: progress === 100 ? 'width 0.15s ease-out, opacity 0.2s 0.1s' : 'width 0.3s cubic-bezier(0.1, 0.05, 0, 1)',
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}

