"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './smes.module.css';
import { deleteSMEWorkEntry, updateSmePaymentInline } from './[id]/actions';

export default function SmeListClient({ initialWorkEntries, role }: { initialWorkEntries: any[], role: string }) {
  const [entries, setEntries] = useState(initialWorkEntries);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const getEpicId = (epicSequence: number) => `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;

  const handleDelete = async (entryId: string, smeName: string, trade: string) => {
    if (!window.confirm(`Are you sure you want to delete the SME Work Entry for "${smeName}" (${trade})?\n\nThis will permanently delete this work entry, payments, and any generated documents.`)) {
      return;
    }

    setDeletingId(entryId);
    try {
      const res = await deleteSMEWorkEntry(entryId);
      if (res.success) {
        setEntries(prev => prev.filter(e => e.id !== entryId));
        setSuccessToast('SME Work Entry deleted successfully.');
        setTimeout(() => setSuccessToast(null), 3000);
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

  const handleUpdatePayment = async (entryId: string, newAmount: number, newStatus: string) => {
    setSavingPaymentId(entryId);
    try {
      const res = await updateSmePaymentInline(entryId, newAmount, newStatus);
      if (res.success) {
        setEntries(prev => prev.map(entry => {
          if (entry.id === entryId) {
            const currentPayments = entry.payments && entry.payments.length > 0 ? entry.payments : [{}];
            const updatedPayments = currentPayments.map((p: any, idx: number) => idx === 0 ? {
              ...p,
              totalAmount: newAmount,
              status: newStatus
            } : p);
            return {
              ...entry,
              payments: updatedPayments
            };
          }
          return entry;
        }));
        setSuccessToast('Payment updated successfully.');
        setTimeout(() => setSuccessToast(null), 3000);
      } else {
        alert('Failed to update payment: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error saving payment');
    } finally {
      setSavingPaymentId(null);
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
      <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
        <input
          type="text"
          placeholder="Filter by SME Name, Trade, Designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '10px 14px', width: '100%', maxWidth: '420px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
        />
        {successToast && (
          <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 16px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '13px', fontWeight: 600 }}>
            ✅ {successToast}
          </div>
        )}
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
                <th>Total Amt</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>No SME Work Entries match your filter.</td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => {
                  const payment = entry.payments && entry.payments.length > 0 ? entry.payments[0] : null;
                  const total = payment?.totalAmount !== undefined && payment?.totalAmount !== null 
                    ? payment.totalAmount 
                    : ((entry.days || 0) * (entry.ratePerDay || 0));
                  const paymentStatus = (payment?.status || 'INITIATED').toUpperCase();
                  const isSaving = savingPaymentId === entry.id;

                  // Normalize paymentStatus to one of INITIATED, ON_PROCESS, COMPLETED
                  let normalizedStatus = 'INITIATED';
                  if (paymentStatus === 'ON_PROCESS' || paymentStatus === 'IN_PROGRESS' || paymentStatus === 'PENDING') {
                    normalizedStatus = 'ON_PROCESS';
                  } else if (paymentStatus === 'COMPLETED' || paymentStatus === 'PAID' || paymentStatus === 'APPROVED') {
                    normalizedStatus = 'COMPLETED';
                  } else {
                    normalizedStatus = 'INITIATED';
                  }

                  const getSelectClass = (st: string) => {
                    switch (st) {
                      case 'COMPLETED': return styles.statusSelectCompleted;
                      case 'ON_PROCESS': return styles.statusSelectOnProcess;
                      default: return styles.statusSelectInitiated;
                    }
                  };

                  return (
                    <tr key={entry.id}>
                      <td>{index + 1}</td>
                      <td style={{ fontWeight: 'bold', color: '#0284c7', fontSize: '13px' }}>
                        {getEpicId(entry.epicSequence || index + 1)}
                      </td>
                      <td>
                        <Link href={`/smes/${entry.smeId}`} className={styles.smeLink}>
                          {entry.sme.name}
                        </Link>
                      </td>
                      <td>{entry.sme.designation || '-'}</td>
                      <td>{entry.trade}</td>
                      
                      {/* Total Amt - Editable input option for Admin */}
                      <td>
                        {role === 'ADMIN' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#64748b', fontSize: '14px' }}>₹</span>
                            <input
                              type="number"
                              className={styles.amountInput}
                              defaultValue={total}
                              key={`${entry.id}-${total}`}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                if (val !== total) {
                                  handleUpdatePayment(entry.id, val, normalizedStatus);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                                  if (val !== total) {
                                    handleUpdatePayment(entry.id, val, normalizedStatus);
                                  }
                                }
                              }}
                              disabled={isSaving}
                              title="Enter Total Amount and press Enter or click outside to save"
                            />
                          </div>
                        ) : (
                          <span style={{ fontWeight: 600 }}>₹ {total.toLocaleString('en-IN')}</span>
                        )}
                      </td>

                      {/* Payment Status - Dropdown pattern with initiated / on process / completed */}
                      <td>
                        {role === 'ADMIN' ? (
                          <select
                            className={`${styles.statusSelect} ${getSelectClass(normalizedStatus)}`}
                            value={normalizedStatus}
                            disabled={isSaving}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              handleUpdatePayment(entry.id, total, newStatus);
                            }}
                          >
                            <option value="INITIATED">Initiated</option>
                            <option value="ON_PROCESS">On Process</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        ) : (
                          <span className={`${styles.badge} ${
                            normalizedStatus === 'COMPLETED' ? styles['badge-completed'] :
                            normalizedStatus === 'ON_PROCESS' ? styles['badge-on_process'] :
                            styles['badge-initiated']
                          }`}>
                            {normalizedStatus === 'ON_PROCESS' ? 'On Process' : normalizedStatus === 'COMPLETED' ? 'Completed' : 'Initiated'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className={styles.actions} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {role === 'ADMIN' ? (
                            <>
                              <Link 
                                href={`/smes/${entry.smeId}`} 
                                className={styles.btnAction} 
                                style={{ 
                                  background: '#0284c7', 
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
