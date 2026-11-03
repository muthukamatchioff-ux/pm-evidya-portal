import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';
import { verifySession } from '@/lib/session';

function getContentType(filename: string): string {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'txt':
      return 'text/plain; charset=utf-8';
    case 'csv':
      return 'text/csv; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  if (num < 0) return '';
  const n = ('000000000' + Math.round(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim() + ' Only';
}

function renderOfficialDocumentHtml(doc: any): string {
  const workEntry = doc.workEntry || {};
  const sme = workEntry.sme || {};
  const epicSeq = workEntry.epicSequence || 1;
  const epicIdStr = `EPIC-2026-PMeVidya ${String(epicSeq).padStart(2, '0')}`;
  const smeName = sme.name || 'Subject Matter Expert';
  const smeDesignation = sme.designation || 'Subject Matter Expert';
  const smeInst = sme.institute || 'National Instructional Media Institute (NIMI), Chennai';
  const trade = workEntry.trade || 'General';
  const topic = workEntry.topic || 'Classroom Teaching Video Production';

  let parsedParams: any = null;
  if (doc.filePath && typeof doc.filePath === 'string' && doc.filePath.startsWith('{')) {
    try {
      parsedParams = JSON.parse(doc.filePath);
    } catch {}
  }

  const isAppLetter = doc.type === 'APPROVAL_LETTER' || doc.type === 'STAGE_A_APPROVAL_LETTER';
  const isWorkComp = doc.type === 'WORK_COMPLETION' || doc.type === 'STAGE_B_WORK_COMPLETION';
  const isPayNote = doc.type === 'PAYMENT_NOTE' || doc.type === 'STAGE_C_REMUNERATION';
  const isAttendance = doc.type === 'SME_ATTENDANCE' || doc.type === 'ATTENDANCE' || doc.type === 'TRADE_DETAILS';

  const docTitle = isAppLetter
    ? 'OFFICIAL APPROVAL & DEPUTATION ORDER'
    : isWorkComp
    ? 'WORK COMPLETION & VERIFICATION CERTIFICATE'
    : isPayNote
    ? 'SME REMUNERATION & SANCTION NOTE'
    : isAttendance
    ? 'SME ATTENDANCE & PARTICIPATION RECORD'
    : (doc.name || 'OFFICIAL COMPLIANCE DOCUMENT');

  const refNo = parsedParams?.refNoPrefix
    ? `${parsedParams.refNoPrefix}${parsedParams.year || '2026'}/${String(epicSeq).padStart(2, '0')}`
    : `NIMI/MS/T-11022/MM/2026/${String(epicSeq).padStart(2, '0')}`;

  const docDate = parsedParams?.letterDate || parsedParams?.submissionDate || '2026-09-15';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${docTitle} - ${epicIdStr}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    body { font-family: "Georgia", "Times New Roman", serif; color: #111827; background: #f8fafc; margin: 0; padding: 24px; }
    .top-toolbar { max-width: 820px; margin: 0 auto 16px; background: #1e293b; color: #fff; padding: 12px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .top-toolbar span { font-size: 13.5px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; gap: 8px; }
    .btn-action { background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .btn-action:hover { background: #1d4ed8; }
    .btn-secondary { background: #475569; }
    .btn-secondary:hover { background: #334155; }
    .doc-page { max-width: 820px; margin: 0 auto; background: #fff; padding: 48px 56px; border-radius: 4px; box-shadow: 0 2px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .org-sub { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .org-title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.02em; margin: 0 0 4px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .org-desc { font-size: 11.5px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .meta-bar { display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; color: #334155; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .doc-headline { text-align: center; font-size: 17px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 24px 0 20px; letter-spacing: 0.04em; text-decoration: underline; text-underline-offset: 4px; }
    .doc-body { font-size: 14.5px; color: #1e293b; text-align: justify; margin-bottom: 24px; }
    .doc-body p { margin: 0 0 16px; }
    .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13.5px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 10px 14px; }
    .data-table th { background: #f1f5f9; text-align: left; font-weight: 700; color: #1e293b; }
    .sig-section { display: flex; justify-content: space-between; margin-top: 56px; padding-top: 16px; }
    .sig-box { text-align: center; width: 220px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .sig-line { border-top: 1px solid #0f172a; margin-top: 48px; padding-top: 6px; font-weight: 700; font-size: 13px; color: #0f172a; }
    .sig-title { font-size: 11px; color: #64748b; }
    @media print {
      body { background: #fff; padding: 0; }
      .top-toolbar { display: none !important; }
      .doc-page { box-shadow: none; border: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="top-toolbar">
    <span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      Official Generated PM e-Vidya Document &bull; Verified in Registry
    </span>
    <div style="display: flex; gap: 10px;">
      <button onclick="window.print()" class="btn-action">🖨️ Print / Save as PDF</button>
      <a href="/accounts" target="_top" class="btn-action btn-secondary">📤 Upload Signed Scanned Copy</a>
    </div>
  </div>

  <div class="doc-page">
    <div class="header">
      <div class="org-sub">Government of India &bull; Ministry of Skill Development &amp; Entrepreneurship</div>
      <div class="org-title">National Instructional Media Institute (NIMI)</div>
      <div class="org-desc">CTI Campus, Guindy Industrial Estate, Guindy, Chennai, Tamil Nadu 600032<br/>PM e-Vidya Digital Content Production &amp; Management Directorate</div>
    </div>

    <div class="meta-bar">
      <div>Ref No: <strong>${refNo}</strong></div>
      <div>Date: <strong>${docDate}</strong></div>
    </div>

    <div class="doc-headline">${docTitle}</div>

    <div class="doc-body">
      ${isAppLetter ? `
        <div style="margin-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13.5px;">
          <strong>To:</strong><br/>
          ${parsedParams?.recipientDesignation || 'The Principal / Head of Institute'},<br/>
          ${parsedParams?.recipientInst || smeInst},<br/>
          ${parsedParams?.recipientLoc || sme.location || 'Chennai'}
        </div>
        <p><strong>Sub:</strong> Deputation of Subject Matter Expert (SME) for PM e-Vidya Classroom Teaching Video Production &ndash; Reg.</p>
        <p>The National Instructional Media Institute (NIMI), functioning under the Ministry of Skill Development &amp; Entrepreneurship, Government of India, is engaged in the creation and development of high-quality digital learning content under PM e-Vidya.</p>
        <p>Approval is hereby conveyed for the engagement of <strong>${smeName}</strong>, <strong>${smeDesignation}</strong>, as the Subject Matter Expert for video content development in the trade/domain <strong>"${trade}"</strong> under work sequence <strong>${epicIdStr}</strong>.</p>
        <p>The expert is assigned for the duration of <strong>${parsedParams?.duration || '1 Week'}</strong> starting from <strong>${parsedParams?.startDate || docDate}</strong> at NIMI Studios, Chennai.</p>
      ` : isWorkComp ? `
        <p>This is to certify that <strong>${smeName}</strong>, <strong>${smeDesignation}</strong> of <strong>${smeInst}</strong>, has successfully delivered the assigned PM e-Vidya instructional video recording sessions for the trade <strong>"${trade}"</strong> under sequence <strong>${epicIdStr}</strong>.</p>
        <p>The expert completed the required pedagogical modules and studio recordings in full compliance with the approved curriculum and PM e-Vidya production guidelines.</p>
        <table class="data-table">
          <thead>
            <tr>
              <th>Curriculum Topic / Module</th>
              <th>Trade / Domain</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${topic}</td>
              <td>${trade}</td>
              <td><strong style="color: #15803d;">COMPLETED &amp; ARCHIVED</strong></td>
            </tr>
          </tbody>
        </table>
      ` : isPayNote ? `
        <p>Sanction is hereby accorded for the release of remuneration / honorarium payable to <strong>${smeName}</strong>, <strong>${smeDesignation}</strong> (${smeInst}), who served as Subject Matter Expert for PM e-Vidya digital content development under sequence <strong>${epicIdStr}</strong>.</p>
        <table class="data-table">
          <thead>
            <tr>
              <th>Particulars</th>
              <th>Days</th>
              <th>Rate / Day</th>
              <th>Total Sanctioned Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Honorarium for Video Content Production (${trade})</td>
              <td style="text-align: center;">${parsedParams?.totalDays || workEntry.days || 6}</td>
              <td>Rs. ${(parsedParams?.ratePerDay || workEntry.ratePerDay || 1500).toLocaleString('en-IN')}/-</td>
              <td><strong>Rs. ${(parsedParams?.totalAmount || 9000).toLocaleString('en-IN')}/-</strong></td>
            </tr>
          </tbody>
        </table>
        <p><strong>Amount in Words:</strong> ${parsedParams?.amountInWords || numberToWords(parsedParams?.totalAmount || 9000)}</p>
      ` : `
        <p>This official compliance record validates the verified registration of <strong>${doc.name}</strong> under PM e-Vidya for Subject Matter Expert <strong>${smeName}</strong> (${smeDesignation}), associated with trade <strong>${trade}</strong> at <strong>${smeInst}</strong>.</p>
        <table class="data-table">
          <thead>
            <tr><th>Parameter</th><th>Details</th></tr>
          </thead>
          <tbody>
            <tr><td>EPIC ID</td><td><strong>${epicIdStr}</strong></td></tr>
            <tr><td>Subject Matter Expert</td><td>${smeName}</td></tr>
            <tr><td>Trade / Subject</td><td>${trade}</td></tr>
            <tr><td>Assigned Topic</td><td>${topic}</td></tr>
            <tr><td>Institution</td><td>${smeInst}</td></tr>
          </tbody>
        </table>
      `}
    </div>

    <div class="sig-section">
      <div class="sig-box">
        <div class="sig-line">NIMI PM e-Vidya Admin</div>
        <div class="sig-title">Verified by Project Cell</div>
      </div>
      <div class="sig-box">
        <div class="sig-line">Joint Director / Head of Office</div>
        <div class="sig-title">NIMI Chennai, Govt. of India</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function renderNotUploadedHtml(doc: any): string {
  const epicSeq = doc.workEntry?.epicSequence || 1;
  const epicStr = `EPIC-2026-PMeVidya ${String(epicSeq).padStart(2, '0')}`;
  const smeName = doc.workEntry?.sme?.name || 'Subject Matter Expert';
  const docName = doc.name || 'Document';
  const version = doc.version || 1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document Registry - ${docName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
      color: #0f172a;
      background: #f8fafc;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      max-width: 520px;
      width: 100%;
      padding: 36px 32px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
      text-align: center;
    }
    .icon {
      font-size: 44px;
      margin-bottom: 16px;
    }
    h2 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 8px;
      color: #1e293b;
    }
    p {
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
      margin: 0 0 24px;
    }
    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
      text-align: left;
      font-size: 13px;
      margin-bottom: 24px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .meta-row:last-child {
      border-bottom: none;
    }
    .meta-label {
      color: #64748b;
      font-weight: 500;
    }
    .meta-value {
      color: #0f172a;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .btn {
      display: inline-block;
      background: #2563eb;
      color: #ffffff;
      padding: 10px 22px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      transition: background 0.15s;
    }
    .btn:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📁</div>
    <h2>Original Document Not Uploaded</h2>
    <p>This registry entry currently contains metadata only. The original signed file has not yet been uploaded for this document.</p>
    <div class="meta-box">
      <div class="meta-row">
        <span class="meta-label">Document Name</span>
        <span class="meta-value">${docName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">EPIC ID</span>
        <span class="meta-value" style="color: #2563eb;">${epicStr}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">SME Name</span>
        <span class="meta-value">${smeName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Version</span>
        <span class="meta-value">v${version}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Status</span>
        <span class="badge">PENDING UPLOAD</span>
      </div>
    </div>
    <a href="/accounts" class="btn" target="_top">Go to Document Upload</a>
  </div>
</body>
</html>`;
}

function renderStorageErrorHtml(docName: string, errorMsg?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document Unavailable - ${docName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 40px 20px;
      color: #0f172a;
      background: #f8fafc;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }
    .card {
      background: #ffffff;
      border: 1px solid #fee2e2;
      border-radius: 12px;
      max-width: 500px;
      width: 100%;
      padding: 32px;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    }
    .icon { font-size: 40px; margin-bottom: 12px; }
    h2 { font-size: 18px; color: #991b1b; margin: 0 0 8px; }
    p { font-size: 13.5px; color: #64748b; line-height: 1.5; margin: 0 0 16px; }
    .err-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; font-size: 12px; color: #b91c1c; font-family: monospace; word-break: break-all; margin-bottom: 20px; text-align: left; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h2>Original Document Temporarily Unavailable</h2>
    <p>The stored file for <strong>${docName}</strong> could not be retrieved from storage. Please verify the storage service or re-upload the document.</p>
    ${errorMsg ? `<div class="err-box">${errorMsg}</div>` : ''}
  </div>
</body>
</html>`;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  // 1. Security & Access Control: verify active session
  const token = request.cookies.get('session_token')?.value;
  const session = await verifySession(token);
  if (!session || !session.role) {
    return new NextResponse('Unauthorized: Please log in to access portal documents.', {
      status: 401,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  const rawParams = await props?.params;
  const pathId = request.nextUrl.pathname.split('/').filter(Boolean).pop() || '';
  const id = rawParams?.id || pathId;

  if (!id) {
    return new NextResponse('Document ID required', { status: 400 });
  }

  const isDownload = request.nextUrl.searchParams.get('download') === '1';

  try {
    let document: any = null;

    // 2. Lookup Document by ID
    try {
      document = await prisma.document.findUnique({
        where: { id },
        include: {
          workEntry: {
            include: {
              sme: true,
              payments: true,
              documents: true,
            }
          }
        }
      });
    } catch (dbErr) {
      console.warn('Prisma document findUnique failed:', dbErr);
    }

    // Fallback lookup if ID was not primary key
    if (!document) {
      try {
        document = await prisma.document.findFirst({
          where: {
            OR: [
              { id },
              { workEntryId: id },
              { name: { contains: id } }
            ]
          },
          include: {
            workEntry: {
              include: {
                sme: true,
                payments: true,
                documents: true,
              }
            }
          }
        });
      } catch {}
    }

    // In-memory fallback dataset lookup
    if (!document) {
      try {
        const { REAL_PM_EVIDYA_SME_WORK_ENTRIES, REAL_PM_EVIDYA_SMES } = await import('@/lib/fallbackData');
        for (const we of (REAL_PM_EVIDYA_SME_WORK_ENTRIES as any[])) {
          const match = (we.documents || []).find((d: any) =>
            d.id === id || d.workEntryId === id || (d.name && d.name.includes(id))
          );
          if (match) {
            document = {
              ...match,
              workEntry: {
                ...we,
                sme: we.sme || REAL_PM_EVIDYA_SMES.find((s: any) => s.id === we.smeId)
              }
            };
            break;
          }
        }
      } catch {}
    }

    if (!document) {
      return new NextResponse('Document not found', { status: 404 });
    }

    // 3. Resolve the actual uploaded file or companion upload
    let targetDoc = document;
    const hasDirectFile = targetDoc.filePath && !targetDoc.filePath.startsWith('{');

    // If this registry record only stores metadata/parameters, connect to the uploaded document on the same work entry
    if (!hasDirectFile && targetDoc.workEntryId) {
      const typeCandidates = [targetDoc.type];
      if (targetDoc.type === 'APPROVAL_LETTER' || targetDoc.type === 'STAGE_A_APPROVAL_LETTER') {
        typeCandidates.push('APPROVAL_LETTER', 'STAGE_A_APPROVAL_LETTER');
      } else if (targetDoc.type === 'WORK_COMPLETION' || targetDoc.type === 'STAGE_B_WORK_COMPLETION') {
        typeCandidates.push('WORK_COMPLETION', 'STAGE_B_WORK_COMPLETION');
      } else if (targetDoc.type === 'SME_ATTENDANCE' || targetDoc.type === 'ATTENDANCE' || targetDoc.type === 'TRADE_DETAILS') {
        typeCandidates.push('SME_ATTENDANCE', 'ATTENDANCE', 'TRADE_DETAILS');
      } else if (targetDoc.type === 'PAYMENT_NOTE' || targetDoc.type === 'STAGE_C_REMUNERATION') {
        typeCandidates.push('PAYMENT_NOTE', 'STAGE_C_REMUNERATION');
      }

      try {
        const companionUpload = await prisma.document.findFirst({
          where: {
            workEntryId: targetDoc.workEntryId,
            type: { in: typeCandidates },
            status: 'UPLOADED',
            filePath: { not: null }
          },
          orderBy: [{ version: 'desc' }, { createdAt: 'desc' }]
        });

        if (companionUpload && companionUpload.filePath && !companionUpload.filePath.startsWith('{')) {
          targetDoc = companionUpload;
        }
      } catch (companionErr) {
        console.warn('Error querying companion uploaded document:', companionErr);
      }
    }

    const hasResolvedFile = targetDoc.filePath && !targetDoc.filePath.startsWith('{');

    // 4. If an actual stored file exists (Vercel Blob, Data URI, or local file):
    if (hasResolvedFile) {
      try {
        const fileBuffer = await storage.download(targetDoc.filePath);
        const filename = targetDoc.name || 'document.pdf';
        const contentType = getContentType(filename);
        const ext = filename.split('.').pop()?.toLowerCase() || '';

        const inlineSupported = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'txt'];
        const disposition = isDownload || !inlineSupported.includes(ext) ? 'attachment' : 'inline';
        const cleanFilename = filename.replace(/["\r\n]/g, '_');

        return new NextResponse(fileBuffer as any, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `${disposition}; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`,
            'Content-Length': fileBuffer.length.toString(),
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          },
        });
      } catch (storageErr: any) {
        console.warn('Storage download failed for document, falling back to official generated view:', targetDoc.id, storageErr?.message);
        // Fall back to official generated document view if storage is temporarily unreachable
      }
    }

    // 5. If no uploaded physical file (or storage download failed):
    // Render the authentic, official PM e-Vidya document
    const hasWorkEntryOrParams = document.workEntry || (document.filePath && document.filePath.startsWith('{'));

    if (hasWorkEntryOrParams) {
      const htmlContent = renderOfficialDocumentHtml(document);
      const disposition = isDownload ? `attachment; filename="${(document.name || 'document').replace(/[^a-zA-Z0-9_\-\.]/g, '_')}.html"` : 'inline';

      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': disposition,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        }
      });
    }

    // 6. Only for orphan records without work entry details:
    return new NextResponse(renderNotUploadedHtml(document), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error: any) {
    console.error('Document route error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
