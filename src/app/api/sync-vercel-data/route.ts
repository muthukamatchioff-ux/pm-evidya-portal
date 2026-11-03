import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDatabaseStats, backupDatabaseSnapshot, executeVercelDataSync } from '@/lib/syncVercelData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Diagnostic table inspector
  if (searchParams.get('inspect_smes') === 'true') {
    try {
      const smes = await prisma.sME.findMany({
        include: {
          workEntries: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ success: true, count: smes.length, smes });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

  // Delete Muthu Kamatchi & EPIC 18 permanently
  if (searchParams.get('delete_muthu') === 'true') {
    try {
      // Find all matching SME IDs
      const smesToDel = await prisma.sME.findMany({
        where: {
          OR: [
            { name: { contains: 'Muthu', mode: 'insensitive' } },
            { name: { contains: 'Kamatchi', mode: 'insensitive' } }
          ]
        }
      });
      const smeIds = smesToDel.map((s: any) => s.id);

      // Find all matching work entry IDs
      const entriesToDel = await prisma.sMEWorkEntry.findMany({
        where: {
          OR: [
            { epicSequence: 18 },
            { smeId: { in: smeIds } }
          ]
        }
      });
      const entryIds = entriesToDel.map((e: any) => e.id);

      // Clean up children
      const deletedDocs = await prisma.document.deleteMany({
        where: {
          OR: [
            { workEntryId: { in: entryIds } },
            { name: { contains: 'Muthu', mode: 'insensitive' } },
            { name: { contains: 'PMeVidya 18', mode: 'insensitive' } }
          ]
        }
      });
      const deletedPayments = await prisma.payment.deleteMany({
        where: { workEntryId: { in: entryIds } }
      });
      const deletedEntries = await prisma.sMEWorkEntry.deleteMany({
        where: { id: { in: entryIds } }
      });
      const deletedSmes = await prisma.sME.deleteMany({
        where: { id: { in: smeIds } }
      });

      const remainingSmes = await prisma.sME.count();
      const remainingEntries = await prisma.sMEWorkEntry.count();

      return NextResponse.json({
        success: true,
        message: 'Muthu Kamatchi and EPIC 18 deleted permanently.',
        deletedDocs: deletedDocs.count,
        deletedPayments: deletedPayments.count,
        deletedEntries: deletedEntries.count,
        deletedSmes: deletedSmes.count,
        remainingSmes,
        remainingEntries
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

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

  // Diagnostic column inspector
  if (searchParams.get('columns')) {
    try {
      const tableName = searchParams.get('columns');
      const cols = await prisma.$queryRawUnsafe(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${tableName}' ORDER BY ordinal_position;`
      );
      return NextResponse.json({ success: true, tableName, cols });
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

  // Execute Synchronization (all or by section: schema, users, smes, harish, workentries, payments, documents, videos, schedules, editors)
  if (searchParams.get('execute') === 'true' && searchParams.get('key') === 'pm_sync_2026_vercel') {
    try {
      const section = searchParams.get('section') || 'all';
      const result = await executeVercelDataSync(prisma, section);
      return NextResponse.json(result);
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: 'PM e-Vidya Vercel-to-Voroa Sync API',
    endpoints: {
      tables: '/api/sync-vercel-data?tables=true',
      columns: '/api/sync-vercel-data?columns=User',
      status: '/api/sync-vercel-data?status=true',
      backup: '/api/sync-vercel-data?backup=true',
      execute: '/api/sync-vercel-data?execute=true&key=pm_sync_2026_vercel&section=users'
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || 'all';
    const result = await executeVercelDataSync(prisma, section);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
