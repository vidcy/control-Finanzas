const fs = require('fs');
const path = require('path');

const pkg = fs.readFileSync(path.resolve('../control-backend/package.json'), 'utf8');
console.log(JSON.parse(pkg).dependencies['@prisma/client']);
console.log(JSON.parse(pkg).dependencies['prisma'] || JSON.parse(pkg).devDependencies['prisma']);
