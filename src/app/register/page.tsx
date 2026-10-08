'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/auth';
import styles from '../login/login.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!email.trim() || !password || !confirmPassword) {
        setError('All fields are required.');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      const result = await register(email, password);

      if (!result.success) {
        setError(result.error || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess('Account created successfully. Your account is pending approval.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.splitContainer}>
      <div className={styles.leftPanel}>
        <div className={styles.visualContent}>
          <img 
            src="/nimi-logo.png" 
            alt="NIMI Logo" 
            className={styles.logoImageLarge}
          />
          <h1 className={styles.visualTitle}>PM e-Vidya Portal</h1>
          <h2 className={styles.visualSubtitle}>Create Viewer Account</h2>
          <p className={styles.visualTagline}>
            Register for viewer access to the PM e-Vidya Portal.
          </p>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <img 
              src="/nimi-logo.png" 
              alt="NIMI Logo" 
              className={styles.logoImageSmall}
            />
            <h2 className={styles.welcomeTitle}>Register</h2>
            <p className={styles.welcomeSubtitle}>Sign up for a Viewer account</p>
          </div>

          {error && (
            <div className={styles.errorToast}>
              <span className={styles.errorIcon}>⚠</span>
              <div className={styles.errorContent}>
                <h4 className={styles.errorTitle}>Unable to register</h4>
                <p className={styles.errorDesc}>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #22c55e', padding: '16px', borderRadius: '6px', marginBottom: '24px', display: 'flex', gap: '12px' }}>
              <span style={{ color: '#22c55e', fontSize: '18px' }}>✓</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#166534', margin: '0 0 4px' }}>Success</h4>
                <p style={{ fontSize: '13px', color: '#15803d', margin: 0 }}>{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleRegister} className={styles.loginForm}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className={styles.inputField}
                disabled={loading || !!success}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
                  required
                  className={styles.inputField}
                  disabled={loading || !!success}
                />
                <button
                  type="button"
                  className={styles.togglePasswordBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className={styles.inputField}
                disabled={loading || !!success}
              />
            </div>

            <button
              type="submit"
              className={styles.signInBtn}
              disabled={loading || !!success}
            >
              {loading ? 'Registering...' : 'Register as Viewer'}
            </button>

            <div className={styles.registerPrompt}>
              Already have an account? <a href="/login">Sign in here</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
