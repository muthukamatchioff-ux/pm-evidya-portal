'use client';

import React, { useState, useTransition } from 'react';
import styles from './monthly-expenditure.module.css';
import {
  MonthlyExpenditureReportResult,
  PlanHeadSummary,
  DrillDownVoucher,
  getMonthlyExpenditureReportData,
} from './actions';

interface Props {
  initialData: MonthlyExpenditureReportResult;
}

export default function MonthlyExpenditureClient({ initialData }: Props) {
  const [data, setData] = useState<MonthlyExpenditureReportResult>(initialData);
  const [financialYear, setFinancialYear] = useState(data.filters.financialYear);
  const [fromMonth, setFromMonth] = useState(data.filters.fromMonth);
  const [toMonth, setToMonth] = useState(data.filters.toMonth);
  const [project, setProject] = useState(data.filters.project);
  const [isPending, startTransition] = useTransition();

  // Drill-down Modal State
  const [drillDownCell, setDrillDownCell] = useState<{
    title: string;
    headName: string;
    monthKey: string;
    vouchers: DrillDownVoucher[];
    totalAmount: number;
  } | null>(null);

  const formatInr = (n: number) => {
    return (n || 0).toLocaleString('en-IN');
  };

  const handleGenerateReport = () => {
    startTransition(async () => {
      const refreshed = await getMonthlyExpenditureReportData({
        financialYear,
        fromMonth,
        toMonth,
        project,
      });
      setData(refreshed);
    });
  };

  const handleCellClick = (head: PlanHeadSummary, month: string) => {
    const matchingVouchers = data.vouchers.filter(
      (v) => v.headId === head.id && v.monthKey === month
    );
    const cellTotal = head.monthlyExpenditure[month] || 0;
    setDrillDownCell({
      title: `${head.name} — ${month}`,
      headName: head.name,
      monthKey: month,
      vouchers: matchingVouchers,
      totalAmount: cellTotal,
    });
  };

  const handleRowTotalClick = (head: PlanHeadSummary) => {
    const matchingVouchers = data.vouchers.filter(
      (v) => v.headId === head.id && data.activeMonths.includes(v.monthKey)
    );
    setDrillDownCell({
      title: `${head.name} — Consolidated Total`,
      headName: head.name,
      monthKey: 'All Active Months',
      vouchers: matchingVouchers,
      totalAmount: head.totalExpenditure,
    });
  };

  const handleColumnTotalClick = (month: string) => {
    const matchingVouchers = data.vouchers.filter((v) => v.monthKey === month);
    const colTotal = data.monthlyTotals[month] || 0;
    setDrillDownCell({
      title: `All Plan Heads — ${month}`,
      headName: 'All Plan Heads',
      monthKey: month,
      vouchers: matchingVouchers,
      totalAmount: colTotal,
    });
  };

  const handleGrandTotalClick = () => {
    const matchingVouchers = data.vouchers.filter((v) =>
      data.activeMonths.includes(v.monthKey)
    );
    setDrillDownCell({
      title: 'Grand Total Expenditure (All Heads & Months)',
      headName: 'Grand Total (6 Heads)',
      monthKey: 'June 2026 – Oct 2026',
      vouchers: matchingVouchers,
      totalAmount: data.grandTotalExpenditure,
    });
  };

  const handleExportPdf = () => {
    const originalTitle = document.title;
    document.title = 'PM_eVidya_Monthly_Expenditure_Report_2026-2027';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Excel Export Handler
  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const monthCols = data.activeMonths;
    const headers = [
      'Sl. No.',
      'Plan Head / Activity',
      ...monthCols,
      'Total Expenditure (₹)',
      'Sanctioned Budget (₹)',
      'Available Balance (₹)',
      'Utilization %',
    ];

    const summaryRows: any[] = [headers];

    // Data Rows (Head 1 to 6)
    data.planHeads.forEach((h, idx) => {
      const rowNum = idx + 2; // Excel 1-based row index (Header is row 1)
      const startCol = 'C';
      const endCol = String.fromCharCode('C'.charCodeAt(0) + monthCols.length - 1);
      const totalCol = String.fromCharCode('C'.charCodeAt(0) + monthCols.length);
      const budgetCol = String.fromCharCode('C'.charCodeAt(0) + monthCols.length + 1);
      const balCol = String.fromCharCode('C'.charCodeAt(0) + monthCols.length + 2);

      const row = [
        idx + 1,
        h.name,
        ...monthCols.map((m) => h.monthlyExpenditure[m] || 0),
        { t: 'n', v: h.totalExpenditure, f: `SUM(${startCol}${rowNum}:${endCol}${rowNum})` },
        h.sanctionedBudget,
        { t: 'n', v: h.availableBalance, f: `${budgetCol}${rowNum}-${totalCol}${rowNum}` },
        { t: 'n', v: Number(h.utilizationPercent.toFixed(2)), f: `ROUND((${totalCol}${rowNum}/${budgetCol}${rowNum})*100, 2)` },
      ];
      summaryRows.push(row);
    });

    // Grand Total Row (Row 8)
    const totalRowNum = data.planHeads.length + 2;
    const lastDataRowNum = data.planHeads.length + 1;
    const startCol = 'C';
    const endCol = String.fromCharCode('C'.charCodeAt(0) + monthCols.length - 1);
    const totalCol = String.fromCharCode('C'.charCodeAt(0) + monthCols.length);
    const budgetCol = String.fromCharCode('C'.charCodeAt(0) + monthCols.length + 1);

    const totalRow = [
      '',
      'TOTAL',
      ...monthCols.map((m, mIdx) => {
        const colLetter = String.fromCharCode('C'.charCodeAt(0) + mIdx);
        return {
          t: 'n',
          v: data.monthlyTotals[m] || 0,
          f: `SUM(${colLetter}2:${colLetter}${lastDataRowNum})`,
        };
      }),
      {
        t: 'n',
        v: data.grandTotalExpenditure,
        f: `SUM(${totalCol}2:${totalCol}${lastDataRowNum})`,
      },
      {
        t: 'n',
        v: data.grandSanctionedBudget,
        f: `SUM(${budgetCol}2:${budgetCol}${lastDataRowNum})`,
      },
      {
        t: 'n',
        v: data.balanceAvailable,
        f: `${budgetCol}${totalRowNum}-${totalCol}${totalRowNum}`,
      },
      {
        t: 'n',
        v: Number(data.overallUtilizationPercent.toFixed(2)),
        f: `ROUND((${totalCol}${totalRowNum}/${budgetCol}${totalRowNum})*100, 2)`,
      },
    ];
    summaryRows.push(totalRow);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

    // Set professional column widths
    wsSummary['!cols'] = [
      { wch: 8 },  // Sl. No.
      { wch: 54 }, // Plan Head / Activity
      ...monthCols.map(() => ({ wch: 14 })), // Month columns
      { wch: 24 }, // Total Expenditure (₹)
      { wch: 24 }, // Sanctioned Budget (₹)
      { wch: 24 }, // Available Balance (₹)
      { wch: 16 }, // Utilization %
    ];

    // EXACTLY ONE WORKSHEET: 'Monthly Summary'
    // 'Voucher Audit Ledger' worksheet is completely excluded
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Monthly Summary');

    // Download authoritative workbook
    XLSX.writeFile(wb, 'PM_eVidya_Monthly_Expenditure_Report_2026-2027.xlsx');
  };

  const handleExportDrillDownExcel = async () => {
    if (!drillDownCell) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const voucherRows: any[] = [
      [
        'S.No',
        'Plan Head',
        'Month',
        'Annexure Source',
        'Resource Person / Vendor',
        'Designation',
        'Description / Activity',
        'Reference / UTR No.',
        'Date',
        'Claimed (₹)',
        'Approved (₹)',
        'Disbursed (₹)',
        'Status',
      ],
    ];

    drillDownCell.vouchers.forEach((v, idx) => {
      voucherRows.push([
        idx + 1,
        v.headName,
        v.monthKey,
        v.annexureSource,
        v.expertOrVendor,
        v.designation,
        v.description,
        v.voucherOrUtr,
        v.date,
        v.claimedAmount,
        v.approvedAmount,
        v.paidAmount,
        v.status,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(voucherRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Vouchers');
    XLSX.writeFile(
      wb,
      `Vouchers_${drillDownCell.monthKey.replace(/\s+/g, '_')}.xlsx`
    );
  };

  // SVG Doughnut Calculation
  const totalPie = data.pieChartData.reduce((s, p) => s + p.amount, 0) || 1;
  let accumulatedAngle = 0;
  const radius = 55;
  const cx = 75;
  const cy = 75;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={styles.container}>
      {/* Dedicated Print-Only Official NIMI Header Banner */}
      <div className={styles.printHeaderBanner}>
        <div className={styles.printGovHeading}>
          GOVERNMENT OF INDIA &bull; MINISTRY OF SKILL DEVELOPMENT & ENTREPRENEURSHIP
        </div>
        <div className={styles.printOrgHeading}>
          NATIONAL INSTRUCTIONAL MEDIA INSTITUTE (NIMI), CHENNAI
        </div>
        <div className={styles.printProjectHeading}>
          PM e-Vidya Project (DTH Channels 22 – 27) &bull; Monthly Expenditure Statement (FY 2026–2027)
        </div>
        <div className={styles.printMetaBar}>
          <span><strong>Reporting Window:</strong> {data.monthsCoveredSub} ({data.monthsCoveredStr})</span>
          <span><strong>Authoritative Baseline:</strong> Verified Vouchers ({data.totalRecordsCount} Records)</span>
          <span><strong>Statement Date:</strong> {data.statementDate}</span>
          <span><strong>Output Generated:</strong> {data.totalOutputHours} (Target: 160:00:00 hrs)</span>
        </div>
      </div>

      {/* Top Header */}
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <div className={styles.headerIcon}>📊</div>
          <div>
            <h1 className={styles.pageTitle}>
              Monthly Expenditure Report (All Annexures – 6 Plan Heads)
            </h1>
            <p className={styles.pageSubtitle}>
              Consolidated monthly expenditure analysis for PM e-Vidya (June 2026 –
              Mar 2027) based on Annexure I, II & VI entries
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            onClick={handleExportExcel}
            className={`${styles.btnExport} ${styles.btnExportExcel}`}
            title="Download formatted Excel workbook"
          >
            <span>📊</span> Export (Excel)
          </button>
          <button
            onClick={() => window.print()}
            className={`${styles.btnExport} ${styles.btnExportPdf}`}
            title="Export as official PDF"
          >
            <span>📄</span> Export (PDF)
          </button>
          <button
            onClick={() => window.print()}
            className={styles.btnExport}
            title="Print Report"
          >
            <span>🖨️</span> Print
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={styles.filterToolbar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Financial Year</label>
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="2026 - 2027">2026 - 2027</option>
            <option value="2025 - 2026">2025 - 2026</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>From Month</label>
          <select
            value={fromMonth}
            onChange={(e) => setFromMonth(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="Jun 2026">Jun 2026</option>
            <option value="Jul 2026">Jul 2026</option>
            <option value="Aug 2026">Aug 2026</option>
            <option value="Sep 2026">Sep 2026</option>
            <option value="Oct 2026">Oct 2026</option>
            <option value="May 2026">May 2026 (Pre-Production)</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>To Month</label>
          <select
            value={toMonth}
            onChange={(e) => setToMonth(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="Mar 2027">Mar 2027</option>
            <option value="Oct 2026">Oct 2026</option>
            <option value="Sep 2026">Sep 2026</option>
            <option value="Aug 2026">Aug 2026</option>
            <option value="Jul 2026">Jul 2026</option>
            <option value="Jun 2026">Jun 2026</option>
          </select>
        </div>

        <div className={styles.filterGroup} style={{ flex: 1.5 }}>
          <label className={styles.filterLabel}>Project</label>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="PM e-Vidya (Ch. 22 – 27)">
              PM e-Vidya (Ch. 22 – 27)
            </option>
          </select>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isPending}
          className={styles.btnGenerate}
        >
          <span>🔍</span> {isPending ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {/* Top 5 Summary Cards */}
      <div className={styles.metricsGrid}>
        {/* Card 1: Total Sanctioned Budget */}
        <div className={styles.metricCard}>
          <div
            className={styles.metricIconCircle}
            style={{ background: '#eff6ff', color: '#2563eb' }}
          >
            🪙
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Sanctioned Budget</span>
            <span className={styles.metricValue}>
              ₹ {formatInr(data.grandSanctionedBudget)}
            </span>
            <span className={styles.metricSubtext} style={{ color: '#64748b' }}>
              (April 2026 – March 2027)
            </span>
          </div>
        </div>

        {/* Card 2: Total Expenditure */}
        <div className={styles.metricCard}>
          <div
            className={styles.metricIconCircle}
            style={{ background: '#ecfdf5', color: '#16a34a' }}
          >
            ✅
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Expenditure</span>
            <span className={styles.metricValue}>
              ₹ {formatInr(data.grandTotalExpenditure)}
            </span>
            <span className={styles.metricSubtext} style={{ color: '#16a34a' }}>
              ({data.overallUtilizationPercent}% of sanctioned)
            </span>
          </div>
        </div>

        {/* Card 3: Balance Available */}
        <div className={styles.metricCard}>
          <div
            className={styles.metricIconCircle}
            style={{ background: '#fffbeb', color: '#d97706' }}
          >
            ⏳
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Balance Available</span>
            <span className={styles.metricValue}>
              ₹ {formatInr(data.balanceAvailable)}
            </span>
            <span className={styles.metricSubtext} style={{ color: '#d97706' }}>
              ({data.balancePercent}%)
            </span>
          </div>
        </div>

        {/* Card 4: Months Covered */}
        <div className={styles.metricCard}>
          <div
            className={styles.metricIconCircle}
            style={{ background: '#faf5ff', color: '#9333ea' }}
          >
            📅
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Months Covered</span>
            <span className={styles.metricValue}>{data.monthsCoveredStr}</span>
            <span className={styles.metricSubtext} style={{ color: '#7c3aed' }}>
              {data.monthsCoveredSub}
            </span>
          </div>
        </div>

        {/* Card 5: Total Output */}
        <div className={styles.metricCard}>
          <div
            className={styles.metricIconCircle}
            style={{ background: '#eff6ff', color: '#2563eb' }}
          >
            ▶️
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Total Output</span>
            <span className={styles.metricValue}>{data.totalOutputHours}</span>
            <span className={styles.metricSubtext} style={{ color: '#2563eb' }}>
              {data.targetOutputHours}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderBar}>
          <div className={styles.tableTitleArea}>
            <span className={styles.tableIcon}>📑</span>
            <h2 className={styles.tableTitle}>
              Monthly Expenditure Summary – Plan Head-wise (All Annexures)
            </h2>
          </div>
          <span className={styles.currencyIndicator}>Amount in ₹</span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.summaryTable}>
            <thead>
              <tr>
                <th>Plan Head / Activity</th>
                {data.activeMonths.map((m) => (
                  <th key={m} className={styles.numCol}>
                    {m}
                  </th>
                ))}
                <th className={styles.numCol}>Total Expenditure</th>
                <th className={styles.numCol}>
                  Sanctioned Budget <br />
                  <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#64748b' }}>
                    (June 2026 – March 2027)
                  </span>
                </th>
                <th style={{ textAlign: 'center', minWidth: '150px' }}>% Utilization</th>
              </tr>
            </thead>
            <tbody>
              {data.planHeads.map((head) => (
                <tr key={head.id}>
                  {/* Plan Head / Activity with colored badge */}
                  <td>
                    <div className={styles.headCell}>
                      <span
                        className={styles.headBadge}
                        style={{ backgroundColor: head.color }}
                      >
                        {head.badge}
                      </span>
                      <span className={styles.headNameText}>{head.name}</span>
                    </div>
                  </td>

                  {/* Monthly Columns */}
                  {data.activeMonths.map((m) => {
                    const amount = head.monthlyExpenditure[m] || 0;
                    return (
                      <td
                        key={m}
                        className={styles.numCol}
                        onClick={() => handleCellClick(head, m)}
                        title={`Click to view itemized vouchers for ${head.shortName} (${m})`}
                      >
                        {formatInr(amount)}
                      </td>
                    );
                  })}

                  {/* Row Total Expenditure */}
                  <td
                    className={styles.numCol}
                    style={{ fontWeight: 600 }}
                    onClick={() => handleRowTotalClick(head)}
                    title={`Click to view all vouchers for ${head.shortName}`}
                  >
                    {formatInr(head.totalExpenditure)}
                  </td>

                  {/* Sanctioned Budget */}
                  <td className={styles.numCol} style={{ color: '#475569' }}>
                    {formatInr(head.sanctionedBudget)}
                  </td>

                  {/* % Utilization */}
                  <td>
                    <div className={styles.utilCell}>
                      <div className={styles.progressBarBg}>
                        <div
                          className={styles.progressBarFill}
                          style={{
                            width: `${Math.min(100, head.utilizationPercent)}%`,
                          }}
                        />
                      </div>
                      <span className={styles.utilText}>
                        {head.utilizationPercent.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Grand Total Row */}
              <tr className={styles.totalRow}>
                <td>Total</td>
                {data.activeMonths.map((m) => (
                  <td
                    key={m}
                    className={styles.numCol}
                    onClick={() => handleColumnTotalClick(m)}
                    title={`Click to view all vouchers for ${m}`}
                  >
                    {formatInr(data.monthlyTotals[m] || 0)}
                  </td>
                ))}
                <td
                  className={styles.numCol}
                  onClick={handleGrandTotalClick}
                  title="Click to view all consolidated vouchers"
                >
                  {formatInr(data.grandTotalExpenditure)}
                </td>
                <td className={styles.numCol}>
                  {formatInr(data.grandSanctionedBudget)}
                </td>
                <td>
                  <div className={styles.utilCell}>
                    <div className={styles.progressBarBg}>
                      <div
                        className={styles.progressBarFill}
                        style={{
                          width: `${Math.min(100, data.overallUtilizationPercent)}%`,
                        }}
                      />
                    </div>
                    <span className={styles.utilText}>
                      {data.overallUtilizationPercent.toFixed(2)}%
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 3 Analytics Panels */}
      <div className={styles.analyticsGrid}>
        {/* Panel 1: Expenditure by Plan Head (₹) */}
        <div className={styles.analyticsCard}>
          <div className={styles.analyticsTitleArea}>
            <h3 className={styles.analyticsTitle}>
              <span>📊</span> Expenditure by Plan Head (₹)
            </h3>
          </div>

          <div className={styles.doughnutContainer}>
            <div className={styles.doughnutSvgWrap}>
              <svg width="150" height="150" viewBox="0 0 150 150">
                {data.pieChartData.map((item, idx) => {
                  const dashLength = (item.amount / totalPie) * circumference;
                  const dashOffset = -accumulatedAngle;
                  accumulatedAngle += dashLength;

                  return (
                    <circle
                      key={item.name}
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${dashLength} ${circumference}`}
                      strokeDashoffset={dashOffset}
                      style={{
                        transition: 'stroke-dasharray 0.5s ease',
                      }}
                    />
                  );
                })}
              </svg>
              {/* Centered Total Text */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    lineHeight: 1.1,
                  }}
                >
                  ₹ {formatInr(data.grandTotalExpenditure)}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#64748b',
                    marginTop: '2px',
                  }}
                >
                  Total
                </div>
              </div>
            </div>

            <div className={styles.doughnutLegend}>
              {data.pieChartData.map((item) => (
                <div key={item.name} className={styles.legendItem}>
                  <div className={styles.legendDotName}>
                    <span
                      className={styles.legendDot}
                      style={{ backgroundColor: item.color }}
                    />
                    <span className={styles.legendName} title={item.shortName}>
                      {item.shortName}
                    </span>
                  </div>
                  <span className={styles.legendPercent}>{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel 2: Month-wise Expenditure vs. Target */}
        <div className={styles.analyticsCard}>
          <div className={styles.analyticsTitleArea}>
            <h3 className={styles.analyticsTitle}>
              <span>📈</span> Month-wise Expenditure vs. Target
            </h3>
            <div className={styles.chartLegendGroup}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#6366f1',
                    borderRadius: '2px',
                  }}
                />
                <span style={{ color: '#475569' }}>Expenditure (₹)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span
                  style={{
                    width: '12px',
                    height: '2px',
                    borderTop: '2px dashed #a855f7',
                  }}
                />
                <span style={{ color: '#7c3aed' }}>
                  Monthly Target (₹ {formatInr(data.monthlyTarget)})
                </span>
              </div>
            </div>
          </div>

          <div className={styles.barChartContainer}>
            {/* SVG Bar Chart with Target Line */}
            <svg width="100%" height="160" viewBox="0 0 460 160">
              {/* Y Axis Guide Lines for 0, 5L, 10L, 15L, 20L, 25L */}
              {[
                { val: 0, label: '₹ 0', y: 135 },
                { val: 500000, label: '₹ 5 L', y: 110 },
                { val: 1000000, label: '₹ 10 L', y: 85 },
                { val: 1500000, label: '₹ 15 L', y: 60 },
                { val: 2000000, label: '₹ 20 L', y: 35 },
                { val: 2500000, label: '₹ 25 L', y: 10 },
              ].map((g) => (
                <g key={g.label}>
                  <line
                    x1="45"
                    y1={g.y}
                    x2="450"
                    y2={g.y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                  />
                  <text
                    x="40"
                    y={g.y + 3}
                    textAnchor="end"
                    fontSize="9.5"
                    fill="#94a3b8"
                  >
                    {g.label}
                  </text>
                </g>
              ))}

              {/* Horizontal Monthly Target Line at 22,49,532 */}
              {(() => {
                // target y position between 20L (35) and 25L (10)
                const targetY = 135 - ((data.monthlyTarget / 2500000) * 125);
                return (
                  <g>
                    <line
                      x1="45"
                      y1={targetY}
                      x2="450"
                      y2={targetY}
                      stroke="#a855f7"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    <circle cx="45" cy={targetY} r="3" fill="#a855f7" />
                    <circle cx="450" cy={targetY} r="3" fill="#a855f7" />
                  </g>
                );
              })()}

              {/* Monthly Bars */}
              {data.barChartData.map((b, i) => {
                const totalBars = data.barChartData.length;
                const availableWidth = 390;
                const barSlot = availableWidth / totalBars;
                const barWidth = 32;
                const x = 55 + i * barSlot + (barSlot - barWidth) / 2;

                // Scale bar height: 0 at y=135, 25L at y=10 (range 125 px)
                const maxVal = 2500000;
                const barHeight = Math.min(125, (b.expenditure / maxVal) * 125);
                const barY = 135 - barHeight;

                return (
                  <g key={b.month}>
                    {/* Bar rectangle with rounded top */}
                    <rect
                      x={x}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      rx="3"
                      fill="#6366f1"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleColumnTotalClick(b.month)}
                    />
                    {/* Bar top label */}
                    <text
                      x={x + barWidth / 2}
                      y={barY - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill="#3730a3"
                    >
                      {b.label}
                    </text>
                    {/* X-axis Month Label */}
                    <text
                      x={x + barWidth / 2}
                      y="148"
                      textAnchor="middle"
                      fontSize="9"
                      fill="#64748b"
                    >
                      {b.month}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Panel 3: Key Insights */}
        <div className={styles.analyticsCard}>
          <div className={styles.analyticsTitleArea}>
            <h3 className={styles.analyticsTitle}>
              <span>💡</span> Key Insights
            </h3>
          </div>

          <div className={styles.insightsList}>
            {data.keyInsights.map((insight, idx) => (
              <div key={idx} className={styles.insightItem}>
                <span className={styles.insightCheckCircle}>✓</span>
                <span>{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drill-Down Transaction Modal */}
      {drillDownCell && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setDrillDownCell(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>{drillDownCell.title}</h3>
                <p className={styles.modalSubtitle}>
                  Granular Voucher Audit Ledger & Direct Beneficiary
                  Disbursements
                </p>
              </div>
              <button
                onClick={() => setDrillDownCell(null)}
                className={styles.btnCloseModal}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalSummaryBar}>
                <div>
                  Plan Head: <strong>{drillDownCell.headName}</strong> &bull;
                  Period: <strong>{drillDownCell.monthKey}</strong> &bull; Total
                  Vouchers: <strong>{drillDownCell.vouchers.length}</strong>
                </div>
                <div className={styles.modalSummaryHighlight}>
                  Total Expenditure: ₹ {formatInr(drillDownCell.totalAmount)}
                </div>
              </div>

              {drillDownCell.vouchers.length === 0 ? (
                <div
                  style={{
                    padding: '30px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '13px',
                  }}
                >
                  No individual vouchers recorded for this specific selection.
                </div>
              ) : (
                <table className={styles.voucherTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '35px' }}>#</th>
                      <th>Annexure</th>
                      <th>Resource Person / Vendor</th>
                      <th>Description / Purpose</th>
                      <th>Voucher / UTR No.</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDownCell.vouchers.map((v, i) => (
                      <tr key={v.id || i}>
                        <td>{i + 1}</td>
                        <td>
                          <span
                            style={{
                              fontWeight: 600,
                              color: '#4338ca',
                              fontSize: '11px',
                            }}
                          >
                            {v.annexureSource}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {v.expertOrVendor}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                            {v.designation}
                          </div>
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <span title={v.description}>{v.description}</span>
                        </td>
                        <td>
                          <code
                            style={{
                              fontSize: '11px',
                              background: '#f1f5f9',
                              padding: '2px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {v.voucherOrUtr}
                          </code>
                        </td>
                        <td>{v.date}</td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 600,
                            color: '#0f172a',
                          }}
                        >
                          {formatInr(v.paidAmount)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={`${styles.statusPill} ${
                              v.status === 'RECONCILED'
                                ? styles.statusReconciled
                                : v.status === 'AUDITED'
                                ? styles.statusAudited
                                : styles.statusVerified
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={handleExportDrillDownExcel}
                className={`${styles.btnExport} ${styles.btnExportExcel}`}
              >
                <span>📊</span> Export Selected Vouchers (Excel)
              </button>
              <button
                onClick={() => setDrillDownCell(null)}
                className={styles.btnExport}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

