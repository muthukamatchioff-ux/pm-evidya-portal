import { unstable_cache, revalidateTag, revalidatePath, updateTag } from 'next/cache';

/**
 * Shared Cross-Lambda Cache Tags (Vercel Data Cache / Next.js Full Route & Data Cache).
 * Every financial, SME, document, video, and workflow query uses these tags so all
 * serverless routes share one warm data layer and invalidate atomically on mutations.
 */
export const CACHE_TAGS = {
  BUDGET_MASTER: 'budget-master',
  ANNEXURES: 'budget-annexures',
  ANNEXURE_1: 'annexure-1',
  ANNEXURE_2: 'annexure-2',
  ANNEXURE_3: 'annexure-3',
  ANNEXURE_4: 'annexure-4',
  ANNEXURE_5: 'annexure-5',
  ANNEXURE_6: 'annexure-6',
  SMES: 'sme-records',
  DOCUMENTS: 'documents-registry',
  VIDEOS: 'video-catalog',
  PRODUCTION: 'production-workflow',
  REPORTS: 'reports-data',
  SIDEBAR: 'sidebar-counts',
} as const;

/**
 * Wraps an async read operation with Next.js `unstable_cache` while safely falling back
 * to direct execution when invoked outside a Next.js runtime (e.g., CLI verification scripts or tests).
 */
export function cachedQuery<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  options: { revalidate?: number | false; tags?: string[] }
): (...args: TArgs) => Promise<TResult> {
  const wrapped = unstable_cache(fn, keyParts, {
    revalidate: options.revalidate ?? 300,
    tags: options.tags,
  });

  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await wrapped(...args);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (
        msg.includes('incrementalCache') ||
        msg.includes('Invariant:') ||
        msg.includes('staticGenerationAsyncStorage') ||
        msg.includes('workUnitAsyncStorage') ||
        msg.includes('cookies')
      ) {
        return await fn(...args);
      }
      throw err;
    }
  };
}

function expireSingleTag(tag: string) {
  try {
    updateTag(tag);
    return;
  } catch {
    // updateTag is only valid inside Server Actions; Route Handlers use revalidateTag
  }
  try {
    revalidateTag(tag, { expire: 0 });
  } catch {
    try {
      revalidateTag(tag, 'max');
    } catch {
      // Safe no-op outside Next.js request lifecycle
    }
  }
}

export function expireTags(tags: string[]) {
  for (const tag of tags) {
    expireSingleTag(tag);
  }
}

function safeRevalidatePath(path: string, type?: 'layout' | 'page') {
  try {
    if (type) {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }
  } catch {
    // Safe no-op outside Next.js request lifecycle
  }
}

/**
 * Atomically invalidates Budget Master, Annexure I–VI, Dashboard, and Financial Reports
 * across all serverless lambdas.
 */
export function invalidateFinancialCaches(specificPath?: string) {
  expireTags([
    CACHE_TAGS.BUDGET_MASTER,
    CACHE_TAGS.ANNEXURES,
    CACHE_TAGS.ANNEXURE_1,
    CACHE_TAGS.ANNEXURE_2,
    CACHE_TAGS.ANNEXURE_3,
    CACHE_TAGS.ANNEXURE_4,
    CACHE_TAGS.ANNEXURE_5,
    CACHE_TAGS.ANNEXURE_6,
    CACHE_TAGS.REPORTS,
  ]);

  safeRevalidatePath('/dashboard', 'page');
  safeRevalidatePath('/budget', 'page');
  safeRevalidatePath('/reports', 'page');
  safeRevalidatePath('/reports/monthly-expenditure', 'page');
  safeRevalidatePath('/reports/ncert-report', 'page');
  safeRevalidatePath('/settings', 'page');
  if (specificPath) {
    safeRevalidatePath(specificPath, 'page');
  }
  for (let i = 1; i <= 6; i++) {
    safeRevalidatePath(`/budget/annexure-${i}`, 'page');
  }
}

export function invalidateVideoAndProductionCaches() {
  expireTags([
    CACHE_TAGS.VIDEOS,
    CACHE_TAGS.PRODUCTION,
    CACHE_TAGS.REPORTS,
    CACHE_TAGS.SIDEBAR,
  ]);
  safeRevalidatePath('/content', 'page');
  safeRevalidatePath('/video-production', 'page');
  safeRevalidatePath('/production-workflow', 'page');
  safeRevalidatePath('/reports', 'page');
  safeRevalidatePath('/reports/ncert-report', 'page');
  safeRevalidatePath('/reports/monthly-expenditure', 'page');
}

export function invalidateSmeAndDocumentCaches(smeId?: string) {
  expireTags([
    CACHE_TAGS.SMES,
    CACHE_TAGS.DOCUMENTS,
    CACHE_TAGS.PRODUCTION,
    CACHE_TAGS.REPORTS,
    CACHE_TAGS.SIDEBAR,
  ]);
  safeRevalidatePath('/smes', 'page');
  if (smeId) {
    safeRevalidatePath(`/smes/${smeId}`, 'page');
  }
  safeRevalidatePath('/documents', 'page');
  safeRevalidatePath('/accounts', 'page');
  safeRevalidatePath('/dashboard', 'page');
  safeRevalidatePath('/reports', 'page');
  safeRevalidatePath('/video-production', 'page');
  safeRevalidatePath('/generator/deputation', 'page');
}

