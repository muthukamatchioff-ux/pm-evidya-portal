'use client';

import React, { useState, useEffect } from 'react';
import { createSMEWithEntry } from './actions';
import Link from 'next/link';
import styles from './new.module.css';

export default function NewSMEPage() {
  const [days, setDays] = useState<number>(0);
  const [ratePerDay, setRatePerDay] = useState<number>(0);
  const [taAmount, setTaAmount] = useState<number>(0);
  const [otherAmount, setOtherAmount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  
  const [attendanceFrom, setAttendanceFrom] = useState('');
  const [attendanceTo, setAttendanceTo] = useState('');

  useEffect(() => {
    // Auto calculate days if both dates are selected
    if (attendanceFrom && attendanceTo) {
      const from = new Date(attendanceFrom);
      const to = new Date(attendanceTo);
      if (to >= from) {
        const diffTime = Math.abs(to.getTime() - from.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
        setDays(diffDays);
      }
    }
  }, [attendanceFrom, attendanceTo]);

  useEffect(() => {
    setTotal((days * ratePerDay) + taAmount + otherAmount);
  }, [days, ratePerDay, taAmount, otherAmount]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Add New SME</h1>
        <Link href="/smes" className="btn-cancel">Cancel</Link>
      </header>

      <form action={createSMEWithEntry} className={styles.form}>
        <div className="card">
          <h2>STEP 1: SME Information</h2>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>SME Name *</label>
              <input type="text" name="name" required className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Designation</label>
              <input type="text" name="designation" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Institute / Organization</label>
              <input type="text" name="institute" className={styles.input} />
            </div>
          </div>
        </div>

        <div className="card">
          <h2>STEP 2: Work / Engagement Information</h2>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>Trade *</label>
              <input type="text" name="trade" required className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Topic *</label>
              <input type="text" name="topic" required className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Attendance From Date</label>
              <input type="date" name="attendanceFrom" value={attendanceFrom} onChange={e => setAttendanceFrom(e.target.value)} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Attendance To Date</label>
              <input type="date" name="attendanceTo" value={attendanceTo} onChange={e => setAttendanceTo(e.target.value)} className={styles.input} />
            </div>
            
            <div className={styles.formGroup}>
              <label>Days</label>
              <input type="number" name="days" value={days} onChange={e => setDays(parseFloat(e.target.value) || 0)} className={styles.input} step="0.5" />
            </div>
            <div className={styles.formGroup}>
              <label>Rate Per Day (₹)</label>
              <input type="number" name="ratePerDay" value={ratePerDay} onChange={e => setRatePerDay(parseFloat(e.target.value) || 0)} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>TA Amount (₹)</label>
              <input type="number" name="taAmount" value={taAmount} onChange={e => setTaAmount(parseFloat(e.target.value) || 0)} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Other Amounts (₹)</label>
              <input type="number" name="otherAmount" value={otherAmount} onChange={e => setOtherAmount(parseFloat(e.target.value) || 0)} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Total Amount (Calculated)</label>
              <div className={styles.calculatedTotal}>₹ {total.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className="btn-primary" style={{ padding: '12px 24px', fontSize: '16px' }}>Save SME</button>
        </div>
      </form>
    </div>
  );
}
