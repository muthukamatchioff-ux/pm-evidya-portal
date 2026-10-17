'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addAnnexureVIEntry, updateAnnexureVIEntry, deleteAnnexureVIEntry } from '../actions';
import styles from '../budget.module.css';
import { downloadTableAsDocx } from '@/lib/tableToDocx';

function areRecordsEquivalent(prev: any[], next: any[]): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (a === b) continue;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (a[key] !== b[key]) {
        if (a[key] instanceof Date && b[key] instanceof Date) {
          if (a[key].getTime() !== b[key].getTime()) return false;
        } else {
          return false;
        }
      }
    }
  }
  return true;
}

export default function Component6Client({
  role,
  budgetComponentId,
  approvedBudget = 500000,
  entries
}: {
  role?: string;
  budgetComponentId: string;
  approvedBudget?: number;
  entries: any[];
}) {
  const router = useRouter();
  const [records, setRecords] = useState(entries || []);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (entries && Array.isArray(entries)) {
      setRecords(prev => {
        const filteredIncoming = entries.filter((e: any) => !deletedIds.has(e.id));
        const incomingMap = new Map(filteredIncoming.map((e: any) => [e.id, e]));
        const preservedLocals = prev.filter((p: any) => !incomingMap.has(p.id) && !deletedIds.has(p.id));
        const next = [...filteredIncoming, ...preservedLocals];
        return areRecordsEquivalent(prev, next) ? prev : next;
      });
    }
  }, [entries, deletedIds]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    datePeriod: '',
    platform: '',
    campaignDesc: '',
    serviceProvider: '',
    campaignType: '',
    amount: '',
    tax: '',
    utrNumber: '',
    remarks: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (entry: any) => {
    setIsAdding(true);
    setEditingId(entry.id);
    setFormData({
      datePeriod: entry.datePeriod || '',
      platform: entry.platform || '',
      campaignDesc: entry.campaignDesc || '',
      serviceProvider: entry.serviceProvider || '',
      campaignType: entry.campaignType || '',
      amount: entry.amount != null ? String(entry.amount) : '',
      tax: entry.tax != null ? String(entry.tax) : '',
      utrNumber: entry.utrNumber || '',
      remarks: entry.remarks || ''
    });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      datePeriod: '',
      platform: '',
      campaignDesc: '',
      serviceProvider: '',
      campaignType: '',
      amount: '',
      tax: '',
      utrNumber: '',
      remarks: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const amount = Number(formData.amount) || 0;
    const tax = Number(formData.tax) || 0;
    const total = amount + tax;

    const dataToSubmit = {
      budgetComponentId,
      datePeriod: formData.datePeriod,
      platform: formData.platform,
      campaignDesc: formData.campaignDesc,
      serviceProvider: formData.serviceProvider,
      campaignType: formData.campaignType,
      amount,
      tax,
      totalExpenditure: total,
      utrNumber: formData.utrNumber,
      remarks: formData.remarks
    };

    try {
      let res: any;
      if (editingId) {
        res = await updateAnnexureVIEntry(editingId, dataToSubmit);
      } else {
        res = await addAnnexureVIEntry(dataToSubmit);
      }

      if (!res || !res.success) {
        alert(res?.error || 'Operation failed. Please check the values and try again.');
        return;
      }

      const savedItem = res.data || { ...dataToSubmit, id: editingId || `avi-${Date.now()}` };
      if (editingId) {
        setRecords(prev => prev.map(r => r.id === editingId ? savedItem : r));
      } else {
        setRecords(prev => [savedItem, ...prev]);
      }

      handleCancel();
      router.refresh();
      alert(editingId ? 'Transaction Updated Successfully' : 'Transaction Added Successfully');
    } catch (err: any) {
      console.error(err);
      alert('Operation failed: ' + (err?.message || 'Please check the values and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (entry: any) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the entry for "${entry.platform || entry.campaignDesc || 'this entry'}"?\n\nThis will permanently delete this record from Annexure VI.`
      )
    ) {
      return;
    }

    setDeletingId(entry.id);
    try {
      const res = await deleteAnnexureVIEntry(entry.id);
      if (res && res.success) {
        setDeletedIds(prev => new Set(prev).add(entry.id));
        setRecords(prev => prev.filter(r => r.id !== entry.id));
        router.refresh();
        alert('Record deleted successfully.');
      } else {
        alert(res?.error || 'Failed to delete record.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error deleting record: ' + (err?.message || 'Please try again.'));
    } finally {
      setDeletingId(null);
    }
  };

  const calculatedSubtotal = records.reduce(
    (sum, e) => sum + (Number(e.totalExpenditure) || 0),
    0
  );
  const balance = Math.max(0, approvedBudget - calculatedSubtotal);
  const utilization = approvedBudget > 0 ? ((calculatedSubtotal / approvedBudget) * 100).toFixed(2) : '0.00';

  return (
    <div>
      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Approved Budget</div>
          <div className={styles.cardValue}>₹ {approvedBudget.toLocaleString('en-IN')}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Expenditure</div>
          <div className={styles.cardValue} style={{ color: 'var(--error)' }}>
            ₹ {calculatedSubtotal.toLocaleString('en-IN')}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Balance</div>
          <div className={styles.cardValue} style={{ color: 'var(--success)' }}>
            ₹ {balance.toLocaleString('en-IN')}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Utilization</div>
          <div className={styles.cardValue}>{utilization}%</div>
        </div>
      </div>

      <div className={styles.actionsBar} style={{ marginTop: '24px' }}>
        <h3 className={styles.title} style={{ fontSize: '20px', fontWeight: 700 }}>
          Expenditure Entries
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={styles.btnPrimary}
            style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold' }}
            onClick={() =>
              downloadTableAsDocx(
                'dataTable',
                'PM e-Vidya - Media & Campaign',
                'Annexure-VI',
                'Annexure-VI_Report.docx'
              )
            }
          >
            Download Docs Pattern
          </button>
          {role === 'ADMIN' && (
            <button
              className={styles.btnPrimary}
              onClick={() => {
                if (isAdding) {
                  handleCancel();
                } else {
                  setIsAdding(true);
                  setEditingId(null);
                }
              }}
            >
              {isAdding ? 'Cancel' : '+ Add New Entry'}
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <form className={styles.formGrid} onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
          <div className={styles.formGroup}>
            <label>Date / Period</label>
            <input
              type="text"
              name="datePeriod"
              placeholder="e.g. 15-Aug-26"
              value={formData.datePeriod}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Platform</label>
            <input
              type="text"
              name="platform"
              placeholder="e.g. Meta Ads, Google Ads"
              value={formData.platform}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Campaign Description</label>
            <input
              type="text"
              name="campaignDesc"
              placeholder="e.g. PM eVidya Awareness Campaign"
              value={formData.campaignDesc}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Service Provider</label>
            <input
              type="text"
              name="serviceProvider"
              placeholder="e.g. Various Agencies"
              value={formData.serviceProvider}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Campaign Type</label>
            <input
              type="text"
              name="campaignType"
              placeholder="e.g. Awareness"
              value={formData.campaignType}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Amount (₹)</label>
            <input
              type="number"
              name="amount"
              placeholder="0"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Tax (₹)</label>
            <input
              type="number"
              name="tax"
              placeholder="0"
              value={formData.tax}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>UTR Number</label>
            <input
              type="text"
              name="utrNumber"
              placeholder="e.g. UTR123456"
              value={formData.utrNumber}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Remarks</label>
            <input
              type="text"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Total Expenditure (₹) [Auto-Calculated]</label>
            <input
              type="text"
              value={`₹ ${((Number(formData.amount) || 0) + (Number(formData.tax) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              disabled
              style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed', fontWeight: 'bold' }}
            />
          </div>

          <div className={styles.formActions} style={{ gridColumn: '1 / -1', marginTop: '12px' }}>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? (editingId ? 'Updating Entry...' : 'Saving Entry...') : (editingId ? 'Update Entry' : 'Save Entry')}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleCancel}
              style={{ marginLeft: '12px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={styles.tableContainer}>
        <table id="dataTable" className={styles.dataTable}>
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'right' }}>Sl. No.</th>
              <th style={{ minWidth: '120px' }}>Date / Period</th>
              <th style={{ minWidth: '140px' }}>Platform</th>
              <th style={{ minWidth: '220px' }}>Campaign Description</th>
              <th style={{ minWidth: '150px' }}>Service Provider</th>
              <th style={{ minWidth: '130px' }}>Campaign Type</th>
              <th style={{ minWidth: '110px', textAlign: 'right' }}>Amount</th>
              <th style={{ minWidth: '90px', textAlign: 'right' }}>Tax</th>
              <th style={{ minWidth: '120px', textAlign: 'right' }}>Total</th>
              {role === 'ADMIN' && <th style={{ minWidth: '130px', textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={role === 'ADMIN' ? 10 : 9} style={{ textAlign: 'center', padding: '24px' }}>
                  No records found
                </td>
              </tr>
            ) : (
              records.map((entry, idx) => (
                <tr key={entry.id}>
                  <td style={{ textAlign: 'right' }}>{idx + 1}</td>
                  <td>{entry.datePeriod || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{entry.platform || '-'}</td>
                  <td>{entry.campaignDesc || '-'}</td>
                  <td>{entry.serviceProvider || '-'}</td>
                  <td>{entry.campaignType || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {entry.amount != null ? Number(entry.amount).toLocaleString('en-IN') : '-'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {entry.tax != null ? Number(entry.tax).toLocaleString('en-IN') : '0'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    ₹ {Number(entry.totalExpenditure || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {role === 'ADMIN' && (
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleEdit(entry)}
                          style={{
                            color: '#2563eb',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '12px'
                          }}
                          title="Edit this record"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry)}
                          disabled={deletingId === entry.id}
                          style={{
                            color: '#dc2626',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: deletingId === entry.id ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '12px'
                          }}
                          title="Delete this record"
                        >
                          {deletingId === entry.id ? 'Deleting...' : '🗑️ Delete'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          {records.length > 0 && (
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                <td colSpan={8} style={{ textAlign: 'right', padding: '12px' }}>
                  Subtotal:
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '12px',
                    color: '#0f172a',
                    fontSize: '15px'
                  }}
                >
                  ₹ {calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                {role === 'ADMIN' && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
