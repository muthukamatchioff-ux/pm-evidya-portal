import React from 'react';
import ContentClient from './ContentClient';
import { getVideos, getEpicDropdownList } from './actions';
import { requireAuth, getRole } from '@/lib/auth';

export const metadata = {
  title: 'Video Content Library | PM e-Vidya'
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ContentPage() {
  await requireAuth(['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'CAMERAMAN', 'EDITOR']);
  const role = await getRole();
  const [videos, epics] = await Promise.all([
    getVideos(),
    getEpicDropdownList()
  ]);
  return <ContentClient initialData={videos} epics={epics} role={role} />;
}
