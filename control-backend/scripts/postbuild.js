const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const distSrcDir = path.join(distDir, 'src');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

if (!fs.existsSync(distSrcDir)) {
  fs.mkdirSync(distSrcDir, { recursive: true });
}

const proxyFile = path.join(distSrcDir, 'main.js');
fs.writeFileSync(proxyFile, "require('../main.js');\n", 'utf8');
console.log('✅ Created dist/src/main.js proxy -> dist/main.js');
