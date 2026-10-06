'use server';

import { prisma } from '@/lib/prisma';
import {  getEmail , checkAuth } from '@/lib/auth';

export async function logDocumentGeneration(docType: string, smeId: string, entryId: string) {
  try {
    const userEmail = await getEmail();
    
    await prisma.auditLog.create({
      data: {
        action: 'GENERATE_DOCUMENT',
        entity: 'DocumentTemplate',
        entityId: docType,
        newData: `Generated ${docType} for SME ${smeId}, Entry ${entryId}`,
        userId: userEmail || 'Unknown'
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to log document generation:', error);
    return { success: false };
  }
}
