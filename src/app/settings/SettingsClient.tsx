'use client';

import React, { useState } from 'react';

export default function SettingsClient({ initialHrs, initialBudgetHeads }: { initialHrs: any[], initialBudgetHeads: any[] }) {
  const [hrs, setHrs] = useState(initialHrs);
  const [budgetHeads, setBudgetHeads] = useState(initialBudgetHeads);
  const [showHrModal, setShowHrModal] = useState(false);
  const [hrForm, setHrForm] = useState({ name: '', role: 'Editor', baseSalary: '', joiningDate: '' });

  const handleSaveHr = async () => {
    try {
      const res = await fetch('/api/settings/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hrForm.name,
          role: hrForm.role,
          baseSalary: parseFloat(hrForm.baseSalary),
          joiningDate: new Date(hrForm.joiningDate).toISOString()
        })
      });
      if (res.ok) {
        const newHr = await res.json();
        setHrs([newHr, ...hrs]);
        setShowHrModal(false);
        setHrForm({ name: '', role: 'Editor', baseSalary: '', joiningDate: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Financial Configurations */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', color: 'var(--primary)' }}>Financial System Configurations</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>📅 Financial Year Settings</button>
          
          <div style={{ padding: '16px', backgroundColor: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontWeight: 600 }}>💼 Manage 7 Budget Heads</h3>
            </div>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              {budgetHeads.map(head => (
                <li key={head.id}>
                  <strong>{head.name}</strong> - Approved Budget: ₹{head.approvedBudget.toLocaleString('en-IN')}
                </li>
              ))}
            </ul>
          </div>

          <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>👨‍🏫 SME Honorarium & TA Rules</button>
          
          <div style={{ padding: '16px', backgroundColor: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontWeight: 600 }}>👥 HR Roles & Manpower</h3>
              <button className="btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => setShowHrModal(true)}>+ Add HR</button>
            </div>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Name</th>
                  <th style={{ padding: '8px' }}>Role</th>
                  <th style={{ padding: '8px' }}>Base Salary</th>
                  <th style={{ padding: '8px' }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {hrs.map(hr => (
                  <tr key={hr.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px' }}>{hr.name}</td>
                    <td style={{ padding: '8px' }}>{hr.role}</td>
                    <td style={{ padding: '8px' }}>₹{hr.baseSalary.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px' }}>{new Date(hr.joiningDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>💳 Expenditure Categories & Permissions</button>
        </div>
      </div>

      {showHrModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Add Human Resource</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Name</label>
              <input type="text" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={hrForm.name} onChange={e => setHrForm({...hrForm, name: e.target.value})} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Role</label>
              <select style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={hrForm.role} onChange={e => setHrForm({...hrForm, role: e.target.value})}>
                <option value="Editor">Editor</option>
                <option value="Camera Man">Camera Man</option>
                <option value="Graphic Designer">Graphic Designer</option>
                <option value="Content Developer">Content Developer</option>
                <option value="Multimedia Designer">Multimedia Designer</option>
                <option value="Social Media">Social Media</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Monthly Base Salary (₹)</label>
              <input type="number" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={hrForm.baseSalary} onChange={e => setHrForm({...hrForm, baseSalary: e.target.value})} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Joining Date</label>
              <input type="date" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={hrForm.joiningDate} onChange={e => setHrForm({...hrForm, joiningDate: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setShowHrModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveHr}>Save HR</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
