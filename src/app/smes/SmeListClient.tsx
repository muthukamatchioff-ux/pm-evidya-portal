"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './smes.module.css';

export default function SmeListClient({ initialWorkEntries, role }: { initialWorkEntries: any[], role: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const getEpicId = (epicSequence: number) => `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;

  const filteredEntries = initialWorkEntries.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.sme.name.toLowerCase().includes(searchLower) ||
      entry.trade.toLowerCase().includes(searchLower) ||
      (entry.sme.designation && entry.sme.designation.toLowerCase().includes(searchLower)) ||
      (entry.sme.institute && entry.sme.institute.toLowerCase().includes(searchLower))
    );
  });

  return (
    <>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
        <input
          type="text"
          placeholder="Filter by SME Name, Trade, Designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '10px', width: '100%', maxWidth: '400px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
        />
      </div>

      <div className="card">
        <div className={styles.tableWrapper}>
          <table className="table">
            <thead>
              <tr>
                <th>S.no</th>
                <th>EPIC ID</th>
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
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className={styles.emptyState}>No SME Work Entries match your filter.</td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => {
                  const payment = entry.payments[0]; // Assuming 1 payment per work entry for now
                  const total = payment?.totalAmount || entry.days! * entry.ratePerDay! || 0;
                  const paymentStatus = payment?.status || 'PENDING';
                  const hasDocuments = entry.documents && entry.documents.length > 0;

                  return (
                    <tr key={entry.id}>
                      <td>{index + 1}</td>
                      <td style={{ fontWeight: 'bold', color: '#3b82f6', fontSize: '13px' }}>{getEpicId(entry.epicSequence || index + 1)}</td>
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
                          ? `${new Date(entry.attendanceFrom).toLocaleDateString('en-IN')} - ${new Date(entry.attendanceTo).toLocaleDateString('en-IN')}`
                          : 'Pending'}
                      </td>
                      <td>₹ {total.toLocaleString('en-IN')}</td>
                      <td><span className={`${styles.badge} ${styles['badge-' + paymentStatus.toLowerCase()]}`}>{paymentStatus}</span></td>
                      <td>
                        <div className={styles.actions} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {role === 'ADMIN' ? (
                            hasDocuments ? (
                              <div
                                className={styles.btnAction}
                                style={{ background: '#94a3b8', color: 'white', padding: '6px 12px', borderRadius: '4px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', cursor: 'not-allowed', opacity: 0.7 }}
                                title="Editing disabled because documents have already been uploaded."
                              >
                                Locked (Documents Uploaded)
                              </div>
                            ) : (
                              <Link href={`/smes/${entry.smeId}`} className={styles.btnAction} style={{ background: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                View, Edit & Generate Documents
                              </Link>
                            )
                          ) : (
                            <Link href={`/smes/${entry.smeId}`} className={styles.btnAction} style={{ background: '#10b981', color: 'white', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                              View Details
                            </Link>
                          )}
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
    </>
  );
}
