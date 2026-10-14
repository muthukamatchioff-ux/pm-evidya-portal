'use client';
import React, { useState } from 'react';
import { addAnnexureIIIEntry, updateAnnexureIIIEntry, deleteAnnexureIIIEntry } from '../actions';
import styles from '../budget.module.css';

export default function Component3Client({ role, budgetComponentId, entries }: { role?: string, budgetComponentId: string, entries: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    datePeriod: '', 
    personnelName: '', 
    designation: '', 
    supportType: '', 
    department: '', 
    workPeriod: '', 
    remuneration: '', 
    taDa: '', 
    otherCharges: '', 
    utrNumber: '', 
    remarks: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToSubmit = {
        budgetComponentId,
        datePeriod: formData.datePeriod,
        personnelName: formData.personnelName,
        designation: formData.designation,
        supportType: formData.supportType,
        department: formData.department,
        workPeriod: String(formData.workPeriod || '1'),
        remuneration: Number(formData.remuneration) || 0,
        taDa: Number(formData.taDa) || 0,
        otherCharges: Number(formData.otherCharges) || 0,
        utrNumber: formData.utrNumber,
        remarks: formData.remarks
      };
      
      let res: any;
      if (editingId) {
        res = await updateAnnexureIIIEntry(editingId, dataToSubmit);
      } else {
        res = await addAnnexureIIIEntry(dataToSubmit);
      }

      if (res && !res.success) {
        alert('Error: ' + (res.error || 'Failed to save entry'));
        return;
      }

      setIsAdding(false);
      setFormData({
        datePeriod: '', personnelName: '', designation: '', supportType: '', 
        department: '', workPeriod: '', remuneration: '', taDa: '', 
        otherCharges: '', utrNumber: '', remarks: ''
      });
      alert(editingId ? "Transaction Updated Successfully" : "Transaction Added Successfully");
      setEditingId(null);
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err.message || "Failed to save entry. Please check your inputs."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete entry for "${name || 'this record'}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await deleteAnnexureIIIEntry(id);
      if (res && !res.success) {
        alert('Error: ' + (res.error || 'Failed to delete'));
      } else {
        alert('Entry deleted successfully');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error deleting entry');
    } finally {
      setDeletingId(null);
    }
  };

  const totalCalculated = (Number(formData.remuneration) || 0) * (Number(formData.workPeriod) || 1) + (Number(formData.taDa) || 0) + (Number(formData.otherCharges) || 0);

  const handleDownloadDocx = async () => {
    const { downloadTableAsDocx } = await import('@/lib/tableToDocx');
    downloadTableAsDocx('dataTable', 'PM e-Vidya - Human Resource Support', 'Annexure-III', 'Annexure-III_Report.docx');
  };

  return (
    <div>
      <div className={styles.actionsBar} style={{ marginTop: '24px' }}>
        <h3 className={styles.title} style={{ fontSize: '20px' }}>Expenditure Entries</h3>
        <button className={styles.btnPrimary} style={{ backgroundColor: '#8b5cf6', color: 'white', marginRight: '12px', fontWeight: 'bold' }} onClick={handleDownloadDocx}>
          Download Docs Pattern
        </button>
        {role === 'ADMIN' && (
          <button className={styles.btnPrimary} onClick={() => { setIsAdding(!isAdding); if(!isAdding) { setEditingId(null); } }}>
            {isAdding ? 'Cancel' : '+ Add New Entry'}
          </button>
        )}
      </div>

      {isAdding && (
        <form className={styles.formGrid} onSubmit={handleSubmit}>
          
          <div className={styles.formGroup}>
            <label>Date / Period *</label>
            <input type="text" name="datePeriod" value={formData.datePeriod} onChange={handleChange} required placeholder="e.g. October 2026" />
          </div>
          <div className={styles.formGroup}>
            <label>Personnel Name *</label>
            <input type="text" name="personnelName" value={formData.personnelName} onChange={handleChange} required placeholder="e.g. Rahul Sharma" />
          </div>
          <div className={styles.formGroup}>
            <label>Role / Designation *</label>
            <select name="designation" value={formData.designation} onChange={handleChange} required className={styles.inputField} style={{ padding: '8px', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
              <option value="">Select Role</option>
              <option value="Editor">Editor</option>
              <option value="Social Media Person">Social Media Person</option>
              <option value="Coordinator">Coordinator</option>
              <option value="Camera Man">Camera Man</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Support Type</label>
            <input type="text" name="supportType" value={formData.supportType} onChange={handleChange} placeholder="e.g. Full-Time / Contract" />
          </div>
          <div className={styles.formGroup}>
            <label>Department</label>
            <input type="text" name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Media Production" />
          </div>
          <div className={styles.formGroup}>
            <label>Duration (Months) *</label>
            <input type="number" step="any" min="0.1" name="workPeriod" value={formData.workPeriod} onChange={handleChange} required placeholder="e.g. 1" />
          </div>
          <div className={styles.formGroup}>
            <label>Monthly Salary / Remuneration (₹) *</label>
            <input type="number" step="any" min="0" name="remuneration" value={formData.remuneration} onChange={handleChange} required placeholder="e.g. 25000" />
          </div>
          <div className={styles.formGroup}>
            <label>TA / DA (₹)</label>
            <input type="number" step="any" min="0" name="taDa" value={formData.taDa} onChange={handleChange} placeholder="0" />
          </div>
          <div className={styles.formGroup}>
            <label>Other Charges (₹)</label>
            <input type="number" step="any" min="0" name="otherCharges" value={formData.otherCharges} onChange={handleChange} placeholder="0" />
          </div>
          <div className={styles.formGroup}>
            <label>UTR Number / Voucher No.</label>
            <input type="text" name="utrNumber" value={formData.utrNumber} onChange={handleChange} placeholder="e.g. UTR12345678" />
          </div>
          <div className={styles.formGroup}>
            <label>Remarks / Narration</label>
            <input type="text" name="remarks" value={formData.remarks} onChange={handleChange} placeholder="e.g. Paid for editing work" />
          </div>
          <div className={styles.formGroup}>
            <label>Total Expenditure (₹)</label>
            <input type="text" value={`₹ ${totalCalculated.toLocaleString('en-IN')}`} disabled style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed', fontWeight: 'bold' }} />
          </div>
          <div className={styles.formActions}>
            <button type="submit" disabled={isSubmitting} className={styles.btnPrimary} style={{ padding: '10px 24px', fontWeight: 'bold' }}>
              {isSubmitting ? "Saving..." : (editingId ? "Update Entry" : "Save Entry")}
            </button>
          </div>
        </form>
      )}

      <div className={styles.tableContainer}>
        <table id="dataTable" className={styles.dataTable}>
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Date / Period</th>
              <th>Name</th>
              <th>Role</th>
              <th>Support Type</th>
              <th>Department</th>
              <th>Duration (Months)</th>
              <th>Monthly Salary</th>
              <th>Total</th>
              <th>Voucher No.</th>
              <th>Remarks/Narration</th>
              {role === 'ADMIN' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={12} style={{textAlign:'center'}}>No records found</td></tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={entry.id}>
                  <td>{idx + 1}</td>
                  <td>{entry.datePeriod}</td>
                  <td>{entry.personnelName}</td>
                  <td>{entry.designation}</td>
                  <td>{entry.supportType || '-'}</td>
                  <td>{entry.department || '-'}</td>
                  <td>{entry.workPeriod}</td>
                  <td>₹ {(Number(entry.remuneration) || 0).toLocaleString('en-IN')}</td>
                  <td style={{fontWeight: 'bold'}}>₹ {(Number(entry.totalExpenditure) || 0).toLocaleString('en-IN')}</td>
                  <td>{entry.voucherNo || entry.utrNumber || '-'}</td>
                  <td><div title={entry.narration || entry.remarks || ''} style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'help' }}>{entry.narration || entry.remarks || '-'}</div></td>
                  {role === 'ADMIN' && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button 
                        onClick={() => { 
                          setIsAdding(true); 
                          setEditingId(entry.id); 
                          setFormData({
                            datePeriod: entry.datePeriod || '',
                            personnelName: entry.personnelName || '',
                            designation: entry.designation || '',
                            supportType: entry.supportType || '',
                            department: entry.department || '',
                            workPeriod: entry.workPeriod || '',
                            remuneration: entry.remuneration?.toString() || '',
                            taDa: entry.taDa?.toString() || '',
                            otherCharges: entry.otherCharges?.toString() || '',
                            utrNumber: entry.utrNumber || entry.voucherNo || '',
                            remarks: entry.remarks || entry.narration || ''
                          }); 
                        }} 
                        style={{ color: '#2563eb', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', marginRight: '10px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(entry.id, entry.personnelName)}
                        disabled={deletingId === entry.id}
                        style={{ color: '#dc2626', fontWeight: 600, border: 'none', background: 'none', cursor: deletingId === entry.id ? 'not-allowed' : 'pointer', opacity: deletingId === entry.id ? 0.6 : 1 }}
                      >
                        {deletingId === entry.id ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
