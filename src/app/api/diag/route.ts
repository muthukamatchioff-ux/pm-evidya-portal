import { NextResponse } from 'next/server';

export async function GET() {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const hashExists = typeof passwordHash !== 'undefined';
  const hashType = typeof passwordHash;
  const hashLength = hashExists && hashType === 'string' ? passwordHash.length : 0;
  const isBcryptFormat = hashExists && hashType === 'string' && (passwordHash.startsWith('$2a$') || passwordHash.startsWith('$2b$') || passwordHash.startsWith('$2y$'));
  
  const first3Chars = hashExists && hashType === 'string' ? passwordHash.substring(0, 3) : '';
  const last3Chars = hashExists && hashType === 'string' ? passwordHash.substring(hashLength - 3) : '';
  
  return NextResponse.json({
    exists: hashExists,
    type: hashType,
    length: hashLength,
    bcrypt_format: isBcryptFormat,
    prefix: first3Chars,
    suffix: last3Chars
  });
}
