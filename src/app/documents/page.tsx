import React from 'react';
import DocumentClient from './DocumentClient';
import { requireAuth } from '@/lib/auth';
import { getCachedDocumentsAndSmes } from '@/lib/portalCacheWarmers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DocumentsPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);

  const { documents, smes } = await getCachedDocumentsAndSmes();

  return <DocumentClient smes={smes} documents={documents} />;
}
