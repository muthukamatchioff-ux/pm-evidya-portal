import { prisma as defaultPrisma } from './prisma';
import { TRACKER_SOURCE_RECORDS } from './trackerInitialData';

export async function syncTrackerIfNeeded(customPrisma?: any, force: boolean = false) {
  const p = customPrisma || defaultPrisma;

  try {
    const trackerVidCount = await p.videoLibrary.count({
      where: { id: { startsWith: 'VID-' } }
    });

    if (!force && trackerVidCount === 76) {
      return {
        success: true,
        synced: false,
        message: 'Video Production Tracker is already synchronized.',
        count: trackerVidCount
      };
    }

    console.log(`[SyncTracker] Starting synchronization (current count: ${trackerVidCount}, target: 76)...`);

    // 1. Ensure staff accounts exist
    const passwordHash = "$2b$12$5YWrRpEsXi87uO/N6FccFuFEAmEyuNz6zu/UliFwepyjJtw4Luigu";
    const newStaff = [
      { email: 'suganthan@nimi.org', name: 'Suganthan', role: 'EDITOR', designation: 'Video Editor', department: '[12,15,16,17]' },
      { email: 'manikandan@nimi.org', name: 'Manikandan', role: 'EDITOR', designation: 'Video Editor', department: '[12,15,16,17]' },
    ];

    for (const s of newStaff) {
      const existing = await p.user.findUnique({ where: { email: s.email } });
      if (!existing) {
        await p.user.create({
          data: {
            email: s.email,
            name: s.name,
            role: s.role,
            status: 'ACTIVE',
            designation: s.designation,
            department: s.department,
            password: passwordHash,
            createdBy: 'System Provisioning'
          }
        });
      }
    }

    // 2. Fetch SMEWorkEntries from DB
    const dbEntries = await p.sMEWorkEntry.findMany({
      include: {
        sme: true,
        videoLibraries: true,
        shootingSchedules: true,
        videoEditorRecords: true
      }
    });

    const entryBySeq = new Map<number, any>();
    for (const e of dbEntries) {
      entryBySeq.set(e.epicSequence, e);
    }

    // 3. Upsert each topic record into DB
    const validVidIds = new Set<string>();
    const validShootIds = new Set<string>();
    const validEdIds = new Set<string>();

    for (const row of TRACKER_SOURCE_RECORDS) {
      const workEntry = entryBySeq.get(row.epicSeq);
      if (!workEntry) {
        console.warn(`[SyncTracker] Could not find SMEWorkEntry for Epic Sequence ${row.epicSeq}`);
        continue;
      }

      const vidId = `VID-${String(row.rowNumber).padStart(3, '0')}`;
      const shootId = `shoot-VID-${String(row.rowNumber).padStart(3, '0')}`;
      const edId = `ed-VID-${String(row.rowNumber).padStart(3, '0')}`;

      validVidIds.add(vidId);
      validShootIds.add(shootId);
      validEdIds.add(edId);

      const metaJson = JSON.stringify({
        sNo: row.sNo,
        monthSNo: row.monthSNo,
        month: row.month,
        epicCode: row.epicCode,
        excelRow: row.excelRow,
        originalTopic: row.videoTopic
      });

      const shootStart = row.shootStartDate ? new Date(row.shootStartDate) : null;
      const shootEnd = row.shootEndDate ? new Date(row.shootEndDate) : null;
      const editStart = row.editStartDate ? new Date(row.editStartDate) : null;
      const editEnd = row.editEndDate ? new Date(row.editEndDate) : null;

      // Upsert VideoLibrary - Never overwrite existing user data
      await p.videoLibrary.upsert({
        where: { id: vidId },
        update: {},
        create: {
          id: vidId,
          epicId: workEntry.id,
          title: row.videoTopic,
          smeName: row.smeName,
          trade: row.trade,
          duration: row.duration,
          videoLink: row.videoLink || ''
        }
      });

      // Upsert ShootingSchedule - Never overwrite existing user data
      await p.shootingSchedule.upsert({
        where: { id: shootId },
        update: {},
        create: {
          id: shootId,
          workEntryId: workEntry.id,
          videoTitle: row.videoTopic,
          cameraman: row.cameraman,
          scheduledStart: shootStart,
          scheduledEnd: shootEnd,
          status: row.shootStatus,
          location: row.month,
          productionNotes: metaJson
        }
      });

      // Upsert VideoEditorRecord - Never overwrite existing user data
      await p.videoEditorRecord.upsert({
        where: { id: edId },
        update: {},
        create: {
          id: edId,
          workEntryId: workEntry.id,
          assignedVideo: row.videoTopic,
          editorName: row.editorName,
          editingStartDate: editStart,
          editingEndDate: editEnd,
          status: row.editStatus,
          duration: row.duration,
          finalVideoFile: row.videoLink,
          reviewComments: metaJson
        }
      });
    }

    // Clean up obsolete/stale records for these 13 tracker EPICs
    const trackerEpicIds = [4, 3, 1, 2, 5, 8, 10, 6, 11, 15, 12, 16, 17]
      .map(seq => entryBySeq.get(seq)?.id)
      .filter(Boolean);

    const canonicalTitles = TRACKER_SOURCE_RECORDS.map(r => r.videoTopic.trim());

    // 1. Delete non-canonical video libraries for tracker EPICs or matching canonical titles
    await p.videoLibrary.deleteMany({
      where: {
        OR: [
          { epicId: { in: trackerEpicIds }, id: { notIn: Array.from(validVidIds) } },
          { id: { notIn: Array.from(validVidIds) }, title: { in: canonicalTitles } },
          { id: { startsWith: 'VID-', notIn: Array.from(validVidIds) } }
        ]
      }
    });

    // 2. Delete non-canonical shooting schedules for tracker EPICs or matching canonical titles
    await p.shootingSchedule.deleteMany({
      where: {
        OR: [
          { workEntryId: { in: trackerEpicIds }, id: { notIn: Array.from(validShootIds) } },
          { id: { notIn: Array.from(validShootIds) }, videoTitle: { in: canonicalTitles } },
          { id: { startsWith: 'shoot-VID-', notIn: Array.from(validShootIds) } }
        ]
      }
    });

    // 3. Delete non-canonical editor records for tracker EPICs or matching canonical titles
    await p.videoEditorRecord.deleteMany({
      where: {
        OR: [
          { workEntryId: { in: trackerEpicIds }, id: { notIn: Array.from(validEdIds) } },
          { id: { notIn: Array.from(validEdIds) }, assignedVideo: { in: canonicalTitles } },
          { id: { startsWith: 'ed-VID-', notIn: Array.from(validEdIds) } }
        ]
      }
    });

    const finalCount = await p.videoLibrary.count({
      where: { id: { in: Array.from(validVidIds) } }
    });

    console.log(`[SyncTracker] Synchronization complete! ${finalCount} topic records active.`);
    return {
      success: true,
      synced: true,
      count: finalCount
    };
  } catch (error: any) {
    console.error('[SyncTracker] Error during sync:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
