"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './projects.module.css';

// Type mapping based on Prisma include structure
type ProjectRow = {
  id: string;
  projectCode: string;
  title: string;
  trade: { name: string } | null;
  language: { name: string } | null;
  status: { name: string } | null;
  _count: { documents: number; modules: number };
  updatedAt: Date;
};

export default function ProjectsTable({ projects }: { projects: ProjectRow[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and search logic
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = 
        p.title.toLowerCase().includes(search.toLowerCase()) || 
        p.projectCode.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter ? p.status?.name === statusFilter : true;
      
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  return (
    <>
      <div className={styles.controls} style={{ padding: '16px' }}>
        <div className={styles.searchGroup}>
          <input 
            type="text" 
            placeholder="Search by code or title..." 
            className={styles.searchInput}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div className={styles.filterGroup}>
          <select 
            className={styles.selectInput}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="In Progress">In Progress</option>
            <option value="Under Review">Under Review</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </select>
          <button className="btn-secondary" title="Export to Excel">
            <span>⬇️</span> Export
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Project Title</th>
              <th>Trade</th>
              <th>Language</th>
              <th>Status</th>
              <th>Docs</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProjects.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No projects found.
                </td>
              </tr>
            ) : (
              paginatedProjects.map(p => (
                <tr key={p.id}>
                  <td><span className={styles.projectCode}>{p.projectCode}</span></td>
                  <td>
                    <Link href={`/projects/${p.id}`} className={styles.projectTitle}>
                      {p.title}
                    </Link>
                  </td>
                  <td>{p.trade?.name || '-'}</td>
                  <td>{p.language?.name || '-'}</td>
                  <td>
                    <span className={`badge ${p.status?.name === 'Completed' ? 'badge-success' : 'badge-primary'}`}>
                      {p.status?.name || 'Draft'}
                    </span>
                  </td>
                  <td>{p._count.documents}</td>
                  <td>{new Date(p.updatedAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div className={styles.actionMenu}>
                      <Link href={`/projects/${p.id}`} className={styles.actionBtn} title="View Details">👁️</Link>
                      <button className={styles.actionBtn} title="Edit">✏️</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.pageInfo}>
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length} entries
        </div>
        <div className={styles.pageControls}>
          <button 
            className={styles.pageBtn} 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          >
            Previous
          </button>
          <button 
            className={styles.pageBtn}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
