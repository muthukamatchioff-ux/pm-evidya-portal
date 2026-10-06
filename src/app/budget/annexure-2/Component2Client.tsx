'use client';
import React, { useState } from 'react';
import { addAnnexureIIEntry, updateAnnexureIIEntry } from '../actions';
import styles from '../budget.module.css';
import { downloadTableAsDocx } from '@/lib/tableToDocx';

export default function Component2Client({ role, budgetComponentId, entries }: { role?: string, budgetComponentId: string, entries: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({datePeriod: '', trainingName: '', trainingType: '', participant: '', venue: '', trainingDays: '', trainingDates: '', trainerFee: '', trainingCost: '', travelAllowance: '', accommodation: '', otherExpenses: '', utrNumber: '', remarks: ''});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit: any = { budgetComponentId };
    Object.keys(formData).forEach(k => {
      const numFields = ['quantity', 'trainerFee', 'trainingCost', 'travelAllowance', 'accommodation', 'otherExpenses', 'trainingDays', 'noOfParticipants'];
      dataToSubmit[k] = numFields.includes(k) ? Number((formData as any)[k]) || 0 : (formData as any)[k];
    });
    
    try {
    if (editingId) {
      await updateAnnexureIIEntry(editingId, dataToSubmit);
    } else {
      await addAnnexureIIEntry(dataToSubmit);
    }
    setIsAdding(false);
    setFormData({datePeriod: '', trainingName: '', trainingType: '', participant: '', venue: '', trainingDays: '', trainingDates: '', trainerFee: '', trainingCost: '', travelAllowance: '', accommodation: '', otherExpenses: '', utrNumber: '', remarks: ''});
    alert(editingId ? "Transaction Updated Successfully" : "Transaction Added Successfully");
    setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save entry. Please check the values and try again.");
    }
  };

  return (
    <div>
      <div className={styles.actionsBar} style={{ marginTop: '24px' }}>
        <h3 className={styles.title} style={{ fontSize: '20px' }}>Expenditure Entries</h3>
                <button className={styles.btnPrimary} style={{ backgroundColor: '#8b5cf6', color: 'white', marginRight: '12px', fontWeight: 'bold' }} onClick={() => downloadTableAsDocx('dataTable', 'PM e-Vidya - Capacity Building & Training', 'Annexure-II', 'Annexure-II_Report.docx')}>
          Download Docs Pattern
        </button>
        {role === 'ADMIN' && <button className={styles.btnPrimary} onClick={() => { setIsAdding(!isAdding); if(!isAdding) { setEditingId(null); } }}>
          {isAdding ? 'Cancel' : '+ Add New Entry'}
        </button>}
      </div>

      {isAdding && (
        <form className={styles.formGrid} onSubmit={handleSubmit}>
          
          <div className={styles.formGroup}>
            <label>Date / Period</label>
            <input type="text" name="datePeriod" value={formData.datePeriod} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Training Name</label>
            <input type="text" name="trainingName" value={formData.trainingName} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Training Type</label>
            <input type="text" name="trainingType" value={formData.trainingType} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Participant / Expert</label>
            <input type="text" name="participant" value={formData.participant} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Venue</label>
            <input type="text" name="venue" value={formData.venue} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Training Days</label>
            <input type="number" name="trainingDays" value={formData.trainingDays} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Trainer Fee</label>
            <input type="number" name="trainerFee" value={formData.trainerFee} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Training Cost</label>
            <input type="number" name="trainingCost" value={formData.trainingCost} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Travel Allowance</label>
            <input type="number" name="travelAllowance" value={formData.travelAllowance} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Accommodation</label>
            <input type="number" name="accommodation" value={formData.accommodation} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Other Expenses</label>
            <input type="number" name="otherExpenses" value={formData.otherExpenses} onChange={handleChange}  />
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
            <input type="text" value={(Number(formData.trainerFee) || 0) + (Number(formData.trainingCost) || 0) + (Number(formData.travelAllowance) || 0) + (Number(formData.accommodation) || 0) + (Number(formData.otherExpenses) || 0)} disabled style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed' }} />
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
              <th>Date / Period</th><th>Training Name</th><th>Training Type</th><th>Participant / Expert</th><th>Venue</th><th>Training Days</th><th>Training Dates</th>
              <th>Total</th><th>Remarks</th>{role === 'ADMIN' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={9} style={{textAlign:'center'}}>No records found</td></tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={entry.id}>
                  <td>{idx + 1}</td>
                  <td>{entry.datePeriod}</td><td>{entry.trainingName}</td><td>{entry.trainingType}</td><td>{entry.participant}</td><td>{entry.venue}</td><td>{entry.trainingDays}</td><td>{entry.trainingDates}</td>
                  <td style={{fontWeight: 'bold'}}>₹ {entry.totalExpenditure.toLocaleString('en-IN')}</td>
                  <td>{entry.remarks}</td>
                  {role === 'ADMIN' && <td><button onClick={() => { setIsAdding(true); setEditingId(entry.id); Object.keys(entry).forEach(k => { if(entry[k] === null) entry[k] = ''; }); setFormData(entry); }} style={{color: 'blue', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer'}}>Edit</button></td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
