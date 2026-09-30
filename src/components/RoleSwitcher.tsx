'use client';

import React from 'react';
import { setRole } from '@/lib/auth';

export default function RoleSwitcher({ currentRole }: { currentRole: string }) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(e.target.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
        Simulate Role
      </label>
      <select 
        value={currentRole} 
        onChange={handleChange}
        style={{
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid var(--border)',
          background: 'var(--bg-color)',
          fontSize: '13px',
          color: 'var(--text-primary)',
          cursor: 'pointer'
        }}
      >
        <option value="ADMIN">ADMIN</option>
        <option value="ACCOUNTS">ACCOUNTS</option>
        <option value="VIEWER">VIEWER</option>
      </select>
    </div>
  );
}
