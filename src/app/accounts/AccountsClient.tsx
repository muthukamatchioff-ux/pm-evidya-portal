'use client';

import React, { useState } from 'react';
import { updatePaymentStatus } from './actions';
import { generateSanctionDoc } from './SanctionGenerator';
import styles from './accounts.module.css';

export default function AccountsClient({ initialData, initialHrSalaries }: { initialData: any[], initialHrSalaries: any[] }) {
  const [activeTab, setActiveTab] = useState<'sme' | 'hr'>('sme');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ status: '', utrNumber: '', remarks: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string>('');
  const [uploadingState, setUploadingState] = useState<{ [key: string]: boolean }>({});

  const getEpicId = (epicSequence: number) => `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;

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

  const handleFileUpload = async (smeId: string, entryId: string, type: string, file: File) => {
    const key = `${entryId}-${type}`;
    setUploadingState(prev => ({ ...prev, [key]: true }));
    try {
      const { uploadDocument } = await import('../smes/[id]/actions');
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadDocument(smeId, entryId, type, formData);
      if (res.success) {
        alert(`${type.replace('_', ' ')} uploaded successfully!`);
      } else {
        alert(`Error: ${res.error}`);
      }
    } catch (e) {
      alert(`Failed to upload ${type}`);
    } finally {
      setUploadingState(prev => ({ ...prev, [key]: false }));
    }
  };

  const getDocStatus = (docs: any[], type: string) => {
    return docs?.find(d => d.type === type) ? '✅ Uploaded' : '❌ Missing';
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

  const filteredEntries = initialData.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.sme.name.toLowerCase().includes(searchLower) ||
      entry.trade.toLowerCase().includes(searchLower) ||
      (entry.sme.designation && entry.sme.designation.toLowerCase().includes(searchLower)) ||
      (entry.sme.institute && entry.sme.institute.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Accounts & Payments</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', backgroundColor: 'var(--slate-100)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button 
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 500, backgroundColor: activeTab === 'sme' ? 'white' : 'transparent', color: activeTab === 'sme' ? 'var(--primary)' : 'var(--text-secondary)', boxShadow: activeTab === 'sme' ? 'var(--shadow-sm)' : 'none' }}
              onClick={() => setActiveTab('sme')}
            >Document Upload</button>
            <button 
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 500, backgroundColor: activeTab === 'hr' ? 'white' : 'transparent', color: activeTab === 'hr' ? 'var(--primary)' : 'var(--text-secondary)', boxShadow: activeTab === 'hr' ? 'var(--shadow-sm)' : 'none' }}
              onClick={() => setActiveTab('hr')}
            >HR Salaries (Head 3)</button>
          </div>
          <button className="btn-primary" onClick={exportToCSV}>Export to CSV</button>
        </div>
      </header>

      <div className="card" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
        {activeTab === 'sme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Visual Navigation Indicator */}
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>SME Records</span> <span style={{ color: '#cbd5e1' }}>→</span> 
              <span style={{ color: '#3b82f6' }}>Document Upload</span> <span style={{ color: '#cbd5e1' }}>→</span> 
              <span>Document Registry</span>
            </div>

            {/* Selection Area */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Select SME Record to Upload Documents</label>
              <select 
                value={selectedEntryId}
                onChange={(e) => setSelectedEntryId(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
              >
                <option value="">-- Select an SME Entry --</option>
                {initialData.map(entry => (
                  <option key={entry.id} value={entry.id}>
                    {entry.sme.name} | EPIC ID: {getEpicId(entry.epicSequence || 1)} | {entry.trade} | {entry.sme.institute || 'NIMI Chennai'} | {entry.attendanceFrom ? new Date(entry.attendanceFrom).toLocaleDateString('en-IN') : 'Pending'}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const entry = initialData.find(e => e.id === selectedEntryId);
              if (!entry) {
                return (
                  <div style={{ padding: '60px 20px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>No SME Selected</div>
                    <div style={{ fontSize: '14px', marginTop: '5px' }}>Please select an SME from the dropdown above to upload their documents.</div>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', gap: '20px', flexDirection: 'row', flexWrap: 'wrap' }}>
                  
                  {/* Left Column: Upload Cards */}
                  <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Related SME Info Card */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
                      <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '8px' }}>Selected SME Entry</div>
                      <h3 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '20px' }}>{entry.sme.name}</h3>
                      <div style={{ color: '#475569', fontSize: '14px', marginBottom: '4px' }}><strong>EPIC ID:</strong> {getEpicId(entry.epicSequence || 1)}</div>
                      <div style={{ color: '#475569', fontSize: '14px', marginBottom: '4px' }}><strong>Trade:</strong> {entry.trade}</div>
                      <div style={{ color: '#475569', fontSize: '14px', marginBottom: '4px' }}><strong>Topic:</strong> {entry.topic}</div>
                      <div style={{ color: '#475569', fontSize: '14px', marginBottom: '4px' }}><strong>Institute:</strong> {entry.sme.institute || 'NIMI Chennai'}</div>
                      <div style={{ color: '#475569', fontSize: '14px' }}><strong>Attendance Date:</strong> {entry.attendanceFrom ? new Date(entry.attendanceFrom).toLocaleDateString('en-IN') : 'Pending'}</div>
                    </div>

                    {/* Document Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                      {[
                        { type: 'SME_ATTENDANCE', title: 'SME Attendance', desc: 'Upload signed copy of SME Attendance', icon: '📅' },
                        { type: 'APPROVAL_LETTER', title: 'SME Approval Letter', desc: 'Upload signed copy of SME Approval Letter', icon: '📝' },
                        { type: 'WORK_COMPLETION', title: 'Work Completion Certificate', desc: 'Upload signed copy of Work Completion Certificate', icon: '🎓' }
                      ].map(docDef => {
                        const isUploading = uploadingState[`${entry.id}-${docDef.type}`];
                        const uploadedDoc = entry.documents?.find((d: any) => d.type === docDef.type);
                        const hasDoc = !!uploadedDoc;
                        
                        return (
                          <div key={docDef.type} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                              <div style={{ fontSize: '24px' }}>{docDef.icon}</div>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '20px', background: hasDoc ? '#dcfce3' : '#fee2e2', color: hasDoc ? '#16a34a' : '#ef4444' }}>
                                {hasDoc ? '✓ Uploaded' : '✕ Missing'}
                              </div>
                            </div>
                            
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1e293b' }}>{docDef.title}</h4>
                            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b', flex: 1 }}>{docDef.desc}</p>
                            
                            {hasDoc && (
                              <div style={{ fontSize: '12px', color: '#334155', background: '#f8fafc', padding: '8px', borderRadius: '6px', marginBottom: '15px', wordBreak: 'break-all' }}>
                                ✓ {uploadedDoc.name}
                              </div>
                            )}

                            <label style={{ 
                              cursor: isUploading ? 'not-allowed' : 'pointer', 
                              background: isUploading ? '#cbd5e1' : (hasDoc ? '#f8fafc' : '#3b82f6'), 
                              color: isUploading ? '#475569' : (hasDoc ? '#334155' : 'white'), 
                              border: hasDoc ? '1px solid #cbd5e1' : 'none',
                              padding: '10px', 
                              borderRadius: '6px', 
                              textAlign: 'center', 
                              fontSize: '14px', 
                              fontWeight: 'bold', 
                              display: 'block', 
                              transition: 'all 0.2s' 
                            }}>
                              {isUploading ? 'Uploading...' : (hasDoc ? 'Replace PDF' : 'Upload PDF')}
                              <input 
                                type="file" 
                                accept=".pdf" 
                                style={{ display: 'none' }} 
                                disabled={isUploading}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileUpload(entry.smeId, entry.id, docDef.type, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                            
                            {hasDoc && (
                              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button style={{ flex: 1, background: 'transparent', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#475569' }} onClick={() => window.open(uploadedDoc.filePath, '_blank')}>View</button>
                                <a href={uploadedDoc.filePath} download={uploadedDoc.name} style={{ flex: 1, background: 'transparent', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#475569', textAlign: 'center', textDecoration: 'none' }}>Download</a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Document Flow Panel */}
                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0369a1', marginBottom: '4px' }}>Document Flow</div>
                        <div style={{ fontSize: '14px', color: '#0c4a6e' }}>Uploaded documents are linked to the selected SME Record and will be available in Document Registry.</div>
                      </div>
                      <a href="/documents" style={{ background: '#0ea5e9', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>
                        View in Document Registry →
                      </a>
                    </div>
                  </div>

                  {/* Right Column: Upload Guidelines */}
                  <div style={{ flex: '1 1 30%', minWidth: '250px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'sticky', top: '20px' }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>Upload Guidelines</h4>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#475569' }}>
                        <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#10b981' }}>✓</span> Upload signed documents only</li>
                        <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#10b981' }}>✓</span> PDF format required</li>
                        <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#10b981' }}>✓</span> Document will be linked to selected SME</li>
                        <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#10b981' }}>✓</span> Uploaded document will appear in Document Registry</li>
                        <li style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#10b981' }}>✓</span> Maintain controlled document naming</li>
                      </ul>
                      <div style={{ marginTop: '20px', padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#64748b' }}>
                        <strong>Naming Convention:</strong><br/>
                        The system will automatically generate a secure filename based on the SME ID and Document Type to maintain compliance.
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'hr' && (
          <div className={styles.tableWrapper}>
            <table className="table">
              <thead>
                <tr>
                  <th>HR Name / Role</th>
                  <th>Month / Year</th>
                  <th>Base Salary</th>
                  <th>Total Amount</th>
                  <th>Payment Status</th>
                  <th>UTR Number</th>
                </tr>
              </thead>
              <tbody>
                {initialHrSalaries.length === 0 ? (
                  <tr><td colSpan={6} className={styles.emptyState}>No HR Salary records found. Configure HR Roles in Settings first.</td></tr>
                ) : (
                  initialHrSalaries.map(salary => (
                    <tr key={salary.id}>
                      <td>
                        <strong>{salary.hr.name}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{salary.hr.role}</div>
                      </td>
                      <td>{salary.month} {salary.year}</td>
                      <td>₹ {salary.hr.baseSalary.toLocaleString('en-IN')}</td>
                      <td style={{ fontWeight: 600 }}>₹ {salary.totalAmount.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`${styles.badge} ${styles['badge-' + salary.status.toLowerCase()]}`}>
                          {salary.status}
                        </span>
                      </td>
                      <td>{salary.utrNumber || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
