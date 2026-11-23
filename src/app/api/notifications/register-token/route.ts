import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import { registerDeviceToken } from '@/lib/fcmStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session || !session.email) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    const body = await req.json();
    const deviceToken = body.token;
    const platform = body.platform || 'android';

    if (!deviceToken || typeof deviceToken !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing device token' }, { status: 400 });
    }

    registerDeviceToken(session.email, session.role || 'VIEWER', deviceToken, platform);

    return NextResponse.json({ success: true, message: 'Device token registered successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
