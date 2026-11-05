import React from 'react';
import { requireAuth } from '@/lib/auth';
import { getMonthlyExpenditureReportData } from './actions';
import MonthlyExpenditureClient from './MonthlyExpenditureClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MonthlyExpenditureReportPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER']);

  const initialData = await getMonthlyExpenditureReportData();

  return <MonthlyExpenditureClient initialData={initialData} />;
}

