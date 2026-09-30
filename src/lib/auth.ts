'use server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function setRole(role: string) {
  const cookieStore = await cookies();
  cookieStore.set('user_role', role, { path: '/' });
  revalidatePath('/');
}

export async function getRole() {
  const cookieStore = await cookies();
  return cookieStore.get('user_role')?.value || 'ADMIN';
}

export async function requireAuth(allowedRoles: string[]) {
  const role = await getRole();
  if (!allowedRoles.includes(role)) {
    throw new Error(`Unauthorized: Requires one of [${allowedRoles.join(', ')}] but got ${role}`);
  }
}
