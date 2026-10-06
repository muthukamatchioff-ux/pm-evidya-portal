import './globals.css';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { getRole } from '@/lib/auth';
import { headers } from 'next/headers';

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
  const headersList = await headers();
  const pathname = headersList.get('x-invoke-path') || '';
  
  // Conditionally render sidebar for login page
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <html lang="en">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <div style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header role={role} />
            <main style={{ flex: 1, backgroundColor: 'var(--bg-color)', overflowY: 'auto', padding: '24px' }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
