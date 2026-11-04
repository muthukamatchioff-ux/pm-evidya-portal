interface SmeListCache {
  data: any[];
  timestamp: number;
}

let cachedSmes: SmeListCache | null = null;

export function getCachedSmeList(): any[] | null {
  if (cachedSmes && Date.now() - cachedSmes.timestamp < 60000) {
    return cachedSmes.data;
  }
  return null;
}

export function setCachedSmeList(data: any[]): void {
  cachedSmes = {
    data,
    timestamp: Date.now(),
  };
}

export function clearSmeListCache(): void {
  cachedSmes = null;
}
