import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  REAL_PM_EVIDYA_BUDGET_COMPONENTS,
  REAL_PM_EVIDYA_BUDGET_HEADS,
  REAL_PM_EVIDYA_SMES,
  REAL_PM_EVIDYA_PROJECTS,
  REAL_PM_EVIDYA_PRODUCTION_RECORDS,
  REAL_PM_EVIDYA_VIDEOS,
  REAL_PM_EVIDYA_SME_WORK_ENTRIES,
  getCanonicalAnnexureI,
  getCanonicalAnnexureII,
  getCanonicalAnnexureIII
} from './fallbackData';
import { TRACKER_SOURCE_RECORDS } from './trackerInitialData';

const globalForPrisma = global as unknown as { prisma: any };

// =========================================================================
// CANONICAL VIDEO PRODUCTION TRACKER DATA INITIALIZATION (76 TOPICS)
// =========================================================================

function initCanonicalTracker() {
  const entryBySeq = new Map<number, any>();
  REAL_PM_EVIDYA_SME_WORK_ENTRIES.forEach((e: any) => entryBySeq.set(e.epicSequence, e));

  const initialSchedules: any[] = [];
  const initialEditorRecords: any[] = [];
  const initialVideos: any[] = [];

  for (const r of TRACKER_SOURCE_RECORDS) {
    const entry = entryBySeq.get(r.epicSeq);
    if (!entry) continue;

    const vidId = `VID-${String(r.rowNumber).padStart(3, '0')}`;
    const shootId = `shoot-VID-${String(r.rowNumber).padStart(3, '0')}`;
    const edId = `ed-VID-${String(r.rowNumber).padStart(3, '0')}`;

    const meta = JSON.stringify({
      sNo: r.sNo,
      monthSNo: r.monthSNo,
      month: r.month,
      epicCode: r.epicCode,
      excelRow: r.excelRow,
      originalTopic: r.videoTopic,
      submissionStatus: r.videoLink ? 'Completed' : (r.editStatus || 'Pending')
    });

    initialVideos.push({
      id: vidId,
      epicId: entry.id,
      title: r.videoTopic,
      smeName: r.smeName,
      trade: r.trade,
      duration: r.duration,
      videoLink: r.videoLink || '',
      createdAt: r.shootStartDate || '2026-10-01T00:00:00.000Z',
      updatedAt: r.editEndDate || '2026-10-15T00:00:00.000Z'
    });

    initialSchedules.push({
      id: shootId,
      workEntryId: entry.id,
      videoTitle: r.videoTopic,
      shootDate: r.shootStartDate,
      scheduledStart: r.shootStartDate,
      scheduledEnd: r.shootEndDate,
      cameraman: r.cameraman,
      status: r.shootStatus || 'Completed',
      location: r.month,
      productionNotes: meta,
      createdAt: r.shootStartDate || '2026-10-01T00:00:00.000Z',
      updatedAt: r.shootEndDate || '2026-10-15T00:00:00.000Z'
    });

    initialEditorRecords.push({
      id: edId,
      workEntryId: entry.id,
      assignedVideo: r.videoTopic,
      editorName: r.editorName,
      editingStartDate: r.editStartDate,
      editingEndDate: r.editEndDate,
      status: r.editStatus || (r.videoLink ? 'Completed' : 'Pending'),
      duration: r.duration,
      finalVideoFile: r.videoLink,
      reviewComments: meta,
      createdAt: r.editStartDate || '2026-10-01T00:00:00.000Z',
      updatedAt: r.editEndDate || '2026-10-15T00:00:00.000Z'
    });
  }

  // Also include any legacy videos from REAL_PM_EVIDYA_VIDEOS (with strict deduplication by title and link)
  (REAL_PM_EVIDYA_VIDEOS as any[]).forEach(v => {
    const normTitle = (v.title || '').trim().toLowerCase().replace(/[\u2010-\u2015]/g, '-');
    const normLink = (v.videoLink || '').trim().toLowerCase();
    const alreadyExists = initialVideos.some(iv => {
      const ivTitle = (iv.title || '').trim().toLowerCase().replace(/[\u2010-\u2015]/g, '-');
      const ivLink = (iv.videoLink || '').trim().toLowerCase();
      return iv.id === v.id || ivTitle === normTitle || (normLink && ivLink === normLink);
    });
    if (!alreadyExists) {
      initialVideos.push(v);
    }
  });

  return { initialSchedules, initialEditorRecords, initialVideos };
}

// =========================================================================
// STAFF ACCOUNTS INITIALIZATION (ADMIN, CAMERAMEN, VIDEO EDITORS)
// =========================================================================

const STAFF_PASSWORD_HASH = "$2b$12$5YWrRpEsXi87uO/N6FccFuFEAmEyuNz6zu/UliFwepyjJtw4Luigu";

const INITIAL_USERS: any[] = [
  { id: 'user-admin-1', name: 'Administrator', email: 'muthukamatchi.off@gmail.com', role: 'ADMIN', status: 'ACTIVE', department: 'IT', designation: 'Admin', password: STAFF_PASSWORD_HASH },
  { id: 'user-admin-2', name: 'Harshitha Raman', email: 'harshitharaman.nimi@gmail.com', role: 'ADMIN', status: 'ACTIVE', department: 'IT', designation: 'Admin', password: STAFF_PASSWORD_HASH },
  { id: 'user-admin-3', name: 'Harshitha Raman', email: 'harshitharamannimi@gmail.com', role: 'ADMIN', status: 'ACTIVE', department: 'IT', designation: 'Admin', password: STAFF_PASSWORD_HASH },
  { id: 'user-official-1', name: 'Ashfaq', email: 'ashfaq.nimi@gmail.com', role: 'HIGHER_OFFICIAL_VIEWER', status: 'ACTIVE', department: 'Review Authority', designation: 'Higher Official Viewer', password: STAFF_PASSWORD_HASH },
  { id: 'user-official-2', name: 'Rajeswari M', email: 'rajeswari.m41@gov.in', role: 'HIGHER_OFFICIAL_VIEWER', status: 'ACTIVE', department: 'Review Authority', designation: 'Higher Official Viewer', password: STAFF_PASSWORD_HASH },

  // Active Cameramen
  { id: 'cam-parasuraman', name: 'Parasuraman', email: 'parasuraman.cam@nimi.org', role: 'CAMERAMAN', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Camera Operator', password: STAFF_PASSWORD_HASH },
  { id: 'cam-antony', name: 'Antony Alcander', email: 'antony.alcander@gmail.com', role: 'CAMERAMAN', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Camera Operator', password: STAFF_PASSWORD_HASH },
  { id: 'cam-antony-parasuraman', name: 'Antony Parasuraman', email: 'antony.parasuraman@nimi.org', role: 'CAMERAMAN', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Camera Operator', password: STAFF_PASSWORD_HASH },
  { id: 'cam-generic', name: 'Cameraman', email: 'cameraman@nimi.org', role: 'CAMERAMAN', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Camera Operator', password: STAFF_PASSWORD_HASH },

  // Active Video Editors
  { id: 'ed-suganthan', name: 'Suganthan', email: 'suganthan@nimi.org', role: 'EDITOR', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Video Editor', password: STAFF_PASSWORD_HASH },
  { id: 'ed-manikandan', name: 'Manikandan', email: 'manikandan@nimi.org', role: 'EDITOR', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Video Editor', password: STAFF_PASSWORD_HASH },
  { id: 'ed-hassan', name: 'Hassan', email: 'hassan@nimi.org', role: 'EDITOR', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Video Editor', password: STAFF_PASSWORD_HASH },
  { id: 'ed-bala', name: 'Bala', email: 'bala@nimi.org', role: 'EDITOR', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Video Editor', password: STAFF_PASSWORD_HASH },
  { id: 'ed-ramaswamy', name: 'Ramaswamy', email: 'ramaswamy@nimi.org', role: 'EDITOR', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Video Editor', password: STAFF_PASSWORD_HASH },
  { id: 'ed-parandhaman', name: 'Parandhaman', email: 'parandhaman@nimi.org', role: 'EDITOR', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Video Editor', password: STAFF_PASSWORD_HASH },
  { id: 'ed-generic', name: 'Editor', email: 'editor@nimi.org', role: 'EDITOR', status: 'ACTIVE', department: '[1,2,3,4,5,6,7,8,9,10,11,12,15,16,17]', designation: 'Video Editor', password: STAFF_PASSWORD_HASH },

  // Generic Viewers / Team Members
  { id: 'user-viewer', name: 'Viewer', email: 'viewer@nimi.org', role: 'VIEWER', status: 'ACTIVE', department: 'General', designation: 'Viewer', password: STAFF_PASSWORD_HASH },
  { id: 'user-team', name: 'Team Member', email: 'team@nimi.org', role: 'TEAM_MEMBER', status: 'ACTIVE', department: 'Production', designation: 'Team Member', password: STAFF_PASSWORD_HASH }
];

// =========================================================================
// DISK PERSISTENT LIVE STORE FOR ALL BUDGET HEADS, TRACKER & USER ENTRIES
// =========================================================================

interface LiveStoreData {
  budgetComponents: any[];
  budgetHeads: any[];
  shootingSchedules: any[];
  videoEditorRecords: any[];
  videoLibraries: any[];
  smes: any[];
  smeWorkEntries: any[];
  users: any[];
  auditLogs: any[];
}

const STORAGE_FILE = path.join(process.cwd(), 'data', 'pm_evidya_live_store.json');

function computeComponentMetrics(comp: any) {
  let expenditure = 0;
  if (comp.componentNo === 1 && Array.isArray(comp.annexureI)) {
    comp.annexureI.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
  }
  if (comp.componentNo === 2 && Array.isArray(comp.annexureII)) {
    comp.annexureII.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
  }
  if (comp.componentNo === 3 && Array.isArray(comp.annexureIII)) {
    comp.annexureIII.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
  }
  if (comp.componentNo === 4 && Array.isArray(comp.annexureIV)) {
    comp.annexureIV.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
  }
  if (comp.componentNo === 5 && Array.isArray(comp.annexureV)) {
    comp.annexureV.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
  }
  if (comp.componentNo === 6 && Array.isArray(comp.annexureVI)) {
    comp.annexureVI.forEach((a: any) => expenditure += (Number(a.totalExpenditure) || 0));
  }
  comp.expenditureIncurred = expenditure;
  comp.unutilizedBalance = comp.approvedBudget - expenditure;
  comp.utilizationPercent = comp.approvedBudget > 0 ? ((expenditure / comp.approvedBudget) * 100).toFixed(2) : '0.00';
  return comp;
}

function loadLiveStore(): LiveStoreData {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.budgetComponents) && parsed.budgetComponents.length >= 6) {
        // Re-compute dynamic metrics
        parsed.budgetComponents.forEach(computeComponentMetrics);
        return parsed;
      }
    }
  } catch (err) {
    console.error('[LiveStore] Error loading storage file, re-initializing:', err);
  }

  // Deep clone initial canonical data
  const canonicalComponents = JSON.parse(JSON.stringify(REAL_PM_EVIDYA_BUDGET_COMPONENTS));
  if (!canonicalComponents[0]?.annexureI || canonicalComponents[0].annexureI.length === 0) {
    canonicalComponents[0].annexureI = getCanonicalAnnexureI();
  }
  if (!canonicalComponents[1]?.annexureII || canonicalComponents[1].annexureII.length === 0) {
    canonicalComponents[1].annexureII = getCanonicalAnnexureII();
  }
  if (!canonicalComponents[2]?.annexureIII || canonicalComponents[2].annexureIII.length === 0) {
    canonicalComponents[2].annexureIII = getCanonicalAnnexureIII();
  }
  canonicalComponents.forEach(computeComponentMetrics);

  const { initialSchedules, initialEditorRecords, initialVideos } = initCanonicalTracker();

  const store: LiveStoreData = {
    budgetComponents: canonicalComponents,
    budgetHeads: JSON.parse(JSON.stringify(REAL_PM_EVIDYA_BUDGET_HEADS)),
    shootingSchedules: initialSchedules,
    videoEditorRecords: initialEditorRecords,
    videoLibraries: initialVideos,
    smes: JSON.parse(JSON.stringify(REAL_PM_EVIDYA_SMES)),
    smeWorkEntries: JSON.parse(JSON.stringify(REAL_PM_EVIDYA_SME_WORK_ENTRIES)),
    users: JSON.parse(JSON.stringify(INITIAL_USERS)),
    auditLogs: []
  };

  try {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('[LiveStore] Error writing initial storage file:', err);
  }

  return store;
}

const liveStore: LiveStoreData = (globalThis as any).__pmLiveStore || loadLiveStore();
(globalThis as any).__pmLiveStore = liveStore;

function persistLiveStore() {
  try {
    liveStore.budgetComponents.forEach(computeComponentMetrics);
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpFile = `${STORAGE_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(liveStore, null, 2), 'utf8');
    try {
      fs.renameSync(tmpFile, STORAGE_FILE);
    } catch {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(liveStore, null, 2), 'utf8');
      try { fs.unlinkSync(tmpFile); } catch (_) {}
    }
  } catch (err) {
    console.error('[LiveStore] Failed to persist data to disk:', err);
  }
}

// Helper to dynamically attach related records to SMEWorkEntry
function attachWorkEntryRelations(entry: any) {
  if (!entry) return null;
  const schedules = liveStore.shootingSchedules.filter((s: any) => s.workEntryId === entry.id);
  const editorRecs = liveStore.videoEditorRecords.filter((e: any) => e.workEntryId === entry.id);
  const vids = liveStore.videoLibraries.filter((v: any) => v.epicId === entry.id);
  const sme = entry.sme || liveStore.smes.find((s: any) => s.id === entry.smeId) || null;

  // Preserve and sort documents with UPLOADED documents prioritized
  let docs = Array.isArray(entry.documents) ? [...entry.documents] : [];
  docs.sort((a: any, b: any) => {
    const isUpA = a.status === 'UPLOADED' || (a.filePath && !a.filePath.startsWith('{')) ? 1 : 0;
    const isUpB = b.status === 'UPLOADED' || (b.filePath && !b.filePath.startsWith('{')) ? 1 : 0;
    if (isUpB !== isUpA) return isUpB - isUpA;
    const vA = a.version || 1;
    const vB = b.version || 1;
    if (vB !== vA) return vB - vA;
    const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tB - tA;
  });

  const payments = Array.isArray(entry.payments) && entry.payments.length > 0
    ? entry.payments
    : (Array.isArray((liveStore as any).payments) ? (liveStore as any).payments.filter((p: any) => p.workEntryId === entry.id) : []);

  return {
    ...entry,
    sme,
    documents: docs,
    payments,
    shootingSchedules: schedules,
    videoEditorRecords: editorRecs,
    videoLibraries: vids
  };
}

function attachSmeRelations(sme: any) {
  if (!sme) return null;
  const clone = { ...sme };
  const matchingWorkEntries = liveStore.smeWorkEntries
    .filter((we: any) => we.smeId === sme.id || we.sme?.id === sme.id || (we.sme?.name && sme.name && we.sme.name.trim().toLowerCase() === sme.name.trim().toLowerCase()))
    .map(attachWorkEntryRelations);

  if (matchingWorkEntries.length > 0) {
    clone.workEntries = matchingWorkEntries;
  } else if (Array.isArray(sme.workEntries) && sme.workEntries.length > 0) {
    clone.workEntries = sme.workEntries.map((we: any) => {
      const full = liveStore.smeWorkEntries.find((e: any) => e.id === we.id || e.epicSequence === we.epicSequence);
      return full ? attachWorkEntryRelations(full) : we;
    });
  } else {
    clone.workEntries = [];
  }
  return clone;
}

// =========================================================================
// DATABASE URL DETECTION & FAST-PATH CONFIGURATION
// =========================================================================

let isDbConnectionFailed = false;

const getDbUrl = () => {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING
  ];
  for (const raw of candidates) {
    if (typeof raw === 'string') {
      const clean = raw.trim().replace(/^["']|["']$/g, '');
      if (
        (clean.startsWith('postgresql://') || clean.startsWith('postgres://')) &&
        !clean.includes('[SENSITIVE]') &&
        (!process.env.VERCEL || (!clean.includes('localhost') && !clean.includes('127.0.0.1')))
      ) {
        let url = clean.includes('schema=')
          ? clean
          : (clean.includes('?') ? `${clean}&schema=public` : `${clean}?schema=public`);
        if (!url.includes('connection_limit=')) url += '&connection_limit=15';
        if (!url.includes('pool_timeout=')) url += '&pool_timeout=5';
        if (!url.includes('connect_timeout=')) url += '&connect_timeout=5';
        return url;
      }
    }
  }

  // Check local .env.bak if present and candidates were missing/masked (local environment only)
  if (typeof window === 'undefined' && !process.env.VERCEL) {
    try {
      const bakPath = path.join(process.cwd(), '.env.bak');
      if (fs.existsSync(bakPath)) {
        const content = fs.readFileSync(bakPath, 'utf8');
        const match = content.match(/DATABASE_URL=["']?(postgres(?:ql)?:\/\/[^\s"']+)["']?/);
        if (match && match[1]) {
          let url = match[1].trim();
          return url.includes('schema=')
            ? url
            : (url.includes('?') ? `${url}&schema=public` : `${url}?schema=public`);
        }
      }
    } catch {}
  }

  const fallback = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, '');
  return fallback && (fallback.startsWith('postgresql://') || fallback.startsWith('postgres://')) && !fallback.includes('[SENSITIVE]')
    ? fallback
    : undefined;
};

// =========================================================================
// IN-MEMORY & DISK PERSISTENT DISPATCHER (NO RESET, 100% PERSISTENT)
// =========================================================================

function handleMemoryFallback(model: string, operation: string, args: any): any {
  // =======================================================================
  // BUDGET COMPONENT
  // =======================================================================
  if (model === 'BudgetComponent') {
    if (operation === 'findMany') {
      liveStore.budgetComponents.forEach(computeComponentMetrics);
      return liveStore.budgetComponents;
    }
    if (operation === 'update') {
      const compNo = args?.where?.componentNo;
      const id = args?.where?.id;
      const comp = liveStore.budgetComponents.find((c: any) => (compNo && c.componentNo === compNo) || (id && c.id === id));
      if (comp && args?.data) {
        Object.assign(comp, args.data);
        comp.updatedAt = new Date().toISOString();
        computeComponentMetrics(comp);
        persistLiveStore();
        return comp;
      }
      return { id, ...args?.data };
    }
    if (operation === 'findUnique' || operation === 'findFirst') {
      const compNo = args?.where?.componentNo;
      if (compNo) {
        const found = liveStore.budgetComponents.find((c: any) => c.componentNo === compNo);
        return found ? computeComponentMetrics(found) : null;
      }
      const id = args?.where?.id;
      if (id) {
        const found = liveStore.budgetComponents.find((c: any) => c.id === id);
        return found ? computeComponentMetrics(found) : null;
      }
      return liveStore.budgetComponents[0] ? computeComponentMetrics(liveStore.budgetComponents[0]) : null;
    }
  }

  // =======================================================================
  // BUDGET HEAD
  // =======================================================================
  if (model === 'BudgetHead') {
    if (operation === 'findMany') return liveStore.budgetHeads;
    if (operation === 'findUnique' || operation === 'findFirst') {
      return liveStore.budgetHeads.find(h => h.id === args?.where?.id || h.name === args?.where?.name) || null;
    }
    if (operation === 'create') {
      const newHead = { id: args?.data?.id || `bh-${Date.now()}`, ...args?.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      liveStore.budgetHeads.push(newHead);
      persistLiveStore();
      return newHead;
    }
    if (operation === 'update') {
      const head = liveStore.budgetHeads.find(h => h.id === args?.where?.id);
      if (head && args?.data) {
        Object.assign(head, args.data);
        head.updatedAt = new Date().toISOString();
        persistLiveStore();
        return head;
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = liveStore.budgetHeads.findIndex(h => h.id === args?.where?.id);
      if (idx !== -1) {
        const deleted = liveStore.budgetHeads.splice(idx, 1)[0];
        persistLiveStore();
        return deleted;
      }
      return { id: args?.where?.id };
    }
  }

  // =======================================================================
  // ANNEXURE I (Component 1 - Digital Content Development & Production)
  // =======================================================================
  if (model === 'AnnexureI') {
    const list = (liveStore.budgetComponents[0]?.annexureI || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'findUnique' || operation === 'findFirst') {
      return list.find((x: any) => x.id === args?.where?.id) || null;
    }
    if (operation === 'deleteMany') {
      const targetId = args?.where?.id;
      if (targetId && typeof targetId === 'string') {
        liveStore.budgetComponents[0].annexureI = list.filter((x: any) => x.id !== targetId);
      } else {
        liveStore.budgetComponents[0].annexureI = [];
      }
      persistLiveStore();
      return { count: list.length };
    }
    if (operation === 'createMany') {
      const items = Array.isArray(args?.data) ? args.data : [args?.data];
      for (const item of items) {
        list.push({
          id: item?.id || `ai-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ...item,
          createdAt: item?.createdAt || new Date().toISOString(),
          updatedAt: item?.updatedAt || new Date().toISOString()
        });
      }
      persistLiveStore();
      return { count: items.length };
    }
    if (operation === 'create') {
      const newItem = {
        id: args?.data?.id || `ai-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(newItem);
      persistLiveStore();
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        persistLiveStore();
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        const removed = list.splice(idx, 1)[0];
        persistLiveStore();
        return removed;
      }
      return { id: args?.where?.id, expertName: 'Entry' };
    }
  }

  // =======================================================================
  // ANNEXURE II (Component 2 - Capacity Building & Training)
  // =======================================================================
  if (model === 'AnnexureII') {
    const list = (liveStore.budgetComponents[1]?.annexureII || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'findUnique' || operation === 'findFirst') {
      return list.find((x: any) => x.id === args?.where?.id) || null;
    }
    if (operation === 'deleteMany') {
      const targetId = args?.where?.id;
      if (targetId && typeof targetId === 'string') {
        liveStore.budgetComponents[1].annexureII = list.filter((x: any) => x.id !== targetId);
      } else {
        liveStore.budgetComponents[1].annexureII = [];
      }
      persistLiveStore();
      return { count: list.length };
    }
    if (operation === 'createMany') {
      const items = Array.isArray(args?.data) ? args.data : [args?.data];
      for (const item of items) {
        list.push({
          id: item?.id || `aii-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ...item,
          createdAt: item?.createdAt || new Date().toISOString(),
          updatedAt: item?.updatedAt || new Date().toISOString()
        });
      }
      persistLiveStore();
      return { count: items.length };
    }
    if (operation === 'create') {
      const newItem = {
        id: args?.data?.id || `aii-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(newItem);
      persistLiveStore();
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        persistLiveStore();
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        const removed = list.splice(idx, 1)[0];
        persistLiveStore();
        return removed;
      }
      return { id: args?.where?.id, participant: 'Entry' };
    }
  }

  // =======================================================================
  // ANNEXURE III (Component 3 - Human Resource & Technical Support)
  // =======================================================================
  if (model === 'AnnexureIII') {
    const list = (liveStore.budgetComponents[2]?.annexureIII || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'deleteMany') {
      const targetId = args?.where?.id;
      if (targetId && typeof targetId === 'string') {
        liveStore.budgetComponents[2].annexureIII = list.filter((x: any) => x.id !== targetId);
      } else {
        liveStore.budgetComponents[2].annexureIII = [];
      }
      persistLiveStore();
      return { count: list.length };
    }
    if (operation === 'createMany') {
      const items = Array.isArray(args?.data) ? args.data : [args?.data];
      for (const item of items) {
        list.push({
          id: item?.id || `aiii-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ...item,
          createdAt: item?.createdAt || new Date().toISOString(),
          updatedAt: item?.updatedAt || new Date().toISOString()
        });
      }
      persistLiveStore();
      return { count: items.length };
    }
    if (operation === 'findUnique' || operation === 'findFirst') {
      return list.find((x: any) => x.id === args?.where?.id) || null;
    }
    if (operation === 'create') {
      const newItem = {
        id: args?.data?.id || `aiii-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(newItem);
      persistLiveStore();
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        persistLiveStore();
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        const removed = list.splice(idx, 1)[0];
        persistLiveStore();
        return removed;
      }
      return { id: args?.where?.id };
    }
  }

  // =======================================================================
  // ANNEXURE IV (Component 4 - Digital Infrastructure, Archive & Network)
  // =======================================================================
  if (model === 'AnnexureIV') {
    const targetComp4 = liveStore.budgetComponents.find((c: any) => c.componentNo === 4) || liveStore.budgetComponents[3];
    if (targetComp4 && !targetComp4.annexureIV) targetComp4.annexureIV = [];
    const list = (targetComp4?.annexureIV || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'deleteMany') {
      if (targetComp4) targetComp4.annexureIV = [];
      persistLiveStore();
      return { count: 0 };
    }
    if (operation === 'findUnique' || operation === 'findFirst') {
      return list.find((x: any) => x.id === args?.where?.id) || null;
    }
    if (operation === 'create') {
      const createData = { ...args?.data };
      if (createData.budgetComponent?.connect?.id) {
        createData.budgetComponentId = createData.budgetComponent.connect.id;
        delete createData.budgetComponent;
      }
      const newItem = {
        id: createData.id || `aiv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...createData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(newItem);
      persistLiveStore();
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        const updateData = { ...args?.data };
        if (updateData.budgetComponent?.connect?.id) {
          updateData.budgetComponentId = updateData.budgetComponent.connect.id;
          delete updateData.budgetComponent;
        }
        list[idx] = { ...list[idx], ...updateData, updatedAt: new Date().toISOString() };
        persistLiveStore();
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        const removed = list.splice(idx, 1)[0];
        persistLiveStore();
        return removed;
      }
      return { id: args?.where?.id };
    }
  }

  // =======================================================================
  // ANNEXURE V (Component 5 - School Telecast & Distribution Infrastructure)
  // =======================================================================
  if (model === 'AnnexureV') {
    const list = (liveStore.budgetComponents[4]?.annexureV || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'deleteMany') {
      liveStore.budgetComponents[4].annexureV = [];
      persistLiveStore();
      return { count: 0 };
    }
    if (operation === 'findUnique' || operation === 'findFirst') {
      return list.find((x: any) => x.id === args?.where?.id) || null;
    }
    if (operation === 'create') {
      const newItem = {
        id: args?.data?.id || `av-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(newItem);
      persistLiveStore();
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        persistLiveStore();
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        const removed = list.splice(idx, 1)[0];
        persistLiveStore();
        return removed;
      }
      return { id: args?.where?.id };
    }
  }

  // =======================================================================
  // ANNEXURE VI (Component 6 - Outreach, Feedback, Research & Advocacy)
  // =======================================================================
  if (model === 'AnnexureVI') {
    const list = (liveStore.budgetComponents[5]?.annexureVI || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'deleteMany') {
      liveStore.budgetComponents[5].annexureVI = [];
      persistLiveStore();
      return { count: 0 };
    }
    if (operation === 'findUnique' || operation === 'findFirst') {
      return list.find((x: any) => x.id === args?.where?.id) || null;
    }
    if (operation === 'create') {
      const newItem = {
        id: args?.data?.id || `avi-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(newItem);
      persistLiveStore();
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        persistLiveStore();
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        const removed = list.splice(idx, 1)[0];
        persistLiveStore();
        return removed;
      }
      return { id: args?.where?.id, platform: 'Entry' };
    }
  }

  // =======================================================================
  // SME MODEL
  // =======================================================================
  if (model === 'SME') {
    if (operation === 'findMany') {
      return liveStore.smes.map(attachSmeRelations);
    }
    if (operation === 'findUnique' || operation === 'findFirst') {
      const id = args?.where?.id;
      const name = args?.where?.name;
      let sme: any = null;
      if (id) {
        sme = liveStore.smes.find((s: any) => s.id === id);
      } else if (name) {
        const target = typeof name === 'string' ? name : (name.equals || name.contains || '');
        sme = liveStore.smes.find((s: any) => s.name?.toLowerCase().includes(target.toLowerCase()));
      } else {
        sme = liveStore.smes[0];
      }
      return attachSmeRelations(sme);
    }
    if (operation === 'update') {
      const id = args?.where?.id;
      let sme = liveStore.smes.find((s: any) => s.id === id);
      if (!sme && args?.where?.name) {
        const target = typeof args.where.name === 'string' ? args.where.name : (args.where.name.equals || '');
        sme = liveStore.smes.find((s: any) => s.name?.toLowerCase() === target.toLowerCase());
      }
      if (sme && args?.data) {
        Object.assign(sme, args.data);
        sme.updatedAt = new Date().toISOString();
        liveStore.smeWorkEntries.forEach((e: any) => {
          if (e.smeId === sme.id || e.sme?.id === sme.id) {
            if (!e.sme) e.sme = {};
            Object.assign(e.sme, args.data);
          }
        });
        persistLiveStore();
        return attachSmeRelations(sme);
      }
      return attachSmeRelations(sme) || (id ? { id, ...args?.data } : null);
    }
    if (operation === 'updateMany') {
      const id = args?.where?.id;
      if (id) {
        const sme = liveStore.smes.find((s: any) => s.id === id);
        if (sme && args?.data) {
          Object.assign(sme, args.data);
          sme.updatedAt = new Date().toISOString();
          persistLiveStore();
        }
      }
      return { count: 1 };
    }
    if (operation === 'delete') {
      const id = args?.where?.id;
      const idx = liveStore.smes.findIndex((s: any) => s.id === id);
      if (idx !== -1) {
        const removed = liveStore.smes.splice(idx, 1)[0];
        persistLiveStore();
        return removed;
      }
      return { id };
    }
    if (operation === 'create') {
      const newSme = {
        id: args?.data?.id || `sme-${Date.now()}`,
        name: args?.data?.name || '',
        designation: args?.data?.designation || '',
        institute: args?.data?.institute || '',
        location: args?.data?.location || '',
        address: args?.data?.address || '',
        email: args?.data?.email || null,
        contactNumber: args?.data?.contactNumber || null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workEntries: []
      };
      liveStore.smes.push(newSme);
      persistLiveStore();
      return attachSmeRelations(newSme);
    }
  }

  if (model === 'Project' && operation === 'findMany') {
    return REAL_PM_EVIDYA_PROJECTS;
  }

  if (model === 'ProductionRecord' && operation === 'findMany') {
    return REAL_PM_EVIDYA_PRODUCTION_RECORDS;
  }

  // =======================================================================
  // VIDEO LIBRARY (DELIVERABLES)
  // =======================================================================
  if (model === 'VideoLibrary') {
    if (operation === 'findMany') {
      const where = args?.where || {};
      let list = [...liveStore.videoLibraries];

      if (where.epicId) {
        list = list.filter((v: any) => v.epicId === where.epicId);
      }

      // Filter by videoLink completed requirement
      if (where.videoLink) {
        if (where.videoLink.not === '' || where.videoLink.not === null) {
          list = list.filter((v: any) => v.videoLink && v.videoLink.trim() !== '' && v.videoLink !== '#');
        } else if (where.videoLink.startsWith) {
          list = list.filter((v: any) => v.videoLink && v.videoLink.startsWith(where.videoLink.startsWith));
        }
      }

      // Deduplicate by normalized title and link
      const seenTitles = new Set<string>();
      const seenLinks = new Set<string>();
      const deduped: any[] = [];
      for (const v of list) {
        const normTitle = (v.title || '').trim().toLowerCase().replace(/[\u2010-\u2015]/g, '-');
        const normLink = (v.videoLink || '').trim().toLowerCase();
        if (seenTitles.has(normTitle) || (normLink && seenLinks.has(normLink))) continue;
        seenTitles.add(normTitle);
        if (normLink) seenLinks.add(normLink);
        deduped.push(v);
      }

      return deduped;
    }

    if (operation === 'findUnique' || operation === 'findFirst') {
      const anyWhere = (args as any)?.where || {};
      const id = typeof anyWhere.id === 'string' ? anyWhere.id : undefined;
      if (id) {
        return liveStore.videoLibraries.find((v: any) => v.id === id) || null;
      }
      const epicId = typeof anyWhere.epicId === 'string' ? anyWhere.epicId : undefined;
      const title = typeof anyWhere.title === 'string' ? anyWhere.title : anyWhere.title?.equals;
      if (epicId || title) {
        const match = liveStore.videoLibraries.find((v: any) => 
          (!epicId || v.epicId === epicId) &&
          (!title || v.title?.toLowerCase() === title.toLowerCase())
        );
        if (match) return match;
      }
      if (Array.isArray(anyWhere.OR)) {
        for (const cond of (anyWhere.OR as any[])) {
          const cId = cond.epicId || cond.id;
          const cTitle = typeof cond.title === 'string' ? cond.title : cond.title?.equals;
          const match = liveStore.videoLibraries.find((v: any) =>
            (cId && (v.id === cId || v.epicId === cId)) ||
            (cTitle && v.title?.toLowerCase() === cTitle.toLowerCase())
          );
          if (match) return match;
        }
      }
      return liveStore.videoLibraries[0] || null;
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      const vid = liveStore.videoLibraries.find((v: any) => v.id === id);
      if (vid && args?.data) {
        Object.assign(vid, args.data);
        vid.updatedAt = new Date().toISOString();
        persistLiveStore();
        return vid;
      }
      return vid || { id, ...args?.data };
    }

    if (operation === 'upsert') {
      const id = args?.where?.id;
      let vid = liveStore.videoLibraries.find((v: any) => v.id === id);
      if (vid) {
        if (args?.update) Object.assign(vid, args.update);
        vid.updatedAt = new Date().toISOString();
        persistLiveStore();
        return vid;
      } else {
        const created = {
          id: id || `vid-${Date.now()}`,
          ...args?.create,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        liveStore.videoLibraries.push(created);
        persistLiveStore();
        return created;
      }
    }

    if (operation === 'create') {
      const newVid = {
        id: args?.data?.id || `vid-${Date.now()}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      liveStore.videoLibraries.unshift(newVid);
      persistLiveStore();
      return newVid;
    }

    if (operation === 'count') {
      const startsWith = args?.where?.id?.startsWith;
      if (startsWith) {
        return liveStore.videoLibraries.filter((v: any) => (v.id || '').startsWith(startsWith)).length;
      }
      return liveStore.videoLibraries.length;
    }

    if (operation === 'delete' || operation === 'deleteMany') {
      const id = args?.where?.id;
      if (id) {
        const idx = liveStore.videoLibraries.findIndex((v: any) => v.id === id);
        if (idx !== -1) {
          liveStore.videoLibraries.splice(idx, 1);
          persistLiveStore();
        }
      }
      return { count: 1 };
    }
  }

  // =======================================================================
  // SME WORK ENTRY
  // =======================================================================
  if (model === 'SMEWorkEntry') {
    if (operation === 'findMany') {
      let entries = liveStore.smeWorkEntries.map(attachWorkEntryRelations);
      if (args?.where) {
        if (args.where.smeId) entries = entries.filter((e: any) => e.smeId === args.where.smeId);
        if (args.where.id) entries = entries.filter((e: any) => e.id === args.where.id);
        if (args.where.epicSequence) entries = entries.filter((e: any) => e.epicSequence === args.where.epicSequence);
        if (Array.isArray(args.where.OR)) {
          entries = entries.filter((e: any) =>
            args.where.OR.some((cond: any) => (cond.id && e.id === cond.id) || (cond.smeId && e.smeId === cond.smeId) || (cond.epicSequence && e.epicSequence === cond.epicSequence))
          );
        }
      }
      if (args?.orderBy) {
        const ob = Array.isArray(args.orderBy) ? args.orderBy[0] : args.orderBy;
        if (ob?.epicSequence === 'desc') entries.sort((a: any, b: any) => (b.epicSequence || 0) - (a.epicSequence || 0));
        else if (ob?.epicSequence === 'asc') entries.sort((a: any, b: any) => (a.epicSequence || 0) - (b.epicSequence || 0));
        else if (ob?.createdAt === 'desc') entries.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }
      return entries;
    }

    if (operation === 'findUnique' || operation === 'findFirst') {
      const id = args?.where?.id;
      const smeId = args?.where?.smeId;
      const epicSeq = args?.where?.epicSequence;
      let entry: any = null;
      if (id) {
        entry = liveStore.smeWorkEntries.find((e: any) => e.id === id);
      } else if (smeId) {
        entry = liveStore.smeWorkEntries.find((e: any) => e.smeId === smeId);
      } else if (epicSeq) {
        entry = liveStore.smeWorkEntries.find((e: any) => e.epicSequence === epicSeq);
      } else if (args?.where?.OR) {
        entry = liveStore.smeWorkEntries.find((e: any) => 
          args.where.OR.some((cond: any) => (cond.id && e.id === cond.id) || (cond.smeId && e.smeId === cond.smeId))
        );
      } else {
        entry = liveStore.smeWorkEntries[0];
      }
      return attachWorkEntryRelations(entry);
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      let entry = id ? liveStore.smeWorkEntries.find((e: any) => e.id === id) : null;
      if (!entry && args?.where?.smeId) {
        entry = liveStore.smeWorkEntries.find((e: any) => e.smeId === args.where.smeId);
      }
      if (entry && args?.data) {
        Object.assign(entry, args.data);
        entry.updatedAt = new Date().toISOString();
        liveStore.smes.forEach((s: any) => {
          if (s.id === entry.smeId && Array.isArray(s.workEntries)) {
            const nested = s.workEntries.find((we: any) => we.id === entry.id || we.epicSequence === entry.epicSequence);
            if (nested) Object.assign(nested, args.data);
          }
        });
        persistLiveStore();
        return attachWorkEntryRelations(entry);
      }
      return attachWorkEntryRelations(entry) || null;
    }

    if (operation === 'delete') {
      const id = args?.where?.id;
      const idx = liveStore.smeWorkEntries.findIndex((e: any) => e.id === id);
      if (idx !== -1) {
        const removed = liveStore.smeWorkEntries.splice(idx, 1)[0];
        persistLiveStore();
        return removed;
      }
      return { id };
    }
  }

  // SHOOTING SCHEDULE
  // =======================================================================
  if (model === 'ShootingSchedule') {
    if (operation === 'findMany') {
      const { workEntryId, status } = args?.where || {};
      return liveStore.shootingSchedules.filter((s: any) => 
        (!workEntryId || s.workEntryId === workEntryId) &&
        (!status || s.status === status)
      );
    }

    if (operation === 'findUnique' || operation === 'findFirst') {
      const anyWhere = (args as any)?.where || {};
      const id = typeof anyWhere.id === 'string' ? anyWhere.id : undefined;
      if (id) {
        const match = liveStore.shootingSchedules.find((s: any) => s.id === id || s.id === `shoot-${id}` || (typeof id === 'string' && id.startsWith('shoot-') && s.id === id.replace('shoot-', '')));
        if (match) return match;
      }
      const workEntryId = typeof anyWhere.workEntryId === 'string' ? anyWhere.workEntryId : undefined;
      const videoTitle = anyWhere.videoTitle;
      const titleStr = typeof videoTitle === 'string' ? videoTitle : (videoTitle?.equals ? String(videoTitle.equals) : undefined);
      if (workEntryId || titleStr) {
        const match = liveStore.shootingSchedules.find((s: any) => 
          (!workEntryId || s.workEntryId === workEntryId) &&
          (!titleStr || s.videoTitle?.toLowerCase() === titleStr.toLowerCase())
        );
        if (match) return match;
      }
      if (Array.isArray(anyWhere.OR)) {
        for (const cond of (anyWhere.OR as any[])) {
          const cId = cond.id;
          const cTitle = typeof cond.videoTitle === 'string' ? cond.videoTitle : (cond.videoTitle?.equals ? String(cond.videoTitle.equals) : undefined);
          const match = liveStore.shootingSchedules.find((s: any) => 
            (cId && (s.id === cId || s.id === `shoot-${cId}` || (typeof cId === 'string' && cId.startsWith('shoot-') && s.id === cId.replace('shoot-', '')))) ||
            (cTitle && s.videoTitle?.toLowerCase() === cTitle.toLowerCase())
          );
          if (match) return match;
        }
      }
      return null;
    }

    if (operation === 'create') {
      const newSchedule = {
        id: args?.data?.id || `shoot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      liveStore.shootingSchedules.push(newSchedule);
      persistLiveStore();
      return newSchedule;
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      const sched = liveStore.shootingSchedules.find((s: any) => s.id === id || s.id === `shoot-${id}` || (id?.startsWith('shoot-') && s.id === id.replace('shoot-', '')));
      if (sched && args?.data) {
        Object.assign(sched, args.data);
        sched.updatedAt = new Date().toISOString();
        persistLiveStore();
        return sched;
      }
      const created = {
        id: id || `shoot-${Date.now()}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      liveStore.shootingSchedules.push(created);
      persistLiveStore();
      return created;
    }

    if (operation === 'updateMany') {
      const { workEntryId } = args?.where || {};
      let count = 0;
      liveStore.shootingSchedules.forEach((s: any) => {
        if (!workEntryId || s.workEntryId === workEntryId) {
          Object.assign(s, args.data);
          s.updatedAt = new Date().toISOString();
          count++;
        }
      });
      persistLiveStore();
      return { count };
    }

    if (operation === 'upsert') {
      const id = args?.where?.id;
      let sched = liveStore.shootingSchedules.find((s: any) => s.id === id || s.id === `shoot-${id}` || (id?.startsWith('shoot-') && s.id === id.replace('shoot-', '')));
      if (sched) {
        if (args?.update) Object.assign(sched, args.update);
        sched.updatedAt = new Date().toISOString();
        persistLiveStore();
        return sched;
      } else {
        const created = {
          id: id || `shoot-${Date.now()}`,
          ...args?.create,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        liveStore.shootingSchedules.push(created);
        persistLiveStore();
        return created;
      }
    }

    if (operation === 'count') {
      return liveStore.shootingSchedules.length;
    }

    if (operation === 'delete') {
      const id = args?.where?.id;
      const idx = liveStore.shootingSchedules.findIndex((s: any) => s.id === id || s.id === `shoot-${id}`);
      if (idx !== -1) {
        const removed = liveStore.shootingSchedules.splice(idx, 1)[0];
        persistLiveStore();
        return removed;
      }
      return { id };
    }
  }

  // =======================================================================
  // VIDEO EDITOR RECORD
  // =======================================================================
  if (model === 'VideoEditorRecord') {
    if (operation === 'findMany') {
      const { workEntryId, status } = args?.where || {};
      return liveStore.videoEditorRecords.filter((e: any) => 
        (!workEntryId || e.workEntryId === workEntryId) &&
        (!status || e.status === status)
      );
    }

    if (operation === 'findUnique' || operation === 'findFirst') {
      const anyWhere = (args as any)?.where || {};
      const id = typeof anyWhere.id === 'string' ? anyWhere.id : undefined;
      if (id) {
        const match = liveStore.videoEditorRecords.find((e: any) => e.id === id || e.id === `ed-${id}` || (typeof id === 'string' && id.startsWith('ed-') && e.id === id.replace('ed-', '')));
        if (match) return match;
      }
      const workEntryId = typeof anyWhere.workEntryId === 'string' ? anyWhere.workEntryId : undefined;
      const assignedVideo = anyWhere.assignedVideo;
      const vidStr = typeof assignedVideo === 'string' ? assignedVideo : (assignedVideo?.equals ? String(assignedVideo.equals) : undefined);
      if (workEntryId || vidStr) {
        const match = liveStore.videoEditorRecords.find((e: any) => 
          (!workEntryId || e.workEntryId === workEntryId) &&
          (!vidStr || e.assignedVideo?.toLowerCase() === vidStr.toLowerCase())
        );
        if (match) return match;
      }
      if (Array.isArray(anyWhere.OR)) {
        for (const cond of (anyWhere.OR as any[])) {
          const cId = cond.id;
          const cVid = typeof cond.assignedVideo === 'string' ? cond.assignedVideo : (cond.assignedVideo?.equals ? String(cond.assignedVideo.equals) : undefined);
          const match = liveStore.videoEditorRecords.find((e: any) => 
            (cId && (e.id === cId || e.id === `ed-${cId}` || (typeof cId === 'string' && cId.startsWith('ed-') && e.id === cId.replace('ed-', '')))) ||
            (cVid && e.assignedVideo?.toLowerCase() === cVid.toLowerCase())
          );
          if (match) return match;
        }
      }
      return null;
    }

    if (operation === 'create') {
      const newEditorRec = {
        id: args?.data?.id || `ed-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      liveStore.videoEditorRecords.push(newEditorRec);
      persistLiveStore();
      return newEditorRec;
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      const rec = liveStore.videoEditorRecords.find((e: any) => e.id === id || e.id === `ed-${id}` || (id?.startsWith('ed-') && e.id === id.replace('ed-', '')));
      if (rec && args?.data) {
        Object.assign(rec, args.data);
        rec.updatedAt = new Date().toISOString();
        persistLiveStore();
        return rec;
      }
      const created = {
        id: id || `ed-${Date.now()}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      liveStore.videoEditorRecords.push(created);
      persistLiveStore();
      return created;
    }

    if (operation === 'updateMany') {
      const { workEntryId, assignedVideo } = args?.where || {};
      let count = 0;
      liveStore.videoEditorRecords.forEach((e: any) => {
        if ((!workEntryId || e.workEntryId === workEntryId) && (!assignedVideo || e.assignedVideo === assignedVideo)) {
          Object.assign(e, args.data);
          e.updatedAt = new Date().toISOString();
          count++;
        }
      });
      persistLiveStore();
      return { count };
    }

    if (operation === 'upsert') {
      const id = args?.where?.id;
      let rec = liveStore.videoEditorRecords.find((e: any) => e.id === id || e.id === `ed-${id}` || (id?.startsWith('ed-') && e.id === id.replace('ed-', '')));
      if (rec) {
        if (args?.update) Object.assign(rec, args.update);
        rec.updatedAt = new Date().toISOString();
        persistLiveStore();
        return rec;
      } else {
        const created = {
          id: id || `ed-${Date.now()}`,
          ...args?.create,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        liveStore.videoEditorRecords.push(created);
        persistLiveStore();
        return created;
      }
    }

    if (operation === 'count') {
      return liveStore.videoEditorRecords.length;
    }

    if (operation === 'delete') {
      const id = args?.where?.id;
      const idx = liveStore.videoEditorRecords.findIndex((e: any) => e.id === id || e.id === `ed-${id}`);
      if (idx !== -1) {
        const removed = liveStore.videoEditorRecords.splice(idx, 1)[0];
        persistLiveStore();
        return removed;
      }
      return { id };
    }
  }

  // =======================================================================
  // DOCUMENT MODEL
  // =======================================================================
  if (model === 'Document') {
    const allDocs: any[] = [];
    liveStore.smeWorkEntries.forEach((e: any) => {
      if (Array.isArray(e.documents)) {
        e.documents.forEach((d: any) => {
          const sme = e.sme || liveStore.smes.find((s: any) => s.id === e.smeId);
          allDocs.push({
            ...d,
            workEntry: {
              ...e,
              sme: sme || { name: 'Subject Matter Expert', designation: 'SME', institute: 'NIMI' }
            }
          });
        });
      }
    });

    const matchType = (docType: string, typeFilter: any) => {
      if (!typeFilter) return true;
      if (typeof typeFilter === 'string') return docType === typeFilter;
      if (typeFilter && Array.isArray(typeFilter.in)) return typeFilter.in.includes(docType);
      return false;
    };

    const matchStatus = (docStatus: string, statusFilter: any) => {
      if (!statusFilter) return true;
      if (typeof statusFilter === 'string') return docStatus === statusFilter;
      if (statusFilter && Array.isArray(statusFilter.in)) return statusFilter.in.includes(docStatus);
      return false;
    };

    const sortDocs = (docs: any[]) => {
      return [...docs].sort((a: any, b: any) => {
        const isUpA = a.status === 'UPLOADED' || (a.filePath && !a.filePath.startsWith('{')) ? 1 : 0;
        const isUpB = b.status === 'UPLOADED' || (b.filePath && !b.filePath.startsWith('{')) ? 1 : 0;
        if (isUpB !== isUpA) return isUpB - isUpA;
        const vA = a.version || 1;
        const vB = b.version || 1;
        if (vB !== vA) return vB - vA;
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tB - tA;
      });
    };

    if (operation === 'findFirst' || operation === 'findUnique') {
      const id = args?.where?.id;
      if (id) {
        const match = allDocs.find(d => d.id === id || d.workEntryId === id || (d.name && d.name.includes(id)));
        if (match) return match;
      }
      const { workEntryId, type, status } = args?.where || {};
      if (workEntryId || type || status) {
        const matching = allDocs.filter(d => 
          (!workEntryId || d.workEntryId === workEntryId) && 
          matchType(d.type, type) &&
          matchStatus(d.status, status)
        );
        if (matching.length > 0) return sortDocs(matching)[0];
      }
      if (Array.isArray(args?.where?.OR)) {
        for (const condition of (args.where.OR as any[])) {
          const cId = condition.id || condition.workEntryId;
          const containsStr = typeof condition.name === 'string' ? condition.name : condition.name?.contains;
          const match = allDocs.find(d => d.id === cId || d.workEntryId === cId || (containsStr && d.name?.includes(containsStr)));
          if (match) return match;
        }
      }
      return null;
    }

    if (operation === 'findMany') {
      const { workEntryId, type, status } = args?.where || {};
      const matching = allDocs.filter(d => 
        (!workEntryId || d.workEntryId === workEntryId) && 
        matchType(d.type, type) &&
        matchStatus(d.status, status)
      );
      return sortDocs(matching);
    }

    if (operation === 'create') {
      const newDoc = {
        id: args?.data?.id || `doc-${Date.now()}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (args?.data?.workEntryId) {
        const entry = liveStore.smeWorkEntries.find((e: any) => e.id === args.data.workEntryId);
        if (entry) {
          if (!entry.documents) entry.documents = [];
          const existingIdx = entry.documents.findIndex((d: any) => d.id === newDoc.id || d.type === newDoc.type);
          if (existingIdx !== -1) {
            entry.documents[existingIdx] = { ...entry.documents[existingIdx], ...newDoc };
          } else {
            entry.documents.push(newDoc);
          }
          persistLiveStore();
        }
      }
      allDocs.push(newDoc);
      return newDoc;
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      for (const entry of liveStore.smeWorkEntries) {
        if (Array.isArray(entry.documents)) {
          const origDoc = entry.documents.find((d: any) => d.id === id);
          if (origDoc && args?.data) {
            Object.assign(origDoc, args.data);
            origDoc.updatedAt = new Date().toISOString();
            persistLiveStore();
            return origDoc;
          }
        }
      }
      const doc = allDocs.find(d => d.id === id);
      if (doc && args?.data) {
        Object.assign(doc, args.data);
        doc.updatedAt = new Date().toISOString();
        return doc;
      }
      return doc || null;
    }
  }

  // =======================================================================
  // PAYMENT MODEL
  // =======================================================================
  if (model === 'Payment') {
    const allPayments: any[] = [];
    liveStore.smeWorkEntries.forEach((e: any) => {
      if (Array.isArray(e.payments)) allPayments.push(...e.payments);
    });

    if (operation === 'findFirst' || operation === 'findUnique') {
      const id = args?.where?.id;
      if (id) return allPayments.find(p => p.id === id) || null;
      const { workEntryId } = args?.where || {};
      return allPayments.find(p => !workEntryId || p.workEntryId === workEntryId) || null;
    }

    if (operation === 'findMany') {
      const { workEntryId } = args?.where || {};
      return allPayments.filter(p => !workEntryId || p.workEntryId === workEntryId);
    }

    if (operation === 'create') {
      const newPayment = {
        id: `pay-${Date.now()}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (args?.data?.workEntryId) {
        const entry = liveStore.smeWorkEntries.find((e: any) => e.id === args.data.workEntryId);
        if (entry) {
          if (!entry.payments) entry.payments = [];
          entry.payments.push(newPayment);
          persistLiveStore();
        }
      }
      allPayments.push(newPayment);
      return newPayment;
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      const payment = allPayments.find(p => p.id === id);
      if (payment && args?.data) {
        Object.assign(payment, args.data);
        payment.updatedAt = new Date().toISOString();
        persistLiveStore();
        return payment;
      }
      return payment || null;
    }
  }

  // =======================================================================
  // USER MODEL
  // =======================================================================
  if (model === 'User') {
    const anyArgs = args as any;

    if (operation === 'findMany') {
      let list = liveStore.users;
      const { role, status } = anyArgs?.where || {};
      if (role) {
        const roleVal = typeof role === 'string' ? role : role?.in;
        if (typeof roleVal === 'string') {
          list = list.filter((u: any) => u.role === roleVal);
        } else if (Array.isArray(roleVal)) {
          list = list.filter((u: any) => roleVal.includes(u.role));
        }
      }
      if (status) {
        list = list.filter((u: any) => u.status === status);
      }
      if (anyArgs?.select) {
        return list.map((u: any) => {
          const res: any = {};
          Object.keys(anyArgs.select).forEach(k => { if (anyArgs.select[k]) res[k] = u[k]; });
          return res;
        });
      }
      return list;
    }

    if (operation === 'findUnique' || operation === 'findFirst') {
      const rawEmail = typeof anyArgs?.where?.email === 'string' ? anyArgs.where.email : '';
      const searchEmail = rawEmail.toLowerCase().trim();
      const id = typeof anyArgs?.where?.id === 'string' ? anyArgs.where.id : undefined;

      let user = liveStore.users.find((u: any) => (searchEmail && u.email.toLowerCase().trim() === searchEmail) || (id && u.id === id));
      if (!user && searchEmail) {
        const ADMIN_EMAILS = [
          'muthukamatchi.off@gmail.com',
          'harshitharaman.nimi@gmail.com',
          'harshitharamannimi@gmail.com'
        ];
        if (ADMIN_EMAILS.includes(searchEmail)) {
          user = {
            id: `admin-${Date.now()}`,
            name: searchEmail.split('@')[0],
            email: searchEmail,
            role: 'ADMIN',
            status: 'ACTIVE',
            department: 'IT',
            designation: 'Admin',
            password: STAFF_PASSWORD_HASH
          };
          liveStore.users.push(user);
          persistLiveStore();
        }
      }
      return user || null;
    }

    if (operation === 'update') {
      const id = anyArgs?.where?.id;
      const email = anyArgs?.where?.email;
      const user = liveStore.users.find((u: any) => (id && u.id === id) || (email && u.email.toLowerCase().trim() === email.toLowerCase().trim()));
      if (user && anyArgs?.data) {
        Object.assign(user, anyArgs.data);
        user.updatedAt = new Date().toISOString();
        persistLiveStore();
        return user;
      }
      return user || null;
    }

    if (operation === 'upsert') {
      const email = anyArgs?.where?.email;
      const id = anyArgs?.where?.id;
      let user = liveStore.users.find((u: any) => (email && u.email.toLowerCase().trim() === email.toLowerCase().trim()) || (id && u.id === id));
      if (user) {
        if (anyArgs?.update) Object.assign(user, anyArgs.update);
        user.updatedAt = new Date().toISOString();
        persistLiveStore();
        return user;
      } else {
        const newUser = {
          id: id || `user-${Date.now()}`,
          ...anyArgs?.create,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        liveStore.users.push(newUser);
        persistLiveStore();
        return newUser;
      }
    }

    if (operation === 'create') {
      const newUser = {
        id: anyArgs?.data?.id || `user-${Date.now()}`,
        ...anyArgs?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      liveStore.users.push(newUser);
      persistLiveStore();
      return newUser;
    }
  }

  // =======================================================================
  // AUDIT LOG
  // =======================================================================
  if (model === 'AuditLog') {
    const anyArgs = args as any;
    if (operation === 'findMany') {
      let logs = liveStore.auditLogs;
      const where = anyArgs?.where || {};
      if (where.entity?.in && Array.isArray(where.entity.in)) {
        logs = logs.filter((l: any) => where.entity.in.includes(l.entity));
      } else if (where.entity && typeof where.entity === 'string') {
        logs = logs.filter((l: any) => l.entity === where.entity);
      }
      if (where.action) {
        logs = logs.filter((l: any) => l.action === where.action);
      }
      if (where.entityId) {
        logs = logs.filter((l: any) => l.entityId === where.entityId);
      }
      return logs.slice(0, anyArgs?.take || 100);
    }

    if (operation === 'create') {
      const newLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...anyArgs?.data,
        createdAt: new Date().toISOString()
      };
      liveStore.auditLogs.unshift(newLog);
      persistLiveStore();
      return newLog;
    }
  }

  // Safe fallback primitives
  if (operation === 'findMany') return [];
  if (operation === 'findUnique' || operation === 'findFirst') return null;
  if (operation === 'count') return 0;
  if (operation === 'aggregate') return { _sum: {}, _avg: {}, _count: {}, _min: {}, _max: {} };

  return null;
}

// =========================================================================
// PRISMA CLIENT INITIALIZATION & INSTANT QUERY EXTENSION
// =========================================================================

const createPrismaClient = () => {
  const dbUrl = getDbUrl();
  const isDummyOrLocal = !dbUrl || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('dummy');
  const DUMMY_URL = 'postgresql://dummy:dummy@localhost:5432/pm_evidya_preview?schema=public';
  const effectiveUrl = dbUrl || (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) ? process.env.DATABASE_URL : DUMMY_URL);
  process.env.DATABASE_URL = effectiveUrl;

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
    datasources: { db: { url: effectiveUrl } }
  });

  const extendedPrisma: any = client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          if (isDummyOrLocal) {
            return handleMemoryFallback(model, operation, args);
          }

          try {
            const result = await query(args);
            // Universal Dual-Write on mutation to keep memory and disk 100% synchronized with DB
            if (operation === 'update' || operation === 'create' || operation === 'delete' || operation === 'upsert' || operation === 'updateMany' || operation === 'deleteMany') {
              try {
                const resObj = result as any;
                const dualWriteArgs = operation === 'create' && resObj && resObj.id
                  ? { ...args, data: { ...args?.data, id: resObj.id } }
                  : args;
                handleMemoryFallback(model, operation, dualWriteArgs);
              } catch (_) {}
            }
            return result;
          } catch (error: any) {
            // Neon connection auto-reconnect retry on dropped idle socket
            if (
              error?.code === 'P1001' ||
              error?.code === 'P1012' ||
              error?.message?.includes('database connection') ||
              error?.message?.includes('connection closed') ||
              error?.message?.includes('socket') ||
              error?.message?.includes('ECONNRESET')
            ) {
              try {
                await new Promise(r => setTimeout(r, 200));
                const retryResult = await query(args);
                if (operation === 'update' || operation === 'create' || operation === 'delete' || operation === 'upsert') {
                  try { handleMemoryFallback(model, operation, args); } catch (_) {}
                }
                return retryResult;
              } catch (_) {}
            }

            if (
              error?.name === 'PrismaClientInitializationError' ||
              error?.name === 'PrismaClientKnownRequestError' ||
              error?.name === 'PrismaClientUnknownRequestError' ||
              error?.message?.includes('database connection') ||
              error?.message?.includes('datasource') ||
              error?.message?.includes('does not exist') ||
              error?.code === 'P1001' ||
              error?.code === 'P1012' ||
              error?.code === 'P2021' ||
              error?.code === 'P2022'
            ) {
              console.log(`[Prisma Intercepted] DB query for ${model}.${operation} served by disk-persistent live store (${error?.code || error?.message})`);
              return handleMemoryFallback(model, operation, args);
            }
            throw error;
          }
        },
      },
    },
  });

  // Safe wrapper for $transaction
  const originalTransaction = extendedPrisma.$transaction?.bind(extendedPrisma);
  if (originalTransaction) {
    extendedPrisma.$transaction = async (arg: any) => {
      if (isDummyOrLocal) {
        if (typeof arg === 'function') {
          return await arg(extendedPrisma);
        }
        if (Array.isArray(arg)) {
          return await Promise.all(arg);
        }
      }
      try {
        return await originalTransaction(arg);
      } catch (err: any) {
        if (typeof arg === 'function') {
          return await arg(extendedPrisma);
        }
        if (Array.isArray(arg)) {
          return await Promise.all(arg);
        }
        throw err;
      }
    };
  }

  return extendedPrisma;
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

globalForPrisma.prisma = prisma;
