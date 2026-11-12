import { BUNDLED_VIDEO_CATALOG } from './bundledVideoData';
import {
  formatDurationSeconds,
  isHttpVideoLink,
  matchKnownVideoDuration,
  parseDurationToSeconds,
} from './knownVideoDurations';

export interface VideoDurationProbeResult {
  success: boolean;
  duration?: string;
  seconds?: number;
  error?: string;
  source?: string;
}

export function extractGoogleDriveFileId(url: string): string | null {
  if (!url || !url.includes('drive.google.com')) return null;
  const match = url.match(/\/d\/([-\w]{25,})/) || url.match(/[?&]id=([-\w]{25,})/) || url.match(/([-\w]{25,})/);
  return match ? match[1] : null;
}

async function fetchGoogleDriveDuration(url: string): Promise<string | null> {
  try {
    const fileId = extractGoogleDriveFileId(url);
    if (!fileId) return null;

    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) return null;

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=videoMediaMetadata&key=${apiKey}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.videoMediaMetadata?.durationMillis) {
      const totalSeconds = Math.floor(parseInt(data.videoMediaMetadata.durationMillis, 10) / 1000);
      if (totalSeconds > 0) return formatDurationSeconds(totalSeconds, false);
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchYoutubeDuration(url: string): Promise<string | null> {
  try {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return null;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) return null;
    const html = await res.text();
    let seconds = 0;

    const approx = html.match(/"approxDurationMs":"(\d+)"/);
    if (approx) seconds = Math.floor(parseInt(approx[1], 10) / 1000);

    if (!seconds) {
      const len = html.match(/"lengthSeconds":"(\d+)"/);
      if (len) seconds = parseInt(len[1], 10);
    }

    if (!seconds) {
      const match = html.match(/itemprop="duration" content="(PT.*?)"/);
      if (match) {
        const d = match[1];
        const hours = Number(d.match(/(\d+)H/)?.[1] || 0);
        const minutes = Number(d.match(/(\d+)M/)?.[1] || 0);
        const secs = Number(d.match(/(\d+)S/)?.[1] || 0);
        seconds = hours * 3600 + minutes * 60 + secs;
      }
    }

    return seconds > 0 ? formatDurationSeconds(seconds, false) : null;
  } catch {
    return null;
  }
}

async function fetchVimeoDuration(url: string): Promise<string | null> {
  try {
    if (!url.includes('vimeo.com')) return null;
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.duration === 'number' && data.duration > 0) {
      return formatDurationSeconds(Math.floor(data.duration), false);
    }
    return null;
  } catch {
    return null;
  }
}

function parseMp4MvhdSeconds(buf: Buffer): number {
  const mvhdIdx = buf.indexOf('mvhd');
  if (mvhdIdx === -1 || mvhdIdx + 24 >= buf.length) return 0;

  const version = buf[mvhdIdx + 4];
  if (version === 0 && mvhdIdx + 24 <= buf.length) {
    const timescale = buf.readUInt32BE(mvhdIdx + 16);
    const duration = buf.readUInt32BE(mvhdIdx + 20);
    if (timescale > 0 && duration > 0) {
      return Math.round(duration / timescale);
    }
  } else if (version === 1 && mvhdIdx + 36 <= buf.length) {
    const timescale = buf.readUInt32BE(mvhdIdx + 24);
    const duration = Number(buf.readBigUInt64BE(mvhdIdx + 28));
    if (timescale > 0 && duration > 0) {
      return Math.round(duration / timescale);
    }
  }
  return 0;
}

async function fetchDirectMp4Duration(url: string): Promise<string | null> {
  try {
    if (!isHttpVideoLink(url)) return null;
    const lower = url.toLowerCase();
    if (lower.includes('drive.google.com') || lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) {
      return null;
    }

    const res = await fetch(url, {
      headers: { Range: 'bytes=0-1048575' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) return null;

    const arrBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrBuf);
    const seconds = parseMp4MvhdSeconds(buf);
    return seconds > 0 ? formatDurationSeconds(seconds, false) : null;
  } catch {
    return null;
  }
}

export async function probeVideoDuration(opts: {
  title?: string | null;
  videoLink?: string | null;
}): Promise<VideoDurationProbeResult> {
  const title = (opts.title || '').trim();
  const videoLink = (opts.videoLink || '').trim();

  // 1. Exact/Normalized catalog & URL match
  const known = matchKnownVideoDuration(title, videoLink, BUNDLED_VIDEO_CATALOG);
  if (known && parseDurationToSeconds(known) > 0) {
    const seconds = parseDurationToSeconds(known);
    return {
      success: true,
      duration: formatDurationSeconds(seconds, true),
      seconds,
      source: 'catalog',
    };
  }

  // 2. Match Google Drive File ID across BUNDLED_VIDEO_CATALOG (handles query string variants like ?usp=sharing vs ?usp=drive_link)
  const driveId = extractGoogleDriveFileId(videoLink);
  if (driveId) {
    const byDriveId = BUNDLED_VIDEO_CATALOG.find(
      (v) => v.videoLink && v.videoLink.includes(driveId) && parseDurationToSeconds(v.duration) > 0
    );
    if (byDriveId) {
      const seconds = parseDurationToSeconds(byDriveId.duration);
      return {
        success: true,
        duration: formatDurationSeconds(seconds, true),
        seconds,
        source: 'drive-catalog',
      };
    }
  }

  // 3. Remote metadata probes (YouTube / Vimeo / Google Drive API / MP4 Header)
  if (isHttpVideoLink(videoLink)) {
    const remoteDur =
      (await fetchYoutubeDuration(videoLink)) ||
      (await fetchVimeoDuration(videoLink)) ||
      (await fetchGoogleDriveDuration(videoLink)) ||
      (await fetchDirectMp4Duration(videoLink));

    if (remoteDur) {
      const seconds = parseDurationToSeconds(remoteDur);
      if (seconds > 0) {
        return {
          success: true,
          duration: formatDurationSeconds(seconds, true),
          seconds,
          source: 'remote-probe',
        };
      }
    }
  }

  return {
    success: false,
    error: 'Automatic duration could not be resolved from URL metadata; please enter HH:MM:SS manually if needed.',
  };
}
