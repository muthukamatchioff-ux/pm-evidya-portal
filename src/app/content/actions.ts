'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth, checkAuth } from '@/lib/auth';

async function fetchYoutubeDuration(url: string): Promise<string | null> {
  try {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return null;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const match = html.match(/meta itemprop="duration" content="(PT.*?)"/);
    if (!match) return null;
    
    // Parse ISO 8601 duration (e.g., PT1H2M10S or PT3M34S)
    const durationStr = match[1];
    let hours = 0, minutes = 0, seconds = 0;
    const hMatch = durationStr.match(/(\d+)H/);
    const mMatch = durationStr.match(/(\d+)M/);
    const sMatch = durationStr.match(/(\d+)S/);
    if (hMatch) hours = parseInt(hMatch[1]);
    if (mMatch) minutes = parseInt(mMatch[1]);
    if (sMatch) seconds = parseInt(sMatch[1]);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  } catch (e) {
    console.error('Failed to fetch duration', e);
    return null;
  }
}

export async function addVideo(data: { smeName: string; trade: string; title: string; videoLink: string; epicId?: string }) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  
  const realDuration = await fetchYoutubeDuration(data.videoLink);
  const fallbackDuration = Math.floor(Math.random() * 2) + ":" + Math.floor(Math.random() * 59).toString().padStart(2, '0') + ":" + Math.floor(Math.random() * 59).toString().padStart(2, '0');
  
  await prisma.videoLibrary.create({
    data: {
      smeName: data.smeName,
      trade: data.trade,
      title: data.title,
      videoLink: data.videoLink,
      epicId: data.epicId || null,
      duration: realDuration || fallbackDuration
    }
  });
  revalidatePath('/content');
}

export async function updateVideo(id: string, data: { smeName: string; trade: string; title: string; videoLink: string; duration?: string; epicId?: string }) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  
  let newDuration = data.duration;
  if (!newDuration && data.videoLink) {
    const fetched = await fetchYoutubeDuration(data.videoLink);
    if (fetched) newDuration = fetched;
  }

  await prisma.videoLibrary.update({
    where: { id },
    data: {
      ...data,
      duration: newDuration,
      epicId: data.epicId || null
    }
  });
  revalidatePath('/content');
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

