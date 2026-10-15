"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './documents.module.css';

interface DocumentClientProps {
  smes: any[];
}

export default function DocumentClient({ smes }: DocumentClientProps) {
  const [selectedEpicId, setSelectedEpicId] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const getEpicId = (epicSequence: number) =>
    `EPIC-2026-PMeVidya ${String(epicSequence || 1).padStart(2, '0')}`;

  const getFriendlyDocName = (type: string, name: string) => {
    if (type === 'APPROVAL_LETTER') return 'Signed Approval Letter';
    if (type === 'SME_ATTENDANCE' || type === 'TRADE_DETAILS' || type === 'ATTENDANCE')
      return 'SME Attendance PDF';
    if (type === 'WORK_COMPLETION') return 'Work Completion Certificate';
    return (type || 'Document').replace(/_/g, ' ');
  };

  // Collect all uploaded documents across all SMEs and work entries
  const processedDocs = useMemo(() => {
    const docsList: any[] = [];
    smes.forEach(sme => {
      (sme.workEntries || []).forEach((entry: any) => {
        (entry.documents || []).forEach((doc: any) => {
          docsList.push({
            ...doc,
            smeName: sme.name,
            smeDesignation: sme.designation,
            smeInstitute: sme.institute || 'NIMI Chennai',
            trade: entry.trade,
            topic: entry.topic,
            entryId: entry.id,
            epicSequence: entry.epicSequence,
            friendlyEpicId: getEpicId(entry.epicSequence || 1),
            friendlyDocName: getFriendlyDocName(doc.type, doc.name)
          });
        });
      });
    });
    // Sort by newest first
    return docsList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [smes]);

  // Extract all unique EPIC IDs registered across all SMEs
  const epicOptions = useMemo(() => {
    const map = new Map<
      string,
      {
        epicId: string;
        smeName: string;
        trade: string;
        topic: string;
        institute: string;
        entryId: string;
        docs: any[];
      }
    >();

    smes.forEach(sme => {
      (sme.workEntries || []).forEach((entry: any) => {
        const epicId = getEpicId(entry.epicSequence || 1);
        map.set(epicId, {
          epicId,
          smeName: sme.name,
          trade: entry.trade || 'General',
          topic: entry.topic || '',
          institute: sme.institute || 'NIMI Chennai',
          entryId: entry.id,
          docs: entry.documents || []
        });
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.epicId.localeCompare(b.epicId, undefined, { numeric: true })
    );
  }, [smes]);

  // Details for the currently selected EPIC ID (if filtered)
  const selectedEpicDetails = useMemo(() => {
    if (!selectedEpicId) return null;
    return epicOptions.find(opt => opt.epicId === selectedEpicId) || null;
  }, [selectedEpicId, epicOptions]);

  // Checklist of 3 mandatory docs for the currently selected EPIC ID
  const epicChecklist = useMemo(() => {
    if (!selectedEpicDetails) return null;
    const docs = selectedEpicDetails.docs || [];
    const hasAttendance = docs.some(
      (d: any) =>
        d.type === 'SME_ATTENDANCE' ||
        d.type === 'ATTENDANCE' ||
        d.type === 'TRADE_DETAILS'
    );
    const hasApproval = docs.some((d: any) => d.type === 'APPROVAL_LETTER');
    const hasCompletion = docs.some((d: any) => d.type === 'WORK_COMPLETION');
    return { hasAttendance, hasApproval, hasCompletion };
  }, [selectedEpicDetails]);

  // Filtering documents based on EPIC ID and Doc Type
  const filteredDocs = useMemo(() => {
    return processedDocs.filter(doc => {
      // 1. EPIC ID Filter
      if (selectedEpicId && doc.friendlyEpicId !== selectedEpicId) {
        return false;
      }

      // 2. Document Type Filter
      if (selectedDocType) {
        if (selectedDocType === 'SME_ATTENDANCE') {
          if (
            doc.type !== 'SME_ATTENDANCE' &&
            doc.type !== 'ATTENDANCE' &&
            doc.type !== 'TRADE_DETAILS'
          ) {
            return false;
          }
        } else if (doc.type !== selectedDocType) {
          return false;
        }
      }

      return true;
    });
  }, [processedDocs, selectedEpicId, selectedDocType]);

  // Metrics
  const totalDocs = processedDocs.length;
  const totalSmes = smes.length;
  const totalEpics = epicOptions.length;

  const resetAllFilters = () => {
    setSelectedEpicId('');
    setSelectedDocType('');
  };

  const hasActiveFilters = !!(selectedEpicId || selectedDocType);

  const openPreview = (doc: any) => {
    const fileUrl =
      doc.filePath?.startsWith('data:')
        ? doc.filePath
        : `/api/documents/${doc.id}`;
    setPreviewDoc({ ...doc, previewUrl: fileUrl });
  };

  const closePreview = () => {
    setPreviewDoc(null);
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumb & Header */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/accounts" style={{ color: 'inherit', textDecoration: 'none' }}>
          Document Upload
        </Link>
        <span>/</span>
        <span style={{ color: '#2563eb', fontWeight: 600 }}>Document Registry</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>SME Document Registry</h1>
          <div className={styles.headerSubtitle}>
            Central repository of verified SME compliance and engagement documents
          </div>
        </div>
      </header>

      {/* Summary Metrics (Removed confusing 'Verified Documents' card) */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Total Documents Uploaded</span>
            <div className={styles.metricIcon}>📁</div>
          </div>
          <div className={styles.metricValue}>{totalDocs}</div>
          <div className={styles.metricSubtext}>Across all SME work entries</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Total Registered SMEs</span>
            <div className={styles.metricIcon}>👨‍🏫</div>
          </div>
          <div className={styles.metricValue} style={{ color: '#0284c7' }}>
            {totalSmes}
          </div>
          <div className={styles.metricSubtext}>Subject Matter Experts</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Total Linked EPIC IDs</span>
            <div className={styles.metricIcon}>🏷️</div>
          </div>
          <div className={styles.metricValue} style={{ color: '#16a34a' }}>
            {totalEpics}
          </div>
          <div className={styles.metricSubtext}>Trackable work entry records</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Matching Documents</span>
            <div className={styles.metricIcon}>🔍</div>
          </div>
          <div className={styles.metricValue} style={{ color: '#4f46e5' }}>
            {filteredDocs.length}
          </div>
          <div className={styles.metricSubtext}>
            {hasActiveFilters ? 'Based on active filters' : 'All records displayed'}
          </div>
        </div>
      </div>

      {/* Sleek Compact Filter Toolbar */}
      <div className={styles.filterToolbar}>
        <div className={styles.filterControlsRow}>
          {/* EPIC ID Filter */}
          <div className={styles.filterGroupInline}>
            <label htmlFor="filter-epic-id" className={styles.filterInlineLabel}>
              Filter by EPIC ID:
            </label>
            <select
              id="filter-epic-id"
              value={selectedEpicId}
              onChange={e => setSelectedEpicId(e.target.value)}
              className={`${styles.selectCompact} ${
                selectedEpicId ? styles.selectCompactActive : ''
              }`}
            >
              <option value="">
                -- All EPIC IDs ({epicOptions.length} Registered) --
              </option>
              {epicOptions.map(opt => (
                <option key={opt.epicId} value={opt.epicId}>
                  {opt.epicId} — {opt.smeName} ({opt.docs.length}{' '}
                  {opt.docs.length === 1 ? 'doc' : 'docs'})
                </option>
              ))}
            </select>
          </div>

          {/* Document Type Filter */}
          <div className={styles.filterGroupInline}>
            <label htmlFor="filter-doc-type" className={styles.filterInlineLabel}>
              Document Type:
            </label>
            <select
              id="filter-doc-type"
              value={selectedDocType}
              onChange={e => setSelectedDocType(e.target.value)}
              className={`${styles.selectCompact} ${
                selectedDocType ? styles.selectCompactActive : ''
              }`}
            >
              <option value="">-- All Document Types --</option>
              <option value="SME_ATTENDANCE">SME Attendance PDF</option>
              <option value="APPROVAL_LETTER">Signed Approval Letter</option>
              <option value="WORK_COMPLETION">Work Completion Certificate</option>
            </select>
          </div>

          {/* Inline Reset Button */}
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className={styles.btnClearCompact}
              title="Reset all active filters"
            >
              ✕ Clear Filter
            </button>
          )}

          {/* Inline Count Info */}
          <div className={styles.filterResultCount}>
            Showing <strong>{filteredDocs.length}</strong> of <strong>{totalDocs}</strong> documents
          </div>
        </div>
      </div>

      {/* Linked EPIC ID Spotlight Banner (Rendered when an EPIC ID is selected) */}
      {selectedEpicDetails && (
        <div className={styles.epicSpotlightCard}>
          <div className={styles.spotlightHeader}>
            <div>
              <span className={styles.spotlightEpicBadge}>
                {selectedEpicDetails.epicId}
              </span>
              <h3 className={styles.spotlightSmeName}>
                {selectedEpicDetails.smeName}
              </h3>
              <div className={styles.spotlightSmeMeta}>
                <strong>Trade:</strong> {selectedEpicDetails.trade} &nbsp;•&nbsp;
                <strong>Institute:</strong> {selectedEpicDetails.institute}
                {selectedEpicDetails.topic && (
                  <span> &nbsp;•&nbsp; <strong>Topic:</strong> {selectedEpicDetails.topic}</span>
                )}
              </div>
            </div>

            <div className={styles.spotlightActions}>
              <Link
                href="/accounts"
                className={styles.btnSpotlightUpload}
              >
                <span>📤</span>
                <span>Upload / Manage for this EPIC</span>
              </Link>
              <button
                onClick={() => setSelectedEpicId('')}
                className={styles.btnSpotlightReset}
              >
                Show All EPIC IDs
              </button>
            </div>
          </div>

          {/* Checklist of 3 Mandatory Documents for this EPIC ID */}
          {epicChecklist && (
            <div className={styles.spotlightChecklist}>
              <div className={styles.checkItem}>
                <span className={styles.checkItemTitle}>📅 SME Attendance</span>
                {epicChecklist.hasAttendance ? (
                  <span className={styles.checkBadgeAttached}>✓ Uploaded</span>
                ) : (
                  <span className={styles.checkBadgeMissing}>✕ Missing</span>
                )}
              </div>

              <div className={styles.checkItem}>
                <span className={styles.checkItemTitle}>📝 Approval Letter</span>
                {epicChecklist.hasApproval ? (
                  <span className={styles.checkBadgeAttached}>✓ Uploaded</span>
                ) : (
                  <span className={styles.checkBadgeMissing}>✕ Missing</span>
                )}
              </div>

              <div className={styles.checkItem}>
                <span className={styles.checkItemTitle}>🎓 Work Completion</span>
                {epicChecklist.hasCompletion ? (
                  <span className={styles.checkBadgeAttached}>✓ Uploaded</span>
                ) : (
                  <span className={styles.checkBadgeMissing}>✕ Missing</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document List Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderBar}>
          <h4 className={styles.tableTitle}>
            {selectedEpicId
              ? `Documents Linked to ${selectedEpicId}`
              : 'Registered SME Compliance Documents'}
          </h4>
          <span className={styles.tableCount}>
            Showing {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SME Name & EPIC ID</th>
                <th>Trade / Topic</th>
                <th>Document Type</th>
                <th>Document Name</th>
                <th>Upload Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: '50px 20px',
                      textAlign: 'center',
                      color: '#64748b'
                    }}
                  >
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>
                      📂
                    </div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#1e293b',
                        marginBottom: '6px'
                      }}
                    >
                      {selectedEpicId
                        ? `No documents found linked to ${selectedEpicId}`
                        : 'No documents match your filters'}
                    </div>
                    <div style={{ fontSize: '13.5px', marginBottom: '16px' }}>
                      {selectedEpicId
                        ? `Upload documents for this EPIC ID from Document Upload.`
                        : 'Try selecting a different EPIC ID or document type.'}
                    </div>
                    {selectedEpicId ? (
                      <Link
                        href="/accounts"
                        className={styles.btnSpotlightUpload}
                        style={{ display: 'inline-flex' }}
                      >
                        Go to Document Upload →
                      </Link>
                    ) : (
                      <button
                        onClick={resetAllFilters}
                        className={styles.btnClearFilters}
                        style={{ display: 'inline-flex' }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDocs.map(doc => {
                  const downloadHref =
                    doc.filePath?.startsWith('data:')
                      ? doc.filePath
                      : `/api/documents/${doc.id}?download=1`;

                  return (
                    <tr key={doc.id}>
                      <td>
                        <div
                          style={{
                            fontWeight: 'bold',
                            color: '#0f172a',
                            fontSize: '14px'
                          }}
                        >
                          {doc.smeName}
                        </div>
                        {/* Clickable EPIC ID Pill to quickly filter */}
                        <button
                          className={styles.epicPillBtn}
                          onClick={() => setSelectedEpicId(doc.friendlyEpicId)}
                          title="Click to filter all documents for this EPIC ID"
                        >
                          {doc.friendlyEpicId}
                        </button>
                      </td>
                      <td>
                        <div style={{ fontSize: '13.5px', fontWeight: '500' }}>
                          {doc.trade || 'General'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {doc.topic || 'Curriculum Module'}
                        </div>
                      </td>
                      <td>
                        <span className={styles.docTypePill}>
                          {doc.friendlyDocName}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>📄</span>
                          <span
                            style={{
                              maxWidth: '260px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={doc.name}
                          >
                            {doc.name}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            marginTop: '2px'
                          }}
                        >
                          Version v{doc.version || 1}
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: '#475569' }}>
                        {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>
                        <span
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            border: '1px solid #bbf7d0'
                          }}
                        >
                          UPLOADED
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'flex-end'
                          }}
                        >
                          <button
                            onClick={() => openPreview(doc)}
                            className={styles.btnView}
                          >
                            View
                          </button>
                          <a
                            href={downloadHref}
                            download={doc.name}
                            className={styles.btnDownload}
                            target="_blank"
                            rel="noreferrer"
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
        <div
          className={styles.modalOverlay}
          onClick={e => {
            if (e.target === e.currentTarget) closePreview();
          }}
        >
          <div className={styles.modalHeader}>
            <div className={styles.modalMetaGroup}>
              <div>
                <div className={styles.modalMetaLabel}>EPIC ID</div>
                <div
                  className={styles.modalMetaValue}
                  style={{ color: '#60a5fa' }}
                >
                  {previewDoc.friendlyEpicId}
                </div>
              </div>

              <div>
                <div className={styles.modalMetaLabel}>SME Name</div>
                <div className={styles.modalMetaValue}>
                  {previewDoc.smeName}
                </div>
              </div>

              <div>
                <div className={styles.modalMetaLabel}>Document Type</div>
                <div className={styles.modalMetaValue}>
                  {previewDoc.friendlyDocName ||
                    getFriendlyDocName(previewDoc.type, previewDoc.name)}
                </div>
              </div>

              <div>
                <div className={styles.modalMetaLabel}>Version</div>
                <div className={styles.modalMetaValue}>
                  v{previewDoc.version || 1}
                </div>
              </div>

              <div>
                <div className={styles.modalMetaLabel}>Uploaded On</div>
                <div className={styles.modalMetaValue}>
                  {new Date(previewDoc.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'center'
              }}
            >
              <a
                href={previewDoc.filePath?.startsWith('data:') ? previewDoc.previewUrl : `/api/documents/${previewDoc.id}?download=1`}
                download={previewDoc.name}
                className={styles.btnDownload}
                target="_blank"
                rel="noreferrer"
              >
                ⬇ Download
              </a>
              <button
                onClick={closePreview}
                className={styles.modalCloseBtn}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.modalIframeWrap}>
              <iframe
                src={previewDoc.previewUrl}
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
