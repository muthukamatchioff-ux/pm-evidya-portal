import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRole, checkAuth } from '@/lib/auth';

export async function POST(req: Request) {
  const role = await getRole();
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  try {
    const data = await req.json();
    const hr = await prisma.humanResource.create({
      data: {
        name: data.name,
        role: data.role,
        baseSalary: data.baseSalary,
        joiningDate: new Date(data.joiningDate),
      }
    });
    return NextResponse.json(hr, { status: 201 });
  } catch (error) {
    console.error('HR Create Error:', error);
    return NextResponse.json({ error: 'Failed to create HR' }, { status: 500 });
  }
}
