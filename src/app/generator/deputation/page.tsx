import React from 'react';
import DeputationClient from './DeputationClient';
import { prisma } from '@/lib/prisma';
import { requireAuth, getRole } from '@/lib/auth';

export const metadata = {
  title: 'Communications — Epic-Based SME Document Workflow | PM e-Vidya'
};

export default async function DeputationGeneratorPage({
  searchParams
}: {
  searchParams?: Promise<{ epicId?: string; smeId?: string }>;
}) {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const role = await getRole();
  const resolvedParams = searchParams ? await searchParams : {};

  let workEntries: any[] = [];
  try {
    workEntries = await prisma.sMEWorkEntry.findMany({
      include: {
        sme: true,
        payments: true,
        documents: true,
      },
      orderBy: { epicSequence: 'asc' }
    });
  } catch (e) {
    console.error('Failed to load work entries for Communications:', e);
  }

  if (!workEntries || workEntries.length === 0) {
    const { REAL_PM_EVIDYA_SME_WORK_ENTRIES } = await import('@/lib/fallbackData');
    workEntries = REAL_PM_EVIDYA_SME_WORK_ENTRIES;
  }

  return (
    <div style={{ padding: '4px' }}>
      <DeputationClient
        initialWorkEntries={workEntries}
        userRole={role}
        preselectedEpicId={resolvedParams.epicId}
      />
    </div>
  );
}
