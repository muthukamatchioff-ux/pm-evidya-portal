import React from 'react';
import { getRole, getEmail } from '@/lib/auth';
import SidebarClient from './SidebarClient';

export default async function Sidebar() {
  const role = await getRole();
  const email = await getEmail();
  return <SidebarClient role={role} email={email} />;
}
