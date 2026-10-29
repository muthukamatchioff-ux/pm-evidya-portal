import React from 'react';
import { requireAuth, getRole } from '@/lib/auth';
import { getProductionWorkflowDashboardData } from './actions';
import ProductionWorkflowClient from './ProductionWorkflowClient';

export const metadata = {
  title: 'Production Workflow & Work Assignment | PM e-Vidya'
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductionWorkflowPage() {
  await requireAuth(['ADMIN']);
  const role = await getRole();

  const res = await getProductionWorkflowDashboardData();
  const initialData = res.success && res.data ? res.data : {
    counts: {
      unassigned: 0,
      shooting: 0,
      readyForEditor: 0,
      editing: 0,
      completed: 0,
      published: 0,
      total: 0
    },
    epics: [],
    registeredCameramen: [],
    registeredEditors: [],
    recentNotifications: []
  };

  return <ProductionWorkflowClient initialData={initialData} role={role} />;
}
