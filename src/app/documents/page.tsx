import React from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import styles from '../smes/smes.module.css'; // Reuse SME table styles

export default async function DocumentsPage() {
  const smes = await prisma.sME.findMany({
    include: {
      workEntries: true,
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Document Repository</h1>
      </header>

      <div className="card">
        <h2 style={{ marginBottom: '24px', fontSize: '16px', color: 'var(--text-secondary)' }}>
          Please select an SME to view their complete document file
        </h2>
        
        <div className={styles.tableWrapper}>
          <table className="table">
            <thead>
              <tr>
                <th>SME Name</th>
                <th>Designation</th>
                <th>Institute</th>
                <th>Total Engagements</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {smes.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>No SMEs found.</td>
                </tr>
              ) : (
                smes.map(sme => (
                  <tr key={sme.id}>
                    <td><strong>{sme.name}</strong></td>
                    <td>{sme.designation}</td>
                    <td>{sme.institute}</td>
                    <td>{sme.workEntries.length}</td>
                    <td>
                      <Link href={`/smes/${sme.id}`} className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                        View Documents
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
