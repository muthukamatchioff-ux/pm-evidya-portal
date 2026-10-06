'use client';

import React, { useState, useEffect } from 'react';
import styles from './generator.module.css';
import { generateDocx } from '@/lib/docxGenerator';

export default function GeneratorClient({ role, smes, templates, preselectedSmeId, preselectedEntryId, preselectedType }: any) {
  const [selectedSmeId, setSelectedSmeId] = useState(preselectedSmeId || '');
  const [selectedEntryId, setSelectedEntryId] = useState(preselectedEntryId || '');
  
  const allowedTemplates = role === 'ADMIN' ? templates : templates.filter((t: any) => 
    ['APPROVAL_LETTER', 'WORK_COMPLETION', 'SANCTION_NOTE'].includes(t.id)
  );

  const [docType, setDocType] = useState(preselectedType || (allowedTemplates[0]?.id || 'APPROVAL_LETTER'));
  const [signatory, setSignatory] = useState('Joint Director / HOO');
  const [extensionReason, setExtensionReason] = useState('');

  const selectedSme = smes.find((s: any) => s.id === selectedSmeId);
  const selectedEntry = selectedSme?.workEntries.find((e: any) => e.id === selectedEntryId);
  const activeTemplate = allowedTemplates.find((t: any) => t.id === docType) || allowedTemplates[0];
  
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
        extensionReason: extensionReason,
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
    try {
      const { logDocumentGeneration } = await import('./actions');
      await logDocumentGeneration(docType, selectedSmeId, selectedEntryId);
    } catch (e) {
      console.error(e);
    }
    await generateDocx(previewData, docType, activeTemplate.body, activeTemplate.subject, signatory);
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
                {allowedTemplates.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Signatory Title</label>
              <select className={styles.select} value={signatory} onChange={e => setSignatory(e.target.value)}>
                <option value="Joint Director / HOO">Joint Director / HOO</option>
                <option value="Executive Director">Executive Director</option>
              </select>
            </div>

            {docType === 'APPROVAL_LETTER' && (
              <div className={styles.formGroup}>
                <label>Extension Reason & Period (Optional)</label>
                <textarea 
                  className={styles.textarea} 
                  placeholder="e.g. due to an unavailability of the SME and continuous Public holidays the deputation period was requested to extended till 26.09.2026 based on the confirmation of the SME"
                  value={extensionReason}
                  onChange={(e) => {
                    setExtensionReason(e.target.value);
                    setPreviewData((prev: any) => ({ ...prev, extensionReason: e.target.value }));
                  }}
                  rows={3}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
                />
              </div>
            )}

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
                {/* Official Header */}
                <div style={{ position: 'relative', textAlign: 'center', color: '#000080', borderBottom: '2px solid #000080', paddingBottom: '10px', marginBottom: '20px' }}>
                  <h1 style={{ fontSize: '22px', margin: 0 }}>NATIONAL INSTRUCTIONAL MEDIA INSTITUTE</h1>
                  <img src="/nimi-logo.png" alt="NIMI Logo" style={{ position: 'absolute', top: 0, right: 0, height: '60px', width: 'auto' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  <p style={{ margin: 0, fontSize: '16px' }}>(AN AUTONOMOUS INSTITUTION)</p>
                  <p style={{ margin: 0, fontSize: '14px' }}>Ministry of Skill Development & Entrepreneurship</p>
                  <p style={{ margin: 0, fontSize: '14px' }}>Government of India</p>
                  <p style={{ margin: 0, fontSize: '12px' }}>Post Box No.3142, CTI Campus, Guindy Industrial Estate, Guindy, Chennai - 600 032.</p>
                  <p style={{ margin: 0, fontSize: '12px' }}>Office : 044-2250 0657, 044-2250 0248 Director 044-2250 0256 E-mail :chennai-nimi@nic.in</p>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
                  <span>NIMI/MS/T-11022/MM/2026</span>
                  <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
                </div>
                
                <p>To,</p>
                <p>The Principal,</p>
                <p>{previewData.institute || 'Institution Name'},</p>
                <p style={{ marginBottom: '20px' }}>City, State - PIN</p>
                
                <p style={{ marginBottom: '20px' }}><strong>Sub: {activeTemplate ? replaceTags(activeTemplate.subject) : ''}</strong></p>
                
                <p style={{ textAlign: 'justify', marginBottom: '15px' }}>
                  The National Instructional Media Institute (NIMI), functioning under the Ministry of Skill Development & Entrepreneurship, Government of India, is the nodal agency engaged in the development of e-Learning content for various trades offered through Industrial Training Institutes (ITIs) and other skill development programmes.
                </p>
                
                <p style={{ textAlign: 'justify', marginBottom: '15px' }}>
                  In this connection, approval is hereby accorded for the Visit of <strong>{previewData.smeName}</strong>, <strong>{previewData.designation}</strong>, <strong>{previewData.institute}</strong>, to participate as a <strong>Subject Matter Expert (SME)</strong> for the <strong>PM e-Vidya Classroom Teaching Shoot</strong> for the trade <strong>"{previewData.trade || 'Trade'}"</strong> for <strong>{previewData.days || 14} days</strong> from <strong>{previewData.attendanceFrom}</strong>{previewData.extensionReason ? ` ${previewData.extensionReason}.` : '.'}
                </p>
                
                <p style={{ textAlign: 'justify', marginBottom: '15px' }}>
                  The Subject Matter Expert shall extend academic and technical support for the classroom teaching session, including content delivery, validation of instructional materials, and other activities required for the successful production of the <strong>PM e-Vidya programme</strong>. He is requested to coordinate closely with the concerned PM e-Vidya and NIMI officials regarding the content, presentation methodology, reporting schedule, and other technical requirements for the classroom teaching shoot.
                </p>
                
                <p style={{ textAlign: 'justify', marginBottom: '15px' }}>
                  The <strong>remuneration / honorarium</strong> for the assignment, along with reimbursement of <strong>Travelling Allowance (TA)</strong>, shall be paid by NIMI as per the prevailing NIMI norms based on the SME designation and eligibility, subject to submission of original travel tickets, boarding passes, and other supporting documents, wherever applicable <strong>(Balmer Lawrie & Company Limited, Ashok Travels & Tours, Indian Railway Catering and Tourism Corporation Ltd - IRCTC)</strong>.
                </p>

                <p style={{ textAlign: 'justify', marginBottom: '40px' }}>
                  Your kind cooperation and valuable support towards the development of quality e-content for the Skill Development ecosystem will be highly solicited.
                </p>

                <p style={{ textAlign: 'right', marginBottom: '60px' }}>Regards</p>
                
                <p style={{ textAlign: 'right' }}><strong>{signatory}</strong></p>
                
                {/* Official Footer */}
                <div style={{ textAlign: 'center', borderTop: '1px dashed #000', paddingTop: '10px', marginTop: '40px', fontSize: '11px' }}>
                  <p style={{ margin: 0 }}>पो. बा. संख्या 3142, सीटीआई कैम्पस, गिंडी इंडस्ट्रियल एस्टेट, गिंडी, चेन्नई-600032./Post Box No. 3142, CTI Campus,</p>
                  <p style={{ margin: 0 }}>Guindy Industrial Estate, Guindy, Chennai - 600032. कार्यालय/Office: 044-2250 0657, 044-22500248,</p>
                  <p style={{ margin: 0 }}>निदेशक /Director- 044-2250 0256. ई-मेल/E-mail : chennai-nmi@nic.in.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
