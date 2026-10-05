'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = [
  'muthukamatchi.off@gmail.com',
  'harshitharamannimi@gmail.com'
];

function isAdminEmail(email: string) {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export async function login(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();

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

  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { role: 'ADMIN' },
    create: {
      email: normalizedEmail,
      role: 'ADMIN',
      name: normalizedEmail.split('@')[0]
    }
  });

  const cookieStore = await cookies();

  cookieStore.set('user_email', normalizedEmail, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8
  });

  cookieStore.set('user_role', 'ADMIN', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8
  });

  revalidatePath('/');

  return { success: true };
}

export async function logout() {
  const cookieStore = await cookies();

  cookieStore.delete('user_email');
  cookieStore.delete('user_role');

  revalidatePath('/');
}

export async function getEmail() {
  const cookieStore = await cookies();
  return cookieStore.get('user_email')?.value || null;
}

export async function getRole() {
  const cookieStore = await cookies();
  const email = cookieStore.get('user_email')?.value;

  if (!email) {
    return 'VISITOR';
  }

  return isAdminEmail(email) ? 'ADMIN' : 'VISITOR';
}

export async function requireAuth(allowedRoles: string[]) {
  const role = await getRole();

  if (!allowedRoles.includes(role)) {
    throw new Error(
      `Unauthorized: Requires one of [${allowedRoles.join(', ')}] but got ${role}`
    );
  }
}
