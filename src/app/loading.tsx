import React from 'react';

export default function Loading() {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <div className="skeleton-shimmer" style={{ width: '220px', height: '28px', marginBottom: '8px' }} />
          <div className="skeleton-shimmer" style={{ width: '340px', height: '16px' }} />
        </div>
        <div className="skeleton-shimmer" style={{ width: '120px', height: '36px' }} />
      </div>

      {/* KPI Cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div className="skeleton-shimmer" style={{ width: '60%', height: '14px' }} />
            <div className="skeleton-shimmer" style={{ width: '80%', height: '24px' }} />
          </div>
        ))}
      </div>

      {/* Main Content / Table skeleton */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton-shimmer" style={{ width: '180px', height: '20px' }} />
          <div className="skeleton-shimmer" style={{ width: '100px', height: '32px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="skeleton-shimmer" style={{ width: '100%', height: '36px', borderRadius: '4px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
