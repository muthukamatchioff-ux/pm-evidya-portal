import React from 'react';
import { prisma } from '@/lib/prisma';
import styles from './production.module.css';
import ProductionClient from './ProductionClient';

export const metadata = {
  title: 'Video Production Records | PM e-Vidya'
};

export default async function ProductionPage() {
  const records = await prisma.productionRecord.findMany({
    include: {
      project: {
        include: {
          trade: true,
          language: true
        }
      }
    },
    orderBy: { shootDate: 'desc' }
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Video Production Records</h1>
        <button className="btn-primary">
          <span>➕</span> Add Shoot Record
        </button>
      </div>

      <div className={styles.card}>
        <ProductionClient records={records} />
      </div>
    </div>
  );
}
