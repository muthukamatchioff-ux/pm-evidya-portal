import React from 'react';
import { getTemplates } from '@/lib/templates';
import TemplateClient from './TemplateClient';

export default async function TemplatesPage() {
  const templates = await getTemplates();
  return <TemplateClient templates={templates} />;
}
