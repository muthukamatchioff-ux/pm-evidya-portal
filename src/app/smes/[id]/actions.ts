'use server';

import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import { requireAuth, checkAuth, getEmail } from '@/lib/auth';

export async function uploadDocument(
  smeId: string, 
  workEntryId: string, 
  type: string, 
  formData: FormData
) {
  try {
    const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
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

    const userEmail = await getEmail();
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        action: existing ? 'REPLACE_DOCUMENT' : 'UPLOAD_DOCUMENT',
        entity: 'Document',
        entityId: savedDoc.id,
        newData: `Uploaded file: ${file.name}`,
        userId: userEmail
      }
    });

    revalidatePath(`/smes/${smeId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Document upload error:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
}

export async function updateSMERecord(smeId: string, entryId: string | undefined, data: any) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  
  try {
    // Update SME master data
    await prisma.sME.update({
      where: { id: smeId },
      data: {
        name: data.smeName,
        designation: data.smeDesignation,
        institute: data.smeInst,
        location: data.smePlace,
      } as any
    });

    // Update Work Entry data if it exists
    if (entryId) {
      await prisma.sMEWorkEntry.update({
        where: { id: entryId },
        data: {
          trade: data.trade,
          topic: data.topic,
          attendanceFrom: data.startDate ? new Date(data.startDate) : null,
          attendanceTo: data.endDate ? new Date(data.endDate) : null,
          days: data.totalDays,
          ratePerDay: data.ratePerDay,
          taAmount: data.taAmount,
          otherAmount: data.otherAmount,
        }
      });
      
      const payments = await prisma.payment.findMany({ where: { workEntryId: entryId } });
      if (payments.length > 0) {
        const baseAmount = (data.totalDays || 0) * (data.ratePerDay || 0);
        const totalCalculated = baseAmount + (data.taAmount || 0) + (data.otherAmount || 0);
        await prisma.payment.update({
          where: { id: payments[0].id },
          data: {
            grossAmount: baseAmount,
            taAmount: data.taAmount,
            otherAmount: data.otherAmount,
            totalAmount: totalCalculated,
          }
        });
      }
    }
    
    const userEmail = await getEmail();
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_SME_RECORD',
        entity: 'SME',
        entityId: smeId,
        newData: `Updated SME ${data.smeName} and Entry ${entryId || 'none'}`,
        userId: userEmail
      }
    });

    revalidatePath('/smes');
    revalidatePath(`/smes/${smeId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update SME:", error);
    return { success: false, error: "Failed to update SME Record." };
  }
}
