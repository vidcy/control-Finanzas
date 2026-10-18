const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve('src/pages/BusinessInventoryPage.tsx'), 'utf8');
const lines = content.split(/\r?\n/);

const idx = lines.findIndex(l => l.includes('handleEdit =') || l.includes('handleEdit(') || l.includes('setEditingProduct('));
console.log('handleEdit at line:', idx + 1);
if (idx !== -1) {
  console.log(lines.slice(idx, idx + 80).join('\n'));
}
