import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { getTransactionsRequest } from "../services/transaction.api";
import { getProductsRequest, getInventoryMovementsRequest } from "../services/product.api";
import {
  TrendingUp,
  Package,
  DollarSign,
  Activity,
  Calendar,
  Search,
  FileDown,
  Vault,
  ArrowUpDown,
  ShoppingBag,
} from "lucide-react";
import { format, subDays, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "react-hot-toast";
import DateRangePicker from "../components/ui/DateRangePicker";
import { exportToExcel } from "../utils/exportExcel";

export default function BusinessReportsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "ventas" | "tesoreria" | "inventario" | "kardex">("general");
  const [loading, setLoading] = useState(true);

  // Raw Database Data
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTx, setSearchTx] = useState("");
  const [searchProduct, setSearchProduct] = useState("");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [txs, prods, movs] = await Promise.all([
        getTransactionsRequest({ workspace: "BUSINESS" }),
        getProductsRequest(),
        getInventoryMovementsRequest(),
      ]);
      setTransactions(txs);
      setProducts(prods);
      setMovements(movs);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar la información del servidor");
    } finally {
      setLoading(false);
    }
  };

  // 1. FILTERED DATASETS
  const filteredTxs = transactions.filter((t: any) => {
    if (!t.date) return true;
    const day = t.date.slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });

  // POS Sales only - only count PAID sales!
  const filteredSales = filteredTxs.filter(
    (t: any) => t.type === "INCOME" && t.name === "Venta en Caja" && t.status === "PAID"
  );


  // 2. METRICS & CHART COMPUTATIONS
  // Income vs Expenses - only count PAID transactions!
  const totalIncome = filteredTxs
    .filter((t: any) => t.type === "INCOME" && t.status === "PAID")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const totalExpense = filteredTxs
    .filter((t: any) => t.type === "EXPENSE" && t.status === "PAID")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpense;

  // Treasury (inflow, outflow, loan, investment)
  const filteredTreasury = filteredTxs.filter((t: any) => {
    if (searchTx) {
      const q = searchTx.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.paymentMethod || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Kardex movements
  const filteredMovements = movements.filter((m: any) => {
    if (!m.createdAt) return true;
    const day = m.createdAt.slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    if (searchProduct) {
      const q = searchProduct.toLowerCase();
      return (
        (m.product?.name || "").toLowerCase().includes(q) ||
        (m.product?.sku || "").toLowerCase().includes(q)
      );
    }
    return true;
  });



  // Inventory valuation
  const inventoryCostValuation = products.reduce(
    (sum: number, p: any) => sum + p.costPrice * p.stock,
    0
  );
  const inventorySaleValuation = products.reduce(
    (sum: number, p: any) => sum + p.salePrice * p.stock,
    0
  );

  // POS Sales stats
  const posSalesVolume = filteredSales.reduce((sum: number, t: any) => sum + t.amount, 0);
  const averageSalesTicket = filteredSales.length > 0 ? posSalesVolume / filteredSales.length : 0;

  // POS Payment Method Breakdown
  const paymentMethodData = filteredSales.reduce((acc: any[], t: any) => {
    const method = t.paymentMethod || "EFECTIVO";
    const existing = acc.find((item) => item.name === method);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: method, value: t.amount });
    }
    return acc;
  }, []);

  // Daily Trend for Line Chart (Last 14 days or filtered dates)
  const getTrendData = () => {
    const daysToShow = 14;
    const trendList = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const daySales = transactions.filter(
        (t: any) => t.type === "INCOME" && t.name === "Venta en Caja" && t.status === "PAID" && isSameDay(parseISO(t.date), date)
      );
      trendList.push({
        date: format(date, "dd MMM", { locale: es }),
        ventas: daySales.reduce((sum: number, t: any) => sum + t.amount, 0),
      });
    }
    return trendList;
  };

  const trendData = getTrendData();
  const COLORS = ["#6366f1", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];

  // 3. EXPORTS GENERATOR (EXCEL & PDF)

  // EXCEL EXPORTS
  const exportSalesExcel = async () => {
    await exportToExcel(
      filteredSales.map((s: any) => ({
        fecha: format(new Date(s.date), "dd/MM/yyyy HH:mm"),
        descripcion: s.description || "Venta",
        metodo: s.paymentMethod,
        monto: s.amount,
      })),
      [
        { key: "fecha", label: "Fecha" },
        { key: "descripcion", label: "Detalle Venta" },
        { key: "metodo", label: "Método de Pago" },
        { key: "monto", label: "Total Recaudado (S/)" },
      ],
      `Reporte_Ventas_POS_${format(new Date(), "yyyyMMdd")}`
    );
    toast.success("Excel de Ventas exportado");
  };

  const exportTreasuryExcel = async () => {
    await exportToExcel(
      filteredTreasury.map((t: any) => ({
        fecha: format(new Date(t.date), "dd/MM/yyyy HH:mm"),
        motivo: t.name,
        tipo: t.type === "INCOME" ? "Ingreso" : "Egreso",
        descripcion: t.description || "—",
        metodo: t.paymentMethod,
        monto: t.amount,
      })),
      [
        { key: "fecha", label: "Fecha/Hora" },
        { key: "motivo", label: "Motivo" },
        { key: "tipo", label: "Tipo" },
        { key: "descripcion", label: "Detalle" },
        { key: "metodo", label: "Caja/Medio" },
        { key: "monto", label: "Importe (S/)" },
      ],
      `Reporte_Flujo_Caja_${format(new Date(), "yyyyMMdd")}`
    );
    toast.success("Excel de Tesorería exportado");
  };

  const exportInventoryExcel = async () => {
    await exportToExcel(
      products.map((p: any) => ({
        sku: p.sku || "—",
        nombre: p.name,
        stock: p.stock,
        minimo: p.minStock,
        unidad: p.unit || "uds",
        costo: p.costPrice,
        precio: p.salePrice,
        valCosto: p.costPrice * p.stock,
        valVenta: p.salePrice * p.stock,
      })),
      [
        { key: "sku", label: "SKU" },
        { key: "nombre", label: "Producto" },
        { key: "stock", label: "Stock" },
        { key: "minimo", label: "Stock Mínimo" },
        { key: "unidad", label: "Unidad" },
        { key: "costo", label: "Costo Unit." },
        { key: "precio", label: "Precio Venta" },
        { key: "valCosto", label: "Val. Costo (S/)" },
        { key: "valVenta", label: "Val. Venta (S/)" },
      ],
      `Reporte_Valorizacion_Stock_${format(new Date(), "yyyyMMdd")}`
    );
    toast.success("Excel de Valorización exportado");
  };

  const exportKardexExcel = async () => {
    await exportToExcel(
      filteredMovements.map((m: any) => ({
        fecha: format(new Date(m.createdAt), "dd/MM/yyyy HH:mm"),
        producto: m.product?.name || "—",
        sku: m.product?.sku || "—",
        tipo: m.type === "IN" ? "Entrada" : "Salida",
        cantidad: m.quantity,
        motivo: m.reason,
      })),
      [
        { key: "fecha", label: "Fecha" },
        { key: "producto", label: "Producto" },
        { key: "sku", label: "SKU" },
        { key: "tipo", label: "Tipo" },
        { key: "cantidad", label: "Cantidad" },
        { key: "motivo", label: "Motivo Operación" },
      ],
      `Reporte_Movimientos_Kardex_${format(new Date(), "yyyyMMdd")}`
    );
    toast.success("Excel de Kardex exportado");
  };

  // PDF EXPORTS WITH HIGH AESTHETIC VALUE
  const exportSalesPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Theme colors
      const primaryColor = [49, 46, 129]; // Navy indigo
      
      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 30, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("REPORTE OPERATIVO DE VENTAS POS", 14, 13);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Filtro Rango: ${dateFrom || "Inicio"} al ${dateTo || "Hoy"}  |  Fecha Impresión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

      // Summary KPIs Box
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(14, 36, 182, 22, 2, 2, "F");
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TOTAL VENTAS", 20, 43);
      doc.setFontSize(12);
      doc.text(`S/ ${posSalesVolume.toFixed(2)}`, 20, 51);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TRANSACCIONES", 80, 43);
      doc.setFontSize(12);
      doc.text(`${filteredSales.length} ventas`, 80, 51);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TICKET PROMEDIO", 140, 43);
      doc.setFontSize(12);
      doc.text(`S/ ${averageSalesTicket.toFixed(2)}`, 140, 51);

      // Table Title
      doc.setTextColor(49, 46, 129);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE OPERACIONES EN PUNTO DE VENTA", 14, 66);

      // Draw table
      const startY = 72;
      const headers = ["Fecha/Hora", "Detalle de Venta", "Método", "Importe"];
      const colWidths = [40, 85, 30, 27];
      
      // Header row
      doc.setFillColor(49, 46, 129);
      doc.rect(14, startY, 182, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      let cx = 14;
      headers.forEach((h, i) => {
        doc.text(h, cx + 2, startY + 5);
        cx += colWidths[i];
      });

      let y = startY + 7;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      
      filteredSales.forEach((s, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 15;
        }
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 6.5, "F");
        }
        doc.setFontSize(7.5);
        
        let tx = 14;
        const row = [
          format(new Date(s.date), "dd/MM/yyyy HH:mm"),
          s.description || "Venta POS",
          s.paymentMethod || "CASH",
          `S/ ${s.amount.toFixed(2)}`,
        ];
        
        row.forEach((val, i) => {
          doc.text(val, tx + 2, y + 4.5);
          tx += colWidths[i];
        });
        y += 6.5;
      });

      // Page numbers & footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("Think ERP Finanzas — Todos los derechos reservados", 14, 287);
        doc.text(`Página ${i} de ${totalPages}`, 180, 287);
      }

      doc.save(`Ventas_POS_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF de Ventas descargado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF");
    }
  };

  const exportTreasuryPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Theme colors
      const primaryColor = [190, 18, 60]; // Red/Crimson for Treasury operations
      
      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 30, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("ESTADO DE FLUJO DE CAJA & TESORERÍA", 14, 13);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Filtro Rango: ${dateFrom || "Inicio"} al ${dateTo || "Hoy"}  |  Fecha Impresión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

      // Summary KPIs Box
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(14, 36, 182, 22, 2, 2, "F");
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("INGRESOS GENERALES", 20, 43);
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text(`+S/ ${totalIncome.toFixed(2)}`, 20, 51);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.text("EGRESOS / PAGOS", 80, 43);
      doc.setFontSize(12);
      doc.setTextColor(225, 29, 72);
      doc.text(`-S/ ${totalExpense.toFixed(2)}`, 80, 51);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.text("FLUJO NETO", 140, 43);
      doc.setFontSize(12);
      doc.setTextColor(netCashFlow >= 0 ? 16 : 225, netCashFlow >= 0 ? 185 : 29, netCashFlow >= 0 ? 129 : 72);
      doc.text(`S/ ${netCashFlow.toFixed(2)}`, 140, 51);

      // Table Title
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("HISTORIAL DE MOVIMIENTOS DE CAJA Y BANCOS", 14, 66);

      // Draw table
      const startY = 72;
      const headers = ["Fecha", "Motivo", "Tipo", "Medio", "Importe"];
      const colWidths = [35, 60, 25, 32, 30];
      
      // Header row
      doc.setFillColor(30, 41, 59);
      doc.rect(14, startY, 182, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      let cx = 14;
      headers.forEach((h, i) => {
        doc.text(h, cx + 2, startY + 5);
        cx += colWidths[i];
      });

      let y = startY + 7;
      doc.setFont("helvetica", "normal");
      
      filteredTreasury.forEach((t, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 15;
        }
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 6.5, "F");
        }
        doc.setFontSize(7.5);
        
        let tx = 14;
        const row = [
          format(new Date(t.date), "dd/MM/yyyy HH:mm"),
          t.name,
          t.type === "INCOME" ? "Ingreso" : "Egreso",
          t.paymentMethod || "CASH",
          `S/ ${t.amount.toFixed(2)}`,
        ];
        
        row.forEach((val, i) => {
          if (i === 2) {
            doc.setTextColor(t.type === "INCOME" ? 16 : 225, t.type === "INCOME" ? 120 : 29, t.type === "INCOME" ? 87 : 72);
            doc.setFont("helvetica", "bold");
          } else {
            doc.setTextColor(51, 65, 85);
            doc.setFont("helvetica", "normal");
          }
          doc.text(val, tx + 2, y + 4.5);
          tx += colWidths[i];
        });
        y += 6.5;
      });

      // Page numbers & footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("Think ERP Finanzas — Todos los derechos reservados", 14, 287);
        doc.text(`Página ${i} de ${totalPages}`, 180, 287);
      }

      doc.save(`Flujo_Caja_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF de Flujo descargado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF de caja");
    }
  };

  return (
    <Appshell>
      <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4">
        {/* HEADER BANNER */}
        <div className="bg-gradient-to-r from-orange-400 via-rose-500 to-indigo-600 border border-orange-200 rounded-[2rem] p-8 text-white shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2 tracking-tight">Centro de Reportes Analíticos</h1>
            <p className="text-orange-50 font-medium">Exportaciones contables de ventas, inventario, tesorería y Kardex valorado.</p>
          </div>
          <div className="relative z-10 bg-white/10 backdrop-blur-md p-2 rounded-2xl flex flex-wrap gap-2 items-center">
            <Calendar className="w-4 h-4 text-orange-200 ml-2" />
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={(val) => {
                setDateFrom(val);
                toast.success("Filtro de fecha aplicado");
              }}
              onDateToChange={(val) => {
                setDateTo(val);
                toast.success("Filtro de fecha aplicado");
              }}
              onClear={() => {
                setDateFrom("");
                setDateTo("");
                toast.success("Filtros de fecha eliminados");
              }}
            />
          </div>
        </div>

        {/* TABS DE REPORTES */}
        <div className="flex bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === "general" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <Activity className="w-4 h-4" /> Resumen General
          </button>
          <button
            onClick={() => setActiveTab("ventas")}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === "ventas" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Ventas POS
          </button>
          <button
            onClick={() => setActiveTab("tesoreria")}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === "tesoreria" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <Vault className="w-4 h-4" /> Tesorería
          </button>
          <button
            onClick={() => setActiveTab("inventario")}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === "inventario" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <Package className="w-4 h-4" /> Valorización Stock
          </button>
          <button
            onClick={() => setActiveTab("kardex")}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === "kardex" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <ArrowUpDown className="w-4 h-4" /> Movimientos Kardex
          </button>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* TAB CONTENT: GENERAL */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Ingresos general</span>
                    <span className="text-xl font-extrabold text-emerald-600">S/ {totalIncome.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Gastos general</span>
                    <span className="text-xl font-extrabold text-rose-600">S/ {totalExpense.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Flujo Neto Caja</span>
                    <span className={`text-xl font-extrabold ${netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      S/ {netCashFlow.toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Valorización de Stock (Costo)</span>
                    <span className="text-xl font-extrabold text-indigo-600">S/ {inventoryCostValuation.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ventas Chart */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500" /> Tendencia de Ventas (Histórico Reciente)
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `S/ ${v}`} />
                          <Tooltip formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, "Ventas"]} />
                          <Line type="monotone" dataKey="ventas" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Payment Method Chart */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-indigo-500" /> Ventas por Método de Pago
                    </h3>
                    {paymentMethodData.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-xs text-gray-400 font-bold">
                        No hay ventas registradas en este período.
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={paymentMethodData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `S/ ${v}`} />
                            <Tooltip formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, "Recaudado"]} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                              {paymentMethodData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: VENTAS POS */}
            {activeTab === "ventas" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex-wrap gap-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Detalle de Ventas Registradas en POS</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Ventas realizadas por los vendedores y registradas en el control de turnos.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={exportSalesExcel}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
                    >
                      <FileDown className="w-4 h-4" /> Exportar Excel
                    </button>
                    <button
                      onClick={exportSalesPdf}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-all"
                    >
                      <FileDown className="w-4 h-4" /> Exportar PDF
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50/50 border-b border-gray-100 flex justify-between text-xs font-bold text-gray-500">
                    <span>Ventas encontradas: {filteredSales.length}</span>
                    <span className="text-indigo-600">Total: S/ {posSalesVolume.toFixed(2)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-gray-500 uppercase text-xs font-bold">
                        <tr>
                          <th className="px-5 py-4 text-left">Fecha</th>
                          <th className="px-5 py-4 text-left">Glosa/Descripción</th>
                          <th className="px-5 py-4 text-center">Método de Pago</th>
                          <th className="px-5 py-4 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredSales.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                              {format(new Date(s.date), "dd/MM/yyyy HH:mm")}
                            </td>
                            <td className="px-5 py-4 text-gray-900 font-semibold">{s.description || "Venta de Caja"}</td>
                            <td className="px-5 py-4 text-center">
                              <span className="text-xs bg-slate-100 text-gray-600 font-bold px-2 py-0.5 rounded">
                                {s.paymentMethod}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right font-black text-indigo-700">S/ {s.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TESORERIA */}
            {activeTab === "tesoreria" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-base font-bold text-gray-900">Operaciones Generales de Tesorería</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Ingresos y egresos globales del negocio, incluidos préstamos, inversiones y gastos.</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-slate-50 border border-gray-200 rounded-xl px-3 mr-2">
                      <Search className="w-4 h-4 text-gray-400 mr-2" />
                      <input
                        type="text"
                        placeholder="Filtrar por motivo/detalle..."
                        className="py-2 bg-transparent outline-none text-xs w-44"
                        value={searchTx}
                        onChange={(e) => setSearchTx(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={exportTreasuryExcel}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
                    >
                      <FileDown className="w-4 h-4" /> Excel
                    </button>
                    <button
                      onClick={exportTreasuryPdf}
                      className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-rose-700 transition-all"
                    >
                      <FileDown className="w-4 h-4" /> PDF
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-gray-500 uppercase text-xs font-bold">
                        <tr>
                          <th className="px-5 py-4 text-left">Fecha/Hora</th>
                          <th className="px-5 py-4 text-left">Motivo</th>
                          <th className="px-5 py-4 text-center">Tipo</th>
                          <th className="px-5 py-4 text-left">Caja/Cuenta</th>
                          <th className="px-5 py-4 text-center">Estado</th>
                          <th className="px-5 py-4 text-right">Importe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredTreasury.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                              {format(new Date(t.date), "dd/MM/yyyy HH:mm")}
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-bold text-gray-900 block">{t.name}</span>
                              <span className="text-[10px] text-gray-400">{t.description || "Sin descripción"}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {t.type === "INCOME" ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">
                                  Ingreso
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-xs font-bold">
                                  Egreso
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-gray-600 font-semibold">{t.paymentMethod || "Caja General"}</td>
                            <td className="px-5 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                t.status === "CANCELLED"
                                  ? "bg-rose-100 text-rose-700"
                                  : t.status === "PENDING"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {t.status === "CANCELLED"
                                  ? "Anulado"
                                  : t.status === "PENDING"
                                  ? "Pendiente"
                                  : "Finalizado"}
                              </span>
                            </td>
                            <td className={`px-5 py-4 text-right font-black ${t.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>
                              {t.type === "INCOME" ? "+" : "-"}S/ {t.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: VALORIZACION STOCK */}
            {activeTab === "inventario" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex-wrap gap-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Valorización Comercial de Inventarios</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Valor total de tus existencias calculadas al precio de costo y precio de venta comercial.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={exportInventoryExcel}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
                    >
                      <FileDown className="w-4 h-4" /> Exportar Valorización Excel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
                    <span className="text-xs font-bold text-gray-400 block mb-1">TOTAL INVERTIDO EN STOCK (COSTO)</span>
                    <span className="text-2xl font-black text-indigo-700">S/ {inventoryCostValuation.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
                    <span className="text-xs font-bold text-gray-400 block mb-1">VALOR DE VENTA TOTAL DEL STOCK</span>
                    <span className="text-2xl font-black text-emerald-700">S/ {inventorySaleValuation.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-gray-500 uppercase text-xs font-bold">
                        <tr>
                          <th className="px-5 py-4 text-left">SKU</th>
                          <th className="px-5 py-4 text-left">Producto</th>
                          <th className="px-5 py-4 text-center">Stock</th>
                          <th className="px-5 py-4 text-right">Costo Unit.</th>
                          <th className="px-5 py-4 text-right">Val. Costo</th>
                          <th className="px-5 py-4 text-right">Precio Venta</th>
                          <th className="px-5 py-4 text-right">Val. Venta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {products.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs font-mono">{p.sku || "—"}</td>
                            <td className="px-5 py-4 font-semibold text-gray-900">{p.name}</td>
                            <td className="px-5 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.stock <= p.minStock ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                                {p.stock} {p.unit || "uds"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">S/ {p.costPrice.toFixed(2)}</td>
                            <td className="px-5 py-4 text-right font-bold text-gray-700">S/ {(p.costPrice * p.stock).toFixed(2)}</td>
                            <td className="px-5 py-4 text-right">S/ {p.salePrice.toFixed(2)}</td>
                            <td className="px-5 py-4 text-right font-bold text-indigo-600">S/ {(p.salePrice * p.stock).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: MOVIMIENTOS KARDEX */}
            {activeTab === "kardex" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="text-base font-bold text-gray-900">Historial de Kardex Valorado</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Movimientos de entrada y salida de mercancía con motivos e incidencias.</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-slate-50 border border-gray-200 rounded-xl px-3 mr-2">
                      <Search className="w-4 h-4 text-gray-400 mr-2" />
                      <input
                        type="text"
                        placeholder="Buscar producto por nombre..."
                        className="py-2 bg-transparent outline-none text-xs w-44"
                        value={searchProduct}
                        onChange={(e) => setSearchProduct(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={exportKardexExcel}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
                    >
                      <FileDown className="w-4 h-4" /> Exportar Excel
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-gray-500 uppercase text-xs font-bold">
                        <tr>
                          <th className="px-5 py-4 text-left">Fecha</th>
                          <th className="px-5 py-4 text-left">Producto</th>
                          <th className="px-5 py-4 text-center">Tipo</th>
                          <th className="px-5 py-4 text-right">Cantidad</th>
                          <th className="px-5 py-4 text-center">Motivo Operación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredMovements.map((m: any) => (
                          <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                              {format(new Date(m.createdAt), "dd/MM/yyyy HH:mm")}
                            </td>
                            <td className="px-5 py-4 font-semibold text-gray-900">{m.product?.name || "—"}</td>
                            <td className="px-5 py-4 text-center">
                              {m.type === "IN" ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">
                                  Entrada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-xs font-bold">
                                  Salida
                                </span>
                              )}
                            </td>
                            <td className={`px-5 py-4 text-right font-black ${m.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                              {m.type === "IN" ? "+" : "-"}{m.quantity} {m.product?.unit || "uds"}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="text-xs bg-slate-100 text-gray-600 px-2 py-0.5 rounded uppercase font-bold">
                                {m.reason === "SALE"
                                  ? "Venta"
                                  : m.reason === "PURCHASE"
                                    ? "Compra"
                                    : m.reason === "REVERT_PURCHASE"
                                      ? "Reversión Compra"
                                      : m.reason || "Ajuste"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Appshell>
  );
}
