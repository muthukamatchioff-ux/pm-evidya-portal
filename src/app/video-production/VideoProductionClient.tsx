'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './video-production.module.css';
import { 
  getTopicProductionRecords, 
  createShootingSchedule,
  updateShootingSchedule,
  deleteShootingSchedule,
  updateVideoEditorRecord,
  deleteVideoEditorRecord,
  updateAnimationRecord,
  updateFinalVideoRecord,
  deleteFinalVideoRecord
} from './actions';

// Safe date helpers
function formatDateForInput(dateVal: any): string {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    if (dateVal.includes('T')) return dateVal.split('T')[0];
    return dateVal;
  }
  if (dateVal instanceof Date) {
    try {
      return dateVal.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    return '';
  }
  return '';
}

function formatDateDisplay(dateVal: any): string {
  if (!dateVal) return 'TBD';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-IN');
  } catch {
    return String(dateVal);
  }
}

function extractEndDate(reviewComments: string | null | undefined): string {
  if (!reviewComments) return '';
  const match = reviewComments.match(/\[END:([^\]]+)\]/);
  return match ? match[1] : '';
}

function cleanReviewComments(reviewComments: string | null | undefined): string {
  if (!reviewComments) return '';
  return reviewComments.replace(/\[END:[^\]]+\]/, '').trim();
}

export default function VideoProductionClient({ initialRecords = [], role = 'VIEWER' }: any) {
  const [activeStage, setActiveStage] = useState<'STAGE_1' | 'STAGE_2' | 'STAGE_3'>(
    role === 'EDITOR' ? 'STAGE_2' : 'STAGE_1'
  );
  const [workEntries, setWorkEntries] = useState<any[]>(initialRecords);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stage 1 Create Form state
  const [selectedEpicId, setSelectedEpicId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [shootStartDate, setShootStartDate] = useState('');
  const [shootEndDate, setShootEndDate] = useState('');
  const [shootLocation, setShootLocation] = useState('');
  const [cameraman, setCameraman] = useState('');
  const [productionNotes, setProductionNotes] = useState('');
  
  // Stage 2 Filter state
  const [stage2EpicFilter, setStage2EpicFilter] = useState('');

  // Modals state
  const [editingStage1, setEditingStage1] = useState<any | null>(null);
  const [editingStage2, setEditingStage2] = useState<any | null>(null);
  const [editingStage3, setEditingStage3] = useState<any | null>(null);

  // Interactive Topic Chip selection & highlight state
  const [highlightedScheduleId, setHighlightedScheduleId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const res = await getTopicProductionRecords();
      if (res.success && res.data) {
        setWorkEntries(res.data);
      }
    }
    loadData();
  }, []);

  const selectedEpic = workEntries.find(e => e.id === selectedEpicId);

  // 1. Calculate 4 Summary Cards
  const totalEpicCount = workEntries.length;
  
  const prodInProgressCount = workEntries.reduce((acc, entry) => {
    const active = entry.shootingSchedules?.filter((s: any) => 
      s.status === 'IN_PROGRESS' || s.status === 'PLANNED' || s.status === 'RESHOOT'
    ).length || 0;
    return acc + active;
  }, 0);

  const postProdInProgressCount = workEntries.reduce((acc, entry) => {
    const active = entry.videoEditorRecords?.filter((e: any) => 
      e.status === 'IN_PROGRESS' || e.status === 'NOT_STARTED'
    ).length || 0;
    return acc + active;
  }, 0);

  const finalDeliveredCount = workEntries.reduce((acc, entry) => {
    const libs = entry.videoLibraries?.length || 0;
    const finalRecs = entry.finalVideoRecords?.filter((f: any) => 
      f.finalVideoStatus === 'APPROVED' || f.finalVideoStatus === 'COMPLETED' || f.telecastStatus === 'TELECASTED'
    ).length || 0;
    return acc + Math.max(libs, finalRecs);
  }, 0);

  // Filtered entries for general search
  const filteredEntries = workEntries.filter(entry => {
    const q = searchTerm.toLowerCase();
    const epicCode = `epic-${entry.epicSequence}`.toLowerCase();
    const smeName = (entry.sme?.name || '').toLowerCase();
    const trade = (entry.trade || '').toLowerCase();
    const topic = (entry.topic || '').toLowerCase();
    const hasMatchingSchedule = entry.shootingSchedules?.some((s: any) => (s.videoTitle || '').toLowerCase().includes(q));
    const hasMatchingEditor = entry.videoEditorRecords?.some((e: any) => 
      (e.assignedVideo || '').toLowerCase().includes(q) || (e.editorName || '').toLowerCase().includes(q)
    );
    return epicCode.includes(q) || smeName.includes(q) || trade.includes(q) || topic.includes(q) || hasMatchingSchedule || hasMatchingEditor;
  });

  // Stage 1 Create Handler
  const handleCreateStage1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEpicId || !videoTitle.trim()) {
      setError('Please select an Epic ID and enter a Video Title / Topic.');
      return;
    }

    if (shootStartDate && shootEndDate && new Date(shootEndDate) < new Date(shootStartDate)) {
      setError('Production End Date cannot be earlier than Production Start Date.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await createShootingSchedule(selectedEpicId, { 
      videoTitle: videoTitle.trim(),
      scheduledStart: shootStartDate || null,
      scheduledEnd: shootEndDate || null,
      location: shootLocation || null,
      cameraman: cameraman || null,
      productionNotes: productionNotes || null,
      status: 'PLANNED'
    });

    if (res.success) {
      setSuccess(`✅ Video "${videoTitle.trim()}" added to EPIC-${selectedEpic?.epicSequence}! It is automatically ready in Stage 2 (Post-Production). You can now enter the next video topic.`);
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      // Clear inputs but KEEP selectedEpicId so user can easily add 4-5 topics one by one
      setVideoTitle('');
      setShootStartDate('');
      setShootEndDate('');
      setShootLocation('');
      setCameraman('');
      setProductionNotes('');
    } else {
      setError(res.error || 'Failed to create production record.');
    }
    setLoading(false);
  };

  // Stage 1 Update Save
  const handleSaveStage1Edit = async (id: string, data: any) => {
    setLoading(true);
    setError(null);
    const res = await updateShootingSchedule(id, data);
    if (res.success) {
      setSuccess('✅ Production record updated successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      setEditingStage1(null);
    } else {
      setError(res.error || 'Failed to update Production record.');
    }
    setLoading(false);
  };

  // Stage 1 Delete
  const handleDeleteStage1 = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Production Shoot record? This action cannot be undone.')) return;
    setLoading(true);
    setError(null);
    const res = await deleteShootingSchedule(id);
    if (res.success) {
      setSuccess('Production Shoot record deleted successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
    } else {
      setError(res.error || 'Failed to delete production record.');
    }
    setLoading(false);
  };

  // Stage 2 Editor Update Save
  const handleSaveStage2Edit = async (id: string, data: any, workEntryId: string) => {
    setLoading(true);
    setError(null);
    const res = await updateVideoEditorRecord(id, data, workEntryId);
    if (res.success) {
      setSuccess(data.status === 'COMPLETED' 
        ? '🎉 Post-Production marked COMPLETED! Video has automatically advanced to Stage 3 (Final Video Deliverable).'
        : '✅ Post-Production details saved successfully.'
      );
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      setEditingStage2(null);
    } else {
      setError(res.error || 'Failed to update Post-Production record.');
    }
    setLoading(false);
  };

  // Stage 2 Delete Editor
  const handleDeleteEditor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Post-Production record?')) return;
    setLoading(true);
    setError(null);
    const res = await deleteVideoEditorRecord(id);
    if (res.success) {
      setSuccess('Post-Production record deleted successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
    } else {
      setError(res.error || 'Failed to delete editor record.');
    }
    setLoading(false);
  };

  // Stage 3 Save Final Record
  const handleSaveStage3Edit = async (id: string, data: any, workEntryId: string) => {
    setLoading(true);
    setError(null);
    const res = await updateFinalVideoRecord(id, data, workEntryId);
    if (res.success) {
      setSuccess('✅ Final Video Deliverable details saved successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      setEditingStage3(null);
    } else {
      setError(res.error || 'Failed to update Final Video record.');
    }
    setLoading(false);
  };

  // Stage 3 Delete Final
  const handleDeleteFinal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Final Deliverable record?')) return;
    setLoading(true);
    setError(null);
    const res = await deleteFinalVideoRecord(id);
    if (res.success) {
      setSuccess('Final deliverable record deleted successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
    } else {
      setError(res.error || 'Failed to delete deliverable record.');
    }
    setLoading(false);
  };

  // Status badge styling helper
  const getBadgeClass = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETED':
      case 'APPROVED':
      case 'TELECASTED':
        return styles.badgeCompleted;
      case 'IN_PROGRESS':
        return styles.badgeProgress;
      case 'RESHOOT':
      case 'REVISION_REQUIRED':
        return styles.badgeReshoot;
      default:
        return styles.badgePending;
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. FOUR SUMMARY CARDS */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📋</div>
          <div>
            <div className={styles.summaryValue}>{totalEpicCount}</div>
            <div className={styles.summaryLabel}>TOTAL EPIC IDS</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#fef3c7' }}>🎥</div>
          <div>
            <div className={styles.summaryValue}>{prodInProgressCount}</div>
            <div className={styles.summaryLabel}>PRODUCTION IN PROGRESS</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#f3e8ff' }}>✂️</div>
          <div>
            <div className={styles.summaryValue}>{postProdInProgressCount}</div>
            <div className={styles.summaryLabel}>POST-PRODUCTION IN PROGRESS</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#dcfce7' }}>✅</div>
          <div>
            <div className={styles.summaryValue}>{finalDeliveredCount}</div>
            <div className={styles.summaryLabel}>FINAL VIDEOS DELIVERED</div>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className={styles.errorAlert} style={{ marginBottom: '16px' }}>
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {success && (
        <div className={styles.successAlert} style={{ marginBottom: '16px' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#166534' }}>✕</button>
        </div>
      )}

      {/* Role Assignment Notice for Cameraman or Editor */}
      {(role === 'CAMERAMAN' || role === 'EDITOR') && workEntries.length === 0 && (
        <div style={{ padding: '16px 20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', color: '#1e40af', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🎯</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>No Epic IDs Assigned Yet</div>
            <div style={{ fontSize: '13px', color: '#3b82f6', marginTop: '2px' }}>
              You do not currently have any Epic IDs assigned by the Administrator. Please contact the Admin to assign Epic IDs to your account.
            </div>
          </div>
        </div>
      )}

      {/* 2. THREE-STAGE WORKFLOW NAVIGATION TABS */}
      <div className={styles.workflowTabs}>
        <button 
          className={`${styles.workflowTabBtn} ${activeStage === 'STAGE_1' ? styles.workflowTabBtnActive : ''}`}
          onClick={() => setActiveStage('STAGE_1')}
        >
          <span>🎬 Stage 1: Production (Shooting)</span>
          <span className={styles.workflowTabBadge}>
            {workEntries.reduce((acc, e) => acc + (e.shootingSchedules?.length || 0), 0)}
          </span>
        </button>

        <button 
          className={`${styles.workflowTabBtn} ${activeStage === 'STAGE_2' ? styles.workflowTabBtnActive : ''}`}
          onClick={() => setActiveStage('STAGE_2')}
        >
          <span>✂️ Stage 2: Post-Production (Editing & Animation)</span>
          <span className={styles.workflowTabBadge}>
            {workEntries.reduce((acc, e) => acc + (e.videoEditorRecords?.length || 0), 0)}
          </span>
        </button>

        <button 
          className={`${styles.workflowTabBtn} ${activeStage === 'STAGE_3' ? styles.workflowTabBtnActive : ''}`}
          onClick={() => setActiveStage('STAGE_3')}
        >
          <span>📦 Stage 3: Final Video Deliverable (Library)</span>
          <span className={styles.workflowTabBadge}>
            {workEntries.reduce((acc, e) => acc + (e.finalVideoRecords?.length || e.videoLibraries?.length || 0), 0)}
          </span>
        </button>
      </div>

      {/* ========================================================
          STAGE 1: PRODUCTION (SHOOTING)
         ======================================================== */}
      {activeStage === 'STAGE_1' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>🎬 Stage 1: Production Stage (Shooting)</h2>
            <input 
              type="text" 
              className={styles.searchBox} 
              placeholder="Search by Epic ID, SME, Topic, or Trade..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Form to Add Video Topic by Epic ID */}
          {(role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'CAMERAMAN') && (
            <form onSubmit={handleCreateStage1} className={styles.createForm}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Epic ID *</label>
                <select 
                  className={styles.formSelect} 
                  value={selectedEpicId} 
                  onChange={e => {
                    setSelectedEpicId(e.target.value);
                    setHighlightedScheduleId(null);
                  }}
                  required
                >
                  <option value="">Select Recorded Epic ID...</option>
                  {workEntries.map(entry => (
                    <option key={entry.id} value={entry.id}>
                      EPIC-{entry.epicSequence} — {entry.sme?.name || 'SME'} ({entry.trade || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>SME Name (Auto-populated)</label>
                <input 
                  type="text" 
                  className={`${styles.formInput} ${styles.formInputReadOnly}`}
                  value={selectedEpic?.sme?.name ? `${selectedEpic.sme.name} (${selectedEpic.trade || 'General'})` : 'Auto-populated from Epic ID'}
                  readOnly 
                />
              </div>

              <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                <label className={styles.formLabel}>
                  Video Title / Topic * <span style={{ fontWeight: 'normal', color: '#64748b' }}>(Add one-by-one under selected Epic ID)</span>
                </label>
                <input 
                  id="video-title-input"
                  type="text" 
                  className={styles.formInput} 
                  placeholder="e.g. Topic 1: Safety & Personal Protective Equipment" 
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  required
                />
                {/* Show already added video topics under this selected Epic ID with Senior Fullstack interactive pattern */}
                {selectedEpic && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📋 Recorded Video Topics under EPIC-{selectedEpic.epicSequence}</span>
                      <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                        {selectedEpic.shootingSchedules?.length || 0}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b', marginLeft: 'auto' }}>
                        (Click any topic to highlight & edit)
                      </span>
                    </div>
                    {selectedEpic.shootingSchedules && selectedEpic.shootingSchedules.length > 0 ? (
                      <div className={styles.topicChipsContainer}>
                        {selectedEpic.shootingSchedules.map((s: any, idx: number) => {
                          const isHighlighted = highlightedScheduleId === s.id;
                          return (
                            <button
                              key={s.id || idx}
                              type="button"
                              className={`${styles.topicChip} ${isHighlighted ? styles.topicChipActive : ''}`}
                              onClick={() => {
                                setHighlightedScheduleId(s.id);
                                const rowEl = document.getElementById(`schedule-row-${s.id}`);
                                if (rowEl) {
                                  rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                                setEditingStage1({
                                  ...s,
                                  epicSequence: selectedEpic.epicSequence,
                                  smeName: selectedEpic.sme?.name,
                                  trade: selectedEpic.trade
                                });
                              }}
                              title={`Click to edit: ${s.videoTitle || 'Untitled Topic'}`}
                            >
                              <span className={`${styles.topicChipDot} ${
                                s.status === 'COMPLETED' ? styles.dotCompleted :
                                s.status === 'IN_PROGRESS' ? styles.dotProgress :
                                s.status === 'RESHOOT' ? styles.dotReshoot : styles.dotPlanned
                              }`} />
                              <span>#{idx + 1} {s.videoTitle || 'Untitled Topic'}</span>
                              <span className={styles.topicChipEditIcon}>✏️</span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          className={styles.topicChipAdd}
                          onClick={() => {
                            setVideoTitle('');
                            setHighlightedScheduleId(null);
                            const inputEl = document.getElementById('video-title-input');
                            if (inputEl) inputEl.focus();
                          }}
                          title="Click to add another topic"
                        >
                          + Add Topic
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                        No videos recorded for this Epic ID yet. Enter the first topic above.
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Production Start Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={shootStartDate}
                  onChange={e => setShootStartDate(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Production End Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={shootEndDate}
                  onChange={e => setShootEndDate(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Shoot Location</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="Studio A / On-site" 
                  value={shootLocation}
                  onChange={e => setShootLocation(e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Cameraman</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="Camera operator name" 
                  value={cameraman}
                  onChange={e => setCameraman(e.target.value)}
                />
              </div>

              <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                <label className={styles.formLabel}>Production Notes</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="Shooting guidelines, equipment, or remarks" 
                  value={productionNotes}
                  onChange={e => setProductionNotes(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                  {loading ? 'Adding...' : '+ Add Video Record to Epic ID'}
                </button>
              </div>
            </form>
          )}

          {/* Stage 1 Table */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Epic ID & SME</th>
                  <th>Video Title / Topic</th>
                  <th>Production Dates</th>
                  <th>Shoot Location</th>
                  <th>Cameraman</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.flatMap(entry => entry.shootingSchedules?.map((schedule: any) => (
                  <tr 
                    key={schedule.id}
                    id={`schedule-row-${schedule.id}`}
                    className={highlightedScheduleId === schedule.id ? styles.highlightedRow : ''}
                  >
                    <td>
                      <strong style={{ color: '#0369a1' }}>EPIC-{entry.epicSequence}</strong>
                      <br/>
                      <span style={{ fontSize: '12px', color: '#475569' }}>{entry.sme?.name || 'SME'}</span>
                    </td>
                    <td>
                      <strong>{schedule.videoTitle || entry.topic}</strong>
                      <br/>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Trade: {entry.trade || 'General'}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <span><strong>Start:</strong> {formatDateDisplay(schedule.scheduledStart || schedule.shootDate)}</span>
                        <br/>
                        <span><strong>End:</strong> {formatDateDisplay(schedule.scheduledEnd)}</span>
                      </div>
                    </td>
                    <td>{schedule.location || '-'}</td>
                    <td>{schedule.cameraman || '-'}</td>
                    <td>
                      <span className={`${styles.badge} ${getBadgeClass(schedule.status)}`}>
                        {schedule.status || 'PLANNED'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b', maxWidth: '200px' }}>
                      {schedule.productionNotes || '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {(role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'CAMERAMAN') && (
                          <button 
                            className={styles.btnEdit} 
                            onClick={() => setEditingStage1({
                              ...schedule,
                              epicSequence: entry.epicSequence,
                              smeName: entry.sme?.name,
                              trade: entry.trade
                            })}
                          >
                            Edit
                          </button>
                        )}
                        {role === 'ADMIN' && (
                          <button 
                            className={styles.btnDanger} 
                            onClick={() => handleDeleteStage1(schedule.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )))}
                {filteredEntries.filter(e => e.shootingSchedules && e.shootingSchedules.length > 0).length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No production shooting records found matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE 2: POST-PRODUCTION (EDITING & ANIMATION)
         ======================================================== */}
      {activeStage === 'STAGE_2' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>✂️ Stage 2: Post-Production Stage (Editing & Animation)</h2>
          </div>

          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Choose an Epic ID below to view and update post-production details for all its video topics. Once Post-Production is marked <strong>COMPLETED</strong>, the video automatically flows to <strong>Stage 3 (Final Video Deliverable)</strong>.
          </p>

          {/* Stage 2 Epic ID Filter Bar */}
          <div className={styles.stage2FilterBar}>
            <div style={{ flex: '1 1 320px' }}>
              <label className={styles.formLabel}>🎯 Choose Epic ID to Manage Post-Production:</label>
              <select 
                className={styles.formSelect} 
                value={stage2EpicFilter} 
                onChange={e => setStage2EpicFilter(e.target.value)}
              >
                <option value="">-- All Epic IDs ({workEntries.length} Total) --</option>
                {workEntries.map(entry => {
                  const videoCount = (entry.shootingSchedules?.length || 0);
                  return (
                    <option key={entry.id} value={entry.id}>
                      EPIC-{entry.epicSequence} — {entry.sme?.name || 'SME'} ({videoCount} {videoCount === 1 ? 'Topic' : 'Topics'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ flex: '1 1 260px' }}>
              <label className={styles.formLabel}>🔍 Search by Video Title / Editor:</label>
              <input 
                type="text" 
                className={styles.searchBox} 
                style={{ maxWidth: '100%' }}
                placeholder="Search within Post-Production..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Stage 2 Table: Shows every video under the Epic ID */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Epic ID & SME</th>
                  <th>Video Title / Topic</th>
                  <th>Shoot Status</th>
                  <th>Video Editor & Dates</th>
                  <th>Editing Status</th>
                  <th>Rough / Final Cut</th>
                  <th>Final Video File</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries
                  .filter(entry => !stage2EpicFilter || entry.id === stage2EpicFilter)
                  .flatMap(entry => {
                    // Collect all videos for this Epic ID from shooting schedules or editor records
                    const videoMap = new Map<string, { schedule?: any, editorRec?: any }>();

                    // Add from shootingSchedules
                    (entry.shootingSchedules || []).forEach((s: any) => {
                      const titleKey = (s.videoTitle || entry.topic || 'Untitled').trim();
                      videoMap.set(titleKey, { schedule: s });
                    });

                    // Match or add from videoEditorRecords
                    (entry.videoEditorRecords || []).forEach((e: any) => {
                      const titleKey = (e.assignedVideo || entry.topic || 'Untitled').trim();
                      if (videoMap.has(titleKey)) {
                        videoMap.get(titleKey)!.editorRec = e;
                      } else {
                        videoMap.set(titleKey, { editorRec: e });
                      }
                    });

                    // If completely empty, at least show the base topic
                    if (videoMap.size === 0) {
                      videoMap.set(entry.topic || 'Topic', {
                        editorRec: entry.videoEditorRecords?.[0] || {}
                      });
                    }

                    return Array.from(videoMap.entries()).map(([videoTitle, data], idx) => {
                      const schedule = data.schedule;
                      const editorRec = data.editorRec || {};
                      const editingEndDate = extractEndDate(editorRec.reviewComments);

                      return (
                        <tr key={`${entry.id}-${idx}`}>
                          <td>
                            <strong style={{ color: '#0369a1' }}>EPIC-{entry.epicSequence}</strong>
                            <br/>
                            <span style={{ fontSize: '12px', color: '#475569' }}>{entry.sme?.name || 'SME'}</span>
                          </td>
                          <td>
                            <strong>{videoTitle}</strong>
                            <br/>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Trade: {entry.trade || 'General'}</span>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${getBadgeClass(schedule?.status || 'PLANNED')}`}>
                              {schedule?.status || 'PLANNED'}
                            </span>
                          </td>
                          <td>
                            <strong>{editorRec.editorName || 'Not Assigned'}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              <span>Start: {formatDateDisplay(editorRec.editingStartDate)}</span>
                              <br/>
                              <span>End: {formatDateDisplay(editingEndDate)}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${getBadgeClass(editorRec.status || 'NOT_STARTED')}`}>
                              {editorRec.status || 'NOT_STARTED'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {editorRec.roughCutLink ? (
                                <a href={editorRec.roughCutLink} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>
                                  🔗 Rough Cut
                                </a>
                              ) : <span style={{ color: '#94a3b8' }}>Rough: -</span>}
                              {editorRec.finalCutLink ? (
                                <a href={editorRec.finalCutLink} target="_blank" rel="noreferrer" style={{ color: '#16a34a', fontWeight: 'bold' }}>
                                  🎬 Final Cut
                                </a>
                              ) : <span style={{ color: '#94a3b8' }}>Final: -</span>}
                            </div>
                          </td>
                          <td>
                            {editorRec.finalVideoFile ? (
                              <a href={editorRec.finalVideoFile} target="_blank" rel="noreferrer" style={{ color: '#0369a1', fontSize: '12px', fontWeight: 'bold' }}>
                                📁 Storage File
                              </a>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                            )}
                            {editorRec.duration && (
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Dur: {editorRec.duration}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {(role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'EDITOR') && (
                                <button 
                                  className={styles.btnEdit} 
                                  onClick={() => setEditingStage2({
                                    ...editorRec,
                                    workEntryId: entry.id,
                                    assignedVideo: videoTitle,
                                    epicSequence: entry.epicSequence,
                                    smeName: entry.sme?.name,
                                    editingEndDate: editingEndDate,
                                    cleanComments: cleanReviewComments(editorRec.reviewComments)
                                  })}
                                >
                                  Edit Details
                                </button>
                              )}
                              {role === 'ADMIN' && editorRec.id && (
                                <button 
                                  className={styles.btnDanger} 
                                  onClick={() => handleDeleteEditor(editorRec.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No Post-Production records found matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE 3: FINAL VIDEO DELIVERABLE & LIBRARY INTEGRATION
         ======================================================== */}
      {activeStage === 'STAGE_3' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>📦 Stage 3: Final Video Deliverable (Library & Telecast)</h2>
            <input 
              type="text" 
              className={styles.searchBox} 
              placeholder="Search by Epic ID, Title, or SME..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Final approved videos automatically integrated with the Video Content Library. Track channel telecast status, broadcast episodes, and approvals.
          </p>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Epic ID & SME</th>
                  <th>Video Title / Trade</th>
                  <th>Final Video Link / File</th>
                  <th>Duration</th>
                  <th>Approval Status</th>
                  <th>Telecast Details</th>
                  <th>Telecast Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.flatMap(entry => {
                  const finalRec = entry.finalVideoRecords?.[0] || {};
                  const libraryVideos = entry.videoLibraries || [];
                  const primaryLib = libraryVideos[0];

                  const videoFileLink = finalRec.finalVideoFile || primaryLib?.videoLink;
                  const finalStatus = finalRec.finalVideoStatus || (primaryLib ? 'APPROVED' : 'PENDING');
                  const duration = finalRec.finalDuration || primaryLib?.duration || '-';

                  return (
                    <tr key={entry.id}>
                      <td>
                        <strong style={{ color: '#0369a1' }}>EPIC-{entry.epicSequence}</strong>
                        <br/>
                        <span style={{ fontSize: '12px', color: '#475569' }}>{entry.sme?.name || 'SME'}</span>
                      </td>
                      <td>
                        <strong>{primaryLib?.title || entry.shootingSchedules?.[0]?.videoTitle || entry.topic}</strong>
                        <br/>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Trade: {entry.trade || 'General'}</span>
                      </td>
                      <td>
                        {videoFileLink ? (
                          <a href={videoFileLink} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 'bold' }}>
                            🎬 View Final Video
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Awaiting File Link</span>
                        )}
                      </td>
                      <td>{duration}</td>
                      <td>
                        <span className={`${styles.badge} ${getBadgeClass(finalStatus)}`}>
                          {finalStatus}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        <div><strong>Channel:</strong> {finalRec.telecastChannel || 'TBD'}</div>
                        <div><strong>Date:</strong> {formatDateDisplay(finalRec.telecastDate)}</div>
                        <div><strong>Episode:</strong> {finalRec.telecastEpisode || 'TBD'}</div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${getBadgeClass(finalRec.telecastStatus || 'PENDING')}`}>
                          {finalRec.telecastStatus || 'PENDING'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
                            <button 
                              className={styles.btnEdit} 
                              onClick={() => setEditingStage3({
                                ...finalRec,
                                workEntryId: entry.id,
                                epicSequence: entry.epicSequence,
                                smeName: entry.sme?.name,
                                title: primaryLib?.title || entry.topic,
                                finalVideoFile: videoFileLink
                              })}
                            >
                              Edit Details
                            </button>
                          )}
                          {role === 'ADMIN' && finalRec.id && (
                            <button 
                              className={styles.btnDanger} 
                              onClick={() => handleDeleteFinal(finalRec.id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No final deliverables found matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          EDIT MODAL: STAGE 1 (SHOOTING SCHEDULE)
         ======================================================== */}
      {editingStage1 && (
        <Stage1EditModal 
          record={editingStage1}
          loading={loading}
          onClose={() => setEditingStage1(null)}
          onSave={handleSaveStage1Edit}
        />
      )}

      {/* ========================================================
          EDIT MODAL: STAGE 2 (POST-PRODUCTION)
         ======================================================== */}
      {editingStage2 && (
        <Stage2EditModal 
          record={editingStage2}
          loading={loading}
          onClose={() => setEditingStage2(null)}
          onSave={handleSaveStage2Edit}
        />
      )}

      {/* ========================================================
          EDIT MODAL: STAGE 3 (FINAL DELIVERABLE)
         ======================================================== */}
      {editingStage3 && (
        <Stage3EditModal 
          record={editingStage3}
          loading={loading}
          onClose={() => setEditingStage3(null)}
          onSave={handleSaveStage3Edit}
        />
      )}
    </div>
  );
}

/* =========================================================================
   STAGE 1 EDIT MODAL COMPONENT
   ========================================================================= */
function Stage1EditModal({ record, loading, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    videoTitle: record.videoTitle || '',
    scheduledStart: formatDateForInput(record.scheduledStart || record.shootDate),
    scheduledEnd: formatDateForInput(record.scheduledEnd),
    location: record.location || '',
    cameraman: record.cameraman || '',
    status: record.status || 'PLANNED',
    productionNotes: record.productionNotes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.scheduledStart && formData.scheduledEnd && new Date(formData.scheduledEnd) < new Date(formData.scheduledStart)) {
      alert('Production End Date cannot be earlier than Production Start Date.');
      return;
    }
    onSave(record.id, formData);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            🎬 Edit Production Shoot: EPIC-{record.epicSequence} ({record.smeName || 'SME'})
          </h3>
          <button className={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Video Title / Topic *</label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={formData.videoTitle} 
                onChange={e => setFormData({ ...formData, videoTitle: e.target.value })}
                required
              />
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Production Start Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.scheduledStart} 
                  onChange={e => setFormData({ ...formData, scheduledStart: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Production End Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.scheduledEnd} 
                  onChange={e => setFormData({ ...formData, scheduledEnd: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Shoot Location</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={formData.location} 
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Cameraman</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  value={formData.cameraman} 
                  onChange={e => setFormData({ ...formData, cameraman: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Production Status</label>
              <select 
                className={styles.formSelect} 
                value={formData.status} 
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="RESHOOT">Reshoot Required</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Production Notes</label>
              <textarea 
                className={styles.formInput} 
                rows={3}
                value={formData.productionNotes} 
                onChange={e => setFormData({ ...formData, productionNotes: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   STAGE 2 EDIT MODAL COMPONENT (POST-PRODUCTION)
   ========================================================================= */
function Stage2EditModal({ record, loading, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    editorName: record.editorName || '',
    assignedVideo: record.assignedVideo || '',
    editingStartDate: formatDateForInput(record.editingStartDate),
    editingEndDate: formatDateForInput(record.editingEndDate),
    status: record.status || 'NOT_STARTED',
    roughCutLink: record.roughCutLink || '',
    finalCutLink: record.finalCutLink || '',
    duration: record.duration || '',
    finalVideoFile: record.finalVideoFile || '',
    reviewComments: record.cleanComments || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.editingStartDate && formData.editingEndDate && new Date(formData.editingEndDate) < new Date(formData.editingStartDate)) {
      alert('Post-Production End Date cannot be earlier than Start Date.');
      return;
    }
    onSave(record.id, formData, record.workEntryId);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            ✂️ Post-Production Details: EPIC-{record.epicSequence} ({record.assignedVideo})
          </h3>
          <button className={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {formData.status === 'COMPLETED' && (
              <div style={{ padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '13px', fontWeight: 600 }}>
                🚀 Setting status to COMPLETED will automatically advance this video to Stage 3 (Final Video Deliverable / Library)!
              </div>
            )}

            <div className={styles.formField}>
              <label className={styles.formLabel}>Video Title / Topic</label>
              <input 
                type="text" 
                className={`${styles.formInput} ${styles.formInputReadOnly}`}
                value={formData.assignedVideo} 
                readOnly
              />
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Video Editor Name</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="Assigned editor name"
                  value={formData.editorName} 
                  onChange={e => setFormData({ ...formData, editorName: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Post-Production Status</label>
                <select 
                  className={styles.formSelect} 
                  value={formData.status} 
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed (Advance to Stage 3)</option>
                </select>
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Editing Start Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.editingStartDate} 
                  onChange={e => setFormData({ ...formData, editingStartDate: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Editing End Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.editingEndDate} 
                  onChange={e => setFormData({ ...formData, editingEndDate: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Rough Cut Link</label>
                <input 
                  type="url" 
                  className={styles.formInput} 
                  placeholder="https://..."
                  value={formData.roughCutLink} 
                  onChange={e => setFormData({ ...formData, roughCutLink: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Final Cut Link</label>
                <input 
                  type="url" 
                  className={styles.formInput} 
                  placeholder="https://..."
                  value={formData.finalCutLink} 
                  onChange={e => setFormData({ ...formData, finalCutLink: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Final Video Storage File / URL</label>
                <input 
                  type="url" 
                  className={styles.formInput} 
                  placeholder="Google Drive / Cloud storage link"
                  value={formData.finalVideoFile} 
                  onChange={e => setFormData({ ...formData, finalVideoFile: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Video Duration</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="e.g. 14:35"
                  value={formData.duration} 
                  onChange={e => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Review Comments & Notes</label>
              <textarea 
                className={styles.formInput} 
                rows={3}
                placeholder="Editorial feedback or corrections..."
                value={formData.reviewComments} 
                onChange={e => setFormData({ ...formData, reviewComments: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Post-Production'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   STAGE 3 EDIT MODAL COMPONENT (FINAL DELIVERABLE)
   ========================================================================= */
function Stage3EditModal({ record, loading, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    finalVideoStatus: record.finalVideoStatus || 'APPROVED',
    finalVideoFile: record.finalVideoFile || '',
    finalDuration: record.finalDuration || '',
    finalApproval: record.finalApproval || '',
    approvalDate: formatDateForInput(record.approvalDate),
    remarks: record.remarks || '',
    telecastChannel: record.telecastChannel || '',
    telecastDate: formatDateForInput(record.telecastDate),
    telecastEpisode: record.telecastEpisode || '',
    telecastStatus: record.telecastStatus || 'PENDING',
    telecastRemarks: record.telecastRemarks || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(record.id, formData, record.workEntryId);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            📦 Final Deliverable & Telecast: EPIC-{record.epicSequence} ({record.title})
          </h3>
          <button className={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Final Approval Status</label>
                <select 
                  className={styles.formSelect} 
                  value={formData.finalVideoStatus} 
                  onChange={e => setFormData({ ...formData, finalVideoStatus: e.target.value })}
                >
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending Approval</option>
                  <option value="REVISION_REQUIRED">Revision Required</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Final Duration</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="e.g. 15:00"
                  value={formData.finalDuration} 
                  onChange={e => setFormData({ ...formData, finalDuration: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Final Video File / Storage Link</label>
              <input 
                type="url" 
                className={styles.formInput} 
                value={formData.finalVideoFile} 
                onChange={e => setFormData({ ...formData, finalVideoFile: e.target.value })}
              />
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Telecast Channel</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="e.g. PM e-Vidya Channel 1 - DTH"
                  value={formData.telecastChannel} 
                  onChange={e => setFormData({ ...formData, telecastChannel: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Telecast Broadcast Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.telecastDate} 
                  onChange={e => setFormData({ ...formData, telecastDate: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Telecast Episode #</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="e.g. EP-104"
                  value={formData.telecastEpisode} 
                  onChange={e => setFormData({ ...formData, telecastEpisode: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Telecast Status</label>
                <select 
                  className={styles.formSelect} 
                  value={formData.telecastStatus} 
                  onChange={e => setFormData({ ...formData, telecastStatus: e.target.value })}
                >
                  <option value="PENDING">Pending Broadcast</option>
                  <option value="TELECASTED">Telecasted / Aired</option>
                </select>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Remarks / Broadcast Log</label>
              <textarea 
                className={styles.formInput} 
                rows={2}
                value={formData.remarks} 
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Deliverable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
