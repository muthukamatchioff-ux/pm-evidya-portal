import React from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css';
import RoleSwitcher from './RoleSwitcher';
import { getRole } from '@/lib/auth';

export default async function Sidebar() {
  const role = await getRole();
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h2>PM e-Vidya</h2>
        <p>Accounts & Docs</p>
      </div>
      
      <nav className={styles.nav}>
        <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
        <Link href="/smes" className={styles.navLink}>SMEs</Link>
        <Link href="/documents" className={styles.navLink}>Documents</Link>
        <Link href="/accounts" className={styles.navLink}>Accounts & Payments</Link>
        <Link href="/budget" className={styles.navLink}>Budget</Link>
        <Link href="/generator" className={styles.navLink}>Document Generator</Link>
        <Link href="/templates" className={styles.navLink}>Templates</Link>
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '24px', borderTop: '1px solid var(--border)' }}>
        <RoleSwitcher currentRole={role} />
      </div>
    </aside>
  );
}
