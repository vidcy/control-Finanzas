import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import {
  getTransactionsRequest,
  createTransactionRequest,
  updateTransactionRequest,
  deleteTransactionRequest,
  markAsPendingRequest,
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
  Edit,
  Trash2,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { format } from "date-fns";
import BusinessAiAdvisor from "../components/dashboard/BusinessAiAdvisor";
import ImageUploader, { getReceiptAbsoluteUrl } from "../components/ui/ImageUploader";
import Pagination from "../components/ui/Pagination";
import DateRangePicker from "../components/ui/DateRangePicker";


export default function BusinessFinancePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  
  // Edit & Revert States
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  // Modal confirm delete & revert states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);
  const [txIdToConfirm, setTxIdToConfirm] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [filterCategory, setFilterCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(20);

  const [formData, setFormData] = useState({
    name: "",
    amount: 0,
    categoryId: "",
    subCategoryId: "",
    paymentMethod: "CASH",
    description: "",
    receiptUrl: null as string | File | null,
    currency: "PEN" as "PEN" | "USD",
    exchangeRate: 1,
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

  /**
   * totalIngresosTesorerias: Suma de ingresos registrados manualmente en Tesorería (workspace=BUSINESS, status=PAID)
   * NOTA: NO incluye ventas del POS. Solo registros manuales de capital, préstamos, inversiones, etc.
   */
  const totalIngresosTesorerias = transactions
    .filter((t) => t.type === "INCOME" && t.status === "PAID")
    .reduce((acc, t) => acc + (t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount), 0);

  /**
   * totalEgresosTesorerias: Suma de egresos registrados manualmente en Tesorería (workspace=BUSINESS, status=PAID)
   * NOTA: Incluye compras de mercadería confirmadas (pedidos de compra pagados) y gastos operativos manuales.
   */
  const totalEgresosTesorerias = transactions
    .filter((t) => t.type === "EXPENSE" && t.status === "PAID")
    .reduce((acc, t) => acc + (t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount), 0);

  /**
   * liquidezNeta: Balance neto de Tesorería = Ingresos manuales - Egresos manuales (solo registros de Tesorería)
   * DIFERENTE a la liquidez global del negocio (que incluye ventas POS + inversiones - gastos).
   * Este valor se usa para validar si hay fondos suficientes para compras.
   */
  const liquidezNeta = totalIngresosTesorerias - totalEgresosTesorerias;

  // Mantener nombres alias por compatibilidad
  const totalCapitalInjected = totalIngresosTesorerias;
  const totalOpex = totalEgresosTesorerias;
  const liquidCash = liquidezNeta;

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

      const txPayload = {
        name:
          formData.name ||
          (type === "INCOME" ? "Inyección de Capital" : "Gasto Operativo"),
        amount: formData.amount,
        categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId || null,
        paymentMethod: formData.paymentMethod,
        description: formData.description,
        receiptUrl: (finalReceiptUrl || null) as any,
        currency: formData.currency,
        exchangeRate: formData.currency === "USD" ? formData.exchangeRate : 1,
        date: editingTransaction ? new Date(editingTransaction.date) : new Date(),
      };

      if (editingTransaction) {
        await updateTransactionRequest(editingTransaction.id, txPayload);
        toast.success("Operación actualizada con éxito");
      } else {
        await createTransactionRequest({
          ...txPayload,
          type,
          status: "PAID",
          workspace: "BUSINESS",
          date: txPayload.date.toISOString(),
        } as any);
        toast.success("Operación registrada con éxito");
      }

      setIsModalOpen(false);
      setEditingTransaction(null);
      setFormData({
        name: "",
        amount: 0,
        categoryId: "",
        subCategoryId: "",
        paymentMethod: "CASH",
        description: "",
        receiptUrl: null,
        currency: "PEN",
        exchangeRate: 1,
      });
      loadData();
    } catch (error) {
      toast.error(editingTransaction ? "Error al actualizar operación" : "Error al registrar operación");
    }
  };

  const handleEditClick = (t: any) => {
    setEditingTransaction(t);
    setType(t.type);
    setFormData({
      name: t.name || "",
      amount: t.amount || 0,
      categoryId: t.categoryId || "",
      subCategoryId: t.subCategoryId || "",
      paymentMethod: t.paymentMethod || "CASH",
      description: t.description || "",
      receiptUrl: t.receiptUrl || null,
      currency: t.currency || "PEN",
      exchangeRate: t.exchangeRate || 1,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransactionRequest(id);
      toast.success("Operación eliminada con éxito");
      loadData();
    } catch (error) {
      toast.error("Error al eliminar la operación");
    }
  };

  const handleRevertToPending = async (id: string) => {
    try {
      await markAsPendingRequest(id, { status: "PENDING" });
      toast.success("Movimiento devuelto a cuentas pendientes");
      loadData();
    } catch (error) {
      toast.error("Error al devolver a cuentas pendientes");
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const concept = (t.name || t.description || "Movimiento Financiero").toLowerCase();
    const desc = (t.description || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || concept.includes(search) || desc.includes(search);

    const matchesType = filterType === "ALL" || t.type === filterType;

    const matchesCategory = !filterCategory || t.categoryId === filterCategory;

    const day = (t.date || "").slice(0, 10);
    const matchesDateFrom = !dateFrom || day >= dateFrom;
    const matchesDateTo = !dateTo || day <= dateTo;

    return matchesSearch && matchesType && matchesCategory && matchesDateFrom && matchesDateTo;
  });


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
                    Ingresos Tesorería
                  </p>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    S/ {totalCapitalInjected.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">(Capital, préstamos, inversiones manuales)</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5">
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
                  <TrendingDown className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                    Egresos Tesorería
                  </p>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    S/ {totalOpex.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">(Gastos operativos + compras confirmadas)</p>
                </div>
              </div>
              <div className={`p-6 rounded-3xl shadow-lg flex items-center gap-5 ${liquidCash >= 0 ? "bg-indigo-600 shadow-indigo-500/20" : "bg-rose-600 shadow-rose-500/20"}`}>
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Landmark className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${liquidCash >= 0 ? "text-indigo-200" : "text-rose-200"}`}>
                    Liquidez Neta Tesorería
                  </p>
                  <p className="text-2xl font-black text-white">
                    S/ {liquidCash.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-white/60 mt-0.5">(Ingresos − Egresos de este módulo)</p>
                </div>
              </div>
            </div>

            {/* NOTA EXPLICATIVA DE LIQUIDEZ */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="text-amber-500 mt-0.5 shrink-0">ⓘ</div>
              <div className="text-xs text-amber-800 font-medium">
                <span className="font-black">Nota sobre la Liquidez:</span> Los valores de este módulo (Tesorería) solo muestran movimientos registrados manualmente aquí (capital inyectado, préstamos, gastos operativos fijos y compras confirmadas). 
                <span className="font-black"> La liquidez global del negocio</span> también incluye las ventas del Punto de Venta y los ingresos/egresos de otras fuentes. El sistema valida automáticamente contra la liquidez global al confirmar compras.
              </div>
            </div>

            {/* HISTORY */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              {/* FILTER PANEL */}
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" /> Historial de
                    Tesorería
                  </h3>
                  <div className="text-xs font-semibold text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-xl shadow-sm">
                    Mostrando {filteredTransactions.length} de {transactions.length} registros
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Search */}
                  <div className="md:col-span-4 flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Buscar por concepto o descripción..."
                      className="w-full text-xs outline-none bg-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Type Filter Buttons */}
                  <div className="md:col-span-4 flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1">
                    {(["ALL", "INCOME", "EXPENSE"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFilterType(t)}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                          filterType === t
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {t === "ALL" ? "Todos" : t === "INCOME" ? "Ingresos" : "Egresos"}
                      </button>
                    ))}
                  </div>

                  {/* Category Filter */}
                  <div className="md:col-span-4">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="">Todas las categorías</option>
                      {categories
                        .filter((c) => !c.parentId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.type === "INCOME" ? "Ingreso" : "Egreso"})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/50">
                  <DateRangePicker
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    onDateFromChange={setDateFrom}
                    onDateToChange={setDateTo}
                    onClear={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                  />
                </div>
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
                      <th className="px-6 py-4 text-center">Moneda</th>
                      <th className="px-6 py-4 text-center">T.C.</th>
                      <th className="px-6 py-4 text-right">Monto Original</th>
                      <th className="px-6 py-4 text-right">Total (Soles)</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-6 py-10 text-center text-gray-400 font-medium"
                        >
                          {transactions.length === 0
                            ? "No hay movimientos registrados en la tesorería del negocio."
                            : "No hay movimientos que coincidan con los filtros aplicados."}
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.slice((txPage - 1) * txPageSize, txPage * txPageSize).map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-gray-50/50 transition-colors group"
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
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                              {t.currency || "PEN"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-xs text-gray-400 font-bold">
                            {t.currency === "USD" ? (t.exchangeRate || 1).toFixed(2) : "—"}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-600 text-xs">
                            {t.currency === "USD" ? "$" : "S/"} {t.amount.toFixed(2)}
                          </td>
                           <td
                            className={`px-6 py-4 text-right font-black ${t.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {t.type === "INCOME" ? "+" : "-"} S/{" "}
                            {(t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                              t.status === "CANCELLED"
                                ? "bg-rose-150 text-rose-600 border border-rose-200"
                                : t.status === "PENDING"
                                ? "bg-amber-100 text-amber-600 border border-amber-200"
                                : "bg-emerald-100 text-emerald-600 border border-emerald-200"
                            }`}>
                              {t.status === "CANCELLED"
                                ? "Anulado"
                                : t.status === "PENDING"
                                ? "Pendiente"
                                : "Finalizado"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              {t.status !== "CANCELLED" && (
                                <>
                                  <button
                                    onClick={() => handleEditClick(t)}
                                    className="p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                                    title="Editar movimiento"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setTxIdToConfirm(t.id);
                                      setIsRevertConfirmOpen(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all"
                                    title="Devolver a pendientes (por cobrar/pagar)"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  setTxIdToConfirm(t.id);
                                  setIsDeleteConfirmOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                                title="Eliminar permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredTransactions.length > 0 && (
                <Pagination
                  currentPage={txPage}
                  totalItems={filteredTransactions.length}
                  pageSize={txPageSize}
                  onPageChange={(p) => setTxPage(p)}
                  onPageSizeChange={(s) => { setTxPageSize(s); setTxPage(1); }}
                  className="px-4 pt-3"
                />
              )}
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
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
          setFormData({
            name: "",
            amount: 0,
            categoryId: "",
            subCategoryId: "",
            paymentMethod: "CASH",
            description: "",
            receiptUrl: null,
            currency: "PEN",
            exchangeRate: 1,
          });
        }}
        title={
          editingTransaction
            ? (type === "INCOME" ? "Editar Ingreso de Tesorería" : "Editar Gasto Operativo")
            : (type === "INCOME" ? "Registrar Inyección de Capital" : "Registrar Gasto Operativo")
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Moneda
              </label>
              <select
                value={formData.currency}
                onChange={(e) => {
                  const curr = e.target.value as "PEN" | "USD";
                  setFormData({
                    ...formData,
                    currency: curr,
                    exchangeRate: curr === "PEN" ? 1 : 3.75,
                  });
                }}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold text-gray-700 cursor-pointer"
              >
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                T.C.
              </label>
              <input
                type="number"
                step="0.001"
                disabled={formData.currency === "PEN"}
                value={formData.exchangeRate}
                onChange={(e) =>
                  setFormData({ ...formData, exchangeRate: Number(e.target.value) })
                }
                className={`w-full px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold ${
                  formData.currency === "USD"
                    ? "bg-blue-50 border-blue-200 text-blue-700 font-bold"
                    : "bg-gray-50 border-gray-100 text-gray-400"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Importe
              </label>
              <input
                type="number"
                required
                min="0.1"
                step="0.01"
                value={formData.amount || ""}
                onChange={(e) =>
                  setFormData({ ...formData, amount: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Método
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethod: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
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
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  Subcategoría (Opcional)
                </label>
                <select
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
              onClick={() => {
                setIsModalOpen(false);
                setEditingTransaction(null);
                setFormData({
                  name: "",
                  amount: 0,
                  categoryId: "",
                  subCategoryId: "",
                  paymentMethod: "CASH",
                  description: "",
                  receiptUrl: null,
                  currency: "PEN",
                  exchangeRate: 1,
                });
              }}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={filteredCategories.length === 0}
              className={`px-5 py-2.5 text-white font-medium rounded-xl transition-all ${type === "INCOME" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
            >
              {editingTransaction ? "Guardar Cambios" : "Guardar Movimiento"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setTxIdToConfirm(null);
        }}
        onConfirm={() => {
          if (txIdToConfirm) {
            handleDelete(txIdToConfirm);
          }
        }}
        title="¿Eliminar transacción?"
        message="¿Estás seguro de que deseas eliminar esta transacción permanentemente? Si es una venta o compra, el stock afectado se actualizará de forma correspondiente en el inventario."
        confirmText="Eliminar Transacción"
        cancelText="Cancelar"
        variant="danger"
      />

      <ConfirmModal
        isOpen={isRevertConfirmOpen}
        onClose={() => {
          setIsRevertConfirmOpen(false);
          setTxIdToConfirm(null);
        }}
        onConfirm={() => {
          if (txIdToConfirm) {
            handleRevertToPending(txIdToConfirm);
          }
        }}
        title="¿Devolver a pendientes?"
        message="¿Estás seguro de devolver este movimiento a cuentas pendientes? El estado del registro cambiará a pendiente."
        confirmText="Devolver a Pendientes"
        cancelText="Cancelar"
        variant="warning"
      />
    </Appshell>
  );
}

