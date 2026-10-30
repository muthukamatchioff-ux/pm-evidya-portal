'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './video-production.module.css';
import { 
  getTopicProductionRecords, 
  updateProductionRowDetails,
  getAuthorizedStaff,
  getProductionAuditLogs,
  detectVideoDuration,
  saveCameramanShootingEntry,
  saveEditorPostProductionEntry,
  assignProductionPersonnel,
  deleteProductionEntry
} from './actions';
import CameramanPortal from './CameramanPortal';
import VideoEditorPortal from './VideoEditorPortal';

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
// Display format with dots: DD.MM.YYYY (as in 15.08.2026, 28.07.2026)
function formatDateDotDisplay(dateVal: any): string {
  if (!dateVal || dateVal === '-' || dateVal === '—' || dateVal === 'null') return '—';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'null') return '—';
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
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '—';
  }
}

// Format: EPIC-2026-PMeVidya 04, EPIC-2026-PMeVidya 03
function formatEpicCode(epicSeq: any): string {
  if (!epicSeq || epicSeq === 0 || epicSeq === '0' || epicSeq === '-' || epicSeq === '—') return '—';
  const num = parseInt(epicSeq, 10);
  if (isNaN(num) || num <= 0) return '—';
  return `EPIC-2026-PMeVidya ${String(num).padStart(2, '0')}`;
}

function getCanonicalMonthForEpic(epicSeq: number): string {
  switch (epicSeq) {
    case 4: return 'June';
    case 1:
    case 2:
    case 3: return 'July';
    case 5:
    case 6:
    case 8:
    case 10: return 'August';
    case 11:
    case 12:
    case 15: return 'September';
    case 16:
    case 17: return 'October';
    default: return 'June';
  }
}

function cleanCameramanDisplay(name?: string | null): string {
  if (!name) return '—';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || trimmed === '—' || lower === 'null') {
    return '—';
  }
  return trimmed;
}

function cleanEditorDisplay(name?: string | null): string {
  if (!name) return '—';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || trimmed === '—' || lower === 'null' || lower === 'not assigned') {
    return '—';
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
  submissionStatus: string;
  submittedAt?: string | null;
  adminReviewComments?: string | null;
  editorialComments?: string | null;
  editingStartDate: string | null;
  editingEndDate: string | null;
  reviewComments: string | null;
  
  // Final Deliverable
  duration: string | null;
  finalVideoLink: string | null;
  hasLink: boolean;
}

export default function VideoProductionClient({ initialRecords = [], role = 'VIEWER', currentUser = null }: any) {
  const router = useRouter();
  const [workEntries, setWorkEntries] = useState<any[]>(initialRecords);
  const [viewOverallTrackerAsStaff, setViewOverallTrackerAsStaff] = useState(false);
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');

  useEffect(() => {
    if (currentTab === 'TRACKER') {
      setViewOverallTrackerAsStaff(true);
    } else if (currentTab && ['SHOOTING_ENTRY', 'POST_PRODUCTION_ENTRY', 'DASHBOARD', 'ASSIGNMENTS', 'PROFILE'].includes(currentTab)) {
      setViewOverallTrackerAsStaff(false);
    }
  }, [currentTab]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.tab === 'TRACKER') {
        setViewOverallTrackerAsStaff(true);
      } else {
        setViewOverallTrackerAsStaff(false);
      }
    };
    window.addEventListener('portalTabChange', handler);
    return () => window.removeEventListener('portalTabChange', handler);
  }, []);


  const broadcastSync = () => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('pmevidya_video_production_sync');
        channel.postMessage({ type: 'RECORD_SAVED', timestamp: Date.now() });
        channel.close();
      } catch (_) {}
    }
  };

  const refreshTopicRecords = async () => {
    const res = await getTopicProductionRecords();
    if (res.success && res.data) {
      setWorkEntries(res.data);
    }
    const staffRes = await getAuthorizedStaff();
    if (staffRes.success && staffRes.data) {
      setAuthorizedStaff(staffRes.data);
    }
  };

  // Real-time synchronization: BroadcastChannel + visibilitychange + focus + 5-second polling interval
  useEffect(() => {
    refreshTopicRecords();

    // 1. Cross-tab synchronization via BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('pmevidya_video_production_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'RECORD_SAVED') {
            refreshTopicRecords();
          }
        };
      }
    } catch (_) {}

    // 2. Tab focus & visibility change listener
    const handleActive = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshTopicRecords();
      }
    };
    window.addEventListener('visibilitychange', handleActive);
    window.addEventListener('focus', handleActive);

    // 3. Periodic background polling (every 5 seconds when tab is active/visible)
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshTopicRecords();
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleActive);
      window.removeEventListener('focus', handleActive);
      if (channel) channel.close();
    };
  }, []);

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
  const [viewFilter, setViewFilter] = useState<'COMPLETED' | 'ALL'>('COMPLETED');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(100);

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

  const isAdmin = role === 'ADMIN' || role === 'TEAM_MEMBER';
  const [activeStageTab, setActiveStageTab] = useState<'SHOOTING' | 'POST_PRODUCTION'>('SHOOTING');

  const handleStageTabClick = (stage: 'SHOOTING' | 'POST_PRODUCTION') => {
    setActiveStageTab(stage);
  };

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

  // Compute 76 video register rows matching Untitled spreadsheet.xlsx
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
          // If rawId doesn't match directly, try to attach by title to an existing video in videoIdMap
          let attached = false;
          const sTitle = (s.videoTitle || '').trim().toLowerCase();
          if (sTitle) {
            for (const [, val] of videoIdMap) {
              if (val.lib?.title && val.lib.title.trim().toLowerCase() === sTitle) {
                val.schedule = s;
                attached = true;
                break;
              }
            }
          }
          if (!attached) {
            videoIdMap.set(s.id, { schedule: s });
          }
        }
      });

      editors.forEach((e: any) => {
        const rawId = e.id.replace('ed-', '');
        if (videoIdMap.has(rawId)) {
          videoIdMap.get(rawId)!.editor = e;
        } else {
          // If rawId doesn't match directly, try to attach by title to an existing video in videoIdMap
          let attached = false;
          const eTitle = (e.assignedVideo || '').trim().toLowerCase();
          if (eTitle) {
            for (const [, val] of videoIdMap) {
              if ((val.lib?.title && val.lib.title.trim().toLowerCase() === eTitle) ||
                  (val.schedule?.videoTitle && val.schedule.videoTitle.trim().toLowerCase() === eTitle)) {
                val.editor = e;
                attached = true;
                break;
              }
            }
          }
          if (!attached) {
            videoIdMap.set(e.id, { editor: e });
          }
        }
      });

      if (videoIdMap.size === 0) {
        return;
      }

      let subIdx = 1;
      videoIdMap.forEach((data, id) => {
        const lib = data.lib;
        const sched = data.schedule;
        const ed = data.editor;
        const fin = finals[0];

        if (!lib && !sched && !ed) return;

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

        const month = sched?.location || meta?.month || getCanonicalMonthForEpic(epicSeq);
        const trade = lib?.trade || entry.trade || '-';
        const smeName = lib?.smeName || entry.sme?.name || '-';
        const title = lib?.title || sched?.videoTitle || ed?.assignedVideo || entry.topic || '-';

        const shootingStartDate = sched?.scheduledStart ? formatDateForInput(sched.scheduledStart) : null;
        const shootingEndDate = sched?.scheduledEnd ? formatDateForInput(sched.scheduledEnd) : null;
        const shootingStatus = sched?.status || 'Yet to shoot';
        const cameraman = cleanCameramanDisplay(sched?.cameraman);

        const editingStartDate = ed?.editingStartDate ? formatDateForInput(ed.editingStartDate) : null;
        const editingEndDate = ed?.editingEndDate ? formatDateForInput(ed.editingEndDate) : null;
        const editingStatus = ed?.status || 'Pending';
        const editor = cleanEditorDisplay(ed?.editorName);

        const finalVideoLink = lib?.videoLink || ed?.finalVideoFile || fin?.finalVideoFile || null;
        const hasLink = !!finalVideoLink && finalVideoLink.trim() !== '' && finalVideoLink !== '-';
        const duration = lib?.duration || ed?.duration || fin?.finalDuration || null;

        const editStatusLower = (editingStatus || '').toLowerCase();
        let submissionStatus = meta?.submissionStatus;
        if (!submissionStatus) {
          if (entry.isPublished || (editStatusLower === 'completed' && hasLink)) {
            submissionStatus = entry.isPublished ? 'Admin Approved' : 'Completed';
          } else if (editStatusLower.includes('progress') || editStatusLower.includes('process')) {
            submissionStatus = 'In Progress';
          } else {
            submissionStatus = 'Pending';
          }
        }

        rows.push({
          slNo: sNo,
          sNo,
          month,
          uniqueKey: `${entry.id}-${rawVideoId}`,
          videoId: rawVideoId,
          displayVideoId,
          epicId: entry.id,
          epicSequence: epicSeq,
          epicCode: meta?.epicCode && meta.epicCode !== 'NA' && meta.epicCode !== '-' ? meta.epicCode : formatEpicCode(epicSeq),
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
          submissionStatus,
          submittedAt: meta?.submittedAt || null,
          adminReviewComments: meta?.adminReviewComments || null,
          editorialComments: meta?.remarks || (ed?.reviewComments && !ed.reviewComments.startsWith('{') ? ed.reviewComments : null),
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

    // 1. Deduplicate strictly by video topic (case-insensitive trimmed):
    // Delete all duplicate entries based on video topic so actual entries are 76 canonical topics only
    const seenTopics = new Set<string>();
    const deduplicatedRows: VideoRegisterRow[] = [];

    // Prioritize rows with actual assigned staff, dates, and canonical VID- IDs
    rows.sort((a, b) => {
      const aHasStaff = ((a.cameraman && a.cameraman !== '—' && a.cameraman !== '-') || (a.editor && a.editor !== '—' && a.editor !== '-')) ? 1 : 0;
      const bHasStaff = ((b.cameraman && b.cameraman !== '—' && b.cameraman !== '-') || (b.editor && b.editor !== '—' && b.editor !== '-')) ? 1 : 0;
      if (aHasStaff !== bHasStaff) return bHasStaff - aHasStaff;

      const aHasDates = (a.shootingStartDate || a.editingStartDate) ? 1 : 0;
      const bHasDates = (b.shootingStartDate || b.editingStartDate) ? 1 : 0;
      if (aHasDates !== bHasDates) return bHasDates - aHasDates;

      const aIsVid = a.videoId.startsWith('VID-') ? 1 : 0;
      const bIsVid = b.videoId.startsWith('VID-') ? 1 : 0;
      return bIsVid - aIsVid;
    });

    for (const r of rows) {
      const normTitle = (r.videoTitle || '').trim().toLowerCase();
      if (!normTitle || normTitle === '-' || normTitle === '—') continue;
      if (seenTopics.has(normTitle)) {
        continue; // Discard duplicate topic entry
      }
      seenTopics.add(normTitle);
      deduplicatedRows.push(r);
    }

    // 2. Sort by latest EPIC ID first:
    // Month descending (October -> September -> August -> July -> June),
    // then epicSequence descending (17 -> 16 -> 15 -> 12 -> 11 -> 10 -> 8 -> 6 -> 5 -> 4 -> 3 -> 2 -> 1),
    // then video sequence within that EPIC.
    // This ensures:
    // - Every EPIC ID has ALL its video details together in one place ("oru epic id na athoda motha videos detailum ore idathula than irukkanum")
    // - Latest EPIC IDs are shown first ("show aagurathu epic id latest based kamikkanum")
    const monthOrder: Record<string, number> = {
      'october': 5,
      'september': 4,
      'august': 3,
      'july': 2,
      'june': 1
    };

    deduplicatedRows.sort((a, b) => {
      const aMonthWeight = monthOrder[(a.month || '').toLowerCase()] || 0;
      const bMonthWeight = monthOrder[(b.month || '').toLowerCase()] || 0;
      if (aMonthWeight !== bMonthWeight) {
        return bMonthWeight - aMonthWeight; // Latest Month first (October down to June)
      }
      if (b.epicSequence !== a.epicSequence) {
        return b.epicSequence - a.epicSequence; // Latest EPIC ID first within month
      }
      return a.sNo - b.sNo; // Video order within that EPIC
    });

    return deduplicatedRows;
  }, [workEntries]);

  // Computed KPI Summary Statistics (derived strictly from actual 57 persisted records, no double counting)
  const dashboardKpis = useMemo(() => {
    const total = videoRegister.length;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    videoRegister.forEach(r => {
      const edStatus = (r.editingStatus || '').toLowerCase();
      const shootStatus = (r.shootingStatus || '').toLowerCase();

      if (edStatus.includes('completed') || r.hasLink) {
        completed++;
      } else if (
        shootStatus.includes('completed') ||
        shootStatus.includes('in progress') ||
        edStatus.includes('in progress')
      ) {
        inProgress++;
      } else {
        pending++;
      }
    });

    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

    return {
      total,
      completed,
      inProgress,
      pending,
      completionRate
    };
  }, [videoRegister]);

  // Month-wise Production Summary (June-October 2026 from actual saved records)
  const monthBreakdown = useMemo(() => {
    const months = ['June 2026', 'July 2026', 'August 2026', 'September 2026', 'October 2026'];
    return months.map(mLabel => {
      const baseMonth = mLabel.split(' ')[0].toLowerCase();
      const monthRows = videoRegister.filter(r => (r.month || '').toLowerCase().includes(baseMonth));
      const total = monthRows.length;
      let completed = 0;
      let inProgress = 0;
      let pending = 0;

      monthRows.forEach(r => {
        const edStatus = (r.editingStatus || '').toLowerCase();
        const shootStatus = (r.shootingStatus || '').toLowerCase();

        if (edStatus.includes('completed') || r.hasLink) {
          completed++;
        } else if (
          shootStatus.includes('completed') ||
          shootStatus.includes('in progress') ||
          edStatus.includes('in progress')
        ) {
          inProgress++;
        } else {
          pending++;
        }
      });

      return {
        label: mLabel,
        total,
        completed,
        inProgress,
        pending
      };
    });
  }, [videoRegister]);

  // Distinct filter lists
  const availableMonths = ['June 2026', 'July 2026', 'August 2026', 'September 2026', 'October 2026'];
  const tradesList = useMemo(() => Array.from(new Set(videoRegister.map(r => r.trade))).filter(Boolean).sort(), [videoRegister]);
  const epicsList = useMemo(() => Array.from(new Set(videoRegister.map(r => r.epicCode))).filter(e => e && e !== '-').sort(), [videoRegister]);

  // Count unfinished topics (Not Yet Started & In Progress)
  const unfinishedCount = useMemo(() => {
    return videoRegister.filter(r => {
      const ed = (r.editingStatus || '').toLowerCase();
      const isComp = (ed === 'completed' || ed.startsWith('completed') || ed === 'na' || ed === 'received') && r.hasLink;
      return !isComp;
    }).length;
  }, [videoRegister]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return videoRegister.filter(row => {
      // 0. Completed vs All View Filter (Defaults to Completed Only as requested)
      if (viewFilter === 'COMPLETED') {
        const ed = (row.editingStatus || '').toLowerCase();
        const isComp = (ed === 'completed' || ed.startsWith('completed') || ed === 'na' || ed === 'received') && row.hasLink;
        if (!isComp) return false;
      }

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
  }, [videoRegister, viewFilter, selectedMonths, filterTrade, filterEpicId, filterShootingStatus, filterEditingStatus, activeSearch, onlyMyAssigned, role]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);



  // Requirement 1: Map each distinct EPIC in filteredRows to a 1-based sequential group number
  const epicGroupIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let groupNum = 1;
    filteredRows.forEach(row => {
      const key = row.epicCode || row.epicId;
      if (!map.has(key)) {
        map.set(key, groupNum++);
      }
    });
    return map;
  }, [filteredRows]);

  // Requirement 1: Calculate dynamic rowSpans for paginatedRows (S.No, Month, EPIC ID, SME, Trade)
  const tableSpans = useMemo(() => {
    const displayRows = paginatedRows;
    const n = displayRows.length;
    const spans = displayRows.map((r, idx) => ({
      sNoSpan: 0,
      sNoValue: epicGroupIndexMap.get(r.epicCode || r.epicId) || (idx + 1),
      monthSpan: 0,
      epicSpan: 0,
      smeSpan: 0,
      tradeSpan: 0,
      isGroupStart: false
    }));

    let i = 0;
    while (i < n) {
      let j = i + 1;
      const currentEpic = displayRows[i].epicCode || displayRows[i].epicId;
      while (j < n && (displayRows[j].epicCode || displayRows[j].epicId) === currentEpic) {
        j++;
      }
      const epicCount = j - i;
      spans[i].epicSpan = epicCount;
      spans[i].sNoSpan = epicCount;
      spans[i].isGroupStart = true;
      for (let k = i + 1; k < j; k++) {
        spans[k].epicSpan = 0;
        spans[k].sNoSpan = 0;
        spans[k].isGroupStart = false;
      }

      // 1. Month spans: Merge identical consecutive months within this EPIC group
      let mStart = i;
      while (mStart < j) {
        let mEnd = mStart + 1;
        const currentMonth = displayRows[mStart].month;
        while (mEnd < j && displayRows[mEnd].month === currentMonth) {
          mEnd++;
        }
        const mCount = mEnd - mStart;
        spans[mStart].monthSpan = mCount;
        for (let k = mStart + 1; k < mEnd; k++) {
          spans[k].monthSpan = 0;
        }
        mStart = mEnd;
      }

      // 2. SME spans: Merge identical consecutive SME names within this EPIC group
      let sStart = i;
      while (sStart < j) {
        let sEnd = sStart + 1;
        const currentSme = displayRows[sStart].smeName;
        while (sEnd < j && displayRows[sEnd].smeName === currentSme) {
          sEnd++;
        }
        const sCount = sEnd - sStart;
        spans[sStart].smeSpan = sCount;
        for (let k = sStart + 1; k < sEnd; k++) {
          spans[k].smeSpan = 0;
        }
        sStart = sEnd;
      }

      // 3. Trade spans: Merge identical consecutive Trade names within this EPIC group
      let tStart = i;
      while (tStart < j) {
        let tEnd = tStart + 1;
        const currentTrade = displayRows[tStart].trade;
        while (tEnd < j && displayRows[tEnd].trade === currentTrade) {
          tEnd++;
        }
        const tCount = tEnd - tStart;
        spans[tStart].tradeSpan = tCount;
        for (let k = tStart + 1; k < tEnd; k++) {
          spans[k].tradeSpan = 0;
        }
        tStart = tEnd;
      }

      i = j;
    }

    return spans;
  }, [paginatedRows, epicGroupIndexMap]);

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
    setAssignCameraman(row.cameraman !== '-' && row.cameraman !== '—' ? row.cameraman : '');
    setAssignShootStart(row.shootingStartDate ? formatDateForInput(row.shootingStartDate) : '');
    setAssignShootEnd(row.shootingEndDate ? formatDateForInput(row.shootingEndDate) : '');
    setAssignShootStatus(row.shootingStatus || 'Yet to shoot');

    let cleanNotes = row.productionNotes || '';
    if (cleanNotes.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanNotes);
        cleanNotes = parsed.notes || parsed.remarks || '';
      } catch (_) {}
    }
    setAssignShootNotes(cleanNotes);

    setAssignEditor(row.editor !== '-' && row.editor !== '—' ? row.editor : '');
    setAssignEditStart(row.editingStartDate ? formatDateForInput(row.editingStartDate) : '');
    setAssignEditEnd(row.editingEndDate ? formatDateForInput(row.editingEndDate) : '');
    setAssignEditStatus(row.editingStatus || 'Pending');

    let cleanReview = row.reviewComments || '';
    if (cleanReview.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleanReview);
        cleanReview = parsed.remarks || parsed.comments || '';
      } catch (_) {}
    }
    setAssignReviewComments(cleanReview);

    setAssignVideoTitle(row.videoTitle);
    setAssignDuration(row.duration || '');
    setAssignVideoLink(row.finalVideoLink || '');
    setAssignChangeReason('Admin updated production details');
    setIsAssignModalOpen(true);
  };

  // Save Work Assignment & Production Details
  const handleSaveWorkAssignment = async () => {
    if (!assignTargetRow) return;
    const finalReason = assignChangeReason.trim().length >= 5
      ? assignChangeReason.trim()
      : 'Admin updated production details';

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
        changeReason: finalReason
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Successfully updated work assignment and production details for ${assignTargetRow.videoTitle}!`
        });

        // 1. Immediate optimistic and authoritative local update of workEntries state
        setWorkEntries(prevEntries => {
          return prevEntries.map(entry => {
            if (entry.id !== assignTargetRow.epicId) return entry;

            const targetVid = (assignTargetRow.videoId || '').replace(/^(shoot-|ed-)/, '');
            const targetTitle = (assignVideoTitle || assignTargetRow.videoTitle || '').trim().toLowerCase();

            // Update or add Shooting Schedule
            let schedFound = false;
            const updatedSchedules = (entry.shootingSchedules || []).map((s: any) => {
              const sClean = (s.id || '').replace(/^shoot-/, '');
              const sTitle = (s.videoTitle || '').trim().toLowerCase();
              if (s.id === assignTargetRow.videoId || sClean === targetVid || (sTitle && sTitle === targetTitle)) {
                schedFound = true;
                return {
                  ...s,
                  cameraman: assignCameraman || s.cameraman,
                  scheduledStart: assignShootStart ? new Date(assignShootStart).toISOString() : null,
                  scheduledEnd: assignShootEnd ? new Date(assignShootEnd).toISOString() : null,
                  status: assignShootStatus,
                  productionNotes: assignShootNotes || s.productionNotes,
                  videoTitle: assignVideoTitle || s.videoTitle
                };
              }
              return s;
            });
            if (!schedFound && targetVid) {
              updatedSchedules.push({
                id: `shoot-${targetVid}`,
                workEntryId: entry.id,
                videoTitle: assignVideoTitle || assignTargetRow.videoTitle,
                cameraman: assignCameraman || null,
                scheduledStart: assignShootStart ? new Date(assignShootStart).toISOString() : null,
                scheduledEnd: assignShootEnd ? new Date(assignShootEnd).toISOString() : null,
                status: assignShootStatus,
                productionNotes: assignShootNotes || null
              });
            }

            // Update or add Video Editor Record
            let edFound = false;
            const updatedEditors = (entry.videoEditorRecords || []).map((e: any) => {
              const eClean = (e.id || '').replace(/^ed-/, '');
              const eTitle = (e.assignedVideo || '').trim().toLowerCase();
              if (e.id === assignTargetRow.videoId || eClean === targetVid || (eTitle && eTitle === targetTitle)) {
                edFound = true;
                return {
                  ...e,
                  editorName: assignEditor || e.editorName,
                  editingStartDate: assignEditStart ? new Date(assignEditStart).toISOString() : null,
                  editingEndDate: assignEditEnd ? new Date(assignEditEnd).toISOString() : null,
                  status: assignEditStatus,
                  duration: assignDuration || e.duration,
                  finalVideoFile: assignVideoLink || e.finalVideoFile,
                  reviewComments: assignReviewComments || e.reviewComments,
                  assignedVideo: assignVideoTitle || e.assignedVideo
                };
              }
              return e;
            });
            if (!edFound && targetVid) {
              updatedEditors.push({
                id: `ed-${targetVid}`,
                workEntryId: entry.id,
                assignedVideo: assignVideoTitle || assignTargetRow.videoTitle,
                editorName: assignEditor || null,
                editingStartDate: assignEditStart ? new Date(assignEditStart).toISOString() : null,
                editingEndDate: assignEditEnd ? new Date(assignEditEnd).toISOString() : null,
                status: assignEditStatus,
                duration: assignDuration || null,
                finalVideoFile: assignVideoLink || null,
                reviewComments: assignReviewComments || null
              });
            }

            // Update or add Video Library
            let libFound = false;
            const updatedLibs = (entry.videoLibraries || []).map((v: any) => {
              const vTitle = (v.title || '').trim().toLowerCase();
              if (v.id === assignTargetRow.videoId || v.id === targetVid || (vTitle && vTitle === targetTitle)) {
                libFound = true;
                return {
                  ...v,
                  title: assignVideoTitle || v.title,
                  duration: assignDuration !== undefined ? assignDuration : v.duration,
                  videoLink: assignVideoLink !== undefined ? assignVideoLink : v.videoLink
                };
              }
              return v;
            });
            if (!libFound && targetVid) {
              updatedLibs.push({
                id: targetVid,
                epicId: entry.id,
                title: assignVideoTitle || assignTargetRow.videoTitle,
                smeName: assignTargetRow.smeName,
                trade: assignTargetRow.trade,
                duration: assignDuration || null,
                videoLink: assignVideoLink || ''
              });
            }

            return {
              ...entry,
              shootingSchedules: updatedSchedules,
              videoEditorRecords: updatedEditors,
              videoLibraries: updatedLibs
            };
          });
        });

        setIsAssignModalOpen(false);

        // 2. Refresh from server asynchronously
        const fresh = await getTopicProductionRecords();
        if (fresh.success && fresh.data) {
          setWorkEntries(fresh.data);
        }
        broadcastSync();
      } else {
        alert(res.error || 'Failed to update work assignment.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating work assignment.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Delete Video Production Entry (Strictly Admin / Team Member Only)
  const handleDeleteRow = async (row: VideoRegisterRow) => {
    if (!isAdmin) {
      alert('Unauthorized: Only Admin users can delete video production entries.');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to delete this video production entry?\n\n` +
      `Topic: ${row.videoTitle}\n` +
      `EPIC: ${row.epicCode} (${row.trade})\n` +
      `Month: ${row.month}\n\n` +
      `This action will remove this entry from the tracker and cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await deleteProductionEntry({
        videoId: row.videoId,
        workEntryId: row.epicId,
        videoTitle: row.videoTitle
      });
      if (res.success) {
        setNotification({ type: 'success', message: res.message || 'Entry deleted successfully.' });
        setIsAssignModalOpen(false);

        // Optimistically remove the deleted record from client state immediately
        const deletedVid = (row.videoId || '').toLowerCase().trim();
        const deletedTitle = (row.videoTitle || '').toLowerCase().trim();

        setWorkEntries(prev => prev.map(entry => {
          if (entry.id !== row.epicId) return entry;
          return {
            ...entry,
            videoLibraries: (entry.videoLibraries || []).filter((v: any) => {
              const vId = (v.id || '').toLowerCase().trim();
              const vTitle = (v.title || '').toLowerCase().trim();
              return vId !== deletedVid && vTitle !== deletedTitle;
            }),
            shootingSchedules: (entry.shootingSchedules || []).filter((s: any) => {
              const sId = (s.id || '').toLowerCase().trim();
              const sTitle = (s.videoTitle || '').toLowerCase().trim();
              return sId !== deletedVid && sId !== `shoot-${deletedVid}` && sTitle !== deletedTitle;
            }),
            videoEditorRecords: (entry.videoEditorRecords || []).filter((e: any) => {
              const eId = (e.id || '').toLowerCase().trim();
              const eTitle = (e.assignedVideo || '').toLowerCase().trim();
              return eId !== deletedVid && eId !== `ed-${deletedVid}` && eTitle !== deletedTitle;
            })
          };
        }));

        broadcastSync();
        await refreshTopicRecords();
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to delete entry.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error deleting entry.' });
    } finally {
      setLoading(false);
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
      'EPIC ID',
      'SME / Resource Person',
      'Trade',
      'Video Topic',
      'Start date (Shooting)',
      'End date (Shooting)',
      'Cameraman',
      'Current Status (Shooting)',
      'Start date (Editing)',
      'End date (Editing)',
      'Video Editor',
      'Current Status (Editing)',
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
        escapeCsv(row.epicCode),
        escapeCsv(row.smeName),
        escapeCsv(row.trade),
        escapeCsv(row.videoTitle),
        escapeCsv(formatDateDotDisplay(row.shootingStartDate)),
        escapeCsv(formatDateDotDisplay(row.shootingEndDate)),
        escapeCsv(row.cameraman),
        escapeCsv(row.shootingStatus),
        escapeCsv(formatDateDotDisplay(row.editingStartDate)),
        escapeCsv(formatDateDotDisplay(row.editingEndDate)),
        escapeCsv(row.editor),
        escapeCsv(row.editingStatus),
        escapeCsv(row.duration || '—'),
        escapeCsv(row.finalVideoLink || '—')
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
    if (!status || status === '-' || status === '—' || status.toLowerCase() === 'null') return <span style={{ color: '#94a3b8' }}>—</span>;
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
    if (!status || status === '-' || status === '—' || s === 'null') { return <span style={{ color: '#94a3b8' }}>—</span>; }
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

  if (role === 'CAMERAMAN' && !viewOverallTrackerAsStaff) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
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
        <CameramanPortal
          currentUser={currentUser}
          videoRegister={videoRegister}
          onRefreshData={refreshTopicRecords}
          onViewOverallTracker={() => setViewOverallTrackerAsStaff(true)}
          setNotification={setNotification}
        />
      </div>
    );
  }

  if (role === 'EDITOR' && !viewOverallTrackerAsStaff) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
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
        <VideoEditorPortal
          currentUser={currentUser}
          videoRegister={videoRegister}
          onRefreshData={refreshTopicRecords}
          onViewOverallTracker={() => setViewOverallTrackerAsStaff(true)}
          setNotification={setNotification}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Return to Staff Portal Banner */}
      {(role === 'CAMERAMAN' || role === 'EDITOR') && viewOverallTrackerAsStaff && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '13px', color: '#334155', fontWeight: 600 }}>
            Viewing Overall 16-Column Video Production Tracker in Read-Only Mode
          </span>
          <button
            type="button"
            className={styles.btnDraft}
            style={{ padding: '6px 14px', fontSize: '12px', background: '#0284c7', color: 'white', borderColor: '#0284c7' }}
            onClick={() => {
              setViewOverallTrackerAsStaff(false);
              router.push('/video-production?tab=' + (role === 'CAMERAMAN' ? 'SHOOTING_ENTRY' : 'POST_PRODUCTION_ENTRY'));
            }}
          >
            ← Return to {role === 'CAMERAMAN' ? 'Cameraman Portal' : 'Video Editor Portal'}
          </button>
        </div>
      )}

      {/* Header Section (Role-Aware) */}
      {isAdmin ? (
        <div className={styles.adminHeaderSection}>
          <div className={styles.adminHeaderTopRow}>
            <div className={styles.adminHeaderTitleCol}>
              <h1 className={styles.pageTitle}>
                <span className={styles.titleIcon}>🎬</span>
                <span>Video Production Tracker (Admin View – Shooting &amp; Post Production)</span>
              </h1>
              <p className={styles.headerSubtitle}>
                Manage complete EPIC ID workflows for SME Document Compliance, Production &amp; Telecast Tracking
              </p>
            </div>

            {/* Admin Header Stage Navigation Tabs */}
            <div className={styles.adminStageTabs} role="tablist" aria-label="Production Stages">
              <button
                type="button"
                role="tab"
                aria-selected={activeStageTab === 'SHOOTING'}
                className={`${styles.adminStageTabBtn} ${activeStageTab === 'SHOOTING' ? styles.adminStageTabBtnActive : ''}`}
                onClick={() => handleStageTabClick('SHOOTING')}
              >
                <span className={styles.adminStageTabIcon}>🎥</span>
                <span>Shooting Stage</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeStageTab === 'POST_PRODUCTION'}
                className={`${styles.adminStageTabBtn} ${activeStageTab === 'POST_PRODUCTION' ? styles.adminStageTabBtnActive : ''}`}
                onClick={() => handleStageTabClick('POST_PRODUCTION')}
              >
                <span className={styles.adminStageTabIcon}>✂️</span>
                <span>Post Production Stage</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.standardHeaderSection}>
          <h1 className={styles.pageTitle}>
            <span className={styles.titleIcon}>🎬</span>
            <span>Video Production Tracker</span>
          </h1>
          <p className={styles.headerSubtitle}>
            Manage complete EPIC ID workflows for SME Document Compliance, Production &amp; Telecast Tracking
          </p>
        </div>
      )}

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
          ADMIN DASHBOARD: SUMMARY CARDS, MONTH BREAKDOWN & WORK ASSIGNMENT
         ======================================================== */}
      {isAdmin && (
        <div className={styles.adminDashboardContainer}>
          {/* 1. Summary KPI Cards (Calculated from actual persisted records) */}
          <div className={styles.summaryCardsGrid}>
            {/* Card 1: Total Videos */}
            <div className={styles.summaryKpiCard}>
              <div className={styles.summaryKpiCardTop}>
                <span className={styles.summaryKpiLabel}>Total Videos</span>
                <span className={styles.summaryKpiIconWrapper} style={{ background: '#eff6ff', color: '#0284c7' }}>
                  📹
                </span>
              </div>
              <div className={styles.summaryKpiValue}>{dashboardKpis.total}</div>
              <div className={styles.summaryKpiSub}>Canonical topics across {epicsList.length} EPICs</div>
            </div>

            {/* Card 2: Completed */}
            <div className={styles.summaryKpiCard}>
              <div className={styles.summaryKpiCardTop}>
                <span className={styles.summaryKpiLabel}>Completed</span>
                <span className={styles.summaryKpiIconWrapper} style={{ background: '#ecfdf5', color: '#059669' }}>
                  ✅
                </span>
              </div>
              <div className={styles.summaryKpiValue} style={{ color: '#059669' }}>{dashboardKpis.completed}</div>
              <div className={styles.summaryKpiSub}>Shooting &amp; Editing Completed</div>
            </div>

            {/* Card 3: In Progress */}
            <div className={styles.summaryKpiCard}>
              <div className={styles.summaryKpiCardTop}>
                <span className={styles.summaryKpiLabel}>In Progress</span>
                <span className={styles.summaryKpiIconWrapper} style={{ background: '#fffbeb', color: '#d97706' }}>
                  ⏳
                </span>
              </div>
              <div className={styles.summaryKpiValue} style={{ color: '#d97706' }}>{dashboardKpis.inProgress}</div>
              <div className={styles.summaryKpiSub}>Active in Shooting / Editing Stage</div>
            </div>

            {/* Card 4: Pending / Planned */}
            <div className={styles.summaryKpiCard}>
              <div className={styles.summaryKpiCardTop}>
                <span className={styles.summaryKpiLabel}>Pending / Planned</span>
                <span className={styles.summaryKpiIconWrapper} style={{ background: '#f8fafc', color: '#64748b' }}>
                  📋
                </span>
              </div>
              <div className={styles.summaryKpiValue} style={{ color: '#64748b' }}>{dashboardKpis.pending}</div>
              <div className={styles.summaryKpiSub}>Scheduled for upcoming stages</div>
            </div>

            {/* Card 5: Completion Rate */}
            <div className={styles.summaryKpiCard}>
              <div className={styles.summaryKpiCardTop}>
                <span className={styles.summaryKpiLabel}>Completion Rate</span>
                <span className={styles.summaryKpiIconWrapper} style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                  📊
                </span>
              </div>
              <div className={styles.summaryKpiValue} style={{ color: '#7c3aed' }}>{dashboardKpis.completionRate}%</div>
              <div className={styles.summaryKpiSub}>{dashboardKpis.completed} of {dashboardKpis.total} videos delivered</div>
            </div>
          </div>

          {/* 2. Month-wise Summary Cards */}
          <div className={styles.monthSummaryCard}>
            <div className={styles.monthSummaryHeader}>
              <div className={styles.monthSummaryTitle}>
                <span>📅</span>
                <span>Month-wise Video Production Summary</span>
              </div>
              <span className={styles.monthSummarySubtitle}>
                💡 Click any month card to filter the Overall Production Tracker below
              </span>
            </div>

            <div className={styles.monthCardsGrid}>
              {monthBreakdown.map(m => {
                const isSelected = selectedMonths.includes(m.label);
                return (
                  <div
                    key={m.label}
                    className={`${styles.monthMiniCard} ${isSelected ? styles.monthMiniCardActive : ''}`}
                    onClick={() => handleToggleMonth(m.label)}
                    title={`Click to filter by ${m.label}`}
                  >
                    <div className={styles.monthMiniCardTop}>
                      <span className={styles.monthMiniCardName}>{m.label}</span>
                      <span className={styles.monthMiniCardBadge}>{m.total} videos</span>
                    </div>
                    <div className={styles.monthMiniCardBreakdown}>
                      <span className={styles.monthBadgeComp}>✓ {m.completed} Done</span>
                      <span className={styles.monthBadgeProg}>• {m.inProgress} Prog</span>
                      <span className={styles.monthBadgePend}>• {m.pending} Pend</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>


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

      {/* Workflow Assignment Pipeline Banner */}
      <div style={{
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        padding: '12px 18px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>📋</span>
          <div>
            <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '14px' }}>
              Production Workflow &amp; Work Assignment Pipeline
            </div>
            <div style={{ fontSize: '12.5px', color: '#1e40af', marginTop: '2px' }}>
              <strong>{unfinishedCount} video topics</strong> (Not Yet Started &amp; In Progress) have been directed to <strong>Work Assignment</strong> for Editor assignment and post-production tracking.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'inline-flex', background: '#dbeafe', padding: '3px', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => { setViewFilter('COMPLETED'); setCurrentPage(1); }}
              style={{
                border: 'none',
                background: viewFilter === 'COMPLETED' ? '#ffffff' : 'transparent',
                color: viewFilter === 'COMPLETED' ? '#0f2942' : '#3b82f6',
                fontWeight: viewFilter === 'COMPLETED' ? 700 : 600,
                fontSize: '12px',
                padding: '5px 12px',
                borderRadius: '5px',
                cursor: 'pointer',
                boxShadow: viewFilter === 'COMPLETED' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              ✓ Completed Videos ({videoRegister.length - unfinishedCount})
            </button>
            <button
              type="button"
              onClick={() => { setViewFilter('ALL'); setCurrentPage(1); }}
              style={{
                border: 'none',
                background: viewFilter === 'ALL' ? '#ffffff' : 'transparent',
                color: viewFilter === 'ALL' ? '#0f2942' : '#3b82f6',
                fontWeight: viewFilter === 'ALL' ? 700 : 600,
                fontSize: '12px',
                padding: '5px 12px',
                borderRadius: '5px',
                cursor: 'pointer',
                boxShadow: viewFilter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              👁️ Show All Records ({videoRegister.length})
            </button>
          </div>

          <Link
            href="/production-workflow"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
            }}
          >
            <span>Assign Editors in Work Assignment</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* ========================================================
          2. EXACT 16-COLUMN PRODUCTION TRACKER TABLE CONTAINER
         ======================================================== */}
      <div className={styles.trackerCardContainer}>
        <div className={styles.trackerTableWrapper}>
          <table className={styles.trackerTable}>
          <thead>
            <tr>
              {/* S.No */}
              <th style={{ width: '48px', textAlign: 'center' }}>S.No</th>
              {/* Month */}
              <th className={styles.monthHeaderHighlight} style={{ minWidth: '85px', textAlign: 'center' }}>Month</th>
              {/* Video Identity */}
              <th style={{ minWidth: '160px' }}>EPIC ID</th>
              <th style={{ minWidth: '150px' }}>SME / Resource Person</th>
              <th style={{ minWidth: '130px' }}>Trade</th>
              <th style={{ minWidth: '280px' }}>Video Topic</th>
              {/* Production / Shooting */}
              <th style={{ minWidth: '110px' }}>Start date (Shooting)</th>
              <th style={{ minWidth: '110px' }}>End date (Shooting)</th>
              <th style={{ minWidth: '120px' }}>Cameraman</th>
              <th style={{ minWidth: '120px' }}>Current Status (Shooting)</th>
              {/* Post-Production / Editing */}
              <th style={{ minWidth: '110px' }}>Start date (Editing)</th>
              <th style={{ minWidth: '110px' }}>End date (Editing)</th>
              <th style={{ minWidth: '120px' }}>Video Editor</th>
              <th style={{ minWidth: '120px' }}>Current Status (Editing)</th>
              {/* Video Output */}
              <th style={{ minWidth: '85px' }}>Duration</th>
              <th style={{ minWidth: '85px' }}>Video Link</th>
              {/* Actions */}
              <th style={{ minWidth: '85px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row, idx) => {
              const span = tableSpans[idx];
              return (
                <tr 
                  key={row.uniqueKey}
                  className={span?.isGroupStart ? styles.epicGroupStartRow : undefined}
                >
                  {/* 1. S.No (Vertically merged per EPIC group) */}
                  {span && span.sNoSpan > 0 && (
                    <td 
                      rowSpan={span.sNoSpan}
                      className={styles.mergedCell}
                      style={{ fontWeight: 600, color: '#334155', textAlign: 'center' }}
                    >
                      {span.sNoValue}
                    </td>
                  )}

                  {/* 2. Month (Vertically merged for identical consecutive months in EPIC group) */}
                  {span && span.monthSpan > 0 && (
                    <td 
                      rowSpan={span.monthSpan}
                      className={`${styles.monthCellHighlight} ${styles.mergedCell}`} 
                      style={{ textAlign: 'center' }}
                    >
                      {row.month}
                    </td>
                  )}

                  {/* 3. EPIC ID (Vertically merged across all records in EPIC group) */}
                  {span && span.epicSpan > 0 && (
                    <td 
                      rowSpan={span.epicSpan}
                      className={styles.mergedCell}
                      style={{ color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {row.epicCode}
                    </td>
                  )}

                  {/* 4. SME / Resource Person (Vertically merged for consecutive identical SME in EPIC group) */}
                  {span && span.smeSpan > 0 && (
                    <td 
                      rowSpan={span.smeSpan}
                      className={styles.mergedCell}
                      style={{ color: '#1e293b', fontWeight: 500 }}
                    >
                      {row.smeName}
                    </td>
                  )}

                  {/* 5. Trade (Vertically merged for consecutive identical Trade in EPIC group) */}
                  {span && span.tradeSpan > 0 && (
                    <td 
                      rowSpan={span.tradeSpan}
                      className={styles.mergedCell}
                      style={{ fontWeight: 500, color: '#475569' }}
                    >
                      {row.trade}
                    </td>
                  )}

                  {/* 6. Video Topic (wrapped gracefully within its own cell) */}
                  <td style={{ maxWidth: '300px', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.45', fontWeight: 500, color: '#0f172a' }}>
                    {row.videoTitle}
                  </td>

                  {/* 7. Start date (Shooting) */}
                  <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                    {formatDateDotDisplay(row.shootingStartDate)}
                  </td>

                  {/* 8. End date (Shooting) */}
                  <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                    {formatDateDotDisplay(row.shootingEndDate)}
                  </td>

                  {/* 9. Cameraman */}
                  <td style={{ color: '#1e293b', fontWeight: 500 }}>
                    {row.cameraman}
                  </td>

                  {/* 10. Current Status (Shooting) */}
                  <td>
                    {renderShootingBadge(row.shootingStatus)}
                  </td>

                  {/* 11. Start date (Editing) */}
                  <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                    {formatDateDotDisplay(row.editingStartDate)}
                  </td>

                  {/* 12. End date (Editing) */}
                  <td style={{ whiteSpace: 'nowrap', color: '#334155' }}>
                    {formatDateDotDisplay(row.editingEndDate)}
                  </td>

                  {/* 13. Video Editor */}
                  <td style={{ color: '#1e293b', fontWeight: 500 }}>
                    {row.editor}
                  </td>

                  {/* 14. Current Status (Editing) */}
                  <td>
                    {renderEditingBadge(row.editingStatus)}
                  </td>

                  {/* 15. Duration */}
                  <td style={{ whiteSpace: 'nowrap', color: '#334155', fontWeight: 500 }}>
                    {row.duration || '—'}
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
                        🔗 Link
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  {/* 17. Actions */}
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>

                      {isAdmin && (
                        <button
                          type="button"
                          className={styles.actionSquareBtn}
                          onClick={() => handleOpenWorkAssignment(row)}
                          title="Edit Production Details"
                        >
                          ✏️
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          className={`${styles.actionSquareBtn} ${styles.actionDeleteBtn}`}
                          onClick={() => handleDeleteRow(row)}
                          title="Delete Entry (Admin Only)"
                        >
                          🗑️
                        </button>
                      )}
                      <button 
                        type="button"
                        className={styles.actionSquareBtn}
                        onClick={() => handleOpenDetails(row)}
                        title="View Details"
                      >
                        👁️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

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
        </div>

        {/* ========================================================
            PAGINATION ROW MATCHING SCREENSHOT
           ======================================================== */}
        <div className={styles.tablePaginationBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span>
              Showing {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} entries
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Rows per page:</label>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>All ({filteredRows.length})</option>
              </select>
            </div>
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
          4. WORK ASSIGNMENT & PRODUCTION ENTRY MODAL
         ======================================================== */}
      {isAssignModalOpen && assignTargetRow && (
        <div className={styles.modalOverlay} onClick={() => setIsAssignModalOpen(false)}>
          <div className={styles.modalContent} style={{ maxWidth: '820px' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  🎬 Edit Production Details — S.No {assignTargetRow.sNo} ({assignTargetRow.displayVideoId})
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
                      <option value="">— Unassigned —</option>
                      <option value="Parasuraman">Parasuraman</option>
                      <option value="Antony Alcander">Antony Alcander</option>
                      <option value="Antony Parasuraman">Antony Parasuraman</option>
                      <option value="Antony Alcander, Parasuraman">Antony Alcander, Parasuraman</option>
                      <option value="Antony">Antony</option>
                      <option value="LIVE SESSION">LIVE SESSION</option>
                      {authorizedStaff.cameramen.map((c: any) => (
                        <option key={c.id || c.email} value={c.name}>{c.name} ({c.email})</option>
                      ))}
                      {assignCameraman && 
                       !['Parasuraman', 'Antony Alcander', 'Antony Parasuraman', 'Antony Alcander, Parasuraman', 'Antony', 'LIVE SESSION', ''].includes(assignCameraman) &&
                       !authorizedStaff.cameramen.some((c: any) => c.name === assignCameraman) && (
                        <option value={assignCameraman}>{assignCameraman}</option>
                      )}
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
                      <option value="">— Unassigned —</option>
                      <option value="Hassan & Antony">Hassan &amp; Antony</option>
                      <option value="Hassan">Hassan</option>
                      <option value="Bala">Bala</option>
                      <option value="Ramaswamy">Ramaswamy</option>
                      <option value="Parandhaman">Parandhaman</option>
                      <option value="Hassan & Antony, Bala">Hassan &amp; Antony, Bala</option>
                      <option value="Post-Production Team">Post-Production Team</option>
                      {authorizedStaff.editors.map((e: any) => (
                        <option key={e.id || e.email} value={e.name}>{e.name} ({e.email})</option>
                      ))}
                      {assignEditor && 
                       !['Hassan & Antony', 'Hassan', 'Bala', 'Ramaswamy', 'Parandhaman', 'Hassan & Antony, Bala', 'Post-Production Team', ''].includes(assignEditor) &&
                       !authorizedStaff.editors.some((e: any) => e.name === assignEditor) && (
                        <option value={assignEditor}>{assignEditor}</option>
                      )}
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

              {/* Audit Reason */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px' }}>
                <label className={styles.formLabel} style={{ color: '#92400e', fontWeight: 700 }}>
                  Change Reason (Audit History):
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
              {isAdmin && (
                <button 
                  type="button"
                  onClick={() => handleDeleteRow(assignTargetRow)}
                  disabled={assignLoading}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginRight: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Delete this entry completely (Admin only)"
                >
                  🗑️ Delete Entry
                </button>
              )}
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
                disabled={assignLoading}
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
