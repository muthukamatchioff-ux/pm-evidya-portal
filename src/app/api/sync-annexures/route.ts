import { NextResponse } from 'next/server';
import { syncAnnexuresIfNeeded } from '@/lib/syncAnnexures';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true' || searchParams.get('force') === '1';

  const result = await syncAnnexuresIfNeeded(undefined, force);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const result = await syncAnnexuresIfNeeded(undefined, true);
  return NextResponse.json(result);
}
