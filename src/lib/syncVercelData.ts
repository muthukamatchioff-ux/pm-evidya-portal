import { prisma as defaultPrisma } from './prisma';
import masterData from '@/data/vercel_master_sync_data.json';

export interface SyncStats {
  users: number;
  smes: number;
  smeWorkEntries: number;
  payments: number;
  documents: number;
  videoLibrary: number;
  shootingSchedules: number;
  videoEditorRecords: number;
  auditLogs: number;
}

export async function getDatabaseStats(p: any = defaultPrisma): Promise<SyncStats> {
  const getCount = async (tableName: string, fallbackFn: () => Promise<number>) => {
    try {
      const res: any = await p.$queryRawUnsafe(`SELECT count(*)::int as count FROM "${tableName}"`);
      if (res && res[0] && typeof res[0].count === 'number') {
        return res[0].count;
      }
    } catch {}
    return fallbackFn();
  };

  const [
    users,
    smes,
    smeWorkEntries,
    payments,
    documents,
    videoLibrary,
    shootingSchedules,
    videoEditorRecords,
    auditLogs
  ] = await Promise.all([
    getCount('User', () => p.user.count().catch(() => 0)),
    getCount('SME', () => p.sME.count().catch(() => 0)),
    getCount('SMEWorkEntry', () => p.sMEWorkEntry.count().catch(() => 0)),
    getCount('Payment', () => p.payment.count().catch(() => 0)),
    getCount('Document', () => p.document.count().catch(() => 0)),
    getCount('VideoLibrary', () => p.videoLibrary.count().catch(() => 0)),
    getCount('ShootingSchedule', () => p.shootingSchedule.count().catch(() => 0)),
    getCount('VideoEditorRecord', () => p.videoEditorRecord.count().catch(() => 0)),
    getCount('AuditLog', () => p.auditLog.count().catch(() => 0)),
  ]);

  return {
    users,
    smes,
    smeWorkEntries,
    payments,
    documents,
    videoLibrary,
    shootingSchedules,
    videoEditorRecords,
    auditLogs
  };
}

export async function backupDatabaseSnapshot(p: any = defaultPrisma) {
  const counts = await getDatabaseStats(p);
  const [
    users,
    smes,
    smeWorkEntries,
    payments,
    documents,
    videoLibrary,
    shootingSchedules,
    videoEditorRecords
  ] = await Promise.all([
    p.user.findMany().catch(() => []),
    p.sME.findMany().catch(() => []),
    p.sMEWorkEntry.findMany().catch(() => []),
    p.payment.findMany().catch(() => []),
    p.document.findMany().catch(() => []),
    p.videoLibrary.findMany().catch(() => []),
    p.shootingSchedule.findMany().catch(() => []),
    p.videoEditorRecord.findMany().catch(() => []),
  ]);

  return {
    timestamp: new Date().toISOString(),
    counts,
    data: {
      users,
      smes,
      smeWorkEntries,
      payments,
      documents,
      videoLibrary,
      shootingSchedules,
      videoEditorRecords
    }
  };
}

export async function syncSchema(p: any = defaultPrisma) {
  const ddlStatements = [
    // User columns
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designation" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "department" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;`,
    // SME columns
    `ALTER TABLE "SME" ADD COLUMN IF NOT EXISTS "address" TEXT;`,
    `ALTER TABLE "SME" ADD COLUMN IF NOT EXISTS "location" TEXT;`,
    `ALTER TABLE "SME" ADD COLUMN IF NOT EXISTS "email" TEXT;`,
    `ALTER TABLE "SME" ADD COLUMN IF NOT EXISTS "contactNumber" TEXT;`,
    // VideoLibrary table
    `CREATE TABLE IF NOT EXISTS "VideoLibrary" (
      "id" TEXT PRIMARY KEY,
      "smeName" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "videoLink" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "duration" TEXT,
      "trade" TEXT,
      "epicId" TEXT
    );`,
    // SMEWorkEntry columns
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "cameramanId" TEXT;`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "editorId" TEXT;`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "cameramanAssignedAt" TIMESTAMP(3);`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "editorAssignedAt" TIMESTAMP(3);`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "publishedBy" TEXT;`,
    // Payment columns
    `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "budgetHeadId" TEXT;`,
    // Document columns
    `ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "projectId" TEXT;`,
    // ShootingSchedule columns
    `ALTER TABLE "ShootingSchedule" ADD COLUMN IF NOT EXISTS "cameramanId" TEXT;`,
    // VideoEditorRecord columns
    `ALTER TABLE "VideoEditorRecord" ADD COLUMN IF NOT EXISTS "editorId" TEXT;`
  ];

  const results: any[] = [];
  for (const ddl of ddlStatements) {
    try {
      await p.$executeRawUnsafe(ddl);
      results.push({ sql: ddl.slice(0, 50), success: true });
    } catch (e: any) {
      results.push({ sql: ddl.slice(0, 50), success: false, error: e.message });
    }
  }

  return { success: results.every(r => r.success), count: results.length, results };
}

export async function syncUsers(p: any = defaultPrisma) {
  let count = 0;
  const errors: any[] = [];
  for (const u of ((masterData.user || []) as any[])) {
    try {
      await p.$executeRawUnsafe(
        `INSERT INTO "User" ("id", "email", "name", "role", "status", "designation", "department", "password", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT ("id") DO UPDATE SET
           "email" = EXCLUDED."email",
           "name" = EXCLUDED."name",
           "role" = EXCLUDED."role",
           "status" = EXCLUDED."status",
           "designation" = EXCLUDED."designation",
           "department" = EXCLUDED."department",
           "password" = COALESCE(EXCLUDED."password", "User"."password"),
           "updatedAt" = EXCLUDED."updatedAt";`,
        u.id,
        u.email,
        u.name || null,
        u.role || 'VIEWER',
        u.status || 'ACTIVE',
        u.designation || null,
        u.department || null,
        u.password || null,
        u.createdAt ? new Date(u.createdAt) : new Date(),
        u.updatedAt ? new Date(u.updatedAt) : new Date()
      );
      count++;
    } catch (e: any) {
      errors.push({ id: u.id, email: u.email, error: e.message });
    }
  }
  return { success: errors.length === 0, count, errors };
}

export async function syncSmes(p: any = defaultPrisma) {
  let count = 0;
  const errors: any[] = [];
  for (const s of ((masterData.sME || []) as any[])) {
    try {
      await p.$executeRawUnsafe(
        `INSERT INTO "SME" ("id", "name", "designation", "institute", "status", "address", "location", "email", "contactNumber", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT ("id") DO UPDATE SET
           "name" = EXCLUDED."name",
           "designation" = EXCLUDED."designation",
           "institute" = EXCLUDED."institute",
           "status" = EXCLUDED."status",
           "address" = EXCLUDED."address",
           "location" = EXCLUDED."location",
           "email" = EXCLUDED."email",
           "contactNumber" = EXCLUDED."contactNumber",
           "updatedAt" = EXCLUDED."updatedAt";`,
        s.id,
        s.name,
        s.designation || null,
        s.institute || null,
        s.status || 'ACTIVE',
        s.address || null,
        s.location || null,
        s.email || null,
        s.contactNumber || null,
        s.createdAt ? new Date(s.createdAt) : new Date(),
        s.updatedAt ? new Date(s.updatedAt) : new Date()
      );
      count++;
    } catch (e: any) {
      errors.push({ id: s.id, name: s.name, error: e.message });
    }
  }
  return { success: errors.length === 0, count, errors };
}

export async function syncWorkEntries(p: any = defaultPrisma) {
  let count = 0;
  const errors: any[] = [];
  for (const we of ((masterData.sMEWorkEntry || []) as any[])) {
    try {
      const isCompleted = we.status === 'COMPLETED';
      await p.$executeRawUnsafe(
        `INSERT INTO "SMEWorkEntry" ("id", "smeId", "trade", "topic", "attendanceFrom", "attendanceTo", "days", "ratePerDay", "taAmount", "otherAmount", "status", "epicSequence", "isPublished", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT ("id") DO UPDATE SET
           "smeId" = EXCLUDED."smeId",
           "trade" = EXCLUDED."trade",
           "topic" = EXCLUDED."topic",
           "attendanceFrom" = EXCLUDED."attendanceFrom",
           "attendanceTo" = EXCLUDED."attendanceTo",
           "days" = EXCLUDED."days",
           "ratePerDay" = EXCLUDED."ratePerDay",
           "taAmount" = EXCLUDED."taAmount",
           "otherAmount" = EXCLUDED."otherAmount",
           "status" = EXCLUDED."status",
           "epicSequence" = EXCLUDED."epicSequence",
           "isPublished" = EXCLUDED."isPublished",
           "updatedAt" = EXCLUDED."updatedAt";`,
        we.id,
        we.smeId,
        we.trade,
        we.topic,
        we.attendanceFrom ? new Date(we.attendanceFrom) : null,
        we.attendanceTo ? new Date(we.attendanceTo) : null,
        we.days !== undefined && we.days !== null ? Number(we.days) : null,
        we.ratePerDay !== undefined && we.ratePerDay !== null ? Number(we.ratePerDay) : null,
        we.taAmount !== undefined && we.taAmount !== null ? Number(we.taAmount) : null,
        we.otherAmount !== undefined && we.otherAmount !== null ? Number(we.otherAmount) : null,
        we.status || 'COMPLETED',
        we.epicSequence,
        isCompleted,
        we.createdAt ? new Date(we.createdAt) : new Date(),
        we.updatedAt ? new Date(we.updatedAt) : new Date()
      );
      count++;
    } catch (e: any) {
      errors.push({ id: we.id, epicSequence: we.epicSequence, error: e.message });
    }
  }

  try {
    await p.$executeRawUnsafe(
      `SELECT setval('"SMEWorkEntry_epicSequence_seq"', GREATEST((SELECT COALESCE(MAX("epicSequence"), 0) FROM "SMEWorkEntry"), 20));`
    );
  } catch (_) {}

  return { success: errors.length === 0, count, errors };
}

export async function syncPayments(p: any = defaultPrisma) {
  let count = 0;
  const errors: any[] = [];
  for (const pay of ((masterData.payment || []) as any[])) {
    try {
      await p.$executeRawUnsafe(
        `INSERT INTO "Payment" ("id", "workEntryId", "grossAmount", "taAmount", "otherAmount", "totalAmount", "status", "utrNumber", "paymentDate", "remarks", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT ("id") DO UPDATE SET
           "workEntryId" = EXCLUDED."workEntryId",
           "grossAmount" = EXCLUDED."grossAmount",
           "taAmount" = EXCLUDED."taAmount",
           "otherAmount" = EXCLUDED."otherAmount",
           "totalAmount" = EXCLUDED."totalAmount",
           "status" = EXCLUDED."status",
           "utrNumber" = EXCLUDED."utrNumber",
           "paymentDate" = EXCLUDED."paymentDate",
           "remarks" = EXCLUDED."remarks",
           "updatedAt" = EXCLUDED."updatedAt";`,
        pay.id,
        pay.workEntryId,
        Number(pay.grossAmount) || 0,
        pay.taAmount !== undefined && pay.taAmount !== null ? Number(pay.taAmount) : null,
        pay.otherAmount !== undefined && pay.otherAmount !== null ? Number(pay.otherAmount) : null,
        Number(pay.totalAmount) || 0,
        pay.status || 'COMPLETED',
        pay.utrNumber || null,
        pay.paymentDate ? new Date(pay.paymentDate) : null,
        pay.remarks || null,
        pay.createdAt ? new Date(pay.createdAt) : new Date(),
        pay.updatedAt ? new Date(pay.updatedAt) : new Date()
      );
      count++;
    } catch (e: any) {
      errors.push({ id: pay.id, workEntryId: pay.workEntryId, error: e.message });
    }
  }
  return { success: errors.length === 0, count, errors };
}

export async function syncDocuments(p: any = defaultPrisma) {
  let count = 0;
  const errors: any[] = [];
  for (const doc of ((masterData.document || []) as any[])) {
    try {
      await p.$executeRawUnsafe(
        `INSERT INTO "Document" ("id", "name", "type", "status", "filePath", "version", "workEntryId", "paymentId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT ("id") DO UPDATE SET
           "name" = EXCLUDED."name",
           "type" = EXCLUDED."type",
           "status" = EXCLUDED."status",
           "filePath" = EXCLUDED."filePath",
           "version" = EXCLUDED."version",
           "workEntryId" = EXCLUDED."workEntryId",
           "paymentId" = EXCLUDED."paymentId",
           "updatedAt" = EXCLUDED."updatedAt";`,
        doc.id,
        doc.name,
        doc.type,
        doc.status || 'SAVED',
        doc.filePath || null,
        doc.version ? Number(doc.version) : 1,
        doc.workEntryId || null,
        doc.paymentId || null,
        doc.createdAt ? new Date(doc.createdAt) : new Date(),
        doc.updatedAt ? new Date(doc.updatedAt) : new Date()
      );
      count++;
    } catch (e: any) {
      errors.push({ id: doc.id, name: doc.name, error: e.message });
    }
  }
  return { success: errors.length === 0, count, errors };
}

export async function syncVideoLibrary(p: any = defaultPrisma) {
  let count = 0;
  const errors: any[] = [];
  for (const v of ((masterData.videoLibrary || []) as any[])) {
    try {
      await p.$executeRawUnsafe(
        `INSERT INTO "VideoLibrary" ("id", "epicId", "title", "smeName", "trade", "duration", "videoLink", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT ("id") DO UPDATE SET
           "epicId" = EXCLUDED."epicId",
           "title" = EXCLUDED."title",
           "smeName" = EXCLUDED."smeName",
           "trade" = EXCLUDED."trade",
           "duration" = EXCLUDED."duration",
           "videoLink" = EXCLUDED."videoLink",
           "updatedAt" = EXCLUDED."updatedAt";`,
        v.id,
        v.epicId || null,
        v.title,
        v.smeName || 'NIMI Expert',
        v.trade || null,
        v.duration || null,
        v.videoLink || '',
        v.createdAt ? new Date(v.createdAt) : new Date(),
        v.updatedAt ? new Date(v.updatedAt) : new Date()
      );
      count++;
    } catch (e: any) {
      errors.push({ id: v.id, title: v.title, error: e.message });
    }
  }
  return { success: errors.length === 0, count, errors };
}

export async function syncShootingSchedules(p: any = defaultPrisma) {
  let count = 0;
  const errors: any[] = [];
  for (const s of ((masterData.shootingSchedule || []) as any[])) {
    try {
      await p.$executeRawUnsafe(
        `INSERT INTO "ShootingSchedule" ("id", "workEntryId", "videoTitle", "shootDate", "location", "shootingType", "scheduledStart", "scheduledEnd", "actualStart", "actualEnd", "cameraman", "status", "productionNotes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT ("id") DO UPDATE SET
           "workEntryId" = EXCLUDED."workEntryId",
           "videoTitle" = EXCLUDED."videoTitle",
           "shootDate" = EXCLUDED."shootDate",
           "location" = EXCLUDED."location",
           "shootingType" = EXCLUDED."shootingType",
           "scheduledStart" = EXCLUDED."scheduledStart",
           "scheduledEnd" = EXCLUDED."scheduledEnd",
           "actualStart" = EXCLUDED."actualStart",
           "actualEnd" = EXCLUDED."actualEnd",
           "cameraman" = EXCLUDED."cameraman",
           "status" = EXCLUDED."status",
           "productionNotes" = EXCLUDED."productionNotes",
           "updatedAt" = EXCLUDED."updatedAt";`,
        s.id,
        s.workEntryId,
        s.videoTitle || null,
        s.shootDate ? new Date(s.shootDate) : null,
        s.location || null,
        s.shootingType || null,
        s.scheduledStart ? new Date(s.scheduledStart) : null,
        s.scheduledEnd ? new Date(s.scheduledEnd) : null,
        s.actualStart ? new Date(s.actualStart) : null,
        s.actualEnd ? new Date(s.actualEnd) : null,
        s.cameraman || null,
        s.status || 'PLANNED',
        s.productionNotes || null,
        s.createdAt ? new Date(s.createdAt) : new Date(),
        s.updatedAt ? new Date(s.updatedAt) : new Date()
      );
      count++;
    } catch (e: any) {
      errors.push({ id: s.id, videoTitle: s.videoTitle, error: e.message });
    }
  }
  return { success: errors.length === 0, count, errors };
}

export async function syncVideoEditorRecords(p: any = defaultPrisma) {
  let count = 0;
  const errors: any[] = [];
  for (const e of ((masterData.videoEditorRecord || []) as any[])) {
    try {
      await p.$executeRawUnsafe(
        `INSERT INTO "VideoEditorRecord" ("id", "workEntryId", "assignedVideo", "editorName", "editingStartDate", "editingEndDate", "roughCutLink", "finalCutLink", "duration", "status", "reviewComments", "finalVideoFile", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT ("id") DO UPDATE SET
           "workEntryId" = EXCLUDED."workEntryId",
           "assignedVideo" = EXCLUDED."assignedVideo",
           "editorName" = EXCLUDED."editorName",
           "editingStartDate" = EXCLUDED."editingStartDate",
           "editingEndDate" = EXCLUDED."editingEndDate",
           "roughCutLink" = EXCLUDED."roughCutLink",
           "finalCutLink" = EXCLUDED."finalCutLink",
           "duration" = EXCLUDED."duration",
           "status" = EXCLUDED."status",
           "reviewComments" = EXCLUDED."reviewComments",
           "finalVideoFile" = EXCLUDED."finalVideoFile",
           "updatedAt" = EXCLUDED."updatedAt";`,
        e.id,
        e.workEntryId,
        e.assignedVideo,
        e.editorName || null,
        e.editingStartDate ? new Date(e.editingStartDate) : null,
        e.editingEndDate ? new Date(e.editingEndDate) : null,
        e.roughCutLink || null,
        e.finalCutLink || null,
        e.duration || null,
        e.status || 'ASSIGNED',
        e.reviewComments || null,
        e.finalVideoFile || null,
        e.createdAt ? new Date(e.createdAt) : new Date(),
        e.updatedAt ? new Date(e.updatedAt) : new Date()
      );
      count++;
    } catch (err: any) {
      errors.push({ id: e.id, assignedVideo: e.assignedVideo, error: err.message });
    }
  }
  return { success: errors.length === 0, count, errors };
}

export async function executeVercelDataSync(p: any = defaultPrisma, section: string = 'all') {
  const beforeStats = await getDatabaseStats(p);

  const report: any = {
    section,
    timestamp: new Date().toISOString(),
    source: 'Vercel Working Deployment (db_backup_2026-10-28T11-56-01-213Z.json)',
    statsBefore: beforeStats,
    results: {}
  };

  if (section === 'schema' || section === 'all') {
    report.results.schema = await syncSchema(p);
  }
  if (section === 'users' || section === 'all') {
    report.results.users = await syncUsers(p);
  }
  if (section === 'smes' || section === 'all') {
    report.results.smes = await syncSmes(p);
  }
  if (section === 'workentries' || section === 'all') {
    report.results.workentries = await syncWorkEntries(p);
  }
  if (section === 'payments' || section === 'all') {
    report.results.payments = await syncPayments(p);
  }
  if (section === 'documents' || section === 'all') {
    report.results.documents = await syncDocuments(p);
  }
  if (section === 'videos' || section === 'all') {
    report.results.videos = await syncVideoLibrary(p);
  }
  if (section === 'schedules' || section === 'all') {
    report.results.schedules = await syncShootingSchedules(p);
  }
  if (section === 'editors' || section === 'all') {
    report.results.editors = await syncVideoEditorRecords(p);
  }

  report.statsAfter = await getDatabaseStats(p);
  return { success: true, ...report };
}
