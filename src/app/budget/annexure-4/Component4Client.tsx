'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  addAnnexureIVEntry,
  updateAnnexureIVEntry,
  deleteAnnexureIVEntry,
} from '../actions';
import {
  COMPONENT_4_COA_MASTER,
  PERMITTED_TXN_TYPES,
} from '@/lib/coaMaster';
import styles from './annexure4.module.css';
import { downloadTableAsDocx } from '@/lib/tableToDocx';
import * as XLSX from 'xlsx';

interface Props {
  role?: string;
  budgetComponentId: string;
  entries: any[];
  approvedBudget?: number;
}

export default function Component4Client({
  role,
  budgetComponentId,
  entries,
  approvedBudget = 500000,
}: Props) {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>(entries || []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Alerts
  const [alertInfo, setAlertInfo] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [coaFilter, setCoaFilter] = useState('ALL');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');

  // 10-column form state
  const initialFormState = {
    coaCode: '4.1',
    name: '',
    date: new Date().toISOString().split('T')[0],
    coaName: 'Archive, Cloud Storage & Data Repository',
    txnType: 'Journal Voucher',
    voucher: '',
    narration: '',
    expenditure: '',
    transcriptionNote: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Sync entries from props when page revalidates
  useEffect(() => {
    if (entries && Array.isArray(entries)) {
      setRecords(entries);
    }
  }, [entries]);

  // Handle CoA code change & auto-populate CoA Name
  const handleCoaCodeChange = (codeVal: string) => {
    const matched = COMPONENT_4_COA_MASTER.find(
      (c) => c.code.toLowerCase() === codeVal.trim().toLowerCase()
    );
    setFormData((prev) => ({
      ...prev,
      coaCode: codeVal,
      coaName: matched ? matched.name : prev.coaName,
    }));
    if (fieldErrors.coaCode) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.coaCode;
        return next;
      });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Client-side pre-validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    const code = (formData.coaCode || '').trim();
    if (!code) {
      errors.coaCode = 'Please select a Chart of Accounts code.';
    } else if (
      code === '70112' ||
      code.startsWith('7') ||
      /studio\s*setup|studio\s*upgradation/i.test(formData.coaName)
    ) {
      errors.coaCode =
        'Head 7 (Studio Upgradation - 70112) is offline-only. Annexure IV entries must belong to Component 4 (4.1 to 4.6).';
    } else if (
      !COMPONENT_4_COA_MASTER.some(
        (c) => c.code.toLowerCase() === code.toLowerCase()
      )
    ) {
      errors.coaCode =
        'Please select an approved Component 4 CoA code (4.1 to 4.6).';
    }

    if (!formData.name.trim()) {
      errors.name = 'Please enter a valid vendor, agency, or party name.';
    }
    if (!formData.date.trim()) {
      errors.date = 'Please select a valid date.';
    }
    if (!formData.voucher.trim()) {
      errors.voucher = 'Please enter a valid voucher or reference number.';
    }
    const expNum = Number(formData.expenditure);
    if (
      formData.expenditure === '' ||
      isNaN(expNum) ||
      !isFinite(expNum)
    ) {
      errors.expenditure = 'Please enter a valid expenditure amount.';
    } else if (expNum < 0) {
      errors.expenditure = 'Expenditure amount cannot be negative.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertInfo(null);

    if (!validateForm()) {
      setAlertInfo({
        type: 'error',
        message: 'Please resolve the highlighted validation errors before saving.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        budgetComponentId,
        coaCode: formData.coaCode.trim(),
        coaName: formData.coaName.trim(),
        name: formData.name.trim(),
        vendor: formData.name.trim(),
        date: formData.date,
        transactionDate: formData.date,
        txnType: formData.txnType,
        voucher: formData.voucher.trim(),
        voucherNo: formData.voucher.trim(),
        narration: formData.narration.trim(),
        description: formData.narration.trim() || formData.coaName.trim(),
        expenditure: Number(formData.expenditure),
        totalExpenditure: Number(formData.expenditure),
        transcriptionNote: formData.transcriptionNote.trim(),
        remarks: formData.transcriptionNote.trim(),
      };

      let res: any;
      if (editingId) {
        res = await updateAnnexureIVEntry(editingId, payload);
      } else {
        res = await addAnnexureIVEntry(payload);
      }

      if (!res || !res.success) {
        if (res?.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        setAlertInfo({
          type: 'error',
          message:
            res?.error ||
            'Unable to save the entry. Please check the inputs and try again.',
        });
        setIsSubmitting(false);
        return;
      }

      const updatedAmount = Number(payload.expenditure) || 0;
      const savedData = {
        ...(res.data || {}),
        ...payload,
        expenditure: updatedAmount,
        totalExpenditure: updatedAmount,
        id: editingId || res.data?.id || `aiv-${Date.now()}`,
      };

      if (editingId) {
        setRecords((prev) =>
          prev.map((r) => (r.id === editingId ? { ...r, ...savedData, expenditure: updatedAmount, totalExpenditure: updatedAmount } : r))
        );
        setAlertInfo({
          type: 'success',
          message: 'Expenditure transaction updated successfully in database.',
        });
      } else {
        setRecords((prev) => [savedData, ...prev]);
        setAlertInfo({
          type: 'success',
          message: 'Expenditure transaction created and saved successfully.',
        });
      }

      // Reset Form
      setFormData(initialFormState);
      setIsAdding(false);
      setEditingId(null);
      setFieldErrors({});
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setAlertInfo({
        type: 'error',
        message: 'A network or server error occurred while processing the request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (entry: any) => {
    setAlertInfo(null);
    setFieldErrors({});
    setEditingId(entry.id);
    setIsAdding(true);

    let rawDate = entry.date || entry.transactionDate || entry.createdAt;
    if (rawDate instanceof Date) {
      rawDate = rawDate.toISOString().split('T')[0];
    } else if (typeof rawDate === 'string' && rawDate.includes('T')) {
      rawDate = rawDate.split('T')[0];
    } else if (!rawDate || rawDate.length < 8) {
      rawDate = new Date().toISOString().split('T')[0];
    }

    setFormData({
      coaCode: entry.coaCode || '4.1',
      name: entry.name || entry.vendor || '',
      date: rawDate,
      coaName: entry.coaName || entry.service || 'Archive, Cloud Storage & Data Repository',
      txnType: entry.txnType || 'Journal Voucher',
      voucher: entry.voucher || entry.utrNumber || entry.invoiceNo || entry.purchaseRef || '',
      narration: entry.narration || entry.description || entry.service || '',
      expenditure: String(entry.expenditure ?? entry.totalExpenditure ?? ''),
      transcriptionNote: entry.transcriptionNote || entry.remarks || '',
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData(initialFormState);
    setFieldErrors({});
    setAlertInfo(null);
  };

  const handleDeleteClick = async (entry: any) => {
    const displayName = entry.name || entry.vendor || 'this entry';
    const displayVoucher = entry.voucher || entry.utrNumber || entry.id;
    if (
      !window.confirm(
        `Are you sure you want to delete expenditure entry "${displayVoucher}" for ${displayName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await deleteAnnexureIVEntry(entry.id);
      if (res && res.success) {
        setRecords((prev) => prev.filter((r) => r.id !== entry.id));
        setAlertInfo({
          type: 'success',
          message: `Transaction "${displayVoucher}" has been deleted successfully.`,
        });
        router.refresh();
      } else {
        setAlertInfo({
          type: 'error',
          message: res?.error || 'Unable to delete the entry. Please try again.',
        });
      }
    } catch (err: any) {
      console.error(err);
      setAlertInfo({
        type: 'error',
        message: 'A network error occurred while deleting the record.',
      });
    }
  };

  // Helper date formatter DD-MM-YYYY
  const formatDisplayDate = (dateVal: any): string => {
    if (!dateVal) return '-';
    if (dateVal instanceof Date) {
      const d = String(dateVal.getUTCDate()).padStart(2, '0');
      const m = String(dateVal.getUTCMonth() + 1).padStart(2, '0');
      const y = dateVal.getUTCFullYear();
      return `${d}-${m}-${y}`;
    }
    const str = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.split('T')[0].split('-');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
      return str.replace(/\//g, '-');
    }
    return str;
  };

  const formatInr = (val: number): string => {
    return (val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Filtered Records based on Search, CoA, and Date Range
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (r.name || r.vendor || '').toLowerCase().includes(q);
        const matchesVoucher = (r.voucher || r.utrNumber || r.invoiceNo || '').toLowerCase().includes(q);
        const matchesCoaCode = (r.coaCode || '').toLowerCase().includes(q);
        const matchesCoaName = (r.coaName || r.service || '').toLowerCase().includes(q);
        const matchesNarration = (r.narration || r.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesVoucher && !matchesCoaCode && !matchesCoaName && !matchesNarration) {
          return false;
        }
      }

      // 2. CoA Code Filter
      if (coaFilter !== 'ALL') {
        const code = (r.coaCode || '4.1').toLowerCase();
        if (code !== coaFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Date Filters
      const itemDateStr = r.date || (r.transactionDate ? new Date(r.transactionDate).toISOString().split('T')[0] : '');
      if (fromDateFilter && itemDateStr && itemDateStr < fromDateFilter) {
        return false;
      }
      if (toDateFilter && itemDateStr && itemDateStr > toDateFilter) {
        return false;
      }

      return true;
    });
  }, [records, searchQuery, coaFilter, fromDateFilter, toDateFilter]);

  // Financial Calculations for this Budget Head
  const totalExpenditure = useMemo(() => {
    return records.reduce((acc, r) => acc + (Number(r.totalExpenditure ?? r.expenditure) || 0), 0);
  }, [records]);

  const availableBalance = approvedBudget - totalExpenditure;
  const utilizationPercent = approvedBudget > 0 ? (totalExpenditure / approvedBudget) * 100 : 0;

  // Filtered sum
  const filteredExpenditure = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + (Number(r.totalExpenditure ?? r.expenditure) || 0), 0);
  }, [filteredRecords]);

  // Export to Excel with 10 Columns
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const headers = [
      'CoA Code',
      'S.No',
      'Name',
      'Date',
      'CoA Name',
      'Txn Type (Doc Type)',
      'Voucher',
      'Narration',
      'Expenditure (INR)',
      'Transcription Note',
    ];

    const dataRows = filteredRecords.map((r, idx) => {
      const exp = Number(r.totalExpenditure ?? r.expenditure) || 0;
      return [
        r.coaCode || '4.1',
        idx + 1,
        r.name || r.vendor || '',
        formatDisplayDate(r.date || r.transactionDate),
        r.coaName || r.service || 'Archive, Cloud Storage & Data Repository',
        r.txnType || 'Journal Voucher',
        r.voucher || r.utrNumber || r.invoiceNo || 'N/A',
        r.narration || r.description || '',
        exp,
        r.transcriptionNote || r.remarks || '',
      ];
    });

    // Total Row
    const totalRow = [
      '',
      '',
      'TOTAL',
      '',
      '',
      '',
      '',
      '',
      filteredExpenditure,
      '',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows, totalRow]);

    // Format column widths
    ws['!cols'] = [
      { wch: 12 }, // CoA Code
      { wch: 8 },  // S.No
      { wch: 38 }, // Name
      { wch: 14 }, // Date
      { wch: 42 }, // CoA Name
      { wch: 22 }, // Txn Type
      { wch: 22 }, // Voucher
      { wch: 48 }, // Narration
      { wch: 22 }, // Expenditure (INR)
      { wch: 36 }, // Transcription Note
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Annexure IV Expenditure');
    XLSX.writeFile(wb, 'PM_eVidya_Annexure_IV_Archive_Bandwidth_Networking.xlsx');
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.headerArea}>
        <div className={styles.titleGroup}>
          <h2 className={styles.mainTitle}>
            Annexure IV — Archive / Bandwidth / Networking Expenditure
          </h2>
          <p className={styles.subtitle}>
            CoA-based financial ledger, transaction tracking, and expenditure monitoring for Digital Infrastructure
          </p>
        </div>

        <div className={styles.topActions}>
          <button
            onClick={() => downloadTableAsDocx('dataTable', 'PM e-Vidya - Technology & Infrastructure', 'Annexure-IV', 'Annexure-IV_Report.docx')}
            className={`${styles.btn} ${styles.btnDocx}`}
            title="Download Word Template"
          >
            <span>📝</span> Download Docs Pattern
          </button>
          <button
            onClick={handleExportExcel}
            className={`${styles.btn} ${styles.btnExcel}`}
            title="Export 10-column table to Excel"
          >
            <span>📊</span> Export (Excel)
          </button>
          {role === 'ADMIN' && (
            <button
              onClick={() => {
                if (isAdding && !editingId) {
                  setIsAdding(false);
                } else {
                  setIsAdding(true);
                  setEditingId(null);
                  setFormData(initialFormState);
                  setFieldErrors({});
                }
              }}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              <span>{isAdding && !editingId ? '✕' : '+'}</span>{' '}
              {isAdding && !editingId ? 'Close Form' : 'Add New Entry'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Financial Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
            🪙
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiLabel}>Sanctioned Budget</span>
            <span className={styles.kpiValue}>₹ {formatInr(approvedBudget)}</span>
            <span className={styles.kpiSub}>Head 4 (Digital Infrastructure)</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#ecfdf5', color: '#16a34a' }}>
            ✅
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiLabel}>Total Expenditure</span>
            <span className={styles.kpiValue} style={{ color: '#15803d' }}>
              ₹ {formatInr(totalExpenditure)}
            </span>
            <span className={styles.kpiSub}>{records.length} Verified Vouchers</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#fffbeb', color: '#d97706' }}>
            ⏳
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiLabel}>Available Balance</span>
            <span className={styles.kpiValue} style={{ color: '#b45309' }}>
              ₹ {formatInr(availableBalance)}
            </span>
            <span className={styles.kpiSub}>{(100 - utilizationPercent).toFixed(2)}% remaining</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#faf5ff', color: '#9333ea' }}>
            📈
          </div>
          <div className={styles.kpiBody}>
            <span className={styles.kpiLabel}>Budget Utilization</span>
            <span className={styles.kpiValue} style={{ color: '#7c3aed' }}>
              {utilizationPercent.toFixed(2)}%
            </span>
            <span className={styles.kpiSub}>Approved Financial Basis</span>
          </div>
        </div>
      </div>

      {/* Toast Alert Banner */}
      {alertInfo && (
        <div
          className={`${styles.alertBanner} ${
            alertInfo.type === 'success' ? styles.alertSuccess : styles.alertError
          }`}
        >
          <span>
            {alertInfo.type === 'success' ? '✓ ' : '⚠️ '}
            {alertInfo.message}
          </span>
          <button
            onClick={() => setAlertInfo(null)}
            className={styles.alertCloseBtn}
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* CoA Expenditure Add / Edit Form */}
      {isAdding && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>
              <span>{editingId ? '✏️' : '📋'}</span>
              {editingId ? 'Edit Expenditure Entry' : 'New CoA Expenditure Entry'}
            </h3>
            <button
              onClick={handleCancelEdit}
              className={styles.alertCloseBtn}
              title="Cancel"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              {/* Column 1: CoA Code */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  1. CoA Code <span className={styles.requiredAsterisk}>*</span>
                </label>
                <select
                  name="coaCode"
                  value={formData.coaCode}
                  onChange={(e) => handleCoaCodeChange(e.target.value)}
                  className={`${styles.select} ${
                    fieldErrors.coaCode ? styles.inputError : ''
                  }`}
                  required
                >
                  {COMPONENT_4_COA_MASTER.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.coaCode && (
                  <span className={styles.fieldErrorText}>
                    {fieldErrors.coaCode}
                  </span>
                )}
              </div>

              {/* Column 5: CoA Name */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  5. CoA Name (Account Classification){' '}
                  <span className={styles.requiredAsterisk}>*</span>
                </label>
                <input
                  type="text"
                  name="coaName"
                  value={formData.coaName}
                  onChange={handleInputChange}
                  placeholder="Classification Title"
                  className={styles.input}
                  required
                />
              </div>

              {/* Column 3: Name (Party / Vendor) */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  3. Name (Vendor / Agency / Party){' '}
                  <span className={styles.requiredAsterisk}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Name of Vendor or Agency"
                  className={`${styles.input} ${
                    fieldErrors.name ? styles.inputError : ''
                  }`}
                  required
                />
                {fieldErrors.name && (
                  <span className={styles.fieldErrorText}>
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* Column 4: Date */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  4. Date (DD-MM-YYYY){' '}
                  <span className={styles.requiredAsterisk}>*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className={`${styles.input} ${
                    fieldErrors.date ? styles.inputError : ''
                  }`}
                  required
                />
                {fieldErrors.date && (
                  <span className={styles.fieldErrorText}>
                    {fieldErrors.date}
                  </span>
                )}
              </div>

              {/* Column 6: Txn Type (Doc Type) */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  6. Txn Type (Doc Type){' '}
                  <span className={styles.requiredAsterisk}>*</span>
                </label>
                <select
                  name="txnType"
                  value={formData.txnType}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  {PERMITTED_TXN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Column 7: Voucher */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  7. Voucher / Reference No.{' '}
                  <span className={styles.requiredAsterisk}>*</span>
                </label>
                <input
                  type="text"
                  name="voucher"
                  value={formData.voucher}
                  onChange={handleInputChange}
                  placeholder="e.g. JV20000017/26-27"
                  className={`${styles.input} ${
                    fieldErrors.voucher ? styles.inputError : ''
                  }`}
                  required
                />
                {fieldErrors.voucher && (
                  <span className={styles.fieldErrorText}>
                    {fieldErrors.voucher}
                  </span>
                )}
              </div>

              {/* Column 9: Expenditure (INR) */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  9. Expenditure (INR){' '}
                  <span className={styles.requiredAsterisk}>*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="expenditure"
                  value={formData.expenditure}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className={`${styles.input} ${
                    fieldErrors.expenditure ? styles.inputError : ''
                  }`}
                  required
                />
                {fieldErrors.expenditure && (
                  <span className={styles.fieldErrorText}>
                    {fieldErrors.expenditure}
                  </span>
                )}
              </div>

              {/* Column 8: Narration */}
              <div className={styles.formGroupFull}>
                <label className={styles.label}>8. Narration (Expenditure Description)</label>
                <textarea
                  name="narration"
                  value={formData.narration}
                  onChange={handleInputChange}
                  placeholder="Detailed purpose, service period, and accounting particulars..."
                  className={styles.textarea}
                  rows={2}
                />
              </div>

              {/* Column 10: Transcription Note */}
              <div className={styles.formGroupFull}>
                <label className={styles.label}>10. Transcription Note (Remarks / Verification Reference)</label>
                <textarea
                  name="transcriptionNote"
                  value={formData.transcriptionNote}
                  onChange={handleInputChange}
                  placeholder="Optional audit remarks, source file index, or transcription note..."
                  className={styles.textarea}
                  rows={2}
                />
              </div>

              {/* Form Action Buttons */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${styles.btn} ${styles.btnPrimary}`}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingId
                    ? 'Update Entry'
                    : 'Save Entry'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search name, voucher, narration..."
            className={styles.searchInput}
          />

          <select
            value={coaFilter}
            onChange={(e) => setCoaFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="ALL">All CoA Codes</option>
            {COMPONENT_4_COA_MASTER.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name.split(',')[0]}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fromDateFilter}
            onChange={(e) => setFromDateFilter(e.target.value)}
            title="Filter From Date"
            className={styles.filterSelect}
          />
          <input
            type="date"
            value={toDateFilter}
            onChange={(e) => setToDateFilter(e.target.value)}
            title="Filter To Date"
            className={styles.filterSelect}
          />

          {(searchQuery || coaFilter !== 'ALL' || fromDateFilter || toDateFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCoaFilter('ALL');
                setFromDateFilter('');
                setToDateFilter('');
              }}
              className={styles.btnAction}
              style={{ background: '#f1f5f9', color: '#475569' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className={styles.toolbarRight}>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>
            Showing <strong>{filteredRecords.length}</strong> of{' '}
            <strong>{records.length}</strong> entries
          </span>
        </div>
      </div>

      {/* 10-Column Data Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableScroll}>
          <table id="dataTable" className={styles.dataTable}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>CoA Code</th>
                <th className={styles.centerCol} style={{ width: '55px' }}>
                  S.No
                </th>
                <th style={{ minWidth: '180px' }}>Name</th>
                <th style={{ width: '110px' }}>Date</th>
                <th style={{ minWidth: '200px' }}>CoA Name</th>
                <th style={{ width: '130px' }}>Txn Type (Doc Type)</th>
                <th style={{ minWidth: '130px' }}>Voucher</th>
                <th style={{ minWidth: '240px' }}>Narration</th>
                <th className={styles.numCol} style={{ width: '140px' }}>
                  Expenditure (INR)
                </th>
                <th style={{ minWidth: '180px' }}>Transcription Note</th>
                {role === 'ADMIN' && (
                  <th className={styles.centerCol} style={{ width: '110px' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={role === 'ADMIN' ? 11 : 10}
                    className={styles.emptyState}
                  >
                    No matching expenditure entries found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((entry, idx) => {
                  const exp =
                    Number(entry.totalExpenditure ?? entry.expenditure) || 0;
                  return (
                    <tr key={entry.id || idx}>
                      {/* 1. CoA Code */}
                      <td>
                        <span className={styles.coaBadge}>
                          {entry.coaCode || '4.1'}
                        </span>
                      </td>

                      {/* 2. S.No */}
                      <td className={styles.centerCol}>
                        <strong>{idx + 1}</strong>
                      </td>

                      {/* 3. Name */}
                      <td>
                        <strong>{entry.name || entry.vendor}</strong>
                      </td>

                      {/* 4. Date */}
                      <td>
                        {formatDisplayDate(entry.date || entry.transactionDate)}
                      </td>

                      {/* 5. CoA Name */}
                      <td>
                        <span style={{ color: '#334155' }}>
                          {entry.coaName || entry.service || 'Archive, Cloud Storage & Data Repository'}
                        </span>
                      </td>

                      {/* 6. Txn Type */}
                      <td>
                        <span className={styles.docTypeBadge}>
                          {entry.txnType || 'Journal Voucher'}
                        </span>
                      </td>

                      {/* 7. Voucher */}
                      <td>
                        <code className={styles.voucherCode}>
                          {entry.voucher ||
                            entry.utrNumber ||
                            entry.invoiceNo ||
                            entry.purchaseRef ||
                            '-'}
                        </code>
                      </td>

                      {/* 8. Narration */}
                      <td style={{ maxWidth: '320px' }}>
                        <span
                          title={entry.narration || entry.description}
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {entry.narration || entry.description || '-'}
                        </span>
                      </td>

                      {/* 9. Expenditure (INR) */}
                      <td className={styles.numCol}>
                        ₹ {formatInr(exp)}
                      </td>

                      {/* 10. Transcription Note */}
                      <td style={{ maxWidth: '220px' }}>
                        <span style={{ color: '#64748b', fontSize: '11.5px' }}>
                          {entry.transcriptionNote || entry.remarks || '-'}
                        </span>
                      </td>

                      {/* Actions */}
                      {role === 'ADMIN' && (
                        <td className={styles.centerCol}>
                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                              justifyContent: 'center',
                            }}
                          >
                            <button
                              onClick={() => handleEditClick(entry)}
                              className={`${styles.btnAction} ${styles.btnEdit}`}
                              title="Edit Entry"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(entry)}
                              className={`${styles.btnAction} ${styles.btnDelete}`}
                              title="Delete Entry"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}

              {/* Total Row */}
              {filteredRecords.length > 0 && (
                <tr className={styles.totalRow}>
                  <td colSpan={2} style={{ textAlign: 'center' }}>
                    TOTAL
                  </td>
                  <td colSpan={6} style={{ color: '#475569', fontSize: '11.5px' }}>
                    Sum of {filteredRecords.length} Filtered Transactions
                  </td>
                  <td className={styles.numCol} style={{ color: '#0f172a' }}>
                    ₹ {formatInr(filteredExpenditure)}
                  </td>
                  <td colSpan={role === 'ADMIN' ? 2 : 1}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
