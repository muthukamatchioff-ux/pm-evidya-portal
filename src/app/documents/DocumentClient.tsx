"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

export default function DocumentClient({ smes }: { smes: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const getEpicId = (epicSequence: number) => `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;

  const getFriendlyDocName = (type: string, name: string) => {
    if (type === 'APPROVAL_LETTER') return 'Signed Approval Letter';
    if (type === 'SME_ATTENDANCE' || type === 'TRADE_DETAILS' || type === 'ATTENDANCE') return 'SME Attendance PDF';
    if (type === 'WORK_COMPLETION') return 'Work Completion Certificate';
    return type.replace(/_/g, ' ');
  };

  const processedDocs = useMemo(() => {
    const docsList: any[] = [];
    smes.forEach(sme => {
      sme.workEntries.forEach((entry: any) => {
        entry.documents.forEach((doc: any) => {
          docsList.push({
            ...doc,
            smeName: sme.name,
            smeDesignation: sme.designation,
            smeInstitute: sme.institute || 'NIMI Chennai',
            trade: entry.trade,
            topic: entry.topic,
            entryId: entry.id,
            friendlyEpicId: getEpicId(entry.epicSequence || 1),
            friendlyDocName: getFriendlyDocName(doc.type, doc.name)
          });
        });
      });
    });
    // Sort by newest first
    return docsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [smes]);

  // Filtering
  const filteredDocs = processedDocs.filter(doc => {
    const s = searchTerm.toLowerCase();
    return (
      doc.smeName.toLowerCase().includes(s) ||
      doc.friendlyEpicId.toLowerCase().includes(s) ||
      (doc.trade && doc.trade.toLowerCase().includes(s)) ||
      (doc.topic && doc.topic.toLowerCase().includes(s)) ||
      (doc.smeInstitute && doc.smeInstitute.toLowerCase().includes(s)) ||
      doc.friendlyDocName.toLowerCase().includes(s) ||
      (doc.status && doc.status.toLowerCase().includes(s))
    );
  });

  // Summary Metrics
  const totalDocs = processedDocs.length;
  const verifiedDocs = processedDocs.filter(d => d.status === 'VERIFIED').length;
  const uploadedDocs = processedDocs.filter(d => d.status === 'UPLOADED').length;
  
  const totalSmes = smes.length;

  const openPreview = (doc: any) => {
    setPreviewDoc(doc);
  };

  const closePreview = () => {
    setPreviewDoc(null);
  };

  const getStatusColor = (status: string) => {
    if (status === 'Completed') return { bg: '#dcfce3', text: '#16a34a' };
    if (status === 'Pending') return { bg: '#fef3c7', text: '#d97706' };
    return { bg: '#f1f5f9', text: '#64748b' };
  };



  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '20px', maxWidth: '1400px', margin: '0 auto', color: '#0f172a' }}>
      
      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>Dashboard / Documents / SME List</div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>SME Document Registry</h1>
      </div>

      {/* Summary Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Total Documents Uploaded</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginTop: '5px' }}>{totalDocs}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Verified Documents</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a', marginTop: '5px' }}>{verifiedDocs}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Uploaded (Pending Verification)</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706', marginTop: '5px' }}>{uploadedDocs}</div>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Total Registered SMEs</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6', marginTop: '5px' }}>{totalSmes}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '15px' }}>
        <input 
          type="text" 
          placeholder="Search SME, Trade, Institute, Designation..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px', outline: 'none' }}
        />
      </div>

      {/* Document List Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>SME Name & EPIC ID</th>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Trade / Topic</th>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Document Type</th>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Document Name</th>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Upload Date</th>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>No documents found</div>
                    <div>Upload documents from the Document Management section.</div>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, index) => {
                  return (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '14px' }}>{doc.smeName}</div>
                        <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold', marginTop: '2px' }}>{doc.friendlyEpicId}</div>
                      </td>
                      <td style={{ padding: '16px', color: '#334155' }}>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>{doc.trade}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{doc.topic}</div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'inline-block', background: '#e0e7ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                          {doc.friendlyDocName}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '16px' }}>📄</span> {doc.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>v{doc.version || 1}</div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#475569' }}>
                        {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ background: doc.status === 'VERIFIED' ? '#dcfce3' : '#fef3c7', color: doc.status === 'VERIFIED' ? '#16a34a' : '#d97706', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                          {doc.status || 'UPLOADED'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => openPreview(doc)}
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                          >
                            View
                          </button>
                          <a 
                            href={doc.filePath} 
                            download={doc.name}
                            style={{ background: '#3b82f6', border: '1px solid #2563eb', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }}
                          >
                            Download
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {previewDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ background: '#1e293b', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155' }}>
            <div style={{ display: 'flex', gap: '40px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>EPIC ID</div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#60a5fa' }}>{previewDoc.friendlyEpicId}</div>
              </div>
              
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Document Type</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{previewDoc.friendlyDocName || getFriendlyDocName(previewDoc.type, previewDoc.name)}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Version</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>v{previewDoc.version || 1}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Status</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: previewDoc.status === 'VERIFIED' ? '#4ade80' : '#fbbf24' }}>{previewDoc.status || 'Verified'}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Uploaded By</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Admin User</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Uploaded On</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{new Date(previewDoc.createdAt).toLocaleDateString('en-IN')}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <a 
                href={previewDoc.filePath}
                download={previewDoc.name}
                style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
              >
                ⬇ Download
              </a>
              <button 
                onClick={closePreview}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer', padding: '4px' }}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Modal Body / PDF Viewer */}
          <div style={{ flex: 1, background: '#0f172a', padding: '24px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '1000px', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
              <iframe 
                src={previewDoc.filePath} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
