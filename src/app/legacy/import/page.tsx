import React from 'react';
import ImportWizard from './ImportWizard';

export const metadata = {
  title: 'Import Legacy Data | PM e-Vidya',
};

export default function LegacyImportPage() {
  return (
    <div style={{ padding: '24px' }}>
      <ImportWizard />
    </div>
  );
}
