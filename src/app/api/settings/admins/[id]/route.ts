import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRole } from '@/lib/auth';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const role = await getRole();
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const { status } = await request.json();

    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Ensure we don't deactivate the last admin
    if (status === 'INACTIVE') {
      const activeAdminsCount = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' } as any
      });
      
      const adminToUpdate = (await prisma.user.findUnique({ where: { id } })) as any;
      
      if (adminToUpdate?.status === 'ACTIVE' && activeAdminsCount <= 1) {
        return NextResponse.json({ error: 'Cannot deactivate the last active admin' }, { status: 400 });
      }
    }

    const updatedAdmin = await prisma.user.update({
      where: { id },
      data: { status } as any,
      select: {
        id: true,
        email: true,
        name: true,
        status: true
      } as any
    });

    return NextResponse.json(updatedAdmin);
  } catch (error) {
    console.error('Failed to update admin:', error);
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 });
  }
}
