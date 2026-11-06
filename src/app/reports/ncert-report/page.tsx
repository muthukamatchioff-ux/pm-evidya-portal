import { Metadata } from 'next';
import { requireAuth } from '@/lib/auth';
import { getNcertReportData } from './actions';
import NcertReportClient from './NcertReportClient';

export const metadata: Metadata = {
  title: 'NCERT Report — Monthly / Quarterly Activity & Fund Tracker | PM e-Vidya',
  description: 'Authoritative 45-column automated NCERT activity and fund tracker for PM e-Vidya channels MSDE 22 to 27',
};

export const dynamic = 'force-dynamic';

export default async function NcertReportPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER']);
  const initialData = await getNcertReportData({
    budgetMode: 'portal',
    accountingBasis: 'full_consolidated',
  });

  return <NcertReportClient initialData={initialData} />;
}

