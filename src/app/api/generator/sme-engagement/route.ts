import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth';
import { saveSMERecordCore } from '@/lib/smeEngagementService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'CAMERAMAN', 'EDITOR']);
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { smeData, trades } = body || {};

    if (!smeData || !trades) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: smeData, trades' },
        { status: 400 }
      );
    }

    const result = await saveSMERecordCore(smeData, trades);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[API /generator/sme-engagement] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
