const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\david\\Desktop\\dev\\control-Finanzas\\control-frontend\\src\\pages\\BusinessInventoryPage.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('labels') || line.includes('activeTab === "labels"') || line.includes('canvas')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
