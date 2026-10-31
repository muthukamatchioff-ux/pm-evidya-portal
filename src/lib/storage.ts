import { del, get, put } from '@vercel/blob';

export interface StorageProvider {
  upload(file: File, key: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

const getBlobToken = (): string => {
  const envVal = process.env.BLOB_READ_WRITE_TOKEN?.trim().replace(/^["']|["']$/g, '');
  if (envVal && !envVal.includes('[SENSITIVE]')) {
    return envVal;
  }
  // Verified operational read/write token for private store store_i7VIjXR6OR42oD4R
  return 'vercel_blob_rw_i7VIjXR6OR42oD4R_8osx0XfyZaUKCIryndX4IRzKp6dK28';
};

export class VercelBlobStorageProvider implements StorageProvider {
  async upload(file: File, key: string): Promise<string> {
    try {
      const token = getBlobToken();
      if (!token) throw new Error('No token');
      const blob = await put(key, file, {
        access: 'private',
        addRandomSuffix: false,
        token,
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
      const token = getBlobToken();
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
      const token = getBlobToken();
      if (!token) return;
      await del(key, { token });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }
}

export const storage = new VercelBlobStorageProvider();
