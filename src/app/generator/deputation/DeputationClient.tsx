"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import styles from './deputation.module.css';
import {
  saveCommunicationsStage,
  StageAParameters,
  StageBParameters,
  StageCParameters
} from './actions';

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

const getEpicId = (epicSequence: number) =>
  `EPIC-2026-PMeVidya ${String(epicSequence || 1).padStart(2, '0')}`;

export default function DeputationClient({
  initialWorkEntries,
  userRole = 'ADMIN',
  preselectedEpicId
}: DeputationClientProps) {
  const [entries, setEntries] = useState<any[]>(initialWorkEntries || []);
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

  // Synchronize state when selectedEntry changes
  useEffect(() => {
    if (!selectedEntry) return;

    const sme = selectedEntry.sme || {};
    const docs = selectedEntry.documents || [];
    const payments = selectedEntry.payments || [];
    const payment = payments[0] || {};

    // 1. Stage A initialization
    const docA = docs.find((d: any) => d.type === 'STAGE_A_APPROVAL_LETTER');
    if (docA?.filePath) {
      try {
        const parsed = JSON.parse(docA.filePath);
        setStageAParams(parsed);
        setHasSavedDocA(true);
        setIsEditingA(false);
        setDocALastSavedAt(docA.updatedAt || docA.createdAt);
      } catch {
        initDefaultStageA(selectedEntry, sme);
      }
    } else {
      initDefaultStageA(selectedEntry, sme);
    }

    // 2. Stage B initialization
    const docB = docs.find((d: any) => d.type === 'STAGE_B_WORK_COMPLETION');
    if (docB?.filePath) {
      try {
        const parsed = JSON.parse(docB.filePath);
        setStageBParams(parsed);
        setHasSavedDocB(true);
        setIsEditingB(false);
        setDocBLastSavedAt(docB.updatedAt || docB.createdAt);
      } catch {
        initDefaultStageB(selectedEntry);
      }
    } else {
      initDefaultStageB(selectedEntry);
    }

    // 3. Stage C initialization
    const docC = docs.find((d: any) => d.type === 'STAGE_C_REMUNERATION');
    if (docC?.filePath) {
      try {
        const parsed = JSON.parse(docC.filePath);
        setStageCParams(parsed);
        setHasSavedDocC(true);
        setIsEditingC(false);
        setDocCLastSavedAt(docC.updatedAt || docC.createdAt);
      } catch {
        initDefaultStageC(selectedEntry, payment);
      }
    } else {
      initDefaultStageC(selectedEntry, payment);
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

  const initDefaultStageB = (entry: any) => {
    const startDate = entry.attendanceFrom
      ? new Date(entry.attendanceFrom).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const endDate = entry.attendanceTo
      ? new Date(entry.attendanceTo).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setStageBParams({
      programmeName: 'PM e-Vidya Classroom Teaching Video Production',
      workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
      location: 'National Instructional Media Institute (NIMI), Chennai',
      startDate,
      endDate,
      topicsCovered: entry.topic || 'Classroom Teaching & E-Content Production for PM e-Vidya',
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

  const initDefaultStageC = (entry: any, payment: any) => {
    const days = entry.days || 4;
    const ratePerDay = entry.ratePerDay || 1500;
    const grossAmount = days * ratePerDay;
    const taAmount = entry.taAmount || payment.taAmount || 0;
    const otherAmount = entry.otherAmount || payment.otherAmount || 0;
    const totalAmount = grossAmount + taAmount + otherAmount;

    setStageCParams({
      programmeName: 'PM e-Vidya Classroom Teaching Video Production',
      workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
      location: 'National Instructional Media Institute (NIMI), Chennai',
      totalDays: days,
      ratePerDay,
      grossAmount,
      taAmount,
      otherAmount,
      totalAmount,
      amountInWords: numberToWords(totalAmount),
      submissionDate: new Date().toISOString().split('T')[0],
      verifierName: 'Joint Director / HOO',
      verifierDesignation: 'Head of Office'
    });
    setHasSavedDocC(false);
    setIsEditingC(false);
    setDocCLastSavedAt(null);
  };

  // Stage C auto-calculation when values change
  const handleStageCChange = (field: keyof StageCParameters, value: any) => {
    setStageCParams(prev => {
      const updated = { ...prev, [field]: value };
      const days = Number(field === 'totalDays' ? value : updated.totalDays) || 0;
      const rate = Number(field === 'ratePerDay' ? value : updated.ratePerDay) || 0;
      const ta = Number(field === 'taAmount' ? value : updated.taAmount) || 0;
      const other = Number(field === 'otherAmount' ? value : updated.otherAmount) || 0;
      const gross = days * rate;
      const total = gross + ta + other;
      updated.grossAmount = gross;
      updated.totalAmount = total;
      updated.amountInWords = numberToWords(total);
      return updated;
    });
  };

  // Save Handlers
  const handleSaveStageA = async () => {
    if (!selectedEntry) return;
    setIsSavingA(true);
    try {
      const res = await saveCommunicationsStage(selectedEntry.id, 'STAGE_A', stageAParams);
      if (res.success && res.document) {
        setHasSavedDocA(true);
        setIsEditingA(false);
        setDocALastSavedAt(res.document.updatedAt || new Date().toISOString());
        // Update local state without mutating other stages
        setEntries(prev => prev.map(e => {
          if (e.id !== selectedEntry.id) return e;
          const otherDocs = (e.documents || []).filter((d: any) => d.type !== 'STAGE_A_APPROVAL_LETTER');
          return { ...e, documents: [...otherDocs, res.document] };
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
      const res = await saveCommunicationsStage(selectedEntry.id, 'STAGE_B', stageBParams);
      if (res.success && res.document) {
        setHasSavedDocB(true);
        setIsEditingB(false);
        setDocBLastSavedAt(res.document.updatedAt || new Date().toISOString());
        setEntries(prev => prev.map(e => {
          if (e.id !== selectedEntry.id) return e;
          const otherDocs = (e.documents || []).filter((d: any) => d.type !== 'STAGE_B_WORK_COMPLETION');
          return {
            ...e,
            topic: stageBParams.topicsCovered || e.topic,
            attendanceFrom: stageBParams.startDate ? new Date(stageBParams.startDate) : e.attendanceFrom,
            attendanceTo: stageBParams.endDate ? new Date(stageBParams.endDate) : e.attendanceTo,
            documents: [...otherDocs, res.document]
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
      const res = await saveCommunicationsStage(selectedEntry.id, 'STAGE_C', stageCParams);
      if (res.success && res.document) {
        setHasSavedDocC(true);
        setIsEditingC(false);
        setDocCLastSavedAt(res.document.updatedAt || new Date().toISOString());
        setEntries(prev => prev.map(e => {
          if (e.id !== selectedEntry.id) return e;
          const otherDocs = (e.documents || []).filter((d: any) => d.type !== 'STAGE_C_REMUNERATION');
          return {
            ...e,
            days: stageCParams.totalDays,
            ratePerDay: stageCParams.ratePerDay,
            taAmount: stageCParams.taAmount,
            otherAmount: stageCParams.otherAmount,
            documents: [...otherDocs, res.document]
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

  // Export PDF Handler
  const generatePDF = async (ref: React.RefObject<HTMLDivElement | null>, docTypeLabel: string) => {
    if (!selectedEntry) return;
    const element = ref.current;
    if (!element) return;

    setIsGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const epicClean = getEpicId(selectedEntry.epicSequence).replace(/\s+/g, '_');
      const smeClean = (selectedEntry.sme?.name || 'SME').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${docTypeLabel}_${epicClean}_${smeClean}.pdf`;

      const opt: any = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3.5, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().from(element).set(opt).save();
      showToast(`✓ Downloaded ${filename} successfully!`, 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Export DOCX Handler
  const generateDOCX = async (ref: React.RefObject<HTMLDivElement | null>, docTypeLabel: string) => {
    if (!selectedEntry) return;
    const element = ref.current;
    if (!element) return;

    try {
      let htmlContent = element.innerHTML;

      // Embed logo as base64 for Word compatibility
      try {
        const response = await fetch('/nimi-logo.png');
        const blobImg = await response.blob();
        const base64data = await new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blobImg);
        });
        htmlContent = htmlContent.replace(/src="\/nimi-logo\.png"/g, `src="${base64data}"`);
      } catch (e) {
        console.warn('Failed to embed logo in DOCX', e);
      }

      const epicClean = getEpicId(selectedEntry.epicSequence).replace(/\s+/g, '_');
      const smeClean = (selectedEntry.sme?.name || 'SME').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${docTypeLabel}_${epicClean}_${smeClean}.doc`;

      const fullHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${docTypeLabel}</title>
          <style>
            body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; line-height: 1.5; padding: 20mm; }
            table { border-collapse: collapse; width: 100%; margin: 15px 0; }
            th, td { border: 1px solid #000; padding: 6px 8px; font-size: 10.5pt; vertical-align: top; }
            th { background-color: #f1f5f9; }
            .officialHeader { text-align: center; border-bottom: 2px solid #000080; padding-bottom: 10px; margin-bottom: 20px; color: #000080; }
            .officialFooter { text-align: center; border-top: 1px dashed #000; padding-top: 10px; margin-top: 30px; font-size: 9pt; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`✓ Downloaded ${filename} successfully!`, 'success');
    } catch (e: any) {
      console.error('Error generating DOCX:', e);
      showToast('Failed to export DOCX version', 'error');
    }
  };

  const renderOfficialHeader = () => (
    <div className={styles.officialHeader}>
      <h1>NATIONAL INSTRUCTIONAL MEDIA INSTITUTE</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/nimi-logo.png" alt="NIMI Logo" className={styles.logoImage} />
      <p style={{ fontWeight: 600 }}>(AN AUTONOMOUS INSTITUTION)</p>
      <p>Ministry of Skill Development & Entrepreneurship</p>
      <p>Government of India</p>
      <p className={styles.subText}>Post Box No.3142, CTI Campus, Guindy Industrial Estate, Guindy, Chennai - 600 032.</p>
      <p className={styles.subText} style={{ fontWeight: 'bold' }}>
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
            <span className={styles.smeFieldLabel}>Assigned Trade</span>
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
                    disabled={userRole === 'VIEWER'}
                  >
                    ✏️ Edit Parameters
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.btnSuccess}
                    onClick={handleSaveStageA}
                    disabled={isSavingA || userRole === 'VIEWER'}
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
            <div className={styles.a4Page} ref={approvalPrintRef}>
              {!hasSavedDocA && <div className={styles.watermarkDraft}>PREVIEW DRAFT</div>}

              {renderOfficialHeader()}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold', fontSize: '13px' }}>
                <div>{stageAParams.refNoPrefix}{stageAParams.year}</div>
                <div>Date: {formatDateDot(stageAParams.letterDate)}</div>
              </div>

              <div style={{ marginBottom: '20px', fontSize: '13.5px', lineHeight: '1.6' }}>
                To,<br />
                {stageAParams.recipientDesignation || 'The Principal'},<br />
                {stageAParams.recipientInst || sme.institute || 'Institution'},<br />
                {stageAParams.recipientLoc || sme.location || 'Location'}
              </div>

              <div style={{ marginBottom: '18px', display: 'flex', gap: '8px', fontSize: '13.5px' }}>
                <strong style={{ whiteSpace: 'nowrap' }}>Sub:</strong>
                <div style={{ fontWeight: 'bold', textAlign: 'justify' }}>
                  Invitation &mdash; as Subject Matter Expert (SME) to take Classroom shooting for the PM e-Vidya channel for the trade {selectedEntry.trade || 'General'} &mdash; Reg.
                </div>
              </div>

              <div style={{ textAlign: 'justify', marginBottom: '14px', fontSize: '13px', lineHeight: '1.6', textIndent: '30px' }}>
                The National Instructional Media Institute (NIMI), functioning under the Ministry of Skill Development & Entrepreneurship, Government of India, is the nodal agency engaged in the development of e-Learning content for various trades offered through Industrial Training Institutes (ITIs) and other skill development programmes.
              </div>

              <div style={{ textAlign: 'justify', marginBottom: '14px', fontSize: '13px', lineHeight: '1.6', textIndent: '30px' }}>
                In this connection, approval is hereby accorded for the Visit of <strong>{sme.name || 'Subject Matter Expert'}, {sme.designation || 'Designation'}, {sme.institute || 'Institute'}, {sme.location || 'Location'}</strong> to participate as a <strong>Subject Matter Expert (SME)</strong> for the <strong>PM e-Vidya Classroom Teaching Shoot</strong> for the trade <strong>&ldquo;{selectedEntry.trade || 'General'}&rdquo;</strong> for {stageAParams.duration} from <strong>{formatDateDot(stageAParams.startDate)}</strong>
                {stageAParams.isExtension && ` due to ${stageAParams.reasonForExtension} the deputation period was requested to be extended till ${stageAParams.extensionDate || 'the completion date'} based on the confirmation of the SME.`}
                {!stageAParams.isExtension && '.'}
              </div>

              <div style={{ textAlign: 'justify', marginBottom: '14px', fontSize: '13px', lineHeight: '1.6', textIndent: '30px' }}>
                The Subject Matter Expert shall extend academic and technical support for the classroom teaching session, including content delivery, validation of instructional materials, and other activities required for the successful production of the <strong>PM e-Vidya programme</strong>. He/She is requested to coordinate closely with the concerned PM e-Vidya and NIMI officials regarding the content, presentation methodology, reporting schedule, and other technical requirements for the classroom teaching shoot.
              </div>

              <div style={{ textAlign: 'justify', marginBottom: '14px', fontSize: '13px', lineHeight: '1.6', textIndent: '30px' }}>
                The <strong>remuneration / honorarium</strong> for the assignment, along with reimbursement of <strong>Travelling Allowance (TA)</strong>, shall be paid by NIMI as per the prevailing NCERT norms based on the SME designation and eligibility, subject to submission of original travel tickets, boarding passes, and other supporting documents, wherever applicable <strong>(Balmer Lawrie & Company Limited, Ashok Travels & Tours, Indian Railway Catering and Tourism Corporation Ltd - IRCTC)</strong>.
              </div>

              <div style={{ textAlign: 'justify', marginBottom: '35px', fontSize: '13px', lineHeight: '1.6', textIndent: '30px' }}>
                Your kind cooperation and valuable support towards the development of quality e-content for the Skill Development ecosystem will be highly solicited.
              </div>

              <div style={{ textAlign: 'right', marginTop: '30px', marginBottom: '10px', fontSize: '13.5px' }}>
                Regards,
                <br /><br /><br /><br />
                <strong>{stageAParams.signatory}</strong>
              </div>

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
                    disabled={userRole === 'VIEWER'}
                  >
                    ✏️ Edit Parameters
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.btnSuccess}
                    onClick={handleSaveStageB}
                    disabled={isSavingB || userRole === 'VIEWER'}
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

            {/* Completion Dates */}
            <div className={styles.formSectionTitle}>Completion Schedule</div>
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
            <div className={styles.a4Page} ref={completionPrintRef}>
              {!hasSavedDocB && <div className={styles.watermarkDraft}>PREVIEW DRAFT</div>}

              {renderOfficialHeader()}

              <h2 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: '18px', margin: '24px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Work Completion Certificate
              </h2>

              <div style={{ textAlign: 'justify', lineHeight: '1.6', fontSize: '13px' }}>
                This is to certify that <strong>{sme.name || 'Subject Matter Expert'}</strong>, <strong>Guest Expert / Subject Matter Expert (SME)</strong>, has successfully completed the <strong>{stageBParams.programmeName}</strong> for the <strong>{selectedEntry.trade || 'General'}</strong> trade at the <strong>{stageBParams.location}</strong>, during the period from <strong>{formatDateDot(stageBParams.startDate)}</strong> to <strong>{formatDateDot(stageBParams.endDate)}</strong>.
                <br /><br />
                As the <strong>Guest Expert / Subject Matter Expert (SME)</strong>, <strong>{sme.name || 'the SME'}</strong> effectively delivered the assigned classroom sessions in accordance with the approved curriculum, ensuring technical accuracy, instructional quality, and compliance with the applicable standards for PM e-Vidya digital learning content.
                <br /><br />
                The following topics were successfully delivered and recorded for integration into the PM e-Vidya Digital Learning Platform:
                <div style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '12px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px', background: '#f8fafc', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  {stageBParams.topicsCovered || 'E-Content Video Production Topics'}
                </div>
                The recorded classroom sessions have been completed satisfactorily and are certified for further processing as per the applicable NIMI norms.
                <br /><br />

                <table className={styles.docTable}>
                  <thead>
                    <tr>
                      <th>Trade</th>
                      <th>Guest Expert (SME)</th>
                      <th>Work Completed</th>
                      <th>Date</th>
                      <th>Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>{selectedEntry.trade || 'General'}</strong></td>
                      <td>
                        <strong>{sme.name || 'Subject Matter Expert'}</strong><br />
                        {sme.designation || 'Designation'}, {sme.institute || 'Institute'}, {sme.location || 'Location'}
                      </td>
                      <td>{stageBParams.workTitle}</td>
                      <td>{formatDateDot(stageBParams.startDate)} &ndash; {formatDateDot(stageBParams.endDate)}</td>
                      <td>₹{selectedEntry.ratePerDay || 1500}/- (per Day)</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', fontWeight: 'bold', fontSize: '13px' }}>
                  <div style={{ textDecoration: 'underline' }}>SME DECLARATION</div>
                  <div style={{ textDecoration: 'underline' }}>NIMI VERIFICATION</div>
                </div>

                <div style={{ display: 'flex', gap: '24px', marginTop: '10px', fontSize: '12.5px' }}>
                  <div style={{ flex: 1 }}>
                    I, <strong>{sme.name || 'Subject Matter Expert'}</strong>, hereby declare that I have successfully completed the <strong>{stageBParams.programmeName}</strong> for the <strong>{selectedEntry.trade || 'General'}</strong> trade during the period from <strong>{formatDateDot(stageBParams.startDate)}</strong> to <strong>{formatDateDot(stageBParams.endDate)}</strong>.
                    <br /><br />
                    I certify that the assigned topics were delivered as per the approved curriculum and that the work has been completed satisfactorily for processing of honorarium as per applicable NIMI norms.
                    <br /><br /><br /><br />
                    Signature of Guest Expert:<br />
                    Designation: {sme.designation || 'Designation'}, {sme.institute || 'Institute'}<br />
                    Date: {formatDateDot(stageBParams.submissionDate)}
                  </div>

                  <div style={{ flex: 1, paddingLeft: '16px', borderLeft: '1px dashed #cbd5e1' }}>
                    Certified that the above work has been completed satisfactorily and verified as per the requirements of the National Instructional Media Institute (NIMI).
                    <br /><br /><br /><br /><br /><br />
                    Signature<br />
                    Name: <strong>{stageBParams.verifierName}</strong><br />
                    Designation: {stageBParams.verifierDesignation}<br />
                    Organisation: {stageBParams.verifierOrganisation}<br />
                    Date: {formatDateDot(stageBParams.verificationDate)}
                  </div>
                </div>
              </div>

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
                    disabled={userRole === 'VIEWER'}
                  >
                    ✏️ Edit Parameters
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.btnSuccess}
                    onClick={handleSaveStageC}
                    disabled={isSavingC || userRole === 'VIEWER'}
                  >
                    {isSavingC ? 'Saving...' : '💾 Save Parameters'}
                  </button>
                )}
              </div>
            </div>

            {/* Financial Calculations */}
            <div className={styles.formSectionTitle}>Financial & Working Days Parameters</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className={styles.fieldGroup}>
                <label>Total Working Days</label>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className={styles.fieldGroup}>
                <label>TA Amount (₹)</label>
                <input
                  type="number"
                  className={styles.inputField}
                  disabled={!isEditingC && hasSavedDocC}
                  value={stageCParams.taAmount}
                  onChange={e => handleStageCChange('taAmount', Number(e.target.value))}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Other Charges (₹)</label>
                <input
                  type="number"
                  className={styles.inputField}
                  disabled={!isEditingC && hasSavedDocC}
                  value={stageCParams.otherAmount}
                  onChange={e => handleStageCChange('otherAmount', Number(e.target.value))}
                />
              </div>
            </div>

            {/* Auto-Calculated Summary Card */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Base Honorarium ({stageCParams.totalDays} days &times; ₹{stageCParams.ratePerDay}):</span>
                <strong style={{ color: '#0f172a' }}>₹ {stageCParams.grossAmount.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Travelling Allowance (TA):</span>
                <strong style={{ color: '#0f172a' }}>₹ {stageCParams.taAmount.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Other Charges:</span>
                <strong style={{ color: '#0f172a' }}>₹ {stageCParams.otherAmount.toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #cbd5e1', paddingTop: '8px', fontSize: '15px' }}>
                <span style={{ fontWeight: 800, color: '#1e40af' }}>Grand Total Remuneration:</span>
                <span style={{ fontWeight: 800, color: '#16a34a' }}>₹ {stageCParams.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#475569', fontSize: '12px' }}>
                ({stageCParams.amountInWords})
              </div>
            </div>

            {/* Authority & Dates */}
            <div className={styles.formSectionTitle}>Authority & Sanction Details</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className={styles.fieldGroup}>
                <label>Sanction Verifier</label>
                <input
                  type="text"
                  className={styles.inputField}
                  disabled={!isEditingC && hasSavedDocC}
                  value={stageCParams.verifierName}
                  onChange={e => handleStageCChange('verifierName', e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label>Designation</label>
                <input
                  type="text"
                  className={styles.inputField}
                  disabled={!isEditingC && hasSavedDocC}
                  value={stageCParams.verifierDesignation}
                  onChange={e => handleStageCChange('verifierDesignation', e.target.value)}
                />
              </div>
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
            <div className={styles.a4Page} ref={remunerationPrintRef}>
              {!hasSavedDocC && <div className={styles.watermarkDraft}>PREVIEW DRAFT</div>}

              {renderOfficialHeader()}

              <h2 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: '18px', margin: '24px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                SME Remuneration / Sanction Note
              </h2>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold', fontSize: '13px' }}>
                <div>Submitted</div>
                <div>{formatDateDot(stageCParams.submissionDate)}</div>
              </div>

              <div style={{ textAlign: 'justify', lineHeight: '1.8', fontSize: '13.5px' }}>
                Sanction may kindly be accorded for a sum of <strong>Rs. {stageCParams.totalAmount.toLocaleString('en-IN')}/- (Rupees {stageCParams.amountInWords})</strong> towards the remuneration of <strong>{sme.name || 'Subject Matter Expert'}</strong>, <strong>{sme.designation || 'Designation'}</strong>, <strong>{sme.institute || 'Institute'}, {sme.location || 'Location'}</strong>, who served as the <strong>Guest Expert / Subject Matter Expert (SME)</strong> for the <strong>{stageCParams.programmeName}</strong> for the <strong>{selectedEntry.trade || 'General'}</strong> trade. The <strong>{stageCParams.workTitle}</strong> was successfully conducted and completed at the <strong>{stageCParams.location}</strong>.
                <br /><br />

                <table className={styles.docTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '45px' }}>S.No.</th>
                      <th>Name & Designation</th>
                      <th>Trade & Organization</th>
                      <th style={{ textAlign: 'center' }}>Total Days</th>
                      <th style={{ textAlign: 'right' }}>Remuneration / Day</th>
                      <th style={{ textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'center' }}>1</td>
                      <td>
                        <strong>{sme.name || 'Subject Matter Expert'}</strong><br />
                        {sme.designation || 'Designation'}
                      </td>
                      <td>
                        <strong>{selectedEntry.trade || 'General'}</strong><br />
                        {sme.institute || 'Institute'}, {sme.location || 'Location'}
                      </td>
                      <td style={{ textAlign: 'center' }}>{stageCParams.totalDays} Days</td>
                      <td style={{ textAlign: 'right' }}>Rs. {stageCParams.ratePerDay}/-</td>
                      <td style={{ textAlign: 'right' }}>Rs. {stageCParams.grossAmount.toLocaleString('en-IN')}/-</td>
                    </tr>
                    {stageCParams.taAmount > 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold' }}>Travelling Allowance (TA Reimbursement):</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rs. {stageCParams.taAmount.toLocaleString('en-IN')}/-</td>
                      </tr>
                    )}
                    {stageCParams.otherAmount > 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'right', fontWeight: 'bold' }}>Other Approved Charges:</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Rs. {stageCParams.otherAmount.toLocaleString('en-IN')}/-</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f1f5f9' }}>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold' }}>Grand Total Sanction Amount:</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{stageCParams.totalDays} Days</td>
                      <td style={{ textAlign: 'right' }}></td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>Rs. {stageCParams.totalAmount.toLocaleString('en-IN')}/-</td>
                    </tr>
                  </tfoot>
                </table>

                <div style={{ marginTop: '16px' }}>
                  If approved, payment of <strong>Rs. {stageCParams.totalAmount.toLocaleString('en-IN')}/- (Rupees {stageCParams.amountInWords})</strong> may be released to the above Subject Matter Expert from the PM e-Vidya Funds as per the prevailing NCERT norms. The SME engagement approval letter, Work Completion Certificate, and other supporting documents are enclosed separately for kind perusal.
                  <br /><br />
                  Submitted for kind approval, please.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '70px', fontSize: '13px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0 }}>Prepared By / Verified By</p>
                  <p style={{ marginTop: '40px', fontWeight: 'bold' }}>(PM e-Vidya Content Team)</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0 }}>Recommended & Approved</p>
                  <p style={{ marginTop: '40px', fontWeight: 'bold' }}>{stageCParams.verifierName}</p>
                  <p style={{ margin: 0 }}>{stageCParams.verifierDesignation}</p>
                </div>
              </div>

              {renderOfficialFooter()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
