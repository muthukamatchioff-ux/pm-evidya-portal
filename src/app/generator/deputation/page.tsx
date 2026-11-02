import React from 'react';
import { prisma } from '@/lib/prisma';
import DeputationClient from './DeputationClient';
import { getRole, requireAuth } from '@/lib/auth';

export const metadata = {
  title: 'Official Communications | PM e-Vidya Portal',
  description: 'Generate, manage, and track official SME deputation and approval letters',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DeputationLettersPage({
  searchParams
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
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
        documents: {
          orderBy: { updatedAt: 'desc' }
        },
      },
      orderBy: { epicSequence: 'asc' }
    });
  } catch (e) {
    console.error('Failed to load work entries for Communications:', e);
  }

  const { REAL_PM_EVIDYA_SME_WORK_ENTRIES } = await import('@/lib/fallbackData');
  if (!workEntries || workEntries.length === 0) {
    workEntries = [...REAL_PM_EVIDYA_SME_WORK_ENTRIES];
  } else {
    const existingIds = new Set(workEntries.map(e => e.id));
    const existingSeqs = new Set(workEntries.map(e => e.epicSequence));
    for (const fb of (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[])) {
      if (!existingIds.has(fb.id) && !existingSeqs.has(fb.epicSequence)) {
        workEntries.push(fb);
      }
    }
    workEntries.sort((a, b) => (a.epicSequence || 0) - (b.epicSequence || 0));
  }

  return (
    <div style={{ padding: '4px' }}>
      <DeputationClient
        initialWorkEntries={workEntries}
        userRole={role || undefined}
        preselectedEpicId={typeof resolvedParams.epic === 'string' ? resolvedParams.epic : undefined}
      />
    </div>
  );
}
