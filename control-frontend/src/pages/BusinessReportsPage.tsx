import { useState, useEffect, useMemo } from "react";
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
import { getSalesRequest } from "../services/sale.api";
import { getProductsRequest, getInventoryMovementsRequest } from "../services/product.api";
import { getBranchesRequest } from "../services/branch.api";
import { getWorkersRequest } from "../services/user.api";
import { getAdvisorsRequest } from "../services/advisor.api";
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
import { format, subDays, parseISO, isSameDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "react-hot-toast";
import DateRangePicker from "../components/ui/DateRangePicker";
import { exportToExcel } from "../utils/exportExcel";
import { useAuth } from "../auth/AuthContext";
import Pagination from "../components/ui/Pagination";

export default function BusinessReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "ventas" | "tesoreria" | "inventario" | "kardex" | "comisiones">("general");
  const [loading, setLoading] = useState(true);

  // Raw Database Data
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTx, setSearchTx] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState("");

  // Pagination states
  const [salesPage, setSalesPage] = useState(1);
  const [treasuryPage, setTreasuryPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [kardexPage, setKardexPage] = useState(1);
  const [commissionsPage, setCommissionsPage] = useState(1);
  const pageSize = 6;

  // Reset pagination on filter change
  useEffect(() => {
    setSalesPage(1);
    setTreasuryPage(1);
    setInventoryPage(1);
    setKardexPage(1);
    setCommissionsPage(1);
  }, [
    dateFrom,
    dateTo,
    searchTx,
    searchProduct,
    selectedBranch,
    selectedWorker,
    selectedPaymentMethod,
    selectedProduct,
    selectedAdvisor,
  ]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [txs, salesData, prods, movs, branchList, workerList, advisorList] = await Promise.all([
        getTransactionsRequest({ workspace: "BUSINESS" }),
        getSalesRequest({ workspace: "BUSINESS" }),
        getProductsRequest(),
        getInventoryMovementsRequest(),
        getBranchesRequest(),
        getWorkersRequest(),
        getAdvisorsRequest(),
      ]);
      setTransactions(txs);
      setSales(salesData);
      setProducts(prods);
      setMovements(movs);
      setBranches(branchList);
      setWorkers(workerList);
      setAdvisors(advisorList || []);
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
    const day = typeof t.date === "string" ? t.date.slice(0, 10) : "";
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    if (selectedBranch && t.branchId !== selectedBranch) return false;
    if (selectedWorker && t.userId !== selectedWorker) return false;
    if (selectedPaymentMethod && t.paymentMethod !== selectedPaymentMethod) return false;
    if (selectedAdvisor && t.advisorId !== selectedAdvisor) return false;
    if (selectedProduct) {
      const q = selectedProduct.toLowerCase();
      const inName = (t.name || "").toLowerCase().includes(q);
      const inDesc = (t.description || "").toLowerCase().includes(q);
      if (!inName && !inDesc) return false;
    }
    return true;
  });

  // POS Sales only
  const filteredSales = sales.filter((s: any) => {
    if (!s.date) return true;
    const day = typeof s.date === "string" ? s.date.slice(0, 10) : "";
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    if (selectedBranch && s.branchId !== selectedBranch) return false;
    if (selectedWorker && s.userId !== selectedWorker) return false;
    if (selectedPaymentMethod && s.paymentMethod !== selectedPaymentMethod) return false;
    if (selectedAdvisor && s.advisorId !== selectedAdvisor) return false;
    return true;
  });


  // 2. METRICS & CHART COMPUTATIONS
  // Income vs Expenses - only count PAID transactions!
  const totalIncome = filteredTxs
    .filter((t: any) => t.type === "INCOME" && t.status === "PAID")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const totalExpense = filteredTxs
    .filter((t: any) => t.type === "EXPENSE" && t.status === "PAID")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpense;

  const filteredTreasury = filteredTxs.filter((t: any) => {
    if (searchTx) {
      const q = searchTx.toLowerCase();
      return (
        (t.name || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.paymentMethod || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Kardex movements
  const filteredMovements = movements.filter((m: any) => {
    if (!m.createdAt) return true;
    const day = typeof m.createdAt === "string" ? m.createdAt.slice(0, 10) : "";
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    if (selectedBranch && m.branchId !== selectedBranch) return false;
    if (selectedWorker && m.userId !== selectedWorker) return false;
    if (selectedProduct) {
      const q = selectedProduct.toLowerCase();
      const inProdName = (m.product?.name || "").toLowerCase().includes(q);
      if (!inProdName) return false;
    }
    if (searchProduct) {
      const q = searchProduct.toLowerCase();
      return (
        (m.product?.name || "").toLowerCase().includes(q) ||
        (m.product?.sku || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const paginatedSales = useMemo(() => {
    return filteredSales.slice((salesPage - 1) * pageSize, salesPage * pageSize);
  }, [filteredSales, salesPage, pageSize]);

  const paginatedTreasury = useMemo(() => {
    return filteredTreasury.slice((treasuryPage - 1) * pageSize, treasuryPage * pageSize);
  }, [filteredTreasury, treasuryPage, pageSize]);

  const paginatedProducts = useMemo(() => {
    return products.slice((inventoryPage - 1) * pageSize, inventoryPage * pageSize);
  }, [products, inventoryPage, pageSize]);

  const paginatedMovements = useMemo(() => {
    return filteredMovements.slice((kardexPage - 1) * pageSize, kardexPage * pageSize);
  }, [filteredMovements, kardexPage, pageSize]);

  // Filtered sales with advisor
  const filteredAdvisorSales = useMemo(() => {
    return filteredSales.filter((t: any) => t.advisorId || t.advisor);
  }, [filteredSales]);

  // Advisor statistics
  const advisorStats = useMemo(() => {
    const totalSalesVol = filteredAdvisorSales.reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalCommAmt = filteredAdvisorSales.reduce((sum: number, t: any) => {
      const rate = t.commissionPercentage ?? t.advisor?.commissionPercentage ?? 0;
      const amt = t.commissionAmount ?? (t.amount * rate) / 100;
      return sum + amt;
    }, 0);
    return {
      totalSalesVol,
      totalCommAmt,
      avgCommPercent: totalSalesVol > 0 ? (totalCommAmt / totalSalesVol) * 100 : 0,
      count: filteredAdvisorSales.length,
    };
  }, [filteredAdvisorSales]);

  // Per-advisor performance
  const perAdvisorStats = useMemo(() => {
    const statsMap: Record<string, { id: string; name: string; baseRate: number; salesCount: number; salesVol: number; commAmt: number }> = {};
    
    // Initialize with all active advisors
    advisors.forEach((adv: any) => {
      statsMap[adv.id] = {
        id: adv.id,
        name: adv.name,
        baseRate: adv.commissionPercentage,
        salesCount: 0,
        salesVol: 0,
        commAmt: 0,
      };
    });

    // Populate from transactions
    filteredAdvisorSales.forEach((t: any) => {
      const advId = t.advisorId || t.advisor?.id;
      if (!advId) return;

      const rate = t.commissionPercentage ?? t.advisor?.commissionPercentage ?? 0;
      const amt = t.commissionAmount ?? (t.amount * rate) / 100;

      if (!statsMap[advId]) {
        statsMap[advId] = {
          id: advId,
          name: t.advisor?.name || "Asesor Inactivo/Eliminado",
          baseRate: rate,
          salesCount: 0,
          salesVol: 0,
          commAmt: 0,
        };
      }

      statsMap[advId].salesCount += 1;
      statsMap[advId].salesVol += t.amount;
      statsMap[advId].commAmt += amt;
    });

    return Object.values(statsMap).sort((a, b) => b.salesVol - a.salesVol);
  }, [advisors, filteredAdvisorSales]);

  // Paginated advisor sales for the detail table
  const paginatedAdvisorSales = useMemo(() => {
    return filteredAdvisorSales.slice((commissionsPage - 1) * pageSize, commissionsPage * pageSize);
  }, [filteredAdvisorSales, commissionsPage, pageSize]);

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
    const trendList: { date: string; ventas: number }[] = [];
    const daysToShow = 14;

    let startDate = subDays(new Date(), daysToShow - 1);
    let endDate = new Date();

    if (dateFrom) {
      startDate = parseISO(dateFrom);
    }
    if (dateTo) {
      endDate = parseISO(dateTo);
    }

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const step = diffDays > 31 ? Math.ceil(diffDays / 15) : 1;

    for (let i = 0; i <= diffDays; i += step) {
      const date = addDays(startDate, i);
      if (date > endDate) break;

      const daySales = filteredSales.filter((t: any) =>
        isSameDay(parseISO(t.date), date)
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
        sede: s.branch?.name || "Sede Central",
        vendedor: s.user ? `${s.user.name} ${s.user.lastName || ""}` : "—",
        descripcion: s.description || "Venta",
        metodo: s.paymentMethod,
        monto: s.amount,
      })),
      [
        { key: "fecha", label: "Fecha" },
        { key: "sede", label: "Sede" },
        { key: "vendedor", label: "Vendedor" },
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
        sede: t.branch?.name || "Sede Central",
        vendedor: t.user ? `${t.user.name} ${t.user.lastName || ""}` : "—",
        motivo: t.name,
        tipo: t.type === "INCOME" ? "Ingreso" : "Egreso",
        descripcion: t.description || "—",
        metodo: t.paymentMethod,
        monto: t.amount,
      })),
      [
        { key: "fecha", label: "Fecha/Hora" },
        { key: "sede", label: "Sede" },
        { key: "vendedor", label: "Vendedor" },
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
        sede: m.branch?.name || "Sede Central",
        vendedor: m.user ? `${m.user.name} ${m.user.lastName || ""}` : "—",
        producto: m.product?.name || "—",
        sku: m.product?.sku || "—",
        tipo: m.type === "IN" ? "Entrada" : "Salida",
        cantidad: m.quantity,
        motivo: m.reason,
      })),
      [
        { key: "fecha", label: "Fecha" },
        { key: "sede", label: "Sede" },
        { key: "vendedor", label: "Colaborador" },
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

  const exportKardexPdf = async () => {
    if (filteredMovements.length === 0) {
      toast.error("No hay movimientos para exportar");
      return;
    }
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      const branchLabel = selectedBranch ? (branches.find((b: any) => b.id === selectedBranch)?.name || "Sede") : "Todas";

      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 297, 26, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("HISTORIAL DE MOVIMIENTOS KARDEX", 14, 10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Sede: ${branchLabel}  |  Rango: ${dateFrom || "Inicio"} al ${dateTo || "Hoy"}  |  ${filteredMovements.length} movimientos  |  Exportado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 17);
      doc.text(user?.businessName || "", 14, 22);

      const headers = ["Fecha/Hora", "Sede", "Colaborador", "Producto", "SKU", "Tipo", "Cantidad", "Motivo"];
      const colWidths = [32, 28, 32, 48, 22, 18, 22, 30];

      const drawHeader = (sy: number) => {
        doc.setFillColor(30, 41, 59);
        doc.rect(14, sy, 269, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        let cx = 14;
        headers.forEach((h, i) => { doc.text(h, cx + 2, sy + 5); cx += colWidths[i]; });
        doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      };

      let y = 34;
      drawHeader(y);
      y += 7;

      filteredMovements.forEach((m: any, idx: number) => {
        const prodLines = doc.splitTextToSize(m.product?.name || "—", colWidths[3] - 4);
        const rowH = Math.max(7, prodLines.length * 4.5);

        if (y + rowH > 195) { doc.addPage(); y = 15; drawHeader(y); y += 7; }

        if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y, 269, rowH, "F"); }
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + rowH, 283, y + rowH);

        let cx = 14;
        const cells = [
          format(new Date(m.createdAt), "dd/MM/yy HH:mm"),
          m.branch?.name || "Central",
          m.user ? `${m.user.name} ${m.user.lastName || ""}`.trim() : "—",
          null, // product lines handled below
          m.product?.sku || "—",
          m.type === "IN" ? "Entrada" : "Salida",
          `${m.type === "IN" ? "+" : "-"}${m.quantity} ${m.product?.unit || "uds"}`,
          m.reason || "—",
        ];

        cells.forEach((val, i) => {
          if (val === null) {
            // Product column with wrapping
            doc.setTextColor(30, 41, 59);
            doc.text(prodLines, cx + 2, y + 5);
          } else {
            if (i === 5) {
              doc.setTextColor(m.type === "IN" ? 5 : 190, m.type === "IN" ? 150 : 18, m.type === "IN" ? 105 : 60);
              doc.setFont("helvetica", "bold");
            } else if (i === 6) {
              doc.setTextColor(m.type === "IN" ? 5 : 190, m.type === "IN" ? 150 : 18, m.type === "IN" ? 105 : 60);
              doc.setFont("helvetica", "bold");
            } else {
              doc.setTextColor(55, 65, 81);
              doc.setFont("helvetica", "normal");
            }
            doc.text(String(val), cx + 2, y + 5);
            doc.setFont("helvetica", "normal"); doc.setTextColor(55, 65, 81);
          }
          cx += colWidths[i];
        });
        y += rowH;
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text("Control Finanzas ERP — Movimientos Kardex", 14, 203);
        doc.text(`Página ${i} de ${totalPages}`, 275, 203);
      }

      doc.save(`Kardex_Movimientos_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF de Kardex descargado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF");
    }
  };

  const exportInventoryPdf = async () => {
    const productsToExport = selectedBranch
      ? products.filter((p: any) => p.branchStocks?.some((bs: any) => bs.branchId === selectedBranch && bs.stock > 0))
      : products;

    if (productsToExport.length === 0) {
      toast.error("No hay productos para exportar");
      return;
    }
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const branchLabel = selectedBranch ? (branches.find((b: any) => b.id === selectedBranch)?.name || "Sede") : "Todas las Sedes";
      const costVal = productsToExport.reduce((sum: number, p: any) => {
        const stock = selectedBranch ? (p.branchStocks?.find((bs: any) => bs.branchId === selectedBranch)?.stock ?? p.stock) : p.stock;
        return sum + p.costPrice * stock;
      }, 0);
      const saleVal = productsToExport.reduce((sum: number, p: any) => {
        const stock = selectedBranch ? (p.branchStocks?.find((bs: any) => bs.branchId === selectedBranch)?.stock ?? p.stock) : p.stock;
        return sum + p.salePrice * stock;
      }, 0);

      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 32, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("VALORIZACIÓN DE INVENTARIO", 14, 11);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Sede: ${branchLabel}  |  ${productsToExport.length} productos  |  Exportado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 18);
      doc.text(`Val. Costo: S/ ${costVal.toFixed(2)}  |  Val. Venta: S/ ${saleVal.toFixed(2)}  |  Margen: S/ ${(saleVal - costVal).toFixed(2)}`, 14, 24);

      const drawHeader = (sy: number) => {
        doc.setFillColor(79, 70, 229);
        doc.rect(14, sy, 182, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.text("SKU", 16, sy + 5);
        doc.text("Producto", 38, sy + 5);
        doc.text("Stock", 108, sy + 5);
        doc.text("Costo Unit.", 124, sy + 5);
        doc.text("Val. Costo", 148, sy + 5);
        doc.text("Precio Vta", 168, sy + 5);
        doc.text("Val. Venta", 188, sy + 5);
        doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      };

      let y = 40;
      drawHeader(y);
      y += 7;

      productsToExport.forEach((p: any, idx: number) => {
        const stock = selectedBranch ? (p.branchStocks?.find((bs: any) => bs.branchId === selectedBranch)?.stock ?? p.stock) : p.stock;
        const nameLines = doc.splitTextToSize(p.name || "", 68);
        const rowH = Math.max(7, nameLines.length * 4.5);

        if (y + rowH > 278) { doc.addPage(); y = 15; drawHeader(y); y += 7; }

        if (idx % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(14, y, 182, rowH, "F"); }
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + rowH, 196, y + rowH);

        doc.setTextColor(100, 116, 139);
        doc.text(p.sku || "—", 16, y + 5);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.text(nameLines, 38, y + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        doc.text(`${stock} ${p.unit || "uds"}`, 108, y + 5);
        doc.text(`S/ ${(p.costPrice || 0).toFixed(2)}`, 124, y + 5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text(`S/ ${(p.costPrice * stock).toFixed(2)}`, 148, y + 5);
        doc.setTextColor(55, 65, 81);
        doc.setFont("helvetica", "normal");
        doc.text(`S/ ${(p.salePrice || 0).toFixed(2)}`, 168, y + 5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(5, 150, 105);
        doc.text(`S/ ${(p.salePrice * stock).toFixed(2)}`, 188, y + 5);
        doc.setFont("helvetica", "normal"); doc.setTextColor(55, 65, 81);
        y += rowH;
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text("Control Finanzas ERP — Valorización de Stock", 14, 291);
        doc.text(`Página ${i} de ${totalPages}`, 185, 291);
      }

      doc.save(`Valorizacion_Stock_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF de Valorización descargado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF");
    }
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
      doc.rect(0, 0, 210, 32, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("REPORTE OPERATIVO DE VENTAS POS", 14, 11);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      
      const branchName = selectedBranch ? (branches.find(b => b.id === selectedBranch)?.name || "Sede") : "Todas";
      const workerName = selectedWorker ? (selectedWorker === (user?.parentId || user?.id) ? "Propietario" : (workers.find(w => w.id === selectedWorker)?.name || "Colaborador")) : "Todos";
      const pmName = selectedPaymentMethod ? selectedPaymentMethod : "Todos";
      const filterText = `Sede: ${branchName} | Vendedor: ${workerName} | Medio: ${pmName}`;

      doc.text(`Filtros: ${filterText}  |  Rango: ${dateFrom || "Inicio"} al ${dateTo || "Hoy"}`, 14, 19);
      doc.text(`Fecha Impresión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 25);

      // Summary KPIs Box
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(14, 38, 182, 22, 2, 2, "F");
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TOTAL VENTAS", 20, 45);
      doc.setFontSize(12);
      doc.text(`S/ ${posSalesVolume.toFixed(2)}`, 20, 53);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TRANSACCIONES", 80, 45);
      doc.setFontSize(12);
      doc.text(`${filteredSales.length} ventas`, 80, 53);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TICKET PROMEDIO", 140, 45);
      doc.setFontSize(12);
      doc.text(`S/ ${averageSalesTicket.toFixed(2)}`, 140, 53);

      // Table Title
      doc.setTextColor(49, 46, 129);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE OPERACIONES EN PUNTO DE VENTA", 14, 68);

      // Draw table
      const startY = 74;
      const headers = ["Fecha/Hora", "Sede", "Vendedor", "Detalle de Venta", "Método", "Importe"];
      const colWidths = [28, 28, 28, 53, 20, 25];
      
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
        const rawDesc = s.description || "Venta POS";
        const descLines = doc.splitTextToSize(rawDesc, colWidths[3] - 4);
        const rowH = Math.max(6.5, descLines.length * 4.5);

        if (y + rowH > 270) {
          doc.addPage();
          y = 15;
          doc.setFillColor(49, 46, 129);
          doc.rect(14, y, 182, 7, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          let hx = 14;
          headers.forEach((h, i) => { doc.text(h, hx + 2, y + 5); hx += colWidths[i]; });
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.setFontSize(7);
          y += 7;
        }

        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, rowH, "F");
        }
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + rowH, 196, y + rowH);

        doc.setFontSize(7);
        let tx = 14;
        const row = [
          format(new Date(s.date), "dd/MM/yyyy HH:mm"),
          s.branch?.name || "Sede Central",
          s.user ? `${s.user.name} ${s.user.lastName || ""}` : "—",
          null, // description - handled separately
          s.paymentMethod || "CASH",
          `S/ ${s.amount.toFixed(2)}`,
        ];
        
        row.forEach((val, i) => {
          if (val === null) {
            doc.setTextColor(55, 65, 81);
            doc.text(descLines, tx + 2, y + 4.5);
          } else {
            if (i === 5) {
              doc.setFont("helvetica", "bold");
              doc.setTextColor(79, 70, 229);
            } else {
              doc.setFont("helvetica", "normal");
              doc.setTextColor(51, 65, 85);
            }
            doc.text(String(val), tx + 2, y + 4.5);
            doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
          }
          tx += colWidths[i];
        });
        y += rowH;
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
      doc.rect(0, 0, 210, 32, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("ESTADO DE FLUJO DE CAJA & TESORERÍA", 14, 11);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");

      const branchName = selectedBranch ? (branches.find(b => b.id === selectedBranch)?.name || "Sede") : "Todas";
      const workerName = selectedWorker ? (selectedWorker === (user?.parentId || user?.id) ? "Propietario" : (workers.find(w => w.id === selectedWorker)?.name || "Colaborador")) : "Todos";
      const pmName = selectedPaymentMethod ? selectedPaymentMethod : "Todos";
      const filterText = `Sede: ${branchName} | Vendedor: ${workerName} | Medio: ${pmName}`;

      doc.text(`Filtros: ${filterText}  |  Rango: ${dateFrom || "Inicio"} al ${dateTo || "Hoy"}`, 14, 19);
      doc.text(`Fecha Impresión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 25);

      // Summary KPIs Box
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(14, 38, 182, 22, 2, 2, "F");
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("INGRESOS GENERALES", 20, 45);
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text(`+S/ ${totalIncome.toFixed(2)}`, 20, 53);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.text("EGRESOS / PAGOS", 80, 45);
      doc.setFontSize(12);
      doc.setTextColor(225, 29, 72);
      doc.text(`-S/ ${totalExpense.toFixed(2)}`, 80, 53);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.text("FLUJO NETO", 140, 45);
      doc.setFontSize(12);
      doc.setTextColor(netCashFlow >= 0 ? 16 : 225, netCashFlow >= 0 ? 185 : 29, netCashFlow >= 0 ? 129 : 72);
      doc.text(`S/ ${netCashFlow.toFixed(2)}`, 140, 53);

      // Table Title
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("HISTORIAL DE MOVIMIENTOS DE CAJA Y BANCOS", 14, 68);

      // Draw table
      const startY = 74;
      const headers = ["Fecha", "Sede", "Vendedor", "Motivo/Detalle", "Tipo", "Medio", "Importe"];
      const colWidths = [28, 25, 25, 49, 18, 17, 20];
      
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
        const motivo = t.name + (t.description ? ` — ${t.description}` : "");
        const motivoLines = doc.splitTextToSize(motivo, colWidths[3] - 4);
        const rowH = Math.max(6.5, motivoLines.length * 4.5);

        if (y + rowH > 270) {
          doc.addPage();
          y = 15;
          doc.setFillColor(30, 41, 59);
          doc.rect(14, y, 182, 7, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          let hx = 14;
          headers.forEach((h, i) => { doc.text(h, hx + 2, y + 5); hx += colWidths[i]; });
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.setFontSize(7);
          y += 7;
        }

        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, rowH, "F");
        }
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + rowH, 196, y + rowH);

        doc.setFontSize(7);
        let tx = 14;
        const simpleVals = [
          format(new Date(t.date), "dd/MM/yyyy HH:mm"),
          t.branch?.name || "Sede Central",
          t.user ? `${t.user.name} ${t.user.lastName || ""}` : "—",
          null, // motivo wrapped
          t.type === "INCOME" ? "Ingreso" : "Egreso",
          t.paymentMethod || "CASH",
          `S/ ${t.amount.toFixed(2)}`,
        ];
        
        simpleVals.forEach((val, i) => {
          if (val === null) {
            doc.setTextColor(51, 65, 85);
            doc.setFont("helvetica", "normal");
            doc.text(motivoLines, tx + 2, y + 4.5);
          } else if (i === 4) {
            doc.setTextColor(t.type === "INCOME" ? 16 : 225, t.type === "INCOME" ? 120 : 29, t.type === "INCOME" ? 87 : 72);
            doc.setFont("helvetica", "bold");
            doc.text(String(val), tx + 2, y + 4.5);
            doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
          } else if (i === 6) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(t.type === "INCOME" ? 16 : 225, t.type === "INCOME" ? 120 : 29, t.type === "INCOME" ? 87 : 72);
            doc.text(String(val), tx + 2, y + 4.5);
            doc.setFont("helvetica", "normal"); doc.setTextColor(51, 65, 85);
          } else {
            doc.setTextColor(51, 65, 85);
            doc.setFont("helvetica", "normal");
            doc.text(String(val), tx + 2, y + 4.5);
          }
          tx += colWidths[i];
        });
        y += rowH;
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

  const exportCommissionsExcel = async () => {
    await exportToExcel(
      filteredAdvisorSales.map((s: any) => {
        const rate = s.commissionPercentage ?? s.advisor?.commissionPercentage ?? 0;
        const commAmt = s.commissionAmount ?? (s.amount * rate) / 100;
        return {
          fecha: format(new Date(s.date), "dd/MM/yyyy HH:mm"),
          asesor: s.advisor?.name || "—",
          tasaComision: `${rate}%`,
          comision: commAmt,
          ventaSole: s.amount,
          sede: s.branch?.name || "—",
          vendedor: s.user ? `${s.user.name} ${s.user.lastName || ""}` : "—",
          detalle: s.description || "Venta POS",
        };
      }),
      [
        { key: "fecha", label: "Fecha/Hora" },
        { key: "asesor", label: "Asesor de Venta" },
        { key: "tasaComision", label: "% Comisión" },
        { key: "comision", label: "Monto Comisión (S/)" },
        { key: "ventaSole", label: "Monto Venta (S/)" },
        { key: "sede", label: "Sede" },
        { key: "vendedor", label: "Vendedor" },
        { key: "detalle", label: "Detalle" },
      ],
      `Reporte_Comisiones_Asesores_${format(new Date(), "yyyyMMdd")}`
    );
    toast.success("Excel de Comisiones exportado");
  };

  const exportCommissionsPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const primaryColor = [79, 70, 229]; // Indigo
      
      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 32, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("REPORTE DE COMISIONES DE ASESORES DE VENTA", 14, 11);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");

      const advName = selectedAdvisor ? (advisors.find(a => a.id === selectedAdvisor)?.name || "Asesor") : "Todos";
      const branchName = selectedBranch ? (branches.find(b => b.id === selectedBranch)?.name || "Sede") : "Todas";
      const filterText = `Asesor: ${advName} | Sede: ${branchName}`;

      doc.text(`Filtros: ${filterText}  |  Rango: ${dateFrom || "Inicio"} al ${dateTo || "Hoy"}`, 14, 19);
      doc.text(`Fecha Impresión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 25);

      // Summary KPIs Box
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(14, 38, 182, 22, 2, 2, "F");
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("VOLUMEN VENTA ASESORES", 20, 45);
      doc.setFontSize(12);
      doc.text(`S/ ${advisorStats.totalSalesVol.toFixed(2)}`, 20, 53);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TOTAL COMISIONES", 80, 45);
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229);
      doc.text(`S/ ${advisorStats.totalCommAmt.toFixed(2)}`, 80, 53);

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TASA PROMEDIO", 140, 45);
      doc.setFontSize(12);
      doc.text(`${advisorStats.avgCommPercent.toFixed(1)}%`, 140, 53);

      // Table Title
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DE COMISIONES POR TRANSACCIÓN", 14, 68);

      // Draw table
      const startY = 74;
      const headers = ["Fecha", "Asesor", "Detalle de Venta", "Sede", "Importe", "Comis.", "Comis. S/"];
      const colWidths = [26, 32, 45, 25, 20, 14, 20];
      
      // Header row
      doc.setFillColor(79, 70, 229);
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
      
      filteredAdvisorSales.forEach((s, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 15;
        }
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, 182, 6.5, "F");
        }
        doc.setFontSize(7);
        
        let tx = 14;
        const rate = s.commissionPercentage ?? s.advisor?.commissionPercentage ?? 0;
        const commAmt = s.commissionAmount ?? (s.amount * rate) / 100;
        
        const row = [
          format(new Date(s.date), "dd/MM/yyyy HH:mm"),
          s.advisor?.name || "—",
          s.description || "Venta POS",
          s.branch?.name || "—",
          `S/ ${s.amount.toFixed(2)}`,
          `${rate}%`,
          `S/ ${commAmt.toFixed(2)}`,
        ];
        
        row.forEach((val, i) => {
          if (i === 6) {
            doc.setTextColor(79, 70, 229);
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

      doc.save(`Comisiones_Asesores_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast.success("PDF de Comisiones descargado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF");
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

        {/* FILTROS AVANZADOS */}
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sede / Sucursal</label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                toast.success("Filtro de Sede actualizado");
              }}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Todas las Sedes</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vendedor / Colaborador</label>
            <select
              value={selectedWorker}
              onChange={(e) => {
                setSelectedWorker(e.target.value);
                toast.success("Filtro de Vendedor actualizado");
              }}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Todos los Vendedores</option>
              {user && (
                <option value={user.parentId || user.id}>
                  Propietario / Administrador
                </option>
              )}
              {workers.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.lastName || ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Método de Pago</label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => {
                setSelectedPaymentMethod(e.target.value);
                toast.success("Filtro de Método de Pago actualizado");
              }}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Todos los Métodos</option>
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="YAPE">Yape</option>
              <option value="PLIN">Plin</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Asesor de Venta</label>
            <select
              value={selectedAdvisor}
              onChange={(e) => {
                setSelectedAdvisor(e.target.value);
                toast.success("Filtro de Asesor actualizado");
              }}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Todos los Asesores</option>
              {advisors.map((adv: any) => (
                <option key={adv.id} value={adv.id}>
                  {adv.name} ({adv.commissionPercentage}%)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Producto</label>
            <select
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                toast.success("Filtro de Producto actualizado");
              }}
              className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="">Todos los Productos</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
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
          <button
            onClick={() => setActiveTab("comisiones")}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === "comisiones" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <DollarSign className="w-4 h-4" /> Comisiones Asesores
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
                          <th className="px-5 py-4 text-left">Sede</th>
                          <th className="px-5 py-4 text-left">Vendedor</th>
                          <th className="px-5 py-4 text-left">Glosa/Descripción</th>
                          <th className="px-5 py-4 text-center">Método de Pago</th>
                          <th className="px-5 py-4 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedSales.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                              {format(new Date(s.date), "dd/MM/yyyy HH:mm")}
                            </td>
                            <td className="px-5 py-4 text-gray-600 font-semibold text-xs whitespace-nowrap">
                              {s.branch?.name || "Sede Central"}
                            </td>
                            <td className="px-5 py-4 text-gray-600 font-medium text-xs whitespace-nowrap">
                              {s.user ? `${s.user.name} ${s.user.lastName || ""}` : "—"}
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
                  {filteredSales.length > 0 && (
                    <Pagination
                      currentPage={salesPage}
                      totalItems={filteredSales.length}
                      pageSize={6}
                      onPageChange={(p) => setSalesPage(p)}
                      className="border-t border-gray-100 bg-gray-50 px-4 py-3"
                    />
                  )}
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
                          <th className="px-5 py-4 text-left">Sede</th>
                          <th className="px-5 py-4 text-left">Vendedor</th>
                          <th className="px-5 py-4 text-left">Motivo</th>
                          <th className="px-5 py-4 text-center">Tipo</th>
                          <th className="px-5 py-4 text-left">Caja/Cuenta</th>
                          <th className="px-5 py-4 text-center">Estado</th>
                          <th className="px-5 py-4 text-right">Importe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedTreasury.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                              {format(new Date(t.date), "dd/MM/yyyy HH:mm")}
                            </td>
                            <td className="px-5 py-4 text-gray-600 font-semibold text-xs whitespace-nowrap">
                              {t.branch?.name || "Sede Central"}
                            </td>
                            <td className="px-5 py-4 text-gray-600 font-medium text-xs whitespace-nowrap">
                              {t.user ? `${t.user.name} ${t.user.lastName || ""}` : "—"}
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
                  {filteredTreasury.length > 0 && (
                    <Pagination
                      currentPage={treasuryPage}
                      totalItems={filteredTreasury.length}
                      pageSize={6}
                      onPageChange={(p) => setTreasuryPage(p)}
                      className="border-t border-gray-100 bg-gray-50 px-4 py-3"
                    />
                  )}
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
                      <FileDown className="w-4 h-4" /> Excel
                    </button>
                    <button
                      onClick={exportInventoryPdf}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-all"
                    >
                      <FileDown className="w-4 h-4" /> PDF
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
                        {paginatedProducts.map((p: any) => (
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
                  {products.length > 0 && (
                    <Pagination
                      currentPage={inventoryPage}
                      totalItems={products.length}
                      pageSize={6}
                      onPageChange={(p) => setInventoryPage(p)}
                      className="border-t border-gray-100 bg-gray-50 px-4 py-3"
                    />
                  )}
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
                      <FileDown className="w-4 h-4" /> Excel
                    </button>
                    <button
                      onClick={exportKardexPdf}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-gray-800 transition-all"
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
                          <th className="px-5 py-4 text-left">Fecha</th>
                          <th className="px-5 py-4 text-left">Sede</th>
                          <th className="px-5 py-4 text-left">Colaborador</th>
                          <th className="px-5 py-4 text-left">Producto</th>
                          <th className="px-5 py-4 text-center">Tipo</th>
                          <th className="px-5 py-4 text-right">Cantidad</th>
                          <th className="px-5 py-4 text-center">Motivo Operación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedMovements.map((m: any) => (
                          <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                              {format(new Date(m.createdAt), "dd/MM/yyyy HH:mm")}
                            </td>
                            <td className="px-5 py-4 text-gray-600 font-semibold text-xs whitespace-nowrap">
                              {m.branch?.name || "Sede Central"}
                            </td>
                            <td className="px-5 py-4 text-gray-600 font-medium text-xs whitespace-nowrap">
                              {m.user ? `${m.user.name} ${m.user.lastName || ""}` : "—"}
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
                                      : m.reason === "ADJUSTMENT"
                                        ? "Ajuste"
                                        : m.reason || "Ajuste"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredMovements.length > 0 && (
                    <Pagination
                      currentPage={kardexPage}
                      totalItems={filteredMovements.length}
                      pageSize={6}
                      onPageChange={(p) => setKardexPage(p)}
                      className="border-t border-gray-100 bg-gray-50 px-4 py-3"
                    />
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: COMISIONES */}
            {activeTab === "comisiones" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex-wrap gap-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Comisiones de Asesores de Venta</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Control de comisiones y rendimiento comercial por asesor asignado en caja.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={exportCommissionsExcel}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all"
                    >
                      <FileDown className="w-4 h-4" /> Exportar Excel
                    </button>
                    <button
                      onClick={exportCommissionsPdf}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-all"
                    >
                      <FileDown className="w-4 h-4" /> Exportar PDF
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Volumen Total Asesores</span>
                    <span className="text-xl font-extrabold text-indigo-600">S/ {advisorStats.totalSalesVol.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Total Comisiones</span>
                    <span className="text-xl font-extrabold text-indigo-600">S/ {advisorStats.totalCommAmt.toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tasa Comisión Promedio</span>
                    <span className="text-xl font-extrabold text-indigo-600">{advisorStats.avgCommPercent.toFixed(2)}%</span>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Cantidad de Ventas</span>
                    <span className="text-xl font-extrabold text-indigo-600">{advisorStats.count} ventas</span>
                  </div>
                </div>

                {/* Performance Breakdown per Advisor */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">Rendimiento por Asesor</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-gray-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-5 py-3 text-left">Asesor de Venta</th>
                          <th className="px-5 py-3 text-center">Tasa Base</th>
                          <th className="px-5 py-3 text-center">Ventas Realizadas</th>
                          <th className="px-5 py-3 text-right">Volumen Vendido</th>
                          <th className="px-5 py-3 text-right">Comisión Generada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                        {perAdvisorStats.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-xs text-gray-400">
                              Ningún asesor tiene operaciones registradas en el período seleccionado.
                            </td>
                          </tr>
                        ) : (
                          perAdvisorStats.map((ast: any) => (
                            <tr key={ast.id} className="hover:bg-slate-50/20 transition-colors">
                              <td className="px-5 py-3 text-gray-900 font-extrabold">{ast.name}</td>
                              <td className="px-5 py-3 text-center text-gray-500">{ast.baseRate}%</td>
                              <td className="px-5 py-3 text-center text-gray-500">{ast.salesCount}</td>
                              <td className="px-5 py-3 text-right text-gray-900">S/ {ast.salesVol.toFixed(2)}</td>
                              <td className="px-5 py-3 text-right text-indigo-600 font-black">S/ {ast.commAmt.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Detailed Transactions List */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50/50 border-b border-gray-100 flex justify-between text-xs font-bold text-gray-500">
                    <span>Lista Detallada de Transacciones con Asesor</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-gray-500 uppercase text-xs font-bold">
                        <tr>
                          <th className="px-5 py-4 text-left">Fecha/Hora</th>
                          <th className="px-5 py-4 text-left">Asesor</th>
                          <th className="px-5 py-4 text-left">Glosa/Detalle</th>
                          <th className="px-5 py-4 text-left">Sede</th>
                          <th className="px-5 py-4 text-right">Monto Venta</th>
                          <th className="px-5 py-4 text-center">% Comis.</th>
                          <th className="px-5 py-4 text-right">Comisión S/</th>
                          <th className="px-5 py-4 text-left">Vendedor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {paginatedAdvisorSales.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-xs text-gray-400 font-bold">
                              No hay transacciones asociadas a asesores en este filtro.
                            </td>
                          </tr>
                        ) : (
                          paginatedAdvisorSales.map((s: any) => {
                            const rate = s.commissionPercentage ?? s.advisor?.commissionPercentage ?? 0;
                            const commAmt = s.commissionAmount ?? (s.amount * rate) / 100;
                            return (
                              <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs">
                                  {format(new Date(s.date), "dd/MM/yyyy HH:mm")}
                                </td>
                                <td className="px-5 py-4 text-gray-900 font-bold text-xs whitespace-nowrap">
                                  {s.advisor?.name || "—"}
                                </td>
                                <td className="px-5 py-4 text-gray-600 font-semibold">{s.description || "Venta POS"}</td>
                                <td className="px-5 py-4 text-gray-600 font-semibold text-xs whitespace-nowrap">
                                  {s.branch?.name || "Sede Central"}
                                </td>
                                <td className="px-5 py-4 text-right font-bold text-gray-900">S/ {s.amount.toFixed(2)}</td>
                                <td className="px-5 py-4 text-center">
                                  <span className="text-xs bg-slate-100 text-gray-600 font-bold px-2 py-0.5 rounded">
                                    {rate}%
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right font-black text-indigo-700">S/ {commAmt.toFixed(2)}</td>
                                <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                                  {s.user ? `${s.user.name} ${s.user.lastName || ""}` : "—"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredAdvisorSales.length > 0 && (
                    <Pagination
                      currentPage={commissionsPage}
                      totalItems={filteredAdvisorSales.length}
                      pageSize={6}
                      onPageChange={(p) => setCommissionsPage(p)}
                      className="border-t border-gray-100 bg-gray-50 px-4 py-3"
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Appshell>
  );
}
