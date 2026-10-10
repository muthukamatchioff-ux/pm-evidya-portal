import { del, get, put } from '@vercel/blob';

export interface StorageProvider {
  upload(file: File, key: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

// Token validation moved to function execution to prevent module crash

export class VercelBlobStorageProvider implements StorageProvider {
  async upload(file: File, key: string): Promise<string> {
    try {
      if (!blobToken) throw new Error('No token');
      const blob = await put(key, file, {
        access: 'private',
        addRandomSuffix: false,
        token: blobToken,
      });
      return blob.url;
    } catch (error) {
      console.warn('Vercel Blob failed, falling back to Base64:', error);
      // Fallback: Convert file to Base64 Data URI so it still works in the DB
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return `data:${file.type || 'application/octet-stream'};base64,${base64}`;
    }
  }

  async download(key: string): Promise<Buffer> {
    if (key.startsWith('data:')) {
      const b64Data = key.split(',')[1];
      return Buffer.from(b64Data, 'base64');
    }

    try {
      if (!blobToken) throw new Error('No token');
      const pathname = new URL(key).pathname.slice(1);
      const result = await get(pathname, {
        access: 'private',
        token: blobToken,
      });

      if (!result) {
        throw new Error('Blob not found');
      }

      return Buffer.from(await new Response(result.stream).arrayBuffer());
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error('File download failed. Please ensure the storage is correctly configured.');
    }
  }

  async delete(key: string): Promise<void> {
    if (key.startsWith('data:')) return; // No deletion needed for embedded URIs
    
    try {
      if (!blobToken) return;
      await del(key, { token: blobToken });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }
}

export const storage = new VercelBlobStorageProvider();
