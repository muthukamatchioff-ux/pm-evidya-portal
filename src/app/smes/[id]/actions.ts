'use server';

import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import { requireAuth, checkAuth, getEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { clearSmeListCache } from '@/app/smes/cache';

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

    const typeCandidates = [type];
    if (type === 'APPROVAL_LETTER' || type === 'STAGE_A_APPROVAL_LETTER') {
      typeCandidates.push('APPROVAL_LETTER', 'STAGE_A_APPROVAL_LETTER');
    } else if (type === 'WORK_COMPLETION' || type === 'STAGE_B_WORK_COMPLETION') {
      typeCandidates.push('WORK_COMPLETION', 'STAGE_B_WORK_COMPLETION');
    } else if (type === 'SME_ATTENDANCE' || type === 'ATTENDANCE' || type === 'TRADE_DETAILS') {
      typeCandidates.push('SME_ATTENDANCE', 'ATTENDANCE', 'TRADE_DETAILS');
    } else if (type === 'PAYMENT_NOTE' || type === 'STAGE_C_REMUNERATION') {
      typeCandidates.push('PAYMENT_NOTE', 'STAGE_C_REMUNERATION');
    }

    const existing = await prisma.document.findFirst({
      where: {
        workEntryId,
        type: { in: typeCandidates }
      },
      orderBy: { version: 'desc' }
    });

    // General Viewer protection: strictly block overwriting or replacing existing documents
    if (authCheck.role === 'VIEWER' && existing && existing.status === 'UPLOADED') {
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
      if (existing.status === 'UPLOADED') {
        // Create new version to preserve original file of each version
        const nextVersion = (existing.version || 1) + 1;
        savedDoc = await prisma.document.create({
          data: {
            name: file.name,
            type,
            status: 'UPLOADED',
            filePath,
            workEntryId,
            version: nextVersion
          }
        });
      } else {
        // Upgrade existing metadata/placeholder to UPLOADED with the actual file
        savedDoc = await prisma.document.update({
          where: { id: existing.id },
          data: {
            name: file.name,
            type,
            filePath,
            status: 'UPLOADED',
            version: 1
          }
        });

        // Also synchronize any companion records for this work entry
        try {
          await prisma.document.updateMany({
            where: {
              workEntryId,
              type: { in: typeCandidates },
              id: { not: existing.id }
            },
            data: {
              filePath,
              status: 'UPLOADED'
            }
          });
        } catch {}
      }
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
    revalidatePath('/dashboard');
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
    // 1. Locate or ensure the SME record in the database
    let existingSme = await prisma.sME.findUnique({ where: { id: smeId } });
    if (!existingSme && data.smeName) {
      existingSme = await prisma.sME.findFirst({
        where: { name: { equals: data.smeName.trim(), mode: 'insensitive' } }
      });
      if (existingSme) {
        smeId = existingSme.id;
      }
    }

    const smePayload = {
      name: data.smeName,
      designation: data.smeDesignation || null,
      institute: data.smeInst || null,
      location: data.smePlace || null,
      address: data.smeAddress !== undefined ? data.smeAddress : null,
      email: data.smeEmail !== undefined ? (data.smeEmail ? data.smeEmail.trim() : null) : null,
      contactNumber: data.smeContact !== undefined ? (data.smeContact ? data.smeContact.trim() : null) : null,
    };

    const updateSmePromise = existingSme
      ? prisma.sME.update({ where: { id: smeId }, data: smePayload as any })
      : prisma.sME.create({ data: { id: smeId, ...smePayload, status: 'ACTIVE' } as any });

    // 2. Update Work Entry data
    const workEntryWhere = entryId 
      ? { OR: [{ id: entryId }, { smeId }] } 
      : { smeId };

    const existingEntry = await prisma.sMEWorkEntry.findFirst({ where: workEntryWhere });
    let updateEntryPromise: Promise<any> = Promise.resolve();

    if (existingEntry) {
      const baseAmount = (data.totalDays || 0) * (data.ratePerDay || 0);
      const totalCalculated = baseAmount + (data.taAmount || 0) + (data.otherAmount || 0);

      updateEntryPromise = (async () => {
        await prisma.sMEWorkEntry.update({
          where: { id: existingEntry.id },
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

        const payments = await prisma.payment.findMany({ where: { workEntryId: existingEntry.id } });
        if (payments.length > 0) {
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
      })();
    }

    // Run updates concurrently
    await Promise.all([updateSmePromise, updateEntryPromise]);

    // Clear SME list in-memory cache
    clearSmeListCache();

    // Asynchronous audit log
    getEmail().then(userEmail => {
      logAudit({
        action: 'UPDATE_SME_RECORD',
        entity: 'SME',
        entityId: smeId,
        newData: `Updated SME ${data.smeName} and Entry ${entryId || 'none'}`,
        userEmail
      }).catch(() => null);
    }).catch(() => null);

    // Fast synchronous revalidation for immediate reflection
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
    // 1. Intercept synthetic entries (e.g. from orphan SME records)
    if (entryId.startsWith('entry_synth_')) {
      const orphanSmeId = entryId.replace('entry_synth_', '');
      try { await prisma.document.deleteMany({ where: { workEntry: { smeId: orphanSmeId } } }); } catch (_) {}
      try { await prisma.payment.deleteMany({ where: { workEntry: { smeId: orphanSmeId } } }); } catch (_) {}
      try { await prisma.sMEWorkEntry.deleteMany({ where: { smeId: orphanSmeId } }); } catch (_) {}
      try { await prisma.sME.delete({ where: { id: orphanSmeId } }); } catch (_) {}
      clearSmeListCache();
      revalidatePath('/smes');
      revalidatePath('/dashboard');
      revalidatePath('/reports');
      return { success: true };
    }

    const entry = await prisma.sMEWorkEntry.findUnique({
      where: { id: entryId },
      include: { sme: true }
    });

    if (!entry) {
      // 2. Intercept if entryId is an orphan SME ID directly
      const directSme = await prisma.sME.findUnique({ where: { id: entryId } });
      if (directSme) {
        try { await prisma.document.deleteMany({ where: { workEntry: { smeId: entryId } } }); } catch (_) {}
        try { await prisma.payment.deleteMany({ where: { workEntry: { smeId: entryId } } }); } catch (_) {}
        try { await prisma.sMEWorkEntry.deleteMany({ where: { smeId: entryId } }); } catch (_) {}
        try { await prisma.sME.delete({ where: { id: entryId } }); } catch (_) {}
        clearSmeListCache();
        revalidatePath('/smes');
        revalidatePath('/dashboard');
        revalidatePath('/reports');
        return { success: true };
      }
      return { success: false, error: 'SME Work Entry not found' };
    }

    const smeId = entry.smeId;
    const smeName = entry.sme?.name || 'Unknown SME';
    const trade = entry.trade || 'Unknown Trade';

    // 3. Clean up child documents and payments first to avoid foreign key constraints
    try { await prisma.document.deleteMany({ where: { workEntryId: entryId } }); } catch (_) {}
    try { await prisma.payment.deleteMany({ where: { workEntryId: entryId } }); } catch (_) {}

    // Delete the work entry
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

    clearSmeListCache();
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

