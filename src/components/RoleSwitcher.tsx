'use client';

import React, { useState } from 'react';
import { login, logout } from '@/lib/auth';

export default function RoleSwitcher({ currentEmail, currentRole }: { currentEmail: string | null, currentRole: string }) {
  const [email, setEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      await login(email);
      setEmail('');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (currentEmail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Authenticated As
        </div>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>
          {currentEmail}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          Role: {currentRole}
        </div>
        <button 
          onClick={handleLogout}
          style={{
            padding: '4px 8px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
        Login Simulation
      </label>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email to login"
          required
          style={{
            padding: '6px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            background: 'var(--bg-color)',
            fontSize: '12px',
            color: 'var(--text-primary)'
          }}
        />
        <button 
          type="submit"
          style={{
            padding: '6px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}
