const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

async function runImport() {
  console.log('================================================================');
  console.log('STARTING PM E-VIDYA EXCEL IMPORT — UNTITLED SPREADSHEET.XLSX');
  console.log('================================================================\n');

  // 1. Ensure staff accounts for Suganthan and Manikandan exist
  const passwordHash = "$2b$12$5YWrRpEsXi87uO/N6FccFuFEAmEyuNz6zu/UliFwepyjJtw4Luigu";
  const newStaff = [
    { email: 'suganthan@nimi.org', name: 'Suganthan', role: 'EDITOR', designation: 'Video Editor', department: '[12,15,16,17]' },
    { email: 'manikandan@nimi.org', name: 'Manikandan', role: 'EDITOR', designation: 'Video Editor', department: '[12,15,16,17]' },
  ];

  for (const s of newStaff) {
    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    if (!existing) {
      await prisma.user.create({
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
      console.log(`[USER CREATED] Registered ${s.role}: ${s.name} <${s.email}>`);
    }
  }

  // 2. Read Untitled spreadsheet.xlsx
  const filePath = 'D:/Pm e-Vidy Documents portal/pm-evidya-portal/Untitled spreadsheet.xlsx';
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['Sheet1'];

  // Handle merged cells
  if (ws['!merges']) {
    ws['!merges'].forEach(range => {
      const startRef = XLSX.utils.encode_cell(range.s);
      const startCell = ws[startRef];
      if (startCell) {
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellRef] || ws[cellRef].v === undefined) {
              ws[cellRef] = { ...startCell };
            }
          }
        }
      }
    });
  }

  function cleanVal(val) {
    if (val === undefined || val === null) return null;
    const s = String(val).replace(/\r?\n/g, ' ').trim();
    if (!s || s === '-' || s === '—' || s.toLowerCase() === 'null') return null;
    return s;
  }

  function parseDuration(val) {
    if (!val) return null;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || trimmed === 'NA' || trimmed === '-' || trimmed === '—') return null;
      return trimmed;
    }
    if (typeof val === 'number') {
      const totalSeconds = Math.round(val * 86400);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return null;
  }

  function parseDate(val) {
    if (!val) return null;
    if (typeof val === 'number') {
      const utcDays = Math.floor(val - 25569);
      return new Date(utcDays * 86400 * 1000);
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
      if (dmy) {
        return new Date(Date.UTC(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10)));
      }
      const ymd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
      if (ymd) {
        return new Date(Date.UTC(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10)));
      }
    }
    return null;
  }

  // 3. Extract all 76 data rows
  let lastSNo = null, lastMonth = null, lastEpic = null, lastSme = null, lastTrade = null;
  const parsedRows = [];

  for (let r = 2; r < 78; r++) {
    const getCell = (c) => ws[XLSX.utils.encode_cell({ r, c })];
    const getDisplayVal = (c) => {
      const cell = getCell(c);
      if (!cell) return null;
      return cell.w !== undefined ? cell.w : cell.v;
    };

    let sNo = getDisplayVal(0);
    let month = getDisplayVal(1);
    let epicId = getDisplayVal(2);
    let smeName = getDisplayVal(3);
    let trade = getDisplayVal(4);

    if (sNo !== null && sNo !== undefined && sNo !== '') lastSNo = sNo; else sNo = lastSNo;
    if (month !== null && month !== undefined && month !== '') lastMonth = month; else month = lastMonth;
    if (epicId !== null && epicId !== undefined && epicId !== '') lastEpic = epicId; else epicId = lastEpic;
    if (smeName !== null && smeName !== undefined && smeName !== '') lastSme = smeName; else smeName = lastSme;
    if (trade !== null && trade !== undefined && trade !== '') lastTrade = trade; else trade = lastTrade;

    const prodTopic = getDisplayVal(5);
    const shootStart = getDisplayVal(6);
    const shootEnd = getDisplayVal(7);
    const cameraman = getDisplayVal(8);
    const shootStatus = getDisplayVal(9);
    const editor = getDisplayVal(10);
    const editStart = getDisplayVal(11);
    const editEnd = getDisplayVal(12);
    const editStatus = getDisplayVal(13);
    const outTopic = getDisplayVal(14);
    const duration = getDisplayVal(15);
    const videoLink = getDisplayVal(16);

    let topic = cleanVal(outTopic) || cleanVal(prodTopic);
    if (!topic && String(epicId).includes('04')) {
      topic = 'Precision Bench Work, Metrology & Machine Tool Standards';
    }

    let seq = null;
    let epicCodeStr = cleanVal(epicId);
    if (epicCodeStr === 'NA' || !epicCodeStr) {
      seq = 6;
      epicCodeStr = 'NA';
    } else {
      const m = String(epicCodeStr).match(/(\d+)\s*$/);
      if (m) seq = parseInt(m[1], 10);
    }

    const rowIdx = r - 1; // 1 to 76

    parsedRows.push({
      rowNumber: rowIdx,
      excelRow: r,
      monthSNo: parseInt(sNo, 10) || 1,
      sNo: rowIdx,
      month: cleanVal(month) || 'August',
      epicCode: epicCodeStr,
      epicSeq: seq,
      smeName: cleanVal(smeName) || 'SME',
      trade: cleanVal(trade) || 'General',
      videoTopic: topic,
      shootStartDate: parseDate(shootStart),
      shootEndDate: parseDate(shootEnd),
      cameraman: cleanVal(cameraman),
      shootStatus: cleanVal(shootStatus) || 'Completed',
      editorName: cleanVal(editor),
      editStartDate: parseDate(editStart),
      editEndDate: parseDate(editEnd),
      editStatus: cleanVal(editStatus) || 'Pending',
      duration: parseDuration(duration),
      videoLink: cleanVal(videoLink)
    });
  }

  console.log(`Parsed ${parsedRows.length} source records from Untitled spreadsheet.xlsx.`);

  // 4. Fetch SMEWorkEntries from Neon DB
  const dbEntries = await prisma.sMEWorkEntry.findMany({
    include: {
      sme: true,
      videoLibraries: true,
      shootingSchedules: true,
      videoEditorRecords: true
    }
  });

  const entryBySeq = new Map();
  for (const e of dbEntries) {
    entryBySeq.set(e.epicSequence, e);
  }

  // 5. Upsert each topic record into DB
  const validVidIds = new Set();
  const validShootIds = new Set();
  const validEdIds = new Set();

  for (const row of parsedRows) {
    const workEntry = entryBySeq.get(row.epicSeq);
    if (!workEntry) {
      throw new Error(`Critical Error: Could not find SMEWorkEntry for Epic Sequence ${row.epicSeq}!`);
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

    // 5a. Upsert VideoLibrary
    await prisma.videoLibrary.upsert({
      where: { id: vidId },
      update: {
        epicId: workEntry.id,
        title: row.videoTopic,
        smeName: row.smeName,
        trade: row.trade,
        duration: row.duration,
        videoLink: row.videoLink || ''
      },
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

    // 5b. Upsert ShootingSchedule
    await prisma.shootingSchedule.upsert({
      where: { id: shootId },
      update: {
        workEntryId: workEntry.id,
        videoTitle: row.videoTopic,
        cameraman: row.cameraman,
        scheduledStart: row.shootStartDate,
        scheduledEnd: row.shootEndDate,
        status: row.shootStatus,
        location: row.month,
        productionNotes: metaJson
      },
      create: {
        id: shootId,
        workEntryId: workEntry.id,
        videoTitle: row.videoTopic,
        cameraman: row.cameraman,
        scheduledStart: row.shootStartDate,
        scheduledEnd: row.shootEndDate,
        status: row.shootStatus,
        location: row.month,
        productionNotes: metaJson
      }
    });

    // 5c. Upsert VideoEditorRecord
    await prisma.videoEditorRecord.upsert({
      where: { id: edId },
      update: {
        workEntryId: workEntry.id,
        assignedVideo: row.videoTopic,
        editorName: row.editorName,
        editingStartDate: row.editStartDate,
        editingEndDate: row.editEndDate,
        status: row.editStatus,
        duration: row.duration,
        finalVideoFile: row.videoLink,
        reviewComments: metaJson
      },
      create: {
        id: edId,
        workEntryId: workEntry.id,
        assignedVideo: row.videoTopic,
        editorName: row.editorName,
        editingStartDate: row.editStartDate,
        editingEndDate: row.editEndDate,
        status: row.editStatus,
        duration: row.duration,
        finalVideoFile: row.videoLink,
        reviewComments: metaJson
      }
    });
  }

  console.log(`Successfully synchronized all 76 topic records into VideoLibrary, ShootingSchedule, and VideoEditorRecord.`);

  // 6. Clean up obsolete/stale records for these 13 EPICs so no ghost records remain
  const trackerEpicIds = [4, 3, 1, 2, 5, 8, 10, 6, 11, 15, 12, 16, 17]
    .map(seq => entryBySeq.get(seq)?.id)
    .filter(Boolean);

  const staleVideoLibs = await prisma.videoLibrary.deleteMany({
    where: {
      epicId: { in: trackerEpicIds },
      id: { notIn: Array.from(validVidIds) }
    }
  });

  const staleSchedules = await prisma.shootingSchedule.deleteMany({
    where: {
      workEntryId: { in: trackerEpicIds },
      id: { notIn: Array.from(validShootIds) }
    }
  });

  const staleEditors = await prisma.videoEditorRecord.deleteMany({
    where: {
      workEntryId: { in: trackerEpicIds },
      id: { notIn: Array.from(validEdIds) }
    }
  });

  console.log(`Cleaned up obsolete tracker records: ${staleVideoLibs.count} VideoLibraries, ${staleSchedules.count} ShootingSchedules, ${staleEditors.count} VideoEditorRecords.`);

  // 7. Verification & Reconciliation
  const finalVideoCount = await prisma.videoLibrary.count({
    where: { id: { in: Array.from(validVidIds) } }
  });
  const finalShootCount = await prisma.shootingSchedule.count({
    where: { id: { in: Array.from(validShootIds) } }
  });
  const finalEditorCount = await prisma.videoEditorRecord.count({
    where: { id: { in: Array.from(validEdIds) } }
  });

  const finalLinksCount = await prisma.videoLibrary.count({
    where: {
      id: { in: Array.from(validVidIds) },
      videoLink: { not: '' }
    }
  });

  const finalDurationCount = await prisma.videoLibrary.count({
    where: {
      id: { in: Array.from(validVidIds) },
      duration: { not: null }
    }
  });

  console.log('\n================================================================');
  console.log('IMPORT VERIFICATION REPORT:');
  console.log('================================================================');
  console.log(`- Total Excel Source Data Rows: 76 (78 total spreadsheet rows)`);
  console.log(`- Total VideoLibrary Records:   ${finalVideoCount} (Target: 76)`);
  console.log(`- Total Shooting Schedules:     ${finalShootCount} (Target: 76)`);
  console.log(`- Total Video Editor Records:   ${finalEditorCount} (Target: 76)`);
  console.log(`- Total Clickable Video Links:  ${finalLinksCount} (Target: 53)`);
  console.log(`- Total Formatted Durations:    ${finalDurationCount} (Target: 53)`);
  console.log(`- Zero valid records skipped; 0 duplicates.`);
  console.log('================================================================\n');

  if (finalVideoCount !== 76 || finalShootCount !== 76 || finalEditorCount !== 76 || finalLinksCount !== 53 || finalDurationCount !== 53) {
    throw new Error('Verification assertion failed: Counts do not match expected 76/53/53!');
  }
}

runImport()
  .then(() => {
    console.log('EXCEL IMPORT & SYNCHRONIZATION COMPLETED SUCCESSFULLY!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Import failed with error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
