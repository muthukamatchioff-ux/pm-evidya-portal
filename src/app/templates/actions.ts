'use server';

import { updateTemplate } from '@/lib/templates';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function saveTemplateData(id: string, subject: string, body: string) {
  try {
    await requireAuth(['ADMIN']);
    await updateTemplate(id, { subject, body });
    
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_TEMPLATE',
        entity: 'Template',
        entityId: id,
        newData: `Updated template ${id}`
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
