const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/BusinessInventoryPage.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

lines.forEach((l, idx) => {
  if (l.includes('Promise.all') && (lines[idx + 1]?.includes('sibling') || l.includes('sibling') || lines[idx - 1]?.includes('sibling'))) {
    console.log(`Line ${idx + 1}: ${l}`);
    for (let j = Math.max(0, idx - 5); j < Math.min(lines.length, idx + 20); j++) {
      console.log(`  ${j + 1}: ${lines[j]}`);
    }
  }
});
