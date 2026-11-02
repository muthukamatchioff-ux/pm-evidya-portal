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

  return { initialSchedules, initialEditorRecords, initialVideos };
}

const { initialSchedules, initialEditorRecords, initialVideos } = initCanonicalTracker();

const globalShootingSchedules: any[] = (globalThis as any).__pmShootingSchedules || initialSchedules;
(globalThis as any).__pmShootingSchedules = globalShootingSchedules;

const globalVideoEditorRecords: any[] = (globalThis as any).__pmVideoEditorRecords || initialEditorRecords;
(globalThis as any).__pmVideoEditorRecords = globalVideoEditorRecords;

// Populate canonical videos into REAL_PM_EVIDYA_VIDEOS
initialVideos.forEach((v) => {
  if (!(REAL_PM_EVIDYA_VIDEOS as any[]).some((existing: any) => existing.id === v.id)) {
    (REAL_PM_EVIDYA_VIDEOS as any[]).push(v);
  }
});

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

const globalUsers: any[] = (globalThis as any).__pmUsers || INITIAL_USERS;
(globalThis as any).__pmUsers = globalUsers;

const globalAuditLogs: any[] = (globalThis as any).__pmAuditLogs || [];
(globalThis as any).__pmAuditLogs = globalAuditLogs;

// Helper to dynamically attach related records to SMEWorkEntry
function attachWorkEntryRelations(entry: any) {
  if (!entry) return null;
  const schedules = globalShootingSchedules.filter((s: any) => s.workEntryId === entry.id);
  const editorRecs = globalVideoEditorRecords.filter((e: any) => e.workEntryId === entry.id);
  const vids = (REAL_PM_EVIDYA_VIDEOS as any[]).filter((v: any) => v.epicId === entry.id);

  return {
    ...entry,
    shootingSchedules: schedules,
    videoEditorRecords: editorRecs,
    videoLibraries: vids
  };
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
        return clean.includes('schema=')
          ? clean
          : (clean.includes('?') ? `${clean}&schema=public` : `${clean}?schema=public`);
      }
    }
  }

  // Check local .env.bak if present and candidates were missing/masked (local environment only)
  if (typeof window === 'undefined' && !process.env.VERCEL) {
    try {
      const fs = require('fs');
      const path = require('path');
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
// IN-MEMORY DATA STORE DISPATCHER (ELIMINATES 5-7s LATENCY COMPLETELY)
// =========================================================================

function handleMemoryFallback(model: string, operation: string, args: any): any {
  if (model === 'BudgetComponent') {
    if (!REAL_PM_EVIDYA_BUDGET_COMPONENTS[0]?.annexureI || REAL_PM_EVIDYA_BUDGET_COMPONENTS[0].annexureI.length !== 8) {
      REAL_PM_EVIDYA_BUDGET_COMPONENTS[0].annexureI = getCanonicalAnnexureI();
    }
    if (!REAL_PM_EVIDYA_BUDGET_COMPONENTS[1]?.annexureII || REAL_PM_EVIDYA_BUDGET_COMPONENTS[1].annexureII.length !== 26) {
      REAL_PM_EVIDYA_BUDGET_COMPONENTS[1].annexureII = getCanonicalAnnexureII();
    }
    if (!REAL_PM_EVIDYA_BUDGET_COMPONENTS[2]?.annexureIII || REAL_PM_EVIDYA_BUDGET_COMPONENTS[2].annexureIII.length !== 1) {
      REAL_PM_EVIDYA_BUDGET_COMPONENTS[2].annexureIII = getCanonicalAnnexureIII();
    }
    if (operation === 'findMany') {
      return REAL_PM_EVIDYA_BUDGET_COMPONENTS;
    }
    if (operation === 'update') {
      const compNo = args?.where?.componentNo;
      const id = args?.where?.id;
      const comp = REAL_PM_EVIDYA_BUDGET_COMPONENTS.find((c: any) => (compNo && c.componentNo === compNo) || (id && c.id === id));
      if (comp && args?.data) {
        Object.assign(comp, args.data);
        comp.updatedAt = new Date().toISOString();
        return comp;
      }
      return { id, ...args?.data };
    }
    if (operation === 'findUnique' || operation === 'findFirst') {
      const compNo = args?.where?.componentNo;
      if (compNo) {
        return REAL_PM_EVIDYA_BUDGET_COMPONENTS.find((c: any) => c.componentNo === compNo) || null;
      }
      const id = args?.where?.id;
      if (id) {
        return REAL_PM_EVIDYA_BUDGET_COMPONENTS.find((c: any) => c.id === id) || null;
      }
      return REAL_PM_EVIDYA_BUDGET_COMPONENTS[0] || null;
    }
  }

  if (model === 'BudgetHead') {
    if (operation === 'findMany') return REAL_PM_EVIDYA_BUDGET_HEADS;
    if (operation === 'findUnique' || operation === 'findFirst') {
      return (REAL_PM_EVIDYA_BUDGET_HEADS as any[]).find(h => h.id === args?.where?.id || h.name === args?.where?.name) || null;
    }
    if (operation === 'create') {
      const newHead = { id: `bh-${Date.now()}`, ...args?.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      (REAL_PM_EVIDYA_BUDGET_HEADS as any[]).push(newHead);
      return newHead;
    }
    if (operation === 'update') {
      const head = (REAL_PM_EVIDYA_BUDGET_HEADS as any[]).find(h => h.id === args?.where?.id);
      if (head && args?.data) {
        Object.assign(head, args.data);
        head.updatedAt = new Date().toISOString();
        return head;
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = (REAL_PM_EVIDYA_BUDGET_HEADS as any[]).findIndex(h => h.id === args?.where?.id);
      if (idx !== -1) return (REAL_PM_EVIDYA_BUDGET_HEADS as any[]).splice(idx, 1)[0];
      return { id: args?.where?.id };
    }
  }

  if (model === 'AnnexureI') {
    if (!REAL_PM_EVIDYA_BUDGET_COMPONENTS[0]?.annexureI || REAL_PM_EVIDYA_BUDGET_COMPONENTS[0].annexureI.length !== 8) {
      REAL_PM_EVIDYA_BUDGET_COMPONENTS[0].annexureI = getCanonicalAnnexureI();
    }
    const list = (REAL_PM_EVIDYA_BUDGET_COMPONENTS[0]?.annexureI || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'deleteMany') {
      const targetId = args?.where?.id;
      if (targetId && typeof targetId === 'string') {
        REAL_PM_EVIDYA_BUDGET_COMPONENTS[0].annexureI = list.filter((x: any) => x.id !== targetId);
      } else {
        REAL_PM_EVIDYA_BUDGET_COMPONENTS[0].annexureI = [];
      }
      return { count: list.length };
    }
    if (operation === 'createMany') {
      const items = Array.isArray(args?.data) ? args.data : [args?.data];
      for (const item of items) {
        list.push({
          id: item?.id || `ai-${Date.now()}-${Math.random()}`,
          ...item,
          createdAt: item?.createdAt || new Date().toISOString(),
          updatedAt: item?.updatedAt || new Date().toISOString()
        });
      }
      return { count: items.length };
    }
    if (operation === 'create') {
      const newItem = { id: `ai-${Date.now()}`, ...args?.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      list.push(newItem);
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        const removed = list.splice(idx, 1)[0];
        return removed;
      }
      return { id: args?.where?.id, expertName: 'Entry' };
    }
  }

  if (model === 'AnnexureII') {
    if (!REAL_PM_EVIDYA_BUDGET_COMPONENTS[1]?.annexureII || REAL_PM_EVIDYA_BUDGET_COMPONENTS[1].annexureII.length !== 26) {
      REAL_PM_EVIDYA_BUDGET_COMPONENTS[1].annexureII = getCanonicalAnnexureII();
    }
    const list = (REAL_PM_EVIDYA_BUDGET_COMPONENTS[1]?.annexureII || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'deleteMany') {
      const targetId = args?.where?.id;
      if (targetId && typeof targetId === 'string') {
        REAL_PM_EVIDYA_BUDGET_COMPONENTS[1].annexureII = list.filter((x: any) => x.id !== targetId);
      } else {
        REAL_PM_EVIDYA_BUDGET_COMPONENTS[1].annexureII = [];
      }
      return { count: list.length };
    }
    if (operation === 'createMany') {
      const items = Array.isArray(args?.data) ? args.data : [args?.data];
      for (const item of items) {
        list.push({
          id: item?.id || `aii-${Date.now()}-${Math.random()}`,
          ...item,
          createdAt: item?.createdAt || new Date().toISOString(),
          updatedAt: item?.updatedAt || new Date().toISOString()
        });
      }
      return { count: items.length };
    }
    if (operation === 'create') {
      const newItem = { id: `aii-${Date.now()}`, ...args?.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      list.push(newItem);
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        const removed = list.splice(idx, 1)[0];
        return removed;
      }
      return { id: args?.where?.id, participant: 'Entry' };
    }
  }

  if (model === 'AnnexureIII') {
    if (!REAL_PM_EVIDYA_BUDGET_COMPONENTS[2]?.annexureIII || REAL_PM_EVIDYA_BUDGET_COMPONENTS[2].annexureIII.length !== 1) {
      REAL_PM_EVIDYA_BUDGET_COMPONENTS[2].annexureIII = getCanonicalAnnexureIII();
    }
    const list = (REAL_PM_EVIDYA_BUDGET_COMPONENTS[2]?.annexureIII || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'deleteMany') {
      const targetId = args?.where?.id;
      if (targetId && typeof targetId === 'string') {
        REAL_PM_EVIDYA_BUDGET_COMPONENTS[2].annexureIII = list.filter((x: any) => x.id !== targetId);
      } else {
        REAL_PM_EVIDYA_BUDGET_COMPONENTS[2].annexureIII = [];
      }
      return { count: list.length };
    }
    if (operation === 'createMany') {
      const items = Array.isArray(args?.data) ? args.data : [args?.data];
      for (const item of items) {
        list.push({
          id: item?.id || `aiii-${Date.now()}-${Math.random()}`,
          ...item,
          createdAt: item?.createdAt || new Date().toISOString(),
          updatedAt: item?.updatedAt || new Date().toISOString()
        });
      }
      return { count: items.length };
    }
    if (operation === 'findUnique' || operation === 'findFirst') {
      return list.find((x: any) => x.id === args?.where?.id) || null;
    }
    if (operation === 'create') {
      const newItem = { id: `aiii-${Date.now()}`, ...args?.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      list.push(newItem);
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) return list.splice(idx, 1)[0];
      return { id: args?.where?.id };
    }
  }

  if (model === 'AnnexureIV') {
    const list = (REAL_PM_EVIDYA_BUDGET_COMPONENTS[3]?.annexureIV || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'deleteMany') { REAL_PM_EVIDYA_BUDGET_COMPONENTS[3].annexureIV = []; return { count: 0 }; }
    if (operation === 'findUnique' || operation === 'findFirst') {
      return list.find((x: any) => x.id === args?.where?.id) || null;
    }
    if (operation === 'create') {
      const newItem = { id: `aiv-${Date.now()}`, ...args?.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      list.push(newItem);
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) return list.splice(idx, 1)[0];
      return { id: args?.where?.id };
    }
  }

  if (model === 'AnnexureV') {
    const list = (REAL_PM_EVIDYA_BUDGET_COMPONENTS[4]?.annexureV || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'deleteMany') { REAL_PM_EVIDYA_BUDGET_COMPONENTS[4].annexureV = []; return { count: 0 }; }
    if (operation === 'findUnique' || operation === 'findFirst') {
      return list.find((x: any) => x.id === args?.where?.id) || null;
    }
    if (operation === 'create') {
      const newItem = { id: `av-${Date.now()}`, ...args?.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      list.push(newItem);
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) return list.splice(idx, 1)[0];
      return { id: args?.where?.id };
    }
  }

  if (model === 'AnnexureVI') {
    const list = (REAL_PM_EVIDYA_BUDGET_COMPONENTS[5]?.annexureVI || []) as any[];
    if (operation === 'findMany') return list;
    if (operation === 'deleteMany') { REAL_PM_EVIDYA_BUDGET_COMPONENTS[5].annexureVI = []; return { count: 0 }; }
    if (operation === 'findUnique' || operation === 'findFirst') {
      return list.find((x: any) => x.id === args?.where?.id) || null;
    }
    if (operation === 'create') {
      const newItem = { id: `avi-${Date.now()}`, ...args?.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      list.push(newItem);
      return newItem;
    }
    if (operation === 'update') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...args?.data, updatedAt: new Date().toISOString() };
        return list[idx];
      }
      return { ...args?.data, id: args?.where?.id };
    }
    if (operation === 'delete') {
      const idx = list.findIndex((x: any) => x.id === args?.where?.id);
      if (idx !== -1) return list.splice(idx, 1)[0];
      return { id: args?.where?.id, platform: 'Entry' };
    }
  }

  if (model === 'SME') {
    if (operation === 'findMany') {
      return (REAL_PM_EVIDYA_SMES as any[]).map(sme => {
        const workEntries = (sme.workEntries || []).map((we: any) => {
          if (!we.documents || we.documents.length === 0) {
            const matchedWe = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(
              (e: any) => e.id === we.id || e.epicSequence === we.epicSequence || (e.smeId === sme.id && e.trade === we.trade)
            );
            if (matchedWe && Array.isArray(matchedWe.documents) && matchedWe.documents.length > 0) {
              return { ...we, documents: matchedWe.documents };
            }
          }
          return we;
        });
        return { ...sme, workEntries };
      });
    }
    if (operation === 'findUnique' || operation === 'findFirst') {
      const id = args?.where?.id;
      if (id) {
        return (REAL_PM_EVIDYA_SMES as any[]).find(s => s.id === id) || null;
      }
      return REAL_PM_EVIDYA_SMES[0] || null;
    }
    if (operation === 'update') {
      const id = args?.where?.id;
      const sme = (REAL_PM_EVIDYA_SMES as any[]).find(s => s.id === id);
      if (sme && args?.data) {
        Object.assign(sme, args.data);
        sme.updatedAt = new Date().toISOString();
        (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).forEach(e => {
          if (e.smeId === id || e.sme?.id === id) {
            if (!e.sme) e.sme = {};
            Object.assign(e.sme, args.data);
          }
        });
        return sme;
      }
      return sme || { id, ...args?.data };
    }
    if (operation === 'delete') {
      const id = args?.where?.id;
      const idx = (REAL_PM_EVIDYA_SMES as any[]).findIndex(s => s.id === id);
      if (idx !== -1) {
        return (REAL_PM_EVIDYA_SMES as any[]).splice(idx, 1)[0];
      }
      return { id };
    }
    if (operation === 'create') {
      const newSme = {
        id: `sme-${Date.now()}`,
        name: args?.data?.name || '',
        designation: args?.data?.designation || '',
        institute: args?.data?.institute || '',
        location: args?.data?.location || '',
        address: args?.data?.address || '',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      (REAL_PM_EVIDYA_SMES as any[]).push(newSme);

      if (args?.data?.workEntries?.create) {
        const weData = args.data.workEntries.create as any;
        const newEntry = {
          id: `sme-work-${Date.now()}`,
          smeId: newSme.id,
          trade: weData.trade || 'General',
          topic: weData.topic || 'PM e-Vidya Content Development',
          attendanceFrom: weData.attendanceFrom,
          attendanceTo: weData.attendanceTo,
          days: weData.days || 0,
          ratePerDay: weData.ratePerDay || 0,
          taAmount: weData.taAmount || 0,
          otherAmount: weData.otherAmount || 0,
          status: 'INITIATED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          epicSequence: (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).length + 1,
          sme: newSme,
          payments: [{
            id: `pay-${Date.now()}`,
            status: 'INITIATED',
            grossAmount: (weData.days || 0) * (weData.ratePerDay || 0),
            taAmount: weData.taAmount || 0,
            otherAmount: weData.otherAmount || 0,
            totalAmount: ((weData.days || 0) * (weData.ratePerDay || 0)) + (weData.taAmount || 0) + (weData.otherAmount || 0)
          }],
          documents: []
        };
        (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).unshift(newEntry);
      }
      return newSme;
    }
  }

  if (model === 'Project' && operation === 'findMany') {
    return REAL_PM_EVIDYA_PROJECTS;
  }

  if (model === 'ProductionRecord' && operation === 'findMany') {
    return REAL_PM_EVIDYA_PRODUCTION_RECORDS;
  }

  // =========================================================================
  // VIDEO LIBRARY (76 CANONICAL DELIVERABLES + USER ENTRIES)
  // =========================================================================
  if (model === 'VideoLibrary') {
    if (operation === 'findMany') {
      const { epicId } = args?.where || {};
      return epicId 
        ? (REAL_PM_EVIDYA_VIDEOS as any[]).filter((v: any) => v.epicId === epicId)
        : REAL_PM_EVIDYA_VIDEOS;
    }

    if (operation === 'findUnique' || operation === 'findFirst') {
      const anyWhere = (args as any)?.where || {};
      const id = typeof anyWhere.id === 'string' ? anyWhere.id : undefined;
      if (id) {
        return (REAL_PM_EVIDYA_VIDEOS as any[]).find((v: any) => v.id === id) || null;
      }
      const epicId = typeof anyWhere.epicId === 'string' ? anyWhere.epicId : undefined;
      const title = typeof anyWhere.title === 'string' ? anyWhere.title : anyWhere.title?.equals;
      if (epicId || title) {
        const match = (REAL_PM_EVIDYA_VIDEOS as any[]).find((v: any) => 
          (!epicId || v.epicId === epicId) &&
          (!title || v.title?.toLowerCase() === title.toLowerCase())
        );
        if (match) return match;
      }
      if (Array.isArray(anyWhere.OR)) {
        for (const cond of (anyWhere.OR as any[])) {
          const cId = cond.epicId || cond.id;
          const cTitle = typeof cond.title === 'string' ? cond.title : cond.title?.equals;
          const match = (REAL_PM_EVIDYA_VIDEOS as any[]).find((v: any) =>
            (cId && (v.id === cId || v.epicId === cId)) ||
            (cTitle && v.title?.toLowerCase() === cTitle.toLowerCase())
          );
          if (match) return match;
        }
      }
      return REAL_PM_EVIDYA_VIDEOS[0] || null;
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      const vid = (REAL_PM_EVIDYA_VIDEOS as any[]).find((v: any) => v.id === id);
      if (vid && args?.data) {
        Object.assign(vid, args.data);
        vid.updatedAt = new Date().toISOString();
        return vid;
      }
      return vid || { id, ...args?.data };
    }

    if (operation === 'upsert') {
      const id = args?.where?.id;
      let vid = (REAL_PM_EVIDYA_VIDEOS as any[]).find((v: any) => v.id === id);
      if (vid) {
        if (args?.update) Object.assign(vid, args.update);
        vid.updatedAt = new Date().toISOString();
        return vid;
      } else {
        const created = {
          id: id || `vid-${Date.now()}`,
          ...args?.create,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        (REAL_PM_EVIDYA_VIDEOS as any[]).push(created);
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
      (REAL_PM_EVIDYA_VIDEOS as any[]).unshift(newVid);
      return newVid;
    }

    if (operation === 'count') {
      const startsWith = args?.where?.id?.startsWith;
      if (startsWith) {
        return (REAL_PM_EVIDYA_VIDEOS as any[]).filter((v: any) => (v.id || '').startsWith(startsWith)).length;
      }
      return (REAL_PM_EVIDYA_VIDEOS as any[]).length;
    }

    if (operation === 'delete' || operation === 'deleteMany') {
      const id = args?.where?.id;
      if (id) {
        const idx = (REAL_PM_EVIDYA_VIDEOS as any[]).findIndex((v: any) => v.id === id);
        if (idx !== -1) (REAL_PM_EVIDYA_VIDEOS as any[]).splice(idx, 1);
      }
      return { count: 1 };
    }
  }

  // =========================================================================
  // SME WORK ENTRY (WITH AUTOMATIC ATTACHED RELATIONS)
  // =========================================================================
  if (model === 'SMEWorkEntry') {
    if (operation === 'findMany') {
      return (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).map(attachWorkEntryRelations);
    }

    if (operation === 'findUnique' || operation === 'findFirst') {
      const id = args?.where?.id;
      const entry = id ? (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find((e: any) => e.id === id) : REAL_PM_EVIDYA_SME_WORK_ENTRIES[0];
      return attachWorkEntryRelations(entry);
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      const entry = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(e => e.id === id);
      if (entry && args?.data) {
        Object.assign(entry, args.data);
        entry.updatedAt = new Date().toISOString();
        return attachWorkEntryRelations(entry);
      }
      return attachWorkEntryRelations(entry) || null;
    }

    if (operation === 'delete') {
      const id = args?.where?.id;
      const idx = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).findIndex(e => e.id === id);
      if (idx !== -1) {
        return (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).splice(idx, 1)[0];
      }
      return { id };
    }
  }

  // =========================================================================
  // SHOOTING SCHEDULE (76 TOPICS + IMMEDIATE CAMERAMAN UPDATE REFLECTION)
  // =========================================================================
  if (model === 'ShootingSchedule') {
    if (operation === 'findMany') {
      const { workEntryId, status } = args?.where || {};
      return globalShootingSchedules.filter(s => 
        (!workEntryId || s.workEntryId === workEntryId) &&
        (!status || s.status === status)
      );
    }

    if (operation === 'findUnique' || operation === 'findFirst') {
      const anyWhere = (args as any)?.where || {};
      const id = typeof anyWhere.id === 'string' ? anyWhere.id : undefined;
      if (id) {
        const match = globalShootingSchedules.find(s => s.id === id || s.id === `shoot-${id}` || (typeof id === 'string' && id.startsWith('shoot-') && s.id === id.replace('shoot-', '')));
        if (match) return match;
      }
      const workEntryId = typeof anyWhere.workEntryId === 'string' ? anyWhere.workEntryId : undefined;
      const videoTitle = anyWhere.videoTitle;
      const titleStr = typeof videoTitle === 'string' ? videoTitle : (videoTitle?.equals ? String(videoTitle.equals) : undefined);
      if (workEntryId || titleStr) {
        const match = globalShootingSchedules.find(s => 
          (!workEntryId || s.workEntryId === workEntryId) &&
          (!titleStr || s.videoTitle?.toLowerCase() === titleStr.toLowerCase())
        );
        if (match) return match;
      }
      if (Array.isArray(anyWhere.OR)) {
        for (const cond of (anyWhere.OR as any[])) {
          const cId = cond.id;
          const cTitle = typeof cond.videoTitle === 'string' ? cond.videoTitle : (cond.videoTitle?.equals ? String(cond.videoTitle.equals) : undefined);
          const match = globalShootingSchedules.find(s => 
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
      globalShootingSchedules.push(newSchedule);
      return newSchedule;
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      const sched = globalShootingSchedules.find(s => s.id === id || s.id === `shoot-${id}` || (id?.startsWith('shoot-') && s.id === id.replace('shoot-', '')));
      if (sched && args?.data) {
        Object.assign(sched, args.data);
        sched.updatedAt = new Date().toISOString();
        return sched;
      }
      const created = {
        id: id || `shoot-${Date.now()}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      globalShootingSchedules.push(created);
      return created;
    }

    if (operation === 'updateMany') {
      const { workEntryId } = args?.where || {};
      let count = 0;
      globalShootingSchedules.forEach(s => {
        if (!workEntryId || s.workEntryId === workEntryId) {
          Object.assign(s, args.data);
          s.updatedAt = new Date().toISOString();
          count++;
        }
      });
      return { count };
    }

    if (operation === 'upsert') {
      const id = args?.where?.id;
      let sched = globalShootingSchedules.find(s => s.id === id || s.id === `shoot-${id}` || (id?.startsWith('shoot-') && s.id === id.replace('shoot-', '')));
      if (sched) {
        if (args?.update) Object.assign(sched, args.update);
        sched.updatedAt = new Date().toISOString();
        return sched;
      } else {
        const created = {
          id: id || `shoot-${Date.now()}`,
          ...args?.create,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        globalShootingSchedules.push(created);
        return created;
      }
    }

    if (operation === 'count') {
      return globalShootingSchedules.length;
    }

    if (operation === 'delete') {
      const id = args?.where?.id;
      const idx = globalShootingSchedules.findIndex(s => s.id === id || s.id === `shoot-${id}`);
      if (idx !== -1) {
        return globalShootingSchedules.splice(idx, 1)[0];
      }
      return { id };
    }
  }

  // =========================================================================
  // VIDEO EDITOR RECORD (76 TOPICS + IMMEDIATE EDITOR UPDATE REFLECTION)
  // =========================================================================
  if (model === 'VideoEditorRecord') {
    if (operation === 'findMany') {
      const { workEntryId, status } = args?.where || {};
      return globalVideoEditorRecords.filter(e => 
        (!workEntryId || e.workEntryId === workEntryId) &&
        (!status || e.status === status)
      );
    }

    if (operation === 'findUnique' || operation === 'findFirst') {
      const anyWhere = (args as any)?.where || {};
      const id = typeof anyWhere.id === 'string' ? anyWhere.id : undefined;
      if (id) {
        const match = globalVideoEditorRecords.find(e => e.id === id || e.id === `ed-${id}` || (typeof id === 'string' && id.startsWith('ed-') && e.id === id.replace('ed-', '')));
        if (match) return match;
      }
      const workEntryId = typeof anyWhere.workEntryId === 'string' ? anyWhere.workEntryId : undefined;
      const assignedVideo = anyWhere.assignedVideo;
      const vidStr = typeof assignedVideo === 'string' ? assignedVideo : (assignedVideo?.equals ? String(assignedVideo.equals) : undefined);
      if (workEntryId || vidStr) {
        const match = globalVideoEditorRecords.find(e => 
          (!workEntryId || e.workEntryId === workEntryId) &&
          (!vidStr || e.assignedVideo?.toLowerCase() === vidStr.toLowerCase())
        );
        if (match) return match;
      }
      if (Array.isArray(anyWhere.OR)) {
        for (const cond of (anyWhere.OR as any[])) {
          const cId = cond.id;
          const cVid = typeof cond.assignedVideo === 'string' ? cond.assignedVideo : (cond.assignedVideo?.equals ? String(cond.assignedVideo.equals) : undefined);
          const match = globalVideoEditorRecords.find(e => 
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
      globalVideoEditorRecords.push(newEditorRec);
      return newEditorRec;
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      const rec = globalVideoEditorRecords.find(e => e.id === id || e.id === `ed-${id}` || (id?.startsWith('ed-') && e.id === id.replace('ed-', '')));
      if (rec && args?.data) {
        Object.assign(rec, args.data);
        rec.updatedAt = new Date().toISOString();
        return rec;
      }
      const created = {
        id: id || `ed-${Date.now()}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      globalVideoEditorRecords.push(created);
      return created;
    }

    if (operation === 'updateMany') {
      const { workEntryId, assignedVideo } = args?.where || {};
      let count = 0;
      globalVideoEditorRecords.forEach(e => {
        if ((!workEntryId || e.workEntryId === workEntryId) && (!assignedVideo || e.assignedVideo === assignedVideo)) {
          Object.assign(e, args.data);
          e.updatedAt = new Date().toISOString();
          count++;
        }
      });
      return { count };
    }

    if (operation === 'upsert') {
      const id = args?.where?.id;
      let rec = globalVideoEditorRecords.find(e => e.id === id || e.id === `ed-${id}` || (id?.startsWith('ed-') && e.id === id.replace('ed-', '')));
      if (rec) {
        if (args?.update) Object.assign(rec, args.update);
        rec.updatedAt = new Date().toISOString();
        return rec;
      } else {
        const created = {
          id: id || `ed-${Date.now()}`,
          ...args?.create,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        globalVideoEditorRecords.push(created);
        return created;
      }
    }

    if (operation === 'count') {
      return globalVideoEditorRecords.length;
    }

    if (operation === 'delete') {
      const id = args?.where?.id;
      const idx = globalVideoEditorRecords.findIndex(e => e.id === id || e.id === `ed-${id}`);
      if (idx !== -1) {
        return globalVideoEditorRecords.splice(idx, 1)[0];
      }
      return { id };
    }
  }

  // =========================================================================
  // DOCUMENT MODEL
  // =========================================================================
  if (model === 'Document') {
    const allDocs: any[] = [];
    (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).forEach(e => {
      if (Array.isArray(e.documents)) {
        e.documents.forEach((d: any) => {
          const sme = e.sme || (REAL_PM_EVIDYA_SMES as any[]).find((s: any) => s.id === e.smeId);
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

    if (operation === 'findFirst' || operation === 'findUnique') {
      const id = args?.where?.id;
      if (id) {
        const match = allDocs.find(d => d.id === id || d.workEntryId === id || (d.name && d.name.includes(id)));
        if (match) return match;
      }
      const { workEntryId, type } = args?.where || {};
      if (workEntryId || type) {
        const match = allDocs.find(d => (!workEntryId || d.workEntryId === workEntryId) && (!type || d.type === type));
        if (match) return match;
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
      const { workEntryId, type } = args?.where || {};
      return allDocs.filter(d => (!workEntryId || d.workEntryId === workEntryId) && (!type || d.type === type));
    }

    if (operation === 'create') {
      const newDoc = {
        id: args?.data?.id || `doc-${Date.now()}`,
        ...args?.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (args?.data?.workEntryId) {
        const entry = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(e => e.id === args.data.workEntryId);
        if (entry) {
          if (!entry.documents) entry.documents = [];
          const existingIdx = entry.documents.findIndex((d: any) => d.id === newDoc.id || d.type === newDoc.type);
          if (existingIdx !== -1) {
            entry.documents[existingIdx] = { ...entry.documents[existingIdx], ...newDoc };
          } else {
            entry.documents.push(newDoc);
          }
        }
      }
      allDocs.push(newDoc);
      return newDoc;
    }

    if (operation === 'update') {
      const id = args?.where?.id;
      for (const entry of (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[])) {
        if (Array.isArray(entry.documents)) {
          const origDoc = entry.documents.find((d: any) => d.id === id);
          if (origDoc && args?.data) {
            Object.assign(origDoc, args.data);
            origDoc.updatedAt = new Date().toISOString();
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

  // =========================================================================
  // PAYMENT MODEL
  // =========================================================================
  if (model === 'Payment') {
    const allPayments: any[] = [];
    (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).forEach(e => {
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
        const entry = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(e => e.id === args.data.workEntryId);
        if (entry) {
          if (!entry.payments) entry.payments = [];
          entry.payments.push(newPayment);
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
        return payment;
      }
      return payment || null;
    }
  }

  // =========================================================================
  // USER MODEL (STAFF LOGINS & WORK ASSIGNMENT PERMISSIONS)
  // =========================================================================
  if (model === 'User') {
    const anyArgs = args as any;

    if (operation === 'findMany') {
      let list = globalUsers;
      const { role, status } = anyArgs?.where || {};
      if (role) {
        const roleVal = typeof role === 'string' ? role : role?.in;
        if (typeof roleVal === 'string') {
          list = list.filter(u => u.role === roleVal);
        } else if (Array.isArray(roleVal)) {
          list = list.filter(u => roleVal.includes(u.role));
        }
      }
      if (status) {
        list = list.filter(u => u.status === status);
      }
      if (anyArgs?.select) {
        return list.map(u => {
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

      let user = globalUsers.find(u => (searchEmail && u.email.toLowerCase().trim() === searchEmail) || (id && u.id === id));
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
          globalUsers.push(user);
        }
      }
      return user || null;
    }

    if (operation === 'update') {
      const id = anyArgs?.where?.id;
      const email = anyArgs?.where?.email;
      const user = globalUsers.find(u => (id && u.id === id) || (email && u.email.toLowerCase().trim() === email.toLowerCase().trim()));
      if (user && anyArgs?.data) {
        Object.assign(user, anyArgs.data);
        user.updatedAt = new Date().toISOString();
        return user;
      }
      return user || null;
    }

    if (operation === 'upsert') {
      const email = anyArgs?.where?.email;
      const id = anyArgs?.where?.id;
      let user = globalUsers.find(u => (email && u.email.toLowerCase().trim() === email.toLowerCase().trim()) || (id && u.id === id));
      if (user) {
        if (anyArgs?.update) Object.assign(user, anyArgs.update);
        user.updatedAt = new Date().toISOString();
        return user;
      } else {
        const newUser = {
          id: id || `user-${Date.now()}`,
          ...anyArgs?.create,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        globalUsers.push(newUser);
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
      globalUsers.push(newUser);
      return newUser;
    }
  }

  // =========================================================================
  // AUDIT LOG MODEL
  // =========================================================================
  if (model === 'AuditLog') {
    const anyArgs = args as any;
    if (operation === 'findMany') {
      let logs = globalAuditLogs;
      const where = anyArgs?.where || {};
      if (where.entity?.in && Array.isArray(where.entity.in)) {
        logs = logs.filter(l => where.entity.in.includes(l.entity));
      } else if (where.entity && typeof where.entity === 'string') {
        logs = logs.filter(l => l.entity === where.entity);
      }
      if (where.action) {
        logs = logs.filter(l => l.action === where.action);
      }
      if (where.entityId) {
        logs = logs.filter(l => l.entityId === where.entityId);
      }
      return logs.slice(0, anyArgs?.take || 100);
    }

    if (operation === 'create') {
      const newLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...anyArgs?.data,
        createdAt: new Date().toISOString()
      };
      globalAuditLogs.unshift(newLog);
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
          // Fast-path: When running in container without local postgres or after connection fail,
          // instantly return from in-memory store without waiting 5-7 seconds on TCP connect timeout.
          if (isDummyOrLocal || isDbConnectionFailed) {
            return handleMemoryFallback(model, operation, args);
          }

          try {
            return await query(args);
          } catch (error: any) {
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
              isDbConnectionFailed = true;
              console.log(`[Prisma Intercepted] DB connection unavailable. Fast in-memory store active for ${model}.${operation}`);
              return handleMemoryFallback(model, operation, args);
            }
            throw error;
          }
        },
      },
    },
  });

  // Safe wrapper for $transaction so transactions never hang when DB is offline
  const originalTransaction = extendedPrisma.$transaction?.bind(extendedPrisma);
  if (originalTransaction) {
    extendedPrisma.$transaction = async (arg: any) => {
      if (isDummyOrLocal || isDbConnectionFailed) {
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
        isDbConnectionFailed = true;
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

// In serverless / production environments, reuse the client across function invocations
globalForPrisma.prisma = prisma;
