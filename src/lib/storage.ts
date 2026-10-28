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
    if (!key) {
      throw new Error('No storage key or file path provided');
    }

    if (key.startsWith('data:')) {
      const b64Data = key.split(',')[1];
      return Buffer.from(b64Data, 'base64');
    }

    // Check if key points to a local file on disk
    try {
      const fs = await import('fs');
      if (fs.existsSync(key) && fs.statSync(key).isFile()) {
        return await fs.promises.readFile(key);
      }
    } catch {}

    // Check if key is a remote URL
    const isHttpUrl = key.startsWith('http://') || key.startsWith('https://');

    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN || blobToken;
      if (token) {
        let result = null;
        try {
          result = await get(key, {
            access: 'private',
            token,
          });
        } catch (e) {
          if (isHttpUrl) {
            try {
              const pathname = new URL(key).pathname.slice(1);
              result = await get(pathname, {
                access: 'private',
                token,
              });
            } catch {}
          }
        }

        if (result && result.stream) {
          return Buffer.from(await new Response(result.stream).arrayBuffer());
        }
      }

      // If Vercel Blob get failed or no token was available, try direct fetch if HTTP URL
      if (isHttpUrl) {
        const resp = await fetch(key);
        if (resp.ok) {
          return Buffer.from(await resp.arrayBuffer());
        }
      }

      throw new Error('Blob not found or inaccessible');
    } catch (error: any) {
      console.error('Storage download failed for key:', key, error?.message);
      throw new Error(`File download failed: ${error?.message || 'Storage error'}`);
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
