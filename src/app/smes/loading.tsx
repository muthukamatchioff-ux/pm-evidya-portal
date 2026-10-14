import React from 'react';
import styles from './smes.module.css';

export default function SmesLoading() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className="skeleton-shimmer" style={{ width: '220px', height: '30px', marginBottom: '8px', borderRadius: '6px' }} />
          <div className="skeleton-shimmer" style={{ width: '360px', height: '16px', borderRadius: '4px' }} />
        </div>
      </header>

      {/* Search and filter bar skeleton */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className="skeleton-shimmer" style={{ flex: 1, height: '42px', borderRadius: '8px' }} />
        <div className="skeleton-shimmer" style={{ width: '160px', height: '42px', borderRadius: '8px' }} />
      </div>

      {/* SME card / table skeleton */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="skeleton-shimmer" style={{ width: '100%', height: '44px', borderRadius: '4px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
