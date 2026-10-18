const fs = require("fs");
const path = require("path");

const filePath = path.resolve(__dirname, "../src/pages/BusinessInventoryPage.tsx");
let lines = fs.readFileSync(filePath, "utf8").split("\n");

// 1. Add imports at the top
let importIdx = lines.findIndex(l => l.includes('import { shareProductOfferViaWhatsApp }'));
if (importIdx !== -1) {
  lines.splice(importIdx + 1, 0,
    'import { useHardwareScanner } from "../hooks/useHardwareScanner";',
    'import { playScannerSound } from "../utils/hardwareScanner";',
    'import ProfessionalBarcodeCenter from "../components/inventory/ProfessionalBarcodeCenter";'
  );
}

// 2. Locate the legacy keyboard scanner listener (around line 790-910)
let keydownIdx = lines.findIndex(l => l.includes('// Keyboard/USB Scanner listener'));
let keydownEndIdx = lines.findIndex((l, i) => i > keydownIdx && l.includes('}, [products, scannerEnabled, scannerSensitivity]);'));

if (keydownIdx !== -1 && keydownEndIdx !== -1) {
  const replacementListener = [
    '  const [lastScannedCode, setLastScannedCode] = useState("");',
    '',
    '  const handleBarcodeScanned = (code: string) => {',
    '    const cleanCode = code.trim().toLowerCase();',
    '    setScanTestResult(code);',
    '    setLastScannedCode(code);',
    '',
    '    const match = products.find((p) => {',
    '      const matchesSku = p.sku && p.sku.trim().toLowerCase() === cleanCode;',
    '      const matchesCodeRaw = p.customCode && String(p.customCode).trim() === cleanCode;',
    '      const matchesCodePadded =',
    '        p.customCode && String(p.customCode).trim().padStart(4, "0") === cleanCode;',
    '      const matchesId = p.id && p.id.toLowerCase() === cleanCode;',
    '      const matchesPres = p.presentations?.some((pres: any) =>',
    '        (pres.sku && pres.sku.trim().toLowerCase() === cleanCode) ||',
    '        (pres.code && String(pres.code).trim().toLowerCase() === cleanCode)',
    '      );',
    '      return matchesSku || matchesCodeRaw || matchesCodePadded || matchesId || matchesPres;',
    '    });',
    '',
    '    if (match) {',
    '      playScannerSound("success");',
    '      if (activeTab === "labels") {',
    '        setTicketProductId(match.id);',
    '        toast.success(`🏷️ Producto seleccionado en rotulado: ${match.name}`);',
    '      } else {',
    '        setSearchTerm(match.name);',
    '        handleOpenModal(match);',
    '        toast.success(`📦 Producto encontrado: ${match.name}`);',
    '      }',
    '    } else {',
    '      playScannerSound("error");',
    '      toast.error(`❌ Código escaneado: "${code}", pero no coincide con ningún producto.`);',
    '      setFormData((prev) => ({ ...prev, sku: code.trim() }));',
    '    }',
    '  };',
    '',
    '  // Hardware Barcode & QR Scanner Listener (Pistola USB / Bluetooth)',
    '  useHardwareScanner((code) => {',
    '    if (!scannerEnabled) return;',
    '    handleBarcodeScanned(code);',
    '  }, scannerEnabled);',
  ];
  lines.splice(keydownIdx, keydownEndIdx - keydownIdx + 1, ...replacementListener);
}

// 3. Remove duplicate handleBarcodeScanned if present later
let dupIdx = lines.findIndex((l, i) => i > 1000 && l.includes('const handleBarcodeScanned = (code: string) => {'));
if (dupIdx !== -1) {
  let dupEnd = lines.findIndex((l, i) => i > dupIdx && l.includes('const handleOpenModal ='));
  if (dupEnd !== -1) {
    lines.splice(dupIdx, dupEnd - dupIdx);
  }
}

// 4. Update the second activeTab === "labels" (around line 4800+)
let labelTabIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('activeTab === "labels"') && lines[i].includes('{activeTab === "labels" && (')) {
    labelTabIdx = i;
    break;
  }
}

if (labelTabIdx !== -1) {
  let labelTabEnd = lines.findIndex((l, i) => i > labelTabIdx && l.includes('</motion.div>'));
  // The line before </motion.div> is `)}`
  if (labelTabEnd !== -1) {
    const replacementTab = [
      '            {activeTab === "labels" && (',
      '              <ProfessionalBarcodeCenter',
      '                products={products}',
      '                brands={brands}',
      '                families={families}',
      '                initialBusinessName={user?.businessName || "TIENDA"}',
      '                lastScannedCode={lastScannedCode}',
      '                onProductSelect={(prod) => {',
      '                  setTicketProductId(prod.id);',
      '                }}',
      '              />',
      '            )}',
    ];
    lines.splice(labelTabIdx, labelTabEnd - labelTabIdx, ...replacementTab);
  }
}

fs.writeFileSync(filePath, lines.join("\n"), "utf8");
console.log("SUCCESSFULLY APPLIED EXACT EDITS TO BusinessInventoryPage.tsx");
