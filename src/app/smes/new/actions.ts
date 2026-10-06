'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { requireAuth, checkAuth } from '@/lib/auth';

export async function createSMEWithEntry(formData: FormData) {
  const authCheck = await checkAuth(['ADMIN']);
  if (!authCheck.success) return authCheck;
  
  // Extract SME details
  const name = formData.get('name') as string;
  const designation = formData.get('designation') as string;
  const institute = formData.get('institute') as string;
  const location = formData.get('location') as string;
  const address = formData.get('address') as string;
  
  // Extract Work Entry details
  const trade = formData.get('trade') as string;
  const topic = formData.get('topic') as string;
  
  const attendanceFromStr = formData.get('attendanceFrom') as string;
  const attendanceToStr = formData.get('attendanceTo') as string;
  
  const days = parseFloat(formData.get('days') as string) || 0;
  const ratePerDay = parseFloat(formData.get('ratePerDay') as string) || 0;
  const taAmount = parseFloat(formData.get('taAmount') as string) || 0;
  const otherAmount = parseFloat(formData.get('otherAmount') as string) || 0;

  const attendanceFrom = attendanceFromStr ? new Date(attendanceFromStr) : null;
  const attendanceTo = attendanceToStr ? new Date(attendanceToStr) : null;

  const totalAmount = (days * ratePerDay) + taAmount + otherAmount;

  try {
    const newSme = await prisma.sME.create({
      data: {
        name,
        designation,
        institute,
        location,
        address,
        workEntries: {
          create: {
            trade,
            topic,
            attendanceFrom,
            attendanceTo,
            days,
            ratePerDay,
            taAmount,
            otherAmount,
            payments: {
              create: {
                grossAmount: days * ratePerDay,
                taAmount,
                otherAmount,
                totalAmount
              }
            }
          }
        }
      } as any
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entity: 'SME',
        entityId: newSme.id,
        newData: `Created SME ${name} with initial Work Entry`,
      }
    });

  } catch (error) {
    console.error('Failed to create SME:', error);
    throw new Error('Failed to create SME');
  }

  redirect('/smes');
}
