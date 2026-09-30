import { del, get, put } from '@vercel/blob';

export interface StorageProvider {
  upload(file: File, key: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

if (!blobToken) {
  throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
}

export class VercelBlobStorageProvider implements StorageProvider {
  async upload(file: File, key: string): Promise<string> {
    const blob = await put(key, file, {
      access: 'private',
      addRandomSuffix: false,
      token: blobToken,
    });

    return blob.url;
  }

  async download(key: string): Promise<Buffer> {
    const pathname = new URL(key).pathname.slice(1);

    const result = await get(pathname, {
      access: 'private',
      token: blobToken,
    });

    if (!result) {
      throw new Error('Blob not found');
    }

    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    await del(key, {
      token: blobToken,
    });
  }
}

export const storage = new VercelBlobStorageProvider();
