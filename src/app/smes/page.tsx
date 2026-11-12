import React from 'react';
import Link from 'next/link';
import styles from './smes.module.css';
import SmeListClient from './SmeListClient';
import { getRole, requireAuth } from '@/lib/auth';
import { getCachedSmeList, setCachedSmeList } from '@/app/smes/cache';
import { getCachedSmeWorkEntriesList } from '@/lib/portalCacheWarmers';

export const metadata = {
  title: 'SME Records | PM e-Vidya Portal',
  description: 'Manage Subject Matter Experts, work assignments, and payment records',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SMEsPage() {
  const [, role] = await Promise.all([
    requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']),
    getRole()
  ]);

  // L1 RAM cache -> L2 Cross-lambda Next.js Data Cache -> Live DB
  let workEntries = getCachedSmeList();
  if (!workEntries || workEntries.length === 0) {
    workEntries = await getCachedSmeWorkEntriesList();
    if (workEntries && workEntries.length > 0) {
      setCachedSmeList(workEntries);
    }
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard" prefetch={false} style={{ color: 'inherit', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span>/</span>
        <span>Core Modules</span>
        <span>/</span>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>SME Records</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>SME Management</h1>
          <div className={styles.headerSubtitle}>
            Directory of Subject Matter Experts and work assignments
          </div>
        </div>
        {role === 'ADMIN' && (
          <Link href="/smes/new" prefetch={false} className={styles.btnAddSme}>
            <span>➕</span>
            <span>Add New SME</span>
          </Link>
        )}
      </header>

      <SmeListClient initialWorkEntries={workEntries} role={role} />
    </div>
  );
}
