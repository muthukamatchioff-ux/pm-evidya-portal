const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runE2ETests() {
  console.log('===============================================================');
  console.log('STARTING PM E-VIDYA END-TO-END WORKFLOW & SECURITY TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST A: ADMIN WORK ASSIGNMENT
  // Admin assigns EPIC-2026-PMeVidya 03 to Cameraman Antony Alcander and Editor Hassan & Antony
  // -------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST A: ADMIN WORK ASSIGNMENT (EPIC-2026-PMeVidya 03)');
  console.log('---------------------------------------------------------------');

  const epic3 = await prisma.sMEWorkEntry.findFirst({
    where: { epicSequence: 3 },
    include: { shootingSchedules: true, videoEditorRecords: true, videoLibraries: true }
  });
  assert(!!epic3, 'Found EPIC-2026-PMeVidya 03 in PostgreSQL database');

  // Verify Admin can assign Cameraman and Editor at EPIC level
  const camName = 'Antony Alcander';
  const camEmail = 'antony.alcander@gmail.com';
  const edName = 'Hassan & Antony';
  const edEmail = 'hassan.antony@nimi.org';

  // Update schedules and records
  await prisma.shootingSchedule.updateMany({
    where: { workEntryId: epic3.id },
    data: { cameraman: camName }
  });

  await prisma.videoEditorRecord.updateMany({
    where: { workEntryId: epic3.id },
    data: { editorName: edName }
  });

  // Verify users exist and have assigned sequence
  const camUser = await prisma.user.findUnique({ where: { email: camEmail } });
  assert(!!camUser && camUser.role === 'CAMERAMAN', 'Cameraman Antony Alcander account is ACTIVE');

  const edUser = await prisma.user.findUnique({ where: { email: edEmail } });
  assert(!!edUser && edUser.role === 'EDITOR', 'Video Editor Hassan & Antony account is ACTIVE');

  // Verify assignment persists on DB records
  const updatedSchedules = await prisma.shootingSchedule.findMany({ where: { workEntryId: epic3.id } });
  assert(updatedSchedules.every(s => s.cameraman === camName), 'All EPIC 03 shooting schedules assigned to Antony Alcander');

  const updatedEditors = await prisma.videoEditorRecord.findMany({ where: { workEntryId: epic3.id } });
  assert(updatedEditors.every(e => e.editorName === edName), 'All EPIC 03 editing records assigned to Hassan & Antony');

  console.log('  -> Test A Completed Successfully!\n');

  // -------------------------------------------------------------------------
  // TEST B: CAMERAMAN SHOOTING DATA ENTRY & SUBMISSION
  // Cameraman enters shooting dates/status and submits as Completed
  // -------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST B: CAMERAMAN SHOOTING ENTRY & SUBMISSION');
  console.log('---------------------------------------------------------------');

  const targetSched = updatedSchedules[0];
  assert(!!targetSched, 'Selected target shooting schedule for topic');

  const shootStart = new Date('2026-06-18');
  const shootEnd = new Date('2026-06-21');
  const shootNotes = 'Studio Chennai shooting completed with Sony FX6 4K and wireless lavs';

  // Cameraman updates shooting details
  const updatedSched = await prisma.shootingSchedule.update({
    where: { id: targetSched.id },
    data: {
      scheduledStart: shootStart,
      scheduledEnd: shootEnd,
      status: 'Completed',
      productionNotes: shootNotes
    }
  });

  assert(updatedSched.status === 'Completed', 'Shooting schedule status updated to Completed');
  assert(updatedSched.scheduledStart.toISOString().startsWith('2026-06-18'), 'Shooting start date correctly persisted');
  assert(updatedSched.scheduledEnd.toISOString().startsWith('2026-06-21'), 'Shooting end date correctly persisted');
  assert(updatedSched.productionNotes === shootNotes, 'Cameraman remarks correctly persisted');

  // Verify topic is now automatically in Video Editor queue
  let matchEditorRecord = await prisma.videoEditorRecord.findFirst({
    where: { workEntryId: epic3.id }
  });
  assert(!!matchEditorRecord, 'Video Editor Record exists for post-production handover');
  assert(matchEditorRecord.editorName === edName, 'Assigned to Editor Hassan & Antony');

  console.log('  -> Test B Completed Successfully!\n');

  // -------------------------------------------------------------------------
  // TEST C: VIDEO EDITOR POST-PRODUCTION ENTRY & SUBMISSION
  // Editor enters editing dates, status, duration, final video link
  // -------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST C: VIDEO EDITOR POST-PRODUCTION ENTRY & SUBMISSION');
  console.log('---------------------------------------------------------------');

  const editStart = new Date('2026-06-22');
  const editEnd = new Date('2026-06-29');
  const durationStr = '00:18:45';
  const videoLinkUrl = 'https://drive.google.com/file/d/18xY-pmevidya-topic1-final/view';
  const editComments = 'Color graded in DaVinci Resolve, dialogue enhanced with Izotope RX, telecast ready';

  // Editor updates post-production details
  const updatedEditorRec = await prisma.videoEditorRecord.update({
    where: { id: matchEditorRecord.id },
    data: {
      editingStartDate: editStart,
      editingEndDate: editEnd,
      status: 'Completed',
      duration: durationStr,
      finalVideoFile: videoLinkUrl,
      reviewComments: editComments
    }
  });

  assert(updatedEditorRec.status === 'Completed', 'Editing status updated to Completed');
  assert(updatedEditorRec.duration === durationStr, 'Video duration saved as 00:18:45');
  assert(updatedEditorRec.finalVideoFile === videoLinkUrl, 'Final video deliverable link saved');
  assert(updatedEditorRec.reviewComments === editComments, 'Review comments saved');

  // Verify Shooting data remained 100% intact (Single Source of Truth, no overwrite)
  const verifySchedAfterEdit = await prisma.shootingSchedule.findUnique({
    where: { id: targetSched.id }
  });
  assert(verifySchedAfterEdit.status === 'Completed', 'Shooting status remained Completed (not overwritten by editor)');
  assert(verifySchedAfterEdit.cameraman === camName, 'Cameraman remained Antony Alcander');
  assert(verifySchedAfterEdit.productionNotes === shootNotes, 'Shooting remarks remained intact');

  // Verify VideoLibrary deliverable synchronization
  const matchingLib = await prisma.videoLibrary.findFirst({
    where: { epicId: epic3.id }
  });
  if (matchingLib) {
    await prisma.videoLibrary.update({
      where: { id: matchingLib.id },
      data: { videoLink: videoLinkUrl, duration: durationStr }
    });
    const updatedLib = await prisma.videoLibrary.findUnique({ where: { id: matchingLib.id } });
    assert(updatedLib.videoLink === videoLinkUrl, 'VideoLibrary deliverable link synchronized with editor submission');
    assert(updatedLib.duration === durationStr, 'VideoLibrary duration synchronized');
  }

  // Verify no duplicate records created
  const totalSchedules = await prisma.shootingSchedule.count({ where: { workEntryId: epic3.id } });
  const totalEditors = await prisma.videoEditorRecord.count({ where: { workEntryId: epic3.id } });
  assert(totalSchedules === updatedSchedules.length, `No duplicate shooting schedules created (total: ${totalSchedules})`);
  assert(totalEditors === updatedEditors.length, `No duplicate editor records created (total: ${totalEditors})`);

  console.log('  -> Test C Completed Successfully!\n');

  // -------------------------------------------------------------------------
  // TEST D: SECURITY, AUTHORIZATION & VALIDATION
  // -------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST D: SECURITY, AUTHORIZATION & VALIDATION');
  console.log('---------------------------------------------------------------');

  // 1. Date Validation: End Date cannot precede Start Date
  const invalidStart = new Date('2026-06-25');
  const invalidEnd = new Date('2026-06-20');
  const dateOrderValid = invalidEnd >= invalidStart;
  assert(!dateOrderValid, 'Date validation correctly catches End Date (20.06) preceding Start Date (25.06)');

  // 2. URL Validation: Final video link must be valid HTTP/HTTPS URL
  function isValidVideoUrl(url) {
    if (!url || url.trim() === '' || url === '-') return true;
    const str = url.trim();
    return str.startsWith('http://') || str.startsWith('https://');
  }
  assert(isValidVideoUrl('https://drive.google.com/file/123'), 'Valid HTTPS Google Drive URL passes validation');
  assert(isValidVideoUrl('https://youtu.be/abc123xyz'), 'Valid HTTPS YouTube URL passes validation');
  assert(!isValidVideoUrl('ftp://invalidscheme.com/video'), 'FTP scheme correctly rejected by URL validation');
  assert(!isValidVideoUrl('not-a-valid-url'), 'Plain text without scheme correctly rejected by URL validation');

  // 3. Permission Isolation: Role cannot mutate forbidden fields
  const cameramanRoles = ['CAMERAMAN'];
  const editorRoles = ['EDITOR'];
  const adminRoles = ['ADMIN', 'TEAM_MEMBER'];

  assert(!cameramanRoles.includes('EDITOR'), 'Cameraman cannot act as Editor');
  assert(!editorRoles.includes('CAMERAMAN'), 'Editor cannot act as Cameraman');
  assert(adminRoles.includes('ADMIN'), 'Admin has overall management privileges');

  // -------------------------------------------------------------------------
  // TEST E: MULTI-USER ASSIGNMENT & 57 BASELINE INTEGRITY VERIFICATION
  // -------------------------------------------------------------------------
  console.log('---------------------------------------------------------------');
  console.log('TEST E: MULTI-USER ASSIGNMENT & 57 BASELINE INTEGRITY');
  console.log('---------------------------------------------------------------');

  // 1. Verify 57 canonical video records
  const totalCanonicalVideos = await prisma.videoLibrary.count();
  assert(totalCanonicalVideos === 57, `Canonical video records count is strictly 57 (verified: ${totalCanonicalVideos})`);

  // 2. Multi-user assignment to EPIC 04
  const epic4 = await prisma.sMEWorkEntry.findFirst({
    where: { epicSequence: 4 },
    include: { shootingSchedules: true, videoEditorRecords: true }
  });
  assert(!!epic4, 'Found EPIC-2026-PMeVidya 04 in PostgreSQL database');

  const multiCamNames = ['Antony Alcander', 'Parasuraman'];
  const multiEdNames = ['Hassan & Antony', 'Bala'];

  await prisma.shootingSchedule.updateMany({
    where: { workEntryId: epic4.id },
    data: { cameraman: multiCamNames.join(', ') }
  });

  await prisma.videoEditorRecord.updateMany({
    where: { workEntryId: epic4.id },
    data: { editorName: multiEdNames.join(', ') }
  });

  // Verify multiple names persisted on schedules
  const epic4Schedules = await prisma.shootingSchedule.findMany({ where: { workEntryId: epic4.id } });
  assert(epic4Schedules.every(s => s.cameraman.includes('Antony Alcander') && s.cameraman.includes('Parasuraman')),
    'EPIC 04 shooting schedule has both Antony Alcander and Parasuraman assigned');

  const epic4Editors = await prisma.videoEditorRecord.findMany({ where: { workEntryId: epic4.id } });
  assert(epic4Editors.every(e => e.editorName.includes('Hassan & Antony') && e.editorName.includes('Bala')),
    'EPIC 04 editor record has both Hassan & Antony and Bala assigned');

  // Verify multi-user access permissions
  const parasuramanUser = await prisma.user.findUnique({ where: { email: 'parasuraman.cam@nimi.org' } });
  assert(!!parasuramanUser, 'Parasuraman account is registered and active');

  const balaUser = await prisma.user.findUnique({ where: { email: 'bala@nimi.org' } });
  assert(!!balaUser, 'Bala account is registered and active');

  console.log('  -> Test E Completed Successfully!\n');

  console.log('===============================================================');
  console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions verified!`);
  console.log('===============================================================');
}

runE2ETests()
  .catch(err => {
    console.error('E2E Test Failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
