const fs = require('fs');
const path = require('path');

const filePath = path.resolve('../control-backend/src/products/products.service.ts');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log(lines.slice(420, 445).join('\n'));
