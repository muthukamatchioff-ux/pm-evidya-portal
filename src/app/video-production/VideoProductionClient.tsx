'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/app/dashboard/dashboard.module.css';
import { 
  getTopicProductionRecords, 
  createShootingSchedule,
  updateShootingSchedule,
  updateVideoEditorRecord,
  updateAnimationRecord,
  updateFinalVideoRecord
} from './actions';

export default function VideoProductionClient({ initialRecords = [], role = 'VIEWER' }: any) {
  const [activeTab, setActiveTab] = useState<'STAGE_1' | 'STAGE_2' | 'LEGACY'>('STAGE_1');
  const [workEntries, setWorkEntries] = useState<any[]>(initialRecords);
  const [epicList, setEpicList] = useState<any[]>(initialRecords);
  
  const [selectedEpicId, setSelectedEpicId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadEpics() {
      const res = await getTopicProductionRecords();
      if (res.success) {
        setWorkEntries(res.data || []);
        setEpicList(res.data || []);
      }
    }
    loadEpics();
  }, []);

  const selectedEpic = epicList.find(e => e.id === selectedEpicId);

  const handleCreateStage1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEpicId || !videoTitle) {
      setError('Epic ID and Video Title are required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await createShootingSchedule(selectedEpicId, { videoTitle });

    if (res.success) {
      setSuccess('Production Record created successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      setVideoTitle('');
    } else {
      setError(res.error || 'Failed to create record.');
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
      setError(res.error || 'Failed to update Stage 1.');
    }
    setLoading(false);
  };

  const handleEditorUpdate = async (id: string, data: any, workEntryId: string) => {
    setLoading(true);
    setError(null);
    const res = await updateVideoEditorRecord(id, data, workEntryId);
    if (res.success) {
      setSuccess('Editor record updated successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
    } else {
      setError(res.error || 'Failed to update Editor record.');
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

  // Stats calculation
  const totalEpics = workEntries.length;
  let shootingCompleted = 0;
  let editingInProgress = 0;
  let finalCompleted = 0;

  workEntries.forEach(entry => {
    if (entry.shootingSchedules?.some((s: any) => s.status === 'COMPLETED')) shootingCompleted++;
    if (entry.videoEditorRecords?.some((e: any) => e.status === 'IN_PROGRESS')) editingInProgress++;
    if (entry.finalVideoRecords?.[0]?.finalVideoStatus === 'COMPLETED') finalCompleted++;
  });

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}><h3>Total Epic IDs</h3><p className={styles.statValue}>{totalEpics}</p></div>
        <div className={styles.statCard}><h3>Shooting Completed</h3><p className={styles.statValue}>{shootingCompleted}</p></div>
        <div className={styles.statCard}><h3>Editing In Progress</h3><p className={styles.statValue}>{editingInProgress}</p></div>
        <div className={styles.statCard}><h3>Final Completed</h3><p className={styles.statValue}>{finalCompleted}</p></div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}
      {success && <div className={styles.successAlert}>{success}</div>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
        <button onClick={() => setActiveTab('STAGE_1')} style={{ padding: '0.5rem 1rem', background: activeTab === 'STAGE_1' ? '#4f46e5' : '#eee', color: activeTab === 'STAGE_1' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>1. Production Stage</button>
        <button onClick={() => setActiveTab('STAGE_2')} style={{ padding: '0.5rem 1rem', background: activeTab === 'STAGE_2' ? '#4f46e5' : '#eee', color: activeTab === 'STAGE_2' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>2. Post Production Stage</button>
      </div>

      {activeTab === 'STAGE_1' && (
        <div className={styles.tableCard}>
          <h2>1. Production Stage (Shooting)</h2>
          
          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
            <form onSubmit={handleCreateStage1} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr', background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div>
                <label>Epic ID *</label>
                <select value={selectedEpicId} onChange={e => setSelectedEpicId(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }}>
                  <option value="">Select Epic ID...</option>
                  {epicList.map(e => (
                    <option key={e.id} value={e.id}>EPIC-{e.epicSequence} ({e.sme?.name})</option>
                  ))}
                </select>
              </div>
              <div><label>SME Name (Auto)</label><input type="text" value={selectedEpic?.sme?.name || ''} readOnly disabled style={{ width: '100%', padding: '0.5rem', background: '#e5e7eb' }} /></div>
              <div><label>Video Title / Topic *</label><input type="text" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }} /></div>
              <div style={{ gridColumn: 'span 2' }}>
                <button type="submit" disabled={loading} style={{ background: '#10b981', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {loading ? 'Adding...' : 'Create Shooting Record'}
                </button>
              </div>
            </form>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Epic ID & SME</th>
                  <th>Video Title</th>
                  <th>Shoot Details</th>
                  <th>Schedule / Actuals</th>
                  <th>Cameraman</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {workEntries.flatMap(entry => entry.shootingSchedules?.map((schedule: any) => (
                  <Stage1Row key={schedule.id} schedule={schedule} entry={entry} role={role} onUpdate={handleStage1Update} />
                )))}
                {workEntries.filter(e => !e.shootingSchedules || e.shootingSchedules.length === 0).length === workEntries.length && (
                  <tr><td colSpan={7} style={{textAlign: 'center'}}>No shooting records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'STAGE_2' && (
        <div className={styles.tableCard}>
          <h2>2. Post Production Stage</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Epic ID & Title</th>
                  <th>Video Editor</th>
                  <th>2D Animator</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {workEntries.flatMap(entry => {
                  const schedule = entry.shootingSchedules?.[0]; // Assume 1-to-1 primarily for UI display
                  if (!schedule || schedule.status !== 'COMPLETED') return [];
                  
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
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stage1Row({ schedule, entry, role, onUpdate }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    videoTitle: '',
    shootDate: '', location: '', shootingType: '',
    scheduledStart: '', scheduledEnd: '',
    actualStart: '', actualEnd: '',
    cameraman: '', status: '', productionNotes: ''
  });

  const handleEditClick = () => {
    setFormData({
      videoTitle: schedule.videoTitle || '',
      shootDate: schedule.shootDate ? schedule.shootDate.split('T')[0] : '',
      location: schedule.location || '',
      shootingType: schedule.shootingType || '',
      scheduledStart: schedule.scheduledStart ? schedule.scheduledStart.split('T')[0] : '',
      scheduledEnd: schedule.scheduledEnd ? schedule.scheduledEnd.split('T')[0] : '',
      actualStart: schedule.actualStart ? schedule.actualStart.split('T')[0] : '',
      actualEnd: schedule.actualEnd ? schedule.actualEnd.split('T')[0] : '',
      cameraman: schedule.cameraman || '',
      status: schedule.status || 'PLANNED',
      productionNotes: schedule.productionNotes || ''
    });
    setIsEditing(true);
  };

  const handleSubmit = () => {
    onUpdate(schedule.id, formData);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <tr>
        <td>EPIC-{entry.epicSequence} <br/><small>{entry.sme?.name}</small></td>
        <td>{schedule.videoTitle}</td>
        <td>{schedule.shootDate ? new Date(schedule.shootDate).toLocaleDateString() : '-'} <br/><small>{schedule.location}</small></td>
        <td>
          <small>Plan: {schedule.scheduledStart ? new Date(schedule.scheduledStart).toLocaleDateString() : '-'} to {schedule.scheduledEnd ? new Date(schedule.scheduledEnd).toLocaleDateString() : '-'}</small>
          <br/>
          <small>Act: {schedule.actualStart ? new Date(schedule.actualStart).toLocaleDateString() : '-'} to {schedule.actualEnd ? new Date(schedule.actualEnd).toLocaleDateString() : '-'}</small>
        </td>
        <td>{schedule.cameraman || '-'}</td>
        <td>{schedule.status}</td>
        <td>
          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && <button onClick={handleEditClick} style={{ cursor: 'pointer' }}>Edit</button>}
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ background: '#f9fafb' }}>
      <td>EPIC-{entry.epicSequence} <br/><small>{entry.sme?.name}</small></td>
      <td><input type="text" value={formData.videoTitle} onChange={e => setFormData({...formData, videoTitle: e.target.value})} style={{width: '100%'}}/></td>
      <td>
        <input type="date" value={formData.shootDate} onChange={e => setFormData({...formData, shootDate: e.target.value})} style={{width: '100%'}}/>
        <input type="text" placeholder="Location" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={{width: '100%'}}/>
      </td>
      <td>
        <div style={{display:'flex', gap:'4px'}}>
          <input type="date" value={formData.scheduledStart} title="Scheduled Start" onChange={e => setFormData({...formData, scheduledStart: e.target.value})} style={{width: '50%'}}/>
          <input type="date" value={formData.scheduledEnd} title="Scheduled End" onChange={e => setFormData({...formData, scheduledEnd: e.target.value})} style={{width: '50%'}}/>
        </div>
        <div style={{display:'flex', gap:'4px', marginTop:'4px'}}>
          <input type="date" value={formData.actualStart} title="Actual Start" onChange={e => setFormData({...formData, actualStart: e.target.value})} style={{width: '50%'}}/>
          <input type="date" value={formData.actualEnd} title="Actual End" onChange={e => setFormData({...formData, actualEnd: e.target.value})} style={{width: '50%'}}/>
        </div>
      </td>
      <td><input type="text" value={formData.cameraman} onChange={e => setFormData({...formData, cameraman: e.target.value})} style={{width: '100%'}}/></td>
      <td>
        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{width: '100%'}}>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="RESHOOT">Reshoot</option>
        </select>
      </td>
      <td>
        <button onClick={handleSubmit} style={{ background: '#10b981', color: 'white', cursor: 'pointer', marginBottom: '4px', width: '100%' }}>Save</button>
        <button onClick={() => setIsEditing(false)} style={{ background: '#ef4444', color: 'white', cursor: 'pointer', width: '100%' }}>Cancel</button>
      </td>
    </tr>
  );
}

function Stage2Row({ entry, schedule, editorRec, animatorRec, role, onUpdateEditor, onUpdateAnimator }: any) {
  const [isEditing, setIsEditing] = useState(false);
  
  const [editorData, setEditorData] = useState({
    editorName: '', assignedVideo: '', editingStartDate: '', status: '', reviewComments: ''
  });
  
  const [animatorData, setAnimatorData] = useState({
    animatorName: '', animationStartDate: '', animationEndDate: '', status: ''
  });

  const handleEditClick = () => {
    setEditorData({
      editorName: editorRec.editorName || '',
      assignedVideo: editorRec.assignedVideo || schedule.videoTitle || '',
      editingStartDate: editorRec.editingStartDate ? editorRec.editingStartDate.split('T')[0] : '',
      status: editorRec.status || 'NOT_STARTED',
      reviewComments: editorRec.reviewComments || ''
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
    onUpdateEditor(editorRec.id, editorData, entry.id);
    onUpdateAnimator(animatorRec.id, animatorData, entry.id);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <tr>
        <td>EPIC-{entry.epicSequence} <br/><strong>{schedule.videoTitle}</strong></td>
        <td>
          Name: {editorRec.editorName || '-'} <br/>
          Status: {editorRec.status || 'NOT_STARTED'} <br/>
          Start: {editorRec.editingStartDate ? new Date(editorRec.editingStartDate).toLocaleDateString() : '-'}
        </td>
        <td>
          Name: {animatorRec.animatorName || '-'} <br/>
          Status: {animatorRec.status || 'NOT_STARTED'} <br/>
          Start: {animatorRec.animationStartDate ? new Date(animatorRec.animationStartDate).toLocaleDateString() : '-'}
        </td>
        <td>
          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && <button onClick={handleEditClick} style={{ cursor: 'pointer' }}>Edit</button>}
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ background: '#f9fafb' }}>
      <td>EPIC-{entry.epicSequence} <br/><strong>{schedule.videoTitle}</strong></td>
      <td>
        <input type="text" placeholder="Editor Name" value={editorData.editorName} onChange={e => setEditorData({...editorData, editorName: e.target.value})} style={{width:'100%', marginBottom:'4px'}}/>
        <input type="date" value={editorData.editingStartDate} onChange={e => setEditorData({...editorData, editingStartDate: e.target.value})} style={{width:'100%', marginBottom:'4px'}}/>
        <select value={editorData.status} onChange={e => setEditorData({...editorData, status: e.target.value})} style={{width:'100%'}}>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </td>
      <td>
        <input type="text" placeholder="Animator Name" value={animatorData.animatorName} onChange={e => setAnimatorData({...animatorData, animatorName: e.target.value})} style={{width:'100%', marginBottom:'4px'}}/>
        <input type="date" value={animatorData.animationStartDate} onChange={e => setAnimatorData({...animatorData, animationStartDate: e.target.value})} style={{width:'100%', marginBottom:'4px'}}/>
        <select value={animatorData.status} onChange={e => setAnimatorData({...animatorData, status: e.target.value})} style={{width:'100%'}}>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </td>
      <td>
        <button onClick={handleSubmit} style={{ background: '#10b981', color: 'white', cursor: 'pointer', marginBottom: '4px', width: '100%' }}>Save</button>
        <button onClick={() => setIsEditing(false)} style={{ background: '#ef4444', color: 'white', cursor: 'pointer', width: '100%' }}>Cancel</button>
      </td>
    </tr>
  );
}
