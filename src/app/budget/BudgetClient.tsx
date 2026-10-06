'use client';

import React, { useState } from 'react';
import styles from './budget.module.css';
import { updateComponentBudget } from './actions';

export default function BudgetClient({ role, initialData }: { role?: string, initialData: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState(0);

  const handleEdit = (comp: any) => {
    setEditingId(comp.id);
    setEditBudget(comp.approvedBudget);
  };

  const handleSave = async (id: string) => {
    await updateComponentBudget(id, editBudget);
    setEditingId(null);
    alert("Approved Budget updated successfully!");
  };

  let grandBudget = 0;
  let grandExpenditure = 0;

  return (
    <div className={styles.tableContainer}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Component No.</th>
            <th>Component Name</th>
            <th>Reference</th>
            <th>Approved Budget (₹)</th>
            <th>Expenditure (₹)</th>
            <th>Unutilized Balance (₹)</th>
            <th>Utilization %</th>
            {role === 'ADMIN' && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {initialData.map(comp => {
            grandBudget += comp.approvedBudget;
            grandExpenditure += comp.expenditureIncurred;

            const isEditing = editingId === comp.id;
            const liveBudget = isEditing ? editBudget : comp.approvedBudget;
            const liveBalance = liveBudget - comp.expenditureIncurred;
            const liveUtilization = liveBudget > 0 ? ((comp.expenditureIncurred / liveBudget) * 100).toFixed(2) : '0.00';

            return (
              <tr key={comp.id}>
                <td>{comp.componentNo}</td>
                <td>{comp.name}</td>
                <td>Annexure-{['I', 'II', 'III', 'IV', 'V', 'VI'][comp.componentNo - 1]}</td>
                <td>
                  {isEditing ? (
                    <input 
                      type="number" 
                      value={editBudget} 
                      onChange={e => setEditBudget(parseFloat(e.target.value) || 0)}
                      style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '120px' }}
                    />
                  ) : (
                    <span style={{ fontWeight: 'bold' }}>₹ {comp.approvedBudget.toLocaleString('en-IN')}</span>
                  )}
                </td>
                <td style={{ color: 'var(--error)' }}>₹ {comp.expenditureIncurred.toLocaleString('en-IN')}</td>
                <td style={{ color: 'var(--success)' }}>₹ {liveBalance.toLocaleString('en-IN')}</td>
                <td>{liveUtilization}%</td>
                {role === 'ADMIN' && (
                  <td>
                    {isEditing ? (
                      <>
                        <button onClick={() => handleSave(comp.id)} style={{ color: 'green', background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px', fontWeight: 'bold' }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => handleEdit(comp)} style={{ color: 'blue', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}>Edit Budget</button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          
          {/* Grand Total Row */}
          <tr style={{ backgroundColor: 'var(--slate-50)', fontWeight: 'bold' }}>
            <td colSpan={3} style={{ textAlign: 'right' }}>GRAND TOTAL</td>
            <td>₹ {grandBudget.toLocaleString('en-IN')}</td>
            <td style={{ color: 'var(--error)' }}>₹ {grandExpenditure.toLocaleString('en-IN')}</td>
            <td style={{ color: 'var(--success)' }}>₹ {(grandBudget - grandExpenditure).toLocaleString('en-IN')}</td>
            <td>{grandBudget > 0 ? ((grandExpenditure / grandBudget) * 100).toFixed(2) : '0.00'}%</td>
            {role === 'ADMIN' && <td></td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
