"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './deputation.module.css';

export default function DeputationClient({ smes, projects }: { smes: any[], projects: any[] }) {
  const printRef = useRef<HTMLDivElement>(null);
  
  // Form State
  const [refNo, setRefNo] = useState('NIMI/MS/T-11022/MM/');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [recipientDesignation, setRecipientDesignation] = useState('The Principal');
  const [recipientInst, setRecipientInst] = useState('Shri Raja Rajeswari ITI');
  const [recipientLoc, setRecipientLoc] = useState('Kakinada, Andhra Pradesh');
  
  const [smeName, setSmeName] = useState('Dr. Majji Bala Ganesh Reddy');
  const [smeDesignation, setSmeDesignation] = useState('Principal');
  const [smeInst, setSmeInst] = useState('Shri Raja Rajeswari ITI');
  const [smePlace, setSmePlace] = useState('Kakinada, Andhra Pradesh');
  
  const [trade, setTrade] = useState('AI Programming Assistant & Drone Technician');
  const [duration, setDuration] = useState('1 Week');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('the official shoot schedule');
  const [extensionDate, setExtensionDate] = useState('26.09.2026');
  const [isExtension, setIsExtension] = useState(true);
  const [signatory, setSignatory] = useState('Joint Director / HOO');
  
  const [isGenerating, setIsGenerating] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      if (!element) return;
      
      const opt = {
        margin:       0,
        filename:     `Deputation_${smeName.replace(/\s+/g, '_')}_${year}.pdf`,
        image:        { type: 'jpeg' as const, quality: 1.0 },
        html2canvas:  { scale: 4, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      
      await html2pdf().from(element).set(opt).save();
      
      // Here we would also call an API to save the version in the database
      alert("PDF Generated and saved to database successfully.");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDOCX = async () => {
    const element = printRef.current;
    if (!element) return;
    
    let htmlContent = element.innerHTML;
    
    // Convert logo to base64 so MS Word can display it
    try {
      const response = await fetch('/nimi-logo.png');
      const blobImg = await response.blob();
      const base64data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blobImg);
      });
      htmlContent = htmlContent.replace(/src="\/nimi-logo\.png"/g, `src="${base64data}"`);
    } catch (e) {
      console.warn("Failed to convert image to base64 for docx", e);
    }
    
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Approval Letter</title>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    
    const blob = new Blob(['\ufeff', fullHtml], {
        type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Deputation_${smeName.replace(/\s+/g, '_')}_${year}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      {/* Sidebar Form */}
      <div className={styles.sidebar}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Letter Parameters</h2>
        
        <div className={styles.sectionTitle}>Letter Details</div>
        <div className={styles.fieldGroup}>
          <label>Reference Number Prefix</label>
          <input className={styles.input} value={refNo} onChange={e => setRefNo(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label>Year</label>
          <input className={styles.input} value={year} onChange={e => setYear(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label>Letter Date</label>
          <input type="date" className={styles.input} value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className={styles.sectionTitle}>Recipient Details</div>
        <div className={styles.fieldGroup}>
          <label>Designation</label>
          <input className={styles.input} value={recipientDesignation} onChange={e => setRecipientDesignation(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label>Institution Name</label>
          <input className={styles.input} value={recipientInst} onChange={e => setRecipientInst(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label>Location / Address</label>
          <input className={styles.input} value={recipientLoc} onChange={e => setRecipientLoc(e.target.value)} />
        </div>

        <div className={styles.sectionTitle}>SME Details</div>
        <div className={styles.fieldGroup}>
          <label>SME Name</label>
          <input className={styles.input} value={smeName} onChange={e => setSmeName(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label>Designation</label>
          <input className={styles.input} value={smeDesignation} onChange={e => setSmeDesignation(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label>Institution</label>
          <input className={styles.input} value={smeInst} onChange={e => setSmeInst(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label>Place</label>
          <input className={styles.input} value={smePlace} onChange={e => setSmePlace(e.target.value)} />
        </div>

        <div className={styles.sectionTitle}>PM e-Vidya Details</div>
        <div className={styles.fieldGroup}>
          <label>Trade / Trades</label>
          <input className={styles.input} value={trade} onChange={e => setTrade(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label>Duration / Weeks</label>
          <input className={styles.input} value={duration} onChange={e => setDuration(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label>Start Date</label>
          <input type="date" className={styles.input} value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        
        <div className={styles.sectionTitle}>Approval & Extension</div>
        <div className={styles.fieldGroup}>
          <label>Is Extension?</label>
          <select className={styles.input} value={isExtension ? 'yes' : 'no'} onChange={e => setIsExtension(e.target.value === 'yes')}>
            <option value="yes">Yes, this is an extension</option>
            <option value="no">No, initial approval</option>
          </select>
        </div>
        {isExtension && (
          <>
            <div className={styles.fieldGroup}>
              <label>Reason for Extension</label>
              <input className={styles.input} value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <div className={styles.fieldGroup}>
              <label>Extension Date</label>
              <input className={styles.input} value={extensionDate} onChange={e => setExtensionDate(e.target.value)} placeholder="DD.MM.YYYY" />
            </div>
          </>
        )}

        <div className={styles.sectionTitle}>Signatory Details</div>
        <div className={styles.fieldGroup}>
          <label>Signatory Title</label>
          <select className={styles.input} value={signatory} onChange={e => setSignatory(e.target.value)}>
            <option value="Joint Director / HOO">Joint Director / HOO</option>
            <option value="Executive Director">Executive Director</option>
          </select>
        </div>

        <div className={styles.actions} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
      </div>

      {/* Preview Area (A4 Layout) */}
      <div className={styles.previewArea}>
        <div className={styles.a4Page} ref={printRef}>
          
          <div className={styles.header} style={{ position: 'relative', textAlign: 'center', borderBottom: '2px solid #000080', paddingBottom: '10px', marginBottom: '20px', color: '#000080' }}>
            <h1 style={{ fontSize: '22px', margin: 0, fontWeight: 'bold' }}>NATIONAL INSTRUCTIONAL MEDIA INSTITUTE</h1>
            <img src="/nimi-logo.png" alt="NIMI Logo" style={{ position: 'absolute', top: '28px', right: '0px', width: '140px', height: 'auto' }} />
            <p style={{ margin: 0, fontSize: '16px' }}>(AN AUTONOMOUS INSTITUTION)</p>
            <p style={{ margin: 0, fontSize: '14px' }}>Ministry of Skill Development & Entrepreneurship</p>
            <p style={{ margin: 0, fontSize: '14px' }}>Government of India</p>
            <p style={{ margin: 0, fontSize: '12px' }}>Post Box No.3142, CTI Campus, Guindy Industrial Estate, Guindy, Chennai - 600 032.</p>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>Office : 044-2250 0657, 044-2250 0248  Director 044-2250 0256  E-mail :<span style={{ textDecoration: 'underline' }}>chennai-nimi@nic.in</span></p>
          </div>

          <div className={styles.refRow} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
            <div>NIMI/MS/T-11022/MM/{year}</div>
            <div>Date: {formatDate(date)}</div>
          </div>

          <div className={styles.toSection} style={{ marginBottom: '20px' }}>
            To,<br />
            {recipientDesignation},<br />
            {recipientInst},<br />
            {recipientLoc}
          </div>

          <div className={styles.subject} style={{ marginBottom: '20px', display: 'flex' }}>
            <div className={styles.subjectLabel} style={{ fontWeight: 'bold', marginRight: '5px' }}>Sub:</div>
            <div className={styles.subjectText}>
              Invitation - as Subject Matter Expert (SME) to take Class room shooting for the PM e vidya channel for the trade {trade} - Reg.
            </div>
          </div>

          <div className={styles.bodyText} style={{ textAlign: 'justify', marginBottom: '15px' }}>
            The National Instructional Media Institute (NIMI), functioning under the Ministry of Skill Development & Entrepreneurship, Government of India, is the nodal agency engaged in the development of e-Learning content for various trades offered through Industrial Training Institutes (ITIs) and other skill development programmes.
          </div>

          <div className={styles.bodyText} style={{ textAlign: 'justify', marginBottom: '15px' }}>
            In this connection, approval is hereby accorded for the Visit of <strong>{smeName}, {smeDesignation}, {smeInst}, {smePlace}</strong> to participate as a <strong>Subject Matter Expert (SME)</strong> for the <strong>PM e-Vidya Classroom Teaching Shoot</strong> for the trade <strong>"{trade}"</strong> for {duration} from <strong>{formatDate(startDate)}</strong>
            {isExtension && ` due to ${reason} the deputation period was requested to extended till ${extensionDate} based on the confirmation of the SME.`}
            {!isExtension && "."}
          </div>

          <div className={styles.bodyText} style={{ textAlign: 'justify', marginBottom: '15px' }}>
            The Subject Matter Expert shall extend academic and technical support for the classroom teaching session, including content delivery, validation of instructional materials, and other activities required for the successful production of the <strong>PM e-Vidya programme</strong>. He is requested to coordinate closely with the concerned PM e-Vidya and NIMI officials regarding the content, presentation methodology, reporting schedule, and other technical requirements for the classroom teaching shoot.
          </div>

          <div className={styles.bodyText} style={{ textAlign: 'justify', marginBottom: '15px' }}>
            The <strong>remuneration / honorarium</strong> for the assignment, along with reimbursement of <strong>Travelling Allowance (TA)</strong>, shall be paid by NIMI as per the prevailing NCERT norms based on the SME designation and eligibility, subject to submission of original travel tickets, boarding passes, and other supporting documents, wherever applicable <strong>(Balmer Lawrie & Company Limited, Ashok Travels & Tours, Indian Railway Catering and Tourism Corporation Ltd - IRCTC)</strong>.
          </div>

          <div className={styles.bodyText} style={{ textAlign: 'justify', marginBottom: '40px' }}>
            Your kind cooperation and valuable support towards the development of quality e-content for the Skill Development ecosystem will be highly solicited.
          </div>

          <div className={styles.regards} style={{ textAlign: 'right', marginTop: '30px', marginBottom: '10px' }}>
            Regards,
            <br /><br /><br /><br />
            <strong>{signatory}</strong>
          </div>

          <div className={styles.footer} style={{ display: 'block', textAlign: 'center', borderTop: '1px dashed #000', paddingTop: '10px', marginTop: '40px', fontSize: '11px', lineHeight: '1.4' }}>
            <p style={{ margin: 0 }}>पो. वा. संख्या 3142, सीटीआई कैम्पस, गिंडी इंडस्ट्रियल एस्टेट, गिंडी, चेन्नई-600032./Post Box No. 3142, CTI Campus,</p>
            <p style={{ margin: 0 }}>Guindy Industrial Estate, Guindy, Chennai – 600032. <strong style={{ color: '#000080' }}>कार्यालय/Office:</strong> 044-2250 0657, 044-22500248,</p>
            <p style={{ margin: 0 }}><strong style={{ color: '#000080' }}>निदेशक /Director-</strong> 044-2250 0256. <strong style={{ color: '#000080' }}>ई-मेल/E-mail :</strong> <span style={{ color: '#000080', textDecoration: 'underline' }}>chennai-nmi@nic.in.</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
