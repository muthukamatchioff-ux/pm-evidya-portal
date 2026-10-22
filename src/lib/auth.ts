'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = [
  'muthukamatchi.off@gmail.com',
  'harshitharaman.nimi@gmail.com',
  'harshitharamannimi@gmail.com'
];

interface HigherOfficialConfig {
  email: string;
  name: string;
  designation: string;
  department: string;
}

const HIGHER_OFFICIAL_ACCOUNTS: HigherOfficialConfig[] = [
  {
    email: 'ashfaq.nimi@gmail.com',
    name: 'Ashfaq',
    designation: 'Higher Official Viewer',
    department: 'Review Authority'
  },
  {
    email: 'rajeswari.m41@gov.in',
    name: 'Rajeswari M',
    designation: 'Higher Official Viewer',
    department: 'Review Authority'
  }
];

function getHigherOfficialConfig(email: string): HigherOfficialConfig | undefined {
  return HIGHER_OFFICIAL_ACCOUNTS.find(a => a.email.toLowerCase().trim() === email.toLowerCase().trim());
}

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
  const officialConfig = getHigherOfficialConfig(normalizedEmail);

  // First, always check DB for users (including admins and higher officials)
  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (dbUser && (dbUser.role === 'ADMIN' || dbUser.role === 'TEAM_MEMBER' || dbUser.role === 'VIEWER' || dbUser.role === 'CAMERAMAN' || dbUser.role === 'EDITOR' || dbUser.role === 'HIGHER_OFFICIAL_VIEWER')) {
      if (dbUser.status !== 'ACTIVE' && !isAdminEmail(normalizedEmail) && !officialConfig) {
        return { success: false, error: 'Account is deactivated.' };
      }
      // If DB user has a password, verify against it
      if (dbUser.password) {
        const passwordValid = await bcrypt.compare(password, dbUser.password);
        if (passwordValid) {
          // Update lastLogin and ensure ACTIVE on successful login
          try {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { 
                lastLogin: new Date(),
                ...(isAdminEmail(normalizedEmail) ? { status: 'ACTIVE', role: 'ADMIN' } : {}),
                ...(officialConfig ? { status: 'ACTIVE', role: 'HIGHER_OFFICIAL_VIEWER' } : {})
              }
            });
          } catch(e) {
            console.warn('Could not update last login', e);
          }
          return await createSession(normalizedEmail, isAdminEmail(normalizedEmail) ? 'ADMIN' : dbUser.role);
        }
        // If DB password check fails, allow admin or higher official fallback to check
        if (!isAdminEmail(normalizedEmail) && !officialConfig) {
          return { success: false, error: 'Invalid credentials.' };
        }
      }
    }
  } catch (error) {
    console.warn('Database query failed during login, falling back to ENV/official config', error);
  }

  // Higher Official Account Verification & Self-Healing Provisioning
  if (officialConfig) {
    const expectedPassword = process.env.HIGHER_OFFICIAL_PASSWORD || 'Nimi@2026';
    if (password === expectedPassword) {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.upsert({
          where: { email: normalizedEmail },
          update: {
            role: 'HIGHER_OFFICIAL_VIEWER',
            status: 'ACTIVE',
            lastLogin: new Date(),
            password: hashedPassword
          },
          create: {
            email: normalizedEmail,
            name: officialConfig.name,
            role: 'HIGHER_OFFICIAL_VIEWER',
            status: 'ACTIVE',
            designation: officialConfig.designation,
            department: officialConfig.department,
            password: hashedPassword,
            lastLogin: new Date(),
            createdBy: 'System Provisioning'
          }
        });
      } catch (e) {
        console.warn('Failed to upsert higher official user in DB, proceeding with session', e);
      }
      return await createSession(normalizedEmail, 'HIGHER_OFFICIAL_VIEWER');
    }
  }

  // Fallback: If DB check failed or password was wrong, and this is an Admin Email, check the .env hash
  if (isAdminEmail(normalizedEmail)) {
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!passwordHash) {
      console.error('ADMIN_PASSWORD_HASH is not configured.');
      return { success: false, error: 'Invalid admin credentials.' };
    }
    // Strip leading and trailing quotes if the user accidentally included them in Vercel dashboard
    let finalHash = passwordHash.replace(/^["']|["']$/g, '');

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

    const passwordValid = await bcrypt.compare(password, finalHash);

    if (!passwordValid) {
      return { success: false, error: 'Invalid admin credentials.' };
    }

    // Upsert legacy user in DB
    try {
      await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: { role: 'ADMIN', status: 'ACTIVE', lastLogin: new Date(), password: finalHash },
        create: {
          email: normalizedEmail,
          role: 'ADMIN',
          status: 'ACTIVE',
          name: normalizedEmail.split('@')[0],
          password: finalHash,
          lastLogin: new Date()
        }
      });
    } catch (e) {
      console.warn('DB upsert failed, continuing admin login', e);
    }

    return await createSession(normalizedEmail, 'ADMIN');
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

const getCachedEmail = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const session = await verifySession(token);
  return session ? session.email : null;
});

export async function getEmail() {
  return await getCachedEmail();
}

const getCachedRole = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const session = await verifySession(token);
  
  if (session && session.role) {
    if (session.exp && Date.now() > session.exp) return 'VISITOR';
    return session.role;
  }

  return 'VISITOR';
});

export async function getRole() {
  return await getCachedRole();
}

import { redirect } from 'next/navigation';

export async function checkAuth(allowedRoles: string[]): Promise<{ success: true; role: string } | { success: false; error: string; status: number; role?: string }> {
  const role = await getRole();
  if (role === 'VISITOR') {
    return { success: false, error: 'Authentication required.', status: 401, role };
  }

  // HIGHER_OFFICIAL_VIEWER is granted view-access wherever VIEWER is allowed
  const effectiveAllowed = allowedRoles.includes('VIEWER')
    ? [...allowedRoles, 'HIGHER_OFFICIAL_VIEWER']
    : allowedRoles;

  if (!effectiveAllowed.includes(role)) {
    return { success: false, error: 'You are not authorized to perform this action.', status: 403, role };
  }
  return { success: true, role };
}

export async function requireAuth(allowedRoles: string[]) {
  const role = await getRole();

  if (role === 'VISITOR') {
    redirect('/login');
  }

  // HIGHER_OFFICIAL_VIEWER is granted view-access wherever VIEWER is allowed
  const effectiveAllowed = allowedRoles.includes('VIEWER')
    ? [...allowedRoles, 'HIGHER_OFFICIAL_VIEWER']
    : allowedRoles;

  if (!effectiveAllowed.includes(role)) {
    redirect('/dashboard?error=forbidden');
  }
}

const getCachedCurrentUser = cache(async () => {
  const email = await getEmail();
  if (!email) return null;
  return await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  });
});

export async function getCurrentUser() {
  return await getCachedCurrentUser();
}

import { parseAssignedEpics as parseEpicsSync } from './epicHelpers';

export async function parseAssignedEpics(departmentStr: string | null | undefined): Promise<number[]> {
  return parseEpicsSync(departmentStr);
}
