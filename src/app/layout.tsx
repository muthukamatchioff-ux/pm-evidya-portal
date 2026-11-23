import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import Header from '@/components/Header';
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';
import SessionWarmer from '@/components/SessionWarmer';
import TopProgressBar from '@/components/TopProgressBar';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import OfflineBanner from '@/components/OfflineBanner';
import RealtimeSyncProvider from '@/components/RealtimeSyncProvider';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: 'PM e-Vidya Accounts & Document Management Portal',
  description: 'Internal Accounts and Document Monitoring System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PM e-Vidya',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

async function getFastLayoutRole(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return 'VISITOR';
  try {
    const session = await verifySession(token);
    if (!session || !session.role) return 'VISITOR';
    if (session.exp && Date.now() > session.exp) return 'VISITOR';
    return session.role;
  } catch {
    return 'VISITOR';
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getFastLayoutRole();
  const isAuthenticated = role !== 'VISITOR';
  // Dynamically import Sidebar only for authenticated routes so /login never pulls Prisma/fallbackData on cold start
  const SidebarComponent = isAuthenticated
    ? (await import('@/components/Sidebar')).default
    : null;
  
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="PM e-Vidya" />
      </head>
      <body className={inter.className}>
        <OfflineBanner />
        <ServiceWorkerRegister />
        <RealtimeSyncProvider>
          <Suspense fallback={null}>
            <TopProgressBar />
          </Suspense>
          {isAuthenticated && <SessionWarmer role={role} />}
          <ClientLayoutWrapper
            sidebar={SidebarComponent ? <SidebarComponent /> : null}
            header={isAuthenticated ? <Header role={role} /> : null}
          >
            {children}
          </ClientLayoutWrapper>
        </RealtimeSyncProvider>
      </body>
    </html>
  );
}
