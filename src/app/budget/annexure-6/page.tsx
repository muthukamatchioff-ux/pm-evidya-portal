import React from 'react';
import Link from 'next/link';
import { getComponent6Data } from '../actions';
import styles from '../budget.module.css';
import Component6Client from './Component6Client';

import { getRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Component6Page() {
  const role = await getRole();
  const compData = await getComponent6Data();
  if (!compData) return <div>Component not found</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.actionsBar}>
          <div>
            <h1 className={styles.title}>{compData.name}</h1>
            <p className={styles.subtitle}>Reference: Annexure-VI</p>
          </div>
          <div>
            <Link href="/dashboard">
              <button className={styles.btnSecondary}>Back to Dashboard</button>
            </Link>
          </div>
        </div>
      </div>

      <Component6Client
        role={role}
        budgetComponentId={compData.id}
        approvedBudget={compData.approvedBudget}
        entries={compData.annexureVI}
      />
    </div>
  );
}
