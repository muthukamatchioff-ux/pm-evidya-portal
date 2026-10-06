const fs = require('fs');
let content = fs.readFileSync('src/app/budget/annexure-3/Component3Client.tsx', 'utf8');

content = content.replace(
  /\['quantity', 'remuneration', 'taDa', 'otherCharges'\]/,
  "['quantity', 'remuneration', 'taDa', 'otherCharges', 'workPeriod']"
);

fs.writeFileSync('src/app/budget/annexure-3/Component3Client.tsx', content);
