'use client';

import React, { useState } from 'react';
import styles from './video-production.module.css';

export default function VideoProductionClient({ initialRecords, role }: { initialRecords: any[], role: string }) {
  const [records, setRecords] = useState(initialRecords);
  const [selectedEpic, setSelectedEpic] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const getEpicId = (epicSequence: number) => `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;

  const filteredRecords = records.filter(r => 
    getEpicId(r.epicSequence).toLowerCase().includes(search.toLowerCase()) ||
    r.sme?.name.toLowerCase().includes(search.toLowerCase()) ||
    r.topic?.toLowerCase().includes(search.toLowerCase())
  );

  const getOverallStatus = (r: any) => {
    if (r.finalVideoRecords?.length > 0 && r.finalVideoRecords[0].finalVideoStatus === 'COMPLETED') return 'Completed';
    if (r.animationRecords?.length > 0 && r.animationRecords[0].status === 'IN_PROGRESS') return 'Animation in Progress';
    if (r.videoEditorRecords?.length > 0 && r.videoEditorRecords[0].status === 'IN_PROGRESS') return 'Editing in Progress';
    if (r.shootingSchedules?.length > 0 && r.shootingSchedules[0].status === 'COMPLETED') return 'Shooting Completed';
    if (r.documents?.length > 0) return 'Documents Pending';
    return 'Pending';
  };

  const getBadgeClass = (status: string) => {
    if (status.includes('Completed')) return styles.badgeCompleted;
    if (status.includes('Progress')) return styles.badgeProgress;
    if (status.includes('Pending')) return styles.badgePending;
    return styles.badgePending;
  };

  // Summary counts
  const totalEpics = records.length;
  const shootsCompleted = records.filter(r => r.shootingSchedules?.[0]?.status === 'COMPLETED').length;
  const editingInProgress = records.filter(r => r.videoEditorRecords?.[0]?.status === 'IN_PROGRESS').length;
  const finalCompleted = records.filter(r => r.finalVideoRecords?.[0]?.finalVideoStatus === 'COMPLETED').length;

  if (selectedEpic) {
    const docCompleted = selectedEpic.documents?.find((d:any) => d.type === 'APPROVAL_LETTER') ? true : false;
    const shoot = selectedEpic.shootingSchedules?.[0];
    const editor = selectedEpic.videoEditorRecords?.[0];
    const anim = selectedEpic.animationRecords?.[0];
    const final = selectedEpic.finalVideoRecords?.[0];

    return (
      <div className={styles.workflowContainer}>
        <div className={styles.workflowHeader}>
          <button className={styles.backBtn} onClick={() => setSelectedEpic(null)}>←</button>
          <div>
            <h2 className={styles.epicTitle}>{getEpicId(selectedEpic.epicSequence)}</h2>
            <p className={styles.epicSme}>{selectedEpic.sme?.name} - {selectedEpic.topic}</p>
          </div>
        </div>

        <div className={styles.workflowStages}>
          {/* 1. SME & Document Compliance */}
          <div className={`${styles.stageCard} ${docCompleted ? styles.stageCompleted : styles.stageInProgress}`}>
            <div className={styles.stageIcon}>{docCompleted ? '✓' : '1'}</div>
            <div className={styles.stageHeader}>
              <h3 className={styles.stageTitle}>1. SME & Document Compliance</h3>
              <span className={`${styles.badge} ${docCompleted ? styles.badgeCompleted : styles.badgeProgress}`}>
                {docCompleted ? 'Completed' : 'Pending'}
              </span>
            </div>
            <div className={styles.stageContent}>
              <div className={styles.grid2}>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>SME Name</span>
                  <span className={styles.infoValue}>{selectedEpic.sme?.name}</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Institute</span>
                  <span className={styles.infoValue}>{selectedEpic.sme?.institute || 'N/A'}</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Documents Uploaded</span>
                  <span className={styles.infoValue}>{selectedEpic.documents?.length || 0} Docs</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Production - Shooting */}
          <div className={`${styles.stageCard} ${shoot?.status === 'COMPLETED' ? styles.stageCompleted : (shoot ? styles.stageInProgress : '')}`}>
            <div className={styles.stageIcon}>{shoot?.status === 'COMPLETED' ? '✓' : '2'}</div>
            <div className={styles.stageHeader}>
              <h3 className={styles.stageTitle}>2. Production – Shooting Schedule</h3>
              <span className={`${styles.badge} ${shoot?.status === 'COMPLETED' ? styles.badgeCompleted : (shoot ? styles.badgeProgress : styles.badgePending)}`}>
                {shoot?.status || 'Pending'}
              </span>
            </div>
            <div className={styles.stageContent}>
              {shoot ? (
                <div className={styles.grid2}>
                  <div className={styles.infoGroup}>
                    <span className={styles.infoLabel}>Shoot Date</span>
                    <span className={styles.infoValue}>{shoot.shootDate ? new Date(shoot.shootDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className={styles.infoGroup}>
                    <span className={styles.infoLabel}>Cameraman</span>
                    <span className={styles.infoValue}>{shoot.cameraman || 'N/A'}</span>
                  </div>
                </div>
              ) : (
                role !== 'VIEWER' && <button className={styles.btnPrimary}>+ Schedule Shoot</button>
              )}
            </div>
          </div>

          {/* 3. Post Production - Video Editor */}
          <div className={`${styles.stageCard} ${editor?.status === 'COMPLETED' ? styles.stageCompleted : (editor ? styles.stageInProgress : '')}`}>
            <div className={styles.stageIcon}>{editor?.status === 'COMPLETED' ? '✓' : '3'}</div>
            <div className={styles.stageHeader}>
              <h3 className={styles.stageTitle}>3. Post Production – Video Editor</h3>
              <span className={`${styles.badge} ${editor?.status === 'COMPLETED' ? styles.badgeCompleted : (editor ? styles.badgeProgress : styles.badgePending)}`}>
                {editor?.status || 'Pending'}
              </span>
            </div>
            <div className={styles.stageContent}>
              {editor ? (
                <div className={styles.grid2}>
                  <div className={styles.infoGroup}>
                    <span className={styles.infoLabel}>Editor Name</span>
                    <span className={styles.infoValue}>{editor.editorName || 'N/A'}</span>
                  </div>
                  <div className={styles.infoGroup}>
                    <span className={styles.infoLabel}>Duration</span>
                    <span className={styles.infoValue}>{editor.duration || 'N/A'}</span>
                  </div>
                </div>
              ) : (
                role !== 'VIEWER' && <button className={styles.btnPrimary}>+ Assign Editor</button>
              )}
            </div>
          </div>

          {/* 4. Post Production - 2D Animator */}
          <div className={`${styles.stageCard} ${anim?.status === 'COMPLETED' ? styles.stageCompleted : (anim ? styles.stageInProgress : '')}`}>
            <div className={styles.stageIcon}>{anim?.status === 'COMPLETED' ? '✓' : '4'}</div>
            <div className={styles.stageHeader}>
              <h3 className={styles.stageTitle}>4. Post Production – 2D Animator</h3>
              <span className={`${styles.badge} ${anim?.status === 'COMPLETED' ? styles.badgeCompleted : (anim ? styles.badgeProgress : styles.badgePending)}`}>
                {anim?.status || 'Pending'}
              </span>
            </div>
            <div className={styles.stageContent}>
              {anim ? (
                <div className={styles.grid2}>
                  <div className={styles.infoGroup}>
                    <span className={styles.infoLabel}>Animator</span>
                    <span className={styles.infoValue}>{anim.animatorName || 'N/A'}</span>
                  </div>
                </div>
              ) : (
                role !== 'VIEWER' && <button className={styles.btnPrimary}>+ Assign Animator</button>
              )}
            </div>
          </div>

          {/* 5. Final Video & 6. Telecast */}
          <div className={`${styles.stageCard} ${final?.finalVideoStatus === 'COMPLETED' ? styles.stageCompleted : (final ? styles.stageInProgress : '')}`}>
            <div className={styles.stageIcon}>{final?.finalVideoStatus === 'COMPLETED' ? '✓' : '5'}</div>
            <div className={styles.stageHeader}>
              <h3 className={styles.stageTitle}>5. Final Video & Telecast</h3>
              <span className={`${styles.badge} ${final?.finalVideoStatus === 'COMPLETED' ? styles.badgeCompleted : (final ? styles.badgeProgress : styles.badgePending)}`}>
                {final?.finalVideoStatus || 'Pending'}
              </span>
            </div>
            <div className={styles.stageContent}>
              {final ? (
                <div className={styles.grid2}>
                  <div className={styles.infoGroup}>
                    <span className={styles.infoLabel}>Final Duration</span>
                    <span className={styles.infoValue}>{final.finalDuration || 'N/A'}</span>
                  </div>
                  <div className={styles.infoGroup}>
                    <span className={styles.infoLabel}>Telecast Channel</span>
                    <span className={styles.infoValue}>{final.telecastChannel || 'N/A'}</span>
                  </div>
                </div>
              ) : (
                role !== 'VIEWER' && <button className={styles.btnPrimary}>+ Add Final Details</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryNumber}>{totalEpics}</div>
          <div className={styles.summaryLabel}>Total Epic Videos</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryNumber}>{shootsCompleted}</div>
          <div className={styles.summaryLabel}>Shooting Completed</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryNumber}>{editingInProgress}</div>
          <div className={styles.summaryLabel}>Editing In Progress</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryNumber}>{finalCompleted}</div>
          <div className={styles.summaryLabel}>Final Completed</div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Video Production Tracker</h2>
          <input 
            type="text" 
            placeholder="Search Epic ID, SME, or Title..." 
            className={styles.searchBox}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Desktop Table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Epic ID</th>
                <th>SME Name</th>
                <th>Topic / Video Title</th>
                <th>Current Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r: any) => {
                const status = getOverallStatus(r);
                return (
                  <tr key={r.id} onClick={() => setSelectedEpic(r)}>
                    <td style={{ fontWeight: 600, color: '#3b82f6' }}>{getEpicId(r.epicSequence)}</td>
                    <td>{r.sme?.name}</td>
                    <td>{r.topic}</td>
                    <td>
                      <span className={`${styles.badge} ${getBadgeClass(status)}`}>{status}</span>
                    </td>
                    <td>
                      <span style={{ color: '#3b82f6', fontWeight: 600 }}>View Workflow →</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className={styles.mobileCards}>
          {filteredRecords.map((r: any) => {
            const status = getOverallStatus(r);
            return (
              <div key={r.id} className={styles.mobileCard} onClick={() => setSelectedEpic(r)}>
                <div style={{ fontWeight: 600, color: '#3b82f6' }}>{getEpicId(r.epicSequence)}</div>
                <div style={{ fontSize: '14px', color: '#0f172a' }}>{r.sme?.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{r.topic}</div>
                <div><span className={`${styles.badge} ${getBadgeClass(status)}`}>{status}</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
