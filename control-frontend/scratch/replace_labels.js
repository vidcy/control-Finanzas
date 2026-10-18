const fs = require("fs");
const path = require("path");

const filePath = path.resolve(__dirname, "../src/pages/BusinessInventoryPage.tsx");
let content = fs.readFileSync(filePath, "utf8");

const startMarker = '{activeTab === "labels" && (';
const startIdx = content.indexOf(startMarker);
console.log("Start index:", startIdx);

if (startIdx === -1) {
  console.error("Could not find start marker");
  process.exit(1);
}

// Find matching ending
const searchSub = content.slice(startIdx);
const endPattern = /\n\s*\)\}\s*\n\s*<\/motion\.div>/;
const match = searchSub.match(endPattern);

if (!match) {
  console.error("Could not find end pattern");
  process.exit(1);
}

const endIdx = startIdx + match.index;
console.log("Found end pattern at relative index:", match.index);

const replacement = `{activeTab === "labels" && (
              <ProfessionalBarcodeCenter
                products={products}
                brands={brands}
                families={families}
                initialBusinessName={user?.businessName || "TIENDA"}
                lastScannedCode={lastScannedCode}
                onProductSelect={(prod) => {
                  setTicketProductId(prod.id);
                }}
              />
            )}`;

const newContent = content.slice(0, startIdx) + replacement + content.slice(endIdx + match[0].indexOf("</motion.div>") - 1);
fs.writeFileSync(filePath, newContent, "utf8");
console.log("SUCCESSFULLY UPDATED BusinessInventoryPage.tsx");
