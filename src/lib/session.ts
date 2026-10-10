const SESSION_SECRET = process.env.ADMIN_PASSWORD_HASH || 'fallback_secret_key_12345';
const encoder = new TextEncoder();

async function getCryptoKey() {
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(SESSION_SECRET),
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
