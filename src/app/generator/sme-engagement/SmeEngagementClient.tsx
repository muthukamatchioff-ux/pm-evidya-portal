"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from '../deputation/deputation.module.css';
import { saveSMERecord } from './actions';
import { exportMhtmlWordDocument, getLogoBase64, buildWordOfficialHeader, buildWordOfficialFooter } from '@/lib/mhtmlDocxExport';

// Helper to convert numbers to Indian Rupee words
function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  if (num < 0) return '';
  
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim() + ' Only';
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return dateString;
};

export default function SmeEngagementClient({ initialDocType = 'both' }: { initialDocType?: string }): React.JSX.Element {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [step, setStep] = useState(1);
  const [docType, setDocType] = useState(initialDocType); // completion, remuneration, both

  // Master Data
  const [sme, setSme] = useState({
    name: 'Dr. Majji Bala Ganesh Reddy',
    role: 'Guest Expert / Subject Matter Expert (SME)',
    designation: 'Principal',
    institution: 'Shri Raja Rajeswari ITI',
    city: 'Kakinada',
    state: 'Andhra Pradesh'
  });

  const [programme, setProgramme] = useState({
    name: 'PM e-Vidya Classroom Teaching Video Production',
    workTitle: 'Classroom Teaching Video Production for PM e-Vidya',
    location: 'National Instructional Media Institute (NIMI), Chennai'
  });

  const [trades, setTrades] = useState([
    {
      id: Date.now().toString(),
      tradeName: 'AI Programming Assistant',
      startDate: '2026-08-04',
      endDate: '2026-08-07',
      totalDays: 4,
      remunerationPerDay: 1500,
      totalAmount: 6000,
      topics: 'Introduction of Ai Programming Assistant – Computer Components\nIntroduction to Computer Vision in AI\nMachine Learning \nAI (Artificial Intelligence) Tools\nIntroduction OF AI ( Artificial Intelligence Programming Assistant )'
    }
  ]);

  const [approval, setApproval] = useState({
    submittedDate: '2026-08-13'
  });

  const [verification, setVerification] = useState({
    verifierName: 'Joint Director / HOO',
    verifierDesignation: 'Head of Office',
    verifierOrganisation: 'NIMI, Chennai',
    verificationDate: new Date().toISOString().split('T')[0]
  });

  // Auto Calculations
  useEffect(() => {
    const updatedTrades = trades.map(t => {
      let days = 0;
      if (t.startDate && t.endDate) {
        const d1 = new Date(t.startDate);
        const d2 = new Date(t.endDate);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
      return { ...t, totalDays: days, totalAmount: days * t.remunerationPerDay };
    });
    
    // Only update if changed to prevent infinite loop
    if (JSON.stringify(updatedTrades) !== JSON.stringify(trades)) {
      setTrades(updatedTrades);
    }
  }, [trades]);

  const grandTotalDays = trades.reduce((acc, t) => acc + t.totalDays, 0);
  const grandTotalAmount = trades.reduce((acc, t) => acc + t.totalAmount, 0);
  const amountInWords = numberToWords(grandTotalAmount);

  const addTrade = () => {
    setTrades([...trades, {
      id: Date.now().toString(),
      tradeName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      totalDays: 1,
      remunerationPerDay: 1500,
      totalAmount: 1500,
      topics: ''
    }]);
  };

  const updateTrade = (id: string, field: string, value: any) => {
    setTrades(trades.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  
  const generatePDF = async () => {
    setIsGenerating(true);
    const element = printRef.current;
    if (!element) {
      setIsGenerating(false);
      return;
    }
    const prevShadow = element.style.boxShadow;
    const prevBorder = element.style.border;
    element.style.boxShadow = 'none';
    element.style.border = 'none';
    try {
      // Save record to DB automatically
      await saveSMERecord(sme, trades);

      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt: any = {
        margin:       0,
        filename:     `SME_Engagement_${sme.name.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 3.5, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      await html2pdf().from(element).set(opt).save();
      alert("Success: Record saved to database and PDF generated!");
    } catch (error) {
      console.error(error);
      alert("Error generating PDF or saving record.");
    } finally {
      element.style.boxShadow = prevShadow;
      element.style.border = prevBorder;
      setIsGenerating(false);
    }
  };

  const generateDOCX = async () => {
    try {
      await saveSMERecord(sme, trades);
    } catch (e) {
      console.error("Failed to save record", e);
    }

    try {
      const logoBase64 = await getLogoBase64();
      let bodyHtml = '';

      if (docType === 'both' || docType === 'completion') {
        const topicLines = (trades[0]?.topics || '').split(/\r?\n/).map(t => t.trim()).filter(Boolean);
        let topicsHtml = '';
        if (topicLines.length > 3) {
          const half = Math.ceil(topicLines.length / 2);
          const col1 = topicLines.slice(0, half);
          const col2 = topicLines.slice(half);
          topicsHtml = `
            <table style="width: 100%; border: 1pt solid #cbd5e1; background-color: #f8fafc; margin: 4pt 0 6pt 0; padding: 4pt 8pt; font-size: 8.5pt;">
              <tr>
                <td style="width: 50%; border: none; vertical-align: top; padding: 2pt 6pt;">
                  ${col1.map((t: string) => `<div style="margin: 1pt 0;">&bull; ${t}</div>`).join('')}
                </td>
                <td style="width: 50%; border: none; vertical-align: top; padding: 2pt 6pt;">
                  ${col2.map((t: string) => `<div style="margin: 1pt 0;">&bull; ${t}</div>`).join('')}
                </td>
              </tr>
            </table>
          `;
        } else {
          topicsHtml = `
            <div style="background-color: #f8fafc; border: 1pt solid #cbd5e1; padding: 4pt 8pt; margin: 4pt 0 6pt 0; font-size: 8.5pt;">
              ${topicLines.map((t: string) => `<div style="margin: 1pt 0;">&bull; ${t}</div>`).join('')}
            </div>
          `;
        }

        bodyHtml += `
          ${buildWordOfficialHeader()}
          <h2 style="text-align: center; text-decoration: underline; font-size: 12pt; margin: 8pt 0 6pt 0; text-transform: uppercase;">
            Work Completion Certificate
          </h2>
          <p style="line-height: 1.35; font-size: 9pt; margin-bottom: 5pt;">
            This is to certify that <strong>${sme.name}</strong>, <strong>${sme.role}</strong>, has successfully completed the <strong>${programme.name}</strong> for the <strong>${trades[0]?.tradeName}</strong> trade at the <strong>${programme.location}</strong>, during the period from <strong>${formatDate(trades[0]?.startDate)}</strong> to <strong>${formatDate(trades[0]?.endDate)}</strong>.
          </p>
          <p style="line-height: 1.35; font-size: 9pt; margin-bottom: 5pt;">
            As the <strong>${sme.role}</strong>, <strong>${sme.name}</strong> effectively delivered the assigned classroom sessions in accordance with the approved curriculum, ensuring technical accuracy, instructional quality, and compliance with the applicable standards for PM e-Vidya digital learning content.
          </p>
          <p style="line-height: 1.35; font-size: 9pt; margin-bottom: 3pt;">
            The following topics were successfully delivered and recorded for integration into the PM e-Vidya Digital Learning Platform:
          </p>
          ${topicsHtml}
          <p style="line-height: 1.35; font-size: 9pt; margin-top: 5pt; margin-bottom: 6pt;">
            The recorded classroom sessions have been completed satisfactorily and are certified for further processing as per the applicable NIMI norms.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 5pt 0 8pt 0; font-size: 8.5pt;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="border: 1pt solid #000; padding: 4pt 6pt; text-align: left;">Trade</th>
                <th style="border: 1pt solid #000; padding: 4pt 6pt; text-align: left;">Guest Expert (SME)</th>
                <th style="border: 1pt solid #000; padding: 4pt 6pt; text-align: left;">Work Completed</th>
                <th style="border: 1pt solid #000; padding: 4pt 6pt; text-align: left;">Date</th>
                <th style="border: 1pt solid #000; padding: 4pt 6pt; text-align: left;">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1pt solid #000; padding: 4pt 6pt;"><strong>${trades[0]?.tradeName}</strong></td>
                <td style="border: 1pt solid #000; padding: 4pt 6pt;">
                  <strong>${sme.name}</strong><br>
                  ${sme.designation}, ${sme.institution}, ${sme.city}, ${sme.state}
                </td>
                <td style="border: 1pt solid #000; padding: 4pt 6pt;">${programme.workTitle}</td>
                <td style="border: 1pt solid #000; padding: 4pt 6pt;">${formatDate(trades[0]?.startDate)} - ${formatDate(trades[0]?.endDate)}</td>
                <td style="border: 1pt solid #000; padding: 4pt 6pt;">₹${trades[0]?.remunerationPerDay}/- (per Day)</td>
              </tr>
            </tbody>
          </table>
          <table style="width: 100%; border: none; margin-top: 8pt; font-size: 8pt; line-height: 1.25;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 10pt; border: none;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3pt;">SME DECLARATION</div>
                <div>I, <strong>${sme.name}</strong>, <strong>${sme.role}</strong>, hereby declare that I have successfully completed the <strong>${programme.name}</strong> for the <strong>${trades[0]?.tradeName}</strong> trade during the period from <strong>${formatDate(trades[0]?.startDate)}</strong> to <strong>${formatDate(trades[0]?.endDate)}</strong>.</div>
                <div style="margin-top: 3pt;">I certify that the assigned topics were delivered as per the approved curriculum and that the work has been completed satisfactorily for processing of honorarium as per applicable NIMI norms.</div>
                <br><br><br>
                Signature of Guest Expert:<br>
                Designation: ${sme.designation}, ${sme.institution}, ${sme.city}, ${sme.state}<br>
                Date: ${formatDate(approval.submittedDate)}
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 10pt; border: none; border-left: 1pt dashed #94a3b8;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 3pt;">NIMI VERIFICATION</div>
                <div>Certified that the above work has been completed satisfactorily and verified as per the requirements of the National Instructional Media Institute (NIMI).</div>
                <br><br><br><br>
                Signature<br>
                Name: <strong>${verification.verifierName}</strong><br>
                Designation: ${verification.verifierDesignation}<br>
                Organisation: ${verification.verifierOrganisation}<br>
                Date: ${formatDate(verification.verificationDate)}
              </td>
            </tr>
          </table>
          ${buildWordOfficialFooter()}
        `;
      }

      if (docType === 'both') {
        bodyHtml += `<div style="page-break-before: always; mso-break-type: section-break; margin-top: 20pt;"></div>`;
      }

      if (docType === 'both' || docType === 'remuneration') {
        const slotRowsHtml = trades.map((t, idx) => `
          <tr>
            <td style="border: 1pt solid #000; padding: 4pt 6pt; text-align: center;">${idx + 1}</td>
            <td style="border: 1pt solid #000; padding: 4pt 6pt;">
              <strong>${sme.name}</strong><br>
              <span>${sme.designation}</span>
              ${(sme.institution || sme.city) ? `<div style="font-size: 8pt; color: #475569; margin-top: 1pt;">${sme.institution}, ${sme.city}</div>` : ''}
            </td>
            <td style="border: 1pt solid #000; padding: 4pt 6pt;"><strong>${t.tradeName}</strong></td>
            <td style="border: 1pt solid #000; padding: 4pt 6pt; text-align: center; white-space: nowrap;">${t.startDate && t.endDate ? `${formatDate(t.startDate)} to ${formatDate(t.endDate)}` : '-'}</td>
            <td style="border: 1pt solid #000; padding: 4pt 6pt; text-align: center; font-weight: bold;">${t.totalDays} Days</td>
            <td style="border: 1pt solid #000; padding: 4pt 6pt; text-align: right; white-space: nowrap;">Rs. ${t.remunerationPerDay}/-</td>
            <td style="border: 1pt solid #000; padding: 4pt 6pt; text-align: right; font-weight: bold; white-space: nowrap;">Rs. ${t.totalAmount.toLocaleString('en-IN')}/-</td>
          </tr>
        `).join('');

        bodyHtml += `
          <h2 style="text-align: center; text-decoration: underline; font-size: 12pt; margin: 8pt 0 6pt 0;">
            SME REMUNERATION / SANCTION NOTE
          </h2>
          <table style="width: 100%; border: none; margin-bottom: 6pt; font-family: 'Times New Roman', serif; font-size: 9.5pt; font-weight: bold;">
            <tr>
              <td align="left" style="border: none;">Submitted</td>
              <td align="right" style="border: none;">${formatDate(approval.submittedDate)}</td>
            </tr>
          </table>
          <p style="line-height: 1.35; font-size: 9pt; margin-bottom: 6pt;">
            Sanction may kindly be accorded for a sum of <strong>Rs. ${grandTotalAmount.toLocaleString('en-IN')}/- (Rupees ${amountInWords})</strong> towards the remuneration of <strong>${sme.name}</strong>, <strong>${sme.designation}</strong>, <strong>${sme.institution}, ${sme.city}</strong>, who served as the <strong>${sme.role}</strong> for the <strong>${programme.name}</strong> for the <strong>${trades.map(t => t.tradeName).join(' and ')}</strong> trades. The <strong>${programme.workTitle}</strong> was successfully conducted and completed at the <strong>${programme.location}</strong>.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 6pt 0; font-size: 8.5pt;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: center; width: 6%;">S. No.</th>
                <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: left; width: 24%;">Name &amp; Designation</th>
                <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: left; width: 20%;">Trade</th>
                <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: center; width: 21%;">Attendance Date</th>
                <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: center; width: 11%;">Total No. of Days</th>
                <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; width: 9%;">Remuneration per Day</th>
                <th style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; width: 9%;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${slotRowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; font-weight: bold;">Subtotal (Remuneration):</td>
                <td style="border: 1pt solid #000; padding: 4pt 5pt; text-align: center; font-weight: bold;">${grandTotalDays} Days</td>
                <td style="border: 1pt solid #000; padding: 4pt 5pt;"></td>
                <td style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; font-weight: bold; white-space: nowrap;">Rs. ${grandTotalAmount.toLocaleString('en-IN')}/-</td>
              </tr>
              <tr>
                <td colspan="6" style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; font-weight: bold;">Grand Total:</td>
                <td style="border: 1pt solid #000; padding: 4pt 5pt; text-align: right; font-weight: bold; white-space: nowrap;">Rs. ${grandTotalAmount.toLocaleString('en-IN')}/-</td>
              </tr>
            </tfoot>
          </table>
          <p style="line-height: 1.35; font-size: 9pt; margin-top: 6pt; margin-bottom: 5pt;">
            If approved, payment of <strong>Rs. ${grandTotalAmount.toLocaleString('en-IN')}/- (Rupees ${amountInWords})</strong> may be released to the above Subject Matter Expert from the PM e-Vidya Funds as per the prevailing NCERT norms. The SME engagement approval letter, Work Completion Certificate, and other supporting documents are enclosed separately for kind perusal.
          </p>
          <p style="line-height: 1.35; font-size: 9pt; margin-bottom: 12pt;">
            Submitted for kind approval, please.
          </p>
        `;
      }

      const filename = `SME_Engagement_${sme.name.replace(/\s+/g, '_')}_${docType}.doc`;
      exportMhtmlWordDocument(bodyHtml, filename, logoBase64);
    } catch (err) {
      console.error("Error generating Word DOC:", err);
      alert("Failed to export Word document.");
    }
  };

  const renderHeader = () => (
    <div className={styles.header} style={{ position: 'relative', textAlign: 'center', borderBottom: '2px solid #000080', paddingBottom: '6px', marginBottom: '14px', color: '#000080' }}>
      <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>NATIONAL INSTRUCTIONAL MEDIA INSTITUTE</h1>
      <img src="/nimi-logo.png" alt="NIMI Logo" width="120" style={{ position: 'absolute', top: '4px', right: '0px', width: '120px', height: 'auto' }} />
      <p style={{ margin: '2px 0', fontSize: '12.5px', fontWeight: 'bold' }}>(AN AUTONOMOUS INSTITUTION)</p>
      <p style={{ margin: '1px 0', fontSize: '11px' }}>Ministry of Skill Development &amp; Entrepreneurship, Government of India</p>
      <p style={{ margin: '1px 0', fontSize: '9.5px' }}>Post Box No.3142, CTI Campus, Guindy Industrial Estate, Guindy, Chennai - 600 032.</p>
    </div>
  );

  const renderFooter = () => (
    <div className={styles.officialDocFooter}>
      <div>पो. बा. संख्या 3142, सीटीआई कैम्पस, गिंडी इंडस्ट्रियल एस्टेट, गिंडी, चेन्नई-600032./Post Box No. 3142, CTI Campus,</div>
      <div>Guindy Industrial Estate, Guindy, Chennai – 600032. <strong>कार्यालय/Office:</strong> 044-2250 0657, 044-22500248,</div>
      <div><strong>निदेशक /Director-</strong> 044-2250 0256. <strong>ई-मेल/E-mail :</strong> <u>chennai-nimi@nic.in</u></div>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* Sidebar Form */}
      <div className={styles.sidebar}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>SME Engagement</h2>
        
        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', overflowX: 'auto' }}>
          {[1,2,3,4,5].map(s => (
            <div key={s} onClick={() => setStep(s)} style={{ flex: 1, padding: '5px', textAlign: 'center', background: step === s ? 'var(--primary)' : '#e2e8f0', color: step === s ? 'white' : 'black', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
              Step {s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <>
            <div className={styles.sectionTitle}>SME Details</div>
            <div className={styles.fieldGroup}><label>Name</label><input className={styles.input} value={sme.name} onChange={e => setSme({...sme, name: e.target.value})} /></div>
            <div className={styles.fieldGroup}><label>Role</label><input className={styles.input} value={sme.role} onChange={e => setSme({...sme, role: e.target.value})} /></div>
            <div className={styles.fieldGroup}><label>Designation</label><input className={styles.input} value={sme.designation} onChange={e => setSme({...sme, designation: e.target.value})} /></div>
            <div className={styles.fieldGroup}><label>Institution</label><input className={styles.input} value={sme.institution} onChange={e => setSme({...sme, institution: e.target.value})} /></div>
            <div className={styles.fieldGroup}><label>City</label><input className={styles.input} value={sme.city} onChange={e => setSme({...sme, city: e.target.value})} /></div>
            <div className={styles.fieldGroup}><label>State</label><input className={styles.input} value={sme.state} onChange={e => setSme({...sme, state: e.target.value})} /></div>
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.sectionTitle}>Programme Details</div>
            <div className={styles.fieldGroup}><label>Programme Name</label><input className={styles.input} value={programme.name} onChange={e => setProgramme({...programme, name: e.target.value})} /></div>
            <div className={styles.fieldGroup}><label>Work Title</label><input className={styles.input} value={programme.workTitle} onChange={e => setProgramme({...programme, workTitle: e.target.value})} /></div>
            <div className={styles.fieldGroup}><label>Location</label><input className={styles.input} value={programme.location} onChange={e => setProgramme({...programme, location: e.target.value})} /></div>
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.sectionTitle}>Trades & Attendance</div>
            {trades.map((t, idx) => (
              <div key={t.id} style={{ background: '#f8fafc', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '13px' }}>Trade {idx + 1}</div>
                <div className={styles.fieldGroup}><label>Trade Name</label><input className={styles.input} value={t.tradeName} onChange={e => updateTrade(t.id, 'tradeName', e.target.value)} /></div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className={styles.fieldGroup} style={{ flex: 1 }}><label>Start Date</label><input type="date" className={styles.input} value={t.startDate} onChange={e => updateTrade(t.id, 'startDate', e.target.value)} /></div>
                  <div className={styles.fieldGroup} style={{ flex: 1 }}><label>End Date</label><input type="date" className={styles.input} value={t.endDate} onChange={e => updateTrade(t.id, 'endDate', e.target.value)} /></div>
                </div>
                <div className={styles.fieldGroup}>
                  <label>Topics Covered</label>
                  <textarea className={styles.input} rows={4} value={t.topics} onChange={e => updateTrade(t.id, 'topics', e.target.value)} />
                </div>
                <div style={{ fontSize: '12px', color: 'blue', marginTop: '5px' }}>Auto-calculated: {t.totalDays} Days</div>
              </div>
            ))}
            <button className="btn-secondary" style={{ width: '100%' }} onClick={addTrade}>+ Add Another Trade</button>
          </>
        )}

        {step === 4 && (
          <>
            <div className={styles.sectionTitle}>Remuneration Config</div>
            {trades.map((t, idx) => (
              <div key={t.id} style={{ background: '#f8fafc', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '13px' }}>{t.tradeName || `Trade ${idx+1}`}</div>
                <div className={styles.fieldGroup}><label>Rate Per Day (Rs.)</label><input type="number" className={styles.input} value={t.remunerationPerDay} onChange={e => updateTrade(t.id, 'remunerationPerDay', Number(e.target.value))} /></div>
                <div style={{ fontSize: '12px', color: 'green', marginTop: '5px' }}>Amount: Rs. {t.totalAmount}/-</div>
              </div>
            ))}
            <div style={{ marginTop: '15px', padding: '10px', background: '#e2e8f0', borderRadius: '4px' }}>
              <strong>Grand Total: </strong> Rs. {grandTotalAmount}/-<br/>
              <span style={{ fontSize: '12px' }}>{amountInWords}</span>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className={styles.sectionTitle}>Document Generation</div>
            <div className={styles.fieldGroup}>
              <label>Select Document Type</label>
              <select className={styles.input} value={docType} onChange={e => setDocType(e.target.value)}>
                <option value="both">Generate Both Documents</option>
                <option value="completion">Work Completion Certificate Only</option>
                <option value="remuneration">Sanction Note Only</option>
              </select>
            </div>
            <div className={styles.actions} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
              <button className="btn-primary" onClick={generatePDF} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : '📄 Generate PDF'}
              </button>
              <button className="btn-secondary" onClick={generateDOCX}>
                📝 Download DOC Version
              </button>
              <button className="btn-secondary" onClick={() => window.print()}>
                🖨️ Print Preview
              </button>
            </div>
          </>
        )}
      </div>

      {/* Preview Area */}
      <div className={styles.previewArea}>
        <div ref={printRef} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
          
          {(docType === 'both' || docType === 'completion') && (() => {
            const rawTopics = trades[0]?.topics || '';
            let topicLines = rawTopics.split(/\r?\n/).map((t: string) => t.trim()).filter(Boolean);
            if (topicLines.length === 1 && rawTopics.includes(';') && !rawTopics.includes('\n')) {
              topicLines = rawTopics.split(';').map((t: string) => t.trim()).filter(Boolean);
            }
            const topicCount = topicLines.length;

            // 5 Adaptive Density Tiers based on actual content
            const cols = topicCount <= 2 ? 1 : topicCount <= 8 ? 2 : 3;

            // Dynamic typography & proportional spacing tokens
            let titleFontSize = '16.5px';
            let titleMargin = '14px 0 14px 0';
            let bodyFontSize = '12.5px';
            let bodyLineHeight = '1.52';
            let paraMargin = '0 0 12px 0';
            let leadInMargin = '0 0 8px 0';

            let topicsFontSize = '11.5px';
            let topicsLineHeight = '1.42';
            let topicsBoxPadding = '10px 14px';
            let topicsBoxMargin = '8px 0 14px 0';
            let topicRowGap = '5px';

            let completionParaMargin = '0 0 14px 0';

            let tableFontSize = '12px';
            let tableCellPadding = '8px 10px';
            let tableMargin = '14px 0 18px 0';

            let declTitleMarginTop = '18px';
            let declTitleFontSize = '12.5px';
            let declFontSize = '11.5px';
            let declLineHeight = '1.42';
            let signatureGap = 48;

            if (topicCount <= 2) {
              // Tier 1: 1-2 topics
              titleFontSize = '17px';
              titleMargin = '16px 0 16px 0';
              bodyFontSize = '13px';
              bodyLineHeight = '1.58';
              paraMargin = '0 0 16px 0';
              leadInMargin = '0 0 10px 0';
              topicsFontSize = '12.5px';
              topicsLineHeight = '1.5';
              topicsBoxPadding = '12px 16px';
              topicsBoxMargin = '10px 0 18px 0';
              topicRowGap = '8px';
              completionParaMargin = '0 0 18px 0';
              tableFontSize = '12.5px';
              tableCellPadding = '10px 12px';
              tableMargin = '16px 0 22px 0';
              declTitleMarginTop = '24px';
              declTitleFontSize = '13px';
              declFontSize = '12px';
              declLineHeight = '1.5';
              signatureGap = 56;
            } else if (topicCount <= 5) {
              // Tier 2: 3-5 topics
              titleFontSize = '16.5px';
              titleMargin = '14px 0 14px 0';
              bodyFontSize = '12.5px';
              bodyLineHeight = '1.54';
              paraMargin = '0 0 14px 0';
              leadInMargin = '0 0 8px 0';
              topicsFontSize = '12px';
              topicsLineHeight = '1.45';
              topicsBoxPadding = '10px 14px';
              topicsBoxMargin = '8px 0 16px 0';
              topicRowGap = '6px';
              completionParaMargin = '0 0 16px 0';
              tableFontSize = '12px';
              tableCellPadding = '9px 11px';
              tableMargin = '14px 0 20px 0';
              declTitleMarginTop = '20px';
              declTitleFontSize = '12.5px';
              declFontSize = '11.5px';
              declLineHeight = '1.45';
              signatureGap = 50;
            } else if (topicCount <= 8) {
              // Tier 3: 6-8 topics
              titleFontSize = '16px';
              titleMargin = '12px 0 12px 0';
              bodyFontSize = '12px';
              bodyLineHeight = '1.48';
              paraMargin = '0 0 11px 0';
              leadInMargin = '0 0 7px 0';
              topicsFontSize = '11px';
              topicsLineHeight = '1.38';
              topicsBoxPadding = '9px 12px';
              topicsBoxMargin = '7px 0 13px 0';
              topicRowGap = '5px';
              completionParaMargin = '0 0 13px 0';
              tableFontSize = '11.5px';
              tableCellPadding = '7.5px 9px';
              tableMargin = '12px 0 16px 0';
              declTitleMarginTop = '18px';
              declTitleFontSize = '12px';
              declFontSize = '11px';
              declLineHeight = '1.4';
              signatureGap = 44;
            } else if (topicCount <= 14) {
              // Tier 4: 9-14 topics
              titleFontSize = '16px';
              titleMargin = '12px 0 11px 0';
              bodyFontSize = '12px';
              bodyLineHeight = '1.45';
              paraMargin = '0 0 10px 0';
              leadInMargin = '0 0 6px 0';
              topicsFontSize = '10.5px';
              topicsLineHeight = '1.34';
              topicsBoxPadding = '8px 12px';
              topicsBoxMargin = '6px 0 11px 0';
              topicRowGap = '4px';
              completionParaMargin = '0 0 11px 0';
              tableFontSize = '11.5px';
              tableCellPadding = '6.5px 8.5px';
              tableMargin = '11px 0 14px 0';
              declTitleMarginTop = '15px';
              declTitleFontSize = '12px';
              declFontSize = '11px';
              declLineHeight = '1.36';
              signatureGap = 40;
            } else {
              // Tier 5: 15+ topics
              titleFontSize = '15.5px';
              titleMargin = '9px 0 8px 0';
              bodyFontSize = '11.5px';
              bodyLineHeight = '1.36';
              paraMargin = '0 0 7px 0';
              leadInMargin = '0 0 4px 0';
              topicsFontSize = '10px';
              topicsLineHeight = '1.26';
              topicsBoxPadding = '6px 10px';
              topicsBoxMargin = '5px 0 8px 0';
              topicRowGap = '3px';
              completionParaMargin = '0 0 8px 0';
              tableFontSize = '10.5px';
              tableCellPadding = '5px 7px';
              tableMargin = '8px 0 10px 0';
              declTitleMarginTop = '12px';
              declTitleFontSize = '11.5px';
              declFontSize = '10.5px';
              declLineHeight = '1.3';
              signatureGap = 30;
            }

            return (
              <div className={styles.officialDocPage} style={{ pageBreakAfter: docType === 'both' ? 'always' : 'avoid' }}>
                {renderHeader()}
                
                <h2 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: titleFontSize, margin: titleMargin, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', color: '#000' }}>
                  Work Completion Certificate
                </h2>
                
                <div style={{ textAlign: 'justify', lineHeight: bodyLineHeight, fontSize: bodyFontSize }}>
                  <p style={{ margin: paraMargin }}>
                    This is to certify that <strong>{sme.name}</strong>, <strong>{sme.role}</strong>, has successfully completed the <strong>{programme.name}</strong> for the <strong>{trades[0]?.tradeName}</strong> trade at the <strong>{programme.location}</strong>, during the period from <strong>{formatDate(trades[0]?.startDate)}</strong> to <strong>{formatDate(trades[0]?.endDate)}</strong>.
                  </p>
                  <p style={{ margin: paraMargin }}>
                    As the <strong>{sme.role}</strong>, <strong>{sme.name}</strong> effectively delivered the assigned classroom sessions in accordance with the approved curriculum, ensuring technical accuracy, instructional quality, and compliance with the applicable standards for PM e-Vidya digital learning content.
                  </p>
                  <p style={{ margin: leadInMargin }}>
                    The following topics were successfully delivered and recorded for integration into the PM e-Vidya Digital Learning Platform:
                  </p>

                  {/* Content-Aware Adaptive Topics Container */}
                  {cols === 1 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: topicRowGap,
                      padding: topicsBoxPadding,
                      margin: topicsBoxMargin,
                      fontSize: topicsFontSize,
                      background: '#f8fafc',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      lineHeight: topicsLineHeight
                    }}>
                      {topicLines.map((t: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', margin: '2px 0' }}>
                          <span style={{ color: '#000080', fontWeight: 700, flexShrink: 0 }}>•</span>
                          <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0, whiteSpace: 'normal' }}>{t}</span>
                        </div>
                      ))}
                    </div>
                  ) : cols === 2 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      columnGap: '14px',
                      rowGap: topicRowGap,
                      padding: topicsBoxPadding,
                      margin: topicsBoxMargin,
                      fontSize: topicsFontSize,
                      background: '#f8fafc',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      lineHeight: topicsLineHeight
                    }}>
                      {topicLines.map((t: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '5px', alignItems: 'flex-start', minWidth: 0 }}>
                          <span style={{ color: '#000080', fontWeight: 700, flexShrink: 0 }}>•</span>
                          <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0, whiteSpace: 'normal' }}>{t}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      columnGap: '9px',
                      rowGap: topicRowGap,
                      padding: topicsBoxPadding,
                      margin: topicsBoxMargin,
                      fontSize: topicsFontSize,
                      background: '#f8fafc',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      lineHeight: topicsLineHeight
                    }}>
                      {topicLines.map((t: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '5px', alignItems: 'flex-start', minWidth: 0 }}>
                          <span style={{ color: '#000080', fontWeight: 700, flexShrink: 0 }}>•</span>
                          <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0, whiteSpace: 'normal' }}>{t}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p style={{ margin: completionParaMargin }}>
                    The recorded classroom sessions have been completed satisfactorily and are certified for further processing as per the applicable NIMI norms.
                  </p>

                  <table style={{ width: '100%', borderCollapse: 'collapse', margin: tableMargin, fontSize: tableFontSize }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ border: '1px solid #000', padding: tableCellPadding, textAlign: 'left', width: '16%' }}>Trade</th>
                        <th style={{ border: '1px solid #000', padding: tableCellPadding, textAlign: 'left', width: '28%' }}>Guest Expert (SME)</th>
                        <th style={{ border: '1px solid #000', padding: tableCellPadding, textAlign: 'left', width: '24%' }}>Work Completed</th>
                        <th style={{ border: '1px solid #000', padding: tableCellPadding, textAlign: 'center', width: '18%' }}>Date</th>
                        <th style={{ border: '1px solid #000', padding: tableCellPadding, textAlign: 'right', width: '14%' }}>Amount (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: tableCellPadding }}><strong>{trades[0]?.tradeName}</strong></td>
                        <td style={{ border: '1px solid #000', padding: tableCellPadding, wordBreak: 'break-word' }}>
                          <strong>{sme.name}</strong><br />
                          <span>{sme.designation}, {sme.institution}, {sme.city}, {sme.state}</span>
                        </td>
                        <td style={{ border: '1px solid #000', padding: tableCellPadding, wordBreak: 'break-word' }}>{programme.workTitle}</td>
                        <td style={{ border: '1px solid #000', padding: tableCellPadding, textAlign: 'center', whiteSpace: 'nowrap' }}>{formatDate(trades[0]?.startDate)} - {formatDate(trades[0]?.endDate)}</td>
                        <td style={{ border: '1px solid #000', padding: tableCellPadding, textAlign: 'right', whiteSpace: 'nowrap' }}>₹{trades[0]?.remunerationPerDay}/- ( per Day )</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: declTitleMarginTop, fontWeight: 'bold', fontSize: declTitleFontSize }}>
                    <div style={{ textDecoration: 'underline' }}>SME DECLARATION</div>
                    <div style={{ textDecoration: 'underline' }}>NIMI VERIFICATION</div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: declFontSize, lineHeight: declLineHeight }}>
                    <div style={{ flex: 1 }}>
                      I, <strong>{sme.name}</strong>, <strong>{sme.role}</strong>, hereby declare that I have successfully completed the <strong>{programme.name}</strong> for the <strong>{trades[0]?.tradeName}</strong> trade during the period from <strong>{formatDate(trades[0]?.startDate)}</strong> to <strong>{formatDate(trades[0]?.endDate)}</strong>.
                      <br /><br />
                      I certify that the assigned topics were delivered as per the approved curriculum and that the work has been completed satisfactorily for processing of the honorarium as per applicable NIMI norms.
                      <div style={{ height: `${signatureGap}px` }} />
                      Signature of Guest Expert:<br />
                      Designation: {sme.designation}, {sme.institution},<br />
                      {sme.city}, {sme.state}<br />
                      Date: {formatDate(approval.submittedDate)}
                    </div>
                    
                    <div style={{ flex: 1, paddingLeft: '14px', borderLeft: '1px dashed #cbd5e1' }}>
                      Certified that the above work has been completed satisfactorily and verified as per the requirements of the National Instructional Media Institute (NIMI).
                      <div style={{ height: `${signatureGap + 8}px` }} />
                      Signature<br />
                      Name: <strong>{verification.verifierName}</strong><br />
                      Designation: {verification.verifierDesignation}<br />
                      Organisation: {verification.verifierOrganisation}<br />
                      Date: {formatDate(verification.verificationDate)}
                    </div>
                  </div>
                </div>
                {renderFooter()}
              </div>
            );
          })()}

          {(docType === 'both' || docType === 'remuneration') && (() => {
            const isDenseSlots = trades.length >= 2;
            const isVeryDenseSlots = trades.length >= 4;

            return (
              <div className={styles.a4Page}>
                <h2 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: isDenseSlots ? '15px' : '16px', margin: isDenseSlots ? '10px 0 8px 0' : '14px 0 10px 0' }}>
                  SME REMUNERATION / SANCTION NOTE
                </h2>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isDenseSlots ? '8px' : '12px', fontWeight: 'bold', fontSize: isDenseSlots ? '12px' : '13px' }}>
                  <div>Submitted</div>
                  <div>{formatDate(approval.submittedDate)}</div>
                </div>

                <div style={{ textAlign: 'justify', lineHeight: isDenseSlots ? '1.38' : '1.45', fontSize: isDenseSlots ? '11.5px' : '12.5px' }}>
                  Sanction may kindly be accorded for a sum of <strong>Rs. {grandTotalAmount.toLocaleString('en-IN')}/- (Rupees {amountInWords})</strong> towards the remuneration of <strong>{sme.name}</strong>, <strong>{sme.designation}</strong>, <strong>{sme.institution}, {sme.city}</strong>, who served as the <strong>{sme.role}</strong> for the <strong>{programme.name}</strong> for the <strong>{trades.map(t => t.tradeName).join(' and ')}</strong> trades. The <strong>{programme.workTitle}</strong> was successfully conducted and completed at the <strong>{programme.location}</strong>.
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: isDenseSlots ? '6px' : '8px', marginBottom: isDenseSlots ? '8px' : '12px', fontSize: isVeryDenseSlots ? '10px' : isDenseSlots ? '11px' : '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'center', width: '5%' }}>S. No.</th>
                        <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'left', width: '23%' }}>Name &amp; Designation</th>
                        <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'left', width: '20%' }}>Trade</th>
                        <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'center', width: '22%' }}>Attendance Date</th>
                        <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'center', width: '10%' }}>Total No. of Days</th>
                        <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'right', width: '10%' }}>Remuneration per Day</th>
                        <th style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'right', width: '10%' }}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((t, idx) => (
                        <tr key={t.id}>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '5px 7px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '5px 7px' }}>
                            <strong>{sme.name}</strong><br />
                            <span>{sme.designation}</span>
                            {(sme.institution || sme.city) && (
                              <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '2px' }}>
                                {sme.institution}{sme.city ? `, ${sme.city}` : ''}
                              </div>
                            )}
                          </td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '5px 7px' }}>
                            <strong>{t.tradeName}</strong>
                          </td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '5px 7px', textAlign: 'center', fontSize: isDenseSlots ? '10.5px' : '11.5px', whiteSpace: 'nowrap' }}>
                            {t.startDate && t.endDate ? `${formatDate(t.startDate)} to ${formatDate(t.endDate)}` : '-'}
                          </td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '5px 7px', textAlign: 'center', fontWeight: 'bold' }}>{t.totalDays} Days</td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '5px 7px', textAlign: 'right', whiteSpace: 'nowrap' }}>Rs. {t.remunerationPerDay}/-</td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '3px 5px' : '5px 7px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Rs. {t.totalAmount.toLocaleString('en-IN')}/-</td>
                        </tr>
                      ))}
                    </tbody>
                    {trades.length > 1 && (
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>Grand Total:</td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'center', fontWeight: 'bold' }}>{grandTotalDays} Days</td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px' }}></td>
                          <td style={{ border: '1px solid #000', padding: isDenseSlots ? '4px 6px' : '6px 8px', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Rs. {grandTotalAmount.toLocaleString('en-IN')}/-</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  <p style={{ margin: isDenseSlots ? '4px 0' : '6px 0' }}>
                    If approved, payment of <strong>Rs. {grandTotalAmount.toLocaleString('en-IN')}/- (Rupees {amountInWords})</strong> may be released to the above Subject Matter Expert from the PM e-Vidya Funds as per the prevailing NCERT norms. The SME engagement approval letter, Work Completion Certificate, and other supporting documents are enclosed separately for kind perusal.
                  </p>
                  <p style={{ margin: isDenseSlots ? '4px 0' : '6px 0' }}>
                    Submitted for kind approval, please.
                  </p>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
