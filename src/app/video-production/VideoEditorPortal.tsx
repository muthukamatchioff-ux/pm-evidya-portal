'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './video-production.module.css';
import { saveEditorPostProductionEntry, detectVideoDuration } from './actions';
import { matchesEditorName } from '@/lib/epicHelpers';

interface VideoEditorPortalProps {
  currentUser: any;
  videoRegister: any[];
  onRefreshData: () => Promise<void>;
  onViewOverallTracker: () => void;
  setNotification: (notif: { type: 'success' | 'error'; message: string } | null) => void;
}

export default function VideoEditorPortal({
  currentUser,
  videoRegister,
  onRefreshData,
  onViewOverallTracker,
  setNotification
}: VideoEditorPortalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Default active tab for Editor is DASHBOARD as specified in prompt section 2
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ASSIGNMENTS' | 'POST_PRODUCTION_ENTRY' | 'PROFILE'>('DASHBOARD');

  // Synchronize active tab with URL search parameter & sidebar events
  useEffect(() => {
    if (tabParam) {
      if (['DASHBOARD', 'ASSIGNMENTS', 'POST_PRODUCTION_ENTRY', 'PROFILE'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [tabParam]);

  useEffect(() => {
    const handler = (e: any) => {
      const tab = e.detail?.tab;
      if (['DASHBOARD', 'ASSIGNMENTS', 'POST_PRODUCTION_ENTRY', 'PROFILE'].includes(tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('portalTabChange', handler);
    return () => window.removeEventListener('portalTabChange', handler);
  }, []);

  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const userName = (currentUser?.name || '').toLowerCase().trim();

  // Parse assigned epic sequences from user.department
  const assignedSequences = useMemo<number[]>(() => {
    try {
      if (currentUser?.department && currentUser.department.startsWith('[')) {
        return JSON.parse(currentUser.department);
      }
      if (currentUser?.department) {
        const match = currentUser.department.match(/EPIC[S]?:\s*([0-9,\s]+)/i) || currentUser.department.match(/\[([0-9,\s]+)\]/);
        const numsStr = match ? match[1] : (currentUser.department.match(/^[0-9,\s]+$/) ? currentUser.department : '');
        if (numsStr) {
          return numsStr.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n));
        }
      }
    } catch (_) {}
    return [];
  }, [currentUser]);

  // All eligible topics assigned to this Video Editor (deduplicated by video topic from videoRegister)
  const assignedRows = useMemo(() => {
    return videoRegister.filter(row => {
      if (assignedSequences.length > 0 && assignedSequences.includes(row.epicSequence)) {
        return true;
      }
      return matchesEditorName(row.editor, userName, userEmail);
    });
  }, [videoRegister, assignedSequences, userEmail, userName]);

  // Broadcast real persisted assignment count to Left Sidebar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('portalAssignmentCount', { detail: { count: assignedRows.length } }));
  }, [assignedRows.length]);

  // Distinct assigned EPIC IDs
  const assignedEpics = useMemo(() => {
    return Array.from(new Set(assignedRows.map(r => r.epicCode))).filter(e => e && e !== '-').sort();
  }, [assignedRows]);

  const [selectedEpic, setSelectedEpic] = useState<string>('');

  useEffect(() => {
    if (assignedEpics.length > 0 && (!selectedEpic || !assignedEpics.includes(selectedEpic))) {
      setSelectedEpic(assignedEpics[0]);
    }
  }, [assignedEpics, selectedEpic]);

  // Rows for currently selected EPIC ID
  const selectedEpicRows = useMemo(() => {
    return assignedRows.filter(r => r.epicCode === selectedEpic);
  }, [assignedRows, selectedEpic]);

  // Active queue topics for selected EPIC: Shooting completed or editing started/deliverable present
  const queueTopics = useMemo(() => {
    return selectedEpicRows.filter(r => {
      const shootStatus = (r.shootingStatus || '').toLowerCase();
      const editStatus = (r.editingStatus || '').toLowerCase();
      return (
        shootStatus.includes('completed') || 
        shootStatus.includes('received') || 
        shootStatus.includes('digital') || 
        editStatus.includes('progress') || 
        editStatus.includes('process') || 
        editStatus.includes('completed') ||
        !!r.finalVideoLink
      );
    });
  }, [selectedEpicRows]);

  // Topics still in shooting stage
  const pendingShootTopics = useMemo(() => {
    return selectedEpicRows.filter(r => {
      const shootStatus = (r.shootingStatus || '').toLowerCase();
      const editStatus = (r.editingStatus || '').toLowerCase();
      return (
        !shootStatus.includes('completed') && 
        !shootStatus.includes('received') && 
        !shootStatus.includes('digital') && 
        !editStatus.includes('progress') && 
        !editStatus.includes('process') && 
        !editStatus.includes('completed') &&
        !r.finalVideoLink
      );
    });
  }, [selectedEpicRows]);

  // Metadata for selected EPIC
  const epicMeta = useMemo(() => {
    if (selectedEpicRows.length === 0) return null;
    const first = selectedEpicRows[0];
    const readyCount = queueTopics.filter(r => (r.editingStatus || '').toLowerCase() === 'pending' || (r.editingStatus || '').toLowerCase() === 'not yet started').length;
    const inProgCount = queueTopics.filter(r => (r.editingStatus || '').toLowerCase().includes('progress') || (r.editingStatus || '').toLowerCase().includes('process')).length;
    const completedCount = queueTopics.filter(r => (r.editingStatus || '').toLowerCase().includes('completed')).length;
    const submittedCount = queueTopics.filter(r => (r.submissionStatus || '').toLowerCase().includes('awaiting') || (r.submissionStatus || '').toLowerCase().includes('submitted')).length;

    return {
      month: first.month,
      trade: first.trade,
      smeName: first.smeName,
      totalTopics: selectedEpicRows.length,
      queueCount: queueTopics.length,
      readyCount,
      inProgCount,
      completedCount,
      submittedCount,
      epicCode: first.epicCode,
      epicId: first.epicId
    };
  }, [selectedEpicRows, queueTopics]);

  // Form states per topic
  const [topicForms, setTopicForms] = useState<Record<string, {
    start: string;
    end: string;
    status: string;
    duration: string;
    link: string;
    comments: string;
    loading: boolean;
  }>>({});

  useEffect(() => {
    const nextForms: Record<string, any> = {};
    selectedEpicRows.forEach(row => {
      nextForms[row.uniqueKey] = {
        start: row.editingStartDate || '',
        end: row.editingEndDate || '',
        status: row.editingStatus || 'Pending',
        duration: row.duration || '',
        link: row.finalVideoLink || '',
        comments: row.editorialComments || (row.reviewComments && !row.reviewComments.startsWith('{') ? row.reviewComments : '') || '',
        loading: false
      };
    });
    setTopicForms(prev => ({ ...prev, ...nextForms }));
  }, [selectedEpicRows]);

  const handleFieldChange = (uniqueKey: string, field: string, value: string) => {
    setTopicForms(prev => ({
      ...prev,
      [uniqueKey]: {
        ...(prev[uniqueKey] || { start: '', end: '', status: 'Pending', duration: '', link: '', comments: '', loading: false }),
        [field]: value
      }
    }));
  };

  // Auto-detect video duration
  const handleDetectDuration = async (uniqueKey: string, url: string) => {
    if (!url || !url.trim()) {
      alert('Please enter a video link first to detect duration.');
      return;
    }
    const res = await detectVideoDuration(url.trim());
    if (res.success && res.duration) {
      handleFieldChange(uniqueKey, 'duration', res.duration);
    } else {
      alert(res.error || 'Could not auto-detect duration. Please enter duration manually (e.g. 00:18:45).');
    }
  };

  const broadcastSync = () => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('pmevidya_video_production_sync');
        channel.postMessage({ type: 'RECORD_SAVED', timestamp: Date.now() });
        channel.close();
      } catch (_) {}
    }
  };

  // ========================================================
  // 1. UPDATE EDITING PROGRESS (Replaces Save Draft completely)
  // ========================================================
  const handleUpdateProgress = async (row: any) => {
    const form = topicForms[row.uniqueKey] || {
      start: row.editingStartDate || '',
      end: row.editingEndDate || '',
      status: row.editingStatus || 'In Progress',
      duration: row.duration || '',
      link: row.finalVideoLink || '',
      comments: row.editorialComments || '',
      loading: false
    };

    if (form.start && form.end && form.end < form.start) {
      alert('Validation Error: Editing End Date cannot precede Editing Start Date.');
      return;
    }

    if (form.link && form.link.trim() !== '' && form.link !== '-') {
      const url = form.link.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('Validation Error: Final Video Link must be a valid HTTP or HTTPS URL.');
        return;
      }
    }

    setTopicForms(prev => ({
      ...prev,
      [row.uniqueKey]: { ...prev[row.uniqueKey], loading: true }
    }));

    try {
      const res = await saveEditorPostProductionEntry({
        workEntryId: row.epicId,
        videoId: row.videoId,
        editingStartDate: form.start || null,
        editingEndDate: form.end || null,
        editingStatus: form.status,
        duration: form.duration || null,
        finalVideoLink: form.link || null,
        reviewComments: form.comments || null,
        isSubmit: false
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `✓ Saved progress for "${row.videoTitle}". Persisted in database & Admin Work Assignment.`
        });
        await onRefreshData();
        broadcastSync();
      } else {
        alert(res.error || 'Failed to update progress.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating progress.');
    } finally {
      setTopicForms(prev => ({
        ...prev,
        [row.uniqueKey]: { ...prev[row.uniqueKey], loading: false }
      }));
    }
  };

  // ========================================================
  // 2. FINAL SUBMISSION MODAL STATE & CONFIRMATION
  // ========================================================
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitTargetRow, setSubmitTargetRow] = useState<any | null>(null);

  const handleOpenSubmitModal = (row: any) => {
    const form = topicForms[row.uniqueKey] || {
      start: row.editingStartDate || '',
      end: row.editingEndDate || '',
      status: 'Completed',
      duration: row.duration || '',
      link: row.finalVideoLink || '',
      comments: row.editorialComments || '',
      loading: false
    };

    if (!form.start || !form.end) {
      alert('Validation Error: Please select both Editing Start Date and Editing End Date before submitting.');
      return;
    }

    if (form.end < form.start) {
      alert('Validation Error: Editing End Date cannot precede Editing Start Date.');
      return;
    }

    if (!form.link || form.link.trim() === '' || form.link === '-') {
      alert('Validation Error: A valid Final Video Deliverable Link (HTTP or HTTPS) is required to submit.');
      return;
    }

    const url = form.link.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      alert('Validation Error: Final Video Link must be a valid HTTP or HTTPS URL (e.g. https://drive.google.com/...).');
      return;
    }

    if (!form.duration || form.duration.trim() === '' || form.duration === '-') {
      alert('Validation Error: Please specify the final Video Duration (e.g. 00:18:45).');
      return;
    }

    setSubmitTargetRow(row);
    setSubmitModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!submitTargetRow) return;
    const row = submitTargetRow;
    const form = topicForms[row.uniqueKey] || {
      start: row.editingStartDate || '',
      end: row.editingEndDate || '',
      status: 'Completed',
      duration: row.duration || '',
      link: row.finalVideoLink || '',
      comments: row.editorialComments || '',
      loading: false
    };

    setTopicForms(prev => ({
      ...prev,
      [row.uniqueKey]: { ...prev[row.uniqueKey], loading: true }
    }));
    setSubmitModalOpen(false);

    try {
      const res = await saveEditorPostProductionEntry({
        workEntryId: row.epicId,
        videoId: row.videoId,
        editingStartDate: form.start || null,
        editingEndDate: form.end || null,
        editingStatus: 'Completed',
        duration: form.duration || null,
        finalVideoLink: form.link || null,
        reviewComments: form.comments || null,
        isSubmit: true
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `🎉 Video deliverable submitted for "${row.videoTitle}"! Status is now Submitted – Awaiting Admin Approval.`
        });
        await onRefreshData();
        broadcastSync();
      } else {
        alert(res.error || 'Failed to submit final deliverable.');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting final deliverable.');
    } finally {
      setTopicForms(prev => ({
        ...prev,
        [row.uniqueKey]: { ...prev[row.uniqueKey], loading: false }
      }));
      setSubmitTargetRow(null);
    }
  };

  // ========================================================
  // 3. PERSISTED KPI METRICS FOR DASHBOARD
  // ========================================================
  const kpis = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let submitted = 0;
    let adminApproved = 0;
    let revisionRequired = 0;

    assignedRows.forEach(r => {
      const sub = (r.submissionStatus || '').toLowerCase();
      const edit = (r.editingStatus || '').toLowerCase();

      if (sub.includes('approved')) {
        adminApproved++;
      } else if (sub.includes('revision') || sub.includes('reject')) {
        revisionRequired++;
      } else if (sub.includes('awaiting') || sub.includes('submitted')) {
        submitted++;
      } else if (sub.includes('completed') || edit === 'completed') {
        completed++;
      } else if (sub.includes('progress') || edit.includes('progress') || edit.includes('process')) {
        inProgress++;
      } else {
        pending++;
      }
    });

    return {
      total: assignedRows.length,
      pending,
      inProgress,
      completed,
      submitted,
      adminApproved,
      revisionRequired
    };
  }, [assignedRows]);

  // Search filter for My Assignments table
  const [assignSearch, setAssignSearch] = useState('');
  const [assignEpicFilter, setAssignEpicFilter] = useState('ALL');

  const filteredAssignments = useMemo(() => {
    return assignedRows.filter(r => {
      if (assignEpicFilter !== 'ALL' && r.epicCode !== assignEpicFilter) return false;
      if (!assignSearch.trim()) return true;
      const q = assignSearch.toLowerCase().trim();
      return (
        r.videoTitle.toLowerCase().includes(q) ||
        r.epicCode.toLowerCase().includes(q) ||
        r.trade.toLowerCase().includes(q) ||
        r.smeName.toLowerCase().includes(q) ||
        (r.editingStatus || '').toLowerCase().includes(q) ||
        (r.submissionStatus || '').toLowerCase().includes(q)
      );
    });
  }, [assignedRows, assignSearch, assignEpicFilter]);

  // Professional Submission Status Badge Renderer
  const renderSubmissionBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('approved')) {
      return <span className={styles.pillApproved}>✓ Admin Approved</span>;
    }
    if (s.includes('revision') || s.includes('reject')) {
      return <span className={styles.pillRevision}>⚠️ Revision Required</span>;
    }
    if (s.includes('awaiting') || s.includes('submitted')) {
      return <span className={styles.pillSubmitted}>📤 Submitted – Awaiting Approval</span>;
    }
    if (s.includes('completed')) {
      return <span className={styles.pillCompleted}>✓ Completed</span>;
    }
    if (s.includes('progress') || s.includes('process')) {
      return <span className={styles.pillInProgress}>⏳ In Progress</span>;
    }
    return <span className={styles.pillPending}>⏳ Pending</span>;
  };

  const renderEditingBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('completed')) {
      return <span className={styles.pillCompleted}>Completed</span>;
    }
    if (s.includes('progress') || s.includes('process')) {
      return <span className={styles.pillInProgress}>In Progress</span>;
    }
    return <span className={styles.pillPending}>Pending</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* ========================================================
          PORTAL HEADER
         ======================================================== */}
      <div className={styles.portalHeader}>
        <div className={styles.portalTitleCol}>
          <h1 className={styles.pageTitle}>
            <span className={styles.titleIcon}>✂️</span>
            <span>Video Editor Portal — Post-Production Stage</span>
          </h1>
          <p className={styles.headerSubtitle}>
            National Instructional Media Institute (NIMI) | Manage editing queue, review rough cuts, verify duration compliance, and submit final video deliverables
          </p>
        </div>

        <div className={styles.portalBadgeEd}>
          <span>🎬</span>
          <span>
            {currentUser?.name || 'Hassan & Antony'} ({currentUser?.email || 'hassan.antony@nimi.org'})
          </span>
        </div>
      </div>

      {/* ========================================================
          TAB 1: 📊 DASHBOARD (EDITOR OVERVIEW)
         ======================================================== */}
      {activeTab === 'DASHBOARD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Revision Required Alert Banner if applicable */}
          {kpis.revisionRequired > 0 && (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #f87171',
              borderRadius: '10px',
              padding: '14px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <strong style={{ color: '#991b1b', fontSize: '14px' }}>
                  ⚠️ Attention Required: {kpis.revisionRequired} video topic(s) have revision requests from Admin.
                </strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#7f1d1d' }}>
                  Please review the specific feedback remarks entered by the Admin, make the corrections, and resubmit.
                </p>
              </div>
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ padding: '6px 14px', fontSize: '12px', borderColor: '#ef4444', color: '#b91c1c' }}
                onClick={() => setActiveTab('POST_PRODUCTION_ENTRY')}
              >
                Open Post-Production Entry ➔
              </button>
            </div>
          )}

          {/* 7 Summary KPI Cards */}
          <div className={styles.editorKpiGrid}>
            {/* 1. Total Assigned */}
            <div className={styles.editorKpiCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.kpiLabel}>Total Assigned</span>
                <span style={{ fontSize: '18px' }}>📁</span>
              </div>
              <div className={styles.kpiValue}>{kpis.total}</div>
              <span className={styles.kpiSubtext}>Topics across {assignedEpics.length} EPICs</span>
            </div>

            {/* 2. Pending Editing */}
            <div className={styles.editorKpiCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.kpiLabel}>Pending Editing</span>
                <span style={{ fontSize: '18px' }}>⏳</span>
              </div>
              <div className={styles.kpiValue} style={{ color: '#64748b' }}>{kpis.pending}</div>
              <span className={styles.kpiSubtext}>Editing yet to start</span>
            </div>

            {/* 3. In Progress */}
            <div className={styles.editorKpiCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.kpiLabel}>In Progress</span>
                <span style={{ fontSize: '18px' }}>💻</span>
              </div>
              <div className={styles.kpiValue} style={{ color: '#0284c7' }}>{kpis.inProgress}</div>
              <span className={styles.kpiSubtext}>Currently undergoing editing</span>
            </div>

            {/* 4. Editing Completed */}
            <div className={styles.editorKpiCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.kpiLabel}>Editing Completed</span>
                <span style={{ fontSize: '18px' }}>🏁</span>
              </div>
              <div className={styles.kpiValue} style={{ color: '#10b981' }}>{kpis.completed}</div>
              <span className={styles.kpiSubtext}>Edited, ready for submission</span>
            </div>

            {/* 5. Submitted */}
            <div className={styles.editorKpiCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.kpiLabel}>Submitted</span>
                <span style={{ fontSize: '18px' }}>📤</span>
              </div>
              <div className={styles.kpiValue} style={{ color: '#7e22ce' }}>{kpis.submitted}</div>
              <span className={styles.kpiSubtext}>Awaiting Admin Approval</span>
            </div>

            {/* 6. Admin Approved */}
            <div className={styles.editorKpiCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.kpiLabel}>Admin Approved</span>
                <span style={{ fontSize: '18px' }}>✓</span>
              </div>
              <div className={styles.kpiValue} style={{ color: '#16a34a' }}>{kpis.adminApproved}</div>
              <span className={styles.kpiSubtext}>Approved for publication</span>
            </div>

            {/* 7. Revision Required */}
            <div className={styles.editorKpiCard} style={{ borderColor: kpis.revisionRequired > 0 ? '#fca5a5' : '#e2e8f0', background: kpis.revisionRequired > 0 ? '#fff5f5' : '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.kpiLabel}>Revision Required</span>
                <span style={{ fontSize: '18px' }}>⚠️</span>
              </div>
              <div className={styles.kpiValue} style={{ color: '#dc2626' }}>{kpis.revisionRequired}</div>
              <span className={styles.kpiSubtext}>Corrections requested</span>
            </div>
          </div>

          {/* Assigned EPICs Overview */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
              Assigned Post-Production EPICs ({assignedEpics.length}):
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '14px' }}>
              {assignedEpics.map(epic => {
                const rows = assignedRows.filter(r => r.epicCode === epic);
                const first = rows[0];
                const doneCount = rows.filter(r => {
                  const s = (r.submissionStatus || '').toLowerCase();
                  return s.includes('completed') || s.includes('approved') || s.includes('submitted');
                }).length;
                const percent = rows.length > 0 ? Math.round((doneCount / rows.length) * 100) : 0;

                return (
                  <div key={epic} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#7e22ce', fontSize: '14px' }}>{epic}</strong>
                      <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>{first?.month} 2026</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>{first?.trade}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>SME: {first?.smeName}</div>

                    <div style={{ marginTop: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#475569', marginBottom: '4px' }}>
                        <span>Progress: {doneCount} of {rows.length} deliverables</span>
                        <span>{percent}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: percent === 100 ? '#16a34a' : '#7e22ce', transition: 'width 0.3s' }} />
                      </div>
                    </div>

                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        style={{ padding: '5px 12px', fontSize: '12px', borderColor: '#7e22ce', color: '#7e22ce', fontWeight: 600 }}
                        onClick={() => {
                          setSelectedEpic(epic);
                          setActiveTab('POST_PRODUCTION_ENTRY');
                        }}
                      >
                        Open Post-Production ➔
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: 📋 MY ASSIGNMENTS
         ======================================================== */}
      {activeTab === 'ASSIGNMENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                All My Assigned Video Topics ({assignedRows.length}):
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Displaying only eligible video topics assigned to your Video Editor account
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select
                className={styles.selectInput}
                value={assignEpicFilter}
                onChange={e => setAssignEpicFilter(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                <option value="ALL">All Assigned EPICs ({assignedEpics.length})</option>
                {assignedEpics.map(epic => (
                  <option key={epic} value={epic}>{epic}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Search assigned topics, trade, SME..."
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                className={styles.searchInputField}
                style={{ width: '280px', padding: '6px 12px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div className={styles.trackerTableWrapper}>
            <table className={styles.trackerTable}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>S.No</th>
                  <th style={{ minWidth: '85px' }}>Month</th>
                  <th style={{ minWidth: '150px' }}>EPIC ID</th>
                  <th style={{ minWidth: '130px' }}>Trade</th>
                  <th style={{ minWidth: '150px' }}>SME / Resource Person</th>
                  <th style={{ minWidth: '220px' }}>Video Topic</th>
                  <th style={{ minWidth: '120px', textAlign: 'center' }}>Shooting Status</th>
                  <th style={{ minWidth: '110px', textAlign: 'center' }}>Editing Status</th>
                  <th style={{ minWidth: '160px', textAlign: 'center' }}>Submission Status</th>
                  <th style={{ minWidth: '100px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((row, idx) => (
                  <tr key={row.uniqueKey}>
                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{row.sNo || (idx + 1)}</td>
                    <td className={styles.monthCellHighlight}>{row.month}</td>
                    <td style={{ fontWeight: 700, color: '#7e22ce' }}>{row.epicCode}</td>
                    <td>{row.trade}</td>
                    <td style={{ color: '#334155' }}>{row.smeName}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{row.videoTitle}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={styles.pillCompleted} style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {row.shootingStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {renderEditingBadge(row.editingStatus)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {renderSubmissionBadge(row.submissionStatus)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        style={{ padding: '4px 10px', fontSize: '12px', color: '#7e22ce', borderColor: '#7e22ce', fontWeight: 600 }}
                        onClick={() => {
                          setSelectedEpic(row.epicCode);
                          setActiveTab('POST_PRODUCTION_ENTRY');
                        }}
                      >
                        Edit ➔
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAssignments.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No assigned video topics match your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: 🎬 POST-PRODUCTION ENTRY
         ======================================================== */}
      {activeTab === 'POST_PRODUCTION_ENTRY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* EPIC Selector Card */}
          <div className={styles.epicSelectCard}>
            <div className={styles.epicSelectHeader}>
              <div>
                <label className={styles.formLabel} style={{ fontSize: '13.5px', fontWeight: 700, color: '#7e22ce' }}>
                  Select Assigned EPIC ID:
                </label>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Select an assigned EPIC to view its topics, shooting reference details, and post-production entry forms
                </p>
              </div>

              <select
                className={styles.toolbarSelect}
                style={{ minWidth: '270px', padding: '8px 14px', fontSize: '14px', fontWeight: 700, borderColor: '#7e22ce' }}
                value={selectedEpic}
                onChange={e => setSelectedEpic(e.target.value)}
              >
                {assignedEpics.map(epic => (
                  <option key={epic} value={epic}>{epic}</option>
                ))}
              </select>
            </div>

            {/* Clickable Assigned EPIC ID Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                Your Assigned EPICs:
              </span>
              {assignedEpics.map(epic => (
                <button
                  key={epic}
                  type="button"
                  onClick={() => setSelectedEpic(epic)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: '1px solid',
                    borderColor: selectedEpic === epic ? '#7e22ce' : '#cbd5e1',
                    backgroundColor: selectedEpic === epic ? '#7e22ce' : '#ffffff',
                    color: selectedEpic === epic ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {epic}
                </button>
              ))}
            </div>

            {/* Selected EPIC Metadata Grid */}
            {epicMeta && (
              <div className={styles.epicMetaGrid} style={{ marginTop: '14px' }}>
                <div className={styles.epicMetaItem}>
                  <span className={styles.epicMetaLabel}>Month</span>
                  <span className={styles.epicMetaValue} style={{ color: '#b91c1c' }}>{epicMeta.month} 2026</span>
                </div>
                <div className={styles.epicMetaItem}>
                  <span className={styles.epicMetaLabel}>Trade</span>
                  <span className={styles.epicMetaValue}>{epicMeta.trade}</span>
                </div>
                <div className={styles.epicMetaItem}>
                  <span className={styles.epicMetaLabel}>SME / Resource Person</span>
                  <span className={styles.epicMetaValue}>{epicMeta.smeName}</span>
                </div>
                <div className={styles.epicMetaItem}>
                  <span className={styles.epicMetaLabel}>Editing Queue Status</span>
                  <span className={styles.epicMetaValue} style={{ color: '#7e22ce' }}>
                    {epicMeta.queueCount} of {epicMeta.totalTopics} Ready for Post-Production
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pending Shooting Info Alert if any */}
          {pendingShootTopics.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#92400e' }}>
              ⏳ <strong>{pendingShootTopics.length} topic(s)</strong> in {selectedEpic} are currently in Shooting Stage ({pendingShootTopics.map(p => `S.No ${p.sNo}`).join(', ')}). They will automatically appear in your active editing queue once shooting is marked Completed by the Cameraman.
            </div>
          )}

          {/* Topic-Wise Cards */}
          <div className={styles.topicListContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Active Post-Production Queue in {selectedEpic} ({queueTopics.length} Topics):
              </h3>
            </div>

            {queueTopics.map(row => {
              const form = topicForms[row.uniqueKey] || {
                start: row.editingStartDate || '',
                end: row.editingEndDate || '',
                status: row.editingStatus || 'Pending',
                duration: row.duration || '',
                link: row.finalVideoLink || '',
                comments: row.editorialComments || '',
                loading: false
              };

              const hasDateError = Boolean(form.start && form.end && form.end < form.start);
              const canSubmit = Boolean(
                form.status === 'Completed' &&
                form.start &&
                form.end &&
                !hasDateError &&
                form.duration &&
                form.duration.trim() !== '' &&
                form.duration !== '-' &&
                form.link &&
                (form.link.startsWith('http://') || form.link.startsWith('https://'))
              );

              const subStatus = row.submissionStatus || 'Pending';
              const isAwaitingApproval = subStatus === 'Submitted – Awaiting Admin Approval';
              const isAdminApproved = subStatus === 'Admin Approved';
              const isRevisionReq = subStatus === 'Revision Required';

              return (
                <div key={row.uniqueKey} className={styles.topicCard} style={{ borderLeft: isRevisionReq ? '4px solid #ef4444' : isAdminApproved ? '4px solid #16a34a' : isAwaitingApproval ? '4px solid #7e22ce' : '1px solid #e2e8f0' }}>
                  {/* Topic Card Header */}
                  <div className={styles.topicCardHeader}>
                    <div className={styles.topicTitleArea}>
                      <span className={styles.topicBadgeId}>S.No {row.sNo}</span>
                      <span className={styles.topicBadgeId} style={{ background: '#faf5ff', color: '#7e22ce' }}>{row.displayVideoId}</span>
                      <span className={styles.topicTitleText}>{row.videoTitle}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {renderSubmissionBadge(subStatus)}
                    </div>
                  </div>

                  <div className={styles.topicCardBody}>
                    {/* Admin Review Feedback Banner (Revision Required) */}
                    {isRevisionReq && (
                      <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', marginBottom: '12px' }}>
                        <strong>⚠️ Admin Revision Request:</strong> {row.adminReviewComments || 'Please review deliverable link and duration, make corrections, and re-submit.'}
                      </div>
                    )}

                    {/* Admin Approved Banner */}
                    {isAdminApproved && (
                      <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#166534', marginBottom: '12px' }}>
                        <strong>✓ Admin Approved:</strong> This video deliverable has been reviewed and approved by the Administrator for the Video Content Library.
                      </div>
                    )}

                    {/* Submitted - Awaiting Admin Approval Banner */}
                    {isAwaitingApproval && (
                      <div style={{ background: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#6b21a8', marginBottom: '12px' }}>
                        <strong>📤 Formally Submitted:</strong> Awaiting Administrator review and publication approval. (Submitted on {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : 'Recent'}).
                      </div>
                    )}

                    {/* Shooting Stage Reference (READ ONLY - Actual Cameraman Name preserved) */}
                    <div className={styles.referenceBanner}>
                      <div>
                        <strong>🎥 Shooting Reference (Read Only):</strong>{' '}
                        <span>Start: {row.shootingStartDate || '-'}</span> |{' '}
                        <span>End: {row.shootingEndDate || '-'}</span> |{' '}
                        <span>Cameraman: <strong>{row.cameraman}</strong></span>
                      </div>
                      <span className={styles.pillCompleted} style={{ fontSize: '11px', padding: '2px 8px' }}>
                        Shooting {row.shootingStatus}
                      </span>
                    </div>

                    {/* Post-Production Editing Form */}
                    <div className={styles.topicFormGrid}>
                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Editing Start Date</label>
                        <input
                          type="date"
                          className={styles.formSelect}
                          value={form.start}
                          disabled={isAwaitingApproval}
                          onChange={e => handleFieldChange(row.uniqueKey, 'start', e.target.value)}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Editing End Date</label>
                        <input
                          type="date"
                          className={styles.formSelect}
                          value={form.end}
                          disabled={isAwaitingApproval}
                          onChange={e => handleFieldChange(row.uniqueKey, 'end', e.target.value)}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Editing Status</label>
                        <select
                          className={styles.formSelect}
                          value={form.status}
                          disabled={isAwaitingApproval}
                          onChange={e => handleFieldChange(row.uniqueKey, 'status', e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Duration (HH:MM:SS)</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="00:18:45"
                            className={styles.formSelect}
                            value={form.duration}
                            disabled={isAwaitingApproval}
                            onChange={e => handleFieldChange(row.uniqueKey, 'duration', e.target.value)}
                          />
                          <button
                            type="button"
                            className={styles.actionSquareBtn}
                            style={{ height: '38px', width: '38px' }}
                            title="Auto-detect duration from link"
                            disabled={isAwaitingApproval}
                            onClick={() => handleDetectDuration(row.uniqueKey, form.link)}
                          >
                            ⏱️
                          </button>
                        </div>
                      </div>

                      <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                        <label className={styles.formLabel}>Final Video Deliverable Link</label>
                        <input
                          type="url"
                          placeholder="https://drive.google.com/... or https://youtu.be/..."
                          className={styles.formSelect}
                          value={form.link}
                          disabled={isAwaitingApproval}
                          onChange={e => handleFieldChange(row.uniqueKey, 'link', e.target.value)}
                        />
                      </div>

                      <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                        <label className={styles.formLabel}>Editorial Review Comments / Quality Remarks</label>
                        <input
                          type="text"
                          className={styles.formSelect}
                          placeholder="e.g. Master cut approved, audio normalized, color grading verified"
                          value={form.comments}
                          disabled={isAwaitingApproval}
                          onChange={e => handleFieldChange(row.uniqueKey, 'comments', e.target.value)}
                        />
                      </div>
                    </div>

                    {hasDateError && (
                      <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '13px', marginTop: '10px' }}>
                        ⚠️ Validation Error: Editing End Date ({form.end}) cannot precede Start Date ({form.start}).
                      </div>
                    )}
                  </div>

                  {/* Topic Card Footer (NO SAVE DRAFT BUTTON!) */}
                  <div className={styles.topicCardFooter}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                        📋 Submission Status:
                      </span>
                      {renderSubmissionBadge(subStatus)}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className={styles.btnUpdateProgress}
                        disabled={form.loading || hasDateError || isAwaitingApproval}
                        onClick={() => handleUpdateProgress(row)}
                        title="Persist latest progress to database"
                      >
                        {form.loading ? 'Saving...' : '💾 Update Editing Progress'}
                      </button>

                      <button
                        type="button"
                        className={styles.btnSubmitDeliverable}
                        disabled={form.loading || !canSubmit || isAwaitingApproval}
                        onClick={() => handleOpenSubmitModal(row)}
                        title={
                          !canSubmit
                            ? 'Set Editing Status to Completed and provide valid dates, URL, and duration to submit'
                            : 'Submit completed deliverable for Admin Review'
                        }
                      >
                        {form.loading ? 'Submitting...' : '✅ SUBMIT EDITING (COMPLETED)'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {queueTopics.length === 0 && (
              <div style={{ padding: '36px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                <strong>No topics currently in Editing Queue for {selectedEpic}.</strong>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px' }}>
                  Topics will automatically appear here once Shooting is submitted as Completed by the Cameraman.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: 👤 PROFILE
         ======================================================== */}
      {activeTab === 'PROFILE' && (
        <div className={styles.profileCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '27px', background: '#7e22ce', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              ✂️
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{currentUser?.name || 'Hassan & Antony'}</h2>
              <span style={{ fontSize: '13px', color: '#7e22ce', fontWeight: 700 }}>Senior Video Editor — Post-Production</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px', marginTop: '14px' }}>
            <div><strong>Registered Email:</strong> {currentUser?.email || 'hassan.antony@nimi.org'}</div>
            <div><strong>Assigned Role:</strong> <span style={{ color: '#7e22ce', fontWeight: 700 }}>VIDEO EDITOR (EDITOR)</span></div>
            <div><strong>Account Status:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>ACTIVE</span></div>
            <div>
              <strong>Assigned EPIC Sequences:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {assignedEpics.map(e => (
                  <span key={e} style={{ padding: '4px 10px', background: '#faf5ff', color: '#7e22ce', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: '1px solid #e9d5ff' }}>
                    {e}
                  </span>
                ))}
                {assignedEpics.length === 0 && (
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>No specific EPIC sequence filter (Full Editor Access)</span>
                )}
              </div>
            </div>
            <div style={{ marginTop: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
              🔒 <strong>Role-Based Security:</strong> Video Editor accounts have access to post-production records for assigned EPICs. Administrative workflows and shooting schedules are managed by authorized administrators.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FINAL SUBMISSION CONFIRMATION MODAL (Section 9)
         ======================================================== */}
      {submitModalOpen && submitTargetRow && (
        <div className={styles.modalOverlay} onClick={() => setSubmitModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 style={{ color: '#7e22ce', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✅</span> Confirm Final Post-Production Submission
              </h3>
              <button className={styles.modalClose} onClick={() => setSubmitModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#334155' }}>
                You are about to formally submit the completed video deliverable for Administrator Review &amp; Approval:
              </p>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><strong>Selected EPIC ID:</strong> <span style={{ color: '#7e22ce', fontWeight: 700 }}>{submitTargetRow.epicCode}</span></div>
                <div><strong>Video ID:</strong> <span style={{ color: '#0369a1', fontWeight: 700 }}>{submitTargetRow.displayVideoId}</span></div>
                <div><strong>Video Topic Title:</strong> <span style={{ fontWeight: 600 }}>{submitTargetRow.videoTitle}</span></div>
                <div><strong>Duration:</strong> <span>{topicForms[submitTargetRow.uniqueKey]?.duration || submitTargetRow.duration || '-'}</span></div>
                <div style={{ wordBreak: 'break-all' }}>
                  <strong>Deliverable URL:</strong>{' '}
                  <span style={{ color: '#0284c7' }}>
                    {topicForms[submitTargetRow.uniqueKey]?.link || submitTargetRow.finalVideoLink || '-'}
                  </span>
                </div>
              </div>

              <div style={{ margin: '14px 0 0 0', padding: '10px 12px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '6px', fontSize: '12px', color: '#6b21a8' }}>
                ℹ️ <strong>Workflow Notice:</strong> Upon submission, the Submission Status will be set to <strong>Submitted – Awaiting Admin Approval</strong> and recorded with a timestamp. The Administrator will receive this in Work Assignment to review and approve.
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setSubmitModalOpen(false)}>
                Cancel
              </button>
              <button
                className={styles.btnSubmitDeliverable}
                onClick={handleConfirmSubmit}
                disabled={topicForms[submitTargetRow.uniqueKey]?.loading}
              >
                {topicForms[submitTargetRow.uniqueKey]?.loading ? 'Submitting...' : 'Confirm & Submit Deliverable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
