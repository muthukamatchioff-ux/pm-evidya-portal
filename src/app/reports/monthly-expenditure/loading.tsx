import React from 'react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function MonthlyExpenditureLoading() {
  return <LoadingSkeleton cardCount={5} showTable={true} />;
}

