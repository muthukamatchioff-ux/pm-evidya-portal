'use client';

import React, { useState } from 'react';
import { addVideo, updateVideo } from './actions';
import styles from '../budget/budget.module.css'; // Reuse table styles

export default function ContentClient({ initialData }: { initialData: any[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ smeName: '', trade: '', title: '', videoLink: '' });
  
  const [filterSME, setFilterSME] = useState('All');
  const [filterTrade, setFilterTrade] = useState('All');

  const uniqueSMEs = Array.from(new Set(initialData.map(v => v.smeName))).sort();
  const uniqueTrades = Array.from(new Set(initialData.map(v => v.trade || '-'))).sort();

  const filteredData = initialData.filter(v => {
    const matchSME = filterSME === 'All' || v.smeName === filterSME;
    const matchTrade = filterTrade === 'All' || (v.trade || '-') === filterTrade;
    return matchSME && matchTrade;
  });

  // Calculate totals
  const totalSMEs = new Set(filteredData.map(v => v.smeName)).size;
  
  const totalSeconds = filteredData.reduce((acc, v) => {
    if (!v.duration) return acc;
    const parts = v.duration.split(':').map(Number);
    if (parts.length === 3) return acc + parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return acc + parts[0] * 60 + parts[1];
    return acc;
  }, 0);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const totalDurationStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateVideo(editingId, formData);
    } else {
      await addVideo(formData);
    }
    setIsAdding(false);
    setEditingId(null);
    setFormData({ smeName: '', trade: '', title: '', videoLink: '' });
  };

  const handleEdit = (video: any) => {
    setFormData({
      smeName: video.smeName,
      trade: video.trade || '',
      title: video.title,
      videoLink: video.videoLink
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
          <div className={styles.actionsBar} style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className={styles.title} style={{ fontSize: '20px', margin: 0 }}>Content Records</h3>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div style={{ background: 'var(--primary-light)', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', color: 'var(--primary)' }}>
                Total SMEs: {totalSMEs}
              </div>
              <div style={{ background: 'var(--primary-light)', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', color: 'var(--primary)' }}>
                Overall Duration: {totalDurationStr}
              </div>
              <button 
                className="btn-primary" 
                onClick={() => { setIsAdding(!isAdding); if(isAdding) setEditingId(null); }}
              >
                {isAdding ? 'Cancel' : '+ Add New Video'}
              </button>
            </div>
          </div>

        {isAdding && (
          <form className={styles.formGrid} onSubmit={handleSubmit} style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
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
              <input type="url" name="videoLink" value={formData.videoLink} onChange={handleChange} required className={styles.input} placeholder="https://..." />
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
                <th>SME Name</th>
                <th>Trade</th>
                <th>Title</th>
                <th>Duration (Auto)</th>
                <th>Video Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No video records found</td>
                </tr>
              ) : (
                filteredData.map((v, idx) => (
                  <tr key={v.id}>
                    <td>{idx + 1}</td>
                    <td>{v.smeName}</td>
                    <td>{v.trade || '-'}</td>
                    <td>{v.title}</td>
                    <td>{v.duration || '0:00:00'}</td>
                    <td>
                      <a href={v.videoLink} target="_blank" rel="noreferrer" style={{ color: 'blue', textDecoration: 'underline' }}>
                        Watch Video
                      </a>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleEdit(v)} 
                        style={{ color: 'blue', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
