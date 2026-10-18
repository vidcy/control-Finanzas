const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve('src/pages/BusinessInventoryPage.tsx'), 'utf8');
const lines = content.split(/\r?\n/);

const submitIdx = lines.findIndex(l => l.includes('const handleSubmit = async'));
console.log('handleSubmit at line:', submitIdx + 1);
if (submitIdx !== -1) {
  console.log(lines.slice(submitIdx, submitIdx + 130).join('\n'));
}
