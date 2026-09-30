'use server';

import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';

export async function uploadDocument(
  smeId: string, 
  workEntryId: string, 
  type: string, 
  formData: FormData
) {
  try {
    await requireAuth(['ADMIN', 'ACCOUNTS']);
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    // Basic validation
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }

    const ext = file.name.split('.').pop();
    const storageKey = `sme_${smeId}_entry_${workEntryId}_type_${type}_${Date.now()}.${ext}`;
    
    // Upload via storage abstraction
    const filePath = await storage.upload(file, storageKey);

    // Check if document of this type already exists for this work entry
    const existing = await prisma.document.findFirst({
      where: { workEntryId, type }
    });

    let savedDoc;
    if (existing) {
      // Replace existing
      savedDoc = await prisma.document.update({
        where: { id: existing.id },
        data: {
          name: file.name,
          filePath,
          status: 'UPLOADED',
          version: { increment: 1 }
        }
      });
      // Optionally delete old file from storage here (if we track old storageKey)
    } else {
      // Create new
      savedDoc = await prisma.document.create({
        data: {
          name: file.name,
          type,
          status: 'UPLOADED',
          filePath,
          workEntryId,
          version: 1
        }
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: existing ? 'REPLACE_DOCUMENT' : 'UPLOAD_DOCUMENT',
        entity: 'Document',
        entityId: savedDoc.id,
        newData: `Uploaded file: ${file.name}`
      }
    });

    revalidatePath(`/smes/${smeId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Document upload error:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}
