'use client';

import React, { useState, useMemo, useEffect } from 'react';
import styles from './video-production.module.css';
import { assignProductionPersonnel } from './actions';

interface AdminWorkAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoRegister: any[];
  authorizedStaff: { cameramen: any[]; editors: any[] };
  initialEpicCode?: string;
  onSaveSuccess: () => Promise<void>;
  setNotification: (notif: { type: 'success' | 'error'; message: string } | null) => void;
}

export default function AdminWorkAssignmentModal({
  isOpen,
  onClose,
  videoRegister,
  authorizedStaff,
  initialEpicCode,
  onSaveSuccess,
  setNotification
}: AdminWorkAssignmentModalProps) {
  // All unique EPIC Codes
  const allEpics = useMemo(() => {
    return Array.from(new Set(videoRegister.map(r => r.epicCode))).filter(e => e && e !== '-').sort();
  }, [videoRegister]);

  const [selectedEpic, setSelectedEpic] = useState<string>(initialEpicCode || allEpics[0] || '');

  useEffect(() => {
    if (initialEpicCode && allEpics.includes(initialEpicCode)) {
      setSelectedEpic(initialEpicCode);
    } else if (allEpics.length > 0 && !selectedEpic) {
      setSelectedEpic(allEpics[0]);
    }
  }, [initialEpicCode, allEpics, selectedEpic]);

  // Rows for selected EPIC
  const epicRows = useMemo(() => {
    return videoRegister.filter(r => r.epicCode === selectedEpic);
  }, [videoRegister, selectedEpic]);

  // Selected EPIC Metadata
  const epicMeta = useMemo(() => {
    if (epicRows.length === 0) return null;
    const first = epicRows[0];
    return {
      workEntryId: first.epicId,
      epicCode: first.epicCode,
      month: first.month,
      trade: first.trade,
      smeName: first.smeName,
      totalTopics: epicRows.length
    };
  }, [epicRows]);

  // Form states
  const [scope, setScope] = useState<'EPIC' | 'TOPIC'>('EPIC');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('ALL');
  const [assignedCameraman, setAssignedCameraman] = useState<string>('Parasuraman');
  const [assignedEditor, setAssignedEditor] = useState<string>('Hassan & Antony');
  const [changeReason, setChangeReason] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Initialize defaults when epic changes
  useEffect(() => {
    if (epicRows.length > 0) {
      setSelectedTopicId('ALL');
      const firstCam = epicRows[0].cameraman;
      const firstEd = epicRows[0].editor;
      if (firstCam && firstCam !== '-') setAssignedCameraman(firstCam);
      if (firstEd && firstEd !== '-') setAssignedEditor(firstEd);
    }
  }, [selectedEpic, epicRows]);

  if (!isOpen) return null;

  const handleSaveAssignment = async () => {
    if (!epicMeta) return;

    if (!changeReason || changeReason.trim().length < 5) {
      alert('Please provide a mandatory change reason of at least 5 characters for audit compliance.');
      return;
    }

    // Match emails if available
    const camObj = authorizedStaff.cameramen.find(c => c.name?.toLowerCase() === assignedCameraman.toLowerCase());
    const edObj = authorizedStaff.editors.find(e => e.name?.toLowerCase() === assignedEditor.toLowerCase());

    const targetVideoId = scope === 'TOPIC' && selectedTopicId !== 'ALL' ? selectedTopicId : 'ALL';

    setSaving(true);
    try {
      const res = await assignProductionPersonnel({
        workEntryId: epicMeta.workEntryId,
        videoId: targetVideoId,
        cameramanName: assignedCameraman,
        cameramanEmail: camObj?.email,
        editorName: assignedEditor,
        editorEmail: edObj?.email,
        changeReason: changeReason.trim()
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Successfully updated work assignment for ${epicMeta.epicCode}! Changes reflected in Cameraman & Editor portals.`
        });
        await onSaveSuccess();
        onClose();
      } else {
        alert(res.error || 'Failed to save work assignment.');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving work assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} style={{ maxWidth: '880px' }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>
              👤 Admin Work Assignment — EPIC &amp; Topic Level
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Assign Cameraman (Shooting Stage) and Video Editor (Post-Production Stage) with automatic queue synchronization
            </p>
          </div>
          <button className={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody} style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {/* 1. EPIC ID Selection & Metadata */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <label className={styles.formLabel} style={{ fontWeight: 700, color: '#0369a1' }}>
                  Select Target EPIC ID:
                </label>
                <select
                  className={styles.toolbarSelect}
                  style={{ minWidth: '280px', padding: '8px 12px', fontSize: '14px', fontWeight: 600, borderColor: '#0284c7' }}
                  value={selectedEpic}
                  onChange={e => setSelectedEpic(e.target.value)}
                >
                  {allEpics.map(epic => (
                    <option key={epic} value={epic}>{epic}</option>
                  ))}
                </select>
              </div>

              {epicMeta && (
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Month:</span>{' '}
                    <strong style={{ color: '#b91c1c' }}>{epicMeta.month} 2026</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Trade:</span>{' '}
                    <strong>{epicMeta.trade}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>SME:</span>{' '}
                    <strong>{epicMeta.smeName}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Assignment Scope (EPIC vs Topic Level) */}
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <label className={styles.formLabel} style={{ fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>
              Assignment Scope:
            </label>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px' }}>
                <input
                  type="radio"
                  name="assignScope"
                  checked={scope === 'EPIC'}
                  onChange={() => {
                    setScope('EPIC');
                    setSelectedTopicId('ALL');
                  }}
                />
                Entire EPIC (Apply to all {epicRows.length} topics in {selectedEpic})
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13.5px' }}>
                <input
                  type="radio"
                  name="assignScope"
                  checked={scope === 'TOPIC'}
                  onChange={() => {
                    setScope('TOPIC');
                    if (epicRows.length > 0) setSelectedTopicId(epicRows[0].videoId);
                  }}
                />
                Specific Topic Level (Assign individual topic)
              </label>
            </div>

            {scope === 'TOPIC' && (
              <div style={{ marginTop: '10px', padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                <label className={styles.formLabel}>Select Specific Topic:</label>
                <select
                  className={styles.formSelect}
                  value={selectedTopicId}
                  onChange={e => setSelectedTopicId(e.target.value)}
                >
                  {epicRows.map(r => (
                    <option key={r.videoId} value={r.videoId}>
                      S.No {r.sNo} — {r.videoTitle}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Personnel Assignment Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div className={styles.formField}>
                <label className={styles.formLabel} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1' }}>
                  <span>🎥</span>
                  <span>Assign Cameraman (Shooting Stage)</span>
                </label>
                <select
                  className={styles.formSelect}
                  value={assignedCameraman}
                  onChange={e => setAssignedCameraman(e.target.value)}
                >
                  <option value="Parasuraman">Parasuraman</option>
                  <option value="Antony Alcander">Antony Alcander</option>
                  <option value="Antony Parasuraman">Antony Parasuraman</option>
                  {authorizedStaff.cameramen.map((c: any) => (
                    <option key={c.id || c.email} value={c.name}>{c.name} ({c.email})</option>
                  ))}
                </select>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Will appear in Cameraman's Shooting Entry portal immediately
                </span>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7e22ce' }}>
                  <span>✂️</span>
                  <span>Assign Video Editor (Post-Production Stage)</span>
                </label>
                <select
                  className={styles.formSelect}
                  value={assignedEditor}
                  onChange={e => setAssignedEditor(e.target.value)}
                >
                  <option value="Hassan & Antony">Hassan &amp; Antony</option>
                  <option value="Hassan">Hassan</option>
                  <option value="Bala">Bala</option>
                  <option value="Ramaswamy">Ramaswamy</option>
                  <option value="Parandhaman">Parandhaman</option>
                  <option value="Post-Production Team">Post-Production Team</option>
                  {authorizedStaff.editors.map((e: any) => (
                    <option key={e.id || e.email} value={e.name}>{e.name} ({e.email})</option>
                  ))}
                </select>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Will appear in Editor's Post-Production queue once shooting is completed
                </span>
              </div>
            </div>
          </div>

          {/* 3. Review Progress Table of Topics under this EPIC */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
              Current Production Status for {selectedEpic} Topics ({epicRows.length}):
            </h4>

            <div className={styles.trackerTableWrapper} style={{ maxHeight: '220px', overflowY: 'auto' }}>
              <table className={styles.trackerTable} style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>S.No</th>
                    <th style={{ minWidth: '180px' }}>Video Topic</th>
                    <th style={{ minWidth: '100px' }}>Cameraman</th>
                    <th style={{ minWidth: '90px' }}>Shooting</th>
                    <th style={{ minWidth: '100px' }}>Video Editor</th>
                    <th style={{ minWidth: '90px' }}>Editing</th>
                    <th style={{ minWidth: '70px' }}>Duration</th>
                    <th style={{ minWidth: '70px' }}>Video Link</th>
                  </tr>
                </thead>
                <tbody>
                  {epicRows.map(row => (
                    <tr key={row.uniqueKey}>
                      <td>{row.sNo}</td>
                      <td style={{ fontWeight: 500 }}>{row.videoTitle}</td>
                      <td>{row.cameraman}</td>
                      <td>
                        <span className={styles.pillCompleted} style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                          {row.shootingStatus}
                        </span>
                      </td>
                      <td>{row.editor}</td>
                      <td>
                        <span className={styles.pillPending} style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                          {row.editingStatus}
                        </span>
                      </td>
                      <td>{row.duration || '-'}</td>
                      <td>{row.finalVideoLink ? '✓ Linked' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#166534', background: '#f0fdf4', padding: '6px 12px', borderRadius: '6px' }}>
              🛡️ <strong>Historical Data Integrity:</strong> Reassigning Cameraman or Video Editor preserves all previously entered dates, shooting statuses, editing statuses, durations, and video links.
            </p>
          </div>

          {/* 4. Mandatory Audit Change Reason */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px' }}>
            <label className={styles.formLabel} style={{ color: '#92400e', fontWeight: 700 }}>
              Mandatory Change Reason (Required for Audit Compliance, min 5 characters):
            </label>
            <input
              type="text"
              className={styles.formSelect}
              placeholder="e.g. Assigned Antony Alcander for shooting and Hassan for editing under EPIC-2026-PMeVidya 03"
              value={changeReason}
              onChange={e => setChangeReason(e.target.value)}
              style={{ borderColor: changeReason.trim().length >= 5 ? '#10b981' : '#f59e0b' }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnSave}
            disabled={saving || changeReason.trim().length < 5}
            onClick={handleSaveAssignment}
          >
            {saving ? 'Saving Assignment...' : '💾 Save & Apply Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
