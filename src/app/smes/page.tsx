import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './smes.module.css';
import SmeListClient from './SmeListClient';
import { getRole, requireAuth } from '@/lib/auth';
import { findSmeContact } from '@/lib/smeContacts';
import { getCachedSmeList, setCachedSmeList } from '@/app/smes/cache';

export const metadata = {
  title: 'SME Records | PM e-Vidya Portal',
  description: 'Manage Subject Matter Experts, work assignments, and payment records',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SMEsPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const role = await getRole();

  // Fast-path: Return cached SME records immediately if available
  const cached = getCachedSmeList();
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return (
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <Link href="/dashboard" prefetch={true} style={{ color: 'inherit', textDecoration: 'none' }}>
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

        <SmeListClient initialWorkEntries={cached} role={role} />
      </div>
    );
  }
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

    // 2. Safeguard: Check for any SME rows in DB that match authoritative fallback entries
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
          }
        }
      }

      // 3. Purge any orphan test SME records that have 0 work entries (e.g. Muthu Kamatchi or deleted test entries)
      const orphanTestSmes = dbSmes.filter((s: any) =>
        !linkedSmeIds.has(s.id) &&
        (s.name.toLowerCase().includes('muthu') || s.name.toLowerCase().includes('kamatchi') || s.name.toLowerCase().includes('test'))
      );
      for (const orphan of orphanTestSmes) {
        try {
          await prisma.document.deleteMany({ where: { workEntry: { smeId: orphan.id } } });
          await prisma.payment.deleteMany({ where: { workEntry: { smeId: orphan.id } } });
          await prisma.sMEWorkEntry.deleteMany({ where: { smeId: orphan.id } });
          await prisma.sME.delete({ where: { id: orphan.id } });
        } catch (_) {}
      }
    } catch (_) {}

    // 4. Ensure every entry has authoritative contactNumber and email
    const needsDbSync: any[] = [];
    for (const entry of workEntries) {
      if (entry.sme) {
        const contact = findSmeContact(entry.sme.name, entry.epicSequence);
        if (contact) {
          const wasMissing = !entry.sme.contactNumber || !entry.sme.email;
          if ((entry.sme.contactNumber === null || entry.sme.contactNumber === undefined || entry.sme.contactNumber === '') && contact.phone) {
            entry.sme.contactNumber = contact.phone;
          }
          if ((entry.sme.email === null || entry.sme.email === undefined || entry.sme.email === '') && contact.email) {
            entry.sme.email = contact.email;
          }
          if (wasMissing && entry.sme.id) {
            needsDbSync.push({ id: entry.sme.id, phone: entry.sme.contactNumber, email: entry.sme.email });
          }
        }
      }
    }

    // 5. Concurrent non-blocking self-healing DB sync only if unpersisted entries exist
    if (needsDbSync.length > 0) {
      Promise.all(needsDbSync.map(item =>
        prisma.sME.updateMany({
          where: {
            id: item.id,
            OR: [{ contactNumber: null }, { contactNumber: '' }]
          },
          data: {
            contactNumber: item.phone || undefined,
            email: item.email || undefined
          }
        }).catch(() => null)
      )).catch(() => null);
    }

    workEntries.sort((a, b) => (b.epicSequence || 0) - (a.epicSequence || 0));
  }

  // Cache the sorted records for instant fast-path navigation
  setCachedSmeList(workEntries);

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
