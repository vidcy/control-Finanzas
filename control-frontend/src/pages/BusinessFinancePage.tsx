import { useState, useEffect, useMemo, Fragment } from "react";
import Appshell from "../components/layout/Appshell";
import {
  getTransactionsRequest,
  createTransactionRequest,
  updateTransactionRequest,
  deleteTransactionRequest,
  markAsPendingRequest,
} from "../services/transaction.api";
import { listCategoriesRequest } from "../services/category.api";
import { getBranchesRequest } from "../services/branch.api";
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
  XCircle,
  AlertCircle,
  Tag,
  ChevronDown,
  Coins,
  CheckCircle,
  Clock,
  Building2,
  Calendar,
  Info,
  Paperclip,
  ChevronUp,
  Layers,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import ConfirmModal from "../components/ui/ConfirmModal";
import SystemErrorModal from "../components/ui/SystemErrorModal";
import { parseSystemError, type SystemErrorInfo } from "../utils/systemErrorHandler";
import { format } from "date-fns";
import BusinessAiAdvisor from "../components/dashboard/BusinessAiAdvisor";
import ImageUploader, { getReceiptAbsoluteUrl, uploadReceiptFile } from "../components/ui/ImageUploader";
import Pagination from "../components/ui/Pagination";
import DateRangePicker from "../components/ui/DateRangePicker";
import { cancelPurchaseOrderRequest } from "../services/product.api";
import { getCashShiftAuditRequest } from "../services/cash-shift.api";
import {
  getPeruTodayInputStr,
  utcToPeruInputDate,
  peruInputDateToUtcISO,
  formatPeruDate,
} from "../utils/date.utils";

export default function BusinessFinancePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  // Audit & Bitácora modal states
  const [selectedAuditTx, setSelectedAuditTx] = useState<any | null>(null);
  const [shiftAuditData, setShiftAuditData] = useState<any | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const handleOpenAudit = async (tx: any) => {
    setSelectedAuditTx(tx);
    if (tx.cashShiftId) {
      setLoadingAudit(true);
      try {
        const data = await getCashShiftAuditRequest(tx.cashShiftId);
        setShiftAuditData(data);
      } catch (err) {
        console.warn("No se pudo cargar detalle completo del turno:", err);
      } finally {
        setLoadingAudit(false);
      }
    } else {
      setShiftAuditData(null);
    }
  };

  // Edit & Revert States
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  // Modal confirm delete & revert states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);
  const [txIdToConfirm, setTxIdToConfirm] = useState<string | null>(null);
  const [systemError, setSystemError] = useState<SystemErrorInfo | null>(null);

  // Cancel purchase order states
  const [isCancelOrderConfirmOpen, setIsCancelOrderConfirmOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<{ id: string; txId: string } | null>(null);
  const [showLiquidityWarning, setShowLiquidityWarning] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [branches, setBranches] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(6);
  const [financeViewMode, setFinanceViewMode] = useState<"EXPEDIENTES" | "ALL_TXS">("EXPEDIENTES");
  const [expandedFinanceTxIds, setExpandedFinanceTxIds] = useState<Record<string, boolean>>({});

  const toggleExpandFinance = (id: string) => {
    setExpandedFinanceTxIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    setTxPage(1);
  }, [searchTerm, filterType, filterCategory, filterBranch, dateFrom, dateTo, financeViewMode, txPageSize]);

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
    date: getPeruTodayInputStr(),
    branchId: "",
    justified: false,
    programmed: false,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [txs, cats, branchList] = await Promise.all([
        getTransactionsRequest({ workspace: "BUSINESS" }),
        listCategoriesRequest(),
        getBranchesRequest(),
      ]);
      setTransactions(txs);
      setCategories(cats);
      setBranches(branchList);
    } catch (error) {
      toast.error("Error cargando finanzas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Detección estricta de movimientos de ajuste contable por anulación / descuento de ventas
  const isAdjustmentTx = (t: any) =>
    Boolean(
      t.name?.includes("Ajuste") ||
      t.description?.includes("[BITÁCORA DE AJUSTE") ||
      t.description?.includes("Ajuste por Anulación") ||
      t.name?.includes("Devolución")
    );

  // Total de Ajustes y Devoluciones aplicados a ventas (reducción de ingreso, no gasto operativo)
  const totalAjustesVentas = transactions
    .filter((t) => t.status === "PAID" && t.type === "EXPENSE" && isAdjustmentTx(t))
    .reduce((acc, t) => acc + (t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount), 0);

  // Egresos Operativos Genuinos (OPEX / compras reales - excluye asientos técnicos de anulación de ventas)
  const totalEgresosTesorerias = transactions
    .filter((t) => t.status === "PAID" && t.type === "EXPENSE" && !isAdjustmentTx(t))
    .reduce((acc, t) => acc + (t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount), 0);

  // Ingresos Brutos de Tesorería (solo transacciones finalizadas/PAID)
  const grossIngresosTesorerias = transactions
    .filter((t) => t.status === "PAID" && t.type === "INCOME")
    .reduce((acc, t) => acc + (t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount), 0);

  // Ingreso Neto Real: Ingresos Brutos menos los Ajustes por Anulación
  const totalIngresosTesorerias = Math.max(0, grossIngresosTesorerias - totalAjustesVentas);

  const liquidezNeta = totalIngresosTesorerias - totalEgresosTesorerias;

  const totalCapitalInjected = totalIngresosTesorerias;
  const totalOpex = totalEgresosTesorerias;
  const liquidCash = liquidezNeta;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      toast.error("Selecciona una categoría");
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

    const executeSubmit = async (ignoreLiquidity = false) => {
      try {
        let finalReceiptUrl = formData.receiptUrl;
        if (formData.receiptUrl instanceof File) {
          const uploadToast = toast.loading("Subiendo comprobante...");
          try {
            finalReceiptUrl = await uploadReceiptFile(formData.receiptUrl);
            toast.dismiss(uploadToast);
          } catch (uploadError: any) {
            toast.dismiss(uploadToast);
            toast.error(uploadError.message || "Error al subir el comprobante");
            return;
          }
        }

        const isoDate = peruInputDateToUtcISO(
          formData.date || getPeruTodayInputStr(),
          editingTransaction?.date
        );

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
          date: isoDate,
          branchId: formData.branchId || null,
          ignoreLiquidity,
          justified: formData.justified,
          programmed: formData.programmed,
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
            date: isoDate,
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
          date: getPeruTodayInputStr(),
          exchangeRate: 1,
          branchId: "",
          justified: false,
          programmed: false,
        });
        loadData();
      } catch (error: any) {
        const message = error?.message || (editingTransaction ? "Error al actualizar operación" : "Error al registrar operación");
        if (message.toLowerCase().includes("liquidez")) {
          setPendingAction(() => () => executeSubmit(true));
          setShowLiquidityWarning(true);
        } else {
          toast.error(message);
        }
      }
    };

    await executeSubmit(false);
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
      date: utcToPeruInputDate(t.date) || getPeruTodayInputStr(),
      branchId: t.branchId || "",
      justified: t.justified || false,
      programmed: t.programmed || false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransactionRequest(id);
      toast.success("Operación eliminada con éxito");
      loadData();
    } catch (error: any) {
      setSystemError(parseSystemError(error, "Error al Eliminar Operación"));
    }
  };

  const handleRevertToPending = async (id: string) => {
    try {
      await markAsPendingRequest(id, { status: "PENDING" });
      toast.success("Movimiento devuelto a cuentas pendientes");
      loadData();
    } catch (error: any) {
      setSystemError(parseSystemError(error, "Error al Devolver a Cuentas Pendientes"));
    }
  };

  const exportFinanceExcel = async () => {
    if (filteredTransactions.length === 0) {
      toast.error("No hay transacciones para exportar");
      return;
    }
    const XLSX = await import("xlsx");
    const dataToExport = filteredTransactions.map(t => ({
      "Fecha": format(new Date(t.date), "yyyy-MM-dd"),
      "Concepto": t.name || t.description || "Movimiento",
      "Descripción": t.description || "",
      "Sede": t.branch?.name || "Sede Central",
      "Categoría": t.category?.name || "Sin Categoría",
      "Subcategoría": t.subCategory?.name || "",
      "Tipo": t.type === "INCOME" ? "Ingreso" : "Egreso",
      "Método de Pago": t.paymentMethod,
      "Moneda": t.currency || "PEN",
      "Tipo de Cambio": t.currency === "USD" ? (t.exchangeRate || 1) : "",
      "Monto Original": t.amount,
      "Total en Soles (S/)": t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount,
      "Estado": t.status === "CANCELLED" ? "Anulado" : t.status === "PENDING" ? "Pendiente" : "Finalizado"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    worksheet["!cols"] = Object.keys(dataToExport[0] || {}).map(key => {
      const maxLen = Math.max(
        key.length,
        ...dataToExport.map(row => String((row as any)[key] ?? "").length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos");
    XLSX.writeFile(workbook, `Movimientos_Tesoreria_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("Movimientos exportados a Excel");
  };

  const exportFinancePdf = async () => {
    if (filteredTransactions.length === 0) {
      toast.error("No hay transacciones para exportar");
      return;
    }
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF("l", "mm", "a4");
    const businessName = "Control Finanzas";

    // Header Banner
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 297, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`REGISTRO DE TESORERÍA - ${businessName.toUpperCase()}`, 14, 10);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");

    const branchLabel = filterBranch ? (branches.find(b => b.id === filterBranch)?.name || "Sede") : "Todas";
    const categoryLabel = filterCategory ? (categories.find(c => c.id === filterCategory)?.name || "Categoría") : "Todas";
    const typeLabel = filterType === "ALL" ? "Todos" : filterType === "INCOME" ? "Ingresos" : "Egresos";
    const filterText = `Sede: ${branchLabel} | Categoría: ${categoryLabel} | Tipo: ${typeLabel}`;

    doc.text(`Filtros: ${filterText} | Rango: ${dateFrom || "Inicio"} al ${dateTo || "Hoy"}`, 14, 16);
    doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 21);

    // Summary Box
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 28, 269, 14, 2, 2, "F");

    const totals = filteredTransactions.reduce((acc, t) => {
      const amt = t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount;
      if (t.type === "INCOME" && t.status === "PAID") acc.income += amt;
      if (t.type === "EXPENSE" && t.status === "PAID") acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });

    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    doc.text("INGRESOS (S/) *", 18, 33);
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129);
    doc.text(`+S/ ${totals.income.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, 18, 39);

    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8);
    doc.text("EGRESOS (S/) *", 90, 33);
    doc.setFontSize(11);
    doc.setTextColor(239, 68, 68);
    doc.text(`-S/ ${totals.expense.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, 90, 39);

    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8);
    doc.text("SALDO NETO (S/)", 160, 33);
    doc.setFontSize(11);
    const balance = totals.income - totals.expense;
    doc.setTextColor(balance >= 0 ? 79 : 220, balance >= 0 ? 70 : 38, balance >= 0 ? 229 : 38);
    doc.text(`S/ ${balance.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, 160, 39);

    doc.setTextColor(156, 163, 175);
    doc.setFontSize(7);
    doc.text("* Solo transacciones finalizadas", 225, 39);

    const startY = 48;
    doc.setFillColor(79, 70, 229);
    doc.rect(14, startY, 269, 9, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Fecha", 16, startY + 6);
    doc.text("Concepto", 38, startY + 6);
    doc.text("Sede", 95, startY + 6);
    doc.text("Categoría", 130, startY + 6);
    doc.text("Método", 170, startY + 6);
    doc.text("Tipo", 195, startY + 6);
    doc.text("Monto Orig.", 217, startY + 6);
    doc.text("Total (S/)", 242, startY + 6);
    doc.text("Estado", 267, startY + 6);

    let y = startY + 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    filteredTransactions.forEach((t, idx) => {
      if (y > 185) {
        doc.addPage();
        y = 20;
        doc.setFillColor(79, 70, 229);
        doc.rect(14, y, 269, 9, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text("Fecha", 16, y + 6);
        doc.text("Concepto", 38, y + 6);
        doc.text("Sede", 95, y + 6);
        doc.text("Categoría", 130, y + 6);
        doc.text("Método", 170, y + 6);
        doc.text("Tipo", 195, y + 6);
        doc.text("Monto Orig.", 217, y + 6);
        doc.text("Total (S/)", 242, y + 6);
        doc.text("Estado", 267, y + 6);

        y += 9;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
      }

      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(14, y, 269, 7.5, "F");
      }

      const totalSoles = t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount;

      doc.setTextColor(55, 65, 81);
      doc.text(format(new Date(t.date), "yyyy-MM-dd"), 16, y + 5);

      const concepto = t.name || t.description || "Movimiento";
      doc.text(concepto.substring(0, 32), 38, y + 5);

      const branchName = t.branch?.name || "Sede Central";
      doc.text(branchName.substring(0, 18), 95, y + 5);

      const cat = t.category?.name || "Sin Categoría";
      doc.text(cat.substring(0, 22), 130, y + 5);

      doc.text(t.paymentMethod || "CASH", 170, y + 5);

      doc.setFont("helvetica", "bold");
      if (t.type === "INCOME") {
        doc.setTextColor(16, 124, 65);
        doc.text("Ingreso", 195, y + 5);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text("Egreso", 195, y + 5);
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);

      doc.text(`${t.currency || "PEN"} ${t.amount.toFixed(2)}`, 217, y + 5);
      doc.text(`S/ ${totalSoles.toFixed(2)}`, 242, y + 5);

      const statusText = t.status === "CANCELLED" ? "Anulado" : t.status === "PENDING" ? "Pendiente" : "Finalizado";
      doc.text(statusText, 267, y + 5);

      y += 7.5;
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`Think ERP Finanzas – Registro de Tesorería – Pág. ${i} de ${totalPages}`, 14, 202);
    }

    doc.save(`Reporte_Tesoreria_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
    toast.success("Reporte de tesorería exportado a PDF");
  };

  const financeTree = useMemo(() => {
    // 1. Filtrado base según filtros seleccionados
    const matchingTxs = transactions.filter((t) => {
      const concept = (t.name || t.description || "Movimiento Financiero").toLowerCase();
      const desc = (t.description || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || concept.includes(search) || desc.includes(search);

      const matchesType = filterType === "ALL" || t.type === filterType;
      const matchesCategory = !filterCategory || t.categoryId === filterCategory;
      const matchesBranch =
        !filterBranch ||
        (filterBranch === "central" ? !t.branchId : t.branchId === filterBranch);

      const day = (t.date || "").slice(0, 10);
      const matchesDateFrom = !dateFrom || day >= dateFrom;
      const matchesDateTo = !dateTo || day <= dateTo;

      return matchesSearch && matchesType && matchesCategory && matchesBranch && matchesDateFrom && matchesDateTo;
    });

    const getTxTime = (t: any) => new Date(t.date || t.createdAt).getTime() || 0;

    // Ordenamiento descendente estricto: De lo más reciente a lo más antiguo
    const sortedMatchingTxs = [...matchingTxs].sort((a, b) => getTxTime(b) - getTxTime(a));

    // MODO 2: Cronograma Total (Todos los registros planos de más reciente a más antiguo)
    if (financeViewMode === "ALL_TXS") {
      return sortedMatchingTxs.map((t) => {
        const origSoles = t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount;
        return {
          root: t,
          adjustments: [],
          timeline: [t],
          origAmountSoles: origSoles,
          totalAdjSoles: 0,
          netAmount: origSoles,
          statusType: t.status === "CANCELLED" ? "LIQUIDADO" : "NORMAL",
        };
      });
    }

    // MODO 1: Expedientes Financieros (Con Trazabilidad) - Principal y por Defecto
    const adjustmentsByRef: Record<string, any[]> = {};
    const adjustmentsByShift: Record<string, any[]> = {};

    transactions.forEach((t) => {
      if (isAdjustmentTx(t)) {
        const matchRef = t.description?.match(/Referencia:\s*([A-Za-z0-9-]+)/);
        if (matchRef && matchRef[1]) {
          const ref = matchRef[1].trim();
          if (!adjustmentsByRef[ref]) adjustmentsByRef[ref] = [];
          adjustmentsByRef[ref].push(t);
        }
        if (t.cashShiftId) {
          if (!adjustmentsByShift[t.cashShiftId]) adjustmentsByShift[t.cashShiftId] = [];
          adjustmentsByShift[t.cashShiftId].push(t);
        }
      }
    });

    const roots: any[] = [];

    sortedMatchingTxs.forEach((t) => {
      if (isAdjustmentTx(t)) {
        return;
      }

      const linkedAdjustments: any[] = [];
      const docMatch = (t.name + " " + (t.description || "")).match(/([BF][A-Z0-9]{3}-\d+)/);
      if (docMatch && docMatch[1] && adjustmentsByRef[docMatch[1]]) {
        linkedAdjustments.push(...adjustmentsByRef[docMatch[1]]);
      }
      if (t.cashShiftId && adjustmentsByShift[t.cashShiftId]) {
        linkedAdjustments.push(...adjustmentsByShift[t.cashShiftId]);
      }

      const uniqueLinked = Array.from(new Map(linkedAdjustments.map((a) => [a.id, a])).values());
      const timeline = [t, ...uniqueLinked].sort((a, b) => getTxTime(a) - getTxTime(b));

      const origAmountSoles = t.currency === "USD" ? t.amount * (t.exchangeRate || 1) : t.amount;
      const totalAdjSoles = uniqueLinked.reduce((acc, a) => acc + (a.currency === "USD" ? a.amount * (a.exchangeRate || 1) : a.amount), 0);
      const calculatedNet = origAmountSoles - totalAdjSoles;
      const netAmount = Math.max(0, calculatedNet);

      let statusType = "NORMAL";
      if (t.status === "CANCELLED" || (uniqueLinked.length > 0 && netAmount <= 0.009)) {
        statusType = "LIQUIDADO";
      } else if (uniqueLinked.length > 0) {
        statusType = "MODIFICADO";
      }

      roots.push({
        root: t,
        adjustments: uniqueLinked,
        timeline,
        origAmountSoles,
        totalAdjSoles,
        netAmount,
        statusType,
      });
    });

    return roots;
  }, [transactions, searchTerm, filterType, filterCategory, filterBranch, dateFrom, dateTo, financeViewMode]);

  const filteredTransactions = financeTree.map((item) => item.root);

  const filteredCategories = categories.filter(
    (c) => c.type === type && !c.parentId,
  );
  const selectedCategoryObj = categories.find(
    (c) => c.id === formData.categoryId,
  );
  const subcategories = selectedCategoryObj?.children || [];


  const paymentLabel: Record<string, string> = {
    CASH: "Efectivo",
    YAPE: "Yape/Plin",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
  };

  return (
    <Appshell>
      <div className="space-y-8 pb-10">
        {/* LIGHT PASTEL HERO BANNER */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-50 via-sky-50 to-blue-50 border border-indigo-100/80 rounded-[2.5rem] p-8 md:p-10 text-slate-900 shadow-xl shadow-indigo-100/40">
          {/* Ambient Soft Glow Orbs */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 bg-sky-200/40 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-indigo-100 text-indigo-700 text-xs font-extrabold shadow-sm">
                <Vault className="w-4 h-4 text-indigo-500" />
                <span>Gestión de Caja & Fondo de Reserva</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                Caja Fuerte & <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 bg-clip-text text-transparent">Tesorería</span>
              </h1>
              <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed">
                Control centralizado de inyecciones de capital, préstamos corporativos y egresos operativos fijos de tus sedes.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3.5 w-full lg:w-auto">
              <button
                onClick={() => {
                  setType("INCOME");
                  setIsModalOpen(true);
                }}
                className="flex-1 lg:flex-none px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-95 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all"
              >
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                <span>Nuevo Ingreso</span>
              </button>
              <button
                onClick={() => {
                  setType("EXPENSE");
                  setIsModalOpen(true);
                }}
                className="flex-1 lg:flex-none px-6 py-3.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:-translate-y-0.5 active:scale-95 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all"
              >
                <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
                <span>Nuevo Gasto (OPEX)</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-md rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cargando tesorería...</span>
          </div>
        ) : (
          <>
            {/* KPI LIGHT WIDGET CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Ingresos Card */}
              <div className="group bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-6 rounded-3xl shadow-sm hover:shadow-md border border-emerald-100/80 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full transition-all group-hover:scale-110"></div>
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-white text-emerald-600 rounded-2xl border border-emerald-100 shadow-xs group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-0.5">
                      Ingresos Tesorería
                    </p>
                    <p className="text-2xl lg:text-3xl font-black text-emerald-950 tracking-tight">
                      S/ {totalCapitalInjected.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-emerald-700/80 font-medium mt-1">Capital, préstamos e inversiones</p>
                  </div>
                </div>
              </div>

              {/* Egresos Card */}
              <div className="group bg-gradient-to-br from-rose-50/80 to-pink-50/60 p-6 rounded-3xl shadow-sm hover:shadow-md border border-rose-100/80 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full transition-all group-hover:scale-110"></div>
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-white text-rose-600 rounded-2xl border border-rose-100 shadow-xs group-hover:scale-110 transition-transform">
                    <TrendingDown className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest mb-0.5">
                      Egresos Tesorería
                    </p>
                    <p className="text-2xl lg:text-3xl font-black text-rose-950 tracking-tight">
                      S/ {totalOpex.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-rose-700/80 font-medium mt-1">Gastos fijos + compras confirmadas</p>
                  </div>
                </div>
              </div>

              {/* Liquidez Card */}
              <div className={`group p-6 rounded-3xl shadow-md border transition-all duration-300 relative overflow-hidden ${liquidCash >= 0
                ? "bg-gradient-to-br from-indigo-50/90 via-sky-50/80 to-blue-50/90 border-indigo-100 text-indigo-950 shadow-indigo-100/50"
                : "bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-rose-50/90 border-rose-100 text-rose-950 shadow-rose-100/50"
                }`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full transition-all group-hover:scale-110"></div>
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-white text-indigo-600 rounded-2xl border border-indigo-100 shadow-xs">
                    <Landmark className="w-7 h-7 stroke-[2]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900/80 mb-0.5">
                      Liquidez Neta Tesorería
                    </p>
                    <p className="text-2xl lg:text-3xl font-black tracking-tight text-indigo-950">
                      S/ {liquidCash.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-indigo-700/80 font-medium mt-1">(Balance manual: Ingresos - Egresos)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* NOTA INFORMAL DE LIQUIDEZ */}
            <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 border border-amber-200/70 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <Info className="w-4 h-4 stroke-[2.5]" />
              </div>
              <p className="text-xs text-amber-900 font-medium leading-relaxed">
                <span className="font-black">Balance de Tesorería:</span> Refleja transacciones manuales (capital, préstamos y gastos de sede). La liquidez global de la empresa incluye además ventas POS e inventarios.
              </p>
            </div>

            {/* MAIN HISTORY TABLE SECTION */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-100/80 border border-slate-200/60 overflow-hidden">
              {/* FILTER BAR CONTAINER */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/40 space-y-4">
                {/* SELECTOR DE MODO: EXPEDIENTES FINANCIEROS (CON TRAZABILIDAD) VS CRONOGRAMA TOTAL */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
                  <div className="inline-flex p-1 bg-slate-200/80 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setFinanceViewMode("EXPEDIENTES");
                        setTxPage(1);
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        financeViewMode === "EXPEDIENTES"
                          ? "bg-white text-indigo-700 shadow-xs border border-indigo-100/60"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Expedientes Financieros (Con Trazabilidad)</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-extrabold uppercase border border-indigo-200/60">
                        Principal
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFinanceViewMode("ALL_TXS");
                        setTxPage(1);
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        financeViewMode === "ALL_TXS"
                          ? "bg-white text-indigo-700 shadow-xs border border-indigo-100/60"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>Cronograma Total (Todos los Movimientos)</span>
                    </button>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    {financeViewMode === "EXPEDIENTES" ? (
                      <span className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Operaciones de origen con auditoría interna de ajustes, saldo neto y trazabilidad
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Historial cronológico continuo de todos los movimientos de más reciente a más antiguo
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                      <FileText className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight">
                        Historial de Tesorería
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        {financeViewMode === "EXPEDIENTES"
                          ? "Expedientes consolidados por orden de origen reciente"
                          : "Cronograma continuo de movimientos"}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-xl shadow-xs">
                    {financeTree.length} {financeViewMode === "EXPEDIENTES" ? "expedientes encontrados" : "movimientos encontrados"}
                  </span>
                </div>

                {/* FILTERS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1">
                  {/* Search Input */}
                  <div className="md:col-span-4 flex items-center bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                    <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Buscar concepto o descripción..."
                      className="w-full text-xs font-semibold outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Type Segmented Control */}
                  <div className="md:col-span-3 flex bg-slate-100/80 border border-slate-200/60 rounded-2xl p-1 shadow-inner gap-1">
                    {(["ALL", "INCOME", "EXPENSE"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFilterType(t)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-black transition-all ${filterType === t
                          ? "bg-white text-indigo-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-700"
                          }`}
                      >
                        {t === "ALL" ? "Todos" : t === "INCOME" ? "Ingresos" : "Egresos"}
                      </button>
                    ))}
                  </div>

                  {/* Category Dropdown */}
                  <div className="md:col-span-2.5">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xs text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer truncate"
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

                  {/* Branch Dropdown — Only if business has multiple branches */}
                  {branches.length > 1 && (
                    <div className="md:col-span-2.5">
                      <select
                        value={filterBranch}
                        onChange={(e) => setFilterBranch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xs text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer truncate"
                      >
                        <option value="">Todas las Sedes (Consolidado)</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* BOTTOM FILTER ROW */}
                <div className="pt-2 border-t border-slate-200/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
                  <div className="flex gap-2">
                    <button
                      onClick={exportFinanceExcel}
                      className="px-4 py-2 text-xs font-black bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200/80 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
                    >
                      Exportar Excel
                    </button>
                    <button
                      onClick={exportFinancePdf}
                      className="px-4 py-2 text-xs font-black bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200/80 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
                    >
                      Exportar PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* HIGH-PRECISION REFACTORED TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                      <th className="py-4 px-6">Fecha</th>
                      <th className="py-4 px-6">Concepto & Clasificación</th>
                      <th className="py-4 px-4 text-center">Tipo</th>
                      <th className="py-4 px-4 text-center">Método / Doc.</th>
                      <th className="py-4 px-6 text-right">Monto (Soles)</th>
                      <th className="py-4 px-4 text-center">Estado</th>
                      <th className="py-4 px-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80 text-xs font-medium">
                    {financeTree.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 px-6 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                            <div className="p-4 bg-slate-50 text-slate-300 rounded-3xl">
                              <Vault className="w-10 h-10 stroke-[1.5]" />
                            </div>
                            <p className="text-sm font-bold text-slate-700">No hay movimientos registrados</p>
                            <p className="text-xs text-slate-400 font-medium">
                              {transactions.length === 0
                                ? "No has registrado ingresos o egresos de tesorería aún."
                                : "No existen registros que coincidan con los filtros aplicados."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      financeTree
                        .slice((txPage - 1) * txPageSize, txPage * txPageSize)
                        .map((item) => {
                          const t = item.root;
                          const isExpanded = !!expandedFinanceTxIds[t.id];
                          const hasAuditOrAdjustments =
                            item.adjustments.length > 0 ||
                            !!t.cashShiftId ||
                            t.name === "Cierre de Caja" ||
                            t.description?.includes("[BITÁCORA DE AJUSTE");

                          return (
                            <Fragment key={t.id}>
                              <tr className="hover:bg-indigo-50/20 transition-colors group">
                                {/* Fecha */}
                                <td className="py-4 px-6 whitespace-nowrap text-slate-600 font-bold">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/60 shadow-xs">
                                      <Calendar className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-black text-slate-800">
                                        {formatPeruDate(t.date)}
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                        Fecha de Pago
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Concepto & Clasificación */}
                                <td className="py-4 px-6 max-w-sm">
                                  <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                        {t.name || t.description || "Movimiento Financiero"}
                                      </p>
                                      {t.name === "Cierre de Caja" && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                          🔒 Cierre de Turno
                                        </span>
                                      )}
                                      {(t.name?.includes("Ajuste") || t.description?.includes("[BITÁCORA DE AJUSTE")) && (
                                        <span
                                          className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                            t.description?.includes("MODIFICADO")
                                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                                              : "bg-rose-50 text-rose-700 border border-rose-200"
                                          }`}
                                        >
                                          {t.description?.includes("MODIFICADO")
                                            ? "✏️ Ajuste: Modificado"
                                            : "🔻 Ajuste: Anulado / Baja"}
                                        </span>
                                      )}
                                      {hasAuditOrAdjustments && (
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandFinance(t.id)}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                            isExpanded
                                              ? "bg-indigo-600 text-white shadow-xs"
                                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                                          }`}
                                          title={isExpanded ? "Ocultar trazabilidad y ajustes" : "Ver trazabilidad, saldo neto y cronología"}
                                        >
                                          <Search className="w-3 h-3" />
                                          <span>{item.timeline.length > 1 ? `${item.timeline.length} eventos` : "Trazabilidad"}</span>
                                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                                        {t.category?.name || "Sin Categoría"}
                                      </span>
                                      {branches.length > 1 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                          <Building2 className="w-2.5 h-2.5 text-indigo-400" />
                                          {t.branch?.name || "Sede Principal"}
                                        </span>
                                      )}
                                    </div>
                                    {t.description && t.description !== t.name && (
                                      <p
                                        className={`text-[10px] font-medium leading-relaxed rounded-lg p-1.5 ${
                                          t.description.includes("[BITÁCORA DE AJUSTE")
                                            ? "bg-rose-50/70 text-rose-850 border border-rose-200/60 font-semibold"
                                            : "text-slate-400 bg-slate-50/60"
                                        }`}
                                      >
                                        {t.description}
                                      </p>
                                    )}
                                  </div>
                                </td>

                                {/* Tipo */}
                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                      t.type === "INCOME"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                        : "bg-rose-50 text-rose-700 border border-rose-100"
                                    }`}
                                  >
                                    {t.type === "INCOME" ? (
                                      <>
                                        <ArrowUpRight className="w-3 h-3 stroke-[3]" /> Ingreso
                                      </>
                                    ) : (
                                      <>
                                        <ArrowDownRight className="w-3 h-3 stroke-[3]" /> Egreso
                                      </>
                                    )}
                                  </span>
                                </td>

                                {/* Método & Comprobante */}
                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {paymentLabel[t.paymentMethod] || t.paymentMethod}
                                    </span>
                                    {t.receiptUrl ? (
                                      <a
                                        href={getReceiptAbsoluteUrl(t.receiptUrl) || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline"
                                      >
                                        <Paperclip className="w-3 h-3" /> Ver Adjunto
                                      </a>
                                    ) : (
                                      <span className="text-[9px] text-slate-300 font-medium">Sin adjunto</span>
                                    )}
                                  </div>
                                </td>

                                {/* Monto (Soles) & USD con balance neto */}
                                <td className="py-4 px-6 text-right whitespace-nowrap">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {item.adjustments.length > 0 && (
                                        <span className="text-[10px] text-slate-400 line-through font-bold">
                                          S/ {item.origAmountSoles.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                        </span>
                                      )}
                                      <p
                                        className={`text-sm font-black ${
                                          t.type === "INCOME"
                                            ? item.netAmount > 0.009
                                              ? "text-emerald-600"
                                              : "text-slate-400 line-through"
                                            : "text-rose-600"
                                        }`}
                                      >
                                        {t.type === "INCOME" ? "+" : "-"} S/{" "}
                                        {item.netAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                    {item.adjustments.length > 0 && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md">
                                        Ajustes: -S/ {item.totalAdjSoles.toFixed(2)}
                                      </span>
                                    )}
                                    {t.currency === "USD" && (
                                      <p className="text-[10px] text-slate-400 font-bold">
                                        ${t.amount.toFixed(2)} (TC: {t.exchangeRate || 1})
                                      </p>
                                    )}
                                  </div>
                                </td>

                                {/* Estado Contable */}
                                <td className="py-4 px-4 text-center whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                      item.statusType === "LIQUIDADO"
                                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                                        : item.statusType === "MODIFICADO"
                                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                                          : t.status === "CANCELLED"
                                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                                            : t.status === "PENDING"
                                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    }`}
                                  >
                                    {item.statusType === "LIQUIDADO"
                                      ? "Liquidado / Anulado"
                                      : item.statusType === "MODIFICADO"
                                        ? "Modificado"
                                        : t.status === "CANCELLED"
                                          ? "Anulado"
                                          : t.status === "PENDING"
                                            ? "Pendiente"
                                            : "Finalizado"}
                                  </span>
                                </td>

                                {/* Acciones */}
                                <td className="py-4 px-6 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    {(() => {
                                      const matchPurchase = t.description?.match(/Pedido de Compra\. ID:\s*([a-fA-F0-9-]+)/);
                                      const purchaseOrderId = matchPurchase ? matchPurchase[1] : null;

                                      if (purchaseOrderId) {
                                        if (t.status === "CANCELLED") {
                                          return <span className="text-xs text-slate-300 font-bold">—</span>;
                                        }
                                        return (
                                          <button
                                            onClick={() => {
                                              setOrderToCancel({ id: purchaseOrderId, txId: t.id });
                                              setIsCancelOrderConfirmOpen(true);
                                            }}
                                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            title="Cancelar Compra (Anula el egreso)"
                                          >
                                            <XCircle className="w-4 h-4" />
                                          </button>
                                        );
                                      }

                                      return (
                                        <>
                                          {(t.cashShiftId ||
                                            t.name === "Cierre de Caja" ||
                                            t.description?.includes("[BITÁCORA DE AJUSTE")) && (
                                            <button
                                              onClick={() => handleOpenAudit(t)}
                                              className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-all"
                                              title="Ver Bitácora de Auditoría y Trazabilidad Legal"
                                            >
                                              <Search className="w-4 h-4" />
                                            </button>
                                          )}
                                          {t.status !== "CANCELLED" && (
                                            <>
                                              <button
                                                onClick={() => handleEditClick(t)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Editar movimiento"
                                              >
                                                <Edit className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setTxIdToConfirm(t.id);
                                                  setIsRevertConfirmOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
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
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            title="Eliminar permanentemente"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </td>
                              </tr>

                              {/* CAJÓN DESPLEGABLE DE TRAZABILIDAD (2 PANELES EJECUTIVOS) */}
                              {isExpanded && (
                                <tr className="bg-slate-50/80 border-t border-b border-indigo-100">
                                  <td colSpan={7} className="p-4 sm:p-5">
                                    <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm space-y-4">
                                      {/* Header del Cajón */}
                                      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                                            <ShieldCheck className="w-4 h-4" />
                                          </span>
                                          <div>
                                            <span className="text-xs font-black text-indigo-950 block">
                                              Expediente de Tesorería & Trazabilidad Contable
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                              Concepto: {t.name || t.description || "Movimiento"} • Fecha: {formatPeruDate(t.date)}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                                            item.statusType === "LIQUIDADO"
                                              ? "bg-rose-50 text-rose-700 border-rose-200"
                                              : item.statusType === "MODIFICADO"
                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          }`}>
                                            {item.statusType === "LIQUIDADO" ? "Liquidado a Cero" : item.statusType === "MODIFICADO" ? "Saldo Modificado" : "Operación Vigente"}
                                          </span>
                                          {(t.cashShiftId || t.name === "Cierre de Caja" || t.description?.includes("[BITÁCORA DE AJUSTE")) && (
                                            <button
                                              type="button"
                                              onClick={() => handleOpenAudit(t)}
                                              className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                            >
                                              <Search className="w-3 h-3" />
                                              <span>Auditoría Legal Completa</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* 2 PANELES EJECUTIVOS */}
                                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                        {/* PANEL IZQUIERDO: Resumen Financiero y Balance de Liquidación */}
                                        <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl p-3.5 border border-indigo-50 space-y-3">
                                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                            <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>Conciliación Financiera</span>
                                          </div>

                                          <div className="space-y-2 bg-white rounded-lg p-3 border border-slate-200/70 text-xs">
                                            <div className="flex justify-between items-center text-slate-600">
                                              <span className="text-[11px]">Importe Original:</span>
                                              <span className="font-bold text-slate-900">
                                                S/ {item.origAmountSoles.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-rose-600">
                                              <span className="text-[11px]">Total Deducciones / Ajustes:</span>
                                              <span className="font-bold">
                                                {item.totalAdjSoles > 0 ? `- S/ ${item.totalAdjSoles.toLocaleString("es-PE", { minimumFractionDigits: 2 })}` : "S/ 0.00"}
                                              </span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                                              <span className="font-extrabold text-slate-800 text-[11px]">Saldo Líquido Vigente:</span>
                                              <span className={`text-sm font-black ${item.netAmount > 0.009 ? "text-emerald-700" : "text-rose-600"}`}>
                                                S/ {item.netAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                          </div>

                                          <p className="text-[10px] text-slate-500 leading-relaxed">
                                            {item.statusType === "LIQUIDADO"
                                              ? "Esta operación fue compensada en su totalidad por notas de crédito o cancelaciones formales. No suma como gasto operativo ni genera distorsión en la liquidez."
                                              : item.statusType === "MODIFICADO"
                                                ? "Esta operación tiene ajustes contables aplicados. Solo el saldo vigente de S/ " + item.netAmount.toFixed(2) + " computa en el balance real."
                                                : "Operación financiera regular sin deducciones ni notas de ajuste aplicadas."}
                                          </p>
                                        </div>

                                        {/* PANEL DERECHO: Cronología de Trazabilidad (Del Más Antiguo al Más Reciente) */}
                                        <div className="lg:col-span-7 bg-white rounded-xl p-3.5 border border-slate-200/70 space-y-3">
                                          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                            <div className="flex items-center gap-1.5">
                                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                              <span>Secuencia Cronológica de Movimientos</span>
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-400">
                                              (Origen ➔ Ajustes)
                                            </span>
                                          </div>

                                          <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100">
                                            {item.timeline.map((txItem: any, idx: number) => {
                                              const isRootTx = txItem.id === t.id;
                                              const txSoles = txItem.currency === "USD" ? txItem.amount * (txItem.exchangeRate || 1) : txItem.amount;
                                              return (
                                                <div key={txItem.id || idx} className="relative flex items-start gap-2.5 text-xs">
                                                  <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 border-2 ${
                                                    isRootTx
                                                      ? "bg-indigo-600 border-white ring-2 ring-indigo-200"
                                                      : "bg-amber-500 border-white ring-2 ring-amber-200"
                                                  }`} />
                                                  <div className="flex-1 bg-slate-50/70 hover:bg-slate-50 rounded-lg p-2 border border-slate-100 transition-colors">
                                                    <div className="flex flex-wrap items-center justify-between gap-1">
                                                      <div className="flex items-center gap-1.5">
                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                                          isRootTx ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-800"
                                                        }`}>
                                                          {isRootTx ? "1. Registro de Origen" : `${idx + 1}. Movimiento de Ajuste`}
                                                        </span>
                                                        <span className="font-bold text-slate-800">
                                                          {txItem.name || txItem.description || "Movimiento"}
                                                        </span>
                                                      </div>
                                                      <span className={`font-black ${
                                                        txItem.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                                                      }`}>
                                                        {txItem.type === "INCOME" ? "+" : "-"} S/ {txSoles.toFixed(2)}
                                                      </span>
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                                                      <span>{formatPeruDate(txItem.date)}</span>
                                                      {txItem.description && txItem.description !== txItem.name && (
                                                        <span className="text-slate-600 truncate max-w-xs">
                                                          • {txItem.description}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {financeTree.length > 0 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                  <Pagination
                    currentPage={txPage}
                    totalItems={financeTree.length}
                    pageSize={txPageSize}
                    onPageChange={(p) => setTxPage(p)}
                    onPageSizeChange={(s) => { setTxPageSize(s); setTxPage(1); }}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* AI ADVISOR */}
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

      {/* MODAL REGISTRAR / EDITAR */}
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
            date: "",
            currency: "PEN",
            exchangeRate: 1,
            branchId: "",
            justified: false,
            programmed: false,
          });
        }}
        title={
          editingTransaction
            ? (type === "INCOME" ? "Editar Ingreso de Tesorería" : "Editar Gasto Operativo")
            : (type === "INCOME" ? "Registrar Inyección de Capital" : "Registrar Gasto Operativo")
        }
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Classification, Branch, and Switches */}
            <div className={`p-5 rounded-[2.5rem] border space-y-5 shadow-sm ${type === "INCOME"
              ? "bg-emerald-50/20 border-emerald-100/40"
              : "bg-rose-50/20 border-rose-100/40"
              }`}>
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100/10">
                <div className={`p-1.5 rounded-xl ${type === "INCOME" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                  }`}>
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${type === "INCOME" ? "text-emerald-900" : "text-rose-900"
                  }`}>
                  Clasificación & Ubicación
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Título del Movimiento <span className="text-gray-300 font-medium normal-case">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 transition-all text-sm font-bold text-gray-700 shadow-sm ${type === "INCOME" ? "focus:ring-emerald-500/10 focus:border-emerald-500" : "focus:ring-rose-500/10 focus:border-rose-500"
                    }`}
                  placeholder={
                    type === "INCOME"
                      ? "Ej. Préstamo Reactiva, Aporte Socio A"
                      : "Ej. Alquiler Local, Pago Luz, Sueldo Empleado"
                  }
                />
              </div>

              {/* Branch Selector — Only if business has multiple branches */}
              {branches.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Sede / Sucursal
                  </label>
                  <div className="relative">
                    <select
                      value={formData.branchId || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, branchId: e.target.value })
                      }
                      className={`w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 transition-all text-sm font-bold text-gray-700 appearance-none shadow-sm cursor-pointer ${type === "INCOME" ? "focus:ring-emerald-500/10 focus:border-emerald-500" : "focus:ring-rose-500/10 focus:border-rose-500"
                        }`}
                    >
                      <option value="">Sede Principal</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-300 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Categoría
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className={`w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 transition-all text-sm font-bold text-gray-700 appearance-none shadow-sm cursor-pointer ${type === "INCOME" ? "focus:ring-emerald-500/10 focus:border-emerald-500" : "focus:ring-rose-500/10 focus:border-rose-500"
                      }`}
                  >
                    <option value="">Selecciona una categoría...</option>
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-300 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {filteredCategories.length === 0 && (
                  <p className="text-xs text-rose-500 mt-1 font-bold">
                    No tienes categorías de este tipo. Debes crear una primero en el módulo de Categorías.
                  </p>
                )}
              </div>

              {subcategories.length > 0 && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Subcategoría (Opcional)
                  </label>
                  <div className="relative">
                    <select
                      value={formData.subCategoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, subCategoryId: e.target.value })
                      }
                      className={`w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 transition-all text-sm font-bold text-gray-700 appearance-none shadow-sm cursor-pointer ${type === "INCOME" ? "focus:ring-emerald-500/10 focus:border-emerald-500" : "focus:ring-rose-500/10 focus:border-rose-500"
                        }`}
                    >
                      <option value="">Selecciona una subcategoría...</option>
                      {subcategories.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-300 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Fecha de Pago Efectuado */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Fecha de Pago / Operación Efectuada (Límite: Hoy)
                </label>
                <input
                  required
                  type="date"
                  max={getPeruTodayInputStr()}
                  value={formData.date}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val > getPeruTodayInputStr()) {
                      toast.error("No se permiten fechas futuras para operaciones de tesorería. Si es a futuro, corresponde a Cuentas por Cobrar o Cuentas por Pagar (Pendientes).");
                      return;
                    }
                    setFormData({ ...formData, date: val });
                  }}
                  className={`w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 transition-all text-sm font-bold text-gray-700 shadow-sm ${type === "INCOME"
                    ? "focus:ring-emerald-500/10 focus:border-emerald-500"
                    : "focus:ring-rose-500/10 focus:border-rose-500"
                    }`}
                />
                <p className="text-[10px] text-gray-400 font-medium ml-1">
                  * Registra la fecha en que se efectuó el pago (hasta hoy). Operaciones futuras deben registrarse en Pendientes.
                </p>
              </div>

              {/* Flags/Switches Group */}
              <div className="bg-white/40 p-4 rounded-2xl border border-white/60 space-y-3 shadow-inner">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      className={`w-4 h-4 transition-colors ${formData.justified ? "text-emerald-500" : "text-gray-300"}`}
                    />
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${formData.justified ? "text-emerald-700" : "text-gray-400"}`}>
                        Gasto Justificado
                      </span>
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tight">Tiene sustento o comprobante</span>
                    </div>
                  </div>
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
                    <div className="w-9 h-5 bg-gray-200/80 rounded-full peer peer-checked:bg-emerald-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full shadow-sm"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <Clock
                      className={`w-4 h-4 transition-colors ${formData.programmed ? "text-amber-500" : "text-gray-300"}`}
                    />
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${formData.programmed ? "text-amber-700" : "text-gray-400"}`}>
                        Gasto Programado
                      </span>
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tight">Es un pago programado/futuro</span>
                    </div>
                  </div>
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
                    <div className="w-9 h-5 bg-gray-200/80 rounded-full peer peer-checked:bg-amber-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full shadow-sm"></div>
                  </div>
                </label>
              </div>
            </div>

            {/* Right Column: Financial Details and Receipt */}
            <div className="bg-indigo-50/20 p-5 rounded-[2.5rem] border border-indigo-100/40 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100/10">
                <div className="p-1.5 bg-indigo-100 rounded-xl text-indigo-600">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                  Detalles Financieros
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Moneda
                  </label>
                  <div className="relative">
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
                      className="w-full px-3 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="PEN">PEN</option>
                      <option value="USD">USD</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>


                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
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
                    className={`w-full px-3 py-3 border rounded-xl outline-none focus:ring-4 transition-all text-sm font-black shadow-sm ${formData.currency === "USD"
                      ? "bg-blue-50 border-blue-200 text-blue-700 focus:ring-blue-500/10 focus:border-blue-500"
                      : "bg-gray-50 border-gray-100 text-gray-400"
                      }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
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
                    className={`w-full px-3 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 transition-all text-sm font-black shadow-sm ${type === "INCOME" ? "focus:ring-emerald-500/10 focus:border-emerald-500" : "focus:ring-rose-500/10 focus:border-rose-500"
                      }`}
                  />
                </div>
              </div>

              {/* Payment Method Selector Grid */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "CASH", label: "Efectivo" },
                    { id: "TRANSFER", label: "Transf." },
                    { id: "CARD", label: "Tarjeta" },
                    { id: "YAPE", label: "Yape/Plin" },
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
                      className={`py-3 rounded-2xl text-[9px] font-black uppercase tracking-tighter border transition-all ${formData.paymentMethod === method.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200/50 scale-[1.03]"
                        : "bg-white text-gray-400 border-gray-100 hover:border-indigo-200 hover:text-gray-600"
                        }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold text-gray-700 shadow-sm resize-none"
                  rows={2}
                  placeholder="Detalles adicionales del movimiento..."
                ></textarea>
              </div>
            </div>
          </div>

          {/* Comprobante de Pago Uploader */}
          <div className="bg-gray-50/30 p-5 rounded-[2.5rem] border border-gray-100/60 shadow-sm">
            <ImageUploader
              currentImageUrl={formData.receiptUrl}
              onUploadSuccess={(url) => setFormData({ ...formData, receiptUrl: url })}
              onClear={() => setFormData({ ...formData, receiptUrl: null })}
              label="Comprobante de Pago / Factura"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
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
                  date: "",
                  currency: "PEN",
                  exchangeRate: 1,
                  branchId: "",
                  justified: false,
                  programmed: false,
                });
              }}
              className="px-6 py-3 bg-slate-50 text-slate-500 font-black uppercase tracking-wider text-xs rounded-xl hover:bg-slate-100 border border-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={filteredCategories.length === 0}
              className={`px-6 py-3 text-white font-black uppercase tracking-wider text-xs rounded-xl transition-all shadow-md ${type === "INCOME"
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/50 hover:shadow-lg hover:shadow-emerald-200"
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-200/50 hover:shadow-lg hover:shadow-rose-200"
                }`}
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

      <ConfirmModal
        isOpen={isCancelOrderConfirmOpen}
        onClose={() => {
          setIsCancelOrderConfirmOpen(false);
          setOrderToCancel(null);
        }}
        onConfirm={async () => {
          if (orderToCancel) {
            const t = toast.loading("Cancelando compra...");
            try {
              await cancelPurchaseOrderRequest(orderToCancel.id);
              toast.dismiss(t);
              toast.success("Compra cancelada. El egreso de tesorería ha sido anulado.");
              setIsCancelOrderConfirmOpen(false);
              setOrderToCancel(null);
              loadData();
            } catch (err: any) {
              toast.dismiss(t);
              toast.error(err?.response?.data?.message || "Error al cancelar compra");
            }
          }
        }}
        title="¿Cancelar esta compra?"
        message="¿Estás seguro de que deseas cancelar esta compra? Se anulará el egreso en la Tesorería y el monto de dinero retornará a tu liquidez total. Esta acción no se puede deshacer."
        confirmText="Sí, Cancelar Compra"
        cancelText="No, Mantener"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showLiquidityWarning}
        onClose={() => setShowLiquidityWarning(false)}
        onConfirm={async () => {
          setShowLiquidityWarning(false);
          if (pendingAction) {
            await pendingAction();
          }
        }}
        title="Saldo Insuficiente"
        message="No tienes saldo para esto, si das en continuar, tu saldo será negativo y estarás registrando, ¿deseas continuar?"
        confirmText="Sí, continuar"
        cancelText="Cancelar"
        variant="warning"
        buttonIcon={<AlertCircle className="w-5 h-5" />}
      />

      {/* Modal de Diagnóstico y Errores del Sistema */}
      <SystemErrorModal
        isOpen={Boolean(systemError)}
        onClose={() => setSystemError(null)}
        error={systemError}
      />

      {/* MODAL: BITÁCORA DE AUDITORÍA DE TESORERÍA & CAJA */}
      <Modal
        isOpen={selectedAuditTx !== null}
        onClose={() => {
          setSelectedAuditTx(null);
          setShiftAuditData(null);
        }}
        title="🔍 Bitácora de Auditoría de Tesorería & Caja"
        maxWidth="max-w-2xl"
      >
        {loadingAudit ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Clock className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="font-bold text-sm">Cargando bitácora y registros vinculados...</span>
          </div>
        ) : selectedAuditTx ? (
          <div className="space-y-5 text-xs text-slate-700">
            {/* Header del movimiento de tesorería */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-slate-900">
                  {selectedAuditTx.name}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                    selectedAuditTx.type === "INCOME"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-rose-50 text-rose-700 border border-rose-100"
                  }`}
                >
                  {selectedAuditTx.type === "INCOME" ? "+ Ingreso" : "- Egreso"} S/{" "}
                  {Number(selectedAuditTx.amount).toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                📅 Fecha de registro en tesorería: {formatPeruDate(selectedAuditTx.date)}
              </p>
              {selectedAuditTx.description && (
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 text-[11px] leading-relaxed">
                  📜 {selectedAuditTx.description}
                </div>
              )}
            </div>

            {/* Turno de Caja vinculado */}
            {shiftAuditData?.shift && (
              <div className="space-y-3">
                <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Turno de Caja Vinculado (#{shiftAuditData.shift.id.slice(0, 8)})
                </h4>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 bg-slate-100/70 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Fondo Base</span>
                    <span className="font-black text-slate-800 text-xs">
                      S/ {Number(shiftAuditData.shift.initialBalance || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                    <span className="text-[10px] font-bold text-blue-500 uppercase block">Total Ventas</span>
                    <span className="font-black text-blue-700 text-xs">
                      S/ {Number(shiftAuditData.shift.totalSales || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase block">Balance Final</span>
                    <span className="font-black text-emerald-700 text-xs">
                      S/ {Number(shiftAuditData.shift.finalBalance || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Movimientos de Tesorería Vinculados a este Turno */}
                {shiftAuditData.transactions && shiftAuditData.transactions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                      Movimientos Registrados en Tesorería para este Turno ({shiftAuditData.transactions.length})
                    </h5>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {shiftAuditData.transactions.map((txItem: any) => (
                        <div
                          key={txItem.id}
                          className={`p-2.5 flex items-center justify-between text-[11px] ${
                            txItem.id === selectedAuditTx.id
                              ? "bg-indigo-50/50 font-bold"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-0.5 max-w-[340px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-800">{txItem.name}</span>
                              <span className="text-[9px] text-slate-400">
                                {formatPeruDate(txItem.date)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">
                              {txItem.description}
                            </p>
                          </div>
                          <span
                            className={`font-black ${
                              txItem.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {txItem.type === "INCOME" ? "+" : "-"} S/{" "}
                            {Number(txItem.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ventas Vinculadas y su estado */}
                {shiftAuditData.sales && shiftAuditData.sales.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                      Ventas del Turno y Estado Legal SUNAT ({shiftAuditData.sales.length})
                    </h5>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {shiftAuditData.sales.map((s: any) => {
                        const isCancelled =
                          s.billingStatus === "CANCELLED" ||
                          s.fiscalDocument?.status === "CANCELLED";
                        return (
                          <div
                            key={s.id}
                            className={`p-2 flex items-center justify-between text-[11px] ${
                              isCancelled ? "bg-rose-50/40 line-through opacity-80" : ""
                            }`}
                          >
                            <div className="space-y-0.5 truncate max-w-[320px]">
                              <span className="font-semibold text-slate-800">
                                {s.billingSerie && s.billingNumber
                                  ? `${s.billingType || "Comprobante"} ${s.billingSerie}-${String(s.billingNumber).padStart(8, "0")}`
                                  : s.code || "Venta POS"}
                              </span>
                              {isCancelled && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700 not-italic no-underline">
                                  ANULADA
                                </span>
                              )}
                            </div>
                            <span
                              className={`font-bold ${
                                isCancelled ? "text-rose-500 line-through" : "text-slate-800"
                              }`}
                            >
                              S/ {Number(s.amount).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedAuditTx(null);
                  setShiftAuditData(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cerrar Bitácora
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </Appshell>
  );
}
