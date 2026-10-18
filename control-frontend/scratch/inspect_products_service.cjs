const fs = require('fs');
const path = require('path');

const filePath = path.resolve('../control-backend/src/products/products.service.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

function printAround(lineNum, count = 25) {
  const start = Math.max(0, lineNum - 5);
  console.log(`\n=== Around line ${lineNum} ===`);
  console.log(lines.slice(start, start + count).join('\n'));
}

[259, 444, 490, 574, 705].forEach(l => printAround(l));
