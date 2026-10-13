import React from 'react';
import { prisma } from '@/lib/prisma';
import DocumentClient from './DocumentClient';
import { requireAuth } from '@/lib/auth';

export default async function DocumentsPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  // Fetch all SMEs and eagerly load their work entries, documents, and payments
  const smes = await prisma.sME.findMany({
    include: {
      workEntries: {
        include: {
          documents: true,
          payments: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return <DocumentClient smes={smes} />;
}
