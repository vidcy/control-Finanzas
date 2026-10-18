const fs = require('fs');
const path = require('path');

const filePath = path.resolve('../control-backend/src/prisma/prisma.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace await (self as any).auditLog.create with fire-and-forget
content = content.replace(
  /await\s+\(self as any\)\.auditLog\.create\(\{([\s\S]*?)\}\);/g,
  `(self as any).auditLog.create({$1}).catch((err: any) => console.warn('AuditLog background error:', err?.message));`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated prisma.service.ts for non-blocking AuditLog writes');
