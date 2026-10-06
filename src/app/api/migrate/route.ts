import { execSync } from 'child_process';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const output = execSync('npx prisma migrate deploy', { encoding: 'utf-8' });
    return NextResponse.json({ success: true, output });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, output: error.stdout });
  }
}
