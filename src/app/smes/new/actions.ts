'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { checkAuth, getEmail } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function createSMEWithEntry(formData: FormData) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  
  // Extract SME details
  const name = (formData.get('name') as string)?.trim();
  const designation = (formData.get('designation') as string)?.trim() || null;
  const institute = (formData.get('institute') as string)?.trim() || null;
  const location = (formData.get('location') as string)?.trim() || null;
  const address = (formData.get('address') as string)?.trim() || null;
  
  if (!name) {
    return { success: false, error: 'SME Name is required' };
  }

  // Extract Work Entry details
  const trade = ((formData.get('trade') as string) || 'General').trim();
  const topic = ((formData.get('topic') as string) || 'PM e-Vidya Content Development').trim();
  
  const attendanceFromStr = formData.get('attendanceFrom') as string;
  const attendanceToStr = formData.get('attendanceTo') as string;
  
  const days = parseFloat(formData.get('days') as string) || 0;
  const ratePerDay = parseFloat(formData.get('ratePerDay') as string) || 1500;
  const taAmount = parseFloat(formData.get('taAmount') as string) || 0;
  const otherAmount = parseFloat(formData.get('otherAmount') as string) || 0;

  const attendanceFrom = attendanceFromStr ? new Date(attendanceFromStr) : null;
  const attendanceTo = attendanceToStr ? new Date(attendanceToStr) : null;

  const totalAmount = (days * ratePerDay) + taAmount + otherAmount;

  const smeId = 'sme_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const workEntryId = 'entry_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  try {
    // 1. Get next epicSequence safely
    let nextSeq = 21;
    try {
      const maxRes: any = await prisma.$queryRawUnsafe('SELECT COALESCE(MAX("epicSequence"), 0) as max FROM "SMEWorkEntry";');
      if (maxRes && maxRes[0] && maxRes[0].max !== undefined && maxRes[0].max !== null) {
        nextSeq = Math.max(Number(maxRes[0].max) + 1, 21);
      }
    } catch (_) {}

    // 2. Insert SME safely
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SME" ("id", "name", "designation", "institute", "location", "address", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW(), NOW());`,
      smeId, name, designation, institute, location, address
    );

    // 3. Insert SMEWorkEntry safely
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SMEWorkEntry" ("id", "smeId", "trade", "topic", "attendanceFrom", "attendanceTo", "days", "ratePerDay", "taAmount", "otherAmount", "status", "epicSequence", "isPublished", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11, true, NOW(), NOW());`,
      workEntryId, smeId, trade, topic, attendanceFrom, attendanceTo, days, ratePerDay, taAmount, otherAmount, nextSeq
    );

    // 4. Insert Payment safely
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Payment" ("id", "workEntryId", "grossAmount", "taAmount", "otherAmount", "totalAmount", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', NOW(), NOW());`,
      paymentId, workEntryId, days * ratePerDay, taAmount, otherAmount, totalAmount
    );

    // 5. Generate Initial Documents
    const docPrefix = Date.now().toString();
    const docTypes = [
      { id: `doc_app_${docPrefix}`, type: 'APPROVAL_LETTER', name: `Approval Letter - EPIC-2026-PMeVidya ${nextSeq}` },
      { id: `doc_dep_${docPrefix}`, type: 'DEPUTATION_LETTER', name: `Deputation Letter - EPIC-2026-PMeVidya ${nextSeq}` },
      { id: `doc_att_${docPrefix}`, type: 'ATTENDANCE_CERTIFICATE', name: `Attendance Certificate - EPIC-2026-PMeVidya ${nextSeq}` },
      { id: `doc_comp_${docPrefix}`, type: 'WORK_COMPLETION_CERTIFICATE', name: `Work Completion Certificate - EPIC-2026-PMeVidya ${nextSeq}` }
    ];
    for (const d of docTypes) {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "Document" ("id", "name", "type", "status", "version", "workEntryId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'GENERATED', 1, $4, NOW(), NOW());`,
          d.id, d.name, d.type, workEntryId
        );
      } catch (_) {}
    }

    const userEmail = await getEmail();
    await logAudit({
      action: 'CREATE',
      entity: 'SME',
      entityId: smeId,
      newData: `Created SME ${name} (${trade}) - Epic ${nextSeq}`,
      userEmail
    });

    revalidatePath('/smes');
    revalidatePath('/communications');
    revalidatePath('/generator/deputation');
    revalidatePath('/dashboard');
    revalidatePath('/reports');
    revalidatePath('/video-production');
  } catch (error: any) {
    console.error('Failed to create SME:', error);
    return { success: false, error: error?.message || 'Failed to create SME' };
  }

  redirect('/smes');
}
