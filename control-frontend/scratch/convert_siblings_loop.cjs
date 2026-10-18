const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/BusinessInventoryPage.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

// Find line 1548
const idx = lines.findIndex(l => l.includes('// 1. Actualizar cada talla existente con su stock definido en la curva'));
console.log('Found block at line', idx + 1);

if (idx !== -1) {
  // Find where `// 2. Crear tallas nuevas` is
  const idx2 = lines.findIndex((l, i) => i > idx && l.includes('// 2. Crear tallas nuevas añadidas a la curva'));
  console.log('Found block 2 at line', idx2 + 1);

  // Find where block 2 ends (before `toast.success`)
  const idxEnd = lines.findIndex((l, i) => i > idx2 && l.includes('toast.success('));
  console.log('Found toast.success at line', idxEnd + 1);

  if (idx2 !== -1 && idxEnd !== -1) {
    const newCode = [
      `          // 1. Actualizar cada talla existente con su stock definido en la curva secuencialmente`,
      `          for (const sibling of siblings) {`,
      `            const sibSize = extractSizeFromProduct(sibling);`,
      `            const sibCurveItem = seriesConfig.curve.find((c) => String(c.size).trim() === String(sibSize).trim());`,
      ``,
      `            const finalSibStock = sibCurveItem && sibCurveItem.stock !== undefined`,
      `              ? Math.max(0, Number(sibCurveItem.stock))`,
      `              : (Number(sibling.stock) || 0);`,
      ``,
      `            const sizeSku = formData.sku ? \`\${formData.sku.trim()}-\${sibSize}\` : sibling.sku;`,
      ``,
      `            const existingCompletePres = sibling.presentations?.find(`,
      `              (pr: any) => pr.equivalence === totalUnits || pr.name?.toLowerCase().includes("serie")`,
      `            );`,
      `            const existingUnitPres = sibling.presentations?.find(`,
      `              (pr: any) => pr.equivalence === 1 || pr.name?.toLowerCase().includes("par") || pr.name?.toLowerCase().includes("talla")`,
      `            );`,
      ``,
      `            await updateProductRequest(sibling.id, {`,
      `              name: \`\${cleanName} - Talla \${sibSize}\`,`,
      `              sku: sizeSku || undefined,`,
      `              imageUrl: finalImageUrl || undefined,`,
      `              brandId: formData.brandId || undefined,`,
      `              familyId: formData.familyId || undefined,`,
      `              color: formData.color || undefined,`,
      `              costPrice: costUnit,`,
      `              salePrice: saleUnit,`,
      `              stock: finalSibStock,`,
      `              minStock: formData.minStock || 5,`,
      `              adjustedPrice: finalAdjustedPrice,`,
      `              unit: "Serie",`,
      `              description: finalDesc,`,
      `              presentations: [`,
      `                {`,
      `                  id: existingCompletePres?.id,`,
      `                  name: \`Serie Completa (\${totalUnits} pares)\`,`,
      `                  equivalence: totalUnits,`,
      `                  price: saleSeries,`,
      `                },`,
      `                {`,
      `                  id: existingUnitPres?.id,`,
      `                  name: \`Par (Talla \${sibSize})\`,`,
      `                  equivalence: 1,`,
      `                  price: saleUnit,`,
      `                },`,
      `              ],`,
      `            } as any);`,
      `          }`,
      ``,
      `          // 2. Crear tallas nuevas añadidas a la curva secuencialmente`,
      `          const existingSizes = new Set(siblings.map((s) => extractSizeFromProduct(s).trim()));`,
      `          const newCurveItems = seriesConfig.curve.filter((c) => !existingSizes.has(String(c.size).trim()));`,
      `          for (const item of newCurveItems) {`,
      `            const sizeStock = item.stock !== undefined`,
      `              ? Math.max(0, Number(item.stock))`,
      `              : ((seriesConfig.seriesStock > 0 ? seriesConfig.seriesStock : 1) * (item.ratio || 1));`,
      `            const sizeSku = formData.sku ? \`\${formData.sku.trim()}-\${item.size}\` : undefined;`,
      `            const presList: Presentation[] = [`,
      `              {`,
      `                name: \`Serie Completa (\${totalUnits} pares)\`,`,
      `                equivalence: totalUnits,`,
      `                price: saleSeries,`,
      `              },`,
      `              {`,
      `                name: \`Par (Talla \${item.size})\`,`,
      `                equivalence: 1,`,
      `                price: saleUnit,`,
      `              },`,
      `            ];`,
      `            await createProductRequest({`,
      `              name: \`\${cleanName} - Talla \${item.size}\`,`,
      `              description: finalDesc,`,
      `              sku: sizeSku,`,
      `              color: formData.color || undefined,`,
      `              costPrice: costUnit,`,
      `              salePrice: saleUnit,`,
      `              adjustedPrice: finalAdjustedPrice || undefined,`,
      `              stock: sizeStock,`,
      `              minStock: formData.minStock || 5,`,
      `              unit: "Serie",`,
      `              imageUrl: finalImageUrl || undefined,`,
      `              presentations: presList,`,
      `              brandId: formData.brandId || undefined,`,
      `              familyId: formData.familyId || undefined,`,
      `              commissionType: formData.commissionType,`,
      `              commissionValue: formData.commissionValue,`,
      `              priceWithAgent: formData.priceWithAgent,`,
      `            } as any);`,
      `          }`,
    ];

    lines.splice(idx, idxEnd - idx, ...newCode);
    fs.writeFileSync(filePath, lines.join('\r\n'), 'utf8');
    console.log('Successfully updated to sequential for..of loops');
  }
}
