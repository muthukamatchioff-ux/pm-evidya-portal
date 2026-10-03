"use client";

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { generateReportData } from './actions';
import styles from './reports.module.css';

const REPORT_TYPES = [
  { id: 'projects', title: 'Project-wise Report', icon: '📁', desc: 'Comprehensive list of all projects with their current status, SME assignments, and timelines.' },
  { id: 'modules', title: 'Module-wise Report', icon: '📑', desc: 'Detailed breakdown of projects by modules and topics.' },
  { id: 'smes', title: 'SME-wise Report', icon: '👨‍🏫', desc: 'Performance and assignment report for all Subject Matter Experts.' },
  { id: 'languages', title: 'Language-wise Report', icon: '🌐', desc: 'Project distribution and content availability by language.' },
  { id: 'status', title: 'Status-wise Report', icon: '📊', desc: 'Aggregated view of projects based on their current lifecycle status.' },
  { id: 'documents', title: 'Document Report', icon: '📄', desc: 'Audit log of all uploaded documents, approvals, and missing files.' },
  { id: 'legacy', title: 'Legacy Data Report', icon: '🗄️', desc: 'Summary of all historically imported data batches and their normalization status.' },
  
  // NEW FINANCIAL REPORTS
  { id: 'financial_overview', title: 'Financial Overview', icon: '💰', desc: 'High-level overview of total budget vs expenditure across all heads.' },
  { id: 'seven_head', title: 'Seven-Head Expenditure Report', icon: '📈', desc: 'Detailed breakdown of the 7 budget heads and their utilization.' },
  { id: 'video_content', title: 'Video Content Development Report', icon: '🎬', desc: 'Expenditure report specifically for Head 1: Video Content Development.' },
  { id: 'capacity_building', title: 'Capacity Building Report', icon: '👨‍🏫', desc: 'Expenditure report specifically for Head 2: Capacity Building.' },
  { id: 'hr_support', title: 'Human Resource Support Report', icon: '👥', desc: 'Expenditure report specifically for Head 3: Human Resource Support.' },
  { id: 'archive_network', title: 'Archive / Bandwidth / Networking', icon: '🌐', desc: 'Expenditure report specifically for Head 4.' },
  { id: 'telecast_setup', title: 'Telecast Setup Report', icon: '📡', desc: 'Expenditure report specifically for Head 5: Telecast Setup in Schools.' },
  { id: 'feedback_research', title: 'Feedback / Research / Advocacy', icon: '📝', desc: 'Expenditure report specifically for Head 6.' },
  { id: 'studio_setup', title: 'Studio Setup / Upgradation', icon: '🎙️', desc: 'Expenditure report specifically for Head 7.' },
  { id: 'sme_payment', title: 'SME Payment Report', icon: '💸', desc: 'Detailed transaction log of all SME Honorarium payments.' },
  { id: 'ta_report', title: 'TA Report', icon: '✈️', desc: 'Detailed transaction log of all Travel Allowance (TA) payments.' },
  { id: 'manpower_salary', title: 'Manpower / Salary Report', icon: '💼', desc: 'Detailed salary distribution report for all HR roles.' },
  { id: 'accounts_recon', title: 'Accounts Reconciliation Report', icon: '🧾', desc: 'Master ledger for cross-checking internal database with UTRs.' },
];

export default function ReportGenerator() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleExportExcel = async (reportId: string) => {
    try {
      const data = await generateReportData(reportId, dateFrom, dateTo);
      let sheetData = data;
      
      if (data.length === 0) {
        sheetData = [{ Message: 'No records found for this period.' }];
      }
      
      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `${reportId}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Error generating report data from database.');
    }
  };

  const handleExportPdf = (reportId: string) => {
    alert(`Generating PDF for ${reportId}... Please use Print to PDF for now.`);
  };

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Date From</label>
          <input 
            type="date" 
            className={styles.filterInput}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label>Date To</label>
          <input 
            type="date" 
            className={styles.filterInput}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.reportGrid}>
        {REPORT_TYPES.map(report => (
          <div key={report.id} className={styles.reportCard}>
            <div className={styles.reportHeader}>
              <div className={styles.reportIcon}>{report.icon}</div>
              <div className={styles.reportInfo}>
                <h3>{report.title}</h3>
                <p>{report.desc}</p>
              </div>
            </div>
            <div className={styles.reportActions}>
              <button 
                className={`${styles.btnExport} ${styles.excel}`}
                onClick={() => handleExportExcel(report.id)}
              >
                <span>📊</span> Excel
              </button>
              <button 
                className={`${styles.btnExport} ${styles.pdf}`}
                onClick={() => handleExportPdf(report.id)}
              >
                <span>📄</span> PDF
              </button>
              <button 
                className={styles.btnExport}
                onClick={() => handleExportExcel(report.id)} // CSV uses same flow via XLSX library in practice
              >
                <span>📝</span> CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
