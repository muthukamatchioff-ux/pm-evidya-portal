const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schemaCode = fs.readFileSync(schemaPath, 'utf-8');

if (!schemaCode.includes('model VideoLibrary')) {
  schemaCode += `
model VideoLibrary {
  id        String   @id @default(cuid())
  smeName   String
  title     String
  videoLink String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;
  fs.writeFileSync(schemaPath, schemaCode);
  console.log("VideoLibrary model added to schema.");
} else {
  console.log("VideoLibrary already exists.");
}
