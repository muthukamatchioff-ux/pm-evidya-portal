"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './project-detail.module.css';

const TABS = ['Overview', 'Content', 'SME', 'Production', 'Documents', 'Sanction', 'Activity'];

export default function ProjectDetailClient({ project }: { project: any }) {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.breadcrumb}>
            <Link href="/projects">Projects</Link> / {project.projectCode}
          </div>
          <h1 className={styles.title}>
            <span className={styles.projectCode}>{project.projectCode}</span>
            {project.title}
          </h1>
        </div>
        <div className={styles.actions}>
          <button className="btn-secondary">✏️ Edit</button>
          <button className="btn-primary">📁 Add Document</button>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button 
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'Overview' && (
          <div className={styles.twoColumn}>
            <div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Project Title</div>
                <div className={styles.fieldValue}>{project.title}</div>
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Trade / Subject</div>
                <div className={styles.fieldValue}>{project.trade?.name || '-'}</div>
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Language</div>
                <div className={styles.fieldValue}>{project.language?.name || '-'}</div>
              </div>
            </div>
            <div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Status</div>
                <div className={styles.fieldValue}>
                  <span className={`badge ${project.status?.name === 'Completed' ? 'badge-success' : 'badge-primary'}`}>
                    {project.status?.name || 'Draft'}
                  </span>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Start Date</div>
                <div className={styles.fieldValue}>
                  {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>Completion Date</div>
                <div className={styles.fieldValue}>
                  {project.completionDate ? new Date(project.completionDate).toLocaleDateString() : '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Content' && (
          <div>
            <h3>Modules & Topics</h3>
            {project.modules?.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>No modules defined for this project.</p>
            ) : (
              <ul style={{ marginTop: 12, paddingLeft: 20 }}>
                {project.modules?.map((m: any) => (
                  <li key={m.id} style={{ marginBottom: 8 }}>
                    <strong>{m.moduleNumber}</strong>: {m.name}
                    <ul>
                      {m.topics?.map((t: any) => (
                        <li key={t.id}>{t.name}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'Documents' && (
          <div>
            <h3>Documents ({project.documents?.length || 0})</h3>
            {/* Real implementation would show a document table here */}
            <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>Document list placeholder.</p>
          </div>
        )}

        {/* Other tabs placeholders */}
        {['SME', 'Production', 'Sanction', 'Activity'].includes(activeTab) && (
          <div>
            <h3>{activeTab} Information</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>
              {activeTab} data and related tables will be displayed here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
