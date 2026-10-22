import React from 'react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function DashboardLoading() {
  return <LoadingSkeleton cardCount={6} showTable={true} />;
}
