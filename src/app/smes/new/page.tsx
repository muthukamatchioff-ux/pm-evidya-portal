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
        <div className="card">
          <h2>STEP 1: SME Information</h2>
          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label>SME Name *</label>
              <input type="text" name="name" required className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Trade *</label>
              <input
                type="text"
                name="trade"
                required
                placeholder="e.g. Electrician, Fitter, Welder..."
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Designation</label>
              <input type="text" name="designation" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Institute / Organization</label>
              <input type="text" name="institute" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Location (City, State)</label>
              <input type="text" name="location" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label>Full Address</label>
              <input type="text" name="address" className={styles.input} />
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
            {isSubmitting ? 'Saving SME...' : 'Save SME'}
          </button>
        </div>
      </form>
    </div>
  );
}
