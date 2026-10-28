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
  initialTab?: 'ASSIGN' | 'UNASSIGNED' | 'ASSIGNED';
  initialTopicId?: string;
  onSaveSuccess: () => Promise<void>;
  setNotification: (notif: { type: 'success' | 'error'; message: string } | null) => void;
}

export default function AdminWorkAssignmentModal({
  isOpen,
  onClose,
  videoRegister,
  authorizedStaff,
  initialEpicCode,
  initialTab = 'ASSIGN',
  initialTopicId,
  onSaveSuccess,
  setNotification
}: AdminWorkAssignmentModalProps) {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'ASSIGN' | 'UNASSIGNED' | 'ASSIGNED'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

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

  // Scope & Topic states
  const [scope, setScope] = useState<'EPIC' | 'TOPIC'>('EPIC');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || 'ALL');

  useEffect(() => {
    if (initialTopicId) {
      setSelectedTopicId(initialTopicId);
      setScope('TOPIC');
    }
  }, [initialTopicId]);

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

  // Unassigned tab filters
  const [unassignedSubFilter, setUnassignedSubFilter] = useState<'ALL' | 'MISSING_CAM' | 'MISSING_ED' | 'COMPLETELY_UNASSIGNED'>('ALL');
  const [unassignedMonthFilter, setUnassignedMonthFilter] = useState('ALL');
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('');

  // Assigned tab search
  const [assignedSearchQuery, setAssignedSearchQuery] = useState('');

  // Helper: Determine assignment status
  const isCameramanAssigned = (cam?: string | null) => {
    if (!cam) return false;
    const trimmed = cam.trim().toLowerCase();
    return trimmed !== '' && trimmed !== '-' && trimmed !== '—' && trimmed !== 'null';
  };

  const isEditorAssigned = (ed?: string | null) => {
    if (!ed) return false;
    const trimmed = ed.trim().toLowerCase();
    return trimmed !== '' && trimmed !== '-' && trimmed !== '—' && trimmed !== 'null' && trimmed !== 'not assigned';
  };

  // Full Unassigned & Partially Assigned Rows
  const allUnassignedRows = useMemo(() => {
    return videoRegister.filter(r => {
      const hasCam = isCameramanAssigned(r.cameraman);
      const hasEd = isEditorAssigned(r.editor);
      return !hasCam || !hasEd;
    });
  }, [videoRegister]);

  // Filtered Unassigned Rows
  const filteredUnassignedRows = useMemo(() => {
    return allUnassignedRows.filter(r => {
      const hasCam = isCameramanAssigned(r.cameraman);
      const hasEd = isEditorAssigned(r.editor);

      if (unassignedSubFilter === 'MISSING_CAM' && hasCam) return false;
      if (unassignedSubFilter === 'MISSING_ED' && hasEd) return false;
      if (unassignedSubFilter === 'COMPLETELY_UNASSIGNED' && (hasCam || hasEd)) return false;

      if (unassignedMonthFilter !== 'ALL' && !r.month.toLowerCase().includes(unassignedMonthFilter.toLowerCase())) {
        return false;
      }

      if (unassignedSearchQuery.trim()) {
        const q = unassignedSearchQuery.toLowerCase().trim();
        const matches =
          r.videoTitle.toLowerCase().includes(q) ||
          r.epicCode.toLowerCase().includes(q) ||
          r.trade.toLowerCase().includes(q) ||
          r.smeName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allUnassignedRows, unassignedSubFilter, unassignedMonthFilter, unassignedSearchQuery]);

  // Assigned Work Groups
  const assignedEpicGroups = useMemo(() => {
    const groupsMap = new Map<string, { epicCode: string; month: string; trade: string; smeName: string; cameraman: string; editor: string; totalTopics: number; assignedTopics: number }>();

    videoRegister.forEach(r => {
      const epic = r.epicCode;
      if (!epic || epic === '-' || epic === '—') return;
      if (!groupsMap.has(epic)) {
        groupsMap.set(epic, {
          epicCode: epic,
          month: r.month,
          trade: r.trade,
          smeName: r.smeName,
          cameraman: r.cameraman,
          editor: r.editor,
          totalTopics: 0,
          assignedTopics: 0
        });
      }
      const g = groupsMap.get(epic)!;
      g.totalTopics++;
      if (isCameramanAssigned(r.cameraman) && isEditorAssigned(r.editor)) {
        g.assignedTopics++;
      }
    });

    return Array.from(groupsMap.values()).filter(g => g.assignedTopics > 0);
  }, [videoRegister]);

  const filteredAssignedGroups = useMemo(() => {
    if (!assignedSearchQuery.trim()) return assignedEpicGroups;
    const q = assignedSearchQuery.toLowerCase().trim();
    return assignedEpicGroups.filter(g =>
      g.epicCode.toLowerCase().includes(q) ||
      g.trade.toLowerCase().includes(q) ||
      g.smeName.toLowerCase().includes(q) ||
      g.cameraman.toLowerCase().includes(q) ||
      g.editor.toLowerCase().includes(q)
    );
  }, [assignedEpicGroups, assignedSearchQuery]);

  // Initialize assignees from saved data when selected EPIC changes
  useEffect(() => {
    if (epicRows.length > 0) {
      const firstRow = epicRows[0];

      // Parse Cameramen
      const camStr = isCameramanAssigned(firstRow.cameraman) ? firstRow.cameraman : '';
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
      setSelectedCameramen(initialCams);

      // Parse Editors
      const edStr = isEditorAssigned(firstRow.editor) ? firstRow.editor : '';
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

  // Quick Assign from Unassigned List
  const handleQuickAssign = (row: any) => {
    setSelectedEpic(row.epicCode);
    setScope('TOPIC');
    setSelectedTopicId(row.videoId);
    setActiveTab('ASSIGN');
  };

  // Reassign from Assigned List
  const handleEditReassign = (epicCode: string) => {
    setSelectedEpic(epicCode);
    setScope('EPIC');
    setSelectedTopicId('ALL');
    setActiveTab('ASSIGN');
  };

  const handleSaveAssignment = async () => {
    if (!epicMeta) return;

    if (selectedCameramen.length === 0 && selectedEditors.length === 0) {
      alert('Please select at least one Camera Man or Video Editor account.');
      return;
    }

    const finalReason = (changeReason && changeReason.trim().length >= 5)
      ? changeReason.trim()
      : 'Admin work assignment';

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
        changeReason: finalReason
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Successfully saved assignment for ${epicMeta.epicCode}! Data reflected across Admin, Cameraman & Editor portals.`
        });
        await onSaveSuccess();
        setChangeReason('');
        // Switch to Assigned Work tab so user immediately sees their saved assignment
        setActiveTab('ASSIGNED');
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
      <div className={styles.modalContent} style={{ maxWidth: '980px', width: '95%' }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>
              {activeTab === 'UNASSIGNED' && '📋 Unassigned & Partially Assigned Work Queue'}
              {activeTab === 'ASSIGN' && '👤 Admin Work Assignment — Cameraman & Video Editor'}
              {activeTab === 'ASSIGNED' && '✅ Assigned Production Work Overview'}
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              EPIC-based personnel assignment with real-time database synchronization &amp; audit logging
            </p>
          </div>
          <button className={styles.modalCloseBtn} onClick={onClose} title="Close">✕</button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className={styles.modalTabsBar}>
          <button
            type="button"
            className={`${styles.modalTabItem} ${activeTab === 'UNASSIGNED' ? styles.modalTabItemActive : ''}`}
            onClick={() => setActiveTab('UNASSIGNED')}
          >
            <span>📋</span>
            <span>Unassigned Work</span>
            <span className={styles.unassignedCountBadge}>
              {allUnassignedRows.length}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.modalTabItem} ${activeTab === 'ASSIGN' ? styles.modalTabItemActive : ''}`}
            onClick={() => setActiveTab('ASSIGN')}
          >
            <span>👤</span>
            <span>Assign / Reassign Staff</span>
          </button>

          <button
            type="button"
            className={`${styles.modalTabItem} ${activeTab === 'ASSIGNED' ? styles.modalTabItemActive : ''}`}
            onClick={() => setActiveTab('ASSIGNED')}
          >
            <span>✅</span>
            <span>Assigned Work ({assignedEpicGroups.length} EPICs)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.modalBody} style={{ maxHeight: '72vh', overflowY: 'auto', padding: '16px 20px' }}>
          
          {/* =========================================================
              TAB 1: UNASSIGNED WORK LIST (REQUIREMENT 3)
             ========================================================= */}
          {activeTab === 'UNASSIGNED' && (
            <div>
              {/* Filter controls row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`${styles.unassignedFilterChip} ${unassignedSubFilter === 'ALL' ? styles.unassignedFilterChipActive : ''}`}
                    onClick={() => setUnassignedSubFilter('ALL')}
                  >
                    All Pending ({allUnassignedRows.length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.unassignedFilterChip} ${unassignedSubFilter === 'MISSING_CAM' ? styles.unassignedFilterChipActive : ''}`}
                    onClick={() => setUnassignedSubFilter('MISSING_CAM')}
                  >
                    Missing Cameraman ({allUnassignedRows.filter(r => !isCameramanAssigned(r.cameraman)).length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.unassignedFilterChip} ${unassignedSubFilter === 'MISSING_ED' ? styles.unassignedFilterChipActive : ''}`}
                    onClick={() => setUnassignedSubFilter('MISSING_ED')}
                  >
                    Missing Editor ({allUnassignedRows.filter(r => !isEditorAssigned(r.editor)).length})
                  </button>
                  <button
                    type="button"
                    className={`${styles.unassignedFilterChip} ${unassignedSubFilter === 'COMPLETELY_UNASSIGNED' ? styles.unassignedFilterChipActive : ''}`}
                    onClick={() => setUnassignedSubFilter('COMPLETELY_UNASSIGNED')}
                  >
                    Completely Unassigned ({allUnassignedRows.filter(r => !isCameramanAssigned(r.cameraman) && !isEditorAssigned(r.editor)).length})
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    className={styles.toolbarSelect}
                    style={{ fontSize: '12px', height: '32px' }}
                    value={unassignedMonthFilter}
                    onChange={e => setUnassignedMonthFilter(e.target.value)}
                  >
                    <option value="ALL">All Months</option>
                    <option value="June">June 2026</option>
                    <option value="July">July 2026</option>
                    <option value="August">August 2026</option>
                    <option value="September">September 2026</option>
                    <option value="October">October 2026</option>
                  </select>

                  <input
                    type="text"
                    className={styles.searchInputField}
                    style={{ height: '32px', fontSize: '12px', padding: '0 10px', width: '200px' }}
                    placeholder="Search unassigned..."
                    value={unassignedSearchQuery}
                    onChange={e => setUnassignedSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Unassigned Work Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', background: '#ffffff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>EPIC ID</th>
                      <th style={{ padding: '10px 8px' }}>Month</th>
                      <th style={{ padding: '10px 10px' }}>Trade</th>
                      <th style={{ padding: '10px 12px' }}>SME / Resource Person</th>
                      <th style={{ padding: '10px 12px', minWidth: '220px' }}>Video Topic</th>
                      <th style={{ padding: '10px 10px' }}>Shooting Status</th>
                      <th style={{ padding: '10px 10px' }}>Cameraman Status</th>
                      <th style={{ padding: '10px 10px' }}>Editor Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnassignedRows.map(row => {
                      const hasCam = isCameramanAssigned(row.cameraman);
                      const hasEd = isEditorAssigned(row.editor);

                      return (
                        <tr key={row.uniqueKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0369a1', whiteSpace: 'nowrap' }}>
                            {row.epicCode}
                          </td>
                          <td style={{ padding: '10px 8px', color: '#64748b' }}>
                            {row.month}
                          </td>
                          <td style={{ padding: '10px 10px', fontWeight: 500, color: '#334155' }}>
                            {row.trade}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#1e293b' }}>
                            {row.smeName}
                          </td>
                          <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: 500 }}>
                            {row.videoTitle}
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <span style={{ fontSize: '11px', color: '#475569' }}>{row.shootingStatus}</span>
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            {hasCam ? (
                              <span className={styles.statusBadgeAssigned}>
                                ✓ {row.cameraman}
                              </span>
                            ) : (
                              <span className={styles.statusBadgeUnassigned}>
                                ⚠️ Not Assigned
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            {hasEd ? (
                              <span className={styles.statusBadgeAssigned}>
                                ✓ {row.editor}
                              </span>
                            ) : (
                              <span className={styles.statusBadgeUnassigned}>
                                ⚠️ Not Assigned
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              className={styles.quickAssignActionBtn}
                              onClick={() => handleQuickAssign(row)}
                              title="Assign staff to this record"
                            >
                              <span>⚡</span>
                              <span>Assign</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredUnassignedRows.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
                          <strong>All filtered records are completely assigned!</strong>
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                            There are no pending or unassigned videos matching the selected criteria.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 2: ASSIGN / REASSIGN FORM (REQUIREMENT 2)
             ========================================================= */}
          {activeTab === 'ASSIGN' && (
            <div>
              {/* 1. EPIC ID Selection & Metadata */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <label className={styles.formLabel} style={{ fontWeight: 700, color: '#0369a1' }}>
                      Select Target EPIC ID:
                    </label>
                    <select
                      className={styles.toolbarSelect}
                      style={{ minWidth: '320px', fontWeight: 600, borderColor: '#0284c7' }}
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
          )}

          {/* =========================================================
              TAB 3: ASSIGNED WORK OVERVIEW (REQUIREMENT 5)
             ========================================================= */}
          {activeTab === 'ASSIGNED' && (
            <div>
              {/* Search bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Showing {filteredAssignedGroups.length} assigned EPIC production groups
                </div>
                <input
                  type="text"
                  className={styles.searchInputField}
                  style={{ height: '32px', fontSize: '12px', padding: '0 10px', width: '240px' }}
                  placeholder="Search assigned EPICs..."
                  value={assignedSearchQuery}
                  onChange={e => setAssignedSearchQuery(e.target.value)}
                />
              </div>

              {/* Assigned Groups Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto', background: '#ffffff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>EPIC ID</th>
                      <th style={{ padding: '10px 10px' }}>Month</th>
                      <th style={{ padding: '10px 12px' }}>Trade</th>
                      <th style={{ padding: '10px 12px' }}>SME / Resource Person</th>
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>Total Topics</th>
                      <th style={{ padding: '10px 12px' }}>Assigned Cameraman</th>
                      <th style={{ padding: '10px 12px' }}>Assigned Video Editor</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignedGroups.map(g => (
                      <tr key={g.epicCode} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0369a1', whiteSpace: 'nowrap' }}>
                          {g.epicCode}
                        </td>
                        <td style={{ padding: '10px 10px', color: '#64748b' }}>
                          {g.month}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 500, color: '#334155' }}>
                          {g.trade}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#1e293b' }}>
                          {g.smeName}
                        </td>
                        <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 600 }}>
                          {g.totalTopics}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {isCameramanAssigned(g.cameraman) ? (
                            <span className={styles.statusBadgeAssigned}>
                              🎥 {g.cameraman}
                            </span>
                          ) : (
                            <span className={styles.statusBadgeUnassigned}>
                              ⚠️ Not Assigned
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {isEditorAssigned(g.editor) ? (
                            <span className={styles.statusBadgeAssigned} style={{ background: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }}>
                              ✂️ {g.editor}
                            </span>
                          ) : (
                            <span className={styles.statusBadgeUnassigned}>
                              ⚠️ Not Assigned
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className={styles.quickAssignActionBtn}
                            style={{ background: '#f8fafc', color: '#0369a1', borderColor: '#cbd5e1' }}
                            onClick={() => handleEditReassign(g.epicCode)}
                            title="Edit or Reassign staff for this EPIC"
                          >
                            <span>✏️</span>
                            <span>Edit / Reassign</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredAssignedGroups.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          <strong>No assigned production groups found.</strong>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose} disabled={saving}>
            Close
          </button>
          {activeTab === 'ASSIGN' && (
            <button className={styles.btnSave} onClick={handleSaveAssignment} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save & Synchronize Assignment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
