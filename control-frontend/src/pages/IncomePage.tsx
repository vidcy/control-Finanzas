import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import {
  Plus,
  Search,
  TrendingUp,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Tag,
  CreditCard,
  FileText,
  ChevronDown,
  Wallet,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { listCategoriesRequest } from "../services/category.api";
import ConfirmModal from "../components/ui/ConfirmModal";
import {
  createTransactionRequest,
  deleteTransactionRequest,
  getTransactionsRequest,
  updateTransactionRequest,
} from "../services/transaction.api";

type Income = {
  id: string;
  date: string;
  category: string;
  categoryId?: string;
  subCategory?: string;
  subCategoryId?: string;
  description: string;
  amount: number;
  currency: "PEN" | "USD";
  exchangeRate: number;
  paymentMethod: string;
};

export default function IncomePage() {
  const [items, setItems] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    currency: "PEN" as "PEN" | "USD",
    exchangeRate: "1",
    paymentMethod: "TRANSFER" as "CASH" | "TRANSFER" | "YAPE" | "PLIN" | "CARD",
    status: "PAID" as "PAID" | "PENDING",
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredCategories = (
    Array.isArray(categories) ? categories : []
  ).filter((c) => c.type === "INCOME" && !c.parentId);

  const filteredSubCategories = (
    Array.isArray(categories) ? categories : []
  ).filter((c) => c.parentId === selectedCategoryId);

  const categoryHasSubcategories = filteredSubCategories.length > 0;

  const filtered = (Array.isArray(items) ? items : []).filter(
    (inc) =>
      (inc.description?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (inc.category?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transactionsData, categoriesData] = await Promise.all([
        getTransactionsRequest(),
        listCategoriesRequest(),
      ]);
      setItems(
        transactionsData
          .filter((t: any) => t.type === "INCOME")
          .map((t: any) => ({
            id: t.id,
            description: t.description ?? "",
            amount: t.amount,
            date: t.date,
            category: t.category?.name ?? "Otros",
            categoryId: t.categoryId,
            subCategory: t.subCategory?.name ?? "",
            subCategoryId: t.subCategoryId,
            currency: t.currency || "PEN",
            exchangeRate: t.exchangeRate || 1,
            paymentMethod: t.paymentMethod || "TRANSFER",
          })),
      );
      setCategories(categoriesData);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      currency: "PEN",
      exchangeRate: "1",
      paymentMethod: "TRANSFER",
      status: "PAID",
    });
    setSelectedCategoryId("");
    setSelectedSubCategoryId("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Income) => {
    setEditingId(item.id);
    setFormData({
      date: item.date.split("T")[0],
      description: item.description,
      amount: item.amount.toString(),
      currency: item.currency,
      exchangeRate: item.exchangeRate.toString(),
      paymentMethod: (item.paymentMethod as any) || "TRANSFER",
      status: "PAID",
    });
    setSelectedCategoryId(item.categoryId || "");
    setSelectedSubCategoryId(item.subCategoryId || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return toast.error("Selecciona una categoría");
    if (categoryHasSubcategories && !selectedSubCategoryId)
      return toast.error("Selecciona una subcategoría");

    const payload = {
      ...formData,
      name: formData.description || "Ingreso",
      amount: Number(formData.amount),
      exchangeRate: Number(formData.exchangeRate),
      type: "INCOME",
      categoryId: selectedCategoryId,
      subCategoryId: selectedSubCategoryId || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateTransactionRequest(editingId, payload as any);
        toast.success("Actualizado correctamente");
      } else {
        await createTransactionRequest(payload as any);
        toast.success("Creado correctamente");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setIdToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    try {
      await deleteTransactionRequest(idToDelete);
      toast.success("Eliminado correctamente");
      setIsConfirmOpen(false);
      loadData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  };

  const getMethodBadge = (method: string) => {
    const labels: any = {
      CASH: "Efectivo",
      TRANSFER: "Transf.",
      YAPE: "Yape",
      PLIN: "Plin",
      CARD: "Tarjeta",
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <Appshell>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-gray-500 font-bold">Cargando ingresos...</p>
        </div>
      </Appshell>
    );
  }

  return (
    <Appshell>
      <div className="flex flex-col gap-8 animate-fade-in-up pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600"></div>
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl shadow-xl shadow-emerald-100">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                Gestión de Ingresos
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Registro de entradas de capital
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-emerald-500" />
              <input
                type="text"
                placeholder="Buscar ingreso..."
                className="pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm w-72 text-gray-700 font-bold placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-800 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-200 hover:-translate-y-1 transition-all active:scale-95 text-sm"
            >
              <Plus className="w-5 h-5" /> Nuevo Ingreso
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 text-[11px] font-black uppercase tracking-widest text-emerald-900">
                  <th className="p-6 pl-8">Ref.</th>
                  <th className="p-6">Clasificación</th>
                  <th className="p-6 text-center">Método</th>
                  <th className="p-6">Fecha</th>
                  <th className="p-6">Descripción</th>
                  <th className="p-6 text-right">Importe</th>
                  <th className="p-6 text-center">Divisa</th>
                  <th className="p-6 text-center">Cotización</th>
                  <th className="p-6 text-right bg-emerald-500/5 text-emerald-700">
                    Total (Soles)
                  </th>
                  <th className="p-6 text-center pr-8">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50">
                {filtered.map((inc, index) => {
                  const montoSoles =
                    inc.currency === "USD"
                      ? inc.amount * inc.exchangeRate
                      : inc.amount;
                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-emerald-50/30 transition-all group"
                    >
                      <td className="p-5 pl-8 text-xs font-black text-emerald-400">
                        #{index + 1}
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-tighter border border-emerald-200 shadow-sm w-fit">
                            {inc.category}
                          </span>
                          {inc.subCategory && (
                            <span className="text-[9px] text-emerald-600/60 font-black ml-1 uppercase tracking-widest">
                              {inc.subCategory}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <span className="px-3 py-1 rounded-lg bg-gray-50 text-gray-500 text-[9px] font-black uppercase border border-gray-100 tracking-tighter shadow-sm">
                          {getMethodBadge(inc.paymentMethod)}
                        </span>
                      </td>
                      <td className="p-5 text-sm font-bold text-gray-700">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm w-fit">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          {formatDate(inc.date)}
                        </div>
                      </td>
                      <td className="p-5 text-sm font-bold text-gray-600 italic">
                        "{inc.description}"
                      </td>
                      <td className="p-5 text-right text-sm font-black text-gray-800">
                        {inc.currency === "USD" ? "$" : "S/"}{" "}
                        {inc.amount.toLocaleString()}
                      </td>
                      <td className="p-5 text-center">
                        <span
                          className={`text-[10px] font-black px-2 py-1 rounded-lg ${inc.currency === "USD" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}
                        >
                          {inc.currency}
                        </span>
                      </td>
                      <td className="p-5 text-center text-xs font-black text-gray-400">
                        {inc.currency === "USD"
                          ? inc.exchangeRate.toFixed(3)
                          : "-"}
                      </td>
                      <td className="p-5 text-right text-lg font-black text-emerald-600 bg-emerald-50/20">
                        S/{" "}
                        {montoSoles.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-5 pr-8 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                          <button
                            onClick={() => handleOpenEdit(inc)}
                            className="p-2.5 bg-white border border-gray-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inc.id)}
                            className="p-2.5 bg-white border border-gray-100 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs"
                    >
                      Sin registros de ingresos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL REDISEÑADO - MÁS COMPACTO Y AMPLIO */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? "Actualizar Ingreso" : "Nuevo Ingreso Operativo"}
          maxWidth="max-w-4xl"
        >
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sección Clasificación */}
              <div className="bg-emerald-50/20 p-5 rounded-[2rem] border border-emerald-100/40 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">
                    Clasificación
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Categoría
                    </label>
                    <div className="relative">
                      <select
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-black text-gray-700 appearance-none shadow-sm"
                        value={selectedCategoryId}
                        onChange={(e) => {
                          setSelectedCategoryId(e.target.value);
                          setSelectedSubCategoryId("");
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {filteredCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-300 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {categoryHasSubcategories && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                      <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1">
                        Subcategoría
                      </label>
                      <div className="relative">
                        <select
                          required
                          className="w-full px-4 py-3 bg-white border border-emerald-100 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-black text-gray-700 appearance-none shadow-sm"
                          value={selectedSubCategoryId}
                          onChange={(e) =>
                            setSelectedSubCategoryId(e.target.value)
                          }
                        >
                          <option value="">Seleccionar...</option>
                          {filteredSubCategories.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-emerald-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sección Detalles */}
              <div className="bg-blue-50/20 p-5 rounded-[2rem] border border-blue-100/40 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
                    Detalles
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Fecha
                    </label>
                    <input
                      required
                      type="date"
                      className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Descripción
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ej. Venta de servicios..."
                      className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección Método y Moneda */}
            <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Método de Pago */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                      Método de Cobro
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[
                      { id: "CASH", label: "Efectivo" },
                      { id: "TRANSFER", label: "Transf." },
                      { id: "YAPE", label: "Yape" },
                      { id: "PLIN", label: "Plin" },
                      { id: "CARD", label: "Tarjeta" },
                    ].map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            paymentMethod: method.id as any,
                          })
                        }
                        className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-tighter border transition-all ${formData.paymentMethod === method.id ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 scale-105" : "bg-white text-gray-400 border-gray-100 hover:border-indigo-200"}`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Monetaria */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">
                      Información Monetaria
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Moneda
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg outline-none text-[11px] font-black text-gray-700 appearance-none shadow-sm"
                        value={formData.currency}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            currency: e.target.value as any,
                          })
                        }
                      >
                        <option value="PEN">PEN</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        T.C.
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        disabled={formData.currency === "PEN"}
                        className={`w-full px-3 py-2 border rounded-lg outline-none text-[11px] font-black shadow-sm ${formData.currency === "USD" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-100 text-gray-400"}`}
                        value={formData.exchangeRate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            exchangeRate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-emerald-600 uppercase tracking-widest ml-1">
                        Importe
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 bg-white border-2 border-emerald-100 rounded-lg outline-none text-[11px] font-black text-gray-800 shadow-sm"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-10 py-3.5 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span className="uppercase tracking-widest text-[10px]">
                  {saving
                    ? "Guardando..."
                    : editingId
                      ? "Actualizar"
                      : "Confirmar"}
                </span>
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Eliminar Ingreso"
          message="¿Estás seguro de que deseas eliminar este registro de ingreso permanentemente?"
        />
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `,
        }}
      />
    </Appshell>
  );
}
