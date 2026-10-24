'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './video-production.module.css';
import { 
  getTopicProductionRecords, 
  updateProductionRowDetails,
  getAuthorizedStaff,
  getProductionAuditLogs,
  detectVideoDuration
} from './actions';

// =========================================================================
// SAFE DATE & STRING HELPERS MATCHING USER'S EXACT REFERENCE UI
// =========================================================================

function formatDateForInput(dateVal: any): string {
  if (!dateVal || dateVal === '-' || dateVal === 'null') return '';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
      const d = dmy[1].padStart(2, '0');
      const m = dmy[2].padStart(2, '0');
      const y = dmy[3];
      return `${y}-${m}-${d}`;
    }
    return trimmed;
  }
  if (dateVal instanceof Date) {
    try {
      return dateVal.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    return '';
  }
  return '';
}

// Display format with dots: DD.MM.YYYY (as in 15.08.2026, 28.07.2026)
function formatDateDotDisplay(dateVal: any): string {
  if (!dateVal || dateVal === '-' || dateVal === 'null') return '-';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed || trimmed === '-' || trimmed === 'null') return '-';
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) return trimmed;
    const ymd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
      return `${ymd[3].padStart(2, '0')}.${ymd[2].padStart(2, '0')}.${ymd[1]}`;
    }
    const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmy) {
      return `${dmy[1].padStart(2, '0')}.${dmy[2].padStart(2, '0')}.${dmy[3]}`;
    }
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '-';
  }
}

// Format: EPIC-2026-PMeVidya 04, EPIC-2026-PMeVidya 03
function formatEpicCode(epicSeq: any): string {
  if (!epicSeq || epicSeq === 0 || epicSeq === '0' || epicSeq === '-') return '-';
  const num = parseInt(epicSeq, 10);
  if (isNaN(num) || num <= 0) return '-';
  return `EPIC-2026-PMeVidya ${String(num).padStart(2, '0')}`;
}

function cleanCameramanDisplay(name?: string | null): string {
  if (!name) return '-';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || lower === 'null') {
    return '-';
  }
  return trimmed;
}

function cleanEditorDisplay(name?: string | null): string {
  if (!name) return '-';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || lower === 'null' || lower === 'not assigned') {
    return '-';
  }
  return trimmed;
}

// Unified Video Row Model
export interface VideoRegisterRow {
  slNo: number;
  sNo: number;
  month: string;
  uniqueKey: string;
  videoId: string;
  displayVideoId: string;
  epicId: string;
  epicSequence: number;
  epicCode: string;
  trade: string;
  smeName: string;
  videoTitle: string;
  
  // Production / Shooting
  cameraman: string;
  shootingStatus: string;
  shootingStartDate: string | null;
  shootingEndDate: string | null;
  shootingLocation: string | null;
  productionNotes: string | null;
  
  // Post-Production / Editing
  editor: string;
  editingStatus: string;
  editingStartDate: string | null;
  editingEndDate: string | null;
  reviewComments: string | null;
  
  // Final Deliverable
  duration: string | null;
  finalVideoLink: string | null;
  hasLink: boolean;
}

export default function VideoProductionClient({ initialRecords = [], role = 'VIEWER' }: any) {
  const router = useRouter();
  const [workEntries, setWorkEntries] = useState<any[]>(initialRecords);

  // Filters State
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [filterTrade, setFilterTrade] = useState('ALL');
  const [filterEpicId, setFilterEpicId] = useState('ALL');
  const [filterShootingStatus, setFilterShootingStatus] = useState('ALL');
  const [filterEditingStatus, setFilterEditingStatus] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [onlyMyAssigned, setOnlyMyAssigned] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Work Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetRow, setAssignTargetRow] = useState<VideoRegisterRow | null>(null);
  const [assignCameraman, setAssignCameraman] = useState('');
  const [assignShootStart, setAssignShootStart] = useState('');
  const [assignShootEnd, setAssignShootEnd] = useState('');
  const [assignShootStatus, setAssignShootStatus] = useState('Completed');
  const [assignShootNotes, setAssignShootNotes] = useState('');
  const [assignEditor, setAssignEditor] = useState('');
  const [assignEditStart, setAssignEditStart] = useState('');
  const [assignEditEnd, setAssignEditEnd] = useState('');
  const [assignEditStatus, setAssignEditStatus] = useState('Completed');
  const [assignReviewComments, setAssignReviewComments] = useState('');
  const [assignVideoTitle, setAssignVideoTitle] = useState('');
  const [assignDuration, setAssignDuration] = useState('');
  const [assignVideoLink, setAssignVideoLink] = useState('');
  const [assignChangeReason, setAssignChangeReason] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // View Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsTargetRow, setDetailsTargetRow] = useState<VideoRegisterRow | null>(null);

  // Audit Logs Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Authorized Staff
  const [authorizedStaff, setAuthorizedStaff] = useState<{ cameramen: any[]; editors: any[] }>({
    cameramen: [
      { id: 'cam-parasuraman', name: 'Parasuraman', email: 'parasuraman.cam@nimi.org' },
      { id: 'cam-antony', name: 'Antony Alcander', email: 'antony.alcander@gmail.com' },
      { id: 'cam-antony-parasuraman', name: 'Antony Parasuraman', email: 'antony.parasuraman@nimi.org' }
    ],
    editors: [
      { id: 'ed-hassan-antony', name: 'Hassan & Antony', email: 'hassan.antony@nimi.org' },
      { id: 'ed-hassan', name: 'Hassan', email: 'hassan@nimi.org' },
      { id: 'ed-bala', name: 'Bala', email: 'bala@nimi.org' },
      { id: 'ed-ramaswamy', name: 'Ramaswamy', email: 'ramaswamy@nimi.org' },
      { id: 'ed-parandhaman', name: 'Parandhaman', email: 'parandhaman@nimi.org' },
      { id: 'ed-postprod', name: 'Post-Production Team', email: 'postprod@nimi.org' }
    ]
  });

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // Close month dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialRecords && initialRecords.length > 0) {
      setWorkEntries(initialRecords);
    }
  }, [initialRecords]);

  useEffect(() => {
    async function loadData() {
      const res = await getTopicProductionRecords();
      if (res.success && res.data) {
        setWorkEntries(res.data);
      }
      const staffRes = await getAuthorizedStaff();
      if (staffRes.success && staffRes.data) {
        setAuthorizedStaff(staffRes.data);
      }
    }
    loadData();
  }, []);

  // Compute 57 video register rows
  const videoRegister = useMemo<VideoRegisterRow[]>(() => {
    const rows: VideoRegisterRow[] = [];

    workEntries.forEach(entry => {
      const epicSeq = entry.epicSequence;
      const combinedVideos = entry.videoLibraries || [];
      const schedules = entry.shootingSchedules || [];
      const editors = entry.videoEditorRecords || [];
      const finals = entry.finalVideoRecords || [];

      const videoIdMap = new Map<string, { lib?: any; schedule?: any; editor?: any }>();

      combinedVideos.forEach((v: any) => {
        videoIdMap.set(v.id, { lib: v });
      });

      schedules.forEach((s: any) => {
        const rawId = s.id.replace('shoot-', '');
        if (videoIdMap.has(rawId)) {
          videoIdMap.get(rawId)!.schedule = s;
        } else {
          videoIdMap.set(s.id, { schedule: s });
        }
      });

      editors.forEach((e: any) => {
        const rawId = e.id.replace('ed-', '');
        if (videoIdMap.has(rawId)) {
          videoIdMap.get(rawId)!.editor = e;
        } else {
          videoIdMap.set(e.id, { editor: e });
        }
      });

      if (videoIdMap.size === 0) {
        videoIdMap.set(`${entry.id}-default`, {
          schedule: schedules[0],
          editor: editors[0],
          lib: combinedVideos[0]
        });
      }

      let subIdx = 1;
      videoIdMap.forEach((data, id) => {
        const lib = data.lib;
        const sched = data.schedule;
        const ed = data.editor;
        const fin = finals[0];

        let meta: any = null;
        try {
          if (sched?.productionNotes && sched.productionNotes.startsWith('{')) {
            meta = JSON.parse(sched.productionNotes);
          } else if (ed?.reviewComments && ed.reviewComments.startsWith('{')) {
            meta = JSON.parse(ed.reviewComments);
          }
        } catch (_) {}

        const vidMatch = id.match(/VID-(\d+)/i);
        const sNo = meta?.sNo ? meta.sNo : (vidMatch ? parseInt(vidMatch[1], 10) : subIdx);
        const rawVideoId = id;
        const displayVideoId = vidMatch ? `VID-${vidMatch[1]}` : `VID-${epicSeq.toString().padStart(2, '0')}-${subIdx.toString().padStart(2, '0')}`;

        const month = sched?.location || meta?.month || 'June';
        const trade = lib?.trade || entry.trade || '-';
        const smeName = lib?.smeName || entry.sme?.name || '-';
        const title = lib?.title || sched?.videoTitle || ed?.assignedVideo || entry.topic || '-';

        const shootingStartDate = sched?.scheduledStart 
          ? formatDateForInput(sched.scheduledStart) 
          : (entry.attendanceFrom ? formatDateForInput(entry.attendanceFrom) : null);
        const shootingEndDate = sched?.scheduledEnd 
          ? formatDateForInput(sched.scheduledEnd) 
          : (entry.attendanceTo ? formatDateForInput(entry.attendanceTo) : null);
        const shootingStatus = sched?.status || 'Yet to shoot';
        const cameraman = cleanCameramanDisplay(sched?.cameraman);

        const editingStartDate = ed?.editingStartDate 
          ? formatDateForInput(ed.editingStartDate) 
          : (shootingEndDate ? formatDateForInput(new Date(new Date(shootingEndDate).getTime() + 86400000)) : null);
        const editingEndDate = ed?.editingEndDate 
          ? formatDateForInput(ed.editingEndDate) 
          : (editingStartDate ? formatDateForInput(new Date(new Date(editingStartDate).getTime() + 7 * 86400000)) : null);
        const editingStatus = ed?.status || 'Pending';
        const editor = cleanEditorDisplay(ed?.editorName);

        const finalVideoLink = lib?.videoLink || ed?.finalVideoFile || fin?.finalVideoFile || null;
        const hasLink = !!finalVideoLink && finalVideoLink.trim() !== '' && finalVideoLink !== '-';
        const duration = lib?.duration || ed?.duration || fin?.finalDuration || null;

        rows.push({
          slNo: sNo,
          sNo,
          month,
          uniqueKey: `${entry.id}-${rawVideoId}`,
          videoId: rawVideoId,
          displayVideoId,
          epicId: entry.id,
          epicSequence: epicSeq,
          epicCode: formatEpicCode(epicSeq),
          trade,
          smeName,
          videoTitle: title,
          cameraman,
          shootingStatus,
          shootingStartDate,
          shootingEndDate,
          shootingLocation: sched?.location || null,
          productionNotes: sched?.productionNotes || null,
          editor,
          editingStatus,
          editingStartDate,
          editingEndDate,
          reviewComments: ed?.reviewComments || null,
          duration,
          finalVideoLink: hasLink ? finalVideoLink : null,
          hasLink
        });

        subIdx++;
      });
    });

    // Sort strictly by S.No ascending
    rows.sort((a, b) => a.sNo - b.sNo);
    return rows;
  }, [workEntries]);

  // Distinct filter lists
  const availableMonths = ['June 2026', 'July 2026', 'August 2026', 'September 2026', 'October 2026'];
  const tradesList = useMemo(() => Array.from(new Set(videoRegister.map(r => r.trade))).filter(Boolean).sort(), [videoRegister]);
  const epicsList = useMemo(() => Array.from(new Set(videoRegister.map(r => r.epicCode))).filter(e => e && e !== '-').sort(), [videoRegister]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return videoRegister.filter(row => {
      // 1. Month Multi-select filter
      if (selectedMonths.length > 0) {
        const matchesMonth = selectedMonths.some(m => m.toLowerCase().includes(row.month.toLowerCase()));
        if (!matchesMonth) return false;
      }

      // 2. Trade filter
      if (filterTrade !== 'ALL' && row.trade !== filterTrade) {
        return false;
      }

      // 3. EPIC ID filter
      if (filterEpicId !== 'ALL' && row.epicCode !== filterEpicId) {
        return false;
      }

      // 4. Status (Shooting) filter
      if (filterShootingStatus !== 'ALL') {
        const s = (row.shootingStatus || '').toLowerCase();
        const target = filterShootingStatus.toLowerCase();
        if (target === 'completed' && !s.includes('completed')) return false;
        if (target === 'pending' && !s.includes('pending')) return false;
        if (target === 'yet to shoot' && !s.includes('yet') && !s.includes('shoot')) return false;
        if (target === 'live session' && !s.includes('live')) return false;
        if (target === 'in progress' && !s.includes('progress')) return false;
      }

      // 5. Status (Editing) filter
      if (filterEditingStatus !== 'ALL') {
        const e = (row.editingStatus || '').toLowerCase();
        const target = filterEditingStatus.toLowerCase();
        if (target === 'completed' && !e.includes('completed')) return false;
        if (target === 'in progress' && !e.includes('progress') && !e.includes('process')) return false;
        if (target === 'pending' && !e.includes('pending')) return false;
      }

      // 6. Search input query
      if (activeSearch.trim()) {
        const q = activeSearch.toLowerCase().trim();
        const matches = 
          row.videoTitle.toLowerCase().includes(q) ||
          row.epicCode.toLowerCase().includes(q) ||
          row.trade.toLowerCase().includes(q) ||
          row.smeName.toLowerCase().includes(q) ||
          row.cameraman.toLowerCase().includes(q) ||
          row.editor.toLowerCase().includes(q) ||
          row.month.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 7. Role-specific filter toggle
      if (onlyMyAssigned) {
        if (role === 'CAMERAMAN') {
          const cam = row.cameraman.toLowerCase();
          if (!cam.includes('parasuraman') && !cam.includes('antony')) return false;
        } else if (role === 'EDITOR') {
          const ed = row.editor.toLowerCase();
          if (!ed.includes('hassan') && !ed.includes('bala') && !ed.includes('post')) return false;
        }
      }

      return true;
    });
  }, [videoRegister, selectedMonths, filterTrade, filterEpicId, filterShootingStatus, filterEditingStatus, activeSearch, onlyMyAssigned, role]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Handlers
  const handleToggleMonth = (monthLabel: string) => {
    setSelectedMonths(prev => {
      const exists = prev.includes(monthLabel);
      if (exists) {
        return prev.filter(m => m !== monthLabel);
      } else {
        return [...prev, monthLabel];
      }
    });
    setCurrentPage(1);
  };

  const handleSearchClick = () => {
    setActiveSearch(searchInput);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedMonths([]);
    setFilterTrade('ALL');
    setFilterEpicId('ALL');
    setFilterShootingStatus('ALL');
    setFilterEditingStatus('ALL');
    setSearchInput('');
    setActiveSearch('');
    setOnlyMyAssigned(false);
    setCurrentPage(1);
  };

  // Open Work Assignment Modal
  const handleOpenWorkAssignment = (row: VideoRegisterRow) => {
    setAssignTargetRow(row);
    setAssignCameraman(row.cameraman !== '-' ? row.cameraman : 'Parasuraman');
    setAssignShootStart(row.shootingStartDate ? formatDateForInput(row.shootingStartDate) : '');
    setAssignShootEnd(row.shootingEndDate ? formatDateForInput(row.shootingEndDate) : '');
    setAssignShootStatus(row.shootingStatus || 'Completed');
    setAssignShootNotes(row.productionNotes || '');

    setAssignEditor(row.editor !== '-' ? row.editor : 'Hassan & Antony');
    setAssignEditStart(row.editingStartDate ? formatDateForInput(row.editingStartDate) : '');
    setAssignEditEnd(row.editingEndDate ? formatDateForInput(row.editingEndDate) : '');
    setAssignEditStatus(row.editingStatus || 'Completed');
    setAssignReviewComments(row.reviewComments || '');

    setAssignVideoTitle(row.videoTitle);
    setAssignDuration(row.duration || '');
    setAssignVideoLink(row.finalVideoLink || '');
    setAssignChangeReason('');
    setIsAssignModalOpen(true);
  };

  // Save Work Assignment & Production Details
  const handleSaveWorkAssignment = async () => {
    if (!assignTargetRow) return;
    if (assignChangeReason.trim().length < 5) {
      alert('Please provide a mandatory change reason of at least 5 characters for audit compliance.');
      return;
    }

    setAssignLoading(true);
    try {
      const res = await updateProductionRowDetails({
        workEntryId: assignTargetRow.epicId,
        videoId: assignTargetRow.videoId,
        cameramanName: assignCameraman,
        shootingStartDate: assignShootStart || null,
        shootingEndDate: assignShootEnd || null,
        shootingStatus: assignShootStatus,
        shootingNotes: assignShootNotes,
        editorName: assignEditor,
        editingStartDate: assignEditStart || null,
        editingEndDate: assignEditEnd || null,
        editingStatus: assignEditStatus,
        reviewComments: assignReviewComments,
        videoTitle: assignVideoTitle,
        duration: assignDuration || null,
        finalVideoLink: assignVideoLink || null,
        changeReason: assignChangeReason.trim()
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Successfully updated work assignment and production details for ${assignTargetRow.videoTitle}!`
        });
        setIsAssignModalOpen(false);

        // Reload fresh records
        const fresh = await getTopicProductionRecords();
        if (fresh.success && fresh.data) {
          setWorkEntries(fresh.data);
        }
      } else {
        alert(res.error || 'Failed to update work assignment.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating work assignment.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = (row: VideoRegisterRow) => {
    setDetailsTargetRow(row);
    setIsDetailsModalOpen(true);
  };

  // Open Audit History Drawer
  const handleOpenAudit = async () => {
    setLoadingAudit(true);
    setIsAuditModalOpen(true);
    try {
      const res = await getProductionAuditLogs();
      if (res.success && res.data) {
        setAuditLogs(res.data);
      }
    } catch (_) {}
    setLoadingAudit(false);
  };

  // Export CSV exactly matching the 16 visible table columns
  const handleExportCsv = () => {
    const headers = [
      'S.No',
      'Month',
      'Trade',
      'SME / Resource Person',
      'Epic id',
      'Start date (Shooting)',
      'End date (Shooting)',
      'Cameraman',
      'Current Status (Shooting)',
      'Video Editor',
      'Start date (Editing)',
      'End date (Editing)',
      'Current Status (Editing)',
      'Video Topic',
      'Duration',
      'Video Link'
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const csvRows = [headers.join(',')];
    filteredRows.forEach(row => {
      csvRows.push([
        escapeCsv(row.sNo),
        escapeCsv(row.month),
        escapeCsv(row.trade),
        escapeCsv(row.smeName),
        escapeCsv(row.epicCode),
        escapeCsv(formatDateDotDisplay(row.shootingStartDate)),
        escapeCsv(formatDateDotDisplay(row.shootingEndDate)),
        escapeCsv(row.cameraman),
        escapeCsv(row.shootingStatus),
        escapeCsv(row.editor),
        escapeCsv(formatDateDotDisplay(row.editingStartDate)),
        escapeCsv(formatDateDotDisplay(row.editingEndDate)),
        escapeCsv(row.editingStatus),
        escapeCsv(row.videoTitle),
        escapeCsv(row.duration || '-'),
        escapeCsv(row.finalVideoLink || '-')
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PM_eVidya_Video_Tracker_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Badge render helpers
  const renderShootingBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('completed')) {
      return <span className={styles.pillCompleted}>Completed</span>;
    }
    if (s.includes('pending')) {
      return <span className={styles.pillPending}>Pending</span>;
    }
    if (s.includes('yet') || s.includes('shoot')) {
      return <span className={styles.pillYetToShoot}>Yet to shoot</span>;
    }
    if (s.includes('live')) {
      return <span className={styles.pillLiveSession}>LIVE SESSION</span>;
    }
    if (s.includes('progress')) {
      return <span className={styles.pillInProgress}>In Progress</span>;
    }
    return <span className={styles.pillPending}>{status || '-'}</span>;
  };

  const renderEditingBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (!status || status === '-' || s === 'null') {
      return <span>-</span>;
    }
    if (s.includes('completed')) {
      return <span className={styles.pillCompleted}>Completed</span>;
    }
    if (s.includes('progress') || s.includes('process')) {
      return <span className={styles.pillInProgress}>In Progress</span>;
    }
    if (s.includes('pending')) {
      return <span className={styles.pillPending}>Pending</span>;
    }
    return <span>{status}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
          color: notification.type === 'success' ? '#065f46' : '#991b1b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          fontWeight: 500
        }}>
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Role Notice & Quick Filter for Cameraman / Editor */}
      {(role === 'CAMERAMAN' || role === 'EDITOR') && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: '#1e40af'
        }}>
          <div>
            <strong>👤 Logged in as {role === 'CAMERAMAN' ? 'Camera Man' : 'Video Editor'}</strong>
            <span style={{ marginLeft: '8px', color: '#3b82f6' }}>
              You have authorized access to view and update your assigned {role === 'CAMERAMAN' ? 'shooting records' : 'editing records'}.
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={onlyMyAssigned} 
              onChange={e => setOnlyMyAssigned(e.target.checked)} 
            />
            Show only my assigned tasks
          </label>
        </div>
      )}

      {/* ========================================================
          1. EXACT TOOLBAR MATCHING REFERENCE SCREENSHOT
         ======================================================== */}
      <div className={styles.toolbarCard}>
        <div className={styles.toolbarRow}>
          {/* 1. Month Dropdown with Multiselect Checkboxes */}
          <div className={styles.toolbarItem} ref={monthDropdownRef}>
            <label className={styles.toolbarLabel}>Month</label>
            <div 
              className={styles.toolbarDropdownBtn} 
              onClick={() => setIsMonthDropdownOpen(prev => !prev)}
            >
              <span>
                {selectedMonths.length === 0 
                  ? 'June 2026' 
                  : selectedMonths.length === 1 
                    ? selectedMonths[0] 
                    : `${selectedMonths.length} Months`}
              </span>
              <span style={{ fontSize: '10px' }}>{isMonthDropdownOpen ? '▲' : '▼'}</span>
            </div>

            {isMonthDropdownOpen && (
              <div className={styles.dropdownPopover}>
                {availableMonths.map(m => {
                  const isChecked = selectedMonths.includes(m);
                  return (
                    <div 
                      key={m} 
                      className={styles.dropdownCheckboxItem}
                      onClick={() => handleToggleMonth(m)}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        readOnly 
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{m}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Trade Dropdown */}
          <div className={styles.toolbarItem}>
            <label className={styles.toolbarLabel}>Trade</label>
            <select 
              className={styles.toolbarSelect}
              value={filterTrade}
              onChange={e => {
                setFilterTrade(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Trades</option>
              {tradesList.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* 3. EPIC ID Dropdown */}
          <div className={styles.toolbarItem}>
            <label className={styles.toolbarLabel}>EPIC ID</label>
            <select 
              className={styles.toolbarSelect}
              value={filterEpicId}
              onChange={e => {
                setFilterEpicId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All EPIC IDs</option>
              {epicsList.map(epic => (
                <option key={epic} value={epic}>{epic}</option>
              ))}
            </select>
          </div>

          {/* 4. Status (Shooting) Dropdown */}
          <div className={styles.toolbarItem}>
            <label className={styles.toolbarLabel}>Status (Shooting)</label>
            <select 
              className={styles.toolbarSelect}
              value={filterShootingStatus}
              onChange={e => {
                setFilterShootingStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Yet to shoot">Yet to shoot</option>
              <option value="LIVE SESSION">LIVE SESSION</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>

          {/* 5. Status (Editing) Dropdown */}
          <div className={styles.toolbarItem}>
            <label className={styles.toolbarLabel}>Status (Editing)</label>
            <select 
              className={styles.toolbarSelect}
              value={filterEditingStatus}
              onChange={e => {
                setFilterEditingStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* 6. Search Input & Blue Search Button */}
          <div className={styles.searchGroup}>
            <div className={styles.searchInputWrapper}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>🔍</span>
              <input 
                type="text" 
                className={styles.searchInputField}
                placeholder="Search by Topic, EPIC ID, etc..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSearchClick();
                }}
              />
            </div>
            <button 
              className={styles.btnSearchAction} 
              onClick={handleSearchClick}
            >
              Search
            </button>
          </div>

          {/* Top Utility Actions */}
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
            {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
              <button 
                className={styles.pageSquareBtn} 
                style={{ width: 'auto', padding: '0 10px', height: '38px', gap: '6px', fontWeight: 600 }}
                onClick={() => {
                  if (paginatedRows.length > 0) {
                    handleOpenWorkAssignment(paginatedRows[0]);
                  }
                }}
                title="Open Work Assignment Modal"
              >
                <span>👤</span>
                <span>Work Assignment</span>
              </button>
            )}

            {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
              <button 
                className={styles.pageSquareBtn} 
                style={{ width: 'auto', padding: '0 10px', height: '38px', gap: '6px' }}
                onClick={handleOpenAudit}
                title="View Audit History"
              >
                <span>📜</span>
                <span>Audit</span>
              </button>
            )}

            <button 
              className={styles.pageSquareBtn} 
              style={{ width: 'auto', padding: '0 10px', height: '38px', gap: '6px' }}
              onClick={handleExportCsv}
              title="Export visible columns to CSV"
            >
              <span>⬇️</span>
              <span>CSV</span>
            </button>

            <button 
              className={styles.pageSquareBtn} 
              style={{ width: 'auto', padding: '0 10px', height: '38px', gap: '4px' }}
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <span>↺</span>
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. EXACT 16-COLUMN PRODUCTION TRACKER TABLE
         ======================================================== */}
      <div className={styles.trackerTableWrapper}>
        <table className={styles.trackerTable}>
          <thead>
            <tr>
              {/* 1 */}
              <th style={{ width: '50px' }}>S.No</th>
              {/* 2 - Highlighted in Red box as in user reference screenshot */}
              <th className={styles.monthHeaderHighlight} style={{ minWidth: '90px' }}>Month</th>
              {/* 3 */}
              <th style={{ minWidth: '130px' }}>Trade</th>
              {/* 4 */}
              <th style={{ minWidth: '150px' }}>SME / Resource Person</th>
              {/* 5 */}
              <th style={{ minWidth: '160px' }}>Epic id</th>
              {/* 6 */}
              <th style={{ minWidth: '110px' }}>Start date (Shooting)</th>
              {/* 7 */}
              <th style={{ minWidth: '110px' }}>End date (Shooting)</th>
              {/* 8 */}
              <th style={{ minWidth: '120px' }}>Cameraman</th>
              {/* 9 */}
              <th style={{ minWidth: '120px' }}>Current Status (Shooting)</th>
              {/* 10 */}
              <th style={{ minWidth: '120px' }}>Video Editor</th>
              {/* 11 */}
              <th style={{ minWidth: '110px' }}>Start date (Editing)</th>
              {/* 12 */}
              <th style={{ minWidth: '110px' }}>End date (Editing)</th>
              {/* 13 */}
              <th style={{ minWidth: '120px' }}>Current Status (Editing)</th>
              {/* 14 */}
              <th style={{ minWidth: '220px' }}>Video Topic</th>
              {/* 15 */}
              <th style={{ minWidth: '80px' }}>Duration</th>
              {/* 16 */}
              <th style={{ minWidth: '80px' }}>Video Link</th>
              {/* Actions */}
              <th style={{ minWidth: '80px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map(row => (
              <tr key={row.uniqueKey}>
                {/* 1. S.No */}
                <td style={{ fontWeight: 500, color: '#334155' }}>
                  {row.sNo}
                </td>

                {/* 2. Month (with red highlight box) */}
                <td className={styles.monthCellHighlight}>
                  {row.month}
                </td>

                {/* 3. Trade */}
                <td style={{ fontWeight: 500, color: '#1e293b' }}>
                  {row.trade}
                </td>

                {/* 4. SME / Resource Person */}
                <td style={{ color: '#334155' }}>
                  {row.smeName}
                </td>

                {/* 5. Epic id */}
                <td style={{ color: '#0f172a', fontWeight: 500 }}>
                  {row.epicCode}
                </td>

                {/* 6. Start date (Shooting) */}
                <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                  {formatDateDotDisplay(row.shootingStartDate)}
                </td>

                {/* 7. End date (Shooting) */}
                <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                  {formatDateDotDisplay(row.shootingEndDate)}
                </td>

                {/* 8. Cameraman */}
                <td style={{ color: '#1e293b' }}>
                  {row.cameraman}
                </td>

                {/* 9. Current Status (Shooting) */}
                <td>
                  {renderShootingBadge(row.shootingStatus)}
                </td>

                {/* 10. Video Editor */}
                <td style={{ color: '#1e293b' }}>
                  {row.editor}
                </td>

                {/* 11. Start date (Editing) */}
                <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                  {formatDateDotDisplay(row.editingStartDate)}
                </td>

                {/* 12. End date (Editing) */}
                <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                  {formatDateDotDisplay(row.editingEndDate)}
                </td>

                {/* 13. Current Status (Editing) */}
                <td>
                  {renderEditingBadge(row.editingStatus)}
                </td>

                {/* 14. Video Topic */}
                <td style={{ fontWeight: 500, color: '#0f172a' }}>
                  {row.videoTitle}
                </td>

                {/* 15. Duration */}
                <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                  {row.duration || '-'}
                </td>

                {/* 16. Video Link */}
                <td>
                  {row.hasLink && row.finalVideoLink ? (
                    <a 
                      href={row.finalVideoLink} 
                      target="_blank" 
                      rel="noreferrer"
                      className={styles.videoLinkText}
                      title={row.finalVideoLink}
                    >
                      Link
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </td>

                {/* 17. Actions */}
                <td>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button 
                      className={styles.actionSquareBtn}
                      onClick={() => handleOpenWorkAssignment(row)}
                      title="Work Assignment & Edit Row"
                    >
                      ✏️
                    </button>
                    <button 
                      className={styles.actionSquareBtn}
                      onClick={() => handleOpenDetails(row)}
                      title="View Details"
                    >
                      👁️
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={17} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>🔍</div>
                  <strong>No video records match the selected filters.</strong>
                  <p style={{ margin: '6px 0 0 0', fontSize: '12px' }}>
                    Click &apos;Reset&apos; in the toolbar to clear active filters and search terms.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ========================================================
            PAGINATION ROW MATCHING SCREENSHOT
           ======================================================== */}
        <div className={styles.tablePaginationBar}>
          <div>
            Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} entries
          </div>

          <div className={styles.paginationButtonsGroup}>
            <button 
              className={styles.pageSquareBtn}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page}
                className={`${styles.pageSquareBtn} ${currentPage === page ? styles.pageSquareBtnActive : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button 
              className={styles.pageSquareBtn}
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. THREE BOTTOM SUMMARY CARDS MATCHING REFERENCE SCREENSHOT
         ======================================================== */}
      <div className={styles.bottomCardsGrid}>
        {/* Card 1: Key Changes Implemented */}
        <div className={styles.cardPurple}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardIconCirclePurple}>✓</div>
            <h3 className={styles.cardTitlePurple}>Key Changes Implemented</h3>
          </div>
          <ol className={styles.cardContentList}>
            <li>Added Month column immediately after S.No (June 2026 – October 2026).</li>
            <li>Updated all 57 video records as per provided dataset.</li>
            <li>Added Month filter in the toolbar (June 2026, July 2026, August 2026, September 2026, October 2026).</li>
            <li>Maintained existing cameraman &amp; video editor login structures (no changes).</li>
            <li>Preserved all other columns, UI, workflows, permissions and functionality.</li>
          </ol>
        </div>

        {/* Card 2: Cameraman & Video Editor Login Support */}
        <div className={styles.cardBlue}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardIconCircleBlue}>👤</div>
            <h3 className={styles.cardTitleBlue}>Cameraman &amp; Video Editor Login Support</h3>
          </div>
          <ul className={styles.cardContentList} style={{ listStyleType: 'disc' }}>
            <li>Existing login structure retained</li>
            <li>No changes to user roles, permissions or access</li>
            <li>Relevant insert portions created for cameraman &amp; editor data entry</li>
            <li>Works seamlessly with the updated 16-column tracker</li>
          </ul>
        </div>

        {/* Card 3: Master Prompt */}
        <div className={styles.cardRose}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardIconCircleRose}>&lt;/&gt;</div>
            <h3 className={styles.cardTitleRose}>Master Prompt</h3>
          </div>
          <p className={styles.cardContentText}>
            Update the PM e-Vidya Video Production Tracker with the provided 57 records (June–October 2026). Add a Month column immediately after S.No, enable a Month filter, and preserve the existing 16-column structure. Keep the cameraman &amp; video editor login support structures unchanged, creating only the relevant insert portion for their data. Do not modify any other UI, headings, columns, workflows, permissions, or portal modules.
          </p>
        </div>
      </div>

      {/* ========================================================
          4. WORK ASSIGNMENT & PRODUCTION ENTRY MODAL
         ======================================================== */}
      {isAssignModalOpen && assignTargetRow && (
        <div className={styles.modalOverlay} onClick={() => setIsAssignModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '820px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  🎬 Work Assignment &amp; Production Details — S.No {assignTargetRow.sNo} ({assignTargetRow.displayVideoId})
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  <strong>{assignTargetRow.videoTitle}</strong> | {assignTargetRow.epicCode} | {assignTargetRow.trade} | SME: {assignTargetRow.smeName}
                </div>
              </div>
              <button className={styles.modalCloseBtn} onClick={() => setIsAssignModalOpen(false)}>✕</button>
            </div>

            <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Cameraman & Shooting Portion */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎥</span>
                  <span>Cameraman Portion (Shooting Assignment &amp; Schedule)</span>
                  {role === 'CAMERAMAN' && (
                    <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px' }}>
                      Your Data Entry Portion
                    </span>
                  )}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Assigned Cameraman</label>
                    <select 
                      className={styles.formSelect} 
                      value={assignCameraman} 
                      onChange={e => setAssignCameraman(e.target.value)}
                      disabled={role !== 'ADMIN' && role !== 'TEAM_MEMBER'}
                    >
                      <option value="Parasuraman">Parasuraman</option>
                      <option value="Antony Alcander">Antony Alcander</option>
                      <option value="Antony Parasuraman">Antony Parasuraman</option>
                      {authorizedStaff.cameramen.map((c: any) => (
                        <option key={c.id || c.email} value={c.name}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Current Status (Shooting)</label>
                    <select 
                      className={styles.formSelect} 
                      value={assignShootStatus} 
                      onChange={e => setAssignShootStatus(e.target.value)}
                    >
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                      <option value="Yet to shoot">Yet to shoot</option>
                      <option value="LIVE SESSION">LIVE SESSION</option>
                      <option value="In Progress">In Progress</option>
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Start Date (Shooting)</label>
                    <input 
                      type="date" 
                      className={styles.formSelect} 
                      value={assignShootStart} 
                      onChange={e => setAssignShootStart(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>End Date (Shooting)</label>
                    <input 
                      type="date" 
                      className={styles.formSelect} 
                      value={assignShootEnd} 
                      onChange={e => setAssignShootEnd(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.formLabel}>Shooting Location / Production Remarks</label>
                    <input 
                      type="text" 
                      className={styles.formSelect} 
                      placeholder="e.g. Studio - NIMI Chennai, On-site, etc." 
                      value={assignShootNotes} 
                      onChange={e => setAssignShootNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Video Editor & Post-Production Portion */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#7e22ce', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✂️</span>
                  <span>Video Editor Portion (Post-Production Assignment &amp; Editing)</span>
                  {role === 'EDITOR' && (
                    <span style={{ fontSize: '11px', background: '#faf5ff', color: '#7e22ce', padding: '2px 8px', borderRadius: '10px' }}>
                      Your Data Entry Portion
                    </span>
                  )}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Assigned Video Editor</label>
                    <select 
                      className={styles.formSelect} 
                      value={assignEditor} 
                      onChange={e => setAssignEditor(e.target.value)}
                      disabled={role !== 'ADMIN' && role !== 'TEAM_MEMBER'}
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
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Current Status (Editing)</label>
                    <select 
                      className={styles.formSelect} 
                      value={assignEditStatus} 
                      onChange={e => setAssignEditStatus(e.target.value)}
                    >
                      <option value="Completed">Completed</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Start Date (Editing)</label>
                    <input 
                      type="date" 
                      className={styles.formSelect} 
                      value={assignEditStart} 
                      onChange={e => setAssignEditStart(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>End Date (Editing)</label>
                    <input 
                      type="date" 
                      className={styles.formSelect} 
                      value={assignEditEnd} 
                      onChange={e => setAssignEditEnd(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.formLabel}>Editorial Review Comments / Quality Remarks</label>
                    <input 
                      type="text" 
                      className={styles.formSelect} 
                      placeholder="e.g. Cut review passed, color grading done, etc." 
                      value={assignReviewComments} 
                      onChange={e => setAssignReviewComments(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Video Deliverable Details */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📦</span>
                  <span>Video Deliverable Details</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.formLabel}>Video Topic / Title</label>
                    <input 
                      type="text" 
                      className={styles.formSelect} 
                      value={assignVideoTitle} 
                      onChange={e => setAssignVideoTitle(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Final Video Link</label>
                    <input 
                      type="url" 
                      className={styles.formSelect} 
                      placeholder="https://drive.google.com/... or https://youtu.be/..." 
                      value={assignVideoLink} 
                      onChange={e => setAssignVideoLink(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Duration (HH:MM:SS)</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input 
                        type="text" 
                        className={styles.formSelect} 
                        placeholder="1:20:15" 
                        value={assignDuration} 
                        onChange={e => setAssignDuration(e.target.value)}
                      />
                      <button 
                        type="button" 
                        className={styles.actionSquareBtn} 
                        style={{ height: '38px', width: '38px' }}
                        title="Auto-detect duration from link"
                        onClick={async () => {
                          if (!assignVideoLink) return;
                          const res = await detectVideoDuration(assignVideoLink);
                          if (res.success && res.duration) {
                            setAssignDuration(res.duration);
                          }
                        }}
                      >
                        ⏱️
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mandatory Audit Reason */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px' }}>
                <label className={styles.formLabel} style={{ color: '#92400e', fontWeight: 700 }}>
                  Mandatory Change Reason (Required for Audit Compliance, min 5 characters):
                </label>
                <input 
                  type="text" 
                  className={styles.formSelect} 
                  placeholder="e.g. Assigned Parasuraman for shooting, updated post-production dates" 
                  value={assignChangeReason} 
                  onChange={e => setAssignChangeReason(e.target.value)}
                  style={{ borderColor: assignChangeReason.trim().length >= 5 ? '#10b981' : '#f59e0b' }}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button 
                className={styles.btnCancel} 
                onClick={() => setIsAssignModalOpen(false)}
                disabled={assignLoading}
              >
                Cancel
              </button>
              <button 
                className={styles.btnSave} 
                onClick={handleSaveWorkAssignment}
                disabled={assignLoading || assignChangeReason.trim().length < 5}
              >
                {assignLoading ? 'Saving...' : '💾 Save & Update Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. VIEW DETAILS MODAL
         ======================================================== */}
      {isDetailsModalOpen && detailsTargetRow && (
        <div className={styles.modalOverlay} onClick={() => setIsDetailsModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                👁️ Video Details — S.No {detailsTargetRow.sNo}
              </h3>
              <button className={styles.modalCloseBtn} onClick={() => setIsDetailsModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b', width: '180px' }}>Video Topic:</td>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#0f172a' }}>{detailsTargetRow.videoTitle}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Month:</td>
                    <td style={{ padding: '8px', color: '#b91c1c', fontWeight: 600 }}>{detailsTargetRow.month} 2026</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Epic ID:</td>
                    <td style={{ padding: '8px' }}>{detailsTargetRow.epicCode}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Trade:</td>
                    <td style={{ padding: '8px' }}>{detailsTargetRow.trade}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>SME / Resource Person:</td>
                    <td style={{ padding: '8px' }}>{detailsTargetRow.smeName}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Cameraman:</td>
                    <td style={{ padding: '8px' }}>{detailsTargetRow.cameraman}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Shooting Dates:</td>
                    <td style={{ padding: '8px' }}>
                      {formatDateDotDisplay(detailsTargetRow.shootingStartDate)} to {formatDateDotDisplay(detailsTargetRow.shootingEndDate)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Shooting Status:</td>
                    <td style={{ padding: '8px' }}>{renderShootingBadge(detailsTargetRow.shootingStatus)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Video Editor:</td>
                    <td style={{ padding: '8px' }}>{detailsTargetRow.editor}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Editing Dates:</td>
                    <td style={{ padding: '8px' }}>
                      {formatDateDotDisplay(detailsTargetRow.editingStartDate)} to {formatDateDotDisplay(detailsTargetRow.editingEndDate)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Editing Status:</td>
                    <td style={{ padding: '8px' }}>{renderEditingBadge(detailsTargetRow.editingStatus)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Duration:</td>
                    <td style={{ padding: '8px' }}>{detailsTargetRow.duration || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 600, color: '#64748b' }}>Video Link:</td>
                    <td style={{ padding: '8px' }}>
                      {detailsTargetRow.finalVideoLink ? (
                        <a 
                          href={detailsTargetRow.finalVideoLink} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: '#0070f3', textDecoration: 'underline' }}
                        >
                          {detailsTargetRow.finalVideoLink}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.btnSave} 
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  handleOpenWorkAssignment(detailsTargetRow);
                }}
              >
                ✏️ Edit / Assign Work
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. AUDIT HISTORY DRAWER / MODAL
         ======================================================== */}
      {isAuditModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsAuditModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                📜 Persistent Video Production Audit History
              </h3>
              <button className={styles.modalCloseBtn} onClick={() => setIsAuditModalOpen(false)}>✕</button>
            </div>
            <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {loadingAudit ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading audit trail...</div>
              ) : auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No audit logs recorded yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className={styles.auditLogCard}>
                      <div className={styles.auditLogTop}>
                        <span className={styles.auditActionBadge}>{log.action}</span>
                        <span className={styles.auditUserBadge}>👤 {log.user?.name || log.user?.email || 'System User'}</span>
                        <span className={styles.auditTimestamp}>
                          {new Date(log.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className={styles.auditReasonBox}>
                        <strong>Reason: </strong>
                        <span>
                          {(() => {
                            try {
                              const parsed = JSON.parse(log.newData || '{}');
                              return parsed.changeReason || 'System assignment update';
                            } catch {
                              return 'Update logged';
                            }
                          })()}
                        </span>
                      </div>
                      <pre className={styles.auditDetailsPre}>
                        {log.newData}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setIsAuditModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
