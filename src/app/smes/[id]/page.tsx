import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from './smeProfile.module.css';
import UploadButton from './UploadButton';

export default async function SMEProfilePage(props: { params: Promise<{ id: string }> }) {
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

      <section className={styles.summarySection}>
        <div className={styles.statCard}>
          <h3>Total Engagements</h3>
          <p>{sme.workEntries.length}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Total Days</h3>
          <p>{totalDays}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Total Amount</h3>
          <p>₹ {totalAmount.toLocaleString('en-IN')}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Paid Amount</h3>
          <p className={styles.successText}>₹ {totalPaid.toLocaleString('en-IN')}</p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>WORK ENTRIES</h2>
        <div className="card">
          <div className={styles.tableWrapper}>
            <table className="table">
              <thead>
                <tr>
                  <th>Trade</th>
                  <th>Topic</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sme.workEntries.map(entry => {
                  const payment = entry.payments[0];
                  const amt = payment?.totalAmount || (entry.days! * entry.ratePerDay!) || 0;
                  return (
                    <tr key={entry.id}>
                      <td>{entry.trade}</td>
                      <td>{entry.topic}</td>
                      <td>
                        {entry.attendanceFrom ? entry.attendanceFrom.toLocaleDateString() : '-'} to{' '}
                        {entry.attendanceTo ? entry.attendanceTo.toLocaleDateString() : '-'}
                      </td>
                      <td>{entry.days}</td>
                      <td>₹ {amt.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`${styles.badge} ${styles['badge-' + (payment?.status.toLowerCase() || 'pending')]}`}>
                          {payment?.status || 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>DOCUMENTS</h2>
          <Link href={`/generator?smeId=${sme.id}`} className="btn-primary" style={{ fontSize: '13px', padding: '6px 12px' }}>Generate Document</Link>
        </div>
        
        {sme.workEntries.map(entry => (
          <div key={entry.id} className={styles.documentGroup}>
            <div className={styles.documentGroupHeader}>
              <h3>{entry.trade} - {entry.topic}</h3>
            </div>
            <div className={styles.documentList}>
              {[
                { type: 'APPROVAL_LETTER', label: 'Approval Letter', canGenerate: true },
                { type: 'ATTENDANCE_COPY', label: 'Attendance Copy', canGenerate: false },
                { type: 'WORK_COMPLETION', label: 'Work Completion Certificate', canGenerate: false },
                { type: 'PAYMENT_APPROVAL', label: 'Payment Approval', canGenerate: true },
                { type: 'CLAIM_BILL', label: 'Claim Bill', canGenerate: false },
                { type: 'TA_BILL', label: 'TA Bill', canGenerate: false },
                { type: 'UTR_PROOF', label: 'UTR / Payment Proof', canGenerate: false },
              ].map(docTemplate => {
                const doc = entry.documents.find(d => d.type === docTemplate.type);
                const status = doc ? doc.status : 'MISSING';
                
                return (
                  <div key={docTemplate.type} className={styles.documentRow}>
                    <div className={styles.documentInfo}>
                      <span className={styles.documentName}>{docTemplate.label}</span>
                      <span className={`${styles.docBadge} ${styles['docBadge-' + status.toLowerCase()]}`}>{status}</span>
                    </div>
                    <div className={styles.documentActions}>
                      {doc ? (
                        <>
                          <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer" className={styles.btnAction}>Preview</a>
                          <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener noreferrer" className={styles.btnAction}>Download</a>
                          <UploadButton smeId={sme.id} workEntryId={entry.id} type={docTemplate.type} />
                        </>
                      ) : (
                        <>
                          {docTemplate.canGenerate && (
                            <Link href={`/generator?smeId=${sme.id}&entryId=${entry.id}&type=${docTemplate.type}`} className={styles.btnAction}>Generate</Link>
                          )}
                          <UploadButton smeId={sme.id} workEntryId={entry.id} type={docTemplate.type} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {sme.workEntries.length === 0 && (
          <div className="card">
            <p className={styles.emptyState}>No work entries available to attach documents.</p>
          </div>
        )}
      </section>
    </div>
  );
}

