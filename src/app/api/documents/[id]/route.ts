import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        workEntry: {
          include: {
            sme: true
          }
        }
      }
    });

    if (!document) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const isDownload = request.nextUrl.searchParams.get('download') === '1';

    // 1. If document is marked as UPLOADED or has an external file URL / data URI
    const isUploadedDoc = document.status === 'UPLOADED' || (document.filePath && (document.filePath.startsWith('http') || document.filePath.startsWith('data:')));

    if (isUploadedDoc) {
      if (!document.filePath) {
        return new NextResponse(
          `Uploaded file reference is missing for document "${document.name}" (ID: ${document.id}). No replacement template was generated to protect file identity.`,
          { status: 404 }
        );
      }

      try {
        const fileBuffer = await storage.download(document.filePath);
        const ext = document.name.split('.').pop()?.toLowerCase() || 'pdf';

        let contentType = 'application/pdf';
        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        if (ext === 'png') contentType = 'image/png';
        if (ext === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (ext === 'doc') contentType = 'application/msword';

        const disposition = isDownload
          ? 'attachment'
          : (ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png' ? 'inline' : 'attachment');

        return new NextResponse(fileBuffer as any, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `${disposition}; filename="${document.name}"`,
          },
        });
      } catch (blobErr: any) {
        console.error('Storage download failed for uploaded document:', document.id, blobErr);
        return new NextResponse(
          `The original uploaded file "${document.name}" could not be retrieved from storage (${blobErr?.message || 'Storage error'}). The exact record identity is preserved; no generated template or alternate file was substituted.`,
          { status: 502 }
        );
      }
    }

    // 2. Fallback / Generated document view for JSON parameters or registered records
    const sme = document.workEntry?.sme;
    const workEntry = document.workEntry;
    const epicSequence = workEntry?.epicSequence || 1;
    const epicIdStr = `EPIC-2026-PMeVidya ${String(epicSequence).padStart(2, '0')}`;
    const smeName = sme?.name || 'Subject Matter Expert';
    const trade = workEntry?.trade || 'General';
    const docDate = document.createdAt ? new Date(document.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');

    // Parse parameters if JSON
    let parsedParams: any = null;
    if (document.filePath && document.filePath.startsWith('{')) {
      try {
        parsedParams = JSON.parse(document.filePath);
      } catch {
        parsedParams = null;
      }
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${document.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 30px;
      color: #0f172a;
      background: #f8fafc;
      display: flex;
      justify-content: center;
    }
    .document-page {
      background: #ffffff;
      width: 100%;
      max-width: 800px;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      box-sizing: border-box;
    }
    .official-header {
      text-align: center;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .institute-title {
      font-size: 16px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }
    .portal-title {
      font-size: 12.5px;
      color: #475569;
      margin-top: 4px;
      font-weight: 600;
    }
    .doc-headline {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      text-decoration: underline;
      margin: 20px 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: 13.5px;
    }
    .meta-row {
      display: flex;
      gap: 6px;
    }
    .meta-label {
      font-weight: 700;
      color: #475569;
    }
    .meta-val {
      color: #0f172a;
    }
    .badge-verified {
      display: inline-block;
      background: #dcfce7;
      color: #15803d;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 11.5px;
    }
    .doc-body {
      font-size: 14px;
      line-height: 1.8;
      color: #334155;
      margin-bottom: 30px;
      text-align: justify;
    }
    .official-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 13px;
    }
    .official-table th, .official-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: left;
    }
    .official-table th {
      background: #f8fafc;
      font-weight: 700;
    }
    .footer-signatures {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      border-top: 1px dashed #cbd5e1;
      padding-top: 20px;
      font-size: 13px;
    }
    .sig-box {
      text-align: center;
    }
    .sig-line {
      font-weight: 700;
      margin-top: 28px;
    }
  </style>
</head>
<body>
  <div class="document-page">
    <div class="official-header">
      <div class="institute-title">National Instructional Media Institute (NIMI)</div>
      <div class="portal-title">Ministry of Skill Development & Entrepreneurship • PM e-Vidya Document Portal</div>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">EPIC ID:</span> <span class="meta-val" style="font-weight: 700; color: #1d4ed8;">${epicIdStr}</span></div>
      <div class="meta-row"><span class="meta-label">Date:</span> <span class="meta-val">${docDate}</span></div>
      <div class="meta-row"><span class="meta-label">SME Name:</span> <span class="meta-val">${smeName}</span></div>
      <div class="meta-row"><span class="meta-label">Designation:</span> <span class="meta-val">${sme?.designation || 'Subject Matter Expert'}</span></div>
      <div class="meta-row"><span class="meta-label">Trade:</span> <span class="meta-val">${parsedParams?.trade || trade}</span></div>
      <div class="meta-row"><span class="meta-label">Status:</span> <span class="badge-verified">✓ ${document.status || 'ACTIVE'}</span></div>
    </div>

    <div class="doc-headline">${document.name}</div>

    <div class="doc-body">
      ${parsedParams?.programmeName ? `
        <p>This is to certify that <strong>${smeName}</strong> served as a <strong>Subject Matter Expert</strong> for the programme <strong>"${parsedParams.programmeName}"</strong> for the trade <strong>"${parsedParams.trade || trade}"</strong>.</p>
        ${parsedParams.topicsCovered ? `<p><strong>Curriculum Modules Covered:</strong><br/>${parsedParams.topicsCovered.replace(/\n/g, '<br/>')}</p>` : ''}
        ${parsedParams.totalAmount ? `<p><strong>Sanctioned Remuneration:</strong> Rs. ${Number(parsedParams.totalAmount).toLocaleString('en-IN')}/- (${parsedParams.amountInWords || ''})</p>` : ''}
      ` : `
        <p>This official compliance record confirms the verified registration of <strong>${document.name}</strong> under PM e-Vidya for Subject Matter Expert <strong>${smeName}</strong> (${sme?.designation || 'SME'}), associated with trade <strong>${trade}</strong> at <strong>${sme?.institute || 'NIMI Chennai'}</strong>.</p>
        <p>All administrative and academic requirements for this document entry have been validated in the PM e-Vidya Document Registry.</p>
      `}
    </div>

    <table class="official-table">
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Document Name</td><td>${document.name}</td></tr>
        <tr><td>Document Type</td><td>${document.type}</td></tr>
        <tr><td>EPIC Work Sequence</td><td>${epicIdStr}</td></tr>
        <tr><td>Subject Matter Expert</td><td>${smeName}</td></tr>
        <tr><td>Assigned Domain / Trade</td><td>${parsedParams?.trade || trade}</td></tr>
        <tr><td>Institution / Location</td><td>${sme?.institute || 'NIMI Chennai'}${sme?.location ? `, ${sme.location}` : ''}</td></tr>
        <tr><td>Document Version</td><td>Version ${document.version || 1}</td></tr>
      </tbody>
    </table>

    <div class="footer-signatures">
      <div class="sig-box">
        <div>Verified by</div>
        <div class="sig-line">NIMI PM e-Vidya Admin</div>
      </div>
      <div class="sig-box">
        <div>Authorized Authority</div>
        <div class="sig-line">Joint Director / HOO</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const disposition = isDownload ? `attachment; filename="${document.name}.html"` : `inline; filename="${document.name}.html"`;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': disposition,
      },
    });
  } catch (error) {
    console.error('Document preview/download error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
