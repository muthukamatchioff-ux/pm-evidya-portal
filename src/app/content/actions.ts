'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';

export async function addVideo(data: { smeName: string; trade: string; title: string; videoLink: string }) {
  await requireAuth(['ADMIN']);
  // Mock automatic duration calculation based on link
  const mockDuration = Math.floor(Math.random() * 2) + ":" + Math.floor(Math.random() * 59).toString().padStart(2, '0') + ":" + Math.floor(Math.random() * 59).toString().padStart(2, '0');
  
  await prisma.videoLibrary.create({
    data: {
      ...data,
      duration: mockDuration
    }
  });
  revalidatePath('/content');
}

export async function updateVideo(id: string, data: { smeName: string; trade: string; title: string; videoLink: string; duration?: string }) {
  await requireAuth(['ADMIN']);
  await prisma.videoLibrary.update({
    where: { id },
    data
  });
  revalidatePath('/content');
}

export async function getVideos() {
  return await prisma.videoLibrary.findMany({
    orderBy: { createdAt: 'desc' }
  });
}
