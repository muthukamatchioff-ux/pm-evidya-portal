'use client';

import React, { useState } from 'react';
import styles from './budget.module.css';
import { updateBudgetHead, createBudgetHead } from './actions';

type BudgetHead = {
  id: string;
  name: string;
  approvedBudget: number;
  utilizedAmount: number;
};

export default function BudgetClient({ initialData }: { initialData: BudgetHead[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ approvedBudget: 0, utilizedAmount: 0 });
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', approvedBudget: 0, utilizedAmount: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEdit = (bh: BudgetHead) => {
    setEditingId(bh.id);
    setEditForm({ approvedBudget: bh.approvedBudget, utilizedAmount: bh.utilizedAmount });
  };

  const handleSaveEdit = async (id: string) => {
    setLoading(true);
    setError(null);
    const res = await updateBudgetHead(id, editForm.approvedBudget, editForm.utilizedAmount);
    setLoading(false);
    
    if (res.success) {
      setEditingId(null);
    } else {
      setError(res.error || 'Failed to update');
    }
  };

  const handleSaveNew = async () => {
    if (!addForm.name) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await createBudgetHead(addForm.name, addForm.approvedBudget, addForm.utilizedAmount);
    setLoading(false);

    if (res.success) {
      setIsAdding(false);
      setAddForm({ name: '', approvedBudget: 0, utilizedAmount: 0 });
    } else {
      setError(res.error || 'Failed to create');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Budget Management</h1>
        <button className="btn-primary" onClick={() => setIsAdding(true)}>Add Budget Head</button>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className="card">
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Budget Head</th>
                <th>Approved Budget</th>
                <th>Utilized Amount</th>
                <th>Balance</th>
                <th>Utilization %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isAdding && (
                <tr className={styles.editingRow}>
                  <td>
                    <input 
                      type="text" 
                      placeholder="Budget Head Name"
                      value={addForm.name} 
                      onChange={e => setAddForm({...addForm, name: e.target.value})}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      value={addForm.approvedBudget} 
                      onChange={e => setAddForm({...addForm, approvedBudget: parseFloat(e.target.value) || 0})}
                      className={styles.input}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      value={addForm.utilizedAmount} 
                      onChange={e => setAddForm({...addForm, utilizedAmount: parseFloat(e.target.value) || 0})}
                      className={styles.input}
                    />
                  </td>
                  <td>₹ {(addForm.approvedBudget - addForm.utilizedAmount).toLocaleString('en-IN')}</td>
                  <td>{addForm.approvedBudget > 0 ? ((addForm.utilizedAmount / addForm.approvedBudget) * 100).toFixed(1) : 0}%</td>
                  <td>
                    <button className={styles.btnSave} onClick={handleSaveNew} disabled={loading}>Save</button>
                    <button className={styles.btnCancel} onClick={() => setIsAdding(false)}>Cancel</button>
                  </td>
                </tr>
              )}
              {initialData.length === 0 && !isAdding ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>No budget heads found. Click "Add Budget Head" to create one.</td>
                </tr>
              ) : (
                initialData.map(bh => {
                  const isEditing = editingId === bh.id;
                  const balance = isEditing ? editForm.approvedBudget - editForm.utilizedAmount : bh.approvedBudget - bh.utilizedAmount;
                  const utilization = isEditing 
                    ? (editForm.approvedBudget > 0 ? ((editForm.utilizedAmount / editForm.approvedBudget) * 100).toFixed(1) : 0)
                    : (bh.approvedBudget > 0 ? ((bh.utilizedAmount / bh.approvedBudget) * 100).toFixed(1) : 0);

                  return (
                    <tr key={bh.id} className={isEditing ? styles.editingRow : ''}>
                      <td>{bh.name}</td>
                      <td>
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={editForm.approvedBudget}
                            onChange={e => setEditForm({...editForm, approvedBudget: parseFloat(e.target.value) || 0})}
                            className={styles.input}
                          />
                        ) : (
                          `₹ ${bh.approvedBudget.toLocaleString('en-IN')}`
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={editForm.utilizedAmount}
                            onChange={e => setEditForm({...editForm, utilizedAmount: parseFloat(e.target.value) || 0})}
                            className={styles.input}
                          />
                        ) : (
                          `₹ ${bh.utilizedAmount.toLocaleString('en-IN')}`
                        )}
                      </td>
                      <td>₹ {balance.toLocaleString('en-IN')}</td>
                      <td>{utilization}%</td>
                      <td>
                        {isEditing ? (
                          <div className={styles.actionButtons}>
                            <button className={styles.btnSave} onClick={() => handleSaveEdit(bh.id)} disabled={loading}>Save</button>
                            <button className={styles.btnCancel} onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button className={styles.btnEdit} onClick={() => handleEdit(bh)}>Edit</button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
