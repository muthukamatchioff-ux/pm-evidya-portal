const fs = require('fs');
const path = require('path');

const titles = [
  "",
  "Digital Content Development & Production",
  "Capacity Building & Training",
  "Human Resource Support",
  "Technology & Infrastructure",
  "School Equipment & Installations",
  "Media & Campaign"
];

for (let i = 1; i <= 6; i++) {
  const clientPath = path.join(__dirname, '../src/app/budget/annexure-' + i + '/Component' + i + 'Client.tsx');
  let code = fs.readFileSync(clientPath, 'utf-8');

  // Add Import
  if (!code.includes('downloadTableAsDocx')) {
    code = code.replace("import styles from '../budget.module.css';", "import styles from '../budget.module.css';\nimport { downloadTableAsDocx } from '@/lib/tableToDocx';");
  }

  // Add table ID
  if (!code.includes('id="dataTable"')) {
    code = code.replace('<table className={styles.dataTable}>', '<table id="dataTable" className={styles.dataTable}>');
  }

  // Add visible button
  const buttonCode = `        <button className={styles.btnPrimary} style={{ backgroundColor: 'var(--blue-500)', marginRight: '12px' }} onClick={() => downloadTableAsDocx('dataTable', 'PM e-Vidya - ${titles[i]}', 'Annexure-${['I','II','III','IV','V','VI'][i-1]}', 'Annexure-${['I','II','III','IV','V','VI'][i-1]}_Report.docx')}>
          Download Docs Pattern
        </button>
        <button className={styles.btnPrimary}`;
        
  if (!code.includes('Download Docs Pattern')) {
    code = code.replace('<button className={styles.btnPrimary}', buttonCode);
  }

  fs.writeFileSync(clientPath, code);
}
console.log("Injected Docs Pattern button to all 6 components.");
