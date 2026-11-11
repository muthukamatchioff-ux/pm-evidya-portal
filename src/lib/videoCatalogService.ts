import { prisma } from './prisma';
import { BUNDLED_VIDEO_CATALOG, BundledVideoItem } from './bundledVideoData';

export type { BundledVideoItem };

export function parseDurationToSeconds(dur: string | null | undefined): number {
  if (!dur || dur === 'null' || dur === '—') return 0;
  const trimmed = dur.trim();
  const parts = trimmed.split(':').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && !parts.some(isNaN)) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function formatDurationSeconds(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

let inMemoryVideoCache: {
  timestamp: number;
  data: BundledVideoItem[];
} | null = null;

const CACHE_TTL_MS = 60000; // 60 seconds

export function invalidateVideoCatalogCache(): void {
  inMemoryVideoCache = null;
}

export async function getAuthoritativeVideoLibrary(): Promise<BundledVideoItem[]> {
  const now = Date.now();
  if (inMemoryVideoCache && (now - inMemoryVideoCache.timestamp) < CACHE_TTL_MS) {
    return inMemoryVideoCache.data;
  }

  // Base map from bundled catalog for guaranteed completeness
  const catalogMap = new Map<string, BundledVideoItem>();
  BUNDLED_VIDEO_CATALOG.forEach(v => {
    catalogMap.set(v.id, { ...v });
    if (v.title) catalogMap.set(v.title.trim().toLowerCase(), { ...v });
  });

  try {
    const [dbVideos, dbEditors] = await Promise.all([
      prisma.videoLibrary.findMany({
        include: {
          epic: {
            include: {
              sme: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.videoEditorRecord.findMany()
    ]);

    if (dbVideos && dbVideos.length > 0) {
      const edMap = new Map<string, any>();
      dbEditors.forEach((ed: any) => {
        if (ed.assignedVideo) edMap.set(ed.assignedVideo.trim().toLowerCase(), ed);
        if (ed.id) edMap.set(ed.id, ed);
        if (ed.workEntryId) edMap.set(ed.workEntryId, ed);
      });

      dbVideos.forEach((v: any, idx: number) => {
        const cleanTitle = (v.title || '').trim().toLowerCase();
        const ed = edMap.get(cleanTitle) || edMap.get(v.id.replace('VID-', 'ed-VID-')) || (v.epicId ? edMap.get(v.epicId) : undefined);
        
        // Month resolution
        let month = '';
        if (ed && ed.reviewComments) {
          try {
            const p = JSON.parse(ed.reviewComments);
            if (p.month) {
              const m = p.month.toLowerCase();
              if (m.includes('june') || m.includes('jun')) month = 'Jun 2026';
              else if (m.includes('july') || m.includes('jul')) month = 'Jul 2026';
              else if (m.includes('august') || m.includes('aug')) month = 'Aug 2026';
              else if (m.includes('september') || m.includes('sep')) month = 'Sep 2026';
              else if (m.includes('october') || m.includes('oct')) month = 'Oct 2026';
            }
          } catch (_) {}
          if (!month) {
            const c = String(ed.reviewComments);
            if (c.includes('June') || c.includes('Jun')) month = 'Jun 2026';
            else if (c.includes('July') || c.includes('Jul')) month = 'Jul 2026';
            else if (c.includes('August') || c.includes('Aug')) month = 'Aug 2026';
            else if (c.includes('September') || c.includes('Sep')) month = 'Sep 2026';
            else if (c.includes('October') || c.includes('Oct')) month = 'Oct 2026';
          }
        }

        if (!month) {
          const existing = catalogMap.get(v.id) || catalogMap.get(cleanTitle);
          month = existing?.month || (idx < 1 ? 'Jun 2026' : idx < 10 ? 'Jul 2026' : idx < 36 ? 'Aug 2026' : idx < 55 ? 'Sep 2026' : 'Oct 2026');
        }

        const existing = catalogMap.get(v.id) || catalogMap.get(cleanTitle);
        const link = v.videoLink || ed?.finalVideoFile || existing?.videoLink || '';
        const dur = (v.duration && v.duration !== 'null' && v.duration !== '00:00:00')
          ? v.duration
          : (ed?.duration && ed?.duration !== 'null' ? ed?.duration : (existing?.duration || '00:00:00'));
        const durSec = parseDurationToSeconds(dur);

        const item: BundledVideoItem = {
          id: v.id,
          title: v.title,
          trade: v.trade || v.epic?.trade || existing?.trade || 'Vocational Education',
          subject: v.trade || v.epic?.trade || existing?.subject || 'Vocational Education',
          smeName: v.smeName || v.epic?.sme?.name || existing?.smeName || 'NIMI Expert',
          duration: dur,
          durationSeconds: durSec,
          videoLink: link,
          status: link && link.startsWith('http') ? 'PUBLISHED' : (ed?.status || 'COMPLETED'),
          month,
          epicCode: v.epic?.epicSequence || ed?.assignedVideo || existing?.epicCode || ''
        };

        catalogMap.set(v.id, item);
      });
    }
  } catch (err) {
    console.warn('Prisma video library query failed, utilizing bundled video catalog:', err);
  }

  // Deduplicate and return distinct list by ID
  const distinctVideos: BundledVideoItem[] = [];
  const seenIds = new Set<string>();

  for (const v of catalogMap.values()) {
    if (!seenIds.has(v.id)) {
      seenIds.add(v.id);
      distinctVideos.push(v);
    }
  }

  // Sort by ID / month order
  distinctVideos.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  inMemoryVideoCache = {
    timestamp: now,
    data: distinctVideos
  };

  return distinctVideos;
}

export async function getVideosForMonth(monthKey: string): Promise<BundledVideoItem[]> {
  const allVideos = await getAuthoritativeVideoLibrary();
  return allVideos.filter(v => v.month === monthKey);
}
