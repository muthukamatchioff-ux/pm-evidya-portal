import React from 'react';
import { prisma } from '@/lib/prisma';
import DocumentClient from './DocumentClient';

export default async function DocumentsPage() {
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
