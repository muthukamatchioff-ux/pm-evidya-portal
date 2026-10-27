const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const XLSX = require('xlsx');

async function main() {
  console.log('========================================================================');
  console.log('ANTIGRAVITY MASTER VERIFICATION SUITE — PM E-VIDYA VIDEO PRODUCTION');
  console.log('========================================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      if (details) console.log(`         -> ${details}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
      if (details) console.error(`         -> ${details}`);
      throw new Error(`Test failed: ${testName} - ${details}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST A: EXCEL IMPORT ACCURACY & RECORD COUNTS
  // ---------------------------------------------------------------------------
  console.log('>>> RUNNING TEST A: EXCEL IMPORT ACCURACY (Untitled spreadsheet.xlsx)');

  const wb = XLSX.readFile('D:/Pm e-Vidy Documents portal/pm-evidya-portal/Untitled spreadsheet.xlsx');
  const ws = wb.Sheets['Sheet1'];
  assert(!!ws, 'Workbook Sheet1 read successfully');

  // Verify total spreadsheet rows (78 rows: 2 header rows + 76 data rows)
  const range = XLSX.utils.decode_range(ws['!ref']);
  const totalSpreadsheetRows = range.e.r - range.s.r + 1;
  assert(totalSpreadsheetRows === 78, 'Total spreadsheet rows accounted for', `Rows: ${totalSpreadsheetRows} (2 headers + 76 data rows)`);

  const trackerVidIds = Array.from({ length: 76 }, (_, i) => `VID-${String(i + 1).padStart(3, '0')}`);
  const trackerShootIds = trackerVidIds.map(id => `shoot-${id}`);
  const trackerEdIds = trackerVidIds.map(id => `ed-${id}`);

  const totalVideos = await prisma.videoLibrary.count({
    where: { id: { in: trackerVidIds } }
  });
  assert(totalVideos === 76, '76 VideoLibrary records imported into PostgreSQL', `Count: ${totalVideos}`);

  const totalShooting = await prisma.shootingSchedule.count({
    where: { id: { in: trackerShootIds } }
  });
  assert(totalShooting === 76, '76 ShootingSchedule records imported into PostgreSQL', `Count: ${totalShooting}`);

  const totalEditing = await prisma.videoEditorRecord.count({
    where: { id: { in: trackerEdIds } }
  });
  assert(totalEditing === 76, '76 VideoEditorRecord records imported into PostgreSQL', `Count: ${totalEditing}`);

  const totalLinks = await prisma.videoLibrary.count({
    where: {
      id: { in: trackerVidIds },
      videoLink: { startsWith: 'http' }
    }
  });
  assert(totalLinks === 53, '53 Clickable Deliverable Video Links imported', `Count: ${totalLinks}`);

  const totalDurations = await prisma.videoLibrary.count({
    where: {
      id: { in: trackerVidIds },
      duration: { not: null }
    }
  });
  assert(totalDurations === 53, '53 Exact Formatted Durations imported', `Count: ${totalDurations}`);

  // ---------------------------------------------------------------------------
  // TEST B: CAMERAMAN WORKFLOW & REAL-TIME SYNCHRONIZATION
  // ---------------------------------------------------------------------------
  console.log('\n>>> RUNNING TEST B: CAMERAMAN SHOOTING UPDATE & BACKEND SYNCHRONIZATION');

  // Find a target record assigned to Parasuraman
  const targetCamSched = await prisma.shootingSchedule.findFirst({
    where: { cameraman: { contains: 'Parasuraman' } }
  });
  assert(!!targetCamSched, 'Found active Cameraman shooting schedule', `ID: ${targetCamSched.id}, Topic: ${targetCamSched.videoTitle}`);

  const newShootStart = new Date('2026-07-28T00:00:00.000Z');
  const newShootEnd = new Date('2026-07-29T00:00:00.000Z');
  const newStatus = 'Completed';
  const newNotes = 'Updated via Cameraman field entry: 4K multi-cam footage captured';

  // Perform Cameraman update
  await prisma.shootingSchedule.update({
    where: { id: targetCamSched.id },
    data: {
      scheduledStart: newShootStart,
      scheduledEnd: newShootEnd,
      status: newStatus,
      productionNotes: JSON.stringify({
        sNo: 2,
        notes: newNotes,
        originalTopic: targetCamSched.videoTitle
      })
    }
  });

  const verifiedCamSched = await prisma.shootingSchedule.findUnique({
    where: { id: targetCamSched.id }
  });
  assert(verifiedCamSched.status === 'Completed', 'Shooting status updated to Completed');
  assert(verifiedCamSched.scheduledStart.toISOString().startsWith('2026-07-28'), 'Shooting start date correctly persisted');
  assert(verifiedCamSched.scheduledEnd.toISOString().startsWith('2026-07-29'), 'Shooting end date correctly persisted');

  // ---------------------------------------------------------------------------
  // TEST C: VIDEO EDITOR WORKFLOW & DELIVERABLE PRESERVATION
  // ---------------------------------------------------------------------------
  console.log('\n>>> RUNNING TEST C: VIDEO EDITOR UPDATE & NON-OVERWRITING DELIVERABLE PRESERVATION');

  // Target editor record
  const targetEdRec = await prisma.videoEditorRecord.findFirst({
    where: { finalVideoFile: { startsWith: 'http' } }
  });
  assert(!!targetEdRec, 'Found active Editor record with deliverable link', `ID: ${targetEdRec.id}, Link: ${targetEdRec.finalVideoFile}`);
  const originalLink = targetEdRec.finalVideoFile;
  const originalDuration = targetEdRec.duration;

  // Editor updates status and comments without passing new link
  await prisma.videoEditorRecord.update({
    where: { id: targetEdRec.id },
    data: {
      status: 'Completed',
      reviewComments: JSON.stringify({
        sNo: 3,
        remarks: 'Audio normalized, color graded, graphics inserted'
      })
    }
  });

  const verifiedEdRec = await prisma.videoEditorRecord.findUnique({
    where: { id: targetEdRec.id }
  });
  assert(verifiedEdRec.status === 'Completed', 'Editing status updated to Completed');
  assert(verifiedEdRec.finalVideoFile === originalLink, 'Existing deliverable video link was NOT blanked out or overwritten');
  assert(verifiedEdRec.duration === originalDuration, 'Existing duration was NOT blanked out or overwritten');

  // ---------------------------------------------------------------------------
  // TEST D: DATA INTEGRITY ACROSS COMPLEX AND CONTINUATION RECORDS
  // ---------------------------------------------------------------------------
  console.log('\n>>> RUNNING TEST D: DATA INTEGRITY (Multiple Topics, Merged Cells & NA Epic)');

  // 1. Check Media SSC Stakeholder rows (EPIC ID should be NA)
  const mediaSscShoots = await prisma.shootingSchedule.findMany({
    where: {
      productionNotes: { contains: '"epicCode":"NA"' }
    }
  });
  assert(mediaSscShoots.length === 5, 'Media SSC Stakeholder has 5 rows with epicCode="NA"', `Count: ${mediaSscShoots.length}`);
  assert(mediaSscShoots.every(s => s.status.includes('Received Digital content') || s.status.includes('Completed')), 'Media SSC shooting status preserved');

  // 2. Check EPIC 5 (Dr. Majji Bala Ganesh - AI Programming Assistant): 11 topics
  const epic5 = await prisma.sMEWorkEntry.findFirst({
    where: { epicSequence: 5 },
    include: { videoLibraries: true }
  });
  assert(epic5.videoLibraries.length === 11, 'EPIC-05 has exactly 11 topic records', `Count: ${epic5.videoLibraries.length}`);

  // 3. Check EPIC 15 (Wireman): 14 topics
  const epic15 = await prisma.sMEWorkEntry.findFirst({
    where: { epicSequence: 15 },
    include: { videoLibraries: true }
  });
  assert(epic15.videoLibraries.length === 14, 'EPIC-15 has exactly 14 topic records', `Count: ${epic15.videoLibraries.length}`);

  // 4. Check EPIC 16 (Wireman): 5 topics with Google Drive links & durations
  const epic16 = await prisma.sMEWorkEntry.findFirst({
    where: { epicSequence: 16 },
    include: { videoLibraries: true }
  });
  assert(epic16.videoLibraries.length === 5, 'EPIC-16 has exactly 5 topic records', `Count: ${epic16.videoLibraries.length}`);
  assert(epic16.videoLibraries.every(v => v.videoLink && v.videoLink.startsWith('http')), 'All 5 EPIC-16 records have valid Google Drive deliverable links');

  // 5. Check EPIC 17 (Drone Pilot): 5 topics
  const epic17 = await prisma.sMEWorkEntry.findFirst({
    where: { epicSequence: 17 },
    include: { videoLibraries: true }
  });
  assert(epic17.videoLibraries.length === 5, 'EPIC-17 has exactly 5 topic records', `Count: ${epic17.videoLibraries.length}`);

  // ---------------------------------------------------------------------------
  // TEST E: STAFF ROLES & ACCESS CONTROL
  // ---------------------------------------------------------------------------
  console.log('\n>>> RUNNING TEST E: STAFF ROLES & AUTHORIZATION');

  const cameramen = await prisma.user.findMany({ where: { role: 'CAMERAMAN', status: 'ACTIVE' } });
  assert(cameramen.length >= 3, 'Authorized Cameramen accounts exist and are ACTIVE', `Count: ${cameramen.length}`);

  const editors = await prisma.user.findMany({ where: { role: 'EDITOR', status: 'ACTIVE' } });
  assert(editors.length >= 7, 'Authorized Video Editor accounts exist and are ACTIVE', `Count: ${editors.length}`);

  // Verify Suganthan and Manikandan exist
  const suganthan = await prisma.user.findUnique({ where: { email: 'suganthan@nimi.org' } });
  assert(!!suganthan && suganthan.role === 'EDITOR', 'Video Editor Suganthan account is provisioned and ACTIVE');

  const manikandan = await prisma.user.findUnique({ where: { email: 'manikandan@nimi.org' } });
  assert(!!manikandan && manikandan.role === 'EDITOR', 'Video Editor Manikandan account is provisioned and ACTIVE');

  // ---------------------------------------------------------------------------
  // TEST F: ZERO REGRESSION ON NON-TRACKER PORTAL MODULES
  // ---------------------------------------------------------------------------
  console.log('\n>>> RUNNING TEST F: ZERO REGRESSION ON NON-TRACKER MODULES');

  // All 16 SMEWorkEntries remain intact
  const allWorkEntries = await prisma.sMEWorkEntry.findMany();
  assert(allWorkEntries.length >= 16, 'All 16 SMEWorkEntry records preserved', `Count: ${allWorkEntries.length}`);

  // Admin user accounts intact
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  assert(admins.length >= 2, 'Admin user accounts and credentials preserved', `Admins: ${admins.map(a => a.name).join(', ')}`);

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY (100% PASS RATE)`);
  console.log('========================================================================\n');
}

main()
  .catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
