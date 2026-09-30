'use client';

import React, { useState, useEffect } from 'react';
import styles from './generator.module.css';
import { generateDocx } from '@/lib/docxGenerator';

export default function GeneratorClient({ smes, templates, preselectedSmeId, preselectedEntryId, preselectedType }: any) {
  const [selectedSmeId, setSelectedSmeId] = useState(preselectedSmeId || '');
  const [selectedEntryId, setSelectedEntryId] = useState(preselectedEntryId || '');
  const [docType, setDocType] = useState(preselectedType || 'APPROVAL_LETTER');

  const selectedSme = smes.find((s: any) => s.id === selectedSmeId);
  const selectedEntry = selectedSme?.workEntries.find((e: any) => e.id === selectedEntryId);
  const activeTemplate = templates.find((t: any) => t.id === docType) || templates[0];
  
  const [previewData, setPreviewData] = useState<any>({});

  useEffect(() => {
    if (selectedSme && selectedEntry) {
      const payment = selectedEntry.payments[0];
      setPreviewData({
        smeName: selectedSme.name,
        designation: selectedSme.designation || '',
        institute: selectedSme.institute || '',
        trade: selectedEntry.trade,
        topic: selectedEntry.topic,
        attendanceFrom: selectedEntry.attendanceFrom ? new Date(selectedEntry.attendanceFrom).toLocaleDateString('en-IN') : 'TBD',
        attendanceTo: selectedEntry.attendanceTo ? new Date(selectedEntry.attendanceTo).toLocaleDateString('en-IN') : 'TBD',
        days: selectedEntry.days || 0,
        ratePerDay: selectedEntry.ratePerDay || 0,
        totalAmount: payment?.totalAmount || 0,
      });
    } else {
      setPreviewData({});
    }
  }, [selectedSme, selectedEntry]);

  const replaceTags = (text: string) => {
    return text
      .replace(/{{smeName}}/g, previewData.smeName || '')
      .replace(/{{trade}}/g, previewData.trade || '')
      .replace(/{{topic}}/g, previewData.topic || '')
      .replace(/{{attendanceFrom}}/g, previewData.attendanceFrom || '')
      .replace(/{{attendanceTo}}/g, previewData.attendanceTo || '')
      .replace(/{{days}}/g, previewData.days?.toString() || '0')
      .replace(/{{ratePerDay}}/g, previewData.ratePerDay?.toString() || '0')
      .replace(/{{totalAmount}}/g, previewData.totalAmount?.toString() || '0');
  };

  const handleGenerate = async () => {
    if (!previewData.smeName || !activeTemplate) return;
    await generateDocx(previewData, docType, activeTemplate.body, activeTemplate.subject);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Document Generator</h1>
      </header>

      <div className={styles.layout}>
        {/* LEFT PANE */}
        <div className={styles.leftPane}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className={styles.formGroup}>
              <label>Select SME</label>
              <select className={styles.select} value={selectedSmeId} onChange={e => { setSelectedSmeId(e.target.value); setSelectedEntryId(''); }}>
                <option value="">-- Select SME --</option>
                {smes.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Select Work Entry</label>
              <select className={styles.select} value={selectedEntryId} onChange={e => setSelectedEntryId(e.target.value)} disabled={!selectedSmeId}>
                <option value="">-- Select Work Entry --</option>
                {selectedSme?.workEntries.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.trade} - {e.topic}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Document Type</label>
              <select className={styles.select} value={docType} onChange={e => setDocType(e.target.value)}>
                {templates.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {selectedEntry && (
              <div className={styles.dataPreviewBox}>
                <div className={styles.dataRow}><span>Days:</span> <strong>{previewData.days}</strong></div>
                <div className={styles.dataRow}><span>Rate:</span> <strong>₹ {previewData.ratePerDay}</strong></div>
                <div className={styles.dataRow}><span>Total:</span> <strong>₹ {previewData.totalAmount}</strong></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <button className="btn-primary" disabled={!selectedEntryId} onClick={handleGenerate}>
                Download DOCX
              </button>
              <button className="btn-secondary" disabled={!selectedEntryId} onClick={() => window.print()}>
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANE (PREVIEW) */}
        <div className={styles.rightPane}>
          <div className={styles.documentPreviewWrapper}>
            {!selectedEntry ? (
              <div className={styles.emptyPreview}>
                Select an SME and Work Entry to preview the document
              </div>
            ) : (
              <div className={styles.a4Preview}>
                <h1 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '20px' }}>
                  {activeTemplate?.name.toUpperCase().replace('TEMPLATE', '').trim()}
                </h1>
                
                <p style={{ textAlign: 'right', marginBottom: '40px' }}>Date: {new Date().toLocaleDateString('en-IN')}</p>
                
                <p>To,</p>
                <p><strong>{previewData.smeName}</strong></p>
                <p style={{ marginBottom: '40px' }}>{previewData.designation}, {previewData.institute}</p>
                
                <p style={{ marginBottom: '40px' }}><strong>Subject:</strong> {activeTemplate ? replaceTags(activeTemplate.subject) : ''}</p>
                
                <p style={{ marginBottom: '20px' }}>Dear {previewData.smeName},</p>
                
                {activeTemplate && replaceTags(activeTemplate.body).split('\n\n').map((p, i) => (
                  <p key={i} style={{ marginBottom: '20px', lineHeight: '1.8' }}>
                    {p.split('\n').map((line, j) => (
                      <React.Fragment key={j}>
                        {line}
                        {j < p.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </p>
                ))}

                <p style={{ marginTop: '60px', marginBottom: '80px' }}>Sincerely,</p>
                
                <p><strong>Authorized Signatory</strong></p>
                <p>Accounts Department, PM e-Vidya</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
