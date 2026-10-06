'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<'EN' | 'TA'>('EN');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        setError('Email and password are required.');
        setLoading(false);
        return;
      }

      const result = await login(email, password);

      if (!result.success) {
        setError(result.error || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.splitContainer}>
      {/* Left Visual Panel */}
      <div className={styles.leftPanel}>
        <div className={styles.visualContent}>
          <img 
            src="/pm-evidya-logo.png" 
            alt="PM e-Vidya Logo" 
            className={styles.logoImageLarge}
          />
          <h1 className={styles.visualTitle}>PM e-Vidya</h1>
          <h2 className={styles.visualSubtitle}>Vocational Education Channels</h2>
          <p className={styles.visualTagline}>
            Empowering India's Youth with Skills for a Better Future
          </p>
          <div className={styles.rimiBranding}>
            National Instructional Media Institute (NIMI)
          </div>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className={styles.rightPanel}>
        <div className={styles.loginCard}>
          <div className={styles.languageSelector}>
            <span 
              className={`${styles.langOption} ${language === 'EN' ? styles.active : ''}`}
              onClick={() => setLanguage('EN')}
            >
              English
            </span>
            <span className={styles.langDivider}>|</span>
            <span 
              className={`${styles.langOption} ${language === 'TA' ? styles.active : ''}`}
              onClick={() => setLanguage('TA')}
            >
              தமிழ்
            </span>
          </div>

          <div className={styles.loginHeader}>
            <img 
              src="/pm-evidya-logo.png" 
              alt="PM e-Vidya Logo" 
              className={styles.logoImageSmall}
            />
            <h2 className={styles.welcomeTitle}>Welcome Back</h2>
            <p className={styles.welcomeSubtitle}>Sign in to your PM e-Vidya<br/>Management Portal</p>
          </div>

          {error && (
            <div className={styles.errorToast}>
              <span className={styles.errorIcon}>⚠</span>
              <div className={styles.errorContent}>
                <h4 className={styles.errorTitle}>Unable to sign in</h4>
                <p className={styles.errorDesc}>
                  {error === 'An unexpected error occurred. Please try again.' 
                    ? 'Please check your email and password and try again.' 
                    : error}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                autoComplete="username"
                required
                className={styles.inputField}
                disabled={loading}
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className={styles.inputField}
                  disabled={loading}
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

            <div className={styles.forgotPassword}>
              <a href="#" onClick={(e) => e.preventDefault()}>Forgot Password?</a>
            </div>

            <button
              type="submit"
              className={styles.signInBtn}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
          
          <div className={styles.bottomBranding}>
            National Instructional Media Institute (NIMI)
          </div>
        </div>
      </div>
    </div>
  );
}
