import React from 'react';
import { getTopicProductionRecords } from './actions';
import VideoProductionClient from './VideoProductionClient';
import { getRole, requireAuth } from '@/lib/auth';

export const metadata = {
  title: 'Video Production Tracker - PM e-Vidya',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function VideoProductionPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'CAMERAMAN', 'EDITOR']);
  const role = await getRole();
  const result = await getTopicProductionRecords();
  const records = (result.success ? result.data : []) || [];
  const errorMsg = !result.success ? result.error : null;

  return (
    <>
      {errorMsg && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '1rem' }}>
          <strong>Error Loading Records:</strong> {errorMsg}
        </div>
      )}
      <VideoProductionClient initialRecords={records} role={role} />
    </>
  );
}
