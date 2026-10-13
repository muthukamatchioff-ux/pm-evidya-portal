"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './smes.module.css';
import { deleteSMEWorkEntry, updateSmePaymentInline } from './[id]/actions';

interface SmeListClientProps {
  initialWorkEntries: any[];
  role: string;
}

export default function SmeListClient({ initialWorkEntries, role }: SmeListClientProps) {
  const [entries, setEntries] = useState(initialWorkEntries);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingPaymentId, setSavingPaymentId] = useState<string | null>(null);
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

  const handleUpdatePayment = async (entryId: string, newAmount: number, newStatus: string) => {
    setSavingPaymentId(entryId);
    try {
      const res = await updateSmePaymentInline(entryId, newAmount, newStatus);
      if (res.success) {
        setEntries(prev =>
          prev.map(entry => {
            if (entry.id === entryId) {
              const currentPayments =
                entry.payments && entry.payments.length > 0 ? entry.payments : [{}];
              const updatedPayments = currentPayments.map((p: any, idx: number) =>
                idx === 0
                  ? {
                      ...p,
                      totalAmount: newAmount,
                      status: newStatus
                    }
                  : p
              );
              return {
                ...entry,
                payments: updatedPayments
              };
            }
            return entry;
          })
        );
        showToast('Payment record updated successfully.');
      } else {
        alert('Failed to update payment: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error saving payment');
    } finally {
      setSavingPaymentId(null);
    }
  };

  // Filtered entries based on Search, Status, and Trade
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const payment = entry.payments && entry.payments.length > 0 ? entry.payments[0] : null;
      const paymentStatus = (payment?.status || 'INITIATED').toUpperCase();

      let normalizedStatus = 'INITIATED';
      if (
        paymentStatus === 'ON_PROCESS' ||
        paymentStatus === 'IN_PROGRESS' ||
        paymentStatus === 'PENDING'
      ) {
        normalizedStatus = 'ON_PROCESS';
      } else if (
        paymentStatus === 'COMPLETED' ||
        paymentStatus === 'PAID' ||
        paymentStatus === 'APPROVED'
      ) {
        normalizedStatus = 'COMPLETED';
      }

      // Status filter
      if (statusFilter && normalizedStatus !== statusFilter) {
        return false;
      }

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
  }, [entries, searchTerm, statusFilter, tradeFilter]);

  const hasActiveFilters = !!(searchTerm || statusFilter || tradeFilter);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
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

          {/* Payment Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={`${styles.filterSelect} ${
              statusFilter ? styles.filterSelectActive : ''
            }`}
          >
            <option value="">-- All Payment Statuses --</option>
            <option value="COMPLETED">Completed ({completedCount})</option>
            <option value="ON_PROCESS">On Process ({onProcessCount})</option>
            <option value="INITIATED">
              Initiated ({totalEntries - completedCount - onProcessCount})
            </option>
          </select>

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
                <th>Total Amt</th>
                <th>Payment Status</th>
                <th style={{ textAlign: 'right', minWidth: '170px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    No SME Work Entries match your filter.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => {
                  const payment =
                    entry.payments && entry.payments.length > 0 ? entry.payments[0] : null;
                  const total =
                    payment?.totalAmount !== undefined && payment?.totalAmount !== null
                      ? payment.totalAmount
                      : (entry.days || 0) * (entry.ratePerDay || 0);
                  const paymentStatus = (payment?.status || 'INITIATED').toUpperCase();
                  const isSaving = savingPaymentId === entry.id;

                  // Normalize paymentStatus to one of INITIATED, ON_PROCESS, COMPLETED
                  let normalizedStatus = 'INITIATED';
                  if (
                    paymentStatus === 'ON_PROCESS' ||
                    paymentStatus === 'IN_PROGRESS' ||
                    paymentStatus === 'PENDING'
                  ) {
                    normalizedStatus = 'ON_PROCESS';
                  } else if (
                    paymentStatus === 'COMPLETED' ||
                    paymentStatus === 'PAID' ||
                    paymentStatus === 'APPROVED'
                  ) {
                    normalizedStatus = 'COMPLETED';
                  } else {
                    normalizedStatus = 'INITIATED';
                  }

                  const getSelectClass = (st: string) => {
                    switch (st) {
                      case 'COMPLETED':
                        return styles.statusSelectCompleted;
                      case 'ON_PROCESS':
                        return styles.statusSelectOnProcess;
                      default:
                        return styles.statusSelectInitiated;
                    }
                  };

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

                      {/* Total Amt - Editable input option for Admin */}
                      <td>
                        {role === 'ADMIN' ? (
                          <div className={styles.amountInputWrap}>
                            <span className={styles.currencyPrefix}>₹</span>
                            <input
                              type="number"
                              className={styles.amountInput}
                              defaultValue={total}
                              key={`${entry.id}-${total}`}
                              onBlur={e => {
                                const val = parseFloat(e.target.value) || 0;
                                if (val !== total) {
                                  handleUpdatePayment(entry.id, val, normalizedStatus);
                                }
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const val =
                                    parseFloat((e.target as HTMLInputElement).value) || 0;
                                  if (val !== total) {
                                    handleUpdatePayment(entry.id, val, normalizedStatus);
                                  }
                                }
                              }}
                              disabled={isSaving}
                              title="Enter Total Amount and press Enter or click outside to save"
                            />
                          </div>
                        ) : (
                          <span style={{ fontWeight: 600 }}>
                            ₹ {total.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      {/* Payment Status - Dropdown pattern with initiated / on process / completed */}
                      <td>
                        {role === 'ADMIN' ? (
                          <select
                            className={`${styles.statusSelect} ${getSelectClass(
                              normalizedStatus
                            )}`}
                            value={normalizedStatus}
                            disabled={isSaving}
                            onChange={e => {
                              const newStatus = e.target.value;
                              handleUpdatePayment(entry.id, total, newStatus);
                            }}
                          >
                            <option value="INITIATED">Initiated</option>
                            <option value="ON_PROCESS">On Process</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        ) : (
                          <span
                            className={`${styles.statusSelect} ${getSelectClass(
                              normalizedStatus
                            )}`}
                          >
                            {normalizedStatus === 'ON_PROCESS'
                              ? 'On Process'
                              : normalizedStatus === 'COMPLETED'
                              ? 'Completed'
                              : 'Initiated'}
                          </span>
                        )}
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
