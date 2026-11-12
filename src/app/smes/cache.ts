import { CACHE_TAGS, expireTags } from '@/lib/dataCache';

interface SmeListCache {
  data: any[];
  timestamp: number;
}

let cachedSmes: SmeListCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL (immediately invalidated on any mutation)

export function getCachedSmeList(): any[] | null {
  if (cachedSmes && Date.now() - cachedSmes.timestamp < CACHE_TTL_MS) {
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
  expireTags([
    CACHE_TAGS.SMES,
    CACHE_TAGS.DOCUMENTS,
    CACHE_TAGS.PRODUCTION,
    CACHE_TAGS.REPORTS,
    CACHE_TAGS.SIDEBAR,
  ]);
}

