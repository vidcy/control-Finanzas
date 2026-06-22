import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import {
  getTransactionsRequest,
  createTransactionRequest,
} from "../services/transaction.api";
import { listCategoriesRequest } from "../services/category.api";
import {
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  Vault,
  FileText,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import { format } from "date-fns";
import BusinessAiAdvisor from "../components/dashboard/BusinessAiAdvisor";
import ImageUploader, { getReceiptAbsoluteUrl } from "../components/ui/ImageUploader";

export default function BusinessFinancePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  const [formData, setFormData] = useState({
    name: "",
    amount: 0,
    categoryId: "",
    subCategoryId: null,
    paymentMethod: "CASH",
    description: "",
    receiptUrl: null as string | File | null,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [txs, cats] = await Promise.all([
        getTransactionsRequest("BUSINESS"),
        listCategoriesRequest(),
      ]);
      setTransactions(txs);
      setCategories(cats);
    } catch (error) {
      toast.error("Error cargando finanzas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCapitalInjected = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalOpex = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + t.amount, 0);
  const liquidCash = totalCapitalInjected - totalOpex;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      toast.error("Selecciona una categoría");
      return;
    }

    try {
      let finalReceiptUrl = formData.receiptUrl;
      if (formData.receiptUrl instanceof File) {
        const uploadToast = toast.loading("Subiendo comprobante...");
        try {
          const { uploadReceiptFile } = await import("../components/ui/ImageUploader");
          finalReceiptUrl = await uploadReceiptFile(formData.receiptUrl);
          toast.dismiss(uploadToast);
        } catch {
          toast.dismiss(uploadToast);
          toast.error("Error al subir el comprobante");
          return;
        }
      }

      await createTransactionRequest({
        name:
          formData.name ||
          (type === "INCOME" ? "Inyección de Capital" : "Gasto Operativo"),
        type,
        amount: formData.amount,
        categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId || null,
        date: new Date().toISOString(),
        status: "PAID",
        currency: "PEN",
        paymentMethod: formData.paymentMethod,
        description: formData.description,
        workspace: "BUSINESS",
        receiptUrl: (finalReceiptUrl || undefined) as any,
      } as any);
      toast.success("Operación registrada con éxito");
      setIsModalOpen(false);
      setFormData({
        name: "",
        amount: 0,
        categoryId: "",
        subCategoryId: null,
        paymentMethod: "CASH",
        description: "",
        receiptUrl: null,
      });
      loadData();
    } catch (error) {
      toast.error("Error al registrar operación");
    }
  };

  const filteredCategories = categories.filter(
    (c) => c.type === type && !c.parentId,
  ); // Only top-level categories
  const selectedCategoryObj = categories.find(
    (c) => c.id === formData.categoryId,
  );
  const subcategories = selectedCategoryObj?.children || [];

  return (
    <Appshell>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-[2rem] p-8 text-gray-900 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500 opacity-20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/20">
                <Vault className="w-8 h-8 text-indigo-300" />
              </div>
              <h1 className="text-4xl font-black tracking-tight">
                Caja Fuerte & Tesorería
              </h1>
              <p className="text-gray-500 font-medium mt-2 max-w-lg">
                Registra inyecciones de capital, préstamos o gastos fijos
                operativos de tu negocio.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setType("INCOME");
                  setIsModalOpen(true);
                }}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <ArrowUpRight className="w-5 h-5" /> Nuevo Ingreso
              </button>
              <button
                onClick={() => {
                  setType("EXPENSE");
                  setIsModalOpen(true);
                }}
                className="px-5 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <ArrowDownRight className="w-5 h-5" /> Nuevo Gasto (OPEX)
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* KPI WIDGETS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                    Ingresos
                  </p>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    S/ {totalCapitalInjected.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
                  <TrendingDown className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                    Egresos Operativos
                  </p>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    S/ {totalOpex.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg shadow-indigo-500/20 flex items-center gap-5">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Landmark className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-1">
                    Liquidez Disponible
                  </p>
                  <p className="text-2xl font-black text-white">
                    S/ {liquidCash.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* HISTORY */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> Historial de
                  Tesorería
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50 text-gray-500 uppercase text-xs font-semibold">
                    <tr>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Concepto</th>
                      <th className="px-6 py-4">Categoría</th>
                      <th className="px-6 py-4">Método</th>
                      <th className="px-6 py-4 text-center">Comprobante</th>
                      <th className="px-6 py-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-gray-400"
                        >
                          No hay movimientos registrados en la tesorería del
                          negocio.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-gray-500 font-medium">
                            {format(new Date(t.date), "dd MMM, yyyy")}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">
                              {t.name ||
                                t.description ||
                                "Movimiento Financiero"}
                            </div>
                            <div className="text-xs text-gray-400 max-w-xs truncate">
                              {t.description}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
                              {t.category?.name || "Sin Categoría"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 text-xs font-bold">
                            {t.paymentMethod}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {t.receiptUrl ? (
                              <div className="relative group inline-block">
                                <a
                                  href={getReceiptAbsoluteUrl(t.receiptUrl) || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all shadow-sm active:scale-95"
                                  title="Ver/Descargar Comprobante"
                                  download
                                >
                                  <FileText className="w-4 h-4" />
                                </a>
                                <span className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-12 z-50 whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-medium text-white shadow-lg bg-slate-900">
                                  Descargar
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">
                                Sin archivo
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-black ${t.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {t.type === "INCOME" ? "+" : "-"} S/{" "}
                            {t.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* IA Advisor */}
        {!loading && (
          <BusinessAiAdvisor
            metrics={{
              revenue: totalCapitalInjected,
              inventory: 0,
              totalOpex: totalOpex,
              lowStockCount: 0,
            }}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          type === "INCOME"
            ? "Registrar Inyección de Capital"
            : "Registrar Gasto Operativo"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Título del Movimiento
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder={
                type === "INCOME"
                  ? "Ej. Préstamo Reactiva, Aporte Socio A"
                  : "Ej. Alquiler Local, Pago Luz, Sueldo Empleado"
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Monto (S/)
              </label>
              <input
                type="number"
                required
                min="0.1"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Método
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethod: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta</option>
                <option value="YAPE">Yape/Plin</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Categoría
            </label>
            <select
              required
              value={formData.categoryId}
              onChange={(e) =>
                setFormData({ ...formData, categoryId: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Selecciona una categoría...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {filteredCategories.length === 0 && (
              <p className="text-xs text-rose-500 mt-1">
                No tienes categorías de este tipo. Debes crear una primero en el
                módulo de Categorías.
              </p>
            )}
          </div>
          {subcategories.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Subcategoría
              </label>
              <select
                required
                value={formData.subCategoryId}
                onChange={(e) =>
                  setFormData({ ...formData, subCategoryId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Selecciona una subcategoría...</option>
                {subcategories.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Descripción (Opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              rows={3}
            ></textarea>
          </div>
          {/* Comprobante */}
          <div>
            <ImageUploader
              currentImageUrl={formData.receiptUrl}
              onUploadSuccess={(url) => setFormData({ ...formData, receiptUrl: url })}
              onClear={() => setFormData({ ...formData, receiptUrl: null })}
              label="Comprobante de Pago / Factura"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={filteredCategories.length === 0}
              className={`px-5 py-2.5 text-white font-medium rounded-xl transition-all ${type === "INCOME" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
            >
              Guardar Movimiento
            </button>
          </div>
        </form>
      </Modal>
    </Appshell>
  );
}
