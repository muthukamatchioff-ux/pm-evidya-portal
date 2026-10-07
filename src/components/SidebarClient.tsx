"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import LogoutButton from './LogoutButton';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  
  { isHeader: true, name: 'Core Modules' },
  { name: 'SME Records', path: '/smes', icon: '👨‍🏫', adminOnly: true },
  { name: 'Video Production Records', path: '/video-production', icon: '🎬' },
  { name: 'Document Management', path: '/accounts', icon: '💰', adminOnly: true },
  { name: 'Document Registry', path: '/documents', icon: '📄' },
  { name: 'Approval Letters', path: '/generator/deputation', icon: '✉️' },
  
  { isHeader: true, name: 'System' },
  { name: 'Reports', path: '/reports', icon: '📈' },
  { name: 'Legacy Data', path: '/legacy', icon: '🗄️', adminOnly: true },
  { name: 'Settings', path: '/settings', icon: '⚙️', adminOnly: true }
];

export default function SidebarClient({ role, email }: { role: string, email: string | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setMobileOpen(prev => !prev);
    window.addEventListener('toggleMobileSidebar', handler);
    return () => window.removeEventListener('toggleMobileSidebar', handler);
  }, []);

  const closeMobile = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {mobileOpen && (
        <div className={styles.mobileOverlay} onClick={closeMobile} />
      )}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.logoContainer}>
          <div className={styles.logo}>
            <img src="/nimi-logo.png" alt="NIMI Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', marginBottom: '8px', display: collapsed ? 'none' : 'block' }} />
            <h2 style={{ fontSize: '18px' }}>PM e-Vidya</h2>
            <p style={{ fontSize: '12px' }}>National Instructional Media Institute</p>
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className={styles.desktopToggle}
            title="Toggle Sidebar"
          >
            {collapsed ? '▶' : '◀'}
          </button>
          <button 
            onClick={closeMobile}
            className={styles.mobileCloseBtn}
            title="Close Sidebar"
          >
            ✕
          </button>
        </div>
        
        <nav className={styles.nav}>
          {menuItems.filter(item => !item.adminOnly || role === 'ADMIN').map((item, index) => {
            if (item.isHeader) {
              return (
                <div 
                  key={`header-${index}`} 
                  style={{ 
                    marginTop: '20px', 
                    marginBottom: '8px', 
                    paddingLeft: '16px', 
                    fontSize: '11px', 
                    color: '#94a3b8', 
                    fontWeight: 'bold', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em',
                    display: collapsed ? 'none' : 'block'
                  }}
                >
                  {item.name}
                </div>
              );
            }

            const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
            return (
              <Link 
                key={item.path} 
                href={item.path!} 
                onClick={closeMobile}
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.iconPlaceholder}>{item.icon}</span>
                <span className={styles.navLinkText}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className={styles.bottomSection}>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>Authenticated As</div>
                <div style={{ fontWeight: 'bold', color: 'white', wordBreak: 'break-all' }}>{email}</div>
                <div style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>Role: {role.replace('_', ' ')}</div>
              </div>
              <LogoutButton />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
