import React, { Suspense } from 'react';
import { getRole, getEmail, parseAssignedEpics } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SidebarClient from './SidebarClient';

export default async function Sidebar() {
  const role = await getRole();
  const email = await getEmail();
  let initialAssignmentCount = 0;


  // Live count for Staff: My Assignments
  if (email && (role === 'CAMERAMAN' || role === 'EDITOR')) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true, name: true, department: true }
      });
      const sequences = await parseAssignedEpics(user?.department);
      const name = user?.name || '';
      const emailLower = email.toLowerCase().trim();
      const userId = user?.id || '';

      if (role === 'CAMERAMAN') {
        initialAssignmentCount = await prisma.shootingSchedule.count({
          where: {
            OR: [
              ...(userId ? [{ cameramanId: userId }, { workEntry: { cameramanId: userId } }] : []),
              ...(sequences.length > 0 ? [{ workEntry: { epicSequence: { in: sequences } } }] : []),
              { cameraman: { contains: name, mode: 'insensitive' } },
              { cameraman: { contains: emailLower, mode: 'insensitive' } }
            ]
          }
        });
      } else if (role === 'EDITOR') {
        initialAssignmentCount = await prisma.videoEditorRecord.count({
          where: {
            OR: [
              ...(userId ? [{ editorId: userId }, { workEntry: { editorId: userId } }] : []),
              ...(sequences.length > 0 ? [{ workEntry: { epicSequence: { in: sequences } } }] : []),
              { editorName: { contains: name, mode: 'insensitive' } },
              { editorName: { contains: emailLower, mode: 'insensitive' } }
            ]
          }
        });
      }
    } catch (_) {}
  }

  return (
    <Suspense fallback={<aside style={{ width: '260px', height: '100vh', backgroundColor: 'white' }} />}>
      <SidebarClient 
        role={role} 
        email={email} 
        initialAssignmentCount={initialAssignmentCount} 
      />
    </Suspense>
  );
}
