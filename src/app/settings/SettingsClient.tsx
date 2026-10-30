'use client';

import React, { useState, useEffect } from 'react';

export default function SettingsClient({ 
  initialHrs, 
  initialBudgetHeads,
  initialUsers,
  availableEpics = [],
  currentAdminEmail = ''
}: { 
  initialHrs: { id: string; name: string; role: string; baseSalary: number; joiningDate: Date | string }[], 
  initialBudgetHeads: { id: string; name: string; approvedBudget: number }[],
  initialUsers: { id: string; email: string; name: string | null; role: string; status: string; designation: string | null; department: string | null; lastLogin: Date | string | null; createdBy: string | null; createdAt: Date | string }[],
  availableEpics?: { id: string; epicSequence: number; trade: string; topic: string }[],
  currentAdminEmail?: string
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

  // Toast Notification
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit User Modal state
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'VIEWER',
    status: 'ACTIVE',
    designation: '',
    department: ''
  });
  const [editAssignedSeqList, setEditAssignedSeqList] = useState<number[]>([]);
  const [epicSearchFilter, setEpicSearchFilter] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete User Modal state (Two-Step Confirmation)
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-clear toast after 6 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const parseEpics = (deptStr: string | null | undefined): number[] => {
    if (!deptStr) return [];
    const match = deptStr.match(/EPIC[S]?:\s*([0-9,\s]+)/i) || deptStr.match(/\[([0-9,\s]+)\]/);
    const numsStr = match ? match[1] : (deptStr.match(/^[0-9,\s]+$/) ? deptStr : '');
    if (!numsStr) return [];
    return numsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  };

  // Open Edit User Modal
  const handleOpenEdit = (user: any) => {
    setEditUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'VIEWER',
      status: user.status || 'ACTIVE',
      designation: user.designation || '',
      department: user.department || ''
    });
    setEditAssignedSeqList(parseEpics(user.department));
    setEpicSearchFilter('');
    setEditError('');
  };

  // Save Edit User Changes
  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditError('');

    if (!editForm.name.trim()) {
      setEditError('Please enter user name.');
      return;
    }

    const emailTrimmed = editForm.email.trim().toLowerCase();
    if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEditError('Please enter a valid email address.');
      return;
    }

    setIsSavingEdit(true);
    try {
      let deptValue = editForm.department;
      if (editForm.role === 'CAMERAMAN' || editForm.role === 'EDITOR') {
        deptValue = editAssignedSeqList.length > 0 
          ? `EPIC: ${editAssignedSeqList.sort((a, b) => a - b).join(', ')}`
          : '';
      }

      const res = await fetch(`/api/settings/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: emailTrimmed,
          role: editForm.role,
          status: editForm.status,
          designation: editForm.designation.trim(),
          department: deptValue
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to update user.');
        return;
      }

      setUsers(users.map(u => u.id === editUser.id ? data : u));
      setToast({ type: 'success', message: `User "${data.name || data.email}" successfully updated in database!` });
      setEditUser(null);
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || 'Network error updating user.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Delete User Modal
  const handleOpenDelete = (user: any) => {
    if (user.email?.toLowerCase().trim() === currentAdminEmail.toLowerCase().trim()) {
      setToast({ type: 'error', message: 'Security Protection: You cannot delete your own currently logged-in Admin account.' });
      return;
    }
    setDeleteUser(user);
    setDeleteStep(1);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  // Execute Safe Delete / Deactivation
  const handleExecuteDelete = async () => {
    if (!deleteUser) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE in the box below to confirm.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/settings/users/${deleteUser.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete user.');
        return;
      }

      if (data.action === 'DELETED') {
        setUsers(users.filter(u => u.id !== deleteUser.id));
        setToast({ type: 'success', message: data.message || `User "${deleteUser.name || deleteUser.email}" permanently deleted.` });
      } else {
        const updated = data.user || { ...deleteUser, status: 'INACTIVE' };
        setUsers(users.map(u => u.id === deleteUser.id ? updated : u));
        setToast({ type: 'success', message: data.message || `User "${deleteUser.name || deleteUser.email}" safely deactivated to preserve production records.` });
      }

      setDeleteUser(null);
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || 'Network error deleting user.');
    } finally {
      setIsDeleting(false);
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
      setToast({ type: 'success', message: `User "${data.name || data.email}" created successfully!` });
      setAdminForm({ name: '', email: '', password: '', userRole: 'VIEWER', designation: '', department: '' });
    } catch (err) {
      console.error(err);
      setAdminError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter available EPICs in Edit Modal
  const filteredAvailableEpics = availableEpics.filter(e => {
    if (!epicSearchFilter.trim()) return true;
    const q = epicSearchFilter.toLowerCase().trim();
    return (
      String(e.epicSequence).includes(q) ||
      (e.trade || '').toLowerCase().includes(q) ||
      (e.topic || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Toast Notification Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          zIndex: 9999,
          padding: '14px 20px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'success' ? '#065f46' : '#991b1b',
          color: '#ffffff',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13.5px',
          fontWeight: 600,
          maxWidth: '480px'
        }}>
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{toast.message}</span>
          <button 
            onClick={() => setToast(null)}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '14px', marginLeft: 'auto' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* User Management Section */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', color: 'var(--primary)' }}>
          User Management
        </h2>
        
        <div style={{ padding: '16px', backgroundColor: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: '15px', margin: 0 }}>🛡️ Portal Users</h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                Admin-controlled user accounts, roles, permissions, and assigned production Epic IDs.
              </p>
            </div>
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => setShowAdminModal(true)}>
              + Add User
            </button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13.5px', borderCollapse: 'collapse', backgroundColor: 'white' }}>
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
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center', minWidth: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const assignedEpics = parseEpics(user.department);
                  const isCurrentUser = Boolean(currentAdminEmail && user.email.toLowerCase().trim() === currentAdminEmail.toLowerCase().trim());

                  const getRoleBadgeStyle = (r: string) => {
                    switch (r) {
                      case 'ADMIN': return { bg: '#f3e8ff', color: '#6b21a8', label: 'Admin' };
                      case 'CAMERAMAN': return { bg: '#e0f2fe', color: '#0369a1', label: 'Camera Man' };
                      case 'EDITOR': return { bg: '#e0e7ff', color: '#4338ca', label: 'Editor' };
                      case 'VIEWER': return { bg: '#dcfce7', color: '#15803d', label: 'General Viewer' };
                      case 'HIGHER_OFFICIAL_VIEWER': return { bg: '#fef3c7', color: '#b45309', label: 'Official Viewer' };
                      default: return { bg: '#f1f5f9', color: '#334155', label: 'Team Member' };
                    }
                  };
                  const badge = getRoleBadgeStyle(user.role);

                  return (
                    <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#0f2942' }}>
                        {user.name || '—'}
                        {isCurrentUser && (
                          <span style={{ marginLeft: '6px', fontSize: '10.5px', color: '#0284c7', background: '#e0f2fe', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                            You
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: '#334155' }}>{user.email}</td>
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
                      <td style={{ padding: '12px', color: '#475569' }}>{user.designation || '-'}</td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>{user.createdBy || '-'}</td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-IN') : '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {/* ✏️ Edit Action */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#f0f9ff',
                              color: '#0284c7',
                              border: '1px solid #bae6fd',
                              borderRadius: '5px',
                              padding: '5px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title={`Edit details for ${user.name || user.email}`}
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>

                          {/* 🗑️ Delete Action */}
                          {isCurrentUser ? (
                            <button
                              disabled
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#f8fafc',
                                color: '#94a3b8',
                                border: '1px solid #e2e8f0',
                                borderRadius: '5px',
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'not-allowed',
                                opacity: 0.7
                              }}
                              title="Cannot delete your currently logged-in account"
                            >
                              <span>🛡️</span>
                              <span>Active Self</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenDelete(user)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '5px',
                                padding: '5px 10px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={`Safely delete or deactivate ${user.name || user.email}`}
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No registered portal users found.
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
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', color: 'var(--primary)' }}>
          Financial System Configurations
        </h2>
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

          <div style={{ padding: '16px', backgroundColor: 'var(--slate-50)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 600 }}>👥 Human Resources ({hrs.length})</h3>
              <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setShowHrModal(true)}>+ Add HR</button>
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

      {/* ========================================================
          MODAL 1: ADD USER
         ======================================================== */}
      {showAdminModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', width: '90%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Add User</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Create a new user account with specific role access to the portal.</p>
            
            {adminError && (
              <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '13px', border: '1px solid #fecaca' }}>
                {adminError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Name *</label>
              <input type="text" placeholder="e.g. John Doe" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }} value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} disabled={isSubmitting} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Email Address *</label>
              <input type="email" placeholder="user@example.com" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }} value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} disabled={isSubmitting} required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Secure Password *</label>
              <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }} value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} disabled={isSubmitting} required minLength={8} />
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Must be at least 8 characters.</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Role *</label>
              <select style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }} value={adminForm.userRole} onChange={e => setAdminForm({...adminForm, userRole: e.target.value})} disabled={isSubmitting}>
                <option value="VIEWER">General Viewer (Document Generation & SME Records)</option>
                <option value="CAMERAMAN">Camera Man (Assigned Production Epics)</option>
                <option value="EDITOR">Editor (Assigned Post-Production Epics)</option>
                <option value="TEAM_MEMBER">Team Member (Read-Only)</option>
                <option value="ADMIN">Administrator (Full Access)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Designation</label>
                <input type="text" placeholder="e.g. Camera Operator" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }} value={adminForm.designation} onChange={e => setAdminForm({...adminForm, designation: e.target.value})} disabled={isSubmitting} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 600 }}>Department</label>
                <input type="text" placeholder="e.g. Media Production" style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }} value={adminForm.department} onChange={e => setAdminForm({...adminForm, department: e.target.value})} disabled={isSubmitting} />
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

      {/* ========================================================
          MODAL 2: ✏️ EDIT USER (Admin-Only)
         ======================================================== */}
      {editUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', width: '92%', maxWidth: '580px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#0f2942' }}>
                  ✏️ Edit User Details
                </h3>
                <button 
                  onClick={() => setEditUser(null)} 
                  style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                Modify profile, role permissions, active status, and assigned Epic IDs for <strong>{editUser.email}</strong>.
              </p>
            </div>

            {editError && (
              <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', border: '1px solid #fecaca' }}>
                ⚠️ {editError}
              </div>
            )}

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
              {/* Name & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#0f2942' }}>
                    Full Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                    disabled={isSavingEdit}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#0f2942' }}>
                    Email Address <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                    disabled={isSavingEdit}
                    required
                  />
                </div>
              </div>

              {/* Role & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#0f2942' }}>
                    User Role <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                    disabled={isSavingEdit}
                  >
                    <option value="ADMIN">Administrator (Full Portal Control)</option>
                    <option value="CAMERAMAN">Camera Man (Assigned Production Epics)</option>
                    <option value="EDITOR">Editor (Assigned Post-Production Epics)</option>
                    <option value="VIEWER">General Viewer (SME &amp; Compliance Records)</option>
                    <option value="HIGHER_OFFICIAL_VIEWER">Higher Official Viewer (Read-Only)</option>
                    <option value="TEAM_MEMBER">Team Member (Read-Only)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#0f2942' }}>
                    Account Status <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '9px 12px', 
                      border: '1px solid var(--border)', 
                      borderRadius: '6px', 
                      fontSize: '13px',
                      fontWeight: 700,
                      color: editForm.status === 'ACTIVE' ? '#166534' : '#991b1b',
                      backgroundColor: editForm.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2'
                    }}
                    disabled={isSavingEdit}
                  >
                    <option value="ACTIVE">ACTIVE (Access Granted)</option>
                    <option value="INACTIVE">INACTIVE (Access Revoked)</option>
                  </select>
                </div>
              </div>

              {/* Designation */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: '#0f2942' }}>
                  Designation / Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Video Editor / JTO"
                  value={editForm.designation}
                  onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                  disabled={isSavingEdit}
                />
              </div>

              {/* Assigned Epic IDs Section */}
              <div style={{ marginTop: '4px', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f2942', margin: 0 }}>
                    🎯 Assigned Epic IDs
                  </label>
                  {(editForm.role === 'CAMERAMAN' || editForm.role === 'EDITOR') && (
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0284c7' }}>
                      {editAssignedSeqList.length} of {availableEpics.length} Epics Selected
                    </span>
                  )}
                </div>

                {editForm.role === 'ADMIN' ? (
                  <div style={{ padding: '8px 12px', backgroundColor: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: '6px', color: '#6b21a8', fontSize: '12.5px' }}>
                    🛡️ <strong>Full Access:</strong> Administrator role has unrestricted access across all EPICs and system modules.
                  </div>
                ) : editForm.role === 'VIEWER' || editForm.role === 'HIGHER_OFFICIAL_VIEWER' ? (
                  <div style={{ padding: '8px 12px', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', color: '#166534', fontSize: '12.5px' }}>
                    👁️ <strong>Read-Only Access:</strong> General Viewer role can inspect all canonical SME and document records.
                  </div>
                ) : (editForm.role === 'CAMERAMAN' || editForm.role === 'EDITOR') ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        placeholder="Search EPICs by seq, trade or topic..."
                        value={epicSearchFilter}
                        onChange={e => setEpicSearchFilter(e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setEditAssignedSeqList(availableEpics.map(e => e.epicSequence))}
                          style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditAssignedSeqList([])}
                          style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: 'white', padding: '6px' }}>
                      {filteredAvailableEpics.map(epic => {
                        const isChecked = editAssignedSeqList.includes(epic.epicSequence);
                        return (
                          <label
                            key={epic.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              backgroundColor: isChecked ? '#eff6ff' : 'transparent',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setEditAssignedSeqList(prev => [...prev, epic.epicSequence]);
                                } else {
                                  setEditAssignedSeqList(prev => prev.filter(s => s !== epic.epicSequence));
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            <div style={{ fontSize: '12px', flex: 1 }}>
                              <strong style={{ color: '#0f2942' }}>EPIC-{String(epic.epicSequence).padStart(2, '0')}</strong>
                              <span style={{ marginLeft: '6px', color: '#64748b' }}>({epic.trade})</span>
                              {epic.topic && (
                                <span style={{ marginLeft: '6px', color: '#334155', fontSize: '11.5px' }}>
                                  — {epic.topic.substring(0, 50)}...
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                      {filteredAvailableEpics.length === 0 && (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                          No EPIC work entries match search keyword.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                    Team Member role (standard portal access).
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setEditUser(null)} 
                disabled={isSavingEdit}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSaveEdit} 
                disabled={isSavingEdit}
              >
                {isSavingEdit ? 'Saving Changes...' : 'Save User Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: 🗑️ DELETE / DEACTIVATE USER (Two-Step Safety Flow)
         ======================================================== */}
      {deleteUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', width: '92%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            
            {deleteStep === 1 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    ⚠️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#991b1b' }}>
                      Step 1 of 2: Confirm User Deletion Request
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                      Review user account details before continuing.
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', border: '1px solid #fecaca' }}>
                    ⚠️ {deleteError}
                  </div>
                )}

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Name:</strong> {deleteUser.name || '—'}</div>
                  <div><strong>Email:</strong> {deleteUser.email}</div>
                  <div><strong>Role:</strong> {deleteUser.role}</div>
                  <div><strong>Status:</strong> {deleteUser.status}</div>
                  {deleteUser.designation && <div><strong>Designation:</strong> {deleteUser.designation}</div>}
                </div>

                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '12px 14px', fontSize: '12.5px', color: '#92400e', lineHeight: 1.5 }}>
                  <strong>🔒 Production Safety Guarantee:</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
                    <li>If this user has existing shooting schedules, editing assignments, or audit logs, their account will be <strong>safely deactivated (Status: INACTIVE)</strong>.</li>
                    <li>Existing production records, uploaded videos, and audit trails will <strong>NEVER be deleted or cascaded</strong>.</li>
                    <li>If the user has no history, the record will be permanently deleted.</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button className="btn-secondary" onClick={() => setDeleteUser(null)}>
                    Cancel
                  </button>
                  <button 
                    onClick={() => { setDeleteStep(2); setDeleteError(''); }}
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    Proceed to Final Confirmation ➡️
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    🛑
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#991b1b' }}>
                      Step 2 of 2: Final Confirmation
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                      Accidental deletion prevention check.
                    </p>
                  </div>
                </div>

                {deleteError && (
                  <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', border: '1px solid #fecaca' }}>
                    ⚠️ {deleteError}
                  </div>
                )}

                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                  Are you absolutely certain you want to revoke access and delete user <strong>{deleteUser.name || deleteUser.email}</strong>?
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0f2942' }}>
                    Type <span style={{ color: '#dc2626', fontWeight: 800 }}>DELETE</span> below to confirm:
                  </label>
                  <input
                    type="text"
                    placeholder="Type DELETE to confirm"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: deleteConfirmText.trim().toUpperCase() === 'DELETE' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                    disabled={isDeleting}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button 
                    className="btn-secondary" 
                    onClick={() => { setDeleteStep(1); setDeleteError(''); }} 
                    disabled={isDeleting}
                  >
                    ⬅️ Back
                  </button>
                  <button
                    onClick={handleExecuteDelete}
                    disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                    style={{
                      backgroundColor: deleteConfirmText.trim().toUpperCase() === 'DELETE' ? '#dc2626' : '#94a3b8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: deleteConfirmText.trim().toUpperCase() === 'DELETE' && !isDeleting ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {isDeleting ? 'Deleting / Deactivating...' : '🗑️ Confirm Deletion / Revoke Access'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

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

    </div>
  );
}
