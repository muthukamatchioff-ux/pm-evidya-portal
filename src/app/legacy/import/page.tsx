import React from 'react';
import ImportWizard from './ImportWizard';

import { requireAuth } from '@/lib/auth';

export const metadata = {
  title: 'Import Legacy Data | PM e-Vidya',
};

export default async function LegacyImportPage() {
  await requireAuth(['ADMIN']);
  return (
    <div style={{ padding: '24px' }}>
      <ImportWizard />
    </div>
  );
}
