import React from 'react';
import { prisma } from '@/lib/prisma';
import GeneratorClient from './GeneratorClient';
import { getTemplates } from '@/lib/templates';

export default async function GeneratorPage(props: { searchParams: Promise<{ smeId?: string, entryId?: string, type?: string }> }) {
  const searchParams = await props.searchParams;
  const smes = await prisma.sME.findMany({
    include: {
      workEntries: {
        include: {
          payments: true
        }
      }
    }
  });

  const templates = await getTemplates();

  return <GeneratorClient smes={smes} templates={templates} preselectedSmeId={searchParams.smeId} preselectedEntryId={searchParams.entryId} preselectedType={searchParams.type} />;
}
