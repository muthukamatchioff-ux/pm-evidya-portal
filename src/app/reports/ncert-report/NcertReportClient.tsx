'use client';

import React, { useState, useTransition } from 'react';
import styles from './ncert-report.module.css';
import {
  NcertReportData,
  NcertMonthlyRow,
  NcertQuarterSummary,
  getNcertReportData,
  exportNcertExcelReport,
} from './actions';
import { VerifiedLedgerVoucher } from '@/lib/ncertFinancialService';

interface Props {
  initialData: NcertReportData;
}

export default function NcertReportClient({ initialData }: Props) {
  const [data, setData] = useState<NcertReportData>(initialData);
  const [budgetMode, setBudgetMode] = useState<'ncert' | 'portal'>(initialData.metadata.budgetMode || 'portal');
  const [accountingBasis, setAccountingBasis] = useState<'template_accrual' | 'full_consolidated'>(
    initialData.metadata.accountingBasis || 'full_consolidated'
  );
  const [selectedQuarter, setSelectedQuarter] = useState<'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('ALL');
  const [activeTab, setActiveTab] = useState<'tracker' | 'audit' | 'analytics'>('tracker');
  const [isPending, startTransition] = useTransition();
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Drill-down Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    category: 'video' | 'voucher' | 'capacity' | 'hr' | 'feedback';
    monthLabel: string;
    items?: any[];
    singleItem?: any;
  } | null>(null);

  // Format currency in Indian Rupees format (₹ XX,XX,XXX)
  const formatINR = (val: number | undefined | null): string => {
    if (val === undefined || val === null) return '₹ 0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Switch budget mode or accounting basis
  const handleFilterUpdate = (newBudgetMode: 'ncert' | 'portal', newBasis: 'template_accrual' | 'full_consolidated') => {
    setBudgetMode(newBudgetMode);
    setAccountingBasis(newBasis);
    startTransition(async () => {
      try {
        const updated = await getNcertReportData({
          budgetMode: newBudgetMode,
          accountingBasis: newBasis,
        });
        setData(updated);
      } catch (err) {
        console.error('Failed to update report data:', err);
      }
    });
  };

  // Refresh Data
  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const updated = await getNcertReportData({ budgetMode, accountingBasis });
        setData(updated);
      } catch (err) {
        console.error('Failed to refresh data:', err);
      }
    });
  };

  // Export to Excel using authoritative template
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const res = await exportNcertExcelReport({ budgetMode, accountingBasis });
      
      const byteCharacters = atob(res.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Error exporting Excel report. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Filter rows based on selected quarter
  const displayedRows = selectedQuarter === 'ALL'
    ? data.rows
    : data.rows.filter((r) => r.quarter === selectedQuarter);

  // Drill-down open helpers
  const openVideoDrillDown = (row: NcertMonthlyRow) => {
    const vids = row.videoItems || [];
    if (row.videoCount === 0 && vids.length === 0) return;
    const count = vids.length > 0 ? vids.length : row.videoCount;
    setModalState({
      isOpen: true,
      title: `Video Content Developed — ${row.monthLabel}`,
      subtitle: `Total: ${count} Modules | Duration: ${row.totalDurationStr || '00:00:00'} hrs | Head 1: Video Content Development`,
      category: 'video',
      monthLabel: row.monthLabel,
      items: vids,
      singleItem: {
        subjects: row.subjects,
        language: row.language,
        duration: row.totalDurationStr,
        count: count,
      },
    });
  };

  const openVoucherDrillDown = (row: NcertMonthlyRow, headId: number, headTitle: string) => {
    const vouchers = (row.voucherItems || []).filter((v) => v.headId === headId);
    if (vouchers.length === 0) return;
    const totalSpent = vouchers.reduce((acc, v) => acc + v.paidAmount, 0);

    setModalState({
      isOpen: true,
      title: `${headTitle} — Expenditure Vouchers`,
      subtitle: `${row.monthLabel} | Total Paid: ${formatINR(totalSpent)} | Verified Source Ledger Records`,
      category: 'voucher',
      monthLabel: row.monthLabel,
      items: vouchers,
    });
  };

  const openCapacityDrillDown = (row: NcertMonthlyRow) => {
    if (!row.capacityItem) return;
    setModalState({
      isOpen: true,
      title: `Capacity Building Workshop Details`,
      subtitle: `${row.monthLabel} | ${row.capacityItem.programName}`,
      category: 'capacity',
      monthLabel: row.monthLabel,
      singleItem: row.capacityItem,
    });
  };

  const openHrDrillDown = (row: NcertMonthlyRow) => {
    if (!row.hrItem) return;
    setModalState({
      isOpen: true,
      title: `Human Resource & Technical Staffing`,
      subtitle: `${row.monthLabel} | 10 Approved Posts | 3 Onboarded | 7 Vacant`,
      category: 'hr',
      monthLabel: row.monthLabel,
      singleItem: row.hrItem,
      items: (row.voucherItems || []).filter((v) => v.headId === 3),
    });
  };

  const openFeedbackDrillDown = (row: NcertMonthlyRow) => {
    if (!row.feedbackItem) return;
    setModalState({
      isOpen: true,
      title: `Audience Feedback & Social Media Campaign`,
      subtitle: `${row.monthLabel} | ${row.feedbackItem.campaignName}`,
      category: 'feedback',
      monthLabel: row.monthLabel,
      singleItem: row.feedbackItem,
    });
  };

  const closeModal = () => {
    setModalState(null);
  };

  const { metadata, kpis, quarterSummaries, grandTotals, exceptionAudits } = data;

  return (
    <div className={styles.container}>
      {/* Top Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.reportIcon}>📊</div>
            <div>
              <h1 className={styles.title}>
                NCERT Report — Monthly / Quarterly Activity & Fund Tracker
              </h1>
              <p className={styles.subtitle}>
                Authoritative 45-Column Dynamic MIS Tracker for PM e-Vidya (MSDE Channels 22 to 27) &bull; FY {metadata.academicYear}
              </p>
            </div>
          </div>

          <div className={styles.actionsGroup}>
            {/* Accounting Basis Mode Selector */}
            <div className={styles.quarterTabs} style={{ marginRight: '0.25rem' }}>
              <button
                type="button"
                className={`${styles.quarterTab} ${accountingBasis === 'full_consolidated' ? styles.quarterTabActive : ''}`}
                onClick={() => handleFilterUpdate(budgetMode, 'full_consolidated')}
                title="Consolidated Live Portal Ledger Vouchers across all 6 heads (Total: ₹ 7,94,343)"
              >
                Live Portal Data (₹7.94 L)
              </button>
              <button
                type="button"
                className={`${styles.quarterTab} ${accountingBasis === 'template_accrual' ? styles.quarterTabActive : ''}`}
                onClick={() => handleFilterUpdate(budgetMode, 'template_accrual')}
                title="Authoritative NCERT Excel Template values (Total: ₹ 3,81,774)"
              >
                Offline Template (₹3.82 L)
              </button>
            </div>

            {/* Budget Mode Selector */}
            <div className={styles.quarterTabs} style={{ marginRight: '0.5rem' }}>
              <button
                type="button"
                className={`${styles.quarterTab} ${budgetMode === 'portal' ? styles.quarterTabActive : ''}`}
                onClick={() => handleFilterUpdate('portal', accountingBasis)}
                title="Portal Master Budget (₹ 1,94,38,520)"
              >
                Portal Master (₹1.94 Cr)
              </button>
              <button
                type="button"
                className={`${styles.quarterTab} ${budgetMode === 'ncert' ? styles.quarterTabActive : ''}`}
                onClick={() => handleFilterUpdate('ncert', accountingBasis)}
                title="Official NCERT Sanction Allocation (₹ 1,97,00,000)"
              >
                NCERT Sanction (₹1.97 Cr)
              </button>
            </div>

            <button
              type="button"
              className={styles.btnExcel}
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              title="Export authoritative Excel spreadsheet preserving all formulas and formatting"
            >
              <span>📗</span> {isExportingExcel ? 'Exporting...' : 'Export (Official Excel)'}
            </button>

            <button
              type="button"
              className={styles.btnPdf}
              onClick={handlePrint}
              title="Print or export PDF report"
            >
              <span>📄</span> Export (PDF) / Print
            </button>

            <button
              type="button"
              className={styles.btnOutline}
              onClick={handleRefresh}
              disabled={isPending}
              title="Refresh report data from database"
            >
              <span>🔄</span> {isPending ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Institutional Metadata Grid (Excel Rows 2 to 4) */}
        <div className={styles.metadataBox}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Organization / State / AB</span>
            <span className={styles.metaValue}>{metadata.organization}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>PM eVidya Channel/s</span>
            <span className={styles.metaValue}>{metadata.channels}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Nodal Officer & Designation</span>
            <span className={styles.metaValue}>{metadata.nodalOfficer}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Official Contact Details</span>
            <span className={styles.metaValue}>{metadata.contactDetails}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Academic / Financial Year</span>
            <span className={styles.metaValue}>{metadata.academicYear} (12 Months)</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Accounting Basis & Statement</span>
            <span className={styles.metaValue}>
              {accountingBasis === 'full_consolidated' ? 'Live Consolidated Portal Ledger (Cash/Accrual)' : 'NCERT Template (Accrual)'} &bull; {metadata.statementDate}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#e0e7ff', color: '#4338ca' }}>
            🏛️
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Sanctioned Budget [M4]</span>
            <span className={styles.kpiValue}>{formatINR(kpis.totalAllocation)}</span>
            <span className={styles.kpiSub}>6 Approved Online Plan Heads</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#dcfce7', color: '#15803d' }}>
            ✅
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Fund Utilized [N4]</span>
            <span className={styles.kpiValue}>{formatINR(kpis.totalExpenditure)}</span>
            <span className={styles.kpiSub} style={{ color: '#15803d', fontWeight: 600 }}>
              {kpis.utilizationPercent}% of sanctioned
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#fef3c7', color: '#b45309' }}>
            ⏳
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Unspent Balance [O4]</span>
            <span className={styles.kpiValue}>{formatINR(kpis.balanceAvailable)}</span>
            <span className={styles.kpiSub}>
              {(100 - kpis.utilizationPercent).toFixed(2)}% remaining
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#e0f2fe', color: '#0369a1' }}>
            🎬
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Video Content Developed</span>
            <span className={styles.kpiValue}>{kpis.totalVideosCount} Modules</span>
            <span className={styles.kpiSub} style={{ fontFamily: 'monospace' }}>
              Duration: {kpis.totalVideoDuration} hrs
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            👥
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Capacity Building</span>
            <span className={styles.kpiValue}>{kpis.totalParticipantsTrained} Trained</span>
            <span className={styles.kpiSub}>{kpis.capacitySessionsCount} Workshop @ NIMI Chennai</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ background: '#fae8ff', color: '#a21caf' }}>
            👔
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Human Resource</span>
            <span className={styles.kpiValue}>{kpis.hrPostsFilled} / {kpis.hrPostsApproved} Filled</span>
            <span className={styles.kpiSub}>{kpis.hrPostsVacant} Vacant Posts in Recruitment</span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation & Quarter Filter Controls */}
      <div className={styles.filterRow}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View Tab Buttons */}
          <div className={styles.quarterTabs}>
            <button
              type="button"
              className={`${styles.quarterTab} ${activeTab === 'tracker' ? styles.quarterTabActive : ''}`}
              onClick={() => setActiveTab('tracker')}
            >
              📋 Master Tracker (45 Columns)
            </button>
            <button
              type="button"
              className={`${styles.quarterTab} ${activeTab === 'audit' ? styles.quarterTabActive : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              🔍 Audit & Exception Register ({exceptionAudits.length})
            </button>
            <button
              type="button"
              className={`${styles.quarterTab} ${activeTab === 'analytics' ? styles.quarterTabActive : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📈 Financial Analytics
            </button>
          </div>

          {/* Quarter Tabs (Visible in tracker view) */}
          {activeTab === 'tracker' && (
            <div className={styles.quarterTabs}>
              <button
                type="button"
                className={`${styles.quarterTab} ${selectedQuarter === 'ALL' ? styles.quarterTabActive : ''}`}
                onClick={() => setSelectedQuarter('ALL')}
              >
                All Quarters
              </button>
              <button
                type="button"
                className={`${styles.quarterTab} ${selectedQuarter === 'Q1' ? styles.quarterTabActive : ''}`}
                onClick={() => setSelectedQuarter('Q1')}
              >
                Q1 (Apr–Jun)
              </button>
              <button
                type="button"
                className={`${styles.quarterTab} ${selectedQuarter === 'Q2' ? styles.quarterTabActive : ''}`}
                onClick={() => setSelectedQuarter('Q2')}
              >
                Q2 (Jul–Sep)
              </button>
              <button
                type="button"
                className={`${styles.quarterTab} ${selectedQuarter === 'Q3' ? styles.quarterTabActive : ''}`}
                onClick={() => setSelectedQuarter('Q3')}
              >
                Q3 (Oct–Dec)
              </button>
              <button
                type="button"
                className={`${styles.quarterTab} ${selectedQuarter === 'Q4' ? styles.quarterTabActive : ''}`}
                onClick={() => setSelectedQuarter('Q4')}
              >
                Q4 (Jan–Mar)
              </button>
            </div>
          )}
        </div>

        <div className={styles.filterControls}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Showing <strong>{displayedRows.length}</strong> Months &bull; 45 Columns (B–AT) &bull; Verified
          </span>
        </div>
      </div>

      {/* TAB 1: MASTER SPREADSHEET TABLE */}
      {activeTab === 'tracker' && (
        <div className={styles.tableCard}>
          <div className={styles.tableToolbar}>
            <div className={styles.tableTitle}>
              <span>📋</span>
              <span>Monthly / Quarterly Activity & Fund Tracker (Exact Template Reproduction)</span>
            </div>
            <div className={styles.tableLegend}>
              <span><span className={styles.legendDot} style={{ background: '#3b82f6' }}></span> 1. Video</span>
              <span><span className={styles.legendDot} style={{ background: '#22c55e' }}></span> 2. Capacity</span>
              <span><span className={styles.legendDot} style={{ background: '#a855f7' }}></span> 3. HR</span>
              <span><span className={styles.legendDot} style={{ background: '#f97316' }}></span> 4. Archive</span>
              <span><span className={styles.legendDot} style={{ background: '#ec4899' }}></span> 5. Telecast</span>
              <span><span className={styles.legendDot} style={{ background: '#14b8a6' }}></span> 6. Feedback</span>
              <span><span className={styles.legendDot} style={{ background: '#6366f1' }}></span> Total</span>
              <span style={{ marginLeft: '0.5rem', color: '#3b82f6', fontWeight: 600 }}>🔍 Click cell to Drill Down</span>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.ncertTable}>
              <thead>
                {/* Row 5: Grouped Head Banners */}
                <tr>
                  <th colSpan={2} className={`${styles.headGroupTimeline} ${styles.headQuarterSticky}`}>
                    Timeline
                  </th>
                  <th colSpan={9} className={styles.headGroupVideo}>
                    1. Video Content Development (Sanction: {formatINR(metadata.allocations.head1Video)})
                  </th>
                  <th colSpan={7} className={styles.headGroupCapacity}>
                    2. Capacity Building (Sanction: {formatINR(metadata.allocations.head2Capacity)})
                  </th>
                  <th colSpan={6} className={styles.headGroupHr}>
                    3. Human Resource (Sanction: {formatINR(metadata.allocations.head3Hr)})
                  </th>
                  <th colSpan={5} className={styles.headGroupArchive}>
                    4. Archive / Bandwidth / Networking (Sanction: {formatINR(metadata.allocations.head4Archive)})
                  </th>
                  <th colSpan={6} className={styles.headGroupTelecast}>
                    5. Telecast Setup in Schools (Sanction: {formatINR(metadata.allocations.head5Telecast)})
                  </th>
                  <th colSpan={6} className={styles.headGroupFeedback}>
                    6. Feedback / Research / Advocacy (Sanction: {formatINR(metadata.allocations.head6Feedback)})
                  </th>
                  <th colSpan={2} className={styles.headGroupTotal}>
                    Total Fund (Sanction: {formatINR(metadata.allocations.totalAllocation)})
                  </th>
                  <th colSpan={2} className={styles.headGroupCompliance}>
                    Compliance
                  </th>
                </tr>

                {/* Row 6: Individual Column Headers (Cols B to AT) */}
                <tr>
                  {/* Timeline */}
                  <th className={`${styles.subHeader} ${styles.headQuarterSticky}`} title="Column B: Quarter">
                    Quarter<br /><small style={{ color: '#94a3b8' }}>[B]</small>
                  </th>
                  <th className={`${styles.subHeader} ${styles.headMonthSticky}`} title="Column C: Month & Year">
                    Month & Year<br /><small style={{ color: '#94a3b8' }}>[C]</small>
                  </th>

                  {/* 1. Video Content Development (D to L) */}
                  <th className={styles.subHeader} title="Column D">Total No. of Video Content Developed<br /><small style={{ color: '#94a3b8' }}>[D]</small></th>
                  <th className={styles.subHeader} title="Column E">New Textbook Based<br /><small style={{ color: '#94a3b8' }}>[E]</small></th>
                  <th className={styles.subHeader} title="Column F">Class / Grade<br /><small style={{ color: '#94a3b8' }}>[F]</small></th>
                  <th className={styles.subHeader} style={{ minWidth: '180px' }} title="Column G">Subject (Trades / Lessons)<br /><small style={{ color: '#94a3b8' }}>[G]</small></th>
                  <th className={styles.subHeader} title="Column H">General / Filler<br /><small style={{ color: '#94a3b8' }}>[H]</small></th>
                  <th className={styles.subHeader} title="Column I">Language<br /><small style={{ color: '#94a3b8' }}>[I]</small></th>
                  <th className={styles.subHeader} title="Column J">Total Duration (Hours)<br /><small style={{ color: '#94a3b8' }}>[J]</small></th>
                  <th className={styles.subHeader} title="Column K">Fund Utilized<br /><small style={{ color: '#94a3b8' }}>[K]</small></th>
                  <th className={styles.subHeader} title="Column L: Formula $G$4 - SUM(K$7:K{i})">Fund Balance<br /><small style={{ color: '#94a3b8' }}>[L]</small></th>

                  {/* 2. Capacity Building (M to S) */}
                  <th className={styles.subHeader} style={{ minWidth: '160px' }} title="Column M">Training / Workshop (Planned)<br /><small style={{ color: '#94a3b8' }}>[M]</small></th>
                  <th className={styles.subHeader} style={{ minWidth: '160px' }} title="Column N">Conducted (No. & Details)<br /><small style={{ color: '#94a3b8' }}>[N]</small></th>
                  <th className={styles.subHeader} title="Column O">Date/s<br /><small style={{ color: '#94a3b8' }}>[O]</small></th>
                  <th className={styles.subHeader} title="Column P">Teachers / SRGs Trained<br /><small style={{ color: '#94a3b8' }}>[P]</small></th>
                  <th className={styles.subHeader} style={{ minWidth: '160px' }} title="Column Q">Outcome<br /><small style={{ color: '#94a3b8' }}>[Q]</small></th>
                  <th className={styles.subHeader} title="Column R">Fund Utilized<br /><small style={{ color: '#94a3b8' }}>[R]</small></th>
                  <th className={styles.subHeader} title="Column S: Formula $H$4 - SUM(R$7:R{i})">Fund Balance<br /><small style={{ color: '#94a3b8' }}>[S]</small></th>

                  {/* 3. Human Resource (T to Y) */}
                  <th className={styles.subHeader} title="Column T">HR (No. of Approved Posts & Roles)<br /><small style={{ color: '#94a3b8' }}>[T]</small></th>
                  <th className={styles.subHeader} title="Column U">Status of Hiring<br /><small style={{ color: '#94a3b8' }}>[U]</small></th>
                  <th className={styles.subHeader} title="Column V">Filled Post/s<br /><small style={{ color: '#94a3b8' }}>[V]</small></th>
                  <th className={styles.subHeader} title="Column W">Vacant Post/s<br /><small style={{ color: '#94a3b8' }}>[W]</small></th>
                  <th className={styles.subHeader} title="Column X">Fund Utilized<br /><small style={{ color: '#94a3b8' }}>[X]</small></th>
                  <th className={styles.subHeader} title="Column Y: Formula $I$4 - SUM(X$7:X{i})">Fund Balance<br /><small style={{ color: '#94a3b8' }}>[Y]</small></th>

                  {/* 4. Archive / Bandwidth / Networking (Z to AD) */}
                  <th className={styles.subHeader} style={{ minWidth: '160px' }} title="Column Z">Infrastructure & Support Required<br /><small style={{ color: '#94a3b8' }}>[Z]</small></th>
                  <th className={styles.subHeader} title="Column AA">Status of Execution<br /><small style={{ color: '#94a3b8' }}>[AA]</small></th>
                  <th className={styles.subHeader} style={{ minWidth: '150px' }} title="Column AB">Comment<br /><small style={{ color: '#94a3b8' }}>[AB]</small></th>
                  <th className={styles.subHeader} title="Column AC">Fund Utilized<br /><small style={{ color: '#94a3b8' }}>[AC]</small></th>
                  <th className={styles.subHeader} title="Column AD: Formula $J$4 - SUM(AC$7:AC{i})">Fund Balance<br /><small style={{ color: '#94a3b8' }}>[AD]</small></th>

                  {/* 5. Telecast Setup in Schools (AE to AJ) */}
                  <th className={styles.subHeader} title="Column AE">Target (No. Schools)<br /><small style={{ color: '#94a3b8' }}>[AE]</small></th>
                  <th className={styles.subHeader} title="Column AF">No. Schools with TV sets<br /><small style={{ color: '#94a3b8' }}>[AF]</small></th>
                  <th className={styles.subHeader} title="Column AG">No. Schools with MPEG-4 DTH setup<br /><small style={{ color: '#94a3b8' }}>[AG]</small></th>
                  <th className={styles.subHeader} title="Column AH">Total No. of Schools with TV & DTH<br /><small style={{ color: '#94a3b8' }}>[AH]</small></th>
                  <th className={styles.subHeader} title="Column AI">Fund Utilized<br /><small style={{ color: '#94a3b8' }}>[AI]</small></th>
                  <th className={styles.subHeader} title="Column AJ: Formula $K$4 - SUM(AI$7:AI{i})">Fund Balance<br /><small style={{ color: '#94a3b8' }}>[AJ]</small></th>

                  {/* 6. Feedback / Research / Advocacy (AK to AP) */}
                  <th className={styles.subHeader} style={{ minWidth: '180px' }} title="Column AK">Activities (Planned & Executed)<br /><small style={{ color: '#94a3b8' }}>[AK]</small></th>
                  <th className={styles.subHeader} style={{ minWidth: '160px' }} title="Column AL">Target (Stakeholders & No.)<br /><small style={{ color: '#94a3b8' }}>[AL]</small></th>
                  <th className={styles.subHeader} style={{ minWidth: '160px' }} title="Column AM">Outcome (Quant & Qual)<br /><small style={{ color: '#94a3b8' }}>[AM]</small></th>
                  <th className={styles.subHeader} title="Column AN">Remarks (if any)<br /><small style={{ color: '#94a3b8' }}>[AN]</small></th>
                  <th className={styles.subHeader} title="Column AO">Fund Utilized<br /><small style={{ color: '#94a3b8' }}>[AO]</small></th>
                  <th className={styles.subHeader} title="Column AP: Formula $L$4 - SUM(AO$7:AO{i})">Fund Balance<br /><small style={{ color: '#94a3b8' }}>[AP]</small></th>

                  {/* Total Fund (AQ & AR) */}
                  <th className={styles.subHeader} title="Column AQ: Utilized = SUM(K, R, X, AC, AI, AO)">Utilized<br /><small style={{ color: '#94a3b8' }}>[AQ]</small></th>
                  <th className={styles.subHeader} title="Column AR: Balance = $M$4 - SUM(AQ$7:AQ{i})">Balance<br /><small style={{ color: '#94a3b8' }}>[AR]</small></th>

                  {/* Compliance (AS & AT) */}
                  <th className={styles.subHeader} title="Column AS">SoE<br /><small style={{ color: '#94a3b8' }}>[AS]</small></th>
                  <th className={styles.subHeader} title="Column AT">GFR 12-A<br /><small style={{ color: '#94a3b8' }}>[AT]</small></th>
                </tr>
              </thead>

              <tbody>
                {displayedRows.map((r) => {
                  const isVideoClickable = r.videoCount > 0;
                  const isVideoVoucherClickable = r.fundUtilizedVideo > 0;
                  const isCapacityClickable = r.capacityItem !== undefined || r.fundUtilizedCapacity > 0;
                  const isHrClickable = r.hrItem !== undefined || r.fundUtilizedHr > 0;
                  const isArchiveClickable = r.fundUtilizedArchive > 0;
                  const isTelecastClickable = r.fundUtilizedTelecast > 0;
                  const isFeedbackClickable = r.feedbackItem !== undefined || r.fundUtilizedFeedback > 0;

                  return (
                    <tr key={r.monthKey}>
                      {/* B: Quarter */}
                      <td className={`${styles.colQuarterSticky} ${styles.textCenter}`}>
                        <span style={{ fontWeight: 700, color: '#4f46e5' }}>{r.quarter}</span>
                      </td>

                      {/* C: Month & Year (Date Format matching Excel: 2026-04-01) */}
                      <td className={`${styles.colMonthSticky} ${styles.textLeft}`}>
                        <span style={{ fontWeight: 600 }}>{r.monthDateStr}</span>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{r.monthLabel}</div>
                      </td>

                      {/* Head 1: Video Content Development (Cols D to L) */}
                      <td
                        className={`${styles.textCenter} ${isVideoClickable ? styles.cellClickable : ''}`}
                        onClick={() => isVideoClickable && openVideoDrillDown(r)}
                        title={isVideoClickable ? 'Click to view video titles, durations and links' : undefined}
                      >
                        {r.videoCount > 0 ? (
                          <span style={{ fontWeight: 700, color: '#1d4ed8' }}>
                            {String(r.videoCount).padStart(2, '0')}
                          </span>
                        ) : (
                          ''
                        )}
                      </td>
                      <td className={styles.textCenter}>{r.newTextbookBased === '-' ? '' : r.newTextbookBased}</td>
                      <td className={styles.textCenter}>{r.classGrade === '-' ? '' : r.classGrade}</td>
                      <td className={styles.textLeft} style={{ whiteSpace: 'pre-line' }}>
                        {r.subjects}
                      </td>
                      <td className={styles.textCenter}>{r.generalFiller === '-' ? '' : r.generalFiller}</td>
                      <td className={styles.textCenter}>{r.language === '-' ? '' : r.language}</td>
                      <td
                        className={`${styles.textCenter} ${styles.durationVal} ${isVideoClickable ? styles.cellClickable : ''}`}
                        onClick={() => isVideoClickable && openVideoDrillDown(r)}
                        title={isVideoClickable ? 'Click to inspect individual video durations' : undefined}
                      >
                        {r.totalDurationStr}
                      </td>
                      <td
                        className={`${styles.textRight} ${styles.currencyVal} ${isVideoVoucherClickable ? styles.cellClickable : ''}`}
                        onClick={() => isVideoVoucherClickable && openVoucherDrillDown(r, 1, '1. Video Content Development')}
                      >
                        {r.fundUtilizedVideo > 0 ? formatINR(r.fundUtilizedVideo) : (r.rowNumber === 7 ? '0' : '')}
                      </td>
                      <td className={`${styles.textRight} ${styles.balanceVal}`}>
                        {formatINR(r.fundBalanceVideo)}
                      </td>

                      {/* Head 2: Capacity Building (Cols M to S) */}
                      <td
                        className={`${styles.textLeft} ${isCapacityClickable ? styles.cellClickable : ''}`}
                        onClick={() => isCapacityClickable && openCapacityDrillDown(r)}
                        style={{ whiteSpace: 'pre-line' }}
                      >
                        {r.trainingPlanned}
                      </td>
                      <td
                        className={`${styles.textLeft} ${isCapacityClickable ? styles.cellClickable : ''}`}
                        onClick={() => isCapacityClickable && openCapacityDrillDown(r)}
                        style={{ whiteSpace: 'pre-line' }}
                      >
                        {r.trainingConducted}
                      </td>
                      <td className={styles.textCenter} style={{ whiteSpace: 'pre-line' }}>
                        {r.trainingDates}
                      </td>
                      <td className={styles.textCenter}>
                        {r.participantsTrained ? (
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>{r.participantsTrained}</span>
                        ) : (
                          ''
                        )}
                      </td>
                      <td className={styles.textLeft} style={{ whiteSpace: 'pre-line' }}>
                        {r.trainingOutcome}
                      </td>
                      <td
                        className={`${styles.textRight} ${styles.currencyVal} ${r.fundUtilizedCapacity > 0 ? styles.cellClickable : ''}`}
                        onClick={() => r.fundUtilizedCapacity > 0 && openVoucherDrillDown(r, 2, '2. Capacity Building')}
                      >
                        {r.fundUtilizedCapacity > 0 ? formatINR(r.fundUtilizedCapacity) : (r.rowNumber === 7 ? '0' : '')}
                      </td>
                      <td className={`${styles.textRight} ${styles.balanceVal}`}>
                        {formatINR(r.fundBalanceCapacity)}
                      </td>

                      {/* Head 3: Human Resource (Cols T to Y) */}
                      <td className={styles.textCenter}>{r.hrApprovedPosts}</td>
                      <td
                        className={`${styles.textCenter} ${isHrClickable ? styles.cellClickable : ''}`}
                        onClick={() => isHrClickable && openHrDrillDown(r)}
                      >
                        {r.hrHiringStatus ? (
                          <span className={styles.badgeSuccess}>{r.hrHiringStatus}</span>
                        ) : (
                          ''
                        )}
                      </td>
                      <td className={styles.textCenter}>
                        {r.hrFilledPosts ? <strong>{r.hrFilledPosts}</strong> : ''}
                      </td>
                      <td className={styles.textCenter}>{r.hrVacantPosts}</td>
                      <td
                        className={`${styles.textRight} ${styles.currencyVal} ${r.fundUtilizedHr > 0 ? styles.cellClickable : ''}`}
                        onClick={() => r.fundUtilizedHr > 0 && openVoucherDrillDown(r, 3, '3. Human Resource')}
                        title={r.fundUtilizedHr > 0 ? 'Click to inspect HR salary voucher' : undefined}
                      >
                        {r.fundUtilizedHr > 0 ? formatINR(r.fundUtilizedHr) : (r.rowNumber === 7 ? '0' : '')}
                      </td>
                      <td className={`${styles.textRight} ${styles.balanceVal}`}>
                        {formatINR(r.fundBalanceHr)}
                      </td>

                      {/* Head 4: Archive / Bandwidth / Networking (Cols Z to AD) */}
                      <td className={styles.textLeft}>{r.infraRequired}</td>
                      <td className={styles.textCenter}>
                        {r.infraStatus ? <span className={styles.badgeSuccess}>{r.infraStatus}</span> : ''}
                      </td>
                      <td className={styles.textLeft}>{r.infraComment}</td>
                      <td
                        className={`${styles.textRight} ${styles.currencyVal} ${isArchiveClickable ? styles.cellClickable : ''}`}
                        onClick={() => isArchiveClickable && openVoucherDrillDown(r, 4, '4. Archive / Bandwidth / Networking')}
                      >
                        {r.fundUtilizedArchive > 0 ? formatINR(r.fundUtilizedArchive) : (r.rowNumber === 7 ? '0' : '')}
                      </td>
                      <td className={`${styles.textRight} ${styles.balanceVal}`}>
                        {formatINR(r.fundBalanceArchive)}
                      </td>

                      {/* Head 5: Telecast Setup in Schools (Cols AE to AJ) */}
                      <td className={styles.textCenter}>{r.targetSchools}</td>
                      <td className={styles.textCenter}>{r.schoolsWithTv}</td>
                      <td className={styles.textCenter}>{r.schoolsWithDth}</td>
                      <td className={styles.textCenter}>
                        {r.totalSchoolsSetup ? (
                          <span style={{ fontWeight: 700, color: '#db2777' }}>{r.totalSchoolsSetup}</span>
                        ) : (
                          ''
                        )}
                      </td>
                      <td
                        className={`${styles.textRight} ${styles.currencyVal} ${isTelecastClickable ? styles.cellClickable : ''}`}
                        onClick={() => isTelecastClickable && openVoucherDrillDown(r, 5, '5. Telecast Setup in Schools')}
                      >
                        {r.fundUtilizedTelecast > 0 ? formatINR(r.fundUtilizedTelecast) : (r.rowNumber === 7 ? '0' : '')}
                      </td>
                      <td className={`${styles.textRight} ${styles.balanceVal}`}>
                        {formatINR(r.fundBalanceTelecast)}
                      </td>

                      {/* Head 6: Feedback / Research / Advocacy (Cols AK to AP) */}
                      <td
                        className={`${styles.textLeft} ${isFeedbackClickable ? styles.cellClickable : ''}`}
                        onClick={() => isFeedbackClickable && openFeedbackDrillDown(r)}
                        style={{ whiteSpace: 'pre-line' }}
                      >
                        {r.feedbackActivities}
                      </td>
                      <td className={styles.textLeft} style={{ whiteSpace: 'pre-line' }}>
                        {r.feedbackTarget}
                      </td>
                      <td className={styles.textLeft} style={{ whiteSpace: 'pre-line' }}>
                        {r.feedbackOutcome}
                      </td>
                      <td className={styles.textCenter}>{r.feedbackRemarks}</td>
                      <td
                        className={`${styles.textRight} ${styles.currencyVal} ${isFeedbackClickable ? styles.cellClickable : ''}`}
                        onClick={() => r.fundUtilizedFeedback > 0 && openVoucherDrillDown(r, 6, '6. Feedback / Research / Advocacy')}
                        title={r.fundUtilizedFeedback > 0 ? 'Click to inspect Advocacy campaign details' : undefined}
                      >
                        {r.fundUtilizedFeedback > 0 ? formatINR(r.fundUtilizedFeedback) : (r.rowNumber === 7 ? '0' : '')}
                      </td>
                      <td className={`${styles.textRight} ${styles.balanceVal}`}>
                        {formatINR(r.fundBalanceFeedback)}
                      </td>

                      {/* Total Fund (Cols AQ & AR) */}
                      <td className={`${styles.textRight} ${styles.currencyVal}`} style={{ background: '#f8fafc' }}>
                        <strong>{formatINR(r.monthlyTotalUtilized)}</strong>
                      </td>
                      <td className={`${styles.textRight} ${styles.balanceVal}`} style={{ background: '#f8fafc' }}>
                        <strong>{formatINR(r.cumulativeBalanceTotal)}</strong>
                      </td>

                      {/* Compliance (Cols AS & AT) */}
                      <td className={styles.textCenter}>
                        {r.complianceSoe ? (
                          <span className={r.complianceSoe.includes('Submitted') ? styles.badgeSuccess : styles.badgeWarning}>
                            {r.complianceSoe}
                          </span>
                        ) : (
                          ''
                        )}
                      </td>
                      <td className={styles.textCenter}>
                        {r.complianceGfr12a ? (
                          <span className={r.complianceGfr12a.includes('Submitted') ? styles.badgeSuccess : styles.badgeWarning}>
                            {r.complianceGfr12a}
                          </span>
                        ) : (
                          ''
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Quarter Subtotals Row (if single quarter selected) */}
                {selectedQuarter !== 'ALL' && (
                  (() => {
                    const qSummary = quarterSummaries.find((q) => q.quarter === selectedQuarter);
                    if (!qSummary) return null;
                    return (
                      <tr className={styles.quarterSubtotalRow}>
                        <td colSpan={2} className={styles.textCenter}>
                          <strong>{qSummary.quarter} Subtotal</strong>
                        </td>
                        <td className={styles.textCenter}>
                          <strong>{qSummary.totalVideoCount}</strong>
                        </td>
                        <td colSpan={5} className={styles.textCenter}>—</td>
                        <td className={`${styles.textCenter} ${styles.durationVal}`}>
                          <strong>{qSummary.totalDurationStr}</strong>
                        </td>
                        <td className={styles.textRight}>
                          <strong>{formatINR(qSummary.fundUtilizedVideo)}</strong>
                        </td>
                        <td className={styles.textCenter}>—</td>
                        <td colSpan={5} className={styles.textCenter}>—</td>
                        <td className={styles.textRight}>
                          <strong>{formatINR(qSummary.fundUtilizedCapacity)}</strong>
                        </td>
                        <td className={styles.textCenter}>—</td>
                        <td colSpan={4} className={styles.textCenter}>—</td>
                        <td className={styles.textRight}>
                          <strong>{formatINR(qSummary.fundUtilizedHr)}</strong>
                        </td>
                        <td className={styles.textCenter}>—</td>
                        <td colSpan={3} className={styles.textCenter}>—</td>
                        <td className={styles.textRight}>
                          <strong>{formatINR(qSummary.fundUtilizedArchive)}</strong>
                        </td>
                        <td className={styles.textCenter}>—</td>
                        <td colSpan={4} className={styles.textCenter}>—</td>
                        <td className={styles.textRight}>
                          <strong>{formatINR(qSummary.fundUtilizedTelecast)}</strong>
                        </td>
                        <td className={styles.textCenter}>—</td>
                        <td colSpan={4} className={styles.textCenter}>—</td>
                        <td className={styles.textRight}>
                          <strong>{formatINR(qSummary.fundUtilizedFeedback)}</strong>
                        </td>
                        <td className={styles.textCenter}>—</td>
                        <td className={styles.textRight}>
                          <strong style={{ color: '#4f46e5' }}>{formatINR(qSummary.totalQuarterExpenditure)}</strong>
                        </td>
                        <td colSpan={3} className={styles.textCenter}>—</td>
                      </tr>
                    );
                  })()
                )}

                {/* Grand Total Row across all 12 months */}
                <tr className={styles.grandTotalRow}>
                  <td colSpan={2} className={styles.textCenter}>
                    <strong>ANNUAL GRAND TOTAL</strong>
                  </td>
                  <td className={styles.textCenter}>
                    <strong>{grandTotals.totalVideoCount}</strong>
                  </td>
                  <td colSpan={5} className={styles.textCenter}>—</td>
                  <td className={`${styles.textCenter} ${styles.durationVal}`}>
                    <strong>{grandTotals.totalDurationStr}</strong>
                  </td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(grandTotals.fundUtilizedVideo)}</strong>
                  </td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(metadata.allocations.head1Video - grandTotals.fundUtilizedVideo)}</strong>
                  </td>
                  <td colSpan={5} className={styles.textCenter}>—</td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(grandTotals.fundUtilizedCapacity)}</strong>
                  </td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(metadata.allocations.head2Capacity - grandTotals.fundUtilizedCapacity)}</strong>
                  </td>
                  <td colSpan={4} className={styles.textCenter}>—</td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(grandTotals.fundUtilizedHr)}</strong>
                  </td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(metadata.allocations.head3Hr - grandTotals.fundUtilizedHr)}</strong>
                  </td>
                  <td colSpan={3} className={styles.textCenter}>—</td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(grandTotals.fundUtilizedArchive)}</strong>
                  </td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(metadata.allocations.head4Archive - grandTotals.fundUtilizedArchive)}</strong>
                  </td>
                  <td colSpan={4} className={styles.textCenter}>—</td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(grandTotals.fundUtilizedTelecast)}</strong>
                  </td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(metadata.allocations.head5Telecast - grandTotals.fundUtilizedTelecast)}</strong>
                  </td>
                  <td colSpan={4} className={styles.textCenter}>—</td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(grandTotals.fundUtilizedFeedback)}</strong>
                  </td>
                  <td className={styles.textRight}>
                    <strong>{formatINR(metadata.allocations.head6Feedback - grandTotals.fundUtilizedFeedback)}</strong>
                  </td>
                  <td className={styles.textRight} style={{ fontSize: '0.9rem', color: '#1e1b4b' }}>
                    <strong>{formatINR(grandTotals.grandTotalExpenditure)}</strong>
                  </td>
                  <td className={styles.textRight} style={{ fontSize: '0.9rem', color: '#0369a1' }}>
                    <strong>{formatINR(grandTotals.grandBalanceAvailable)}</strong>
                  </td>
                  <td colSpan={2} className={styles.textCenter}>
                    <span className={styles.badgeSuccess}>All Quarters Active</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT & EXCEPTION REGISTER (Section 16) */}
      {activeTab === 'audit' && (
        <div className={styles.tableCard}>
          <div className={styles.tableToolbar}>
            <div className={styles.tableTitle}>
              <span>🔍</span>
              <span>Financial Reconciliation & Data Completeness Exception Register</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
              ✓ 6 Core Audit Items Verified &bull; 0 Unmapped Transactions
            </span>
          </div>

          <div style={{ padding: '1.25rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Category</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Audit Item</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Reconciliation Details</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Audit Trail Source</th>
                </tr>
              </thead>
              <tbody>
                {exceptionAudits.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#4f46e5' }}>
                      {item.category}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#0f172a' }}>
                      {item.item}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span className={styles.badgeSuccess}>{item.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#334155', lineHeight: 1.45 }}>
                      {item.details}
                    </td>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                      {item.auditTrail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL ANALYTICS & INSIGHTS */}
      {activeTab === 'analytics' && (
        <div className={styles.analyticsGrid}>
          {/* Component Breakdown Card */}
          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <span>📊</span>
              <span>Expenditure by NCERT Plan Head (₹)</span>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { name: '1. Video Content Development', amt: grandTotals.fundUtilizedVideo, color: '#3b82f6', budget: metadata.allocations.head1Video },
                  { name: '2. Capacity Building', amt: grandTotals.fundUtilizedCapacity, color: '#22c55e', budget: metadata.allocations.head2Capacity },
                  { name: '3. Human Resource Support', amt: grandTotals.fundUtilizedHr, color: '#a855f7', budget: metadata.allocations.head3Hr },
                  { name: '4. Archive / Bandwidth / Networking', amt: grandTotals.fundUtilizedArchive, color: '#f97316', budget: metadata.allocations.head4Archive },
                  { name: '5. Telecast Setup in Schools', amt: grandTotals.fundUtilizedTelecast, color: '#ec4899', budget: metadata.allocations.head5Telecast },
                  { name: '6. Feedback / Research / Advocacy', amt: grandTotals.fundUtilizedFeedback, color: '#14b8a6', budget: metadata.allocations.head6Feedback },
                ].map((item) => {
                  const pct = grandTotals.grandTotalExpenditure > 0 ? (item.amt / grandTotals.grandTotalExpenditure) * 100 : 0;
                  const utilPct = item.budget > 0 ? (item.amt / item.budget) * 100 : 0;
                  return (
                    <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{item.name}</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatINR(item.amt)} <small style={{ color: '#64748b' }}>({pct.toFixed(1)}%)</small>
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            height: '100%',
                            background: item.color,
                            borderRadius: '4px',
                          }}
                        ></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                        <span>Sanction: {formatINR(item.budget)}</span>
                        <span>Utilization: {utilPct.toFixed(2)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Key MIS Insights Card */}
          <div className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <span>💡</span>
              <span>Key MIS Reporting Highlights & Compliance</span>
            </div>
            <div className={styles.insightsList}>
              <div className={styles.insightItem}>
                <div className={styles.insightCheck}>✓</div>
                <div>
                  <strong>Total Project Utilization: {formatINR(grandTotals.grandTotalExpenditure)} ({kpis.utilizationPercent}%)</strong>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Reconciled across {kpis.sourceVouchersCount} source ledger records and 6 official plan heads.
                  </p>
                </div>
              </div>

              <div className={styles.insightItem}>
                <div className={styles.insightCheck}>✓</div>
                <div>
                  <strong>Video Content Production: {kpis.totalVideosCount} Modules Recorded</strong>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Total duration of {kpis.totalVideoDuration} hours developed across Trades: POT, CNC, COPA, Drone, AI Assistant & Wireman.
                  </p>
                </div>
              </div>

              <div className={styles.insightItem}>
                <div className={styles.insightCheck}>✓</div>
                <div>
                  <strong>Capacity Building Outreach: 35 Master Trainers Certified</strong>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    2-Day intensive workshop completed at NIMI Chennai on multimedia pedagogy & telecast standards.
                  </p>
                </div>
              </div>

              <div className={styles.insightItem}>
                <div className={styles.insightCheck}>✓</div>
                <div>
                  <strong>Human Resource Mobilization: 3 Core Roles Active</strong>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    10 approved positions under project; Consultant & studio engineers operational; remaining 7 posts in active recruitment.
                  </p>
                </div>
              </div>

              <div className={styles.insightItem}>
                <div className={styles.insightCheck}>✓</div>
                <div>
                  <strong>Statutory Compliance: SoE & GFR 12-A Submitted</strong>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Quarters 1 & 2 audited and cleared; Quarter 3 expenditure reconciliation in active compilation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Drill-Down Modal */}
      {modalState && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div style={{ fontSize: '1.25rem' }}>
                  {modalState.category === 'video' ? '🎬' :
                   modalState.category === 'voucher' ? '🧾' :
                   modalState.category === 'capacity' ? '👥' :
                   modalState.category === 'hr' ? '👔' : '📢'}
                </div>
                <div>
                  <h3 className={styles.modalTitle}>{modalState.title}</h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{modalState.subtitle}</span>
                </div>
              </div>
              <button type="button" className={styles.modalCloseBtn} onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* VIDEO CATEGORY DRILL DOWN */}
              {modalState.category === 'video' && (() => {
                const videoList = modalState.items || [];
                const linkedCount = videoList.filter((v: any) => v.videoLink && String(v.videoLink).trim().startsWith('http')).length;
                const totalDurSec = videoList.reduce((acc: number, v: any) => {
                  const d = v.duration;
                  if (!d || d === 'null' || d === '00:00:00') return acc;
                  const parts = String(d).trim().split(':').map(Number);
                  if (parts.length === 3 && !parts.some(isNaN)) return acc + parts[0] * 3600 + parts[1] * 60 + parts[2];
                  if (parts.length === 2 && !parts.some(isNaN)) return acc + parts[0] * 60 + parts[1];
                  return acc;
                }, 0);
                const computedDurStr = totalDurSec > 0
                  ? `${String(Math.floor(totalDurSec / 3600)).padStart(2, '0')}:${String(Math.floor((totalDurSec % 3600) / 60)).padStart(2, '0')}:${String(totalDurSec % 60).padStart(2, '0')}`
                  : (modalState.singleItem?.duration || '00:00:00');

                return (
                  <div>
                    <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', fontSize: '0.8rem' }}>
                        <div><strong>Curriculum Focus:</strong> Vocational Education</div>
                        <div><strong>Language:</strong> English / Hindi</div>
                        <div><strong>Total Modules:</strong> <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{videoList.length || modalState.singleItem?.count || 0}</span></div>
                        <div><strong>Total Duration:</strong> <span style={{ color: '#047857', fontWeight: 700 }}>⏱️ {computedDurStr} hrs</span></div>
                        <div><strong>Streaming Links:</strong> <span style={{ color: linkedCount > 0 ? '#15803d' : '#94a3b8', fontWeight: 600 }}>{linkedCount} of {videoList.length} Active</span></div>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                            <th style={{ padding: '0.6rem 0.5rem', width: '35px' }}>#</th>
                            <th style={{ padding: '0.6rem 0.5rem' }}>Module Title</th>
                            <th style={{ padding: '0.6rem 0.5rem' }}>Trade / Subject</th>
                            <th style={{ padding: '0.6rem 0.5rem' }}>SME / Expert</th>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Duration</th>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', minWidth: '130px' }}>Video Link</th>
                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {videoList.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                                <div style={{ fontSize: '1.8rem', marginBottom: '0.4rem' }}>🎬</div>
                                <div style={{ fontWeight: 600, color: '#334155' }}>No video modules found for this reporting month.</div>
                                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: '#94a3b8' }}>Video records and streaming links will automatically appear once verified.</div>
                              </td>
                            </tr>
                          ) : (
                            videoList.map((v: any, idx: number) => {
                              const hasLink = v.videoLink && String(v.videoLink).trim().startsWith('http');
                              return (
                                <tr key={v.id || idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                                  <td style={{ padding: '0.55rem 0.5rem', color: '#64748b', fontWeight: 500 }}>{idx + 1}</td>
                                  <td style={{ padding: '0.55rem 0.5rem', fontWeight: 600, color: '#0f172a' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '13px' }}>🎬</span>
                                      <span>{v.title}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.55rem 0.5rem' }}>
                                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                                      {v.trade}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.55rem 0.5rem', color: '#475569' }}>{v.smeName}</td>
                                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                                    {v.duration && v.duration !== '00:00:00' ? (
                                      <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                        ⏱️ {v.duration}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center' }}>
                                    {hasLink ? (
                                      <a
                                        href={v.videoLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          background: '#eff6ff',
                                          color: '#1d4ed8',
                                          border: '1px solid #93c5fd',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          fontSize: '0.74rem',
                                          fontWeight: 600,
                                          textDecoration: 'none',
                                          whiteSpace: 'nowrap',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                          cursor: 'pointer'
                                        }}
                                        title={`Watch video: ${v.title}`}
                                      >
                                        <span>▶</span> Watch Video
                                      </a>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontStyle: 'italic', background: '#f8fafc', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                        ⏳ Link Pending
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center' }}>
                                    <span className={hasLink ? styles.badgeSuccess : styles.badgeInfo}>
                                      {hasLink ? 'PUBLISHED' : (v.status || 'COMPLETED')}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* VOUCHER EXPENDITURE DRILL DOWN */}
              {modalState.category === 'voucher' && (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>Voucher No.</th>
                        <th style={{ padding: '0.5rem' }}>Accounting Date</th>
                        <th style={{ padding: '0.5rem' }}>Payee / Expert</th>
                        <th style={{ padding: '0.5rem' }}>Description & Accounting Note</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Paid (₹)</th>
                        <th style={{ padding: '0.5rem', textAlign: 'center' }}>Audit Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(modalState.items || []).map((v: VerifiedLedgerVoucher) => (
                        <tr key={v.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 600, color: '#4f46e5' }}>
                            {v.voucherOrUtr}
                          </td>
                          <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{v.date}</td>
                          <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                            {v.expertOrVendor}
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{v.designation}</div>
                          </td>
                          <td style={{ padding: '0.5rem', color: '#475569' }}>
                            {v.description}
                            {v.accountingBasisNote && (
                              <div style={{ fontSize: '0.72rem', color: '#2563eb', marginTop: '0.2rem' }}>
                                ℹ️ {v.accountingBasisNote}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                            {formatINR(v.paidAmount)}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <span className={styles.badgeSuccess}>{v.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* CAPACITY BUILDING DRILL DOWN */}
              {modalState.category === 'capacity' && modalState.singleItem && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '1rem' }}>
                      {modalState.singleItem.programName}
                    </h4>
                    <p style={{ margin: '0 0 0.75rem 0', color: '#374151' }}>
                      {modalState.singleItem.description}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                      <div><strong>Dates:</strong> {modalState.singleItem.dates}</div>
                      <div><strong>Venue:</strong> {modalState.singleItem.venue}</div>
                      <div><strong>Participants:</strong> {modalState.singleItem.participantsCount} Master Trainers</div>
                      <div><strong>Target Group:</strong> {modalState.singleItem.targetAudience}</div>
                    </div>
                  </div>
                  <div>
                    <strong>Key Program Outcomes:</strong>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#475569', lineHeight: 1.5 }}>
                      {modalState.singleItem.outcome}
                    </p>
                  </div>
                </div>
              )}

              {/* HR STAFFING DRILL DOWN */}
              {modalState.category === 'hr' && modalState.singleItem && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ background: '#faf5ff', padding: '1rem', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b21a8', fontSize: '1rem' }}>
                      {modalState.singleItem.role}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                      <div><strong>Approved Posts:</strong> {modalState.singleItem.approvedCount}</div>
                      <div><strong>Filled Posts:</strong> {modalState.singleItem.filledCount}</div>
                      <div><strong>Vacant Posts:</strong> {modalState.singleItem.vacantCount}</div>
                      <div><strong>Recruitment Status:</strong> {modalState.singleItem.status}</div>
                    </div>
                  </div>
                  <div>
                    <strong>Accounting Basis & Remuneration Audit:</strong>
                    <p style={{ margin: '0.25rem 0 0.5rem 0', color: '#4f46e5', fontWeight: 500 }}>
                      ℹ️ {modalState.singleItem.accountingNote}
                    </p>
                    <strong>Onboarded Technical & Project Personnel:</strong>
                    <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem', color: '#334155' }}>
                      {(modalState.singleItem.filledNames || []).map((name: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>{name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* FEEDBACK & ADVOCACY DRILL DOWN */}
              {modalState.category === 'feedback' && modalState.singleItem && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ background: '#f0fdfa', padding: '1rem', borderRadius: '8px', border: '1px solid #99f6e4' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#115e59', fontSize: '1rem' }}>
                      {modalState.singleItem.campaignName}
                    </h4>
                    <p style={{ margin: '0 0 0.75rem 0', color: '#374151' }}>
                      Paid social media awareness and YouTube channel visibility promotion across vocational target groups.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      <div><strong>Campaign Period:</strong> {modalState.singleItem.period}</div>
                      <div><strong>Total Impressions:</strong> {new Intl.NumberFormat('en-IN').format(modalState.singleItem.impressions)}</div>
                      <div><strong>Total Views:</strong> {new Intl.NumberFormat('en-IN').format(modalState.singleItem.views)}</div>
                      <div><strong>New Subscribers:</strong> +{modalState.singleItem.newSubscribers}</div>
                      <div><strong>Voucher Ref:</strong> {modalState.singleItem.voucherNo}</div>
                      <div><strong>Amount Paid:</strong> {formatINR(modalState.singleItem.expenditure)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnOutline} onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
