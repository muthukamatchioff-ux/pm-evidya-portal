'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import styles from './login.module.css';
import dynamic from 'next/dynamic';

const CinematicIntro = dynamic(() => import('./components/CinematicIntro'), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Start with intro true, dynamic component handles the rest.
  const [showIntro, setShowIntro] = useState(true);
  
  // Settings for sound and skipping
  const handleToggleSound = () => {
    const isMuted = localStorage.getItem('muteIntro') === 'true';
    localStorage.setItem('muteIntro', (!isMuted).toString());
    // Force a re-render to update UI if needed (simple hack)
    setShowIntro(s => s);
  };
  
  const handleToggleSkip = () => {
    const skip = localStorage.getItem('skipIntro') === 'true';
    localStorage.setItem('skipIntro', (!skip).toString());
    setShowIntro(s => s);
  };

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
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {showIntro && <CinematicIntro onComplete={() => setShowIntro(false)} />}
      
      {/* Background illustration loaded via CSS */}
      <div className={styles.backgroundIllustration}></div>

      {/* Top Branding Bar */}
      <div className={styles.topBrandingBar}>
        <div className={styles.govEmblem}>
          <div className={styles.placeholderLogoText}>
            <span style={{fontWeight: 'bold'}}>GOVERNMENT OF INDIA</span><br/>
            Ministry of Skill Development
          </div>
        </div>
        
        {/* User Configuration Controls for Intro & Sound */}
        <div className={styles.settingsControls}>
          <button type="button" onClick={handleToggleSound} className={styles.settingBtn} title="Toggle Cinematic Intro Sound">
            {typeof window !== 'undefined' && localStorage.getItem('muteIntro') === 'true' ? '🔇 Muted' : '🔊 Sound On'}
          </button>
          <button type="button" onClick={handleToggleSkip} className={styles.settingBtn} title="Skip Cinematic Intro Next Time">
            {typeof window !== 'undefined' && localStorage.getItem('skipIntro') === 'true' ? '⏩ Intro Disabled' : '🎬 Intro Enabled'}
          </button>
        </div>

        <div className={styles.skillIndia}>
          <div className={styles.placeholderLogoText} style={{fontWeight: 'bold', color: '#1e3a8a'}}>
            Skill India
          </div>
        </div>
      </div>

      {/* Login Card */}
      <div className={styles.loginCardWrapper}>
        <div className={styles.loginCard}>
          <div className={styles.cardHeader}>
            <img 
              src="/evidya-official.png" 
              alt="eVidya Logo" 
              className={styles.evidyaLogo}
              onError={(e) => { e.currentTarget.src = '/pm-evidya-logo.png'; }} // Fallback
            />
            <h2 className={styles.instituteName}>National Instructional Media Institute</h2>
            <p className={styles.hindiName}>राष्ट्रीय अनुदेशात्मक मीडिया संस्थान</p>
          </div>

          <h3 className={styles.signInHeading}>Sign In to Your Account</h3>

          {error && (
            <div className={styles.errorToast}>
              <span className={styles.errorIcon}>⚠</span>
              <div className={styles.errorContent}>
                <p className={styles.errorDesc}>{error}</p>
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

            <div className={styles.formOptionsRow}>
              <label className={styles.rememberMe}>
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>
              
              <div className={styles.forgotPassword}>
                <a href="#" onClick={(e) => e.preventDefault()}>Forgot password?</a>
              </div>
            </div>

            <button
              type="submit"
              className={styles.signInBtn}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
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
          </form>
        </div>
      </div>
    </div>
  );
}
