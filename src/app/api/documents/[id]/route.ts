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
      where: { id: params.id }
    });

    if (!document || !document.filePath) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const fileBuffer = await storage.download(document.filePath);

    const ext = document.name.split('.').pop()?.toLowerCase();

    let contentType = 'application/octet-stream';

    if (ext === 'pdf') contentType = 'application/pdf';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    if (ext === 'png') contentType = 'image/png';
    if (ext === 'docx') contentType =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (ext === 'doc') contentType = 'application/msword';

    const disposition =
      ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png'
        ? 'inline'
        : 'attachment';

    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${document.name}"`,
      },
    });
  } catch (error) {
    console.error('Document preview/download error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
