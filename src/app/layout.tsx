import './globals.css';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import Header from '@/components/Header';
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';
import SessionWarmer from '@/components/SessionWarmer';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'PM e-Vidya Accounts & Document Management Portal',
  description: 'Internal Accounts and Document Monitoring System',
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
      <body className={inter.className}>
        {isAuthenticated && <SessionWarmer role={role} />}
        <ClientLayoutWrapper
          sidebar={SidebarComponent ? <SidebarComponent /> : null}
          header={isAuthenticated ? <Header role={role} /> : null}
        >
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
