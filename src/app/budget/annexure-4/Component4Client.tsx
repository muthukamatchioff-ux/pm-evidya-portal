'use client';
import React, { useState } from 'react';
import { addAnnexureIVEntry, updateAnnexureIVEntry } from '../actions';
import styles from '../budget.module.css';
import { downloadTableAsDocx } from '@/lib/tableToDocx';

export default function Component4Client({ budgetComponentId, entries }: { budgetComponentId: string, entries: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({datePeriod: '', service: '', description: '', vendor: '', purchaseRef: '', quantity: '', unitCost: '', servicePeriod: '', infrastructureCost: '', bandwidthCost: '', archiveCost: '', otherCharges: '', invoiceNo: '', utrNumber: '', remarks: ''});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit: any = { budgetComponentId };
    Object.keys(formData).forEach(k => {
      const numFields = ['quantity', 'infrastructureCost', 'bandwidthCost', 'archiveCost', 'otherCharges'];
      dataToSubmit[k] = numFields.includes(k) ? Number((formData as any)[k]) || 0 : (formData as any)[k];
    });
    
    if (editingId) {
      await updateAnnexureIVEntry(editingId, dataToSubmit);
    } else {
      await addAnnexureIVEntry(dataToSubmit);
    }
    setIsAdding(false);
    setFormData({datePeriod: '', service: '', description: '', vendor: '', purchaseRef: '', quantity: '', unitCost: '', servicePeriod: '', infrastructureCost: '', bandwidthCost: '', archiveCost: '', otherCharges: '', invoiceNo: '', utrNumber: '', remarks: ''});
    alert(editingId ? "Transaction Updated Successfully" : "Transaction Added Successfully");
    setEditingId(null);
  };

  return (
    <div>
      <div className={styles.actionsBar} style={{ marginTop: '24px' }}>
        <h3 className={styles.title} style={{ fontSize: '20px' }}>Expenditure Entries</h3>
                <button className={styles.btnPrimary} style={{ backgroundColor: '#8b5cf6', color: 'white', marginRight: '12px', fontWeight: 'bold' }} onClick={() => downloadTableAsDocx('dataTable', 'PM e-Vidya - Technology & Infrastructure', 'Annexure-IV', 'Annexure-IV_Report.docx')}>
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
            <label>Service / Item</label>
            <input type="text" name="service" value={formData.service} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Description</label>
            <input type="text" name="description" value={formData.description} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Vendor / Agency</label>
            <input type="text" name="vendor" value={formData.vendor} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Purchase Ref</label>
            <input type="text" name="purchaseRef" value={formData.purchaseRef} onChange={handleChange}  />
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
            <label>Service Period</label>
            <input type="text" name="servicePeriod" value={formData.servicePeriod} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Infrastructure Cost</label>
            <input type="number" name="infrastructureCost" value={formData.infrastructureCost} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Bandwidth Cost</label>
            <input type="number" name="bandwidthCost" value={formData.bandwidthCost} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Archive Cost</label>
            <input type="number" name="archiveCost" value={formData.archiveCost} onChange={handleChange}  />
          </div>
          <div className={styles.formGroup}>
            <label>Other Charges</label>
            <input type="number" name="otherCharges" value={formData.otherCharges} onChange={handleChange}  />
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
            <input type="text" value={(Number(formData.infrastructureCost) || 0) + (Number(formData.bandwidthCost) || 0) + (Number(formData.archiveCost) || 0) + (Number(formData.otherCharges) || 0)} disabled style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed' }} />
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
              <th>Date / Period</th><th>Service / Item</th><th>Description</th><th>Vendor / Agency</th><th>Purchase Ref</th><th>Quantity</th><th>Unit Cost</th>
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
                  <td>{entry.datePeriod}</td><td>{entry.service}</td><td>{entry.description}</td><td>{entry.vendor}</td><td>{entry.purchaseRef}</td><td>{entry.quantity}</td><td>{entry.unitCost}</td>
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
