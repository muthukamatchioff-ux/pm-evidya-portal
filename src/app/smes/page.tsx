import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './smes.module.css';
import SmeListClient from './SmeListClient';

import { getRole } from '@/lib/auth';

export default async function SMEsPage() {
  const role = await getRole();
  const workEntries = await prisma.sMEWorkEntry.findMany({
    include: {
      sme: true,
      payments: true,
      documents: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>SME Management</h1>
        {role === 'ADMIN' && (
          <Link href="/smes/new" className="btn-primary">Add New SME</Link>
        )}
      </header>

      <SmeListClient initialWorkEntries={workEntries} role={role} />
    </div>
  );
}
