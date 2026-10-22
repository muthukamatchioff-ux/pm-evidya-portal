import React from 'react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function SmesLoading() {
  return <LoadingSkeleton cardCount={0} showTable={true} />;
}
