'use client';

import React, { useState, useEffect } from 'react';
import styles from './CinematicIntro.module.css';

export default function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('introSeen') === 'true') {
      onComplete();
      return;
    }

    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {}

    const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') return;
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    };

    const playSweep = () => {
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') return;
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.5);
      
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.2);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    };

    const t1 = setTimeout(() => {
      setStage(1);
      playTone(220, 'sine', 1.5, 0.05);
    }, 100);

    const t2 = setTimeout(() => {
      setStage(2);
      playSweep();
    }, 600);

    const t3 = setTimeout(() => {
      setStage(3);
      playTone(440, 'sine', 2, 0.1);
      setTimeout(() => playTone(554.37, 'sine', 2, 0.1), 100);
      setTimeout(() => playTone(659.25, 'sine', 2, 0.1), 200);
    }, 1600);

    const t4 = setTimeout(() => {
      setStage(4);
      setTimeout(() => {
        if (typeof window !== 'undefined') sessionStorage.setItem('introSeen', 'true');
        onComplete();
      }, 400);
    }, 3600);

    const resumeAudio = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('click', resumeAudio, { once: true });
    }

    return () => { 
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      if (typeof window !== 'undefined') window.removeEventListener('click', resumeAudio);
      if (audioCtx) audioCtx.close();
    };
  }, [onComplete]);

  if (stage === 4) return null;

  return (
    <div className={styles.introContainer} onClick={() => { setStage(4); onComplete(); }}>
      <div className={styles.lensFlare}></div>
      <div className={`${styles.stage1} ${stage >= 2 ? styles.zooming : ''} ${stage >= 3 ? styles.fadeOut : ''}`}>
        <img src="/nimi-logo.png" alt="NIMI Logo" className={styles.nimiLogo} />
        <h2 className={styles.instituteName}>National Instructional Media Institute</h2>
      </div>
      
      <div className={`${styles.stage3} ${stage >= 3 ? styles.fadeInScale : ''}`}>
        <img src="/evidya-logo-exact.png" alt="PM e-Vidya Logo" className={styles.eVidyaLogo} />
      </div>
    </div>
  );
}