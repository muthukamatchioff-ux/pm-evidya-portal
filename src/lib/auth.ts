'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = [
  'muthukamatchi.off@gmail.com',
  'harshitharamannimi@gmail.com'
];

const SESSION_SECRET = process.env.ADMIN_PASSWORD_HASH || 'fallback_secret_key_12345';
const encoder = new TextEncoder();

async function getCryptoKey() {
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signSession(data: string): Promise<string> {
  const key = await getCryptoKey();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signature = bufferToHex(signatureBuffer);
  return `${data}.${signature}`;
}

export async function verifySession(token: string | undefined): Promise<any | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  
  const key = await getCryptoKey();
  const expectedSignatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const expectedSignature = bufferToHex(expectedSignatureBuffer);
  
  if (signature === expectedSignature) {
    try {
      return JSON.parse(atob(data));
    } catch (e) {
      return null;
    }
  }
  return null;
}

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

  // First, check DB for dynamically created admins
  const dbUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (dbUser && (dbUser.role === 'ADMIN' || dbUser.role === 'TEAM_MEMBER')) {
    if (dbUser.status !== 'ACTIVE') {
      return { success: false, error: 'Account is deactivated.' };
    }
    // If DB user has a password, verify against it
    if (dbUser.password) {
      const passwordValid = await bcrypt.compare(password, dbUser.password);
      if (passwordValid) {
        // Update lastLogin on successful login
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { lastLogin: new Date() }
        });
        return await createSession(normalizedEmail, dbUser.role);
      }
      return { success: false, error: 'Invalid credentials.' };
    }
  }

  // Fallback for legacy hardcoded admins (e.g. from environment variable)
  if (!isAdminEmail(normalizedEmail)) {
    return { success: false, error: 'Invalid admin credentials.' };
  }

  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!passwordHash) {
    console.error('ADMIN_PASSWORD_HASH is not configured.');
    return { success: false, error: 'Admin authentication is not configured.' };
  }

  const passwordValid = await bcrypt.compare(password, passwordHash);

  if (!passwordValid) {
    return { success: false, error: 'Invalid admin credentials.' };
  }

  // Upsert legacy user in DB
  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { role: 'ADMIN' },
    create: {
      email: normalizedEmail,
      role: 'ADMIN',
      name: normalizedEmail.split('@')[0]
    }
  });

  return await createSession(normalizedEmail, 'ADMIN');
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

export async function requireAuth(allowedRoles: string[]) {
  const role = await getRole();

  if (!allowedRoles.includes(role)) {
    throw new Error(
      `Unauthorized: Requires one of [${allowedRoles.join(', ')}] but got ${role}`
    );
  }
}
