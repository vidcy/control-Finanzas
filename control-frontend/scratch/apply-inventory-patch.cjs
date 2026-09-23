const fs = require('fs');
const path = require('path');

const inventoryPath = path.join(__dirname, '..', 'src', 'pages', 'BusinessInventoryPage.tsx');
let invCode = fs.readFileSync(inventoryPath, 'utf8');

// 1. Check if delete button can be enhanced with series siblings
const oldDeleteBtn = `                                    <button
                                      onClick={() => {
                                        setProductIdToDelete(p.id);
                                        setIsDeleteConfirmOpen(true);
                                      }}
                                      className="px-2.5 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>`;

const newDeleteBtn = `                                    <button
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

if (invCode.includes(oldDeleteBtn)) {
  invCode = invCode.replace(oldDeleteBtn, newDeleteBtn);
  console.log("Replaced delete button in inventory card");
} else {
  console.log("oldDeleteBtn not found exactly, will check pattern");
}

// 2. Add Series Delete Modal before ConfirmModal
const confirmModalTarget = `<ConfirmModal
        isOpen={isDeleteConfirmOpen}`;

const seriesDeleteModal = `{/* MODAL: Confirmar Eliminación de Serie Completa o Talla Individual */}
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

if (invCode.includes(confirmModalTarget) && !invCode.includes("isSeriesDeleteModalOpen")) {
  invCode = invCode.replace(confirmModalTarget, seriesDeleteModal);
  console.log("Added series delete modal");
}

// 3. Fix @media print in BusinessInventoryPage.tsx
const oldPrintStyle = `@media print {
                body * {
                  visibility: hidden !important;
                }
                #print-area, #print-area * {
                  visibility: visible !important;
                }
                #print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                .no-print {
                  display: none !important;
                }
              }`;

const newPrintStyle = `@media print {
                body * {
                  visibility: hidden !important;
                }
                #print-area, #print-area * {
                  visibility: visible !important;
                }
                #print-area {
                  position: static !important;
                  width: 100% !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                .print-ticket-card {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                }
                .no-print {
                  display: none !important;
                }
              }`;

if (invCode.includes(oldPrintStyle)) {
  invCode = invCode.replace(oldPrintStyle, newPrintStyle);
  console.log("Updated @media print in inventory page");
}

fs.writeFileSync(inventoryPath, invCode, 'utf8');
console.log("BusinessInventoryPage patch finished");
