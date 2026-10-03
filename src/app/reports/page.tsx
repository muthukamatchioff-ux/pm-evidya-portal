import React from 'react';
import { getBudgetComponents } from '@/app/budget/actions';
import { getComprehensiveReportData } from './actions';
import ReportsClient from './ReportsClient';
import styles from '@/app/dashboard/dashboard.module.css';

export default async function ReportsPage() {
  const components = await getBudgetComponents();
  const comprehensiveData = await getComprehensiveReportData();
  
  return (
    <div className={styles.container} style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Reports & Export</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Generate PM e-Vidya Overall Financial Reports or Component-Specific Reports.
          </p>
        </div>
      </div>
      
      <div style={{ marginTop: '32px' }}>
        <ReportsClient components={components} comprehensiveData={comprehensiveData} />
      </div>
    </div>
  );
}
