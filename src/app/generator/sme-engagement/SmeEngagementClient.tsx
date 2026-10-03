"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from '../deputation/deputation.module.css';
import { saveSMERecord } from './actions';

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
    try {
      // Save record to DB automatically
      await saveSMERecord(sme, trades);

      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      if (!element) return;
      
      const opt: any = {
        margin:       0,
        filename:     `SME_Engagement_${sme.name.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 4, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().from(element).set(opt).save();
      alert("Success: Record saved to database and PDF generated!");
    } catch (error) {
      console.error(error);
      alert("Error generating PDF or saving record.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDOCX = async () => {
    const element = printRef.current;
    if (!element) return;
    
    try {
      // Save record to DB automatically
      await saveSMERecord(sme, trades);
    } catch (e) {
      console.error("Failed to save record", e);
    }

    let htmlContent = element.innerHTML;
    try {
      const response = await fetch('/nimi-logo.png');
      const blobImg = await response.blob();
      const base64data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blobImg);
      });
      htmlContent = htmlContent.replace(/src="\/nimi-logo\.png"/g, `src="${base64data}"`);
    } catch (e) {}
    
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset="utf-8"><title>SME Document</title></head>
      <body>${htmlContent}</body>
      </html>`;
      
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SME_Engagement_${sme.name.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderHeader = () => (
    <div className={styles.header} style={{ position: 'relative', textAlign: 'center', borderBottom: '2px solid #000080', paddingBottom: '10px', marginBottom: '20px', color: '#000080' }}>
      <h1 style={{ fontSize: '22px', margin: 0, fontWeight: 'bold' }}>NATIONAL INSTRUCTIONAL MEDIA INSTITUTE</h1>
      <img src="/nimi-logo.png" alt="NIMI Logo" style={{ position: 'absolute', top: '28px', right: '0px', width: '140px', height: 'auto' }} />
      <p style={{ margin: 0, fontSize: '16px' }}>(AN AUTONOMOUS INSTITUTION)</p>
      <p style={{ margin: 0, fontSize: '14px' }}>Ministry of Skill Development & Entrepreneurship</p>
      <p style={{ margin: 0, fontSize: '14px' }}>Government of India</p>
      <p style={{ margin: 0, fontSize: '12px' }}>Post Box No.3142, CTI Campus, Guindy Industrial Estate, Guindy, Chennai - 600 032.</p>
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
          
          {(docType === 'both' || docType === 'completion') && (
            <div className={styles.a4Page} style={{ pageBreakAfter: 'always' }}>
              {renderHeader()}
              
              <h2 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: '18px', margin: '30px 0' }}>Work Completion certificate</h2>
              
              <div style={{ textAlign: 'justify', lineHeight: '1.6', fontSize: '14px' }}>
                This is to certify that <strong>{sme.name}</strong>, <strong>{sme.role}</strong>, has successfully completed the <strong>{programme.name}</strong> for the <strong>{trades[0]?.tradeName}</strong> trade at the <strong>{programme.location}</strong>, during the period from <strong>{formatDate(trades[0]?.startDate)}</strong> to <strong>{formatDate(trades[0]?.endDate)}</strong>.
                <br /><br />
                As the <strong>{sme.role}</strong>, <strong>{sme.name}</strong> effectively delivered the assigned classroom sessions in accordance with the approved curriculum, ensuring technical accuracy, instructional quality, and compliance with the applicable standards for PM e-Vidya digital learning content.
                <br /><br />
                The following topics were successfully delivered and recorded for integration into the PM e-Vidya Digital Learning Platform:
                <div style={{ paddingLeft: '20px', marginTop: '10px', marginBottom: '10px', whiteSpace: 'pre-wrap' }}>
                  {trades[0]?.topics || ''}
                </div>
                The recorded classroom sessions have been completed satisfactorily and are certified for further processing as per the applicable NIMI norms.
                <br /><br />
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', marginBottom: '20px', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Trade</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Guest Expert (SME)</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Work Completed</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Date</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Amount (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '8px' }}>{trades[0]?.tradeName}</td>
                      <td style={{ border: '1px solid #000', padding: '8px' }}>
                        <strong>{sme.name}</strong><br />
                        {sme.designation}, {sme.institution}, {sme.city}, {sme.state}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '8px' }}>{programme.workTitle}</td>
                      <td style={{ border: '1px solid #000', padding: '8px' }}>{formatDate(trades[0]?.startDate)} - {formatDate(trades[0]?.endDate)}</td>
                      <td style={{ border: '1px solid #000', padding: '8px' }}>₹{trades[0]?.remunerationPerDay}/- ( per Day )</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontWeight: 'bold' }}>
                  <div style={{ textDecoration: 'underline' }}>SME DECLARATION</div>
                  <div style={{ textDecoration: 'underline' }}>NIMI VERIFICATION</div>
                </div>
                
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '13px' }}>
                  <div style={{ flex: 1 }}>
                    I, <strong>{sme.name}</strong>, <strong>{sme.role}</strong>, hereby declares that I have successfully completed the <strong>{programme.name}</strong> for the <strong>{trades[0]?.tradeName}</strong> trade during the period from <strong>{formatDate(trades[0]?.startDate)}</strong> to <strong>{formatDate(trades[0]?.endDate)}</strong>.
                    <br /><br />
                    I certify that the assigned topics were delivered as per the approved curriculum and that the work has been completed satisfactorily for processing of the honorarium as per applicable NIMI norms.
                    <br /><br /><br /><br />
                    Signature of Guest Expert:<br />
                    Designation: {sme.designation}, {sme.institution},<br />
                    {sme.city}, {sme.state}<br />
                    Date: {formatDate(approval.submittedDate)}
                  </div>
                  
                  <div style={{ flex: 1, paddingLeft: '20px' }}>
                    Certified that the above work has been completed satisfactorily and verified as per the requirements of the National Instructional Media Institute (NIMI).
                    <br /><br /><br /><br /><br /><br />
                    Signature<br />
                    Name: Shri. Ashfaq Ahmed<br />
                    Designation: Assistant Manager<br />
                    Organisation: National Instructional Media Institute (NIMI), Chennai<br />
                    Date: {formatDate(approval.submittedDate)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(docType === 'both' || docType === 'remuneration') && (
            <div className={styles.a4Page}>
              {renderHeader()}
              
              <h2 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: '18px', margin: '30px 0' }}>SME REMUNERATION / SANCTION NOTE</h2>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
                <div>Submitted</div>
                <div>{formatDate(approval.submittedDate)}</div>
              </div>

              <div style={{ textAlign: 'justify', lineHeight: '1.8', fontSize: '14px' }}>
                Sanction may kindly be accorded for a sum of <strong>Rs. {grandTotalAmount}/- (Rupees {amountInWords})</strong> towards the remuneration of <strong>{sme.name}</strong>, <strong>{sme.designation}</strong>, <strong>{sme.institution}, {sme.city}</strong>, who served as the <strong>{sme.role}</strong> for the <strong>{programme.name}</strong> for the <strong>{trades.map(t => t.tradeName).join(' and ')}</strong> trades. The <strong>{programme.workTitle}</strong> was successfully conducted and completed at the <strong>{programme.location}</strong>.
                <br /><br />
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', marginBottom: '20px' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>S. No.</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Name & Designation</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Trade & Organization</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>Total No. of Days</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Remuneration per Day</th>
                      <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, idx) => (
                      <tr key={t.id}>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>
                          <strong>{sme.name}</strong><br />
                          {sme.designation}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>
                          <strong>{t.tradeName}</strong> &ndash; {sme.institution}, {sme.city}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{t.totalDays} Days</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Rs. {t.remunerationPerDay}/-</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Rs. {t.totalAmount}/-</td>
                      </tr>
                    ))}
                  </tbody>
                  {trades.length > 1 && (
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Grand Total:</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{grandTotalDays} Days</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Rs. {grandTotalAmount}/-</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                <br />
                If approved, payment of <strong>Rs. {grandTotalAmount}/- (Rupees {amountInWords})</strong> may be released to the above Subject Matter Expert from the PM e-Vidya Funds as per the prevailing NCERT norms. The SME engagement approval letter, Work Completion Certificate, and other supporting documents are enclosed separately for kind perusal.
                <br /><br />
                Submitted for kind approval, please.
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p>Prepared By / Verified By</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p><strong>{verification.verifierName}</strong></p>
                  <p>{verification.verifierDesignation}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
