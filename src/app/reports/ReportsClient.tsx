'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { generateDocxReport } from './docxHelper';
import styles from '@/app/dashboard/dashboard.module.css';

export default function ReportsClient({ components, comprehensiveData }: { components: any[], comprehensiveData?: any }) {
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const { smes = [], production = [], auditLogs = [] } = comprehensiveData || {};

  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintingAnnexure, setIsPrintingAnnexure] = useState(false);
  const getEpicId = (epicSequence: number) => `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;

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
            "Date": item.datePeriod || '-',
            "Expert": item.expertName || '-',
            "Designation": item.designation || '-',
            "Days": item.workingDays || 0,
            "Honorarium": item.honorarium || 0,
            "TA": item.travelAllowance || 0,
            "Total": item.totalExpenditure || 0,
            "UTR": item.utrNumber || '-',
            "Remarks": item.remarks || '-'
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
    const data = production.map((prod: any) => ({
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
    XLSX.writeFile(wb, `PM_eVidya_Production_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      
      {/* Overall Report Card */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>
          <span style={{ fontSize: '20px' }}>📊 Export Overall Financial Report</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          View a print-ready dashboard report or generate the complete consolidated workbook containing the Executive Summary.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className={styles.btnAction} style={{ flex: 1, justifyContent: 'center', backgroundColor: '#f59e0b', color: 'white' }} onClick={triggerPrint}>
            🖨️ Print Dashboard View
          </button>
          <button className={styles.btnAction} style={{ flex: 1, justifyContent: 'center', backgroundColor: 'var(--primary)', color: 'white' }} onClick={generateOverallReport}>
            Download Excel
          </button>
        </div>
      </div>

      {/* Component Report Card */}
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
                cols = ['Date', 'Expert', 'Designation', 'Days', 'Honorarium', 'TA', 'Total', 'UTR', 'Remarks'];
              } else {
                cols = Object.keys(items[0]).filter(k => !['id', 'budgetComponentId', 'createdAt', 'updatedAt', 'verificationStatus', 'supportingDoc', 'approvalRef'].includes(k));
              }

              const getMappedValue = (item: any, col: string) => {
                if (roman === 'I') {
                  const map: any = { 'Date': 'datePeriod', 'Expert': 'expertName', 'Designation': 'designation', 'Days': 'workingDays', 'Honorarium': 'honorarium', 'TA': 'travelAllowance', 'Total': 'totalExpenditure', 'UTR': 'utrNumber', 'Remarks': 'remarks' };
                  return item[map[col]];
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

      {/* SME & Compliance Report Card */}
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

      {/* Production & Telecast Tracker */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>
          <span style={{ fontSize: '20px' }}>🎥 Production & Telecast Tracker</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Exports a full tracker of all video content shoots, pending video URLs, processing statuses, and final telecast delivery metrics.
        </p>
        <button className={styles.btnAction} style={{ width: '100%', justifyContent: 'center', backgroundColor: '#8b5cf6', color: 'white' }} onClick={generateProductionReport}>
          Export Production Tracker (Excel)
        </button>
      </div>

      {/* System Audit Logs */}
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

      {/* Print View Overlay (Only visible when printing) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-dashboard, #printable-dashboard * { visibility: visible; }
          #printable-annexures, #printable-annexures * { visibility: visible; }
          #printable-dashboard, #printable-annexures { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          @page { size: landscape; margin: 10mm; }
        }
      `}} />

      <div id="printable-dashboard" style={{ display: isPrinting ? 'block' : 'none', background: 'white' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', color: '#0f172a', margin: '0 0 10px 0' }}>PM e-Vidya Financial Dashboard</h1>
          <p style={{ fontSize: '16px', color: '#64748b', margin: 0 }}>Approved Budget vs Expenditure — Component-wise Status Report</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '5px 0 0 0' }}>Generated on: {new Date().toLocaleString('en-IN')}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
          {(() => {
            let totalBudget = 0;
            let totalExp = 0;
            components.forEach(c => {
              totalBudget += c.approvedBudget;
              totalExp += c.expenditureIncurred;
            });
            const unutilized = totalBudget - totalExp;
            const utilPercent = totalBudget ? ((totalExp/totalBudget)*100).toFixed(2) : '0';

            return (
              <>
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                  <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>Total Approved Budget</div>
                  <div style={{ color: '#0f172a', fontSize: '28px', fontWeight: 'bold', marginTop: '10px' }}>₹ {totalBudget.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                  <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>Total Expenditure</div>
                  <div style={{ color: '#ef4444', fontSize: '28px', fontWeight: 'bold', marginTop: '10px' }}>₹ {totalExp.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                  <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>Overall Utilization</div>
                  <div style={{ color: '#10b981', fontSize: '28px', fontWeight: 'bold', marginTop: '10px' }}>{utilPercent}%</div>
                </div>
              </>
            );
          })()}
        </div>

        <h3 style={{ fontSize: '20px', color: '#0f172a', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Component-wise Breakdown</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '12px', border: '1px solid #cbd5e1' }}>Component</th>
              <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Approved Budget (₹)</th>
              <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Expenditure (₹)</th>
              <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right' }}>Unutilized Balance (₹)</th>
              <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>Utilization %</th>
            </tr>
          </thead>
          <tbody>
            {components.map(comp => (
              <tr key={comp.id}>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#334155' }}>
                  {comp.name}
                </td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#0f172a' }}>
                  {comp.approvedBudget.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#ef4444' }}>
                  {comp.expenditureIncurred.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#10b981' }}>
                  {comp.unutilizedBalance.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ background: '#e2e8f0', borderRadius: '4px', width: '100px', height: '8px', margin: '0 auto', overflow: 'hidden' }}>
                    <div style={{ background: '#3b82f6', height: '100%', width: `${Math.min(comp.utilizationPercent, 100)}%` }} />
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', color: '#64748b' }}>{comp.utilizationPercent}%</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id="printable-annexures" style={{ display: isPrintingAnnexure ? 'block' : 'none', background: 'white' }}>
        {components.filter(c => selectedComponents.includes(c.id)).map((comp) => {
          const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][comp.componentNo - 1];
          const items = comp[`annexure${roman}`] || [];
          
          let cols: string[] = [];
          if (items.length > 0) {
            if (roman === 'I') {
              cols = ['Date', 'Expert', 'Designation', 'Days', 'Honorarium', 'TA', 'Total', 'UTR', 'Remarks'];
            } else {
              cols = Object.keys(items[0]).filter(k => !['id', 'budgetComponentId', 'createdAt', 'updatedAt', 'verificationStatus', 'supportingDoc', 'approvalRef'].includes(k));
            }
          }

          const getMappedValue = (item: any, col: string) => {
            if (roman === 'I') {
              const map: any = { 'Date': 'datePeriod', 'Expert': 'expertName', 'Designation': 'designation', 'Days': 'workingDays', 'Honorarium': 'honorarium', 'TA': 'travelAllowance', 'Total': 'totalExpenditure', 'UTR': 'utrNumber', 'Remarks': 'remarks' };
              return item[map[col]];
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
    </div>
  );
}
