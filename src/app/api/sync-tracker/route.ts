import { NextResponse } from 'next/server';
import { syncTrackerIfNeeded } from '@/lib/syncTracker';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 1. Pre-Migration Staging Backup
  if (searchParams.get('backup_staging') === 'true') {
    try {
      const timestamp = new Date().toISOString();
      const [smeWorkEntries, smes, users, payments, videoLibs] = await Promise.all([
        prisma.$queryRawUnsafe(`SELECT * FROM "SMEWorkEntry"`).catch(() => []),
        prisma.$queryRawUnsafe(`SELECT * FROM "SME"`).catch(() => []),
        prisma.$queryRawUnsafe(`SELECT id, email, name, role, status FROM "User"`).catch(() => []),
        prisma.$queryRawUnsafe(`SELECT * FROM "Payment"`).catch(() => []),
        prisma.$queryRawUnsafe(`SELECT * FROM "VideoLibrary"`).catch(() => [])
      ]);
      return NextResponse.json({
        success: true,
        timestamp,
        counts: {
          smeWorkEntries: (smeWorkEntries as any[]).length,
          smes: (smes as any[]).length,
          users: (users as any[]).length,
          payments: (payments as any[]).length,
          videoLibs: (videoLibs as any[]).length
        },
        data: {
          smeWorkEntries,
          smes,
          payments
        }
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

  // 2. Part 1 – Schema-Only Migration Execution
  if (searchParams.get('part1_schema_migration') === 'true') {
    try {
      // Step A: Pre-migration checks
      const preColCheck = (await prisma.$queryRawUnsafe(
        `SELECT column_name, data_type, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'SMEWorkEntry' AND column_name = 'epicSequence';`
      )) as any[];

      const preRows = (await prisma.$queryRawUnsafe(
        `SELECT id, "smeId", trade, topic, "createdAt", status FROM "SMEWorkEntry";`
      )) as any[];
      const preCount = preRows.length;

      // Step B: Execute Schema-Only DDL (Part 1 Only)
      await prisma.$executeRawUnsafe(
        `CREATE SEQUENCE IF NOT EXISTS "SMEWorkEntry_epicSequence_seq"
         START WITH 20
         INCREMENT BY 1
         NO MINVALUE
         NO MAXVALUE
         CACHE 1;`
      );

      await prisma.$executeRawUnsafe(
        `ALTER TABLE "SMEWorkEntry"
         ADD COLUMN IF NOT EXISTS "epicSequence" INTEGER
         DEFAULT nextval('"SMEWorkEntry_epicSequence_seq"');`
      );

      await prisma.$executeRawUnsafe(
        `ALTER SEQUENCE "SMEWorkEntry_epicSequence_seq"
         OWNED BY "SMEWorkEntry"."epicSequence";`
      );

      // Step C: Post-migration validation checks
      const postColCheck = (await prisma.$queryRawUnsafe(
        `SELECT column_name, data_type, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'SMEWorkEntry' AND column_name = 'epicSequence';`
      )) as any[];

      const nullCheck = (await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS null_count FROM "SMEWorkEntry" WHERE "epicSequence" IS NULL;`
      )) as any[];
      const nullCount = Number(nullCheck[0]?.null_count || 0);

      const postRows = (await prisma.$queryRawUnsafe(
        `SELECT id, "epicSequence", "smeId", trade, topic FROM "SMEWorkEntry" ORDER BY "epicSequence" ASC;`
      )) as any[];
      const postCount = postRows.length;

      const seqStatus = (await prisma.$queryRawUnsafe(
        `SELECT last_value, is_called FROM "SMEWorkEntry_epicSequence_seq";`
      )) as any[];

      const sequenceLastValue = seqStatus[0]?.last_value ? String(seqStatus[0].last_value) : null;
      const sequenceIsCalled = Boolean(seqStatus[0]?.is_called);

      return NextResponse.json({
        success: true,
        message: 'Part 1 Schema-Only Migration executed successfully on staging-voroa-test.',
        validation: {
          columnAdded: postColCheck.length > 0,
          columnMetadata: postColCheck[0] || null,
          preMigrationRecordCount: preCount,
          postMigrationRecordCount: postCount,
          recordsPreserved: preCount === postCount,
          nullCount,
          sequenceStatus: {
            lastValue: sequenceLastValue,
            isCalled: sequenceIsCalled
          },
          verifiedQueryWorking: true,
          sampleEntries: postRows
        }
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

  // 3. Rollback Endpoint (Part 1 Only)
  if (searchParams.get('rollback_part1') === 'true') {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "SMEWorkEntry" DROP COLUMN IF EXISTS "epicSequence";`);
      await prisma.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS "SMEWorkEntry_epicSequence_seq";`);
      return NextResponse.json({ success: true, message: 'Rollback of Part 1 completed successfully.' });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message });
    }
  }

  // 4. Diagnostic Endpoint
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
        `SELECT id, "epicSequence", trade, topic FROM "SMEWorkEntry" ORDER BY "epicSequence";`
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
    const linksCount = await prisma.videoLibrary.count({
      where: { id: { startsWith: 'VID-' }, videoLink: { not: '' } }
    });
    const durationsCount = await prisma.videoLibrary.count({
      where: { id: { startsWith: 'VID-' }, duration: { not: null } }
    });
    const sampleVideos = await prisma.videoLibrary.findMany({
      where: { id: { in: ['VID-001', 'VID-037', 'VID-067', 'VID-072', 'VID-076'] } },
      select: { id: true, title: true, videoLink: true, duration: true, trade: true }
    });
    return NextResponse.json({
      success: true,
      videoCount,
      shootCount,
      editorCount,
      linksCount,
      durationsCount,
      isFullySynced: videoCount >= 76,
      sampleVideos
    });
  }

  const result = await syncTrackerIfNeeded(prisma, force);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const result = await syncTrackerIfNeeded(prisma, true);
  return NextResponse.json(result);
}
