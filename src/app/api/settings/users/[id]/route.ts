import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth, getEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = await context.params;
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }

    const body = await request.json();
    const { name, email, status, role, department, designation } = body;
    const actorEmail = await getEmail();

    const dataToUpdate: any = {};

    // 1. Name validation
    if (name !== undefined) {
      dataToUpdate.name = (name || '').trim();
    }

    // 2. Email validation and duplicate checking
    if (email !== undefined) {
      const normalizedEmail = (email || '').toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
      }

      if (normalizedEmail !== targetUser.email.toLowerCase().trim()) {
        const existingWithEmail = await prisma.user.findFirst({
          where: {
            email: normalizedEmail,
            NOT: { id }
          }
        });
        if (existingWithEmail) {
          return NextResponse.json({ error: `A user with the email address "${normalizedEmail}" already exists.` }, { status: 400 });
        }
        dataToUpdate.email = normalizedEmail;
      }
    }

    // 3. Status validation & last active admin protection
    if (status !== undefined) {
      if (status !== 'ACTIVE' && status !== 'INACTIVE') {
        return NextResponse.json({ error: 'Invalid status. Allowed values: ACTIVE, INACTIVE.' }, { status: 400 });
      }

      if (status === 'INACTIVE' && targetUser.role === 'ADMIN' && targetUser.status === 'ACTIVE') {
        const activeAdminsCount = await prisma.user.count({
          where: { role: 'ADMIN', status: 'ACTIVE' }
        });
        if (activeAdminsCount <= 1) {
          return NextResponse.json({ error: 'Security Protection: Cannot deactivate the last active Admin account. The portal requires at least one active Administrator.' }, { status: 400 });
        }
      }
      dataToUpdate.status = status;
    }

    // 4. Role validation & admin demotion protection
    if (role !== undefined) {
      const validRoles = ['ADMIN', 'CAMERAMAN', 'EDITOR', 'VIEWER', 'TEAM_MEMBER', 'HIGHER_OFFICIAL_VIEWER'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: `Invalid role "${role}". Allowed roles: ${validRoles.join(', ')}` }, { status: 400 });
      }

      if (targetUser.role === 'ADMIN' && role !== 'ADMIN' && targetUser.status === 'ACTIVE') {
        const activeAdminsCount = await prisma.user.count({
          where: { role: 'ADMIN', status: 'ACTIVE' }
        });
        if (activeAdminsCount <= 1) {
          return NextResponse.json({ error: 'Security Protection: Cannot demote the last active Admin account. The portal requires at least one active Administrator.' }, { status: 400 });
        }
      }
      dataToUpdate.role = role;
    }

    // 5. Department (Assigned Epic IDs) & Designation
    if (department !== undefined) {
      dataToUpdate.department = department ? department.trim() : null;
    }

    if (designation !== undefined) {
      dataToUpdate.designation = designation ? designation.trim() : null;
    }

    // Execute update directly in database
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
      }
    });

    await logAudit({
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: id,
      newData: `Updated user properties: ${JSON.stringify(dataToUpdate)}`,
      userEmail: actorEmail || 'Admin'
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = await context.params;
    const actorEmail = await getEmail();

    // 1. Fetch user with historical and production relations
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        cameramanEntries: { select: { id: true }, take: 1 },
        editorEntries: { select: { id: true }, take: 1 },
        cameramanSchedules: { select: { id: true }, take: 1 },
        editorRecords: { select: { id: true }, take: 1 },
        auditLogs: { select: { id: true }, take: 1 }
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }

    // 2. Prevent deleting currently logged-in Admin account
    if (actorEmail && targetUser.email.toLowerCase().trim() === actorEmail.toLowerCase().trim()) {
      return NextResponse.json({
        error: 'Security Protection: You cannot delete or revoke access for your own currently logged-in Admin account.'
      }, { status: 400 });
    }

    // 3. Prevent deleting the last active Admin account
    if (targetUser.role === 'ADMIN' && targetUser.status === 'ACTIVE') {
      const activeAdminsCount = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' }
      });
      if (activeAdminsCount <= 1) {
        return NextResponse.json({
          error: 'Security Protection: Cannot delete or deactivate the last active Admin account. The portal requires at least one active Administrator.'
        }, { status: 400 });
      }
    }

    // 4. Referential safety check: Has this user been assigned or created records?
    const isReferenced =
      targetUser.cameramanEntries.length > 0 ||
      targetUser.editorEntries.length > 0 ||
      targetUser.cameramanSchedules.length > 0 ||
      targetUser.editorRecords.length > 0 ||
      targetUser.auditLogs.length > 0;

    if (isReferenced) {
      // Safe Soft Deactivation: revoke access, set status to INACTIVE, preserve historical data and assigned epics
      const deactivatedUser = await prisma.user.update({
        where: { id },
        data: {
          status: 'INACTIVE'
        },
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
        }
      });

      await logAudit({
        action: 'DEACTIVATE_USER_SAFE',
        entity: 'User',
        entityId: id,
        newData: `User ${targetUser.email} (${targetUser.role}) safely deactivated. Historical records and audit trail preserved.`,
        userEmail: actorEmail || 'Admin'
      });

      return NextResponse.json({
        success: true,
        action: 'DEACTIVATED',
        message: `User ${targetUser.name || targetUser.email} is referenced by existing production/audit records. Access has been safely revoked and account set to INACTIVE to preserve audit integrity.`,
        user: deactivatedUser
      });
    }

    // 5. If completely unreferenced, execute safe permanent deletion
    await prisma.user.delete({
      where: { id }
    });

    await logAudit({
      action: 'DELETE_USER_PERMANENT',
      entity: 'User',
      entityId: id,
      newData: `User ${targetUser.email} (${targetUser.role}) permanently deleted.`,
      userEmail: actorEmail || 'Admin'
    });

    return NextResponse.json({
      success: true,
      action: 'DELETED',
      message: `User ${targetUser.name || targetUser.email} has been permanently deleted.`,
      deletedId: id
    });
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}
