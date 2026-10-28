"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './documents.module.css';

interface DocumentClientProps {
  smes: any[];
  documents?: any[];
}

export default function DocumentClient({ smes, documents }: DocumentClientProps) {
  const [selectedEpicId, setSelectedEpicId] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const getEpicId = (epicSequence: number) =>
    `EPIC-2026-PMeVidya ${String(epicSequence || 1).padStart(2, '0')}`;

  const getFriendlyDocName = (type: string, name: string) => {
    if (type === 'APPROVAL_LETTER' || type === 'STAGE_A_APPROVAL_LETTER') return 'Signed Approval Letter';
    if (type === 'SME_ATTENDANCE' || type === 'TRADE_DETAILS' || type === 'ATTENDANCE')
      return 'SME Attendance PDF';
    if (type === 'WORK_COMPLETION' || type === 'STAGE_B_WORK_COMPLETION') return 'Work Completion Certificate';
    if (type === 'PAYMENT_NOTE' || type === 'STAGE_C_REMUNERATION') return 'SME Remuneration Note';
    return (type || 'Document').replace(/_/g, ' ');
  };

  // Pre-build index for fast metadata lookups
  const workEntryMap = useMemo(() => {
    const map = new Map<string, { entry: any; sme: any }>();
    smes.forEach(sme => {
      (sme.workEntries || []).forEach((entry: any) => {
        map.set(entry.id, { entry, sme });
      });
    });
    return map;
  }, [smes]);

  // Pre-build index of uploaded documents by workEntryId and normalized document type
  const uploadedDocsByEntryAndType = useMemo(() => {
    const map = new Map<string, any>();
    const normalizeType = (t: string) => {
      if (t === 'APPROVAL_LETTER' || t === 'STAGE_A_APPROVAL_LETTER') return 'APPROVAL_LETTER';
      if (t === 'WORK_COMPLETION' || t === 'STAGE_B_WORK_COMPLETION') return 'WORK_COMPLETION';
      if (t === 'SME_ATTENDANCE' || t === 'ATTENDANCE' || t === 'TRADE_DETAILS') return 'SME_ATTENDANCE';
      if (t === 'PAYMENT_NOTE' || t === 'STAGE_C_REMUNERATION') return 'PAYMENT_NOTE';
      return t;
    };

    const registerUploaded = (d: any) => {
      if (!d || !d.workEntryId) return;
      const isRealFile = d.status === 'UPLOADED' && d.filePath && !d.filePath.startsWith('{');
      if (!isRealFile) return;
      const key = `${d.workEntryId}:${normalizeType(d.type)}`;
      const existing = map.get(key);
      if (!existing || (d.version || 1) > (existing.version || 1)) {
        map.set(key, d);
      }
    };

    if (Array.isArray(documents)) {
      documents.forEach(registerUploaded);
    }
    smes.forEach(sme => {
      (sme.workEntries || []).forEach((we: any) => {
        (we.documents || []).forEach(registerUploaded);
      });
    });

    return map;
  }, [smes, documents]);

  // Collect all uploaded documents across all SMEs and direct document queries, deduplicated by doc.id
  const processedDocs = useMemo(() => {
    const docMap = new Map<string, any>();

    const normalizeType = (t: string) => {
      if (t === 'APPROVAL_LETTER' || t === 'STAGE_A_APPROVAL_LETTER') return 'APPROVAL_LETTER';
      if (t === 'WORK_COMPLETION' || t === 'STAGE_B_WORK_COMPLETION') return 'WORK_COMPLETION';
      if (t === 'SME_ATTENDANCE' || t === 'ATTENDANCE' || t === 'TRADE_DETAILS') return 'SME_ATTENDANCE';
      if (t === 'PAYMENT_NOTE' || t === 'STAGE_C_REMUNERATION') return 'PAYMENT_NOTE';
      return t;
    };

    const registerDoc = (doc: any, fallbackEntry?: any, fallbackSme?: any) => {
      if (!doc || !doc.id || docMap.has(doc.id)) return;

      const weInfo = doc.workEntryId ? workEntryMap.get(doc.workEntryId) : null;
      const entry = doc.workEntry || weInfo?.entry || fallbackEntry;
      const sme = entry?.sme || weInfo?.sme || fallbackSme;

      const epicSequence = entry?.epicSequence || (doc.workEntry?.epicSequence ?? 1);
      const friendlyEpicId = getEpicId(epicSequence);
      const isDirectUploaded = !!(
        (doc.status === 'UPLOADED' || doc.filePath?.startsWith('http') || doc.filePath?.startsWith('data:')) &&
        doc.filePath &&
        !doc.filePath.startsWith('{')
      );

      const companionUpload = (!isDirectUploaded && doc.workEntryId)
        ? uploadedDocsByEntryAndType.get(`${doc.workEntryId}:${normalizeType(doc.type)}`)
        : null;

      const hasStoredFile = isDirectUploaded || !!companionUpload;
      const targetFileId = isDirectUploaded ? doc.id : (companionUpload?.id || doc.id);
      const originalFileName = isDirectUploaded ? doc.name : (companionUpload?.name || doc.name);
      const effectiveVersion = isDirectUploaded ? (doc.version || 1) : (companionUpload?.version || doc.version || 1);

      docMap.set(doc.id, {
        ...doc,
        smeName: sme?.name || doc.workEntry?.sme?.name || 'Subject Matter Expert',
        smeDesignation: sme?.designation || doc.workEntry?.sme?.designation || '',
        smeInstitute: sme?.institute || doc.workEntry?.sme?.institute || 'NIMI Chennai',
        trade: entry?.trade || doc.workEntry?.trade || 'General',
        topic: entry?.topic || doc.workEntry?.topic || '',
        entryId: entry?.id || doc.workEntryId,
        epicSequence,
        friendlyEpicId,
        friendlyDocName: getFriendlyDocName(doc.type, doc.name),
        hasStoredFile,
        targetFileId,
        originalFileName,
        effectiveVersion
      });
    };

    // 1. Process documents passed from primary query
    if (Array.isArray(documents) && documents.length > 0) {
      documents.forEach(doc => registerDoc(doc));
    }

    // 2. Also process documents attached to SMEs to guarantee completeness
    smes.forEach(sme => {
      (sme.workEntries || []).forEach((entry: any) => {
        (entry.documents || []).forEach((doc: any) => {
          registerDoc(doc, entry, sme);
        });
      });
    });

    return Array.from(docMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [smes, documents, workEntryMap, uploadedDocsByEntryAndType]);

  // Extract all unique EPIC IDs registered across all SMEs and processed documents
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
        const matchingDocs = processedDocs.filter(d => d.friendlyEpicId === epicId);
        map.set(epicId, {
          epicId,
          smeName: sme.name,
          trade: entry.trade || 'General',
          topic: entry.topic || '',
          institute: sme.institute || 'NIMI Chennai',
          entryId: entry.id,
          docs: matchingDocs
        });
      });
    });

    // Also include any EPIC IDs that exist in processedDocs but might not be in smes array
    processedDocs.forEach(d => {
      if (d.friendlyEpicId && !map.has(d.friendlyEpicId)) {
        const matchingDocs = processedDocs.filter(doc => doc.friendlyEpicId === d.friendlyEpicId);
        map.set(d.friendlyEpicId, {
          epicId: d.friendlyEpicId,
          smeName: d.smeName || 'Subject Matter Expert',
          trade: d.trade || 'General',
          topic: d.topic || '',
          institute: d.smeInstitute || 'NIMI Chennai',
          entryId: d.entryId || '',
          docs: matchingDocs
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.epicId.localeCompare(b.epicId, undefined, { numeric: true })
    );
  }, [smes, processedDocs]);

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
    const hasApproval = docs.some((d: any) => d.type === 'APPROVAL_LETTER' || d.type === 'STAGE_A_APPROVAL_LETTER');
    const hasCompletion = docs.some((d: any) => d.type === 'WORK_COMPLETION' || d.type === 'STAGE_B_WORK_COMPLETION');
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
        } else if (selectedDocType === 'APPROVAL_LETTER') {
          if (doc.type !== 'APPROVAL_LETTER' && doc.type !== 'STAGE_A_APPROVAL_LETTER') {
            return false;
          }
        } else if (selectedDocType === 'WORK_COMPLETION') {
          if (doc.type !== 'WORK_COMPLETION' && doc.type !== 'STAGE_B_WORK_COMPLETION') {
            return false;
          }
        } else if (selectedDocType === 'PAYMENT_NOTE') {
          if (doc.type !== 'PAYMENT_NOTE' && doc.type !== 'STAGE_C_REMUNERATION') {
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
    const fileId = doc.targetFileId || doc.id;
    const fileUrl =
      doc.filePath?.startsWith('data:')
        ? doc.filePath
        : `/api/documents/${fileId}`;
    setPreviewDoc({
      ...doc,
      id: fileId,
      previewUrl: fileUrl,
      actualFilename: doc.originalFileName || doc.name,
      displayVersion: doc.effectiveVersion || doc.version || 1
    });
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
              <option value="PAYMENT_NOTE">SME Remuneration Note</option>
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
                  const downloadHref = doc.hasStoredFile
                    ? (doc.filePath?.startsWith('data:')
                        ? doc.filePath
                        : `/api/documents/${doc.targetFileId || doc.id}?download=1`)
                    : '#';

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
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                          onClick={() => openPreview(doc)}
                          title="Click to view original document"
                        >
                          <span>📄</span>
                          <span
                            style={{
                              maxWidth: '260px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: doc.hasStoredFile ? '#2563eb' : '#334155',
                              fontWeight: doc.hasStoredFile ? 600 : 500,
                              textDecoration: doc.hasStoredFile ? 'underline' : 'none'
                            }}
                            title={doc.originalFileName || doc.name}
                          >
                            {doc.originalFileName || doc.name}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            marginTop: '2px'
                          }}
                        >
                          Version v{doc.effectiveVersion || doc.version || 1}
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
                        {doc.hasStoredFile ? (
                          <span
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              border: '1px solid #bbf7d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>✓</span> UPLOADED
                          </span>
                        ) : doc.status === 'SAVED' ? (
                          <span
                            style={{
                              background: '#e0e7ff',
                              color: '#3730a3',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              border: '1px solid #c7d2fe',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>📝</span> PARAMETERS
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              border: '1px solid #fde68a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>⏳</span> PENDING UPLOAD
                          </span>
                        )}
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
                          {doc.hasStoredFile ? (
                            <a
                              href={downloadHref}
                              download={doc.originalFileName || doc.name}
                              className={styles.btnDownload}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Download
                            </a>
                          ) : (
                            <button
                              className={styles.btnDownload}
                              style={{
                                opacity: 0.5,
                                cursor: 'not-allowed',
                                background: '#94a3b8',
                                borderColor: '#94a3b8'
                              }}
                              onClick={() => alert('No original document file has been uploaded for this entry yet. Please upload it via Document Upload.')}
                              title="Original file not uploaded yet"
                            >
                              Download
                            </button>
                          )}
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

      {/* Original Document Preview Modal */}
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
                <div className={styles.modalMetaLabel}>Original Filename</div>
                <div
                  className={styles.modalMetaValue}
                  style={{
                    maxWidth: '260px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={previewDoc.actualFilename || previewDoc.name}
                >
                  {previewDoc.actualFilename || previewDoc.name}
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
                  v{previewDoc.displayVersion || previewDoc.version || 1}
                </div>
              </div>

              <div>
                <div className={styles.modalMetaLabel}>Status</div>
                <div className={styles.modalMetaValue}>
                  {previewDoc.hasStoredFile ? (
                    <span style={{ color: '#4ade80' }}>✓ Uploaded</span>
                  ) : (
                    <span style={{ color: '#fbbf24' }}>Pending Upload</span>
                  )}
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
              {previewDoc.hasStoredFile ? (
                <a
                  href={
                    previewDoc.filePath?.startsWith('data:')
                      ? previewDoc.previewUrl
                      : `/api/documents/${previewDoc.id}?download=1`
                  }
                  download={previewDoc.actualFilename || previewDoc.name}
                  className={styles.btnDownload}
                  target="_blank"
                  rel="noreferrer"
                >
                  ⬇ Download
                </a>
              ) : (
                <button
                  className={styles.btnDownload}
                  style={{
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    background: '#64748b',
                    borderColor: '#475569'
                  }}
                  disabled
                  title="Original file not uploaded yet"
                >
                  ⬇ File Not Uploaded
                </button>
              )}
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
            {!previewDoc.hasStoredFile ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '40px'
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '36px 32px',
                    maxWidth: '480px',
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                  <h3 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                    Original Document Not Uploaded
                  </h3>
                  <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                    This registry entry currently contains metadata only. The original signed/approved document file has not yet been uploaded.
                  </p>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', textAlign: 'left', fontSize: '13px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#64748b' }}>Document:</span>
                      <strong>{previewDoc.name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#64748b' }}>EPIC ID:</span>
                      <strong style={{ color: '#2563eb' }}>{previewDoc.friendlyEpicId}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#64748b' }}>SME Name:</span>
                      <strong>{previewDoc.smeName}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#64748b' }}>Status:</span>
                      <span style={{ color: '#d97706', fontWeight: 700 }}>Pending Upload</span>
                    </div>
                  </div>
                  <Link
                    href="/accounts"
                    style={{
                      display: 'inline-block',
                      background: '#2563eb',
                      color: '#ffffff',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '13.5px'
                    }}
                  >
                    Go to Document Upload
                  </Link>
                </div>
              </div>
            ) : (() => {
              const fname = (previewDoc.actualFilename || previewDoc.name || '').toLowerCase();
              const isWord = fname.endsWith('.docx') || fname.endsWith('.doc');
              const isImage = fname.endsWith('.jpg') || fname.endsWith('.jpeg') || fname.endsWith('.png') || fname.endsWith('.webp') || fname.endsWith('.svg');

              if (isWord) {
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      padding: '40px'
                    }}
                  >
                    <div
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '36px 32px',
                        maxWidth: '520px',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                      }}
                    >
                      <div style={{ fontSize: '52px', marginBottom: '16px' }}>📝</div>
                      <h3 style={{ fontSize: '19px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
                        Microsoft Word Document
                      </h3>
                      <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
                        <strong>{previewDoc.actualFilename || previewDoc.name}</strong>
                      </p>
                      <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 24px', lineHeight: 1.5 }}>
                        Word documents are opened or downloaded directly using your desktop application or viewer.
                      </p>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <a
                          href={`/api/documents/${previewDoc.id}?download=1`}
                          download={previewDoc.actualFilename || previewDoc.name}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#2563eb',
                            color: '#ffffff',
                            padding: '10px 22px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '13.5px'
                          }}
                        >
                          ⬇ Download Original File
                        </a>
                        <a
                          href={`/api/documents/${previewDoc.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f1f5f9',
                            color: '#1e293b',
                            border: '1px solid #cbd5e1',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '13.5px'
                          }}
                        >
                          ↗ Open File
                        </a>
                      </div>
                    </div>
                  </div>
                );
              }

              if (isImage) {
                return (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#0f172a',
                      padding: '24px',
                      overflow: 'auto'
                    }}
                  >
                    <img
                      src={previewDoc.previewUrl}
                      alt={previewDoc.actualFilename || previewDoc.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        borderRadius: '6px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
                      }}
                    />
                  </div>
                );
              }

              return (
                <div className={styles.modalIframeWrap}>
                  <iframe
                    src={previewDoc.previewUrl}
                    style={{ width: '100%', height: '100%', border: 'none', background: '#525659' }}
                    title={previewDoc.actualFilename || previewDoc.name}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
