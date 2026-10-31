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
    p.user.count().catch(() => 0),
    p.sME.count().catch(() => 0),
    p.sMEWorkEntry.count().catch(() => 0),
    p.payment.count().catch(() => 0),
    p.document.count().catch(() => 0),
    p.videoLibrary.count().catch(() => 0),
    p.shootingSchedule.count().catch(() => 0),
    p.videoEditorRecord.count().catch(() => 0),
    p.auditLog.count().catch(() => 0),
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
    counts: {
      users: users.length,
      smes: smes.length,
      smeWorkEntries: smeWorkEntries.length,
      payments: payments.length,
      documents: documents.length,
      videoLibrary: videoLibrary.length,
      shootingSchedules: shootingSchedules.length,
      videoEditorRecords: videoEditorRecords.length
    },
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
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designation" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "department" TEXT;`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;`,
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
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "cameramanId" TEXT;`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "editorId" TEXT;`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "cameramanAssignedAt" TIMESTAMP(3);`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "editorAssignedAt" TIMESTAMP(3);`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN DEFAULT false;`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);`,
    `ALTER TABLE "SMEWorkEntry" ADD COLUMN IF NOT EXISTS "publishedBy" TEXT;`,
  ];

  const results: any[] = [];
  for (const sql of ddlStatements) {
    try {
      await p.$executeRawUnsafe(sql);
      results.push({ sql: sql.replace(/\s+/g, ' ').substring(0, 50), success: true });
    } catch (e: any) {
      results.push({ sql: sql.replace(/\s+/g, ' ').substring(0, 50), success: false, error: e.message });
    }
  }
  return { success: true, count: results.filter(r => r.success).length, results };
}

export async function syncUsers(p: any = defaultPrisma) {
  let count = 0;
  const errors: any[] = [];
  for (const u of ((masterData.user || []) as any[])) {
    try {
      const userData: any = {
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status || 'ACTIVE',
        designation: u.designation || null,
        department: u.department || null,
      };
      if (u.password) userData.password = u.password;
      if (u.lastLogin) userData.lastLogin = new Date(u.lastLogin);
      if (u.createdBy) userData.createdBy = u.createdBy;

      await p.user.upsert({
        where: { email: u.email },
        update: userData,
        create: {
          id: u.id,
          ...userData,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
        }
      });
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
      const smeData = {
        name: s.name,
        designation: s.designation || null,
        institute: s.institute || null,
        status: s.status || 'ACTIVE',
        address: s.address || null,
        location: s.location || null,
        email: s.email || null,
        contactNumber: s.contactNumber || null,
      };

      await p.sME.upsert({
        where: { id: s.id },
        update: smeData,
        create: {
          id: s.id,
          ...smeData,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
        }
      });
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
      const entryData = {
        smeId: we.smeId,
        trade: we.trade,
        topic: we.topic,
        attendanceFrom: we.attendanceFrom ? new Date(we.attendanceFrom) : null,
        attendanceTo: we.attendanceTo ? new Date(we.attendanceTo) : null,
        days: we.days !== undefined && we.days !== null ? Number(we.days) : null,
        ratePerDay: we.ratePerDay !== undefined && we.ratePerDay !== null ? Number(we.ratePerDay) : null,
        taAmount: we.taAmount !== undefined && we.taAmount !== null ? Number(we.taAmount) : null,
        otherAmount: we.otherAmount !== undefined && we.otherAmount !== null ? Number(we.otherAmount) : null,
        status: we.status || 'COMPLETED',
        epicSequence: we.epicSequence
      };

      await p.sMEWorkEntry.upsert({
        where: { id: we.id },
        update: entryData,
        create: {
          id: we.id,
          ...entryData,
          createdAt: we.createdAt ? new Date(we.createdAt) : new Date(),
          updatedAt: we.updatedAt ? new Date(we.updatedAt) : new Date()
        }
      });
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
      const payData = {
        workEntryId: pay.workEntryId,
        grossAmount: Number(pay.grossAmount) || 0,
        taAmount: pay.taAmount !== null && pay.taAmount !== undefined ? Number(pay.taAmount) : null,
        otherAmount: pay.otherAmount !== null && pay.otherAmount !== undefined ? Number(pay.otherAmount) : null,
        totalAmount: Number(pay.totalAmount) || 0,
        status: pay.status || 'DRAFT',
        utrNumber: pay.utrNumber || null,
        paymentDate: pay.paymentDate ? new Date(pay.paymentDate) : null,
        remarks: pay.remarks || null,
        budgetHeadId: pay.budgetHeadId || null,
      };

      await p.payment.upsert({
        where: { id: pay.id },
        update: payData,
        create: {
          id: pay.id,
          ...payData,
          createdAt: pay.createdAt ? new Date(pay.createdAt) : new Date(),
          updatedAt: pay.updatedAt ? new Date(pay.updatedAt) : new Date()
        }
      });
      count++;
    } catch (e: any) {
      errors.push({ id: pay.id, error: e.message });
    }
  }
  return { success: errors.length === 0, count, errors };
}

export async function syncDocuments(p: any = defaultPrisma) {
  let count = 0;
  const errors: any[] = [];
  for (const doc of ((masterData.document || []) as any[])) {
    try {
      const docData = {
        name: doc.name,
        type: doc.type,
        status: doc.status || 'SAVED',
        filePath: doc.filePath || null,
        version: Number(doc.version) || 1,
        workEntryId: doc.workEntryId || null,
        paymentId: doc.paymentId || null,
      };

      await p.document.upsert({
        where: { id: doc.id },
        update: docData,
        create: {
          id: doc.id,
          ...docData,
          createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date()
        }
      });
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
      const vData = {
        epicId: v.epicId,
        title: v.title,
        smeName: v.smeName || null,
        trade: v.trade || null,
        duration: v.duration || null,
        videoLink: v.videoLink || ''
      };

      await p.videoLibrary.upsert({
        where: { id: v.id },
        update: vData,
        create: {
          id: v.id,
          ...vData,
          createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
          updatedAt: v.updatedAt ? new Date(v.updatedAt) : new Date()
        }
      });
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
      const sData = {
        workEntryId: s.workEntryId,
        videoTitle: s.videoTitle,
        shootDate: s.shootDate ? new Date(s.shootDate) : null,
        location: s.location || null,
        shootingType: s.shootingType || null,
        scheduledStart: s.scheduledStart ? new Date(s.scheduledStart) : null,
        scheduledEnd: s.scheduledEnd ? new Date(s.scheduledEnd) : null,
        actualStart: s.actualStart ? new Date(s.actualStart) : null,
        actualEnd: s.actualEnd ? new Date(s.actualEnd) : null,
        cameraman: s.cameraman || null,
        status: s.status || 'SCHEDULED',
        productionNotes: s.productionNotes || null,
      };

      await p.shootingSchedule.upsert({
        where: { id: s.id },
        update: sData,
        create: {
          id: s.id,
          ...sData,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
        }
      });
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
      const eData = {
        workEntryId: e.workEntryId,
        assignedVideo: e.assignedVideo,
        editorName: e.editorName || null,
        editingStartDate: e.editingStartDate ? new Date(e.editingStartDate) : null,
        editingEndDate: e.editingEndDate ? new Date(e.editingEndDate) : null,
        roughCutLink: e.roughCutLink || null,
        finalCutLink: e.finalCutLink || null,
        duration: e.duration || null,
        status: e.status || 'ASSIGNED',
        reviewComments: e.reviewComments || null,
        finalVideoFile: e.finalVideoFile || null,
      };

      await p.videoEditorRecord.upsert({
        where: { id: e.id },
        update: eData,
        create: {
          id: e.id,
          ...eData,
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
          updatedAt: e.updatedAt ? new Date(e.updatedAt) : new Date()
        }
      });
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
