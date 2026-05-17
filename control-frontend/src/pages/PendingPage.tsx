import { useEffect, useState, useMemo } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import {
  ArrowRightLeft,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Search,
  Clock,
  Loader2,
  CheckCircle2,
  User,
  Info,
  DollarSign,
  Calendar,
  RefreshCw,
  Activity,
  Edit2,
  ArrowUpLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  listPendingTransactionsRequest,
  createPendingTransactionRequest,
  deletePendingTransactionRequest,
  updatePendingTransactionRequest,
} from "../services/pending.api";
import { listCategoriesRequest } from "../services/category.api";
import ConfirmModal from "../components/ui/ConfirmModal";
type Category = {
  id: string;
  name: string;
  parentId?: string;
  type?: "INCOME" | "EXPENSE";
};

type PendingItem = {
  id: string;
  date: string;
  category: string;
  categoryId?: string;
  subCategory?: string;
  subCategoryId?: string;
  name?: string;
  description: string;
  amount: number;
  currency: "PEN" | "USD";
  exchangeRate: number;
  type: "INCOME" | "EXPENSE";
  status: "PENDING" | "PAID";
};

export default function PendingPage() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"INCOME" | "EXPENSE">("INCOME");

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] =
    useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    person: "",
    description: "",
    amount: "",
    currency: "PEN" as "PEN" | "USD",
    exchangeRate: "1",
  });

  const receivables = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter(
            (i) =>
              i.type === "INCOME" &&
              ((i.description?.toLowerCase() || "").includes(
                searchTerm.toLowerCase(),
              ) ||
                (i.amount?.toString() || "").includes(searchTerm)),
          )
        : [],
    [items, searchTerm],
  );

  const receivablesTotal = useMemo(
    () => receivables.reduce((acc, item) => acc + item.amount, 0),
    [receivables],
  );

  const payables = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter(
            (i) =>
              i.type === "EXPENSE" &&
              ((i.description?.toLowerCase() || "").includes(
                searchTerm.toLowerCase(),
              ) ||
                (i.amount?.toString() || "").includes(searchTerm)),
          )
        : [],
    [items, searchTerm],
  );

  const payablesTotal = useMemo(
    () => payables.reduce((acc, item) => acc + item.amount, 0),
    [payables],
  );

  const filteredCategories = useMemo(
    () =>
      (Array.isArray(categories) ? categories : []).filter(
        (c) => c.type === activeType && !c.parentId,
      ),
    [categories, activeType],
  );

  const filteredSubCategories = useMemo(
    () =>
      (Array.isArray(categories) ? categories : []).filter(
        (c) => c.parentId === selectedCategoryId,
      ),
    [categories, selectedCategoryId],
  );

  const categoryHasSubcategories = filteredSubCategories.length > 0;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transactionsData, categoriesData] = await Promise.all([
        listPendingTransactionsRequest(),
        listCategoriesRequest(),
      ]);
      setItems(
        transactionsData.map((t: any) => {
          // 🛡️ Fallback: Si 'name' viene nulo o no existe (por migración pendiente), usamos 'description'
          // Pero si 'name' existe, lo priorizamos
          return {
            id: t.id,
            name: t.name || "",
            description: t.description || "",
            amount: t.amount,
            date: t.date,
            dueDate: t.dueDate ?? undefined,
            status: t.status,
            type: t.type,
            category: t.category?.name ?? "Otros",
            categoryId: t.categoryId || t.category?.id || "",
            subCategory: t.subCategory?.name ?? "",
            subCategoryId: t.subCategoryId || t.subCategory?.id || "",
            currency: t.currency || "PEN",
            exchangeRate: t.exchangeRate || 1,
          };
        }),
      );
      setCategories(categoriesData);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al cargar transacciones pendientes";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleOpenModal = (type: "INCOME" | "EXPENSE") => {
    setEditingId(null);
    setActiveType(type);
    setFormData({
      amount: "",
      person: "",
      description: "",
      currency: "PEN",
      exchangeRate: "1",
      date: new Date().toISOString().split("T")[0],
    });
    setSelectedCategoryId("");
    setSelectedSubCategoryId("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PendingItem) => {
    setEditingId(item.id);
    setActiveType(item.type);
    setFormData({
      date: item.date.split("T")[0],
      person: item.name || "",
      description: item.description,
      amount: item.amount.toString(),
      currency: item.currency,
      exchangeRate: item.exchangeRate.toString(),
    });
    setSelectedCategoryId(item.categoryId || "");
    setSelectedSubCategoryId(item.subCategoryId || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategoryId) {
      toast.error("Selecciona una categoría");
      return;
    }

    if (categoryHasSubcategories && !selectedSubCategoryId) {
      toast.error("Selecciona una subcategoría");
      return;
    }

    if (!formData.person.trim()) {
      toast.error("Ingresa el nombre del deudor/acreedor");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Ingresa una descripción del motivo");
      return;
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (
      formData.currency === "USD" &&
      (!formData.exchangeRate || Number(formData.exchangeRate) <= 0)
    ) {
      toast.error("Ingresa un tipo de cambio válido");
      return;
    }

    const payload: any = {
      name: formData.person.trim(),
      description: formData.description.trim(),
      amount: Number(formData.amount),
      exchangeRate: Number(formData.exchangeRate),
      categoryId: selectedCategoryId,
      subCategoryId: selectedSubCategoryId || null,
      status: "PENDING",
      currency: formData.currency,
      date: formData.date,
      type: activeType, // El tipo es necesario para la creación y no estorba en la actualización
    };

    console.log("Enviando payload a la API:", payload);

    setSaving(true);
    try {
      if (editingId) {
        await updatePendingTransactionRequest(editingId, payload as any);
        toast.success("Actualizado correctamente");
      } else {
        await createPendingTransactionRequest(payload as any);
        toast.success("Creado correctamente");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const togglePaid = async (id: string, currentStatus: "PENDING" | "PAID") => {
    const newStatus: "PENDING" | "PAID" =
      currentStatus === "PENDING" ? "PAID" : "PENDING";

    try {
      await updatePendingTransactionRequest(id, { status: newStatus });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item,
        ),
      );
      toast.success(
        newStatus === "PAID" ? "Marcado como pagado" : "Marcado como pendiente",
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al actualizar estado";
      toast.error(message);
    }
  };

  const handleDelete = (id: string) => {
    setIdToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    try {
      await deletePendingTransactionRequest(idToDelete);
      setItems((prev) => prev.filter((item) => item.id !== idToDelete));
      toast.success("Transacción eliminada correctamente");
      setIdToDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al eliminar la transacción";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <Appshell>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-bold">Cargando cuentas...</p>
        </div>
      </Appshell>
    );
  }

  return (
    <Appshell>
      <div className="flex flex-col gap-8 animate-fade-in-up pb-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-rose-400"></div>
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl shadow-indigo-100">
              <ArrowRightLeft className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                Cuentas Pendientes
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Gestión de deudas y préstamos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-indigo-500" />
              <input
                type="text"
                placeholder="Buscar transacción..."
                className="pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm w-full md:w-72 text-gray-700 font-bold placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {/* RECEIVABLES */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-xl shadow-emerald-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <ArrowUpRight className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Por Cobrar</h2>
                  <p className="text-[10px] text-emerald-100 font-black uppercase tracking-widest opacity-80">
                    Dinero a tu favor
                  </p>
                  <h2 className="text-xl font-black">S/ {receivablesTotal}</h2>
                </div>
              </div>
              <button
                onClick={() => handleOpenModal("INCOME")}
                className="bg-white text-emerald-600 hover:bg-emerald-50 px-6 py-3 rounded-2xl transition-all font-black shadow-lg text-sm w-full sm:w-auto"
              >
                + Nuevo Cobro
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden">
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      <th className="p-6 pl-8">Deudor / Detalle</th>
                      <th className="p-6">Moneda</th>
                      <th className="p-6 text-right">Monto</th>
                      <th className="p-6 text-right">En Soles</th>
                      <th className="p-6 text-center">Estado</th>
                      <th className="p-6 pr-8 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50">
                    {receivables.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition-all group hover:bg-gray-50/50 ${item.status === "PAID" ? "opacity-50 grayscale-[0.5]" : ""}`}
                      >
                        <td className="p-6 pl-8">
                          <div className="font-bold text-gray-800 text-sm">
                            {item.name || "Sin nombre"}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold mt-1 italic">
                            "{item.description}"
                          </div>
                          <div className="text-[10px] text-indigo-400 font-black mt-2 uppercase tracking-tighter">
                            {item.date?.split("T")[0]}
                          </div>
                        </td>
                        <td className="p-6">
                          <span
                            className={`text-[10px] font-black px-2 py-1 rounded-lg ${item.currency === "USD" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                          >
                            {item.currency}
                          </span>
                          {item.currency === "USD" && (
                            <div className="text-[9px] text-gray-400 font-bold mt-1">
                              T.C: {item.exchangeRate}
                            </div>
                          )}
                        </td>
                        <td className="p-6 font-black text-gray-600 text-sm text-right">
                          {item.currency === "USD" ? "$" : "S/"}{" "}
                          {item.amount.toLocaleString()}
                        </td>
                        <td className="p-6 font-black text-emerald-600 text-lg text-right bg-emerald-50/10">
                          S/{" "}
                          {(
                            item.amount *
                            (item.currency === "USD" ? item.exchangeRate : 1)
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-6 text-center">
                          <button
                            onClick={() => togglePaid(item.id, item.status)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 mx-auto ${
                              item.status === "PAID"
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }`}
                          >
                            {item.status === "PAID" ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {item.status === "PAID" ? "Pagado" : "Pendiente"}
                          </button>
                        </td>
                        <td className="p-6 pr-8 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-2.5 bg-white border border-gray-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {receivables.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-20 text-center">
                          <ArrowUpLeft className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                            Sin cuentas por cobrar
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW */}
              <div className="md:hidden divide-y divide-gray-100">
                {receivables.map((item) => (
                  <div
                    key={item.id}
                    className={`p-6 space-y-4 ${item.status === "PAID" ? "opacity-60" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-gray-900 text-base leading-tight">
                          {item.name || "Sin nombre"}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium italic mt-1 leading-relaxed">
                          "{item.description}"
                        </p>
                      </div>
                      <button
                        onClick={() => togglePaid(item.id, item.status)}
                        className={`p-2 rounded-xl ${item.status === "PAID" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}
                      >
                        {item.status === "PAID" ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="flex justify-between items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            En Soles
                          </span>
                          <div className="h-px flex-1 bg-gray-200 w-8"></div>
                        </div>
                        <p className="text-xl font-black text-emerald-600">
                          S/{" "}
                          {(
                            item.amount *
                            (item.currency === "USD" ? item.exchangeRate : 1)
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                          Monto Original
                        </p>
                        <p className="text-sm font-black text-gray-600">
                          {item.currency === "USD" ? "$" : "S/"}{" "}
                          {item.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 bg-white border border-gray-100 rounded-lg shadow-sm">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                            {item.date?.split("T")[0]}
                          </span>
                        </div>
                        {item.currency === "USD" && (
                          <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            T.C: {item.exchangeRate}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-3 bg-white border border-gray-200 text-blue-600 rounded-xl shadow-sm active:scale-95 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-3 bg-white border border-gray-200 text-rose-500 rounded-xl shadow-sm active:scale-95 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PAYABLES */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-rose-500 to-red-600 p-6 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-xl shadow-rose-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <ArrowDownRight className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Por Pagar</h2>
                  <p className="text-[10px] text-rose-100 font-black uppercase tracking-widest opacity-80">
                    Dinero que debes
                  </p>
                  <h2 className="text-xl font-black">S/ {payablesTotal}</h2>
                </div>
              </div>
              <button
                onClick={() => handleOpenModal("EXPENSE")}
                className="bg-white text-rose-600 hover:bg-rose-50 px-6 py-3 rounded-2xl transition-all font-black shadow-lg text-sm w-full sm:w-auto"
              >
                + Nuevo Pago
              </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden">
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      <th className="p-6 pl-8">Acreedor / Detalle</th>
                      <th className="p-6">Moneda</th>
                      <th className="p-6 text-right">Monto</th>
                      <th className="p-6 text-right">En Soles</th>
                      <th className="p-6 text-center">Estado</th>
                      <th className="p-6 pr-8 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50/50">
                    {payables.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition-all group hover:bg-gray-50/50 ${item.status === "PAID" ? "opacity-50 grayscale-[0.5]" : ""}`}
                      >
                        <td className="p-6 pl-8">
                          <div className="font-bold text-gray-800 text-sm">
                            {item.name || "Sin nombre"}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold mt-1 italic">
                            "{item.description}"
                          </div>
                          <div className="text-[10px] text-rose-400 font-black mt-2 uppercase tracking-tighter">
                            {item.date?.split("T")[0]}
                          </div>
                        </td>
                        <td className="p-6">
                          <span
                            className={`text-[10px] font-black px-2 py-1 rounded-lg ${item.currency === "USD" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}`}
                          >
                            {item.currency}
                          </span>
                          {item.currency === "USD" && (
                            <div className="text-[9px] text-gray-400 font-bold mt-1">
                              T.C: {item.exchangeRate}
                            </div>
                          )}
                        </td>
                        <td className="p-6 font-black text-gray-600 text-sm text-right">
                          {item.currency === "USD" ? "$" : "S/"}{" "}
                          {item.amount.toLocaleString()}
                        </td>
                        <td className="p-6 font-black text-rose-600 text-lg text-right bg-rose-50/10">
                          S/{" "}
                          {(
                            item.amount *
                            (item.currency === "USD" ? item.exchangeRate : 1)
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-6 text-center">
                          <button
                            onClick={() => togglePaid(item.id, item.status)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 mx-auto ${
                              item.status === "PAID"
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }`}
                          >
                            {item.status === "PAID" ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {item.status === "PAID" ? "Pagado" : "Pendiente"}
                          </button>
                        </td>
                        <td className="p-6 pr-8 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-2.5 bg-white border border-gray-100 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {payables.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-20 text-center">
                          <ArrowUpRight className="w-12 h-12 text-gray-100 mx-auto mb-4 " />
                          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                            Sin cuentas por pagar
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW */}
              <div className="md:hidden divide-y divide-gray-100">
                {payables.map((item) => (
                  <div
                    key={item.id}
                    className={`p-6 space-y-4 ${item.status === "PAID" ? "opacity-60" : ""}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-gray-900 text-base leading-tight">
                          {item.name || "Sin nombre"}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium italic mt-1 leading-relaxed">
                          "{item.description}"
                        </p>
                      </div>
                      <button
                        onClick={() => togglePaid(item.id, item.status)}
                        className={`p-2 rounded-xl ${item.status === "PAID" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}
                      >
                        {item.status === "PAID" ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="flex justify-between items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            En Soles
                          </span>
                          <div className="h-px flex-1 bg-gray-200 w-8"></div>
                        </div>
                        <p className="text-xl font-black text-rose-600">
                          S/{" "}
                          {(
                            item.amount *
                            (item.currency === "USD" ? item.exchangeRate : 1)
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                          Monto Original
                        </p>
                        <p className="text-sm font-black text-gray-600">
                          {item.currency === "USD" ? "$" : "S/"}{" "}
                          {item.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 bg-white border border-gray-100 rounded-lg shadow-sm">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                            {item.date?.split("T")[0]}
                          </span>
                        </div>
                        {item.currency === "USD" && (
                          <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            T.C: {item.exchangeRate}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-3 bg-white border border-gray-200 text-blue-600 rounded-xl shadow-sm active:scale-95 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-3 bg-white border border-gray-200 text-rose-500 rounded-xl shadow-sm active:scale-95 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* end md:hidden mobile cards */}
            </div>
            {/* end bg-white payables container */}
          </div>
          {/* end payables flex col */}
        </div>
        {/* end grid xl:grid-cols-2 */}

        {/* MODAL */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            editingId
              ? `Actualizar Cuenta por ${activeType === "INCOME" ? "Cobrar" : "Pagar"}`
              : `Nueva Cuenta por ${activeType === "INCOME" ? "Cobrar" : "Pagar"}`
          }
          maxWidth="max-w-4xl"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            <div
              className={`p-8 rounded-[2.5rem] border ${activeType === "INCOME" ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"} space-y-6`}
            >
              <div
                className={`grid grid-cols-1 ${categoryHasSubcategories ? "md:grid-cols-2" : ""} gap-6`}
              >
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />{" "}
                    Categoría
                  </label>
                  <select
                    required
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-black text-gray-700 shadow-sm appearance-none"
                    value={selectedCategoryId || ""}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value);
                      setSelectedSubCategoryId("");
                    }}
                  >
                    <option value="">Seleccionar Categoría</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {categoryHasSubcategories && (
                  <div className="space-y-2 animate-fade-in-up">
                    <label className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] ml-1">
                      <Activity className="w-3.5 h-3.5" /> Subcategoría
                    </label>
                    <select
                      required
                      className="w-full px-5 py-4 bg-white border border-indigo-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-black text-gray-700 shadow-sm appearance-none"
                      value={selectedSubCategoryId || ""}
                      onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                    >
                      <option value="">Seleccionar Subcategoría</option>
                      {filteredSubCategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                    <User className="w-3.5 h-3.5 text-indigo-500" />{" "}
                    {activeType === "INCOME" ? "Deudor" : "Acreedor"}
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Nombre completo"
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                    value={formData.person}
                    onChange={(e) =>
                      setFormData({ ...formData, person: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Fecha
                  </label>
                  <input
                    required
                    type="date"
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                  <Info className="w-3.5 h-3.5 text-indigo-500" /> Descripción
                  del motivo
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Préstamo de emergencia"
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                    Moneda
                  </label>
                  <select
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-black text-gray-700 shadow-sm appearance-none"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currency: e.target.value as "PEN" | "USD",
                      })
                    }
                  >
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${formData.currency === "USD" ? "text-blue-500" : "text-gray-300"}`}
                    />{" "}
                    Tipo de Cambio
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="1"
                    disabled={formData.currency === "PEN"}
                    className={`w-full px-5 py-4 border rounded-[1.5rem] outline-none transition-all text-sm font-bold shadow-sm ${formData.currency === "USD" ? "bg-blue-50 border-blue-100 text-blue-700 focus:ring-blue-500/10" : "bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed"}`}
                    value={formData.exchangeRate}
                    onChange={(e) =>
                      setFormData({ ...formData, exchangeRate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> Monto
                  en {formData.currency}
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">
                    {formData.currency === "USD" ? "$" : "S/"}
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-2xl font-black text-gray-800 shadow-inner"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                  />
                </div>
                {formData.currency === "USD" && formData.amount && (
                  <div className="mt-2 text-right text-xs font-black text-emerald-600">
                    Equivale a: S/{" "}
                    {(
                      Number(formData.amount) *
                      Number(formData.exchangeRate || 1)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 ">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-0 py-6 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-6 py-4 text-white font-black rounded-[1.5rem] transition-all shadow-xl hover:-translate-y-1 active:scale-95 disabled:opacity-50 flex items-center gap-2 ${activeType === "INCOME" ? "bg-emerald-500 shadow-emerald-200" : "bg-rose-500 shadow-rose-200"}`}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Actualizar Registro"
                    : "Confirmar Registro"}
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={confirmDelete}
          title="Eliminar Registro"
          message="¿Estás seguro de que deseas eliminar este registro pendiente? Esta acción no se puede deshacer."
        />
      </div>
    </Appshell>
  );
}
