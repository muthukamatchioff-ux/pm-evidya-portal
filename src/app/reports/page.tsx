import React from 'react';
import { getBudgetComponents } from '@/app/budget/actions';
import { getComprehensiveReportData } from './actions';
import ReportsClient from './ReportsClient';
import styles from '@/app/dashboard/dashboard.module.css';

import { getRole, requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportsPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'CAMERAMAN', 'EDITOR']);
  const role = await getRole();
  const [components, comprehensiveData] = await Promise.all([
    (role === 'ADMIN' || role === 'TEAM_MEMBER') ? getBudgetComponents() : Promise.resolve([]),
    getComprehensiveReportData()
  ]);
  
  return (
    <div className={styles.container} style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reports & Export</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Generate PM e-Vidya Production, Operational, or Financial Reports according to your role permissions.
          </p>
        </div>
      </div>
      
      <div style={{ marginTop: '32px' }}>
        <ReportsClient components={components} comprehensiveData={comprehensiveData} role={role} />
      </div>
    </div>
  );
}
