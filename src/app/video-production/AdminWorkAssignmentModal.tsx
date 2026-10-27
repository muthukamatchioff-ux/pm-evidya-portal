'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './video-production.module.css';
import { assignProductionPersonnel } from './actions';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  designation?: string;
}

interface AdminWorkAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoRegister: any[];
  authorizedStaff: { cameramen: StaffUser[]; editors: StaffUser[] };
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
  // All unique valid EPIC Codes
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
      totalTopics: epicRows.length,
      currentCameraman: first.cameraman,
      currentEditor: first.editor
    };
  }, [epicRows]);

  // Form states
  const [scope, setScope] = useState<'EPIC' | 'TOPIC'>('EPIC');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('ALL');

  // Multi-select state: Cameramen
  const [selectedCameramen, setSelectedCameramen] = useState<StaffUser[]>([]);
  const [camSearchQuery, setCamSearchQuery] = useState('');
  const [isCamDropdownOpen, setIsCamDropdownOpen] = useState(false);
  const camDropdownRef = useRef<HTMLDivElement>(null);

  // Multi-select state: Editors
  const [selectedEditors, setSelectedEditors] = useState<StaffUser[]>([]);
  const [edSearchQuery, setEdSearchQuery] = useState('');
  const [isEdDropdownOpen, setIsEdDropdownOpen] = useState(false);
  const edDropdownRef = useRef<HTMLDivElement>(null);

  const [changeReason, setChangeReason] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Initialize defaults when epic changes
  useEffect(() => {
    if (epicRows.length > 0) {
      setSelectedTopicId('ALL');
      const firstRow = epicRows[0];

      // Parse Cameramen
      const camStr = firstRow.cameraman !== '-' && firstRow.cameraman !== '—' ? firstRow.cameraman : '';
      const existingCamNames = camStr ? camStr.split(',').map((s: string) => s.trim().toLowerCase()) : [];
      const initialCams: StaffUser[] = [];

      existingCamNames.forEach((nameLower: string) => {
        const found = authorizedStaff.cameramen.find(c =>
          (c.name || '').toLowerCase() === nameLower || (c.email || '').toLowerCase() === nameLower
        );
        if (found && !initialCams.some(x => x.email === found.email)) {
          initialCams.push(found);
        } else if (!initialCams.some(x => x.name.toLowerCase() === nameLower)) {
          initialCams.push({ id: `cam-${nameLower}`, name: firstRow.cameraman, email: `${nameLower}@nimi.org` });
        }
      });

      // Keep initialCams empty if none assigned
      // (Do not forcibly push first cameraman)
      setSelectedCameramen(initialCams);

      // Parse Editors
      const edStr = firstRow.editor !== '-' && firstRow.editor !== '—' ? firstRow.editor : '';
      const existingEdNames = edStr ? edStr.split(',').map((s: string) => s.trim().toLowerCase()) : [];
      const initialEds: StaffUser[] = [];

      existingEdNames.forEach((nameLower: string) => {
        const found = authorizedStaff.editors.find(e =>
          (e.name || '').toLowerCase() === nameLower || (e.email || '').toLowerCase() === nameLower
        );
        if (found && !initialEds.some(x => x.email === found.email)) {
          initialEds.push(found);
        } else if (!initialEds.some(x => x.name.toLowerCase() === nameLower)) {
          initialEds.push({ id: `ed-${nameLower}`, name: firstRow.editor, email: `${nameLower}@nimi.org` });
        }
      });

      // Keep initialEds empty if none assigned
      // (Do not forcibly push first editor)
      setSelectedEditors(initialEds);
    }
  }, [selectedEpic, epicRows, authorizedStaff]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (camDropdownRef.current && !camDropdownRef.current.contains(event.target as Node)) {
        setIsCamDropdownOpen(false);
      }
      if (edDropdownRef.current && !edDropdownRef.current.contains(event.target as Node)) {
        setIsEdDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter available Cameramen
  const availableCameramen = useMemo(() => {
    return authorizedStaff.cameramen.filter(c => {
      const alreadySelected = selectedCameramen.some(sc => sc.email?.toLowerCase() === c.email?.toLowerCase() || sc.name?.toLowerCase() === c.name?.toLowerCase());
      if (alreadySelected) return false;
      if (!camSearchQuery.trim()) return true;
      const q = camSearchQuery.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
    });
  }, [authorizedStaff.cameramen, selectedCameramen, camSearchQuery]);

  // Filter available Editors
  const availableEditors = useMemo(() => {
    return authorizedStaff.editors.filter(e => {
      const alreadySelected = selectedEditors.some(se => se.email?.toLowerCase() === e.email?.toLowerCase() || se.name?.toLowerCase() === e.name?.toLowerCase());
      if (alreadySelected) return false;
      if (!edSearchQuery.trim()) return true;
      const q = edSearchQuery.toLowerCase();
      return (e.name || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q);
    });
  }, [authorizedStaff.editors, selectedEditors, edSearchQuery]);

  if (!isOpen) return null;

  const handleAddCameraman = (cam: StaffUser) => {
    setSelectedCameramen(prev => [...prev, cam]);
    setCamSearchQuery('');
    setIsCamDropdownOpen(false);
  };

  const handleRemoveCameraman = (emailOrName: string) => {
    setSelectedCameramen(prev => prev.filter(c => c.email !== emailOrName && c.name !== emailOrName));
  };

  const handleAddEditor = (ed: StaffUser) => {
    setSelectedEditors(prev => [...prev, ed]);
    setEdSearchQuery('');
    setIsEdDropdownOpen(false);
  };

  const handleRemoveEditor = (emailOrName: string) => {
    setSelectedEditors(prev => prev.filter(e => e.email !== emailOrName && e.name !== emailOrName));
  };

  const handleSaveAssignment = async () => {
    if (!epicMeta) return;

    if (selectedCameramen.length === 0) {
      alert('Please select at least one Camera Man account.');
      return;
    }

    if (selectedEditors.length === 0) {
      alert('Please select at least one Video Editor account.');
      return;
    }

    if (!changeReason || changeReason.trim().length < 5) {
      alert('Please provide a mandatory change reason of at least 5 characters for audit compliance.');
      return;
    }

    const targetVideoId = scope === 'TOPIC' && selectedTopicId !== 'ALL' ? selectedTopicId : 'ALL';

    setSaving(true);
    try {
      const res = await assignProductionPersonnel({
        workEntryId: epicMeta.workEntryId,
        videoId: targetVideoId,
        cameramanNames: selectedCameramen.map(c => c.name),
        cameramanEmails: selectedCameramen.map(c => c.email),
        editorNames: selectedEditors.map(e => e.name),
        editorEmails: selectedEditors.map(e => e.email),
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
              👤 Admin Work Assignment — Multi-User Delegation
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Assign multiple Cameramen (Shooting Stage) and Video Editors (Post-Production Stage) with real-time portal synchronization
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
                  style={{ minWidth: '280px', fontWeight: 600, borderColor: '#0284c7' }}
                  value={selectedEpic}
                  onChange={e => setSelectedEpic(e.target.value)}
                >
                  {allEpics.map(epic => {
                    const sample = videoRegister.find((r: any) => r.epicCode === epic);
                    const count = videoRegister.filter((r: any) => r.epicCode === epic).length;
                    return (
                      <option key={epic} value={epic}>
                        {epic} — {sample?.trade || 'General'} ({count} {count === 1 ? 'topic' : 'topics'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {epicMeta && (
                <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', background: '#ffffff', padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <div><span style={{ color: '#64748b' }}>Month:</span> <strong>{epicMeta.month}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Trade:</span> <strong>{epicMeta.trade}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Topics:</span> <strong>{epicMeta.totalTopics}</strong></div>
                  <div><span style={{ color: '#64748b' }}>SME:</span> <strong>{epicMeta.smeName}</strong></div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Scope & Topic Selection */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Assignment Scope:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: scope === 'EPIC' ? 600 : 400 }}>
                <input
                  type="radio"
                  name="modalScope"
                  checked={scope === 'EPIC'}
                  onChange={() => setScope('EPIC')}
                />
                Apply to Entire EPIC ({epicRows.length} topics)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: scope === 'TOPIC' ? 600 : 400 }}>
                <input
                  type="radio"
                  name="modalScope"
                  checked={scope === 'TOPIC'}
                  onChange={() => setScope('TOPIC')}
                />
                Apply to Specific Topic Only
              </label>
            </div>

            {scope === 'TOPIC' && (
              <div style={{ marginTop: '10px' }}>
                <label className={styles.formLabel}>Select Target Topic:</label>
                <select
                  className={styles.formInput}
                  value={selectedTopicId}
                  onChange={e => setSelectedTopicId(e.target.value)}
                >
                  <option value="ALL">All Topics in this EPIC</option>
                  {epicRows.map((r: any) => (
                    <option key={r.uniqueKey} value={r.videoId}>
                      #{r.sNo}: {r.videoTitle}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 3. Multi-User Assignment Grid */}
          <div className={styles.assignmentColumnsGrid} style={{ marginBottom: '16px' }}>
            {/* Column A: Camera Man Assignment */}
            <div className={styles.assignmentColCard}>
              <div className={styles.assignmentColTitle}>
                <span>🎥</span>
                <span>Assign Camera Man (Shooting Stage)</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  ({selectedCameramen.length} selected)
                </span>
              </div>

              {/* Multi-Select Chips Container */}
              <div className={styles.chipsContainer}>
                {selectedCameramen.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>No Camera Man selected</span>
                ) : (
                  selectedCameramen.map(cam => (
                    <span key={cam.email || cam.id} className={styles.userChip}>
                      <span>{cam.name}</span>
                      <button
                        type="button"
                        className={styles.userChipRemove}
                        onClick={() => handleRemoveCameraman(cam.email || cam.name)}
                        title={`Remove ${cam.name}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Searchable Dropdown for Cameramen */}
              <div className={styles.searchSelectWrapper} ref={camDropdownRef}>
                <input
                  type="text"
                  className={styles.searchInputField}
                  style={{ width: '100%', fontSize: '12.5px', padding: '6px 10px', height: '34px' }}
                  placeholder="🔍 Type to search & add Camera Man..."
                  value={camSearchQuery}
                  onChange={e => {
                    setCamSearchQuery(e.target.value);
                    setIsCamDropdownOpen(true);
                  }}
                  onFocus={() => setIsCamDropdownOpen(true)}
                />

                {isCamDropdownOpen && (
                  <div className={styles.searchSelectDropdown}>
                    {availableCameramen.length === 0 ? (
                      <div style={{ padding: '8px 12px', fontSize: '12px', color: '#94a3b8' }}>
                        {camSearchQuery ? 'No matching Cameramen found' : 'All available Cameramen already selected'}
                      </div>
                    ) : (
                      availableCameramen.map(cam => (
                        <div
                          key={cam.id || cam.email}
                          className={styles.searchSelectOption}
                          onClick={() => handleAddCameraman(cam)}
                        >
                          <div className={styles.searchSelectOptionName}>+ {cam.name}</div>
                          <div className={styles.searchSelectOptionMeta}>
                            {cam.email} {cam.designation ? `• ${cam.designation}` : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Column B: Video Editor Assignment */}
            <div className={styles.assignmentColCard}>
              <div className={styles.assignmentColTitle}>
                <span>✂️</span>
                <span>Assign Video Editor (Post-Production Stage)</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  ({selectedEditors.length} selected)
                </span>
              </div>

              {/* Multi-Select Chips Container */}
              <div className={styles.chipsContainer}>
                {selectedEditors.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>No Video Editor selected</span>
                ) : (
                  selectedEditors.map(ed => (
                    <span key={ed.email || ed.id} className={styles.userChip} style={{ background: '#f5f3ff', borderColor: '#ddd6fe', color: '#6d28d9' }}>
                      <span>{ed.name}</span>
                      <button
                        type="button"
                        className={styles.userChipRemove}
                        onClick={() => handleRemoveEditor(ed.email || ed.name)}
                        title={`Remove ${ed.name}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Searchable Dropdown for Editors */}
              <div className={styles.searchSelectWrapper} ref={edDropdownRef}>
                <input
                  type="text"
                  className={styles.searchInputField}
                  style={{ width: '100%', fontSize: '12.5px', padding: '6px 10px', height: '34px' }}
                  placeholder="🔍 Type to search & add Video Editor..."
                  value={edSearchQuery}
                  onChange={e => {
                    setEdSearchQuery(e.target.value);
                    setIsEdDropdownOpen(true);
                  }}
                  onFocus={() => setIsEdDropdownOpen(true)}
                />

                {isEdDropdownOpen && (
                  <div className={styles.searchSelectDropdown}>
                    {availableEditors.length === 0 ? (
                      <div style={{ padding: '8px 12px', fontSize: '12px', color: '#94a3b8' }}>
                        {edSearchQuery ? 'No matching Editors found' : 'All available Editors already selected'}
                      </div>
                    ) : (
                      availableEditors.map(ed => (
                        <div
                          key={ed.id || ed.email}
                          className={styles.searchSelectOption}
                          onClick={() => handleAddEditor(ed)}
                        >
                          <div className={styles.searchSelectOptionName}>+ {ed.name}</div>
                          <div className={styles.searchSelectOptionMeta}>
                            {ed.email} {ed.designation ? `• ${ed.designation}` : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Mandatory Audit Compliance */}
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px' }}>
            <label className={styles.formLabel} style={{ color: '#991b1b', fontWeight: 700 }}>
              * Mandatory Audit Change Reason (min 5 characters):
            </label>
            <input
              type="text"
              className={styles.formInput}
              style={{ borderColor: '#fca5a5' }}
              placeholder="e.g., Assigned secondary Camera Man and Video Editor for expedited delivery"
              value={changeReason}
              onChange={e => setChangeReason(e.target.value)}
            />
            <span style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px', display: 'block' }}>
              All assignment modifications are logged to persistent audit history with previous and new personnel snapshots.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className={styles.btnSave} onClick={handleSaveAssignment} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save & Synchronize Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
