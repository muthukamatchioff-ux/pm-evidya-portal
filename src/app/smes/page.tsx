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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SMEsPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const role = await getRole();
  let workEntries: any[] = [];
  try {
    workEntries = await prisma.sMEWorkEntry.findMany({
      include: {
        sme: true,
        payments: true,
        documents: {
          orderBy: { updatedAt: 'desc' }
        },
      },
      orderBy: { epicSequence: 'desc' }
    });
  } catch (e) {
    console.warn('Failed to load SMEWorkEntries from DB:', e);
  }

  const { REAL_PM_EVIDYA_SME_WORK_ENTRIES } = await import('@/lib/fallbackData');

  if (!workEntries || workEntries.length === 0) {
    workEntries = [...REAL_PM_EVIDYA_SME_WORK_ENTRIES];
  } else {
    // 1. Ensure all authoritative fallback entries (e.g. Harish Menon / Epic 20) are included
    const existingIds = new Set(workEntries.map(e => e.id));
    const existingSeqs = new Set(workEntries.map(e => e.epicSequence));
    const existingNames = new Set(workEntries.map(e => e.sme?.name?.trim().toLowerCase()).filter(Boolean));

    for (const fb of (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[])) {
      const fbName = fb.sme?.name?.trim().toLowerCase();
      if (!existingIds.has(fb.id) && !existingSeqs.has(fb.epicSequence) && (!fbName || !existingNames.has(fbName))) {
        workEntries.push(fb);
      }
    }

    // 2. Safeguard: Check for any SME rows in DB without work entries so they are never hidden
    try {
      const dbSmes = await prisma.sME.findMany();
      const linkedSmeIds = new Set(workEntries.map(e => e.smeId).filter(Boolean));
      for (const s of dbSmes) {
        if (!linkedSmeIds.has(s.id)) {
          // Check if fallback has this SME
          const matchedFb = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(
            fb => fb.smeId === s.id || fb.sme?.name?.trim().toLowerCase() === s.name.trim().toLowerCase()
          );
          if (matchedFb) {
            if (!workEntries.some(e => e.id === matchedFb.id)) {
              workEntries.push({ ...matchedFb, sme: s, smeId: s.id });
              linkedSmeIds.add(s.id);
            }
          } else {
            workEntries.push({
              id: `entry_synth_${s.id}`,
              smeId: s.id,
              trade: 'General',
              topic: 'PM e-Vidya Content Development',
              status: s.status || 'ACTIVE',
              days: 0,
              ratePerDay: 1500,
              taAmount: 0,
              otherAmount: 0,
              epicSequence: 0,
              sme: s,
              payments: [],
              documents: []
            });
            linkedSmeIds.add(s.id);
          }
        }
      }
    } catch (_) {}

    workEntries.sort((a, b) => (b.epicSequence || 0) - (a.epicSequence || 0));
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
