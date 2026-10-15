'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addAnnexureIIEntry, updateAnnexureIIEntry, deleteAnnexureIIEntry } from '../actions';
import styles from '../budget.module.css';
import { downloadTableAsDocx } from '@/lib/tableToDocx';

export default function Component2Client({
  role,
  budgetComponentId,
  entries
}: {
  role?: string;
  budgetComponentId: string;
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
        return [...filteredIncoming, ...preservedLocals];
      });
    }
  }, [entries, deletedIds]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    datePeriod: '',
    trainingName: 'Capacity Building Program on PM eVidya Content Development Ecosystem and Digital Content Standards for Stakeholders.',
    trainingType: 'Hybrid',
    participant: '',
    venue: 'NIMI Chennai',
    trainingDays: '2',
    trainingDates: '30:07:2026 & 31:07:2026',
    travelAllowance: '',
    utrNumber: '',
    remarks: '',
    trainerFee: '0',
    trainingCost: '0',
    accommodation: '0',
    otherExpenses: '0'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (entry: any) => {
    setIsAdding(true);
    setEditingId(entry.id);
    setFormData({
      datePeriod: entry.datePeriod || '',
      trainingName: entry.trainingName || 'Capacity Building Program on PM eVidya Content Development Ecosystem and Digital Content Standards for Stakeholders.',
      trainingType: entry.trainingType || 'Hybrid',
      participant: entry.participant || '',
      venue: entry.venue || 'NIMI Chennai',
      trainingDays: entry.trainingDays != null ? String(entry.trainingDays) : '2',
      trainingDates: entry.trainingDates || '30:07:2026 & 31:07:2026',
      travelAllowance: entry.travelAllowance ? String(entry.travelAllowance) : '',
      utrNumber: entry.utrNumber || '',
      remarks: entry.remarks || '',
      trainerFee: entry.trainerFee ? String(entry.trainerFee) : '0',
      trainingCost: entry.trainingCost ? String(entry.trainingCost) : '0',
      accommodation: entry.accommodation ? String(entry.accommodation) : '0',
      otherExpenses: entry.otherExpenses ? String(entry.otherExpenses) : '0'
    });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      datePeriod: '',
      trainingName: 'Capacity Building Program on PM eVidya Content Development Ecosystem and Digital Content Standards for Stakeholders.',
      trainingType: 'Hybrid',
      participant: '',
      venue: 'NIMI Chennai',
      trainingDays: '2',
      trainingDates: '30:07:2026 & 31:07:2026',
      travelAllowance: '',
      utrNumber: '',
      remarks: '',
      trainerFee: '0',
      trainingCost: '0',
      accommodation: '0',
      otherExpenses: '0'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const taAmount = Number(formData.travelAllowance) || 0;
    const dataToSubmit = {
      budgetComponentId,
      datePeriod: formData.datePeriod,
      trainingName: formData.trainingName,
      trainingType: formData.trainingType,
      participant: formData.participant,
      venue: formData.venue,
      trainingDays: Number(formData.trainingDays) || 0,
      trainingDates: formData.trainingDates,
      travelAllowance: taAmount,
      totalExpenditure: taAmount,
      utrNumber: formData.utrNumber,
      remarks: formData.remarks,
      trainerFee: Number(formData.trainerFee) || 0,
      trainingCost: Number(formData.trainingCost) || 0,
      accommodation: Number(formData.accommodation) || 0,
      otherExpenses: Number(formData.otherExpenses) || 0,
      noOfParticipants: 0,
      verificationStatus: 'DRAFT'
    };

    try {
      let res: any;
      if (editingId) {
        res = await updateAnnexureIIEntry(editingId, dataToSubmit);
      } else {
        res = await addAnnexureIIEntry(dataToSubmit);
      }

      if (!res || !res.success) {
        alert(res?.error || 'Operation failed. Please check the values and try again.');
        return;
      }

      const savedItem = res.data || { ...dataToSubmit, id: editingId || `aii-${Date.now()}` };
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
        `Are you sure you want to delete the record for "${entry.participant || 'this participant'}"?\n\nThis will permanently delete this record from Annexure II.`
      )
    ) {
      return;
    }

    setDeletingId(entry.id);
    try {
      const res = await deleteAnnexureIIEntry(entry.id);
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

  const totalTAAmount = records.reduce((sum, e) => sum + (Number(e.travelAllowance) || 0), 0);

  return (
    <div>
      <div className={styles.actionsBar} style={{ marginTop: '24px' }}>
        <h3 className={styles.title} style={{ fontSize: '20px', fontWeight: 700 }}>
          Capacity Building & Training
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={styles.btnPrimary}
            style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold' }}
            onClick={() =>
              downloadTableAsDocx(
                'dataTable',
                'PM e-Vidya - Capacity Building & Training',
                'Annexure-II',
                'Annexure-II_Report.docx'
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
            <label>datePeriod</label>
            <input
              type="text"
              name="datePeriod"
              placeholder="e.g. 12-Aug-26"
              value={formData.datePeriod}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>participant</label>
            <input
              type="text"
              name="participant"
              value={formData.participant}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>TA Amount</label>
            <input
              type="number"
              name="travelAllowance"
              placeholder="0"
              value={formData.travelAllowance}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>TA Voucher No.</label>
            <input
              type="text"
              name="utrNumber"
              placeholder="e.g. CN2/001802/26-27"
              value={formData.utrNumber}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>trainingDays</label>
            <input
              type="number"
              name="trainingDays"
              value={formData.trainingDays}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>trainingDates</label>
            <input
              type="text"
              name="trainingDates"
              value={formData.trainingDates}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>venue</label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>trainingType</label>
            <input
              type="text"
              name="trainingType"
              value={formData.trainingType}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
            <label>trainingName</label>
            <input
              type="text"
              name="trainingName"
              value={formData.trainingName}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
            <label>Ta Narration</label>
            <textarea
              name="remarks"
              rows={2}
              value={formData.remarks}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1'
              }}
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
              <th style={{ minWidth: '110px', textAlign: 'center' }}>datePeriod</th>
              <th style={{ minWidth: '280px' }}>trainingName</th>
              <th style={{ minWidth: '90px', textAlign: 'center' }}>trainingType</th>
              <th style={{ minWidth: '170px' }}>participant</th>
              <th style={{ minWidth: '120px' }}>venue</th>
              <th style={{ width: '90px', textAlign: 'right' }}>trainingDays</th>
              <th style={{ minWidth: '110px', textAlign: 'right' }}>TA Amount</th>
              <th style={{ minWidth: '140px' }}>TA Voucher No.</th>
              <th style={{ minWidth: '240px' }}>Ta Narration</th>
              <th style={{ minWidth: '150px', textAlign: 'center' }}>trainingDates</th>
              {role === 'ADMIN' && <th style={{ minWidth: '130px', textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={role === 'ADMIN' ? 12 : 11} style={{ textAlign: 'center', padding: '24px' }}>
                  No records found
                </td>
              </tr>
            ) : (
              records.map((entry, idx) => (
                <tr key={entry.id}>
                  <td style={{ textAlign: 'right' }}>{idx + 1}</td>
                  <td style={{ textAlign: 'center' }}>{entry.datePeriod || '-'}</td>
                  <td>
                    <div
                      title={entry.trainingName || ''}
                      style={{
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: '1.45',
                        fontSize: '13px'
                      }}
                    >
                      {entry.trainingName || '-'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{entry.trainingType || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{entry.participant || '-'}</td>
                  <td>{entry.venue || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {entry.trainingDays != null && entry.trainingDays !== '' ? entry.trainingDays : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {entry.travelAllowance && Number(entry.travelAllowance) > 0
                      ? `₹ ${Number(entry.travelAllowance).toLocaleString('en-IN')}`
                      : '-'}
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{entry.utrNumber || '-'}</td>
                  <td>
                    <div
                      title={entry.remarks || ''}
                      style={{
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: '1.45',
                        fontSize: '13px'
                      }}
                    >
                      {entry.remarks || '-'}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{entry.trainingDates || '-'}</td>
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
                <td colSpan={7} style={{ textAlign: 'right', padding: '12px' }}>
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
                  ₹ {totalTAAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={3}></td>
                {role === 'ADMIN' && <td></td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
