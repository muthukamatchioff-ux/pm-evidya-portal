"use client";

import React, { useState, useEffect } from 'react';
import styles from './Header.module.css';

export default function Header({ role }: { role: string }) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDate(date.toLocaleDateString('en-IN', options));
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <h1 className={styles.title}>Document Management System</h1>
        
        <div className={styles.searchBar}>
          <span style={{ opacity: 0.5 }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search projects, documents..." 
            className={styles.searchInput}
          />
        </div>
      </div>
      
      <div className={styles.rightSection}>
        <div className={styles.dateDisplay}>
          {currentDate}
        </div>
        
        <button className={styles.iconButton} title="Notifications">
          🔔
        </button>
        
        <button className={styles.profileButton}>
          <div className={styles.avatar}>A</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Admin User</span>
            <span className={styles.userRole}>{role}</span>
          </div>
        </button>
      </div>
    </header>
  );
}
