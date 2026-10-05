'use client';

import React, { useState } from 'react';
import { login, logout } from '@/lib/auth';

export default function RoleSwitcher({
  currentEmail,
  currentRole
}: {
  currentEmail: string | null;
  currentRole: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || 'Login failed.');
      return;
    }

    setEmail('');
    setPassword('');
    window.location.reload();
  };

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  if (currentEmail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}
        >
          Authenticated As
        </div>

        <div
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'var(--primary)'
          }}
        >
          {currentEmail}
        </div>

        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)'
          }}
        >
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
      <label
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          fontWeight: 600
        }}
      >
        Admin Login
      </label>

      <form
        onSubmit={handleLogin}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Admin email"
          autoComplete="username"
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

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
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

        {error && (
          <div
            style={{
              fontSize: '11px',
              color: '#ef4444',
              lineHeight: '1.3'
            }}
          >
            {error}
          </div>
        )}

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
