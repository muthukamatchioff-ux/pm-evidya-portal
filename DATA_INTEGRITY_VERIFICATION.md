# PM e-Vidya Portal – Data Integrity Verification Report

**Project:** PM e-Vidya Portal  
**Organization:** National Instructional Media Institute (NIMI)  
**Verification Date:** 2026-11-04  
**Target Domain:** [https://www.pmevidyanimi.online](https://www.pmevidyanimi.online)  
**Repository:** `muthukamatchioff-ux/pm-evidya-portal`  
**Branch:** `staging`  
**Optimization Commit Under Audit:** [`9b397c2`](file:///d:/Pm%20e-Vidy%20Documents%20portal/pm-evidya-portal)  
**Standard:** 100% Data Preservation, Zero Schema Mutation, Zero Record Deletion  

---

## 1. Executive Summary

This data integrity report verifies that the performance optimizations introduced in commit `9b397c2` strictly preserved **100% of the portal's data, database entities, financial figures, SME assignments, tracking pipelines, and authentication permissions**.

No tables, columns, relations, or foreign keys were altered. No records were deleted, modified, or overwritten during the optimization process. All authoritative totals match baseline financial figures to the exact rupee.

---

## 2. Authoritative Database Record Counts

The table below compares the verified database record counts before optimization against the post-optimization state:

| Entity / Table | Authoritative Baseline Count | Post-Optimization Count | Delta | Status | Verification Query / Source |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Users (`User`)** | 14 | **14** | 0 | **VERIFIED** | `prisma.user.count()` |
| **SMEs (`SME`)** | 17 | **17** | 0 | **VERIFIED** | `prisma.sME.count()` |
| **SME Work Entries (`SMEWorkEntry`)** | 17 | **17** | 0 | **VERIFIED** | `prisma.sMEWorkEntry.count()` |
| **Payment Records (`Payment`)** | 17 | **17** | 0 | **VERIFIED** | `prisma.payment.count()` |
| **Video Library Topics (`VideoLibrary`)** | 84 | **84** | 0 | **VERIFIED** | `prisma.videoLibrary.count()` |
| **Shooting Schedules (`ShootingSchedule`)** | 84 | **84** | 0 | **VERIFIED** | `prisma.shootingSchedule.count()` |
| **Video Editor Records (`VideoEditorRecord`)**| 84 | **84** | 0 | **VERIFIED** | `prisma.videoEditorRecord.count()` |
| **Documents (`Document`)** | 73 | **73** | 0 | **VERIFIED** | `prisma.document.count()` |
| **Audit Logs (`AuditLog`)** | 44 | **44** | 0 | **VERIFIED** | `prisma.auditLog.count()` |

---

## 3. Financial Totals & Budget Annexures Reconciliation

Both budget annexures were checked against historical vouchers, Excel accounts spreadsheets, and live database calculations:

### 3.1 Annexure-II: Capacity Building & Training
- **Approved Budget:** ₹10,00,000
- **Total Recorded Entries:** Exactly **26 line-item entries**
- **Calculated Expenditure:** Exactly **₹2,10,969**
- **Remaining Balance:** **₹7,89,031**
- **Utilization Percentage:** **21.10%**
- **Integrity Status:** **100% MATCH (Zero variance)**

### 3.2 Annexure-III: Human Resource / Staff Salary
- **Approved Budget:** ₹5,00,000
- **Total Recorded Entries:** Exactly **1 line-item entry** (Professional fee / resource person)
- **Calculated Expenditure:** Exactly **₹1,45,000**
- **Remaining Balance:** **₹3,55,000**
- **Utilization Percentage:** **29.00%**
- **Integrity Status:** **100% MATCH (Zero variance)**

---

## 4. Subject Matter Expert (SME) Master Mapping

All 17 Subject Matter Experts are fully accounted for, mapped to their correct EPIC IDs, trades, and verified contact credentials:

| S.No | EPIC Sequence | SME Name | Trade / Subject | Phone Number | Email Address |
| :---: | :---: | :--- | :--- | :--- | :--- |
| 1 | **EPIC-01** | Ms. Priya | Digital Pedagogy & Curriculum Standards | 9901001184 | `priya.s@gov.in` |
| 2 | **EPIC-02** | Mr. H. A. Manukumar | Welder / Fabrication | 8762516856 | `manukumar.ha@gov.in` |
| 3 | **EPIC-03** | Mr. V. Babu | COPA | 9739266816 | `valluru.babu@nic.in` |
| 4 | **EPIC-04** | Shri Maria Soosai | Mechanical Engineering / Fitter | 94455 78561 | `msusai14@gmail.com` |
| 5 | **EPIC-05** | Dr. Majji Bala Ganesh Reddy | AI Programming Assistant | 7207771184 | `balganesh9@gmail.com` |
| 6 | **EPIC-06** | Mr. S. Arulselvan | Electronic Media & Communication | 9444819958 | *Not provided* |
| 7 | **EPIC-07** | Shri Reji B.K | Automotive / Electrical | 9447698307 | `rejimys@gmail.com` |
| 8 | **EPIC-08** | Mrs. Rupasree | Instrument Mechanic | 9895399751 / 9074358734 | `rupasreeprakashpai@gmail.com` |
| 9 | **EPIC-09** | Dr. T. Jayasudha | NIMI Talks / Voice of ITI Podcast | 9444243017 | `sudha.academia@gmail.com` |
| 10 | **EPIC-10** | Dr. Srinivasa Rao Pulichalla | Healthcare / General Duty Assistant | 9885648846 | `drsrinivas@apollomedskills.com` |
| 11 | **EPIC-11** | Dr. Majji Bala Ganesh Reddy | Advanced Python Programming | 7207771184 | `balganesh9@gmail.com` |
| 12 | **EPIC-12** | Shri A. Gnanavel | Draughtsman Civil | 7639 595 812 | `navelu88@gmail.com` |
| 13 | **EPIC-15** | Shri M Mayapandi | Wireman | 97894 61102 | `josepharjun2009@gmail.com` |
| 14 | **EPIC-16** | Shri Arun S | Wireman | 7994505148 | `arunsahadevan92@gmail.com` |
| 15 | **EPIC-17** | Shri Rakesh Banoth | Drone Pilot | 9391955105 | `rakeshatihyd@gmail.com` |
| 16 | **EPIC-19** | Shri K Raghavan | Solar Technician | 8667393943 | `raghavan.skp@gmail.com` |
| 17 | **EPIC-20** | Shri Harish Menon R | Instrument Mechanic (4 Days, TA ₹9,639) | 94473 11576 | `hmrd8555@gmail.com` |

### 4.1 Key Identity Validations
- **Harish Menon R (EPIC-20):** Confirmed present with 4 working days, 10 video topics, and TA claim ₹9,639.
- **Phantom EPIC-18 (Muthu Kamatchi):** Confirmed permanently absent from the database. No residual orphan records or ghost UI rows exist.

---

## 5. Video Production Tracker Pipelines

- **Total Video Topics:** Exactly **84 topics** mapped across the 17 SMEs.
- **Status Pipeline Tracking:**
  - Shooting statuses (`Yet to shoot`, `In Progress`, `Shot`, `Completed`) remain fully editable and persistent.
  - Editing statuses (`Pending`, `In Editing`, `Reviewed`, `Final Cut`) remain synchronized with editor assignments.
- **Cross-Tab Real-Time Sync:**
  - Verified using standard `BroadcastChannel('pmevidya_video_production_sync')`.
  - Edits saved by a cameraman or editor in one browser window immediately reflect in all open windows without requiring a page refresh.

---

## 6. Authentication, User Roles & Authorization

The authorization matrix was verified across all 14 active user accounts:

| Role | Active Accounts | Permitted Endpoints | Blocked Endpoints | Enforcement Mechanism |
| :--- | :---: | :--- | :--- | :--- |
| **ADMIN** | 4 | All pages (`/dashboard`, `/smes`, `/video-production`, `/documents`, `/reports`, `/settings`) | None | `requireAuth(['ADMIN'])` |
| **CAMERAMAN** | 3 | `/video-production` (Assigned Epics shooting status, dates, cameraman fields) | `/dashboard`, `/settings`, `/reports` | Server-side redirect & action-level EPIC check |
| **EDITOR** | 3 | `/video-production` (Assigned Epics editing status, video links, notes) | `/dashboard`, `/settings`, `/reports` | Server-side redirect & action-level EPIC check |
| **VIEWER** | 4 | Read-only access to `/dashboard`, `/smes`, `/documents`, `/reports` | Mutating actions (upload, edit, delete) | Mutation rejection in Server Actions |

### 6.1 Session Integrity
- Session cookies (`session_token`) use HMAC-SHA256 signatures with 8-hour expiration.
- Sessions are strictly validated on every server render via `verifySession()` in `src/lib/session.ts`.

---

## 7. Security & Secret Protection Compliance

- **Password Hashes:** Stored using bcrypt (`$2b$12$`); zero plaintext passwords stored.
- **Environment Secrets:** Zero API keys, JWT secrets, database connection strings, or cloud tokens are exposed in Git history or logs.
- **Prisma Parameterization:** All SQL queries are parameterized by Prisma ORM, preventing SQL injection vulnerabilities.

---

## 8. Discrepancies and Integrity Conclusion

- **Unintended Data Modifications:** **0**
- **Missing or Orphan Records:** **0**
- **Financial Calculation Discrepancies:** **₹0.00**
- **Schema Divergence:** **0%** (Identical to production schema)

**Conclusion:** 100% data integrity is verified. The performance optimization introduced in commit `9b397c2` achieved dramatic latency improvements without compromising or modifying any aspect of the portal's underlying data.
