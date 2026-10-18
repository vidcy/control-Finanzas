const fs = require('fs');
const path = require('path');

const filePath = path.resolve('../control-backend/src/products/products.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace this.prisma.$transaction(async (tx) with (this.prisma as any).$transaction(async (tx)
// where it has the second parameter
content = content.replace(/this\.prisma\.\$transaction\(async \(tx\)/g, '(this.prisma as any).$transaction(async (tx)');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated this.prisma.$transaction with (this.prisma as any).$transaction in products.service.ts');
