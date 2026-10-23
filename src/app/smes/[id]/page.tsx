import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from './smeProfile.module.css';
import UnifiedSmeGeneratorClient from './UnifiedSmeGeneratorClient';
import { getRole, requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SMEProfilePage(props: { params: Promise<{ id: string }> }) {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
  const role = await getRole();
  const params = await props.params;
  let sme: any = null;
  try {
    sme = await prisma.sME.findUnique({
      where: { id: params.id },
      include: {
        workEntries: {
          include: {
            payments: true,
            documents: true,
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  } catch (err) {
    console.warn('Error fetching SME from DB:', err);
  }

  if (!sme) {
    const { REAL_PM_EVIDYA_SME_WORK_ENTRIES } = await import('@/lib/fallbackData');
    const matched = REAL_PM_EVIDYA_SME_WORK_ENTRIES.find(
      (e: any) => e.smeId === params.id || e.id === params.id || e.sme?.id === params.id
    );
    if (matched) {
      const allMatchingEntries = REAL_PM_EVIDYA_SME_WORK_ENTRIES.filter(
        (e: any) => e.smeId === params.id || e.sme?.id === params.id
      );
      sme = {
        ...matched.sme,
        workEntries: allMatchingEntries.length > 0 ? allMatchingEntries : [matched]
      };
    }
  } else if (!sme.workEntries || sme.workEntries.length === 0) {
    const { REAL_PM_EVIDYA_SME_WORK_ENTRIES } = await import('@/lib/fallbackData');
    const allMatchingEntries = REAL_PM_EVIDYA_SME_WORK_ENTRIES.filter(
      (e: any) => e.smeId === params.id || e.sme?.id === params.id || e.id === params.id
    );
    if (allMatchingEntries.length > 0) {
      sme.workEntries = allMatchingEntries;
    }
  }

  if (!sme) {
    notFound();
  }

  // Calculate summaries
  let totalDays = 0;
  let totalAmount = 0;
  let totalPaid = 0;

  sme.workEntries?.forEach((entry: any) => {
    totalDays += entry.days || 0;
    const payment = entry.payments?.[0];
    const amt = payment?.totalAmount || (entry.days! * entry.ratePerDay!) || 0;
    totalAmount += amt;
    if (payment?.status === 'PAID') {
      totalPaid += amt;
    }
  });

  return (
    <div className={styles.container}>
      <div style={{ marginBottom: '16px' }}>
        <Link 
          href="/smes" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            color: '#0369a1',
            border: '1.5px solid #cbd5e1',
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
        >
          ← Back to SME Records
        </Link>
      </div>

      <header className={styles.header}>
        <div>
          <h1>{sme.name}</h1>
          <p className={styles.subtitle}>{sme.designation} • {sme.institute}</p>
        </div>
        <div className={styles.statusBadge}>{sme.status}</div>
      </header>

      <section style={{ height: 'calc(100vh - 120px)' }}>
        <UnifiedSmeGeneratorClient sme={sme} role={role} />
      </section>
    </div>
  );
}

