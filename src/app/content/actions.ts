'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth, checkAuth } from '@/lib/auth';

async function fetchGoogleDriveDuration(url: string): Promise<{ duration: string | null, error: string | null }> {
  try {
    if (!url.includes('drive.google.com')) return { duration: null, error: null };
    
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (!fileIdMatch) return { duration: null, error: 'Invalid Google Drive link format.' };
    
    const fileId = fileIdMatch[0];
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    
    if (!apiKey) {
      return { duration: null, error: 'Google Drive API key is not configured. Manual entry is required.' };
    }
    
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=videoMediaMetadata&key=${apiKey}`);
    const data = await res.json();
    
    if (data.error) {
      return { duration: null, error: 'Cannot access Google Drive file metadata. It may be private or permissions are insufficient. Manual entry is required.' };
    }
    
    if (data.videoMediaMetadata && data.videoMediaMetadata.durationMillis) {
      const totalSeconds = Math.floor(parseInt(data.videoMediaMetadata.durationMillis) / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      
      if (h > 0) {
        return { duration: `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`, error: null };
      }
      return { duration: `${m}:${s.toString().padStart(2, '0')}`, error: null };
    }
    
    return { duration: null, error: 'No video metadata found for this Google Drive file. Manual entry is required.' };
  } catch (e) {
    return { duration: null, error: 'Failed to fetch Google Drive duration. Manual entry is required.' };
  }
}

async function fetchYoutubeDuration(url: string): Promise<string | null> {
  try {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return null;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const match = html.match(/meta itemprop="duration" content="(PT.*?)"/);
    if (!match) return null;
    
    const durationStr = match[1];
    let hours = 0, minutes = 0, seconds = 0;
    const hMatch = durationStr.match(/(\d+)H/);
    const mMatch = durationStr.match(/(\d+)M/);
    const sMatch = durationStr.match(/(\d+)S/);
    if (hMatch) hours = parseInt(hMatch[1], 10);
    if (mMatch) minutes = parseInt(mMatch[1], 10);
    if (sMatch) seconds = parseInt(sMatch[1], 10);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } catch (e) {
    return null;
  }
}

export async function addVideo(data: { smeName: string; trade: string; title: string; videoLink: string; epicId?: string; duration?: string }) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  
  let realDuration = data.duration;
  let warning = null;
  if (!realDuration && data.videoLink) {
    const { duration: gDriveDuration, error } = await fetchGoogleDriveDuration(data.videoLink);
    const ytDuration = await fetchYoutubeDuration(data.videoLink);
    
    if (gDriveDuration) {
      realDuration = gDriveDuration;
    } else if (ytDuration) {
      realDuration = ytDuration;
    } else {
      warning = error || 'Could not fetch duration automatically.';
      // Fallback to random mock duration as requested
      realDuration = Math.floor(Math.random() * 2) + ":" + Math.floor(Math.random() * 59).toString().padStart(2, '0') + ":" + Math.floor(Math.random() * 59).toString().padStart(2, '0');
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
  if (warning) return { success: true, warning };
  return { success: true };
}

export async function updateVideo(id: string, data: { smeName: string; trade: string; title: string; videoLink: string; duration?: string; epicId?: string }) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  
  let newDuration = data.duration;
  let warning = null;
  if (!newDuration && data.videoLink) {
    const { duration: gDriveDuration, error } = await fetchGoogleDriveDuration(data.videoLink);
    const ytDuration = await fetchYoutubeDuration(data.videoLink);
    
    if (gDriveDuration) {
      newDuration = gDriveDuration;
    } else if (ytDuration) {
      newDuration = ytDuration;
    } else {
      warning = error;
      newDuration = Math.floor(Math.random() * 2) + ":" + Math.floor(Math.random() * 59).toString().padStart(2, '0') + ":" + Math.floor(Math.random() * 59).toString().padStart(2, '0');
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
  if (warning) return { success: true, warning };
  return { success: true };
}

export async function getVideos() {
  try {
    return await prisma.videoLibrary.findMany({
      include: { epic: true },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error: any) {
    if (error.message.includes('epicId')) {
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

