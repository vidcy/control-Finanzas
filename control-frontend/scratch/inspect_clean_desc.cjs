const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/utils/seriesUtils.ts');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes('function cleanDescriptionForDisplay'));
console.log('cleanDescriptionForDisplay at line:', idx + 1);
if (idx !== -1) {
  console.log(lines.slice(idx, idx + 45).join('\n'));
}

const nameIdx = lines.findIndex(l => l.includes('function cleanModelName'));
console.log('cleanModelName at line:', nameIdx + 1);
if (nameIdx !== -1) {
  console.log(lines.slice(nameIdx, nameIdx + 30).join('\n'));
}
