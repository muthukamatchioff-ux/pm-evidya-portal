'use client';

import React, { useState } from 'react';

export default function SettingsClient({ 
  initialHrs, 
  initialBudgetHeads,
  initialAdmins
}: { 
  initialHrs: { id: string; name: string; role: string; baseSalary: number; joiningDate: Date | string }[], 
  initialBudgetHeads: { id: string; name: string; approvedBudget: number }[],
  initialAdmins: { id: string; email: string; name: string | null; status: string; createdAt: Date | string }[]
}) {
  const [hrs, setHrs] = useState(initialHrs);
  const [budgetHeads, setBudgetHeads] = useState(initialBudgetHeads);
  const [admins, setAdmins] = useState(initialAdmins);
  
  const [showHrModal, setShowHrModal] = useState(false);
  const [hrForm, setHrForm] = useState({ name: '', role: 'Editor', baseSalary: '', joiningDate: '' });
  
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [adminError, setAdminError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSaveAdmin = async () => {
    setAdminError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/settings/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm)
      });
      const data = await res.json();
      
      if (!res.ok) {
        setAdminError(data.error || 'Failed to create admin');
        setIsSubmitting(false);
        return;
      }
      
      setAdmins([data, ...admins]);
      setShowAdminModal(false);
      setAdminForm({ name: '', email: '', password: '' });
    } catch (err) {
      console.error(err);
      setAdminError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAdminStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/settings/admins/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update admin status');
        return;
      }
      
      const updated = await res.json();
      setAdmins(admins.map(a => a.id === id ? updated : a));
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Admin Management Section */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', color: 'var(--primary)' }}>Administrator Management</h2>
        
        <div style={{ padding: '16px', backgroundColor: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 600, fontSize: '15px' }}>🛡️ Portal Administrators</h3>
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => setShowAdminModal(true)}>+ Add Administrator</button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', backgroundColor: 'white' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', backgroundColor: 'var(--bg-color)' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px' }}>{admin.name}</td>
                    <td style={{ padding: '12px' }}>{admin.email}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: admin.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                        color: admin.status === 'ACTIVE' ? '#166534' : '#991b1b'
                      }}>
                        {admin.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button 
                        onClick={() => toggleAdminStatus(admin.id, admin.status)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {admin.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No dynamically created admins found. (Legacy admins via environment variable are active).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', backgroundColor: 'var(--bg-color)' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Base Salary</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {hrs.map(hr => (
                    <tr key={hr.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px' }}>{hr.name}</td>
                      <td style={{ padding: '12px' }}>{hr.role}</td>
                      <td style={{ padding: '12px' }}>₹{hr.baseSalary.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px' }}>{new Date(hr.joiningDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>💳 Expenditure Categories & Permissions</button>
        </div>
      </div>

      {/* HR Modal */}
      {showHrModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
      
      {/* Admin Modal */}
      {showAdminModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Add Administrator</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Create a new administrator account with full access to the portal.</p>
            
            {adminError && (
              <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '13px', border: '1px solid #fecaca' }}>
                {adminError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Name (Optional)</label>
              <input type="text" placeholder="e.g. John Doe" style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }} value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} disabled={isSubmitting} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Email Address *</label>
              <input type="email" placeholder="admin@example.com" style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }} value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} disabled={isSubmitting} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Secure Password *</label>
              <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }} value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} disabled={isSubmitting} required minLength={8} />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Must be at least 8 characters.</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => { setShowAdminModal(false); setAdminError(''); }} disabled={isSubmitting}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveAdmin} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
