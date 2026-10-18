const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/BusinessInventoryPage.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

// 1. Fix editingSiblings & isSeriesEligible
const sibIdx = lines.findIndex(l => l.includes('const editingSiblings = useMemo('));
console.log('editingSiblings at line:', sibIdx + 1);
if (sibIdx !== -1) {
  const endSibIdx = lines.findIndex((l, i) => i > sibIdx && l.includes('const [isRestockModalOpen,'));
  console.log('endSibIdx at line:', endSibIdx + 1);
  if (endSibIdx !== -1) {
    const newSibBlock = [
      `  const editingSiblings = useMemo(() => {`,
      `    if (!editingProduct) return [];`,
      `    const seriesMeta = decodeSeriesMetadata(editingProduct.description);`,
      `    if (!seriesMeta && editingProduct.unit !== "Serie") return [];`,
      `    if (seriesMeta?.seriesId) {`,
      `      return products.filter((p) => {`,
      `        const pMeta = decodeSeriesMetadata(p.description);`,
      `        return pMeta?.seriesId === seriesMeta.seriesId;`,
      `      });`,
      `    }`,
      `    if (editingProduct.unit === "Serie") {`,
      `      const cleanTarget = cleanModelName(editingProduct.name).toLowerCase();`,
      `      return products.filter(`,
      `        (p) =>`,
      `          p.unit === "Serie" &&`,
      `          cleanModelName(p.name).toLowerCase() === cleanTarget &&`,
      `          (p.brandId || "") === (editingProduct.brandId || "")`,
      `      );`,
      `    }`,
      `    return [];`,
      `  }, [editingProduct, products]);`,
      ``,
      `  const isSeriesEligible = useMemo(() => {`,
      `    if (!editingProduct) return false;`,
      `    const seriesMeta = decodeSeriesMetadata(editingProduct.description);`,
      `    return editingProduct.unit === "Serie" || Boolean(seriesMeta);`,
      `  }, [editingProduct]);`,
    ];
    lines.splice(sibIdx, endSibIdx - sibIdx, ...newSibBlock);
    console.log('Updated editingSiblings & isSeriesEligible');
  }
}

// 2. Fix handleEdit
const editFnIdx = lines.findIndex(l => l.includes('// Cargar configuración de serie si aplica'));
console.log('handleEdit series block at line:', editFnIdx + 1);
if (editFnIdx !== -1) {
  const isSeriesEndIdx = lines.findIndex((l, i) => i > editFnIdx && l.includes('const initialCost ='));
  if (isSeriesEndIdx !== -1) {
    const newEditBlock = [
      `      // Cargar configuración de serie si aplica únicamente a productos de tipo Serie`,
      `      const seriesMeta = decodeSeriesMetadata(product.description);`,
      `      const isSeries = product.unit === "Serie" || Boolean(seriesMeta);`,
      `      let siblings: Product[] = [];`,
      `      if (isSeries) {`,
      `        if (seriesMeta?.seriesId) {`,
      `          siblings = products.filter((p) => {`,
      `            const pMeta = decodeSeriesMetadata(p.description);`,
      `            return pMeta?.seriesId === seriesMeta.seriesId;`,
      `          });`,
      `        } else {`,
      `          const cleanTarget = cleanModelName(product.name).toLowerCase();`,
      `          siblings = products.filter(`,
      `            (p) =>`,
      `              p.unit === "Serie" &&`,
      `              cleanModelName(p.name).toLowerCase() === cleanTarget &&`,
      `              (p.brandId || "") === (product.brandId || "")`,
      `          );`,
      `        }`,
      `      }`,
      ``,
      `      let editConfig = defaultSeriesConfig;`,
      `      if (isSeries) {`,
      `        editConfig = buildEditSeriesConfig(product, siblings.length > 0 ? siblings : [product]);`,
      `        setStandaloneTaco(editConfig.taco || "");`,
      `        setSeriesConfig(editConfig);`,
      `        setEditScope("SERIES");`,
      `      } else {`,
      `        const currentTaco = extractTacoFromProduct(product) || "";`,
      `        setStandaloneTaco(currentTaco);`,
      `        setSeriesConfig(defaultSeriesConfig);`,
      `        setEditScope("SINGLE");`,
      `      }`,
    ];
    lines.splice(editFnIdx, isSeriesEndIdx - editFnIdx, ...newEditBlock);
    console.log('Updated handleEdit series block');
  }
}

// 3. Fix Promise.all -> sequential in handleSubmit
const promiseAllSibIdx = lines.findIndex(l => l.includes('await Promise.all(') && lines[lines.indexOf(l) + 1]?.includes('siblings.map'));
console.log('promiseAllSibIdx at line:', promiseAllSibIdx + 1);
if (promiseAllSibIdx !== -1) {
  // Find where this Promise.all ends
  let closeIdx = -1;
  for (let i = promiseAllSibIdx; i < promiseAllSibIdx + 70; i++) {
    if (lines[i].includes(');') && (lines[i+1]?.includes('// 2.') || lines[i+2]?.includes('// 2.'))) {
      closeIdx = i;
      break;
    }
  }
  console.log('closeIdx for siblings Promise.all at line:', closeIdx + 1);
  if (closeIdx !== -1) {
    // Replace `await Promise.all(siblings.map((sibling) => { ... }));`
    // with `for (const sibling of siblings) { ... await updateProductRequest(...) }`
    lines[promiseAllSibIdx] = `          for (const sibling of siblings) {`;
    lines[closeIdx] = `          }`;
    // Replace `return updateProductRequest` with `await updateProductRequest`
    for (let j = promiseAllSibIdx; j < closeIdx; j++) {
      if (lines[j].includes('return updateProductRequest(')) {
        lines[j] = lines[j].replace('return updateProductRequest(', 'await updateProductRequest(');
      }
    }
    console.log('Converted siblings Promise.all to sequential for..of loop');
  }
}

// 4. Fix createPromises in series registration
const createPromIdx = lines.findIndex(l => l.includes('const createPromises = seriesConfig.curve.map(async (item) => {'));
console.log('createPromIdx at line:', createPromIdx + 1);
if (createPromIdx !== -1) {
  lines[createPromIdx] = `          for (const item of seriesConfig.curve) {`;
  for (let j = createPromIdx; j < createPromIdx + 40; j++) {
    if (lines[j].includes('return createProductRequest({')) {
      lines[j] = lines[j].replace('return createProductRequest({', 'await createProductRequest({');
    }
  }
  const awaitPromIdx = lines.findIndex((l, i) => i > createPromIdx && i < createPromIdx + 45 && l.includes('await Promise.all(createPromises);'));
  if (awaitPromIdx !== -1) {
    lines[awaitPromIdx - 1] = `          }`;
    lines.splice(awaitPromIdx, 1);
    console.log('Converted create series Promise.all to sequential for..of loop');
  }
}

fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
console.log('Saved BusinessInventoryPage.tsx');
