import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checkDb = searchParams.get('db') === 'true';

  let dbStatus = 'untested';
  if (checkDb) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (e: any) {
      dbStatus = `disconnected: ${e.message || 'error'}`;
    }
  }

  return NextResponse.json(
    {
      status: 'healthy',
      service: 'pm-evidya-portal',
      uptime: typeof process !== 'undefined' ? Math.round(process.uptime()) : 0,
      timestamp: new Date().toISOString(),
      ...(checkDb ? { database: dbStatus } : {}),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
