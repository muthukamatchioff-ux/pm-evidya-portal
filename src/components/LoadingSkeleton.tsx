import React from 'react';
import styles from './LoadingSkeleton.module.css';

interface LoadingSkeletonProps {
  title?: string;
  subtitle?: string;
  cardCount?: number;
  showTable?: boolean;
}

export default function LoadingSkeleton({
  title = 'Loading...',
  subtitle = 'Fetching records from database',
  cardCount = 4,
  showTable = true
}: LoadingSkeletonProps) {
  return (
    <div className={styles.container}>
      {/* Header Skeleton */}
      <div className={styles.header}>
        <div className={styles.titleShimmer}>
          <div className={styles.titleBar} />
          <div className={styles.subtitleBar} />
        </div>
      </div>

      {/* Cards Grid Skeleton */}
      {cardCount > 0 && (
        <div className={styles.cardGrid}>
          {Array.from({ length: cardCount }).map((_, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.cardHeader} />
              <div className={styles.cardValue} />
            </div>
          ))}
        </div>
      )}

      {/* Table / Content Skeleton */}
      {showTable && (
        <div className={styles.tableCard}>
          <div className={styles.tableHeaderRow}>
            <div className={styles.tableHeaderCell} style={{ width: '15%' }} />
            <div className={styles.tableHeaderCell} style={{ width: '30%' }} />
            <div className={styles.tableHeaderCell} style={{ width: '25%' }} />
            <div className={styles.tableHeaderCell} style={{ width: '20%' }} />
          </div>
          <div className={styles.tableBody}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.tableRow}>
                <div className={styles.cellShimmer} style={{ width: '15%' }} />
                <div className={styles.cellShimmer} style={{ width: '30%' }} />
                <div className={styles.cellShimmer} style={{ width: '25%' }} />
                <div className={styles.cellShimmer} style={{ width: '20%' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
