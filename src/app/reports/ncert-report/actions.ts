'use server';

import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import {
  NCERT_HEAD_MAPPINGS,
  getAuthoritativeLedgerVouchers,
  VerifiedLedgerVoucher,
} from '@/lib/ncertFinancialService';
import { REAL_PM_EVIDYA_BUDGET_COMPONENTS } from '@/lib/fallbackData';
import {
  getAuthoritativeSanctionedBudgets,
  getCachedBudgetComponentsWithAnnexures,
} from '@/lib/budgetMasterService';
import { getAuthoritativeVideoLibrary, formatDurationSeconds, BundledVideoItem } from '@/lib/videoCatalogService';

export interface NcertColumnMeta {
  index: number;
  letter: string;
  headGroup: string;
  colName: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface VideoDetailItem {
  id: string;
  title: string;
  duration: string;
  durationSeconds: number;
  trade: string;
  subject: string;
  language: string;
  smeName: string;
  videoLink?: string;
  status: string;
  month: string;
}

export interface CapacityBuildingItem {
  programName: string;
  description: string;
  dates: string;
  durationDays: number;
  venue: string;
  participantsCount: number;
  targetAudience: string;
  outcome: string;
}

export interface HrDetailItem {
  role: string;
  approvedCount: number;
  filledCount: number;
  vacantCount: number;
  status: string;
  filledNames: string[];
  salaryExpenditure: number;
  accountingNote: string;
}

export interface FeedbackCampaignItem {
  campaignName: string;
  period: string;
  platforms: string[];
  targetAudience: string;
  impressions: number;
  views: number;
  newSubscribers: number;
  expenditure: number;
  voucherNo: string;
}

export interface ExceptionAuditItem {
  id: string;
  category: string;
  item: string;
  status: 'Verified' | 'Calculated' | 'Pending Verification' | 'Mapping Required' | 'Exception';
  details: string;
  auditTrail: string;
}

export interface NcertMonthlyRow {
  rowNumber: number; // 7 to 18
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  monthKey: string; // "Apr 2026", "May 2026", etc.
  monthDateStr: string; // "2026-04-01", etc. matching Excel Col C
  monthLabel: string; // "April 2026", etc.
  isQuarterFirstRow: boolean;

  // Head 1: Video Content Development (Cols D to L)
  videoCount: number; // Col D
  newTextbookBased: string; // Col E ("Yes" or "-")
  classGrade: string; // Col F ("Vocational Education" or "-")
  subjects: string; // Col G
  generalFiller: string; // Col H ("General" or "-")
  language: string; // Col I ("English" / "Hindi" / "Regional")
  totalDurationStr: string; // Col J (HH:MM:SS)
  totalDurationHours: number; // Decimal hours
  fundUtilizedVideo: number; // Col K
  fundBalanceVideo: number; // Col L

  // Head 2: Capacity Building (Cols M to S)
  trainingPlanned: string; // Col M
  trainingConducted: string; // Col N
  trainingDates: string; // Col O
  participantsTrained: string; // Col P
  trainingOutcome: string; // Col Q
  fundUtilizedCapacity: number; // Col R
  fundBalanceCapacity: number; // Col S

  // Head 3: Human Resource (Cols T to Y)
  hrApprovedPosts: string; // Col T ("10" or "-")
  hrHiringStatus: string; // Col U ("Onboarded" / "Selection Process" / "-")
  hrFilledPosts: string; // Col V ("3" or "-")
  hrVacantPosts: string; // Col W ("7" or "-")
  fundUtilizedHr: number; // Col X
  fundBalanceHr: number; // Col Y

  // Head 4: Archive / Bandwidth / Networking (Cols Z to AD)
  infraRequired: string; // Col Z
  infraStatus: string; // Col AA
  infraComment: string; // Col AB
  fundUtilizedArchive: number; // Col AC
  fundBalanceArchive: number; // Col AD

  // Head 5: Telecast Setup in Schools (Cols AE to AJ)
  targetSchools: string; // Col AE
  schoolsWithTv: string; // Col AF
  schoolsWithDth: string; // Col AG
  totalSchoolsSetup: string; // Col AH
  fundUtilizedTelecast: number; // Col AI
  fundBalanceTelecast: number; // Col AJ

  // Head 6: Feedback / Research / Advocacy (Cols AK to AP)
  feedbackActivities: string; // Col AK
  feedbackTarget: string; // Col AL
  feedbackOutcome: string; // Col AM
  feedbackRemarks: string; // Col AN
  fundUtilizedFeedback: number; // Col AO
  fundBalanceFeedback: number; // Col AP

  // Total Fund (Cols AQ & AR)
  monthlyTotalUtilized: number; // Col AQ
  cumulativeBalanceTotal: number; // Col AR

  // Compliance (Cols AS & AT)
  complianceSoe: string; // Col AS
  complianceGfr12a: string; // Col AT

  // Interactive drill-down identifiers
  hasDrillDown: boolean;
  videoItems?: VideoDetailItem[];
  voucherItems?: VerifiedLedgerVoucher[];
  capacityItem?: CapacityBuildingItem;
  hrItem?: HrDetailItem;
  feedbackItem?: FeedbackCampaignItem;
}

export interface NcertQuarterSummary {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  title: string;
  months: string[];
  totalVideoCount: number;
  totalDurationStr: string;
  totalDurationSeconds: number;
  fundUtilizedVideo: number;
  fundUtilizedCapacity: number;
  fundUtilizedHr: number;
  fundUtilizedArchive: number;
  fundUtilizedTelecast: number;
  fundUtilizedFeedback: number;
  totalQuarterExpenditure: number;
}

export interface NcertReportData {
  metadata: {
    title: string;
    academicYear: string;
    organization: string;
    channels: string;
    nodalOfficer: string;
    contactDetails: string;
    statementDate: string;
    budgetMode: 'ncert' | 'portal';
    accountingBasis: 'template_accrual' | 'full_consolidated';
    allocations: {
      head1Video: number;
      head2Capacity: number;
      head3Hr: number;
      head4Archive: number;
      head5Telecast: number;
      head6Feedback: number;
      totalAllocation: number;
    };
  };
  kpis: {
    totalAllocation: number;
    totalExpenditure: number;
    balanceAvailable: number;
    utilizationPercent: number;
    totalVideosCount: number;
    totalVideoDuration: string;
    capacitySessionsCount: number;
    totalParticipantsTrained: number;
    hrPostsFilled: number;
    hrPostsApproved: number;
    hrPostsVacant: number;
    sourceVouchersCount: number;
  };
  rows: NcertMonthlyRow[];
  quarterSummaries: NcertQuarterSummary[];
  grandTotals: {
    totalVideoCount: number;
    totalDurationStr: string;
    fundUtilizedVideo: number;
    fundUtilizedCapacity: number;
    fundUtilizedHr: number;
    fundUtilizedArchive: number;
    fundUtilizedTelecast: number;
    fundUtilizedFeedback: number;
    grandTotalExpenditure: number;
    grandBalanceAvailable: number;
    grandUtilizationPercent: number;
  };
  exceptionAudits: ExceptionAuditItem[];
  allVouchers: VerifiedLedgerVoucher[];
  allVideos: VideoDetailItem[];
}

// -----------------------------------------------------------------------------
// Live Database Video Retrieval & Topic-Level Aggregation
// -----------------------------------------------------------------------------
async function getVideosFromDatabase(): Promise<VideoDetailItem[]> {
  const videos = await getAuthoritativeVideoLibrary();
  return videos.map((v) => ({
    id: v.id,
    title: v.title,
    duration: v.duration,
    durationSeconds: v.durationSeconds,
    trade: v.trade,
    subject: v.subject,
    language: 'English / Hindi',
    smeName: v.smeName,
    videoLink: v.videoLink,
    status: v.status,
    month: v.month,
  }));
}

// Convert seconds into HH:MM:SS (supports > 24 hours)
function formatDuration(totalSeconds: number): string {
  return formatDurationSeconds(totalSeconds);
}

// All 45 Official NCERT Columns Meta
export async function getNcertColumnsMeta(): Promise<NcertColumnMeta[]> {
  const metaPath = path.join(process.cwd(), 'scripts', 'ncert_columns_meta.json');
  if (fs.existsSync(metaPath)) {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  }
  return [];
}

const FISCAL_YEAR_2026_2027_MONTHS = [
  'Apr 2026',
  'May 2026',
  'Jun 2026',
  'Jul 2026',
  'Aug 2026',
  'Sep 2026',
  'Oct 2026',
  'Nov 2026',
  'Dec 2026',
  'Jan 2027',
  'Feb 2027',
  'Mar 2027',
];

// Dynamic Database Synchronization: Query Shared Cross-Lambda Annexures Cache for NCERT Report
export async function fetchLiveNcertVouchers(): Promise<VerifiedLedgerVoucher[]> {
  try {
    const components = await getCachedBudgetComponentsWithAnnexures();

    const liveVouchers: VerifiedLedgerVoucher[] = [];
    components.forEach((c: any) => {
      if (c.componentNo > 6) return; // Component 7 (Studio Upgradation) is offline-only

      const headName = NCERT_HEAD_MAPPINGS.find((co) => co.headId === c.componentNo)?.ncertHeadName || c.name;

      const getMonthKey = (dateStr?: string | Date | null, periodStr?: string | null): string => {
        const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        const testStr = `${periodStr || ''} ${dateStr || ''}`.trim();

        // 1. Direct match with "Mmm YYYY" e.g. "Jul 2026"
        for (const m of FISCAL_YEAR_2026_2027_MONTHS) {
          if (testStr.includes(m)) return m;
        }

        // 2. Check for DD.MM.YYYY e.g. "21.07.2026" or "11.08.2026" or "04.09.2026"
        const ddmmyyyy = testStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (ddmmyyyy) {
          const monthIdx = parseInt(ddmmyyyy[2], 10) - 1;
          const year = ddmmyyyy[3];
          if (monthIdx >= 0 && monthIdx < 12) {
            const candidate = `${mNames[monthIdx]} ${year}`;
            if (FISCAL_YEAR_2026_2027_MONTHS.includes(candidate)) return candidate;
          }
        }

        // 3. Check for DD-Mmm-YY or DD-Mmm-YYYY e.g. "12-Aug-26" or "19-Aug-2026"
        const ddmmmyy = testStr.match(/(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})/);
        if (ddmmmyy) {
          const mStr = ddmmmyy[2].toLowerCase();
          const monthIdx = mNames.findIndex((mn) => mn.toLowerCase() === mStr);
          let year = ddmmmyy[3];
          if (year.length === 2) year = '20' + year;
          if (monthIdx >= 0) {
            const candidate = `${mNames[monthIdx]} ${year}`;
            if (FISCAL_YEAR_2026_2027_MONTHS.includes(candidate)) return candidate;
          }
        }

        // 4. Check for full month name e.g. "September 2026" or "September"
        for (let i = 0; i < fullMonths.length; i++) {
          if (testStr.toLowerCase().includes(fullMonths[i].toLowerCase())) {
            const candidate = `${mNames[i]} 2026`;
            if (FISCAL_YEAR_2026_2027_MONTHS.includes(candidate)) return candidate;
          }
        }

        // 5. Standard Date parse
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const candidate = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
            if (FISCAL_YEAR_2026_2027_MONTHS.includes(candidate)) return candidate;
          }
        }

        if (testStr.includes('Initial Migration')) return 'Jul 2026';

        return 'Oct 2026';
      };

      c.annexureI?.forEach((item: any) => {
        const mKey = getMonthKey(item.transactionDate, item.datePeriod);
        const amount = Number(item.totalExpenditure) || Number(item.honorarium) || 0;
        liveVouchers.push({
          id: item.id,
          headId: 1,
          headName,
          accountingMonth: mKey,
          settlementMonth: mKey,
          annexureSource: 'Annexure I',
          expertOrVendor: item.expertName,
          designation: item.designation,
          description: item.activity,
          voucherOrUtr: item.voucherNo || item.utrNumber || item.id,
          date: item.transactionDate ? new Date(item.transactionDate).toISOString().split('T')[0] : '2026-09-08',
          claimedAmount: amount,
          approvedAmount: amount,
          paidAmount: amount,
          status: 'VERIFIED',
        });
      });

      c.annexureII?.forEach((item: any) => {
        const mKey = getMonthKey(item.datePeriod, item.datePeriod);
        const amount = Number(item.totalExpenditure) || 0;
        liveVouchers.push({
          id: item.id,
          headId: 2,
          headName,
          accountingMonth: mKey,
          settlementMonth: mKey,
          annexureSource: 'Annexure II',
          expertOrVendor: item.participant,
          designation: item.trainingType,
          description: item.trainingName,
          voucherOrUtr: item.utrNumber || item.id,
          date: '2026-08-19',
          claimedAmount: amount,
          approvedAmount: amount,
          paidAmount: amount,
          status: 'VERIFIED',
        });
      });

      c.annexureIII?.forEach((item: any) => {
        let mKey = getMonthKey(item.transactionDate, item.datePeriod);
        if (item.voucherNo === 'JV20000062/26-27' || item.utrNumber === 'JV20000062/26-27' || item.description?.includes('September') || item.workPeriod?.includes('September')) {
          mKey = 'Sep 2026';
        } else if (item.voucherNo === 'JV20000078/26-27' || item.utrNumber === 'JV20000078/26-27' || item.description?.includes('October')) {
          mKey = 'Oct 2026';
        }
        const amount = Number(item.totalExpenditure) || Number(item.remuneration) || 0;
        liveVouchers.push({
          id: item.id,
          headId: 3,
          headName,
          accountingMonth: mKey,
          settlementMonth: 'Oct 2026',
          annexureSource: 'Annexure III',
          expertOrVendor: item.personnelName,
          designation: item.designation,
          description: item.supportType || item.remarks || '',
          voucherOrUtr: item.voucherNo || item.utrNumber || item.id,
          date: item.transactionDate ? new Date(item.transactionDate).toISOString().split('T')[0] : '2026-10-07',
          claimedAmount: amount,
          approvedAmount: amount,
          paidAmount: amount,
          status: 'VERIFIED',
        });
      });

      const c4Records = (c.componentNo === 4 && (!c.annexureIV || c.annexureIV.length === 0))
        ? (REAL_PM_EVIDYA_BUDGET_COMPONENTS.find((rc: any) => rc.componentNo === 4)?.annexureIV || [])
        : (c.annexureIV || []);

      c4Records.forEach((item: any) => {
        const mKey = getMonthKey(item.transactionDate, item.datePeriod || item.servicePeriod);
        const amount = Number(item.totalExpenditure) || Number(item.expenditure) || 0;
        liveVouchers.push({
          id: item.id,
          headId: 4,
          headName,
          accountingMonth: mKey,
          settlementMonth: mKey,
          annexureSource: 'Annexure IV',
          expertOrVendor: item.vendor || item.name || 'National Informatics Centre / Media Cloud CDN',
          designation: item.coaName || 'Digital Infrastructure / Archive',
          description: item.narration || item.description || item.service || '',
          voucherOrUtr: item.voucher || item.utrNumber || item.invoiceNo || item.purchaseRef || item.id,
          date: item.transactionDate
            ? new Date(item.transactionDate).toISOString().split('T')[0]
            : '2026-08-06',
          claimedAmount: amount,
          approvedAmount: amount,
          paidAmount: amount,
          status: 'VERIFIED',
        });
      });

      c.annexureV?.forEach((item: any) => {
        const mKey = getMonthKey(null, item.datePeriod);
        const amount = Number(item.totalExpenditure) || 0;
        liveVouchers.push({
          id: item.id,
          headId: 5,
          headName,
          accountingMonth: mKey,
          settlementMonth: mKey,
          annexureSource: 'Annexure V',
          expertOrVendor: item.vendor,
          designation: 'Distribution Provider',
          description: item.activity,
          voucherOrUtr: item.utrNumber || item.invoiceNo || item.id,
          date: item.datePeriod?.includes('Sep') ? '2026-09-15' : '2026-08-18',
          claimedAmount: amount,
          approvedAmount: amount,
          paidAmount: 0, // School Telecast paid is 0
          status: 'VERIFIED',
        });
      });

      c.annexureVI?.forEach((item: any) => {
        const mKey = getMonthKey(null, item.datePeriod);
        const amount = Number(item.totalExpenditure) || Number(item.amount) || 0;
        liveVouchers.push({
          id: item.id,
          headId: 6,
          headName,
          accountingMonth: mKey,
          settlementMonth: mKey,
          annexureSource: 'Annexure VI',
          expertOrVendor: item.serviceProvider,
          designation: 'Advocacy Platforms',
          description: item.campaignDesc,
          voucherOrUtr: item.utrNumber || item.id,
          date: item.datePeriod?.includes('Aug') ? '2026-08-31' : '2026-07-28',
          claimedAmount: amount,
          approvedAmount: amount,
          paidAmount: amount,
          status: 'VERIFIED',
        });
      });
    });

    return liveVouchers;
  } catch (err) {
    console.warn('Live NCERT vouchers fetch fallback:', err);
    return [];
  }
}

function mergeUniqueNcertVouchers(baseline: VerifiedLedgerVoucher[], live: VerifiedLedgerVoucher[]): VerifiedLedgerVoucher[] {
  const map = new Map<string, VerifiedLedgerVoucher>();

  baseline.forEach((v) => {
    const key = `${(v.voucherOrUtr || v.id).toUpperCase()}_${v.headId}`;
    map.set(key, v);
  });

  live.forEach((v) => {
    const key = `${(v.voucherOrUtr || v.id).toUpperCase()}_${v.headId}`;
    if (!map.has(key)) {
      map.set(key, v);
    } else {
      const existing = map.get(key)!;
      map.set(key, {
        ...existing,
        ...v,
        accountingMonth: v.accountingMonth || existing.accountingMonth,
        settlementMonth: v.settlementMonth || existing.settlementMonth,
        paidAmount: v.paidAmount
      });
    }
  });

  return Array.from(map.values());
}

// Main Data Aggregation Engine for NCERT Report
export async function getNcertReportData(options?: {
  budgetMode?: 'ncert' | 'portal';
  accountingBasis?: 'template_accrual' | 'full_consolidated';
}): Promise<NcertReportData> {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER']);

  const budgetMode = options?.budgetMode || 'portal';
  const accountingBasis = options?.accountingBasis || 'full_consolidated';

  // Parallelize shared-cached fetches: authoritative budgets, vouchers, and video catalog
  const [budgetMaster, liveDbVouchers, allVideos] = await Promise.all([
    getAuthoritativeSanctionedBudgets(),
    fetchLiveNcertVouchers(),
    getVideosFromDatabase(),
  ]);

  // Budget allocations: dynamically populated from canonical Budget Master
  const allocations = {
    head1Video: budgetMaster.componentBudgetMap[1] ?? 10000000,
    head2Capacity: budgetMaster.componentBudgetMap[2] ?? 1000000,
    head3Hr: budgetMaster.componentBudgetMap[3] ?? 7200000,
    head4Archive: budgetMaster.componentBudgetMap[4] ?? 500000,
    head5Telecast: budgetMaster.componentBudgetMap[5] ?? 500000,
    head6Feedback: budgetMaster.componentBudgetMap[6] ?? 500000,
    totalAllocation: budgetMaster.totalSanctionedBudget > 0 ? budgetMaster.totalSanctionedBudget : 19700000,
  };

  // Authoritatively use live Annexure vouchers from Budget Master directly
  // Fall back to baseline vouchers ONLY if database query returns 0 records
  const allVouchers = liveDbVouchers.length > 0 ? liveDbVouchers : getAuthoritativeLedgerVouchers();

  // 12 Reporting Months in Fiscal Year 2026-2027 matching Excel Col C
  const monthsConfig: Array<{
    rowNumber: number;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    monthKey: string;
    monthDateStr: string;
    monthLabel: string;
    isQuarterFirstRow: boolean;
  }> = [
      { rowNumber: 7, quarter: 'Q1', monthKey: 'Apr 2026', monthDateStr: '2026-04-01', monthLabel: 'April 2026', isQuarterFirstRow: true },
      { rowNumber: 8, quarter: 'Q1', monthKey: 'May 2026', monthDateStr: '2026-05-01', monthLabel: 'May 2026', isQuarterFirstRow: false },
      { rowNumber: 9, quarter: 'Q1', monthKey: 'Jun 2026', monthDateStr: '2026-06-01', monthLabel: 'June 2026', isQuarterFirstRow: false },
      { rowNumber: 10, quarter: 'Q2', monthKey: 'Jul 2026', monthDateStr: '2026-07-01', monthLabel: 'July 2026', isQuarterFirstRow: true },
      { rowNumber: 11, quarter: 'Q2', monthKey: 'Aug 2026', monthDateStr: '2026-08-01', monthLabel: 'August 2026', isQuarterFirstRow: false },
      { rowNumber: 12, quarter: 'Q2', monthKey: 'Sep 2026', monthDateStr: '2026-09-01', monthLabel: 'September 2026', isQuarterFirstRow: false },
      { rowNumber: 13, quarter: 'Q3', monthKey: 'Oct 2026', monthDateStr: '2026-10-01', monthLabel: 'October 2026', isQuarterFirstRow: true },
      { rowNumber: 14, quarter: 'Q3', monthKey: 'Nov 2026', monthDateStr: '2026-11-01', monthLabel: 'November 2026', isQuarterFirstRow: false },
      { rowNumber: 15, quarter: 'Q3', monthKey: 'Dec 2026', monthDateStr: '2026-12-01', monthLabel: 'December 2026', isQuarterFirstRow: false },
      { rowNumber: 16, quarter: 'Q4', monthKey: 'Jan 2027', monthDateStr: '2027-01-01', monthLabel: 'January 2027', isQuarterFirstRow: true },
      { rowNumber: 17, quarter: 'Q4', monthKey: 'Feb 2027', monthDateStr: '2027-02-01', monthLabel: 'February 2027', isQuarterFirstRow: false },
      { rowNumber: 18, quarter: 'Q4', monthKey: 'Mar 2027', monthDateStr: '2027-03-01', monthLabel: 'March 2027', isQuarterFirstRow: false },
    ];

  // Cumulative running spend trackers for Excel formula replication:
  // L{i} = $G$4 - SUM(K$7:K{i})
  // S{i} = $H$4 - SUM(R$7:R{i})
  // Y{i} = $I$4 - SUM(X$7:X{i})
  // AD{i} = $J$4 - SUM(AC$7:AC{i})
  // AJ{i} = $K$4 - SUM(AI$7:AI{i})
  // AP{i} = $L$4 - SUM(AO$7:AO{i})
  // AR{i} = $M$4 - SUM(AQ$7:AQ{i})
  let cumSpentVideo = 0;
  let cumSpentCapacity = 0;
  let cumSpentHr = 0;
  let cumSpentArchive = 0;
  let cumSpentTelecast = 0;
  let cumSpentFeedback = 0;
  let cumSpentTotal = 0;

  const rows: NcertMonthlyRow[] = monthsConfig.map((mCfg) => {
    const { rowNumber, quarter, monthKey, monthDateStr, monthLabel, isQuarterFirstRow } = mCfg;

    // Filter underlying records for this month
    const monthVouchers = allVouchers.filter((v) => {
      // In template_accrual, use accountingMonth (Work Period); in cash_settlement, use settlementMonth
      return v.accountingMonth === monthKey;
    });
    const monthVideos = allVideos.filter((v) => v.month === monthKey);

    // Head 1: Video Content Development (Cols D to L)
    let videoCount = monthVideos.length;
    let newTextbook = '-';
    let classGrade = '-';
    let generalFiller = '-';
    let language = '-';
    let subjectsStr = '-';
    let totalDurationSec = 0;
    let totalDurationStr = '00:00:00';

    const publishedMonthVideos = monthVideos.filter((v) => v.videoLink && v.videoLink.startsWith('http'));
    if (monthKey === 'Apr 2026' || monthKey === 'May 2026' || (monthKey === 'Jun 2026' && publishedMonthVideos.length === 0)) {
      videoCount = 0;
      subjectsStr = '-';
      generalFiller = '-';
      language = '-';
      totalDurationStr = '';
      totalDurationSec = 0;
    } else if (monthVideos.length > 0) {
      videoCount = monthVideos.length;
      totalDurationSec = monthVideos.reduce((acc, v) => acc + (v.durationSeconds || 0), 0);
      totalDurationStr = totalDurationSec > 0 ? formatDuration(totalDurationSec) : '00:00:00';
      classGrade = 'Vocational Education';
      generalFiller = 'General';
      language = 'English / Hindi';
      const uniqueTrades = Array.from(new Set(monthVideos.map((v) => v.trade || v.subject).filter(Boolean)));
      if (uniqueTrades.length > 0) {
        subjectsStr = uniqueTrades.map((t, idx) => `${idx + 1}. ${t}`).join('\n');
      }
    } else {
      videoCount = 0;
      subjectsStr = '-';
      generalFiller = '-';
      language = '-';
      totalDurationStr = '';
      totalDurationSec = 0;
    }

    const totalDurationHours = Number((totalDurationSec / 3600).toFixed(2));

    // Video Fund Utilized (Col K) - dynamically reflect live vouchers
    const fundUtilizedVideo = monthVouchers
      .filter((v) => v.headId === 1)
      .reduce((sum, v) => sum + v.paidAmount, 0);
    cumSpentVideo += fundUtilizedVideo;
    const fundBalanceVideo = allocations.head1Video - cumSpentVideo;

    // Head 2: Capacity Building (Cols M to S)
    let trainingPlanned = '';
    let trainingConducted = '';
    let trainingDates = '';
    let participantsTrained = '';
    let trainingOutcome = '';
    let capacityItem: CapacityBuildingItem | undefined;

    if (monthKey === 'Jul 2026') {
      trainingPlanned = 'PM eVidya capacity Building Programme for Digital content development @ NIMI Chennai';
      trainingConducted = 'Conducted 01 Programme for the trainers and stakeholders of the 06 PM eVidya channels under MSDE';
      trainingDates = '30.07.2026 & 31.07.2026\n(02 Days Capacity Building programme)';
      participantsTrained = '35';
      capacityItem = {
        programName: 'PM eVidya Capacity Building Programme for Digital Content Development',
        description: 'Comprehensive 2-day hands-on workshop for subject matter experts, scriptwriters, and media editors of Channels 22 to 27.',
        dates: '30.07.2026 & 31.07.2026',
        durationDays: 2,
        venue: 'NIMI Campus, Guindy, Chennai',
        participantsCount: 35,
        targetAudience: 'Master Trainers, ITI Instructors, Subject Matter Experts (SMEs)',
        outcome: '35 Master Trainers certified on script writing, studio teleprompter delivery, video editing, and IPR compliance.',
      };
    }

    // Capacity Fund Utilized (Col R) - dynamically reflect live vouchers
    const fundUtilizedCapacity = monthVouchers
      .filter((v) => v.headId === 2)
      .reduce((sum, v) => sum + v.paidAmount, 0);
    cumSpentCapacity += fundUtilizedCapacity;
    const fundBalanceCapacity = allocations.head2Capacity - cumSpentCapacity;

    // Head 3: Human Resource (Cols T to Y)
    let hrApprovedPosts = '';
    let hrHiringStatus = '';
    let hrFilledPosts = '';
    let hrVacantPosts = '';
    let hrItem: HrDetailItem | undefined;

    // HR Fund Utilized (Col X) - dynamically reflect live vouchers
    const voucherHrSpend = monthVouchers
      .filter((v) => v.headId === 3)
      .reduce((sum, v) => sum + v.paidAmount, 0);
    const fundUtilizedHr = voucherHrSpend;
    cumSpentHr += fundUtilizedHr;
    const fundBalanceHr = allocations.head3Hr - cumSpentHr;

    if (monthKey === 'Sep 2026' || monthKey === 'Oct 2026') {
      hrApprovedPosts = '10';
      hrHiringStatus = 'Onboarded';
      hrFilledPosts = '3';
      hrVacantPosts = '7';
      hrItem = {
        role: 'PM e-Vidya Operational Technical & Creative Personnel',
        approvedCount: 10,
        filledCount: 3,
        vacantCount: 7,
        status: 'Onboarded',
        filledNames: [
          'Senior Project Consultant / Technical Coordinator (JV20000062/26-27)',
          'Lead Studio Video Editor & Motion Graphics Specialist',
          'Technical Assistant / Streaming Infrastructure Operator',
        ],
        salaryExpenditure: voucherHrSpend,
        accountingNote: monthKey === 'Sep 2026'
          ? 'Work period September 2026 Consultant Remuneration (settled 07-Oct-2026)'
          : 'Work period October 2026 Operational Staff Remuneration',
      };
    }

    // Head 4: Archive / Bandwidth / Networking (Cols Z to AD)
    let infraRequired = '';
    let infraStatus = '';
    let infraComment = '';
    // Archive Fund Utilized (Col AD) - dynamically reflect live vouchers
    const fundUtilizedArchive = monthVouchers
      .filter((v) => v.headId === 4)
      .reduce((sum, v) => sum + v.paidAmount, 0);
    cumSpentArchive += fundUtilizedArchive;
    const fundBalanceArchive = allocations.head4Archive - cumSpentArchive;

    // Head 5: Telecast Setup in Schools (Cols AE to AJ)
    let targetSchools = '';
    let schoolsWithTv = '';
    let schoolsWithDth = '';
    let totalSchoolsSetup = '';
    // Telecast Fund Utilized (Col AJ) - dynamically reflect live vouchers
    const fundUtilizedTelecast = monthVouchers
      .filter((v) => v.headId === 5)
      .reduce((sum, v) => sum + v.paidAmount, 0);
    cumSpentTelecast += fundUtilizedTelecast;
    const fundBalanceTelecast = allocations.head5Telecast - cumSpentTelecast;

    // Head 6: Feedback / Research / Advocacy (Cols AK to AP)
    let feedbackActivities = '';
    let feedbackTarget = '';
    let feedbackOutcome = '';
    let feedbackRemarks = '';
    let feedbackItem: FeedbackCampaignItem | undefined;

    // Feedback Fund Utilized (Col AO) - dynamically reflect live vouchers
    const voucherFeedbackSpend = monthVouchers
      .filter((v) => v.headId === 6)
      .reduce((sum, v) => sum + v.paidAmount, 0);
    const fundUtilizedFeedback = voucherFeedbackSpend;
    cumSpentFeedback += fundUtilizedFeedback;
    const fundBalanceFeedback = allocations.head6Feedback - cumSpentFeedback;

    if (monthKey === 'Jul 2026') {
      feedbackActivities = 'The campaign is a paid advertising via Meta & Google advertisement strategies to maximize awareness for promote PM e-Vidya YouTube channel. \n\nMultiple content formats including videos, reels, posters, stories, and creatives were utilized to improve audience reach and engagement\n\nCampaign Period: 21st July to 31st July 2026';
      feedbackTarget = 'The awareness campaign successfully generated visibility among ITI, Diploma,\nEngineering, and vocational students across multiple regions.';
      feedbackOutcome = 'Total Impressions: 1,29,89,732\nTotal views Generated: 140,202 views\nNew Subscribers: 67';
      feedbackRemarks = '-';
      feedbackItem = {
        campaignName: 'PM e-Vidya Campaign 1.0 (Student Outreach)',
        period: '21st July – 31st July 2026',
        platforms: ['Meta Ads (Instagram & Facebook)', 'Google Ads / YouTube Video Ads'],
        targetAudience: 'ITI, Diploma, and Engineering Students across regions',
        impressions: 12989732,
        views: 140202,
        newSubscribers: 67,
        expenditure: voucherFeedbackSpend,
        voucherNo: 'CN2/00150/26-27',
      };
    } else if (monthKey === 'Aug 2026') {
      feedbackActivities = 'The PM e-Vidya Campaign 2.0 was run as a paid awareness campaign to promote the PM e-Vidya platform and grow views and subscribers on its YouTube channels, NIMI_OFFICIAL_SKILL SAKTHI and NIMI_OFFICIAL_SKILL INDIA, using Meta Ads and Google Ads.\n\nCampaign Period: 15 SEP – 30 SEP 2026';
      feedbackTarget = 'Across both channels, YouTube recorded 82,754 views in the campaign period, and most of the reach came from the 18–24 age group, which falls within the 18–28 target audience.\n\nSubscriber growth was modest: +81 new subscribers against 82,754 views. The campaign was therefore stronger at building reach and views than at converting viewers into subscribers.';
      feedbackOutcome = 'Total Impressions: 57,87,762\nTotal Views generated: 87,041 views\nNew Subscribers: 81+\n';
      feedbackRemarks = '';
      feedbackItem = {
        campaignName: 'PM e-Vidya Campaign 2.0 (Skill Sakthi & Skill India)',
        period: '15th September – 30th September 2026 (Booked August 2026)',
        platforms: ['Meta Ads', 'Google Ads', 'YouTube In-Feed Video Ads'],
        targetAudience: 'Youth Learners, Vocational Trainees, Polytechnic Students',
        impressions: 5787762,
        views: 87041,
        newSubscribers: 81,
        expenditure: voucherFeedbackSpend,
        voucherNo: 'CN2/001940/26-27',
      };
    }

    // Total Monthly Utilized & Cumulative Balance (Cols AQ & AR)
    const monthlyTotalUtilized =
      fundUtilizedVideo +
      fundUtilizedCapacity +
      fundUtilizedHr +
      fundUtilizedArchive +
      fundUtilizedTelecast +
      fundUtilizedFeedback;
    cumSpentTotal += monthlyTotalUtilized;
    const cumulativeBalanceTotal = allocations.totalAllocation - cumSpentTotal;

    // Compliance Status (SoE and GFR 12-A)
    let complianceSoe = '';
    let complianceGfr12a = '';

    if (['Apr 2026', 'May 2026', 'Jun 2026'].includes(monthKey)) {
      complianceSoe = 'Submitted (Q1)';
      complianceGfr12a = 'Submitted (Q1)';
    } else if (['Jul 2026', 'Aug 2026', 'Sep 2026'].includes(monthKey)) {
      complianceSoe = 'Submitted (Q2)';
      complianceGfr12a = 'Submitted (Q2)';
    } else if (['Oct 2026'].includes(monthKey)) {
      complianceSoe = 'In Preparation (Q3)';
      complianceGfr12a = 'In Preparation (Q3)';
    } else {
      complianceSoe = 'Due';
      complianceGfr12a = 'Due';
    }

    const hasDrillDown =
      videoCount > 0 ||
      fundUtilizedHr > 0 ||
      fundUtilizedFeedback > 0 ||
      fundUtilizedVideo > 0 ||
      fundUtilizedCapacity > 0 ||
      capacityItem !== undefined ||
      hrItem !== undefined ||
      feedbackItem !== undefined;

    return {
      rowNumber,
      quarter,
      monthKey,
      monthDateStr,
      monthLabel,
      isQuarterFirstRow,

      videoCount,
      newTextbookBased: newTextbook,
      classGrade,
      subjects: subjectsStr,
      generalFiller,
      language,
      totalDurationStr,
      totalDurationHours,
      fundUtilizedVideo,
      fundBalanceVideo,

      trainingPlanned,
      trainingConducted,
      trainingDates,
      participantsTrained,
      trainingOutcome,
      fundUtilizedCapacity,
      fundBalanceCapacity,

      hrApprovedPosts,
      hrHiringStatus,
      hrFilledPosts,
      hrVacantPosts,
      fundUtilizedHr,
      fundBalanceHr,

      infraRequired,
      infraStatus,
      infraComment,
      fundUtilizedArchive,
      fundBalanceArchive,

      targetSchools,
      schoolsWithTv,
      schoolsWithDth,
      totalSchoolsSetup,
      fundUtilizedTelecast,
      fundBalanceTelecast,

      feedbackActivities,
      feedbackTarget,
      feedbackOutcome,
      feedbackRemarks,
      fundUtilizedFeedback,
      fundBalanceFeedback,

      monthlyTotalUtilized,
      cumulativeBalanceTotal,

      complianceSoe,
      complianceGfr12a,

      hasDrillDown,
      videoItems: monthVideos,
      voucherItems: monthVouchers,
      capacityItem,
      hrItem,
      feedbackItem,
    };
  });

  // Calculate Quarter Summaries (Q1 to Q4)
  const quarterSummaries: NcertQuarterSummary[] = ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
    const qRows = rows.filter((r) => r.quarter === q);
    const totalVideoCount = qRows.reduce((acc, r) => acc + r.videoCount, 0);
    const totalSec = qRows.reduce((acc, r) => {
      const parts = r.totalDurationStr.split(':').map(Number);
      return acc + (parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0);
    }, 0);

    const fVideo = qRows.reduce((acc, r) => acc + r.fundUtilizedVideo, 0);
    const fCapacity = qRows.reduce((acc, r) => acc + r.fundUtilizedCapacity, 0);
    const fHr = qRows.reduce((acc, r) => acc + r.fundUtilizedHr, 0);
    const fArchive = qRows.reduce((acc, r) => acc + r.fundUtilizedArchive, 0);
    const fTelecast = qRows.reduce((acc, r) => acc + r.fundUtilizedTelecast, 0);
    const fFeedback = qRows.reduce((acc, r) => acc + r.fundUtilizedFeedback, 0);
    const totalQuarterExpenditure = qRows.reduce((acc, r) => acc + r.monthlyTotalUtilized, 0);

    const quarterTitles: Record<string, string> = {
      Q1: 'Quarter 1 (April 2026 – June 2026)',
      Q2: 'Quarter 2 (July 2026 – September 2026)',
      Q3: 'Quarter 3 (October 2026 – December 2026)',
      Q4: 'Quarter 4 (January 2027 – March 2027)',
    };

    return {
      quarter: q as 'Q1' | 'Q2' | 'Q3' | 'Q4',
      title: quarterTitles[q],
      months: qRows.map((r) => r.monthLabel),
      totalVideoCount,
      totalDurationStr: formatDuration(totalSec),
      totalDurationSeconds: totalSec,
      fundUtilizedVideo: fVideo,
      fundUtilizedCapacity: fCapacity,
      fundUtilizedHr: fHr,
      fundUtilizedArchive: fArchive,
      fundUtilizedTelecast: fTelecast,
      fundUtilizedFeedback: fFeedback,
      totalQuarterExpenditure,
    };
  });

  // Calculate Grand Totals across all 12 months
  const grandVideoCount = rows.reduce((acc, r) => acc + r.videoCount, 0);
  const grandDurationSec = rows.reduce((acc, r) => {
    const parts = r.totalDurationStr.split(':').map(Number);
    return acc + (parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0);
  }, 0);

  const grandUtilVideo = allVouchers.filter((v) => v.headId === 1).reduce((acc, v) => acc + (Number(v.paidAmount) || 0), 0);
  const grandUtilCapacity = allVouchers.filter((v) => v.headId === 2).reduce((acc, v) => acc + (Number(v.paidAmount) || 0), 0);
  const grandUtilHr = allVouchers.filter((v) => v.headId === 3).reduce((acc, v) => acc + (Number(v.paidAmount) || 0), 0);
  const grandUtilArchive = allVouchers.filter((v) => v.headId === 4).reduce((acc, v) => acc + (Number(v.paidAmount) || 0), 0);
  const grandUtilTelecast = allVouchers.filter((v) => v.headId === 5).reduce((acc, v) => acc + (Number(v.paidAmount) || 0), 0);
  const grandUtilFeedback = allVouchers.filter((v) => v.headId === 6).reduce((acc, v) => acc + (Number(v.paidAmount) || 0), 0);
  const grandTotalExpenditure = allVouchers.reduce((acc, v) => acc + (Number(v.paidAmount) || 0), 0);
  const grandBalanceAvailable = allocations.totalAllocation - grandTotalExpenditure;
  const grandUtilizationPercent = Number(
    (allocations.totalAllocation > 0 ? (grandTotalExpenditure / allocations.totalAllocation) * 100 : 0).toFixed(2)
  );

  // Exception and Data Completeness Audit Log (Section 16)
  const exceptionAudits: ExceptionAuditItem[] = [
    {
      id: 'exc-01',
      category: 'Human Resource',
      item: 'Consultant Salary Reconciliation (JV20000062/26-27)',
      status: 'Verified',
      details: 'Earned for Work Period September 2026 (₹1,45,000); settled via journal voucher on 07-Oct-2026. Accounted in Row 12 (September 2026) in NCERT Template.',
      auditTrail: 'Prisma AnnexureIII.cmuv30rkv000sg0qvl802pvu3 -> Ref: 00454/0001/26-2026/1',
    },
    {
      id: 'exc-02',
      category: 'Human Resource',
      item: 'Staff Remuneration Reconciliation (JV20000078/26-27)',
      status: 'Verified',
      details: 'October 2026 operational staffing remuneration (₹1,36,774). Accounted in Row 13 (October 2026) in NCERT Template.',
      auditTrail: 'NCERT Template StateUTAB:X13 -> Ref: JV20000078/26-27',
    },
    {
      id: 'exc-03',
      category: 'Feedback / Advocacy',
      item: 'Campaign 1.0 (Meta & Google Ads)',
      status: 'Verified',
      details: 'July 2026 student outreach campaign (₹60,000). Accounted in Row 10 (July 2026). Impressions: 1.29 Cr, Views: 1.40 Lakh.',
      auditTrail: 'Prisma AnnexureVI.cmup22i1u000bv0oyqax4yftp -> Voucher: CN2/00150/26-27',
    },
    {
      id: 'exc-04',
      category: 'Feedback / Advocacy',
      item: 'Campaign 2.0 (Skill Sakthi & Skill India)',
      status: 'Verified',
      details: 'August 2026 channel promotion campaign (₹40,000). Accounted in Row 11 (August 2026). Impressions: 57.87 Lakh, Views: 87,041.',
      auditTrail: 'NCERT Template StateUTAB:AO11 -> Voucher: CN2/001940/26-27',
    },
    {
      id: 'exc-05',
      category: 'Video Duration',
      item: `Runtime & Link Validation Across ${allVideos.length} Library Modules`,
      status: allVideos.length > 0 ? 'Verified' : 'Pending Verification',
      details: `${allVideos.filter((v) => v.videoLink && v.videoLink.startsWith('http')).length} published modules (${formatDuration(grandDurationSec)}) with streaming links verified; ${allVideos.filter((v) => !v.videoLink || !v.videoLink.startsWith('http')).length} in-progress/planned modules tracked across ${allVideos.length} catalog records.`,
      auditTrail: `VideoCatalogService (${allVideos.length} records) -> Topic durationSeconds & streaming link sync`,
    },
    {
      id: 'exc-06',
      category: 'Statutory Compliance',
      item: 'SoE & GFR 12-A Clearance',
      status: 'Verified',
      details: 'Quarter 1 (Apr-Jun) and Quarter 2 (Jul-Sep) submitted and audited. Quarter 3 in active preparation.',
      auditTrail: 'StateUTAB:AS7:AT18 -> Verified by Accounts Dept NIMI',
    },
  ];

  return {
    metadata: {
      title: 'Monthly / Quaterly Activity & Fund Tracker',
      academicYear: '2026-2027',
      organization: 'National Instructional Media Institute',
      channels: 'MSDE 22 to 27',
      nodalOfficer: 'M Rajeswari, ISDS',
      contactDetails: '9686040001',
      statementDate: '07-Oct-2026',
      budgetMode,
      accountingBasis,
      allocations,
    },
    kpis: {
      totalAllocation: allocations.totalAllocation,
      totalExpenditure: grandTotalExpenditure,
      balanceAvailable: grandBalanceAvailable,
      utilizationPercent: grandUtilizationPercent,
      totalVideosCount: grandVideoCount,
      totalVideoDuration: formatDuration(grandDurationSec),
      capacitySessionsCount: 1,
      totalParticipantsTrained: 35,
      hrPostsFilled: 3,
      hrPostsApproved: 10,
      hrPostsVacant: 7,
      sourceVouchersCount: allVouchers.length,
    },
    rows,
    quarterSummaries,
    grandTotals: {
      totalVideoCount: grandVideoCount,
      totalDurationStr: formatDuration(grandDurationSec),
      fundUtilizedVideo: grandUtilVideo,
      fundUtilizedCapacity: grandUtilCapacity,
      fundUtilizedHr: grandUtilHr,
      fundUtilizedArchive: grandUtilArchive,
      fundUtilizedTelecast: grandUtilTelecast,
      fundUtilizedFeedback: grandUtilFeedback,
      grandTotalExpenditure,
      grandBalanceAvailable,
      grandUtilizationPercent,
    },
    exceptionAudits,
    allVouchers,
    allVideos,
  };
}

// Export NCERT Report strictly based on official Excel Template
export async function exportNcertExcelReport(options?: {
  budgetMode?: 'ncert' | 'portal';
  accountingBasis?: 'template_accrual' | 'full_consolidated';
}): Promise<{ base64: string; filename: string }> {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER']);
  const budgetMode = options?.budgetMode || 'portal';
  const accountingBasis = options?.accountingBasis || 'full_consolidated';
  const data = await getNcertReportData({ budgetMode, accountingBasis });

  const templatePath = path.join(
    process.cwd(),
    'public',
    'templates',
    'Tracker-PM eVidya Fund to States, UTs  ABs.xlsx'
  );
  const XLSX = await import('xlsx');
  const wb = XLSX.readFile(templatePath, {
    cellFormula: true,
    cellStyles: true,
    cellNF: true,
  });
  const ws = wb.Sheets['StateUTAB'] || wb.Sheets[wb.SheetNames[0]];

  const setNumberCell = (ref: string, val: number) => {
    if (!ws[ref]) {
      ws[ref] = { t: 'n', v: val, z: '"₹"#,##0.00' };
    } else {
      ws[ref].v = val;
      ws[ref].t = 'n';
    }
  };

  const setStringCell = (ref: string, val: string) => {
    if (!ws[ref]) {
      ws[ref] = { t: 's', v: val };
    } else {
      ws[ref].v = val;
      ws[ref].t = 's';
    }
  };

  // Set allocations in row 4
  const alloc = data.metadata.allocations;
  setNumberCell('G4', alloc.head1Video);
  setNumberCell('H4', alloc.head2Capacity);
  setNumberCell('I4', alloc.head3Hr);
  setNumberCell('J4', alloc.head4Archive);
  setNumberCell('K4', alloc.head5Telecast);
  setNumberCell('L4', alloc.head6Feedback);

  // Preserve native spreadsheet formulas M4, N4, O4
  if (ws['M4']) ws['M4'].v = alloc.totalAllocation;
  if (ws['N4']) ws['N4'].v = data.kpis.totalExpenditure;
  if (ws['O4']) ws['O4'].v = data.kpis.balanceAvailable;

  // Set rows 7 to 18
  data.rows.forEach((r) => {
    const row = r.rowNumber;
    if (r.quarter) setStringCell(`B${row}`, r.quarter);

    // Head 1: Video Content Development (Cols D to L)
    if (r.videoCount > 0) {
      setStringCell(`D${row}`, String(r.videoCount).padStart(2, '0'));
    } else {
      setStringCell(`D${row}`, '');
    }
    setStringCell(`E${row}`, r.newTextbookBased === '-' ? '' : r.newTextbookBased);
    setStringCell(`F${row}`, r.classGrade === '-' ? '' : r.classGrade);
    setStringCell(`G${row}`, r.subjects);
    setStringCell(`H${row}`, r.generalFiller === '-' ? '' : r.generalFiller);
    setStringCell(`I${row}`, r.language === '-' ? '' : r.language);

    if (r.totalDurationStr && r.totalDurationStr !== '00:00:00') {
      setStringCell(`J${row}`, r.totalDurationStr);
    }

    if (r.fundUtilizedVideo > 0) {
      setNumberCell(`K${row}`, r.fundUtilizedVideo);
    } else if (row === 7) {
      setNumberCell(`K${row}`, 0);
    }
    if (ws[`L${row}`]) ws[`L${row}`].v = r.fundBalanceVideo;

    // Head 2: Capacity Building (Cols M to S)
    setStringCell(`M${row}`, r.trainingPlanned);
    setStringCell(`N${row}`, r.trainingConducted);
    setStringCell(`O${row}`, r.trainingDates);
    setStringCell(`P${row}`, r.participantsTrained);
    setStringCell(`Q${row}`, r.trainingOutcome);
    if (r.fundUtilizedCapacity > 0) {
      setNumberCell(`R${row}`, r.fundUtilizedCapacity);
    } else if (row === 7) {
      setNumberCell(`R${row}`, 0);
    }
    if (ws[`S${row}`]) ws[`S${row}`].v = r.fundBalanceCapacity;

    // Head 3: Human Resource (Cols T to Y)
    setStringCell(`T${row}`, r.hrApprovedPosts);
    setStringCell(`U${row}`, r.hrHiringStatus);
    setStringCell(`V${row}`, r.hrFilledPosts);
    setStringCell(`W${row}`, r.hrVacantPosts);
    if (r.fundUtilizedHr > 0) {
      setNumberCell(`X${row}`, r.fundUtilizedHr);
    } else if (row === 7) {
      setNumberCell(`X${row}`, 0);
    }
    if (ws[`Y${row}`]) ws[`Y${row}`].v = r.fundBalanceHr;

    // Head 4: Archive / Bandwidth / Networking (Cols Z to AD)
    setStringCell(`Z${row}`, r.infraRequired);
    setStringCell(`AA${row}`, r.infraStatus);
    setStringCell(`AB${row}`, r.infraComment);
    if (r.fundUtilizedArchive > 0) {
      setNumberCell(`AC${row}`, r.fundUtilizedArchive);
    } else if (row === 7) {
      setNumberCell(`AC${row}`, 0);
    }
    if (ws[`AD${row}`]) ws[`AD${row}`].v = r.fundBalanceArchive;

    // Head 5: Telecast Setup in Schools (Cols AE to AJ)
    setStringCell(`AE${row}`, r.targetSchools);
    setStringCell(`AF${row}`, r.schoolsWithTv);
    setStringCell(`AG${row}`, r.schoolsWithDth);
    setStringCell(`AH${row}`, r.totalSchoolsSetup);
    if (r.fundUtilizedTelecast > 0) {
      setNumberCell(`AI${row}`, r.fundUtilizedTelecast);
    } else if (row === 7) {
      setNumberCell(`AI${row}`, 0);
    }
    if (ws[`AJ${row}`]) ws[`AJ${row}`].v = r.fundBalanceTelecast;

    // Head 6: Feedback / Research / Advocacy (Cols AK to AP)
    setStringCell(`AK${row}`, r.feedbackActivities);
    setStringCell(`AL${row}`, r.feedbackTarget);
    setStringCell(`AM${row}`, r.feedbackOutcome);
    setStringCell(`AN${row}`, r.feedbackRemarks);
    if (r.fundUtilizedFeedback > 0) {
      setNumberCell(`AO${row}`, r.fundUtilizedFeedback);
    } else if (row === 7) {
      setNumberCell(`AO${row}`, 0);
    }
    if (ws[`AP${row}`]) ws[`AP${row}`].v = r.fundBalanceFeedback;

    // Total Fund (Cols AQ & AR)
    if (ws[`AQ${row}`]) ws[`AQ${row}`].v = r.monthlyTotalUtilized;
    if (ws[`AR${row}`]) ws[`AR${row}`].v = r.cumulativeBalanceTotal;

    // Compliance (Cols AS & AT)
    setStringCell(`AS${row}`, r.complianceSoe);
    setStringCell(`AT${row}`, r.complianceGfr12a);
  });

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filename = `Tracker-PM_eVidya_Fund_to_States_UTs_ABs_NIMI_${data.metadata.academicYear}.xlsx`;

  return { base64, filename };
}
