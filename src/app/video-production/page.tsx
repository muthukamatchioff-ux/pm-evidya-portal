import React from 'react';
import { getTopicProductionRecords } from './actions';
import VideoProductionClient from './VideoProductionClient';
import { getRole, requireAuth, getCurrentUser } from '@/lib/auth';

export const metadata = {
  title: 'Video Production Tracker - PM e-Vidya',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function VideoProductionPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'CAMERAMAN', 'EDITOR']);
  const role = await getRole();
  const currentUser = await getCurrentUser();
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
      <React.Suspense fallback={null}>
        <VideoProductionClient initialRecords={records} role={role} currentUser={currentUser} />
      </React.Suspense>
    </>
  );
}
