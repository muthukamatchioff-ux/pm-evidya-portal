'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAILS = [
  'muthukamatchi.off@gmail.com',
  'harshitharamannimi@gmail.com'
];

export async function login(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const role = ADMIN_EMAILS.includes(normalizedEmail) ? 'ADMIN' : 'VISITOR';
  
  // Ensure user exists in DB and role is correctly synchronized
  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { role },
    create: {
      email: normalizedEmail,
      role,
      name: normalizedEmail.split('@')[0]
    }
  });

  const cookieStore = await cookies();
  cookieStore.set('user_email', normalizedEmail, { path: '/' });
  cookieStore.set('user_role', role, { path: '/' });
  revalidatePath('/');
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
  if (!email) return 'VISITOR'; // Default role
  
  const normalizedEmail = email.toLowerCase().trim();
  // Server-side source of truth for authorization
  return ADMIN_EMAILS.includes(normalizedEmail) ? 'ADMIN' : 'VISITOR';
}

export async function requireAuth(allowedRoles: string[]) {
  const role = await getRole();
  if (!allowedRoles.includes(role)) {
    throw new Error(`Unauthorized: Requires one of [${allowedRoles.join(', ')}] but got ${role}`);
  }
}
