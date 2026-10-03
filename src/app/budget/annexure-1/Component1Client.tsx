'use client';

import React, { useState } from 'react';
import { addAnnexureIEntry, updateAnnexureIEntry } from '../actions';
import styles from '../budget.module.css';
import { downloadTableAsDocx } from '@/lib/tableToDocx';

export default function Component1Client({ budgetComponentId, entries }: { budgetComponentId: string, entries: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    datePeriod: '',
    expertName: '',
    designation: '',
    activity: '',
    workingDays: '',
    honorarium: '',
    travelAllowance: '',
    otherCharges: '',
    utrNumber: '',
    contentDuration: '',
    remarks: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      budgetComponentId,
      datePeriod: formData.datePeriod,
      expertName: formData.expertName,
      designation: formData.designation,
      activity: formData.activity,
      workingDays: Number(formData.workingDays) || 0,
      honorarium: Number(formData.honorarium) || 0,
      travelAllowance: Number(formData.travelAllowance) || 0,
      otherCharges: Number(formData.otherCharges) || 0,
      utrNumber: formData.utrNumber,
      contentDuration: formData.contentDuration,
      remarks: formData.remarks
    };
    if (editingId) await updateAnnexureIEntry(editingId, dataToSubmit); else await addAnnexureIEntry(dataToSubmit);
    setIsAdding(false); setEditingId(null);
    setFormData({
      datePeriod: '', expertName: '', designation: '', activity: '',
      workingDays: '', honorarium: '', travelAllowance: '', otherCharges: '',
      utrNumber: '', contentDuration: '', remarks: ''
    });
    alert("Transaction Added Successfully");
  };

  return (
    <div>
      <div className={styles.actionsBar} style={{ marginTop: '24px' }}>
        <h3 className={styles.title} style={{ fontSize: '20px' }}>Expenditure Entries</h3>
        <button className={styles.btnPrimary} style={{ backgroundColor: '#8b5cf6', color: 'white', marginRight: '12px', fontWeight: 'bold' }} onClick={() => downloadTableAsDocx('dataTable', 'PM e-Vidya - Digital Content Development & Production', 'Annexure-I', 'Annexure-I_Report.docx')}>
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
            <label>Expert / Resource Person</label>
            <input type="text" name="expertName" value={formData.expertName} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Designation</label>
            <input type="text" name="designation" value={formData.designation} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Activity / Content</label>
            <input type="text" name="activity" value={formData.activity} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Working Days</label>
            <input type="number" name="workingDays" value={formData.workingDays} onChange={handleChange} />
          </div>
          <div className={styles.formGroup}>
            <label>Honorarium (₹)</label>
            <input type="number" name="honorarium" value={formData.honorarium} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Travel Allowance (TA) (₹)</label>
            <input type="number" name="travelAllowance" value={formData.travelAllowance} onChange={handleChange} />
          </div>
          <div className={styles.formGroup}>
            <label>Other Charges (₹)</label>
            <input type="number" name="otherCharges" value={formData.otherCharges} onChange={handleChange} />
          </div>
          <div className={styles.formGroup}>
            <label>Total Expenditure (₹)</label>
            <input 
              type="text" 
              value={(Number(formData.honorarium) || 0) + (Number(formData.travelAllowance) || 0) + (Number(formData.otherCharges) || 0)} 
              disabled 
              style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed' }}
            />
          </div>
          <div className={styles.formGroup}>
            <label>UTR / Payment Ref No.</label>
            <input type="text" name="utrNumber" value={formData.utrNumber} onChange={handleChange} />
          </div>
          <div className={styles.formGroup}>
            <label>Content Duration</label>
            <input type="text" name="contentDuration" value={formData.contentDuration} onChange={handleChange} />
          </div>
          <div className={styles.formGroup}>
            <label>Remarks</label>
            <input type="text" name="remarks" value={formData.remarks} onChange={handleChange} />
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
              <th>Date</th>
              <th>Expert</th>
              <th>Designation</th>
              <th>Days</th>
              <th>Honorarium</th>
              <th>TA</th>
              <th>Total</th>
              <th>UTR</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={10} style={{textAlign:'center'}}>No records found</td></tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={entry.id}>
                  <td>{idx + 1}</td>
                  <td>{entry.datePeriod}</td>
                  <td>{entry.expertName}</td>
                  <td>{entry.designation}</td>
                  <td>{entry.workingDays}</td>
                  <td>₹ {entry.honorarium.toLocaleString('en-IN')}</td>
                  <td>₹ {entry.travelAllowance.toLocaleString('en-IN')}</td>
                  <td style={{fontWeight: 'bold'}}>₹ {entry.totalExpenditure.toLocaleString('en-IN')}</td>
                  <td>{entry.utrNumber || '-'}</td>
                  <td>{entry.remarks || '-'}</td>
                  <td><button onClick={() => { setIsAdding(true); setEditingId(entry.id); setFormData({ ...entry, workingDays: entry.workingDays?.toString() || '', honorarium: entry.honorarium?.toString() || '', travelAllowance: entry.travelAllowance?.toString() || '', otherCharges: entry.otherCharges?.toString() || '' }); }} style={{color: 'blue', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer'}}>Edit</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
