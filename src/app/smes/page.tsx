import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './smes.module.css';
import SmeListClient from './SmeListClient';
import { getRole, requireAuth } from '@/lib/auth';

export const metadata = {
  title: 'SME Records | PM e-Vidya Portal',
  description: 'Manage Subject Matter Experts, work assignments, and payment records',
};

export default async function SMEsPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const role = await getRole();
  let workEntries: any[] = [];
  try {
    workEntries = await prisma.sMEWorkEntry.findMany({
      include: {
        sme: true,
        payments: true,
        documents: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch {}

  if (!workEntries || workEntries.length === 0) {
    const { REAL_PM_EVIDYA_SME_WORK_ENTRIES } = await import('@/lib/fallbackData');
    workEntries = REAL_PM_EVIDYA_SME_WORK_ENTRIES;
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
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
          <Link href="/smes/new" className={styles.btnAddSme}>
            <span>➕</span>
            <span>Add New SME</span>
          </Link>
        )}
      </header>

      <SmeListClient initialWorkEntries={workEntries} role={role} />
    </div>
  );
}
