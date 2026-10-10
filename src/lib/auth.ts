'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = [
  'muthukamatchi.off@gmail.com',
  'harshitharamannimi@gmail.com'
];

import { signSession, verifySession } from './session';

function isAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

async function createSession(email: string, role: string) {
  const cookieStore = await cookies();
  
  const payload = btoa(JSON.stringify({ email, role, exp: Date.now() + 60 * 60 * 8 * 1000 }));
  const signedToken = await signSession(payload);

  cookieStore.set('session_token', signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8
  });

  revalidatePath('/');
  return { success: true };
}

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (isAdminEmail(normalizedEmail)) {
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!passwordHash) {
      console.error('ADMIN_PASSWORD_HASH is not configured.');
      return { success: false, error: 'Admin authentication is not configured.' };
    }

    let finalHash = passwordHash;

    // Explicit documented encoding mode to bypass Vercel parsing mutations
    if (passwordHash.startsWith('b64:')) {
      const b64Payload = passwordHash.slice(4);
      // Strict Base64 structure validation
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64Payload)) {
        return { success: false, error: 'Invalid admin hash format configuration.' };
      }
      finalHash = Buffer.from(b64Payload, 'base64').toString('utf-8');

      // Canonical Base64 check: re-encode and ensure strict match
      if (Buffer.from(finalHash, 'utf-8').toString('base64') !== b64Payload) {
        return { success: false, error: 'Invalid admin hash format configuration.' };
      }
    }

    // Validate decoded or raw result as a strict bcrypt hash before comparison
    const isValidBcryptFormat = /^\$2[aby]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(finalHash);
    if (!isValidBcryptFormat) {
      return { success: false, error: 'Invalid admin hash format configuration.' };
    }

    const passwordValid = await bcrypt.compare(password, finalHash);

    if (!passwordValid) {
      return { success: false, error: 'Invalid admin credentials.' };
    }

    // Upsert legacy user in DB
    try {
      await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: { role: 'ADMIN' },
        create: {
          email: normalizedEmail,
          role: 'ADMIN',
          name: normalizedEmail.split('@')[0]
        }
      });
    } catch (e) {
      console.warn('DB upsert failed, continuing admin login', e);
    }

    return await createSession(normalizedEmail, 'ADMIN');
  }

  // First, check DB for dynamically created users
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (dbUser && (dbUser.role === 'ADMIN' || dbUser.role === 'TEAM_MEMBER' || dbUser.role === 'VIEWER')) {
      if (dbUser.status !== 'ACTIVE') {
        return { success: false, error: 'Account is deactivated.' };
      }
      // If DB user has a password, verify against it
      if (dbUser.password) {
        const passwordValid = await bcrypt.compare(password, dbUser.password);
        if (passwordValid) {
          // Update lastLogin on successful login
          try {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { lastLogin: new Date() }
            });
          } catch(e) {
            console.warn('Could not update last login', e);
          }
          return await createSession(normalizedEmail, dbUser.role);
        }
        return { success: false, error: 'Invalid credentials.' };
      }
    }
  } catch (error) {
    console.error('Database query failed during login', error);
    return { success: false, error: 'Database connection error. Please try again later.' };
  }

  return { success: false, error: 'Invalid credentials.' };
}

export async function register(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  // Prevent registration using admin emails
  if (isAdminEmail(normalizedEmail)) {
    return { success: false, error: 'Cannot register with an admin email.' };
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: passwordHash,
        name: normalizedEmail.split('@')[0],
        role: 'VIEWER',
        status: 'INACTIVE', // Requires admin approval, safe default
      }
    });

    return { success: true };
  } catch (err) {
    console.error('Error creating user:', err);
    return { success: false, error: 'Registration failed due to a server error.' };
  }
}

export async function logout() {
  const cookieStore = await cookies();

  cookieStore.delete('session_token');
  cookieStore.delete('user_email'); // keeping for backward compatibility cleanup if needed
  cookieStore.delete('user_role'); // keeping for backward compatibility cleanup if needed

  revalidatePath('/');
}

export async function getEmail() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const session = await verifySession(token);
  return session ? session.email : null;
}

export async function getRole() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const session = await verifySession(token);
  
  if (session && session.role) {
    if (session.exp && Date.now() > session.exp) return 'VISITOR';
    return session.role;
  }

  return 'VISITOR';
}

import { redirect } from 'next/navigation';

export async function checkAuth(allowedRoles: string[]) {
  const role = await getRole();
  if (role === 'VISITOR') {
    return { success: false, error: 'Authentication required.', status: 401 };
  }
  if (!allowedRoles.includes(role)) {
    return { success: false, error: 'You are not authorized to perform this action.', status: 403 };
  }
  return { success: true };
}

export async function requireAuth(allowedRoles: string[]) {
  const role = await getRole();

  if (role === 'VISITOR') {
    redirect('/login');
  }

  if (!allowedRoles.includes(role)) {
    redirect('/dashboard?error=forbidden');
  }
}
