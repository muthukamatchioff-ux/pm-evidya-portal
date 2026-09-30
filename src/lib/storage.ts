import { promises as fs } from 'fs';
import path from 'path';

// Storage abstraction
export interface StorageProvider {
  upload(file: File, key: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'uploads');
  }

  private async ensureDir() {
    try {
      await fs.access(this.baseDir);
    } catch {
      await fs.mkdir(this.baseDir, { recursive: true });
    }
  }

  async upload(file: File, key: string): Promise<string> {
    await this.ensureDir();
    const filePath = path.join(this.baseDir, key);
    
    // Convert Web File to Node Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, key);
    return await fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

// Export the configured provider
export const storage = new LocalStorageProvider();
