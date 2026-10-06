import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getRole, checkAuth, getEmail } from '@/lib/auth';

export async function GET() {
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const users = await prisma.user.findMany({
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
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
    if (!authCheck.success) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const creatorEmail = await getEmail();

    const { email, name, password, userRole, designation, department } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    const assignedRole = userRole === 'ADMIN' ? 'ADMIN' : 'TEAM_MEMBER';

    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        role: assignedRole,
        designation: designation || null,
        department: department || null,
        password: hashedPassword,
        status: 'ACTIVE',
        createdBy: creatorEmail || 'System Admin'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        designation: true,
        department: true,
        createdBy: true
      }
    });
    
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_USER',
        entity: 'User',
        entityId: newUser.id,
        newData: `Created user ${newUser.email} with role ${newUser.role}`,
        userId: creatorEmail
      }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
