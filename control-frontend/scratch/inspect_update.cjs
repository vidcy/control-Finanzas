const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve('../control-backend/src/products/products.service.ts'), 'utf8');
const lines = content.split('\n');

console.log(lines.slice(285, 360).join('\n'));
