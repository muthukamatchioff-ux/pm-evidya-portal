"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './smes.module.css';

export default function SmeListClient({ initialWorkEntries, role }: { initialWorkEntries: any[], role: string }) {
  const [entries, setEntries] = useState(initialWorkEntries);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const getEpicId = (epicSequence: number) => `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;

  const handleDelete = async (entryId: string, smeName: string, trade: string) => {
    if (!window.confirm(`Are you sure you want to delete the SME Work Entry for "${smeName}" (${trade})?\n\nThis will permanently delete this work entry, payments, and any generated documents.`)) {
      return;
    }

    setDeletingId(entryId);
    try {
      const { deleteSMEWorkEntry } = await import('./[id]/actions');
      const res = await deleteSMEWorkEntry(entryId);
      if (res.success) {
        setEntries(prev => prev.filter(e => e.id !== entryId));
      } else {
        alert('Error deleting entry: ' + (res.error || 'Failed to delete'));
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting SME entry');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEntries = entries.filter(entry => {
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
                      <td>
                        {entry.topic}
                        {hasDocuments && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            📄 {entry.documents.length} Docs
                          </span>
                        )}
                      </td>
                      <td>
                        {entry.attendanceFrom && entry.attendanceTo
                          ? `${new Date(entry.attendanceFrom).toLocaleDateString('en-IN')} - ${new Date(entry.attendanceTo).toLocaleDateString('en-IN')}`
                          : 'Pending'}
                      </td>
                      <td>₹ {total.toLocaleString('en-IN')}</td>
                      <td><span className={`${styles.badge} ${styles['badge-' + paymentStatus.toLowerCase()]}`}>{paymentStatus}</span></td>
                      <td>
                        <div className={styles.actions} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {role === 'ADMIN' ? (
                            <>
                              <Link 
                                href={`/smes/${entry.smeId}`} 
                                className={styles.btnAction} 
                                style={{ 
                                  background: '#2563eb', 
                                  color: 'white', 
                                  padding: '6px 12px', 
                                  borderRadius: '6px', 
                                  textDecoration: 'none', 
                                  textAlign: 'center', 
                                  fontSize: '12px', 
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Edit SME details and documents"
                              >
                                ✏️ Edit
                              </Link>
                              <button
                                onClick={() => handleDelete(entry.id, entry.sme.name, entry.trade)}
                                disabled={deletingId === entry.id}
                                style={{
                                  background: '#dc2626',
                                  color: 'white',
                                  padding: '6px 12px',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: deletingId === entry.id ? 'not-allowed' : 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                  opacity: deletingId === entry.id ? 0.7 : 1
                                }}
                                title="Delete this SME Entry"
                              >
                                {deletingId === entry.id ? 'Deleting...' : '🗑️ Delete'}
                              </button>
                            </>
                          ) : (
                            <Link 
                              href={`/smes/${entry.smeId}`} 
                              className={styles.btnAction} 
                              style={{ 
                                background: '#10b981', 
                                color: 'white', 
                                padding: '6px 12px', 
                                borderRadius: '6px', 
                                textDecoration: 'none', 
                                textAlign: 'center', 
                                fontSize: '12px', 
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              👁️ View Details
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
