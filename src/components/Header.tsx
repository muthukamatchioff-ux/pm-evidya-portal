"use client";

import React, { useState, useEffect } from 'react';
import styles from './Header.module.css';
import LogoutButton from './LogoutButton';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setCurrentDate(date.toLocaleDateString('en-IN', options));
  }, []);

  const toggleMobileSidebar = () => {
    window.dispatchEvent(new Event('toggleMobileSidebar'));
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <button 
          className={styles.mobileMenuBtn} 
          onClick={toggleMobileSidebar}
          title="Open Menu"
        >
          ☰
        </button>
        <h1 className={styles.title}>Document Management System</h1>
        
        <div className={styles.searchBar}>
          <span style={{ opacity: 0.5 }}>🔍</span>
          <input 
            type="text" 
            placeholder="Search projects..." 
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
        
        <div className={styles.profileDropdown}>
          <button className={styles.profileButton}>
            <div className={styles.avatar}>A</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>Admin User</span>
              <span className={styles.userRole}>{role}</span>
            </div>
          </button>
          
          <div className={styles.dropdownMenu}>
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
