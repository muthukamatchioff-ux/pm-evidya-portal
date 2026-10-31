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

export async function executeVercelDataSync(p: any = defaultPrisma) {
  const beforeStats = await getDatabaseStats(p);
  console.log('[SyncVercelData] Starting data synchronization. Pre-sync stats:', beforeStats);

  const results: any = {
    users: { created: 0, updated: 0 },
    smes: { created: 0, updated: 0 },
    smeWorkEntries: { created: 0, updated: 0 },
    payments: { created: 0, updated: 0 },
    documents: { created: 0, updated: 0 },
    videoLibrary: { created: 0, updated: 0 },
    shootingSchedules: { created: 0, updated: 0 },
    videoEditorRecords: { created: 0, updated: 0 },
  };

  // 1. Synchronize Users (14 accounts)
  for (const u of (masterData.user || [])) {
    const existing = await p.user.findFirst({
      where: { OR: [{ id: u.id }, { email: u.email }] }
    });

    const userData: any = {
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status || 'ACTIVE',
      designation: u.designation || null,
      department: u.department || null,
    };
    if (u.password) {
      userData.password = u.password;
    }
    if (u.lastLogin) {
      userData.lastLogin = new Date(u.lastLogin);
    }
    if (u.createdBy) {
      userData.createdBy = u.createdBy;
    }

    if (existing) {
      await p.user.update({
        where: { id: existing.id },
        data: userData
      });
      results.users.updated++;
    } else {
      await p.user.create({
        data: {
          id: u.id,
          ...userData,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
        }
      });
      results.users.created++;
    }
  }

  // 2. Synchronize Status, Trade, Language, Project if present
  for (const st of (masterData.status || [])) {
    await p.status.upsert({
      where: { id: st.id },
      update: { name: st.name },
      create: { id: st.id, name: st.name }
    }).catch(() => {});
  }
  for (const tr of (masterData.trade || [])) {
    await p.trade.upsert({
      where: { id: tr.id },
      update: { name: tr.name },
      create: { id: tr.id, name: tr.name }
    }).catch(() => {});
  }
  for (const lang of (masterData.language || [])) {
    await p.language.upsert({
      where: { id: lang.id },
      update: { name: lang.name },
      create: { id: lang.id, name: lang.name }
    }).catch(() => {});
  }
  for (const pr of (masterData.project || [])) {
    await p.project.upsert({
      where: { id: pr.id },
      update: {
        projectCode: pr.projectCode,
        title: pr.title,
        tradeId: pr.tradeId || null,
        languageId: pr.languageId || null,
        statusId: pr.statusId || null,
        startDate: pr.startDate ? new Date(pr.startDate) : null,
        completionDate: pr.completionDate ? new Date(pr.completionDate) : null,
      },
      create: {
        id: pr.id,
        projectCode: pr.projectCode,
        title: pr.title,
        tradeId: pr.tradeId || null,
        languageId: pr.languageId || null,
        statusId: pr.statusId || null,
        startDate: pr.startDate ? new Date(pr.startDate) : null,
        completionDate: pr.completionDate ? new Date(pr.completionDate) : null,
      }
    }).catch(() => {});
  }

  // 3. Synchronize SMEs (16 records)
  for (const s of (masterData.sME || [])) {
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

    const existing = await p.sME.findUnique({ where: { id: s.id } });
    if (existing) {
      await p.sME.update({ where: { id: s.id }, data: smeData });
      results.smes.updated++;
    } else {
      await p.sME.create({
        data: {
          id: s.id,
          ...smeData,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
        }
      });
      results.smes.created++;
    }
  }

  // 4. Synchronize SMEWorkEntries (16 records)
  for (const we of (masterData.sMEWorkEntry || [])) {
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

    const existing = await p.sMEWorkEntry.findUnique({ where: { id: we.id } });
    if (existing) {
      await p.sMEWorkEntry.update({ where: { id: we.id }, data: entryData });
      results.smeWorkEntries.updated++;
    } else {
      await p.sMEWorkEntry.create({
        data: {
          id: we.id,
          ...entryData,
          createdAt: we.createdAt ? new Date(we.createdAt) : new Date(),
          updatedAt: we.updatedAt ? new Date(we.updatedAt) : new Date()
        }
      });
      results.smeWorkEntries.created++;
    }
  }

  // 5. Synchronize Payments (16 records)
  for (const pay of (masterData.payment || [])) {
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

    const existing = await p.payment.findUnique({ where: { id: pay.id } });
    if (existing) {
      await p.payment.update({ where: { id: pay.id }, data: payData });
      results.payments.updated++;
    } else {
      await p.payment.create({
        data: {
          id: pay.id,
          ...payData,
          createdAt: pay.createdAt ? new Date(pay.createdAt) : new Date(),
          updatedAt: pay.updatedAt ? new Date(pay.updatedAt) : new Date()
        }
      });
      results.payments.created++;
    }
  }

  // 6. Synchronize Documents (67 records)
  for (const doc of (masterData.document || [])) {
    const docData = {
      name: doc.name,
      type: doc.type,
      status: doc.status || 'SAVED',
      filePath: doc.filePath || null,
      version: Number(doc.version) || 1,
      workEntryId: doc.workEntryId || null,
      paymentId: doc.paymentId || null,
      projectId: doc.projectId || null,
    };

    const existing = await p.document.findUnique({ where: { id: doc.id } });
    if (existing) {
      await p.document.update({ where: { id: doc.id }, data: docData });
      results.documents.updated++;
    } else {
      await p.document.create({
        data: {
          id: doc.id,
          ...docData,
          createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date()
        }
      });
      results.documents.created++;
    }
  }

  // 7. Synchronize VideoLibrary (84 records)
  for (const v of (masterData.videoLibrary || [])) {
    const vData = {
      epicId: v.epicId,
      title: v.title,
      smeName: v.smeName || null,
      trade: v.trade || null,
      duration: v.duration || null,
      videoLink: v.videoLink || ''
    };

    const existing = await p.videoLibrary.findUnique({ where: { id: v.id } });
    if (existing) {
      await p.videoLibrary.update({ where: { id: v.id }, data: vData });
      results.videoLibrary.updated++;
    } else {
      await p.videoLibrary.create({
        data: {
          id: v.id,
          ...vData,
          createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
          updatedAt: v.updatedAt ? new Date(v.updatedAt) : new Date()
        }
      });
      results.videoLibrary.created++;
    }
  }

  // 8. Synchronize ShootingSchedule (84 records)
  for (const s of (masterData.shootingSchedule || [])) {
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

    const existing = await p.shootingSchedule.findUnique({ where: { id: s.id } });
    if (existing) {
      await p.shootingSchedule.update({ where: { id: s.id }, data: sData });
      results.shootingSchedules.updated++;
    } else {
      await p.shootingSchedule.create({
        data: {
          id: s.id,
          ...sData,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date()
        }
      });
      results.shootingSchedules.created++;
    }
  }

  // 9. Synchronize VideoEditorRecord (84 records)
  for (const e of (masterData.videoEditorRecord || [])) {
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

    const existing = await p.videoEditorRecord.findUnique({ where: { id: e.id } });
    if (existing) {
      await p.videoEditorRecord.update({ where: { id: e.id }, data: eData });
      results.videoEditorRecords.updated++;
    } else {
      await p.videoEditorRecord.create({
        data: {
          id: e.id,
          ...eData,
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
          updatedAt: e.updatedAt ? new Date(e.updatedAt) : new Date()
        }
      });
      results.videoEditorRecords.created++;
    }
  }

  // 10. Update sequence to ensure next inserts don't collide
  try {
    await p.$executeRawUnsafe(
      `SELECT setval('"SMEWorkEntry_epicSequence_seq"', GREATEST((SELECT COALESCE(MAX("epicSequence"), 0) FROM "SMEWorkEntry"), 20));`
    );
  } catch (seqErr: any) {
    console.warn('[SyncVercelData] Sequence setval warning:', seqErr.message);
  }

  const afterStats = await getDatabaseStats(p);
  console.log('[SyncVercelData] Synchronization complete. Post-sync stats:', afterStats);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    source: 'Vercel Working Deployment (db_backup_2026-10-28T11-56-01-213Z.json)',
    statsBefore: beforeStats,
    statsAfter: afterStats,
    recordsSynchronized: results
  };
}
