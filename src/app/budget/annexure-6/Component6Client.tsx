'use client';
import React, { useState } from 'react';
import { addAnnexureVIEntry, updateAnnexureVIEntry } from '../actions';
import styles from '../budget.module.css';
import { downloadTableAsDocx } from '@/lib/tableToDocx';

export default function Component6Client({ role, budgetComponentId, entries }: { role?: string, budgetComponentId: string, entries: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({datePeriod: '', platform: '', campaignDesc: '', serviceProvider: '', campaignType: '', amount: '', tax: '', utrNumber: '', remarks: ''});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit: any = { budgetComponentId };
    Object.keys(formData).forEach(k => {
      const numFields = ['quantity', 'amount', 'tax'];
      dataToSubmit[k] = numFields.includes(k) ? Number((formData as any)[k]) || 0 : (formData as any)[k];
    });
    
    if (editingId) {
      await updateAnnexureVIEntry(editingId, dataToSubmit);
    } else {
      await addAnnexureVIEntry(dataToSubmit);
    }
    setIsAdding(false);
    setFormData({datePeriod: '', platform: '', campaignDesc: '', serviceProvider: '', campaignType: '', amount: '', tax: '', utrNumber: '', remarks: ''});
    alert(editingId ? "Transaction Updated Successfully" : "Transaction Added Successfully");
    setEditingId(null);
  };

  return (
    <div>
      <div className={styles.actionsBar} style={{ marginTop: '24px' }}>
        <h3 className={styles.title} style={{ fontSize: '20px' }}>Expenditure Entries</h3>
                <button className={styles.btnPrimary} style={{ backgroundColor: '#8b5cf6', color: 'white', marginRight: '12px', fontWeight: 'bold' }} onClick={() => downloadTableAsDocx('dataTable', 'PM e-Vidya - Media & Campaign', 'Annexure-VI', 'Annexure-VI_Report.docx')}>
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
            <label>Platform</label>
            <input type="text" name="platform" value={formData.platform} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Campaign Description</label>
            <input type="text" name="campaignDesc" value={formData.campaignDesc} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Service Provider</label>
            <input type="text" name="serviceProvider" value={formData.serviceProvider} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Campaign Type</label>
            <input type="text" name="campaignType" value={formData.campaignType} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Amount</label>
            <input type="number" name="amount" value={formData.amount} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Tax</label>
            <input type="number" name="tax" value={formData.tax} onChange={handleChange}  />
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
            <input type="text" value={(Number(formData.amount) || 0) + (Number(formData.tax) || 0)} disabled style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed' }} />
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
              <th>Date / Period</th><th>Platform</th><th>Campaign Description</th><th>Service Provider</th><th>Campaign Type</th><th>Amount</th><th>Tax</th>
              <th>Total</th>{role === 'ADMIN' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={10} style={{textAlign:'center'}}>No records found</td></tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={entry.id}>
                  <td>{idx + 1}</td>
                  <td>{entry.datePeriod}</td><td>{entry.platform}</td><td>{entry.campaignDesc}</td><td>{entry.serviceProvider}</td><td>{entry.campaignType}</td><td>{entry.amount}</td><td>{entry.tax}</td>
                  <td style={{fontWeight: 'bold'}}>₹ {entry.totalExpenditure.toLocaleString('en-IN')}</td>
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
