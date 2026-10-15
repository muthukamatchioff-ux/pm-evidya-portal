'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addAnnexureIEntry, updateAnnexureIEntry, deleteAnnexureIEntry } from '../actions';
import styles from '../budget.module.css';
import { downloadTableAsDocx } from '@/lib/tableToDocx';

export default function Component1Client({
  role,
  budgetComponentId,
  entries
}: {
  role?: string;
  budgetComponentId: string;
  entries: any[];
}) {
  const router = useRouter();
  const [records, setRecords] = useState(entries);
  useEffect(() => {
    setRecords(entries);
  }, [entries]);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    expertName: '',
    designation: '',
    workingDays: '',
    datePeriod: '', // HA Issued Date
    honorarium: '',
    utrNumber: '', // Honorarium Voucher No.
    remarks: '', // Honorarium Narration
    tranType: '', // TA Date
    travelAllowance: '',
    voucherNo: '', // TA Voucher No.
    narration: '', // TA Narration
    activity: 'Digital Content Development',
    otherCharges: '',
    contentDuration: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (entry: any) => {
    setIsAdding(true);
    setEditingId(entry.id);
    setFormData({
      expertName: entry.expertName || '',
      designation: entry.designation || '',
      workingDays: entry.workingDays != null ? String(entry.workingDays) : '',
      datePeriod: entry.datePeriod || '',
      honorarium: entry.honorarium ? String(entry.honorarium) : '',
      utrNumber: entry.utrNumber || '',
      remarks: entry.remarks || '',
      tranType: entry.tranType || '',
      travelAllowance: entry.travelAllowance ? String(entry.travelAllowance) : '',
      voucherNo: entry.voucherNo || '',
      narration: entry.narration || '',
      activity: entry.activity || 'Digital Content Development',
      otherCharges: entry.otherCharges ? String(entry.otherCharges) : '',
      contentDuration: entry.contentDuration || ''
    });
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      expertName: '',
      designation: '',
      workingDays: '',
      datePeriod: '',
      honorarium: '',
      utrNumber: '',
      remarks: '',
      tranType: '',
      travelAllowance: '',
      voucherNo: '',
      narration: '',
      activity: 'Digital Content Development',
      otherCharges: '',
      contentDuration: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        budgetComponentId,
        expertName: formData.expertName,
        designation: formData.designation,
        workingDays: Number(formData.workingDays) || 0,
        datePeriod: formData.datePeriod,
        honorarium: Number(formData.honorarium) || 0,
        utrNumber: formData.utrNumber,
        remarks: formData.remarks,
        tranType: formData.tranType,
        travelAllowance: Number(formData.travelAllowance) || 0,
        voucherNo: formData.voucherNo,
        narration: formData.narration,
        activity: formData.activity || 'Digital Content Development',
        otherCharges: Number(formData.otherCharges) || 0,
        contentDuration: formData.contentDuration
      };

      let res;
      if (editingId) {
        res = await updateAnnexureIEntry(editingId, dataToSubmit);
      } else {
        res = await addAnnexureIEntry(dataToSubmit);
      }

      if (res && !res.success) {
        alert(res.error || 'Operation failed');
        return;
      }

      if (res?.data) {
        if (editingId) {
          setRecords(prev => prev.map(r => r.id === editingId ? res.data : r));
        } else {
          setRecords(prev => [...prev, res.data]);
        }
      }

      handleCancel();
      router.refresh();
      alert(editingId ? 'Transaction Updated Successfully' : 'Transaction Added Successfully');
    } catch (err: any) {
      console.error(err);
      alert('Operation failed: ' + (err?.message || 'Please try again'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (entry: any) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the record for "${entry.expertName}"?\n\nThis will permanently delete this record from Annexure I.`
      )
    ) {
      return;
    }

    setDeletingId(entry.id);
    try {
      const res = await deleteAnnexureIEntry(entry.id);
      if (res && res.success) {
        setRecords(prev => prev.filter(r => r.id !== entry.id));
        router.refresh();
        alert('Record deleted successfully.');
      } else {
        alert(res?.error || 'Failed to delete record.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting record.');
    } finally {
      setDeletingId(null);
    }
  };

  // Safe Total Calculation based on active records
  const calculatedHonorariumTotal = records.reduce(
    (sum, e) => sum + (Number(e.honorarium) || 0),
    0
  );
  const calculatedTATotal = records.reduce(
    (sum, e) => sum + (Number(e.travelAllowance) || 0),
    0
  );
  const calculatedSubtotal = records.reduce(
    (sum, e) => sum + ((Number(e.honorarium) || 0) + (Number(e.travelAllowance) || 0)),
    0
  );

  return (
    <div>
      <div className={styles.actionsBar} style={{ marginTop: '24px' }}>
        <h3 className={styles.title} style={{ fontSize: '20px', fontWeight: 700 }}>
          Digital content Development
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className={styles.btnPrimary}
            style={{ backgroundColor: '#8b5cf6', color: 'white', fontWeight: 'bold' }}
            onClick={() =>
              downloadTableAsDocx(
                'dataTable',
                'PM e-Vidya - Digital Content Development & Production',
                'Annexure-I',
                'Annexure-I_Report.docx'
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
            <label>Name</label>
            <input
              type="text"
              name="expertName"
              value={formData.expertName}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Designation</label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label>Working Days</label>
            <input
              type="number"
              name="workingDays"
              value={formData.workingDays}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>HA Issued Date</label>
            <input
              type="text"
              name="datePeriod"
              placeholder="e.g. 21.07.2026"
              value={formData.datePeriod}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Honorarium Amount (₹)</label>
            <input
              type="number"
              name="honorarium"
              placeholder="0"
              value={formData.honorarium}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Honorarium Voucher No.</label>
            <input
              type="text"
              name="utrNumber"
              placeholder="e.g. CN2/00149/26-27"
              value={formData.utrNumber}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
            <label>Honorarium Narration</label>
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
          <div className={styles.formGroup}>
            <label>TA Date</label>
            <input
              type="text"
              name="tranType"
              placeholder="e.g. 27.07.2026"
              value={formData.tranType}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>TA Amount (₹)</label>
            <input
              type="number"
              name="travelAllowance"
              placeholder="0"
              value={formData.travelAllowance}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label>TA Voucher No.</label>
            <input
              type="text"
              name="voucherNo"
              placeholder="e.g. CN2/001566/26-27"
              value={formData.voucherNo}
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
            <label>TA Narration</label>
            <textarea
              name="narration"
              rows={2}
              value={formData.narration}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1'
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Total Amount (₹) [Auto-Calculated]</label>
            <input
              type="text"
              value={`₹ ${((Number(formData.honorarium) || 0) + (Number(formData.travelAllowance) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
              <th style={{ minWidth: '150px' }}>Name</th>
              <th style={{ minWidth: '140px' }}>Designation</th>
              <th style={{ width: '90px', textAlign: 'right' }}>Working Days</th>
              <th style={{ minWidth: '110px', textAlign: 'center' }}>HA Issued Date</th>
              <th style={{ minWidth: '130px', textAlign: 'right' }}>Honorarium Amount (₹)</th>
              <th style={{ minWidth: '140px' }}>Honorarium Voucher No.</th>
              <th style={{ minWidth: '220px' }}>Honorarium Narration</th>
              <th style={{ minWidth: '110px', textAlign: 'center' }}>TA Date</th>
              <th style={{ minWidth: '110px', textAlign: 'right' }}>TA Amount (₹)</th>
              <th style={{ minWidth: '140px' }}>TA Voucher No.</th>
              <th style={{ minWidth: '200px' }}>TA Narration</th>
              <th style={{ minWidth: '130px', textAlign: 'right' }}>Total Amount (₹)</th>
              {role === 'ADMIN' && <th style={{ minWidth: '130px', textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={role === 'ADMIN' ? 14 : 13} style={{ textAlign: 'center', padding: '24px' }}>
                  No records found
                </td>
              </tr>
            ) : (
              records.map((entry, idx) => {
                const total = (Number(entry.honorarium) || 0) + (Number(entry.travelAllowance) || 0);
                const hasHA = entry.honorarium && Number(entry.honorarium) > 0;
                const hasTA = entry.travelAllowance && Number(entry.travelAllowance) > 0;

                return (
                  <tr key={entry.id}>
                    <td style={{ textAlign: 'right' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{entry.expertName || '-'}</td>
                    <td>{entry.designation || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {entry.workingDays != null && entry.workingDays !== '' ? entry.workingDays : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{entry.datePeriod || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {hasHA ? Number(entry.honorarium).toLocaleString('en-IN') : '-'}
                    </td>
                    <td>{entry.utrNumber || '-'}</td>
                    <td>
                      <div
                        title={entry.remarks || ''}
                        style={{
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: '1.4',
                          fontSize: '13px'
                        }}
                      >
                        {entry.remarks || '-'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{entry.tranType || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {hasTA ? Number(entry.travelAllowance).toLocaleString('en-IN') : '-'}
                    </td>
                    <td>{entry.voucherNo || '-'}</td>
                    <td>
                      <div
                        title={entry.narration || ''}
                        style={{
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: '1.4',
                          fontSize: '13px'
                        }}
                      >
                        {entry.narration || '-'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      ₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                );
              })
            )}
          </tbody>
          {records.length > 0 && (
            <tfoot>
              <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                <td colSpan={5} style={{ textAlign: 'right', padding: '12px' }}>
                  Subtotal:
                </td>
                <td style={{ textAlign: 'right', padding: '12px' }}>
                  ₹ {calculatedHonorariumTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={3}></td>
                <td style={{ textAlign: 'right', padding: '12px' }}>
                  ₹ {calculatedTATotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={2}></td>
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
