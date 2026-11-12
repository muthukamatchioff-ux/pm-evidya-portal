import { NextResponse } from 'next/server';
import { getRole } from '@/lib/auth';
import { warmDatabaseAndCoreCaches, warmAllPortalCaches } from '@/lib/portalCacheWarmers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Pre-warms Neon PostgreSQL compute + Vercel shared Data Cache (`unstable_cache`)
 * so login, initial dashboard render, and first-click head navigation avoid cold-start stalls.
 * Returns only operational status/timing metadata — never any application records.
 */
export async function GET(request: Request) {
  const startedAt = Date.now();
  const { searchParams } = new URL(request.url);
  const requestedPhase = searchParams.get('phase') || 'db';

  try {
    const role = await getRole();
    const isAuthenticated = role && role !== 'VISITOR';

    if (requestedPhase === 'all' && isAuthenticated) {
      await warmAllPortalCaches();
    } else {
      await warmDatabaseAndCoreCaches();
    }

    return NextResponse.json(
      {
        ok: true,
        phase: requestedPhase === 'all' && isAuthenticated ? 'all' : 'db',
        ms: Date.now() - startedAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        ms: Date.now() - startedAt,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}

