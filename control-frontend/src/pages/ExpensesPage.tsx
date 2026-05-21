import { useState, useEffect, useMemo } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import {
  Plus,
  Search,
  TrendingDown,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  Loader2,
  CheckCircle2,
  Tag,
  CreditCard,
  FileText,
  ChevronDown,
  Wallet,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { listCategoriesRequest } from "../services/category.api";
import ConfirmModal from "../components/ui/ConfirmModal";
import {
  createTransactionRequest,
  deleteTransactionRequest,
  getTransactionsRequest,
  markAsPendingRequest,
  updateTransactionRequest,
} from "../services/transaction.api";
import {
  getPeruTodayInputStr,
  utcToPeruInputDate,
  peruInputDateToUtcISO,
  formatPeruDate,
  formatPeruTime,
} from "../utils/date.utils";

type Expense = {
  id: string;
  date: string;
  paidAt?: string;
  category: string;
  categoryId?: string;
  subCategory?: string;
  subCategoryId?: string;
  name: string;
  description: string;
  amount: number;
  currency: "PEN" | "USD";
  exchangeRate: number;
  justified: boolean;
  programmed: boolean;
  status: "PENDING" | "PAID";
  paymentMethod: string;
};

export default function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [idStatus, setStatus] = useState<string | null>(null);
  const [idToReturn, setIdToReturn] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");

  const [expensesPage, setExpensesPage] = useState(1);

  const ITEMS_PER_PAGE = 4;




  const localDate = getPeruTodayInputStr();

  const [formData, setFormData] = useState({
    date: localDate,
    paidAt: localDate,
    name: "",
    description: "",
    amount: "",
    currency: "PEN" as "PEN" | "USD",
    exchangeRate: "1",
    status: "PAID" as "PAID" | "PENDING",
    justified: false,
    programmed: false,
    paymentMethod: "CASH" as "CASH" | "TRANSFER" | "YAPE" | "PLIN" | "CARD",
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredCategories = (
    Array.isArray(categories) ? categories : []
  ).filter((c) => c.type === "EXPENSE" && !c.parentId);

  const filteredSubCategories = (
    Array.isArray(categories) ? categories : []
  ).filter((c) => c.parentId === selectedCategoryId);

  const hasSubcategories = filteredSubCategories.length > 0;

  /*const filtered = (Array.isArray(items) ? items : []).filter(
    (exp) =>
      (exp.description?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (exp.category?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  );*/
  const normalizeText = (value: any) => {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const formatDateSearch = (dateValue?: string) => {
    if (!dateValue) return [];

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return [];

    const peDate = new Intl.DateTimeFormat("es-PE", {
      timeZone: "America/Lima",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);

    return [
      peDate, // 20/05/2026
      peDate.replace(/\//g, "-"),
      date.toISOString().split("T")[0], // 2026-05-20
    ];
  };

  const filtered = useMemo(() => {
    const term = normalizeText(searchTerm);

    if (!term) return items;

    return items.filter((inc) => {
      const amount = Number(inc.amount || 0);

      const searchValues = [
        inc.name,
        inc.description, // ✅ importante (ya estaba, lo reforzamos)
        inc.category,
        inc.subCategory,
        inc.paymentMethod,
        inc.currency,
        inc.status,
        amount,
        amount.toFixed(2),
        `s/${amount}`,
        `$${amount}`,
        ...formatDateSearch(inc.paidAt),
      ]
        .filter(Boolean)
        .map(normalizeText);

      if (!isNaN(Number(term)) && amount === Number(term)) {
        return true;
      }

      return searchValues.some((v) => v.includes(term));
    });
  }, [items, searchTerm]);

  const expenseTotalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const getPages = (totalPages: number) => {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    pages.push(1);
    if (expensesPage > 2) pages.push("...");
    pages.push(expensesPage);
    if (expensesPage < totalPages - 1) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  const expensesDesktop = useMemo(() => {
    const start = (expensesPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filtered.slice(start, end);
  }, [filtered, expensesPage]);

  useEffect(() => {
    if (!searchTerm) return;

    const term = normalizeText(searchTerm);

    const index = filtered.findIndex((inc) => {
      return (
        normalizeText(inc.name).includes(term) ||
        normalizeText(inc.description).includes(term)
      );
    });

    if (index === -1) return;

    const page = Math.floor(index / ITEMS_PER_PAGE) + 1;

    setExpensesPage(page);
  }, [searchTerm, filtered]);

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
          .filter((t: any) => t.type === "EXPENSE")
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description ?? "",
            amount: t.amount,
            date: t.date,
            paidAt: t.paidAt ?? undefined,
            category: t.category?.name ?? "Otros",
            categoryId: t.categoryId,
            subCategory: t.subCategory?.name ?? "",
            subCategoryId: t.subCategoryId,
            currency: t.currency || "PEN",
            exchangeRate: t.exchangeRate || 1,
            justified: t.justified || false,
            programmed: t.programmed || false,
            status: t.status || "PAID",
            paymentMethod: t.paymentMethod || "CASH",
          })),
      );
      setCategories(categoriesData);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al cargar egresos";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      date: localDate,
      paidAt: localDate,
      name: "",
      description: "",
      amount: "",
      currency: "PEN",
      exchangeRate: "1",
      status: "PAID",
      paymentMethod: "CASH",
      justified: false,
      programmed: false,
    });
    setSelectedCategoryId("");
    setSelectedSubCategoryId("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Expense) => {
    setEditingId(item.id);
    setFormData({
      date: utcToPeruInputDate(item.date),
      paidAt: item.paidAt ? utcToPeruInputDate(item.paidAt) : localDate,
      name: item.name,
      description: item.description,
      amount: item.amount.toString(),
      currency: item.currency,
      exchangeRate: item.exchangeRate.toString(),
      status: item.status,
      paymentMethod: (item.paymentMethod as any) || "CASH",
      justified: item.justified || false,
      programmed: item.programmed || false,
    });
    setSelectedCategoryId(item.categoryId || "");
    setSelectedSubCategoryId(item.subCategoryId || "");
    setIsModalOpen(true);
  };

  const [, setDateError] = useState<string>("");
  const [paidAtError, setPaidAtError] = useState<string>("");

  const validateDates = (dateVal: string, paidAtVal: string) => {
    const todayPeruStr = getPeruTodayInputStr();
    let valid = true;

    if (dateVal > todayPeruStr) {
      setDateError("La fecha no puede ser mayor a hoy");
      valid = false;
    } else {
      setDateError("");
    }

    if (paidAtVal > todayPeruStr) {
      setPaidAtError("La fecha de pago no puede ser mayor a hoy");
      valid = false;
    } else {
      setPaidAtError("");
    }

    return valid;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDates(formData.date, formData.paidAt)) {
      toast.error("Fecha inválida");
      return;
    }
    if (!selectedCategoryId) return toast.error("Selecciona una categoría");
    if (hasSubcategories && !selectedSubCategoryId)
      return toast.error("Selecciona una subcategoría");
    if (!formData.description.trim())
      return toast.error("Ingresa una descripción");
    if (!formData.amount || Number(formData.amount) <= 0)
      return toast.error("Ingresa un monto válido");
    if (
      formData.currency === "USD" &&
      (!formData.exchangeRate || Number(formData.exchangeRate) <= 0)
    )
      return toast.error("Ingresa un tipo de cambio válido");

    const originalItem = editingId ? items.find((i) => i.id === editingId) : undefined;
    const payload = {
      ...formData,
      date: peruInputDateToUtcISO(formData.date, originalItem?.date),
      paidAt: peruInputDateToUtcISO(formData.paidAt, originalItem?.paidAt),
      name: formData.name || "Egreso",
      description: formData.description || "Egreso",
      amount: Number(formData.amount),
      exchangeRate: Number(formData.exchangeRate),
      type: "EXPENSE",
      categoryId: selectedCategoryId,
      subCategoryId: selectedSubCategoryId || null,
      justified: formData.justified,
      programmed: formData.programmed,
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al guardar";
      toast.error(message);
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al eliminar";
      toast.error(message);
    }
  };
  const handleStatus = async (id: string, status: string) => {
    setIdToReturn(id);
    setStatus(status);
    setIsConfirmOpen(true);
  };
  const confirmReturn = async () => {
    if (!idToReturn) return;
    try {
      await markAsPendingRequest(idToReturn, {
        status: idStatus === "PAID" ? "PENDING" : "PAID",
      });
      toast.success("Actualizado correctamente");
      loadData();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al enviar a pendiente";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return formatPeruDate(dateStr);
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
          <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
          <p className="text-gray-500 font-bold">Cargando egresos...</p>
        </div>
      </Appshell>
    );
  }

  return (
    <Appshell>
      <div className="flex flex-col gap-8 animate-fade-in-up pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 via-pink-500 to-rose-600"></div>
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl shadow-xl shadow-rose-100">
              <TrendingDown className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                Gestión de Egresos
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                Control detallado de salidas de dinero
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-rose-500" />
              <input
                type="text"
                placeholder="Buscar egreso..."
                className="pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10 transition-all shadow-sm w-full md:w-72 text-gray-700 font-bold placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-800 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-rose-200 hover:-translate-y-1 transition-all active:scale-95 text-sm"
            >
              <Plus className="w-5 h-5" /> Nuevo Egreso
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.05)] overflow-hidden">
          {/* VISTA ESCRITORIO: TABLA */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <th className="p-5 pl-8">Categoría / Sub</th>
                  <th className="p-5 text-center">Pago</th>
                  <th className="p-5">F. Pago</th>
                  <th className="p-5">Destino</th>
                  <th className="p-5">Descripción</th>
                  <th className="p-5 text-center">Tags</th>
                  <th className="p-5 text-right">Monto Original</th>
                  <th className="p-5 text-center">Moneda</th>
                  <th className="p-5 text-center">T.C</th>
                  <th className="p-5 text-right">Monto Soles</th>
                  <th className="p-5 pr-8 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50">
                {expensesDesktop.map((exp) => {
                  const montoSoles =
                    exp.currency === "USD"
                      ? exp.amount * exp.exchangeRate
                      : exp.amount;
                  const categoryName =
                    typeof exp.category === "object"
                      ? (exp.category as any).name
                      : exp.category || "Otros";
                  const subCategoryName =
                    typeof exp.subCategory === "object"
                      ? (exp.subCategory as any).name
                      : exp.subCategory;

                  return (
                    <tr
                      key={exp.id}
                      className="transition-all hover:bg-gray-50/50"
                    >
                      <td className="p-5 pl-8">
                        <div className="font-black text-gray-800 text-sm">
                          {categoryName}
                        </div>
                        {subCategoryName && (
                          <div className="text-[10px] text-rose-500 font-black mt-0.5 uppercase tracking-tighter">
                            {subCategoryName}
                          </div>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <span className="px-3 py-1 rounded-lg bg-gray-50 text-gray-500 text-[9px] font-black uppercase border border-gray-100 tracking-tighter shadow-sm">
                          {getMethodBadge(exp.paymentMethod)}
                        </span>
                      </td>
                      <td className="p-5 text-sm font-bold text-gray-600 relative group cursor-help">
                        <span>{exp.paidAt ? formatDate(exp.paidAt) : "-"}</span>
                        {exp.paidAt && (
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex flex-col items-center z-50">
                            <div className="bg-slate-900 text-white text-[11px] font-black py-2 px-3 rounded-xl shadow-xl border border-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                              <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                              <span>{formatPeruTime(exp.paidAt)}</span>
                            </div>
                            <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-1.5 border-r border-b border-slate-800"></div>
                          </div>
                        )}
                      </td>
                      <td className="p-5 text-sm font-bold text-gray-600">
                        {exp.name}
                      </td>
                      <td className="p-5 text-sm font-bold text-gray-600">
                        {exp.description}
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex gap-1 justify-center">
                          {exp.justified && (
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase border border-emerald-100">
                              Just.
                            </span>
                          )}
                          {exp.programmed && (
                            <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-[8px] font-black uppercase border border-amber-100">
                              Prog.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-5 text-right font-black text-gray-700">
                        {exp.currency === "USD" ? "$" : "S/"}{" "}
                        {exp.amount.toLocaleString()}
                      </td>
                      <td className="p-5 text-center">
                        <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                          {exp.currency}
                        </span>
                      </td>
                      <td className="p-5 text-center text-xs font-bold text-gray-400">
                        {exp.currency === "USD"
                          ? (exp.exchangeRate || 1).toFixed(2)
                          : "-"}
                      </td>
                      <td className="p-5 text-right font-black text-rose-600">
                        S/{" "}
                        {montoSoles.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-5 pr-8 text-center">
                        <div className="flex gap-2 ml-4">
                          {/* Editar */}
                          <div className="relative group">
                            <button
                              title="Editar"
                              onClick={() => handleOpenEdit(exp)}
                              className="p-2.5 bg-white border border-gray-200 text-blue-600 rounded-xl shadow-sm active:scale-95"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <span
                              className="hidden group-hover:block absolute left-1/2 -translate-x-1/2
  bottom-14 z-50 whitespace-nowrap rounded-full px-3 py-1
  text-xs font-medium text-white shadow-lg
  bg-gradient-to-r from-pink-400 via-violet-500 to-cyan-400"
                            >
                              Editar
                            </span>
                          </div>

                          {/* Eliminar */}
                          <div className="relative group">
                            <button
                              title="Eliminar"
                              onClick={() => handleDelete(exp.id)}
                              className="p-2.5 bg-white border border-gray-200 text-rose-600 rounded-xl shadow-sm active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <span
                              className="hidden group-hover:block absolute left-1/2 -translate-x-1/2
  bottom-14 z-50 whitespace-nowrap rounded-full px-3 py-1
  text-xs font-medium text-white shadow-lg
  bg-gradient-to-r from-pink-400 via-violet-500 to-cyan-400"
                            >
                              Eliminar
                            </span>
                          </div>

                          {/* Devolver */}
                          <div className="relative group">
                            <button
                              title="Devolver a pendientes"
                              onClick={() => handleStatus(exp.id, exp.status)}
                              className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl shadow-sm active:scale-95"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>

                            <span
                              className="hidden group-hover:block absolute left-1/2 -translate-x-1/2
  bottom-14 z-50 whitespace-nowrap rounded-full px-3 py-1
  text-xs font-medium text-white shadow-lg
  bg-gradient-to-r from-pink-400 via-violet-500 to-cyan-400"
                            >
                              Devolver
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-center items-center gap-2 py-4 border-t border-gray-100 bg-white">
              {/* IR AL INICIO */}
              <button
                onClick={() => setExpensesPage(1)}
                disabled={expensesPage === 1}
                className="px-3 py-1 text-sm font-black disabled:opacity-30"
              >
                « Inicio
              </button>

              {/* ATRÁS */}
              <button
                onClick={() => setExpensesPage((p) => Math.max(p - 1, 1))}
                disabled={expensesPage === 1}
                className="px-3 py-1 text-sm font-black disabled:opacity-30"
              >
                ‹ Atrás
              </button>

              {/* NÚMEROS */}
              {getPages(expenseTotalPages).map((page) => (
                <button
                  key={page}
                  onClick={() => typeof page === "number" && setExpensesPage(page)}
                  className={`px-3 py-1 text-sm font-black rounded-lg transition-all ${expensesPage === page
                    ? "bg-black text-white"
                    : "text-gray-500 hover:bg-gray-100"
                    }`}
                >
                  {page}
                </button>
              ))}

              {/* SIGUIENTE */}
              <button
                onClick={() =>
                  setExpensesPage((p) => Math.min(p + 1, expenseTotalPages))
                }
                disabled={expensesPage === expenseTotalPages}
                className="px-3 py-1 text-sm font-black disabled:opacity-30"
              >
                Siguiente ›
              </button>

              {/* IR AL FINAL */}
              <button
                onClick={() => setExpensesPage(expenseTotalPages)}
                disabled={expensesPage === expenseTotalPages}
                className="px-3 py-1 text-sm font-black disabled:opacity-30"
              >
                Fin »
              </button>
            </div>
          </div>

          {/* VISTA MÓVIL: CARDS */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((exp) => {
              const montoSoles =
                exp.currency === "USD"
                  ? exp.amount * exp.exchangeRate
                  : exp.amount;
              const categoryName =
                typeof exp.category === "object"
                  ? (exp.category as any).name
                  : exp.category || "Otros";
              const subCategoryName =
                typeof exp.subCategory === "object"
                  ? (exp.subCategory as any).name
                  : exp.subCategory;

              return (
                <div key={exp.id} className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 uppercase tracking-widest">
                          {categoryName}
                        </span>
                        {subCategoryName && (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 uppercase">
                            {subCategoryName}
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-gray-800 text-sm mt-1">
                        {exp.description || "Sin descripción"}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                        Pago: {exp.paidAt ? formatDate(exp.paidAt) : "-"}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                        Método: {getMethodBadge(exp.paymentMethod)}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {/* Editar */}
                      <div className="relative group">
                        <button
                          title="Editar"
                          onClick={() => handleOpenEdit(exp)}
                          className="p-2.5 bg-white border border-gray-200 text-blue-600 rounded-xl shadow-sm active:scale-95"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <span
                          className="hidden group-hover:block absolute left-1/2 -translate-x-1/2
  bottom-14 z-50 whitespace-nowrap rounded-full px-3 py-1
  text-xs font-medium text-white shadow-lg
  bg-gradient-to-r from-pink-400 via-violet-500 to-cyan-400"
                        >
                          Editar
                        </span>
                      </div>

                      {/* Eliminar */}
                      <div className="relative group">
                        <button
                          title="Eliminar"
                          onClick={() => handleDelete(exp.id)}
                          className="p-2.5 bg-white border border-gray-200 text-rose-600 rounded-xl shadow-sm active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <span
                          className="hidden group-hover:block absolute left-1/2 -translate-x-1/2
  bottom-14 z-50 whitespace-nowrap rounded-full px-3 py-1
  text-xs font-medium text-white shadow-lg
  bg-gradient-to-r from-pink-400 via-violet-500 to-cyan-400"
                        >
                          Eliminar
                        </span>
                      </div>

                      {/* Devolver */}
                      <div className="relative group">
                        <button
                          title="Devolver a pendientes"
                          onClick={() => handleStatus(exp.id, exp.status)}
                          className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl shadow-sm active:scale-95"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>

                        <span
                          className="hidden group-hover:block absolute left-1/2 -translate-x-1/2
  bottom-14 z-50 whitespace-nowrap rounded-full px-3 py-1
  text-xs font-medium text-white shadow-lg
  bg-gradient-to-r from-pink-400 via-violet-500 to-cyan-400"
                        >
                          Devolver
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-rose-900/40 uppercase tracking-widest mb-1">
                        Gasto en Soles
                      </p>
                      <p className="text-xl font-black text-rose-600">
                        S/{" "}
                        {montoSoles.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">
                        {exp.currency}{" "}
                        {exp.currency === "USD"
                          ? `(T.C: ${exp.exchangeRate})`
                          : ""}
                      </p>
                      <p className="text-sm font-black text-gray-600">
                        {exp.currency === "USD" ? "$" : "S/"}{" "}
                        {exp.amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* end md:hidden mobile cards */}

          {filtered.length === 0 && (
            <div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
              Sin registros de egresos
            </div>
          )}
        </div>
        {/* end bg-white outer container */}

        {/* MODAL REDISEÑADO - MÁS COMPACTO Y AMPLIO */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? "Actualizar Egreso" : "Nuevo Egreso Registrado"}
          maxWidth="max-w-4xl"
        >
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sección Clasificación */}
              <div className="bg-rose-50/20 p-5 rounded-[2rem] border border-rose-100/40 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-black text-rose-900 uppercase tracking-widest">
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
                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-black text-gray-700 appearance-none shadow-sm"
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

                  {hasSubcategories && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                      <label className="text-[9px] font-black text-rose-600 uppercase tracking-widest ml-1">
                        Subcategoría
                      </label>
                      <div className="relative">
                        <select
                          required
                          className="w-full px-4 py-3 bg-white border border-rose-100 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-black text-gray-700 appearance-none shadow-sm"
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
                        <ChevronDown className="w-4 h-4 text-rose-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        Fecha de Pago
                      </label>
                      <input
                        required
                        type="date"
                        max={localDate}
                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                        value={formData.paidAt}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, paidAt: value });
                          validateDates(formData.date, value);
                        }}
                      />
                      {paidAtError && (
                        <p className="text-xs font-bold text-rose-500 mt-1">
                          {paidAtError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección Detalles */}
              <div className="bg-amber-50/20 p-5 rounded-[2rem] border border-amber-100/40 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest">
                    Detalles
                  </span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Destino
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. ElectroSurEste..."
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
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
                    placeholder="Ej. Pago de suministros..."
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
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

            {/* Flags de Estado - Compactos */}
            <div className="bg-gray-50/30 p-5 rounded-[2rem] border border-gray-100/60">
              <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.justified}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          justified: e.target.checked,
                        })
                      }
                    />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white shadow-sm"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      className={`w-3.5 h-3.5 transition-colors ${formData.justified ? "text-emerald-500" : "text-gray-300"}`}
                    />
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest ${formData.justified ? "text-emerald-700" : "text-gray-400"}`}
                    >
                      Gasto Justificado
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={formData.programmed}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          programmed: e.target.checked,
                        })
                      }
                    />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-amber-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white shadow-sm"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock
                      className={`w-3.5 h-3.5 transition-colors ${formData.programmed ? "text-amber-500" : "text-gray-300"}`}
                    />
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest ${formData.programmed ? "text-amber-700" : "text-gray-400"}`}
                    >
                      Gasto Programado
                    </span>
                  </div>
                </label>
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
                      Método de Pago
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

                {/* Info Financiera */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] font-black text-rose-900 uppercase tracking-widest">
                      Información Financiera
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
                      <label className="text-[8px] font-black text-rose-600 uppercase tracking-widest ml-1">
                        Importe
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 bg-white border-2 border-rose-100 rounded-lg outline-none text-[11px] font-black text-gray-800 shadow-sm"
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
                className="px-5 py-3 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3.5 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
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
          title="Eliminar Egreso"
          message="¿Estás seguro de que deseas eliminar este registro de gasto permanentemente?"
        />
        <ConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={confirmReturn}
          title="Devolver egreso"
          message="¿Estás seguro de que deseas devolver este registro a cuentas por Pagar?"
          confirmText="Devolver"
          buttonIcon={<RotateCcw className="w-5 h-5" />}
          variant="info"
        />
      </div>
    </Appshell>
  );
}
