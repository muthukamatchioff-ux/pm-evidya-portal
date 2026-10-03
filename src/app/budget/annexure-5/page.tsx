import React from 'react';
import Link from 'next/link';
import { getComponent5Data } from '../actions';
import styles from '../budget.module.css';
import Component5Client from './Component5Client';

export default async function Component5Page() {
  const compData = await getComponent5Data();
  if (!compData) return <div>Component not found</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.actionsBar}>
          <div>
            <h1 className={styles.title}>{compData.name}</h1>
            <p className={styles.subtitle}>Reference: Annexure-V</p>
          </div>
          <div>
            <Link href="/dashboard">
              <button className={styles.btnSecondary}>Back to Dashboard</button>
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Approved Budget</div>
          <div className={styles.cardValue}>₹ {compData.approvedBudget.toLocaleString('en-IN')}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Expenditure</div>
          <div className={styles.cardValue} style={{ color: 'var(--error)' }}>
            ₹ {compData.expenditureIncurred.toLocaleString('en-IN')}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Balance</div>
          <div className={styles.cardValue} style={{ color: 'var(--success)' }}>
            ₹ {compData.unutilizedBalance.toLocaleString('en-IN')}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Utilization</div>
          <div className={styles.cardValue}>{compData.utilizationPercent}%</div>
        </div>
      </div>

      <Component5Client budgetComponentId={compData.id} entries={compData.annexureV} />
    </div>
  );
}
