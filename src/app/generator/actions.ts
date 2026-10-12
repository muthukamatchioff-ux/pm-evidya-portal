'use server';

import { prisma } from '@/lib/prisma';
import { getEmail, checkAuth } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function logDocumentGeneration(docType: string, smeId: string, entryId: string) {
  try {
    const userEmail = await getEmail();
    
    await logAudit({
      action: 'GENERATE_DOCUMENT',
      entity: 'DocumentTemplate',
      entityId: docType,
      newData: `Generated ${docType} for SME ${smeId}, Entry ${entryId}`,
      userEmail
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to log document generation:', error);
    return { success: false };
  }
}
