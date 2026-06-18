import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import {
  ShoppingBag,
  Search,
  Trash2,
  Edit2,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  Package,
  Eye,
} from "lucide-react";
import {
  getInventoryMovementsRequest,
  deleteInventoryMovementRequest,
} from "../services/product.api";
import type { InventoryMovement } from "../services/product.api";
import {
  getTransactionsRequest,
  deleteTransactionRequest,
  updateTransactionRequest,
} from "../services/transaction.api";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import { getReceiptAbsoluteUrl } from "../components/ui/ImageUploader";

export default function BusinessHistoryPage() {
  const [activeTab, setActiveTab] = useState<"sales" | "movements">("sales");

  // Sales
  const [salesTx, setSalesTx] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [searchSales, setSearchSales] = useState("");

  // Movements (Kardex)
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [searchMovements, setSearchMovements] = useState("");
  const [filterType, setFilterType] = useState<"" | "IN" | "OUT">("");

  // Edit sale modal
  const [editSale, setEditSale] = useState<any>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editDesc, setEditDesc] = useState("");
  const [editPayment, setEditPayment] = useState("CASH");

  // View sale modal
  const [viewSale, setViewSale] = useState<any>(null);

  const loadSales = async () => {
    setLoadingSales(true);
    try {
      const data = await getTransactionsRequest("BUSINESS");
      // Filter only POS sales (INCOME type from BUSINESS workspace)
      const posSales = data.filter((t: any) => t.workspace === "BUSINESS" && t.type === "INCOME");
      setSalesTx(posSales.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch {
      toast.error("Error al cargar historial de ventas");
    } finally {
      setLoadingSales(false);
    }
  };

  const loadMovements = async () => {
    setLoadingMovements(true);
    try {
      const data = await getInventoryMovementsRequest(filterType ? { type: filterType } : undefined);
      setMovements(data);
    } catch {
      toast.error("Error al cargar movimientos");
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => { loadSales(); }, []);
  useEffect(() => { loadMovements(); }, [filterType]);

  const handleDeleteSale = async (id: string) => {
    if (!window.confirm("¿Eliminar este registro de venta? El stock NO se revertirá automáticamente.")) return;
    try {
      await deleteTransactionRequest(id);
      toast.success("Registro eliminado");
      loadSales();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleSaveEdit = async () => {
    if (!editSale) return;
    try {
      await updateTransactionRequest(editSale.id, {
        categoryId: editSale.categoryId,
        subCategoryId: editSale.subCategoryId || "",
        amount: editAmount,
        date: new Date(editSale.date),
        paymentMethod: editPayment,
        description: editDesc,
        name: editSale.name,
        currency: editSale.currency,
      });
      toast.success("Venta actualizada");
      setEditSale(null);
      loadSales();
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleDeleteMovement = async (id: string) => {
    if (!window.confirm("¿Eliminar este movimiento de inventario? El stock NO se revertirá.")) return;
    try {
      await deleteInventoryMovementRequest(id);
      toast.success("Movimiento eliminado");
      loadMovements();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Error al eliminar movimiento");
    }
  };

  const filteredSales = salesTx.filter((t) =>
    (t.name || "").toLowerCase().includes(searchSales.toLowerCase()) ||
    (t.description || "").toLowerCase().includes(searchSales.toLowerCase())
  );

  const filteredMovements = movements.filter((m) =>
    (m.product?.name || "").toLowerCase().includes(searchMovements.toLowerCase()) ||
    (m.presentationName || "").toLowerCase().includes(searchMovements.toLowerCase())
  );

  const paymentLabel: Record<string, string> = {
    CASH: "Efectivo", YAPE: "Yape", PLIN: "Plin", CARD: "Tarjeta", TRANSFER: "Transferencia"
  };

  return (
    <Appshell>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-violet-200 opacity-20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl mb-4 border border-violet-100 shadow-sm">
              <ShoppingBag className="w-8 h-8 text-violet-600" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">Historial</h1>
            <p className="text-gray-500 font-medium mt-2">
              Revisa, edita y elimina registros de ventas y movimientos de inventario.
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm gap-1">
          <button
            onClick={() => setActiveTab("sales")}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "sales" ? "bg-violet-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
          >
            <ShoppingBag className="w-4 h-4" /> Ventas POS
          </button>
          <button
            onClick={() => setActiveTab("movements")}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === "movements" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
          >
            <ArrowUpDown className="w-4 h-4" /> Kardex / Movimientos
          </button>
        </div>

        {/* SALES TAB */}
        {activeTab === "sales" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 flex items-center bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Buscar por concepto o descripción..."
                  className="flex-1 py-3 outline-none text-sm"
                  value={searchSales}
                  onChange={(e) => setSearchSales(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {loadingSales ? (
                <div className="p-8 text-center text-gray-400">Cargando ventas...</div>
              ) : filteredSales.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No hay ventas registradas aún.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-5 py-4 text-left">Fecha</th>
                        <th className="px-5 py-4 text-left">Concepto</th>
                        <th className="px-5 py-4 text-left">Descripción</th>
                        <th className="px-5 py-4 text-center">Pago</th>
                        <th className="px-5 py-4 text-right">Total</th>
                        <th className="px-5 py-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                            {format(new Date(sale.date), "dd/MM/yyyy HH:mm")}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold text-gray-900">{sale.name || "Venta en Caja"}</span>
                          </td>
                          <td className="px-5 py-4 max-w-[240px]">
                            <span className="text-gray-500 text-xs truncate block">{sale.description}</span>
                            {sale.receiptUrl && (
                              <a
                                href={getReceiptAbsoluteUrl(sale.receiptUrl) || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-500 text-[10px] font-bold mt-0.5 block hover:underline"
                              >
                                📎 Ver comprobante
                              </a>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                              {paymentLabel[sale.paymentMethod] || sale.paymentMethod}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="font-black text-emerald-600">S/ {Number(sale.amount).toFixed(2)}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setViewSale(sale)}
                                className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                title="Ver detalles"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditSale(sale);
                                  setEditAmount(sale.amount);
                                  setEditDesc(sale.description || "");
                                  setEditPayment(sale.paymentMethod);
                                }}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSale(sale.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MOVEMENTS TAB */}
        {activeTab === "movements" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 flex items-center bg-white border border-gray-100 rounded-xl px-4 shadow-sm">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Buscar por producto..."
                  className="flex-1 py-3 outline-none text-sm"
                  value={searchMovements}
                  onChange={(e) => setSearchMovements(e.target.value)}
                />
              </div>
              <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
                {(["", "IN", "OUT"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterType === t ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
                  >
                    {t === "" ? "Todos" : t === "IN" ? "Entradas" : "Salidas"}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {loadingMovements ? (
                <div className="p-8 text-center text-gray-400">Cargando movimientos...</div>
              ) : filteredMovements.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No hay movimientos de inventario.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="px-5 py-4 text-left">Fecha</th>
                        <th className="px-5 py-4 text-left">Producto</th>
                        <th className="px-5 py-4 text-center">Tipo</th>
                        <th className="px-5 py-4 text-left">Presentación</th>
                        <th className="px-5 py-4 text-right">Qty (Base)</th>
                        <th className="px-5 py-4 text-center">Motivo</th>
                        <th className="px-5 py-4 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredMovements.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                            {format(new Date(m.createdAt), "dd/MM/yyyy HH:mm")}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {m.product?.imageUrl ? (
                                <img
                                  src={getReceiptAbsoluteUrl(m.product.imageUrl) || m.product.imageUrl}
                                  alt={m.product.name}
                                  className="w-8 h-8 rounded-lg object-cover border border-gray-100"
                                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                                />
                              ) : (
                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                                  <Package className="w-4 h-4 text-indigo-300" />
                                </div>
                              )}
                              <span className="font-semibold text-gray-900">{m.product?.name || "—"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {m.type === "IN" ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold">
                                <TrendingUp className="w-3 h-3" /> Entrada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                                <TrendingDown className="w-3 h-3" /> Salida
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {m.presentationQty && m.presentationName ? (
                              <span className="text-xs text-gray-600">
                                {m.presentationQty} × {m.presentationName}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className={`font-black text-sm ${m.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                              {m.type === "IN" ? "+" : "−"}{m.quantity} {m.product?.unit}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-medium">
                              {m.reason === "SALE" ? "Venta" : m.reason === "PURCHASE" ? "Compra" : m.reason || "—"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => handleDeleteMovement(m.id)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar movimiento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: View Sale */}
      <Modal isOpen={!!viewSale} onClose={() => setViewSale(null)} title="Detalle de Venta">
        {viewSale && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-xl">
                <div className="text-xs text-gray-400 font-semibold mb-1">Fecha</div>
                <div className="font-bold text-gray-800">{format(new Date(viewSale.date), "dd/MM/yyyy HH:mm")}</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl">
                <div className="text-xs text-gray-400 font-semibold mb-1">Total</div>
                <div className="font-black text-emerald-600 text-lg">S/ {Number(viewSale.amount).toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <div className="text-xs text-gray-400 font-semibold mb-1">Método de Pago</div>
                <div className="font-bold text-gray-800">{paymentLabel[viewSale.paymentMethod] || viewSale.paymentMethod}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <div className="text-xs text-gray-400 font-semibold mb-1">Estado</div>
                <div className="font-bold text-emerald-600">{viewSale.status}</div>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
              <div className="text-xs text-gray-400 font-semibold mb-1">Descripción / Items</div>
              <div className="text-gray-700 text-xs leading-relaxed">{viewSale.description || "—"}</div>
            </div>
            {viewSale.receiptUrl && (
              <div className="bg-gray-50 p-3 rounded-xl">
                <div className="text-xs text-gray-400 font-semibold mb-2">Comprobante adjunto</div>
                <img
                  src={getReceiptAbsoluteUrl(viewSale.receiptUrl) || viewSale.receiptUrl}
                  alt="Comprobante"
                  className="w-full max-h-64 object-contain rounded-lg"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL: Edit Sale */}
      <Modal isOpen={!!editSale} onClose={() => setEditSale(null)} title="Editar Registro de Venta">
        {editSale && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-700 font-medium">
              ⚠ Solo se edita el registro financiero. El stock <b>no</b> se modifica automáticamente.
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Monto Total (S/)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Método de Pago</label>
              <select
                value={editPayment}
                onChange={(e) => setEditPayment(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="CASH">Efectivo</option>
                <option value="YAPE">Yape</option>
                <option value="PLIN">Plin</option>
                <option value="CARD">Tarjeta</option>
                <option value="TRANSFER">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción / Nota</label>
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditSale(null)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-sm"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Appshell>
  );
}
