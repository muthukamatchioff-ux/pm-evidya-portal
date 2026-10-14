import React from 'react';
import styles from '@/app/dashboard/dashboard.module.css';

export default function ReportsLoading() {
  return (
    <div className={styles.container} style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div className={styles.pageHeader}>
        <div>
          <div className="skeleton-shimmer" style={{ width: '240px', height: '32px', marginBottom: '8px', borderRadius: '6px' }} />
          <div className="skeleton-shimmer" style={{ width: '420px', height: '16px', borderRadius: '4px' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '32px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <div className="skeleton-shimmer" style={{ width: '60%', height: '22px', marginBottom: '16px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '100%', height: '14px', marginBottom: '10px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '80%', height: '14px', marginBottom: '24px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '100%', height: '42px', borderRadius: '6px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
