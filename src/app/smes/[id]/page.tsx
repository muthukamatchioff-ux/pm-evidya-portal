import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from './smeProfile.module.css';
import UnifiedSmeGeneratorClient from './UnifiedSmeGeneratorClient';
import { getRole } from '@/lib/auth';

export default async function SMEProfilePage(props: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  const params = await props.params;
  const sme = await prisma.sME.findUnique({
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

  if (!sme) {
    notFound();
  }

  // Calculate summaries
  let totalDays = 0;
  let totalAmount = 0;
  let totalPaid = 0;

  sme.workEntries.forEach(entry => {
    totalDays += entry.days || 0;
    const payment = entry.payments[0];
    const amt = payment?.totalAmount || (entry.days! * entry.ratePerDay!) || 0;
    totalAmount += amt;
    if (payment?.status === 'PAID') {
      totalPaid += amt;
    }
  });

  return (
    <div className={styles.container}>
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

