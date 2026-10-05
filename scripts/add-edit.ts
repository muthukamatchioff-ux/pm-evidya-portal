import fs from 'fs';
import path from 'path';

// 1. Update actions.ts
const actionsPath = path.join(__dirname, '../src/app/budget/actions.ts');
let actionsCode = fs.readFileSync(actionsPath, 'utf-8');

const updateActions = `
export async function updateAnnexureIEntry(id: string, data: any) {
  const total = (Number(data.honorarium) || 0) + (Number(data.travelAllowance) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureI.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-1');
}
export async function updateAnnexureIIEntry(id: string, data: any) {
  const total = (Number(data.trainerFee) || 0) + (Number(data.trainingCost) || 0) + (Number(data.travelAllowance) || 0) + (Number(data.accommodation) || 0) + (Number(data.otherExpenses) || 0);
  await prisma.annexureII.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-2');
}
export async function updateAnnexureIIIEntry(id: string, data: any) {
  const total = (Number(data.remuneration) || 0) + (Number(data.taDa) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureIII.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-3');
}
export async function updateAnnexureIVEntry(id: string, data: any) {
  const total = (Number(data.infrastructureCost) || 0) + (Number(data.bandwidthCost) || 0) + (Number(data.archiveCost) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureIV.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-4');
}
export async function updateAnnexureVEntry(id: string, data: any) {
  const total = (Number(data.quantity) || 0) * (Number(data.unitCost) || 0) + (Number(data.installationCost) || 0) + (Number(data.transportation) || 0) + (Number(data.otherCharges) || 0);
  await prisma.annexureV.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-5');
}
export async function updateAnnexureVIEntry(id: string, data: any) {
  const total = (Number(data.amount) || 0) + (Number(data.tax) || 0);
  await prisma.annexureVI.update({ where: { id }, data: { ...data, totalExpenditure: total } });
  revalidatePath('/dashboard'); revalidatePath('/budget/annexure-6');
}
`;

if (!actionsCode.includes('updateAnnexureIEntry')) {
  actionsCode = actionsCode.replace('// Legacy exports', updateActions + '\n// Legacy exports');
  fs.writeFileSync(actionsPath, actionsCode);
}

// 2. Update ComponentXClient.tsx files
const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];

for (let i = 1; i <= 6; i++) {
  const clientPath = path.join(__dirname, `../src/app/budget/annexure-${i}/Component${i}Client.tsx`);
  let code = fs.readFileSync(clientPath, 'utf-8');

  // Add update import
  if (!code.includes(`updateAnnexure${romans[i-1]}Entry`)) {
    code = code.replace(
      `import { addAnnexure${romans[i-1]}Entry } from '../actions';`,
      `import { addAnnexure${romans[i-1]}Entry, updateAnnexure${romans[i-1]}Entry } from '../actions';`
    );
  }

  // Add editing state
  if (!code.includes('editingId')) {
    code = code.replace(
      'const [isAdding, setIsAdding] = useState(false);',
      'const [isAdding, setIsAdding] = useState(false);\n  const [editingId, setEditingId] = useState<string | null>(null);'
    );
  }

  // Update handleSubmit
  if (!code.includes('if (editingId)')) {
    code = code.replace(
      `await addAnnexure${romans[i-1]}Entry(dataToSubmit);`,
      `if (editingId) {\n      await updateAnnexure${romans[i-1]}Entry(editingId, dataToSubmit);\n    } else {\n      await addAnnexure${romans[i-1]}Entry(dataToSubmit);\n    }`
    );
    code = code.replace(
      'alert("Transaction Added Successfully");',
      'alert(editingId ? "Transaction Updated Successfully" : "Transaction Added Successfully");\n    setEditingId(null);'
    );
  }

  // Add edit click handler
  if (!code.includes('handleEdit(entry)')) {
    // Add actions header column
    code = code.replace('<th>Total</th>\n            </tr>', '<th>Total</th>\n              <th>Actions</th>\n            </tr>');
    
    // Add edit button to rows
    code = code.replace(
      `<td style={{fontWeight: 'bold'}}>₹ {entry.totalExpenditure.toLocaleString('en-IN')}</td>\n                </tr>`,
      `<td style={{fontWeight: 'bold'}}>₹ {entry.totalExpenditure.toLocaleString('en-IN')}</td>\n                  <td><button onClick={() => { setIsAdding(true); setEditingId(entry.id); setFormData(entry); }} style={{color: 'blue', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer'}}>Edit</button></td>\n                </tr>`
    );
  }
  
  // Also fix Component 1 table since it was generated earlier slightly differently
  if (i === 1 && !code.includes('<th>Actions</th>')) {
      code = code.replace('<th>Remarks</th>\n            </tr>', '<th>Remarks</th>\n              <th>Actions</th>\n            </tr>');
      code = code.replace(
        '<td>{entry.remarks || \'-\'}</td>\n                </tr>',
        '<td>{entry.remarks || \'-\'}</td>\n                  <td><button onClick={() => { setIsAdding(true); setEditingId(entry.id); setFormData({ ...entry, workingDays: entry.workingDays?.toString() || \'\', honorarium: entry.honorarium?.toString() || \'\', travelAllowance: entry.travelAllowance?.toString() || \'\', otherCharges: entry.otherCharges?.toString() || \'\' }); }} style={{color: \'blue\', textDecoration: \'underline\', border: \'none\', background: \'none\', cursor: \'pointer\'}}>Edit</button></td>\n                </tr>'
      );
      
      // Update handleSubmit for Component 1
      if (!code.includes('if (editingId)')) {
         code = code.replace(
          `await addAnnexureIEntry({`,
          `const dataToSubmit = {`
        );
        code = code.replace(
            `remarks: formData.remarks\n    });\n    setIsAdding(false);`,
            `remarks: formData.remarks\n    };\n    if (editingId) await updateAnnexureIEntry(editingId, dataToSubmit); else await addAnnexureIEntry(dataToSubmit);\n    setIsAdding(false); setEditingId(null);`
        );
      }
      if (!code.includes('updateAnnexureIEntry }')) {
          code = code.replace(
              `import { addAnnexureIEntry } from '../actions';`,
              `import { addAnnexureIEntry, updateAnnexureIEntry } from '../actions';`
          );
      }
  }

  // Update Add button text
  code = code.replace('{isAdding ? \'Cancel\' : \'+ Add New Entry\'}', '{isAdding ? \'Cancel\' : \'+ Add New Entry\'}'); // Keep it same
  code = code.replace('<button type="submit" className={styles.btnPrimary}>Save Entry</button>', '<button type="submit" className={styles.btnPrimary}>{editingId ? "Update Entry" : "Save Entry"}</button>');

  // Fix button text canceling issue
  code = code.replace('onClick={() => setIsAdding(!isAdding)}', 'onClick={() => { setIsAdding(!isAdding); if(isAdding) setEditingId(null); }}');

  fs.writeFileSync(clientPath, code);
}

console.log('Edit option injected successfully!');
