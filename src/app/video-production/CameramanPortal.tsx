'use client';

import React, { useState, useMemo, useEffect } from 'react';
import styles from './video-production.module.css';
import { saveCameramanShootingEntry } from './actions';

interface CameramanPortalProps {
  currentUser: any;
  videoRegister: any[];
  onRefreshData: () => Promise<void>;
  onViewOverallTracker: () => void;
  setNotification: (notif: { type: 'success' | 'error'; message: string } | null) => void;
}

export default function CameramanPortal({
  currentUser,
  videoRegister,
  onRefreshData,
  onViewOverallTracker,
  setNotification
}: CameramanPortalProps) {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ASSIGNMENTS' | 'SHOOTING_ENTRY' | 'PROFILE'>('SHOOTING_ENTRY');
  
  // Filter only topics assigned to this authenticated Cameraman
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

  const assignedRows = useMemo(() => {
    return videoRegister.filter(row => {
      if (assignedSequences.length > 0 && assignedSequences.includes(row.epicSequence)) {
        return true;
      }
      const cam = (row.cameraman || '').toLowerCase().trim();
      if (cam && cam !== '-') {
        if (userEmail && (cam === userEmail || cam.includes(userEmail))) return true;
        if (userName && (cam === userName || cam.includes(userName))) return true;
        const camParts = cam.split(',').map((p: string) => p.trim());
        if (userEmail && camParts.includes(userEmail)) return true;
        if (userName && camParts.includes(userName)) return true;
      }
      return false;
    });
  }, [videoRegister, assignedSequences, userEmail, userName]);

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

  // Metadata for selected EPIC
  const epicMeta = useMemo(() => {
    if (selectedEpicRows.length === 0) return null;
    const first = selectedEpicRows[0];
    return {
      month: first.month,
      trade: first.trade,
      smeName: first.smeName,
      totalTopics: selectedEpicRows.length,
      epicCode: first.epicCode,
      epicId: first.epicId
    };
  }, [selectedEpicRows]);

  // Form states per topic
  const [topicForms, setTopicForms] = useState<Record<string, {
    start: string;
    end: string;
    status: string;
    notes: string;
    loading: boolean;
  }>>({});

  useEffect(() => {
    const nextForms: Record<string, any> = {};
    selectedEpicRows.forEach(row => {
      nextForms[row.uniqueKey] = {
        start: row.shootingStartDate || '',
        end: row.shootingEndDate || '',
        status: row.shootingStatus || 'Yet to shoot',
        notes: row.productionNotes || '',
        loading: false
      };
    });
    setTopicForms(prev => ({ ...prev, ...nextForms }));
  }, [selectedEpicRows]);

  const handleFieldChange = (uniqueKey: string, field: string, value: string) => {
    setTopicForms(prev => ({
      ...prev,
      [uniqueKey]: {
        ...(prev[uniqueKey] || { start: '', end: '', status: 'Yet to shoot', notes: '', loading: false }),
        [field]: value
      }
    }));
  };

  // Save Draft (In Progress)
  const handleSaveDraft = async (row: any) => {
    const form = topicForms[row.uniqueKey] || {
      start: row.shootingStartDate || '',
      end: row.shootingEndDate || '',
      status: 'In Progress',
      notes: row.productionNotes || '',
      loading: false
    };

    if (form.start && form.end && form.end < form.start) {
      alert('Validation Error: Shooting End Date cannot precede Shooting Start Date.');
      return;
    }

    setTopicForms(prev => ({
      ...prev,
      [row.uniqueKey]: { ...prev[row.uniqueKey], loading: true }
    }));

    try {
      const res = await saveCameramanShootingEntry({
        workEntryId: row.epicId,
        videoId: row.videoId,
        shootingStartDate: form.start || null,
        shootingEndDate: form.end || null,
        shootingStatus: form.status === 'Yet to shoot' ? 'In Progress' : form.status,
        shootingNotes: form.notes || null,
        isSubmit: false
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Saved shooting draft for "${row.videoTitle}".`
        });
        await onRefreshData();
      } else {
        alert(res.error || 'Failed to save shooting draft.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving shooting draft.');
    } finally {
      setTopicForms(prev => ({
        ...prev,
        [row.uniqueKey]: { ...prev[row.uniqueKey], loading: false }
      }));
    }
  };

  // Submit Shooting (Completed)
  const handleSubmitShooting = async (row: any) => {
    const form = topicForms[row.uniqueKey] || {
      start: row.shootingStartDate || '',
      end: row.shootingEndDate || '',
      status: 'Completed',
      notes: row.productionNotes || '',
      loading: false
    };

    if (form.start && form.end && form.end < form.start) {
      alert('Validation Error: Shooting End Date cannot precede Shooting Start Date.');
      return;
    }

    const confirmed = window.confirm(
      `Submit shooting as COMPLETED for "${row.videoTitle}"?\n\nThis will automatically hand over the footage to the Video Editor's Post-Production queue.`
    );
    if (!confirmed) return;

    setTopicForms(prev => ({
      ...prev,
      [row.uniqueKey]: { ...prev[row.uniqueKey], loading: true }
    }));

    try {
      const res = await saveCameramanShootingEntry({
        workEntryId: row.epicId,
        videoId: row.videoId,
        shootingStartDate: form.start || null,
        shootingEndDate: form.end || null,
        shootingStatus: 'Completed',
        shootingNotes: form.notes || null,
        isSubmit: true
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `🎉 Shooting successfully submitted as Completed for "${row.videoTitle}"! Topic is now in the Video Editor's Queue.`
        });
        await onRefreshData();
      } else {
        alert(res.error || 'Failed to submit shooting.');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting shooting.');
    } finally {
      setTopicForms(prev => ({
        ...prev,
        [row.uniqueKey]: { ...prev[row.uniqueKey], loading: false }
      }));
    }
  };

  // KPI calculations for Dashboard
  const kpis = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let yetToShoot = 0;

    assignedRows.forEach(r => {
      const s = (r.shootingStatus || '').toLowerCase();
      if (s.includes('completed')) completed++;
      else if (s.includes('progress') || s.includes('live')) inProgress++;
      else yetToShoot++;
    });

    return {
      total: assignedRows.length,
      completed,
      inProgress,
      yetToShoot
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
      (r.shootingStatus || '').toLowerCase().includes(q)
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
    return <span className={styles.pillYetToShoot}>Yet to shoot</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Portal Header */}
      <div className={styles.portalHeader}>
        <div className={styles.portalTitleCol}>
          <h1 className={styles.pageTitle}>
            <span className={styles.titleIcon}>🎥</span>
            <span>Cameraman Portal — Shooting Stage</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Manage assigned EPIC shooting schedules, log field recording dates, and submit completed footage for post-production
          </p>
        </div>

        <div className={styles.portalBadgeCam}>
          <span>📷</span>
          <span>Camera Operator: {currentUser?.name || 'Antony Alcander'} ({currentUser?.email || 'antony.alcander@gmail.com'})</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className={styles.portalNavTabs} role="tablist">
        <button
          type="button"
          className={`${styles.portalNavTabBtn} ${activeTab === 'SHOOTING_ENTRY' ? styles.portalNavTabBtnActive : ''}`}
          onClick={() => setActiveTab('SHOOTING_ENTRY')}
        >
          <span>🎥</span>
          <span>Shooting Entry</span>
        </button>
        <button
          type="button"
          className={`${styles.portalNavTabBtn} ${activeTab === 'DASHBOARD' ? styles.portalNavTabBtnActive : ''}`}
          onClick={() => setActiveTab('DASHBOARD')}
        >
          <span>📊</span>
          <span>Dashboard</span>
        </button>
        <button
          type="button"
          className={`${styles.portalNavTabBtn} ${activeTab === 'ASSIGNMENTS' ? styles.portalNavTabBtnActive : ''}`}
          onClick={() => setActiveTab('ASSIGNMENTS')}
        >
          <span>📋</span>
          <span>My Assignments ({assignedRows.length})</span>
        </button>
        <button
          type="button"
          className={styles.portalNavTabBtn}
          onClick={onViewOverallTracker}
          title="Open Overall 16-Column Tracker"
        >
          <span>👁️</span>
          <span>Overall Tracker (View Only)</span>
        </button>
        <button
          type="button"
          className={`${styles.portalNavTabBtn} ${activeTab === 'PROFILE' ? styles.portalNavTabBtnActive : ''}`}
          onClick={() => setActiveTab('PROFILE')}
        >
          <span>👤</span>
          <span>Profile</span>
        </button>
      </div>

      {/* TAB 1: SHOOTING ENTRY */}
      {activeTab === 'SHOOTING_ENTRY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* EPIC Selector Card */}
          <div className={styles.epicSelectCard}>
            <div className={styles.epicSelectHeader}>
              <div>
                <label className={styles.formLabel} style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1' }}>
                  Select Assigned EPIC ID:
                </label>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Showing only EPIC IDs assigned to your Camera Operator account
                </p>
              </div>

              <select
                className={styles.toolbarSelect}
                style={{ minWidth: '260px', padding: '8px 14px', fontSize: '14px', fontWeight: 600, borderColor: '#0284c7' }}
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
                  <span className={styles.epicMetaLabel}>Assigned Topics</span>
                  <span className={styles.epicMetaValue}>{epicMeta.totalTopics} Videos in this EPIC</span>
                </div>
              </div>
            )}
          </div>

          {/* Topic-Wise Cards */}
          <div className={styles.topicListContainer}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
              Assigned Video Topics in {selectedEpic} ({selectedEpicRows.length}):
            </h3>

            {selectedEpicRows.map(row => {
              const form = topicForms[row.uniqueKey] || {
                start: row.shootingStartDate || '',
                end: row.shootingEndDate || '',
                status: row.shootingStatus || 'Yet to shoot',
                notes: row.productionNotes || '',
                loading: false
              };

              const hasDateError = Boolean(form.start && form.end && form.end < form.start);

              return (
                <div key={row.uniqueKey} className={styles.topicCard}>
                  <div className={styles.topicCardHeader}>
                    <div className={styles.topicTitleArea}>
                      <span className={styles.topicBadgeId}>S.No {row.sNo}</span>
                      <span className={styles.topicBadgeId} style={{ background: '#e0f2fe', color: '#0369a1' }}>{row.displayVideoId}</span>
                      <span className={styles.topicTitleText}>{row.videoTitle}</span>
                    </div>
                    <div>
                      {renderBadge(row.shootingStatus)}
                    </div>
                  </div>

                  <div className={styles.topicCardBody}>
                    <div className={styles.topicFormGrid}>
                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Shooting Start Date</label>
                        <input
                          type="date"
                          className={styles.formSelect}
                          value={form.start}
                          onChange={e => handleFieldChange(row.uniqueKey, 'start', e.target.value)}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Shooting End Date</label>
                        <input
                          type="date"
                          className={styles.formSelect}
                          value={form.end}
                          onChange={e => handleFieldChange(row.uniqueKey, 'end', e.target.value)}
                        />
                      </div>

                      <div className={styles.formField}>
                        <label className={styles.formLabel}>Shooting Status</label>
                        <select
                          className={styles.formSelect}
                          value={form.status}
                          onChange={e => handleFieldChange(row.uniqueKey, 'status', e.target.value)}
                        >
                          <option value="Yet to shoot">Yet to shoot</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Shooting Completed</option>
                        </select>
                      </div>

                      <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                        <label className={styles.formLabel}>Cameraman Remarks / Shooting Location Notes</label>
                        <input
                          type="text"
                          className={styles.formSelect}
                          placeholder="e.g. Studio Chennai, outdoor rig, audio verified, 1080p raw files backed up"
                          value={form.notes}
                          onChange={e => handleFieldChange(row.uniqueKey, 'notes', e.target.value)}
                        />
                      </div>
                    </div>

                    {hasDateError && (
                      <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '13px' }}>
                        ⚠️ Validation Error: Shooting End Date ({form.end}) cannot precede Start Date ({form.start}).
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
                      disabled={form.loading || hasDateError}
                      onClick={() => handleSubmitShooting(row)}
                    >
                      {form.loading ? 'Submitting...' : '✅ Submit Shooting (Completed)'}
                    </button>
                  </div>
                </div>
              );
            })}

            {selectedEpicRows.length === 0 && (
              <div style={{ padding: '36px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                No video topics assigned to you under this EPIC ID.
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
                <span className={styles.kpiLabel}>Total Assigned</span>
                <div className={styles.kpiIconCircle} style={{ background: '#eff6ff', color: '#2563eb' }}>📋</div>
              </div>
              <div className={styles.kpiValue}>{kpis.total}</div>
              <span className={styles.kpiSubtext}>Topics across {assignedEpics.length} EPICs</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiCardHeader}>
                <span className={styles.kpiLabel}>Shooting Completed</span>
                <div className={styles.kpiIconCircle} style={{ background: '#f0fdf4', color: '#16a34a' }}>✓</div>
              </div>
              <div className={styles.kpiValue} style={{ color: '#16a34a' }}>{kpis.completed}</div>
              <span className={styles.kpiSubtext}>Footage sent to Post-Production</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiCardHeader}>
                <span className={styles.kpiLabel}>In Progress / Live</span>
                <div className={styles.kpiIconCircle} style={{ background: '#eff6ff', color: '#0284c7' }}>⏳</div>
              </div>
              <div className={styles.kpiValue} style={{ color: '#0284c7' }}>{kpis.inProgress}</div>
              <span className={styles.kpiSubtext}>Currently active shooting</span>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiCardHeader}>
                <span className={styles.kpiLabel}>Yet to Shoot</span>
                <div className={styles.kpiIconCircle} style={{ background: '#fef2f2', color: '#dc2626' }}>📅</div>
              </div>
              <div className={styles.kpiValue} style={{ color: '#dc2626' }}>{kpis.yetToShoot}</div>
              <span className={styles.kpiSubtext}>Upcoming planned shoots</span>
            </div>
          </div>

          {/* Quick Assignments Overview */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
              Assigned EPIC Schedules:
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {assignedEpics.map(epic => {
                const rows = assignedRows.filter(r => r.epicCode === epic);
                const first = rows[0];
                const doneCount = rows.filter(r => (r.shootingStatus || '').toLowerCase().includes('completed')).length;

                return (
                  <div key={epic} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#0369a1' }}>{epic}</strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{first?.month} 2026</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '6px' }}>{first?.trade}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>SME: {first?.smeName}</div>
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        Progress: {doneCount}/{rows.length} completed
                      </span>
                      <button
                        type="button"
                        className={styles.btnDraft}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => {
                          setSelectedEpic(epic);
                          setActiveTab('SHOOTING_ENTRY');
                        }}
                      >
                        Enter Shooting ➔
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
              All My Assigned Shooting Topics ({assignedRows.length}):
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
                  <th style={{ minWidth: '140px' }}>SME Name</th>
                  <th style={{ minWidth: '220px' }}>Video Topic</th>
                  <th style={{ minWidth: '100px' }}>Start Date</th>
                  <th style={{ minWidth: '100px' }}>End Date</th>
                  <th style={{ minWidth: '120px' }}>Status</th>
                  <th style={{ minWidth: '100px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map(row => (
                  <tr key={row.uniqueKey}>
                    <td>{row.sNo}</td>
                    <td className={styles.monthCellHighlight}>{row.month}</td>
                    <td style={{ fontWeight: 600, color: '#0369a1' }}>{row.epicCode}</td>
                    <td>{row.trade}</td>
                    <td>{row.smeName}</td>
                    <td style={{ fontWeight: 500 }}>{row.videoTitle}</td>
                    <td>{row.shootingStartDate || '-'}</td>
                    <td>{row.shootingEndDate || '-'}</td>
                    <td>{renderBadge(row.shootingStatus)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={styles.btnDraft}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => {
                          setSelectedEpic(row.epicCode);
                          setActiveTab('SHOOTING_ENTRY');
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
            <div style={{ width: '50px', height: '50px', borderRadius: '25px', background: '#0284c7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              🎥
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{currentUser?.name || 'Antony Alcander'}</h2>
              <span style={{ fontSize: '13px', color: '#0369a1', fontWeight: 600 }}>Camera Operator</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
            <div><strong>Email Address:</strong> {currentUser?.email || 'antony.alcander@gmail.com'}</div>
            <div><strong>Role:</strong> <span style={{ color: '#0284c7', fontWeight: 700 }}>CAMERAMAN</span></div>
            <div><strong>Account Status:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>ACTIVE</span></div>
            <div>
              <strong>Assigned EPIC Sequences:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {assignedEpics.map(e => (
                  <span key={e} style={{ padding: '3px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
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
