import React from 'react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function RootLoading() {
  return <LoadingSkeleton cardCount={4} showTable={true} />;
}
