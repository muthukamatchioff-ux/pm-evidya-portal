'use client';

import React, { useEffect, useState } from 'react';
import styles from './cinematic.module.css';

export default function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Check if we should skip intro based on user preference or session state
    const skipIntro = localStorage.getItem('skipIntro') === 'true';
    const introPlayed = sessionStorage.getItem('introPlayed') === 'true';
    
    // Accessibility: prefers-reduced-motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (skipIntro || introPlayed || reducedMotion) {
      onComplete();
      return;
    }

    const isMuted = localStorage.getItem('muteIntro') === 'true';

    // Play cinematic sound sequence using Web Audio API
    const playSound = async () => {
      if (isMuted) return;
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        
        // 1. Soft ambient tonal swell (0s - 1.5s)
        const swell = ctx.createOscillator();
        const swellGain = ctx.createGain();
        swell.type = 'sine';
        swell.frequency.setValueAtTime(220, ctx.currentTime);
        swell.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.5);
        
        swellGain.gain.setValueAtTime(0, ctx.currentTime);
        swellGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.0);
        swellGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
        
        swell.connect(swellGain);
        swellGain.connect(ctx.destination);
        swell.start(ctx.currentTime);
        swell.stop(ctx.currentTime + 1.5);
        
        // 2. Short whoosh with zoom (1.5s)
        const whoosh = ctx.createBufferSource();
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
        }
        whoosh.buffer = buffer;
        const whooshFilter = ctx.createBiquadFilter();
        whooshFilter.type = 'bandpass';
        whooshFilter.frequency.setValueAtTime(1000, ctx.currentTime + 1.5);
        whooshFilter.frequency.linearRampToValueAtTime(200, ctx.currentTime + 2.0);
        
        const whooshGain = ctx.createGain();
        whooshGain.gain.setValueAtTime(0, ctx.currentTime + 1.5);
        whooshGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.6);
        whooshGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);
        
        whoosh.connect(whooshFilter);
        whooshFilter.connect(whooshGain);
        whooshGain.connect(ctx.destination);
        whoosh.start(ctx.currentTime + 1.5);
        
        // 3. Elegant bell-like chime (2.0s)
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(880, ctx.currentTime + 2.0);
        chime.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 3.5);
        
        chimeGain.gain.setValueAtTime(0, ctx.currentTime + 2.0);
        chimeGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2.1);
        chimeGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3.5);
        
        chime.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chime.start(ctx.currentTime + 2.0);
        chime.stop(ctx.currentTime + 3.5);
        
      } catch (e) {
        console.warn('Web Audio not supported or blocked by browser policies.', e);
      }
    };

    // Staggered cinematic sequence
    const t1 = setTimeout(() => setStage(1), 100);    // Fade in NIMI
    const t2 = setTimeout(() => setStage(2), 1500);   // Zoom NIMI, fade in eVidya
    const t3 = setTimeout(() => setStage(3), 3500);   // Fade out overlay
    const t4 = setTimeout(() => {
      sessionStorage.setItem('introPlayed', 'true');
      onComplete();
    }, 4200);

    // Attempt to play sound (may be blocked by browser autoplay rules)
    playSound();

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className={`${styles.overlay} ${stage >= 3 ? styles.fadeOut : ''}`}>
      <div className={`${styles.volumetricLight} ${stage >= 1 ? styles.visible : ''}`}></div>
      
      <div className={`${styles.nimiLogo} ${stage >= 1 ? styles.visible : ''} ${stage >= 2 ? styles.zoomIn : ''}`}>
        <img src="/nimi-logo.png" alt="NIMI" />
      </div>
      
      <div className={`${styles.evidyaLogo} ${stage >= 2 ? styles.visibleBlurToSharp : ''}`}>
        <div className={styles.lightSweep}></div>
        <img src="/evidya-official.png" alt="eVidya" />
      </div>
    </div>
  );
}
