import React from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { getVideoProductionRecords } from './actions';
import VideoProductionClient from './VideoProductionClient';
import styles from '@/app/dashboard/dashboard.module.css';
import { getRole, requireAuth } from '@/lib/auth';

export const metadata = {
  title: 'Video Production Records - PM e-Vidya',
};

export default async function VideoProductionPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const role = await getRole();
  const result = await getVideoProductionRecords();
  const records = (result.success ? result.data : []) || [];

  return (
    <div className={styles.layout}>
      <Header role={role} />
      <div className={styles.mainContainer}>
        <Sidebar />
        <main className={styles.mainContent}>
          <div className={styles.dashboardHeader}>
            <h1 className={styles.pageTitle}>🎬 Video Production Records</h1>
            <p className={styles.subtitle}>Manage complete EPIC ID workflows for SME Document Compliance, Production & Telecast Tracking</p>
          </div>
          <VideoProductionClient initialRecords={records} role={role} />
        </main>
      </div>
    </div>
  );
}
