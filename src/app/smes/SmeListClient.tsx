"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './smes.module.css';
import { deleteSMEWorkEntry } from './[id]/actions';

interface SmeListClientProps {
  initialWorkEntries: any[];
  role: string;
}

export default function SmeListClient({ initialWorkEntries, role }: SmeListClientProps) {
  const [entries, setEntries] = useState(initialWorkEntries);
  const [searchTerm, setSearchTerm] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const getEpicId = (epicSequence: number) =>
    `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3200);
  };

  // KPI Calculations
  const totalEntries = entries.length;

  const uniqueSmesCount = useMemo(() => {
    const ids = new Set(entries.map(e => e.smeId || e.sme?.id));
    return ids.size;
  }, [entries]);

  const uniqueTrades = useMemo(() => {
    const tradesSet = new Set<string>();
    entries.forEach(e => {
      if (e.trade && e.trade !== 'TBD') tradesSet.add(e.trade);
    });
    return Array.from(tradesSet).sort();
  }, [entries]);

  const completedCount = useMemo(() => {
    return entries.filter(e => {
      const st = (e.payments?.[0]?.status || 'INITIATED').toUpperCase();
      return st === 'COMPLETED' || st === 'PAID' || st === 'APPROVED';
    }).length;
  }, [entries]);

  const onProcessCount = useMemo(() => {
    return entries.filter(e => {
      const st = (e.payments?.[0]?.status || 'INITIATED').toUpperCase();
      return st === 'ON_PROCESS' || st === 'IN_PROGRESS' || st === 'PENDING';
    }).length;
  }, [entries]);

  const handleDelete = async (entryId: string, smeName: string, trade: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the SME Work Entry for "${smeName}" (${trade})?\n\nThis will permanently delete this work entry, payments, and any generated documents.`
      )
    ) {
      return;
    }

    setDeletingId(entryId);
    try {
      const res = await deleteSMEWorkEntry(entryId);
      if (res.success) {
        setEntries(prev => prev.filter(e => e.id !== entryId));
        showToast('SME Work Entry deleted successfully.');
      } else {
        alert('Error deleting entry: ' + (res.error || 'Failed to delete'));
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting SME entry');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered entries based on Search and Trade
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Trade filter
      if (tradeFilter && entry.trade !== tradeFilter) {
        return false;
      }

      // Search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const epic = getEpicId(entry.epicSequence || 1).toLowerCase();
        return (
          entry.sme?.name?.toLowerCase().includes(searchLower) ||
          entry.trade?.toLowerCase().includes(searchLower) ||
          (entry.sme?.designation &&
            entry.sme.designation.toLowerCase().includes(searchLower)) ||
          (entry.sme?.institute &&
            entry.sme.institute.toLowerCase().includes(searchLower)) ||
          epic.includes(searchLower)
        );
      }

      return true;
    });
  }, [entries, searchTerm, tradeFilter]);

  const hasActiveFilters = !!(searchTerm || tradeFilter);

  const resetFilters = () => {
    setSearchTerm('');
    setTradeFilter('');
  };

  return (
    <>
      {/* Toast Notification */}
      {successToast && (
        <div className={styles.toast}>
          <span>✓ {successToast}</span>
        </div>
      )}

      {/* Executive KPI Summary Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Total Registered SMEs</span>
            <div className={styles.metricIcon}>👨‍🏫</div>
          </div>
          <div className={styles.metricValue}>{uniqueSmesCount}</div>
          <div className={styles.metricSubtext}>Subject Matter Experts onboarded</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Total EPIC Records</span>
            <div className={styles.metricIcon}>🏷️</div>
          </div>
          <div className={styles.metricValue} style={{ color: '#0284c7' }}>
            {totalEntries}
          </div>
          <div className={styles.metricSubtext}>Trackable work assignments</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Trades Covered</span>
            <div className={styles.metricIcon}>📚</div>
          </div>
          <div className={styles.metricValue} style={{ color: '#4f46e5' }}>
            {uniqueTrades.length}
          </div>
          <div className={styles.metricSubtext}>Curriculum domains mapped</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <span className={styles.metricLabel}>Completed Settlements</span>
            <div className={styles.metricIcon}>💳</div>
          </div>
          <div className={styles.metricValue} style={{ color: '#16a34a' }}>
            {completedCount}
          </div>
          <div className={styles.metricSubtext}>
            {onProcessCount} in process, {totalEntries - completedCount - onProcessCount} initiated
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className={styles.filterToolbar}>
        <div className={styles.filterControlsRow}>
          {/* Keyword Search */}
          <div className={styles.searchInputWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search SME Name, EPIC ID, Trade, Institute, Designation..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>



          {/* Trade Filter */}
          <select
            value={tradeFilter}
            onChange={e => setTradeFilter(e.target.value)}
            className={`${styles.filterSelect} ${
              tradeFilter ? styles.filterSelectActive : ''
            }`}
          >
            <option value="">-- All Trades ({uniqueTrades.length}) --</option>
            {uniqueTrades.map(trade => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button onClick={resetFilters} className={styles.btnClearFilters}>
              ✕ Reset
            </button>
          )}
        </div>
      </div>

      {/* SME Management Table Card */}
      <div className={styles.tableCard}>
        <div className={styles.tableHeaderBar}>
          <h4 className={styles.tableTitle}>SME Master Directory</h4>
          <span className={styles.tableCount}>
            Showing {filteredEntries.length} of {totalEntries} entries
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>S.no</th>
                <th>EPIC ID</th>
                <th>SME Name</th>
                <th>Designation</th>
                <th>Trade</th>
                <th style={{ textAlign: 'right', minWidth: '170px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    No SME Work Entries match your filter.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => {
                  return (
                    <tr key={entry.id}>
                      <td style={{ color: '#64748b', fontWeight: 600 }}>{index + 1}</td>
                      <td>
                        <span className={styles.epicPill}>
                          {getEpicId(entry.epicSequence || index + 1)}
                        </span>
                      </td>
                      <td>
                        {/* SME Link connects directly to profile */}
                        <Link href={`/smes/${entry.smeId}`} className={styles.smeLink}>
                          {entry.sme?.name}
                        </Link>
                        {entry.sme?.institute && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {entry.sme.institute}
                          </div>
                        )}
                      </td>
                      <td style={{ color: '#334155' }}>
                        {entry.sme?.designation || '-'}
                      </td>
                      <td>
                        <span className={styles.tradeBadge}>
                          {entry.trade || 'General'}
                        </span>
                      </td>

                      {/* Actions: PRESERVE EXACT SAME EDIT ROUTE AND FUNCTIONALITY */}
                      <td style={{ textAlign: 'right' }}>
                        <div
                          className={styles.actionsGroup}
                          style={{ justifyContent: 'flex-end' }}
                        >
                          {role === 'ADMIN' ? (
                            <>
                              {/* Existing Edit Button: Points to exact same route /smes/${entry.smeId} */}
                              <Link
                                href={`/smes/${entry.smeId}`}
                                className={styles.btnEdit}
                                title="Edit SME details and documents"
                              >
                                ✏️ Edit
                              </Link>
                              {/* Existing Delete Button */}
                              <button
                                onClick={() =>
                                  handleDelete(entry.id, entry.sme?.name, entry.trade)
                                }
                                disabled={deletingId === entry.id}
                                className={`${styles.btnDelete} ${
                                  deletingId === entry.id ? styles.btnDeleteDisabled : ''
                                }`}
                                title="Delete this work entry"
                              >
                                🗑️ Delete
                              </button>
                            </>
                          ) : (
                            <Link
                              href={`/smes/${entry.smeId}`}
                              className={styles.btnEdit}
                              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                            >
                              👁️ View
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
