import React from 'react';
import DeputationClient from './DeputationClient';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const metadata = {
  title: 'SME Approval / Deputation Letter Generator | PM e-Vidya'
};

export default async function DeputationGeneratorPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  // Fetch SMEs and Projects to pre-fill dropdowns in the form
  const smes = await prisma.sME.findMany({
    orderBy: { name: 'asc' }
  });
  
  const projects = await prisma.project.findMany({
    orderBy: { projectCode: 'asc' }
  });

  return (
    <div style={{ padding: '8px' }}>
      <DeputationClient smes={smes} projects={projects} />
    </div>
  );
}
