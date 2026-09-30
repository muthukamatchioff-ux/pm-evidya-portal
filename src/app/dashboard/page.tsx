import React from 'react';
import styles from './dashboard.module.css';
import { prisma } from '@/lib/prisma';

export default async function Dashboard() {
  const budgetHeads = await prisma.budgetHead.findMany();
  
  const totalApproved = budgetHeads.reduce((sum, bh) => sum + bh.approvedBudget, 0);
  const totalUtilized = budgetHeads.reduce((sum, bh) => sum + bh.utilizedAmount, 0);
  const totalBalance = totalApproved - totalUtilized;
  const overallUtilization = totalApproved > 0 ? ((totalUtilized / totalApproved) * 100).toFixed(1) : 0;

  const totalSmes = await prisma.sME.count();
  const activeSmes = await prisma.sME.count({ where: { status: 'ACTIVE' } });
  
  const pendingPayments = await prisma.payment.count({ where: { status: 'PENDING_APPROVAL' } });
  const completedPayments = await prisma.payment.count({ where: { status: 'PAID' } });
  
  const missingDocs = await prisma.document.count({ where: { status: 'MISSING' } });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Dashboard</h1>
        <div className={styles.userProfile}>Accounts Admin</div>
      </header>

      <main className={styles.main}>
        <section className={styles.summarySection}>
          <div className={styles.statCard}>
            <h3>Approved Budget</h3>
            <p className={styles.statValue}>₹ {totalApproved.toLocaleString('en-IN')}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Utilized</h3>
            <p className={styles.statValue}>₹ {totalUtilized.toLocaleString('en-IN')}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Balance</h3>
            <p className={styles.statValue}>₹ {totalBalance.toLocaleString('en-IN')}</p>
          </div>
          <div className={styles.statCard}>
            <h3>Overall Utilization</h3>
            <p className={styles.statValue}>{overallUtilization}%</p>
          </div>
        </section>

        <section className={styles.monitorSection}>
          <h2>BUDGET HEAD MONITORING</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Budget Head</th>
                  <th>Approved Budget</th>
                  <th>Utilized</th>
                  <th>Balance</th>
                  <th>Utilization %</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {budgetHeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyState}>No budget heads configured.</td>
                  </tr>
                ) : (
                  budgetHeads.map(bh => {
                    const balance = bh.approvedBudget - bh.utilizedAmount;
                    const utilPercent = bh.approvedBudget > 0 ? ((bh.utilizedAmount / bh.approvedBudget) * 100).toFixed(1) : 0;
                    return (
                      <tr key={bh.id}>
                        <td>{bh.name}</td>
                        <td>₹ {bh.approvedBudget.toLocaleString('en-IN')}</td>
                        <td>₹ {bh.utilizedAmount.toLocaleString('en-IN')}</td>
                        <td>₹ {balance.toLocaleString('en-IN')}</td>
                        <td>{utilPercent}%</td>
                        <td>{Number(utilPercent) > 90 ? 'Warning' : 'OK'}</td>
                        <td><button className={styles.btnPrimary}>View</button></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.monitorSection}>
          <h2>SME MONITORING</h2>
          <div className={styles.smeStats}>
            <div className={styles.smeStatCard}>Total SMEs: {totalSmes}</div>
            <div className={styles.smeStatCard}>Active SMEs: {activeSmes}</div>
            <div className={styles.smeStatCard}>Pending Payments: {pendingPayments}</div>
            <div className={styles.smeStatCard}>Completed Payments: {completedPayments}</div>
            <div className={styles.smeStatCard}>Missing Documents: {missingDocs}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
