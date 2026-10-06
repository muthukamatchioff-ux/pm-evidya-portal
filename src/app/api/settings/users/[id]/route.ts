import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRole, checkAuth, getEmail } from '@/lib/auth';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
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

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status } as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        designation: true,
        department: true,
        lastLogin: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true
      } as any
    });
    
    const actorEmail = await getEmail();
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_USER_STATUS',
        entity: 'User',
        entityId: id,
        newData: `Changed status to ${status}`,
        userId: actorEmail
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
