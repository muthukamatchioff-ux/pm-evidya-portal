import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(null, { status: 401 });
    }

    const providedToken = authHeader.substring(7);
    const expectedToken = process.env.DIAGNOSTIC_TOKEN;

    if (!expectedToken) {
      return new NextResponse(null, { status: 401 });
    }

    const providedBuffer = Buffer.from(providedToken, 'utf8');
    const expectedBuffer = Buffer.from(expectedToken, 'utf8');

    if (providedBuffer.length !== expectedBuffer.length) {
      return new NextResponse(null, { status: 401 });
    }

    const isMatch = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    if (!isMatch) {
      return new NextResponse(null, { status: 401 });
    }

    const hashValue = process.env.ADMIN_PASSWORD_HASH;
    if (!hashValue) {
      return NextResponse.json(
        { error: 'Environment variable not configured' },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    const sha256 = crypto.createHash('sha256').update(hashValue).digest('hex');

    return NextResponse.json(
      { sha256 },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}
