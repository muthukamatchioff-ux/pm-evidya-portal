import React from 'react';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function AccountsLoading() {
  return <LoadingSkeleton cardCount={4} showTable={true} />;
}
