import { NextResponse } from 'next/server';
import { syncTrackerIfNeeded } from '@/lib/syncTracker';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('diag') === 'true') {
    try {
      const editorCols = (await prisma.$queryRawUnsafe(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'VideoEditorRecord' ORDER BY ordinal_position;`
      )) as any[];
      const shootCols = (await prisma.$queryRawUnsafe(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ShootingSchedule' ORDER BY ordinal_position;`
      )) as any[];
      const libCols = (await prisma.$queryRawUnsafe(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'VideoLibrary' ORDER BY ordinal_position;`
      )) as any[];
      const smeEntries = (await prisma.$queryRawUnsafe(
        `SELECT id, "epicSequence", "epicCode", trade, topic FROM "SMEWorkEntry" ORDER BY "epicSequence";`
      )) as any[];
      return NextResponse.json({
        success: true,
        editorCols,
        shootCols,
        libCols,
        smeEntries
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

  if (searchParams.get('migrate') === 'true') {
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "VideoEditorRecord" ADD COLUMN IF NOT EXISTS "editingEndDate" TIMESTAMP(3);`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "VideoEditorRecord" ADD COLUMN IF NOT EXISTS "editingStartDate" TIMESTAMP(3);`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ShootingSchedule" ADD COLUMN IF NOT EXISTS "scheduledStart" TIMESTAMP(3);`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ShootingSchedule" ADD COLUMN IF NOT EXISTS "scheduledEnd" TIMESTAMP(3);`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ShootingSchedule" ADD COLUMN IF NOT EXISTS "cameraman" TEXT;`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "VideoLibrary" ADD COLUMN IF NOT EXISTS "epicId" TEXT;`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "VideoLibrary" ADD COLUMN IF NOT EXISTS "duration" TEXT;`
      );
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "VideoLibrary" ADD COLUMN IF NOT EXISTS "trade" TEXT;`
      );
      return NextResponse.json({ success: true, message: 'Schema columns successfully added/verified.' });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

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
