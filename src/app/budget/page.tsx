import React from 'react';
import BudgetClient from './BudgetClient';
import { getBudgetComponents } from './actions';
import styles from './budget.module.css';
import { getRole } from '@/lib/auth';

export default async function BudgetPage() {
  const components = await getBudgetComponents();
  const role = await getRole();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Budget Component Master</h1>
        <p className={styles.subtitle}>Manage the Approved Budget for all main PM e-Vidya components.</p>
      </header>
      <BudgetClient role={role} initialData={components} />
    </div>
  );
}
