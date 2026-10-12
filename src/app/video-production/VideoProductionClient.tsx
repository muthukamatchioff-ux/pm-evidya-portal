'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './video-production.module.css';
import { 
  getTopicProductionRecords, 
  createShootingSchedule,
  updateShootingSchedule,
  updateVideoEditorRecord,
  updateAnimationRecord,
  updateFinalVideoRecord
} from './actions';

export default function VideoProductionClient({ initialRecords = [], role = 'VIEWER' }: any) {
  const [activeStage, setActiveStage] = useState<'STAGE_1' | 'STAGE_2' | 'STAGE_3'>('STAGE_1');
  const [workEntries, setWorkEntries] = useState<any[]>(initialRecords);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Shooting Schedule Form state
  const [selectedEpicId, setSelectedEpicId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [shootStartDate, setShootStartDate] = useState('');
  const [shootEndDate, setShootEndDate] = useState('');
  const [shootLocation, setShootLocation] = useState('');
  const [cameraman, setCameraman] = useState('');
  const [productionNotes, setProductionNotes] = useState('');
  
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
  
  // Production In Progress: has shooting schedule that is PLANNED, IN_PROGRESS, or RESHOOT
  const prodInProgressCount = workEntries.filter(entry => 
    entry.shootingSchedules?.some((s: any) => s.status === 'IN_PROGRESS' || s.status === 'PLANNED' || s.status === 'RESHOOT')
  ).length;

  // Post-Production In Progress: has editing or animation record IN_PROGRESS
  const postProdInProgressCount = workEntries.filter(entry => 
    entry.videoEditorRecords?.some((e: any) => e.status === 'IN_PROGRESS' || e.status === 'NOT_STARTED') ||
    entry.animationRecords?.some((a: any) => a.status === 'IN_PROGRESS')
  ).length;

  // Final Videos Delivered: has linked VideoLibrary record OR FinalVideoRecord COMPLETED / TELECASTED
  const finalDeliveredCount = workEntries.filter(entry => 
    (entry.videoLibraries && entry.videoLibraries.length > 0) ||
    entry.finalVideoRecords?.some((f: any) => f.finalVideoStatus === 'COMPLETED' || f.telecastStatus === 'TELECASTED')
  ).length;

  // Filtered entries for search
  const filteredEntries = workEntries.filter(entry => {
    const q = searchTerm.toLowerCase();
    const epicCode = `epic-${entry.epicSequence}`.toLowerCase();
    const smeName = (entry.sme?.name || '').toLowerCase();
    const trade = (entry.trade || '').toLowerCase();
    const topic = (entry.topic || '').toLowerCase();
    return epicCode.includes(q) || smeName.includes(q) || trade.includes(q) || topic.includes(q);
  });

  // Stage 1 Create Handler
  const handleCreateStage1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEpicId || !videoTitle) {
      setError('Epic ID and Video Title are required.');
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
      videoTitle,
      scheduledStart: shootStartDate || null,
      scheduledEnd: shootEndDate || null,
      location: shootLocation || null,
      cameraman: cameraman || null,
      productionNotes: productionNotes || null,
      status: 'PLANNED'
    });

    if (res.success) {
      setSuccess('Production Record created successfully with Epic ID.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
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

  const handleStage1Update = async (id: string, data: any) => {
    setLoading(true);
    setError(null);
    const res = await updateShootingSchedule(id, data);
    if (res.success) {
      setSuccess('Production Stage updated successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
    } else {
      setError(res.error || 'Failed to update Production Stage.');
    }
    setLoading(false);
  };

  const handleEditorUpdate = async (id: string, data: any, workEntryId: string) => {
    setLoading(true);
    setError(null);
    const res = await updateVideoEditorRecord(id, data, workEntryId);
    if (res.success) {
      setSuccess('Post-Production record updated successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
    } else {
      setError(res.error || 'Failed to update Post-Production record.');
    }
    setLoading(false);
  };

  const handleAnimationUpdate = async (id: string, data: any, workEntryId: string) => {
    setLoading(true);
    setError(null);
    const res = await updateAnimationRecord(id, data, workEntryId);
    if (res.success) {
      setSuccess('Animation record updated successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
    } else {
      setError(res.error || 'Failed to update Animation record.');
    }
    setLoading(false);
  };

  const handleFinalUpdate = async (id: string, data: any, workEntryId: string) => {
    setLoading(true);
    setError(null);
    const res = await updateFinalVideoRecord(id, data, workEntryId);
    if (res.success) {
      setSuccess('Final deliverable status updated successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
    } else {
      setError(res.error || 'Failed to update deliverable status.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      {/* 2. FOUR SUMMARY CARDS */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#e0f2fe', color: '#0369a1' }}>📋</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryNumber}>{totalEpicCount}</div>
            <div className={styles.summaryLabel}>Total Epic IDs</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#fef3c7', color: '#b45309' }}>🎥</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryNumber}>{prodInProgressCount}</div>
            <div className={styles.summaryLabel}>Production In Progress</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#ede9fe', color: '#6d28d9' }}>✂️</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryNumber}>{postProdInProgressCount}</div>
            <div className={styles.summaryLabel}>Post-Production In Progress</div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon} style={{ background: '#dcfce7', color: '#15803d' }}>✅</div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryNumber}>{finalDeliveredCount}</div>
            <div className={styles.summaryLabel}>Final Videos Delivered</div>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorAlert}>⚠️ {error}</div>}
      {success && <div className={styles.successAlert}>✅ {success}</div>}

      {/* 3. THREE-STAGE WORKFLOW INDICATOR */}
      <div className={styles.workflowTabs}>
        <button 
          className={`${styles.workflowTabBtn} ${activeStage === 'STAGE_1' ? styles.workflowTabBtnActive : ''}`}
          onClick={() => setActiveStage('STAGE_1')}
        >
          <span>🎬 Stage 1: Production (Shooting)</span>
          <span className={styles.workflowTabBadge}>{workEntries.reduce((acc, e) => acc + (e.shootingSchedules?.length || 0), 0)}</span>
        </button>

        <button 
          className={`${styles.workflowTabBtn} ${activeStage === 'STAGE_2' ? styles.workflowTabBtnActive : ''}`}
          onClick={() => setActiveStage('STAGE_2')}
        >
          <span>✂️ Stage 2: Post-Production (Editing & Animation)</span>
          <span className={styles.workflowTabBadge}>{workEntries.reduce((acc, e) => acc + (e.videoEditorRecords?.length || 0), 0)}</span>
        </button>

        <button 
          className={`${styles.workflowTabBtn} ${activeStage === 'STAGE_3' ? styles.workflowTabBtnActive : ''}`}
          onClick={() => setActiveStage('STAGE_3')}
        >
          <span>📦 Stage 3: Final Video Deliverable (Library)</span>
          <span className={styles.workflowTabBadge}>{finalDeliveredCount}</span>
        </button>
      </div>

      {/* STAGE 1: PRODUCTION STAGE */}
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

          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
            <form onSubmit={handleCreateStage1} className={styles.createForm}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Epic ID *</label>
                <select 
                  className={styles.formSelect}
                  value={selectedEpicId} 
                  onChange={e => setSelectedEpicId(e.target.value)} 
                  required
                >
                  <option value="">Select Recorded Epic ID...</option>
                  {workEntries.map(e => (
                    <option key={e.id} value={e.id}>
                      EPIC-{e.epicSequence} — {e.sme?.name || 'SME'} ({e.trade || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>SME Name (Auto-populated)</label>
                <input 
                  type="text" 
                  className={`${styles.formInput} ${styles.formInputReadOnly}`}
                  value={selectedEpic?.sme?.name ? `${selectedEpic.sme.name} (${selectedEpic.sme.institute || 'NIMI'})` : ''} 
                  readOnly 
                  disabled 
                  placeholder="Auto populated from Epic ID"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Video Title / Topic *</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={videoTitle} 
                  onChange={e => setVideoTitle(e.target.value)} 
                  placeholder={selectedEpic?.topic || 'Enter Video Title'}
                  required 
                />
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
                  value={shootLocation} 
                  onChange={e => setShootLocation(e.target.value)} 
                  placeholder="Studio A / On-site"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Cameraman</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={cameraman} 
                  onChange={e => setCameraman(e.target.value)} 
                  placeholder="Camera operator name"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Production Notes</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={productionNotes} 
                  onChange={e => setProductionNotes(e.target.value)} 
                  placeholder="Shooting guidelines or equipment"
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" disabled={loading} className={styles.btnPrimary}>
                  {loading ? 'Creating...' : '+ Create Production Record'}
                </button>
              </div>
            </form>
          )}

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
                  <Stage1Row 
                    key={schedule.id} 
                    schedule={schedule} 
                    entry={entry} 
                    role={role} 
                    onUpdate={handleStage1Update} 
                  />
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

      {/* STAGE 2: POST-PRODUCTION STAGE */}
      {activeStage === 'STAGE_2' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>✂️ Stage 2: Post-Production Stage (Editing & Animation)</h2>
            <input 
              type="text" 
              className={styles.searchBox} 
              placeholder="Search by Epic ID, Editor, SME, or Video..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Post-Production start and end dates are tracked independently from the shooting schedule. Editing records map directly to the same Epic ID.
          </p>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Epic ID & SME</th>
                  <th>Video Title</th>
                  <th>Video Editor & Dates</th>
                  <th>Editing Status</th>
                  <th>Rough / Final Cut</th>
                  <th>2D Animator & Dates</th>
                  <th>Animation Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.flatMap(entry => {
                  const schedule = entry.shootingSchedules?.[0];
                  const editorRec = entry.videoEditorRecords?.[0] || {};
                  const animatorRec = entry.animationRecords?.[0] || {};

                  return (
                    <Stage2Row 
                      key={entry.id} 
                      entry={entry} 
                      schedule={schedule}
                      editorRec={editorRec}
                      animatorRec={animatorRec}
                      role={role} 
                      onUpdateEditor={handleEditorUpdate} 
                      onUpdateAnimator={handleAnimationUpdate}
                    />
                  );
                })}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No Epic records found matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STAGE 3: FINAL VIDEO DELIVERABLE — VIDEO CONTENT LIBRARY INTEGRATION */}
      {activeStage === 'STAGE_3' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>📦 Stage 3: Final Video Deliverable (Video Content Library Integration)</h2>
            <input 
              type="text" 
              className={styles.searchBox} 
              placeholder="Search by Epic ID, Title, or SME..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
            Final video links are retrieved authoritatively from the existing <strong>Video Content Library</strong> and matched by Epic ID relationship. No duplicate records are created.
          </p>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Epic ID & SME</th>
                  <th>Video Title / Topic</th>
                  <th>Library Video Link</th>
                  <th>Duration</th>
                  <th>Delivery Date</th>
                  <th>Delivery Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => {
                  const libraryVideos: any[] = entry.videoLibraries || [];
                  const primaryLibrary = libraryVideos[0] || null;
                  const finalRec = entry.finalVideoRecords?.[0] || {};

                  return (
                    <Stage3Row 
                      key={entry.id}
                      entry={entry}
                      libraryVideo={primaryLibrary}
                      finalRec={finalRec}
                      role={role}
                      onUpdateFinal={handleFinalUpdate}
                    />
                  );
                })}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No Epic deliverables found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* STAGE 1: EDIT / DISPLAY ROW */
function Stage1Row({ schedule, entry, role, onUpdate }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    videoTitle: '',
    scheduledStart: '', 
    scheduledEnd: '',
    location: '', 
    cameraman: '', 
    status: '', 
    productionNotes: ''
  });

  const handleEditClick = () => {
    setFormData({
      videoTitle: schedule.videoTitle || '',
      scheduledStart: schedule.scheduledStart ? schedule.scheduledStart.split('T')[0] : (schedule.shootDate ? schedule.shootDate.split('T')[0] : ''),
      scheduledEnd: schedule.scheduledEnd ? schedule.scheduledEnd.split('T')[0] : '',
      location: schedule.location || '',
      cameraman: schedule.cameraman || '',
      status: schedule.status || 'PLANNED',
      productionNotes: schedule.productionNotes || ''
    });
    setIsEditing(true);
  };

  const handleSubmit = () => {
    if (formData.scheduledStart && formData.scheduledEnd && new Date(formData.scheduledEnd) < new Date(formData.scheduledStart)) {
      alert('Production End Date cannot be earlier than Production Start Date.');
      return;
    }
    onUpdate(schedule.id, formData);
    setIsEditing(false);
  };

  const getStatusBadgeClass = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETED': return styles.badgeCompleted;
      case 'IN_PROGRESS': return styles.badgeProgress;
      case 'RESHOOT': return styles.badgeReshoot;
      default: return styles.badgePending;
    }
  };

  if (!isEditing) {
    return (
      <tr>
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
            <span><strong>Start:</strong> {schedule.scheduledStart ? new Date(schedule.scheduledStart).toLocaleDateString('en-IN') : (schedule.shootDate ? new Date(schedule.shootDate).toLocaleDateString('en-IN') : 'TBD')}</span>
            <br/>
            <span><strong>End:</strong> {schedule.scheduledEnd ? new Date(schedule.scheduledEnd).toLocaleDateString('en-IN') : 'TBD'}</span>
          </div>
        </td>
        <td>{schedule.location || '-'}</td>
        <td>{schedule.cameraman || '-'}</td>
        <td>
          <span className={`${styles.badge} ${getStatusBadgeClass(schedule.status)}`}>
            {schedule.status || 'PLANNED'}
          </span>
        </td>
        <td style={{ fontSize: '12px', color: '#64748b', maxWidth: '200px' }}>
          {schedule.productionNotes || '-'}
        </td>
        <td>
          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
            <button className={styles.btnEdit} onClick={handleEditClick}>Edit</button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ background: '#f0f9ff' }}>
      <td>
        <strong>EPIC-{entry.epicSequence}</strong>
        <br/>
        <small>{entry.sme?.name}</small>
      </td>
      <td>
        <input 
          type="text" 
          className={styles.formInput} 
          value={formData.videoTitle} 
          onChange={e => setFormData({ ...formData, videoTitle: e.target.value })}
        />
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input 
            type="date" 
            className={styles.formInput}
            title="Production Start Date"
            value={formData.scheduledStart} 
            onChange={e => setFormData({ ...formData, scheduledStart: e.target.value })}
          />
          <input 
            type="date" 
            className={styles.formInput}
            title="Production End Date"
            value={formData.scheduledEnd} 
            onChange={e => setFormData({ ...formData, scheduledEnd: e.target.value })}
          />
        </div>
      </td>
      <td>
        <input 
          type="text" 
          className={styles.formInput} 
          value={formData.location} 
          onChange={e => setFormData({ ...formData, location: e.target.value })}
        />
      </td>
      <td>
        <input 
          type="text" 
          className={styles.formInput} 
          value={formData.cameraman} 
          onChange={e => setFormData({ ...formData, cameraman: e.target.value })}
        />
      </td>
      <td>
        <select 
          className={styles.formSelect} 
          value={formData.status} 
          onChange={e => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="RESHOOT">Reshoot</option>
        </select>
      </td>
      <td>
        <input 
          type="text" 
          className={styles.formInput} 
          value={formData.productionNotes} 
          onChange={e => setFormData({ ...formData, productionNotes: e.target.value })}
        />
      </td>
      <td>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className={styles.btnSuccess} onClick={handleSubmit}>Save</button>
          <button className={styles.btnDanger} onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

/* STAGE 2: EDIT / DISPLAY ROW */
function Stage2Row({ entry, schedule, editorRec, animatorRec, role, onUpdateEditor, onUpdateAnimator }: any) {
  const [isEditing, setIsEditing] = useState(false);
  
  const [editorData, setEditorData] = useState({
    editorName: '', 
    assignedVideo: '', 
    editingStartDate: '', 
    editingEndDate: '',
    roughCutLink: '',
    finalCutLink: '',
    duration: '',
    status: '', 
    reviewComments: ''
  });
  
  const [animatorData, setAnimatorData] = useState({
    animatorName: '', 
    animationStartDate: '', 
    animationEndDate: '', 
    status: ''
  });

  const getEndDateFromReviewComments = (rec: any) => {
    if (rec.editingEndDate) return rec.editingEndDate;
    if (rec.reviewComments && rec.reviewComments.startsWith('[END:')) {
      const match = rec.reviewComments.match(/^\[END:([^\]]+)\]/);
      if (match) return match[1];
    }
    return '';
  };

  const cleanReviewComments = (comments?: string) => {
    if (!comments) return '';
    return comments.replace(/^\[END:[^\]]+\]\s*/, '');
  };

  const handleEditClick = () => {
    setEditorData({
      editorName: editorRec.editorName || '',
      assignedVideo: editorRec.assignedVideo || schedule?.videoTitle || entry.topic || '',
      editingStartDate: editorRec.editingStartDate ? editorRec.editingStartDate.split('T')[0] : '',
      editingEndDate: getEndDateFromReviewComments(editorRec),
      roughCutLink: editorRec.roughCutLink || '',
      finalCutLink: editorRec.finalCutLink || '',
      duration: editorRec.duration || '',
      status: editorRec.status || 'NOT_STARTED',
      reviewComments: cleanReviewComments(editorRec.reviewComments)
    });
    setAnimatorData({
      animatorName: animatorRec.animatorName || '',
      animationStartDate: animatorRec.animationStartDate ? animatorRec.animationStartDate.split('T')[0] : '',
      animationEndDate: animatorRec.animationEndDate ? animatorRec.animationEndDate.split('T')[0] : '',
      status: animatorRec.status || 'NOT_STARTED'
    });
    setIsEditing(true);
  };

  const handleSubmit = () => {
    if (editorData.editingStartDate && editorData.editingEndDate && new Date(editorData.editingEndDate) < new Date(editorData.editingStartDate)) {
      alert('Post-Production End Date cannot be earlier than Post-Production Start Date.');
      return;
    }
    onUpdateEditor(editorRec.id, editorData, entry.id);
    onUpdateAnimator(animatorRec.id, animatorData, entry.id);
    setIsEditing(false);
  };

  const getStatusBadgeClass = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETED': return styles.badgeCompleted;
      case 'IN_PROGRESS': return styles.badgeProgress;
      default: return styles.badgePending;
    }
  };

  const editorEndDateFormatted = getEndDateFromReviewComments(editorRec);

  if (!isEditing) {
    return (
      <tr>
        <td>
          <strong style={{ color: '#0369a1' }}>EPIC-{entry.epicSequence}</strong>
          <br/>
          <span style={{ fontSize: '12px', color: '#475569' }}>{entry.sme?.name || 'SME'}</span>
        </td>
        <td>
          <strong>{editorRec.assignedVideo || schedule?.videoTitle || entry.topic}</strong>
        </td>
        <td>
          <div>
            <strong>{editorRec.editorName || '-'}</strong>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              <span>Start: {editorRec.editingStartDate ? new Date(editorRec.editingStartDate).toLocaleDateString('en-IN') : 'TBD'}</span>
              <br/>
              <span>End: {editorEndDateFormatted ? new Date(editorEndDateFormatted).toLocaleDateString('en-IN') : 'TBD'}</span>
            </div>
          </div>
        </td>
        <td>
          <span className={`${styles.badge} ${getStatusBadgeClass(editorRec.status)}`}>
            {editorRec.status || 'NOT_STARTED'}
          </span>
        </td>
        <td>
          <div style={{ fontSize: '12px' }}>
            {editorRec.roughCutLink ? (
              <a href={editorRec.roughCutLink} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>
                Rough Cut
              </a>
            ) : <span style={{ color: '#94a3b8' }}>Rough: -</span>}
            <br/>
            {editorRec.finalCutLink ? (
              <a href={editorRec.finalCutLink} target="_blank" rel="noreferrer" style={{ color: '#059669', textDecoration: 'underline', fontWeight: 700 }}>
                Final Cut
              </a>
            ) : <span style={{ color: '#94a3b8' }}>Final: -</span>}
          </div>
        </td>
        <td>
          <div>
            <strong>{animatorRec.animatorName || '-'}</strong>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              <span>Start: {animatorRec.animationStartDate ? new Date(animatorRec.animationStartDate).toLocaleDateString('en-IN') : 'TBD'}</span>
              <br/>
              <span>End: {animatorRec.animationEndDate ? new Date(animatorRec.animationEndDate).toLocaleDateString('en-IN') : 'TBD'}</span>
            </div>
          </div>
        </td>
        <td>
          <span className={`${styles.badge} ${getStatusBadgeClass(animatorRec.status)}`}>
            {animatorRec.status || 'NOT_STARTED'}
          </span>
        </td>
        <td>
          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
            <button className={styles.btnEdit} onClick={handleEditClick}>Edit</button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ background: '#f5f3ff' }}>
      <td>
        <strong>EPIC-{entry.epicSequence}</strong>
        <br/>
        <small>{entry.sme?.name}</small>
      </td>
      <td>
        <input 
          type="text" 
          className={styles.formInput} 
          value={editorData.assignedVideo} 
          onChange={e => setEditorData({ ...editorData, assignedVideo: e.target.value })}
        />
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input 
            type="text" 
            placeholder="Editor Name" 
            className={styles.formInput} 
            value={editorData.editorName} 
            onChange={e => setEditorData({ ...editorData, editorName: e.target.value })}
          />
          <input 
            type="date" 
            title="Post-Production Start Date" 
            className={styles.formInput} 
            value={editorData.editingStartDate} 
            onChange={e => setEditorData({ ...editorData, editingStartDate: e.target.value })}
          />
          <input 
            type="date" 
            title="Post-Production End Date" 
            className={styles.formInput} 
            value={editorData.editingEndDate} 
            onChange={e => setEditorData({ ...editorData, editingEndDate: e.target.value })}
          />
        </div>
      </td>
      <td>
        <select 
          className={styles.formSelect} 
          value={editorData.status} 
          onChange={e => setEditorData({ ...editorData, status: e.target.value })}
        >
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input 
            type="url" 
            placeholder="Rough Cut Link" 
            className={styles.formInput} 
            value={editorData.roughCutLink} 
            onChange={e => setEditorData({ ...editorData, roughCutLink: e.target.value })}
          />
          <input 
            type="url" 
            placeholder="Final Cut Link" 
            className={styles.formInput} 
            value={editorData.finalCutLink} 
            onChange={e => setEditorData({ ...editorData, finalCutLink: e.target.value })}
          />
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input 
            type="text" 
            placeholder="Animator Name" 
            className={styles.formInput} 
            value={animatorData.animatorName} 
            onChange={e => setAnimatorData({ ...animatorData, animatorName: e.target.value })}
          />
          <input 
            type="date" 
            title="Animation Start Date" 
            className={styles.formInput} 
            value={animatorData.animationStartDate} 
            onChange={e => setAnimatorData({ ...animatorData, animationStartDate: e.target.value })}
          />
          <input 
            type="date" 
            title="Animation End Date" 
            className={styles.formInput} 
            value={animatorData.animationEndDate} 
            onChange={e => setAnimatorData({ ...animatorData, animationEndDate: e.target.value })}
          />
        </div>
      </td>
      <td>
        <select 
          className={styles.formSelect} 
          value={animatorData.status} 
          onChange={e => setAnimatorData({ ...animatorData, status: e.target.value })}
        >
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className={styles.btnSuccess} onClick={handleSubmit}>Save</button>
          <button className={styles.btnDanger} onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

/* STAGE 3: FINAL VIDEO DELIVERABLE ROW */
function Stage3Row({ entry, libraryVideo, finalRec, role, onUpdateFinal }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    finalVideoStatus: '',
    approvalDate: '',
    telecastDate: '',
    telecastChannel: '',
    telecastStatus: '',
    remarks: ''
  });

  const handleEditClick = () => {
    setFormData({
      finalVideoStatus: finalRec.finalVideoStatus || 'PENDING',
      approvalDate: finalRec.approvalDate ? finalRec.approvalDate.split('T')[0] : '',
      telecastDate: finalRec.telecastDate ? finalRec.telecastDate.split('T')[0] : '',
      telecastChannel: finalRec.telecastChannel || '',
      telecastStatus: finalRec.telecastStatus || 'PENDING',
      remarks: finalRec.remarks || ''
    });
    setIsEditing(true);
  };

  const handleSubmit = () => {
    onUpdateFinal(finalRec.id, formData, entry.id);
    setIsEditing(false);
  };

  const deliveryDateFormatted = libraryVideo?.createdAt 
    ? new Date(libraryVideo.createdAt).toLocaleDateString('en-IN')
    : (finalRec.approvalDate ? new Date(finalRec.approvalDate).toLocaleDateString('en-IN') : 'Pending');

  const deliveryStatusText = libraryVideo 
    ? 'DELIVERED & CATALOGUED'
    : (finalRec.finalVideoStatus === 'COMPLETED' || finalRec.finalVideoStatus === 'APPROVED' ? 'APPROVED' : 'PENDING DELIVERY');

  const isDelivered = !!libraryVideo;

  if (!isEditing) {
    return (
      <tr>
        <td>
          <strong style={{ color: '#0369a1' }}>EPIC-{entry.epicSequence}</strong>
          <br/>
          <span style={{ fontSize: '12px', color: '#475569' }}>{entry.sme?.name || 'SME'}</span>
        </td>
        <td>
          <strong>{libraryVideo?.title || entry.topic}</strong>
          <br/>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Trade: {entry.trade || 'General'}</span>
        </td>
        <td>
          {libraryVideo?.videoLink ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <a 
                href={libraryVideo.videoLink} 
                target="_blank" 
                rel="noreferrer" 
                style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <span>🔗</span> View Final Video
              </a>
              <Link 
                href="/content" 
                style={{ fontSize: '11px', color: '#059669', textDecoration: 'none', fontWeight: 600 }}
              >
                📂 Open in Video Library →
              </Link>
            </div>
          ) : (
            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending Delivery in Library</span>
          )}
        </td>
        <td>
          <strong style={{ color: '#0f2942' }}>
            {libraryVideo?.duration || finalRec.finalDuration || '-'}
          </strong>
        </td>
        <td>
          <span style={{ fontSize: '12px', color: '#334155' }}>{deliveryDateFormatted}</span>
        </td>
        <td>
          <span className={`${styles.badge} ${isDelivered ? styles.badgeCompleted : styles.badgePending}`}>
            {deliveryStatusText}
          </span>
        </td>
        <td>
          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
            <button className={styles.btnEdit} onClick={handleEditClick}>Update</button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ background: '#f0fdf4' }}>
      <td>
        <strong>EPIC-{entry.epicSequence}</strong>
        <br/>
        <small>{entry.sme?.name}</small>
      </td>
      <td>{libraryVideo?.title || entry.topic}</td>
      <td>
        {libraryVideo?.videoLink ? (
          <a href={libraryVideo.videoLink} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>
            {libraryVideo.videoLink}
          </a>
        ) : 'Pending'}
      </td>
      <td>{libraryVideo?.duration || finalRec.finalDuration || '-'}</td>
      <td>
        <input 
          type="date" 
          title="Approval / Delivery Date"
          className={styles.formInput} 
          value={formData.approvalDate} 
          onChange={e => setFormData({ ...formData, approvalDate: e.target.value })}
        />
      </td>
      <td>
        <select 
          className={styles.formSelect} 
          value={formData.finalVideoStatus} 
          onChange={e => setFormData({ ...formData, finalVideoStatus: e.target.value })}
        >
          <option value="PENDING">Pending Delivery</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="APPROVED">Approved</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className={styles.btnSuccess} onClick={handleSubmit}>Save</button>
          <button className={styles.btnDanger} onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}
