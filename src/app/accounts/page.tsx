import React from 'react';
import AccountsClient from './AccountsClient';

import { requireAuth, getRole } from '@/lib/auth';
import { getCachedAccountsWorkEntries } from '@/lib/portalCacheWarmers';

export const metadata = {
  title: 'Document Upload | PM e-Vidya Portal',
  description: 'Upload and manage mandatory SME compliance documents',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountsPage() {
  const [, role, data] = await Promise.all([
    requireAuth(['ADMIN', 'HIGHER_OFFICIAL_VIEWER']),
    getRole(),
    getCachedAccountsWorkEntries()
  ]);

  return <AccountsClient initialData={data} role={role} />;
}
