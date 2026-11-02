'use client';

import React, { useState } from 'react';
import { createSMEWithEntry } from './actions';
import Link from 'next/link';
import styles from './new.module.css';

export default function NewSMEPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Add New SME</h1>
        <Link href="/smes" className="btn-cancel">Cancel</Link>
      </header>

      <form
        action={async (formData) => {
          setIsSubmitting(true);
          try {
            const res = await createSMEWithEntry(formData);
            if (res && !res.success) {
              alert(res.error || 'Failed to create SME');
              setIsSubmitting(false);
            }
          } catch (err: any) {
            // Next.js redirect throws NEXT_REDIRECT which is expected on success
            if (err?.message !== 'NEXT_REDIRECT') {
              alert(err?.message || 'Failed to create SME');
              setIsSubmitting(false);
            }
          }
        }}
        className={styles.form}
      >
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2>STEP 1: SME Profile Information</h2>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>SME Name *</label>
              <input type="text" name="name" required placeholder="e.g. Shri Harish Menon R" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Trade *</label>
              <input
                type="text"
                name="trade"
                required
                placeholder="e.g. Instrument Mechanic, Electrician..."
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Designation</label>
              <input type="text" name="designation" placeholder="e.g. Senior Instructor" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Institute / Organization</label>
              <input type="text" name="institute" placeholder="e.g. Govt ITI" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Location (City, State)</label>
              <input type="text" name="location" placeholder="e.g. Kalamassery, Kerala" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Full Address</label>
              <input type="text" name="address" placeholder="e.g. Govt ITI Kalamassery, Kerala" className={styles.input} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px' }}>
          <h2>STEP 2: Work Assignment & Remuneration (Optional)</h2>
          <div className={styles.grid}>
            <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
              <label>Assigned Topic / Syllabus</label>
              <input
                type="text"
                name="topic"
                placeholder="e.g. Scope and necessity of Instrumentation, Pressure, Flow, Level & Temperature Measurement"
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Attendance From</label>
              <input type="date" name="attendanceFrom" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Attendance To</label>
              <input type="date" name="attendanceTo" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Working Days</label>
              <input type="number" name="days" step="1" defaultValue="4" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Rate Per Day (₹)</label>
              <input type="number" name="ratePerDay" step="100" defaultValue="1500" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Travel Allowance (₹)</label>
              <input type="number" name="taAmount" step="1" defaultValue="0" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Other Allowance (₹)</label>
              <input type="number" name="otherAmount" step="1" defaultValue="0" className={styles.input} />
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{ padding: '12px 24px', fontSize: '16px' }}
          >
            {isSubmitting ? 'Saving SME & Assignment...' : 'Save SME & Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
}
