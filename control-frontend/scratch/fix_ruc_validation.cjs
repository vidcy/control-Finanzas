const fs = require('fs');
const path = require('path');

const filePath = path.resolve('../control-backend/src/users/users.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace /^d{11}$/ with /^[0-9]{11}$/
if (content.includes('!/^d{11}$/.test(rucStr)')) {
  content = content.replace('!/^d{11}$/.test(rucStr)', '!/^[0-9]{11}$/.test(rucStr)');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully replaced /^d{11}$/ with /^[0-9]{11}$/ in users.service.ts');
} else {
  console.log('Target string not found in users.service.ts');
}
