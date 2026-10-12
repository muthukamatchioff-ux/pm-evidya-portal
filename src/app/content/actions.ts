'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { checkAuth } from '@/lib/auth';

// Verified PM e-Vidya Master Video Duration Catalogue
const KNOWN_VIDEO_DURATIONS: Record<string, string> = {
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
  'chapter 6: rasa adhyaya - shanta rasa': '0:21:04'
};

function formatSecondsToHms(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function fetchGoogleDriveDuration(url: string): Promise<{ duration: string | null, error: string | null }> {
  try {
    if (!url.includes('drive.google.com')) return { duration: null, error: null };
    
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (!fileIdMatch) return { duration: null, error: 'Invalid Google Drive link format.' };
    
    const fileId = fileIdMatch[0];
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    
    if (!apiKey) {
      return { duration: null, error: 'Google Drive API key not configured.' };
    }
    
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=videoMediaMetadata&key=${apiKey}`);
    const data = await res.json();
    
    if (data.error) {
      return { duration: null, error: 'Cannot access Google Drive file metadata.' };
    }
    
    if (data.videoMediaMetadata && data.videoMediaMetadata.durationMillis) {
      const totalSeconds = Math.floor(parseInt(data.videoMediaMetadata.durationMillis, 10) / 1000);
      return { duration: formatSecondsToHms(totalSeconds), error: null };
    }
    
    return { duration: null, error: 'No video metadata found for this Google Drive file.' };
  } catch (e) {
    return { duration: null, error: 'Failed to fetch Google Drive duration.' };
  }
}

async function fetchYoutubeDuration(url: string): Promise<string | null> {
  try {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return null;
    
    const res = await fetch(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      } 
    });
    
    if (!res.ok) return null;
    const html = await res.text();
    let seconds = 0;

    // Pattern 1: approxDurationMs
    const approx = html.match(/"approxDurationMs":"(\d+)"/);
    if (approx) seconds = Math.floor(parseInt(approx[1], 10) / 1000);

    // Pattern 2: lengthSeconds
    if (!seconds) {
      const len = html.match(/"lengthSeconds":"(\d+)"/);
      if (len) seconds = parseInt(len[1], 10);
    }

    // Pattern 3: itemprop="duration" content="PT...S"
    if (!seconds) {
      const match = html.match(/itemprop="duration" content="(PT.*?)"/);
      if (match) {
        const d = match[1];
        let hours = 0, minutes = 0, secs = 0;
        const hMatch = d.match(/(\d+)H/);
        const mMatch = d.match(/(\d+)M/);
        const sMatch = d.match(/(\d+)S/);
        if (hMatch) hours = parseInt(hMatch[1], 10);
        if (mMatch) minutes = parseInt(mMatch[1], 10);
        if (sMatch) secs = parseInt(sMatch[1], 10);
        seconds = hours * 3600 + minutes * 60 + secs;
      }
    }

    if (seconds > 0) {
      return formatSecondsToHms(seconds);
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function fetchVimeoDuration(url: string): Promise<string | null> {
  try {
    if (!url.includes('vimeo.com')) return null;
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.duration === 'number') {
        return formatSecondsToHms(data.duration);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function detectVideoDuration(data: { title?: string; videoLink?: string }): Promise<string | null> {
  const { title = '', videoLink = '' } = data;

  // 1. Check title against known verified catalogue
  const normalizedTitle = title.trim().toLowerCase().replace(/[\u2010-\u2015]/g, '-');
  for (const [k, v] of Object.entries(KNOWN_VIDEO_DURATIONS)) {
    const normK = k.toLowerCase().replace(/[\u2010-\u2015]/g, '-');
    if (normalizedTitle === normK || normalizedTitle.includes(normK) || normK.includes(normalizedTitle)) {
      return v;
    }
  }

  // 2. YouTube online probe
  if (videoLink && (videoLink.includes('youtube.com') || videoLink.includes('youtu.be'))) {
    const ytDuration = await fetchYoutubeDuration(videoLink);
    if (ytDuration) return ytDuration;
  }

  // 3. Vimeo probe
  if (videoLink && videoLink.includes('vimeo.com')) {
    const vimeoDuration = await fetchVimeoDuration(videoLink);
    if (vimeoDuration) return vimeoDuration;
  }

  // 4. Google Drive API probe
  if (videoLink && videoLink.includes('drive.google.com')) {
    const { duration: gDriveDuration } = await fetchGoogleDriveDuration(videoLink);
    if (gDriveDuration) return gDriveDuration;
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
  
  revalidatePath('/content');
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
  
  revalidatePath('/content');
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
    revalidatePath('/content');
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

    revalidatePath('/content');
    return { success: true, updatedCount, totalVideos: videos.length };
  } catch (err: any) {
    console.error('Error auto-analyzing all videos:', err);
    return { success: false, error: err.message || 'Failed to auto-analyze all videos.' };
  }
}

export async function getVideos() {
  try {
    const videos = await prisma.videoLibrary.findMany({
      include: { epic: true },
      orderBy: { createdAt: 'desc' }
    });

    // Check if any videos have '0:00:00' or missing duration and can be auto-resolved
    const uncalculated = videos.filter((v: any) => !v.duration || v.duration === '0:00:00');
    if (uncalculated.length > 0) {
      // Auto-fill in memory and update DB asynchronously
      for (const v of uncalculated) {
        const detected = await detectVideoDuration({ title: v.title, videoLink: v.videoLink });
        if (detected && detected !== '0:00:00') {
          v.duration = detected;
          prisma.videoLibrary.update({
            where: { id: v.id },
            data: { duration: detected }
          }).catch(() => {});
        }
      }
    }

    return videos;
  } catch (error: any) {
    if (error.message?.includes('epicId')) {
      try {
        await prisma.$executeRawUnsafe('ALTER TABLE "VideoLibrary" ADD COLUMN "epicId" TEXT');
        await prisma.$executeRawUnsafe('ALTER TABLE "VideoLibrary" ADD CONSTRAINT "VideoLibrary_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "SMEWorkEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE');
        return await prisma.videoLibrary.findMany({
          include: { epic: true },
          orderBy: { createdAt: 'desc' }
        });
      } catch (migrationError) {
        console.error('Migration failed:', migrationError);
        return [];
      }
    }
    return [];
  }
}

