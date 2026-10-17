import React from 'react';
import { prisma } from '@/lib/prisma';
import DocumentClient from './DocumentClient';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DocumentsPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);

  // Parallelize independent read-only database queries
  const [documents, smes] = await Promise.all([
    // 1. Primary Query: Retrieve all Document records directly so no document is omitted
    prisma.document.findMany({
      include: {
        workEntry: {
          include: {
            sme: true,
          }
        },
        project: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' }
    }),
    // 2. Secondary Query: Retrieve SMEs with workEntries for the EPIC selector, checklist, and metadata
    prisma.sME.findMany({
      include: {
        workEntries: {
          include: {
            documents: true,
            payments: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return <DocumentClient smes={smes} documents={documents} />;
}
