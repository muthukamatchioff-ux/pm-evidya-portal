'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import styles from './login.module.css';
import CinematicIntro from '@/components/CinematicIntro';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

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
    <>
      {!introComplete && <CinematicIntro onComplete={() => setIntroComplete(true)} />}
      
      <div className={styles.loginPage}>
        {/* Branding top left */}
        <div className={styles.brandingTopLeft}>
          <img src="/msde-logo.png" alt="MSDE Logo" className={styles.msdeLogo} />
        </div>
        
        {/* Branding top right */}
        <div className={styles.brandingTopRight}>
          <img src="/skill-india-logo.png" alt="Skill India Logo" className={styles.skillIndiaLogo} />
        </div>

        {introComplete && (
          <div className={styles.loginCardWrapper}>
            <div className={styles.loginCard}>
              <img 
                src="/evidya-logo-exact.png" 
                alt="PM e-Vidya Logo" 
                className={styles.logoImageSmall}
              />
              <h2 className={styles.welcomeTitle}>Sign In to Your Account</h2>
              <p className={styles.instituteName}>
                National Instructional Media Institute<br/>
                राष्ट्रीय अनुदेशात्मक मीडिया संस्थान
              </p>

              {error && (
                <div className={styles.errorToast}>
                  <span className={styles.errorIcon}>⚠</span>
                  <div className={styles.errorContent}>
                    <h4 className={styles.errorTitle}>Unable to sign in</h4>
                    <p className={styles.errorDesc}>{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className={styles.loginForm}>
                <div className={styles.inputGroup}>
                  <label htmlFor="email">Email Address</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>✉</span>
                    <input 
                      id="email"
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@nimi.gov.in"
                      className={styles.input}
                      required
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>🔒</span>
                    <input 
                      id="password"
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={styles.input}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  
                  <div className={styles.formOptions}>
                    <label className={styles.checkboxLabel}>
                      <input type="checkbox" disabled={loading} />
                      Remember me
                    </label>
                    <a href="#" className={styles.forgotLink} onClick={(e) => e.preventDefault()}>
                      Forgot password?
                    </a>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className={styles.actionDivider}>
                  <span>or</span>
                </div>

                <button
                  type="button"
                  className={styles.viewerLoginBtn}
                  onClick={() => {
                    setEmail('viewer@nimi.gov.in');
                    setPassword('');
                    document.getElementById('password')?.focus();
                  }}
                  disabled={loading}
                >
                  Login as Viewer
                </button>

                <div className={styles.registerPrompt}>
                  Don't have an account? <a href="/register">Register here</a>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
