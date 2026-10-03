import React from 'react';
import BudgetClient from './BudgetClient';
import { getBudgetComponents } from './actions';
import styles from './budget.module.css';

export default async function BudgetPage() {
  const components = await getBudgetComponents();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Budget Component Master</h1>
        <p className={styles.subtitle}>Manage the Approved Budget for all main PM e-Vidya components.</p>
      </header>
      <BudgetClient initialData={components} />
    </div>
  );
}
