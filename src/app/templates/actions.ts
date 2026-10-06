'use server';

import { updateTemplate } from '@/lib/templates';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkAuth, getEmail } from '@/lib/auth';

export async function saveTemplateData(id: string, subject: string, body: string) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
    const userEmail = await getEmail();
    await updateTemplate(id, { subject, body });
    
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_TEMPLATE',
        entity: 'Template',
        entityId: id,
        newData: `Updated template ${id}`,
        userId: userEmail
      }
    });

    revalidatePath('/templates');
    revalidatePath('/generator');
    return { success: true };
  } catch (error) {
    console.error('Failed to update template:', error);
    return { success: false, error: 'Failed to update template' };
  }
}
