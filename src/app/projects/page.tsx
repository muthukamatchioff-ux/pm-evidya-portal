import React from 'react';
import { prisma } from '@/lib/prisma';
import styles from './projects.module.css';
import ProjectsTable from './ProjectsTable';

export default async function ProjectsPage() {
  // Fetch projects with their relations
  const projects = await prisma.project.findMany({
    include: {
      trade: true,
      language: true,
      status: true,
      _count: {
        select: { documents: true, modules: true }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Projects</h1>
        <button className="btn-primary">
          <span>➕</span> New Project
        </button>
      </div>
      
      <div className={styles.card}>
        <ProjectsTable projects={projects} />
      </div>
    </div>
  );
}
