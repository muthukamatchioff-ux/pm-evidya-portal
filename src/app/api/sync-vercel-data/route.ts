import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDatabaseStats, backupDatabaseSnapshot, executeVercelDataSync } from '@/lib/syncVercelData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Diagnostic table inspector
  if (searchParams.get('tables') === 'true') {
    try {
      const tables = await prisma.$queryRawUnsafe(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
      );
      return NextResponse.json({ success: true, tables });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

  // Status Check
  if (searchParams.get('status') === 'true') {
    try {
      const stats = await getDatabaseStats(prisma);
      return NextResponse.json({ success: true, stats });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }

  // Backup Target Database
  if (searchParams.get('backup') === 'true') {
    try {
      const backup = await backupDatabaseSnapshot(prisma);
      return NextResponse.json({ success: true, backup });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }

  // Execute Synchronization
  if (searchParams.get('execute') === 'true' && searchParams.get('key') === 'pm_sync_2026_vercel') {
    try {
      const result = await executeVercelDataSync(prisma);
      return NextResponse.json(result);
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: 'PM e-Vidya Vercel-to-Voroa Sync API',
    endpoints: {
      tables: '/api/sync-vercel-data?tables=true',
      status: '/api/sync-vercel-data?status=true',
      backup: '/api/sync-vercel-data?backup=true',
      execute: '/api/sync-vercel-data?execute=true&key=pm_sync_2026_vercel (or POST)'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const result = await executeVercelDataSync(prisma);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
