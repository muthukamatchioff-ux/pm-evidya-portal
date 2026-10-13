'use client';

import React, { useState } from 'react';

export default function SettingsClient({ 
  initialHrs, 
  initialBudgetHeads,
  initialUsers,
  availableEpics = []
}: { 
  initialHrs: { id: string; name: string; role: string; baseSalary: number; joiningDate: Date | string }[], 
  initialBudgetHeads: { id: string; name: string; approvedBudget: number }[],
  initialUsers: { id: string; email: string; name: string | null; role: string; status: string; designation: string | null; department: string | null; lastLogin: Date | string | null; createdBy: string | null; createdAt: Date | string }[],
  availableEpics?: { id: string; epicSequence: number; trade: string; topic: string }[]
}) {
  const [hrs, setHrs] = useState(initialHrs);
  const [budgetHeads, setBudgetHeads] = useState(initialBudgetHeads);
  const [users, setUsers] = useState(initialUsers);
  
  const [showHrModal, setShowHrModal] = useState(false);
  const [hrForm, setHrForm] = useState({ name: '', role: 'Editor', baseSalary: '', joiningDate: '' });
  
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', userRole: 'VIEWER', designation: '', department: '' });
  const [adminError, setAdminError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Epic Assignment Modal state
  const [assignUser, setAssignUser] = useState<any>(null);
  const [assignedSeqList, setAssignedSeqList] = useState<number[]>([]);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  const parseEpics = (deptStr: string | null | undefined): number[] => {
    if (!deptStr) return [];
    const match = deptStr.match(/EPIC[S]?:\s*([0-9,\s]+)/i) || deptStr.match(/\[([0-9,\s]+)\]/);
    const numsStr = match ? match[1] : (deptStr.match(/^[0-9,\s]+$/) ? deptStr : '');
    if (!numsStr) return [];
    return numsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  };

  const handleOpenAssignModal = (user: any) => {
    setAssignUser(user);
    setAssignedSeqList(parseEpics(user.department));
  };

  const handleSaveAssignments = async () => {
    if (!assignUser) return;
    setIsSavingAssignments(true);
    try {
      const deptValue = assignedSeqList.length > 0 
        ? `EPIC: ${assignedSeqList.sort((a, b) => a - b).join(', ')}`
        : '';
      const res = await fetch(`/api/settings/users/${assignUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: deptValue })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to save assignments');
        return;
      }
      const updated = await res.json();
      setUsers(users.map(u => u.id === assignUser.id ? updated : u));
      setAssignUser(null);
    } catch (e: any) {
      console.error(e);
      alert('Error updating assignments: ' + e.message);
    } finally {
      setIsSavingAssignments(false);
    }
  };

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
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm)
      });
      const data = await res.json();
      
      if (!res.ok) {
        setAdminError(data.error || 'Failed to create user');
        setIsSubmitting(false);
        return;
      }
      
      setUsers([data, ...users]);
      setShowAdminModal(false);
      setAdminForm({ name: '', email: '', password: '', userRole: 'TEAM_MEMBER', designation: '', department: '' });
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
      const res = await fetch(`/api/settings/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update user status');
        return;
      }
      
      const updated = await res.json();
      setUsers(users.map(u => u.id === id ? updated : u));
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* User Management Section */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', color: 'var(--primary)' }}>User Management</h2>
        
        <div style={{ padding: '16px', backgroundColor: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 600, fontSize: '15px' }}>🛡️ Portal Users</h3>
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => setShowAdminModal(true)}>+ Add User</button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', backgroundColor: 'white' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', backgroundColor: 'var(--bg-color)' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Assigned Epic IDs</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Designation</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Created By</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Last Login</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const assignedEpics = parseEpics(user.department);
                  const getRoleBadgeStyle = (r: string) => {
                    switch (r) {
                      case 'ADMIN': return { bg: '#f3e8ff', color: '#6b21a8', label: 'Admin' };
                      case 'CAMERAMAN': return { bg: '#e0f2fe', color: '#0369a1', label: 'Camera Man' };
                      case 'EDITOR': return { bg: '#e0e7ff', color: '#4338ca', label: 'Editor' };
                      case 'VIEWER': return { bg: '#dcfce7', color: '#15803d', label: 'General Viewer' };
                      default: return { bg: '#f1f5f9', color: '#334155', label: 'Team Member' };
                    }
                  };
                  const badge = getRoleBadgeStyle(user.role);

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px' }}>{user.name}</td>
                      <td style={{ padding: '12px' }}>{user.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          backgroundColor: badge.bg, 
                          color: badge.color 
                        }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {user.role === 'ADMIN' ? (
                          <span style={{ fontSize: '12px', color: '#6b21a8', fontWeight: 600 }}>All Records (Admin)</span>
                        ) : user.role === 'VIEWER' ? (
                          <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>All SME Records</span>
                        ) : (user.role === 'CAMERAMAN' || user.role === 'EDITOR') ? (
                          assignedEpics.length > 0 ? (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {assignedEpics.map(seq => (
                                <span key={seq} style={{ 
                                  background: '#f1f5f9', 
                                  color: '#0f172a', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px', 
                                  fontSize: '11px', 
                                  fontWeight: 600,
                                  border: '1px solid #cbd5e1' 
                                }}>
                                  EPIC-{String(seq).padStart(2, '0')}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>⚠️ No Epics Assigned</span>
                          )
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: user.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                          color: user.status === 'ACTIVE' ? '#166534' : '#991b1b'
                        }}>
                          {user.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{user.designation || '-'}</td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>{user.createdBy || '-'}</td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>{user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-IN') : '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {(user.role === 'CAMERAMAN' || user.role === 'EDITOR') && (
                            <button
                              onClick={() => handleOpenAssignModal(user)}
                              style={{
                                background: '#0284c7',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                              title="Assign Epic IDs to this user"
                            >
                              🎯 Assign Epics
                            </button>
                          )}
                          <button 
                            onClick={() => toggleAdminStatus(user.id, user.status)}
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
                            {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No dynamically created users found. (Legacy admins via environment variable are active).
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
            <h3 style={{ margin: 0, fontSize: '18px' }}>Add User</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Create a new user account with specific role access to the portal.</p>
            
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

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Role *</label>
              <select style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }} value={adminForm.userRole} onChange={e => setAdminForm({...adminForm, userRole: e.target.value})} disabled={isSubmitting}>
                <option value="VIEWER">General Viewer (Document Generation & SME Records)</option>
                <option value="CAMERAMAN">Camera Man (Assigned Production Epics)</option>
                <option value="EDITOR">Editor (Assigned Post-Production Epics)</option>
                <option value="TEAM_MEMBER">Team Member (Read-Only)</option>
                <option value="ADMIN">Administrator (Full Access)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Designation</label>
                <input type="text" placeholder="e.g. Camera Operator" style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }} value={adminForm.designation} onChange={e => setAdminForm({...adminForm, designation: e.target.value})} disabled={isSubmitting} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>Department</label>
                <input type="text" placeholder="e.g. Media Production" style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px' }} value={adminForm.department} onChange={e => setAdminForm({...adminForm, department: e.target.value})} disabled={isSubmitting} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => { setShowAdminModal(false); setAdminError(''); }} disabled={isSubmitting}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveAdmin} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Epic IDs Modal for Camera Man and Editor */}
      {assignUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px' }}>
                🎯 Assign Epic IDs to {assignUser.name || assignUser.email}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Role: <strong>{assignUser.role === 'CAMERAMAN' ? 'Camera Man' : 'Editor'}</strong> &bull; Select which Epic IDs this user is authorized to access and update.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                {assignedSeqList.length} of {availableEpics.length} Epics Selected
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setAssignedSeqList(availableEpics.map(e => e.epicSequence))}
                >
                  Select All
                </button>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setAssignedSeqList([])}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '340px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px' }}>
              {availableEpics.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No Epic work entries registered yet.
                </div>
              ) : (
                availableEpics.map(epic => {
                  const isChecked = assignedSeqList.includes(epic.epicSequence);
                  return (
                    <label
                      key={epic.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                        border: isChecked ? '1px solid #bfdbfe' : '1px solid transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) {
                            setAssignedSeqList(prev => [...prev, epic.epicSequence]);
                          } else {
                            setAssignedSeqList(prev => prev.filter(s => s !== epic.epicSequence));
                          }
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                          EPIC-{String(epic.epicSequence).padStart(2, '0')}
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{epic.trade}</span>
                        </div>
                        {epic.topic && (
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                            {epic.topic}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button className="btn-secondary" onClick={() => setAssignUser(null)} disabled={isSavingAssignments}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveAssignments} disabled={isSavingAssignments}>
                {isSavingAssignments ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
