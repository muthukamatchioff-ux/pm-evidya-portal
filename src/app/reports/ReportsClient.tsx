'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { generateDocxReport } from './docxHelper';
import { getEpicCompleteHistory } from './actions';
import EpicWorkflowReport from './EpicWorkflowReport';
import VideoProductionTrackerReport from './VideoProductionTrackerReport';
import styles from '@/app/dashboard/dashboard.module.css';

export default function ReportsClient({ 
  components, 
  comprehensiveData, 
  role = 'VIEWER' 
}: { 
  components: any[], 
  comprehensiveData?: any, 
  role?: string 
}) {
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const { smes = [], production = [], auditLogs = [], epicWorkEntries = [], topicProductionRecords = [] } = comprehensiveData || {};

  const canViewFinancials = role === 'ADMIN' || role === 'TEAM_MEMBER';
  const canViewAuditLogs = role === 'ADMIN' || role === 'TEAM_MEMBER';
  const canViewSmeMaster = role === 'ADMIN' || role === 'TEAM_MEMBER' || role === 'VIEWER';

  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintingAnnexure, setIsPrintingAnnexure] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Video Production Tracker Report States
  const [isVideoTrackerModalOpen, setIsVideoTrackerModalOpen] = useState(false);
  const [isPrintingVideoTracker, setIsPrintingVideoTracker] = useState(false);

  const triggerPrintVideoTracker = () => {
    setIsPrintingVideoTracker(true);
    setTimeout(() => {
      window.print();
      setIsPrintingVideoTracker(false);
    }, 500);
  };

  // SME Epic Workflow Report States
  const [selectedEpicId, setSelectedEpicId] = useState<string>('');
  const [epicHistoryData, setEpicHistoryData] = useState<{ workEntry: any, auditLogs: any[] } | null>(null);
  const [isEpicModalOpen, setIsEpicModalOpen] = useState(false);
  const [isPrintingEpic, setIsPrintingEpic] = useState(false);
  const [isLoadingEpic, setIsLoadingEpic] = useState(false);

  const getEpicId = (epicSequence: number) => `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;

  // Genuine recorded Epic entries from database
  const allEpicEntries: any[] = React.useMemo(() => {
    if (epicWorkEntries && epicWorkEntries.length > 0) return epicWorkEntries;
    return smes.flatMap((s: any) => (s.workEntries || []).map((w: any) => ({ ...w, sme: s })));
  }, [epicWorkEntries, smes]);

  const handleViewEpicReport = async (workEntryId: string) => {
    if (!workEntryId) return alert('Please select an Epic ID first.');
    setIsLoadingEpic(true);
    try {
      const cached = allEpicEntries.find(e => e.id === workEntryId);
      const res = await getEpicCompleteHistory(workEntryId);
      if (res && res.success && res.data) {
        setEpicHistoryData(res.data);
      } else if (cached) {
        setEpicHistoryData({ workEntry: cached, auditLogs: [] });
      } else {
        alert(res?.error || 'Could not load Epic record.');
        return;
      }
      setIsEpicModalOpen(true);
    } catch (err: any) {
      alert('Error loading Epic records: ' + (err.message || ''));
    } finally {
      setIsLoadingEpic(false);
    }
  };

  const triggerPrintEpic = async (workEntryId: string) => {
    if (!workEntryId) return alert('Please select an Epic ID first.');
    setIsLoadingEpic(true);
    try {
      const cached = allEpicEntries.find(e => e.id === workEntryId);
      const res = await getEpicCompleteHistory(workEntryId);
      if (res && res.success && res.data) {
        setEpicHistoryData(res.data);
      } else if (cached) {
        setEpicHistoryData({ workEntry: cached, auditLogs: [] });
      }
      setIsPrintingEpic(true);
      setTimeout(() => {
        window.print();
        setIsPrintingEpic(false);
      }, 500);
    } catch (err: any) {
      alert('Error preparing print view: ' + (err.message || ''));
    } finally {
      setIsLoadingEpic(false);
    }
  };

  const triggerPrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const triggerPrintAnnexure = () => {
    setIsPrintingAnnexure(true);
    setTimeout(() => {
      window.print();
      setIsPrintingAnnexure(false);
    }, 500);
  };

  const generateExcelForComponents = (compsToExport: any[], isOverall: boolean = false) => {
    if (compsToExport.length === 0) return alert("No components to export");
    const wb = XLSX.utils.book_new();
    const downloadTime = new Date().toLocaleString('en-IN').replace(/[:,\/]/g, '-');

    // Executive Summary
    let totalBudget = 0;
    let totalExpenditure = 0;
    const summaryData = compsToExport.map(c => {
      totalBudget += c.approvedBudget;
      totalExpenditure += c.expenditureIncurred;
      const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][c.componentNo - 1];
      return {
        "Component": c.name,
        "Annexure": `Annexure-${roman}`,
        "Approved Budget (₹)": c.approvedBudget,
        "Expenditure (₹)": c.expenditureIncurred,
        "Unutilized (₹)": c.unutilizedBalance,
        "Utilization %": c.utilizationPercent + "%"
      };
    });

    if (isOverall) {
      summaryData.push({
        "Component": "GRAND TOTAL",
        "Annexure": "",
        "Approved Budget (₹)": totalBudget,
        "Expenditure (₹)": totalExpenditure,
        "Unutilized (₹)": totalBudget - totalExpenditure,
        "Utilization %": totalBudget ? ((totalExpenditure / totalBudget) * 100).toFixed(2) + "%" : "0%"
      });
    }

    const wsSummary = XLSX.utils.aoa_to_sheet([
      [`PM e-Vidya ${isOverall ? 'Overall' : 'Selected'} Financial Summary`],
      [`Downloaded At: ${downloadTime}`]
    ]);
    XLSX.utils.sheet_add_json(wsSummary, summaryData, { origin: "A4" });
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Full Detail Sheets per Annexure
    compsToExport.forEach(c => {
      const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][c.componentNo - 1];
      const items = c[`annexure${roman}`] || [];
      
      const sanitizedItems = items.map((item: any, idx: number) => {
        if (roman === 'I') {
          return {
            "Sl. No.": idx + 1,
            "Name": item.expertName || '-',
            "Designation": item.designation || '-',
            "Working Days": item.workingDays != null ? item.workingDays : '-',
            "HA Issued Date": item.datePeriod || '-',
            "Honorarium Amount (₹)": item.honorarium ? Number(item.honorarium) : 0,
            "Honorarium Voucher No.": item.utrNumber || '-',
            "Honorarium Narration": item.remarks || '-',
            "TA Date": item.tranType || '-',
            "TA Amount (₹)": item.travelAllowance ? Number(item.travelAllowance) : 0,
            "TA Voucher No.": item.voucherNo || '-',
            "TA Narration": item.narration || '-',
            "Total Amount (₹)": (Number(item.honorarium) || 0) + (Number(item.travelAllowance) || 0)
          };
        }

        if (roman === 'II') {
          return {
            "Sl. No.": idx + 1,
            "datePeriod": item.datePeriod || '-',
            "trainingName": item.trainingName || '-',
            "trainingType": item.trainingType || '-',
            "participant": item.participant || '-',
            "venue": item.venue || '-',
            "trainingDays": item.trainingDays != null ? item.trainingDays : '-',
            "TA Amount": item.travelAllowance ? Number(item.travelAllowance) : 0,
            "TA Voucher No.": item.utrNumber || '-',
            "Ta Narration": item.remarks || '-',
            "trainingDates": item.trainingDates || '-'
          };
        }
        
        // Fallback for other annexures
        const obj: any = { "Sl. No.": idx + 1 };
        Object.keys(item).forEach(k => {
          if (!['id', 'budgetComponentId', 'createdAt', 'updatedAt', 'verificationStatus', 'supportingDoc', 'approvalRef'].includes(k)) {
            obj[k] = item[k];
          }
        });
        return obj;
      });

      const wsDetails = XLSX.utils.aoa_to_sheet([
        [c.name],
        [`Annexure-${roman}`],
        [`Downloaded At: ${downloadTime}`]
      ]);

      if (sanitizedItems.length > 0) {
        XLSX.utils.sheet_add_json(wsDetails, sanitizedItems, { origin: "A5" });
      } else {
        XLSX.utils.sheet_add_json(wsDetails, [{ "Note": "No records found" }], { origin: "A5" });
      }

      // Sheet names in Excel have a 31 character limit
      let sheetName = `Annx-${roman} Details`;
      XLSX.utils.book_append_sheet(wb, wsDetails, sheetName);
    });

    const fileName = isOverall 
      ? `PM_eVidya_Overall_Report_${downloadTime}.xlsx` 
      : `PM_eVidya_Selected_Report_${downloadTime}.xlsx`;
      
    XLSX.writeFile(wb, fileName);
  };

  const generateOverallReport = () => generateExcelForComponents(components, true);
  
  const generateComponentReport = () => {
    const selectedCompsData = components.filter(comp => selectedComponents.includes(comp.id));
    generateExcelForComponents(selectedCompsData, false);
  };

  const generateSmeReport = () => {
    const data = smes.flatMap((sme: any) => 
      sme.workEntries.map((entry: any) => {
        const attendance = entry.documents?.find((d: any) => d.type === 'SME_ATTENDANCE');
        const approval = entry.documents?.find((d: any) => d.type === 'APPROVAL_LETTER');
        const completion = entry.documents?.find((d: any) => d.type === 'WORK_COMPLETION');
        
        return {
          "EPIC ID": getEpicId(entry.epicSequence || 1),
          "SME Name": sme.name,
          "Trade": entry.trade,
          "Topic": entry.topic,
          "Institute": sme.institute || 'N/A',
          "Status": entry.status,
          "Attendance Uploaded": attendance ? 'Yes' : 'No',
          "Approval Uploaded": approval ? 'Yes' : 'No',
          "Completion Uploaded": completion ? 'Yes' : 'No',
          "Payment Status": entry.payments?.[0]?.status || 'DRAFT',
          "Created Date": new Date(entry.createdAt).toLocaleDateString('en-IN')
        };
      })
    );
    if (data.length === 0) return alert("No SME records found");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SME Compliance");
    XLSX.writeFile(wb, `PM_eVidya_SME_Compliance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generateProductionReport = () => {
    // Check if we have epicWorkEntries with production data, or fall back to legacy production records
    const epicData = allEpicEntries.flatMap((entry: any) => {
      const schedule = entry.shootingSchedules?.[0];
      const editorRec = entry.videoEditorRecords?.[0];
      const finalRec = entry.finalVideoRecords?.[0];

      const libraryVideos: any[] = entry.videoLibraries && entry.videoLibraries.length > 0 
        ? entry.videoLibraries 
        : (entry.finalVideoRecords && entry.finalVideoRecords.length > 0 ? entry.finalVideoRecords.map((f: any) => ({
            title: f.title || schedule?.videoTitle || entry.topic || 'PM e-Vidya Video',
            videoLink: f.finalVideoFile,
            duration: f.finalDuration,
            createdAt: f.approvalDate,
            finalVideoStatus: f.finalVideoStatus
          })) : [null]);

      const prodStart = schedule?.scheduledStart ? new Date(schedule.scheduledStart).toLocaleDateString('en-IN') : (schedule?.shootDate ? new Date(schedule.shootDate).toLocaleDateString('en-IN') : 'TBD');
      const prodEnd = schedule?.scheduledEnd ? new Date(schedule.scheduledEnd).toLocaleDateString('en-IN') : 'TBD';

      const postProdStart = editorRec?.editingStartDate ? new Date(editorRec.editingStartDate).toLocaleDateString('en-IN') : 'TBD';
      const postProdEndRaw = editorRec?.editingEndDate || (editorRec?.reviewComments && editorRec.reviewComments.startsWith('[END:') ? editorRec.reviewComments.match(/^\[END:([^\]]+)\]/)?.[1] : null);
      const postProdEnd = postProdEndRaw ? new Date(postProdEndRaw).toLocaleDateString('en-IN') : 'TBD';

      return libraryVideos.map((libraryVideo: any, vIdx: number) => {
        const videoLink = libraryVideo?.videoLink || libraryVideo?.finalVideoFile || 'Pending Delivery';
        const deliveryDate = libraryVideo?.createdAt 
          ? new Date(libraryVideo.createdAt).toLocaleDateString('en-IN')
          : (finalRec?.approvalDate ? new Date(finalRec.approvalDate).toLocaleDateString('en-IN') : 'Pending');

        const deliveryStatus = libraryVideo?.title 
          ? (libraryVideo.status || 'DELIVERED & CATALOGUED')
          : (finalRec?.finalVideoStatus === 'APPROVED' || finalRec?.finalVideoStatus === 'COMPLETED' ? 'APPROVED' : 'PENDING DELIVERY');

        const videoDuration = libraryVideo?.duration || libraryVideo?.finalDuration || editorRec?.duration || 'Duration unavailable';

        return {
          "EPIC ID": getEpicId(entry.epicSequence || 1),
          "Video #": libraryVideos.length > 1 ? `Video ${vIdx + 1}` : 'Video 1',
          "SME Name": entry.sme?.name || 'Unassigned',
          "Video Title / Topic": libraryVideo?.title || schedule?.videoTitle || entry.topic || 'PM e-Vidya Video',
          "Trade": entry.trade || 'General',
          "Production Start Date": prodStart,
          "Production End Date": prodEnd,
          "Production Status": schedule?.status || 'PLANNED',
          "Post-Production Start Date": postProdStart,
          "Post-Production End Date": postProdEnd,
          "Post-Production Status": editorRec?.status || 'NOT_STARTED',
          "Video Editor": editorRec?.editorName || '-',
          "Final Video Link (Library)": videoLink,
          "Delivery Date": deliveryDate,
          "Delivery Status": deliveryStatus,
          "Duration": videoDuration
        };
      });
    });

    const data = epicData.length > 0 ? epicData : production.map((prod: any) => ({
      "Project Code": prod.project?.projectCode || 'N/A',
      "Project Title": prod.project?.title || 'N/A',
      "Video URL": prod.videoUrl || 'Pending',
      "Shoot Date": prod.shootDate ? new Date(prod.shootDate).toLocaleDateString('en-IN') : 'N/A',
      "Status": prod.status,
      "Last Updated": new Date(prod.updatedAt).toLocaleDateString('en-IN')
    }));

    if (data.length === 0) return alert("No Production records found");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Production Tracker");
    XLSX.writeFile(wb, `PM_eVidya_Production_Tracker_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generateAuditReport = () => {
    const data = auditLogs.map((log: any) => ({
      "Date": new Date(log.createdAt).toLocaleString('en-IN'),
      "Action": log.action,
      "Module": log.entity,
      "Record ID": log.entityId
    }));
    if (data.length === 0) return alert("No Audit Logs found");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "System Audit");
    XLSX.writeFile(wb, `PM_eVidya_Audit_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      
      {/* SECTION 1: SME Epic Workflow Complete History Report Card (Prominent Top Banner) */}
      <div className={styles.sectionCard} style={{ gridColumn: '1 / -1', border: '2px solid #0284c7', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }}>
        <div className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📑</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f2942' }}>PM e-Vidya — SME Epic Complete History Report</span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
            {allEpicEntries.length} Recorded Epic IDs
          </span>
        </div>
        <p style={{ color: '#475569', marginBottom: '20px', fontSize: '14px' }}>
          Select any existing Epic ID recorded in the system to generate a consolidated Power BI-style report with shooting schedules, editing stages, animation, telecast metrics, and verified documents.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* Epic ID Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              Select Recorded Epic ID:
            </label>
            <select
              value={selectedEpicId}
              onChange={(e) => setSelectedEpicId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid #0284c7',
                fontSize: '14px',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="">-- Choose Recorded Epic ID ({allEpicEntries.length} Available) --</option>
              {allEpicEntries.map(e => (
                <option key={e.id} value={e.id}>
                  {getEpicId(e.epicSequence)} — {e.sme?.name || 'SME'} — {e.trade || 'General'} ({e.status || 'PENDING'})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Details of Selected Epic ID */}
          {selectedEpicId && (() => {
            const selectedEntry = allEpicEntries.find(e => e.id === selectedEpicId);
            if (!selectedEntry) return null;
            return (
              <div style={{
                background: '#ffffff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '10px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, color: '#0369a1', fontSize: '13px' }}>
                    {getEpicId(selectedEntry.epicSequence)}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: '#ecfdf5', color: '#065f46' }}>
                    {selectedEntry.status || 'PENDING'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#1e293b', fontWeight: 600 }}>
                  {selectedEntry.sme?.name} • {selectedEntry.sme?.institute || 'NIMI'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Topic: {selectedEntry.topic || '-'}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className={styles.btnAction}
            style={{
              flex: 1,
              minWidth: '200px',
              justifyContent: 'center',
              backgroundColor: selectedEpicId ? '#0284c7' : '#94a3b8',
              color: 'white',
              cursor: selectedEpicId ? 'pointer' : 'not-allowed'
            }}
            onClick={() => handleViewEpicReport(selectedEpicId)}
            disabled={!selectedEpicId || isLoadingEpic}
          >
            <span>👁️</span> {isLoadingEpic ? 'Loading Records...' : 'Generate & View Epic Report'}
          </button>
          <button
            className={styles.btnAction}
            style={{
              flex: 1,
              minWidth: '200px',
              justifyContent: 'center',
              backgroundColor: selectedEpicId ? '#f59e0b' : '#cbd5e1',
              color: 'white',
              cursor: selectedEpicId ? 'pointer' : 'not-allowed'
            }}
            onClick={() => triggerPrintEpic(selectedEpicId)}
            disabled={!selectedEpicId || isLoadingEpic}
          >
            <span>🖨️</span> Print Epic Report (PDF)
          </button>
        </div>
      </div>

      {/* Overall Report Card */}
      {canViewFinancials && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>
            <span style={{ fontSize: '20px' }}>📊 Export Overall Financial Report</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            View a print-ready dashboard report or generate the complete consolidated workbook containing the Executive Summary.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className={styles.btnAction} style={{ flex: 1, minWidth: '160px', justifyContent: 'center', backgroundColor: '#0284c7', color: 'white' }} onClick={() => setIsPreviewOpen(true)}>
              👁️ Preview Infographic
            </button>
            <button className={styles.btnAction} style={{ flex: 1, minWidth: '160px', justifyContent: 'center', backgroundColor: '#f59e0b', color: 'white' }} onClick={triggerPrint}>
              🖨️ Print Dashboard View
            </button>
            <button className={styles.btnAction} style={{ flex: 1, minWidth: '140px', justifyContent: 'center', backgroundColor: 'var(--primary)', color: 'white' }} onClick={generateOverallReport}>
              Download Excel
            </button>
          </div>
        </div>
      )}

      {/* Component Report Card */}
      {canViewFinancials && (
        <div className={styles.sectionCard} style={{ gridColumn: '1 / -1' }}>
        <div className={styles.sectionTitle}>
          <span style={{ fontSize: '20px' }}>📑 Export Component Report</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Select specific components to generate a detailed workbook or view the annexure in table format.
        </p>
        
        <div style={{ marginBottom: '16px', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {components.map(c => (
            <label key={c.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: selectedComponents.includes(c.id) ? '#e0f2fe' : '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: selectedComponents.includes(c.id) ? '1px solid #38bdf8' : '1px solid #e2e8f0' }}>
              <input 
                type="checkbox" 
                checked={selectedComponents.includes(c.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedComponents([...selectedComponents, c.id]);
                  else setSelectedComponents(selectedComponents.filter(id => id !== c.id));
                }}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px', fontWeight: selectedComponents.includes(c.id) ? 600 : 400 }}>Annexure-{['I', 'II', 'III', 'IV', 'V', 'VI'][c.componentNo - 1]}: {c.name}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button className={styles.btnAction} style={{ flex: 1, minWidth: '150px', justifyContent: 'center', backgroundColor: selectedComponents.length > 0 ? '#f59e0b' : 'var(--slate-200)', color: selectedComponents.length > 0 ? 'white' : 'var(--text-secondary)' }} onClick={triggerPrintAnnexure} disabled={selectedComponents.length === 0}>
            🖨️ Print Annexure
          </button>
          <button className={styles.btnAction} style={{ flex: 1, minWidth: '150px', justifyContent: 'center', backgroundColor: selectedComponents.length > 0 ? 'var(--primary)' : 'var(--slate-200)', color: selectedComponents.length > 0 ? 'white' : 'var(--text-secondary)' }} onClick={generateComponentReport} disabled={selectedComponents.length === 0}>
            Export Selected (Excel)
          </button>
          <button className={styles.btnAction} style={{ flex: 1, minWidth: '150px', justifyContent: 'center', backgroundColor: selectedComponents.length > 0 ? 'var(--blue-500)' : 'var(--slate-200)', color: selectedComponents.length > 0 ? 'white' : 'var(--text-secondary)' }} onClick={() => {
            if (selectedComponents.length === 0) return;
            const selectedCompsData = components.filter(comp => selectedComponents.includes(comp.id));
            if (selectedCompsData.length > 0) generateDocxReport(selectedCompsData);
          }} disabled={selectedComponents.length === 0}>
            Export Selected (Word)
          </button>
        </div>

        {/* Live Table Preview */}
        {selectedComponents.length === 1 && (
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
            {(() => {
              const selectedComp = components.find(c => c.id === selectedComponents[0]);
              const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][selectedComp.componentNo - 1];
              const items = selectedComp[`annexure${roman}`] || [];
              if (items.length === 0) return <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No data available for {selectedComp.name}</div>;

              let cols: string[] = [];
              if (roman === 'I') {
                cols = [
                  'Name',
                  'Designation',
                  'Working Days',
                  'HA Issued Date',
                  'Honorarium Amount (₹)',
                  'Honorarium Voucher No.',
                  'Honorarium Narration',
                  'TA Date',
                  'TA Amount (₹)',
                  'TA Voucher No.',
                  'TA Narration',
                  'Total Amount (₹)'
                ];
              } else if (roman === 'II') {
                cols = [
                  'datePeriod',
                  'trainingName',
                  'trainingType',
                  'participant',
                  'venue',
                  'trainingDays',
                  'TA Amount',
                  'TA Voucher No.',
                  'Ta Narration',
                  'trainingDates'
                ];
              } else {
                cols = Object.keys(items[0]).filter(k => !['id', 'budgetComponentId', 'createdAt', 'updatedAt', 'verificationStatus', 'supportingDoc', 'approvalRef'].includes(k));
              }

              const getMappedValue = (item: any, col: string) => {
                if (roman === 'I') {
                  const map: any = {
                    'Name': item.expertName || '-',
                    'Designation': item.designation || '-',
                    'Working Days': item.workingDays != null ? item.workingDays : '-',
                    'HA Issued Date': item.datePeriod || '-',
                    'Honorarium Amount (₹)': item.honorarium && Number(item.honorarium) > 0 ? `₹ ${Number(item.honorarium).toLocaleString('en-IN')}` : '-',
                    'Honorarium Voucher No.': item.utrNumber || '-',
                    'Honorarium Narration': item.remarks || '-',
                    'TA Date': item.tranType || '-',
                    'TA Amount (₹)': item.travelAllowance && Number(item.travelAllowance) > 0 ? `₹ ${Number(item.travelAllowance).toLocaleString('en-IN')}` : '-',
                    'TA Voucher No.': item.voucherNo || '-',
                    'TA Narration': item.narration || '-',
                    'Total Amount (₹)': `₹ ${((Number(item.honorarium) || 0) + (Number(item.travelAllowance) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  };
                  return map[col] !== undefined ? map[col] : item[col];
                }
                if (roman === 'II') {
                  const map: any = {
                    'datePeriod': item.datePeriod || '-',
                    'trainingName': item.trainingName || '-',
                    'trainingType': item.trainingType || '-',
                    'participant': item.participant || '-',
                    'venue': item.venue || '-',
                    'trainingDays': item.trainingDays != null ? item.trainingDays : '-',
                    'TA Amount': item.travelAllowance && Number(item.travelAllowance) > 0 ? `₹ ${Number(item.travelAllowance).toLocaleString('en-IN')}` : '-',
                    'TA Voucher No.': item.utrNumber || '-',
                    'Ta Narration': item.remarks || '-',
                    'trainingDates': item.trainingDates || '-'
                  };
                  return map[col] !== undefined ? map[col] : item[col];
                }
                return item[col];
              };

              return (
                <div style={{ overflowX: 'auto' }}>
                  <h3 style={{ marginBottom: '16px', color: '#0f172a' }}>Preview: Annexure-{roman} ({selectedComp.name})</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: '800px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '12px', border: '1px solid #e2e8f0', color: '#334155' }}>Sl. No.</th>
                        {cols.map(col => <th key={col} style={{ padding: '12px', border: '1px solid #e2e8f0', color: '#334155', textTransform: 'capitalize' }}>{col.replace(/([A-Z])/g, ' $1').trim()}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, idx: number) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{idx + 1}</td>
                          {cols.map(col => (
                            <td key={col} style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{String(getMappedValue(item, col) || '-')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      )}

      {/* SME & Compliance Report Card */}
      {canViewSmeMaster && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>
            <span style={{ fontSize: '20px' }}>👨‍🏫 SME & Document Compliance</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Exports a master list of all SMEs mapped to their exact EPIC IDs, Trades, Topics, and Document Upload statuses (Attendance, Approval Letter, Completion).
          </p>
          <button className={styles.btnAction} style={{ width: '100%', justifyContent: 'center', backgroundColor: '#10b981', color: 'white' }} onClick={generateSmeReport}>
            Export SME Master & Compliance (Excel)
          </button>
        </div>
      )}

      {/* SECTION: Video Production Tracker Report Option Card */}
      <div className={styles.sectionCard} style={{ border: '2px solid #8b5cf6', background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.08)' }}>
        <div className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🎥</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f2942' }}>Video Production Tracker Report</span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, background: '#ede9fe', color: '#6d28d9', padding: '4px 12px', borderRadius: '12px', border: '1px solid #ddd6fe' }}>
            Executive Dashboard & Details
          </span>
        </div>
        <p style={{ color: '#475569', marginBottom: '20px', fontSize: '14px' }}>
          Interactive executive report modeled on the Sheet10 Executive Summary. Includes 4 KPI summary cards (Planned, Shooting Done, Editing Done, Duration), Monthly Progress, Cameraman Workload, Trade-wise Progress, Editor Workload, and searchable 16-attribute production records.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className={styles.btnAction}
            style={{ flex: 1, minWidth: '180px', justifyContent: 'center', backgroundColor: '#8b5cf6', color: 'white', fontWeight: 700 }}
            onClick={() => setIsVideoTrackerModalOpen(true)}
          >
            <span>👁️</span> View Executive Dashboard & Report
          </button>
          <button
            className={styles.btnAction}
            style={{ flex: 1, minWidth: '150px', justifyContent: 'center', backgroundColor: '#f59e0b', color: 'white', fontWeight: 700 }}
            onClick={triggerPrintVideoTracker}
          >
            <span>🖨️</span> Print Report (PDF)
          </button>
          <button
            className={styles.btnAction}
            style={{ flex: 1, minWidth: '150px', justifyContent: 'center', backgroundColor: '#10b981', color: 'white', fontWeight: 700 }}
            onClick={generateProductionReport}
          >
            <span>📊</span> Export Excel
          </button>
        </div>
      </div>

      {/* System Audit Logs */}
      {canViewAuditLogs && (
        <div className={styles.sectionCard} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.sectionTitle}>
            <span style={{ fontSize: '20px' }}>🛡️ System Audit & Activity Logs</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Extracts up to the last 1000 system-level audit traces tracking document uploads, metadata modifications, and registration changes for security compliance.
          </p>
          <button className={styles.btnAction} style={{ width: '100%', maxWidth: '400px', justifyContent: 'center', backgroundColor: '#475569', color: 'white' }} onClick={generateAuditReport}>
            Export Complete Audit Log (Excel)
          </button>
        </div>
      )}

      {/* Print View & Infographic Styling */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 4mm 6mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          aside, header, nav, button, select, input,
          .no-print,
          [class*="sectionCard"],
          [class*="pageHeader"],
          [class*="quickActions"] {
            display: none !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #printable-dashboard, #printable-dashboard * {
            visibility: visible !important;
          }
          #printable-annexures, #printable-annexures * {
            visibility: visible !important;
          }
          #printable-epic-report, #printable-epic-report * {
            visibility: visible !important;
          }
          #printable-video-tracker-report, #printable-video-tracker-report * {
            visibility: visible !important;
          }
          #printable-dashboard, #printable-annexures, #printable-epic-report, #printable-video-tracker-report {
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            padding: 0 !important; 
            margin: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Force A4 1-Page Fixed for Dashboard View */
          #printable-dashboard {
            max-height: 198mm !important;
            height: auto !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
          }
          #printable-dashboard .dashboard-report-card {
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            max-height: 198mm !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          #printable-dashboard .dashboard-report-header {
            padding: 8px 16px !important;
            border-top: 3px solid #0284c7 !important;
            border-bottom: 1.5px solid #bae6fd !important;
            gap: 12px !important;
          }
          #printable-dashboard .dashboard-report-logo-left {
            height: 42px !important;
          }
          #printable-dashboard .dashboard-report-logo-right {
            height: 36px !important;
          }
          #printable-dashboard .dashboard-report-org-title {
            font-size: 11px !important;
          }
          #printable-dashboard .dashboard-report-org-sub {
            font-size: 8.5px !important;
          }
          #printable-dashboard .dashboard-report-title {
            font-size: 16px !important;
            margin: 0 0 2px 0 !important;
            line-height: 1.1 !important;
          }
          #printable-dashboard .dashboard-report-subtitle {
            font-size: 10.5px !important;
            margin: 0 0 3px 0 !important;
          }
          #printable-dashboard .dashboard-report-date {
            font-size: 9px !important;
            padding: 2px 8px !important;
          }
          #printable-dashboard .dashboard-report-kpis {
            padding: 6px 16px 4px 16px !important;
            gap: 10px !important;
          }
          #printable-dashboard .dashboard-report-kpi-card {
            padding: 6px 12px !important;
            border-radius: 8px !important;
            box-shadow: none !important;
          }
          #printable-dashboard .dashboard-report-kpi-label {
            font-size: 9px !important;
          }
          #printable-dashboard .dashboard-report-kpi-icon {
            width: 22px !important;
            height: 22px !important;
            font-size: 11px !important;
          }
          #printable-dashboard .dashboard-report-kpi-val {
            font-size: 16px !important;
            margin-top: 2px !important;
          }
          #printable-dashboard .dashboard-report-kpi-sub {
            font-size: 8.5px !important;
            margin-top: 2px !important;
          }
          #printable-dashboard .dashboard-report-table-section {
            padding: 4px 16px 6px 16px !important;
          }
          #printable-dashboard .dashboard-report-table-title {
            margin-bottom: 4px !important;
            padding-bottom: 3px !important;
          }
          #printable-dashboard .dashboard-report-table-title h3 {
            font-size: 12px !important;
          }
          #printable-dashboard .dashboard-report-table {
            font-size: 9.5px !important;
          }
          #printable-dashboard .dashboard-report-table th {
            padding: 4px 8px !important;
            font-size: 9px !important;
          }
          #printable-dashboard .dashboard-report-table td {
            padding: 3.5px 8px !important;
            font-size: 9px !important;
          }
          #printable-dashboard .dashboard-report-table tfoot td {
            padding: 4px 8px !important;
            font-size: 9.5px !important;
          }
          #printable-dashboard .dashboard-report-roman {
            min-width: 18px !important;
            padding: 1px 3px !important;
            font-size: 8.5px !important;
          }
          #printable-dashboard .dashboard-report-bar-wrap {
            width: 60px !important;
            height: 5px !important;
          }
          #printable-dashboard .dashboard-report-pill {
            font-size: 8.5px !important;
            padding: 0px 4px !important;
          }
          #printable-dashboard .dashboard-report-signoff {
            margin-top: 4px !important;
            padding-top: 3px !important;
            font-size: 8.5px !important;
          }

          h1, h2, h3, h4, .print-no-break-after {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />

      {/* Reusable Power BI Financial Infographic Report Generator */}
      {(() => {
        let totalBudget = 0;
        let totalExp = 0;
        components.forEach(c => {
          totalBudget += Number(c.approvedBudget) || 0;
          totalExp += Number(c.expenditureIncurred) || 0;
        });
        const unutilized = totalBudget - totalExp;
        const utilPercent = totalBudget ? ((totalExp / totalBudget) * 100).toFixed(2) : '0';
        const generatedDate = new Date().toLocaleString('en-IN', { 
          dateStyle: 'medium', 
          timeStyle: 'short' 
        });

        const reportContent = (
          <div className="dashboard-report-card" style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflow: 'hidden',
            color: '#0f172a'
          }}>
            {/* A. Report Header: NIMI & PM e-Vidya branding, dynamic timestamp, light-blue dashboard theme */}
            <div className="dashboard-report-header" style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f0fdf4 100%)',
              borderTop: '5px solid #0284c7',
              borderBottom: '2px solid #bae6fd',
              padding: '24px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px'
            }}>
              {/* Left Branding: NIMI Logo & Govt details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: '1 1 0' }}>
                <img 
                  src="/nimi-logo.png" 
                  alt="NIMI Logo" 
                  className="dashboard-report-logo-left"
                  style={{ height: '82px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }} 
                />
                <div>
                  <div className="dashboard-report-org-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    National Instructional Media Institute
                  </div>
                  <div className="dashboard-report-org-sub" style={{ fontSize: '11px', color: '#475569', marginTop: '3px', fontWeight: 500 }}>
                    Ministry of Skill Development & Entrepreneurship, Govt. of India
                  </div>
                </div>
              </div>

              {/* Center Title & Metadata */}
              <div style={{ textAlign: 'center', flex: '2 1 0' }}>
                <h1 className="dashboard-report-title" style={{ 
                  fontSize: '28px', 
                  fontWeight: 800, 
                  color: '#0f2942', 
                  margin: '0 0 6px 0', 
                  letterSpacing: '-0.3px',
                  lineHeight: 1.2
                }}>
                  PM e-Vidya Financial Dashboard
                </h1>
                <p className="dashboard-report-subtitle" style={{ 
                  fontSize: '15px', 
                  fontWeight: 600, 
                  color: '#334155', 
                  margin: '0 0 10px 0' 
                }}>
                  Approved Budget vs Expenditure — Component-wise Status Report
                </p>
                <div className="dashboard-report-date" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '5px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid #bae6fd'
                }}>
                  <span>📅</span> Generated on: {generatedDate}
                </div>
              </div>

              {/* Right Branding: PM e-Vidya Logo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px', flex: '1 1 0' }}>
                <img 
                  src="/pm-evidya-logo.png" 
                  alt="PM e-Vidya Logo" 
                  className="dashboard-report-logo-right"
                  style={{ height: '70px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }} 
                />
              </div>
            </div>

            {/* B. Three KPI Cards: Power BI Infographic Style */}
            <div className="dashboard-report-kpis" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '20px', 
              padding: '24px 32px 16px 32px' 
            }}>
              {/* KPI Card 1: Total Approved Budget (Blue Accent) */}
              <div className="dashboard-report-kpi-card" style={{ 
                padding: '20px 24px', 
                border: '1.5px solid #bfdbfe', 
                borderLeft: '5px solid #2563eb', 
                borderRadius: '14px', 
                background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="dashboard-report-kpi-label" style={{ fontSize: '12px', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Total Approved Budget
                  </span>
                  <div className="dashboard-report-kpi-icon" style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '10px', 
                    background: '#dbeafe', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    🏛️
                  </div>
                </div>
                <div className="dashboard-report-kpi-val" style={{ color: '#1e3a8a', fontSize: '30px', fontWeight: 800, marginTop: '12px', letterSpacing: '-0.5px' }}>
                  ₹ {totalBudget.toLocaleString('en-IN')}
                </div>
                <div className="dashboard-report-kpi-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2563eb', fontWeight: 600, marginTop: '8px' }}>
                  <span>✓</span> 100% Total Sanctioned Allocation (6 Heads)
                </div>
              </div>

              {/* KPI Card 2: Total Expenditure (Purple Accent) */}
              <div className="dashboard-report-kpi-card" style={{ 
                padding: '20px 24px', 
                border: '1.5px solid #e9d5ff', 
                borderLeft: '5px solid #7c3aed', 
                borderRadius: '14px', 
                background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="dashboard-report-kpi-label" style={{ fontSize: '12px', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Total Expenditure
                  </span>
                  <div className="dashboard-report-kpi-icon" style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '10px', 
                    background: '#f3e8ff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    💳
                  </div>
                </div>
                <div className="dashboard-report-kpi-val" style={{ color: '#581c87', fontSize: '30px', fontWeight: 800, marginTop: '12px', letterSpacing: '-0.5px' }}>
                  ₹ {totalExp.toLocaleString('en-IN')}
                </div>
                <div className="dashboard-report-kpi-sub" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#7e22ce', fontWeight: 600, marginTop: '8px' }}>
                  <span>💼</span> Unutilized Balance: ₹ {unutilized.toLocaleString('en-IN')}
                </div>
              </div>

              {/* KPI Card 3: Overall Utilization (Green Accent) */}
              <div className="dashboard-report-kpi-card" style={{ 
                padding: '20px 24px', 
                border: '1.5px solid #a7f3d0', 
                borderLeft: '5px solid #059669', 
                borderRadius: '14px', 
                background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="dashboard-report-kpi-label" style={{ fontSize: '12px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Overall Utilization
                  </span>
                  <div className="dashboard-report-kpi-icon" style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '10px', 
                    background: '#d1fae5', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '18px'
                  }}>
                    🎯
                  </div>
                </div>
                <div className="dashboard-report-kpi-val" style={{ color: '#064e3b', fontSize: '30px', fontWeight: 800, marginTop: '12px', letterSpacing: '-0.5px' }}>
                  {utilPercent}%
                </div>
                {/* Visual Progress Meter */}
                <div style={{ width: '100%', height: '6px', background: '#d1fae5', borderRadius: '99px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(Number(utilPercent), 100)}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                    borderRadius: '99px'
                  }} />
                </div>
                <div className="dashboard-report-kpi-sub" style={{ fontSize: '12px', color: '#047857', fontWeight: 600, marginTop: '6px' }}>
                  Target Absorption Performance
                </div>
              </div>
            </div>

            {/* C. Component-wise Breakdown Table */}
            <div className="dashboard-report-table-section" style={{ padding: '8px 32px 32px 32px' }}>
              <div className="dashboard-report-table-title" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px', 
                borderBottom: '2px solid #e2e8f0', 
                paddingBottom: '10px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📊</span>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f2942', margin: 0 }}>
                    Component-wise Financial Breakdown
                  </h3>
                </div>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  background: '#f1f5f9', 
                  color: '#475569', 
                  padding: '4px 12px', 
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  {components.length} Approved Heads
                </span>
              </div>
              
              <table className="dashboard-report-table" style={{ 
                width: '100%', 
                borderCollapse: 'separate', 
                borderSpacing: 0, 
                textAlign: 'left', 
                fontSize: '13px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', width: '38%' }}>
                      Component
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', width: '16%' }}>
                      Approved Budget (₹)
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', width: '16%' }}>
                      Expenditure (₹)
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', width: '16%' }}>
                      Unutilized Balance (₹)
                    </th>
                    <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', width: '14%' }}>
                      Utilization %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((comp, idx) => {
                    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][comp.componentNo - 1] || comp.componentNo;
                    return (
                      <tr key={comp.id} style={{ 
                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="dashboard-report-roman" style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              minWidth: '26px', 
                              padding: '2px 6px', 
                              borderRadius: '6px', 
                              background: '#e0f2fe', 
                              color: '#0369a1', 
                              fontWeight: 800, 
                              fontSize: '11px',
                              border: '1px solid #bae6fd'
                            }}>
                              {roman}
                            </span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>
                              {comp.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
                          {comp.approvedBudget.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#7c3aed', borderBottom: '1px solid #e2e8f0' }}>
                          {comp.expenditureIncurred.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#059669', borderBottom: '1px solid #e2e8f0' }}>
                          {comp.unutilizedBalance.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div className="dashboard-report-bar-wrap" style={{ background: '#e2e8f0', borderRadius: '99px', width: '110px', height: '8px', overflow: 'hidden' }}>
                              <div style={{ 
                                background: comp.utilizationPercent > 50 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #3b82f6, #7c3aed)', 
                                height: '100%', 
                                width: `${Math.min(comp.utilizationPercent, 100)}%`,
                                borderRadius: '99px'
                              }} />
                            </div>
                            <span className="dashboard-report-pill" style={{ 
                              fontSize: '12px', 
                              fontWeight: 700, 
                              color: '#334155',
                              background: '#f1f5f9',
                              padding: '1px 8px',
                              borderRadius: '10px',
                              border: '1px solid #e2e8f0'
                            }}>
                              {comp.utilizationPercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#0f2942', color: '#ffffff' }}>
                    <td style={{ padding: '16px 16px', fontWeight: 800, fontSize: '13px', letterSpacing: '0.8px' }}>
                      GRAND TOTAL
                    </td>
                    <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 800, fontSize: '14px' }}>
                      ₹ {totalBudget.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#c084fc' }}>
                      ₹ {totalExp.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '16px 16px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#6ee7b7' }}>
                      ₹ {unutilized.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                      <span style={{ 
                        background: '#10b981', 
                        color: '#ffffff', 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontWeight: 800, 
                        fontSize: '13px' 
                      }}>
                        {utilPercent}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Official Sign-off & Audit Stamp */}
              <div className="dashboard-report-signoff" style={{ 
                marginTop: '20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                fontSize: '11px', 
                color: '#64748b',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🛡️</span>
                  <span>Official PM e-Vidya Financial Record • National Instructional Media Institute (NIMI) • MSDE, Government of India</span>
                </div>
                <div style={{ fontWeight: 600, color: '#0369a1' }}>
                  Verified System-Generated Report
                </div>
              </div>
            </div>
          </div>
        );

        return (
          <>
            {/* Modal Preview of Report on Screen */}
            {isPreviewOpen && (
              <div className="no-print" style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                overflowY: 'auto'
              }} onClick={() => setIsPreviewOpen(false)}>
                <div 
                  style={{ 
                    maxWidth: '1150px', 
                    width: '100%', 
                    maxHeight: '92vh', 
                    overflowY: 'auto',
                    background: '#ffffff', 
                    borderRadius: '18px', 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    padding: '8px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Action Bar */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    borderRadius: '12px 12px 0 0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>📊</span>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                        PM e-Vidya Financial Dashboard — Infographic Report Preview
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={triggerPrint} 
                        style={{ 
                          padding: '8px 16px', 
                          background: '#f59e0b', 
                          color: '#ffffff', 
                          border: 'none', 
                          borderRadius: '8px', 
                          fontWeight: 700, 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🖨️ Print / Save as PDF
                      </button>
                      <button 
                        onClick={() => setIsPreviewOpen(false)} 
                        style={{ 
                          padding: '8px 16px', 
                          background: '#64748b', 
                          color: '#ffffff', 
                          border: 'none', 
                          borderRadius: '8px', 
                          fontWeight: 700, 
                          cursor: 'pointer' 
                        }}
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>
                  
                  {/* Embed the exact Report */}
                  <div style={{ padding: '16px' }}>
                    {reportContent}
                  </div>
                </div>
              </div>
            )}

            {/* Printable View Container (Targeted by @media print) */}
            <div id="printable-dashboard" style={{ display: isPrinting ? 'block' : 'none', background: 'white' }}>
              {reportContent}
            </div>
          </>
        );
      })()}

      <div id="printable-annexures" style={{ display: isPrintingAnnexure ? 'block' : 'none', background: 'white' }}>
        {components.filter(c => selectedComponents.includes(c.id)).map((comp) => {
          const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][comp.componentNo - 1];
          const items = comp[`annexure${roman}`] || [];
          
          let cols: string[] = [];
          if (items.length > 0) {
            if (roman === 'I') {
              cols = [
                'Name',
                'Designation',
                'Working Days',
                'HA Issued Date',
                'Honorarium Amount (₹)',
                'Honorarium Voucher No.',
                'Honorarium Narration',
                'TA Date',
                'TA Amount (₹)',
                'TA Voucher No.',
                'TA Narration',
                'Total Amount (₹)'
              ];
            } else if (roman === 'II') {
              cols = [
                'datePeriod',
                'trainingName',
                'trainingType',
                'participant',
                'venue',
                'trainingDays',
                'TA Amount',
                'TA Voucher No.',
                'Ta Narration',
                'trainingDates'
              ];
            } else {
              cols = Object.keys(items[0]).filter(k => !['id', 'budgetComponentId', 'createdAt', 'updatedAt', 'verificationStatus', 'supportingDoc', 'approvalRef'].includes(k));
            }
          }

          const getMappedValue = (item: any, col: string) => {
            if (roman === 'I') {
              const map: any = {
                'Name': item.expertName || '-',
                'Designation': item.designation || '-',
                'Working Days': item.workingDays != null ? item.workingDays : '-',
                'HA Issued Date': item.datePeriod || '-',
                'Honorarium Amount (₹)': item.honorarium && Number(item.honorarium) > 0 ? `₹ ${Number(item.honorarium).toLocaleString('en-IN')}` : '-',
                'Honorarium Voucher No.': item.utrNumber || '-',
                'Honorarium Narration': item.remarks || '-',
                'TA Date': item.tranType || '-',
                'TA Amount (₹)': item.travelAllowance && Number(item.travelAllowance) > 0 ? `₹ ${Number(item.travelAllowance).toLocaleString('en-IN')}` : '-',
                'TA Voucher No.': item.voucherNo || '-',
                'TA Narration': item.narration || '-',
                'Total Amount (₹)': `₹ ${((Number(item.honorarium) || 0) + (Number(item.travelAllowance) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              };
              return map[col] !== undefined ? map[col] : item[col];
            }
            if (roman === 'II') {
              const map: any = {
                'datePeriod': item.datePeriod || '-',
                'trainingName': item.trainingName || '-',
                'trainingType': item.trainingType || '-',
                'participant': item.participant || '-',
                'venue': item.venue || '-',
                'trainingDays': item.trainingDays != null ? item.trainingDays : '-',
                'TA Amount': item.travelAllowance && Number(item.travelAllowance) > 0 ? `₹ ${Number(item.travelAllowance).toLocaleString('en-IN')}` : '-',
                'TA Voucher No.': item.utrNumber || '-',
                'Ta Narration': item.remarks || '-',
                'trainingDates': item.trainingDates || '-'
              };
              return map[col] !== undefined ? map[col] : item[col];
            }
            return item[col];
          };

          return (
            <div key={comp.id} style={{ marginBottom: '60px', pageBreakAfter: 'always' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
                <h1 style={{ fontSize: '24px', color: '#0f172a', margin: '0 0 10px 0' }}>{comp.name}</h1>
                <p style={{ fontSize: '18px', color: '#3b82f6', margin: 0, fontWeight: 'bold' }}>Annexure - {roman}</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '10px 0 0 0' }}>Printed on: {new Date().toLocaleString('en-IN')}</p>
              </div>

              {items.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                  No transaction records found for this component.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Sl. No.</th>
                      {cols.map(col => (
                        <th key={col} style={{ padding: '8px', border: '1px solid #cbd5e1', textTransform: 'capitalize' }}>
                          {col.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, idx: number) => (
                      <tr key={item.id}>
                        <td style={{ padding: '8px', border: '1px solid #e2e8f0' }}>{idx + 1}</td>
                        {cols.map(col => (
                          <td key={col} style={{ padding: '8px', border: '1px solid #e2e8f0' }}>
                            {String(getMappedValue(item, col) || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Preview of Epic Workflow Report */}
      {isEpicModalOpen && epicHistoryData?.workEntry && (
        <div className="no-print" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          overflowY: 'auto'
        }} onClick={() => setIsEpicModalOpen(false)}>
          <div 
            style={{ 
              maxWidth: '1200px', 
              width: '100%', 
              maxHeight: '92vh', 
              overflowY: 'auto',
              background: '#ffffff', 
              borderRadius: '18px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '8px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Action Bar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderRadius: '12px 12px 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📑</span>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '15px' }}>
                  PM e-Vidya — SME Epic Workflow Report ({getEpicId(epicHistoryData.workEntry.epicSequence)})
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => triggerPrintEpic(epicHistoryData.workEntry.id)} 
                  style={{ 
                    padding: '8px 16px', 
                    background: '#f59e0b', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🖨️ Print / Save as PDF
                </button>
                <button 
                  onClick={() => setIsEpicModalOpen(false)} 
                  style={{ 
                    padding: '8px 16px', 
                    background: '#64748b', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: 700, 
                    cursor: 'pointer' 
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            <div style={{ padding: '16px' }}>
              <EpicWorkflowReport 
                entry={epicHistoryData.workEntry} 
                auditLogs={epicHistoryData.auditLogs} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Printable Epic Report Container (Targeted by @media print) */}
      <div id="printable-epic-report" style={{ display: isPrintingEpic ? 'block' : 'none', background: 'white' }}>
        {epicHistoryData?.workEntry && (
          <EpicWorkflowReport 
            entry={epicHistoryData.workEntry} 
            auditLogs={epicHistoryData.auditLogs} 
            isPrintOnly={true}
          />
        )}
      </div>

      {/* Video Production Tracker Report Modal */}
      {isVideoTrackerModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}
        onClick={() => setIsVideoTrackerModalOpen(false)}
        >
          <div style={{
            width: '100%',
            maxWidth: '1280px',
            maxHeight: '94vh',
            overflowY: 'auto',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '4px'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <VideoProductionTrackerReport
              initialRecords={topicProductionRecords.length > 0 ? topicProductionRecords : allEpicEntries}
              onClose={() => setIsVideoTrackerModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Printable Video Production Tracker Report Container */}
      <div id="printable-video-tracker-report" style={{ display: isPrintingVideoTracker ? 'block' : 'none', background: 'white' }}>
        <VideoProductionTrackerReport
          initialRecords={topicProductionRecords.length > 0 ? topicProductionRecords : allEpicEntries}
          isPrintOnly={true}
        />
      </div>
    </div>
  );
}
