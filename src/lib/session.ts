const encoder = new TextEncoder();

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD_HASH;
  if (secret) {
    return secret.replace(/^["']|["']$/g, '');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[Security Exception] A persistent, securely configured SESSION_SECRET environment variable is strictly required in production.');
  }
  return 'dev_ephemeral_session_secret_for_local_testing_only';
}

async function getCryptoKey(): Promise<CryptoKey> {
  const secret = getSessionSecret();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signSession(data: string): Promise<string> {
  const key = await getCryptoKey();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signature = bufferToHex(signatureBuffer);
  return `${data}.${signature}`;
}

export async function verifySession(token: string | undefined): Promise<any | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  
  const key = await getCryptoKey();
  const expectedSignatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const expectedSignature = bufferToHex(expectedSignatureBuffer);
  
  if (signature === expectedSignature) {
    try {
      return JSON.parse(atob(data));
    } catch (e) {
      return null;
    }
  }
  return null;
}
