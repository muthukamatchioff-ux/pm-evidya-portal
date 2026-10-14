import React from 'react';
import styles from './budget.module.css';

export default function BudgetLoading() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.actionsBar}>
          <div>
            <div className="skeleton-shimmer" style={{ width: '280px', height: '32px', marginBottom: '8px' }} />
            <div className="skeleton-shimmer" style={{ width: '160px', height: '18px' }} />
          </div>
          <div>
            <div className="skeleton-shimmer" style={{ width: '140px', height: '38px', borderRadius: '6px' }} />
          </div>
        </div>
      </div>

      {/* 4 Summary Cards skeleton */}
      <div className={styles.summaryCards}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.card}>
            <div className="skeleton-shimmer" style={{ width: '50%', height: '14px', marginBottom: '8px' }} />
            <div className="skeleton-shimmer" style={{ width: '75%', height: '26px' }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid var(--border)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="skeleton-shimmer" style={{ width: '200px', height: '22px' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="skeleton-shimmer" style={{ width: '160px', height: '36px', borderRadius: '6px' }} />
            <div className="skeleton-shimmer" style={{ width: '120px', height: '36px', borderRadius: '6px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="skeleton-shimmer" style={{ width: '100%', height: '40px', borderRadius: '4px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
