"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './production.module.css';

export default function ProductionClient({ records }: { records: any[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.project?.title?.toLowerCase().includes(search.toLowerCase()) || 
                          r.project?.projectCode?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? r.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const getBadgeClass = (status: string) => {
    if (status === 'PENDING') return styles.badgePending;
    if (status === 'EDITING') return styles.badgeEditing;
    if (status === 'FINALIZED') return styles.badgeFinalized;
    return styles.badgePending;
  };

  return (
    <>
      <div className={styles.controls} style={{ padding: '16px' }}>
        <div className={styles.searchGroup}>
          <input 
            type="text" 
            placeholder="Search by project code or title..." 
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <select 
            className={styles.selectInput}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Edit</option>
            <option value="EDITING">Currently Editing</option>
            <option value="FINALIZED">Finalized / Published</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Project Code</th>
              <th>Project Title</th>
              <th>Trade</th>
              <th>Language</th>
              <th>Shoot Date</th>
              <th>Video URL / Source</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No production records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.project?.projectCode}</strong></td>
                  <td>
                    <Link href={`/projects/${r.project?.id}`} style={{ color: 'var(--text-primary)' }}>
                      {r.project?.title}
                    </Link>
                  </td>
                  <td>{r.project?.trade?.name || '-'}</td>
                  <td>{r.project?.language?.name || '-'}</td>
                  <td>{r.shootDate ? new Date(r.shootDate).toLocaleDateString('en-IN') : '-'}</td>
                  <td>
                    {r.videoUrl ? (
                      <a href={r.videoUrl} target="_blank" rel="noreferrer" className={styles.videoLink}>
                        🔗 Open Video Source
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Not Uploaded</span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${getBadgeClass(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }}>Update</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
