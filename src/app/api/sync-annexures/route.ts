import { NextResponse } from 'next/server';
import { syncAnnexuresIfNeeded } from '@/lib/syncAnnexures';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  if (searchParams.get('audit') === 'true') {
    const logs = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, logs });
  }

  const force = searchParams.get('force') === 'true' || searchParams.get('force') === '1';
  const result = await syncAnnexuresIfNeeded(undefined, force);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const result = await syncAnnexuresIfNeeded(undefined, true);
  return NextResponse.json(result);
}
