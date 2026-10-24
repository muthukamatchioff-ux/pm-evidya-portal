"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './deputation.module.css';
import {
  saveCommunicationsStage,
  StageAParameters,
  StageBParameters,
  StageCParameters,
  AttendanceSlot
} from './actions';
import {
  getLogoBase64,
  exportMhtmlWordDocument,
  buildApprovalLetterWordHtml,
  buildWorkCompletionWordHtml,
  buildRemunerationWordHtml
} from '@/lib/mhtmlDocxExport';

interface DeputationClientProps {
  initialWorkEntries: any[];
  userRole?: string;
  preselectedEpicId?: string;
}

function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  if (num < 0) return '';
  const n = ('000000000' + Math.round(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim() + ' Only';
}

const formatDateDot = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
};

const calculateSlotDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
};

const getEpicId = (epicSequence: number) =>
  `EPIC-2026-PMeVidya ${String(epicSequence || 1).padStart(2, '0')}`;

const getStorageKeys = (stage: string, entryId: string, epicSeq?: number | null) => {
  const keys = [`pm_evidya_saved_${stage}_${entryId}`];
  if (epicSeq !== undefined && epicSeq !== null) {
    keys.push(`pm_evidya_saved_${stage}_seq_${epicSeq}`);
  }
  return keys;
};

const getSavedParams = (stage: string, entryId: string, epicSeq?: number | null) => {
  if (typeof window === 'undefined') return null;
  try {
    const keys = getStorageKeys(stage, entryId, epicSeq);
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
};

const persistSavedParams = (stage: string, entryId: string, epicSeq: number | null | undefined, params: any) => {
  if (typeof window === 'undefined') return;
  try {
    const keys = getStorageKeys(stage, entryId, epicSeq);
    const str = JSON.stringify(params);
    for (const k of keys) {
      localStorage.setItem(k, str);
    }
  } catch {}
};

function extractSavedParams(
  docs: any[],
  primaryType: string,
  companionType: string
): { params: any; updatedAt: string | null; docId: string | null } | null {
  if (!Array.isArray(docs) || docs.length === 0) return null;

  // Filter only candidate documents of matching types with a valid non-empty JSON string
  const candidates = docs.filter(
    (d: any) =>
      (d.type === primaryType || d.type === companionType) &&
      typeof d.filePath === 'string' &&
      d.filePath.trim().startsWith('{')
  );

  if (candidates.length === 0) return null;

  // Sort candidates by updatedAt descending so the latest saved parameters win
  candidates.sort((a: any, b: any) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  for (const cand of candidates) {
    try {
      const parsed = JSON.parse(cand.filePath);
      if (parsed && typeof parsed === 'object') {
        return {
          params: parsed,
          updatedAt: cand.updatedAt || cand.createdAt || null,
          docId: cand.id
        };
      }
    } catch {}
  }

  return null;
}

export default function DeputationClient({
  initialWorkEntries,
  userRole = 'ADMIN',
  preselectedEpicId
}: DeputationClientProps) {
  const router = useRouter();
  const isReadOnly = userRole === 'VIEWER' || userRole === 'HIGHER_OFFICIAL_VIEWER';
  const [entries, setEntries] = useState<any[]>(initialWorkEntries || []);
  const lastLoadedEntryIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialWorkEntries && initialWorkEntries.length > 0) {
      setEntries(prevEntries => {
        const prevMap = new Map(prevEntries.map(e => [e.id, e]));
        return initialWorkEntries.map(newEntry => {
          const prev = prevMap.get(newEntry.id);
          if (!prev) return newEntry;

          // Merge documents safely: prioritize documents with valid JSON filePath
          const mergedDocs = [...(newEntry.documents || [])];
          for (const d of (prev.documents || [])) {
            if (!d.filePath || typeof d.filePath !== 'string' || !d.filePath.trim().startsWith('{')) continue;
            const idx = mergedDocs.findIndex((md: any) => md.type === d.type);
            if (idx === -1) {
              mergedDocs.unshift(d);
            } else if (!mergedDocs[idx].filePath || !mergedDocs[idx].filePath.trim().startsWith('{')) {
              mergedDocs[idx] = d;
            } else {
              const dTime = new Date(d.updatedAt || d.createdAt || 0).getTime();
              const mdTime = new Date(mergedDocs[idx].updatedAt || mergedDocs[idx].createdAt || 0).getTime();
              if (dTime >= mdTime) {
                mergedDocs[idx] = d;
              }
            }
          }

          return {
            ...newEntry,
            topic: prev.topic || newEntry.topic,
            attendanceFrom: prev.attendanceFrom || newEntry.attendanceFrom,
            attendanceTo: prev.attendanceTo || newEntry.attendanceTo,
            trade: prev.trade || newEntry.trade,
            days: prev.days || newEntry.days,
            ratePerDay: prev.ratePerDay || newEntry.ratePerDay || 1500,
            documents: mergedDocs
          };
        });
      });
    }
  }, [initialWorkEntries]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string>(() => {
    if (preselectedEpicId) {
      const match = initialWorkEntries.find(
        e => getEpicId(e.epicSequence).toLowerCase() === preselectedEpicId.toLowerCase()
      );
      if (match) return match.id;
    }
    return initialWorkEntries?.[0]?.id || '';
  });

  const [activeStage, setActiveStage] = useState<'STAGE_A' | 'STAGE_B' | 'STAGE_C'>('STAGE_A');
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // References for PDF and DOCX exports
  const approvalPrintRef = useRef<HTMLDivElement>(null);
  const completionPrintRef = useRef<HTMLDivElement>(null);
  const remunerationPrintRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Find currently selected entry
  const selectedEntry = useMemo(() => {
    return entries.find(e => e.id === selectedEntryId) || entries[0] || null;
  }, [entries, selectedEntryId]);

  // Filtered entries for search dropdown
  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries;
    const q = searchTerm.toLowerCase();
    return entries.filter(e => {
      const epic = getEpicId(e.epicSequence).toLowerCase();
      const name = (e.sme?.name || '').toLowerCase();
      const trade = (e.trade || '').toLowerCase();
      const inst = (e.sme?.institute || '').toLowerCase();
      return epic.includes(q) || name.includes(q) || trade.includes(q) || inst.includes(q);
    });
  }, [entries, searchTerm]);

  // Stage A State
  const [stageAParams, setStageAParams] = useState<StageAParameters>({
    refNoPrefix: 'NIMI/MS/T-11022/MM/',
    year: new Date().getFullYear().toString(),
    letterDate: new Date().toISOString().split('T')[0],
    recipientDesignation: 'The Principal',
    recipientInst: '',
    recipientLoc: '',
    duration: '1 Week',
    startDate: new Date().toISOString().split('T')[0],
    isExtension: false,
    reasonForExtension: 'the official shoot schedule',
    extensionDate: '',
    signatory: 'Joint Director / HOO'
  });
  const [isEditingA, setIsEditingA] = useState(false);
  const [isSavingA, setIsSavingA] = useState(false);
  const [hasSavedDocA, setHasSavedDocA] = useState(false);
  const [docALastSavedAt, setDocALastSavedAt] = useState<string | null>(null);

  // Stage B State
  const [stageBParams, setStageBParams] = useState<StageBParameters>({
    programmeName: 'PM e-Vidya Classroom Teaching Video Production',
    workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
    location: 'National Instructional Media Institute (NIMI), Chennai',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    topicsCovered: '',
    ratePerDay: 1500,
    submissionDate: new Date().toISOString().split('T')[0],
    verifierName: 'Shri. Ashfaq Ahmed',
    verifierDesignation: 'Assistant Manager',
    verifierOrganisation: 'National Instructional Media Institute (NIMI), Chennai',
    verificationDate: new Date().toISOString().split('T')[0]
  });
  const [isEditingB, setIsEditingB] = useState(false);
  const [isSavingB, setIsSavingB] = useState(false);
  const [hasSavedDocB, setHasSavedDocB] = useState(false);
  const [docBLastSavedAt, setDocBLastSavedAt] = useState<string | null>(null);

  // Stage C State
  const [stageCParams, setStageCParams] = useState<StageCParameters>({
    programmeName: 'PM e-Vidya Classroom Teaching Video Production',
    workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
    location: 'National Instructional Media Institute (NIMI), Chennai',
    totalDays: 4,
    ratePerDay: 1500,
    grossAmount: 6000,
    taAmount: 0,
    otherAmount: 0,
    totalAmount: 6000,
    amountInWords: 'Six Thousand Only',
    submissionDate: new Date().toISOString().split('T')[0],
    verifierName: 'Joint Director / HOO',
    verifierDesignation: 'Head of Office'
  });
  const [isEditingC, setIsEditingC] = useState(false);
  const [isSavingC, setIsSavingC] = useState(false);
  const [hasSavedDocC, setHasSavedDocC] = useState(false);
  const [docCLastSavedAt, setDocCLastSavedAt] = useState<string | null>(null);

  // Unified Honorarium Rate per Day (ensures Stage B Work Completion Certificate always shows Remuneration rate, e.g. 2500)
  const effectiveRatePerDay = useMemo(() => {
    return stageBParams.ratePerDay || stageCParams.ratePerDay || selectedEntry?.ratePerDay || 1500;
  }, [stageBParams.ratePerDay, stageCParams.ratePerDay, selectedEntry?.ratePerDay]);

  // Synchronize state when selectedEntry changes (switching SME)
  useEffect(() => {
    if (!selectedEntry) return;

    // Only re-initialize when switching to a DIFFERENT SME entry
    if (lastLoadedEntryIdRef.current === selectedEntry.id) {
      return;
    }
    lastLoadedEntryIdRef.current = selectedEntry.id;

    const sme = selectedEntry.sme || {};
    const docs = selectedEntry.documents || [];
    const payments = selectedEntry.payments || [];
    const payment = payments[0] || {};
    const seq = selectedEntry.epicSequence;

    // 1. Stage A: Database source of truth first, then cache, then defaults
    const dbRecordA = extractSavedParams(docs, 'STAGE_A_APPROVAL_LETTER', 'APPROVAL_LETTER');
    const cachedA = getSavedParams('STAGE_A', selectedEntry.id, seq);

    if (dbRecordA) {
      setStageAParams(dbRecordA.params);
      setHasSavedDocA(true);
      setIsEditingA(false);
      setDocALastSavedAt(dbRecordA.updatedAt || new Date().toISOString());
      persistSavedParams('STAGE_A', selectedEntry.id, seq, dbRecordA.params);
    } else if (cachedA) {
      setStageAParams(cachedA);
      setHasSavedDocA(true);
      setIsEditingA(false);
      setDocALastSavedAt(new Date().toISOString());
    } else {
      initDefaultStageA(selectedEntry, sme);
    }

    // 2. Stage B: Database source of truth first, then cache, then defaults
    const dbRecordB = extractSavedParams(docs, 'STAGE_B_WORK_COMPLETION', 'WORK_COMPLETION');
    const cachedB = getSavedParams('STAGE_B', selectedEntry.id, seq);

    if (dbRecordB) {
      setStageBParams(dbRecordB.params);
      setHasSavedDocB(true);
      setIsEditingB(false);
      setDocBLastSavedAt(dbRecordB.updatedAt || new Date().toISOString());
      persistSavedParams('STAGE_B', selectedEntry.id, seq, dbRecordB.params);
    } else if (cachedB) {
      setStageBParams(cachedB);
      setHasSavedDocB(true);
      setIsEditingB(false);
      setDocBLastSavedAt(new Date().toISOString());
    } else {
      initDefaultStageB(selectedEntry, selectedEntry.ratePerDay);
    }

    // 3. Stage C: Database source of truth first, then cache, then defaults
    const dbRecordC = extractSavedParams(docs, 'STAGE_C_REMUNERATION', 'PAYMENT_NOTE');
    const cachedC = getSavedParams('STAGE_C', selectedEntry.id, seq);

    if (dbRecordC) {
      const parsed = { ...dbRecordC.params };
      if (!parsed.attendanceSlots || !Array.isArray(parsed.attendanceSlots) || parsed.attendanceSlots.length === 0) {
        const startDate = selectedEntry.attendanceFrom
          ? new Date(selectedEntry.attendanceFrom).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        const endDate = selectedEntry.attendanceTo
          ? new Date(selectedEntry.attendanceTo).toISOString().split('T')[0]
          : startDate;
        parsed.attendanceSlots = [{ id: 'slot-1', startDate, endDate, trade: parsed.trade || selectedEntry.trade || '' }];
      } else {
        parsed.attendanceSlots = parsed.attendanceSlots.map((s: any) => ({
          ...s,
          trade: s.trade || parsed.trade || selectedEntry.trade || ''
        }));
      }
      if (!parsed.trade) {
        parsed.trade = selectedEntry.trade || '';
      }
      parsed.taAmount = 0;
      parsed.otherAmount = 0;
      if (parsed.totalDays === undefined || parsed.totalDays === null || isNaN(Number(parsed.totalDays))) {
        const sumDays = parsed.attendanceSlots.reduce((acc: number, s: any) => acc + calculateSlotDays(s.startDate, s.endDate), 0);
        parsed.totalDays = sumDays > 0 ? sumDays : (Number(selectedEntry.days) || 4);
      } else {
        parsed.totalDays = Number(parsed.totalDays);
      }
      const rate = (parsed.ratePerDay !== undefined && parsed.ratePerDay !== null && !isNaN(Number(parsed.ratePerDay)))
        ? Number(parsed.ratePerDay)
        : (Number(selectedEntry.ratePerDay) || 1500);
      parsed.ratePerDay = rate;
      if (parsed.grossAmount === undefined || parsed.grossAmount === null || isNaN(Number(parsed.grossAmount))) {
        parsed.grossAmount = parsed.totalDays * rate;
      } else {
        parsed.grossAmount = Number(parsed.grossAmount);
      }
      if (parsed.totalAmount === undefined || parsed.totalAmount === null || isNaN(Number(parsed.totalAmount))) {
        parsed.totalAmount = parsed.grossAmount;
      } else {
        parsed.totalAmount = Number(parsed.totalAmount);
      }
      if (!parsed.amountInWords) {
        parsed.amountInWords = numberToWords(parsed.totalAmount);
      }

      setStageCParams(parsed);
      setHasSavedDocC(true);
      setIsEditingC(false);
      setDocCLastSavedAt(dbRecordC.updatedAt || new Date().toISOString());
      persistSavedParams('STAGE_C', selectedEntry.id, seq, parsed);
    } else if (cachedC) {
      setStageCParams(cachedC);
      setHasSavedDocC(true);
      setIsEditingC(false);
      setDocCLastSavedAt(new Date().toISOString());
    } else {
      initDefaultStageC(selectedEntry, payment, selectedEntry.ratePerDay);
    }
  }, [selectedEntryId, entries]);

  const initDefaultStageA = (entry: any, sme: any) => {
    const startDate = entry.attendanceFrom
      ? new Date(entry.attendanceFrom).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setStageAParams({
      refNoPrefix: 'NIMI/MS/T-11022/MM/',
      year: new Date().getFullYear().toString(),
      letterDate: new Date().toISOString().split('T')[0],
      recipientDesignation: 'The Principal',
      recipientInst: sme.institute || '',
      recipientLoc: sme.location || '',
      duration: '1 Week',
      startDate,
      isExtension: false,
      reasonForExtension: 'the official shoot schedule',
      extensionDate: '',
      signatory: 'Joint Director / HOO'
    });
    setHasSavedDocA(false);
    setIsEditingA(false);
    setDocALastSavedAt(null);
  };

  const initDefaultStageB = (entry: any, defaultRate?: number) => {
    const startDate = entry.attendanceFrom
      ? new Date(entry.attendanceFrom).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const endDate = entry.attendanceTo
      ? new Date(entry.attendanceTo).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const rate = defaultRate || entry.ratePerDay || 1500;

    setStageBParams({
      programmeName: 'PM e-Vidya Classroom Teaching Video Production',
      workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
      location: 'National Instructional Media Institute (NIMI), Chennai',
      startDate,
      endDate,
      topicsCovered: entry.topic || 'Classroom Teaching & E-Content Production for PM e-Vidya',
      ratePerDay: rate,
      submissionDate: new Date().toISOString().split('T')[0],
      verifierName: 'Shri. Ashfaq Ahmed',
      verifierDesignation: 'Assistant Manager',
      verifierOrganisation: 'National Instructional Media Institute (NIMI), Chennai',
      verificationDate: new Date().toISOString().split('T')[0]
    });
    setHasSavedDocB(false);
    setIsEditingB(false);
    setDocBLastSavedAt(null);
  };

  const initDefaultStageC = (entry: any, payment: any, defaultRate?: number) => {
    const ratePerDay = defaultRate || entry.ratePerDay || 1500;
    const startDate = entry.attendanceFrom
      ? new Date(entry.attendanceFrom).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const endDate = entry.attendanceTo
      ? new Date(entry.attendanceTo).toISOString().split('T')[0]
      : startDate;

    const initialSlots: AttendanceSlot[] = [
      { id: 'slot-1', startDate, endDate, trade: entry.trade || '' }
    ];

    const slotDays = calculateSlotDays(startDate, endDate);
    const days = slotDays > 0 ? slotDays : (entry.days || 4);
    const grossAmount = days * ratePerDay;
    const totalAmount = grossAmount;

    setStageCParams({
      programmeName: 'PM e-Vidya Classroom Teaching Video Production',
      workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
      location: 'National Instructional Media Institute (NIMI), Chennai',
      trade: entry.trade || '',
      attendanceSlots: initialSlots,
      totalDays: days,
      ratePerDay,
      grossAmount,
      taAmount: 0,
      otherAmount: 0,
      totalAmount,
      amountInWords: numberToWords(totalAmount),
      submissionDate: new Date().toISOString().split('T')[0],
      verifierName: '',
      verifierDesignation: ''
    });
    setHasSavedDocC(false);
    setIsEditingC(false);
    setDocCLastSavedAt(null);
  };

  // Slot Management for Stage C (Multiple attendance date ranges)
  const handleAddSlot = () => {
    setStageCParams(prev => {
      const currentSlots = prev.attendanceSlots || [];
      const lastSlot = currentSlots[currentSlots.length - 1];
      let nextStart = new Date().toISOString().split('T')[0];
      if (lastSlot?.endDate) {
        const d = new Date(lastSlot.endDate);
        d.setDate(d.getDate() + 2); // Default 2-day gap (break/holiday/weekend)
        nextStart = d.toISOString().split('T')[0];
      }
      const newSlot: AttendanceSlot = {
        id: `slot-${Date.now()}`,
        startDate: nextStart,
        endDate: nextStart,
        trade: lastSlot?.trade || prev.trade || selectedEntry?.trade || 'General'
      };
      const updatedSlots = [...currentSlots, newSlot];
      const sumDays = updatedSlots.reduce((acc, s) => acc + calculateSlotDays(s.startDate, s.endDate), 0);
      const days = sumDays > 0 ? sumDays : 1;
      const rate = prev.ratePerDay || 1500;
      const gross = days * rate;
      return {
        ...prev,
        attendanceSlots: updatedSlots,
        totalDays: days,
        grossAmount: gross,
        totalAmount: gross,
        amountInWords: numberToWords(gross)
      };
    });
  };

  const handleSlotTradeChange = (index: number, trade: string) => {
    setStageCParams(prev => {
      const currentSlots = [...(prev.attendanceSlots || [])];
      if (!currentSlots[index]) return prev;
      currentSlots[index] = { ...currentSlots[index], trade };
      const distinctTrades = Array.from(new Set(currentSlots.map(s => (s.trade || '').trim()).filter(Boolean)));
      return {
        ...prev,
        attendanceSlots: currentSlots,
        trade: distinctTrades.length > 0 ? distinctTrades.join(', ') : prev.trade
      };
    });
  };

  const handleRemoveSlot = (index: number) => {
    setStageCParams(prev => {
      const currentSlots = prev.attendanceSlots || [];
      if (currentSlots.length <= 1) return prev;
      const updatedSlots = currentSlots.filter((_, i) => i !== index);
      const sumDays = updatedSlots.reduce((acc, s) => acc + calculateSlotDays(s.startDate, s.endDate), 0);
      const days = sumDays > 0 ? sumDays : 1;
      const rate = prev.ratePerDay || 1500;
      const gross = days * rate;
      return {
        ...prev,
        attendanceSlots: updatedSlots,
        totalDays: days,
        grossAmount: gross,
        totalAmount: gross,
        amountInWords: numberToWords(gross)
      };
    });
  };

  const handleSlotDateChange = (index: number, field: 'startDate' | 'endDate', value: string) => {
    setStageCParams(prev => {
      const currentSlots = [...(prev.attendanceSlots || [])];
      if (!currentSlots[index]) return prev;
      const updatedSlot = { ...currentSlots[index], [field]: value };
      if (field === 'startDate' && updatedSlot.endDate < value) {
        updatedSlot.endDate = value;
      }
      currentSlots[index] = updatedSlot;

      const sumDays = currentSlots.reduce((acc, s) => acc + calculateSlotDays(s.startDate, s.endDate), 0);
      const days = sumDays > 0 ? sumDays : 1;
      const rate = prev.ratePerDay || 1500;
      const gross = days * rate;
      return {
        ...prev,
        attendanceSlots: currentSlots,
        totalDays: days,
        grossAmount: gross,
        totalAmount: gross,
        amountInWords: numberToWords(gross)
      };
    });
  };

  // Stage C auto-calculation when values change (Total Days / Rate per Day / Trade / Submission Date)
  const handleStageCChange = (field: keyof StageCParameters, value: any) => {
    setStageCParams(prev => {
      const updated = { ...prev, [field]: value };
      const days = Number(field === 'totalDays' ? value : updated.totalDays) || 0;
      const rate = Number(field === 'ratePerDay' ? value : updated.ratePerDay) || 0;
      const gross = days * rate;
      updated.grossAmount = gross;
      updated.taAmount = 0;
      updated.otherAmount = 0;
      updated.totalAmount = gross;
      updated.amountInWords = numberToWords(gross);
      return updated;
    });
  };

  // Save Handlers
  const handleSaveStageA = async () => {
    if (!selectedEntry) return;
    setIsSavingA(true);
    try {
      persistSavedParams('STAGE_A', selectedEntry.id, selectedEntry.epicSequence, stageAParams);
      const res = await saveCommunicationsStage(selectedEntry.id, 'STAGE_A', stageAParams);
      if (res.success && res.document) {
        setHasSavedDocA(true);
        setIsEditingA(false);
        setDocALastSavedAt(res.document.updatedAt || new Date().toISOString());
        const newDocs = [res.document, ...(res.companionDocument ? [res.companionDocument] : [])];
        setEntries(prev => prev.map(e => {
          if (e.id !== selectedEntry.id) return e;
          const otherDocs = (e.documents || []).filter((d: any) => d.type !== 'STAGE_A_APPROVAL_LETTER' && d.type !== 'APPROVAL_LETTER');
          return { ...e, documents: [...otherDocs, ...newDocs] };
        }));
        showToast('✓ Stage A: Approval Letter parameters saved successfully!', 'success');
      } else {
        showToast(res.error || 'Failed to save Approval Letter parameters', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving Stage A', 'error');
    } finally {
      setIsSavingA(false);
    }
  };

  const handleSaveStageB = async () => {
    if (!selectedEntry) return;
    setIsSavingB(true);
    try {
      persistSavedParams('STAGE_B', selectedEntry.id, selectedEntry.epicSequence, stageBParams);

      const res = await saveCommunicationsStage(selectedEntry.id, 'STAGE_B', stageBParams);
      if (res.success && res.document) {
        setHasSavedDocB(true);
        setIsEditingB(false);
        setDocBLastSavedAt(res.document.updatedAt || new Date().toISOString());
        const newDocs = [res.document, ...(res.companionDocument ? [res.companionDocument] : [])];
        setEntries(prev => prev.map(e => {
          if (e.id !== selectedEntry.id) return e;
          const otherDocs = (e.documents || []).filter((d: any) => d.type !== 'STAGE_B_WORK_COMPLETION' && d.type !== 'WORK_COMPLETION');
          return {
            ...e,
            ratePerDay: stageBParams.ratePerDay || e.ratePerDay,
            topic: stageBParams.topicsCovered || e.topic,
            attendanceFrom: stageBParams.startDate ? new Date(stageBParams.startDate) : e.attendanceFrom,
            attendanceTo: stageBParams.endDate ? new Date(stageBParams.endDate) : e.attendanceTo,
            documents: [...otherDocs, ...newDocs]
          };
        }));
        showToast('✓ Stage B: Work Completion parameters saved successfully!', 'success');
      } else {
        showToast(res.error || 'Failed to save Work Completion parameters', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving Stage B', 'error');
    } finally {
      setIsSavingB(false);
    }
  };

  const handleSaveStageC = async () => {
    if (!selectedEntry) return;
    setIsSavingC(true);
    try {
      persistSavedParams('STAGE_C', selectedEntry.id, selectedEntry.epicSequence, stageCParams);

      const res = await saveCommunicationsStage(selectedEntry.id, 'STAGE_C', stageCParams);
      if (res.success && res.document) {
        setHasSavedDocC(true);
        setIsEditingC(false);
        setDocCLastSavedAt(res.document.updatedAt || new Date().toISOString());
        const newDocs = [res.document, ...(res.companionDocument ? [res.companionDocument] : [])];
        setEntries(prev => prev.map(e => {
          if (e.id !== selectedEntry.id) return e;
          const otherDocs = (e.documents || []).filter((d: any) => d.type !== 'STAGE_C_REMUNERATION' && d.type !== 'PAYMENT_NOTE');
          return {
            ...e,
            trade: stageCParams.trade || e.trade,
            days: stageCParams.totalDays,
            ratePerDay: stageCParams.ratePerDay,
            taAmount: 0,
            otherAmount: 0,
            documents: [...otherDocs, ...newDocs]
          };
        }));
        showToast('✓ Stage C: Remuneration parameters saved successfully!', 'success');
      } else {
        showToast(res.error || 'Failed to save Remuneration parameters', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Error saving Stage C', 'error');
    } finally {
      setIsSavingC(false);
    }
  };

  // Export PDF Handler - Strictly 1-page A4 Portrait
  const generatePDF = async (ref: React.RefObject<HTMLDivElement | null>, docTypeLabel: string) => {
    if (!selectedEntry) return;
    const element = ref.current;
    if (!element) return;

    setIsGenerating(true);
    const prevShadow = element.style.boxShadow;
    const prevBorder = element.style.border;
    element.style.boxShadow = 'none';
    element.style.border = 'none';
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const epicClean = getEpicId(selectedEntry.epicSequence).replace(/\s+/g, '_');
      const smeClean = (selectedEntry.sme?.name || 'SME').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${docTypeLabel}_${epicClean}_${smeClean}.pdf`;

      const opt: any = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3.5, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().from(element).set(opt).save();
      showToast(`✓ Downloaded ${filename} successfully!`, 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      element.style.boxShadow = prevShadow;
      element.style.border = prevBorder;
      setIsGenerating(false);
    }
  };

  // Export DOCX Handler - Native Word MHTML with Embedded NIMI Logo & Preview-Faithful Structure
  const generateDOCX = async (ref: React.RefObject<HTMLDivElement | null>, docTypeLabel: string) => {
    if (!selectedEntry) return;

    try {
      showToast('Preparing Word document with embedded logo...', 'info');
      const logoBase64 = await getLogoBase64();
      const epicClean = getEpicId(selectedEntry.epicSequence).replace(/\s+/g, '_');
      const smeClean = (selectedEntry.sme?.name || 'SME').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${docTypeLabel}_${epicClean}_${smeClean}.doc`;

      let docHtml = '';
      if (docTypeLabel === 'Approval_Letter') {
        docHtml = buildApprovalLetterWordHtml(stageAParams, sme, selectedEntry);
      } else if (docTypeLabel === 'Work_Completion') {
        docHtml = buildWorkCompletionWordHtml({ ...stageBParams, ratePerDay: effectiveRatePerDay }, sme, { ...selectedEntry, ratePerDay: effectiveRatePerDay });
      } else if (docTypeLabel === 'Remuneration_Note') {
        docHtml = buildRemunerationWordHtml(stageCParams, sme, selectedEntry);
      } else if (ref?.current) {
        docHtml = ref.current.innerHTML;
      }

      exportMhtmlWordDocument(docHtml, filename, logoBase64);
      showToast(`✓ Downloaded ${filename} successfully!`, 'success');
    } catch (e: any) {
      console.error('Error generating DOCX:', e);
      showToast('Failed to export DOCX version', 'error');
    }
  };

  const renderOfficialHeader = () => (
    <div className={styles.officialHeader}>
      <h1 style={{ fontSize: '19px', margin: 0, fontWeight: 'bold' }}>NATIONAL INSTRUCTIONAL MEDIA INSTITUTE</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nimi-logo.png"
        alt="NIMI Logo"
        className={styles.logoImage}
        width="120"
        style={{ position: 'absolute', top: '14px', right: '0px', width: '120px', maxHeight: '52px', objectFit: 'contain' }}
      />
      <p style={{ fontWeight: 600, fontSize: '13px', margin: '2px 0 1px 0' }}>(AN AUTONOMOUS INSTITUTION)</p>
      <p style={{ fontSize: '12px', margin: '1px 0' }}>Ministry of Skill Development &amp; Entrepreneurship</p>
      <p style={{ fontSize: '12px', margin: '1px 0' }}>Government of India</p>
      <p className={styles.subText} style={{ fontSize: '10.5px', margin: '2px 0 1px 0' }}>Post Box No.3142, CTI Campus, Guindy Industrial Estate, Guindy, Chennai - 600 032.</p>
      <p className={styles.subText} style={{ fontWeight: 'bold', fontSize: '10.5px', margin: '1px 0' }}>
        Office: 044-2250 0657, 044-2250 0248 | Director: 044-2250 0256 | E-mail: <span style={{ textDecoration: 'underline' }}>chennai-nimi@nic.in</span>
      </p>
    </div>
  );

  const renderOfficialFooter = () => (
    <div className={styles.officialFooter}>
      <p style={{ margin: 0 }}>पो. वा. संख्या 3142, सीटीआई कैम्पस, गिंडी इंडस्ट्रियल एस्टेट, गिंडी, चेन्नई-600032./Post Box No. 3142, CTI Campus,</p>
      <p style={{ margin: 0 }}>
        Guindy Industrial Estate, Guindy, Chennai – 600032. <strong style={{ color: '#000080' }}>कार्यालय/Office:</strong> 044-2250 0657, 044-22500248,
      </p>
      <p style={{ margin: 0 }}>
        <strong style={{ color: '#000080' }}>निदेशक /Director-</strong> 044-2250 0256. <strong style={{ color: '#000080' }}>ई-मेल/E-mail :</strong> <span style={{ color: '#000080', textDecoration: 'underline' }}>chennai-nimi@nic.in</span>
      </p>
    </div>
  );

  if (!selectedEntry) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px' }}>
        <h3>No SME Work Entries Found</h3>
        <p style={{ color: '#64748b' }}>Please add an SME through the Add New SME workflow first.</p>
        <Link href="/smes/new" className="btn-primary" style={{ display: 'inline-block', marginTop: '12px' }}>
          ➕ Add New SME
        </Link>
      </div>
    );
  }

  const sme = selectedEntry.sme || {};
  const currentEpicId = getEpicId(selectedEntry.epicSequence);

  return (
    <div className={styles.workflowContainer}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toastMessage.type === 'success' ? '#166534' : toastMessage.type === 'error' ? '#991b1b' : '#1e40af',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontWeight: 700,
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <span>{toastMessage.type === 'success' ? '✅' : toastMessage.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
        <span>/</span>
        <span>Communications</span>
        <span>/</span>
        <span style={{ color: '#2563eb', fontWeight: 700 }}>SME Document Workflow</span>
      </div>

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleArea}>
          <h1>
            <span>✉️</span> Communications — Epic-Based SME Document Workflow
          </h1>
          <p className={styles.headerSubtitle}>
            Select an existing Epic ID to automatically retrieve SME master data and generate official Approval Letters, Work Completion Certificates, and Remuneration Notes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/smes"
            style={{
              padding: '8px 16px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '6px',
              color: '#475569',
              background: 'white',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Back to SME Records
          </Link>
        </div>
      </div>

      {/* 1. Epic ID Selector & Search */}
      <div className={styles.epicSelectorCard}>
        <div className={styles.epicSelectorHeader}>
          <div className={styles.epicSelectorTitle}>
            <span>🔍</span> Step 1: Select Epic ID (Existing SME Records Only)
          </div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            {filteredEntries.length} of {entries.length} Epic Records Available
          </span>
        </div>
        <div className={styles.epicControlsRow}>
          <div className={styles.searchInputWrapper}>
            <span className={styles.searchIcon}>🔎</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search Epic ID, SME Name, Trade, or Institute..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className={styles.selectDropdown}
            value={selectedEntry.id}
            onChange={e => setSelectedEntryId(e.target.value)}
          >
            {filteredEntries.map(entryItem => (
              <option key={entryItem.id} value={entryItem.id}>
                {getEpicId(entryItem.epicSequence)} &mdash; {entryItem.sme?.name || 'Unknown SME'} ({entryItem.trade || 'General'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Read-Only SME Information Banner (Source of Truth) */}
      <div className={styles.smeInfoBanner}>
        <div className={styles.smeBannerHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className={styles.sourceBadge}>
              🔒 SOURCE OF TRUTH: ADD NEW SME RECORD (READ-ONLY)
            </span>
            <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
              Retrieved automatically from database relationships &mdash; No re-entry required
            </span>
          </div>
          <span className={styles.epicIdPill}>{currentEpicId}</span>
        </div>

        <div className={styles.smeGrid}>
          {/* 1. SME Name */}
          <div className={styles.smeFieldItem}>
            <span className={styles.smeFieldLabel}>SME Name</span>
            {sme.name ? (
              <span className={styles.smeFieldValue}>{sme.name}</span>
            ) : (
              <span className={styles.missingField}>Missing in SME Record</span>
            )}
          </div>

          {/* 2. Designation */}
          <div className={styles.smeFieldItem}>
            <span className={styles.smeFieldLabel}>Designation</span>
            {sme.designation ? (
              <span className={styles.smeFieldValue}>{sme.designation}</span>
            ) : (
              <span className={styles.missingField}>Missing in SME Record</span>
            )}
          </div>

          {/* 3. Institute / Organization */}
          <div className={styles.smeFieldItem}>
            <span className={styles.smeFieldLabel}>Institute / Organization</span>
            {sme.institute ? (
              <span className={styles.smeFieldValue}>{sme.institute}</span>
            ) : (
              <span className={styles.missingField}>Missing in SME Record</span>
            )}
          </div>

          {/* 4. Location (City, State) */}
          <div className={styles.smeFieldItem}>
            <span className={styles.smeFieldLabel}>Location (City, State)</span>
            {sme.location ? (
              <span className={styles.smeFieldValue}>{sme.location}</span>
            ) : (
              <span className={styles.missingField}>Missing in SME Record</span>
            )}
          </div>

          {/* 5. Full Address */}
          <div className={styles.smeFieldItem}>
            <span className={styles.smeFieldLabel}>Full Address</span>
            {sme.address ? (
              <span className={styles.smeFieldValue}>{sme.address}</span>
            ) : (
              <span className={styles.missingField}>Missing in SME Record</span>
            )}
          </div>

          {/* 6. Trade */}
          <div className={styles.smeFieldItem}>
            <span className={styles.smeFieldLabel}>Assigned Trade(s)</span>
            {selectedEntry.trade ? (
              <span className={styles.smeFieldValue}>{selectedEntry.trade}</span>
            ) : (
              <span className={styles.missingField}>Missing in SME Record</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Stage Navigation Tabs */}
      <div className={styles.stageTabs}>
        <button
          type="button"
          onClick={() => setActiveStage('STAGE_A')}
          className={`${styles.stageTabBtn} ${activeStage === 'STAGE_A' ? styles.stageTabBtnActive : ''}`}
        >
          <span>📄 STAGE A: Approval Letter</span>
          {hasSavedDocA ? (
            <span className={styles.tabStatusBadgeSaved}>✓ Saved</span>
          ) : (
            <span className={styles.tabStatusBadgeUnsaved}>Draft / Editing</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveStage('STAGE_B')}
          className={`${styles.stageTabBtn} ${activeStage === 'STAGE_B' ? styles.stageTabBtnActive : ''}`}
        >
          <span>📜 STAGE B: Work Completion</span>
          {hasSavedDocB ? (
            <span className={styles.tabStatusBadgeSaved}>✓ Saved</span>
          ) : (
            <span className={styles.tabStatusBadgeUnsaved}>Draft / Editing</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveStage('STAGE_C')}
          className={`${styles.stageTabBtn} ${activeStage === 'STAGE_C' ? styles.stageTabBtnActive : ''}`}
        >
          <span>💰 STAGE C: SME Remuneration</span>
          {hasSavedDocC ? (
            <span className={styles.tabStatusBadgeSaved}>✓ Saved</span>
          ) : (
            <span className={styles.tabStatusBadgeUnsaved}>Draft / Editing</span>
          )}
        </button>
      </div>

      {/* ========================================================
          STAGE A: APPROVAL LETTER WORKSPACE
          ======================================================== */}
      {activeStage === 'STAGE_A' && (
        <div className={styles.stageGrid}>
          {/* Left: Stage Parameters Form */}
          <div className={styles.parametersPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>Stage A &mdash; Approval Letter Parameters</h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {hasSavedDocA && !isEditingA ? (
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>
                      ✅ Parameters Saved in Database {docALastSavedAt ? `(${new Date(docALastSavedAt).toLocaleDateString()})` : ''}
                    </span>
                  ) : (
                    <span style={{ color: '#d97706', fontWeight: 700 }}>
                      ✏️ Editing Parameters &mdash; Click Save to Persist
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.stageActionBar}>
                {hasSavedDocA && !isEditingA ? (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setIsEditingA(true)}
                    disabled={isReadOnly}
                  >
                    ✏️ Edit Parameters
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.btnSuccess}
                    onClick={handleSaveStageA}
                    disabled={isSavingA || isReadOnly}
                  >
                    {isSavingA ? 'Saving...' : '💾 Save Parameters'}
                  </button>
                )}
              </div>
            </div>

            {/* Letter Reference Details */}
            <div className={styles.formSectionTitle}>Letter & Reference Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
              <div className={styles.fieldGroup}>
                <label>Reference Prefix</label>
                <input
                  type="text"
                  className={styles.inputField}
                  disabled={!isEditingA && hasSavedDocA}
                  value={stageAParams.refNoPrefix}
                  onChange={e => setStageAParams({ ...stageAParams, refNoPrefix: e.target.value })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Year</label>
                <input
                  type="text"
                  className={styles.inputField}
                  disabled={!isEditingA && hasSavedDocA}
                  value={stageAParams.year}
                  onChange={e => setStageAParams({ ...stageAParams, year: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label>Letter Date</label>
              <input
                type="date"
                className={styles.inputField}
                disabled={!isEditingA && hasSavedDocA}
                value={stageAParams.letterDate}
                onChange={e => setStageAParams({ ...stageAParams, letterDate: e.target.value })}
              />
            </div>

            {/* Recipient Details */}
            <div className={styles.formSectionTitle}>Recipient Details</div>
            <div className={styles.fieldGroup}>
              <label>Recipient Designation</label>
              <input
                type="text"
                className={styles.inputField}
                disabled={!isEditingA && hasSavedDocA}
                value={stageAParams.recipientDesignation}
                onChange={e => setStageAParams({ ...stageAParams, recipientDesignation: e.target.value })}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Recipient Institution</label>
              <input
                type="text"
                className={styles.inputField}
                disabled={!isEditingA && hasSavedDocA}
                value={stageAParams.recipientInst}
                onChange={e => setStageAParams({ ...stageAParams, recipientInst: e.target.value })}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Recipient Location / Address</label>
              <input
                type="text"
                className={styles.inputField}
                disabled={!isEditingA && hasSavedDocA}
                value={stageAParams.recipientLoc}
                onChange={e => setStageAParams({ ...stageAParams, recipientLoc: e.target.value })}
              />
            </div>

            {/* Schedule & Extension */}
            <div className={styles.formSectionTitle}>Deputation Schedule & Signatory</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className={styles.fieldGroup}>
                <label>Shoot Duration</label>
                <input
                  type="text"
                  className={styles.inputField}
                  disabled={!isEditingA && hasSavedDocA}
                  value={stageAParams.duration}
                  onChange={e => setStageAParams({ ...stageAParams, duration: e.target.value })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Start Date</label>
                <input
                  type="date"
                  className={styles.inputField}
                  disabled={!isEditingA && hasSavedDocA}
                  value={stageAParams.startDate}
                  onChange={e => setStageAParams({ ...stageAParams, startDate: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label>Is Deputation Extension?</label>
              <select
                className={styles.inputField}
                disabled={!isEditingA && hasSavedDocA}
                value={stageAParams.isExtension ? 'yes' : 'no'}
                onChange={e => setStageAParams({ ...stageAParams, isExtension: e.target.value === 'yes' })}
              >
                <option value="no">No &mdash; Initial Approval Order</option>
                <option value="yes">Yes &mdash; Deputation Period Extended</option>
              </select>
            </div>

            {stageAParams.isExtension && (
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className={styles.fieldGroup}>
                  <label>Reason for Extension</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    disabled={!isEditingA && hasSavedDocA}
                    value={stageAParams.reasonForExtension}
                    onChange={e => setStageAParams({ ...stageAParams, reasonForExtension: e.target.value })}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label>Extended Until (DD.MM.YYYY)</label>
                  <input
                    type="text"
                    className={styles.inputField}
                    disabled={!isEditingA && hasSavedDocA}
                    placeholder="26.09.2026"
                    value={stageAParams.extensionDate}
                    onChange={e => setStageAParams({ ...stageAParams, extensionDate: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label>Signatory Authority</label>
              <select
                className={styles.inputField}
                disabled={!isEditingA && hasSavedDocA}
                value={stageAParams.signatory}
                onChange={e => setStageAParams({ ...stageAParams, signatory: e.target.value })}
              >
                <option value="Joint Director / HOO">Joint Director / HOO</option>
                <option value="Executive Director">Executive Director</option>
              </select>
            </div>
          </div>

          {/* Right: Live A4 Preview & Downloads */}
          <div className={styles.previewArea}>
            <div className={styles.previewToolbar}>
              <div className={styles.previewTitle}>
                <span>👁️</span> Approval Letter Preview &mdash; {currentEpicId}
              </div>
              <div className={styles.previewActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => generatePDF(approvalPrintRef, 'Approval_Letter')}
                  disabled={isGenerating}
                >
                  📥 Download PDF
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => generateDOCX(approvalPrintRef, 'Approval_Letter')}
                  disabled={isGenerating}
                >
                  📝 Download DOCX
                </button>
              </div>
            </div>

            {/* A4 Printable Page Container */}
            <div className={styles.officialDocPage} ref={approvalPrintRef}>
              {renderOfficialHeader()}

              {(() => {
                const isExtension = Boolean(stageAParams.isExtension);
                const letterFontSize = isExtension ? '12px' : '12.5px';
                const letterLineHeight = isExtension ? '1.4' : '1.48';
                const paraSpacing = isExtension ? '7px' : '10px';
                const metaSpacing = isExtension ? '10px' : '14px';
                const sigSpacing = isExtension ? '24px' : '36px';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: metaSpacing, fontWeight: 'bold', fontSize: letterFontSize }}>
                        <div>{stageAParams.refNoPrefix}{stageAParams.year}</div>
                        <div>Date: {formatDateDot(stageAParams.letterDate)}</div>
                      </div>

                      <div style={{ marginBottom: metaSpacing, fontSize: letterFontSize, lineHeight: letterLineHeight }}>
                        To,<br />
                        {stageAParams.recipientDesignation || 'The Principal'},<br />
                        {stageAParams.recipientInst || sme.institute || 'Institution'},<br />
                        {stageAParams.recipientLoc || sme.location || 'Location'}
                      </div>

                      <div style={{ marginBottom: metaSpacing, display: 'flex', gap: '8px', fontSize: letterFontSize }}>
                        <strong style={{ whiteSpace: 'nowrap' }}>Sub:</strong>
                        <div style={{ fontWeight: 'bold', textAlign: 'justify' }}>
                          Invitation &mdash; as Subject Matter Expert (SME) to take Classroom shooting for the PM e-Vidya channel for the trade {selectedEntry.trade || 'General'} &mdash; Reg.
                        </div>
                      </div>

                      <div style={{ textAlign: 'justify', marginBottom: paraSpacing, fontSize: letterFontSize, lineHeight: letterLineHeight, textIndent: '24px' }}>
                        The National Instructional Media Institute (NIMI), functioning under the Ministry of Skill Development &amp; Entrepreneurship, Government of India, is the nodal agency engaged in the development of e-Learning content for various trades offered through Industrial Training Institutes (ITIs) and other skill development programmes.
                      </div>

                      <div style={{ textAlign: 'justify', marginBottom: paraSpacing, fontSize: letterFontSize, lineHeight: letterLineHeight, textIndent: '24px' }}>
                        In this connection, approval is hereby accorded for the Visit of <strong>{sme.name || 'Subject Matter Expert'}, {sme.designation || 'Designation'}, {sme.institute || 'Institute'}, {sme.location || 'Location'}</strong> to participate as a <strong>Subject Matter Expert (SME)</strong> for the <strong>PM e-Vidya Classroom Teaching Shoot</strong> for the trade <strong>&ldquo;{selectedEntry.trade || 'General'}&rdquo;</strong> for {stageAParams.duration} from <strong>{formatDateDot(stageAParams.startDate)}</strong>
                        {stageAParams.isExtension && ` due to ${stageAParams.reasonForExtension} the deputation period was requested to be extended till ${stageAParams.extensionDate || 'the completion date'} based on the confirmation of the SME.`}
                        {!stageAParams.isExtension && '.'}
                      </div>

                      <div style={{ textAlign: 'justify', marginBottom: paraSpacing, fontSize: letterFontSize, lineHeight: letterLineHeight, textIndent: '24px' }}>
                        The Subject Matter Expert shall extend academic and technical support for the classroom teaching session, including content delivery, validation of instructional materials, and other activities required for the successful production of the <strong>PM e-Vidya programme</strong>. He/She is requested to coordinate closely with the concerned PM e-Vidya and NIMI officials regarding the content, presentation methodology, reporting schedule, and other technical requirements for the classroom teaching shoot.
                      </div>

                      <div style={{ textAlign: 'justify', marginBottom: paraSpacing, fontSize: letterFontSize, lineHeight: letterLineHeight, textIndent: '24px' }}>
                        The <strong>remuneration / honorarium</strong> for the assignment, along with reimbursement of <strong>Travelling Allowance (TA)</strong>, shall be paid by NIMI as per the prevailing NCERT norms based on the SME designation and eligibility, subject to submission of original travel tickets, boarding passes, and other supporting documents, wherever applicable <strong>(Balmer Lawrie &amp; Company Limited, Ashok Travels &amp; Tours, Indian Railway Catering and Tourism Corporation Ltd - IRCTC)</strong>.
                      </div>

                      <div style={{ textAlign: 'justify', marginBottom: paraSpacing, fontSize: letterFontSize, lineHeight: letterLineHeight, textIndent: '24px' }}>
                        Your kind cooperation and valuable support towards the development of quality e-content for the Skill Development ecosystem will be highly solicited.
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', marginTop: sigSpacing, marginBottom: '6px', fontSize: letterFontSize }}>
                      Regards,
                      <div style={{ height: isExtension ? '24px' : '36px' }} />
                      <strong>{stageAParams.signatory}</strong>
                    </div>
                  </div>
                );
              })()}

              {renderOfficialFooter()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE B: WORK COMPLETION CERTIFICATE WORKSPACE
          ======================================================== */}
      {activeStage === 'STAGE_B' && (
        <div className={styles.stageGrid}>
          {/* Left: Stage Parameters Form */}
          <div className={styles.parametersPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>Stage B &mdash; Work Completion Parameters</h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {hasSavedDocB && !isEditingB ? (
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>
                      ✅ Parameters Saved in Database {docBLastSavedAt ? `(${new Date(docBLastSavedAt).toLocaleDateString()})` : ''}
                    </span>
                  ) : (
                    <span style={{ color: '#d97706', fontWeight: 700 }}>
                      ✏️ Editing Parameters &mdash; Click Save to Persist
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.stageActionBar}>
                {hasSavedDocB && !isEditingB ? (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setIsEditingB(true)}
                    disabled={isReadOnly}
                  >
                    ✏️ Edit Parameters
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.btnSuccess}
                    onClick={handleSaveStageB}
                    disabled={isSavingB || isReadOnly}
                  >
                    {isSavingB ? 'Saving...' : '💾 Save Parameters'}
                  </button>
                )}
              </div>
            </div>

            {/* Programme & Assignment Details */}
            <div className={styles.formSectionTitle}>Programme & Work Details</div>
            <div className={styles.fieldGroup}>
              <label>Programme Name</label>
              <input
                type="text"
                className={styles.inputField}
                disabled={!isEditingB && hasSavedDocB}
                value={stageBParams.programmeName}
                onChange={e => setStageBParams({ ...stageBParams, programmeName: e.target.value })}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Work Title</label>
              <input
                type="text"
                className={styles.inputField}
                disabled={!isEditingB && hasSavedDocB}
                value={stageBParams.workTitle}
                onChange={e => setStageBParams({ ...stageBParams, workTitle: e.target.value })}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label>Work Location</label>
              <input
                type="text"
                className={styles.inputField}
                disabled={!isEditingB && hasSavedDocB}
                value={stageBParams.location}
                onChange={e => setStageBParams({ ...stageBParams, location: e.target.value })}
              />
            </div>

            {/* Completion Dates & Rate */}
            <div className={styles.formSectionTitle}>Completion Schedule &amp; Rate</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className={styles.fieldGroup}>
                <label>Start Date</label>
                <input
                  type="date"
                  className={styles.inputField}
                  disabled={!isEditingB && hasSavedDocB}
                  value={stageBParams.startDate}
                  onChange={e => setStageBParams({ ...stageBParams, startDate: e.target.value })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>End Date</label>
                <input
                  type="date"
                  className={styles.inputField}
                  disabled={!isEditingB && hasSavedDocB}
                  value={stageBParams.endDate}
                  onChange={e => setStageBParams({ ...stageBParams, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.fieldGroup} style={{ marginTop: '10px' }}>
              <label>Honorarium Rate per Day (₹)</label>
              <input
                type="number"
                className={styles.inputField}
                disabled={!isEditingB && hasSavedDocB}
                value={stageBParams.ratePerDay ?? effectiveRatePerDay}
                onChange={e => {
                  const val = Number(e.target.value) || 0;
                  setStageBParams(prev => ({ ...prev, ratePerDay: val }));
                  handleStageCChange('ratePerDay', val);
                }}
              />
            </div>

            {/* Topics Covered */}
            <div className={styles.formSectionTitle}>Topics Delivered</div>
            <div className={styles.fieldGroup}>
              <label>Topics Covered (One per line)</label>
              <textarea
                className={styles.textareaField}
                disabled={!isEditingB && hasSavedDocB}
                placeholder="Topic 1&#10;Topic 2&#10;Topic 3..."
                value={stageBParams.topicsCovered}
                onChange={e => setStageBParams({ ...stageBParams, topicsCovered: e.target.value })}
              />
            </div>

            {/* Verification Authority */}
            <div className={styles.formSectionTitle}>Verification Authority</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className={styles.fieldGroup}>
                <label>Verifier Name</label>
                <input
                  type="text"
                  className={styles.inputField}
                  disabled={!isEditingB && hasSavedDocB}
                  value={stageBParams.verifierName}
                  onChange={e => setStageBParams({ ...stageBParams, verifierName: e.target.value })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Verifier Designation</label>
                <input
                  type="text"
                  className={styles.inputField}
                  disabled={!isEditingB && hasSavedDocB}
                  value={stageBParams.verifierDesignation}
                  onChange={e => setStageBParams({ ...stageBParams, verifierDesignation: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label>Verifier Organisation</label>
              <input
                type="text"
                className={styles.inputField}
                disabled={!isEditingB && hasSavedDocB}
                value={stageBParams.verifierOrganisation}
                onChange={e => setStageBParams({ ...stageBParams, verifierOrganisation: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className={styles.fieldGroup}>
                <label>SME Submission Date</label>
                <input
                  type="date"
                  className={styles.inputField}
                  disabled={!isEditingB && hasSavedDocB}
                  value={stageBParams.submissionDate}
                  onChange={e => setStageBParams({ ...stageBParams, submissionDate: e.target.value })}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Verification Date</label>
                <input
                  type="date"
                  className={styles.inputField}
                  disabled={!isEditingB && hasSavedDocB}
                  value={stageBParams.verificationDate}
                  onChange={e => setStageBParams({ ...stageBParams, verificationDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Right: Live A4 Preview & Downloads */}
          <div className={styles.previewArea}>
            <div className={styles.previewToolbar}>
              <div className={styles.previewTitle}>
                <span>👁️</span> Work Completion Certificate Preview &mdash; {currentEpicId}
              </div>
              <div className={styles.previewActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => generatePDF(completionPrintRef, 'Work_Completion')}
                  disabled={isGenerating}
                >
                  📥 Download PDF
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => generateDOCX(completionPrintRef, 'Work_Completion')}
                  disabled={isGenerating}
                >
                  📝 Download DOCX
                </button>
              </div>
            </div>

            {/* A4 Printable Page Container */}
            <div className={styles.officialDocPage} ref={completionPrintRef}>
              {renderOfficialHeader()}

              {(() => {
                const bTrade = (stageBParams.trade || selectedEntry.trade || 'General').trim();
                const isBMultipleTrades = /[,/&;]|\band\b/i.test(bTrade);

                const rawTopics = (stageBParams.topicsCovered || selectedEntry.topic || 'E-Content Video Production Topics').trim();
                let topicLines = rawTopics.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
                if (topicLines.length === 1 && rawTopics.includes(';') && !rawTopics.includes('\n')) {
                  topicLines = rawTopics.split(';').map((l: string) => l.trim()).filter(Boolean);
                }
                const topicCount = topicLines.length;

                // 5 Adaptive Density Tiers based on actual content
                const cols = topicCount <= 2 ? 1 : topicCount <= 8 ? 2 : 3;

                // Dynamic typography & proportional spacing tokens
                let titleFontSize = '16.5px';
                let titleMargin = '14px 0 14px 0';
                let bodyFontSize = '12.5px';
                let bodyLineHeight = '1.52';
                let paraMargin = '0 0 12px 0';
                let leadInMargin = '0 0 8px 0';

                let topicsFontSize = '11.5px';
                let topicsLineHeight = '1.42';
                let topicsBoxPadding = '10px 14px';
                let topicsBoxMargin = '8px 0 14px 0';
                let topicRowGap = '5px';

                let completionParaMargin = '0 0 14px 0';

                let tableFontSize = '12px';
                let tableCellPadding = '8px 10px';
                let tableMargin = '14px 0 18px 0';

                let declTitleMarginTop = '18px';
                let declTitleFontSize = '12.5px';
                let declFontSize = '11.5px';
                let declLineHeight = '1.42';
                let signatureGap = 48;

                if (topicCount <= 2) {
                  // Tier 1: 1-2 topics
                  titleFontSize = '17px';
                  titleMargin = '16px 0 16px 0';
                  bodyFontSize = '13px';
                  bodyLineHeight = '1.58';
                  paraMargin = '0 0 16px 0';
                  leadInMargin = '0 0 10px 0';
                  topicsFontSize = '12.5px';
                  topicsLineHeight = '1.5';
                  topicsBoxPadding = '12px 16px';
                  topicsBoxMargin = '10px 0 18px 0';
                  topicRowGap = '8px';
                  completionParaMargin = '0 0 18px 0';
                  tableFontSize = '12.5px';
                  tableCellPadding = '10px 12px';
                  tableMargin = '16px 0 22px 0';
                  declTitleMarginTop = '24px';
                  declTitleFontSize = '13px';
                  declFontSize = '12px';
                  declLineHeight = '1.5';
                  signatureGap = 56;
                } else if (topicCount <= 5) {
                  // Tier 2: 3-5 topics
                  titleFontSize = '16.5px';
                  titleMargin = '14px 0 14px 0';
                  bodyFontSize = '12.5px';
                  bodyLineHeight = '1.54';
                  paraMargin = '0 0 14px 0';
                  leadInMargin = '0 0 8px 0';
                  topicsFontSize = '12px';
                  topicsLineHeight = '1.45';
                  topicsBoxPadding = '10px 14px';
                  topicsBoxMargin = '8px 0 16px 0';
                  topicRowGap = '6px';
                  completionParaMargin = '0 0 16px 0';
                  tableFontSize = '12px';
                  tableCellPadding = '9px 11px';
                  tableMargin = '14px 0 20px 0';
                  declTitleMarginTop = '20px';
                  declTitleFontSize = '12.5px';
                  declFontSize = '11.5px';
                  declLineHeight = '1.45';
                  signatureGap = 50;
                } else if (topicCount <= 8) {
                  // Tier 3: 6-8 topics
                  titleFontSize = '16px';
                  titleMargin = '12px 0 12px 0';
                  bodyFontSize = '12px';
                  bodyLineHeight = '1.48';
                  paraMargin = '0 0 11px 0';
                  leadInMargin = '0 0 7px 0';
                  topicsFontSize = '11px';
                  topicsLineHeight = '1.38';
                  topicsBoxPadding = '9px 12px';
                  topicsBoxMargin = '7px 0 13px 0';
                  topicRowGap = '5px';
                  completionParaMargin = '0 0 13px 0';
                  tableFontSize = '11.5px';
                  tableCellPadding = '7.5px 9px';
                  tableMargin = '12px 0 16px 0';
                  declTitleMarginTop = '18px';
                  declTitleFontSize = '12px';
                  declFontSize = '11px';
                  declLineHeight = '1.4';
                  signatureGap = 44;
                } else if (topicCount <= 14) {
                  // Tier 4: 9-14 topics (Shri M Mayapandi has 13 topics)
                  titleFontSize = '16px';
                  titleMargin = '12px 0 11px 0';
                  bodyFontSize = '12px';
                  bodyLineHeight = '1.45';
                  paraMargin = '0 0 10px 0';
                  leadInMargin = '0 0 6px 0';
                  topicsFontSize = '10.5px';
                  topicsLineHeight = '1.34';
                  topicsBoxPadding = '8px 12px';
                  topicsBoxMargin = '6px 0 11px 0';
                  topicRowGap = '4px';
                  completionParaMargin = '0 0 11px 0';
                  tableFontSize = '11.5px';
                  tableCellPadding = '6.5px 8.5px';
                  tableMargin = '11px 0 14px 0';
                  declTitleMarginTop = '15px';
                  declTitleFontSize = '12px';
                  declFontSize = '11px';
                  declLineHeight = '1.36';
                  signatureGap = 40;
                } else {
                  // Tier 5: 15+ topics
                  titleFontSize = '15.5px';
                  titleMargin = '9px 0 8px 0';
                  bodyFontSize = '11.5px';
                  bodyLineHeight = '1.36';
                  paraMargin = '0 0 7px 0';
                  leadInMargin = '0 0 4px 0';
                  topicsFontSize = '10px';
                  topicsLineHeight = '1.26';
                  topicsBoxPadding = '6px 10px';
                  topicsBoxMargin = '5px 0 8px 0';
                  topicRowGap = '3px';
                  completionParaMargin = '0 0 8px 0';
                  tableFontSize = '10.5px';
                  tableCellPadding = '5px 7px';
                  tableMargin = '8px 0 10px 0';
                  declTitleMarginTop = '12px';
                  declTitleFontSize = '11.5px';
                  declFontSize = '10.5px';
                  declLineHeight = '1.3';
                  signatureGap = 30;
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    <h2 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: titleFontSize, margin: titleMargin, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', color: '#000' }}>
                      Work Completion Certificate
                    </h2>

                    <div style={{ textAlign: 'justify', lineHeight: bodyLineHeight, fontSize: bodyFontSize }}>
                      <p style={{ margin: paraMargin }}>
                        This is to certify that <strong>{sme.name || 'Subject Matter Expert'}</strong>, <strong>Guest Expert / Subject Matter Expert (SME)</strong>, has successfully completed the <strong>{stageBParams.programmeName}</strong> for the <strong>{bTrade}</strong> {isBMultipleTrades ? 'trades' : 'trade'} at the <strong>{stageBParams.location}</strong>, during the period from <strong>{formatDateDot(stageBParams.startDate)}</strong> to <strong>{formatDateDot(stageBParams.endDate)}</strong>.
                      </p>
                      
                      <p style={{ margin: paraMargin }}>
                        As the <strong>Guest Expert / Subject Matter Expert (SME)</strong>, <strong>{sme.name || 'the SME'}</strong> effectively delivered the assigned classroom sessions in accordance with the approved curriculum, ensuring technical accuracy, instructional quality, and compliance with the applicable standards for PM e-Vidya digital learning content.
                      </p>
                      
                      <p style={{ margin: leadInMargin }}>
                        The following topics were successfully delivered and recorded for integration into the PM e-Vidya Digital Learning Platform:
                      </p>

                      {/* Content-Aware Adaptive Topics Container */}
                      {cols === 1 ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: topicRowGap,
                          padding: topicsBoxPadding,
                          margin: topicsBoxMargin,
                          fontSize: topicsFontSize,
                          background: '#f8fafc',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          lineHeight: topicsLineHeight
                        }}>
                          {topicLines.map((t: string, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', margin: '2px 0' }}>
                              <span style={{ color: '#000080', fontWeight: 700, flexShrink: 0 }}>•</span>
                              <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0, whiteSpace: 'normal' }}>{t}</span>
                            </div>
                          ))}
                        </div>
                      ) : cols === 2 ? (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          columnGap: '14px',
                          rowGap: topicRowGap,
                          padding: topicsBoxPadding,
                          margin: topicsBoxMargin,
                          fontSize: topicsFontSize,
                          background: '#f8fafc',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          lineHeight: topicsLineHeight
                        }}>
                          {topicLines.map((t: string, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: '5px', alignItems: 'flex-start', minWidth: 0 }}>
                              <span style={{ color: '#000080', fontWeight: 700, flexShrink: 0 }}>•</span>
                              <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0, whiteSpace: 'normal' }}>{t}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          columnGap: '9px',
                          rowGap: topicRowGap,
                          padding: topicsBoxPadding,
                          margin: topicsBoxMargin,
                          fontSize: topicsFontSize,
                          background: '#f8fafc',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          lineHeight: topicsLineHeight
                        }}>
                          {topicLines.map((t: string, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: '5px', alignItems: 'flex-start', minWidth: 0 }}>
                              <span style={{ color: '#000080', fontWeight: 700, flexShrink: 0 }}>•</span>
                              <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0, whiteSpace: 'normal' }}>{t}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <p style={{ margin: completionParaMargin }}>
                        The recorded classroom sessions have been completed satisfactorily and are certified for further processing as per the applicable NIMI norms.
                      </p>

                      <table className={styles.docTable} style={{ margin: tableMargin, fontSize: tableFontSize }}>
                        <thead>
                          <tr>
                            <th style={{ padding: tableCellPadding, width: '16%' }}>Trade(s)</th>
                            <th style={{ padding: tableCellPadding, width: '28%' }}>Guest Expert (SME)</th>
                            <th style={{ padding: tableCellPadding, width: '24%' }}>Work Completed</th>
                            <th style={{ padding: tableCellPadding, width: '18%', textAlign: 'center' }}>Date</th>
                            <th style={{ padding: tableCellPadding, width: '14%', textAlign: 'right' }}>Amount (Rs.)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: tableCellPadding }}><strong>{bTrade}</strong></td>
                            <td style={{ padding: tableCellPadding, wordBreak: 'break-word' }}>
                              <strong>{sme.name || 'Subject Matter Expert'}</strong><br />
                              <span>{sme.designation || 'Designation'}, {sme.institute || 'Institute'}, {sme.location || 'Location'}</span>
                            </td>
                            <td style={{ padding: tableCellPadding, wordBreak: 'break-word' }}>{stageBParams.workTitle}</td>
                            <td style={{ padding: tableCellPadding, textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDateDot(stageBParams.startDate)} &ndash; {formatDateDot(stageBParams.endDate)}</td>
                            <td style={{ padding: tableCellPadding, textAlign: 'right', whiteSpace: 'nowrap' }}>₹{effectiveRatePerDay}/- (per Day)</td>
                          </tr>
                        </tbody>
                      </table>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: declTitleMarginTop, fontWeight: 'bold', fontSize: declTitleFontSize }}>
                        <div style={{ textDecoration: 'underline' }}>SME DECLARATION</div>
                        <div style={{ textDecoration: 'underline' }}>NIMI VERIFICATION</div>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: declFontSize, lineHeight: declLineHeight }}>
                        <div style={{ flex: 1 }}>
                          I, <strong>{sme.name || 'Subject Matter Expert'}</strong>, hereby declare that I have successfully completed the <strong>{stageBParams.programmeName}</strong> for the <strong>{bTrade}</strong> {isBMultipleTrades ? 'trades' : 'trade'} during the period from <strong>{formatDateDot(stageBParams.startDate)}</strong> to <strong>{formatDateDot(stageBParams.endDate)}</strong>.
                          <br /><br />
                          I certify that the assigned topics were delivered as per the approved curriculum and that the work has been completed satisfactorily for processing of honorarium as per applicable NIMI norms.
                          <div style={{ height: `${signatureGap}px` }} />
                          Signature of Guest Expert:<br />
                          Designation: {sme.designation || 'Designation'}, {sme.institute || 'Institute'}<br />
                          Date: {formatDateDot(stageBParams.submissionDate)}
                        </div>

                        <div style={{ flex: 1, paddingLeft: '14px', borderLeft: '1px dashed #cbd5e1' }}>
                          Certified that the above work has been completed satisfactorily and verified as per the requirements of the National Instructional Media Institute (NIMI).
                          <div style={{ height: `${signatureGap + 8}px` }} />
                          Signature<br />
                          Name: <strong>{stageBParams.verifierName}</strong><br />
                          Designation: {stageBParams.verifierDesignation}<br />
                          Organisation: {stageBParams.verifierOrganisation}<br />
                          Date: {formatDateDot(stageBParams.verificationDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {renderOfficialFooter()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE C: SME REMUNERATION WORKSPACE
          ======================================================== */}
      {activeStage === 'STAGE_C' && (
        <div className={styles.stageGrid}>
          {/* Left: Stage Parameters Form */}
          <div className={styles.parametersPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>Stage C &mdash; Remuneration Parameters</h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {hasSavedDocC && !isEditingC ? (
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>
                      ✅ Parameters Saved in Database {docCLastSavedAt ? `(${new Date(docCLastSavedAt).toLocaleDateString()})` : ''}
                    </span>
                  ) : (
                    <span style={{ color: '#d97706', fontWeight: 700 }}>
                      ✏️ Editing Parameters &mdash; Click Save to Persist
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.stageActionBar}>
                {hasSavedDocC && !isEditingC ? (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setIsEditingC(true)}
                    disabled={isReadOnly}
                  >
                    ✏️ Edit Parameters
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.btnSuccess}
                    onClick={handleSaveStageC}
                    disabled={isSavingC || isReadOnly}
                  >
                    {isSavingC ? 'Saving...' : '💾 Save Parameters'}
                  </button>
                )}
              </div>
            </div>

            {/* Trade(s) Selection/Edit */}
            <div className={styles.formSectionTitle}>Trade(s) & Specialization</div>
            <div className={styles.fieldGroup}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Assigned Trade(s)</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Supports multiple trades (comma-separated)</span>
              </label>
              <input
                type="text"
                className={styles.inputField}
                disabled={!isEditingC && hasSavedDocC}
                value={stageCParams.trade ?? selectedEntry.trade ?? ''}
                onChange={e => handleStageCChange('trade', e.target.value)}
                placeholder="e.g. AI Programming Assistant, Electrician"
              />
              {(isEditingC || !hasSavedDocC) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Quick add:</span>
                  {['AI Programming Assistant', 'Electrician', 'Fitter', 'Welder', 'COPA', 'Electronic Mechanic'].map(tName => (
                    <button
                      key={tName}
                      type="button"
                      onClick={() => {
                        const cur = (stageCParams.trade ?? selectedEntry.trade ?? '').trim();
                        if (!cur) {
                          handleStageCChange('trade', tName);
                        } else if (!cur.toLowerCase().includes(tName.toLowerCase())) {
                          handleStageCChange('trade', `${cur}, ${tName}`);
                        }
                      }}
                      style={{
                        fontSize: '11px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        color: '#334155',
                        fontWeight: 500
                      }}
                    >
                      + {tName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance Date Slots (Multiple Entries for breaks/holidays) */}
            <div style={{ marginTop: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className={styles.formSectionTitle} style={{ margin: 0, padding: 0 }}>
                  📅 Attendance Date Ranges / Slots
                </div>
                {(isEditingC || !hasSavedDocC) && (
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1.5px solid #bfdbfe',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ➕ Add Date Slot
                  </button>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                Add multiple date slots if work was split across holidays or leave days. Total Working Days auto-calculates.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(stageCParams.attendanceSlots || []).map((slot, index) => {
                  const daysCount = calculateSlotDays(slot.startDate, slot.endDate);
                  return (
                    <div
                      key={slot.id || index}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          Slot {index + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              background: '#dcfce7',
                              color: '#15803d',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 700
                            }}
                          >
                            {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
                          </span>
                          {(isEditingC || !hasSavedDocC) && (stageCParams.attendanceSlots || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(index)}
                              title="Remove this slot"
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Slot Trade Field */}
                      <div>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          <span>Trade for this Slot</span>
                          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Multi-trade support</span>
                        </label>
                        <input
                          type="text"
                          className={styles.inputField}
                          style={{ padding: '6px 8px', fontSize: '12.5px', marginBottom: '6px' }}
                          placeholder="e.g. AI Programming Assistant, Electrician"
                          disabled={!isEditingC && hasSavedDocC}
                          value={slot.trade ?? stageCParams.trade ?? selectedEntry?.trade ?? ''}
                          onChange={e => handleSlotTradeChange(index, e.target.value)}
                        />
                        {(isEditingC || !hasSavedDocC) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>Quick add:</span>
                            {['AI Programming Assistant', 'Electrician', 'Fitter', 'Welder', 'COPA', 'Electronic Mechanic'].map(tName => (
                              <button
                                key={tName}
                                type="button"
                                onClick={() => handleSlotTradeChange(index, tName)}
                                style={{
                                  fontSize: '10px',
                                  background: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '10px',
                                  padding: '1px 6px',
                                  cursor: 'pointer',
                                  color: '#334155'
                                }}
                              >
                                + {tName}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                            Start Date
                          </label>
                          <input
                            type="date"
                            className={styles.inputField}
                            style={{ padding: '6px 8px', fontSize: '12.5px' }}
                            disabled={!isEditingC && hasSavedDocC}
                            value={slot.startDate}
                            onChange={e => handleSlotDateChange(index, 'startDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                            End Date
                          </label>
                          <input
                            type="date"
                            className={styles.inputField}
                            style={{ padding: '6px 8px', fontSize: '12.5px' }}
                            disabled={!isEditingC && hasSavedDocC}
                            value={slot.endDate}
                            onChange={e => handleSlotDateChange(index, 'endDate', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Calculations */}
            <div className={styles.formSectionTitle}>Financial & Working Days Parameters</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className={styles.fieldGroup}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Total Working Days</span>
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>Auto-calculated</span>
                </label>
                <input
                  type="number"
                  className={styles.inputField}
                  disabled={!isEditingC && hasSavedDocC}
                  value={stageCParams.totalDays}
                  onChange={e => handleStageCChange('totalDays', Number(e.target.value))}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Rate Per Day (₹)</label>
                <input
                  type="number"
                  className={styles.inputField}
                  disabled={!isEditingC && hasSavedDocC}
                  value={stageCParams.ratePerDay}
                  onChange={e => handleStageCChange('ratePerDay', Number(e.target.value))}
                />
              </div>
            </div>

            {/* Auto-Calculated Summary Card - Pure Honorarium */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Base Honorarium ({stageCParams.totalDays} days &times; ₹{stageCParams.ratePerDay}):</span>
                <strong style={{ color: '#0f172a' }}>₹ {stageCParams.grossAmount.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #cbd5e1', paddingTop: '8px', fontSize: '15px' }}>
                <span style={{ fontWeight: 800, color: '#1e40af' }}>Grand Total Remuneration:</span>
                <span style={{ fontWeight: 800, color: '#16a34a' }}>₹ {stageCParams.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#475569', fontSize: '12px' }}>
                ({stageCParams.amountInWords})
              </div>
            </div>

            {/* Sanction Submission Date */}
            <div className={styles.formSectionTitle}>Sanction Submission Date</div>
            <div className={styles.fieldGroup}>
              <label>Submission Date</label>
              <input
                type="date"
                className={styles.inputField}
                disabled={!isEditingC && hasSavedDocC}
                value={stageCParams.submissionDate}
                onChange={e => handleStageCChange('submissionDate', e.target.value)}
              />
            </div>
          </div>

          {/* Right: Live A4 Preview & Downloads */}
          <div className={styles.previewArea}>
            <div className={styles.previewToolbar}>
              <div className={styles.previewTitle}>
                <span>👁️</span> SME Remuneration Note Preview &mdash; {currentEpicId}
              </div>
              <div className={styles.previewActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => generatePDF(remunerationPrintRef, 'Remuneration_Note')}
                  disabled={isGenerating}
                >
                  📥 Download PDF
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => generateDOCX(remunerationPrintRef, 'Remuneration_Note')}
                  disabled={isGenerating}
                >
                  📝 Download DOCX
                </button>
              </div>
            </div>

            {/* A4 Printable Page Container */}
            {(() => {
              const currentTrade = (stageCParams.trade || selectedEntry.trade || 'General').trim();
              const rawSlots = stageCParams.attendanceSlots && stageCParams.attendanceSlots.length > 0
                ? stageCParams.attendanceSlots
                : [{ id: 'slot-default', startDate: selectedEntry.attendanceFrom ? new Date(selectedEntry.attendanceFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], endDate: selectedEntry.attendanceTo ? new Date(selectedEntry.attendanceTo).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], trade: currentTrade }];

              const distinctTrades = Array.from(new Set(
                rawSlots.map(s => (s.trade || currentTrade || 'General').trim()).filter(Boolean)
              ));
              const displayedTrades = distinctTrades.length > 0 ? distinctTrades.join(', ') : currentTrade;
              const isMultipleTrades = distinctTrades.length > 1;
              const isDenseSlots = rawSlots.length >= 8;
              const isVeryDenseSlots = rawSlots.length >= 12;

              // Helper to identify a person for dynamic row grouping
              const getSlotPerson = (s: any) => {
                const name = (s.smeName || s.name || sme?.name || 'Subject Matter Expert').trim();
                const designation = (s.designation || sme?.designation || 'Designation').trim();
                const institute = (s.institute || sme?.institute || '').trim();
                const location = (s.location || sme?.location || '').trim();
                const id = (s.smeId || s.personId || (sme?.id ? String(sme.id) : '') || name).trim();
                const personKey = id ? `${id}__${name.toLowerCase()}` : name.toLowerCase();
                return { id, name, designation, institute, location, personKey };
              };

              // Check if slots are already contiguous by person
              const isAlreadyContiguous = (() => {
                const seenPersons = new Set<string>();
                let lastPerson = '';
                for (const s of rawSlots) {
                  const pk = getSlotPerson(s).personKey;
                  if (pk !== lastPerson) {
                    if (seenPersons.has(pk)) return false;
                    seenPersons.add(pk);
                    lastPerson = pk;
                  }
                }
                return true;
              })();

              // Group related rows together for the same person if ordering requires minimal adjustment
              const orderedSlots = isAlreadyContiguous
                ? rawSlots
                : (() => {
                    const groups = new Map<string, any[]>();
                    for (const s of rawSlots) {
                      const pk = getSlotPerson(s).personKey;
                      if (!groups.has(pk)) groups.set(pk, []);
                      groups.get(pk)!.push(s);
                    }
                    const flattened: any[] = [];
                    for (const group of groups.values()) {
                      flattened.push(...group);
                    }
                    return flattened;
                  })();

              // Build grouped row metadata with vertical cell merge span for both Person and Trade
              const groupedRows: Array<{
                slot: any;
                sNo: number;
                isFirstOfPerson: boolean;
                personRowSpan: number;
                personName: string;
                personDesignation: string;
                personInstitute: string;
                personLocation: string;
                isFirstOfTrade: boolean;
                tradeRowSpan: number;
                daysVal: number;
                slotTrade: string;
                slotAmount: number;
              }> = [];

              let slotIdx = 0;
              while (slotIdx < orderedSlots.length) {
                const currentSlot = orderedSlots[slotIdx];
                const person = getSlotPerson(currentSlot);

                // Count consecutive rows for this same person
                let span = 1;
                while (slotIdx + span < orderedSlots.length) {
                  const nextPerson = getSlotPerson(orderedSlots[slotIdx + span]);
                  if (nextPerson.personKey === person.personKey) {
                    span++;
                  } else {
                    break;
                  }
                }

                // Within this person's rows, count consecutive rows for the same trade (dynamic merge)
                let tradeRelIdx = 0;
                while (tradeRelIdx < span) {
                  const tradeSlot = orderedSlots[slotIdx + tradeRelIdx];
                  const tradeName = (tradeSlot.trade || currentTrade || 'General').trim();

                  let tradeSpan = 1;
                  while (tradeRelIdx + tradeSpan < span) {
                    const nextTradeSlot = orderedSlots[slotIdx + tradeRelIdx + tradeSpan];
                    const nextTradeName = (nextTradeSlot.trade || currentTrade || 'General').trim();
                    if (nextTradeName.toLowerCase() === tradeName.toLowerCase()) {
                      tradeSpan++;
                    } else {
                      break;
                    }
                  }

                  for (let t = 0; t < tradeSpan; t++) {
                    const s = tradeRelIdx + t;
                    const slot = orderedSlots[slotIdx + s];
                    const slotDays = calculateSlotDays(slot.startDate, slot.endDate);
                    const daysVal = slotDays > 0 ? slotDays : 1;
                    const slotTrade = tradeName;
                    const slotAmount = daysVal * stageCParams.ratePerDay;

                    groupedRows.push({
                      slot,
                      sNo: slotIdx + s + 1,
                      isFirstOfPerson: s === 0,
                      personRowSpan: span,
                      personName: person.name,
                      personDesignation: person.designation,
                      personInstitute: person.institute,
                      personLocation: person.location,
                      isFirstOfTrade: t === 0,
                      tradeRowSpan: tradeSpan,
                      daysVal,
                      slotTrade,
                      slotAmount
                    });
                  }

                  tradeRelIdx += tradeSpan;
                }

                slotIdx += span;
              }

              return (
                <div className={styles.a4Page} ref={remunerationPrintRef}>
                  <h2 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: isDenseSlots ? '15px' : '17px', margin: isDenseSlots ? '14px 0 8px 0' : '22px 0 14px 0', letterSpacing: '0.3px' }}>
                    SME REMUNERATION / SANCTION NOTE
                  </h2>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isDenseSlots ? '8px' : '14px', fontWeight: 'bold', fontSize: isDenseSlots ? '12px' : '13px' }}>
                    <div>Submitted</div>
                    <div>{formatDateDot(stageCParams.submissionDate)}</div>
                  </div>
                  <div style={{ textAlign: 'justify', lineHeight: isDenseSlots ? '1.4' : '1.55', fontSize: isDenseSlots ? '11.5px' : '13px' }}>
                    Sanction may kindly be accorded for a sum of <strong>Rs. {stageCParams.totalAmount.toLocaleString('en-IN')}/- (Rupees {stageCParams.amountInWords})</strong> towards the remuneration of <strong>{sme.name || 'Subject Matter Expert'}</strong>, <strong>{sme.designation || 'Designation'}</strong>, <strong>{sme.institute || 'Institution'}, {sme.location || 'Location'}</strong>, who served as the <strong>Guest Expert / Subject Matter Expert (SME)</strong> for the <strong>{stageCParams.programmeName}</strong> for the <strong>{displayedTrades}</strong> {isMultipleTrades ? 'trades' : 'trade'}. The <strong>{stageCParams.workTitle}</strong> was successfully conducted and completed at the <strong>{stageCParams.location}</strong>.
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: isDenseSlots ? '6px' : '12px', marginBottom: isDenseSlots ? '8px' : '14px', fontSize: isVeryDenseSlots ? '10px' : isDenseSlots ? '11px' : '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'center', width: '5%' }}>S. No.</th>
                          <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'left', width: '23%' }}>Name &amp; Designation</th>
                          <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'left', width: '20%' }}>Trade</th>
                          <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'center', width: '22%' }}>Attendance Date</th>
                          <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'center', width: '10%' }}>Total No. of Days</th>
                          <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'right', width: '10%' }}>Remuneration per Day</th>
                          <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'right', width: '10%' }}>Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedRows.map(row => {
                          return (
                            <tr key={row.slot.id || row.sNo}>
                              <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '6px 8px', textAlign: 'center' }}>
                                {row.sNo}
                              </td>
                              {row.isFirstOfPerson && (
                                <td
                                  rowSpan={row.personRowSpan}
                                  style={{
                                    border: '1px solid #000',
                                    padding: isDenseSlots ? '3px 5px' : '6px 8px',
                                    verticalAlign: 'middle',
                                    backgroundColor: '#ffffff'
                                  }}
                                >
                                  <strong>{row.personName}</strong><br />
                                  <span>{row.personDesignation}</span>
                                  {(row.personInstitute || row.personLocation) && (
                                    <div style={{ fontSize: isDenseSlots ? '10px' : '11px', color: '#475569', marginTop: '2px' }}>
                                      {row.personInstitute}{row.personLocation ? `, ${row.personLocation}` : ''}
                                    </div>
                                  )}
                                </td>
                              )}
                              {row.isFirstOfTrade && (
                                <td
                                  rowSpan={row.tradeRowSpan}
                                  style={{
                                    border: '1px solid #000',
                                    padding: isDenseSlots ? '3px 5px' : '6px 8px',
                                    verticalAlign: 'middle',
                                    backgroundColor: '#ffffff'
                                  }}
                                >
                                  <strong>{row.slotTrade}</strong>
                                </td>
                              )}
                              <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '6px 8px', textAlign: 'center', fontSize: isDenseSlots ? '10.5px' : '11.5px', whiteSpace: 'nowrap' }}>
                                {formatDateDot(row.slot.startDate)} to {formatDateDot(row.slot.endDate)}
                              </td>
                              <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>
                                {row.daysVal} {row.daysVal === 1 ? 'Day' : 'Days'}
                              </td>
                              <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                Rs. {stageCParams.ratePerDay}/-
                              </td>
                              <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '6px 8px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                Rs. {row.slotAmount.toLocaleString('en-IN')}/-
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>Subtotal (Remuneration):</td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>{stageCParams.totalDays} Days</td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Rs. {stageCParams.grossAmount.toLocaleString('en-IN')}/-</td>
                        </tr>
                        <tr>
                          <td colSpan={6} style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>Grand Total:</td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Rs. {stageCParams.totalAmount.toLocaleString('en-IN')}/-</td>
                        </tr>
                      </tfoot>
                    </table>
                    <p style={{ margin: isDenseSlots ? '4px 0' : '10px 0', fontSize: isDenseSlots ? '11.5px' : '13px', lineHeight: isDenseSlots ? '1.4' : '1.55' }}>
                      If approved, payment of <strong>Rs. {stageCParams.totalAmount.toLocaleString('en-IN')}/- (Rupees {stageCParams.amountInWords})</strong> may be released to the above Subject Matter Expert from the PM e-Vidya Funds as per the prevailing NCERT norms. The SME engagement approval letter, Work Completion Certificate, and other supporting documents are enclosed separately for kind perusal.
                    </p>
                    <p style={{ margin: isDenseSlots ? '4px 0' : '10px 0', fontSize: isDenseSlots ? '11.5px' : '13px', lineHeight: isDenseSlots ? '1.4' : '1.55' }}>
                      Submitted for kind approval, please.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
