import { prisma } from './prisma';
import { cachedQuery, CACHE_TAGS, expireTags } from './dataCache';
import { BUNDLED_VIDEO_CATALOG, BundledVideoItem } from './bundledVideoData';
import {
  formatDurationSeconds,
  isHttpVideoLink,
  matchKnownVideoDuration,
  normalizeVideoTitle,
  parseDurationToSeconds,
  resolveRealVideoStatus,
  resolveVideoMonth,
} from './knownVideoDurations';

export type { BundledVideoItem };
export { parseDurationToSeconds, formatDurationSeconds };

let inMemoryVideoCache: {
  timestamp: number;
  data: BundledVideoItem[];
} | null = null;

const CACHE_TTL_MS = 60000; // 60 seconds

export function invalidateVideoCatalogCache(): void {
  inMemoryVideoCache = null;
  expireTags([CACHE_TAGS.VIDEOS, CACHE_TAGS.PRODUCTION, CACHE_TAGS.REPORTS]);
}

const buildAuthoritativeVideoLibraryCached = cachedQuery(
  async (): Promise<BundledVideoItem[]> => {
    // Base map from bundled catalog keyed strictly by canonical ID; secondary index by normalized title
    const catalogMap = new Map<string, BundledVideoItem>();
    const bundledByTitle = new Map<string, BundledVideoItem>();
    BUNDLED_VIDEO_CATALOG.forEach((v) => {
      catalogMap.set(v.id, { ...v });
      const norm = normalizeVideoTitle(v.title);
      if (norm) bundledByTitle.set(norm, { ...v });
    });

    try {
      const [dbVideos, dbEditors, dbSchedules] = await Promise.all([
        prisma.videoLibrary.findMany({
          include: {
            epic: {
              include: {
                sme: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.videoEditorRecord.findMany(),
        prisma.shootingSchedule.findMany(),
      ]);

      if (dbVideos && dbVideos.length > 0) {
        const edByTitle = new Map<string, any>();
        const edById = new Map<string, any>();
        const edWorkEntryCounts = new Map<string, number>();
        const edByUniqueWorkEntry = new Map<string, any>();

        dbEditors.forEach((ed: any) => {
          const norm = normalizeVideoTitle(ed.assignedVideo);
          if (norm) edByTitle.set(norm, ed);
          if (ed.id) edById.set(ed.id, ed);
          if (ed.workEntryId) {
            edWorkEntryCounts.set(ed.workEntryId, (edWorkEntryCounts.get(ed.workEntryId) || 0) + 1);
            edByUniqueWorkEntry.set(ed.workEntryId, ed);
          }
        });

        const shByTitle = new Map<string, any>();
        const shById = new Map<string, any>();
        const shWorkEntryCounts = new Map<string, number>();
        const shByUniqueWorkEntry = new Map<string, any>();

        dbSchedules.forEach((sh: any) => {
          const norm = normalizeVideoTitle(sh.videoTitle);
          if (norm) shByTitle.set(norm, sh);
          if (sh.id) shById.set(sh.id, sh);
          if (sh.workEntryId) {
            shWorkEntryCounts.set(sh.workEntryId, (shWorkEntryCounts.get(sh.workEntryId) || 0) + 1);
            shByUniqueWorkEntry.set(sh.workEntryId, sh);
          }
        });

        dbVideos.forEach((v: any) => {
          const cleanTitle = normalizeVideoTitle(v.title);
          const ed =
            edByTitle.get(cleanTitle) ||
            edById.get(v.id.replace('VID-', 'ed-VID-')) ||
            (v.epicId && edWorkEntryCounts.get(v.epicId) === 1 ? edByUniqueWorkEntry.get(v.epicId) : undefined);

          const sh =
            shByTitle.get(cleanTitle) ||
            shById.get(v.id.replace('VID-', 'shoot-VID-')) ||
            (v.epicId && shWorkEntryCounts.get(v.epicId) === 1 ? shByUniqueWorkEntry.get(v.epicId) : undefined);

          const existing = catalogMap.get(v.id) || bundledByTitle.get(cleanTitle);

          const month = resolveVideoMonth({
            reviewComments: ed?.reviewComments,
            productionNotes: sh?.productionNotes,
            location: sh?.location,
            fallbackMonth: existing?.month,
            dates: [ed?.editingEndDate, sh?.scheduledEnd, sh?.shootDate, v.createdAt],
          });

          const link = isHttpVideoLink(v.videoLink)
            ? v.videoLink.trim()
            : isHttpVideoLink(ed?.finalVideoFile)
              ? ed.finalVideoFile.trim()
              : (v.videoLink || ed?.finalVideoFile || existing?.videoLink || '').trim();

          const hasLink = isHttpVideoLink(link);
          const knownDur = matchKnownVideoDuration(v.title, link, BUNDLED_VIDEO_CATALOG);

          // Heal known substring duration collision (VID-027 "Pressure Measurement Introduction": 0:40:11 vs 0:28:47)
          const vDurSec = parseDurationToSeconds(v.duration);
          const edDurSec = parseDurationToSeconds(ed?.duration);
          let dur = '00:00:00';

          if (cleanTitle === 'pressure measurement introduction' && v.duration === '0:28:47') {
            dur = edDurSec > 0 ? ed.duration : knownDur || '0:40:11';
          } else if (vDurSec > 0) {
            dur = v.duration;
          } else if (edDurSec > 0) {
            dur = ed.duration;
          } else if (knownDur && parseDurationToSeconds(knownDur) > 0) {
            dur = knownDur;
          } else if (existing?.duration && parseDurationToSeconds(existing.duration) > 0) {
            dur = existing.duration;
          }

          // Only completed/linked modules contribute developed durationSeconds; planned estimates keep display duration
          const durSec = hasLink ? parseDurationToSeconds(dur) : 0;

          const status = resolveRealVideoStatus({
            videoLink: link,
            editorStatus: ed?.status,
            shootStatus: sh?.status,
            fallbackStatus: existing?.status,
          });

          const epicSeqStr =
            v.epic?.epicSequence != null
              ? `EPIC-2026-PMeVidya ${String(v.epic.epicSequence).padStart(2, '0')}`
              : '';

          const item: BundledVideoItem = {
            id: v.id,
            title: v.title,
            trade: v.trade || v.epic?.trade || existing?.trade || 'Vocational Education',
            subject: v.trade || v.epic?.trade || existing?.subject || 'Vocational Education',
            smeName: v.smeName || v.epic?.sme?.name || existing?.smeName || 'NIMI Expert',
            duration: dur,
            durationSeconds: durSec,
            videoLink: link,
            status,
            month,
            epicCode: epicSeqStr || ed?.assignedVideo || existing?.epicCode || '',
          };

          catalogMap.set(v.id, item);
        });
      }
    } catch (err) {
      console.warn('Prisma video library query failed, utilizing bundled video catalog:', err);
    }

    const distinctVideos = Array.from(catalogMap.values());
    distinctVideos.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    return distinctVideos;
  },
  ['authoritative-video-library-v1'],
  { revalidate: 300, tags: [CACHE_TAGS.VIDEOS, CACHE_TAGS.PRODUCTION, CACHE_TAGS.REPORTS] }
);

export async function getAuthoritativeVideoLibrary(): Promise<BundledVideoItem[]> {
  const now = Date.now();
  if (inMemoryVideoCache && now - inMemoryVideoCache.timestamp < CACHE_TTL_MS) {
    return inMemoryVideoCache.data;
  }

  const distinctVideos = await buildAuthoritativeVideoLibraryCached();

  inMemoryVideoCache = {
    timestamp: now,
    data: distinctVideos,
  };

  return distinctVideos;
}

export async function getVideosForMonth(monthKey: string): Promise<BundledVideoItem[]> {
  const allVideos = await getAuthoritativeVideoLibrary();
  return allVideos.filter((v) => v.month === monthKey);
}
