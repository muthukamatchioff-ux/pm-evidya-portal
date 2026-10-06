import React from 'react';
import { prisma } from '@/lib/prisma';
import SettingsClient from './SettingsClient';

export const metadata = {
  title: 'Settings | PM e-Vidya'
};

import { requireAuth } from '@/lib/auth';

export default async function SettingsPage() {
  await requireAuth(['ADMIN']);
  const budgetHeads = await prisma.budgetHead.findMany({
    orderBy: { name: 'asc' }
  });
  const hrs = await prisma.humanResource.findMany({
    orderBy: { createdAt: 'desc' }
  });
  const admins = (await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, email: true, name: true, status: true, createdAt: true } as any,
    orderBy: { createdAt: 'desc' }
  })) as any[];
  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>Portal Settings</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Manage your PM e-Vidya application preferences and master configurations.</p>
      </header>

      <div style={{ 
        backgroundColor: 'var(--surface-color)', 
        border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-lg)', 
        padding: '32px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>Master Data Management</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>🌐 Manage Languages</button>
            <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>🛠️ Manage Trades & Subjects</button>
            <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>📊 Manage Project Statuses</button>
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>User Management</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>👥 Manage Users & Roles</button>
            <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>🛡️ Audit Logs</button>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>System Configurations</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>📧 Email Notification Settings</button>
            <button className="btn-secondary" style={{ textAlign: 'left', padding: '12px' }}>📂 Storage & Backup Settings</button>
          </div>
        </div>

        <div style={{ marginTop: '32px' }}>
          <SettingsClient initialHrs={hrs} initialBudgetHeads={budgetHeads} initialAdmins={admins} />
        </div>

      </div>
    </div>
  );
}
