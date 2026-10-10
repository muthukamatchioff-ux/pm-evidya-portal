import React from 'react';
import { getTopicProductionRecords, getDiagnosticInfo } from './actions';
import VideoProductionClient from './VideoProductionClient';
import styles from '@/app/dashboard/dashboard.module.css';
import { getRole, requireAuth } from '@/lib/auth';

export const metadata = {
  title: 'Video Production Tracker - PM e-Vidya',
};

export default async function VideoProductionPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const role = await getRole();
  const diagnostic = await getDiagnosticInfo();
  const result = await getTopicProductionRecords();
  const records = (result.success ? result.data : []) || [];
  const errorMsg = !result.success ? result.error : null;

  return (
    <>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.pageTitle}>🎬 Video Production Tracker</h1>
        <p className={styles.subtitle}>Manage complete EPIC ID workflows for SME Document Compliance, Production & Telecast Tracking</p>
      </div>
      
      <div style={{ padding: '1rem', background: '#f0fdf4', color: '#166534', borderRadius: '4px', marginBottom: '1rem' }}>
        <strong>Production Database Diagnostic:</strong><br/>
        Database Name: {diagnostic.database || 'Error'}<br/>
        Schema: {diagnostic.schema || 'Error'}<br/>
        Found Tables in Public Schema: {diagnostic.tables ? diagnostic.tables.join(', ') : 'None'}
      </div>

      {errorMsg && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '1rem' }}>
          <strong>Error Loading Records:</strong> {errorMsg}
        </div>
      )}
      <VideoProductionClient initialRecords={records} role={role} />
    </>
  );
}
