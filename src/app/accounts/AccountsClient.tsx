'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './accounts.module.css';

interface AccountsClientProps {
  initialData: any[];
  initialHrSalaries?: any[];
  role?: string;
}

export default function AccountsClient({ initialData, role = 'ADMIN' }: AccountsClientProps) {
  const isReadOnly = role === 'HIGHER_OFFICIAL_VIEWER' || role === 'VIEWER';
  const [entries, setEntries] = useState<any[]>(initialData || []);
  const [selectedEntryId, setSelectedEntryId] = useState<string>(
    initialData && initialData.length > 0 ? initialData[0].id : ''
  );
  const [uploadingState, setUploadingState] = useState<{ [key: string]: boolean }>({});
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedEpic, setCopiedEpic] = useState(false);

  // Sync state if initialData updates
  useEffect(() => {
    if (initialData) {
      setEntries(initialData);
      if (!selectedEntryId && initialData.length > 0) {
        setSelectedEntryId(initialData[0].id);
      }
    }
  }, [initialData, selectedEntryId]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  const getEpicId = (epicSequence: number) =>
    `EPIC-2026-PMeVidya ${String(epicSequence || 1).padStart(2, '0')}`;

  const copyEpicId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEpic(true);
    showToast(`Copied ${text} to clipboard!`);
    setTimeout(() => setCopiedEpic(false), 2000);
  };

  const handleFileUpload = async (smeId: string, entryId: string, type: string, file: File) => {
    const key = `${entryId}-${type}`;
    setUploadingState(prev => ({ ...prev, [key]: true }));
    try {
      const { uploadDocument } = await import('../smes/[id]/actions');
      const formData = new FormData();
      formData.append('file', file);
      const res: any = await uploadDocument(smeId, entryId, type, formData);

      if (res && res.success) {
        const newDoc = res.document || {
          id: `doc-${Date.now()}`,
          name: file.name,
          type,
          status: 'UPLOADED',
          filePath: URL.createObjectURL(file),
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Immediately update client-side entries state so the card switches to Uploaded
        setEntries(prevEntries =>
          prevEntries.map(entry => {
            if (entry.id !== entryId) return entry;
            const currentDocs = entry.documents || [];
            const remainingDocs = currentDocs.filter((d: any) => {
              if (type === 'SME_ATTENDANCE') {
                return (
                  d.type !== 'SME_ATTENDANCE' &&
                  d.type !== 'ATTENDANCE' &&
                  d.type !== 'TRADE_DETAILS'
                );
              }
              return d.type !== type;
            });
            return {
              ...entry,
              documents: [newDoc, ...remainingDocs]
            };
          })
        );

        const typeLabel =
          type === 'SME_ATTENDANCE'
            ? 'SME Attendance'
            : type === 'APPROVAL_LETTER'
            ? 'SME Approval Letter'
            : 'Work Completion Certificate';

        showToast(`✓ ${typeLabel} uploaded successfully!`, 'success');
      } else {
        showToast(`Error: ${res?.error || 'Upload failed'}`, 'error');
      }
    } catch (e: any) {
      console.error(e);
      showToast(`Failed to upload: ${e.message || 'Network error'}`, 'error');
    } finally {
      setUploadingState(prev => ({ ...prev, [key]: false }));
    }
  };

  const docDefinitions = [
    {
      type: 'SME_ATTENDANCE',
      title: 'SME Attendance',
      desc: 'Upload signed copy of SME Attendance sheet with daily verification',
      icon: '📅'
    },
    {
      type: 'APPROVAL_LETTER',
      title: 'SME Approval Letter',
      desc: 'Upload signed copy of SME Approval Letter issued by NIMI/NCERT',
      icon: '📝'
    },
    {
      type: 'WORK_COMPLETION',
      title: 'Work Completion Certificate',
      desc: 'Upload signed copy of official Work Completion Certificate',
      icon: '🎓'
    }
  ];

  const findDocument = (entryDocs: any[], type: string) => {
    if (!entryDocs || !entryDocs.length) return null;
    if (type === 'SME_ATTENDANCE') {
      return entryDocs.find(
        (d: any) =>
          d.type === 'SME_ATTENDANCE' ||
          d.type === 'ATTENDANCE' ||
          d.type === 'TRADE_DETAILS'
      );
    }
    return entryDocs.find((d: any) => d.type === type);
  };

  const selectedEntry = entries.find(e => e.id === selectedEntryId);

  // Calculate compliance for the currently selected SME
  const uploadedCount = selectedEntry
    ? docDefinitions.filter(def => !!findDocument(selectedEntry.documents, def.type)).length
    : 0;
  const isFullyCompliant = uploadedCount === docDefinitions.length;

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'success' ? styles.toastSuccess : styles.toastError
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Area */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Document Upload</h1>
          <div className={styles.headerSubtitle}>
            SME Verification & Mandatory Document Upload Portal
          </div>
        </div>

        {selectedEntry && (
          <div className={styles.headerRight}>
            <span
              className={
                isFullyCompliant
                  ? styles.complianceBadge
                  : styles.complianceBadgePending
              }
            >
              {isFullyCompliant ? '✓ 3 / 3 Uploaded (Complete)' : `⚠️ ${uploadedCount} / 3 Uploaded`}
            </span>
            <Link href="/documents" className={styles.registryLink}>
              View Document Registry →
            </Link>
          </div>
        )}
      </header>

      {/* Visual Navigation Flow */}
      <div className={styles.breadcrumb}>
        <span>SME Records</span>
        <span className={styles.breadcrumbArrow}>→</span>
        <span className={styles.breadcrumbActive}>Document Upload</span>
        <span className={styles.breadcrumbArrow}>→</span>
        <Link href="/documents" style={{ color: 'inherit', textDecoration: 'none' }}>
          Document Registry
        </Link>
      </div>

      {/* SME Selector Area */}
      <div className={styles.selectorCard}>
        <label className={styles.selectorLabel}>
          Select SME Record to Upload Documents
        </label>
        <select
          value={selectedEntryId}
          onChange={e => setSelectedEntryId(e.target.value)}
          className={styles.selectInput}
        >
          <option value="">-- Select an SME Entry --</option>
          {entries.map(entry => (
            <option key={entry.id} value={entry.id}>
              {entry.sme?.name} | EPIC ID: {getEpicId(entry.epicSequence || 1)} | {entry.trade} |{' '}
              {entry.sme?.institute || 'NIMI Chennai'} |{' '}
              {entry.attendanceFrom
                ? new Date(entry.attendanceFrom).toLocaleDateString('en-IN')
                : 'Pending'}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      {!selectedEntry ? (
        <div className={styles.emptyState}>
          <div style={{ fontSize: '42px', marginBottom: '10px' }}>📄</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
            No SME Record Selected
          </div>
          <div style={{ fontSize: '14px', marginTop: '6px' }}>
            Please select an SME entry from the dropdown above to view and upload their compliance documents.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '24px', flexDirection: 'row', flexWrap: 'wrap' }}>
          {/* Left Column: Upload Cards and Flow */}
          <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column' }}>
            {/* Selected SME Entry Info Card */}
            <div className={styles.smeDetailsCard}>
              <div className={styles.smeHeaderRow}>
                <div>
                  <div className={styles.smeSubtitle}>Selected SME Entry</div>
                  <h3 className={styles.smeName}>{selectedEntry.sme?.name}</h3>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={styles.epicPill}>
                    {getEpicId(selectedEntry.epicSequence || 1)}
                  </span>
                  <button
                    className={styles.btnCopy}
                    onClick={() => copyEpicId(getEpicId(selectedEntry.epicSequence || 1))}
                    title="Copy EPIC ID"
                  >
                    {copiedEpic ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>

              <div className={styles.smeGrid}>
                <div className={styles.smeItem}>
                  <strong>Trade:</strong> {selectedEntry.trade}
                </div>
                <div className={styles.smeItem}>
                  <strong>Topic:</strong> {selectedEntry.topic || 'Curriculum Modules'}
                </div>
                <div className={styles.smeItem}>
                  <strong>Institute:</strong> {selectedEntry.sme?.institute || 'NIMI Chennai'}
                </div>
                <div className={styles.smeItem}>
                  <strong>Attendance Date:</strong>{' '}
                  {selectedEntry.attendanceFrom
                    ? new Date(selectedEntry.attendanceFrom).toLocaleDateString('en-IN')
                    : 'Pending'}
                </div>
              </div>
            </div>

            {/* Document Upload Grid (SME Attendance, SME Approval Letter, Work Completion Certificate) */}
            <div className={styles.docGrid}>
              {docDefinitions.map(docDef => {
                const isUploading = uploadingState[`${selectedEntry.id}-${docDef.type}`];
                const uploadedDoc = findDocument(selectedEntry.documents, docDef.type);
                const hasDoc = !!uploadedDoc;
                const filePreviewUrl = uploadedDoc?.filePath?.startsWith('data:')
                  ? uploadedDoc.filePath
                  : (uploadedDoc?.id ? `/api/documents/${uploadedDoc.id}` : '#');
                const fileDownloadUrl = uploadedDoc?.filePath?.startsWith('data:')
                  ? uploadedDoc.filePath
                  : (uploadedDoc?.id ? `/api/documents/${uploadedDoc.id}?download=1` : '#');

                return (
                  <div
                    key={docDef.type}
                    className={`${styles.docCard} ${hasDoc ? styles.docCardUploaded : ''}`}
                  >
                    <div>
                      {/* Card Header with Icon & Status Badge */}
                      <div className={styles.docCardTop}>
                        <div
                          className={`${styles.docIconWrap} ${
                            hasDoc ? styles.docIconUploaded : ''
                          }`}
                        >
                          {docDef.icon}
                        </div>

                        {/* Status Badge: If document exists, do NOT show 'Missing', show 'Uploaded' */}
                        {hasDoc ? (
                          <div className={styles.badgeUploaded}>
                            <span>✓ Uploaded</span>
                          </div>
                        ) : (
                          <div className={styles.badgeMissing}>
                            <span>✕ Missing</span>
                          </div>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h4 className={styles.docTitle}>{docDef.title}</h4>
                      <p className={styles.docDesc}>{docDef.desc}</p>

                      {/* If file already exists: Display attached file details, View, Download */}
                      {hasDoc && (
                        <div className={styles.attachedFileBox}>
                          <div className={styles.fileHeadRow}>
                            <span className={styles.pdfTag}>PDF</span>
                            <span
                              className={styles.fileName}
                              title={uploadedDoc.name}
                            >
                              {uploadedDoc.name}
                            </span>
                          </div>

                          <div className={styles.fileMeta}>
                            <span className={styles.fileMetaItem}>
                              🏷️ v{uploadedDoc.version || 1}
                            </span>
                            <span className={styles.fileMetaItem}>
                              📅{' '}
                              {new Date(
                                uploadedDoc.updatedAt || uploadedDoc.createdAt || Date.now()
                              ).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>

                          {/* Quick Action buttons: View & Download */}
                          <div className={styles.fileActionsRow}>
                            <button
                              className={styles.btnView}
                              onClick={() =>
                                setPreviewDoc({
                                  ...uploadedDoc,
                                  title: docDef.title,
                                  epicId: getEpicId(selectedEntry.epicSequence || 1),
                                  smeName: selectedEntry.sme?.name,
                                  url: filePreviewUrl,
                                  downloadUrl: fileDownloadUrl
                                })
                              }
                            >
                              👁️ View
                            </button>
                            <a
                              href={fileDownloadUrl}
                              download={uploadedDoc.name}
                              className={styles.btnDownload}
                              target="_blank"
                              rel="noreferrer"
                            >
                              ⬇ Download
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Area */}
                    <div>
                      {isReadOnly ? (
                        !hasDoc && (
                          <div style={{ padding: '8px', fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                            📄 Document pending upload
                          </div>
                        )
                      ) : hasDoc ? (
                        /* RE-UPLOAD OPTION ONLY AT THE BOTTOM (reupload option onli down la ah kamikkanum) */
                        <div className={styles.reuploadContainer}>
                          <label
                            className={styles.btnReupload}
                            style={{
                              opacity: isUploading ? 0.7 : 1,
                              cursor: isUploading ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <span>
                              {isUploading
                                ? '⏳ Uploading new version...'
                                : '🔄 Re-upload / Replace Document'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              style={{ display: 'none' }}
                              disabled={isUploading}
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileUpload(
                                    selectedEntry.smeId,
                                    selectedEntry.id,
                                    docDef.type,
                                    e.target.files[0]
                                  );
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        /* PRIMARY UPLOAD BUTTON WHEN FILE IS MISSING */
                        <label
                          className={`${styles.btnUploadPrimary} ${
                            isUploading ? styles.btnUploadLoading : ''
                          }`}
                        >
                          <span>{isUploading ? '⏳ Uploading...' : '⬆ Upload PDF'}</span>
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            style={{ display: 'none' }}
                            disabled={isUploading}
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileUpload(
                                  selectedEntry.smeId,
                                  selectedEntry.id,
                                  docDef.type,
                                  e.target.files[0]
                                );
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Document Flow Banner */}
            <div className={styles.flowBanner}>
              <div>
                <div className={styles.flowTitle}>Document Flow & Audit Tracking</div>
                <div className={styles.flowDesc}>
                  Uploaded documents are securely linked to this SME Record (
                  {getEpicId(selectedEntry.epicSequence || 1)}) and are immediately accessible in the Document Registry.
                </div>
              </div>
              <Link href="/documents" className={styles.registryLink}>
                View in Document Registry →
              </Link>
            </div>
          </div>

          {/* Right Column: Upload Guidelines */}
          <div style={{ flex: '1 1 30%', minWidth: '280px' }}>
            <div className={styles.guidelinesCard}>
              <h4 className={styles.guidelinesTitle}>Upload Guidelines & Compliance</h4>
              <ul className={styles.guidelinesList}>
                <li>
                  <span className={styles.guidelinesCheck}>✓</span>
                  <span><strong>Signed Documents:</strong> Upload only officially signed and stamped documents.</span>
                </li>
                <li>
                  <span className={styles.guidelinesCheck}>✓</span>
                  <span><strong>Format Requirement:</strong> Clear PDF format required for audit trail.</span>
                </li>
                <li>
                  <span className={styles.guidelinesCheck}>✓</span>
                  <span><strong>Automatic Linkage:</strong> Document is permanently associated with this EPIC ID.</span>
                </li>
                <li>
                  <span className={styles.guidelinesCheck}>✓</span>
                  <span><strong>Version Control:</strong> Re-uploading automatically increments the version counter without data loss.</span>
                </li>
                <li>
                  <span className={styles.guidelinesCheck}>✓</span>
                  <span><strong>Document Registry:</strong> All documents will reflect in real-time in the Central Registry.</span>
                </li>
              </ul>

              <div className={styles.namingNote}>
                <strong>Automated Compliance Naming:</strong><br />
                The system automatically creates a secure, standardized filename combining the SME ID, Work Entry, and Document Type for government audit readiness.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {previewDoc && (
        <div
          className={styles.modalOverlay}
          onClick={e => {
            if (e.target === e.currentTarget) setPreviewDoc(null);
          }}
        >
          <div className={styles.modalHeader}>
            <div>
              <div className={styles.modalHeaderTitle}>
                {previewDoc.title || previewDoc.name}
              </div>
              <div className={styles.modalHeaderSub}>
                {previewDoc.smeName} • {previewDoc.epicId} • Version {previewDoc.version || 1}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <a
                href={previewDoc.downloadUrl || previewDoc.url}
                download={previewDoc.name}
                className={styles.registryLink}
                target="_blank"
                rel="noreferrer"
              >
                ⬇ Download
              </a>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setPreviewDoc(null)}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.modalIframeWrap}>
              <iframe
                src={previewDoc.url}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
