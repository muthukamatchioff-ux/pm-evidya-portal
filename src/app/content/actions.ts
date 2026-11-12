'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAuth } from '@/lib/auth';
import { getAuthoritativeVideoLibrary, invalidateVideoCatalogCache } from '@/lib/videoCatalogService';
import { BUNDLED_VIDEO_CATALOG } from '@/lib/bundledVideoData';
import {
  formatDurationSeconds,
  isHttpVideoLink,
  matchKnownVideoDuration,
  normalizeVideoTitle,
} from '@/lib/knownVideoDurations';
import { probeVideoDuration } from '@/lib/videoDurationDetector';

function formatSecondsToHms(totalSec: number): string {
  return formatDurationSeconds(totalSec, false);
}

function revalidateVideoReports() {
  invalidateVideoCatalogCache();
  revalidatePath('/content');
  revalidatePath('/video-production');
  revalidatePath('/reports');
  revalidatePath('/reports/ncert-report');
  revalidatePath('/reports/monthly-expenditure');
}

export async function detectVideoDuration(data: { title?: string; videoLink?: string }): Promise<string | null> {
  const result = await probeVideoDuration(data);
  if (result.success && result.seconds && result.seconds > 0) {
    return formatSecondsToHms(result.seconds);
  }
  return null;
}

export async function addVideo(data: { smeName: string; trade: string; title: string; videoLink: string; epicId?: string; duration?: string }) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  
  let realDuration = data.duration && data.duration !== '0:00:00' ? data.duration : null;
  let warning = null;
  
  if (!realDuration) {
    const detected = await detectVideoDuration({ title: data.title, videoLink: data.videoLink });
    if (detected) {
      realDuration = detected;
    } else {
      warning = 'Duration could not be automatically detected. You can edit it manually.';
      realDuration = '0:00:00';
    }
  }
  
  await prisma.videoLibrary.create({
    data: {
      smeName: data.smeName,
      trade: data.trade,
      title: data.title,
      videoLink: data.videoLink,
      epicId: data.epicId || null,
      duration: realDuration || '0:00:00'
    }
  });
  
  revalidateVideoReports();
  if (warning) return { success: true, warning, duration: realDuration };
  return { success: true, duration: realDuration };
}

export async function updateVideo(id: string, data: { smeName: string; trade: string; title: string; videoLink: string; duration?: string; epicId?: string }) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  
  let newDuration = data.duration && data.duration !== '0:00:00' ? data.duration : null;
  let warning = null;
  
  if (!newDuration) {
    const detected = await detectVideoDuration({ title: data.title, videoLink: data.videoLink });
    if (detected) {
      newDuration = detected;
    } else {
      newDuration = '0:00:00';
      warning = 'Duration could not be automatically detected.';
    }
  }

  await prisma.videoLibrary.update({
    where: { id },
    data: {
      ...data,
      duration: newDuration || '0:00:00',
      epicId: data.epicId || null
    }
  });
  
  revalidateVideoReports();
  if (warning) return { success: true, warning, duration: newDuration };
  return { success: true, duration: newDuration };
}

export async function autoAnalyzeSingleVideo(id: string, manualDuration?: string) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;

  const video = await prisma.videoLibrary.findUnique({ where: { id } });
  if (!video) return { success: false, error: 'Video not found' };

  let finalDuration = manualDuration && manualDuration !== '0:00:00' ? manualDuration : null;
  if (!finalDuration) {
    finalDuration = await detectVideoDuration({ title: video.title, videoLink: video.videoLink });
  }

  if (finalDuration && finalDuration !== '0:00:00') {
    await prisma.videoLibrary.update({
      where: { id },
      data: { duration: finalDuration }
    });
    revalidateVideoReports();
    return { success: true, duration: finalDuration };
  }

  return { success: false, error: 'Could not auto-detect duration for this video.' };
}

export async function autoAnalyzeAllVideos() {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;

  try {
    const videos = await prisma.videoLibrary.findMany();
    let updatedCount = 0;

    for (const v of videos) {
      const detected = await detectVideoDuration({ title: v.title, videoLink: v.videoLink });
      if (detected && detected !== '0:00:00') {
        if (v.duration !== detected) {
          await prisma.videoLibrary.update({
            where: { id: v.id },
            data: { duration: detected }
          });
          updatedCount++;
        }
      }
    }

    revalidateVideoReports();
    return { success: true, updatedCount, totalVideos: videos.length };
  } catch (err: any) {
    console.error('Error auto-analyzing all videos:', err);
    return { success: false, error: err.message || 'Failed to auto-analyze all videos.' };
  }
}

function isValidCompletedVideoLink(url: string | null | undefined): boolean {
  return isHttpVideoLink(url);
}

export async function getVideos() {
  try {
    let rawVideos: any[] = [];
    try {
      rawVideos = await prisma.videoLibrary.findMany({
        where: {
          videoLink: { not: '' }
        },
        include: {
          epic: {
            include: {
              sme: true
            }
          }
        },
        orderBy: [
          { epic: { epicSequence: 'asc' } },
          { id: 'asc' }
        ]
      });
    } catch (dbErr) {
      console.warn('Prisma getVideos query failed, attempting generic query:', dbErr);
      try {
        rawVideos = await prisma.videoLibrary.findMany();
      } catch {}
    }

    if (!rawVideos || rawVideos.length === 0) {
      const authVideos = await getAuthoritativeVideoLibrary();
      rawVideos = authVideos.map((v) => ({
        id: v.id,
        title: v.title,
        trade: v.trade,
        smeName: v.smeName,
        duration: v.duration,
        videoLink: v.videoLink,
        status: v.status,
        epic: {
          sme: { name: v.smeName },
          trade: v.trade,
          epicSequence: v.epicCode
        }
      }));
    }

    if (!rawVideos || rawVideos.length === 0) {
      return [];
    }

    // STRICT USER MANDATE:
    // 1. Only show completed video links (filter out in-progress/empty/blank links)
    const completedVideos = rawVideos.filter(v => isValidCompletedVideoLink(v.videoLink));

    // 2. Remove all duplicates (deduplicate by normalized title and normalized video link)
    const seenTitles = new Set<string>();
    const seenLinks = new Set<string>();
    const uniqueVideos: any[] = [];

    for (const v of completedVideos) {
      const normTitle = normalizeVideoTitle(v.title);
      const normLink = (v.videoLink || '').trim().toLowerCase();

      if (seenTitles.has(normTitle) || (normLink && seenLinks.has(normLink))) {
        continue; // Skip duplicate video
      }
      seenTitles.add(normTitle);
      if (normLink) seenLinks.add(normLink);
      uniqueVideos.push(v);
    }

    // 3. Fast in-memory resolution & self-healing for missing or collided video durations
    let healedAny = false;
    for (const v of uniqueVideos) {
      const normTitle = normalizeVideoTitle(v.title);
      const isKnownCollision = normTitle === 'pressure measurement introduction' && v.duration === '0:28:47';
      if (!v.duration || v.duration === '0:00:00' || v.duration === '00:00:00' || isKnownCollision) {
        const detected = matchKnownVideoDuration(v.title, v.videoLink, BUNDLED_VIDEO_CATALOG);
        if (detected && detected !== '0:00:00' && detected !== '00:00:00') {
          v.duration = detected;
          healedAny = true;
          prisma.videoLibrary.update({
            where: { id: v.id },
            data: { duration: detected }
          }).catch(() => {});
        }
      }
    }
    if (healedAny) {
      invalidateVideoCatalogCache();
    }

    return uniqueVideos;
  } catch (error: any) {
    console.error('getVideos error:', error);
    return [];
  }
}

export async function getEpicDropdownList() {
  try {
    const entries = await prisma.sMEWorkEntry.findMany({
      select: {
        id: true,
        epicSequence: true,
        topic: true,
        sme: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { epicSequence: 'asc' }
    });
    return entries || [];
  } catch (err) {
    console.warn('Fallback loading epic dropdown list:', err);
    return [];
  }
}
