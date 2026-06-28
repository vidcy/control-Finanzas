import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import { Lock, Unlock, History, DollarSign, Eye, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Modal from "../components/ui/Modal";
import { useAuth } from "../auth/AuthContext";
import {
  openCashShiftRequest,
  closeCashShiftRequest,
  getActiveCashShiftRequest,
  getCashShiftHistoryRequest,
  getCashShiftDetailsRequest,
} from "../services/cash-shift.api";
import { getBranchesRequest } from "../services/branch.api";
import { listCategoriesRequest } from "../services/category.api";
import { getWorkersRequest } from "../services/user.api";

export default function BusinessCashRegisterPage() {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number | "">("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");

  // Filters State
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterWorkerId, setFilterWorkerId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Shift Details Modal State
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [shiftDetails, setShiftDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modal confirm close shift states
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [closeCategoryId, setCloseCategoryId] = useState("");
  const [closeSubCategoryId, setCloseSubCategoryId] = useState("");

  const loadInitialData = async () => {
    try {
      const [branchList, catList, workerList] = await Promise.all([
        getBranchesRequest().catch(() => []),
        listCategoriesRequest().catch(() => []),
        getWorkersRequest().catch(() => []),
      ]);
      setBranches(branchList);
      setWorkers(workerList);

      const allExpenseCats = catList.filter(
        (c: any) => c.type === "EXPENSE" && !c.parentId
      );
      setCategories(allExpenseCats);

      // Default category
      if (allExpenseCats.length > 0) {
        const priority = allExpenseCats.find(
          (c: any) =>
            c.name.toLowerCase().includes("negocio") &&
            c.name.toLowerCase().includes("egreso")
        ) || allExpenseCats.find(
          (c: any) =>
            c.name.toLowerCase().includes("negocio") ||
            c.name.toLowerCase().includes("gasto")
        ) || allExpenseCats[0];
        
        setSelectedCategoryId(priority.id);
        const subCaja = priority.children?.find((s: any) =>
          s.name.toLowerCase().includes("caja")
        );
        setSelectedSubCategoryId(subCaja ? subCaja.id : (priority.children?.[0]?.id || ""));
      }

      const allIncomeCats = catList.filter(
        (c: any) => c.type === "INCOME" && !c.parentId
      );
      setIncomeCategories(allIncomeCats);

      // Default close category
      if (allIncomeCats.length > 0) {
        const priority = allIncomeCats.find(
          (c: any) =>
            c.name.toLowerCase().includes("negocio") &&
            c.name.toLowerCase().includes("ingreso")
        ) || allIncomeCats.find(
          (c: any) =>
            c.name.toLowerCase().includes("negocio") ||
            c.name.toLowerCase().includes("ingreso")
        ) || allIncomeCats[0];
        
        setCloseCategoryId(priority.id);
        const subCaja = priority.children?.find((s: any) =>
          s.name.toLowerCase().includes("caja")
        );
        setCloseSubCategoryId(subCaja ? subCaja.id : (priority.children?.[0]?.id || ""));
      }

      // Default branch
      if (branchList.length > 0) {
        setSelectedBranchId(branchList[0].id);
      }
    } catch (err) {
      console.error("Error loading initial cash shift setup data", err);
    }
  };

  const loadActiveShiftAndHistory = async () => {
    try {
      const active = await getActiveCashShiftRequest().catch(() => null);
      setActiveShift(active || null);
      await loadHistory(currentPage);
    } catch {
      toast.error("Error al cargar estado de la caja");
    }
  };

  const loadHistory = async (page: number) => {
    setLoadingHistory(true);
    try {
      const params = {
        page,
        limit: 10,
        branchId: filterBranchId || undefined,
        workerId: filterWorkerId || undefined,
        startDate: filterStartDate ? `${filterStartDate}T00:00:00.000Z` : undefined,
        endDate: filterEndDate ? `${filterEndDate}T23:59:59.999Z` : undefined,
      };
      const res = await getCashShiftHistoryRequest(params);
      setHistory(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch {
      toast.error("Error al cargar historial");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadInitialData();
      await loadActiveShiftAndHistory();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadHistory(currentPage);
    }
  }, [currentPage, filterBranchId, filterWorkerId, filterStartDate, filterEndDate]);

  const exportHistoryExcel = async () => {
    if (history.length === 0) {
      toast.error("No hay historial de turnos para exportar");
      return;
    }
    const XLSX = await import("xlsx");
    const dataToExport = history.map(shift => ({
      "Apertura": format(new Date(shift.openedAt), "yyyy-MM-dd HH:mm"),
      "Cierre": shift.closedAt ? format(new Date(shift.closedAt), "yyyy-MM-dd HH:mm") : "Abierta",
      "Sede": shift.branch?.name || "Matriz",
      "Vendedor": shift.user ? `${shift.user.name} ${shift.user.lastName || ""}`.trim() : "N/A",
      "Monto Inicial (S/)": shift.initialBalance,
      "Ventas (S/)": shift.totalSales || 0,
      "Monto Final (S/)": shift.finalBalance || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Turnos");
    XLSX.writeFile(workbook, "Historial_Turnos_Caja.xlsx");
    toast.success("Historial de turnos exportado a Excel");
  };

  const exportHistoryPdf = async () => {
    if (history.length === 0) {
      toast.error("No hay historial de turnos para exportar");
      return;
    }
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF("p", "mm", "a4");
    const businessName = user?.businessName || "Control Finanzas";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`HISTORIAL DE TURNOS DE CAJA - ${businessName.toUpperCase()}`, 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 14, 26);

    let y = 35;
    doc.setFillColor(79, 70, 229);
    doc.rect(14, y, 182, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255);
    doc.text("Apertura", 16, y + 5);
    doc.text("Cierre", 48, y + 5);
    doc.text("Sede", 80, y + 5);
    doc.text("Vendedor", 105, y + 5);
    doc.text("M. Inicial", 135, y + 5);
    doc.text("Ventas", 155, y + 5);
    doc.text("M. Final", 175, y + 5);

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    history.forEach((shift) => {
      y += 8;
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFillColor(79, 70, 229);
        doc.rect(14, y, 182, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255);
        doc.text("Apertura", 16, y + 5);
        doc.text("Cierre", 48, y + 5);
        doc.text("Sede", 80, y + 5);
        doc.text("Vendedor", 105, y + 5);
        doc.text("M. Inicial", 135, y + 5);
        doc.text("Ventas", 155, y + 5);
        doc.text("M. Final", 175, y + 5);

        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        y += 8;
      }

      const opened = format(new Date(shift.openedAt), "dd/MM HH:mm");
      const closed = shift.closedAt ? format(new Date(shift.closedAt), "dd/MM HH:mm") : "Abierta";
      const branchName = (shift.branch?.name || "Matriz").substring(0, 12);
      const seller = shift.user ? `${shift.user.name} ${shift.user.lastName || ""}`.substring(0, 15).trim() : "N/A";
      const initBal = shift.initialBalance || 0;
      const salesVal = shift.totalSales || 0;
      const finalBal = shift.finalBalance || 0;

      doc.text(opened, 16, y + 5);
      doc.text(closed, 48, y + 5);
      doc.text(branchName, 80, y + 5);
      doc.text(seller, 105, y + 5);
      doc.text(`S/ ${initBal.toFixed(2)}`, 135, y + 5);
      doc.text(`S/ ${salesVal.toFixed(2)}`, 155, y + 5);
      doc.text(`S/ ${finalBal.toFixed(2)}`, 175, y + 5);
    });

    doc.save("Historial_Cierres_Caja.pdf");
    toast.success("Historial exportado a PDF");
  };

  const exportShiftDetailsExcel = async () => {
    if (!shiftDetails || shiftDetails.sales.length === 0) {
      toast.error("No hay ventas para exportar en este turno");
      return;
    }
    const XLSX = await import("xlsx");
    const dataToExport = shiftDetails.sales.map((sale: any) => ({
      "Hora": format(new Date(sale.date), "HH:mm:ss"),
      "Concepto / Descripción": sale.description || "",
      "Método de Pago": sale.paymentMethod || "CASH",
      "Monto (S/)": sale.amount || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas Turno");
    XLSX.writeFile(workbook, `Ventas_Turno_${shiftDetails.shift.id}.xlsx`);
    toast.success("Ventas del turno exportadas a Excel");
  };

  const exportShiftDetailsPdf = async () => {
    if (!shiftDetails || shiftDetails.sales.length === 0) {
      toast.error("No hay ventas para exportar en este turno");
      return;
    }
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF("p", "mm", "a4");
    const businessName = user?.businessName || "Control Finanzas";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`DETALLE DE VENTAS - CAJA ${shiftDetails.shift.branch?.name || "MATRIZ"} (${businessName.toUpperCase()})`, 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Vendedor: ${shiftDetails.shift.user ? `${shiftDetails.shift.user.name} ${shiftDetails.shift.user.lastName || ""}` : "N/A"}`, 14, 26);
    doc.text(`Apertura: ${format(new Date(shiftDetails.shift.openedAt), "dd/MM/yyyy HH:mm:ss")}`, 14, 31);
    doc.text(`Cierre: ${shiftDetails.shift.closedAt ? format(new Date(shiftDetails.shift.closedAt), "dd/MM/yyyy HH:mm:ss") : "Abierta"}`, 14, 36);

    let y = 45;
    doc.setFillColor(79, 70, 229);
    doc.rect(14, y, 182, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255);
    doc.text("Hora", 16, y + 5);
    doc.text("Descripción / Productos", 45, y + 5);
    doc.text("Método", 145, y + 5);
    doc.text("Monto", 165, y + 5);

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    shiftDetails.sales.forEach((sale: any) => {
      y += 8;
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFillColor(79, 70, 229);
        doc.rect(14, y, 182, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255);
        doc.text("Hora", 16, y + 5);
        doc.text("Descripción / Productos", 45, y + 5);
        doc.text("Método", 145, y + 5);
        doc.text("Monto", 165, y + 5);

        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        y += 8;
      }

      doc.text(format(new Date(sale.date), "HH:mm:ss"), 16, y + 5);
      doc.text((sale.description || "").replace("Venta en POS: ", "").substring(0, 45), 45, y + 5);
      doc.text(sale.paymentMethod || "CASH", 145, y + 5);
      doc.text(`S/ ${Number(sale.amount).toFixed(2)}`, 165, y + 5);
    });

    doc.save(`Detalle_Caja_${shiftDetails.shift.id}.pdf`);
    toast.success("Detalle de turno exportado a PDF");
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initialBalance === "" || initialBalance < 0) {
      toast.error("Ingresa un monto válido inicial");
      return;
    }
    if (!selectedBranchId) {
      toast.error("Debe seleccionar una sede");
      return;
    }
    if (!selectedCategoryId) {
      toast.error("Debe seleccionar una categoría contable");
      return;
    }
    
    try {
      await openCashShiftRequest(
        Number(initialBalance),
        selectedBranchId,
        selectedCategoryId,
        selectedSubCategoryId || undefined
      );
      toast.success("Caja abierta exitosamente");
      setIsModalOpen(false);
      setInitialBalance("");
      loadActiveShiftAndHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al abrir la caja");
    }
  };

  const handleCloseShift = async () => {
    try {
      await closeCashShiftRequest(closeCategoryId, closeSubCategoryId || undefined);
      toast.success("Caja cerrada exitosamente");
      setIsCloseConfirmOpen(false);
      loadActiveShiftAndHistory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al cerrar la caja");
    }
  };

  const handleViewDetails = async (shiftId: string) => {
    setSelectedShiftId(shiftId);
    setLoadingDetails(true);
    try {
      const res = await getCashShiftDetailsRequest(shiftId);
      setShiftDetails(res);
    } catch {
      toast.error("Error al obtener los detalles del turno");
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <Appshell>
        <div className="flex justify-center items-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </Appshell>
    );
  }  return (
    <Appshell>
      <div className="space-y-6">
        {/* HEADER LIGHT PREMIUM */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2rem] p-8 shadow-sm border border-blue-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl mb-4 border border-blue-100 shadow-sm">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Cierre de Caja</h1>
              <p className="text-gray-500 font-medium mt-2 max-w-lg">Controla el dinero en efectivo y las ventas diarias. Abre tu turno al empezar y ciérralo al finalizar tu jornada.</p>
            </div>

            <div>
              {activeShift ? (
                <button onClick={() => setIsCloseConfirmOpen(true)} className="px-6 py-3.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-100 transition-all shadow-sm">
                  <Lock className="w-5 h-5" /> Cerrar Caja Actual
                </button>
              ) : (
                <button onClick={() => setIsModalOpen(true)} className="px-6 py-3.5 bg-indigo-600 text-white border border-indigo-700 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
                  <Unlock className="w-5 h-5" /> Abrir Nueva Caja
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ACTIVE SHIFT STATUS */}
        {activeShift && (
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <h2 className="text-lg font-bold text-gray-900">Caja Actual Abierta</h2>
              <div className="flex gap-2 items-center ml-2">
                <span className="text-xs px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full font-bold">
                  📍 {activeShift.branch?.name || "Sede No Especificada"}
                </span>
              </div>
              <span className="text-xs text-gray-400 ml-auto">
                Desde: {format(new Date(activeShift.openedAt), "dd MMM yyyy, HH:mm", { locale: es })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monto Inicial (Base)</p>
                <p className="text-2xl font-black text-gray-900">S/ {activeShift.initialBalance.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Ventas del Turno</p>
                <p className="text-2xl font-black text-blue-700">+ S/ {activeShift.currentSales.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Esperado en Caja</p>
                <p className="text-2xl font-black text-emerald-700">S/ {(activeShift.initialBalance + activeShift.currentSales).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {!activeShift && !loading && (
          <div className="bg-gray-50 border border-gray-200 border-dashed rounded-3xl p-8 text-center">
            <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-700 mb-1">La caja está cerrada</h3>
            <p className="text-sm text-gray-500">Abre la caja para comenzar a registrar las ventas del POS a tu turno.</p>
          </div>
        )}

        {/* HISTORY */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900">Historial de Cierres</h3>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400">Sede:</span>
                <select
                  value={filterBranchId}
                  onChange={(e) => {
                    setFilterBranchId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Todas</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {user?.role === "ADMIN" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-gray-400">Vendedor:</span>
                  <select
                    value={filterWorkerId}
                    onChange={(e) => {
                      setFilterWorkerId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Todos</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.lastName || ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400">Desde:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-gray-400">Hasta:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => {
                    setFilterEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportHistoryExcel}
                  className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  Excel
                </button>
                <button
                  onClick={exportHistoryPdf}
                  className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  PDF
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {loadingHistory ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="font-bold">Cargando historial de turnos...</span>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Apertura</th>
                    <th className="px-6 py-4">Cierre</th>
                    <th className="px-6 py-4">Sede</th>
                    <th className="px-6 py-4">Vendedor</th>
                    <th className="px-6 py-4 text-right">Monto Inicial</th>
                    <th className="px-6 py-4 text-right">Ventas</th>
                    <th className="px-6 py-4 text-right">Total Final</th>
                    <th className="px-6 py-4 text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-400 font-medium">No hay cierres de caja anteriores registrados.</td>
                    </tr>
                  ) : (
                    history.map((shift) => (
                      <tr key={shift.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-600 font-medium text-xs">
                          {format(new Date(shift.openedAt), "dd MMM, HH:mm", { locale: es })}
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium text-xs">
                          {shift.closedAt ? format(new Date(shift.closedAt), "dd MMM, HH:mm", { locale: es }) : "-"}
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-bold text-xs">
                          {shift.branch?.name || "Matriz"}
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium text-xs">
                          {shift.user ? `${shift.user.name} ${shift.user.lastName || ""}` : "-"}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600 font-semibold text-xs">
                          S/ {shift.initialBalance.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-blue-600 font-bold text-xs">
                          + S/ {shift.totalSales.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-emerald-600 font-black text-xs">
                          S/ {(shift.finalBalance || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleViewDetails(shift.id)}
                            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1"
                            title="Ver Detalle del Turno"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <span className="text-xs text-gray-500 font-bold">
                Pág. {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={`p-2 rounded-lg border text-gray-600 transition-all ${currentPage === 1 ? "bg-gray-100 opacity-50 cursor-not-allowed" : "bg-white hover:bg-gray-100"}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={`p-2 rounded-lg border text-gray-600 transition-all ${currentPage === totalPages ? "bg-gray-100 opacity-50 cursor-not-allowed" : "bg-white hover:bg-gray-100"}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Abrir Caja">
        <form onSubmit={handleOpenShift} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monto Inicial en Efectivo (Base de Caja)</label>
            <input 
              type="number" 
              required 
              min="0" 
              step="0.01" 
              value={initialBalance} 
              onChange={e => setInitialBalance(e.target.value === "" ? "" : Number(e.target.value))} 
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold" 
              placeholder="Ej. 100.00" 
            />
            <p className="text-[11px] text-gray-400 mt-1">Este es el dinero con el que empiezas el día para dar vueltos.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sede / Sucursal de Caja</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold bg-white"
            >
              <option value="">Seleccionar Sede...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Categoría Contable (Egreso Inicial)</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                const catId = e.target.value;
                setSelectedCategoryId(catId);
                const catObj = categories.find((c) => c.id === catId);
                const firstSub = catObj?.children?.[0]?.id || "";
                setSelectedSubCategoryId(firstSub);
              }}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold bg-white"
            >
              <option value="">Seleccionar Categoría...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {(() => {
            const catObj = categories.find((c) => c.id === selectedCategoryId);
            const subcats = catObj?.children || [];
            if (subcats.length === 0) return null;
            return (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subcategoría Contable</label>
                <select
                  value={selectedSubCategoryId}
                  onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold bg-white"
                >
                  <option value="">Seleccionar Subcategoría...</option>
                  {subcats.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm">Cancelar</button>
            <button type="submit" className="px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/30 text-sm">
              Abrir Caja Ahora
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CERRAR CAJA (CON SELECCIÓN DE CATEGORÍA Y SUBCATEGORÍA DE INGRESO) */}
      <Modal
        isOpen={isCloseConfirmOpen}
        onClose={() => setIsCloseConfirmOpen(false)}
        title="Cerrar turno de caja"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCloseShift();
          }}
          className="space-y-4"
        >
          <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
            <span className="font-bold text-sm block">⚠️ ¿Cerrar caja actual?</span>
            <p className="leading-relaxed">
              ¿Estás seguro de que deseas cerrar el turno de caja actual? No podrás registrar nuevas ventas en el POS hasta abrir un nuevo turno.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
              Categoría Contable (Ingreso por Cierre)
            </label>
            <select
              value={closeCategoryId}
              onChange={(e) => {
                const catId = e.target.value;
                setCloseCategoryId(catId);
                const catObj = incomeCategories.find((c) => c.id === catId);
                const firstSub = catObj?.children?.[0]?.id || "";
                setCloseSubCategoryId(firstSub);
              }}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold bg-white"
            >
              <option value="">Seleccionar Categoría...</option>
              {incomeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {(() => {
            const catObj = incomeCategories.find((c) => c.id === closeCategoryId);
            const subcats = catObj?.children || [];
            if (subcats.length === 0) return null;
            return (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Subcategoría Contable
                </label>
                <select
                  value={closeSubCategoryId}
                  onChange={(e) => setCloseSubCategoryId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold bg-white"
                >
                  <option value="">Seleccionar Subcategoría...</option>
                  {subcats.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCloseConfirmOpen(false)}
              className="px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 text-sm"
            >
              Confirmar y Cerrar Caja
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DETALLES DE TURNO DE CAJA */}
      <Modal
        isOpen={selectedShiftId !== null}
        onClose={() => {
          setSelectedShiftId(null);
          setShiftDetails(null);
        }}
        title="📋 Detalle del Turno de Caja"
        maxWidth="max-w-3xl"
      >
        {loadingDetails ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="font-bold">Cargando detalles del turno...</span>
          </div>
        ) : shiftDetails ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 block font-black uppercase mb-0.5">Vendedor</span>
                <span className="font-bold text-gray-800 text-sm">
                  {shiftDetails.shift.user
                    ? `${shiftDetails.shift.user.name} ${shiftDetails.shift.user.lastName || ""}`
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-black uppercase mb-0.5">Sede</span>
                <span className="font-bold text-gray-800 text-sm">
                  {shiftDetails.shift.branch?.name || "Matriz"}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-1">
                <span className="text-gray-400 block font-black uppercase mb-0.5">Apertura</span>
                <span className="font-medium text-gray-800 text-xs">
                  {format(new Date(shiftDetails.shift.openedAt), "dd/MM/yyyy HH:mm:ss")}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-1">
                <span className="text-gray-400 block font-black uppercase mb-0.5">Cierre</span>
                <span className="font-medium text-gray-800 text-xs">
                  {shiftDetails.shift.closedAt
                    ? format(new Date(shiftDetails.shift.closedAt), "dd/MM/yyyy HH:mm:ss")
                    : "Abierta"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-100 rounded-xl border border-gray-200 text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Monto Inicial</span>
                <span className="text-base font-black text-gray-850">
                  S/ {Number(shiftDetails.shift.initialBalance || 0).toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                <span className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Total Ventas</span>
                <span className="text-base font-black text-blue-700">
                  S/ {Number(shiftDetails.shift.totalSales || 0).toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Monto Final</span>
                <span className="text-base font-black text-emerald-700">
                  S/ {Number(shiftDetails.shift.finalBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Sales Table inside Shift Details */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-805">Ventas Realizadas</h4>
              <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[9px] tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Hora</th>
                      <th className="px-4 py-2.5">Descripción / Productos</th>
                      <th className="px-4 py-2.5 text-center">Método</th>
                      <th className="px-4 py-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {shiftDetails.sales.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-medium">
                          No se registraron ventas durante este turno.
                        </td>
                      </tr>
                    ) : (
                      shiftDetails.sales.map((sale: any) => (
                        <tr key={sale.id} className="hover:bg-gray-55">
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                            {format(new Date(sale.date), "HH:mm:ss")}
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 font-semibold truncate max-w-[200px]">
                            {sale.description?.replace("Venta en POS: ", "") || "Venta Manual"}
                          </td>
                          <td className="px-4 py-2.5 text-center whitespace-nowrap">
                            <span className="text-[9px] font-bold bg-gray-105 text-gray-600 px-1.5 py-0.5 rounded">
                              {sale.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                            S/ {Number(sale.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportShiftDetailsExcel}
                  className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  Exportar Excel
                </button>
                <button
                  type="button"
                  onClick={exportShiftDetailsPdf}
                  className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  Exportar PDF
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedShiftId(null);
                  setShiftDetails(null);
                }}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-400 font-medium">No se cargaron los detalles.</div>
        )}
      </Modal>
    </Appshell>
  );
}
