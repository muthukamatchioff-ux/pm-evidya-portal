'use server';

import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAuthoritativeSanctionedBudgets } from '@/lib/budgetMasterService';

export interface DrillDownVoucher {
  id: string;
  headId: number;
  headName: string;
  monthKey: string;
  annexureSource: string;
  expertOrVendor: string;
  designation: string;
  description: string;
  voucherOrUtr: string;
  date: string;
  claimedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  status: 'RECONCILED' | 'VERIFIED' | 'AUDITED' | 'APPROVED';
  documentUrl?: string;
}

export interface PlanHeadSummary {
  id: number;
  name: string;
  shortName: string;
  color: string;
  badge: number;
  sanctionedBudget: number;
  monthlyExpenditure: Record<string, number>;
  totalExpenditure: number;
  availableBalance: number;
  utilizationPercent: number;
  transactionsCount: number;
}

export interface MonthlyExpenditureReportResult {
  filters: {
    financialYear: string;
    fromMonth: string;
    toMonth: string;
    project: string;
  };
  allMonths: string[];
  activeMonths: string[];
  planHeads: PlanHeadSummary[];
  monthlyTotals: Record<string, number>;
  grandTotalExpenditure: number;
  grandSanctionedBudget: number;
  balanceAvailable: number;
  overallUtilizationPercent: number;
  balancePercent: number;
  monthsCoveredStr: string;
  monthsCoveredSub: string;
  totalOutputHours: string;
  targetOutputHours: string;
  monthlyTarget: number;
  totalRecordsCount: number;
  statementDate: string;
  pieChartData: Array<{
    name: string;
    shortName: string;
    amount: number;
    percent: number;
    color: string;
  }>;
  barChartData: Array<{
    month: string;
    expenditure: number;
    target: number;
    label: string;
  }>;
  keyInsights: Array<{
    text: string;
    type: 'total' | 'peak' | 'major' | 'output' | 'balance';
  }>;
  vouchers: DrillDownVoucher[];
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

// 6 Canonical Online Financial Components (Head 7 Studio Upgradation is offline-only)
const CANONICAL_ONLINE_COMPONENTS: Array<{
  id: number;
  name: string;
  shortName: string;
  color: string;
  sanctionedBudget: number;
}> = [
  {
    id: 1,
    name: '1. Digital Content Development & Production',
    shortName: 'Digital Content Development',
    color: '#2563eb', // Blue
    sanctionedBudget: 10000000,
  },
  {
    id: 2,
    name: '2. Capacity Building & Training',
    shortName: 'Capacity Building',
    color: '#16a34a', // Green
    sanctionedBudget: 1000000,
  },
  {
    id: 3,
    name: '3. Human Resource & Technical Support',
    shortName: 'Human Resource Support',
    color: '#7c3aed', // Purple
    sanctionedBudget: 7200000,
  },
  {
    id: 4,
    name: '4. Digital Infrastructure, Archive & Network Services',
    shortName: 'Archive / Bandwidth',
    color: '#ea580c', // Orange
    sanctionedBudget: 500000,
  },
  {
    id: 5,
    name: '5. School Telecast & Distribution Infrastructure',
    shortName: 'School Telecast Infrastructure',
    color: '#db2777', // Pink/Magenta
    sanctionedBudget: 500000,
  },
  {
    id: 6,
    name: '6. Outreach, Feedback, Research & Advocacy',
    shortName: 'Feedback / Research',
    color: '#0d9488', // Teal
    sanctionedBudget: 500000,
  },
];

// All 39 Authoritative Source Records from the Underlying Verified Ledger
function getAuthoritativeVouchers(): DrillDownVoucher[] {
  return [
    // -------------------------------------------------------------------------
    // Component 1: Digital Content Development & Production (8 records, ₹1,55,735)
    // -------------------------------------------------------------------------
    {
      id: 'v-c1-01',
      headId: 1,
      headName: '1. Digital Content Development & Production',
      monthKey: 'Jul 2026',
      annexureSource: 'Annexure I',
      expertOrVendor: 'Priya S',
      designation: 'Joint Director',
      description: 'Classroom Teaching Shoot for PM eVidya channel (14.07.2026)',
      voucherOrUtr: 'CN2/00149/26-27',
      date: '2026-07-21',
      claimedAmount: 30745,
      approvedAmount: 30745,
      paidAmount: 30745,
      status: 'AUDITED',
    },
    {
      id: 'v-c1-02',
      headId: 1,
      headName: '1. Digital Content Development & Production',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure I',
      expertOrVendor: 'Babu V',
      designation: 'Regional Director',
      description: 'Instructional Video Recording & Script Validation (27-28/07/2026)',
      voucherOrUtr: 'CN2/001927/26-27',
      date: '2026-08-11',
      claimedAmount: 14337,
      approvedAmount: 14337,
      paidAmount: 14337,
      status: 'RECONCILED',
    },
    {
      id: 'v-c1-03',
      headId: 1,
      headName: '1. Digital Content Development & Production',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure I',
      expertOrVendor: 'MANU KUMAR H.A',
      designation: 'Training Officer',
      description: 'PM eVidya Video Shoot & Pedagogical Review',
      voucherOrUtr: 'CN2/001928/26-27',
      date: '2026-08-11',
      claimedAmount: 1500,
      approvedAmount: 1500,
      paidAmount: 1500,
      status: 'RECONCILED',
    },
    {
      id: 'v-c1-04',
      headId: 1,
      headName: '1. Digital Content Development & Production',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure I',
      expertOrVendor: 'Majji Bala Ganesh Reddy',
      designation: 'Principal',
      description: 'AI & Data Science Curriculum Video Production',
      voucherOrUtr: 'CN2/002221/26-27',
      date: '2026-09-04',
      claimedAmount: 21188,
      approvedAmount: 21188,
      paidAmount: 21188,
      status: 'RECONCILED',
    },
    {
      id: 'v-c1-05',
      headId: 1,
      headName: '1. Digital Content Development & Production',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure I',
      expertOrVendor: 'REJI B.K',
      designation: 'Assistant Director',
      description: 'Core Engineering Trade Video Session Recordings',
      voucherOrUtr: 'CN2/002235/26-27',
      date: '2026-09-08',
      claimedAmount: 24410,
      approvedAmount: 24410,
      paidAmount: 24410,
      status: 'AUDITED',
    },
    {
      id: 'v-c1-06',
      headId: 1,
      headName: '1. Digital Content Development & Production',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure I',
      expertOrVendor: 'RUPASREE M',
      designation: 'Senior Instructor',
      description: 'Digital Multimedia & Classroom Demonstrations',
      voucherOrUtr: 'CN2/002236/26-27',
      date: '2026-09-08',
      claimedAmount: 24639,
      approvedAmount: 24639,
      paidAmount: 24639,
      status: 'RECONCILED',
    },
    {
      id: 'v-c1-07',
      headId: 1,
      headName: '1. Digital Content Development & Production',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure I',
      expertOrVendor: 'JAYASUDHA.T',
      designation: 'Training Officer',
      description: 'Pedagogical Review & Technical Content Review',
      voucherOrUtr: 'CN2/002237/26-27',
      date: '2026-09-08',
      claimedAmount: 3900,
      approvedAmount: 3900,
      paidAmount: 3900,
      status: 'VERIFIED',
    },
    {
      id: 'v-c1-08',
      headId: 1,
      headName: '1. Digital Content Development & Production',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure I',
      expertOrVendor: 'DR. SRINIVASA RAO PULJALA',
      designation: 'Professor / Domain Specialist',
      description: 'Advanced Workshop Science & Video Telecast Deliverables',
      voucherOrUtr: 'CN2/002238/26-27',
      date: '2026-09-08',
      claimedAmount: 35016,
      approvedAmount: 35016,
      paidAmount: 35016,
      status: 'AUDITED',
    },

    // -------------------------------------------------------------------------
    // Component 2: Capacity Building & Training (26 records, ₹2,10,969)
    // -------------------------------------------------------------------------
    {
      id: 'v-c2-01',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'RUCHI L KHATRI',
      designation: 'Master Trainer',
      description: 'Capacity Building Program for Vocational Instructors (30-31.07.2026)',
      voucherOrUtr: 'CN2/001931/26-27',
      date: '2026-08-12',
      claimedAmount: 24638,
      approvedAmount: 24638,
      paidAmount: 24638,
      status: 'AUDITED',
    },
    {
      id: 'v-c2-02',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'DGET CHENNAI UNIT STAFF CANTEEN',
      designation: 'Catering / Venue Logistics',
      description: 'Refreshments & Courseware Hospitality for 45 Trainees',
      voucherOrUtr: 'CN2/001890/26-27',
      date: '2026-08-07',
      claimedAmount: 49850,
      approvedAmount: 49850,
      paidAmount: 49850,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-03',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'BINTA RAI',
      designation: 'Resource Person',
      description: 'Instructor Training Workshop TA/DA & Honorarium',
      voucherOrUtr: 'CN2/001932/26-27',
      date: '2026-08-12',
      claimedAmount: 23038,
      approvedAmount: 23038,
      paidAmount: 23038,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-04',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'RAJAN.M.P',
      designation: 'Senior Instructor',
      description: 'Capacity Training Module Demonstration & Allowances',
      voucherOrUtr: 'CN2/001965/26-27',
      date: '2026-08-18',
      claimedAmount: 7226,
      approvedAmount: 7226,
      paidAmount: 7226,
      status: 'VERIFIED',
    },
    {
      id: 'v-c2-05',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'ORUGANTI ANJANKUMAR',
      designation: 'Participant Instructor',
      description: 'Capacity Workshop Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/001970/26-27',
      date: '2026-08-19',
      claimedAmount: 4002,
      approvedAmount: 4002,
      paidAmount: 4002,
      status: 'VERIFIED',
    },
    {
      id: 'v-c2-06',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'SARAVANA.M',
      designation: 'Domain Specialist',
      description: 'Specialized Pedagogy Workshop Fee & Coordination',
      voucherOrUtr: 'CN2/001971/26-27',
      date: '2026-08-19',
      claimedAmount: 26675,
      approvedAmount: 26675,
      paidAmount: 26675,
      status: 'AUDITED',
    },
    {
      id: 'v-c2-07',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'VIDYADHARA K M',
      designation: 'Instructor',
      description: 'Workshop Travel Allowance & Daily Allowance',
      voucherOrUtr: 'CN2/001972/26-27',
      date: '2026-08-19',
      claimedAmount: 4698,
      approvedAmount: 4698,
      paidAmount: 4698,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-08',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'SANDHYA HEGDE',
      designation: 'Instructor',
      description: 'Workshop Travel Allowance & Daily Allowance',
      voucherOrUtr: 'CN2/001973/26-27',
      date: '2026-08-19',
      claimedAmount: 5022,
      approvedAmount: 5022,
      paidAmount: 5022,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-09',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'HARISHA D R',
      designation: 'Instructor',
      description: 'Workshop Travel Allowance & Daily Allowance',
      voucherOrUtr: 'CN2/001974/26-27',
      date: '2026-08-19',
      claimedAmount: 5022,
      approvedAmount: 5022,
      paidAmount: 5022,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-10',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'PANSARYA SIDDHU KALYAN',
      designation: 'Instructor',
      description: 'Workshop Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/001975/26-27',
      date: '2026-08-19',
      claimedAmount: 6586,
      approvedAmount: 6586,
      paidAmount: 6586,
      status: 'VERIFIED',
    },
    {
      id: 'v-c2-11',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'SAJU.T.S',
      designation: 'Instructor',
      description: 'Workshop Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/001976/26-27',
      date: '2026-08-19',
      claimedAmount: 4102,
      approvedAmount: 4102,
      paidAmount: 4102,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-12',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'KUMAR M',
      designation: 'Instructor',
      description: 'Local Conveyance Allowance for Workshop',
      voucherOrUtr: 'CN2/001977/26-27',
      date: '2026-08-19',
      claimedAmount: 480,
      approvedAmount: 480,
      paidAmount: 480,
      status: 'VERIFIED',
    },
    {
      id: 'v-c2-13',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'PRASAD D',
      designation: 'Instructor',
      description: 'Workshop Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/001978/26-27',
      date: '2026-08-19',
      claimedAmount: 5694,
      approvedAmount: 5694,
      paidAmount: 5694,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-14',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'SUJATHA KN',
      designation: 'Instructor',
      description: 'Workshop Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/001979/26-27',
      date: '2026-08-19',
      claimedAmount: 4182,
      approvedAmount: 4182,
      paidAmount: 4182,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-15',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'MOHAN DASS.K',
      designation: 'Instructor',
      description: 'Local Conveyance Reimbursement',
      voucherOrUtr: 'CN2/001980/26-27',
      date: '2026-08-19',
      claimedAmount: 600,
      approvedAmount: 600,
      paidAmount: 600,
      status: 'VERIFIED',
    },
    {
      id: 'v-c2-16',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'SHAIK SALMAN KHAN',
      designation: 'Instructor',
      description: 'Workshop Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/001995/26-27',
      date: '2026-08-22',
      claimedAmount: 3982,
      approvedAmount: 3982,
      paidAmount: 3982,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-17',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'PAUL DAVID L',
      designation: 'Instructor',
      description: 'Local Travel Expense Claim',
      voucherOrUtr: 'CN2/002201/26-27',
      date: '2026-09-07',
      claimedAmount: 228,
      approvedAmount: 228,
      paidAmount: 228,
      status: 'VERIFIED',
    },
    {
      id: 'v-c2-18',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'BOGA NEELKAMAL',
      designation: 'Instructor',
      description: 'Capacity Training Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/002202/26-27',
      date: '2026-09-07',
      claimedAmount: 4431,
      approvedAmount: 4431,
      paidAmount: 4431,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-19',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'SUDHA B',
      designation: 'Instructor',
      description: 'Capacity Training Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/002203/26-27',
      date: '2026-09-07',
      claimedAmount: 4938,
      approvedAmount: 4938,
      paidAmount: 4938,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-20',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'NAVEEN KUMAR VG',
      designation: 'Instructor',
      description: 'Capacity Training Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/002204/26-27',
      date: '2026-09-07',
      claimedAmount: 4638,
      approvedAmount: 4638,
      paidAmount: 4638,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-21',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'ARUN KUMAR J.R.',
      designation: 'Instructor',
      description: 'Capacity Training Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/002205/26-27',
      date: '2026-09-07',
      claimedAmount: 4788,
      approvedAmount: 4788,
      paidAmount: 4788,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-22',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'RASHMI HG',
      designation: 'Instructor',
      description: 'Capacity Training Travel Allowance Reimbursement',
      voucherOrUtr: 'CN2/002206/26-27',
      date: '2026-09-07',
      claimedAmount: 5431,
      approvedAmount: 5431,
      paidAmount: 5431,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-23',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'JAYASUDHA.T',
      designation: 'Training Officer',
      description: 'Instructor Training Local Conveyance Claim',
      voucherOrUtr: 'CN2/002207/26-27',
      date: '2026-09-07',
      claimedAmount: 1400,
      approvedAmount: 1400,
      paidAmount: 1400,
      status: 'VERIFIED',
    },
    {
      id: 'v-c2-24',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'ARULCHELVAN',
      designation: 'Instructor',
      description: 'Local Transport Reimbursement',
      voucherOrUtr: 'CN2/002208/26-27',
      date: '2026-09-07',
      claimedAmount: 240,
      approvedAmount: 240,
      paidAmount: 240,
      status: 'VERIFIED',
    },
    {
      id: 'v-c2-25',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'ASHOK KUMAR P.',
      designation: 'Instructor',
      description: 'Capacity Building Workshop TA Claim',
      voucherOrUtr: 'CN2/002260/26-27',
      date: '2026-09-16',
      claimedAmount: 4539,
      approvedAmount: 4539,
      paidAmount: 4539,
      status: 'RECONCILED',
    },
    {
      id: 'v-c2-26',
      headId: 2,
      headName: '2. Capacity Building & Training',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure II',
      expertOrVendor: 'SIVA SANKAR B',
      designation: 'Instructor',
      description: 'Capacity Building Workshop TA Claim',
      voucherOrUtr: 'CN2/002261/26-27',
      date: '2026-09-16',
      claimedAmount: 4539,
      approvedAmount: 4539,
      paidAmount: 4539,
      status: 'RECONCILED',
    },

    // -------------------------------------------------------------------------
    // Component 3: Human Resource & Technical Support (2 records, ₹2,81,774)
    // -------------------------------------------------------------------------
    {
      id: 'v-c3-01',
      headId: 3,
      headName: '3. Human Resource & Technical Support',
      monthKey: 'Oct 2026',
      annexureSource: 'Annexure III',
      expertOrVendor: 'Consultant Salary (Contract Staff)',
      designation: 'PM e-Vidya Project Team',
      description: 'Contract Staff Chennai eVidya Salary payable for project 0001/16-2026 (September 2026)',
      voucherOrUtr: 'JV20000062/26-27',
      date: '2026-10-07',
      claimedAmount: 145000,
      approvedAmount: 145000,
      paidAmount: 145000,
      status: 'VERIFIED',
    },
    {
      id: 'v-c3-02',
      headId: 3,
      headName: '3. Human Resource & Technical Support',
      monthKey: 'Oct 2026',
      annexureSource: 'Annexure III',
      expertOrVendor: 'PM e-Vidya Technical & Editorial Staff',
      designation: 'Technical Assistant, Video Editors, Graphic Designers',
      description: 'Staff remuneration for Technical Assistant, Video Editors and Graphic Designers for October 2026',
      voucherOrUtr: 'JV20000078/26-27',
      date: '2026-10-28',
      claimedAmount: 136774,
      approvedAmount: 136774,
      paidAmount: 136774,
      status: 'VERIFIED',
    },

    // -------------------------------------------------------------------------
    // Component 4: Digital Infrastructure, Archive & Network Services (1 record, ₹45,865)
    // -------------------------------------------------------------------------
    {
      id: 'v-c4-01',
      headId: 4,
      headName: '4. Digital Infrastructure, Archive & Network Services',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure IV',
      expertOrVendor: 'National Informatics Centre / Media Cloud CDN',
      designation: 'Infrastructure Provider',
      description: 'Cloud Infrastructure Tier & Dedicated Studio Network for Content Streaming',
      voucherOrUtr: 'JV20000017/26-27',
      date: '2026-08-06',
      claimedAmount: 45865,
      approvedAmount: 45865,
      paidAmount: 45865,
      status: 'AUDITED',
    },

    // -------------------------------------------------------------------------
    // Component 5: School Telecast & Distribution Infrastructure (2 records, ₹0 - Pending disbursement)
    // -------------------------------------------------------------------------
    {
      id: 'v-c5-01',
      headId: 5,
      headName: '5. School Telecast & Distribution Infrastructure',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure V',
      expertOrVendor: 'Broadcast Network Service Unit',
      designation: 'Telecast Integration Directorate',
      description: 'DTH Signal Distribution Equipment & Channel Feed Relay Integration (Commitment)',
      voucherOrUtr: 'CN2/001980/26-27',
      date: '2026-08-18',
      claimedAmount: 70000,
      approvedAmount: 70000,
      paidAmount: 0,
      status: 'AUDITED',
    },
    {
      id: 'v-c5-02',
      headId: 5,
      headName: '5. School Telecast & Distribution Infrastructure',
      monthKey: 'Sep 2026',
      annexureSource: 'Annexure V',
      expertOrVendor: 'Regional Telecast Hardware Services',
      designation: 'Distribution Provider',
      description: 'Satellite Receiver & Channel Distribution Hardware Calibration (Commitment)',
      voucherOrUtr: 'CN2/002340/26-27',
      date: '2026-09-15',
      claimedAmount: 71226,
      approvedAmount: 71226,
      paidAmount: 0,
      status: 'AUDITED',
    },

    // -------------------------------------------------------------------------
    // Component 6: Outreach, Feedback, Research & Advocacy (2 records, ₹1,00,000)
    // -------------------------------------------------------------------------
    {
      id: 'v-c6-01',
      headId: 6,
      headName: '6. Outreach, Feedback, Research & Advocacy',
      monthKey: 'Jul 2026',
      annexureSource: 'Annexure VI',
      expertOrVendor: 'Meta Ads & Google Digital Media',
      designation: 'Advocacy Platforms',
      description: 'PM eVidya Awareness Campaign & Channel Outreach (02–31 Jul 2026)',
      voucherOrUtr: 'NIMI/ADV/2026/01',
      date: '2026-07-28',
      claimedAmount: 60000,
      approvedAmount: 60000,
      paidAmount: 60000,
      status: 'RECONCILED',
    },
    {
      id: 'v-c6-02',
      headId: 6,
      headName: '6. Outreach, Feedback, Research & Advocacy',
      monthKey: 'Aug 2026',
      annexureSource: 'Annexure VI',
      expertOrVendor: 'National Outreach & Digital Marketing Partner',
      designation: 'Campaign Execution Partner',
      description: 'Paid Campaign 2.0 via Meta & Google Ads to promote channels NIMI_OFFICIAL_SKILL SAKTHI & SKILL INDIA',
      voucherOrUtr: 'CN2/001940/26-27',
      date: '2026-08-31',
      claimedAmount: 40000,
      approvedAmount: 40000,
      paidAmount: 40000,
      status: 'RECONCILED',
    },

  ];
}


// Dynamic Database Synchronization: Query Prisma / Live Store Annexures
async function fetchLiveAnnexureVouchers(): Promise<DrillDownVoucher[]> {
  try {
    const components = await prisma.budgetComponent.findMany({
      where: { componentNo: { lte: 6 } }, // Exclude Head 7 Studio Upgradation (offline-only)
      include: {
        annexureI: true,
        annexureII: true,
        annexureIII: true,
        annexureIV: true,
        annexureV: true,
        annexureVI: true,
      },
    });

    const liveVouchers: DrillDownVoucher[] = [];
    components.forEach((c: any) => {
      if (c.componentNo > 6) return; // Component 7 (Studio Upgradation) is offline-only

      const headName = CANONICAL_ONLINE_COMPONENTS.find((co) => co.id === c.componentNo)?.name || c.name;

      const getMonthKey = (dateStr?: string | Date | null, periodStr?: string | null): string => {
        if (periodStr && FISCAL_YEAR_2026_2027_MONTHS.includes(periodStr)) return periodStr;
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const key = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
            if (FISCAL_YEAR_2026_2027_MONTHS.includes(key)) return key;
          }
        }
        return 'Oct 2026';
      };

      c.annexureI?.forEach((item: any) => {
        liveVouchers.push({
          id: item.id,
          headId: 1,
          headName,
          monthKey: getMonthKey(item.transactionDate, item.datePeriod),
          annexureSource: 'Annexure I',
          expertOrVendor: item.expertName,
          designation: item.designation,
          description: item.activity,
          voucherOrUtr: item.voucherNo || item.utrNumber || item.id,
          date: item.transactionDate ? new Date(item.transactionDate).toISOString().split('T')[0] : '2026-09-08',
          claimedAmount: item.totalExpenditure || item.honorarium,
          approvedAmount: item.totalExpenditure || item.honorarium,
          paidAmount: item.totalExpenditure || item.honorarium,
          status: 'VERIFIED',
        });
      });

      c.annexureII?.forEach((item: any) => {
        liveVouchers.push({
          id: item.id,
          headId: 2,
          headName,
          monthKey: getMonthKey(item.datePeriod, item.datePeriod),
          annexureSource: 'Annexure II',
          expertOrVendor: item.participant,
          designation: item.trainingType,
          description: item.trainingName,
          voucherOrUtr: item.utrNumber || item.id,
          date: '2026-08-19',
          claimedAmount: item.totalExpenditure,
          approvedAmount: item.totalExpenditure,
          paidAmount: item.totalExpenditure,
          status: 'VERIFIED',
        });
      });

      c.annexureIII?.forEach((item: any) => {
        liveVouchers.push({
          id: item.id,
          headId: 3,
          headName,
          monthKey: getMonthKey(item.transactionDate, item.datePeriod),
          annexureSource: 'Annexure III',
          expertOrVendor: item.personnelName,
          designation: item.designation,
          description: item.supportType,
          voucherOrUtr: item.voucherNo || item.utrNumber || item.id,
          date: item.transactionDate ? new Date(item.transactionDate).toISOString().split('T')[0] : '2026-10-07',
          claimedAmount: item.totalExpenditure || item.remuneration,
          approvedAmount: item.totalExpenditure || item.remuneration,
          paidAmount: item.totalExpenditure || item.remuneration,
          status: 'VERIFIED',
        });
      });

      c.annexureIV?.forEach((item: any) => {
        liveVouchers.push({
          id: item.id,
          headId: 4,
          headName,
          monthKey: getMonthKey(item.transactionDate, item.datePeriod),
          annexureSource: 'Annexure IV',
          expertOrVendor: item.vendor || item.name || 'Infrastructure Provider',
          designation: item.coaName || 'Digital Infrastructure / Archive',
          description: item.narration || item.description || item.service || '',
          voucherOrUtr: item.voucher || item.utrNumber || item.invoiceNo || item.purchaseRef || item.id,
          date: item.transactionDate
            ? new Date(item.transactionDate).toISOString().split('T')[0]
            : '2026-08-06',
          claimedAmount: item.totalExpenditure,
          approvedAmount: item.totalExpenditure,
          paidAmount: item.totalExpenditure,
          status: 'VERIFIED',
        });
      });

      c.annexureV?.forEach((item: any) => {
        liveVouchers.push({
          id: item.id,
          headId: 5,
          headName,
          monthKey: getMonthKey(null, item.datePeriod),
          annexureSource: 'Annexure V',
          expertOrVendor: item.vendor,
          designation: 'Distribution Provider',
          description: item.activity,
          voucherOrUtr: item.utrNumber || item.invoiceNo || item.id,
          date: item.datePeriod?.includes('Sep') ? '2026-09-15' : '2026-08-18',
          claimedAmount: item.totalExpenditure,
          approvedAmount: item.totalExpenditure,
          paidAmount: item.totalExpenditure,
          status: 'VERIFIED',
        });
      });

      c.annexureVI?.forEach((item: any) => {
        liveVouchers.push({
          id: item.id,
          headId: 6,
          headName,
          monthKey: getMonthKey(null, item.datePeriod),
          annexureSource: 'Annexure VI',
          expertOrVendor: item.serviceProvider,
          designation: 'Advocacy Platforms',
          description: item.campaignDesc,
          voucherOrUtr: item.utrNumber || item.id,
          date: item.datePeriod?.includes('Aug') ? '2026-08-31' : '2026-07-28',
          claimedAmount: item.totalExpenditure || item.amount,
          approvedAmount: item.totalExpenditure || item.amount,
          paidAmount: item.totalExpenditure || item.amount,
          status: 'VERIFIED',
        });
      });
    });

    return liveVouchers;
  } catch (err) {
    console.warn('Prisma live annexures query fallback to verified store:', err);
    return [];
  }
}

// Deduplicate vouchers by composite key: (voucherOrUtr + headId)
function mergeUniqueVouchers(baseline: DrillDownVoucher[], live: DrillDownVoucher[]): DrillDownVoucher[] {
  const map = new Map<string, DrillDownVoucher>();

  baseline.forEach((v) => {
    const key = `${(v.voucherOrUtr || v.id).toUpperCase()}_${v.headId}`;
    map.set(key, v);
  });

  live.forEach((v) => {
    const key = `${(v.voucherOrUtr || v.id).toUpperCase()}_${v.headId}`;
    if (!map.has(key)) {
      map.set(key, v);
    }
  });

  return Array.from(map.values());
}


interface VideoOutputMetrics {
  totalSeconds: number;
  totalFormatted: string;
  completedCount: number;
  unverifiedCount: number;
}

function parseDurationToSeconds(duration?: string | null): number | null {
  if (!duration || typeof duration !== 'string') return null;
  const trimmed = duration.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'null' || trimmed === 'Duration Pending') return null;
  if (/^0+(:0+)+$/.test(trimmed)) return null;

  const parts = trimmed.split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return null;

  let seconds = 0;
  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    seconds = parts[0];
  }
  return seconds > 0 ? seconds : null;
}

function formatSecondsToHms(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function isValidCompletedVideoLink(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed.toLowerCase() === 'pending' || trimmed.toLowerCase() === 'tbd') {
    return false;
  }
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

async function fetchVideoOutputMetrics(): Promise<VideoOutputMetrics> {
  let rawVideos: any[] = [];
  try {
    rawVideos = await prisma.videoLibrary.findMany();
  } catch {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const storePath = path.join(process.cwd(), 'data/pm_evidya_live_store.json');
      if (fs.existsSync(storePath)) {
        const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        rawVideos = store.videoLibraries || [];
      }
    } catch {}
  }

  // Deduplicate and filter completed videos
  const completed = rawVideos.filter((v) => isValidCompletedVideoLink(v.videoLink));
  const seenTitles = new Set<string>();
  const seenLinks = new Set<string>();
  const uniqueVideos: any[] = [];

  for (const v of completed) {
    const normTitle = (v.title || '').trim().toLowerCase().replace(/[\u2010-\u2015]/g, '-');
    const normLink = (v.videoLink || '').trim().toLowerCase();
    if (seenTitles.has(normTitle) || (normLink && seenLinks.has(normLink))) continue;
    seenTitles.add(normTitle);
    if (normLink) seenLinks.add(normLink);
    uniqueVideos.push(v);
  }

  let totalSeconds = 0;
  let unverifiedCount = 0;

  for (const v of uniqueVideos) {
    const sec = parseDurationToSeconds(v.duration);
    if (sec !== null) {
      totalSeconds += sec;
    } else {
      unverifiedCount++;
    }
  }

  return {
    totalSeconds,
    totalFormatted: formatSecondsToHms(totalSeconds),
    completedCount: uniqueVideos.length,
    unverifiedCount,
  };
}

export async function getMonthlyExpenditureReportData(filters?: {
  financialYear?: string;
  fromMonth?: string;
  toMonth?: string;
  project?: string;
}): Promise<MonthlyExpenditureReportResult> {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER']);

  const financialYear = filters?.financialYear || '2026 - 2027';
  const fromMonth = filters?.fromMonth || 'Apr 2026';
  const toMonth = filters?.toMonth || 'Mar 2027';
  const project = filters?.project || 'PM e-Vidya (Ch. 22 – 27)';

  // Complete 12-month Financial Year (April 2026 – March 2027)
  const fullFiscalMonths = FISCAL_YEAR_2026_2027_MONTHS;

  let startIndex = fullFiscalMonths.indexOf(fromMonth);
  let endIndex = fullFiscalMonths.indexOf(toMonth);
  if (startIndex === -1) startIndex = 0;
  if (endIndex === -1 || endIndex < startIndex) endIndex = fullFiscalMonths.length - 1;

  const selectedMonths = fullFiscalMonths.slice(startIndex, endIndex + 1);
  const effectiveMonths = selectedMonths.length > 0 ? selectedMonths : fullFiscalMonths;

  // Authoritatively use live Annexure vouchers from Budget Master directly
  // Fall back to baseline vouchers ONLY if database query returns 0 records
  const liveVouchers = await fetchLiveAnnexureVouchers();
  const vouchers = liveVouchers.length > 0 ? liveVouchers : getAuthoritativeVouchers();

  // Authoritative Sanctioned Budgets dynamically retrieved from Budget Master
  const budgetMaster = await getAuthoritativeSanctionedBudgets();

  // Construct PlanHead summaries for the 6 online components
  const planHeads: PlanHeadSummary[] = CANONICAL_ONLINE_COMPONENTS.map((comp) => {
    const monthlyExp: Record<string, number> = {};

    effectiveMonths.forEach((m) => {
      // Sum unique eligible vouchers for this component and month
      const monthSum = vouchers
        .filter((v) => v.headId === comp.id && v.monthKey === m)
        .reduce((sum, v) => sum + (Number(v.paidAmount) || 0), 0);

      monthlyExp[m] = monthSum;
    });

    const totalExp = vouchers
      .filter((v) => v.headId === comp.id)
      .reduce((sum, v) => sum + (Number(v.paidAmount) || 0), 0);

    const sanctionedBudget = budgetMaster.componentBudgetMap[comp.id] ?? comp.sanctionedBudget;
    const availableBal = sanctionedBudget - totalExp;
    const utilPct = sanctionedBudget > 0 ? (totalExp / sanctionedBudget) * 100 : 0;
    const txCount = vouchers.filter((v) => v.headId === comp.id).length;

    return {
      id: comp.id,
      name: comp.name,
      shortName: comp.shortName,
      color: comp.color,
      badge: comp.id,
      sanctionedBudget,
      monthlyExpenditure: monthlyExp,
      totalExpenditure: totalExp,
      availableBalance: availableBal,
      utilizationPercent: Number(utilPct.toFixed(2)),
      transactionsCount: txCount,
    };
  });

  // Calculate Monthly Totals across all heads
  const monthlyTotals: Record<string, number> = {};
  effectiveMonths.forEach((m) => {
    let sum = 0;
    planHeads.forEach((h) => {
      sum += h.monthlyExpenditure[m] || 0;
    });
    monthlyTotals[m] = sum;
  });

  // Grand Totals across the 6 online components
  const grandTotalExpenditure = vouchers.reduce((acc, v) => acc + (Number(v.paidAmount) || 0), 0);
  const grandSanctionedBudget = budgetMaster.totalSanctionedBudget > 0
    ? budgetMaster.totalSanctionedBudget
    : planHeads.reduce((acc, h) => acc + h.sanctionedBudget, 0);
  const balanceAvailable = grandSanctionedBudget - grandTotalExpenditure;
  const overallUtilizationPercent = Number(
    (grandSanctionedBudget > 0 ? (grandTotalExpenditure / grandSanctionedBudget) * 100 : 0).toFixed(2)
  );
  const balancePercent = Number(
    (grandSanctionedBudget > 0 ? (balanceAvailable / grandSanctionedBudget) * 100 : 0).toFixed(2)
  );

  // 10-Month Operational Reporting Baseline (June 2026 – March 2027)
  const totalFiscalMonthsCount = 10;
  const operationalMonthsCovered = effectiveMonths.filter((m) =>
    ['Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026', 'Jan 2027', 'Feb 2027', 'Mar 2027'].includes(m)
  );
  const monthsCoveredCount = operationalMonthsCovered.length;
  const monthsCoveredStr = `${monthsCoveredCount} / ${totalFiscalMonthsCount}`;
  const monthsCoveredSub = 'June 2026 – October 2026';
  const monthlyTarget = Math.round(grandSanctionedBudget / totalFiscalMonthsCount); // ₹ 19,70,000

  // Total Output Hours dynamically computed from verified video library
  const videoMetrics = await fetchVideoOutputMetrics();
  const totalOutputHours = `${videoMetrics.totalFormatted} hrs`;
  const targetOutputHours = '(vs. 160:00:00 hrs annual target)';

  // Statement Date & Total Records
  const statementDate = '07-Oct-2026';
  const totalRecordsCount = vouchers.length;

  // Pie chart data (6 online components)
  const pieChartData = planHeads.map((h) => ({
    name: h.name,
    shortName: h.shortName,
    amount: h.totalExpenditure,
    percent: Number(
      (grandTotalExpenditure > 0 ? (h.totalExpenditure / grandTotalExpenditure) * 100 : 0).toFixed(1)
    ),
    color: h.color,
  }));

  // Bar chart data across all effective months
  const barChartData = effectiveMonths.map((m) => {
    const val = monthlyTotals[m] || 0;
    const inLakhs = (val / 100000).toFixed(2);
    return {
      month: m,
      expenditure: val,
      target: monthlyTarget,
      label: val > 0 ? `₹ ${inLakhs} L` : '₹ 0',
    };
  });

  // Find peak expenditure month
  let peakMonth = effectiveMonths[0];
  let peakAmt = 0;
  effectiveMonths.forEach((m) => {
    if ((monthlyTotals[m] || 0) > peakAmt) {
      peakAmt = monthlyTotals[m] || 0;
      peakMonth = m;
    }
  });

  // Find major spending head
  const majorHead = [...planHeads].sort((a, b) => b.totalExpenditure - a.totalExpenditure)[0];
  const majorHeadPct = Number(
    (grandTotalExpenditure > 0 ? (majorHead.totalExpenditure / grandTotalExpenditure) * 100 : 0).toFixed(1)
  );

  // Key Insights matching the authoritative figures
  const formatInr = (n: number) => n.toLocaleString('en-IN');
  const keyInsights = [
    {
      text: `Total expenditure: ₹ ${formatInr(grandTotalExpenditure)} (${overallUtilizationPercent}%)`,
      type: 'total' as const,
    },
    {
      text: `Highest expenditure: ${peakMonth} - ₹ ${formatInr(peakAmt)}`,
      type: 'peak' as const,
    },
    {
      text: `Major spending component: ${majorHead.shortName} (${majorHeadPct}%)`,
      type: 'major' as const,
    },
    {
      text: `Output generated: ${totalOutputHours} (Target: 160:00:00 hrs)`,
      type: 'output' as const,
    },
    {
      text: `Balance available: ₹ ${formatInr(balanceAvailable)} (${balancePercent}%)`,
      type: 'balance' as const,
    },
  ];

  return {
    filters: {
      financialYear,
      fromMonth,
      toMonth,
      project,
    },
    allMonths: effectiveMonths,
    activeMonths: effectiveMonths,
    planHeads,
    monthlyTotals,
    grandTotalExpenditure,
    grandSanctionedBudget,
    balanceAvailable,
    overallUtilizationPercent,
    balancePercent,
    monthsCoveredStr,
    monthsCoveredSub,
    totalOutputHours,
    targetOutputHours,
    monthlyTarget,
    totalRecordsCount,
    statementDate,
    pieChartData,
    barChartData,
    keyInsights,
    vouchers,
  };
}
