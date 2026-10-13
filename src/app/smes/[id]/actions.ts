'use server';

import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import { requireAuth, checkAuth, getEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function uploadDocument(
  smeId: string, 
  workEntryId: string, 
  type: string, 
  formData: FormData
) {
  try {
    const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
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

    // Check if document of this type already exists for this work entry
    const existing = await prisma.document.findFirst({
      where: { workEntryId, type }
    });

    // General Viewer protection: strictly block overwriting or replacing existing documents
    if (authCheck.role === 'VIEWER' && existing) {
      return {
        success: false,
        error: 'A document of this type already exists for this Epic ID. As a General Viewer, you cannot overwrite, replace, or modify existing documents. Please contact the Administrator for corrections.'
      };
    }

    const ext = file.name.split('.').pop();
    const storageKey = `sme_${smeId}_entry_${workEntryId}_type_${type}_${Date.now()}.${ext}`;
    
    // Upload via storage abstraction
    const filePath = await storage.upload(file, storageKey);

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
    await logAudit({
      action: existing ? 'REPLACE_DOCUMENT' : 'UPLOAD_DOCUMENT',
      entity: 'Document',
      entityId: savedDoc.id,
      newData: `Uploaded file: ${file.name}`,
      userEmail
    });

    revalidatePath(`/smes/${smeId}`);
    revalidatePath('/accounts');
    revalidatePath('/documents');
    return { success: true, document: savedDoc };
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
    await logAudit({
      action: 'UPDATE_SME_RECORD',
      entity: 'SME',
      entityId: smeId,
      newData: `Updated SME ${data.smeName} and Entry ${entryId || 'none'}`,
      userEmail
    });

    revalidatePath('/smes');
    revalidatePath(`/smes/${smeId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update SME:", error);
    return { success: false, error: "Failed to update SME Record." };
  }
}

export async function deleteSMEWorkEntry(entryId: string) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;

  try {
    const entry = await prisma.sMEWorkEntry.findUnique({
      where: { id: entryId },
      include: { sme: true }
    });

    if (!entry) {
      return { success: false, error: 'SME Work Entry not found' };
    }

    const smeId = entry.smeId;
    const smeName = entry.sme?.name || 'Unknown SME';
    const trade = entry.trade || 'Unknown Trade';

    // Delete the work entry (cascades payments, documents, schedules, editor/animation records)
    await prisma.sMEWorkEntry.delete({
      where: { id: entryId }
    });

    // Check if parent SME has any remaining work entries
    const remainingCount = await prisma.sMEWorkEntry.count({
      where: { smeId }
    });

    if (remainingCount === 0) {
      try {
        await prisma.sME.delete({
          where: { id: smeId }
        });
      } catch (e) {
        console.warn('Could not delete parent SME record:', e);
      }
    }

    const userEmail = await getEmail();
    await logAudit({
      action: 'DELETE_SME_WORK_ENTRY',
      entity: 'SMEWorkEntry',
      entityId: entryId,
      newData: `Deleted SME Entry for ${smeName} (${trade})`,
      userEmail
    });

    revalidatePath('/smes');
    revalidatePath('/dashboard');
    revalidatePath('/reports');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete SME entry:', error);
    return { success: false, error: error.message || 'Failed to delete SME entry' };
  }
}

export async function updateSmePaymentInline(workEntryId: string, totalAmount: number, status: string) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;

  try {
    const existing = await prisma.payment.findFirst({
      where: { workEntryId }
    });

    if (existing) {
      await prisma.payment.update({
        where: { id: existing.id },
        data: {
          grossAmount: totalAmount,
          totalAmount: totalAmount,
          status: status,
          ...(status === 'COMPLETED' || status === 'PAID' ? { paymentDate: new Date() } : {})
        }
      });
    } else {
      await prisma.payment.create({
        data: {
          workEntryId,
          grossAmount: totalAmount,
          totalAmount: totalAmount,
          status: status,
          ...(status === 'COMPLETED' || status === 'PAID' ? { paymentDate: new Date() } : {})
        }
      });
    }

    const userEmail = await getEmail();
    await logAudit({
      action: 'UPDATE_PAYMENT_INLINE',
      entity: 'Payment',
      entityId: workEntryId,
      newData: `Updated Total Amount: ₹${totalAmount}, Status: ${status}`,
      userEmail
    });

    revalidatePath('/smes');
    revalidatePath('/accounts');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update SME payment inline:', error);
    return { success: false, error: error.message || 'Failed to update payment' };
  }
}

export async function saveGeneratedDocumentRecord(
  smeId: string,
  workEntryId: string,
  type: string,
  title: string
) {
  try {
    const authCheck = await checkAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER']);
    if (!authCheck.success) return authCheck;

    const existing = await prisma.document.findFirst({
      where: { workEntryId, type }
    });

    // General Viewer protection: strictly block overwriting or modifying existing documents
    if (authCheck.role === 'VIEWER' && existing) {
      return {
        success: false,
        error: 'A document for this stage already exists for this Epic ID. As a General Viewer, you cannot overwrite, recreate, or modify existing documents. Please contact the Administrator for corrections.'
      };
    }

    let savedDoc;
    if (existing) {
      savedDoc = await prisma.document.update({
        where: { id: existing.id },
        data: {
          name: title,
          status: 'GENERATED',
          version: { increment: 1 }
        }
      });
    } else {
      savedDoc = await prisma.document.create({
        data: {
          name: title,
          type,
          status: 'GENERATED',
          workEntryId,
          version: 1
        }
      });
    }

    const userEmail = await getEmail();
    await logAudit({
      action: existing ? 'UPDATE_GENERATED_DOCUMENT' : 'CREATE_GENERATED_DOCUMENT',
      entity: 'Document',
      entityId: savedDoc.id,
      newData: `Generated document: ${title} (${type})`,
      userEmail
    });

    revalidatePath(`/smes/${smeId}`);
    revalidatePath('/documents');
    return { success: true, document: savedDoc };
  } catch (error: any) {
    console.error('Save generated document error:', error);
    return { success: false, error: error.message || 'Failed to save generated document record' };
  }
}

