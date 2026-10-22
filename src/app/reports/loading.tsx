import React from 'react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function ReportsLoading() {
  return <LoadingSkeleton cardCount={4} showTable={true} />;
}
