import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from '../projects/projects.module.css'; // Reusing table styles for consistency

export const metadata = {
  title: 'Legacy Data Repository | PM e-Vidya'
};

import { requireAuth } from '@/lib/auth';

export default async function LegacyDataPage() {
  await requireAuth(['ADMIN']);
  const legacyRecords = await prisma.legacyRecord.findMany({
    take: 50,
    include: {
      batch: true
    },
    orderBy: {
      batch: {
        importDate: 'desc'
      }
    }
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Legacy Data Repository</h1>
        <Link href="/legacy/import" className="btn-primary">
          <span>⬇️</span> Import New Batch
        </Link>
      </div>

      <div className={styles.card}>
        <div className={styles.controls} style={{ padding: '16px' }}>
          <div className={styles.searchGroup}>
            <input 
              type="text" 
              placeholder="Search legacy records..." 
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <select className={styles.selectInput}>
              <option value="">All Batches</option>
            </select>
            <select className={styles.selectInput}>
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="DUPLICATE">Duplicate</option>
              <option value="ERROR">Error</option>
            </select>
            <button className="btn-secondary">Export to Excel</button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Source File</th>
                <th>Sheet Name</th>
                <th>Row</th>
                <th>Import Date</th>
                <th>Imported By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {legacyRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No legacy records found. Use the Import feature to migrate Excel data.
                  </td>
                </tr>
              ) : (
                legacyRecords.map(record => (
                  <tr key={record.id}>
                    <td><strong>{record.batch.originalFileName}</strong></td>
                    <td>{record.batch.sheetName || 'Sheet1'}</td>
                    <td>Row {record.originalRow}</td>
                    <td>{new Date(record.batch.importDate).toLocaleDateString('en-IN')}</td>
                    <td>{record.batch.importedBy}</td>
                    <td>
                      <span className={`badge ${record.status === 'SUCCESS' ? 'badge-success' : record.status === 'DUPLICATE' ? 'badge-warning' : 'badge-danger'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>
                      <button className={styles.actionBtn} title="View Raw JSON Data">👁️</button>
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
