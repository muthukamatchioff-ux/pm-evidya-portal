'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './video-production.module.css';
import { 
  getTopicProductionRecords, 
  createShootingSchedule,
  updateShootingSchedule,
  deleteShootingSchedule,
  updateVideoEditorRecord,
  deleteVideoEditorRecord,
  updateAnimationRecord,
  updateFinalVideoRecord,
  deleteFinalVideoRecord,
  detectVideoDuration
} from './actions';

// =========================================================================
// SAFE DATE & STRING HELPERS
// =========================================================================

function formatDateForInput(dateVal: any): string {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
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

function formatDateDisplay(dateVal: any): string {
  if (!dateVal) return 'TBD';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-IN');
  } catch {
    return String(dateVal);
  }
}

function extractEndDate(reviewComments: string | null | undefined): string {
  if (!reviewComments) return '';
  const match = reviewComments.match(/\[END:([^\]]+)\]/);
  return match ? match[1] : '';
}

function cleanReviewComments(reviewComments: string | null | undefined): string {
  if (!reviewComments) return '';
  return reviewComments.replace(/\[END:[^\]]+\]/, '').trim();
}

function cleanCameramanDisplay(name?: string | null): string {
  if (!name) return 'Antony Alcander';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || lower === 'null' || lower === 'production team' || lower === 'production' || lower === 'team') {
    return 'Antony Alcander';
  }
  return trimmed;
}

function cleanEditorDisplay(name?: string | null): string {
  if (!name) return 'Post-Production Team';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || lower === 'null' || lower === 'not assigned') {
    return 'Post-Production Team';
  }
  return trimmed;
}

// Unified Video Row Model
export interface VideoRegisterRow {
  slNo: number;
  uniqueKey: string;
  videoId: string;
  displayVideoId: string;
  epicId: string;
  epicSequence: number;
  epicCode: string;
  trade: string;
  smeName: string;
  videoTitle: string;
  
  // Production
  cameraman: string;
  shootingStatus: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'RESHOOT';
  shootingStartDate: string | null;
  shootingEndDate: string | null;
  shootingLocation: string | null;
  productionNotes: string | null;
  scheduleRecord: any;
  
  // Post-Production
  editor: string;
  editingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  editingStartDate: string | null;
  editingEndDate: string | null;
  roughCutLink: string | null;
  finalCutLink: string | null;
  reviewComments: string | null;
  editorRecord: any;
  
  // Quality & Final Deliverable
  qualityReviewStatus: string;
  duration: string | null;
  finalVideoLink: string | null;
  hasLink: boolean;
  deliveryStatus: 'DELIVERED' | 'LINK_MISSING' | 'IN_PRODUCTION' | 'PENDING';
  libraryRecord: any;
  finalRecord: any;
}

export default function VideoProductionClient({ initialRecords = [], role = 'VIEWER' }: any) {
  const router = useRouter();
  const [workEntries, setWorkEntries] = useState<any[]>(initialRecords);
  
  // Active View Switcher: 'REGISTER' | 'EPIC_REPORT' | 'WORKFLOW_STAGES'
  const [activeView, setActiveView] = useState<'REGISTER' | 'EPIC_REPORT' | 'WORKFLOW_STAGES'>('REGISTER');
  
  // Legacy 3-Stage workflow tab (when activeView === 'WORKFLOW_STAGES')
  const [activeStage, setActiveStage] = useState<'STAGE_1' | 'STAGE_2' | 'STAGE_3'>(
    role === 'EDITOR' ? 'STAGE_2' : 'STAGE_1'
  );

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrade, setFilterTrade] = useState('ALL');
  const [filterCameraman, setFilterCameraman] = useState('ALL');
  const [filterEditor, setFilterEditor] = useState('ALL');
  const [filterProdStatus, setFilterProdStatus] = useState('ALL');
  const [filterEditStatus, setFilterEditStatus] = useState('ALL');
  const [filterDeliveryStatus, setFilterDeliveryStatus] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('epicSequence');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state (default: 10 rows)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Stage 1 Create Form state
  const [selectedEpicId, setSelectedEpicId] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [shootStartDate, setShootStartDate] = useState('');
  const [shootEndDate, setShootEndDate] = useState('');
  const [shootLocationType, setShootLocationType] = useState<'' | 'Studio - NIMI Chennai' | 'On-site'>('');
  const [shootLocationCustom, setShootLocationCustom] = useState('');
  const [cameramanSelect, setCameramanSelect] = useState<'' | 'Antony Alcander' | 'Parasuraman' | 'OTHER'>('');
  const [cameramanCustom, setCameramanCustom] = useState('');
  const [productionNotes, setProductionNotes] = useState('');
  
  // Stage 2 Filter state
  const [stage2EpicFilter, setStage2EpicFilter] = useState('');

  // Modals state
  const [editingStage1, setEditingStage1] = useState<any | null>(null);
  const [editingStage2, setEditingStage2] = useState<any | null>(null);
  const [editingStage3, setEditingStage3] = useState<any | null>(null);
  const [highlightedScheduleId, setHighlightedScheduleId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    }
    loadData();
  }, []);

  // Compute unified Video Production Register
  const videoRegister = useMemo<VideoRegisterRow[]>(() => {
    let counter = 1;
    const rows: VideoRegisterRow[] = [];

    workEntries.forEach(entry => {
      const epicSeq = entry.epicSequence;
      const epicCode = `EPIC-${epicSeq}`;
      const trade = entry.trade || 'General';
      const smeName = entry.sme?.name || 'SME';
      const combinedVideos = entry.videoLibraries || [];
      const schedules = entry.shootingSchedules || [];
      const editors = entry.videoEditorRecords || [];
      const finals = entry.finalVideoRecords || [];

      // Collect all video items under this Epic
      const titleMap = new Map<string, { lib?: any; schedule?: any; editor?: any }>();

      // 1. From videoLibraries
      combinedVideos.forEach((v: any) => {
        const title = (v.title || entry.topic || 'Untitled Video').trim();
        if (!titleMap.has(title)) titleMap.set(title, {});
        titleMap.get(title)!.lib = v;
      });

      // 2. From shootingSchedules
      schedules.forEach((s: any) => {
        const title = (s.videoTitle || entry.topic || 'Untitled Video').trim();
        if (!titleMap.has(title)) titleMap.set(title, {});
        titleMap.get(title)!.schedule = s;
      });

      // 3. From videoEditorRecords
      editors.forEach((e: any) => {
        const title = (e.assignedVideo || entry.topic || 'Untitled Video').trim();
        if (!titleMap.has(title)) titleMap.set(title, {});
        titleMap.get(title)!.editor = e;
      });

      if (titleMap.size === 0) {
        titleMap.set(entry.topic || 'Master Video Topic', {
          schedule: schedules[0],
          editor: editors[0],
          lib: combinedVideos[0]
        });
      }

      let subIdx = 1;
      titleMap.forEach((data, title) => {
        const lib = data.lib;
        const sched = data.schedule;
        const ed = data.editor;
        const fin = finals[0];

        const rawVideoId = lib?.id || sched?.id?.replace('shoot-', '') || ed?.id?.replace('ed-', '') || `${entry.id}-${subIdx}`;
        const displayVideoId = `VID-${epicSeq.toString().padStart(2, '0')}-${subIdx.toString().padStart(2, '0')}`;

        const shootingStartDate = sched?.scheduledStart 
          ? formatDateForInput(sched.scheduledStart) 
          : (entry.attendanceFrom ? formatDateForInput(entry.attendanceFrom) : null);
        const shootingEndDate = sched?.scheduledEnd 
          ? formatDateForInput(sched.scheduledEnd) 
          : (entry.attendanceTo ? formatDateForInput(entry.attendanceTo) : null);
        const shootingStatus = (sched?.status || (entry.status === 'COMPLETED' ? 'COMPLETED' : 'PLANNED')) as any;
        const cameraman = cleanCameramanDisplay(sched?.cameraman);

        const editingStartDate = ed?.editingStartDate ? formatDateForInput(ed.editingStartDate) : '2026-10-05';
        const editingEndDate = ed?.editingEndDate 
          ? formatDateForInput(ed.editingEndDate) 
          : (extractEndDate(ed?.reviewComments) || '2026-10-15');
        const editingStatus = (ed?.status || (entry.status === 'COMPLETED' ? 'COMPLETED' : 'NOT_STARTED')) as any;
        const editor = cleanEditorDisplay(ed?.editorName);

        // Canonical source for final video deliverable is VideoLibrary
        const finalVideoLink = lib?.videoLink || ed?.finalVideoFile || fin?.finalVideoFile || null;
        const hasLink = !!finalVideoLink && finalVideoLink.trim() !== '' && finalVideoLink !== '-';
        const duration = lib?.duration || ed?.duration || fin?.finalDuration || null;

        let deliveryStatus: 'DELIVERED' | 'LINK_MISSING' | 'IN_PRODUCTION' | 'PENDING' = 'PENDING';
        if (editingStatus === 'COMPLETED' && hasLink) {
          deliveryStatus = 'DELIVERED';
        } else if (editingStatus === 'COMPLETED' && !hasLink) {
          deliveryStatus = 'LINK_MISSING';
        } else if (shootingStatus === 'IN_PROGRESS' || editingStatus === 'IN_PROGRESS') {
          deliveryStatus = 'IN_PRODUCTION';
        } else if (shootingStatus === 'COMPLETED' && !hasLink) {
          deliveryStatus = 'LINK_MISSING';
        }

        const qualityReviewStatus = fin?.finalVideoStatus || (deliveryStatus === 'DELIVERED' ? 'APPROVED' : (ed?.reviewComments ? 'UNDER_REVIEW' : 'PENDING'));

        rows.push({
          slNo: counter++,
          uniqueKey: `${entry.id}-${subIdx}-${rawVideoId}`,
          videoId: rawVideoId,
          displayVideoId,
          epicId: entry.id,
          epicSequence: epicSeq,
          epicCode,
          trade,
          smeName,
          videoTitle: title,
          cameraman,
          shootingStatus,
          shootingStartDate,
          shootingEndDate,
          shootingLocation: sched?.location || null,
          productionNotes: sched?.productionNotes || null,
          scheduleRecord: sched || { 
            workEntryId: entry.id, 
            videoTitle: title, 
            cameraman, 
            status: shootingStatus,
            scheduledStart: shootingStartDate,
            scheduledEnd: shootingEndDate
          },
          editor,
          editingStatus,
          editingStartDate,
          editingEndDate,
          roughCutLink: ed?.roughCutLink || null,
          finalCutLink: ed?.finalCutLink || null,
          reviewComments: cleanReviewComments(ed?.reviewComments),
          editorRecord: ed || { 
            workEntryId: entry.id, 
            assignedVideo: title, 
            editorName: editor, 
            status: editingStatus,
            editingStartDate,
            editingEndDate
          },
          qualityReviewStatus,
          duration,
          finalVideoLink: hasLink ? finalVideoLink : null,
          hasLink,
          deliveryStatus,
          libraryRecord: lib || null,
          finalRecord: fin || null
        });

        subIdx++;
      });
    });

    return rows;
  }, [workEntries]);

  // Extract distinct filter lists from live register
  const tradesList = useMemo(() => Array.from(new Set(videoRegister.map(r => r.trade))).filter(Boolean).sort(), [videoRegister]);
  const cameramenList = useMemo(() => Array.from(new Set(videoRegister.map(r => r.cameraman))).filter(Boolean).sort(), [videoRegister]);
  const editorsList = useMemo(() => Array.from(new Set(videoRegister.map(r => r.editor))).filter(Boolean).sort(), [videoRegister]);

  // 1. Dynamic KPI Metrics Calculation (strictly persisted records)
  const totalVideos = videoRegister.length;
  const completedVideos = videoRegister.filter(v => v.editingStatus === 'COMPLETED' && v.hasLink).length;
  const inProgressVideos = videoRegister.filter(v => 
    (v.shootingStatus === 'IN_PROGRESS' || v.editingStatus === 'IN_PROGRESS') && 
    !(v.editingStatus === 'COMPLETED' && v.hasLink)
  ).length;
  const pendingVideos = videoRegister.filter(v => 
    v.shootingStatus === 'PLANNED' && v.editingStatus === 'NOT_STARTED' && !v.hasLink
  ).length;
  const linksMissingVideos = videoRegister.filter(v => !v.hasLink).length;
  const completionPercentage = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

  // 2. Filter & Sort Video Register
  const filteredRows = useMemo(() => {
    let result = videoRegister.filter(row => {
      // Search Box (Epic, Video ID, Title, SME, Trade)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch = 
          row.epicCode.toLowerCase().includes(q) ||
          row.displayVideoId.toLowerCase().includes(q) ||
          row.videoTitle.toLowerCase().includes(q) ||
          row.smeName.toLowerCase().includes(q) ||
          row.trade.toLowerCase().includes(q) ||
          row.cameraman.toLowerCase().includes(q) ||
          row.editor.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Trade Filter
      if (filterTrade !== 'ALL' && row.trade !== filterTrade) return false;

      // Cameraman Filter
      if (filterCameraman !== 'ALL' && row.cameraman !== filterCameraman) return false;

      // Editor Filter
      if (filterEditor !== 'ALL' && row.editor !== filterEditor) return false;

      // Production Status Filter
      if (filterProdStatus !== 'ALL' && row.shootingStatus !== filterProdStatus) return false;

      // Editing Status Filter
      if (filterEditStatus !== 'ALL' && row.editingStatus !== filterEditStatus) return false;

      // Delivery Status Filter
      if (filterDeliveryStatus === 'DELIVERED' && !row.hasLink) return false;
      if (filterDeliveryStatus === 'LINK_MISSING' && row.hasLink) return false;

      // Date Range Filter (checking either shooting or editing start date)
      if (filterDateFrom) {
        const rowDate = row.shootingStartDate || row.editingStartDate;
        if (!rowDate || rowDate < filterDateFrom) return false;
      }
      if (filterDateTo) {
        const rowDate = row.shootingEndDate || row.editingEndDate;
        if (!rowDate || rowDate > filterDateTo) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA: any = (a as any)[sortBy] ?? '';
      let valB: any = (b as any)[sortBy] ?? '';

      if (sortBy === 'epicSequence') {
        valA = a.epicSequence;
        valB = b.epicSequence;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    videoRegister, 
    searchTerm, 
    filterTrade, 
    filterCameraman, 
    filterEditor, 
    filterProdStatus, 
    filterEditStatus, 
    filterDeliveryStatus, 
    filterDateFrom, 
    filterDateTo, 
    sortBy, 
    sortOrder
  ]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTrade, filterCameraman, filterEditor, filterProdStatus, filterEditStatus, filterDeliveryStatus, filterDateFrom, filterDateTo, pageSize]);

  // Paginated Rows
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Handle Sort column click
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterTrade('ALL');
    setFilterCameraman('ALL');
    setFilterEditor('ALL');
    setFilterProdStatus('ALL');
    setFilterEditStatus('ALL');
    setFilterDeliveryStatus('ALL');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Export filtered register as CSV
  const handleExportCsv = () => {
    const headers = [
      'Sl No',
      'Video ID',
      'EPIC ID',
      'Trade / Subject',
      'SME Name',
      'Video Title',
      'Assigned Cameraman',
      'Shooting Status',
      'Shooting Start Date',
      'Shooting End Date',
      'Assigned Editor',
      'Post-Production Status',
      'Post-Production Start Date',
      'Post-Production End Date',
      'Duration',
      'Final Video Link',
      'Delivery Status'
    ];

    const rows = filteredRows.map(r => [
      r.slNo,
      r.displayVideoId,
      r.epicCode,
      `"${(r.trade || '').replace(/"/g, '""')}"`,
      `"${(r.smeName || '').replace(/"/g, '""')}"`,
      `"${(r.videoTitle || '').replace(/"/g, '""')}"`,
      `"${(r.cameraman || '').replace(/"/g, '""')}"`,
      r.shootingStatus,
      r.shootingStartDate || '-',
      r.shootingEndDate || '-',
      `"${(r.editor || '').replace(/"/g, '""')}"`,
      r.editingStatus,
      r.editingStartDate || '-',
      r.editingEndDate || '-',
      r.duration || '-',
      `"${(r.finalVideoLink || '').replace(/"/g, '""')}"`,
      r.hasLink ? 'DELIVERED' : 'LINK_MISSING'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PM_eVidya_Video_Production_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stage 1 Create Handler (Preserved)
  const handleCreateStage1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEpicId || !videoTitle.trim()) {
      setError('Please select an Epic ID and enter a Video Title / Topic.');
      return;
    }

    if (shootStartDate && shootEndDate && new Date(shootEndDate) < new Date(shootStartDate)) {
      setError('Production End Date cannot be earlier than Production Start Date.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    let finalLocation: string | null = null;
    if (shootLocationType === 'Studio - NIMI Chennai') {
      finalLocation = 'Studio - NIMI Chennai';
    } else if (shootLocationType === 'On-site') {
      finalLocation = shootLocationCustom.trim()
        ? (shootLocationCustom.trim().toLowerCase().startsWith('on-site')
            ? shootLocationCustom.trim()
            : `On-site - ${shootLocationCustom.trim()}`)
        : 'On-site';
    }

    let finalCameraman: string | null = null;
    if (cameramanSelect === 'Antony Alcander' || cameramanSelect === 'Parasuraman') {
      finalCameraman = cameramanSelect;
    } else if (cameramanSelect === 'OTHER') {
      finalCameraman = cameramanCustom.trim() || null;
    }

    const res = await createShootingSchedule(selectedEpicId, { 
      videoTitle: videoTitle.trim(),
      scheduledStart: shootStartDate || null,
      scheduledEnd: shootEndDate || null,
      location: finalLocation,
      cameraman: finalCameraman,
      productionNotes: productionNotes || null,
      status: 'PLANNED'
    });

    if (res.success) {
      const selectedEpic = workEntries.find(ent => ent.id === selectedEpicId);
      setSuccess(`✅ Video "${videoTitle.trim()}" added to EPIC-${selectedEpic?.epicSequence}! It is automatically ready in Stage 2 (Post-Production).`);
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      router.refresh();
      setVideoTitle('');
      setShootStartDate('');
      setShootEndDate('');
      setShootLocationType('');
      setShootLocationCustom('');
      setCameramanSelect('');
      setCameramanCustom('');
      setProductionNotes('');
    } else {
      setError(res.error || 'Failed to create production record.');
    }
    setLoading(false);
  };

  // Stage 1 Shooting Update Save (Preserved)
  const handleSaveStage1Edit = async (id: string, data: any) => {
    setLoading(true);
    setError(null);
    const res = await updateShootingSchedule(id, data);
    if (res.success) {
      setSuccess('✅ Production shooting record updated successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success && updatedList.data) {
        setWorkEntries(updatedList.data);
      }
      setEditingStage1(null);
      router.refresh();
    } else {
      setError(res.error || 'Failed to update Production record.');
    }
    setLoading(false);
  };

  // Stage 1 Delete (Preserved)
  const handleDeleteStage1 = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Production Shoot record? This action cannot be undone.')) return;
    setLoading(true);
    setError(null);
    const res = await deleteShootingSchedule(id);
    if (res.success) {
      setSuccess('Production Shoot record deleted successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      router.refresh();
    } else {
      setError(res.error || 'Failed to delete production record.');
    }
    setLoading(false);
  };

  // Stage 2 Editor Update Save (Preserved & isolated from shooting dates)
  const handleSaveStage2Edit = async (id: string, data: any, workEntryId: string) => {
    setLoading(true);
    setError(null);
    const res = await updateVideoEditorRecord(id, data, workEntryId);
    if (res.success) {
      setSuccess(data.status === 'COMPLETED' 
        ? '🎉 Post-Production marked COMPLETED! Video has automatically advanced to Stage 3 (Final Video Deliverable).'
        : '✅ Post-Production details saved successfully.'
      );
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      router.refresh();
      setEditingStage2(null);
    } else {
      setError(res.error || 'Failed to update Post-Production record.');
    }
    setLoading(false);
  };

  // Stage 2 Delete Editor (Preserved)
  const handleDeleteEditor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Post-Production record?')) return;
    setLoading(true);
    setError(null);
    const res = await deleteVideoEditorRecord(id);
    if (res.success) {
      setSuccess('Post-Production record deleted successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      router.refresh();
    } else {
      setError(res.error || 'Failed to delete editor record.');
    }
    setLoading(false);
  };

  // Stage 3 Save Final Record (Preserved)
  const handleSaveStage3Edit = async (id: string, data: any, workEntryId: string) => {
    setLoading(true);
    setError(null);
    const res = await updateFinalVideoRecord(id, data, workEntryId);
    if (res.success) {
      setSuccess('✅ Final Video Deliverable details saved successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      router.refresh();
      setEditingStage3(null);
    } else {
      setError(res.error || 'Failed to update Final Video record.');
    }
    setLoading(false);
  };

  // Stage 3 Delete Final (Preserved)
  const handleDeleteFinal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Final Deliverable record?')) return;
    setLoading(true);
    setError(null);
    const res = await deleteFinalVideoRecord(id);
    if (res.success) {
      setSuccess('Final deliverable record deleted successfully.');
      const updatedList = await getTopicProductionRecords();
      if (updatedList.success) setWorkEntries(updatedList.data || []);
      router.refresh();
    } else {
      setError(res.error || 'Failed to delete deliverable record.');
    }
    setLoading(false);
  };

  // Helper for status badge class
  const getBadgeClass = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETED':
      case 'APPROVED':
      case 'TELECASTED':
      case 'DELIVERED':
        return styles.badgeCompleted;
      case 'IN_PROGRESS':
        return styles.badgeProgress;
      case 'RESHOOT':
      case 'REVISION_REQUIRED':
      case 'UNDER_REVIEW':
        return styles.badgeReshoot;
      default:
        return styles.badgePending;
    }
  };

  const selectedEpic = workEntries.find(e => e.id === selectedEpicId);

  return (
    <div className={styles.container}>
      {/* ========================================================
          1. TOP ENTERPRISE KPI CARDS (Live Persisted Metrics)
         ======================================================== */}
      <div className={styles.kpiGrid}>
        {/* Card 1: Total Videos */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Total Videos</span>
            <div className={styles.kpiIconWrapper} style={{ background: '#eff6ff', color: '#1e40af' }}>🎬</div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiMainValue}>{totalVideos}</span>
            <span className={styles.kpiSubText}>across {workEntries.length} EPICs</span>
          </div>
          <div className={styles.kpiProgressBarTrack}>
            <div className={styles.kpiProgressBarFill} style={{ width: '100%', background: '#3b82f6' }} />
          </div>
        </div>

        {/* Card 2: Completed */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Completed</span>
            <div className={styles.kpiIconWrapper} style={{ background: '#ecfdf5', color: '#047857' }}>✅</div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiMainValue} style={{ color: '#047857' }}>{completedVideos}</span>
            <span className={styles.kpiSubText}>({completionPercentage}% Done)</span>
          </div>
          <div className={styles.kpiProgressBarTrack}>
            <div className={styles.kpiProgressBarFill} style={{ width: `${completionPercentage}%`, background: '#10b981' }} />
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>In Progress</span>
            <div className={styles.kpiIconWrapper} style={{ background: '#e0f2fe', color: '#0369a1' }}>⚡</div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiMainValue} style={{ color: '#0284c7' }}>{inProgressVideos}</span>
            <span className={styles.kpiSubText}>Shoot & Post-Prod</span>
          </div>
          <div className={styles.kpiProgressBarTrack}>
            <div 
              className={styles.kpiProgressBarFill} 
              style={{ width: `${totalVideos > 0 ? (inProgressVideos / totalVideos) * 100 : 0}%`, background: '#0284c7' }} 
            />
          </div>
        </div>

        {/* Card 4: Pending */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel}>Pending / Planned</span>
            <div className={styles.kpiIconWrapper} style={{ background: '#fef3c7', color: '#b45309' }}>⏳</div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiMainValue} style={{ color: '#b45309' }}>{pendingVideos}</span>
            <span className={styles.kpiSubText}>Not Started</span>
          </div>
          <div className={styles.kpiProgressBarTrack}>
            <div 
              className={styles.kpiProgressBarFill} 
              style={{ width: `${totalVideos > 0 ? (pendingVideos / totalVideos) * 100 : 0}%`, background: '#f59e0b' }} 
            />
          </div>
        </div>

        {/* Card 5: Final Video Links Missing */}
        <div className={styles.kpiCard} style={{ borderColor: linksMissingVideos > 0 ? '#fca5a5' : '#e2e8f0' }}>
          <div className={styles.kpiTopRow}>
            <span className={styles.kpiLabel} style={{ color: linksMissingVideos > 0 ? '#b91c1c' : '#475569' }}>
              Final Links Missing
            </span>
            <div className={styles.kpiIconWrapper} style={{ background: '#fef2f2', color: '#dc2626' }}>⚠️</div>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiMainValue} style={{ color: '#dc2626' }}>{linksMissingVideos}</span>
            <span className={styles.kpiSubText}>{totalVideos - linksMissingVideos} Available</span>
          </div>
          <div className={styles.kpiProgressBarTrack}>
            <div 
              className={styles.kpiProgressBarFill} 
              style={{ width: `${totalVideos > 0 ? (linksMissingVideos / totalVideos) * 100 : 0}%`, background: '#ef4444' }} 
            />
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className={styles.errorAlert} style={{ marginBottom: '16px' }}>
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {success && (
        <div className={styles.successAlert} style={{ marginBottom: '16px' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: '#166534' }}>✕</button>
        </div>
      )}

      {/* Role Assignment Notice for Cameraman or Editor */}
      {(role === 'CAMERAMAN' || role === 'EDITOR') && workEntries.length === 0 && (
        <div style={{ padding: '16px 20px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', color: '#1e40af', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🎯</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px' }}>No Epic IDs Assigned Yet</div>
            <div style={{ fontSize: '13px', color: '#3b82f6', marginTop: '2px' }}>
              You do not currently have any Epic IDs assigned by the Administrator. Please contact the Admin to assign Epic IDs to your account.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          2. PRODUCTION WORKFLOW PIPELINE INDICATOR (4 Stages)
         ======================================================== */}
      <div className={styles.pipelineWrapper}>
        <div className={styles.pipelineHeader}>
          <span className={styles.pipelineTitle}>
            <span>🚀</span> Production Lifecycle Stages (Click to filter)
          </span>
          {filterProdStatus !== 'ALL' || filterEditStatus !== 'ALL' || filterDeliveryStatus !== 'ALL' ? (
            <button 
              className={styles.btnResetFilters} 
              onClick={() => {
                setFilterProdStatus('ALL');
                setFilterEditStatus('ALL');
                setFilterDeliveryStatus('ALL');
              }}
            >
              ✕ Clear Stage Filter
            </button>
          ) : null}
        </div>

        <div className={styles.pipelineSteps}>
          {/* Step 1: Production (Shooting) */}
          <div 
            className={`${styles.pipelineStepCard} ${filterProdStatus === 'IN_PROGRESS' || filterProdStatus === 'COMPLETED' ? styles.pipelineStepActive : ''}`}
            onClick={() => {
              setFilterProdStatus(prev => prev === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS');
              setActiveView('REGISTER');
            }}
          >
            <div className={styles.pipelineStepTop}>
              <span className={styles.pipelineStepNumber}>Stage 1</span>
              <span className={styles.pipelineStepBadge}>
                {videoRegister.filter(v => v.shootingStatus === 'COMPLETED').length} / {totalVideos}
              </span>
            </div>
            <div className={styles.pipelineStepTitle}>🎬 Production (Shooting)</div>
            <div className={styles.pipelineStepDesc}>Studio/On-site shooting, Cameraman assignment & date tracking</div>
          </div>

          {/* Step 2: Post-Production */}
          <div 
            className={`${styles.pipelineStepCard} ${filterEditStatus === 'IN_PROGRESS' || filterEditStatus === 'COMPLETED' ? styles.pipelineStepActive : ''}`}
            onClick={() => {
              setFilterEditStatus(prev => prev === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS');
              setActiveView('REGISTER');
            }}
          >
            <div className={styles.pipelineStepTop}>
              <span className={styles.pipelineStepNumber}>Stage 2</span>
              <span className={styles.pipelineStepBadge}>
                {videoRegister.filter(v => v.editingStatus === 'COMPLETED').length} / {totalVideos}
              </span>
            </div>
            <div className={styles.pipelineStepTitle}>✂️ Post-Production</div>
            <div className={styles.pipelineStepDesc}>Editor allocation, rough cuts, final cuts & editorial remarks</div>
          </div>

          {/* Step 3: Quality Review */}
          <div 
            className={`${styles.pipelineStepCard} ${filterDeliveryStatus === 'IN_PRODUCTION' ? styles.pipelineStepActive : ''}`}
            onClick={() => {
              setFilterEditStatus('COMPLETED');
              setActiveView('REGISTER');
            }}
          >
            <div className={styles.pipelineStepTop}>
              <span className={styles.pipelineStepNumber}>Stage 3</span>
              <span className={styles.pipelineStepBadge}>
                {videoRegister.filter(v => v.qualityReviewStatus === 'APPROVED').length} Approved
              </span>
            </div>
            <div className={styles.pipelineStepTitle}>🔍 Quality Review</div>
            <div className={styles.pipelineStepDesc}>Editorial compliance check, revisions & telecast approval</div>
          </div>

          {/* Step 4: Final Delivery */}
          <div 
            className={`${styles.pipelineStepCard} ${filterDeliveryStatus === 'DELIVERED' ? styles.pipelineStepActive : ''}`}
            onClick={() => {
              setFilterDeliveryStatus(prev => prev === 'DELIVERED' ? 'ALL' : 'DELIVERED');
              setActiveView('REGISTER');
            }}
          >
            <div className={styles.pipelineStepTop}>
              <span className={styles.pipelineStepNumber}>Stage 4</span>
              <span className={styles.pipelineStepBadge} style={{ background: '#dcfce7', color: '#166534' }}>
                {completedVideos} Live
              </span>
            </div>
            <div className={styles.pipelineStepTitle}>📦 Final Delivery</div>
            <div className={styles.pipelineStepDesc}>Video Content Library storage link & auto-detected duration</div>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. ENTERPRISE FILTER AND SEARCH TOOLBAR
         ======================================================== */}
      <div className={styles.filterToolbarCard}>
        <div className={styles.filterTopRow}>
          {/* View Mode Toggle */}
          <div className={styles.viewModeToggle}>
            <button 
              className={`${styles.viewModeBtn} ${activeView === 'REGISTER' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setActiveView('REGISTER')}
            >
              <span>📋 Video Production Register</span>
              <span style={{ fontSize: '11px', background: '#e2e8f0', padding: '1px 6px', borderRadius: '8px' }}>
                {filteredRows.length}
              </span>
            </button>

            <button 
              className={`${styles.viewModeBtn} ${activeView === 'EPIC_REPORT' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setActiveView('EPIC_REPORT')}
            >
              <span>📑 EPIC ID Report</span>
              <span style={{ fontSize: '11px', background: '#e2e8f0', padding: '1px 6px', borderRadius: '8px' }}>
                {workEntries.length}
              </span>
            </button>

            <button 
              className={`${styles.viewModeBtn} ${activeView === 'WORKFLOW_STAGES' ? styles.viewModeBtnActive : ''}`}
              onClick={() => setActiveView('WORKFLOW_STAGES')}
            >
              <span>🎬 Add Videos & Stages</span>
            </button>
          </div>

          {/* Export and Reset Actions */}
          <div className={styles.toolbarActions}>
            <button className={styles.btnExport} onClick={handleExportCsv} title="Export filtered rows to Excel/CSV">
              <span>⬇️</span>
              <span>Export CSV</span>
            </button>

            <button className={styles.btnResetFilters} onClick={handleResetFilters} title="Reset all search terms and dropdown filters">
              <span>↺</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Multi-Filter Controls Grid */}
        <div className={styles.filterGrid}>
          {/* Search Box */}
          <div className={styles.filterItem} style={{ gridColumn: 'span 2' }}>
            <label className={styles.filterItemLabel}>Search Video, Epic, SME, or Topic</label>
            <input 
              type="text" 
              className={styles.filterInput} 
              placeholder="e.g. EPIC-11, VID-01, Drone, Safety..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Trade / Subject */}
          <div className={styles.filterItem}>
            <label className={styles.filterItemLabel}>Trade / Subject</label>
            <select 
              className={styles.filterSelect} 
              value={filterTrade} 
              onChange={e => setFilterTrade(e.target.value)}
            >
              <option value="ALL">All Trades ({tradesList.length})</option>
              {tradesList.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Assigned Cameraman */}
          <div className={styles.filterItem}>
            <label className={styles.filterItemLabel}>Cameraman</label>
            <select 
              className={styles.filterSelect} 
              value={filterCameraman} 
              onChange={e => setFilterCameraman(e.target.value)}
            >
              <option value="ALL">All Cameramen</option>
              {cameramenList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Assigned Editor */}
          <div className={styles.filterItem}>
            <label className={styles.filterItemLabel}>Editor</label>
            <select 
              className={styles.filterSelect} 
              value={filterEditor} 
              onChange={e => setFilterEditor(e.target.value)}
            >
              <option value="ALL">All Editors</option>
              {editorsList.map(ed => (
                <option key={ed} value={ed}>{ed}</option>
              ))}
            </select>
          </div>

          {/* Production Status */}
          <div className={styles.filterItem}>
            <label className={styles.filterItemLabel}>Shooting Status</label>
            <select 
              className={styles.filterSelect} 
              value={filterProdStatus} 
              onChange={e => setFilterProdStatus(e.target.value)}
            >
              <option value="ALL">All Shooting</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="RESHOOT">Reshoot Required</option>
            </select>
          </div>

          {/* Post-Production Status */}
          <div className={styles.filterItem}>
            <label className={styles.filterItemLabel}>Editing Status</label>
            <select 
              className={styles.filterSelect} 
              value={filterEditStatus} 
              onChange={e => setFilterEditStatus(e.target.value)}
            >
              <option value="ALL">All Editing</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Final Video Link Status */}
          <div className={styles.filterItem}>
            <label className={styles.filterItemLabel}>Final Delivery</label>
            <select 
              className={styles.filterSelect} 
              value={filterDeliveryStatus} 
              onChange={e => setFilterDeliveryStatus(e.target.value)}
            >
              <option value="ALL">All Deliveries</option>
              <option value="DELIVERED">Link Available ({totalVideos - linksMissingVideos})</option>
              <option value="LINK_MISSING">Link Missing ({linksMissingVideos})</option>
            </select>
          </div>

          {/* Date Range From */}
          <div className={styles.filterItem}>
            <label className={styles.filterItemLabel}>Date From</label>
            <input 
              type="date" 
              className={styles.filterInput} 
              value={filterDateFrom} 
              onChange={e => setFilterDateFrom(e.target.value)}
            />
          </div>

          {/* Date Range To */}
          <div className={styles.filterItem}>
            <label className={styles.filterItemLabel}>Date To</label>
            <input 
              type="date" 
              className={styles.filterInput} 
              value={filterDateTo} 
              onChange={e => setFilterDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          VIEW 1: STRUCTURED PAGINATED VIDEO REGISTER
         ======================================================== */}
      {activeView === 'REGISTER' && (
        <div className={styles.registerTableCard}>
          <div className={styles.registerTableCardHeader}>
            <div className={styles.registerTableTitle}>
              <span>📋</span>
              <span>Authoritative Video Production Register</span>
              <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#64748b', marginLeft: '6px' }}>
                (Showing {paginatedRows.length} of {filteredRows.length} filtered videos)
              </span>
            </div>

            {/* Quick role-based hint */}
            <div style={{ fontSize: '12px', color: '#475569' }}>
              <strong>Role Access: </strong>
              <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                {role}
              </span>
            </div>
          </div>

          <div className={styles.registerTableScroll}>
            <table className={styles.registerTable}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Sl</th>
                  <th className={styles.thSortable} onClick={() => handleSort('displayVideoId')}>
                    Video ID {sortBy === 'displayVideoId' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className={styles.thSortable} onClick={() => handleSort('epicSequence')}>
                    EPIC ID {sortBy === 'epicSequence' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className={styles.thSortable} onClick={() => handleSort('trade')}>
                    Trade / Subject {sortBy === 'trade' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className={styles.thSortable} onClick={() => handleSort('videoTitle')}>
                    Video Title / Topic {sortBy === 'videoTitle' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Assigned Cameraman</th>
                  <th className={styles.thSortable} onClick={() => handleSort('shootingStatus')}>
                    Shooting Status {sortBy === 'shootingStatus' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className={styles.thSortable} onClick={() => handleSort('shootingStartDate')}>
                    Shoot Start {sortBy === 'shootingStartDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Shoot End</th>
                  <th>Assigned Editor</th>
                  <th className={styles.thSortable} onClick={() => handleSort('editingStatus')}>
                    Editing Status {sortBy === 'editingStatus' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className={styles.thSortable} onClick={() => handleSort('editingStartDate')}>
                    Edit Start {sortBy === 'editingStartDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Edit End</th>
                  <th>Duration</th>
                  <th className={styles.thSortable} onClick={() => handleSort('hasLink')}>
                    Final Video Link {sortBy === 'hasLink' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map(row => {
                  const canEditShooting = role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'CAMERAMAN';
                  const canEditEditing = role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'EDITOR';
                  const canEditDeliverable = role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'EDITOR';

                  return (
                    <tr 
                      key={row.uniqueKey} 
                      className={!row.hasLink && row.editingStatus === 'COMPLETED' ? styles.rowWarning : ''}
                    >
                      {/* 1. Sl No */}
                      <td style={{ fontWeight: 600, color: '#64748b' }}>{row.slNo}</td>

                      {/* 2. Video ID */}
                      <td>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 700, 
                          color: '#0369a1', 
                          background: '#e0f2fe', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          fontSize: '11.5px' 
                        }}>
                          {row.displayVideoId}
                        </span>
                      </td>

                      {/* 3. EPIC ID */}
                      <td>
                        <strong style={{ color: '#0f2942' }}>{row.epicCode}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                          {row.smeName}
                        </div>
                      </td>

                      {/* 4. Trade / Subject */}
                      <td>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{row.trade}</span>
                      </td>

                      {/* 5. Video Title */}
                      <td style={{ maxWidth: '240px' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{row.videoTitle}</span>
                        {row.productionNotes && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {row.productionNotes}
                          </div>
                        )}
                      </td>

                      {/* 6. Assigned Cameraman */}
                      <td>
                        <span style={{ fontWeight: 600 }}>{row.cameraman}</span>
                        {row.shootingLocation && (
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            📍 {row.shootingLocation}
                          </div>
                        )}
                      </td>

                      {/* 7. Shooting Status */}
                      <td>
                        <span className={`${styles.badge} ${getBadgeClass(row.shootingStatus)}`}>
                          {row.shootingStatus}
                        </span>
                      </td>

                      {/* 8. Shooting Start Date */}
                      <td>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          {formatDateDisplay(row.shootingStartDate)}
                        </span>
                      </td>

                      {/* 9. Shooting End Date */}
                      <td>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          {formatDateDisplay(row.shootingEndDate)}
                        </span>
                      </td>

                      {/* 10. Assigned Editor */}
                      <td>
                        <span style={{ fontWeight: 600 }}>{row.editor}</span>
                      </td>

                      {/* 11. Editing Status */}
                      <td>
                        <span className={`${styles.badge} ${getBadgeClass(row.editingStatus)}`}>
                          {row.editingStatus}
                        </span>
                      </td>

                      {/* 12. Editing Start Date */}
                      <td>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          {formatDateDisplay(row.editingStartDate)}
                        </span>
                      </td>

                      {/* 13. Editing End Date */}
                      <td>
                        <span style={{ whiteSpace: 'nowrap' }}>
                          {formatDateDisplay(row.editingEndDate)}
                        </span>
                      </td>

                      {/* 14. Duration */}
                      <td>
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          {row.duration || '-'}
                        </span>
                      </td>

                      {/* 15. Final Video Link (Canonical from VideoLibrary) */}
                      <td>
                        {row.hasLink && row.finalVideoLink ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <a 
                              href={row.finalVideoLink} 
                              target="_blank" 
                              rel="noreferrer" 
                              className={styles.badgeHasLink}
                              title="Open final delivered video"
                            >
                              <span>🎬</span>
                              <span>View Video</span>
                            </a>
                            <Link 
                              href="/content" 
                              style={{ fontSize: '10px', color: '#0284c7', textDecoration: 'underline' }}
                              title="Go to Video Content Library"
                            >
                              Library Record
                            </Link>
                          </div>
                        ) : (
                          <span className={styles.badgeMissingLink}>
                            <span>⚠️</span>
                            <span>Link Missing</span>
                          </span>
                        )}
                      </td>

                      {/* 16. Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          {/* Cameraman / Shoot edit action */}
                          {canEditShooting && (
                            <button 
                              className={styles.btnEdit}
                              onClick={() => setEditingStage1({
                                ...row.scheduleRecord,
                                workEntryId: row.epicId,
                                epicSequence: row.epicSequence,
                                smeName: row.smeName,
                                trade: row.trade,
                                videoTitle: row.videoTitle,
                                cameraman: row.cameraman,
                                scheduledStart: row.shootingStartDate,
                                scheduledEnd: row.shootingEndDate,
                                location: row.shootingLocation,
                                status: row.shootingStatus
                              })}
                              title="Update shooting start/end dates and status"
                            >
                              Shoot
                            </button>
                          )}

                          {/* Editor / Post-Prod edit action */}
                          {canEditEditing && (
                            <button 
                              className={styles.btnEdit}
                              style={{ borderColor: '#ddd6fe', color: '#6d28d9' }}
                              onClick={() => setEditingStage2({
                                ...row.editorRecord,
                                workEntryId: row.epicId,
                                assignedVideo: row.videoTitle,
                                epicSequence: row.epicSequence,
                                smeName: row.smeName,
                                editorName: row.editor,
                                editingStartDate: row.editingStartDate,
                                editingEndDate: row.editingEndDate,
                                status: row.editingStatus,
                                cleanComments: row.reviewComments
                              })}
                              title="Update post-production start/end dates and status"
                            >
                              Edit
                            </button>
                          )}

                          {/* Final deliverable edit action */}
                          {canEditDeliverable && (
                            <button 
                              className={styles.btnEdit}
                              style={{ borderColor: '#bbf7d0', color: '#15803d' }}
                              onClick={() => setEditingStage3({
                                id: row.libraryRecord?.id || `final-${row.epicId}`,
                                workEntryId: row.epicId,
                                videoId: row.libraryRecord?.id,
                                epicSequence: row.epicSequence,
                                smeName: row.smeName,
                                title: row.videoTitle,
                                finalVideoFile: row.finalVideoLink || '',
                                finalDuration: row.duration || '',
                                finalVideoStatus: row.qualityReviewStatus || 'APPROVED'
                              })}
                              title="Update final deliverable link and auto-detect duration"
                            >
                              Link
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={16} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      <div style={{ fontSize: '20px', marginBottom: '8px' }}>🔍</div>
                      <strong>No video records match the selected filters.</strong>
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px' }}>
                        Try clearing search terms or resetting filters using the Reset button above.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className={styles.paginationBar}>
            <div className={styles.paginationInfo}>
              Showing <strong>{filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to <strong>{Math.min(currentPage * pageSize, filteredRows.length)}</strong> of <strong>{filteredRows.length}</strong> videos
            </div>

            <div className={styles.paginationControls}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Rows per page:</span>
              <select 
                className={styles.pageSizeDropdown}
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>

              <button 
                className={styles.pageBtn} 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                title="First Page"
              >
                «
              </button>
              <button 
                className={styles.pageBtn} 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                title="Previous Page"
              >
                ‹ Prev
              </button>

              {/* Page Number Chips */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  p = currentPage - 2 + i;
                  if (p > totalPages) p = totalPages - (4 - i);
                }
                return (
                  <button 
                    key={p}
                    className={`${styles.pageBtn} ${currentPage === p ? styles.pageBtnActive : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                );
              })}

              <button 
                className={styles.pageBtn} 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                title="Next Page"
              >
                Next ›
              </button>
              <button 
                className={styles.pageBtn} 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Last Page"
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 2: EPIC ID REPORTING VIEW (Grouped by Epic ID)
         ======================================================== */}
      {activeView === 'EPIC_REPORT' && (
        <div className={styles.epicReportContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 className={styles.cardTitle}>📑 EPIC ID-Based Production & Telecast Roll-Up Report</h2>
            <button className={styles.btnExport} onClick={handleExportCsv}>
              <span>⬇️</span>
              <span>Export All Records CSV</span>
            </button>
          </div>

          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
            Authoritative rollup reflecting live database records across all production and post-production stages for each Epic ID.
          </p>

          {workEntries.map(entry => {
            const epicSeq = entry.epicSequence;
            const epicCode = `EPIC-${epicSeq}`;
            const relatedVideos = videoRegister.filter(v => v.epicSequence === epicSeq);
            const totalInEpic = relatedVideos.length;
            const completedInEpic = relatedVideos.filter(v => v.hasLink && v.editingStatus === 'COMPLETED').length;
            const missingLinksInEpic = relatedVideos.filter(v => !v.hasLink).length;

            return (
              <div key={entry.id} className={styles.epicReportCard}>
                <div className={styles.epicReportCardHeader}>
                  <div className={styles.epicReportTitleGroup}>
                    <span className={styles.epicReportBadge}>{epicCode}</span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>
                        {entry.sme?.name || 'SME'} — {entry.trade || 'General'}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Master Topic: <strong>{entry.topic}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      fontWeight: 700,
                      background: completedInEpic === totalInEpic && totalInEpic > 0 ? '#dcfce7' : '#e0f2fe',
                      color: completedInEpic === totalInEpic && totalInEpic > 0 ? '#166534' : '#0369a1'
                    }}>
                      {completedInEpic} / {totalInEpic} Videos Delivered
                    </span>

                    {missingLinksInEpic > 0 && (
                      <span className={styles.badgeMissingLink}>
                        {missingLinksInEpic} Link{missingLinksInEpic > 1 ? 's' : ''} Missing
                      </span>
                    )}
                  </div>
                </div>

                {/* Epic Metadata Grid */}
                <div className={styles.epicReportMetaGrid}>
                  <div className={styles.epicMetaItem}>
                    <span className={styles.epicMetaLabel}>Recorded Videos</span>
                    <span className={styles.epicMetaValue}>{totalInEpic} Video Topic{totalInEpic > 1 ? 's' : ''}</span>
                  </div>

                  <div className={styles.epicMetaItem}>
                    <span className={styles.epicMetaLabel}>Shooting Window</span>
                    <span className={styles.epicMetaValue}>
                      {formatDateDisplay(entry.attendanceFrom)} to {formatDateDisplay(entry.attendanceTo)}
                    </span>
                  </div>

                  <div className={styles.epicMetaItem}>
                    <span className={styles.epicMetaLabel}>Primary Cameraman</span>
                    <span className={styles.epicMetaValue}>{relatedVideos[0]?.cameraman || 'Antony Alcander'}</span>
                  </div>

                  <div className={styles.epicMetaItem}>
                    <span className={styles.epicMetaLabel}>Primary Editor</span>
                    <span className={styles.epicMetaValue}>{relatedVideos[0]?.editor || 'Post-Production Team'}</span>
                  </div>
                </div>

                {/* Table of all video records under this Epic */}
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Video ID</th>
                        <th>Video Title / Topic</th>
                        <th>Cameraman & Shoot Dates</th>
                        <th>Editor & Post-Prod Dates</th>
                        <th>Duration</th>
                        <th>Final Video Link</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatedVideos.map(v => (
                        <tr key={v.uniqueKey}>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0369a1' }}>
                              {v.displayVideoId}
                            </span>
                          </td>
                          <td>
                            <strong>{v.videoTitle}</strong>
                          </td>
                          <td>
                            <span>{v.cameraman}</span>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {formatDateDisplay(v.shootingStartDate)} — {formatDateDisplay(v.shootingEndDate)}
                              <span className={`${styles.badge} ${getBadgeClass(v.shootingStatus)}`} style={{ marginLeft: '6px' }}>
                                {v.shootingStatus}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span>{v.editor}</span>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {formatDateDisplay(v.editingStartDate)} — {formatDateDisplay(v.editingEndDate)}
                              <span className={`${styles.badge} ${getBadgeClass(v.editingStatus)}`} style={{ marginLeft: '6px' }}>
                                {v.editingStatus}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{v.duration || '-'}</span>
                          </td>
                          <td>
                            {v.hasLink && v.finalVideoLink ? (
                              <a 
                                href={v.finalVideoLink} 
                                target="_blank" 
                                rel="noreferrer" 
                                className={styles.badgeHasLink}
                              >
                                🎬 Open Video
                              </a>
                            ) : (
                              <span className={styles.badgeMissingLink}>
                                ⚠️ Missing Link
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {(role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'CAMERAMAN') && (
                                <button 
                                  className={styles.btnEdit}
                                  onClick={() => setEditingStage1({
                                    ...v.scheduleRecord,
                                    workEntryId: v.epicId,
                                    epicSequence: v.epicSequence,
                                    smeName: v.smeName,
                                    trade: v.trade,
                                    videoTitle: v.videoTitle,
                                    cameraman: v.cameraman,
                                    scheduledStart: v.shootingStartDate,
                                    scheduledEnd: v.shootingEndDate,
                                    location: v.shootingLocation,
                                    status: v.shootingStatus
                                  })}
                                >
                                  Shoot
                                </button>
                              )}

                              {(role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'EDITOR') && (
                                <button 
                                  className={styles.btnEdit}
                                  style={{ borderColor: '#ddd6fe', color: '#6d28d9' }}
                                  onClick={() => setEditingStage2({
                                    ...v.editorRecord,
                                    workEntryId: v.epicId,
                                    assignedVideo: v.videoTitle,
                                    epicSequence: v.epicSequence,
                                    smeName: v.smeName,
                                    editorName: v.editor,
                                    editingStartDate: v.editingStartDate,
                                    editingEndDate: v.editingEndDate,
                                    status: v.editingStatus,
                                    cleanComments: v.reviewComments
                                  })}
                                >
                                  Edit
                                </button>
                              )}

                              {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
                                <button 
                                  className={styles.btnEdit}
                                  style={{ borderColor: '#bbf7d0', color: '#15803d' }}
                                  onClick={() => setEditingStage3({
                                    id: v.libraryRecord?.id || `final-${v.epicId}`,
                                    workEntryId: v.epicId,
                                    videoId: v.libraryRecord?.id,
                                    epicSequence: v.epicSequence,
                                    smeName: v.smeName,
                                    title: v.videoTitle,
                                    finalVideoFile: v.finalVideoLink || '',
                                    finalDuration: v.duration || '',
                                    finalVideoStatus: v.qualityReviewStatus || 'APPROVED'
                                  })}
                                >
                                  Link
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          VIEW 3: WORKFLOW STAGES (PRESERVED TOPIC ENTRY & TABS)
         ======================================================== */}
      {activeView === 'WORKFLOW_STAGES' && (
        <div>
          {/* Workflow Stage Sub-Tabs */}
          <div className={styles.workflowTabs}>
            <button 
              className={`${styles.workflowTabBtn} ${activeStage === 'STAGE_1' ? styles.workflowTabBtnActive : ''}`}
              onClick={() => setActiveStage('STAGE_1')}
            >
              <span>🎬 Stage 1: Production (Shooting)</span>
              <span className={styles.workflowTabBadge}>
                {workEntries.reduce((acc, e) => acc + (e.shootingSchedules?.length || 0), 0)}
              </span>
            </button>

            <button 
              className={`${styles.workflowTabBtn} ${activeStage === 'STAGE_2' ? styles.workflowTabBtnActive : ''}`}
              onClick={() => setActiveStage('STAGE_2')}
            >
              <span>✂️ Stage 2: Post-Production (Editing & Animation)</span>
              <span className={styles.workflowTabBadge}>
                {workEntries.reduce((acc, e) => acc + (e.videoEditorRecords?.length || 0), 0)}
              </span>
            </button>

            <button 
              className={`${styles.workflowTabBtn} ${activeStage === 'STAGE_3' ? styles.workflowTabBtnActive : ''}`}
              onClick={() => setActiveStage('STAGE_3')}
            >
              <span>📦 Stage 3: Final Video Deliverable (Library)</span>
              <span className={styles.workflowTabBadge}>
                {workEntries.reduce((acc, e) => acc + (e.finalVideoRecords?.length || e.videoLibraries?.length || 0), 0)}
              </span>
            </button>
          </div>

          {/* STAGE 1: PRODUCTION */}
          {activeStage === 'STAGE_1' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>🎬 Stage 1: Production Stage (Shooting)</h2>
              </div>

              {/* Form to Add Video Topic by Epic ID */}
              {(role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'CAMERAMAN') && (
                <form onSubmit={handleCreateStage1} className={styles.createForm}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Epic ID *</label>
                    <select 
                      className={styles.formSelect} 
                      value={selectedEpicId} 
                      onChange={e => {
                        setSelectedEpicId(e.target.value);
                        setHighlightedScheduleId(null);
                      }}
                      required
                    >
                      <option value="">Select Recorded Epic ID...</option>
                      {workEntries.map(entry => (
                        <option key={entry.id} value={entry.id}>
                          EPIC-{entry.epicSequence} — {entry.sme?.name || 'SME'} ({entry.trade || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>SME Name (Auto-populated)</label>
                    <input 
                      type="text" 
                      className={`${styles.formInput} ${styles.formInputReadOnly}`}
                      value={selectedEpic?.sme?.name ? `${selectedEpic.sme.name} (${selectedEpic.trade || 'General'})` : 'Auto-populated from Epic ID'}
                      readOnly 
                    />
                  </div>

                  <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.formLabel}>
                      Video Title / Topic * <span style={{ fontWeight: 'normal', color: '#64748b' }}>(Add one-by-one under selected Epic ID)</span>
                    </label>
                    <input 
                      id="video-title-input"
                      type="text" 
                      className={styles.formInput} 
                      placeholder="e.g. Topic 1: Safety & Personal Protective Equipment" 
                      value={videoTitle}
                      onChange={e => setVideoTitle(e.target.value)}
                      required
                    />

                    {selectedEpic && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📋 Recorded Video Topics under EPIC-{selectedEpic.epicSequence}</span>
                          <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                            {selectedEpic.shootingSchedules?.length || 0}
                          </span>
                        </div>

                        {selectedEpic.shootingSchedules && selectedEpic.shootingSchedules.length > 0 ? (
                          <div className={styles.topicChipsContainer}>
                            {selectedEpic.shootingSchedules.map((s: any, idx: number) => {
                              const isHighlighted = highlightedScheduleId === s.id;
                              return (
                                <button
                                  key={s.id || idx}
                                  type="button"
                                  className={`${styles.topicChip} ${isHighlighted ? styles.topicChipActive : ''}`}
                                  onClick={() => {
                                    setHighlightedScheduleId(s.id);
                                    setEditingStage1({
                                      ...s,
                                      workEntryId: s.workEntryId || selectedEpic.id,
                                      epicSequence: selectedEpic.epicSequence,
                                      smeName: selectedEpic.sme?.name,
                                      trade: selectedEpic.trade
                                    });
                                  }}
                                  title={`Click to edit: ${s.videoTitle || 'Untitled Topic'}`}
                                >
                                  <span className={`${styles.topicChipDot} ${
                                    s.status === 'COMPLETED' ? styles.dotCompleted :
                                    s.status === 'IN_PROGRESS' ? styles.dotProgress :
                                    s.status === 'RESHOOT' ? styles.dotReshoot : styles.dotPlanned
                                  }`} />
                                  <span>#{idx + 1} {s.videoTitle || 'Untitled Topic'}</span>
                                  <span className={styles.topicChipEditIcon}>✏️</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Shooting Start Date</label>
                    <input 
                      type="date" 
                      className={styles.formInput} 
                      value={shootStartDate} 
                      onChange={e => setShootStartDate(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Shooting End Date</label>
                    <input 
                      type="date" 
                      className={styles.formInput} 
                      value={shootEndDate} 
                      onChange={e => setShootEndDate(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Shooting Location</label>
                    <select 
                      className={styles.formSelect}
                      value={shootLocationType}
                      onChange={e => {
                        const val = e.target.value as any;
                        setShootLocationType(val);
                        if (val !== 'On-site') setShootLocationCustom('');
                      }}
                    >
                      <option value="">Select Location...</option>
                      <option value="Studio - NIMI Chennai">Studio - NIMI Chennai</option>
                      <option value="On-site">On-site (Enter details below)</option>
                    </select>
                    {shootLocationType === 'On-site' && (
                      <input 
                        type="text" 
                        className={styles.formInput} 
                        placeholder="e.g. Field / Lab / Industry premises"
                        value={shootLocationCustom} 
                        onChange={e => setShootLocationCustom(e.target.value)}
                        style={{ marginTop: '6px' }}
                      />
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Cameraman</label>
                    <select 
                      className={styles.formSelect}
                      value={cameramanSelect}
                      onChange={e => {
                        const val = e.target.value as any;
                        setCameramanSelect(val);
                        if (val !== 'OTHER') setCameramanCustom('');
                      }}
                    >
                      <option value="">Select Cameraman...</option>
                      <option value="Antony Alcander">Antony Alcander</option>
                      <option value="Parasuraman">Parasuraman</option>
                      <option value="OTHER">Other / External</option>
                    </select>
                    {cameramanSelect === 'OTHER' && (
                      <input 
                        type="text" 
                        className={styles.formInput} 
                        placeholder="Enter cameraman name"
                        value={cameramanCustom} 
                        onChange={e => setCameramanCustom(e.target.value)}
                        style={{ marginTop: '6px' }}
                      />
                    )}
                  </div>

                  <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.formLabel}>Production Notes</label>
                    <textarea 
                      className={styles.formInput} 
                      rows={2}
                      placeholder="Special equipment, camera setup, scene requirements..."
                      value={productionNotes}
                      onChange={e => setProductionNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button type="submit" className={styles.btnPrimary} disabled={loading}>
                      {loading ? 'Adding...' : '+ Add Video Topic'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* STAGE 2: POST-PRODUCTION */}
          {activeStage === 'STAGE_2' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>✂️ Stage 2: Post-Production Stage (Editing & Animation)</h2>
              </div>

              {/* Stage 2 Filter Bar */}
              <div className={styles.stage2FilterBar}>
                <div style={{ flex: '1 1 320px' }}>
                  <label className={styles.formLabel}>🎯 Choose Epic ID to Manage Post-Production:</label>
                  <select 
                    className={styles.formSelect} 
                    value={stage2EpicFilter} 
                    onChange={e => setStage2EpicFilter(e.target.value)}
                  >
                    <option value="">-- All Epic IDs ({workEntries.length} Total) --</option>
                    {workEntries.map(entry => {
                      const videoCount = (entry.shootingSchedules?.length || 0);
                      return (
                        <option key={entry.id} value={entry.id}>
                          EPIC-{entry.epicSequence} — {entry.sme?.name || 'SME'} ({videoCount} Topics)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Stage 2 Table */}
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Epic ID & SME</th>
                      <th>Video Title / Topic</th>
                      <th>Shoot Status</th>
                      <th>Video Editor & Dates</th>
                      <th>Editing Status</th>
                      <th>Final Video File</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videoRegister
                      .filter(r => !stage2EpicFilter || r.epicId === stage2EpicFilter)
                      .map(r => (
                        <tr key={r.uniqueKey}>
                          <td>
                            <strong style={{ color: '#0369a1' }}>{r.epicCode}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{r.smeName}</div>
                          </td>
                          <td>
                            <strong>{r.videoTitle}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Trade: {r.trade}</div>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${getBadgeClass(r.shootingStatus)}`}>
                              {r.shootingStatus}
                            </span>
                          </td>
                          <td>
                            <strong>{r.editor}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              <span>Start: {formatDateDisplay(r.editingStartDate)}</span><br/>
                              <span>End: {formatDateDisplay(r.editingEndDate)}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${getBadgeClass(r.editingStatus)}`}>
                              {r.editingStatus}
                            </span>
                          </td>
                          <td>
                            {r.hasLink && r.finalVideoLink ? (
                              <a href={r.finalVideoLink} target="_blank" rel="noreferrer" style={{ color: '#0369a1', fontWeight: 700, fontSize: '12px' }}>
                                📁 Storage File
                              </a>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                          <td>
                            {(role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'EDITOR') && (
                              <button 
                                className={styles.btnEdit}
                                onClick={() => setEditingStage2({
                                  ...r.editorRecord,
                                  workEntryId: r.epicId,
                                  assignedVideo: r.videoTitle,
                                  epicSequence: r.epicSequence,
                                  smeName: r.smeName,
                                  editorName: r.editor,
                                  editingStartDate: r.editingStartDate,
                                  editingEndDate: r.editingEndDate,
                                  status: r.editingStatus,
                                  cleanComments: r.reviewComments
                                })}
                              >
                                Edit Details
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STAGE 3: FINAL DELIVERABLES */}
          {activeStage === 'STAGE_3' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>📦 Stage 3: Final Video Deliverable (Library Integration)</h2>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Epic ID & SME</th>
                      <th>Video Title / Trade</th>
                      <th>Final Video Link / File</th>
                      <th>Approval Status</th>
                      <th>Final Duration</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videoRegister.map(r => (
                      <tr key={r.uniqueKey}>
                        <td>
                          <strong style={{ color: '#0369a1' }}>{r.epicCode}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{r.smeName}</div>
                        </td>
                        <td>
                          <strong>{r.videoTitle}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Trade: {r.trade}</div>
                        </td>
                        <td>
                          {r.hasLink && r.finalVideoLink ? (
                            <a href={r.finalVideoLink} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 700 }}>
                              🎬 View Final Video
                            </a>
                          ) : (
                            <span className={styles.badgeMissingLink}>Awaiting Link</span>
                          )}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${getBadgeClass(r.qualityReviewStatus)}`}>
                            {r.qualityReviewStatus}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{r.duration || '-'}</span>
                        </td>
                        <td>
                          {(role === 'ADMIN' || role === 'TEAM_MEMBER') && (
                            <button 
                              className={styles.btnEdit}
                              onClick={() => setEditingStage3({
                                id: r.libraryRecord?.id || `final-${r.epicId}`,
                                workEntryId: r.epicId,
                                videoId: r.libraryRecord?.id,
                                epicSequence: r.epicSequence,
                                smeName: r.smeName,
                                title: r.videoTitle,
                                finalVideoFile: r.finalVideoLink || '',
                                finalDuration: r.duration || '',
                                finalVideoStatus: r.qualityReviewStatus || 'APPROVED'
                              })}
                            >
                              Edit Details
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          EDIT MODAL: STAGE 1 (SHOOTING SCHEDULE)
         ======================================================== */}
      {editingStage1 && (
        <Stage1EditModal 
          record={editingStage1}
          loading={loading}
          errorMessage={error}
          onClose={() => { setEditingStage1(null); setError(null); }}
          onSave={handleSaveStage1Edit}
        />
      )}

      {/* ========================================================
          EDIT MODAL: STAGE 2 (POST-PRODUCTION)
         ======================================================== */}
      {editingStage2 && (
        <Stage2EditModal 
          record={editingStage2}
          loading={loading}
          onClose={() => setEditingStage2(null)}
          onSave={handleSaveStage2Edit}
        />
      )}

      {/* ========================================================
          EDIT MODAL: STAGE 3 (FINAL DELIVERABLE)
         ======================================================== */}
      {editingStage3 && (
        <Stage3EditModal 
          record={editingStage3}
          loading={loading}
          onClose={() => setEditingStage3(null)}
          onSave={handleSaveStage3Edit}
        />
      )}
    </div>
  );
}

// =========================================================================
// STAGE 1 EDIT MODAL COMPONENT
// =========================================================================
function parseLocationInit(loc?: string | null) {
  if (!loc) return { type: '' as '' | 'Studio - NIMI Chennai' | 'On-site', custom: '' };
  const trimmed = loc.trim();
  if (trimmed === 'Studio - NIMI Chennai' || trimmed === 'Studio / NIMI Chennai') {
    return { type: 'Studio - NIMI Chennai' as const, custom: '' };
  }
  if (trimmed.toLowerCase().startsWith('on-site')) {
    const customPart = trimmed.replace(/^on-site\s*[-:]?\s*/i, '').trim();
    return { type: 'On-site' as const, custom: customPart };
  }
  return { type: 'On-site' as const, custom: trimmed };
}

function parseCameramanInit(cam?: string | null) {
  if (!cam) return { select: 'Antony Alcander' as const, custom: '' };
  const trimmed = cam.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'production team' || lower === 'production' || lower === 'team' || lower === '-' || lower === 'null') {
    return { select: 'Antony Alcander' as const, custom: '' };
  }
  if (lower === 'antony alcander' || lower === 'anotony alcander') {
    return { select: 'Antony Alcander' as const, custom: '' };
  }
  if (lower === 'parasuraman') {
    return { select: 'Parasuraman' as const, custom: '' };
  }
  return { select: 'OTHER' as const, custom: trimmed };
}

function Stage1EditModal({ record, loading, errorMessage, onClose, onSave }: any) {
  const initLoc = parseLocationInit(record.location);
  const initCam = parseCameramanInit(record.cameraman);

  const [locationType, setLocationType] = useState<'' | 'Studio - NIMI Chennai' | 'On-site'>(initLoc.type);
  const [locationCustom, setLocationCustom] = useState(initLoc.custom);
  const [cameramanSelect, setCameramanSelect] = useState<'' | 'Antony Alcander' | 'Parasuraman' | 'OTHER'>(initCam.select);
  const [cameramanCustom, setCameramanCustom] = useState(initCam.custom);

  const [formData, setFormData] = useState({
    videoTitle: record.videoTitle || '',
    scheduledStart: formatDateForInput(record.scheduledStart || record.shootDate),
    scheduledEnd: formatDateForInput(record.scheduledEnd),
    status: record.status || 'PLANNED',
    productionNotes: record.productionNotes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.scheduledStart && formData.scheduledEnd && new Date(formData.scheduledEnd) < new Date(formData.scheduledStart)) {
      alert('Production End Date cannot be earlier than Production Start Date.');
      return;
    }

    let finalLocation: string | null = null;
    if (locationType === 'Studio - NIMI Chennai') {
      finalLocation = 'Studio - NIMI Chennai';
    } else if (locationType === 'On-site') {
      finalLocation = locationCustom.trim()
        ? (locationCustom.trim().toLowerCase().startsWith('on-site')
            ? locationCustom.trim()
            : `On-site - ${locationCustom.trim()}`)
        : 'On-site';
    }

    let finalCameraman: string | null = null;
    if (cameramanSelect === 'Antony Alcander' || cameramanSelect === 'Parasuraman') {
      finalCameraman = cameramanSelect;
    } else if (cameramanSelect === 'OTHER') {
      finalCameraman = cameramanCustom.trim() || null;
    }

    onSave(record.id, {
      ...formData,
      location: finalLocation,
      cameraman: finalCameraman,
      workEntryId: record.workEntryId
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            🎬 Production Shoot: EPIC-{record.epicSequence} ({record.videoTitle || 'Topic'})
          </h3>
          <button className={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>

        {errorMessage && (
          <div className={styles.errorAlert} style={{ margin: '16px' }}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Video Title / Topic *</label>
              <input 
                type="text" 
                className={styles.formInput} 
                value={formData.videoTitle} 
                onChange={e => setFormData({ ...formData, videoTitle: e.target.value })}
                required 
              />
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Shooting Start Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.scheduledStart} 
                  onChange={e => setFormData({ ...formData, scheduledStart: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Shooting End Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.scheduledEnd} 
                  onChange={e => setFormData({ ...formData, scheduledEnd: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Shooting Location</label>
                <select 
                  className={styles.formSelect} 
                  value={locationType} 
                  onChange={e => {
                    const val = e.target.value as any;
                    setLocationType(val);
                    if (val !== 'On-site') setLocationCustom('');
                  }}
                >
                  <option value="">Select Location...</option>
                  <option value="Studio - NIMI Chennai">Studio - NIMI Chennai</option>
                  <option value="On-site">On-site (Field / Lab / Outside Studio)</option>
                </select>
                {locationType === 'On-site' && (
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    placeholder="Enter site name / premises"
                    value={locationCustom} 
                    onChange={e => setLocationCustom(e.target.value)}
                    style={{ marginTop: '4px' }}
                  />
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Cameraman</label>
                <select 
                  className={styles.formSelect} 
                  value={cameramanSelect} 
                  onChange={e => {
                    const val = e.target.value as any;
                    setCameramanSelect(val);
                    if (val !== 'OTHER') setCameramanCustom('');
                  }}
                >
                  <option value="Antony Alcander">Antony Alcander</option>
                  <option value="Parasuraman">Parasuraman</option>
                  <option value="OTHER">Other Cameraman</option>
                </select>
                {cameramanSelect === 'OTHER' && (
                  <input 
                    type="text" 
                    className={styles.formInput} 
                    placeholder="Enter Cameraman Name"
                    value={cameramanCustom} 
                    onChange={e => setCameramanCustom(e.target.value)}
                    style={{ marginTop: '4px' }}
                  />
                )}
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Production Status</label>
              <select 
                className={styles.formSelect} 
                value={formData.status} 
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="RESHOOT">Reshoot Required</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Production Notes</label>
              <textarea 
                className={styles.formInput} 
                rows={3}
                value={formData.productionNotes} 
                onChange={e => setFormData({ ...formData, productionNotes: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Shooting Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// STAGE 2 EDIT MODAL COMPONENT (POST-PRODUCTION)
// =========================================================================
function Stage2EditModal({ record, loading, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    editorName: cleanEditorDisplay(record.editorName),
    assignedVideo: record.assignedVideo || '',
    editingStartDate: formatDateForInput(record.editingStartDate || '2026-10-05'),
    editingEndDate: formatDateForInput(record.editingEndDate || extractEndDate(record.reviewComments) || '2026-10-15'),
    status: record.status || 'COMPLETED',
    roughCutLink: record.roughCutLink || '',
    finalCutLink: record.finalCutLink || '',
    duration: record.duration || '',
    finalVideoFile: record.finalVideoFile || '',
    reviewComments: record.cleanComments || cleanReviewComments(record.reviewComments) || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.editingStartDate && formData.editingEndDate && new Date(formData.editingEndDate) < new Date(formData.editingStartDate)) {
      alert('Post-Production End Date cannot be earlier than Start Date.');
      return;
    }
    onSave(record.id, formData, record.workEntryId);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            ✂️ Post-Production Details: EPIC-{record.epicSequence} ({record.assignedVideo})
          </h3>
          <button className={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {formData.status === 'COMPLETED' && (
              <div style={{ padding: '10px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '13px', fontWeight: 600 }}>
                🚀 Setting status to COMPLETED advances this video to Stage 3 (Final Video Deliverable / Library)!
              </div>
            )}

            <div className={styles.formField}>
              <label className={styles.formLabel}>Video Title / Topic</label>
              <input 
                type="text" 
                className={`${styles.formInput} ${styles.formInputReadOnly}`}
                value={formData.assignedVideo} 
                readOnly
              />
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Video Editor Name</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  placeholder="Assigned editor name"
                  value={formData.editorName} 
                  onChange={e => setFormData({ ...formData, editorName: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Post-Production Status</label>
                <select 
                  className={styles.formSelect} 
                  value={formData.status} 
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Editing Start Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.editingStartDate} 
                  onChange={e => setFormData({ ...formData, editingStartDate: e.target.value })}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Editing End Date</label>
                <input 
                  type="date" 
                  className={styles.formInput} 
                  value={formData.editingEndDate} 
                  onChange={e => setFormData({ ...formData, editingEndDate: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Final Video Storage File / URL</label>
              <input 
                type="url" 
                className={styles.formInput} 
                placeholder="Cloud storage / Vercel blob link"
                value={formData.finalVideoFile} 
                onChange={e => setFormData({ ...formData, finalVideoFile: e.target.value })}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Review Comments & Notes</label>
              <textarea 
                className={styles.formInput} 
                rows={3}
                placeholder="Editorial feedback or corrections..."
                value={formData.reviewComments} 
                onChange={e => setFormData({ ...formData, reviewComments: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Post-Production'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// STAGE 3 EDIT MODAL COMPONENT (FINAL DELIVERABLE)
// =========================================================================
function probeBrowserVideo(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Browser environment not available'));
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;

    let finished = false;
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        reject(new Error('Browser duration detection timed out.'));
      }
    }, 6000);

    video.onloadedmetadata = () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        const dur = video.duration;
        cleanup();
        if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
          resolve(dur);
        } else {
          reject(new Error('Invalid duration metadata.'));
        }
      }
    };

    video.onerror = () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        cleanup();
        reject(new Error('Direct browser loading unavailable for this URL.'));
      }
    };
  });
}

function formatSecondsToDuration(seconds: number): string {
  const s = Math.round(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function Stage3EditModal({ record, loading, onClose, onSave }: any) {
  const [formData, setFormData] = useState({
    finalVideoStatus: record.finalVideoStatus || 'APPROVED',
    finalVideoFile: record.finalVideoFile || '',
    finalDuration: record.finalDuration || '',
    videoId: record.videoId,
    title: record.title
  });

  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'detecting' | 'success' | 'error' | 'manual'>('idle');
  const [detectionMessage, setDetectionMessage] = useState<string>('');
  const lastAnalyzedUrl = useRef<string>(record.finalVideoFile || '');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const analyzeVideoUrl = async (rawUrl: string) => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) {
      lastAnalyzedUrl.current = '';
      setIsDetecting(false);
      setDetectionStatus('idle');
      setDetectionMessage('');
      setFormData(prev => ({ ...prev, finalDuration: '' }));
      return;
    }

    if (trimmed === lastAnalyzedUrl.current && formData.finalDuration) {
      return;
    }

    lastAnalyzedUrl.current = trimmed;
    setIsDetecting(true);
    setDetectionStatus('detecting');
    setDetectionMessage('Detecting video duration from source metadata...');
    setFormData(prev => ({ ...prev, finalDuration: '' }));

    let detectedSec: number | null = null;
    try {
      detectedSec = await probeBrowserVideo(trimmed);
    } catch (_) {}

    if (detectedSec && detectedSec > 0) {
      const formatted = formatSecondsToDuration(detectedSec);
      setFormData(prev => ({ ...prev, finalDuration: formatted }));
      setDetectionStatus('success');
      setDetectionMessage(`✓ Auto-detected duration: ${formatted}`);
      setIsDetecting(false);
      return;
    }

    try {
      const serverRes = await detectVideoDuration(trimmed);
      if (serverRes.success && serverRes.duration) {
        setFormData(prev => ({ ...prev, finalDuration: serverRes.duration }));
        setDetectionStatus('success');
        setDetectionMessage(`✓ Auto-detected duration: ${serverRes.duration}`);
      } else {
        setDetectionStatus('error');
        setDetectionMessage(serverRes.error || '⚠️ Could not auto-detect duration. You can enter it manually below.');
      }
    } catch {
      setDetectionStatus('error');
      setDetectionMessage('⚠️ Inaccessible video link or restricted permissions. Please enter duration manually below.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setFormData(prev => ({ ...prev, finalVideoFile: newUrl }));
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const trimmed = newUrl.trim();
    if (!trimmed) {
      lastAnalyzedUrl.current = '';
      setIsDetecting(false);
      setDetectionStatus('idle');
      setDetectionMessage('');
      setFormData(prev => ({ ...prev, finalDuration: '' }));
      return;
    }

    if (trimmed !== lastAnalyzedUrl.current) {
      setFormData(prev => ({ ...prev, finalDuration: '' }));
      setDetectionStatus('detecting');
      setDetectionMessage('Analyzing video duration...');
    }

    debounceTimer.current = setTimeout(() => {
      analyzeVideoUrl(trimmed);
    }, 600);
  };

  const handleUrlBlur = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const trimmed = formData.finalVideoFile.trim();
    if (trimmed && trimmed !== lastAnalyzedUrl.current) {
      analyzeVideoUrl(trimmed);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(record.id, formData, record.workEntryId);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            📦 Final Deliverable: EPIC-{record.epicSequence} ({record.title})
          </h3>
          <button className={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Final Approval Status</label>
              <select 
                className={styles.formSelect} 
                value={formData.finalVideoStatus} 
                onChange={e => setFormData({ ...formData, finalVideoStatus: e.target.value })}
              >
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending Approval</option>
                <option value="REVISION_REQUIRED">Revision Required</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Final Video File / Storage Link (Video Content Library)
                {isDetecting && (
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: '#0284c7', fontWeight: 'normal' }}>
                    ⏳ Analyzing duration...
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="url" 
                  className={styles.formInput} 
                  placeholder="https://... (e.g. MP4, WebM, Vercel Blob, Cloud Storage)"
                  value={formData.finalVideoFile} 
                  onChange={e => handleUrlChange(e.target.value)}
                  onBlur={handleUrlBlur}
                />
                <button
                  type="button"
                  onClick={() => analyzeVideoUrl(formData.finalVideoFile)}
                  disabled={isDetecting || !formData.finalVideoFile.trim()}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: isDetecting ? '#f1f5f9' : '#ffffff',
                    color: '#1e293b',
                    cursor: isDetecting || !formData.finalVideoFile.trim() ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  title="Detect duration from video URL"
                >
                  {isDetecting ? 'Detecting...' : '🔍 Detect'}
                </button>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>
                Final Duration
                <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                  (Auto-detected from video; manual correction allowed)
                </span>
              </label>
              <input 
                type="text" 
                className={styles.formInput} 
                placeholder="e.g. 05:30, 01:15:00, or auto-detected"
                value={formData.finalDuration} 
                onChange={e => {
                  setFormData({ ...formData, finalDuration: e.target.value });
                  setDetectionStatus('manual');
                  setDetectionMessage('Manual entry / correction');
                }}
              />
            </div>

            {/* Real-time duration detection feedback */}
            {isDetecting && (
              <div style={{
                padding: '10px 14px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '16px' }}>⏳</span>
                <span><strong>Analyzing video:</strong> Retrieving duration metadata from source...</span>
              </div>
            )}

            {!isDetecting && detectionStatus === 'success' && (
              <div style={{
                padding: '10px 14px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>✓</span>
                <span>{detectionMessage}</span>
              </div>
            )}

            {!isDetecting && detectionStatus === 'error' && (
              <div style={{
                padding: '10px 14px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>⚠️</span>
                <span>{detectionMessage}</span>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnSave} disabled={loading || isDetecting}>
              {loading ? 'Saving...' : 'Save Deliverable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
