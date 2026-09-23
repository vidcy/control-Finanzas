const fs = require('fs');
const path = require('path');
const inventoryPath = path.join(__dirname, '..', 'src', 'pages', 'BusinessInventoryPage.tsx');
let invCode = fs.readFileSync(inventoryPath, 'utf8');

const regex = /<button[\s\S]*?setProductIdToDelete\(p\.id\)[\s\S]*?<\/button>/g;
let match;
while ((match = regex.exec(invCode)) !== null) {
  console.log("MATCH:", match[0]);
}
