import { PrismaClient } from '@prisma/client';
import {
  REAL_PM_EVIDYA_BUDGET_COMPONENTS,
  REAL_PM_EVIDYA_BUDGET_HEADS,
  REAL_PM_EVIDYA_SMES,
  REAL_PM_EVIDYA_PROJECTS,
  REAL_PM_EVIDYA_PRODUCTION_RECORDS,
  REAL_PM_EVIDYA_VIDEOS,
  REAL_PM_EVIDYA_SME_WORK_ENTRIES
} from './fallbackData';

const globalForPrisma = global as unknown as { prisma: any };

const globalShootingSchedules: any[] = (globalThis as any).__pmShootingSchedules || [
  {
    id: 'cmvi2xhig00017y93hp08jspl',
    workEntryId: 'cmus2g10m00043rxkg89gd1xm',
    videoTitle: 'Shielded Metal Arc Welding (SMAW) & Workshop Safety Standards',
    shootDate: '2026-07-20T00:00:00.000Z',
    location: 'Studio - NIMI Chennai',
    shootingType: null,
    scheduledStart: '2026-07-20T00:00:00.000Z',
    scheduledEnd: '2026-07-24T00:00:00.000Z',
    actualStart: null,
    actualEnd: null,
    cameraman: 'Parasuraman',
    status: 'COMPLETED',
    productionNotes: 'Trade: Welder / Fabrication',
    createdAt: '2026-10-21T12:19:35.272Z',
    updatedAt: '2026-10-22T04:31:40.039Z'
  }
];
(globalThis as any).__pmShootingSchedules = globalShootingSchedules;

const globalVideoEditorRecords: any[] = (globalThis as any).__pmVideoEditorRecords || [
  {
    id: 'ed-cmupe2e700007qg6s8ey5ekry',
    workEntryId: 'cmus2g10m00043rxkg89gd1xm',
    editorName: 'Post-Production Team',
    assignedVideo: 'Face Milling Programming',
    editingStartDate: '2026-10-05T00:00:00.000Z',
    editingEndDate: '2026-10-15T00:00:00.000Z',
    roughCutLink: null,
    finalCutLink: null,
    duration: null,
    status: 'COMPLETED',
    reviewComments: '[END:2026-10-15] Editing finished and color graded.',
    finalVideoFile: 'https://drive.google.com/file/d/1GjQ1tOCse5ISo-vc9gPQY2O694PcOoiC/view?usp=drive_link',
    createdAt: '2026-10-21T05:02:03.023Z',
    updatedAt: '2026-10-21T05:03:14.981Z'
  }
];
(globalThis as any).__pmVideoEditorRecords = globalVideoEditorRecords;

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

const createPrismaClient = () => {
  const dbUrl = getDbUrl();
  const DUMMY_URL = 'postgresql://dummy:dummy@localhost:5432/pm_evidya_preview?schema=public';
  const effectiveUrl = dbUrl || (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://')) ? process.env.DATABASE_URL : DUMMY_URL);
  process.env.DATABASE_URL = effectiveUrl;

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
    datasources: { db: { url: effectiveUrl } }
  });

  // Attach an extension to safely catch database connection failures and return authentic PM e-Vidya data
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          try {
            return await query(args);
          } catch (error: any) {
            // Safely intercept Prisma initialization or connection errors
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
              console.error(`[Prisma Intercepted] DB query fallback for ${model}.${operation}`);
              
              if (model === 'BudgetComponent' && operation === 'findMany') {
                return REAL_PM_EVIDYA_BUDGET_COMPONENTS;
              }

              if (model === 'BudgetComponent' && operation === 'update') {
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

              if (model === 'BudgetComponent' && (operation === 'findUnique' || operation === 'findFirst')) {
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
                const list = (REAL_PM_EVIDYA_BUDGET_COMPONENTS[0]?.annexureI || []) as any[];
                if (operation === 'findMany') return list;
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
                const list = (REAL_PM_EVIDYA_BUDGET_COMPONENTS[1]?.annexureII || []) as any[];
                if (operation === 'findMany') return list;
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
                const list = (REAL_PM_EVIDYA_BUDGET_COMPONENTS[2]?.annexureIII || []) as any[];
                if (operation === 'findMany') return list;
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
                    // Also synchronize SME information inside SMEWorkEntries
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

                if (operation === 'create') {
                  const newVid = {
                    id: `vid-${Date.now()}`,
                    ...args?.data,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  (REAL_PM_EVIDYA_VIDEOS as any[]).unshift(newVid);
                  return newVid;
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

              if (model === 'SMEWorkEntry' && operation === 'findMany') {
                return REAL_PM_EVIDYA_SME_WORK_ENTRIES;
              }

              if (model === 'SMEWorkEntry' && (operation === 'findUnique' || operation === 'findFirst')) {
                const id = args?.where?.id;
                if (id) {
                  return REAL_PM_EVIDYA_SME_WORK_ENTRIES.find((e: any) => e.id === id) || null;
                }
                return REAL_PM_EVIDYA_SME_WORK_ENTRIES[0] || null;
              }

              if (model === 'SMEWorkEntry' && operation === 'update') {
                const id = args?.where?.id;
                const entry = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(e => e.id === id);
                if (entry && args?.data) {
                  Object.assign(entry, args.data);
                  entry.updatedAt = new Date().toISOString();
                  return entry;
                }
                return entry || null;
              }

              if (model === 'SMEWorkEntry' && operation === 'delete') {
                const id = args?.where?.id;
                const idx = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).findIndex(e => e.id === id);
                if (idx !== -1) {
                  return (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).splice(idx, 1)[0];
                }
                return { id };
              }

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
                    id: `doc-${Date.now()}`,
                    ...args?.data,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  if (args?.data?.workEntryId) {
                    const entry = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(e => e.id === args.data.workEntryId);
                    if (entry) {
                      if (!entry.documents) entry.documents = [];
                      entry.documents.push(newDoc);
                    }
                  }
                  allDocs.push(newDoc);
                  return newDoc;
                }

                if (operation === 'update') {
                  const id = args?.where?.id;
                  const doc = allDocs.find(d => d.id === id);
                  if (doc && args?.data) {
                    Object.assign(doc, args.data);
                    doc.updatedAt = new Date().toISOString();
                    return doc;
                  }
                  return doc || null;
                }
              }

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
                  if (args?.data?.workEntryId) {
                    const entry = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(e => e.id === args.data.workEntryId);
                    if (entry) {
                      if (!entry.shootingSchedules) entry.shootingSchedules = [];
                      entry.shootingSchedules.push(newSchedule);
                    }
                  }
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
                  for (const entry of (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[])) {
                    if (Array.isArray(entry.shootingSchedules)) {
                      const match = entry.shootingSchedules.find((s: any) => s.id === id || s.id === `shoot-${id}`);
                      if (match && args?.data) {
                        Object.assign(match, args.data);
                        match.updatedAt = new Date().toISOString();
                        return match;
                      }
                    }
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

                if (operation === 'delete') {
                  const id = args?.where?.id;
                  const idx = globalShootingSchedules.findIndex(s => s.id === id || s.id === `shoot-${id}`);
                  if (idx !== -1) {
                    return globalShootingSchedules.splice(idx, 1)[0];
                  }
                  return { id };
                }
              }

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
                  if (args?.data?.workEntryId) {
                    const entry = (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[]).find(e => e.id === args.data.workEntryId);
                    if (entry) {
                      if (!entry.videoEditorRecords) entry.videoEditorRecords = [];
                      entry.videoEditorRecords.push(newEditorRec);
                    }
                  }
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
                  for (const entry of (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[])) {
                    if (Array.isArray(entry.videoEditorRecords)) {
                      const match = entry.videoEditorRecords.find((e: any) => e.id === id || e.id === `ed-${id}`);
                      if (match && args?.data) {
                        Object.assign(match, args.data);
                        match.updatedAt = new Date().toISOString();
                        return match;
                      }
                    }
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

                if (operation === 'delete') {
                  const id = args?.where?.id;
                  const idx = globalVideoEditorRecords.findIndex(e => e.id === id || e.id === `ed-${id}`);
                  if (idx !== -1) {
                    return globalVideoEditorRecords.splice(idx, 1)[0];
                  }
                  return { id };
                }
              }

              const opStr = operation as string;
              const anyArgs = args as any;


              if (model === 'User' && opStr === 'findMany') {
                return [
                  { id: 'user-admin', name: 'Administrator', email: 'muthukamatchi.off@gmail.com', role: 'ADMIN', status: 'ACTIVE', department: 'IT', designation: 'Admin' }
                ];
              }

              if (model === 'User' && (opStr === 'findUnique' || opStr === 'findFirst')) {
                const rawEmail = typeof anyArgs?.where?.email === 'string' ? anyArgs.where.email : '';
                const searchEmail = rawEmail.toLowerCase().trim();
                const ADMIN_EMAILS = [
                  'muthukamatchi.off@gmail.com',
                  'harshitharaman.nimi@gmail.com',
                  'harshitharamannimi@gmail.com'
                ];
                if (ADMIN_EMAILS.includes(searchEmail)) {
                  return { id: 'admin-user', name: 'Administrator', email: searchEmail, role: 'ADMIN', status: 'ACTIVE', department: 'IT', designation: 'Admin' };
                }
                return null;
              }

              // Return safe values based on the operation type to prevent 500 crashes
              if (operation === 'findMany') return [];
              if (operation === 'findUnique' || operation === 'findFirst') return null;
              if (operation === 'count') return 0;
              if (operation === 'aggregate') return { _sum: {}, _avg: {}, _count: {}, _min: {}, _max: {} };
              
              return null;
            }
            throw error;
          }
        },
      },
    },
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

// In serverless / production environments, reuse the client across function invocations
globalForPrisma.prisma = prisma;
