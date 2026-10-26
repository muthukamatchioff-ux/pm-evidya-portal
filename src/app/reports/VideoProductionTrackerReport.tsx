'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export interface VideoProductionTrackerReportProps {
  initialRecords?: any[];
  onClose?: () => void;
  isPrintOnly?: boolean;
}

// Unified Video Row Model (Matching 16 structured tracker fields)
export interface StructuredVideoRow {
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
  videoTopic: string;
  
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
  durationSeconds: number;
  finalVideoLink: string | null;
  hasLink: boolean;
}

// Helpers
function formatEpicCode(epicSeq: any): string {
  if (!epicSeq || epicSeq === 0 || epicSeq === '0' || epicSeq === '-') return '-';
  const num = parseInt(epicSeq, 10);
  if (isNaN(num) || num <= 0) return '-';
  return `EPIC-2026-PMeVidya ${String(num).padStart(2, '0')}`;
}

function formatDateDisplay(dateVal: any): string {
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

function parseDurationToSeconds(dur?: string | null): number {
  if (!dur || typeof dur !== 'string') return 0;
  const clean = dur.trim();
  if (!clean || clean === '-' || clean.toLowerCase() === 'null') return 0;
  const parts = clean.split(':').map(p => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

function formatSecondsToHHMMSS(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');
}

function cleanCameraman(name?: string | null): string {
  if (!name) return 'Unassigned';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || lower === 'null') return 'Unassigned';
  return trimmed;
}

function cleanEditor(name?: string | null): string {
  if (!name) return 'Not assigned';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed || trimmed === '-' || lower === 'null' || lower === 'not assigned') return 'Not assigned';
  return trimmed;
}

export default function VideoProductionTrackerReport({
  initialRecords = [],
  onClose,
  isPrintOnly = false
}: VideoProductionTrackerReportProps) {
  // Normalize records into StructuredVideoRow[]
  const allRows: StructuredVideoRow[] = useMemo(() => {
    if (!initialRecords || initialRecords.length === 0) return [];

    // If already in flattened format (has epicCode and videoTopic or videoTitle)
    if (initialRecords[0]?.epicCode && (initialRecords[0]?.videoTopic || initialRecords[0]?.videoTitle)) {
      return initialRecords.map((r: any, idx: number) => {
        const dur = r.duration || null;
        return {
          slNo: r.slNo || r.sNo || idx + 1,
          sNo: r.sNo || r.slNo || idx + 1,
          month: r.month || 'June',
          uniqueKey: r.uniqueKey || `row-${idx}`,
          videoId: r.videoId || `VID-${idx + 1}`,
          displayVideoId: r.displayVideoId || `VID-${String(idx + 1).padStart(3, '0')}`,
          epicId: r.epicId || '',
          epicSequence: r.epicSequence || 1,
          epicCode: r.epicCode || formatEpicCode(r.epicSequence),
          trade: r.trade || 'General',
          smeName: r.smeName || 'Unassigned',
          videoTopic: r.videoTopic || r.videoTitle || 'Untitled Topic',
          cameraman: cleanCameraman(r.cameraman),
          shootingStatus: r.shootingStatus || 'Yet to shoot',
          shootingStartDate: r.shootingStartDate || null,
          shootingEndDate: r.shootingEndDate || null,
          shootingLocation: r.shootingLocation || null,
          productionNotes: r.productionNotes || null,
          editor: cleanEditor(r.editor || r.editorName),
          editingStatus: r.editingStatus || 'Pending',
          editingStartDate: r.editingStartDate || null,
          editingEndDate: r.editingEndDate || null,
          reviewComments: r.reviewComments || null,
          duration: dur,
          durationSeconds: parseDurationToSeconds(dur),
          finalVideoLink: r.finalVideoLink || r.videoLink || null,
          hasLink: Boolean(r.finalVideoLink || r.videoLink)
        };
      }).sort((a: StructuredVideoRow, b: StructuredVideoRow) => a.sNo - b.sNo);
    }

    // Flatten from raw workEntries
    const rows: StructuredVideoRow[] = [];
    initialRecords.forEach((entry: any) => {
      const epicSeq = entry.epicSequence || 1;
      const combinedVideos = entry.videoLibraries || [];
      const schedules = entry.shootingSchedules || [];
      const editors = entry.videoEditorRecords || [];
      const finals = entry.finalVideoRecords || [];

      const videoIdMap = new Map<string, { lib?: any; schedule?: any; editor?: any }>();

      combinedVideos.forEach((v: any) => videoIdMap.set(v.id, { lib: v }));

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
        const trade = lib?.trade || entry.trade || 'General';
        const smeName = lib?.smeName || entry.sme?.name || 'Unassigned';
        const title = lib?.title || sched?.videoTitle || ed?.assignedVideo || entry.topic || 'Untitled Topic';

        const shootingStartDate = sched?.scheduledStart || sched?.shootDate || entry.attendanceFrom || null;
        const shootingEndDate = sched?.scheduledEnd || entry.attendanceTo || null;
        const shootingStatus = sched?.status || 'Yet to shoot';
        const cameraman = cleanCameraman(sched?.cameraman);

        const editingStartDate = ed?.editingStartDate || null;
        const editingEndDate = ed?.editingEndDate || null;
        const editingStatus = ed?.status || 'Pending';
        const editor = cleanEditor(ed?.editorName);

        const finalVideoLink = lib?.videoLink || ed?.finalVideoFile || fin?.finalVideoFile || null;
        const hasLink = Boolean(finalVideoLink && finalVideoLink.trim() !== '' && finalVideoLink !== '-');
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
          videoTopic: title,
          cameraman,
          shootingStatus,
          shootingStartDate: shootingStartDate ? String(shootingStartDate) : null,
          shootingEndDate: shootingEndDate ? String(shootingEndDate) : null,
          shootingLocation: sched?.location || null,
          productionNotes: sched?.productionNotes || null,
          editor,
          editingStatus,
          editingStartDate: editingStartDate ? String(editingStartDate) : null,
          editingEndDate: editingEndDate ? String(editingEndDate) : null,
          reviewComments: ed?.reviewComments || null,
          duration,
          durationSeconds: parseDurationToSeconds(duration),
          finalVideoLink: hasLink ? finalVideoLink : null,
          hasLink
        });

        subIdx++;
      });
    });

    rows.sort((a, b) => a.sNo - b.sNo);
    return rows;
  }, [initialRecords]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEpic, setFilterEpic] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterTrade, setFilterTrade] = useState('');
  const [filterCameraman, setFilterCameraman] = useState('');
  const [filterEditor, setFilterEditor] = useState('');
  const [filterShootingStatus, setFilterShootingStatus] = useState('');
  const [filterEditingStatus, setFilterEditingStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'DETAILED'>('DASHBOARD');

  // Filter Dropdown Options (derived strictly from persisted records)
  const filterOptions = useMemo(() => {
    const epics = new Set<string>();
    const months = new Set<string>();
    const trades = new Set<string>();
    const cameramen = new Set<string>();
    const editors = new Set<string>();
    const shootingStatuses = new Set<string>();
    const editingStatuses = new Set<string>();

    allRows.forEach(r => {
      if (r.epicCode && r.epicCode !== '-') epics.add(r.epicCode);
      if (r.month && r.month !== '-') months.add(r.month);
      if (r.trade && r.trade !== '-') trades.add(r.trade);
      if (r.cameraman && r.cameraman !== '-') cameramen.add(r.cameraman);
      if (r.editor && r.editor !== '-') editors.add(r.editor);
      if (r.shootingStatus && r.shootingStatus !== '-') shootingStatuses.add(r.shootingStatus);
      if (r.editingStatus && r.editingStatus !== '-') editingStatuses.add(r.editingStatus);
    });

    return {
      epics: Array.from(epics).sort(),
      months: Array.from(months).sort(),
      trades: Array.from(trades).sort(),
      cameramen: Array.from(cameramen).sort(),
      editors: Array.from(editors).sort(),
      shootingStatuses: Array.from(shootingStatuses).sort(),
      editingStatuses: Array.from(editingStatuses).sort()
    };
  }, [allRows]);

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return allRows.filter(r => {
      if (filterEpic && r.epicCode !== filterEpic) return false;
      if (filterMonth && !r.month.toLowerCase().includes(filterMonth.toLowerCase())) return false;
      if (filterTrade && r.trade !== filterTrade) return false;
      if (filterCameraman && r.cameraman !== filterCameraman) return false;
      if (filterEditor && r.editor !== filterEditor) return false;
      if (filterShootingStatus && r.shootingStatus !== filterShootingStatus) return false;
      if (filterEditingStatus && r.editingStatus !== filterEditingStatus) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          r.videoTopic.toLowerCase().includes(q) ||
          r.smeName.toLowerCase().includes(q) ||
          r.trade.toLowerCase().includes(q) ||
          r.epicCode.toLowerCase().includes(q) ||
          r.cameraman.toLowerCase().includes(q) ||
          r.editor.toLowerCase().includes(q) ||
          r.displayVideoId.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [allRows, filterEpic, filterMonth, filterTrade, filterCameraman, filterEditor, filterShootingStatus, filterEditingStatus, searchQuery]);

  // Executive Summary KPI Cards (Derived strictly from filtered persisted records)
  const executiveKpis = useMemo(() => {
    const total = filteredRows.length;
    let shootingCompleted = 0;
    let editingCompleted = 0;
    let totalSeconds = 0;
    let withDurationCount = 0;

    filteredRows.forEach(r => {
      const shootSt = (r.shootingStatus || '').toLowerCase();
      if (shootSt.includes('completed') || shootSt.includes('content received')) {
        shootingCompleted++;
      }
      const editSt = (r.editingStatus || '').toLowerCase();
      if (editSt.includes('completed') || r.hasLink) {
        editingCompleted++;
      }
      if (r.durationSeconds > 0) {
        totalSeconds += r.durationSeconds;
        withDurationCount++;
      }
    });

    const shootingRate = total > 0 ? ((shootingCompleted / total) * 100).toFixed(1) : '0';
    const editingRate = total > 0 ? ((editingCompleted / total) * 100).toFixed(1) : '0';
    const totalDurationStr = formatSecondsToHHMMSS(totalSeconds);

    return {
      total,
      shootingCompleted,
      shootingRate,
      editingCompleted,
      editingRate,
      totalSeconds,
      totalDurationStr,
      withDurationCount
    };
  }, [filteredRows]);

  // Section A: Monthly Progress Breakdown
  const monthlyProgress = useMemo(() => {
    const monthMap = new Map<string, {
      month: string;
      planned: number;
      shootingCompleted: number;
      editingCompleted: number;
      pendingShooting: number;
      pendingEditing: number;
    }>();

    // Standard production months ordering
    const standardOrder = ['June', 'July', 'August', 'September', 'October'];
    standardOrder.forEach(m => {
      monthMap.set(m.toLowerCase(), {
        month: `${m} 2026`,
        planned: 0,
        shootingCompleted: 0,
        editingCompleted: 0,
        pendingShooting: 0,
        pendingEditing: 0
      });
    });

    filteredRows.forEach(r => {
      const rawMonth = (r.month || 'Other').trim();
      const baseMonth = rawMonth.split(' ')[0].toLowerCase();
      if (!monthMap.has(baseMonth)) {
        monthMap.set(baseMonth, {
          month: rawMonth,
          planned: 0,
          shootingCompleted: 0,
          editingCompleted: 0,
          pendingShooting: 0,
          pendingEditing: 0
        });
      }
      const entry = monthMap.get(baseMonth)!;
      entry.planned++;

      const shootSt = (r.shootingStatus || '').toLowerCase();
      if (shootSt.includes('completed') || shootSt.includes('content received')) {
        entry.shootingCompleted++;
      } else {
        entry.pendingShooting++;
      }

      const editSt = (r.editingStatus || '').toLowerCase();
      if (editSt.includes('completed') || r.hasLink) {
        entry.editingCompleted++;
      } else {
        entry.pendingEditing++;
      }
    });

    return Array.from(monthMap.values()).filter(m => m.planned > 0);
  }, [filteredRows]);

  // Section B: Cameraman Workload
  const cameramanWorkload = useMemo(() => {
    const camMap = new Map<string, {
      name: string;
      assigned: number;
      completed: number;
      pending: number;
      rate: string;
    }>();

    filteredRows.forEach(r => {
      const cam = r.cameraman || 'Unassigned';
      if (!camMap.has(cam)) {
        camMap.set(cam, { name: cam, assigned: 0, completed: 0, pending: 0, rate: '0' });
      }
      const entry = camMap.get(cam)!;
      entry.assigned++;

      const shootSt = (r.shootingStatus || '').toLowerCase();
      if (shootSt.includes('completed') || shootSt.includes('content received')) {
        entry.completed++;
      } else {
        entry.pending++;
      }
    });

    const list = Array.from(camMap.values());
    list.forEach(item => {
      item.rate = item.assigned > 0 ? ((item.completed / item.assigned) * 100).toFixed(1) : '0';
    });
    list.sort((a, b) => b.assigned - a.assigned);
    return list;
  }, [filteredRows]);

  // Section C: Trade-wise Progress
  const tradeProgress = useMemo(() => {
    const tradeMap = new Map<string, {
      trade: string;
      planned: number;
      shootingCompleted: number;
      editingCompleted: number;
      rate: string;
    }>();

    filteredRows.forEach(r => {
      const tr = r.trade || 'General';
      if (!tradeMap.has(tr)) {
        tradeMap.set(tr, { trade: tr, planned: 0, shootingCompleted: 0, editingCompleted: 0, rate: '0' });
      }
      const entry = tradeMap.get(tr)!;
      entry.planned++;

      const shootSt = (r.shootingStatus || '').toLowerCase();
      if (shootSt.includes('completed') || shootSt.includes('content received')) {
        entry.shootingCompleted++;
      }

      const editSt = (r.editingStatus || '').toLowerCase();
      if (editSt.includes('completed') || r.hasLink) {
        entry.editingCompleted++;
      }
    });

    const list = Array.from(tradeMap.values());
    list.forEach(item => {
      item.rate = item.planned > 0 ? ((item.editingCompleted / item.planned) * 100).toFixed(1) : '0';
    });
    list.sort((a, b) => b.planned - a.planned);
    return list;
  }, [filteredRows]);

  // Section D: Editor Workload
  const editorWorkload = useMemo(() => {
    const edMap = new Map<string, {
      name: string;
      assigned: number;
      completed: number;
      pending: number;
      rate: string;
    }>();

    filteredRows.forEach(r => {
      const ed = r.editor || 'Not assigned';
      if (!edMap.has(ed)) {
        edMap.set(ed, { name: ed, assigned: 0, completed: 0, pending: 0, rate: '0' });
      }
      const entry = edMap.get(ed)!;
      entry.assigned++;

      const editSt = (r.editingStatus || '').toLowerCase();
      if (editSt.includes('completed') || r.hasLink) {
        entry.completed++;
      } else {
        entry.pending++;
      }
    });

    const list = Array.from(edMap.values());
    list.forEach(item => {
      item.rate = item.assigned > 0 ? ((item.completed / item.assigned) * 100).toFixed(1) : '0';
    });
    list.sort((a, b) => b.assigned - a.assigned);
    return list;
  }, [filteredRows]);

  // Export to Excel (Full 2-Sheet Workbook)
  const handleExportExcel = () => {
    if (filteredRows.length === 0) return alert('No records to export with current filters.');

    const wb = XLSX.utils.book_new();
    const downloadDate = new Date().toLocaleString('en-IN');

    // Sheet 1: Executive Summary
    const summarySheetData: any[] = [
      ['PM e-Vidya — Video Production & Post-Production Dashboard Executive Summary'],
      [`Generated At: ${downloadDate}`],
      [`Active Records: ${filteredRows.length} of ${allRows.length} Total Videos`],
      [],
      ['1. EXECUTIVE KPI SUMMARY METRICS'],
      ['Metric', 'Value', 'Percentage / Notes'],
      ['Total Videos Planned', executiveKpis.total, '100%'],
      ['Shooting Completed', executiveKpis.shootingCompleted, `${executiveKpis.shootingRate}%`],
      ['Editing Completed', executiveKpis.editingCompleted, `${executiveKpis.editingRate}%`],
      ['Total Video Duration', executiveKpis.totalDurationStr, `${executiveKpis.withDurationCount} of ${executiveKpis.total} videos catalogued`],
      [],
      ['2. MONTHLY PRODUCTION PROGRESS'],
      ['Month', 'Planned Videos', 'Shooting Completed', 'Editing Completed', 'Pending Shooting', 'Pending Editing', 'Completion %'],
      ...monthlyProgress.map(m => [
        m.month,
        m.planned,
        m.shootingCompleted,
        m.editingCompleted,
        m.pendingShooting,
        m.pendingEditing,
        m.planned > 0 ? `${((m.editingCompleted / m.planned) * 100).toFixed(1)}%` : '0%'
      ]),
      [],
      ['3. CAMERAMAN WORKLOAD DISTRIBUTION'],
      ['Cameraman Name', 'Assigned Videos', 'Shooting Completed', 'Pending Shooting', 'Completion %'],
      ...cameramanWorkload.map(c => [c.name, c.assigned, c.completed, c.pending, `${c.rate}%`]),
      [],
      ['4. TRADE-WISE PRODUCTION PROGRESS'],
      ['Trade', 'Planned Videos', 'Shooting Completed', 'Editing Completed', 'Completion %'],
      ...tradeProgress.map(t => [t.trade, t.planned, t.shootingCompleted, t.editingCompleted, `${t.rate}%`]),
      [],
      ['5. VIDEO EDITOR WORKLOAD DISTRIBUTION'],
      ['Editor Name', 'Assigned Videos', 'Editing Completed', 'Pending Editing', 'Completion %'],
      ...editorWorkload.map(e => [e.name, e.assigned, e.completed, e.pending, `${e.rate}%`])
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

    // Sheet 2: Detailed Production Records (16 Columns)
    const detailRows = filteredRows.map((r, idx) => ({
      'Sl. No.': idx + 1,
      'S.No': r.sNo,
      'Month': r.month,
      'EPIC ID': r.epicCode,
      'Video Topic / Title': r.videoTopic,
      'SME / Resource Person': r.smeName,
      'Trade': r.trade,
      'Cameraman': r.cameraman,
      'Shooting Start Date': formatDateDisplay(r.shootingStartDate),
      'Shooting End Date': formatDateDisplay(r.shootingEndDate),
      'Shooting Status': r.shootingStatus,
      'Video Editor': r.editor,
      'Editing Start Date': formatDateDisplay(r.editingStartDate),
      'Editing End Date': formatDateDisplay(r.editingEndDate),
      'Editing Status': r.editingStatus,
      'Duration': r.duration || 'Duration unavailable',
      'Video / Deliverable Link': r.finalVideoLink || 'Pending'
    }));

    const wsDetails = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Detailed Records');

    XLSX.writeFile(wb, `PM_eVidya_Video_Production_Tracker_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterEpic('');
    setFilterMonth('');
    setFilterTrade('');
    setFilterCameraman('');
    setFilterEditor('');
    setFilterShootingStatus('');
    setFilterEditingStatus('');
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('COMPLETE') || s.includes('APPROV') || s.includes('RECEIVED')) {
      return { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
    }
    if (s.includes('PROGRESS') || s.includes('READY')) {
      return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
    }
    if (s.includes('YET') || s.includes('PEND') || s.includes('PLAN')) {
      return { background: '#fefce8', color: '#854d0e', border: '1px solid #fef08a' };
    }
    return { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' };
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: isPrintOnly ? '0' : '16px',
      border: isPrintOnly ? 'none' : '1px solid #cbd5e1',
      boxShadow: isPrintOnly ? 'none' : '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0f172a',
      overflow: 'hidden',
      width: '100%'
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          .print-avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
          .print-no-break-after { break-after: avoid !important; page-break-after: avoid !important; }
          table { page-break-inside: auto; }
          tr { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}} />

      {/* HEADER SECTION WITH NIMI & PM E-VIDYA BRANDING */}
      <div style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0fdf4 100%)',
        borderTop: '4px solid #0284c7',
        borderBottom: '2px solid #bae6fd',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'nowrap'
      }}>
        {/* Left NIMI Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '200px', flexShrink: 0 }}>
          <img
            src="/nimi-logo.png"
            alt="NIMI Logo"
            style={{ height: '48px', width: 'auto', objectFit: 'contain', marginBottom: '4px' }}
          />
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1.2 }}>
            National Instructional Media Institute
          </div>
          <div style={{ fontSize: '9px', color: '#475569', marginTop: '1px', fontWeight: 500 }}>
            Ministry of Skill Development & Entrepreneurship, Govt. of India
          </div>
        </div>

        {/* Center Title */}
        <div style={{ textAlign: 'center', flex: '1 1 auto', padding: '0 10px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f2942', margin: '0 0 4px 0', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            PM e-Vidya — Video Production Tracker Report
          </h1>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#475569', margin: '0 0 6px 0' }}>
            Executive Dashboard, Stage-wise Synchronization & Detailed Production Register
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ background: '#0284c7', color: '#ffffff', padding: '3px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 700 }}>
              {filteredRows.length} Recorded Videos ({allRows.length} Total Planned)
            </span>
            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 600, border: '1px solid #bae6fd' }}>
              📅 Report Date: {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </span>
          </div>
        </div>

        {/* Right PM e-Vidya Logo & Header Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '200px', flexShrink: 0, gap: '8px' }}>
          <img
            src="/pm-evidya-logo.png"
            alt="PM e-Vidya Logo"
            style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
          />
          <div className="no-print" style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '6px 12px',
                background: '#f59e0b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🖨️ Print
            </button>
            <button
              onClick={handleExportExcel}
              style={{
                padding: '6px 12px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              📊 Excel
            </button>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  padding: '6px 10px',
                  background: '#64748b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR (Hidden in print) */}
      <div className="no-print" style={{
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px' }}>
            <span style={{ marginRight: '8px', fontSize: '14px', color: '#64748b' }}>🔍</span>
            <input
              type="text"
              placeholder="Search Topic, SME, Trade, EPIC ID, Cameraman, Editor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13px', color: '#0f172a' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* View Tab Toggle */}
          <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px', gap: '3px' }}>
            <button
              onClick={() => setActiveTab('DASHBOARD')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === 'DASHBOARD' ? '#0284c7' : 'transparent',
                color: activeTab === 'DASHBOARD' ? '#ffffff' : '#475569'
              }}
            >
              📊 Executive Dashboard
            </button>
            <button
              onClick={() => setActiveTab('DETAILED')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === 'DETAILED' ? '#0284c7' : 'transparent',
                color: activeTab === 'DETAILED' ? '#ffffff' : '#475569'
              }}
            >
              📋 Detailed Production Records ({filteredRows.length})
            </button>
          </div>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            🔄 Reset Filters
          </button>
        </div>

        {/* Dropdown Filters Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px'
        }}>
          {/* EPIC ID Filter */}
          <select
            value={filterEpic}
            onChange={(e) => setFilterEpic(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', background: '#ffffff', color: '#1e293b' }}
          >
            <option value="">All EPIC IDs ({filterOptions.epics.length})</option>
            {filterOptions.epics.map(ep => (
              <option key={ep} value={ep}>{ep}</option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', background: '#ffffff', color: '#1e293b' }}
          >
            <option value="">All Months</option>
            {filterOptions.months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Trade Filter */}
          <select
            value={filterTrade}
            onChange={(e) => setFilterTrade(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', background: '#ffffff', color: '#1e293b' }}
          >
            <option value="">All Trades ({filterOptions.trades.length})</option>
            {filterOptions.trades.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Cameraman Filter */}
          <select
            value={filterCameraman}
            onChange={(e) => setFilterCameraman(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', background: '#ffffff', color: '#1e293b' }}
          >
            <option value="">All Cameramen</option>
            {filterOptions.cameramen.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Editor Filter */}
          <select
            value={filterEditor}
            onChange={(e) => setFilterEditor(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', background: '#ffffff', color: '#1e293b' }}
          >
            <option value="">All Editors</option>
            {filterOptions.editors.map(ed => (
              <option key={ed} value={ed}>{ed}</option>
            ))}
          </select>

          {/* Shooting Status Filter */}
          <select
            value={filterShootingStatus}
            onChange={(e) => setFilterShootingStatus(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', background: '#ffffff', color: '#1e293b' }}
          >
            <option value="">All Shooting Statuses</option>
            {filterOptions.shootingStatuses.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {/* Editing Status Filter */}
          <select
            value={filterEditingStatus}
            onChange={(e) => setFilterEditingStatus(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11.5px', background: '#ffffff', color: '#1e293b' }}
          >
            <option value="">All Editing Statuses</option>
            {filterOptions.editingStatuses.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY 4 KPI CARDS (Sheet10 Executive Summary model) */}
      <div style={{ padding: '16px 24px 8px 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {/* Card 1: Total Videos Planned */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
            border: '1.5px solid #bfdbfe',
            borderLeft: '5px solid #2563eb',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.06)'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              1. Total Videos Planned
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e3a8a', marginTop: '4px', lineHeight: 1.1 }}>
              {executiveKpis.total}
            </div>
            <div style={{ fontSize: '10.5px', color: '#2563eb', marginTop: '4px', fontWeight: 600 }}>
              {filteredRows.length === allRows.length ? '100% of baseline planned' : `Filtered: ${filteredRows.length} of ${allRows.length}`}
            </div>
          </div>

          {/* Card 2: Shooting Completed */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
            border: '1.5px solid #ddd6fe',
            borderLeft: '5px solid #7c3aed',
            boxShadow: '0 2px 4px rgba(124, 58, 237, 0.06)'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              2. Shooting Completed
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#5b21b6', marginTop: '4px', lineHeight: 1.1 }}>
              {executiveKpis.shootingCompleted}
            </div>
            <div style={{ fontSize: '10.5px', color: '#7c3aed', marginTop: '4px', fontWeight: 600 }}>
              {executiveKpis.shootingRate}% Production Complete ({executiveKpis.total - executiveKpis.shootingCompleted} Pending)
            </div>
          </div>

          {/* Card 3: Editing Completed */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)',
            border: '1.5px solid #a7f3d0',
            borderLeft: '5px solid #059669',
            boxShadow: '0 2px 4px rgba(5, 150, 105, 0.06)'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              3. Editing Completed
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#064e3b', marginTop: '4px', lineHeight: 1.1 }}>
              {executiveKpis.editingCompleted}
            </div>
            <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
              {executiveKpis.editingRate}% Post-Production Ready ({executiveKpis.total - executiveKpis.editingCompleted} Pending)
            </div>
          </div>

          {/* Card 4: Total Video Duration */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
            border: '1.5px solid #fde68a',
            borderLeft: '5px solid #d97706',
            boxShadow: '0 2px 4px rgba(217, 119, 6, 0.06)'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              4. Total Video Duration
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#78350f', marginTop: '4px', lineHeight: 1.1, fontFamily: 'monospace' }}>
              ⏱️ {executiveKpis.totalDurationStr}
            </div>
            <div style={{ fontSize: '10.5px', color: '#d97706', marginTop: '4px', fontWeight: 600 }}>
              {executiveKpis.withDurationCount} of {executiveKpis.total} videos with catalogued duration
            </div>
          </div>
        </div>
      </div>

      {/* VIEW: EXECUTIVE DASHBOARD (SECTIONS A, B, C, D) */}
      {(activeTab === 'DASHBOARD' || isPrintOnly) && (
        <div style={{ padding: '8px 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* SECTION A: MONTHLY PRODUCTION PROGRESS */}
          <div className="print-avoid-break" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📅</span>
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#0f2942', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Section A: Monthly Production Progress
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Grouped by Production Month (Actual Schedule Dates)
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '11.5px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', width: '20%' }}>Month</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '14%' }}>Planned Videos</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '16%' }}>Shooting Done</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '16%' }}>Editing Done</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '16%' }}>Pending Shoot</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '18%' }}>Progress %</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyProgress.map((m, idx) => {
                    const compRate = m.planned > 0 ? ((m.editingCompleted / m.planned) * 100).toFixed(1) : '0';
                    return (
                      <tr key={m.month} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
                          🗓️ {m.month}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#1e3a8a', borderBottom: '1px solid #e2e8f0' }}>
                          {m.planned}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#5b21b6', borderBottom: '1px solid #e2e8f0' }}>
                          {m.shootingCompleted}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#064e3b', borderBottom: '1px solid #e2e8f0' }}>
                          {m.editingCompleted}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#854d0e', borderBottom: '1px solid #e2e8f0' }}>
                          {m.pendingShooting}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                              <div style={{ width: `${compRate}%`, background: '#059669', height: '100%' }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#064e3b', width: '38px', textAlign: 'right' }}>
                              {compRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TWO COLUMN GRID FOR SECTIONS B & D: CAMERAMAN & EDITOR WORKLOAD */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
            
            {/* SECTION B: CAMERAMAN WORKLOAD */}
            <div className="print-avoid-break" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>🎥</span>
                  <h3 style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f2942', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Section B: Cameraman Workload
                  </h3>
                </div>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  {cameramanWorkload.length} Cameramen
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', color: '#ffffff' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Cameraman</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Assigned</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Done</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Pending</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cameramanWorkload.map((c, idx) => (
                      <tr key={c.name} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{c.name}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>{c.assigned}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: '#047857', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>{c.completed}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: '#854d0e', borderBottom: '1px solid #e2e8f0' }}>{c.pending}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                          <span style={{ background: '#ecfdf5', color: '#065f46', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '10px' }}>
                            {c.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION D: EDITOR WORKLOAD */}
            <div className="print-avoid-break" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>✂️</span>
                  <h3 style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f2942', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Section D: Video Editor Workload
                  </h3>
                </div>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  {editorWorkload.length} Editors
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', color: '#ffffff' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Editor Name</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Assigned</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Done</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Pending</th>
                      <th style={{ padding: '6px 10px', textAlign: 'center' }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editorWorkload.map((e, idx) => (
                      <tr key={e.name} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>{e.name}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>{e.assigned}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: '#047857', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>{e.completed}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: '#854d0e', borderBottom: '1px solid #e2e8f0' }}>{e.pending}</td>
                        <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                          <span style={{ background: '#eff6ff', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '10px' }}>
                            {e.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION C: TRADE-WISE PROGRESS */}
          <div className="print-avoid-break" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>🛠️</span>
                <h3 style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f2942', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Section C: Trade-wise Production Progress ({tradeProgress.length} Trades)
                </h3>
              </div>
              <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                Grouped by Real Database Trade Values
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '11px', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', width: '28%' }}>Trade Name</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', width: '15%' }}>Planned Videos</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', width: '18%' }}>Shooting Completed</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', width: '18%' }}>Editing Completed</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center', width: '21%' }}>Trade Completion %</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeProgress.map((t, idx) => (
                    <tr key={t.trade} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 700, color: '#0369a1', borderBottom: '1px solid #e2e8f0' }}>{t.trade}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>{t.planned}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#5b21b6', borderBottom: '1px solid #e2e8f0' }}>{t.shootingCompleted}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#047857', borderBottom: '1px solid #e2e8f0' }}>{t.editingCompleted}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${t.rate}%`, background: '#0284c7', height: '100%' }} />
                          </div>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#0369a1', width: '38px', textAlign: 'right' }}>
                            {t.rate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SECTION E: DETAILED PRODUCTION RECORDS (16 COLUMNS TABLE) */}
      {(activeTab === 'DETAILED' || isPrintOnly) && (
        <div className="print-avoid-break" style={{ padding: '8px 24px 24px 24px' }}>
          <div className="print-no-break-after" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📋</span>
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#0f2942', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Section E: Detailed Production Records ({filteredRows.length} Videos)
              </h3>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              16 Structured Attributes • Direct PostgreSQL Persistence
            </span>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '10.5px', minWidth: '1200px' }}>
              <thead>
                <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', width: '30px' }}>Sl.</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: '55px' }}>Month</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: '130px' }}>EPIC ID</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: '180px' }}>Video Topic</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: '100px' }}>SME</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: '100px' }}>Trade</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: '90px' }}>Cameraman</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: '75px' }}>Shoot Start</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: '75px' }}>Shoot End</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center', width: '90px' }}>Shoot Status</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: '90px' }}>Editor</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: '75px' }}>Edit Start</th>
                  <th style={{ padding: '8px 8px', textAlign: 'left', width: '75px' }}>Edit End</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center', width: '80px' }}>Edit Status</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center', width: '70px' }}>Duration</th>
                  <th style={{ padding: '8px 8px', textAlign: 'center', width: '75px' }}>Video Link</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => (
                  <tr key={r.uniqueKey || idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 6px', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                      {r.month}
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0369a1', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                      {r.epicCode}
                    </td>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
                      <div>{r.videoTopic}</div>
                      <div style={{ fontSize: '9.5px', color: '#64748b' }}>{r.displayVideoId}</div>
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                      {r.smeName}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#0369a1', fontWeight: 500 }}>
                      {r.trade}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#0f172a' }}>
                      {r.cameraman}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '9.5px' }}>
                      {formatDateDisplay(r.shootingStartDate)}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '9.5px' }}>
                      {formatDateDisplay(r.shootingEndDate)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, ...getStatusBadgeStyle(r.shootingStatus) }}>
                        {r.shootingStatus}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#0f172a' }}>
                      {r.editor}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '9.5px' }}>
                      {formatDateDisplay(r.editingStartDate)}
                    </td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '9.5px' }}>
                      {formatDateDisplay(r.editingEndDate)}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, ...getStatusBadgeStyle(r.editingStatus) }}>
                        {r.editingStatus}
                      </span>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: r.duration ? '#0369a1' : '#94a3b8' }}>
                      {r.duration ? r.duration : '-'}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      {r.finalVideoLink ? (
                        <a href={r.finalVideoLink} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#0284c7', fontWeight: 700, textDecoration: 'underline' }}>
                          🎬 View
                        </a>
                      ) : (
                        <span style={{ fontSize: '9.5px', color: '#94a3b8', fontStyle: 'italic' }}>Pending</span>
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
  );
}
