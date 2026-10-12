'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addVideo, updateVideo, detectVideoDuration, autoAnalyzeSingleVideo, autoAnalyzeAllVideos } from './actions';
import styles from '../budget/budget.module.css'; // Reuse table styles

export default function ContentClient({ initialData, epics = [] }: { initialData: any[], epics?: any[] }) {
  const router = useRouter();
  const [videos, setVideos] = useState<any[]>(initialData);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ smeName: '', trade: '', title: '', videoLink: '', epicId: '', duration: '' });
  
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analyzingVideoId, setAnalyzingVideoId] = useState<string | null>(null);
  const [isDetectingDuration, setIsDetectingDuration] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [filterSME, setFilterSME] = useState('All');
  const [filterTrade, setFilterTrade] = useState('All');

  // Sync when initialData changes
  useEffect(() => {
    setVideos(initialData);
  }, [initialData]);

  const uniqueSMEs = Array.from(new Set(videos.map(v => v.smeName))).sort();
  const uniqueTrades = Array.from(new Set(videos.map(v => v.trade || '-'))).sort();

  const filteredData = videos.filter(v => {
    const matchSME = filterSME === 'All' || v.smeName === filterSME;
    const matchTrade = filterTrade === 'All' || (v.trade || '-') === filterTrade;
    return matchSME && matchTrade;
  });

  // Calculate totals
  const totalSMEs = new Set(filteredData.map(v => v.smeName)).size;
  
  const totalSeconds = filteredData.reduce((acc, v) => {
    if (!v.duration || v.duration === '0:00:00') return acc;
    const parts = v.duration.split(':').map(Number);
    if (parts.length === 3) return acc + parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return acc + parts[0] * 60 + parts[1];
    return acc;
  }, 0);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const totalDurationStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  const uncalculatedCount = videos.filter(v => !v.duration || v.duration === '0:00:00').length;

  const handleAutoAnalyzeAll = async () => {
    setIsAnalyzingAll(true);
    setStatusMessage('Analyzing all video durations from catalogue and online links...');
    try {
      const res = await autoAnalyzeAllVideos();
      if (res && res.success && 'updatedCount' in res) {
        setStatusMessage(`Successfully analyzed and updated ${res.updatedCount} video(s)!`);
        router.refresh();
      } else {
        setStatusMessage(('error' in res ? res.error : null) || 'Analysis completed.');
      }
    } catch (err: any) {
      setStatusMessage('Error during auto-analysis: ' + (err.message || 'Unknown error'));
    } finally {
      setIsAnalyzingAll(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleAutoAnalyzeSingle = async (id: string) => {
    setAnalyzingVideoId(id);
    try {
      const res = await autoAnalyzeSingleVideo(id);
      if (res && res.success && 'duration' in res && res.duration) {
        const foundDuration = res.duration;
        setVideos(prev => prev.map(v => v.id === id ? { ...v, duration: foundDuration } : v));
        router.refresh();
      } else {
        alert(('error' in res ? res.error : null) || 'Could not auto-detect duration.');
      }
    } catch (err: any) {
      alert('Error analyzing video: ' + (err.message || 'Unknown error'));
    } finally {
      setAnalyzingVideoId(null);
    }
  };

  const handleDetectDurationInForm = async () => {
    if (!formData.videoLink && !formData.title) {
      return alert('Please enter Title or Video Link first.');
    }
    setIsDetectingDuration(true);
    try {
      const detected = await detectVideoDuration({ title: formData.title, videoLink: formData.videoLink });
      if (detected) {
        setFormData(prev => ({ ...prev, duration: detected }));
      } else {
        alert('Could not auto-detect duration. Please verify link or enter manually.');
      }
    } catch (err) {
      alert('Error detecting duration.');
    } finally {
      setIsDetectingDuration(false);
    }
  };

  const handleEpicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const epicId = e.target.value;
    const selected = epics.find(ep => ep.id === epicId);
    if (selected) {
      const newTitle = selected.topic || '';
      setFormData(prev => ({
        ...prev,
        epicId,
        smeName: selected.sme?.name || '',
        trade: selected.trade || '',
        title: newTitle
      }));
      // Also probe if title matches catalogue
      detectVideoDuration({ title: newTitle }).then(d => {
        if (d) setFormData(prev => ({ ...prev, duration: d }));
      });
    } else {
      setFormData(prev => ({ ...prev, epicId }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let res;
    if (editingId) {
      res = await updateVideo(editingId, formData);
    } else {
      res = await addVideo(formData);
    }
    
    if (res && 'warning' in res && res.warning) {
      alert(res.warning);
    }
    
    setIsAdding(false);
    setEditingId(null);
    setFormData({ smeName: '', trade: '', title: '', videoLink: '', epicId: '', duration: '' });
    router.refresh();
  };

  const handleEdit = (video: any) => {
    setFormData({
      smeName: video.smeName,
      trade: video.trade || '',
      title: video.title,
      videoLink: video.videoLink,
      epicId: video.epicId || '',
      duration: video.duration === '0:00:00' ? '' : (video.duration || '')
    });
    setEditingId(video.id);
    setIsAdding(true);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Video Content Library</h1>
        <p className={styles.subtitle}>Track published video contents mapped directly to the SME and Title.</p>
      </header>
      
      <div className={styles.card}>
        <div style={{ padding: '16px', background: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <strong style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Filters:</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px' }}>SME:</label>
            <select className={styles.input} style={{ padding: '6px', fontSize: '14px', width: 'auto' }} value={filterSME} onChange={e => setFilterSME(e.target.value)}>
              <option value="All">All SMEs</option>
              {uniqueSMEs.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px' }}>Trade:</label>
            <select className={styles.input} style={{ padding: '6px', fontSize: '14px', width: 'auto' }} value={filterTrade} onChange={e => setFilterTrade(e.target.value)}>
              <option value="All">All Trades</option>
              {uniqueTrades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.actionsBar} style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 className={styles.title} style={{ fontSize: '20px', margin: 0 }}>Content Records</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--primary-light)', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', color: 'var(--primary)' }}>
              Total SMEs: {totalSMEs}
            </div>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⏱️</span>
              <span>Overall Duration: {totalDurationStr}</span>
            </div>
            <button 
              className="btn-primary" 
              onClick={handleAutoAnalyzeAll}
              disabled={isAnalyzingAll}
              style={{ background: '#7c3aed', borderColor: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Automatically detect and update duration for all videos"
            >
              <span>{isAnalyzingAll ? '⏳' : '⚡'}</span>
              <span>{isAnalyzingAll ? 'Analyzing All...' : 'Auto-Analyze Durations'}</span>
            </button>
            <button 
              className="btn-primary" 
              onClick={() => { setIsAdding(!isAdding); if(isAdding) setEditingId(null); }}
            >
              {isAdding ? 'Cancel' : '+ Add New Video'}
            </button>
          </div>
        </div>

        {/* Status Notification Message */}
        {statusMessage && (
          <div style={{ margin: '0 16px 16px 16px', padding: '10px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✓</span> {statusMessage}
          </div>
        )}

        {/* Notice banner if uncalculated records exist */}
        {uncalculatedCount > 0 && !isAnalyzingAll && (
          <div style={{ margin: '0 16px 16px 16px', padding: '12px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontSize: '14px' }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
              <span>Found <strong>{uncalculatedCount} video(s)</strong> with uncalculated duration (0:00:00). Auto-analysis can update them now.</span>
            </div>
            <button 
              onClick={handleAutoAnalyzeAll} 
              style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '6px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
            >
              Auto-Analyze All Now
            </button>
          </div>
        )}

        {isAdding && (
          <form className={styles.formGrid} onSubmit={handleSubmit} style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
            <div className={styles.formGroup}>
              <label>Link Epic ID</label>
              <select name="epicId" value={formData.epicId} onChange={handleEpicChange} className={styles.input}>
                <option value="">-- No Epic (Manual Entry) --</option>
                {epics.map(e => <option key={e.id} value={e.id}>EPIC-{e.epicSequence} ({e.sme?.name})</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>SME Name</label>
              <input type="text" name="smeName" value={formData.smeName} onChange={handleChange} required className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Trade</label>
              <input type="text" name="trade" value={formData.trade} onChange={handleChange} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Title</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Video Link</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="url" 
                  name="videoLink" 
                  value={formData.videoLink} 
                  onChange={handleChange} 
                  required 
                  className={styles.input} 
                  placeholder="https://..." 
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleDetectDurationInForm}
                  disabled={isDetectingDuration}
                  style={{ padding: '6px 12px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {isDetectingDuration ? 'Detecting...' : '⚡ Detect Duration'}
                </button>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Duration (HH:MM:SS)</label>
              <input 
                type="text" 
                name="duration" 
                value={formData.duration} 
                onChange={handleChange} 
                className={styles.input} 
                placeholder="Auto-detected or enter HH:MM:SS" 
              />
            </div>
            <div className={styles.formActions} style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn-primary">{editingId ? "Update Video" : "Save Video"}</button>
            </div>
          </form>
        )}

        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>S.no.</th>
                <th>Epic ID</th>
                <th>SME Name</th>
                <th>Trade</th>
                <th>Title</th>
                <th>Duration</th>
                <th>Video Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>No video records found</td>
                </tr>
              ) : (
                filteredData.map((v, idx) => {
                  const hasZeroDuration = !v.duration || v.duration === '0:00:00';
                  return (
                    <tr key={v.id}>
                      <td>{idx + 1}</td>
                      <td>{v.epic ? `EPIC-${v.epic.epicSequence}` : '-'}</td>
                      <td>{v.smeName}</td>
                      <td>{v.trade || '-'}</td>
                      <td style={{ fontWeight: 500 }}>{v.title}</td>
                      <td>
                        {hasZeroDuration ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>0:00:00</span>
                            <button
                              onClick={() => handleAutoAnalyzeSingle(v.id)}
                              disabled={analyzingVideoId === v.id}
                              style={{ 
                                fontSize: '11px', 
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                background: '#eff6ff', 
                                color: '#1d4ed8', 
                                border: '1px solid #bfdbfe', 
                                cursor: 'pointer', 
                                fontWeight: 700 
                              }}
                              title="Click to auto-detect duration"
                            >
                              {analyzingVideoId === v.id ? 'Analyzing...' : '⚡ Auto-Analyze'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            fontWeight: 700, 
                            color: '#0f172a',
                            background: '#f8fafc',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0'
                          }}>
                            ⏱️ {v.duration}
                          </span>
                        )}
                      </td>
                      <td>
                        <a href={v.videoLink} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}>
                          Watch Video
                        </a>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button 
                            onClick={() => handleEdit(v)} 
                            style={{ color: '#2563eb', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleAutoAnalyzeSingle(v.id)}
                            disabled={analyzingVideoId === v.id}
                            style={{ 
                              color: '#7c3aed', 
                              border: 'none', 
                              background: 'none', 
                              cursor: 'pointer', 
                              fontWeight: 600, 
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                            title="Auto-analyze duration"
                          >
                            {analyzingVideoId === v.id ? '⏳' : '⚡'} Analyze
                          </button>
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
    </div>
  );
}

