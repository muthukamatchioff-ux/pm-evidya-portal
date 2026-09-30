'use client';

import React, { useState } from 'react';
import { updatePaymentStatus } from './actions';
import styles from './accounts.module.css';

export default function AccountsClient({ initialData }: { initialData: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ status: '', utrNumber: '', remarks: '' });
  const [loading, setLoading] = useState(false);

  const startEdit = (payment: any) => {
    setEditingId(payment.id);
    setForm({
      status: payment.status,
      utrNumber: payment.utrNumber || '',
      remarks: payment.remarks || ''
    });
  };

  const saveEdit = async (paymentId: string) => {
    setLoading(true);
    await updatePaymentStatus(paymentId, form.status, form.utrNumber, form.remarks);
    setLoading(false);
    setEditingId(null);
  };

  const exportToCSV = () => {
    const headers = ['SME Name', 'Trade', 'Topic', 'Total Amount', 'Payment Status', 'UTR Number'];
    const rows = initialData.map(entry => {
      const payment = entry.payments[0];
      if (!payment) return null;
      return [
        `"${entry.sme.name.replace(/"/g, '""')}"`,
        `"${entry.trade.replace(/"/g, '""')}"`,
        `"${entry.topic.replace(/"/g, '""')}"`,
        payment.totalAmount,
        payment.status,
        payment.utrNumber || ''
      ].join(',');
    }).filter(Boolean);
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Accounts_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Accounts & Payments</h1>
        <button className="btn-primary" onClick={exportToCSV}>Export to Excel / CSV</button>
      </header>

      <div className="card">
        <div className={styles.tableWrapper}>
          <table className="table">
            <thead>
              <tr>
                <th>SME</th>
                <th>Trade / Topic</th>
                <th>Dates</th>
                <th>Total Amount</th>
                <th>Payment Status</th>
                <th>UTR Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialData.length === 0 ? (
                <tr><td colSpan={7} className={styles.emptyState}>No payments found.</td></tr>
              ) : (
                initialData.map(entry => {
                  const payment = entry.payments[0];
                  if (!payment) return null;
                  
                  const isEditing = editingId === payment.id;
                  
                  return (
                    <tr key={payment.id} className={isEditing ? styles.editingRow : ''}>
                      <td><strong>{entry.sme.name}</strong></td>
                      <td>
                        <div className={styles.tradeText}>{entry.trade}</div>
                        <div className={styles.topicText}>{entry.topic}</div>
                      </td>
                      <td>
                        {entry.attendanceFrom ? new Date(entry.attendanceFrom).toLocaleDateString() : '-'}
                      </td>
                      <td className={styles.amountText}>₹ {payment.totalAmount.toLocaleString('en-IN')}</td>
                      
                      <td>
                        {isEditing ? (
                          <select className={styles.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                            <option value="DRAFT">Draft</option>
                            <option value="PENDING_APPROVAL">Pending Approval</option>
                            <option value="APPROVED">Approved</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="PAID">Paid</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        ) : (
                          <span className={`${styles.badge} ${styles['badge-' + payment.status.toLowerCase()]}`}>
                            {payment.status}
                          </span>
                        )}
                      </td>
                      
                      <td>
                        {isEditing ? (
                          <input type="text" className={styles.input} placeholder="UTR..." value={form.utrNumber} onChange={e => setForm({...form, utrNumber: e.target.value})} />
                        ) : (
                          <span className={styles.utrText}>{payment.utrNumber || '-'}</span>
                        )}
                      </td>
                      
                      <td>
                        {isEditing ? (
                          <div className={styles.actions}>
                            <button className={styles.btnSave} onClick={() => saveEdit(payment.id)} disabled={loading}>Save</button>
                            <button className={styles.btnCancel} onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <button className={styles.btnEdit} onClick={() => startEdit(payment)}>Update</button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
