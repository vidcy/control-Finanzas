const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
  '/home/vidcy/Descargas/Kardex_2026-06-23.xlsx',
  '/home/vidcy/Descargas/Kardex_2026-06-21.xlsx',
  '/home/vidcy/Descargas/INVENTARIO_TI_JIAPENG.xlsx'
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  console.log(`\n=========================================`);
  console.log(`Inspecting file: ${path.basename(filePath)}`);
  console.log(`=========================================`);
  try {
    const workbook = XLSX.readFile(filePath);
    console.log('Sheet Names:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n--- Sheet: ${sheetName} ---`);
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      // Print first 10 rows
      rows.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i + 1}:`, row);
      });
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
});
