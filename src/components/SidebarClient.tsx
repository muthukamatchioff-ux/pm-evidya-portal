"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from './Sidebar.module.css';
import LogoutButton from './LogoutButton';

interface MenuItem {
  name: string;
  path?: string;
  icon?: string;
  isHeader?: boolean;
  allowedRoles?: string[];
}

interface StaffMenuItem {
  name: string;
  tabId: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: '📊', allowedRoles: ['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER'] },
  
  { isHeader: true, name: 'Production Workflow', allowedRoles: ['ADMIN'] },
  { name: 'Work Assignment', path: '/production-workflow', icon: '📋', allowedRoles: ['ADMIN'] },

  { isHeader: true, name: 'Core Modules', allowedRoles: ['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER'] },
  { name: 'SME Records', path: '/smes', icon: '👨‍🏫', allowedRoles: ['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER'] },
  { name: 'Video Production Tracker', path: '/video-production', icon: '🎬', allowedRoles: ['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER'] },
  { name: 'Video Content Library', path: '/content', icon: '📼', allowedRoles: ['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER'] },
  { name: 'Document Management', path: '/accounts', icon: '📁', allowedRoles: ['ADMIN', 'HIGHER_OFFICIAL_VIEWER'] },
  { name: 'Document Registry', path: '/documents', icon: '📄', allowedRoles: ['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER'] },
  
  { isHeader: true, name: 'Communications', allowedRoles: ['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER'] },
  { name: 'SME Document Workflow', path: '/generator/deputation', icon: '✉️', allowedRoles: ['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER'] },
  
  { isHeader: true, name: 'System', allowedRoles: ['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER'] },
  { name: 'Reports', path: '/reports', icon: '📈', allowedRoles: ['ADMIN', 'TEAM_MEMBER', 'VIEWER', 'HIGHER_OFFICIAL_VIEWER'] },
  { name: 'Legacy Data', path: '/legacy', icon: '🗄️', allowedRoles: ['ADMIN', 'HIGHER_OFFICIAL_VIEWER'] },
  { name: 'Settings', path: '/settings', icon: '⚙️', allowedRoles: ['ADMIN'] }
];

const cameramanItems: StaffMenuItem[] = [
  { name: 'Shooting Entry', tabId: 'SHOOTING_ENTRY', icon: '🎥' },
  { name: 'Dashboard', tabId: 'DASHBOARD', icon: '📊' },
  { name: 'My Assignments', tabId: 'ASSIGNMENTS', icon: '📋' },
  { name: 'Overall Tracker (View Only)', tabId: 'TRACKER', icon: '👁️' },
  { name: 'Profile', tabId: 'PROFILE', icon: '👤' },
];

const editorItems: StaffMenuItem[] = [
  { name: 'My Assignments', tabId: 'ASSIGNMENTS', icon: '📋' },
  { name: 'Post-Production Entry', tabId: 'POST_PRODUCTION_ENTRY', icon: '🎬' },
  { name: 'Dashboard', tabId: 'DASHBOARD', icon: '📊' },
  { name: 'Overall Tracker (View Only)', tabId: 'TRACKER', icon: '👁️' },
  { name: 'Profile', tabId: 'PROFILE', icon: '👤' },
];

export default function SidebarClient({
  role,
  email,
  initialAssignmentCount = 0,
  unassignedCount = 0
}: {
  role: string;
  email: string | null;
  initialAssignmentCount?: number;
  unassignedCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [assignmentCount, setAssignmentCount] = useState<number>(initialAssignmentCount);

  const normalizedRole = (role || 'VIEWER').toUpperCase().trim();
  const isCameraman = normalizedRole === 'CAMERAMAN';
  const isEditor = normalizedRole === 'EDITOR';
  const isStaff = isCameraman || isEditor;

  // Real-time synchronization of persisted assignment count from portal components
  useEffect(() => {
    const handleCount = (e: any) => {
      if (typeof e.detail?.count === 'number') {
        setAssignmentCount(e.detail.count);
      }
    };
    window.addEventListener('portalAssignmentCount', handleCount);
    return () => window.removeEventListener('portalAssignmentCount', handleCount);
  }, []);

  // Update initial count when prop updates
  useEffect(() => {
    if (initialAssignmentCount > 0 && assignmentCount === 0) {
      setAssignmentCount(initialAssignmentCount);
    }
  }, [initialAssignmentCount]);

  // Determine active tab for staff
  const currentTabParam = searchParams.get('tab');
  const activeStaffTab = useMemo(() => {
    if (isCameraman) {
      if (!currentTabParam || currentTabParam === 'SHOOTING_ENTRY') return 'SHOOTING_ENTRY';
      return currentTabParam;
    }
    if (isEditor) {
      if (!currentTabParam || currentTabParam === 'POST_PRODUCTION_ENTRY') return 'POST_PRODUCTION_ENTRY';
      return currentTabParam;
    }
    return '';
  }, [isCameraman, isEditor, currentTabParam]);

  const handleStaffItemClick = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    closeMobile();
    window.dispatchEvent(new CustomEvent('portalTabChange', { detail: { tab: tabId } }));
    router.push(`/video-production?tab=${tabId}`);
  };

  // Filter items matching role for Admin / other roles
  const renderedAdminItems = useMemo(() => {
    const roleFiltered = menuItems.filter(item => {
      if (item.allowedRoles && !item.allowedRoles.includes(normalizedRole)) {
        return false;
      }
      return true;
    });

    return roleFiltered.filter((item, idx) => {
      if (!item.isHeader) return true;
      for (let i = idx + 1; i < roleFiltered.length; i++) {
        if (!roleFiltered[i].isHeader) return true;
        break;
      }
      return false;
    });
  }, [normalizedRole]);

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
            <img src="/pm-evidya-logo.png" alt="PM e-Vidya Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', marginBottom: '8px', display: collapsed ? 'none' : 'block', mixBlendMode: 'multiply' }} />
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
        
        <nav className={styles.nav} aria-label={isStaff ? 'Portal Navigation' : 'Main Navigation'}>
          {isStaff ? (
            <>
              <div
                style={{
                  marginTop: '12px',
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
                {isCameraman ? 'Cameraman Portal' : 'Video Editor Portal'}
              </div>
              {(isCameraman ? cameramanItems : editorItems).map((item) => {
                const isActive = activeStaffTab === item.tabId;
                return (
                  <a
                    key={item.tabId}
                    href={`/video-production?tab=${item.tabId}`}
                    onClick={(e) => handleStaffItemClick(e, item.tabId)}
                    className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                    title={item.name}
                  >
                    <span className={styles.iconPlaceholder}>{item.icon}</span>
                    <span className={styles.navLinkText}>{item.name}</span>
                    {item.tabId === 'ASSIGNMENTS' && (
                      <span className={styles.badge} title={`${assignmentCount} assigned topics`}>
                        {assignmentCount}
                      </span>
                    )}
                  </a>
                );
              })}
            </>
          ) : (
            renderedAdminItems.map((item, index) => {
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

              const isWorkAssignmentItem = item.path === '/production-workflow';
              const isActive = isWorkAssignmentItem 
                ? pathname === '/production-workflow'
                : (pathname === item.path || (item.path !== '/' && pathname?.startsWith(`${item.path}/`)));

              return (
                <Link
                  key={item.path}
                  href={item.path!}
                  prefetch={true}
                  onClick={closeMobile}
                  className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                >
                  <span className={styles.iconPlaceholder}>{item.icon}</span>
                  <span className={styles.navLinkText}>{item.name}</span>
                </Link>
              );
            })
          )}
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
