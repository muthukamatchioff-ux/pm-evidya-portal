'use client';
import React, { useState } from 'react';
import { addAnnexureIIIEntry, updateAnnexureIIIEntry } from '../actions';
import styles from '../budget.module.css';
import { downloadTableAsDocx } from '@/lib/tableToDocx';

export default function Component3Client({ budgetComponentId, entries }: { budgetComponentId: string, entries: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({datePeriod: '', personnelName: '', designation: '', supportType: '', department: '', workPeriod: '', remuneration: '', taDa: '', otherCharges: '', utrNumber: '', remarks: ''});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit: any = { budgetComponentId };
    Object.keys(formData).forEach(k => {
      const numFields = ['quantity', 'remuneration', 'taDa', 'otherCharges'];
      dataToSubmit[k] = numFields.includes(k) ? Number((formData as any)[k]) || 0 : (formData as any)[k];
    });
    
    if (editingId) {
      await updateAnnexureIIIEntry(editingId, dataToSubmit);
    } else {
      await addAnnexureIIIEntry(dataToSubmit);
    }
    setIsAdding(false);
    setFormData({datePeriod: '', personnelName: '', designation: '', supportType: '', department: '', workPeriod: '', remuneration: '', taDa: '', otherCharges: '', utrNumber: '', remarks: ''});
    alert(editingId ? "Transaction Updated Successfully" : "Transaction Added Successfully");
    setEditingId(null);
  };

  return (
    <div>
      <div className={styles.actionsBar} style={{ marginTop: '24px' }}>
        <h3 className={styles.title} style={{ fontSize: '20px' }}>Expenditure Entries</h3>
                <button className={styles.btnPrimary} style={{ backgroundColor: '#8b5cf6', color: 'white', marginRight: '12px', fontWeight: 'bold' }} onClick={() => downloadTableAsDocx('dataTable', 'PM e-Vidya - Human Resource Support', 'Annexure-III', 'Annexure-III_Report.docx')}>
          Download Docs Pattern
        </button>
        <button className={styles.btnPrimary} onClick={() => { setIsAdding(!isAdding); if(!isAdding) { setEditingId(null); } }}>
          {isAdding ? 'Cancel' : '+ Add New Entry'}
        </button>
      </div>

      {isAdding && (
        <form className={styles.formGrid} onSubmit={handleSubmit}>
          
          <div className={styles.formGroup}>
            <label>Date / Period</label>
            <input type="text" name="datePeriod" value={formData.datePeriod} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Personnel Name</label>
            <input type="text" name="personnelName" value={formData.personnelName} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Designation</label>
            <input type="text" name="designation" value={formData.designation} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Support Type</label>
            <input type="text" name="supportType" value={formData.supportType} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Department</label>
            <input type="text" name="department" value={formData.department} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Work Period</label>
            <input type="text" name="workPeriod" value={formData.workPeriod} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Remuneration</label>
            <input type="number" name="remuneration" value={formData.remuneration} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>TA / DA</label>
            <input type="number" name="taDa" value={formData.taDa} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Other Charges</label>
            <input type="number" name="otherCharges" value={formData.otherCharges} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>UTR Number</label>
            <input type="text" name="utrNumber" value={formData.utrNumber} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Remarks</label>
            <input type="text" name="remarks" value={formData.remarks} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Total Expenditure (₹)</label>
            <input type="text" value={(Number(formData.remuneration) || 0) + (Number(formData.taDa) || 0) + (Number(formData.otherCharges) || 0)} disabled style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed' }} />
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary}>{editingId ? "Update Entry" : "Save Entry"}</button>
          </div>
        </form>
      )}

      <div className={styles.tableContainer}>
        <table id="dataTable" className={styles.dataTable}>
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Date / Period</th><th>Personnel Name</th><th>Designation</th><th>Support Type</th><th>Department</th><th>Work Period</th><th>Remuneration</th>
              <th>Total</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={10} style={{textAlign:'center'}}>No records found</td></tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={entry.id}>
                  <td>{idx + 1}</td>
                  <td>{entry.datePeriod}</td><td>{entry.personnelName}</td><td>{entry.designation}</td><td>{entry.supportType}</td><td>{entry.department}</td><td>{entry.workPeriod}</td><td>{entry.remuneration}</td>
                  <td style={{fontWeight: 'bold'}}>₹ {entry.totalExpenditure.toLocaleString('en-IN')}</td>
                  <td><button onClick={() => { setIsAdding(true); setEditingId(entry.id); Object.keys(entry).forEach(k => { if(entry[k] === null) entry[k] = ''; }); setFormData(entry); }} style={{color: 'blue', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer'}}>Edit</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
