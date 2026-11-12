'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './BudgetHeadsNav.module.css';

interface HeadTab {
  name: string;
  shortName: string;
  path: string;
  annexure: string;
}

const BUDGET_HEADS: HeadTab[] = [
  { name: 'Budget Master', shortName: 'Overview', path: '/budget', annexure: 'All' },
  { name: 'Head 1: Personnel', shortName: 'Annexure-I', path: '/budget/annexure-1', annexure: 'I' },
  { name: 'Head 2: Capacity Building', shortName: 'Annexure-II', path: '/budget/annexure-2', annexure: 'II' },
  { name: 'Head 3: Consultant & HR', shortName: 'Annexure-III', path: '/budget/annexure-3', annexure: 'III' },
  { name: 'Head 4: Cloud & Infra', shortName: 'Annexure-IV', path: '/budget/annexure-4', annexure: 'IV' },
  { name: 'Head 5: Contingency', shortName: 'Annexure-V', path: '/budget/annexure-5', annexure: 'V' },
  { name: 'Head 6: Media Production', shortName: 'Annexure-VI', path: '/budget/annexure-6', annexure: 'VI' },
];

const prefetchedBudgetRoutes = new Set<string>();

export default function BudgetHeadsNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleHoverPrefetch = (path: string) => {
    if (prefetchedBudgetRoutes.has(path) || path === pathname) return;
    prefetchedBudgetRoutes.add(path);
    try {
      router.prefetch(path);
    } catch {}
  };

  return (
    <nav className={styles.navContainer} aria-label="Budget Heads Navigation">
      {BUDGET_HEADS.map((tab) => {
        const isActive = pathname === tab.path;
        return (
          <Link
            key={tab.path}
            href={tab.path}
            prefetch={false}
            onMouseEnter={() => handleHoverPrefetch(tab.path)}
            onFocus={() => handleHoverPrefetch(tab.path)}
            className={`${styles.navItem} ${isActive ? styles.activeNavItem : ''}`}
          >
            <span>{tab.name}</span>
            {isActive && <span className={styles.badge}>Active</span>}
          </Link>
        );
      })}
    </nav>
  );
}

