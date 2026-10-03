import React from 'react';
import Link from 'next/link';
import { getComponent4Data } from '../actions';
import styles from '../budget.module.css';
import Component4Client from './Component4Client';

export default async function Component4Page() {
  const compData = await getComponent4Data();
  if (!compData) return <div>Component not found</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.actionsBar}>
          <div>
            <h1 className={styles.title}>{compData.name}</h1>
            <p className={styles.subtitle}>Reference: Annexure-IV</p>
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

      <Component4Client budgetComponentId={compData.id} entries={compData.annexureIV} />
    </div>
  );
}
