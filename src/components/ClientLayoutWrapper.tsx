'use client';

import React from 'react';
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
