import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './smes.module.css';

export default async function SMEsPage() {
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
        <Link href="/smes/new" className="btn-primary">Add New SME</Link>
      </header>

      <div className="card">
        <div className={styles.tableWrapper}>
          <table className="table">
            <thead>
              <tr>
                <th>SME Name</th>
                <th>Designation</th>
                <th>Trade</th>
                <th>Topic</th>
                <th>Attendance</th>
                <th>Total Amt</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>No SME Work Entries found.</td>
                </tr>
              ) : (
                workEntries.map(entry => {
                  const payment = entry.payments[0]; // Assuming 1 payment per work entry for now
                  const total = payment?.totalAmount || entry.days! * entry.ratePerDay! || 0;
                  const paymentStatus = payment?.status || 'PENDING';
                  
                  return (
                    <tr key={entry.id}>
                      <td>
                        <Link href={`/smes/${entry.smeId}`} className={styles.smeLink}>
                          {entry.sme.name}
                        </Link>
                      </td>
                      <td>{entry.sme.designation}</td>
                      <td>{entry.trade}</td>
                      <td>{entry.topic}</td>
                      <td>
                        {entry.attendanceFrom && entry.attendanceTo 
                          ? `${entry.attendanceFrom.toLocaleDateString()} - ${entry.attendanceTo.toLocaleDateString()}` 
                          : 'Pending'}
                      </td>
                      <td>₹ {total.toLocaleString('en-IN')}</td>
                      <td><span className={`${styles.badge} ${styles['badge-' + paymentStatus.toLowerCase()]}`}>{paymentStatus}</span></td>
                      <td>
                        <div className={styles.actions}>
                          <Link href={`/smes/${entry.smeId}`} className={styles.btnAction}>View</Link>
                          <Link href={`/generator?smeId=${entry.smeId}&entryId=${entry.id}`} className={styles.btnAction}>Generate Doc</Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
