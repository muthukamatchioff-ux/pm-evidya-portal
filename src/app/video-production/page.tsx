import React from 'react';
import { getTopicProductionRecords } from './actions';
import VideoProductionClient from './VideoProductionClient';
import styles from '@/app/dashboard/dashboard.module.css';
import { getRole, requireAuth } from '@/lib/auth';

export const metadata = {
  title: 'Video Production Records - PM e-Vidya',
};

export default async function VideoProductionPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const role = await getRole();
  const result = await getTopicProductionRecords();
  const records = (result.success ? result.data : []) || [];

  return (
    <>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.pageTitle}>🎬 Video Production Records</h1>
        <p className={styles.subtitle}>Manage complete EPIC ID workflows for SME Document Compliance, Production & Telecast Tracking</p>
      </div>
      <VideoProductionClient initialRecords={records} role={role} />
    </>
  );
}
