const fs = require('fs');
let content = fs.readFileSync('src/app/budget/annexure-3/Component3Client.tsx', 'utf8');

content = content.replace(
  /<label>Designation<\/label>\s*<input type="text" name="designation" value=\{formData\.designation\} onChange=\{handleChange\}\s*\/>/g,
  `<label>Role</label>
            <select name="designation" value={formData.designation} onChange={handleChange as any} required className={styles.inputField} style={{ padding: '8px', width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
              <option value="">Select Role</option>
              <option value="Editor">Editor</option>
              <option value="Social Media Person">Social Media Person</option>
              <option value="Coordinator">Coordinator</option>
              <option value="Camera Man">Camera Man</option>
              <option value="Other">Other</option>
            </select>`
);

content = content.replace(
  /<label>Work Period<\/label>\s*<input type="text" name="workPeriod" value=\{formData\.workPeriod\} onChange=\{handleChange\}\s*\/>/g,
  `<label>Duration (Months)</label>
            <input type="number" name="workPeriod" value={formData.workPeriod} onChange={handleChange} required />`
);

content = content.replace(/<label>Remuneration<\/label>/g, '<label>Monthly Salary (₹)</label>');
content = content.replace(/value=\{\(Number\(formData\.remuneration\) \|\| 0\) \+ \(Number\(formData\.taDa\) \|\| 0\) \+ \(Number\(formData\.otherCharges\) \|\| 0\)\}/g, 'value={(Number(formData.remuneration) || 0) * (Number(formData.workPeriod) || 1)}');
content = content.replace(/<th>Designation<\/th>/g, '<th>Role</th>');
content = content.replace(/<th>Work Period<\/th>/g, '<th>Duration (Months)</th>');
content = content.replace(/<th>Remuneration<\/th>/g, '<th>Monthly Salary</th>');

fs.writeFileSync('src/app/budget/annexure-3/Component3Client.tsx', content);
