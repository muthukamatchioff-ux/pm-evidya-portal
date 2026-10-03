"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

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

const formatDateDot = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
};

export default function UnifiedSmeGeneratorClient({ sme, role }: { sme: any, role?: string }) {
  const approvalRef = useRef<HTMLDivElement>(null);
  const completionRef = useRef<HTMLDivElement>(null);
  const sanctionRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState('entry');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [refNo, setRefNo] = useState('NIMI/MS/T-11022/MM/');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [smeName, setSmeName] = useState(sme.name || 'Dr. Majji Bala Ganesh Reddy');
  const [smeDesignation, setSmeDesignation] = useState(sme.designation || 'Principal');
  const [smeInst, setSmeInst] = useState(sme.institute || 'Shri Raja Rajeswari ITI');
  const [smePlace, setSmePlace] = useState(sme.location || 'Kakinada, Andhra Pradesh');
  const [smeRole, setSmeRole] = useState('Guest Expert / Subject Matter Expert (SME)');
  
  const entry = sme.workEntries?.[0] || {};
  const getEpicId = (epicSequence: number) => `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;

  const [trades, setTrades] = useState([
    {
      id: Date.now().toString(),
      tradeName: entry.trade || 'AI Programming Assistant',
      topic: entry.topic || 'Introduction to AI',
      startDate: entry.attendanceFrom ? new Date(entry.attendanceFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: entry.attendanceTo ? new Date(entry.attendanceTo).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      totalDays: entry.days || 4,
      ratePerDay: entry.ratePerDay || 1500,
      totalAmount: (entry.days || 4) * (entry.ratePerDay || 1500)
    }
  ]);
  const [duration, setDuration] = useState('1 Week');
  const [reason, setReason] = useState('the official shoot schedule');
  const [isExtension, setIsExtension] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [signatory, setSignatory] = useState('Joint Director / HOO');
  
  const [recipientDesignation, setRecipientDesignation] = useState('The Principal');
  const [recipientInst, setRecipientInst] = useState(sme.institute || 'Shri Raja Rajeswari ITI');
  const [recipientLoc, setRecipientLoc] = useState(sme.location || 'Kakinada, Andhra Pradesh');

  const [programmeName, setProgrammeName] = useState('PM e-Vidya Classroom Teaching Video Production');
  const [workTitle, setWorkTitle] = useState('Classroom Teaching Video Production for PM e-Vidya');
  const [location, setLocation] = useState('National Instructional Media Institute (NIMI), Chennai');

  const [taAmount, setTaAmount] = useState(entry.taAmount || 0);
  const [otherAmount, setOtherAmount] = useState(entry.otherAmount || 0);

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
      return { ...t, totalDays: days, totalAmount: days * t.ratePerDay };
    });
    if (JSON.stringify(updatedTrades) !== JSON.stringify(trades)) {
      setTrades(updatedTrades);
    }
  }, [trades]);

  const baseTotalAmount = trades.reduce((acc, t) => acc + t.totalAmount, 0);
  const grandTotalDays = trades.reduce((acc, t) => acc + t.totalDays, 0);
  const grandTotalAmount = baseTotalAmount + taAmount + otherAmount;
  const amountInWords = numberToWords(grandTotalAmount);

  const addTrade = () => {
    setTrades([...trades, {
      id: Date.now().toString(),
      tradeName: '',
      topic: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      totalDays: 1,
      ratePerDay: 1500,
      totalAmount: 1500
    }]);
  };

  const updateTrade = (id: string, field: string, value: any) => {
    setTrades(trades.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  
  const handleSave = async () => {
    setIsGenerating(true);
    try {
      const { updateSMERecord } = await import('./actions');
      const res = await updateSMERecord(sme.id, entry.id, {
        smeName, smeDesignation, smeInst, smePlace,
        trade: trades[0]?.tradeName, topic: trades[0]?.topic, startDate: trades[0]?.startDate, endDate: trades[0]?.endDate, totalDays: grandTotalDays, ratePerDay: trades[0]?.ratePerDay,
        taAmount, otherAmount
      });
      if (res.success) {
        alert("SME Record saved successfully!");
      } else {
        alert("Error saving: " + res.error);
      }
    } catch (e) {
      alert("Error saving SME record");
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    setIsGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = ref.current;
      if (!element) return;
      
      const opt: any = {
        margin:       0,
        filename:     `${filename}_${smeName.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 4, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error(error);
      alert('Failed to generate PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderHeader = () => (
    <div style={{ position: 'relative', textAlign: 'center', borderBottom: '2px solid #000080', paddingBottom: '10px', marginBottom: '20px', color: '#000080' }}>
      <h1 style={{ fontSize: '22px', margin: 0, fontWeight: 'bold' }}>NATIONAL INSTRUCTIONAL MEDIA INSTITUTE</h1>
      <img src="/nimi-logo.png" alt="NIMI Logo" style={{ position: 'absolute', top: '28px', right: '0px', width: '140px', height: 'auto' }} />
      <p style={{ margin: 0, fontSize: '16px' }}>(AN AUTONOMOUS INSTITUTION)</p>
      <p style={{ margin: 0, fontSize: '14px' }}>Ministry of Skill Development & Entrepreneurship</p>
      <p style={{ margin: 0, fontSize: '14px' }}>Government of India</p>
      <p style={{ margin: 0, fontSize: '12px' }}>Post Box No.3142, CTI Campus, Guindy Industrial Estate, Guindy, Chennai - 600 032.</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: '10px', background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <button onClick={() => setActiveTab('entry')} style={{ padding: '8px 16px', background: activeTab === 'entry' ? '#1d4ed8' : '#e2e8f0', color: activeTab === 'entry' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>1. Enter All Details</button>
        <button onClick={() => setActiveTab('approval')} style={{ padding: '8px 16px', background: activeTab === 'approval' ? '#10b981' : '#e2e8f0', color: activeTab === 'approval' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>2. Preview Approval Letter</button>
        <button onClick={() => setActiveTab('completion')} style={{ padding: '8px 16px', background: activeTab === 'completion' ? '#8b5cf6' : '#e2e8f0', color: activeTab === 'completion' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>3. Preview Work Completion</button>
        <button onClick={() => setActiveTab('sanction')} style={{ padding: '8px 16px', background: activeTab === 'sanction' ? '#f59e0b' : '#e2e8f0', color: activeTab === 'sanction' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>4. Preview Payment Note</button>
      </div>

      <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowY: 'auto' }}>
        
        {activeTab === 'entry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Master SME & Document Details</h2>
                {entry.id && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '5px' }}>EPIC ID: <strong style={{ color: '#3b82f6' }}>{getEpicId(entry.epicSequence || 1)}</strong></div>}
              </div>
              <button onClick={handleSave} disabled={isGenerating} style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: role === 'VISITOR' ? 'none' : 'block' }}>
                {isGenerating ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>SME Name</label><input value={smeName} onChange={e=>setSmeName(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Designation</label><input value={smeDesignation} onChange={e=>setSmeDesignation(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Institution</label><input value={smeInst} onChange={e=>setSmeInst(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>City & State</label><input value={smePlace} onChange={e=>setSmePlace(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
            </div>

            <h3 style={{ marginTop: '10px' }}>Approval Letter Parameters</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Reference Prefix</label><input value={refNo} onChange={e=>setRefNo(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Year</label><input value={year} onChange={e=>setYear(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Letter Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '10px' }}>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Recipient Designation</label><input value={recipientDesignation} onChange={e=>setRecipientDesignation(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Recipient Institution</label><input value={recipientInst} onChange={e=>setRecipientInst(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Recipient Location</label><input value={recipientLoc} onChange={e=>setRecipientLoc(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginTop: '10px' }}>
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Is Extension?</label>
                <select value={isExtension ? 'yes' : 'no'} onChange={e => setIsExtension(e.target.value === 'yes')} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <option value="yes">Yes, this is an extension</option>
                  <option value="no">No, initial approval</option>
                </select>
              </div>
              {isExtension && (
                <>
                  <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Reason</label><input value={reason} onChange={e=>setReason(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
                  <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Extension Date</label><input value={extensionDate} onChange={e=>setExtensionDate(e.target.value)} placeholder="DD.MM.YYYY" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginTop: '10px' }}>
              <div>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Signatory Title</label>
                <select value={signatory} onChange={e => setSignatory(e.target.value)} style={{ width: '100%', maxWidth: '300px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                  <option value="Joint Director / HOO">Joint Director / HOO</option>
                  <option value="Executive Director">Executive Director</option>
                </select>
              </div>
            </div>

            <h3 style={{ marginTop: '10px' }}>Work Completion & Payment Parameters</h3>
            {trades.map((t, idx) => (
              <div key={t.id} style={{ background: '#f8fafc', padding: '15px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>Trade / Phase {idx + 1}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Trade</label><input value={t.tradeName} onChange={e=>updateTrade(t.id, 'tradeName', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
                  <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Topics Covered</label><textarea value={t.topic} onChange={e=>updateTrade(t.id, 'topic', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', minHeight: '60px' }} /></div>
                  <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Start Date</label><input type="date" value={t.startDate} onChange={e=>updateTrade(t.id, 'startDate', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
                  <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>End Date</label><input type="date" value={t.endDate} onChange={e=>updateTrade(t.id, 'endDate', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
                  <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Rate per Day (₹)</label><input type="number" value={t.ratePerDay} onChange={e=>updateTrade(t.id, 'ratePerDay', Number(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
                  <div style={{ alignSelf: 'center', fontSize: '14px', color: '#16a34a', fontWeight: 'bold' }}>Auto-calculated: {t.totalDays} Days | ₹ {t.totalAmount}</div>
                </div>
              </div>
            ))}
            <button className="btn-secondary" style={{ width: '100%', background: '#e2e8f0', padding: '10px', borderRadius: '4px', cursor: 'pointer' }} onClick={addTrade}>+ Add Another Trade / Date Block</button>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>TA Amount (₹)</label><input type="number" value={taAmount} onChange={e=>setTaAmount(Number(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'5px' }}>Other Charges (₹)</label><input type="number" value={otherAmount} onChange={e=>setOtherAmount(Number(e.target.value))} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></div>
            </div>
            
            <div style={{ marginTop: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Base Remuneration:</span>
                <span>₹ {baseTotalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>TA Amount:</span>
                <span>₹ {taAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Other Charges:</span>
                <span>₹ {otherAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '10px', fontWeight: 'bold' }}>
                <span>Grand Total Amount:</span>
                <span>₹ {grandTotalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ marginTop: '5px', fontStyle: 'italic', color: '#475569', fontSize: '13px' }}>({amountInWords})</div>
            </div>
          </div>
        )}

        {/* Previews */}
        <div style={{ display: activeTab === 'approval' ? 'block' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2>Approval Letter Preview</h2>
            <button onClick={() => generatePDF(approvalRef, 'Approval_Letter')} style={{ background: '#10b981', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{isGenerating ? 'Generating...' : 'Download PDF'}</button>
          </div>
          <div style={{ background: '#f8fafc', padding: '20px', display: 'flex', justifyContent: 'center' }}>
            <div ref={approvalRef} style={{ width: '210mm', minHeight: '297mm', background: 'white', padding: '20mm', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
              {renderHeader()}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
                <div>{refNo}{year}</div>
                <div>Date: {formatDateDot(date)}</div>
              </div>
              <div style={{ marginBottom: '20px' }}>To,<br />{recipientDesignation},<br />{recipientInst},<br />{recipientLoc}</div>
              <div style={{ marginBottom: '20px', display: 'flex' }}>
                <div style={{ fontWeight: 'bold', marginRight: '5px' }}>Sub:</div>
                <div>Invitation - as Subject Matter Expert (SME) to take Class room shooting for the PM e vidya channel for the trade {trades[0]?.tradeName} - Reg.</div>
              </div>
              <div style={{ textAlign: 'justify', marginBottom: '15px' }}>
                The National Instructional Media Institute (NIMI), functioning under the Ministry of Skill Development & Entrepreneurship, Government of India, is the nodal agency engaged in the development of e-Learning content for various trades offered through Industrial Training Institutes (ITIs) and other skill development programmes.
              </div>
              <div style={{ textAlign: 'justify', marginBottom: '15px' }}>
                In this connection, approval is hereby accorded for the Visit of <strong>{smeName}, {smeDesignation}, {smeInst}, {smePlace}</strong> to participate as a <strong>Subject Matter Expert (SME)</strong> for the <strong>PM e-Vidya Classroom Teaching Shoot</strong> for the trade <strong>"{trades[0]?.tradeName}"</strong> for {duration} from <strong>{formatDateDot(trades[0]?.startDate)}</strong>
                {isExtension && ` due to ${reason} the deputation period was requested to extended till ${extensionDate} based on the confirmation of the SME.`}
                {!isExtension && "."}
              </div>
              <div style={{ textAlign: 'justify', marginBottom: '15px' }}>
                The Subject Matter Expert shall extend academic and technical support for the classroom teaching session, including content delivery, validation of instructional materials, and other activities required for the successful production of the <strong>PM e-Vidya programme</strong>. He is requested to coordinate closely with the concerned PM e-Vidya and NIMI officials regarding the content, presentation methodology, reporting schedule, and other technical requirements for the classroom teaching shoot.
              </div>
              <div style={{ textAlign: 'justify', marginBottom: '15px' }}>
                The <strong>remuneration / honorarium</strong> for the assignment, along with reimbursement of <strong>Travelling Allowance (TA)</strong>, shall be paid by NIMI as per the prevailing NCERT norms based on the SME designation and eligibility, subject to submission of original travel tickets, boarding passes, and other supporting documents, wherever applicable <strong>(Balmer Lawrie & Company Limited, Ashok Travels & Tours, Indian Railway Catering and Tourism Corporation Ltd - IRCTC)</strong>.
              </div>
              <div style={{ textAlign: 'justify', marginBottom: '40px' }}>
                Your kind cooperation and valuable support towards the development of quality e-content for the Skill Development ecosystem will be highly solicited.
              </div>
              <div style={{ textAlign: 'right', marginTop: '30px', marginBottom: '10px' }}>
                Regards,
                <br /><br /><br /><br />
                <strong>{signatory}</strong>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: activeTab === 'completion' ? 'block' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2>Work Completion Preview</h2>
            <button onClick={() => generatePDF(completionRef, 'Work_Completion')} style={{ background: '#8b5cf6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{isGenerating ? 'Generating...' : 'Download PDF'}</button>
          </div>
          <div style={{ background: '#f8fafc', padding: '20px', display: 'flex', justifyContent: 'center' }}>
            <div ref={completionRef} style={{ width: '210mm', minHeight: '297mm', background: 'white', padding: '20mm', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
              {renderHeader()}
              <h2 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: '18px', margin: '30px 0' }}>Work Completion certificate</h2>
              <div style={{ textAlign: 'justify', lineHeight: '1.6', fontSize: '14px' }}>
                This is to certify that <strong>{smeName}</strong>, <strong>{smeRole}</strong>, has successfully completed the <strong>{programmeName}</strong> for the <strong>{trades[0]?.tradeName}</strong> trade at the <strong>{location}</strong>, during the period from <strong>{formatDateDot(trades[0]?.startDate)}</strong> to <strong>{formatDateDot(trades[trades.length - 1]?.endDate)}</strong>.
                <br /><br />
                As the <strong>{smeRole}</strong>, <strong>{smeName}</strong> effectively delivered the assigned classroom sessions in accordance with the approved curriculum, ensuring technical accuracy, instructional quality, and compliance with the applicable standards for PM e-Vidya digital learning content.
                <br /><br />
                The following topics were successfully delivered and recorded for integration into the PM e-Vidya Digital Learning Platform:
                <div style={{ paddingLeft: '20px', marginTop: '10px', marginBottom: '10px', whiteSpace: 'pre-wrap' }}>
                  {trades.map(t => t.topic).join('\n')}
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
                    {trades.map((t, idx) => (
                      <tr key={t.id}>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>{t.tradeName}</td>
                        {idx === 0 && (
                          <td rowSpan={trades.length} style={{ border: '1px solid #000', padding: '8px', verticalAlign: 'top' }}>
                            <strong>{smeName}</strong><br />{smeDesignation}, {smeInst}, {smePlace}
                          </td>
                        )}
                        {idx === 0 && (
                          <td rowSpan={trades.length} style={{ border: '1px solid #000', padding: '8px', verticalAlign: 'top' }}>{workTitle}</td>
                        )}
                        <td style={{ border: '1px solid #000', padding: '8px' }}>{formatDateDot(t.startDate)} - {formatDateDot(t.endDate)}</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}>₹{t.ratePerDay}/- ( per Day )</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontWeight: 'bold' }}>
                  <div style={{ textDecoration: 'underline' }}>SME DECLARATION</div>
                  <div style={{ textDecoration: 'underline' }}>NIMI VERIFICATION</div>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '13px' }}>
                  <div style={{ flex: 1 }}>
                    I, <strong>{smeName}</strong>, <strong>{smeRole}</strong>, hereby declares that I have successfully completed the <strong>{programmeName}</strong> for the <strong>{trades[0]?.tradeName}</strong> trade during the period from <strong>{formatDateDot(trades[0]?.startDate)}</strong> to <strong>{formatDateDot(trades[trades.length - 1]?.endDate)}</strong>.
                    <br /><br />
                    I certify that the assigned topics were delivered as per the approved curriculum and that the work has been completed satisfactorily for processing of the honorarium as per applicable NIMI norms.
                    <br /><br /><br /><br />
                    Signature of Guest Expert:<br />
                    Designation: {smeDesignation}, {smeInst},<br />
                    {smePlace}<br />
                    Date: {formatDateDot(date)}
                  </div>
                  <div style={{ flex: 1, paddingLeft: '20px' }}>
                    Certified that the above work has been completed satisfactorily and verified as per the requirements of the National Instructional Media Institute (NIMI).
                    <br /><br /><br /><br /><br /><br />
                    Signature<br />
                    Name: Shri. Ashfaq Ahmed<br />
                    Designation: Assistant Manager<br />
                    Organisation: National Instructional Media Institute (NIMI), Chennai<br />
                    Date: {formatDateDot(date)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: activeTab === 'sanction' ? 'block' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2>Payment Note Preview</h2>
            <button onClick={() => generatePDF(sanctionRef, 'Payment_Note')} style={{ background: '#f59e0b', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{isGenerating ? 'Generating...' : 'Download PDF'}</button>
          </div>
          <div style={{ background: '#f8fafc', padding: '20px', display: 'flex', justifyContent: 'center' }}>
            <div ref={sanctionRef} style={{ width: '210mm', minHeight: '297mm', background: 'white', padding: '20mm', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
              {renderHeader()}
              <h2 style={{ textAlign: 'center', textDecoration: 'underline', fontSize: '18px', margin: '30px 0' }}>SME REMUNERATION / SANCTION NOTE</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
                <div>Submitted</div>
                <div>{formatDateDot(date)}</div>
              </div>
              <div style={{ textAlign: 'justify', lineHeight: '1.8', fontSize: '14px' }}>
                Sanction may kindly be accorded for a sum of <strong>Rs. {grandTotalAmount}/- (Rupees {amountInWords})</strong> towards the remuneration of <strong>{smeName}</strong>, <strong>{smeDesignation}</strong>, <strong>{smeInst}, {smePlace}</strong>, who served as the <strong>{smeRole}</strong> for the <strong>{programmeName}</strong> for the <strong>{trades.map(t => t.tradeName).join(' and ')}</strong> trades. The <strong>{workTitle}</strong> was successfully conducted and completed at the <strong>{location}</strong>.
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
                        <td style={{ border: '1px solid #000', padding: '8px' }}><strong>{smeName}</strong><br />{smeDesignation}</td>
                        <td style={{ border: '1px solid #000', padding: '8px' }}><strong>{t.tradeName}</strong> &ndash; {smeInst}, {smePlace}</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{t.totalDays} Days</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Rs. {t.ratePerDay}/-</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Rs. {t.totalAmount}/-</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Subtotal (Remuneration):</td>
                      <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{grandTotalDays} Days</td>
                      <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                      <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Rs. {baseTotalAmount}/-</td>
                    </tr>
                    {taAmount > 0 && (
                      <tr>
                        <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Travelling Allowance (TA):</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Rs. {taAmount}/-</td>
                      </tr>
                    )}
                    {otherAmount > 0 && (
                      <tr>
                        <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Other Charges:</td>
                        <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Rs. {otherAmount}/-</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Grand Total:</td>
                      <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Rs. {grandTotalAmount}/-</td>
                    </tr>
                  </tfoot>
                </table>
                <br />
                If approved, payment of <strong>Rs. {grandTotalAmount}/- (Rupees {amountInWords})</strong> may be released to the above Subject Matter Expert from the PM e-Vidya Funds as per the prevailing NCERT norms. The SME engagement approval letter, Work Completion Certificate, and other supporting documents are enclosed separately for kind perusal.
                <br /><br />
                Submitted for kind approval, please.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px', fontSize: '14px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p>Prepared By / Verified By</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p><strong>Joint Director / HOO</strong></p>
                  <p>Head of Office</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
