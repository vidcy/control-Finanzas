import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import {
  listPendingTransactionsRequest,
  createPendingTransactionRequest,
  markAsPaidRequest,
  deletePendingTransactionRequest,
  updatePendingTransactionRequest
} from "../services/pending.api";
import { listCategoriesRequest } from "../services/category.api";
import { Clock, CheckCircle2, TrendingUp, TrendingDown, Trash2, AlertCircle, Edit } from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";

export default function BusinessPendingPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [editingPending, setEditingPending] = useState<any>(null);

  // Modal confirm delete states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [pendingIdToDelete, setPendingIdToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    amount: 0,
    categoryId: "",
    description: "",
    dueDate: "",
    paymentMethod: "CASH",
    currency: "PEN" as "PEN" | "USD",
    exchangeRate: 1,
  });


  const loadData = async () => {
    try {
      setLoading(true);
      const [pendTxs, cats] = await Promise.all([
        listPendingTransactionsRequest("BUSINESS"),
        listCategoriesRequest()
      ]);
      setPending(pendTxs);
      setCategories(cats);
    } catch (error) {
      toast.error("Error cargando cuentas pendientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toCollect = pending
    .filter((t) => t.type === "INCOME" && t.status === "PENDING")
    .reduce((acc, t) => acc + (t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount), 0);
  const toPay = pending
    .filter((t) => t.type === "EXPENSE" && t.status === "PENDING")
    .reduce((acc, t) => acc + (t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      toast.error("Selecciona una categoría");
      return;
    }
    
    try {
      const payload = {
        name: formData.name,
        amount: formData.amount,
        categoryId: formData.categoryId,
        description: formData.description,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        currency: formData.currency,
        exchangeRate: formData.currency === "USD" ? formData.exchangeRate : 1,
      };

      if (editingPending) {
        await updatePendingTransactionRequest(editingPending.id, payload as any);
        toast.success("Cuenta pendiente actualizada");
      } else {
        await createPendingTransactionRequest({
          ...payload,
          type,
          subCategoryId: null,
          date: new Date().toISOString(),
          status: "PENDING",
          workspace: "BUSINESS"
        });
        toast.success("Cuenta pendiente registrada");
      }

      setIsModalOpen(false);
      setEditingPending(null);
      setFormData({
        name: "",
        amount: 0,
        categoryId: "",
        description: "",
        dueDate: "",
        paymentMethod: "CASH",
        currency: "PEN",
        exchangeRate: 1,
      });
      loadData();
    } catch (error) {
      toast.error(editingPending ? "Error al actualizar cuenta pendiente" : "Error al registrar cuenta pendiente");
    }
  };

  const handleEditClick = (p: any) => {
    setEditingPending(p);
    setType(p.type);
    setFormData({
      name: p.name || "",
      amount: p.amount || 0,
      categoryId: p.categoryId || "",
      description: p.description || "",
      dueDate: p.dueDate ? p.dueDate.slice(0, 10) : "",
      paymentMethod: p.paymentMethod || "CASH",
      currency: p.currency || "PEN",
      exchangeRate: p.exchangeRate || 1,
    });
    setIsModalOpen(true);
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await markAsPaidRequest(id, { status: "PAID" });
      toast.success("Cuenta marcada como pagada");
      loadData();
    } catch (error) {
      toast.error("Error al liquidar cuenta");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePendingTransactionRequest(id);
      toast.success("Registro eliminado");
      loadData();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);
  const activePending = pending.filter(p => p.status === "PENDING");

  return (
    <Appshell>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-[2rem] p-8 text-gray-900 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-cyan-500 opacity-20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-2xl mb-4 border border-indigo-100">
                <Clock className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-4xl font-black tracking-tight">Cuentas Pendientes</h1>
              <p className="text-gray-500 font-medium mt-2 max-w-lg">
                Mantén el control de tus proveedores y clientes. Registra las deudas pendientes para evitar desbalances de caja.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => { setType("INCOME"); setIsModalOpen(true); }} className="px-5 py-3 bg-cyan-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200">
                <TrendingUp className="w-5 h-5" /> Nueva Cuenta por Cobrar
              </button>
              <button onClick={() => { setType("EXPENSE"); setIsModalOpen(true); }} className="px-5 py-3 bg-rose-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-rose-700 transition-all shadow-lg shadow-rose-200">
                <TrendingDown className="w-5 h-5" /> Nueva Cuenta por Pagar
              </button>
            </div>
          </div>
        </div>

        {/* KPI WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-100 rounded-full blur-3xl -z-0 transform translate-x-1/2 -translate-y-1/2 group-hover:bg-cyan-200 transition-colors"></div>
            <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center z-10">
              <TrendingUp className="w-7 h-7 text-cyan-600" />
            </div>
            <div className="z-10">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Por Cobrar (A tu favor)</p>
              <p className="text-3xl font-black text-gray-900">S/ {toCollect.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-rose-100 rounded-full blur-3xl -z-0 transform translate-x-1/2 -translate-y-1/2 group-hover:bg-rose-200 transition-colors"></div>
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center z-10">
              <TrendingDown className="w-7 h-7 text-rose-600" />
            </div>
            <div className="z-10">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Por Pagar (Deudas)</p>
              <p className="text-3xl font-black text-gray-900">S/ {toPay.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* LISTA */}
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 text-gray-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Deudor / Acreedor</th>
                    <th className="px-6 py-4">Concepto</th>
                    <th className="px-6 py-4 text-center">Vencimiento</th>
                    <th className="px-6 py-4 text-center">Moneda</th>
                    <th className="px-6 py-4 text-center">T.C.</th>
                    <th className="px-6 py-4 text-right">Monto Original</th>
                    <th className="px-6 py-4 text-right">Total (Soles)</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activePending.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-400 font-medium">No hay cuentas pendientes registradas. ¡Todo al día!</td>
                    </tr>
                  ) : (
                    activePending.map(p => {
                      const isVencido = p.dueDate && isPast(new Date(p.dueDate)) && !isToday(new Date(p.dueDate));
                      const isIngreso = p.type === "INCOME";

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{p.name || 'Desconocido'}</div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isIngreso ? 'bg-cyan-50 text-cyan-600' : 'bg-rose-50 text-rose-600'}`}>
                              {isIngreso ? 'CLIENTE (Te debe)' : 'PROVEEDOR (Le debes)'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-700">{p.category?.name || 'Varios'}</div>
                            <div className="text-xs text-gray-400 max-w-xs truncate">{p.description}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {p.dueDate ? (
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${isVencido ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                {isVencido && <AlertCircle className="w-3 h-3" />}
                                {format(new Date(p.dueDate), "dd MMM yyyy", { locale: es })}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                              {p.currency || "PEN"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-xs text-gray-400 font-bold">
                            {p.currency === "USD" ? (p.exchangeRate || 1).toFixed(3) : "—"}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-600 text-xs">
                            {p.currency === "USD" ? "$" : "S/"} {p.amount.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 text-right font-black text-lg ${isIngreso ? "text-cyan-600" : "text-rose-600"}`}>
                            {isIngreso ? "+" : "-"} S/{" "}
                            {(p.currency === "USD" ? p.amount * (p.exchangeRate || 1) : p.amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center items-center gap-1.5">
                              <button onClick={() => handleMarkAsPaid(p.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Marcar como Pagado / Cobrado">
                                <CheckCircle2 className="w-4.5 h-4.5" />
                              </button>
                              <button onClick={() => handleEditClick(p)} className="p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all" title="Editar cuenta pendiente">
                                <Edit className="w-4.5 h-4.5" />
                              </button>
                              <button onClick={() => { setPendingIdToDelete(p.id); setIsDeleteConfirmOpen(true); }} className="p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all" title="Eliminar cuenta pendiente">
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => {
        setIsModalOpen(false);
        setEditingPending(null);
        setFormData({
          name: "",
          amount: 0,
          categoryId: "",
          description: "",
          dueDate: "",
          paymentMethod: "CASH",
          currency: "PEN",
          exchangeRate: 1,
        });
      }} title={
        editingPending
          ? (type === "INCOME" ? "Editar Cuenta por Cobrar" : "Editar Cuenta por Pagar")
          : (type === "INCOME" ? "Registrar Cuenta por Cobrar" : "Registrar Cuenta por Pagar")
      }>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del {type === "INCOME" ? "Cliente" : "Proveedor"}</label>
            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Ej. Juan Pérez, Coca Cola..." />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Moneda</label>
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
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold text-gray-700 cursor-pointer"
              >
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">T.C.</label>
              <input
                type="number"
                step="0.001"
                disabled={formData.currency === "PEN"}
                value={formData.exchangeRate}
                onChange={(e) => setFormData({ ...formData, exchangeRate: Number(e.target.value) })}
                className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold ${
                  formData.currency === "USD"
                    ? "bg-blue-50 border-blue-200 text-blue-700 font-bold"
                    : "bg-gray-50 border-gray-100 text-gray-400"
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Importe</label>
              <input
                type="number"
                required
                min="0.1"
                step="0.01"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Límite</label>
              <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría</label>
              <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white">
                <option value="">Seleccionar...</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción / Notas</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" rows={2}></textarea>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => {
              setIsModalOpen(false);
              setEditingPending(null);
              setFormData({
                name: "",
                amount: 0,
                categoryId: "",
                description: "",
                dueDate: "",
                paymentMethod: "CASH",
                currency: "PEN",
                exchangeRate: 1,
              });
            }} className="px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" disabled={filteredCategories.length === 0} className={`px-5 py-3 text-white font-bold rounded-xl transition-all shadow-sm ${type === "INCOME" ? "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/30" : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/30"}`}>
              {editingPending ? "Guardar Cambios" : "Guardar Registro"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPendingIdToDelete(null);
        }}
        onConfirm={() => {
          if (pendingIdToDelete) {
            handleDelete(pendingIdToDelete);
          }
        }}
        title="¿Eliminar cuenta pendiente?"
        message="¿Estás seguro de que deseas eliminar este registro de cuenta pendiente? Esta acción no se puede deshacer."
        confirmText="Eliminar Cuenta"
        cancelText="Cancelar"
        variant="danger"
      />
    </Appshell>
  );
}
