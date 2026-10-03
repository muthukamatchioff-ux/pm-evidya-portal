'use client';
import React, { useState } from 'react';
import { addAnnexureVEntry, updateAnnexureVEntry } from '../actions';
import styles from '../budget.module.css';
import { downloadTableAsDocx } from '@/lib/tableToDocx';

export default function Component5Client({ budgetComponentId, entries }: { budgetComponentId: string, entries: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({datePeriod: '', school: '', activity: '', equipment: '', quantity: '', unitCost: '', installationCost: '', transportation: '', otherCharges: '', vendor: '', invoiceNo: '', utrNumber: '', remarks: ''});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit: any = { budgetComponentId };
    Object.keys(formData).forEach(k => {
      const numFields = ['quantity', 'installationCost', 'transportation', 'otherCharges'];
      dataToSubmit[k] = numFields.includes(k) ? Number((formData as any)[k]) || 0 : (formData as any)[k];
    });
    
    if (editingId) {
      await updateAnnexureVEntry(editingId, dataToSubmit);
    } else {
      await addAnnexureVEntry(dataToSubmit);
    }
    setIsAdding(false);
    setFormData({datePeriod: '', school: '', activity: '', equipment: '', quantity: '', unitCost: '', installationCost: '', transportation: '', otherCharges: '', vendor: '', invoiceNo: '', utrNumber: '', remarks: ''});
    alert(editingId ? "Transaction Updated Successfully" : "Transaction Added Successfully");
    setEditingId(null);
  };

  return (
    <div>
      <div className={styles.actionsBar} style={{ marginTop: '24px' }}>
        <h3 className={styles.title} style={{ fontSize: '20px' }}>Expenditure Entries</h3>
                <button className={styles.btnPrimary} style={{ backgroundColor: '#8b5cf6', color: 'white', marginRight: '12px', fontWeight: 'bold' }} onClick={() => downloadTableAsDocx('dataTable', 'PM e-Vidya - School Equipment & Installations', 'Annexure-V', 'Annexure-V_Report.docx')}>
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
            <label>School</label>
            <input type="text" name="school" value={formData.school} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Activity</label>
            <input type="text" name="activity" value={formData.activity} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Equipment</label>
            <input type="text" name="equipment" value={formData.equipment} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Quantity</label>
            <input type="number" name="quantity" value={formData.quantity} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Unit Cost</label>
            <input type="number" name="unitCost" value={formData.unitCost} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Installation Cost</label>
            <input type="number" name="installationCost" value={formData.installationCost} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Transportation</label>
            <input type="number" name="transportation" value={formData.transportation} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Other Charges</label>
            <input type="number" name="otherCharges" value={formData.otherCharges} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Vendor</label>
            <input type="text" name="vendor" value={formData.vendor} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Invoice No</label>
            <input type="text" name="invoiceNo" value={formData.invoiceNo} onChange={handleChange}  />
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
            <input type="text" value={(Number(formData.quantity) || 0) * (Number(formData.unitCost) || 0) + (Number(formData.installationCost) || 0) + (Number(formData.transportation) || 0) + (Number(formData.otherCharges) || 0)} disabled style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed' }} />
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
              <th>Date / Period</th><th>School</th><th>Activity</th><th>Equipment</th><th>Quantity</th><th>Unit Cost</th><th>Installation Cost</th>
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
                  <td>{entry.datePeriod}</td><td>{entry.school}</td><td>{entry.activity}</td><td>{entry.equipment}</td><td>{entry.quantity}</td><td>{entry.unitCost}</td><td>{entry.installationCost}</td>
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
