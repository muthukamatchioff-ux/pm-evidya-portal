import React from 'react';
import Link from 'next/link';
import { getDashboardKPIs, getBudgetComponents } from '@/app/budget/actions';
import styles from './dashboard.module.css';

export default async function Dashboard() {
  const kpis = await getDashboardKPIs();
  const components = await getBudgetComponents();

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>PM e-Vidya</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Approved Budget vs Expenditure – Component-wise Financial Dashboard
          </p>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className={styles.summaryGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}><span>💰</span> Total Approved Budget</div>
          <div className={styles.statValue}>₹ {kpis.totalApproved.toLocaleString('en-IN')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}><span>📉</span> Total Expenditure</div>
          <div className={styles.statValue} style={{ color: 'var(--error)' }}>
            ₹ {kpis.totalExpenditure.toLocaleString('en-IN')}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}><span>✅</span> Total Unutilized</div>
          <div className={styles.statValue} style={{ color: 'var(--success)' }}>
            ₹ {kpis.totalUnutilized.toLocaleString('en-IN')}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}><span>📊</span> Overall Utilization</div>
          <div className={styles.statValue}>{kpis.overallUtilization}%</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}><span>📁</span> No. of Components</div>
          <div className={styles.statValue}>{kpis.componentsCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}><span>📄</span> Expenditure Records</div>
          <div className={styles.statValue}>{kpis.recordsCount}</div>
        </div>
      </div>

      {/* COMPONENT-WISE CARDS */}
      <div className={styles.financialSection}>
        <h2 className={styles.sectionHeading}>Component-wise Financial Status</h2>
        <div className={styles.budgetGrid}>
          {components.map((comp: any) => {
            const romanNumeral = ['I', 'II', 'III', 'IV', 'V', 'VI'][comp.componentNo - 1];
            return (
              <div key={comp.id} className={styles.budgetCard}>
                <h3 className={styles.budgetTitle}>{comp.name}</h3>
                
                <div className={styles.budgetRow}>
                  <span className={styles.budgetLabel}>Approved Budget</span>
                  <span className={styles.budgetValue}>₹ {comp.approvedBudget.toLocaleString('en-IN')}</span>
                </div>
                <div className={styles.budgetRow}>
                  <span className={styles.budgetLabel}>Expenditure Incurred</span>
                  <span className={styles.budgetExpense}>₹ {comp.expenditureIncurred.toLocaleString('en-IN')}</span>
                </div>
                <div className={styles.budgetRow}>
                  <span className={styles.budgetLabel}>Unutilized Balance</span>
                  <span className={styles.budgetUnutilized}>₹ {comp.unutilizedBalance.toLocaleString('en-IN')}</span>
                </div>
                
                <div className={styles.progressContainer}>
                  <div 
                    className={styles.progressBar} 
                    style={{ width: `${Math.min(Number(comp.utilizationPercent), 100)}%`, backgroundColor: Number(comp.utilizationPercent) > 100 ? 'var(--error)' : 'var(--primary)' }}
                  ></div>
                </div>
                <div className={styles.progressText}>
                  {comp.utilizationPercent}% Utilized
                </div>

                <div className={styles.budgetActions}>
                  <Link href={`/budget/annexure-${comp.componentNo}`} className={styles.btnActionSm}>
                    View Annexure-{romanNumeral}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ANNEXURES AND SUPPORTING DOCUMENTS */}
      <div className={styles.financialSection} style={{ marginTop: '40px' }}>
        <h2 className={styles.sectionHeading}>Annexures & Supporting Documents</h2>
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Annexure Type</th>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Related Budget Component</th>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Expenditure Records</th>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '16px', fontSize: '13px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {components.map((comp: any) => {
                const romanNumeral = ['I', 'II', 'III', 'IV', 'V', 'VI'][comp.componentNo - 1];
                let records = [];
                if (comp.componentNo === 1) records = comp.annexureI || [];
                if (comp.componentNo === 2) records = comp.annexureII || [];
                if (comp.componentNo === 3) records = comp.annexureIII || [];
                if (comp.componentNo === 4) records = comp.annexureIV || [];
                if (comp.componentNo === 5) records = comp.annexureV || [];
                if (comp.componentNo === 6) records = comp.annexureVI || [];
                
                const count = records.length;
                const hasDocs = count > 0;
                
                return (
                  <tr key={comp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontWeight: 'bold' }}>Annexure {romanNumeral}</td>
                    <td style={{ padding: '16px', color: '#334155' }}>{comp.name}</td>
                    <td style={{ padding: '16px' }}>{count} uploaded copies</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        background: hasDocs ? '#dcfce3' : '#f1f5f9', 
                        color: hasDocs ? '#16a34a' : '#64748b', 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' 
                      }}>
                        {hasDocs ? 'Available' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Link 
                          href={`/budget/annexure-${comp.componentNo}`}
                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
                        >
                          View / Open
                        </Link>
                        {hasDocs && (
                          <Link 
                            href={`/budget/annexure-${comp.componentNo}`}
                            style={{ background: '#3b82f6', border: '1px solid #2563eb', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
                          >
                            Download Docs
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
