import React from 'react';
import styles from '@/app/dashboard/dashboard.module.css';

export default function VideoProductionLoading() {
  return (
    <div>
      <div className={styles.dashboardHeader}>
        <div className="skeleton-shimmer" style={{ width: '280px', height: '32px', marginBottom: '8px', borderRadius: '6px' }} />
        <div className="skeleton-shimmer" style={{ width: '480px', height: '16px', borderRadius: '4px' }} />
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px' }}>
            <div className="skeleton-shimmer" style={{ width: '60%', height: '14px', marginBottom: '8px', borderRadius: '4px' }} />
            <div className="skeleton-shimmer" style={{ width: '40%', height: '28px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div className="skeleton-shimmer" style={{ width: '180px', height: '40px', borderRadius: '8px' }} />
        <div className="skeleton-shimmer" style={{ width: '180px', height: '40px', borderRadius: '8px' }} />
        <div className="skeleton-shimmer" style={{ width: '180px', height: '40px', borderRadius: '8px' }} />
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="skeleton-shimmer" style={{ width: '100%', height: '42px', borderRadius: '4px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
