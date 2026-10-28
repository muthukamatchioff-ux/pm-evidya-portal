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
  <title>Document Not Uploaded - ${docName}</title>
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

    // 3. Resolve the actual uploaded file
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

    // 4. Handle records with no uploaded file:
    // DO NOT generate "SME Approval Letter" HTML template. Handle gracefully!
    if (!hasResolvedFile) {
      if (isDownload) {
        return new NextResponse(
          `Original document file not found for "${document.name}". The actual document file has not yet been uploaded for this registry entry.`,
          {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          }
        );
      }

      return new NextResponse(renderNotUploadedHtml(document), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 5. Retrieve and serve the exact original uploaded document
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
      console.error('Storage download failed for document', targetDoc.id, storageErr?.message);
      if (isDownload) {
        return new NextResponse(`Error downloading original file: ${storageErr?.message || 'Storage error'}`, {
          status: 502,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      return new NextResponse(renderStorageErrorHtml(targetDoc.name, storageErr?.message), {
        status: 502,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  } catch (error: any) {
    console.error('Document route error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
