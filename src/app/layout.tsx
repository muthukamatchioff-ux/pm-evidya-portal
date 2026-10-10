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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getRole();
  
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayoutWrapper sidebar={<Sidebar />} header={<Header role={role} />}>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
