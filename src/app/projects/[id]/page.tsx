import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProjectDetailClient from './ProjectDetailClient';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  if (id === 'new') {
    // Handle new project creation page logic or redirect
    return <div>New Project Form (Placeholder)</div>;
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      trade: true,
      language: true,
      status: true,
      modules: {
        include: { topics: true }
      },
      documents: true,
      production: true
    }
  });

  if (!project) {
    notFound();
  }

  return <ProjectDetailClient project={project} />;
}
