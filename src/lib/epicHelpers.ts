/**
 * Pure synchronous helpers for Epic sequence parsing and formatting.
 * Safe to import in both client and server files.
 */

export function parseAssignedEpics(departmentStr: string | null | undefined): number[] {
  if (!departmentStr) return [];
  const match = departmentStr.match(/EPIC[S]?:\s*([0-9,\s]+)/i) || departmentStr.match(/\[([0-9,\s]+)\]/);
  const numsStr = match ? match[1] : (departmentStr.match(/^[0-9,\s]+$/) ? departmentStr : '');
  if (!numsStr) return [];
  return numsStr
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n));
}

export function formatAssignedEpics(epicSequences: number[]): string {
  const sorted = [...epicSequences].sort((a, b) => a - b);
  return `EPIC: ${sorted.join(', ')}`;
}
