import React from 'react';

export default function SettingsLoading() {
  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '24px' }}>
        <div className="skeleton-shimmer" style={{ width: '200px', height: '28px', marginBottom: '8px', borderRadius: '6px' }} />
        <div className="skeleton-shimmer" style={{ width: '380px', height: '16px', borderRadius: '4px' }} />
      </header>

      <div style={{ 
        backgroundColor: 'var(--surface-color, #ffffff)', 
        border: '1px solid var(--border, #e2e8f0)', 
        borderRadius: '12px', 
        padding: '32px' 
      }}>
        {[1, 2, 3].map((section) => (
          <div key={section} style={{ marginBottom: '32px' }}>
            <div className="skeleton-shimmer" style={{ width: '220px', height: '20px', marginBottom: '16px', borderRadius: '4px' }} />
            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="skeleton-shimmer" style={{ width: '100%', height: '44px', borderRadius: '6px' }} />
              <div className="skeleton-shimmer" style={{ width: '100%', height: '44px', borderRadius: '6px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
