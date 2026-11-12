import './globals.css';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { getRole } from '@/lib/auth';
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'PM e-Vidya Accounts & Document Management Portal',
  description: 'Internal Accounts and Document Monitoring System',
};

import SessionWarmer from '@/components/SessionWarmer';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getRole();
  const isAuthenticated = role !== 'VISITOR';
  
  return (
    <html lang="en">
      <body className={inter.className}>
        {isAuthenticated && <SessionWarmer role={role} />}
        <ClientLayoutWrapper
          sidebar={isAuthenticated ? <Sidebar /> : null}
          header={isAuthenticated ? <Header role={role} /> : null}
        >
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
