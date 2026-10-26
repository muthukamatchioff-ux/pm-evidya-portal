'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './video-production.module.css';
import { assignProductionPersonnel } from './actions';
import { VideoRegisterRow } from './VideoProductionClient';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  designation?: string;
}

interface AdminWorkAssignmentSectionProps {
  videoRegister: VideoRegisterRow[];
  authorizedStaff: { cameramen: StaffUser[]; editors: StaffUser[] };
  onSaveSuccess: () => Promise<void>;
  setNotification: (notif: { type: 'success' | 'error'; message: string } | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedEpicCode?: string;
  onSelectEpicCode?: (epicCode: string) => void;
}

export default function AdminWorkAssignmentSection({
  videoRegister,
  authorizedStaff,
  onSaveSuccess,
  setNotification,
  isCollapsed,
  onToggleCollapse,
  selectedEpicCode,
  onSelectEpicCode
}: AdminWorkAssignmentSectionProps) {
  // All unique valid EPIC Codes from actual persisted records
  const allEpics = useMemo(() => {
    const epics = Array.from(new Set(videoRegister.map(r => r.epicCode))).filter(e => e && e !== '-');
    return epics.sort();
  }, [videoRegister]);

  const [currentEpic, setCurrentEpic] = useState<string>(selectedEpicCode || allEpics[0] || '');

  useEffect(() => {
    if (selectedEpicCode && allEpics.includes(selectedEpicCode)) {
      setCurrentEpic(selectedEpicCode);
    } else if (allEpics.length > 0 && (!currentEpic || !allEpics.includes(currentEpic))) {
      setCurrentEpic(allEpics[0]);
    }
  }, [selectedEpicCode, allEpics, currentEpic]);

  // Rows for selected EPIC
  const epicRows = useMemo(() => {
    return videoRegister.filter(r => r.epicCode === currentEpic);
  }, [videoRegister, currentEpic]);

  // Selected EPIC Metadata
  const epicMeta = useMemo(() => {
    if (epicRows.length === 0) return null;
    const first = epicRows[0];
    return {
      workEntryId: first.epicId,
      epicCode: first.epicCode,
      epicSequence: first.epicSequence,
      month: first.month,
      trade: first.trade,
      smeName: first.smeName,
      totalTopics: epicRows.length,
      currentCameraman: first.cameraman,
      currentEditor: first.editor
    };
  }, [epicRows]);

  // Scope & Topic
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

  // Audit Reason & Loading
  const [changeReason, setChangeReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize assignees from saved data when selected EPIC changes
  useEffect(() => {
    if (epicRows.length > 0) {
      setSelectedTopicId('ALL');
      const firstRow = epicRows[0];

      // Parse current Cameramen
      const camStr = firstRow.cameraman !== '-' ? firstRow.cameraman : '';
      const existingCamNames = camStr ? camStr.split(',').map(s => s.trim().toLowerCase()) : [];
      const initialCams: StaffUser[] = [];

      existingCamNames.forEach(nameLower => {
        const found = authorizedStaff.cameramen.find(c => 
          (c.name || '').toLowerCase() === nameLower || (c.email || '').toLowerCase() === nameLower
        );
        if (found && !initialCams.some(x => x.email === found.email)) {
          initialCams.push(found);
        } else if (!initialCams.some(x => x.name.toLowerCase() === nameLower)) {
          initialCams.push({ id: `cam-${nameLower}`, name: firstRow.cameraman, email: `${nameLower}@nimi.org` });
        }
      });

      // If none currently assigned, default to first authorized Cameraman
      if (initialCams.length === 0 && authorizedStaff.cameramen.length > 0) {
        initialCams.push(authorizedStaff.cameramen[0]);
      }
      setSelectedCameramen(initialCams);

      // Parse current Editors
      const edStr = firstRow.editor !== '-' ? firstRow.editor : '';
      const existingEdNames = edStr ? edStr.split(',').map(s => s.trim().toLowerCase()) : [];
      const initialEds: StaffUser[] = [];

      existingEdNames.forEach(nameLower => {
        const found = authorizedStaff.editors.find(e => 
          (e.name || '').toLowerCase() === nameLower || (e.email || '').toLowerCase() === nameLower
        );
        if (found && !initialEds.some(x => x.email === found.email)) {
          initialEds.push(found);
        } else if (!initialEds.some(x => x.name.toLowerCase() === nameLower)) {
          initialEds.push({ id: `ed-${nameLower}`, name: firstRow.editor, email: `${nameLower}@nimi.org` });
        }
      });

      // If none currently assigned, default to first authorized Editor
      if (initialEds.length === 0 && authorizedStaff.editors.length > 0) {
        initialEds.push(authorizedStaff.editors[0]);
      }
      setSelectedEditors(initialEds);
    }
  }, [currentEpic, epicRows, authorizedStaff]);

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

  // Add & Remove handlers
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

  const handleEpicChange = (newEpic: string) => {
    setCurrentEpic(newEpic);
    if (onSelectEpicCode) {
      onSelectEpicCode(newEpic);
    }
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
      alert('Please provide a mandatory change reason (minimum 5 characters) for audit compliance.');
      return;
    }

    setSaving(true);
    try {
      const targetVideoId = scope === 'TOPIC' && selectedTopicId !== 'ALL' ? selectedTopicId : 'ALL';
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
          message: `Successfully assigned ${selectedCameramen.length} Camera Man and ${selectedEditors.length} Editor account(s) to ${epicMeta.epicCode}! Changes synchronized with user logins.`
        });
        setChangeReason('');
        await onSaveSuccess();
      } else {
        alert(res.error || 'Failed to save work assignment.');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while saving work assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.adminAssignmentCard}>
      {/* Header with Title and Toggle */}
      <div className={styles.adminAssignmentHeader}>
        <div className={styles.adminAssignmentTitleBlock}>
          <h3 className={styles.adminAssignmentTitle}>
            <span>👥</span>
            <span>Work Assignment — Multi-User Camera Man &amp; Video Editor Delegation</span>
          </h3>
          <p className={styles.adminAssignmentSubtitle}>
            Select an EPIC ID to view stored details and assign multiple registered Camera Men and Editors with real-time login synchronization
          </p>
        </div>
        <button
          type="button"
          className={styles.adminAssignmentToggleBtn}
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Work Assignment Panel' : 'Collapse Work Assignment Panel'}
        >
          {isCollapsed ? '▼ Expand Panel' : '▲ Collapse Panel'}
        </button>
      </div>

      {!isCollapsed && (
        <div className={styles.adminAssignmentBody}>
          {/* 1. EPIC ID Selection & Stored Metadata Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1' }}>
                Target EPIC ID:
              </label>
              <select
                className={styles.toolbarSelect}
                style={{ minWidth: '280px', fontWeight: 600, borderColor: '#0284c7' }}
                value={currentEpic}
                onChange={e => handleEpicChange(e.target.value)}
              >
                {allEpics.map(epic => {
                  const sampleRow = videoRegister.find(r => r.epicCode === epic);
                  const count = videoRegister.filter(r => r.epicCode === epic).length;
                  return (
                    <option key={epic} value={epic}>
                      {epic} — {sampleRow?.trade || 'General'} ({count} {count === 1 ? 'topic' : 'topics'})
                    </option>
                  );
                })}
              </select>
            </div>

            {epicMeta && (
              <div className={styles.epicDetailInfoCard}>
                <div>
                  <div className={styles.epicDetailItemLabel}>Month</div>
                  <div className={styles.epicDetailItemValue}>{epicMeta.month}</div>
                </div>
                <div>
                  <div className={styles.epicDetailItemLabel}>Trade</div>
                  <div className={styles.epicDetailItemValue}>{epicMeta.trade}</div>
                </div>
                <div>
                  <div className={styles.epicDetailItemLabel}>SME / Resource Person</div>
                  <div className={styles.epicDetailItemValue}>{epicMeta.smeName}</div>
                </div>
                <div>
                  <div className={styles.epicDetailItemLabel}>Total Videos</div>
                  <div className={styles.epicDetailItemValue}>{epicMeta.totalTopics} Topics</div>
                </div>
                <div>
                  <div className={styles.epicDetailItemLabel}>Current Camera Man</div>
                  <div className={styles.epicDetailItemValue} style={{ color: '#0284c7' }}>
                    {epicMeta.currentCameraman}
                  </div>
                </div>
                <div>
                  <div className={styles.epicDetailItemLabel}>Current Video Editor</div>
                  <div className={styles.epicDetailItemValue} style={{ color: '#7c3aed' }}>
                    {epicMeta.currentEditor}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Assignment Columns: Camera Man & Video Editor */}
          <div className={styles.assignmentColumnsGrid}>
            {/* Column A: Camera Man Assignment */}
            <div className={styles.assignmentColCard}>
              <div className={styles.assignmentColTitle}>
                <span>🎥</span>
                <span>Assign Camera Man (Shooting Stage)</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>
                  ({selectedCameramen.length} selected)
                </span>
              </div>

              {/* Multi-Select Chips Container */}
              <div className={styles.chipsContainer}>
                {selectedCameramen.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>No Camera Man selected yet</span>
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
              <span style={{ fontSize: '11px', color: '#0369a1' }}>
                ℹ️ Assigned Camera Men will see this EPIC ID in their Shooting Stage portal.
              </span>
            </div>

            {/* Column B: Video Editor Assignment */}
            <div className={styles.assignmentColCard}>
              <div className={styles.assignmentColTitle}>
                <span>✂️</span>
                <span>Assign Video Editor (Post-Production Stage)</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>
                  ({selectedEditors.length} selected)
                </span>
              </div>

              {/* Multi-Select Chips Container */}
              <div className={styles.chipsContainer}>
                {selectedEditors.length === 0 ? (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>No Video Editor selected yet</span>
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
              <span style={{ fontSize: '11px', color: '#6d28d9' }}>
                ℹ️ Assigned Video Editors will see this EPIC ID in their Post-Production portal.
              </span>
            </div>
          </div>

          {/* 3. Scope & Mandatory Audit Reason & Action Button */}
          <div className={styles.assignmentFooterBar}>
            {/* Scope Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Scope:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer', fontWeight: scope === 'EPIC' ? 600 : 400 }}>
                <input
                  type="radio"
                  name="assignScope"
                  checked={scope === 'EPIC'}
                  onChange={() => setScope('EPIC')}
                />
                Entire EPIC ({epicRows.length} Topics)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer', fontWeight: scope === 'TOPIC' ? 600 : 400 }}>
                <input
                  type="radio"
                  name="assignScope"
                  checked={scope === 'TOPIC'}
                  onChange={() => setScope('TOPIC')}
                />
                Specific Topic Only
              </label>

              {scope === 'TOPIC' && (
                <select
                  className={styles.toolbarSelect}
                  style={{ fontSize: '12px', maxWidth: '300px' }}
                  value={selectedTopicId}
                  onChange={e => setSelectedTopicId(e.target.value)}
                >
                  <option value="ALL">All Topics in this EPIC</option>
                  {epicRows.map((r, i) => (
                    <option key={r.uniqueKey} value={r.videoId}>
                      #{r.sNo}: {r.videoTitle.length > 40 ? `${r.videoTitle.slice(0, 40)}...` : r.videoTitle}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Audit Change Reason Input */}
            <div className={styles.reasonInputWrapper}>
              <input
                type="text"
                className={styles.searchInputField}
                style={{ width: '100%', fontSize: '12.5px', padding: '6px 12px', height: '36px' }}
                placeholder="Audit Change Reason (min 5 characters)... e.g., 'Initial multi-user production team assignment'"
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className={styles.assignmentActionsGroup}>
              <button
                type="button"
                className={styles.btnSave}
                style={{ height: '36px', padding: '0 18px', display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7' }}
                onClick={handleSaveAssignment}
                disabled={saving}
              >
                <span>💾</span>
                <span>{saving ? 'Saving...' : 'Save Assignment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
