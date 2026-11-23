import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, getEmail } from '@/lib/auth';
import { saveCommunicationsStageCore } from '@/lib/deputationService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Authentication required' },
        { status: 401 }
      );
    }

    if (authCheck.role === 'VIEWER') {
      return NextResponse.json(
        {
          success: false,
          error: 'Viewers have read-only access. Only Administrators and Team Members can save changes.'
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { workEntryId, stage, parameters } = body || {};

    if (!workEntryId || !stage || !parameters) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: workEntryId, stage, parameters' },
        { status: 400 }
      );
    }

    if (!['STAGE_A', 'STAGE_B', 'STAGE_C'].includes(stage)) {
      return NextResponse.json(
        { success: false, error: `Invalid stage: ${stage}. Must be STAGE_A, STAGE_B, or STAGE_C.` },
        { status: 400 }
      );
    }

    const userEmail = await getEmail();
    const result = await saveCommunicationsStageCore(
      workEntryId,
      stage,
      parameters,
      authCheck.role,
      userEmail
    );

    if (!result.success) {
      if (result.error && (result.error.includes('not found') || result.error.includes('Not found'))) {
        return NextResponse.json(result, { status: 404 });
      }
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[API /generator/deputation] Unhandled error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
