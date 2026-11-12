/**
 * Canonical Video Duration Catalogue & Deterministic Matching/Month Utilities.
 * Shared across Content Library, Video Production Tracker, Monthly Expenditure, and NCERT Report.
 */

export const KNOWN_VIDEO_DURATIONS: Record<string, string> = {
  'copa - javascript: the language of the web': '1:47:43',
  'communication for online training': '1:02:43',
  "dale's cone of experience": '0:07:59',
  'roles of audio - visual aids': '0:29:02',
  'transactional analysis': '0:34:01',
  '50 questions for drone technician': '1:09:27',
  'cutting speed & rpm speed': '0:34:23',
  'face milling programming': '0:27:59',
  'peck drilling cycle on vmc': '0:25:55',
  '50 questions for ai programming assistant': '0:50:20',
  'ai (artificial intelligence program assistant)': '0:34:49',
  'ai tools (artificial intelligence)': '0:26:06',
  'introduction of ai (program assistant - computer components)': '0:12:38',
  'machine learning': '0:30:00',
  'introduction of computer vision in ai': '0:28:18',
  'introduction of drone technician': '0:32:47',
  'introduction to 3d printer & their designs': '0:23:20',
  'sensors used in drones': '0:14:09',
  'bldc motors & servo motors in drone': '0:25:45',
  'flight controller board & electronic speed controller in drone': '0:27:45',
  'scope and necessity of instrumentation': '0:21:55',
  'fundamentals of electricity': '0:18:58',
  'semiconductors and diodes': '0:26:21',
  'rectifiers & filters': '0:21:29',
  'pressure measurement': '0:28:47',
  'pressure measurement introduction': '0:40:11',
  'flow measurement': '0:36:55',
  'level measurement': '0:32:24',
  'temperature measurement': '0:21:59',
  'unit 2: self-management skills → session 3: self-confidence': '0:38:19',
  'unit 2: self-management skills -> session 3: self-confidence': '0:38:19',
  'unit 2: self-management skills → session 3: self-awareness': '0:20:49',
  'unit 2: self-management skills -> session 3: self-awareness': '0:20:49',
  'chapter 6: rasa adhyaya (rasa theory)': '0:15:03',
  'unit 1: understanding the language of the medium → chapter ii: aspects of film language': '0:16:34',
  'unit 1: understanding the language of the medium -> chapter ii: aspects of film language': '0:16:34',
  'chapter 6: rasa adhyaya — shanta rasa': '0:21:04',
  'chapter 6: rasa adhyaya - shanta rasa': '0:21:04',
};

// Precompute normalized exact map and descending-length list so specific titles
// (e.g. "pressure measurement introduction") always match before shorter substrings ("pressure measurement").
const NORMALIZED_KNOWN_ENTRIES = Object.entries(KNOWN_VIDEO_DURATIONS)
  .map(([k, v]) => [k.trim().toLowerCase().replace(/[\u2010-\u2015]/g, '-'), v] as const)
  .sort((a, b) => b[0].length - a[0].length);

const NORMALIZED_KNOWN_EXACT = new Map<string, string>(NORMALIZED_KNOWN_ENTRIES);

const FY_MONTH_KEYWORDS: Array<{ keywords: string[]; label: string }> = [
  { keywords: ['april', 'apr'], label: 'Apr 2026' },
  { keywords: ['may'], label: 'May 2026' },
  { keywords: ['june', 'jun'], label: 'Jun 2026' },
  { keywords: ['july', 'jul'], label: 'Jul 2026' },
  { keywords: ['august', 'aug'], label: 'Aug 2026' },
  { keywords: ['september', 'sept', 'sep'], label: 'Sep 2026' },
  { keywords: ['october', 'oct'], label: 'Oct 2026' },
  { keywords: ['november', 'nov'], label: 'Nov 2026' },
  { keywords: ['december', 'dec'], label: 'Dec 2026' },
  { keywords: ['january', 'jan'], label: 'Jan 2027' },
  { keywords: ['february', 'feb'], label: 'Feb 2027' },
  { keywords: ['march', 'mar'], label: 'Mar 2027' },
];

const JS_MONTH_TO_FY_KEY = [
  'Jan 2027', 'Feb 2027', 'Mar 2027', 'Apr 2026', 'May 2026', 'Jun 2026',
  'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026',
];

export function normalizeVideoTitle(title: string | null | undefined): string {
  return (title || '').trim().toLowerCase().replace(/[\u2010-\u2015]/g, '-');
}

export function isHttpVideoLink(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

export function parseDurationToSeconds(dur: string | null | undefined): number {
  if (!dur || dur === 'null' || dur === '—' || dur === '-') return 0;
  const cleaned = dur.trim().replace(/\s*\(.*?\)\s*$/, '');
  const parts = cleaned.split(':').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && !parts.some(isNaN)) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function formatDurationSeconds(totalSeconds: number, padHours = true): string {
  if (!totalSeconds || totalSeconds <= 0) return padHours ? '00:00:00' : '0:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hStr = padHours ? String(hours).padStart(2, '0') : String(hours);
  return `${hStr}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function matchKnownVideoDuration(
  title?: string | null,
  videoLink?: string | null,
  catalog?: Array<{ title?: string | null; videoLink?: string | null; duration?: string | null }>
): string | null {
  const cleanLink = (videoLink || '').trim().toLowerCase();
  const normalizedTitle = normalizeVideoTitle(title);

  // 1. Exact URL match against authoritative catalog
  if (cleanLink && isHttpVideoLink(cleanLink) && catalog?.length) {
    const byUrl = catalog.find(
      (c) => (c.videoLink || '').trim().toLowerCase() === cleanLink && parseDurationToSeconds(c.duration) > 0
    );
    if (byUrl?.duration) return byUrl.duration;
  }

  // 2. Exact title match in KNOWN_VIDEO_DURATIONS
  if (normalizedTitle && NORMALIZED_KNOWN_EXACT.has(normalizedTitle)) {
    return NORMALIZED_KNOWN_EXACT.get(normalizedTitle)!;
  }

  // 3. Longest-key substring match in KNOWN_VIDEO_DURATIONS (only for meaningful non-empty titles)
  if (normalizedTitle.length >= 5) {
    for (const [normK, dur] of NORMALIZED_KNOWN_ENTRIES) {
      if (normalizedTitle.includes(normK) || (normalizedTitle.length >= 12 && normK.includes(normalizedTitle))) {
        return dur;
      }
    }
  }

  // 4. Exact title match in authoritative catalog
  if (normalizedTitle && catalog?.length) {
    const byTitle = catalog.find(
      (c) => normalizeVideoTitle(c.title) === normalizedTitle && parseDurationToSeconds(c.duration) > 0
    );
    if (byTitle?.duration) return byTitle.duration;
  }

  return null;
}

function matchMonthLabelFromText(raw: string | null | undefined): string {
  if (!raw) return '';
  const text = raw.trim().toLowerCase();
  if (text === 'may' || /\bmay[\s\-/]*(2026|26)\b/i.test(text)) {
    return 'May 2026';
  }
  for (const { keywords, label } of FY_MONTH_KEYWORDS) {
    if (label === 'May 2026') continue;
    if (keywords.some((kw) => new RegExp(`\\b${kw}\\b`, 'i').test(text))) {
      return label;
    }
  }
  return '';
}

function extractMonthFromMetadata(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.month === 'string') {
        const m = matchMonthLabelFromText(parsed.month);
        if (m) return m;
      }
      return '';
    } catch {
      // Malformed JSON falls through cleanly
    }
  }
  return matchMonthLabelFromText(trimmed);
}

export function resolveVideoMonth(sources: {
  reviewComments?: string | null;
  productionNotes?: string | null;
  location?: string | null;
  fallbackMonth?: string | null;
  dates?: Array<Date | string | null | undefined>;
}): string {
  const fromComments = extractMonthFromMetadata(sources.reviewComments);
  if (fromComments) return fromComments;

  const fromNotes = extractMonthFromMetadata(sources.productionNotes);
  if (fromNotes) return fromNotes;

  const fromLoc = matchMonthLabelFromText(sources.location);
  if (fromLoc) return fromLoc;

  if (sources.fallbackMonth) {
    const fromFallback = matchMonthLabelFromText(sources.fallbackMonth);
    if (fromFallback) return fromFallback;
    return sources.fallbackMonth;
  }

  for (const d of sources.dates || []) {
    if (!d) continue;
    const dt = d instanceof Date ? d : new Date(d);
    if (!isNaN(dt.getTime())) {
      return JS_MONTH_TO_FY_KEY[dt.getMonth()];
    }
  }

  return 'Sep 2026';
}

export function resolveRealVideoStatus(sources: {
  videoLink?: string | null;
  editorStatus?: string | null;
  shootStatus?: string | null;
  fallbackStatus?: string | null;
}): string {
  if (isHttpVideoLink(sources.videoLink)) {
    return 'PUBLISHED';
  }
  const sh = (sources.shootStatus || '').trim();
  if (sh.toLowerCase().includes('yet to shoot')) {
    return 'Yet to Shoot';
  }
  const ed = (sources.editorStatus || '').trim();
  if (ed) {
    if (ed.toUpperCase() === 'COMPLETED') {
      return 'Link Pending';
    }
    return ed;
  }
  if (sh && sh.toLowerCase() !== 'completed') {
    return sh;
  }
  const fb = (sources.fallbackStatus || '').trim();
  if (fb && fb.toUpperCase() !== 'COMPLETED') {
    return fb;
  }
  return 'Not Yet Started';
}
