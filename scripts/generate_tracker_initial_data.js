const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('Untitled spreadsheet.xlsx');
const ws = wb.Sheets['Sheet1'];

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

function parseDateISO(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const utcDays = Math.floor(val - 25569);
    return new Date(utcDays * 86400 * 1000).toISOString();
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
      return new Date(Date.UTC(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10))).toISOString();
    }
    const ymd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymd) {
      return new Date(Date.UTC(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10))).toISOString();
    }
  }
  return null;
}

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

  const rowIdx = r - 1;

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
    shootStartDate: parseDateISO(shootStart),
    shootEndDate: parseDateISO(shootEnd),
    cameraman: cleanVal(cameraman),
    shootStatus: cleanVal(shootStatus) || 'Completed',
    editorName: cleanVal(editor),
    editStartDate: parseDateISO(editStart),
    editEndDate: parseDateISO(editEnd),
    editStatus: cleanVal(editStatus) || 'Pending',
    duration: parseDuration(duration),
    videoLink: cleanVal(videoLink)
  });
}

const fileContent = `export interface TrackerSourceRecord {
  rowNumber: number;
  excelRow: number;
  monthSNo: number;
  sNo: number;
  month: string;
  epicCode: string;
  epicSeq: number;
  smeName: string;
  trade: string;
  videoTopic: string;
  shootStartDate: string | null;
  shootEndDate: string | null;
  cameraman: string | null;
  shootStatus: string;
  editorName: string | null;
  editStartDate: string | null;
  editEndDate: string | null;
  editStatus: string;
  duration: string | null;
  videoLink: string | null;
}

export const TRACKER_SOURCE_RECORDS: TrackerSourceRecord[] = ${JSON.stringify(parsedRows, null, 2)};
`;

fs.writeFileSync('src/lib/trackerInitialData.ts', fileContent, 'utf8');
console.log(`Generated src/lib/trackerInitialData.ts with ${parsedRows.length} records.`);
