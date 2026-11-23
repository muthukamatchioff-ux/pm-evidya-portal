// In-Memory & File-Safe FCM Token Registry
// Associates FCM device push tokens with authenticated user accounts without modifying DB schema

interface RegisteredDevice {
  token: string;
  email: string;
  role: string;
  platform: string;
  updatedAt: number;
}

const deviceRegistry = new Map<string, RegisteredDevice>();

export function registerDeviceToken(email: string, role: string, token: string, platform = 'android'): void {
  if (!token) return;
  deviceRegistry.set(token, {
    token,
    email: email.toLowerCase().trim(),
    role: role.toUpperCase().trim(),
    platform,
    updatedAt: Date.now()
  });
}

export function unregisterDeviceToken(token: string): void {
  deviceRegistry.delete(token);
}

export function getTokensByRole(role: string): string[] {
  const normRole = role.toUpperCase().trim();
  const tokens: string[] = [];
  for (const device of deviceRegistry.values()) {
    if (device.role === normRole) {
      tokens.push(device.token);
    }
  }
  return tokens;
}

export function getTokensByEmail(email: string): string[] {
  const normEmail = email.toLowerCase().trim();
  const tokens: string[] = [];
  for (const device of deviceRegistry.values()) {
    if (device.email === normEmail) {
      tokens.push(device.token);
    }
  }
  return tokens;
}
