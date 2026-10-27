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

export function matchesCameramanName(
  camField: string | null | undefined, 
  userOrName?: { name?: string | null; email?: string | null } | string | null,
  emailStr?: string | null
): boolean {
  if (!camField || camField === '—' || camField === '-' || camField === 'null') return false;
  if (!userOrName) return false;

  let uName = '';
  let uEmail = '';
  if (typeof userOrName === 'string') {
    uName = userOrName.toLowerCase().trim();
    uEmail = (emailStr || '').toLowerCase().trim();
  } else {
    uName = (userOrName.name || '').toLowerCase().trim();
    uEmail = (userOrName.email || '').toLowerCase().trim();
  }
  
  const camLower = camField.toLowerCase().trim();

  if (uEmail && (camLower === uEmail || camLower.includes(uEmail))) return true;
  if (!uName) return false;

  const assignedPersons = camLower.split(/[,&]|\band\b/).map(p => p.trim()).filter(Boolean);

  if (uName === 'antony parasuraman') {
    return assignedPersons.some(p => p.includes('antony parasuraman'));
  }
  if (uName === 'parasuraman') {
    return assignedPersons.some(p => p.includes('parasuraman') && !p.includes('antony parasuraman'));
  }
  if (uName === 'antony alcander') {
    return assignedPersons.some(p => p.includes('antony alcander') || p === 'antony');
  }

  return assignedPersons.some(p => p === uName || p.includes(uName));
}

export function matchesEditorName(
  edField: string | null | undefined, 
  userOrName?: { name?: string | null; email?: string | null } | string | null,
  emailStr?: string | null
): boolean {
  if (!edField || edField === '—' || edField === '-' || edField === 'null') return false;
  if (!userOrName) return false;

  let uName = '';
  let uEmail = '';
  if (typeof userOrName === 'string') {
    uName = userOrName.toLowerCase().trim();
    uEmail = (emailStr || '').toLowerCase().trim();
  } else {
    uName = (userOrName.name || '').toLowerCase().trim();
    uEmail = (userOrName.email || '').toLowerCase().trim();
  }

  const edLower = edField.toLowerCase().trim();

  if (uEmail && (edLower === uEmail || edLower.includes(uEmail))) return true;
  if (!uName) return false;

  const assignedPersons = edLower.split(/[,]/).map(p => p.trim()).filter(Boolean);

  if (uName === 'hassan') {
    return assignedPersons.some(p => p === 'hassan');
  }
  if (uName === 'hassan & antony') {
    return edLower.includes('hassan & antony') || edLower.includes('hassan and antony');
  }
  if (uName === 'bala') {
    return assignedPersons.some(p => p.includes('bala'));
  }
  if (uName === 'ramaswamy') {
    return assignedPersons.some(p => p.includes('ramaswamy'));
  }
  if (uName === 'parandhaman') {
    return assignedPersons.some(p => p.includes('parandhaman'));
  }
  if (uName === 'suganthan') {
    return assignedPersons.some(p => p.includes('suganthan'));
  }
  if (uName === 'manikandan') {
    return assignedPersons.some(p => p.includes('manikandan'));
  }
  if (uName === 'manikandan, suganthan' || uName === 'suganthan, manikandan') {
    return edLower.includes('manikandan') || edLower.includes('suganthan');
  }

  return assignedPersons.some(p => p === uName || p.includes(uName));
}

