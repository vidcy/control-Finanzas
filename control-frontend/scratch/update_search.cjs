const fs = require("fs");
let file = fs.readFileSync("src/pages/BusinessInventoryPage.tsx", "utf8");
const target = 'placeholder="Buscar por nombre, SKU, marca o familia..."';
if (file.includes(target)) {
  const replacement = 'placeholder="Buscar por nombre, SKU o escanear con pistola..."\n                      onKeyDown={(e) => { if (e.key === "Enter" && searchTerm.trim()) { e.preventDefault(); handleBarcodeScanned(searchTerm.trim()); } }}';
  file = file.replace(target, replacement);
  fs.writeFileSync("src/pages/BusinessInventoryPage.tsx", file, "utf8");
  console.log("SUCCESSFULLY UPDATED SEARCH INPUT IN INVENTORY");
} else {
  console.log("Target not found");
}
