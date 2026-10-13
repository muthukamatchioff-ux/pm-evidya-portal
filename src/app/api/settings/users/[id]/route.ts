import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRole, checkAuth, getEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status, role, department, designation } = body;

    const dataToUpdate: any = {};

    if (status !== undefined) {
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
      dataToUpdate.status = status;
    }

    if (role !== undefined) {
      const validRoles = ['ADMIN', 'CAMERAMAN', 'EDITOR', 'VIEWER', 'TEAM_MEMBER'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      dataToUpdate.role = role;
    }

    if (department !== undefined) {
      dataToUpdate.department = department;
    }

    if (designation !== undefined) {
      dataToUpdate.designation = designation;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
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
    await logAudit({
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      newData: `Updated user properties: ${JSON.stringify(dataToUpdate)}`,
      userEmail: actorEmail
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
