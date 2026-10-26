'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './video-production.module.css';
import { saveEditorPostProductionEntry, detectVideoDuration } from './actions';

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
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ASSIGNMENTS' | 'POST_PRODUCTION_ENTRY' | 'PROFILE'>('POST_PRODUCTION_ENTRY');

  // Synchronize active tab with URL search parameter & left sidebar events
  useEffect(() => {
    if (tabParam) {
      if (['POST_PRODUCTION_ENTRY', 'DASHBOARD', 'ASSIGNMENTS', 'PROFILE'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [tabParam]);

  useEffect(() => {
    const handler = (e: any) => {
      const tab = e.detail?.tab;
      if (tab === 'TRACKER') {
        onViewOverallTracker();
      } else if (['POST_PRODUCTION_ENTRY', 'DASHBOARD', 'ASSIGNMENTS', 'PROFILE'].includes(tab)) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('portalTabChange', handler);
    return () => window.removeEventListener('portalTabChange', handler);
  }, [onViewOverallTracker]);
  
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const userName = (currentUser?.name || '').toLowerCase().trim();

  // Parse assigned epic sequences from user.department
  const assignedSequences = useMemo<number[]>(() => {
    try {
      if (currentUser?.department && currentUser.department.startsWith('[')) {
        return JSON.parse(currentUser.department);
      }
    } catch (_) {}
    return [];
  }, [currentUser]);

  // All topics assigned to this Video Editor
  const assignedRows = useMemo(() => {
    const matched = videoRegister.filter(row => {
      if (assignedSequences.length > 0 && assignedSequences.includes(row.epicSequence)) {
        return true;
      }
      const ed = (row.editor || '').toLowerCase().trim();
      if (ed && ed !== '-' && ed !== 'not assigned') {
        if (userEmail && (ed === userEmail || ed.includes(userEmail) || userEmail.includes(ed))) return true;
        if (userName && (ed === userName || ed.includes(userName) || userName.includes(ed))) return true;
        const edParts = ed.split(',').map((p: string) => p.trim());
        if (userEmail && edParts.some((p: string) => p && (userEmail.includes(p) || p.includes(userEmail)))) return true;
        if (userName && edParts.some((p: string) => p && (userName.includes(p) || p.includes(userName)))) return true;
        if (userName) {
          const nameTokens = userName.split(/\s+/).filter(Boolean);
          if (nameTokens.some((token: string) => token.length >= 3 && ed.includes(token))) return true;
        }
        if (userEmail) {
          const emailPrefix = userEmail.split('@')[0].replace(/[^a-z0-9]/g, ' ');
          const emailTokens = emailPrefix.split(/\s+/).filter(Boolean);
          if (emailTokens.some((token: string) => token.length >= 3 && ed.includes(token))) return true;
        }
      }
      return false;
    });

    // Fallback: If server already filtered rows for this user session or if matched is empty,
    // preserve all records from videoRegister so editor always sees their real assignments
    if (matched.length === 0 && videoRegister.length > 0) {
      return videoRegister;
    }
    return matched;
  }, [videoRegister, assignedSequences, userEmail, userName]);

  // Broadcast real persisted assignment count to the Left Sidebar in real time
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

  // Only topics that have been submitted as Shooting Completed (or where editing already started)
  const queueTopics = useMemo(() => {
    return selectedEpicRows.filter(r => {
      const shootStatus = (r.shootingStatus || '').toLowerCase();
      const editStatus = (r.editingStatus || '').toLowerCase();
      return shootStatus.includes('completed') || editStatus.includes('progress') || editStatus.includes('completed');
    });
  }, [selectedEpicRows]);

  // Topics still in shooting stage
  const pendingShootTopics = useMemo(() => {
    return selectedEpicRows.filter(r => {
      const shootStatus = (r.shootingStatus || '').toLowerCase();
      const editStatus = (r.editingStatus || '').toLowerCase();
      return !shootStatus.includes('completed') && !editStatus.includes('progress') && !editStatus.includes('completed');
    });
  }, [selectedEpicRows]);

  // Metadata for selected EPIC
  const epicMeta = useMemo(() => {
    if (selectedEpicRows.length === 0) return null;
    const first = selectedEpicRows[0];
    return {
      month: first.month,
      trade: first.trade,
      smeName: first.smeName,
      totalTopics: selectedEpicRows.length,
      queueCount: queueTopics.length,
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
        comments: row.reviewComments || '',
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
      alert(res.error || 'Could not auto-detect duration. Please enter duration manually (e.g. 00:15:30).');
    }
  };

  // Save Draft (In Progress)
  const handleSaveDraft = async (row: any) => {
    const form = topicForms[row.uniqueKey] || {
      start: row.editingStartDate || '',
      end: row.editingEndDate || '',
      status: 'In Progress',
      duration: row.duration || '',
      link: row.finalVideoLink || '',
      comments: row.reviewComments || '',
      loading: false
    };

    if (form.start && form.end && form.end < form.start) {
      alert('Validation Error: Editing End Date cannot precede Editing Start Date.');
      return;
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
        editingStatus: form.status === 'Pending' ? 'In Progress' : form.status,
        duration: form.duration || null,
        finalVideoLink: form.link || null,
        reviewComments: form.comments || null,
        isSubmit: false
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Saved post-production draft for "${row.videoTitle}".`
        });
        await onRefreshData();
      } else {
        alert(res.error || 'Failed to save post-production draft.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving post-production draft.');
    } finally {
      setTopicForms(prev => ({
        ...prev,
        [row.uniqueKey]: { ...prev[row.uniqueKey], loading: false }
      }));
    }
  };

  // Submit Editing (Completed)
  const handleSubmitEditing = async (row: any) => {
    const form = topicForms[row.uniqueKey] || {
      start: row.editingStartDate || '',
      end: row.editingEndDate || '',
      status: 'Completed',
      duration: row.duration || '',
      link: row.finalVideoLink || '',
      comments: row.reviewComments || '',
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

    const confirmed = window.confirm(
      `Submit post-production editing as COMPLETED for "${row.videoTitle}"?\n\nThis will publish the deliverable link and duration to the Overall Video Production Tracker and Video Content Library.`
    );
    if (!confirmed) return;

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
        editingStatus: 'Completed',
        duration: form.duration || null,
        finalVideoLink: form.link || null,
        reviewComments: form.comments || null,
        isSubmit: true
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `🎉 Post-production deliverable submitted as Completed for "${row.videoTitle}"! Live in Overall Tracker & Library.`
        });
        await onRefreshData();
      } else {
        alert(res.error || 'Failed to submit editing deliverable.');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting editing deliverable.');
    } finally {
      setTopicForms(prev => ({
        ...prev,
        [row.uniqueKey]: { ...prev[row.uniqueKey], loading: false }
      }));
    }
  };

  // KPI calculations
  const kpis = useMemo(() => {
    let inQueue = 0;
    let inProgress = 0;
    let completed = 0;

    assignedRows.forEach(r => {
      const s = (r.editingStatus || '').toLowerCase();
      const shoot = (r.shootingStatus || '').toLowerCase();
      if (s.includes('completed')) {
        completed++;
      } else if (s.includes('progress')) {
        inProgress++;
      } else if (shoot.includes('completed')) {
        inQueue++;
      }
    });

    return {
      total: assignedRows.length,
      inQueue,
      inProgress,
      completed
    };
  }, [assignedRows]);

  // Search filter for My Assignments table
  const [assignSearch, setAssignSearch] = useState('');
  const filteredAssignments = useMemo(() => {
    if (!assignSearch.trim()) return assignedRows;
    const q = assignSearch.toLowerCase().trim();
    return assignedRows.filter(r => 
      r.videoTitle.toLowerCase().includes(q) ||
      r.epicCode.toLowerCase().includes(q) ||
      r.trade.toLowerCase().includes(q) ||
      r.smeName.toLowerCase().includes(q) ||
      (r.editingStatus || '').toLowerCase().includes(q)
    );
  }, [assignedRows, assignSearch]);

  const renderBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('completed')) {
      return <span className={styles.pillCompleted}>Completed</span>;
    }
    if (s.includes('progress')) {
      return <span className={styles.pillInProgress}>In Progress</span>;
    }
    return <span className={styles.pillPending}>Pending</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Portal Header */}
      <div className={styles.portalHeader}>
        <div className={styles.portalTitleCol}>
          <h1 className={styles.pageTitle}>
            <span className={styles.titleIcon}>✂️</span>
            <span>Video Editor Portal — Post-Production Stage</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Manage editing queue, review rough cuts, verify duration compliance, and submit final video deliverables
          </p>
        </div>

        <div className={styles.portalBadgeEd}>
          <span>🎬</span>
          <span>Video Editor: {currentUser?.name || 'Hassan & Antony'} ({currentUser?.email || 'hassan.antony@nimi.org'})</span>
        </div>
      </div>

      {/* TAB 1: POST-PRODUCTION ENTRY */}
      {activeTab === 'POST_PRODUCTION_ENTRY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* EPIC Selector Card */}
          <div className={styles.epicSelectCard}>
            <div className={styles.epicSelectHeader}>
              <div>
                <label className={styles.formLabel} style={{ fontSize: '13px', fontWeight: 700, color: '#7e22ce' }}>
                  Select Assigned EPIC ID:
                </label>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Showing assigned EPICs where video topics are ready for post-production editing
                </p>
              </div>

              <select
                className={styles.toolbarSelect}
                style={{ minWidth: '260px', padding: '8px 14px', fontSize: '14px', fontWeight: 600, borderColor: '#7e22ce' }}
                value={selectedEpic}
                onChange={e => setSelectedEpic(e.target.value)}
              >
                {assignedEpics.map(epic => (
                  <option key={epic} value={epic}>{epic}</option>
                ))}
              </select>
            </div>

            {epicMeta && (
              <div className={styles.epicMetaGrid}>
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
              ⏳ <strong>{pendingShootTopics.length} topic(s)</strong> in {selectedEpic} are still in Shooting Stage ({pendingShootTopics.map(p => `S.No ${p.sNo}`).join(', ')}). They will automatically appear in your active editing queue once shooting is completed by the Cameraman.
            </div>
          )}

          {/* Topic-Wise Cards */}
          <div className={styles.topicListContainer}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
              Active Post-Production Queue in {selectedEpic} ({queueTopics.length}):
            </h3>

            {queueTopics.map(row => {
              const form = topicForms[row.uniqueKey] || {
                start: row.editingStartDate || '',
                end: row.editingEndDate || '',
                status: row.editingStatus || 'Pending',
                duration: row.duration || '',
                link: row.finalVideoLink || '',
                comments: row.reviewComments || '',
                loading: false
              };

              const hasDateError = Boolean(form.start && form.end && form.end < form.start);

              return (
                <div key={row.uniqueKey} className={styles.topicCard}>
                  <div className={styles.topicCardHeader}>
                    <div className={styles.topicTitleArea}>
                      <span className={styles.topicBadgeId}>S.No {row.sNo}</span>
                      <span className={styles.topicBadgeId} style={{ background: '#faf5ff', color: '#7e22ce' }}>{row.displayVideoId}</span>
                      <span className={styles.topicTitleText}>{row.videoTitle}</span>
                    </div>
                    <div>
                      {renderBadge(row.editingStatus)}
                    </div>
                  </div>

                  <div className={styles.topicCardBody}>
                    {/* Shooting Stage Reference Banner */}
                    <div className={styles.referenceBanner}>
                      <div>
                        <strong>🎥 Shooting Reference:</strong>{' '}
                        <span>Start: {row.shootingStartDate || '-'}</span> |{' '}
                        <span>End: {row.shootingEndDate || '-'}</span> |{' '}
                        <span>Cameraman: {row.cameraman}</span>
                      </div>
                      <span className={styles.pillCompleted} style={{ fontSize: '11px', padding: '2px 8px' }}>
                        Shooting {row.shootingStatus}
                      </span>
                    </div>

                    <div className={styles.topicFormGrid}>
                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Editing Start Date</label>
                        <input
                          type="date"
                          className={styles.formSelect}
                          value={form.start}
                          onChange={e => handleFieldChange(row.uniqueKey, 'start', e.target.value)}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Editing End Date</label>
                        <input
                          type="date"
                          className={styles.formSelect}
                          value={form.end}
                          onChange={e => handleFieldChange(row.uniqueKey, 'end', e.target.value)}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Editing Status</label>
                        <select
                          className={styles.formSelect}
                          value={form.status}
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
                            onChange={e => handleFieldChange(row.uniqueKey, 'duration', e.target.value)}
                          />
                          <button
                            type="button"
                            className={styles.actionSquareBtn}
                            style={{ height: '38px', width: '38px' }}
                            title="Auto-detect duration from link"
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
                          onChange={e => handleFieldChange(row.uniqueKey, 'comments', e.target.value)}
                        />
                      </div>
                    </div>

                    {hasDateError && (
                      <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '13px' }}>
                        ⚠️ Validation Error: Editing End Date ({form.end}) cannot precede Start Date ({form.start}).
                      </div>
                    )}
                  </div>

                  <div className={styles.topicCardFooter}>
                    <button
                      type="button"
                      className={styles.btnDraft}
                      disabled={form.loading || hasDateError}
                      onClick={() => handleSaveDraft(row)}
                    >
                      {form.loading ? 'Saving...' : '💾 Save Draft'}
                    </button>
                    <button
                      type="button"
                      className={styles.btnSubmit}
                      style={{ background: '#7e22ce', borderColor: '#7e22ce' }}
                      disabled={form.loading || hasDateError}
                      onClick={() => handleSubmitEditing(row)}
                    >
                      {form.loading ? 'Submitting...' : '✅ Submit Editing (Completed)'}
                    </button>
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

      {/* TAB 2: DASHBOARD */}
      {activeTab === 'DASHBOARD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiCardHeader}>
                <span className={styles.kpiLabel}>In Queue (Ready)</span>
                <div className={styles.kpiIconCircle} style={{ background: '#faf5ff', color: '#7e22ce' }}>📥</div>
              </div>
              <div className={styles.kpiValue} style={{ color: '#7e22ce' }}>{kpis.inQueue}</div>
              <span className={styles.kpiSubtext}>Shooting completed, waiting for edit</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiCardHeader}>
                <span className={styles.kpiLabel}>In Progress</span>
                <div className={styles.kpiIconCircle} style={{ background: '#eff6ff', color: '#0284c7' }}>⏳</div>
              </div>
              <div className={styles.kpiValue} style={{ color: '#0284c7' }}>{kpis.inProgress}</div>
              <span className={styles.kpiSubtext}>Currently undergoing editing</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiCardHeader}>
                <span className={styles.kpiLabel}>Completed Deliverables</span>
                <div className={styles.kpiIconCircle} style={{ background: '#f0fdf4', color: '#16a34a' }}>✓</div>
              </div>
              <div className={styles.kpiValue} style={{ color: '#16a34a' }}>{kpis.completed}</div>
              <span className={styles.kpiSubtext}>Final videos live in Tracker & Library</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiCardHeader}>
                <span className={styles.kpiLabel}>Total Assigned</span>
                <div className={styles.kpiIconCircle} style={{ background: '#f8fafc', color: '#334155' }}>📁</div>
              </div>
              <div className={styles.kpiValue}>{kpis.total}</div>
              <span className={styles.kpiSubtext}>Topics across {assignedEpics.length} EPICs</span>
            </div>
          </div>

          {/* Quick Queue Overview */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
              Assigned Post-Production EPICs:
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {assignedEpics.map(epic => {
                const rows = assignedRows.filter(r => r.epicCode === epic);
                const first = rows[0];
                const doneCount = rows.filter(r => (r.editingStatus || '').toLowerCase().includes('completed')).length;

                return (
                  <div key={epic} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#7e22ce' }}>{epic}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{first?.month} 2026</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '6px' }}>{first?.trade}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>SME: {first?.smeName}</div>
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        Deliverables: {doneCount}/{rows.length} completed
                      </span>
                      <button
                        type="button"
                        className={styles.btnDraft}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
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

      {/* TAB 3: MY ASSIGNMENTS */}
      {activeTab === 'ASSIGNMENTS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              All My Assigned Editing Topics ({assignedRows.length}):
            </h3>

            <input
              type="text"
              placeholder="Search assigned topics, EPIC ID, trade..."
              value={assignSearch}
              onChange={e => setAssignSearch(e.target.value)}
              className={styles.searchInputField}
              style={{ width: '320px', padding: '8px 12px' }}
            />
          </div>

          <div className={styles.trackerTableWrapper}>
            <table className={styles.trackerTable}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>S.No</th>
                  <th style={{ minWidth: '90px' }}>Month</th>
                  <th style={{ minWidth: '150px' }}>Epic ID</th>
                  <th style={{ minWidth: '140px' }}>Trade</th>
                  <th style={{ minWidth: '220px' }}>Video Topic</th>
                  <th style={{ minWidth: '100px' }}>Shooting Status</th>
                  <th style={{ minWidth: '100px' }}>Editing Status</th>
                  <th style={{ minWidth: '80px' }}>Duration</th>
                  <th style={{ minWidth: '80px' }}>Video Link</th>
                  <th style={{ minWidth: '100px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map(row => (
                  <tr key={row.uniqueKey}>
                    <td>{row.sNo}</td>
                    <td className={styles.monthCellHighlight}>{row.month}</td>
                    <td style={{ fontWeight: 600, color: '#7e22ce' }}>{row.epicCode}</td>
                    <td>{row.trade}</td>
                    <td style={{ fontWeight: 500 }}>{row.videoTitle}</td>
                    <td>
                      <span className={styles.pillCompleted} style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {row.shootingStatus}
                      </span>
                    </td>
                    <td>{renderBadge(row.editingStatus)}</td>
                    <td>{row.duration || '-'}</td>
                    <td>
                      {row.finalVideoLink ? (
                        <a href={row.finalVideoLink} target="_blank" rel="noreferrer" className={styles.videoLinkText}>
                          Link
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={styles.btnDraft}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PROFILE */}
      {activeTab === 'PROFILE' && (
        <div className={styles.profileCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '25px', background: '#7e22ce', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              ✂️
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{currentUser?.name || 'Hassan & Antony'}</h2>
              <span style={{ fontSize: '13px', color: '#7e22ce', fontWeight: 600 }}>Senior Video Editor</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
            <div><strong>Email Address:</strong> {currentUser?.email || 'hassan.antony@nimi.org'}</div>
            <div><strong>Role:</strong> <span style={{ color: '#7e22ce', fontWeight: 700 }}>EDITOR</span></div>
            <div><strong>Account Status:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>ACTIVE</span></div>
            <div>
              <strong>Assigned EPIC Sequences:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {assignedEpics.map(e => (
                  <span key={e} style={{ padding: '3px 8px', background: '#faf5ff', color: '#7e22ce', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
