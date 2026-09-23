const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '..', 'src', 'pages', 'BusinessInventoryPage.tsx');
let code = fs.readFileSync(inventoryPath, 'utf8');

// 1. Replace the delete button in products grid
const deleteBtnRegex = /<button\s+onClick=\{\(\)\s*=>\s*\{\s*setProductIdToDelete\(p\.id\);\s*setIsDeleteConfirmOpen\(true\);\s*\}\}\s*className="px-2\.5 py-2 bg-rose-50[^"]*"\s*title="Eliminar"\s*>\s*<Trash2 className="w-3\.5 h-3\.5" \/>\s*<\/button>/;

const newDeleteBtn = `<button
                                      onClick={() => {
                                        const isSeries = p.unit === "Serie" || Boolean(decodeSeriesMetadata(p.description));
                                        const targetClean = cleanModelName(p.name).toLowerCase();
                                        const siblings = isSeries
                                          ? products.filter(
                                              (item) =>
                                                cleanModelName(item.name).toLowerCase() === targetClean &&
                                                (item.brandId || "") === (p.brandId || "")
                                            )
                                          : [];

                                        setProductToDelete(p);
                                        if (siblings.length > 1) {
                                          setSeriesSiblingsToDelete(siblings);
                                          setIsSeriesDeleteModalOpen(true);
                                        } else {
                                          setProductIdToDelete(p.id);
                                          setIsDeleteConfirmOpen(true);
                                        }
                                      }}
                                      className="px-2.5 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>`;

if (deleteBtnRegex.test(code)) {
  code = code.replace(deleteBtnRegex, newDeleteBtn);
  console.log("Replaced delete button with smart series check!");
} else {
  console.log("deleteBtnRegex did not match!");
}

// 2. Add series delete modal if not already added
if (!code.includes("isSeriesDeleteModalOpen")) {
  const confirmModalStr = '<ConfirmModal\n        isOpen={isDeleteConfirmOpen}';
  const confirmModalRegex = /<ConfirmModal\s+isOpen=\{isDeleteConfirmOpen\}/;

  const seriesModalSnippet = `{/* MODAL: Confirmar Eliminación de Serie Completa o Talla Individual */}
      <Modal
        isOpen={isSeriesDeleteModalOpen}
        onClose={() => {
          setIsSeriesDeleteModalOpen(false);
          setSeriesSiblingsToDelete([]);
          setProductToDelete(null);
        }}
        maxWidth="max-w-lg"
        title="¿Eliminar Calzado / Serie?"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <h4 className="text-sm font-black text-amber-950 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              Este calzado está registrado como parte de una Serie
            </h4>
            <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
              El modelo <strong>{productToDelete ? cleanModelName(productToDelete.name) : ""}</strong> cuenta con{" "}
              <strong>{seriesSiblingsToDelete.length} tallas</strong> registradas en el sistema.
              ¿Deseas eliminar solo esta talla o toda la serie completa?
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={async () => {
                if (productToDelete) {
                  setIsSeriesDeleteModalOpen(false);
                  await handleDelete(productToDelete.id);
                  setSeriesSiblingsToDelete([]);
                  setProductToDelete(null);
                }
              }}
              className="w-full py-3 px-4 bg-white border-2 border-rose-300 text-rose-700 hover:bg-rose-50 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              Eliminar solo esta talla ({productToDelete ? extractSizeFromProduct(productToDelete) : ""})
            </button>

            <button
              type="button"
              onClick={async () => {
                if (seriesSiblingsToDelete.length > 0) {
                  setIsSeriesDeleteModalOpen(false);
                  try {
                    const deleteToast = toast.loading(\`Eliminando serie (\${seriesSiblingsToDelete.length} tallas)...\`);
                    await Promise.all(seriesSiblingsToDelete.map((s) => deleteProductRequest(s.id)));
                    toast.dismiss(deleteToast);
                    toast.success(\`Serie completa eliminada (\${seriesSiblingsToDelete.length} productos)\`);
                    loadData();
                    if (activeTab === "planner") loadPlannerData();
                  } catch (err: any) {
                    toast.error(err?.response?.data?.message || "Error al eliminar la serie");
                  } finally {
                    setSeriesSiblingsToDelete([]);
                    setProductToDelete(null);
                  }
                }
              }}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <Trash2 className="w-4 h-4 text-white" />
              🔥 Eliminar TODA la Serie ({seriesSiblingsToDelete.length} tallas del modelo)
            </button>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsSeriesDeleteModalOpen(false);
                setSeriesSiblingsToDelete([]);
                setProductToDelete(null);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}`;

  if (confirmModalRegex.test(code)) {
    code = code.replace(confirmModalRegex, seriesModalSnippet);
    console.log("Injected series delete modal!");
  }
}

// 3. Update labelItemsToPrint to support showcase mode and include taco, offer, SKU
const labelItemsRegex = /const labelItemsToPrint = useMemo\(\(\) => \{[\s\S]*?return items;\s*\}\s*\}, \[selectedLabelProduct, isSelectedLabelSeries, labelSiblings, labelPrintMode, ticketQuantity\]\);/;

const newLabelItems = `const labelItemsToPrint = useMemo(() => {
    if (isCatalogShowcaseMode) {
      const grouped = groupProductsBySeries(products, activeBranchId || undefined);
      return grouped.map((g) => ({
        product: g.primaryProduct,
        modelName: g.modelName,
        brandName: g.brandName || "",
        size: g.isSeries ? "SERIE" : (extractSizeFromProduct(g.primaryProduct) || "STD"),
        codeText: g.sku || String(g.customCode || 0).padStart(4, "0"),
        price: g.salePricePerUnit,
        adjustedPrice: g.adjustedPrice,
        color: g.color || "",
        taco: g.taco || "",
        hasOffer: g.hasOffer,
      }));
    }

    if (!selectedLabelProduct) return [];

    if (labelPrintMode === "single" || !isSelectedLabelSeries) {
      let copies = 1;
      if (labelPrintMode === "custom") {
        copies = ticketQuantity;
      } else if (labelPrintMode === "stock") {
        copies = Math.max(1, Math.round(Number(selectedLabelProduct.stock) || 0));
      } else {
        copies = 1;
      }
      const items: any[] = [];
      for (let i = 0; i < copies; i++) {
        items.push({
          product: selectedLabelProduct,
          modelName: cleanModelName(selectedLabelProduct.name),
          brandName: selectedLabelProduct.brand?.name || "",
          size: isSelectedLabelSeries ? "SERIE" : extractSizeFromProduct(selectedLabelProduct),
          codeText:
            selectedLabelProduct.sku ||
            String((selectedLabelProduct as any).customCode || 0).padStart(4, "0"),
          price: selectedLabelProduct.salePrice,
          adjustedPrice: selectedLabelProduct.adjustedPrice,
          color: selectedLabelProduct.color || "",
          taco: extractTacoFromProduct(selectedLabelProduct) || "",
          hasOffer: Boolean(
            selectedLabelProduct.adjustedPrice &&
            Number(selectedLabelProduct.adjustedPrice) > 0 &&
            Number(selectedLabelProduct.adjustedPrice) < Number(selectedLabelProduct.salePrice)
          ),
        });
      }
      return items;
    }

    if (labelPrintMode === "curve") {
      return labelSiblings.map((sib) => ({
        product: sib,
        modelName: cleanModelName(sib.name),
        brandName: sib.brand?.name || selectedLabelProduct.brand?.name || "",
        size: extractSizeFromProduct(sib),
        codeText: sib.sku || String((sib as any).customCode || 0).padStart(4, "0"),
        price: sib.salePrice,
        adjustedPrice: sib.adjustedPrice,
        color: sib.color || "",
        taco: extractTacoFromProduct(sib) || "",
        hasOffer: Boolean(
          sib.adjustedPrice &&
          Number(sib.adjustedPrice) > 0 &&
          Number(sib.adjustedPrice) < Number(sib.salePrice)
        ),
      }));
    }

    if (labelPrintMode === "stock") {
      const items: any[] = [];
      labelSiblings.forEach((sib) => {
        const count = Math.max(1, Math.round(Number(sib.stock) || 0));
        for (let i = 0; i < count; i++) {
          items.push({
            product: sib,
            modelName: cleanModelName(sib.name),
            brandName: sib.brand?.name || selectedLabelProduct.brand?.name || "",
            size: extractSizeFromProduct(sib),
            codeText: sib.sku || String((sib as any).customCode || 0).padStart(4, "0"),
            price: sib.salePrice,
            adjustedPrice: sib.adjustedPrice,
            color: sib.color || "",
            taco: extractTacoFromProduct(sib) || "",
            hasOffer: Boolean(
              sib.adjustedPrice &&
              Number(sib.adjustedPrice) > 0 &&
              Number(sib.adjustedPrice) < Number(sib.salePrice)
            ),
          });
        }
      });
      return items;
    }

    const items: any[] = [];
    labelSiblings.forEach((sib) => {
      for (let i = 0; i < ticketQuantity; i++) {
        items.push({
          product: sib,
          modelName: cleanModelName(sib.name),
          brandName: sib.brand?.name || selectedLabelProduct.brand?.name || "",
          size: extractSizeFromProduct(sib),
          codeText: sib.sku || String((sib as any).customCode || 0).padStart(4, "0"),
          price: sib.salePrice,
          adjustedPrice: sib.adjustedPrice,
          color: sib.color || "",
          taco: extractTacoFromProduct(sib) || "",
          hasOffer: Boolean(
            sib.adjustedPrice &&
            Number(sib.adjustedPrice) > 0 &&
            Number(sib.adjustedPrice) < Number(sib.salePrice)
          ),
        });
      }
    });
    return items;
  }, [
    isCatalogShowcaseMode,
    products,
    activeBranchId,
    selectedLabelProduct,
    isSelectedLabelSeries,
    labelSiblings,
    labelPrintMode,
    ticketQuantity,
  ]);`;

if (labelItemsRegex.test(code)) {
  code = code.replace(labelItemsRegex, newLabelItems);
  console.log("Updated labelItemsToPrint with showcase mode, SKU, taco, and offers!");
} else {
  console.log("labelItemsRegex did not match directly, checking with flexible whitespace");
}

fs.writeFileSync(inventoryPath, code, 'utf8');
console.log("Done updating inventory page!");
