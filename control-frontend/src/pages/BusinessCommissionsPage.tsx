import { useState, useEffect } from "react";
import FinanceAppShell from "../components/layout/Appshell";
import Pagination from "../components/ui/Pagination";
import { format } from "date-fns";
import {
  DollarSign,
  Calendar,
  TrendingUp,
  ChevronUp,
  User,
  ShoppingBag,
  Briefcase,
  Clock,
  CreditCard,
  Eye,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getUserRequest } from "../services/user.api";
import {
  getAdvisorsRequest,
  getCommissionsReportRequest,
  updateCommissionStatusRequest,
} from "../services/advisor.api";
import type { Advisor } from "../services/advisor.api";

interface CommissionTransaction {
  id: string; // Virtual ID: transactionId-advisorId or transactionId
  name: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod: string;
  advisor: Advisor;
  commissionPercentage?: number | null;
  commissionAmount?: number | null;
  commissionStatus?: "PENDING" | "APPROVED" | "PAID";
  items?: any[];
  totalSale?: number;
  totalCost?: number;
  user: {
    id: string;
    name: string;
    lastName: string;
  };
}

export default function BusinessCommissionsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [advisorLabel, setAdvisorLabel] = useState("Asesor de venta");
  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  // Filters
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [dateRange, setDateRange] = useState<"today" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Accordion details state
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);

  const fetchProfileAndAdvisors = async () => {
    try {
      const user = await getUserRequest();
      setProfile(user);
      if (user?.advisorLabel) {
        setAdvisorLabel(user.advisorLabel);
      }
      const advisorsList = await getAdvisorsRequest();
      setAdvisors(advisorsList);
    } catch (error) {
      console.error("Error loading profile or advisors", error);
    }
  };

  const getFilterDates = () => {
    const now = new Date();
    let start = "";
    let end = "";

    if (dateRange === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start = today.toISOString();
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    } else if (dateRange === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = firstDay.toISOString();
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    } else if (dateRange === "year") {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      start = firstDay.toISOString();
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).toISOString();
    } else if (dateRange === "custom") {
      if (startDate) {
        start = new Date(startDate).toISOString();
      }
      if (endDate) {
        end = new Date(endDate + "T23:59:59.999Z").toISOString();
      }
    }

    return { start, end };
  };

  const fetchCommissions = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getFilterDates();
      const params: any = {};
      if (selectedAdvisorId) {
        params.advisorId = selectedAdvisorId;
      }
      if (start) params.startDate = start;
      if (end) params.endDate = end;

      const data = await getCommissionsReportRequest(params);
      setTransactions(data);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar reporte de comisiones");
    } finally {
      setIsLoading(false);
    }
  };


  const handleToggleStatus = async (virtualId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "PAID" ? "PENDING" : "PAID";
    setIsUpdatingStatus(virtualId);
    try {
      await updateCommissionStatusRequest(virtualId, nextStatus);
      toast.success(
        nextStatus === "PENDING"
          ? "Comisión marcada como pendiente"
          : "Comisión marcada como pagada"
      );
      fetchCommissions();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar estado");
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const exportCommissionsExcel = async () => {
    if (filteredTransactions.length === 0) {
      toast.error("No hay comisiones para exportar");
      return;
    }
    const XLSX = await import("xlsx");
    const dataToExport = filteredTransactions.map(t => ({
      "Fecha": format(new Date(t.date), "dd/MM/yyyy HH:mm"),
      "Asesor": t.advisor?.name || "N/A",
      "Detalle / Descripción": t.description || "",
      "Monto Venta (S/)": t.amount || 0,
      "Monto Comisión (S/)": t.commissionAmount || 0,
      "Estado": t.commissionStatus === "PAID" ? "Pagado" : "Pendiente"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comisiones");
    XLSX.writeFile(workbook, "Reporte_Comisiones.xlsx");
    toast.success("Comisiones exportadas a Excel");
  };

  const exportCommissionsPdf = async () => {
    if (filteredTransactions.length === 0) {
      toast.error("No hay comisiones para exportar");
      return;
    }
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF("p", "mm", "a4");
    const businessName = profile?.businessName || "Control Finanzas";

    // Header banner
    doc.setFillColor(49, 46, 129);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`REPORTE DE COMISIONES DE ${advisorLabel.toUpperCase()}ES`, 14, 11);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(businessName, 14, 17);
    doc.text(`Rango: ${dateRange === "custom" ? `${startDate || "Inicio"} al ${endDate || "Fin"}` : dateRange.toUpperCase()}  |  Total: ${filteredTransactions.length} registros`, 14, 22);

    const totSales = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
    const totComm = filteredTransactions.reduce((acc, t) => acc + (t.commissionAmount || 0), 0);
    doc.text(`Total Ventas: S/ ${totSales.toFixed(2)}  |  Total Comisiones: S/ ${totComm.toFixed(2)}`, 14, 27);

    const drawHeader = (startY: number) => {
      doc.setFillColor(79, 70, 229);
      doc.rect(14, startY, 182, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("Fecha/Hora", 16, startY + 5.5);
      doc.text("Asesor", 45, startY + 5.5);
      doc.text("Descripción", 80, startY + 5.5);
      doc.text("Venta (S/)", 145, startY + 5.5);
      doc.text("Comisión (S/)", 165, startY + 5.5);
      doc.text("Estado", 182, startY + 5.5);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
    };

    let y = 40;
    drawHeader(y);
    y += 8;

    filteredTransactions.forEach((t: any, idx: number) => {
      const rawDesc = (t.description || "").replace("Venta en POS: ", "");
      const descLines = doc.splitTextToSize(rawDesc, 60);
      const rowHeight = Math.max(8, descLines.length * 4.5);

      if (y + rowHeight > 278) {
        doc.addPage();
        y = 15;
        drawHeader(y);
        y += 8;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(14, y, 182, rowHeight, "F");
      }
      doc.setDrawColor(230, 230, 230);
      doc.line(14, y + rowHeight, 196, y + rowHeight);

      const fecha = format(new Date(t.date), "dd/MM/yy HH:mm");
      const advisorName = t.advisor?.name || "N/A";
      const statusLabel = t.commissionStatus === "PAID" ? "Pagado" : "Pendiente";

      doc.setTextColor(100, 116, 139);
      doc.text(fecha, 16, y + 5.5);

      doc.setTextColor(30, 41, 59);
      doc.text(advisorName, 45, y + 5.5);

      doc.setTextColor(55, 65, 81);
      doc.text(descLines, 80, y + 5.5);

      doc.setTextColor(100, 116, 139);
      doc.text(`S/ ${t.amount.toFixed(2)}`, 145, y + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(5, 150, 105);
      doc.text(`S/ ${t.commissionAmount.toFixed(2)}`, 165, y + 5.5);

      doc.setTextColor(t.commissionStatus === "PAID" ? 5 : 220, t.commissionStatus === "PAID" ? 150 : 38, t.commissionStatus === "PAID" ? 105 : 38);
      doc.text(statusLabel, 182, y + 5.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      y += rowHeight;
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("Control Finanzas ERP — Reporte de Comisiones", 14, 291);
      doc.text(`Página ${i} de ${totalPages}`, 180, 291);
    }

    doc.save("Reporte_Comisiones.pdf");
    toast.success("PDF de comisiones exportado");
  };

  useEffect(() => {
    fetchProfileAndAdvisors();
  }, []);

  useEffect(() => {
    fetchCommissions();
    setCurrentPage(1);
    setExpandedTransactionId(null);
  }, [selectedAdvisorId, dateRange, startDate, endDate]);

  // Client-side filtering by status (for exports)
  const filteredTransactions = transactions.filter(t => {
    if (!selectedStatus) return true;
    const status = t.commissionStatus || "PENDING";
    return status === selectedStatus;
  });

  // Grouping transactions by cashShiftId
  const groupedShifts = (() => {
    const shiftMap = new Map<string, {
      id: string;
      openedAt: string;
      closedAt?: string;
      user: { name: string; lastName?: string };
      branch: { name: string };
      commissions: any[];
      totalSales: number;
      totalCommissions: number;
      status: "PENDING" | "PAID";
    }>();

    transactions.forEach((t: any) => {
      const shiftId = t.cashShiftId || `virtual-${format(new Date(t.date), "yyyy-MM-dd")}`;

      if (!shiftMap.has(shiftId)) {
        shiftMap.set(shiftId, {
          id: shiftId,
          openedAt: t.cashShift?.openedAt || t.date,
          closedAt: t.cashShift?.closedAt,
          user: t.cashShift?.user || t.user || { name: "Vendedor", lastName: "General" },
          branch: t.cashShift?.branch || { name: "Sede Principal" },
          commissions: [],
          totalSales: 0,
          totalCommissions: 0,
          status: "PAID",
        });
      }

      const shiftGroup = shiftMap.get(shiftId)!;
      shiftGroup.commissions.push(t);
    });

    const list = Array.from(shiftMap.values());
    list.forEach((shift) => {
      const saleMap = new Map<string, number>();
      let commSum = 0;
      let hasPending = false;

      shift.commissions.forEach((c) => {
        const saleKey = c.saleId || c.id;
        saleMap.set(saleKey, c.amount);
        commSum += c.commissionAmount || 0;
        if (c.commissionStatus === "PENDING") {
          hasPending = true;
        }
      });

      shift.totalSales = Array.from(saleMap.values()).reduce((sum, amt) => sum + amt, 0);
      shift.totalCommissions = commSum;
      shift.status = hasPending ? "PENDING" : "PAID";
    });

    list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
    return list;
  })();

  const filteredShifts = groupedShifts.filter((shift) => {
    if (!selectedStatus) return true;
    return shift.status === selectedStatus;
  });

  const paginatedShifts = filteredShifts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalSales = filteredShifts.reduce((acc, s) => acc + s.totalSales, 0);

  const pendingCommissions = filteredShifts.reduce((acc, s) => {
    return acc + s.commissions
      .filter(c => (c.commissionStatus || "PENDING") === "PENDING")
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  }, 0);

  const paidCommissions = filteredShifts.reduce((acc, s) => {
    return acc + s.commissions
      .filter(c => c.commissionStatus === "PAID")
      .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  }, 0);

  const toggleExpand = (id: string) => {
    setExpandedTransactionId(expandedTransactionId === id ? null : id);
  };

  const handleToggleShiftStatus = async (shift: any) => {
    const isCurrentlyPaid = shift.status === "PAID";
    const nextStatus = isCurrentlyPaid ? "PENDING" : "PAID";

    setIsUpdatingStatus(shift.id);
    const loadingToast = toast.loading("Actualizando comisiones del turno...");

    try {
      await Promise.all(
        shift.commissions.map((c: any) =>
          updateCommissionStatusRequest(c.id, nextStatus)
        )
      );
      toast.dismiss(loadingToast);
      toast.success(
        nextStatus === "PENDING"
          ? "Comisiones del turno marcadas como pendientes"
          : "Comisiones del turno pagadas con éxito"
      );
      fetchCommissions();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || "Error al actualizar estado");
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  return (
    <FinanceAppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Reportes de Incentivos</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Comisiones de {advisorLabel}es
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Visualiza el desglose de ventas, aprueba liquidaciones y paga incentivos acumulados de colaboradores.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCommissionsExcel}
              className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              Exportar Excel
            </button>
            <button
              onClick={exportCommissionsPdf}
              className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              Exportar PDF
            </button>
          </div>
        </div>

        {/* FILTERS PANEL */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Advisor Selector */}
            <div>
              <label className="block text-gray-700 font-extrabold mb-1.5 text-xs uppercase tracking-wider">
                Filtrar por {advisorLabel}
              </label>
              <select
                value={selectedAdvisorId}
                onChange={(e) => setSelectedAdvisorId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-55 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
              >
                <option value="">-- Todos los asesores --</option>
                {advisors.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Payout Status Selector */}
            <div>
              <label className="block text-gray-700 font-extrabold mb-1.5 text-xs uppercase tracking-wider">
                Estado de Pago
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-3 bg-gray-55 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
              >
                <option value="">-- Todos los estados --</option>
                <option value="PENDING">Pendientes</option>
                <option value="PAID">Pagadas</option>
              </select>
            </div>

            {/* Date range selector */}
            <div>
              <label className="block text-gray-700 font-extrabold mb-1.5 text-xs uppercase tracking-wider">
                Rango de Fechas
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-4 py-3 bg-gray-55 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
              >
                <option value="today">Hoy</option>
                <option value="month">Mes Actual</option>
                <option value="year">Año Actual</option>
                <option value="custom">Rango Personalizado</option>
              </select>
            </div>

            {/* Custom Dates */}
            {dateRange === "custom" && (
              <div className="grid grid-cols-2 gap-2 col-span-1 md:col-span-1">
                <div>
                  <label className="block text-gray-700 font-extrabold mb-1.5 text-xs uppercase tracking-wider">Desde</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-55 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-extrabold mb-1.5 text-xs uppercase tracking-wider">Hasta</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-55 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none text-xs font-bold"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SUMMARY METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {/* Card 1: Total Vendido */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Total Comercializado</span>
              <h2 className="text-2xl font-black text-gray-800 mt-1">S/ {totalSales.toFixed(2)}</h2>
              <p className="text-[10px] text-indigo-500 font-bold mt-0.5">Suma total de ventas POS</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Pendientes */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] text-amber-500 font-black uppercase tracking-wider">Comisiones Pendientes</span>
              <h2 className="text-2xl font-black text-amber-700 mt-1">S/ {pendingCommissions.toFixed(2)}</h2>
              <p className="text-[10px] text-gray-450 font-bold mt-0.5">Por procesar o validar</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Pagadas */}
          <div className="bg-white rounded-3xl border border-gray-100 p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[10px] text-emerald-500 font-black uppercase tracking-wider">Comisiones Pagadas</span>
              <h2 className="text-2xl font-black text-emerald-700 mt-1">S/ {paidCommissions.toFixed(2)}</h2>
              <p className="text-[10px] text-gray-450 font-bold mt-0.5">Pagadas con egreso de caja</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

        </div>
        {/* DETAILED TRANSACTIONS TABLE */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-800 text-lg">Detalle de Comisiones por Turno</h3>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-lg">
              {filteredShifts.length} Turnos
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold">Generando reporte de comisiones...</p>
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="font-bold text-gray-600">No se encontraron ventas para los filtros seleccionados</p>
              <p className="text-xs text-gray-400 mt-0.5">Intenta expandiendo el rango de fechas o seleccionando otro asesor.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                <div className="col-span-3">Turno / Caja</div>
                <div className="col-span-2">Cajero Responsable</div>
                <div className="col-span-2">Sede / Establecimiento</div>
                <div className="col-span-2 text-right">Venta Total</div>
                <div className="col-span-1 text-right text-emerald-600">Comisiones</div>
                <div className="col-span-1 text-center">Estado</div>
                <div className="col-span-1 text-center">Ver</div>
              </div>

              {paginatedShifts.map((shift) => {
                const isExpanded = expandedTransactionId === shift.id;
                const isUpdating = isUpdatingStatus === shift.id;

                const advisorSummaries = (() => {
                  const map = new Map<string, { name: string; totalComm: number; totalSales: number }>();
                  shift.commissions.forEach(c => {
                    const name = c.advisor?.name || "Desconocido";
                    if (!map.has(name)) {
                      map.set(name, { name, totalComm: 0, totalSales: 0 });
                    }
                    const summary = map.get(name)!;
                    summary.totalComm += c.commissionAmount || 0;
                    summary.totalSales += c.amount || 0;
                  });
                  return Array.from(map.values());
                })();

                return (
                  <div key={shift.id} className="transition-all hover:bg-gray-50/50">
                    {/* Main Row */}
                    <div
                      onClick={() => toggleExpand(shift.id)}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-gray-700 items-center cursor-pointer select-none"
                    >
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-extrabold text-gray-900 truncate">
                              Caja del {format(new Date(shift.openedAt), "dd/MM/yyyy HH:mm")}
                            </div>
                            <div className="text-[10px] text-gray-400 font-medium">
                              {shift.closedAt
                                ? `Cerrado: ${format(new Date(shift.closedAt), "dd/MM/yyyy HH:mm")}`
                                : "Turno Activo (Abierto) 🟢"
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 text-xs font-bold text-gray-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{shift.user?.name} {shift.user?.lastName || ""}</span>
                      </div>

                      <div className="col-span-2 text-xs font-bold text-gray-500 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        <span>{shift.branch?.name || "Sede Principal"}</span>
                      </div>

                      <div className="col-span-2 text-right font-extrabold text-gray-900">
                        S/ {shift.totalSales.toFixed(2)}
                      </div>

                      <div className="col-span-1 text-right font-black text-emerald-600">
                        S/ {shift.totalCommissions.toFixed(2)}
                      </div>

                      {/* Payment status badge */}
                      <div className="col-span-1 flex justify-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleShiftStatus(shift)}
                          className={`px-2.5 py-1.5 text-[10px] font-black uppercase rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${shift.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                            }`}
                          title="Haga clic para alternar estado de todo el turno"
                        >
                          {shift.status === "PENDING" ? "Pendiente ⏳" : "Pagado ✅"}
                        </button>
                      </div>

                      {/* Action Eye button */}
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(shift.id);
                          }}
                          className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center justify-center"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable breakdown drawer */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 bg-gray-55/50 border-t border-gray-100/50">

                        {/* Advisor Summaries */}
                        <div className="mb-4">
                          <h4 className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Total del turno por cada {advisorLabel}</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            {advisorSummaries.map((adv, idx) => (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-gray-150 shadow-xs flex flex-col justify-between">
                                <span className="text-[10px] text-gray-400 font-extrabold uppercase truncate">{adv.name}</span>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                  <span className="text-base font-black text-emerald-600">S/ {adv.totalComm.toFixed(2)}</span>
                                  <span className="text-[9px] text-gray-400 font-bold">comisión</span>
                                </div>
                                <span className="text-[9px] text-gray-400 mt-0.5">Ventas: S/ {adv.totalSales.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Desglose Detallado de Ventas</span>
                          </h4>
                        </div>

                        {/* Detailed Table */}
                        <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                          <table className="w-full text-left text-xs font-semibold text-gray-700">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[9px] tracking-wider border-b border-gray-150">
                              <tr>
                                <th className="px-4 py-3">Fecha y Hora</th>
                                <th className="px-4 py-3">Detalle Productos</th>
                                <th className="px-4 py-3">{advisorLabel}</th>
                                <th className="px-4 py-3 text-right">Monto Venta</th>
                                <th className="px-4 py-3 text-right text-emerald-600">Comisión</th>
                                <th className="px-4 py-3 text-center">Estado Pago</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {shift.commissions.map((comm: any) => {
                                const comStatus = comm.commissionStatus || "PENDING";
                                const itemsDesc = comm.items && comm.items.length > 0
                                  ? comm.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")
                                  : comm.description;

                                return (
                                  <tr key={comm.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-2.5 text-gray-500 font-bold">
                                      {format(new Date(comm.date), "dd/MM/yyyy HH:mm")}
                                    </td>
                                    <td className="px-4 py-2.5 font-bold text-gray-900 max-w-xs truncate" title={itemsDesc}>
                                      {itemsDesc}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-600 font-extrabold">
                                      {comm.advisor?.name || "Desconocido"}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                                      S/ {Number(comm.amount).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-black text-emerald-600">
                                      S/ {Number(comm.commissionAmount).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        disabled={isUpdatingStatus === comm.id}
                                        onClick={() => handleToggleStatus(comm.id, comStatus)}
                                        className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg cursor-pointer transition-all ${comStatus === "PENDING"
                                          ? "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100"
                                          : "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                                          }`}
                                      >
                                        {comStatus === "PENDING" ? "Pendiente" : "Pagado"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filteredShifts.length > 0 && (
            <div className="p-4 border-t border-gray-50">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredShifts.length}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
          )}
        </div>

      </div>
    </FinanceAppShell>
  );
}
