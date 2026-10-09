'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/app/dashboard/dashboard.module.css';
import { 
  getEpicWorkEntries, 
  getTopicProductionRecords, 
  createTopicProductionRecord,
  updateTopicStage1,
  updateTopicStage2
} from './actions';

export default function VideoProductionClient({ initialRecords = [], role = 'VIEWER' }: any) {
  const [activeTab, setActiveTab] = useState<'STAGE_1' | 'STAGE_2' | 'LEGACY'>('STAGE_1');
  const [epicList, setEpicList] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>(initialRecords);
  
  const [selectedEpicId, setSelectedEpicId] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [shootingDate, setShootingDate] = useState('');
  const [cameraman, setCameraman] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch epic lists on load
  useEffect(() => {
    async function loadEpics() {
      const res = await getEpicWorkEntries();
      if (res.success) {
        setEpicList(res.data || []);
      }
    }
    loadEpics();
  }, []);

  const selectedEpic = epicList.find(e => e.id === selectedEpicId);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEpicId || !topicTitle) {
      setError('Epic ID and Topic Title are required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await createTopicProductionRecord(selectedEpicId, {
      topicTitle,
      shootingDate,
      cameraman
    });

    if (res.success) {
      setSuccess('Topic saved successfully.');
      setTopics([(res as any).data, ...topics]);
      setTopicTitle('');
      setShootingDate('');
      setCameraman('');
    } else {
      setError(res.error || 'Failed to save topic.');
    }
    setLoading(false);
  };

  const handleStage2Update = async (id: string, data: any) => {
    setLoading(true);
    setError(null);
    const res = await updateTopicStage2(id, data);
    if (res.success) {
      setSuccess('Post-Production updated successfully.');
      setTopics(topics.map(t => t.id === id ? (res as any).data : t));
    } else {
      setError(res.error || 'Failed to update Stage 2.');
    }
    setLoading(false);
  };

  // Derived Summary Counts
  const totalTopics = topics.length;
  const shootingCompleted = topics.filter(t => t.productionStatus === 'COMPLETED').length;
  const editingInProgress = topics.filter(t => t.editingStatus === 'IN_PROGRESS').length;
  const finalCompleted = topics.filter(t => t.overallStatus === 'FINAL_COMPLETED').length;

  return (
    <div className={styles.container}>
      {/* Summary Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Topics</h3>
          <p className={styles.statValue}>{totalTopics}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Shooting Completed</h3>
          <p className={styles.statValue}>{shootingCompleted}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Editing In Progress</h3>
          <p className={styles.statValue}>{editingInProgress}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Final Completed</h3>
          <p className={styles.statValue}>{finalCompleted}</p>
        </div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}
      {success && <div className={styles.successAlert}>{success}</div>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('STAGE_1')}
          style={{ padding: '0.5rem 1rem', background: activeTab === 'STAGE_1' ? '#4f46e5' : '#eee', color: activeTab === 'STAGE_1' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          1. Production Stage
        </button>
        <button 
          onClick={() => setActiveTab('STAGE_2')}
          style={{ padding: '0.5rem 1rem', background: activeTab === 'STAGE_2' ? '#4f46e5' : '#eee', color: activeTab === 'STAGE_2' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          2. Post Production Stage
        </button>
        <button 
          onClick={() => setActiveTab('LEGACY')}
          style={{ padding: '0.5rem 1rem', background: activeTab === 'LEGACY' ? '#4f46e5' : '#eee', color: activeTab === 'LEGACY' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Legacy Records (Read Only)
        </button>
      </div>

      {activeTab === 'STAGE_1' && (
        <div className={styles.tableCard}>
          <h2>1. Production Stage</h2>
          
          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
            <form onSubmit={handleCreateTopic} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr', background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <div>
                <label>Epic ID *</label>
                <select value={selectedEpicId} onChange={e => setSelectedEpicId(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }}>
                  <option value="">Select Epic ID...</option>
                  {epicList.map(e => (
                    <option key={e.id} value={e.id}>EPIC-PMeVidya {e.epicSequence} ({e.sme?.name})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label>SME Name (Auto)</label>
                <input type="text" value={selectedEpic?.sme?.name || ''} readOnly disabled style={{ width: '100%', padding: '0.5rem', background: '#e5e7eb' }} />
              </div>

              <div>
                <label>Trade (Auto)</label>
                <input type="text" value={selectedEpic?.trade || ''} readOnly disabled style={{ width: '100%', padding: '0.5rem', background: '#e5e7eb' }} />
              </div>

              <div>
                <label>Captured Topic *</label>
                <input type="text" value={topicTitle} onChange={e => setTopicTitle(e.target.value)} required style={{ width: '100%', padding: '0.5rem' }} />
              </div>

              <div>
                <label>Shooting Date</label>
                <input type="date" value={shootingDate} onChange={e => setShootingDate(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
              </div>

              <div>
                <label>Cameraman</label>
                <input type="text" value={cameraman} onChange={e => setCameraman(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <button type="submit" disabled={loading} style={{ background: '#10b981', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {loading ? 'Saving...' : 'Save Topic'}
                </button>
              </div>
            </form>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Epic ID</th>
                  <th>SME Name</th>
                  <th>Trade</th>
                  <th>Topic No.</th>
                  <th>Topic Title</th>
                  <th>Shooting Date</th>
                  <th>Cameraman</th>
                  <th>Production Status</th>
                </tr>
              </thead>
              <tbody>
                {topics.length === 0 ? (
                  <tr><td colSpan={8} style={{textAlign: 'center'}}>No topics found.</td></tr>
                ) : (
                  topics.map(t => (
                    <tr key={t.id}>
                      <td>EPIC-{t.workEntry?.epicSequence}</td>
                      <td>{t.workEntry?.sme?.name}</td>
                      <td>{t.workEntry?.trade}</td>
                      <td>{t.topicNo}</td>
                      <td>{t.topicTitle}</td>
                      <td>{t.shootingDate ? new Date(t.shootingDate).toLocaleDateString() : '-'}</td>
                      <td>{t.cameraman || '-'}</td>
                      <td>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '9999px', 
                          fontSize: '0.75rem',
                          background: t.productionStatus === 'COMPLETED' ? '#d1fae5' : '#fef3c7',
                          color: t.productionStatus === 'COMPLETED' ? '#065f46' : '#92400e'
                        }}>
                          {t.productionStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'STAGE_2' && (
        <div className={styles.tableCard}>
          <h2>2. Post Production Stage</h2>
          <p style={{marginBottom: '1rem', color: '#6b7280'}}>Only topics with completed production (Stage 1) are shown here.</p>
          
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Epic ID</th>
                  <th>Topic No. & Title</th>
                  <th>Editor Name</th>
                  <th>Editing Dates</th>
                  <th>Animator Name</th>
                  <th>Animation Dates</th>
                  <th>Overall Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {topics.filter(t => t.productionStatus === 'COMPLETED').length === 0 ? (
                  <tr><td colSpan={8} style={{textAlign: 'center'}}>No eligible topics for Stage 2.</td></tr>
                ) : (
                  topics.filter(t => t.productionStatus === 'COMPLETED').map(t => (
                    <Stage2Row key={t.id} topic={t} role={role} onUpdate={handleStage2Update} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'LEGACY' && (
        <div className={styles.tableCard}>
          <h2>Legacy Records</h2>
          <p style={{marginBottom: '1rem', color: '#6b7280'}}>Read-only view of historical tracker entries created before the two-stage workflow migration.</p>
          
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Epic ID</th>
                  <th>SME Name & Topic</th>
                  <th>Shooting Status</th>
                  <th>Editing Status</th>
                  <th>Animation Status</th>
                  <th>Final Video Status</th>
                </tr>
              </thead>
              <tbody>
                {epicList.filter(e => 
                  e.shootingSchedules?.length > 0 || 
                  e.videoEditorRecords?.length > 0 || 
                  e.animationRecords?.length > 0 || 
                  e.finalVideoRecords?.length > 0
                ).length === 0 ? (
                  <tr><td colSpan={6} style={{textAlign: 'center'}}>No legacy records found.</td></tr>
                ) : (
                  epicList.filter(e => 
                    e.shootingSchedules?.length > 0 || 
                    e.videoEditorRecords?.length > 0 || 
                    e.animationRecords?.length > 0 || 
                    e.finalVideoRecords?.length > 0
                  ).map(e => (
                    <tr key={e.id}>
                      <td>EPIC-{e.epicSequence}</td>
                      <td>
                        <strong>{e.sme?.name}</strong><br/>
                        <small>{e.topic}</small>
                      </td>
                      <td>{e.shootingSchedules?.[0]?.status || '-'}</td>
                      <td>{e.videoEditorRecords?.[0]?.status || '-'}</td>
                      <td>{e.animationRecords?.[0]?.status || '-'}</td>
                      <td>{e.finalVideoRecords?.[0]?.finalVideoStatus || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stage2Row({ topic, role, onUpdate }: { topic: any, role: string, onUpdate: (id: string, data: any) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    editorName: topic.editorName || '',
    editingStartDate: topic.editingStartDate ? topic.editingStartDate.split('T')[0] : '',
    editingEndDate: topic.editingEndDate ? topic.editingEndDate.split('T')[0] : '',
    editingStatus: topic.editingStatus || 'NOT_STARTED',
    
    animatorName: topic.animatorName || '',
    animationStartDate: topic.animationStartDate ? topic.animationStartDate.split('T')[0] : '',
    animationEndDate: topic.animationEndDate ? topic.animationEndDate.split('T')[0] : '',
    animationStatus: topic.animationStatus || 'NOT_STARTED'
  });

  const handleSubmit = () => {
    onUpdate(topic.id, formData);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <tr>
        <td>EPIC-{topic.workEntry?.epicSequence}</td>
        <td><strong>#{topic.topicNo}</strong> - {topic.topicTitle}</td>
        <td>{topic.editorName || '-'}</td>
        <td>
          {topic.editingStartDate ? new Date(topic.editingStartDate).toLocaleDateString() : '-'} to {topic.editingEndDate ? new Date(topic.editingEndDate).toLocaleDateString() : '-'}
          <br/>
          <small>{topic.editingStatus}</small>
        </td>
        <td>{topic.animatorName || '-'}</td>
        <td>
          {topic.animationStartDate ? new Date(topic.animationStartDate).toLocaleDateString() : '-'} to {topic.animationEndDate ? new Date(topic.animationEndDate).toLocaleDateString() : '-'}
          <br/>
          <small>{topic.animationStatus}</small>
        </td>
        <td>
           <span style={{ 
              padding: '0.25rem 0.5rem', 
              borderRadius: '9999px', 
              fontSize: '0.75rem',
              background: topic.overallStatus === 'FINAL_COMPLETED' ? '#d1fae5' : '#e0e7ff',
              color: topic.overallStatus === 'FINAL_COMPLETED' ? '#065f46' : '#3730a3'
            }}>
              {topic.overallStatus}
            </span>
        </td>
        <td>
          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
            <button onClick={() => setIsEditing(true)} style={{ padding: '0.25rem 0.5rem', cursor: 'pointer' }}>Edit</button>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ background: '#f9fafb' }}>
      <td colSpan={2}>
        EPIC-{topic.workEntry?.epicSequence} <br/>
        <strong>#{topic.topicNo}</strong> - {topic.topicTitle}
      </td>
      <td colSpan={2}>
        <input type="text" placeholder="Editor Name" value={formData.editorName} onChange={e => setFormData({...formData, editorName: e.target.value})} style={{display:'block', marginBottom:'4px', width:'100%'}}/>
        <input type="date" value={formData.editingStartDate} onChange={e => setFormData({...formData, editingStartDate: e.target.value})} style={{width:'48%', marginRight:'4%'}}/>
        <input type="date" value={formData.editingEndDate} onChange={e => setFormData({...formData, editingEndDate: e.target.value})} style={{width:'48%'}}/>
        <select value={formData.editingStatus} onChange={e => setFormData({...formData, editingStatus: e.target.value})} style={{display:'block', marginTop:'4px', width:'100%'}}>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </td>
      <td colSpan={2}>
        <input type="text" placeholder="Animator Name" value={formData.animatorName} onChange={e => setFormData({...formData, animatorName: e.target.value})} style={{display:'block', marginBottom:'4px', width:'100%'}}/>
        <input type="date" value={formData.animationStartDate} onChange={e => setFormData({...formData, animationStartDate: e.target.value})} style={{width:'48%', marginRight:'4%'}}/>
        <input type="date" value={formData.animationEndDate} onChange={e => setFormData({...formData, animationEndDate: e.target.value})} style={{width:'48%'}}/>
        <select value={formData.animationStatus} onChange={e => setFormData({...formData, animationStatus: e.target.value})} style={{display:'block', marginTop:'4px', width:'100%'}}>
          <option value="NOT_STARTED">Not Started</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </td>
      <td>{topic.overallStatus}</td>
      <td>
        <button onClick={handleSubmit} style={{ background: '#10b981', color: 'white', padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '4px', display:'block', width: '100%' }}>Save</button>
        <button onClick={() => setIsEditing(false)} style={{ background: '#ef4444', color: 'white', padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', display:'block', width: '100%' }}>Cancel</button>
      </td>
    </tr>
  );
}
