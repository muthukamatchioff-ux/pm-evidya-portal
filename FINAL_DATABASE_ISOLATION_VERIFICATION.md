# PM e-Vidya Portal – Final Database Isolation Verification Report

**Project:** PM e-Vidya Portal  
**Organization:** National Instructional Media Institute (NIMI)  
**Branch:** `staging`  
**Optimization Commit:** [`9b397c2102687e538931a06f561f82c07d8214a9`](file:///d:/Pm%20e-Vidy%20Documents%20portal/pm-evidya-portal)  
**Deliverables Commit:** [`f572b77`](file:///d:/Pm%20e-Vidy%20Documents%20portal/pm-evidya-portal)  
**Verification Commit:** [`5a627e6`](file:///d:/Pm%20e-Vidy%20Documents%20portal/pm-evidya-portal)  
**Expected Staging Neon Branch:** `staging-voroa-test`  
**Target Domain:** [https://www.pmevidyanimi.online](https://www.pmevidyanimi.online) (Strictly Untouched / Read-Only)  
**Audit Standard:** Strict Database Isolation, Secret Protection & Data Provenance Verification  
**Date:** 2026-11-04  

---

## 1. Executive Summary

This report establishes the final database isolation status for the PM e-Vidya Portal staging optimization release. Specifically, this audit resolves:

1. **STG-04:** Exclusive connection of the staging environment to the Neon database branch `staging-voroa-test`.
2. **STG-05:** Production vs. Staging database configuration isolation.
3. **STG-09 Provenance:** The exact database branch source of all previously verified record counts and financial figures.
4. **Write-Path Testing Requirements:** Identification and classification of all write-dependent workflows without executing writes.

### Overall Verification Status:
## **INCONCLUSIVE – ADMINISTRATIVE EVIDENCE MISSING**

> [!IMPORTANT]
> **Definitive Finding:**  
> The application source code contains **zero hardcoded database credentials** and **zero static environment mapping files**. In the containerized Voroa hosting architecture, the `DATABASE_URL` is injected into the container runtime dynamically by the Voroa control plane.
>
> Because access to the Voroa Container Dashboard and Neon Cloud Console is restricted to authorized project administrators, the application layer cannot independently extract or confirm the active Neon branch name without administrator confirmation.
>
> In strict compliance with Safety Rule 9 (*"Do not assume that an application environment variable proves database isolation"*) and Safety Rule 10 (*"Stop if the environment cannot be conclusively identified"*), tests **STG-04**, **STG-05**, and the **STG-09 Data Provenance** must remain **UNVERIFIED** until the administrator completes the verification checklist documented in Section 6.

---

## 2. Verification A – Voroa Staging Container Configuration

### 2.1 Audit Assessment
In containerized cloud deployments (Voroa), runtime environment variables are stored in the host platform's encrypted key-value store and mounted into the container at startup.
- Inspection of repository files (`.env`, `.env.local`, `.env.production`) confirms that all production database URLs are masked with `[SENSITIVE]` or set to `localhost:5432` placeholders.
- The build script (`scripts/build.js`) dynamically reads `process.env.DATABASE_URL`.
- The Prisma client initializer (`src/lib/prisma.ts`) reads `process.env.DATABASE_URL`.
- Therefore, no application file dictates which Neon database branch Voroa targets.

### 2.2 Administrative Verification Request
The system administrator must verify the following settings within the **Voroa Project Settings Dashboard**:

| Container Environment | Target Configuration Key | Expected Setting | Required Verification Check |
| :--- | :--- | :--- | :--- |
| **Staging Container** | `DATABASE_URL` | Endpoint belonging to `staging-voroa-test` | Ensure connection string host matches the Neon staging branch endpoint. |
| **Staging Container** | `RUN_SYNC_DB` | Must NOT be set to `"true"` | Confirm build-time database synchronization (`sync-db.js`) is disabled. |
| **Production Container** | `DATABASE_URL` | Primary production database branch endpoint | Confirm production container points to the live production database branch. |
| **Isolation Boundary** | Network / Container Scope | Distinct environments | Verify staging container cannot write to production database. |

### 2.3 Status: **UNVERIFIED**
- **Evidence:** Voroa administrative dashboard access is not available from within the codebase.
- **Risk Level:** **HIGH**
- **Required Action:** Administrator must complete Section 6 verification checklist.

---

## 3. Verification B – Neon Console Alignment

### 3.1 Non-Secret Parameter Specification
To protect security credentials, database passwords and full connection strings must **never** be logged. The administrator must compare the non-secret parameters in the **Neon Cloud Console** against the Voroa staging configuration:

| Parameter Category | Non-Secret Identifier | Expected Value | Purpose |
| :--- | :--- | :--- | :--- |
| **Branch Name** | Git Branch Equivalent | `staging-voroa-test` | Isolated copy of the production schema and data. |
| **Endpoint Identifier** | Host prefix (e.g. `ep-xxxxxx-pooler`) | Unique Staging Pooler Host | Confirms connection pooler targets the isolated branch. |
| **Region** | AWS / Azure Region | `eu-central-1` / `ap-south-1` | Matches database deployment cluster. |
| **Database Name** | PostgreSQL Database | `pm_evidya_preview` or `pm_evidya_portal` | Staging database catalog name. |
| **Role / User** | PostgreSQL Username | Non-admin application role | Unprivileged application database user. |

### 3.2 Status: **UNVERIFIED**
- **Evidence:** Neon Cloud Console requires external administrative sign-in.
- **Risk Level:** **HIGH**
- **Required Action:** Administrator must confirm that the host prefix in Voroa matches the endpoint for `staging-voroa-test`.

---

## 4. Verification C – Read-Only Data Provenance (STG-09 Audit)

### 4.1 Provenance Evaluation of STG-09 Data
In the previous audit turn (STG-09), live read-only GET queries were performed against `https://www.pmevidyanimi.online`:
- **Users:** Exactly 14 records.
- **Registered SMEs:** Exactly 17 records.
- **Video Production Topics:** Exactly 84 records.
- **Shooting Schedules:** Exactly 84 records.
- **Video Editor Records:** Exactly 84 records.
- **Documents:** Exactly 73 records.
- **Annexure-II (Capacity Building):** Exactly 26 entries = ₹2,10,969.
- **Annexure-III (Human Resource):** Exactly 1 entry = ₹1,45,000.
- **Harish Menon R (EPIC-20):** Confirmed present (4 days, TA ₹9,639).
- **Phantom EPIC-18 / Muthu:** Confirmed permanently absent (0 records).

### 4.2 Critical Provenance Limitation
Because `https://www.pmevidyanimi.online` is the public-facing production domain, and because the container's active `DATABASE_URL` is masked:
1. It **cannot be determined from application responses alone** whether the domain was querying the live production database or an isolated staging container connected to `staging-voroa-test`.
2. If the domain is serving live production traffic directly, querying it does **not** prove that the staging container is isolated from production.
3. In accordance with the prompt rule: *"If the branch cannot be established, do not mark data verification as PASS."*

### 4.3 Data Provenance Status: **UNVERIFIED (BRANCH UNCONFIRMED)**
- **Evidence:** Query responses confirm exact data totals, but the underlying Neon branch cannot be identified without container environment variable inspection.
- **Risk Level:** **HIGH**
- **Required Action:** Re-verify data counts directly against the staging endpoint once the administrator confirms `staging-voroa-test` connection details.

---

## 5. Verification D – Write-Path Testing Status & Classification

In accordance with Safety Rule 5 (*"Do not execute INSERT, UPDATE, DELETE, ALTER or DROP"*), no write transactions were executed during this audit. The table below identifies all application workflows requiring database mutations, classifies their testing status, and outlines regression risks:

| Workflow ID | Application Workflow | Target Database Entities / Operations | Write Status Classification | Regression Risks & Mitigations |
| :---: | :--- | :--- | :---: | :--- |
| **WR-01** | **Authentication / User Login** | `session_token` cookie generation via HMAC-SHA256 signature in `src/lib/session.ts`. | **Verified through existing evidence** | Stateless cookie-based session; does not execute database writes on login. Zero database mutation risk. |
| **WR-02** | **Video Production Tracker Updates** | `ShootingSchedule` & `VideoEditorRecord` updates via `saveShootingStage()` & `saveEditingStage()`. | **Requires staging write-path testing** | **Risk:** Race condition during rapid status toggles. **Mitigation:** Cross-tab `BroadcastChannel` real-time sync active; connection pool handles bursts safely. |
| **WR-03** | **SME Records Management** | `SME` updates via `updateSMERecord()` and deletes via `deleteSMERecord()` in `src/app/smes/[id]/actions.ts`. | **Requires staging write-path testing** | **Risk:** Contact details overwrite or orphan records. **Mitigation:** Verified in commit `93bfb06` that phone & email fields are persistent and validated. |
| **WR-04** | **Document Upload & Registry** | `Document` record creation via `uploadDocument()` in `src/app/documents/actions.ts` + Blob store put. | **Requires staging write-path testing** | **Risk:** Blob token expiration or foreign key mismatch. **Mitigation:** `workEntryId` relation enforced; requires write test on staging. |
| **WR-05** | **Budget Annexures Line-Item Entry** | Line-item expenditures in Annexures I through VI via Server Actions in `src/app/annexure-*/actions.ts`. | **Requires staging write-path testing** | **Risk:** Financial balance miscalculation on insert/delete. **Mitigation:** Server-side aggregation recalculates grand totals automatically. |
| **WR-06** | **Reports Generation & Export** | XLSX and DOCX report downloads in `src/app/reports/ReportsClient.tsx`. | **Verified through existing evidence** | Read-only client-side generation; zero database writes executed. Dynamic imports verified functional. |

---

## 6. Administrative Confirmation Checklist

Before authorizing any production deployment, the project administrator must complete and document the following four-step confirmation:

```markdown
[ ] Step 1: Voroa Staging Container Inspection
    - Open Voroa Dashboard > Project: pm-evidya-portal > Environment: Staging
    - Confirm DATABASE_URL host matches Neon staging branch: 'staging-voroa-test'
    - Confirm RUN_SYNC_DB is NOT set to 'true'

[ ] Step 2: Neon Cloud Console Alignment
    - Open Neon Console > Project: pm-evidya-portal > Branches
    - Select branch: 'staging-voroa-test'
    - Confirm endpoint ID matches the host in Voroa Staging DATABASE_URL
    - Confirm primary branch has a completely separate, distinct endpoint ID

[ ] Step 3: Staging Read-Only Sanity Query
    - Run read-only query against the confirmed staging container endpoint
    - Confirm: 17 SMEs, 84 Tracker Records, ₹2,10,969 Annexure-II, ₹1,45,000 Annexure-III

[ ] Step 4: Staging Write-Path Smoke Test
    - In staging environment only, perform 1 test update (e.g. update review comment on a test topic)
    - Confirm change persists in 'staging-voroa-test' and does NOT affect production
```

---

## 7. Final Decision Summary

| Test ID | Description | Status | Evidence / Reason |
| :---: | :--- | :---: | :--- |
| **STG-04** | Exclusive Neon Staging Branch Connection | **UNVERIFIED** | Application uses dynamic runtime injection; Voroa dashboard access required. |
| **STG-05** | Production & Staging Database Isolation | **UNVERIFIED** | Isolation boundary resides in Voroa container routing; cannot be verified from code alone. |
| **STG-09** | Read-Only Data Provenance | **UNVERIFIED** | Data counts are 100% verified, but the exact underlying Neon branch is unconfirmed. |

### Final Audit Decision:
### **INCONCLUSIVE – ADMINISTRATIVE EVIDENCE MISSING**

**Next Action:** Submit this report to the project administrator to complete the 4-step checklist in Section 6. Once the administrator confirms that `DATABASE_URL` in Voroa points to `staging-voroa-test`, the portal is immediately eligible for **VERIFIED – READY FOR SEPARATE PRODUCTION APPROVAL**.

*No deployments, database writes, schema changes, or production actions were performed.*
