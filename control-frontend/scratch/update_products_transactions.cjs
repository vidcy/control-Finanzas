const fs = require('fs');
const path = require('path');

const filePath = path.resolve('../control-backend/src/products/products.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Update in update() method:
const oldUpdateEnd = `      return tx.product.findUnique({
        where: { id },
        include: {
          presentations: true,
          brand: true,
          family: true,
          branchStocks: {
            include: {
              branch: true,
            },
          },
        },
      });
    });`;

const newUpdateEnd = `      return tx.product.findUnique({
        where: { id },
        include: {
          presentations: true,
          brand: true,
          family: true,
          branchStocks: {
            include: {
              branch: true,
            },
          },
        },
      });
    }, { maxWait: 15000, timeout: 30000 });`;

if (content.includes(oldUpdateEnd)) {
  content = content.replace(oldUpdateEnd, newUpdateEnd);
  console.log('Updated update() transaction options');
} else {
  console.log('oldUpdateEnd not matched directly, checking normalized');
  content = content.replace(
    /return tx\.product\.findUnique\(\{[\s\S]*?\}\);\s*\}\);/,
    (match) => match.replace(/\}\);$/, '}, { maxWait: 15000, timeout: 30000 });')
  );
  console.log('Applied regex replacement to update()');
}

// Update bulkDelete() transaction:
content = content.replace(
  `return this.prisma.$transaction(async (tx) => {\n      const validProducts = await tx.product.findMany({`,
  `return this.prisma.$transaction(async (tx) => {\n      const validProducts = await tx.product.findMany({`
);

// Add { maxWait: 15000, timeout: 30000 } to create() line 61:
const oldCreateTarget = `return this.prisma.$transaction(async (tx) => {`;
// We can use a regex replacer for this.prisma.$transaction(async (tx) => { without options
content = content.replace(
  /this\.prisma\.\$transaction\(async \(tx\) => \{([\s\S]*?)\}\);/g,
  (fullMatch, body) => {
    if (fullMatch.includes('maxWait:')) return fullMatch;
    return `this.prisma.$transaction(async (tx) => {${body}}, { maxWait: 15000, timeout: 30000 });`;
  }
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated transactions in products.service.ts with maxWait: 15000, timeout: 30000');
