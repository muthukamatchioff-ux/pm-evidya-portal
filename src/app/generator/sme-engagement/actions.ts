"use server";

import { checkAuth } from '@/lib/auth';
import { saveSMERecordCore } from '@/lib/smeEngagementService';

export async function saveSMERecord(smeData: any, trades: any[]) {
  const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'CAMERAMAN', 'EDITOR']);
  if (!authCheck.success) return authCheck;

  return await saveSMERecordCore(smeData, trades);
}
