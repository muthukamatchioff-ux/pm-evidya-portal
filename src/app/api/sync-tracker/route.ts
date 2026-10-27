import { NextResponse } from 'next/server';
import { syncTrackerIfNeeded } from '@/lib/syncTracker';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true' || searchParams.get('force') === '1';

  if (searchParams.get('check') === 'true') {
    const videoCount = await prisma.videoLibrary.count({
      where: { id: { startsWith: 'VID-' } }
    });
    const shootCount = await prisma.shootingSchedule.count({
      where: { id: { startsWith: 'shoot-VID-' } }
    });
    const editorCount = await prisma.videoEditorRecord.count({
      where: { id: { startsWith: 'ed-VID-' } }
    });
    return NextResponse.json({
      success: true,
      videoCount,
      shootCount,
      editorCount,
      isFullySynced: videoCount >= 76
    });
  }

  const result = await syncTrackerIfNeeded(prisma, force);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const result = await syncTrackerIfNeeded(prisma, true);
  return NextResponse.json(result);
}
