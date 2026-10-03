"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import RoleSwitcher from './RoleSwitcher';

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  
  { isHeader: true, name: 'Core Modules' },
  { name: 'SME Records', path: '/smes', icon: '👨‍🏫' },
  { name: 'Production Records', path: '/production', icon: '🎥' },
  { name: 'Document Management', path: '/accounts', icon: '📄', adminOnly: true },
  { name: 'Document Registry', path: '/documents', icon: '📄' },
  { name: 'Video / Content', path: '/content', icon: '🎬' },
  
  { isHeader: true, name: 'System' },
  { name: 'Reports', path: '/reports', icon: '📈' },
  { name: 'Legacy Data', path: '/legacy', icon: '🗄️', adminOnly: true },
  { name: 'Settings', path: '/settings', icon: '⚙️', adminOnly: true }
];

export default function SidebarClient({ role, email }: { role: string, email: string | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.logoContainer}>
        <div className={styles.logo}>
          <h2>PM e-Vidya</h2>
          <p>Management Portal</p>
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          style={{ color: 'white', opacity: 0.7, padding: '4px' }}
          title="Toggle Sidebar"
        >
          {collapsed ? '▶' : '◀'}
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
              className={`${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.iconPlaceholder}>{item.icon}</span>
              <span className={styles.navLinkText}>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className={styles.bottomSection}>
        {!collapsed && <RoleSwitcher currentEmail={email} currentRole={role} />}
      </div>
    </aside>
  );
}
