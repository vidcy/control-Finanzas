import { useState, useEffect, useMemo } from "react";
import Appshell from "../components/layout/Appshell";
import {
  Search,
  ArrowRightLeft,
  Package,
  FileDown,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Filter,
  AlertCircle,
  PlusCircle,
  TrendingUp as ProfitIcon,
  HelpCircle,
  FileText,
  Check,
  Sliders,
  ShoppingCart,
  RotateCcw,
  Sparkles
} from "lucide-react";
import {
  getProductsRequest,
  getInventoryMovementsRequest,
  updateProductRequest,
  getBrandsRequest,
  getFamiliesRequest,
  checkoutCartRequest,
  restockProductRequest,
  type Product,
  type InventoryMovement
} from "../services/product.api";
import { listCategoriesRequest } from "../services/category.api";
import API from "../services/axios";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

// Interface for enriched movements with running Kardex calculations
interface EnrichedMovement extends InventoryMovement {
  computedUnitCost: number;
  computedTotalCost: number;
  computedStockResult: number;
  computedRunningCPP: number;
  computedRunningValue: number;
}

export default function BusinessKardexPage() {
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedProductId, setSelectedProductId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL"); // ALL, IN, OUT, ADJUSTMENT, REVERT
  const [filterBrandId, setFilterBrandId] = useState("");
  const [filterFamilyId, setFilterFamilyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // UI Control States
  const [isExporting, setIsExporting] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedMovementForDetail, setSelectedMovementForDetail] = useState<EnrichedMovement | null>(null);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  // Stock Adjustment Form States
  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustType, setAdjustType] = useState<"IN" | "OUT">("IN");
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("Ajuste manual de inventario");
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [prodsData, movsData, brandsData, familiesData] = await Promise.all([
        getProductsRequest(),
        getInventoryMovementsRequest(),
        getBrandsRequest(),
        getFamiliesRequest()
      ]);
      setProducts(prodsData);
      setMovements(movsData);
      setBrands(brandsData);
      setFamilies(familiesData);
    } catch (err: any) {
      toast.error("Error al cargar la información del Kardex");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Running Kardex Balances Chronologically per Product
  const computedMovementsMap = useMemo(() => {
    const map: Record<string, EnrichedMovement[]> = {};

    // Group movements by product
    const grouped: Record<string, InventoryMovement[]> = {};
    movements.forEach((m) => {
      if (!grouped[m.productId]) {
        grouped[m.productId] = [];
      }
      grouped[m.productId].push(m);
    });

    // Compute running balance for each group
    Object.keys(grouped).forEach((productId) => {
      const prodMovs = grouped[productId];
      // Sort oldest to newest for calculation
      const sorted = [...prodMovs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      let runningQty = 0;
      let runningVal = 0;
      let runningCPP = 0;

      const enriched: EnrichedMovement[] = sorted.map((m) => {
        const qty = m.quantity;
        const isEntry = m.type === "IN";
        const dbProd = products.find((p) => p.id === m.productId);
        const unitCost =
          m.unitCost !== undefined && m.unitCost !== null
            ? m.unitCost
            : isEntry
            ? dbProd?.costPrice || 0
            : runningCPP;
        const totalCost =
          m.totalCost !== undefined && m.totalCost !== null
            ? m.totalCost
            : qty * unitCost;

        if (isEntry) {
          runningQty += qty;
          runningVal += totalCost;
          runningCPP = runningQty > 0 ? runningVal / runningQty : unitCost;
        } else {
          runningQty -= qty;
          const exitCost = runningCPP;
          const exitTotal = qty * exitCost;
          runningVal -= exitTotal;
        }

        return {
          ...m,
          computedUnitCost: unitCost,
          computedTotalCost: totalCost,
          computedRunningCPP: runningCPP,
          computedRunningValue: runningQty * runningCPP,
          computedStockResult:
            m.stockResult !== null && m.stockResult !== undefined
              ? m.stockResult
              : runningQty
        };
      });

      // Keep descending (newest first) for UI display
      map[productId] = enriched.reverse();
    });

    return map;
  }, [movements, products]);

  // Reconciliation Check
  const isReconciled = useMemo(() => {
    let reconciled = true;
    products.forEach((p) => {
      const prodMovs = computedMovementsMap[p.id] || [];
      if (prodMovs.length > 0) {
        const lastMov = prodMovs[0];
        if (p.stock !== lastMov.computedStockResult) {
          reconciled = false;
        }
      } else if (p.stock !== 0) {
        reconciled = false;
      }
    });
    return reconciled;
  }, [products, computedMovementsMap]);

  // Seeding Demo Data
  const handleSeedDemoData = async () => {
    if (products.length === 0) {
      toast.error("Por favor, cree al menos un producto en el Almacén antes de generar movimientos demo.");
      return;
    }
    setIsSeedingDemo(true);
    const loadingToast = toast.loading("Generando movimientos demo de prueba...");
    try {
      let cats = await listCategoriesRequest();
      let expenseCat = cats.find((c: any) => c.type === "EXPENSE");
      let incomeCat = cats.find((c: any) => c.type === "INCOME");

      if (!expenseCat || !incomeCat) {
        await API.post("/categories/seed-default");
        cats = await listCategoriesRequest();
        expenseCat = cats.find((c: any) => c.type === "EXPENSE");
        incomeCat = cats.find((c: any) => c.type === "INCOME");
      }

      const expCatId = expenseCat?.id || cats[0]?.id;
      const incCatId = incomeCat?.id || cats[0]?.id;

      const targetProducts = products.slice(0, 2);
      for (const p of targetProducts) {
        // Restock
        await restockProductRequest(p.id, {
          quantity: 20,
          totalCost: 20 * p.costPrice,
          categoryId: expCatId,
          paymentMethod: "CASH"
        });

        // Checkout POS sale
        await checkoutCartRequest({
          items: [{ id: p.id, quantity: 4, salePrice: p.salePrice, name: p.name }],
          paymentMethod: "CASH",
          categoryId: incCatId
        });

        // Stock update adjustment
        const currentStock = p.stock + 20 - 4;
        await updateProductRequest(p.id, {
          stock: currentStock + 2
        });
      }

      toast.dismiss(loadingToast);
      toast.success("Movimientos demo de prueba generados con éxito!");
      await loadData();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Error al generar movimientos demo");
    } finally {
      setIsSeedingDemo(false);
    }
  };



  // Flatten enriched movements or filter by selected product
  const enrichedMovementsList = useMemo(() => {
    if (selectedProductId !== "ALL") {
      return computedMovementsMap[selectedProductId] || [];
    }
    // Aggregate all
    const allEnriched: EnrichedMovement[] = [];
    Object.values(computedMovementsMap).forEach((list) => {
      allEnriched.push(...list);
    });
    // Sort all descending
    return allEnriched.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [computedMovementsMap, selectedProductId]);

  // Apply filters: search, type, date range, brand, family
  const filteredMovements = useMemo(() => {
    return enrichedMovementsList.filter((m) => {
      // 1. Search Query (SKU or Name)
      const matchesSearch =
        (m.product?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.presentationName || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Movement Type
      if (filterType !== "ALL") {
        if (filterType === "IN" && m.type !== "IN") return false;
        if (filterType === "OUT" && m.type !== "OUT") return false;
        if (filterType === "PURCHASE" && m.reason !== "PURCHASE") return false;
        if (filterType === "SALE" && m.reason !== "SALE") return false;
        if (filterType === "ADJUSTMENT" && m.reason !== "ADJUSTMENT") return false;
        if (filterType === "REVERT" && m.reason !== "REVERT_PURCHASE") return false;
      }

      // 3. Date Range
      const itemDateStr = m.createdAt.slice(0, 10);
      if (dateFrom && itemDateStr < dateFrom) return false;
      if (dateTo && itemDateStr > dateTo) return false;

      // 4. Brand and Family filters
      const dbProd = products.find((p) => p.id === m.productId);
      if (filterBrandId && dbProd?.brandId !== filterBrandId) return false;
      if (filterFamilyId && dbProd?.familyId !== filterFamilyId) return false;

      return true;
    });
  }, [enrichedMovementsList, searchQuery, filterType, dateFrom, dateTo, filterBrandId, filterFamilyId, products]);

  // Metrics calculations
  const metrics = useMemo(() => {
    // Inventory Valuation
    const totalValuation = products.reduce((acc, p) => acc + p.stock * p.costPrice, 0);
    // Total Stock units
    const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
    // Low stock warnings
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
    // Entry / Exit ratios
    const entriesCount = movements.filter((m) => m.type === "IN").length;
    const exitsCount = movements.filter((m) => m.type === "OUT").length;

    return {
      totalValuation,
      totalStock,
      lowStockCount,
      rotation: { entriesCount, exitsCount }
    };
  }, [products, movements]);

  // Sparkline chart data for selected product or overview
  const chartData = useMemo(() => {
    if (selectedProductId !== "ALL") {
      const list = computedMovementsMap[selectedProductId] || [];
      // Grab up to 15 movements, reverse to chronological order
      return [...list]
        .slice(0, 15)
        .reverse()
        .map((m) => ({
          date: format(new Date(m.createdAt), "dd/MM/yy"),
          stock: m.computedStockResult,
          cost: m.computedRunningCPP,
          valor: m.computedRunningValue
        }));
    }

    // Default overview: top 8 products by valuation
    return [...products]
      .sort((a, b) => b.stock * b.costPrice - a.stock * a.costPrice)
      .slice(0, 8)
      .map((p) => ({
        name: p.name.substring(0, 12),
        valor: p.stock * p.costPrice,
        stock: p.stock
      }));
  }, [selectedProductId, computedMovementsMap, products]);

  // Handle Manual Stock Adjustment
  const handleSaveAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId) {
      toast.error("Seleccione un producto para ajustar");
      return;
    }
    if (adjustQty <= 0) {
      toast.error("La cantidad debe ser mayor a cero");
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const executeStockAdjustment = async () => {
    setIsConfirmModalOpen(false);
    setIsSavingAdjustment(true);
    try {
      const product = products.find((p) => p.id === adjustProductId);
      if (!product) throw new Error("Producto no encontrado");

      // Calculate final target stock
      const stockDiff = adjustType === "IN" ? adjustQty : -adjustQty;
      const targetStock = product.stock + stockDiff;

      if (targetStock < 0) {
        toast.error("El stock no puede ser negativo tras el ajuste.");
        setIsSavingAdjustment(false);
        return;
      }

      // Update product stock directly (triggers ADJUSTMENT movement automatically in backend service)
      await updateProductRequest(adjustProductId, { stock: targetStock });

      toast.success("Ajuste de inventario registrado con éxito");
      setIsAdjustModalOpen(false);
      // Reset form
      setAdjustQty(0);
      setAdjustReason("Ajuste manual de inventario");
      // Reload
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Error al realizar el ajuste");
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  // Excel Export
  const exportKardexExcel = async () => {
    if (filteredMovements.length === 0) {
      toast.error("No hay registros que exportar");
      return;
    }
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      
      const rows = filteredMovements.map((m) => {
        const isEntry = m.type === "IN";
        return {
          Fecha: format(new Date(m.createdAt), "dd/MM/yyyy HH:mm"),
          Producto: m.product?.name || "—",
          Operación:
            m.reason === "SALE"
              ? "Venta"
              : m.reason === "PURCHASE"
              ? "Compra"
              : m.reason === "REVERT_PURCHASE"
              ? "Reversión Compra"
              : m.reason || "Ajuste",
          "Entradas Cantidad": isEntry ? m.quantity : "",
          "Entradas Costo Unitario": isEntry ? m.computedUnitCost.toFixed(2) : "",
          "Entradas Total": isEntry ? m.computedTotalCost.toFixed(2) : "",
          "Salidas Cantidad": !isEntry ? m.quantity : "",
          "Salidas Costo Unitario": !isEntry ? m.computedUnitCost.toFixed(2) : "",
          "Salidas Total": !isEntry ? m.computedTotalCost.toFixed(2) : "",
          "Saldo Cantidad": m.computedStockResult,
          "Saldo CPP (Costo Unitario)": m.computedRunningCPP.toFixed(2),
          "Saldo Valor Total": m.computedRunningValue.toFixed(2)
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // Widths
      ws["!cols"] = [
        { wch: 18 }, // Fecha
        { wch: 25 }, // Producto
        { wch: 15 }, // Operacion
        { wch: 12 }, // Entradas Cantidad
        { wch: 15 }, // Entradas Costo
        { wch: 12 }, // Entradas Total
        { wch: 12 }, // Salidas Cantidad
        { wch: 15 }, // Salidas Costo
        { wch: 12 }, // Salidas Total
        { wch: 12 }, // Saldo Cantidad
        { wch: 15 }, // Saldo CPP
        { wch: 15 }  // Saldo Valor
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Kardex Valorado");
      XLSX.writeFile(wb, `Kardex_Valorado_${format(new Date(), "yyyyMMdd")}.xlsx`);
      toast.success("Excel generado exitosamente");
    } catch (err) {
      toast.error("Error al exportar a Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // PDF Export
  const exportKardexPdf = async () => {
    if (filteredMovements.length === 0) {
      toast.error("No hay registros para exportar");
      return;
    }
    setIsExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      // Header Banner
      doc.setFillColor(15, 118, 110); // Teal-700
      doc.rect(0, 0, 297, 24, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("KARDEX INVENTARIO VALORADO (CPP)", 14, 10);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 17);
      
      // Selected Product details
      if (selectedProductId !== "ALL") {
        const prod = products.find(p => p.id === selectedProductId);
        if (prod) {
          doc.text(`Producto: ${prod.name} | SKU: ${prod.sku || "—"} | Unidad: ${prod.unit}`, 14, 21);
        }
      } else {
        doc.text("Reporte Multi-producto consolidado", 14, 21);
      }

      // Summary Totals Banner
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(14, 28, 269, 14, 2, 2, "F");
      
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      
      doc.text("VALORACIÓN TOTAL", 18, 33);
      doc.setFontSize(11);
      doc.setTextColor(15, 118, 110);
      doc.text(`S/ ${metrics.totalValuation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, 18, 39);

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      doc.text("UNIDADES EN STOCK", 90, 33);
      doc.setFontSize(11);
      doc.text(`${metrics.totalStock.toLocaleString("es-PE")} uds`, 90, 39);

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      doc.text("ALERTAS DE STOCK", 160, 33);
      doc.setFontSize(11);
      doc.setTextColor(metrics.lowStockCount > 0 ? 185 : 55, metrics.lowStockCount > 0 ? 28 : 65, metrics.lowStockCount > 0 ? 28 : 81);
      doc.text(`${metrics.lowStockCount} productos`, 160, 39);

      doc.setTextColor(55, 65, 81);
      doc.setFontSize(8);
      doc.text("ROTACIÓN (MOVIMIENTOS)", 220, 33);
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text(`+${metrics.rotation.entriesCount} Ent / -${metrics.rotation.exitsCount} Sal`, 220, 39);

      // Table Draw
      const startY = 48;
      
      // Secondary Multiheader Draw
      doc.setFillColor(15, 118, 110);
      doc.rect(14, startY, 269, 10, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      
      doc.text("Fecha", 16, startY + 6);
      doc.text("Producto", 40, startY + 6);
      doc.text("Detalle", 74, startY + 6);
      
      // Entradas block
      doc.text("ENTRADAS", 92, startY + 3);
      doc.text("Cant.  |  Costo  |  Total", 92, startY + 8);
      
      // Salidas block
      doc.text("SALIDAS", 164, startY + 3);
      doc.text("Cant.  |  Costo  |  Total", 164, startY + 8);
      
      // Saldo Resultante block
      doc.text("SALDO RESULTANTE (CPP)", 236, startY + 3);
      doc.text("Cant.  |  CPP    |  Total", 236, startY + 8);

      let y = startY + 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);

      filteredMovements.forEach((m, idx) => {
        if (y > 185) {
          doc.addPage();
          // redraw header block
          doc.setFillColor(15, 118, 110);
          doc.rect(14, 14, 269, 10, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.text("Fecha", 16, 20);
          doc.text("Producto", 40, 20);
          doc.text("Detalle", 74, 20);
          doc.text("ENTRADAS", 92, 17);
          doc.text("Cant.  |  Costo  |  Total", 92, 22);
          doc.text("SALIDAS", 164, 17);
          doc.text("Cant.  |  Costo  |  Total", 164, 22);
          doc.text("SALDO RESULTANTE (CPP)", 236, 17);
          doc.text("Cant.  |  CPP    |  Total", 236, 22);
          
          y = 24;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
        }

        // Zebra striping
        if (idx % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(14, y, 269, 7, "F");
        }

        const dateStr = format(new Date(m.createdAt), "dd/MM/yy HH:mm");
        const prodName = (m.product?.name || "—").substring(0, 18);
        const reasonStr = m.reason === "SALE" ? "Venta POS" : m.reason === "PURCHASE" ? "Compra" : m.reason === "REVERT_PURCHASE" ? "Reversión" : "Ajuste";
        
        doc.setTextColor(31, 41, 55);
        doc.text(dateStr, 15, y + 4.5);
        doc.text(prodName, 40, y + 4.5);
        doc.text(reasonStr, 74, y + 4.5);

        const isEntry = m.type === "IN";
        const costStr = m.computedUnitCost.toFixed(1);
        const totStr = m.computedTotalCost.toFixed(1);

        if (isEntry) {
          doc.setTextColor(4, 120, 87); // Green entry
          doc.text(`${m.quantity}`, 92, y + 4.5);
          doc.text(`${costStr}`, 108, y + 4.5);
          doc.text(`${totStr}`, 126, y + 4.5);
          // exits are blank
          doc.setTextColor(156, 163, 175);
          doc.text("—", 164, y + 4.5);
          doc.text("—", 180, y + 4.5);
          doc.text("—", 198, y + 4.5);
        } else {
          // entries are blank
          doc.setTextColor(156, 163, 175);
          doc.text("—", 92, y + 4.5);
          doc.text("—", 108, y + 4.5);
          doc.text("—", 126, y + 4.5);
          
          doc.setTextColor(185, 28, 28); // Red exits
          doc.text(`${m.quantity}`, 164, y + 4.5);
          doc.text(`${costStr}`, 180, y + 4.5);
          doc.text(`${totStr}`, 198, y + 4.5);
        }

        // Saldo
        doc.setTextColor(31, 41, 55);
        doc.text(`${m.computedStockResult}`, 236, y + 4.5);
        doc.text(`${m.computedRunningCPP.toFixed(1)}`, 252, y + 4.5);
        doc.text(`${m.computedRunningValue.toFixed(1)}`, 270, y + 4.5);

        y += 7;
      });

      // Footer numbering
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
        doc.text(`Global Ccoplex – THINK Sistema de Kardex Valorado – Pág. ${i} de ${totalPages}`, 14, 202);
      }

      doc.save(`Kardex_Valorado_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
      toast.success("PDF generado exitosamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al exportar a PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Selected Product detail display
  const selectedProductDetail = useMemo(() => {
    if (selectedProductId === "ALL") return null;
    return products.find((p) => p.id === selectedProductId) || null;
  }, [selectedProductId, products]);

  return (
    <Appshell>
      <div className="space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-sm animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-ping"></span>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">
                Módulo Automatizado
              </span>
            </div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-700">
              Kardex de Inventario Valorado
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">
              Auditoría financiera de existencias con Costo Promedio Ponderado (CPP) en tiempo real.
            </p>
            {isReconciled ? (
              <div className="mt-2.5 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100/50 shadow-sm">
                <Check className="w-3 h-3" />
                <span>Inventario Conciliado (Libros vs Stock)</span>
              </div>
            ) : (
              <div className="mt-2.5 inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-rose-100/50 shadow-sm">
                <AlertCircle className="w-3 h-3 animate-pulse" />
                <span>Desajuste Contable Detectado (Revisar stock)</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-3 text-gray-500 hover:text-teal-600 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50 active:scale-95"
              title="Sincronizar"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin text-teal-600" : ""}`} />
            </button>

            {/* Seed Demo Button */}
            <button
              onClick={handleSeedDemoData}
              disabled={loading || isSeedingDemo || products.length === 0}
              className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-2xl shadow-md hover:shadow-indigo-100 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
              title="Generar Movimientos Demo para pruebas"
            >
              <Sparkles className={`w-4 h-4 ${isSeedingDemo ? "animate-spin" : ""}`} />
              <span>{isSeedingDemo ? "Generando..." : "Generar Movimientos Demo"}</span>
            </button>

            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl shadow-md hover:shadow-teal-100 transition-all flex items-center gap-2 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ajustar Stock</span>
            </button>
            <button
              onClick={exportKardexExcel}
              disabled={isExporting || loading || filteredMovements.length === 0}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md hover:shadow-emerald-100 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              onClick={exportKardexPdf}
              disabled={isExporting || loading || filteredMovements.length === 0}
              className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl shadow-md hover:shadow-rose-100 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* METRICS DASHBOARD GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Valuation */}
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute right-[-10px] top-[-10px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-90">Valor Total Almacén</span>
              <Package className="w-5 h-5 opacity-80" />
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black leading-tight">
                S/ {metrics.totalValuation.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-white/80 text-[10px] mt-1 font-medium">
                Calculado a costo promedio (CPP)
              </p>
            </div>
          </div>

          {/* Card 2: Total Units */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Existencias Totales</span>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-black text-gray-800 leading-tight">
                {metrics.totalStock.toLocaleString("es-PE")}
              </h3>
              <p className="text-gray-400 text-[10px] mt-1">
                Unidades base consolidadas
              </p>
            </div>
          </div>

          {/* Card 3: Alert low stock */}
          <div className={`p-5 rounded-3xl border shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 ${
            metrics.lowStockCount > 0 ? "bg-red-50/50 border-red-100" : "bg-white border-gray-100"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                metrics.lowStockCount > 0 ? "text-red-500" : "text-gray-400"
              }`}>Alertas de Reposición</span>
              <div className={`p-2 rounded-xl ${
                metrics.lowStockCount > 0 ? "bg-red-100 text-red-600" : "bg-gray-50 text-gray-400"
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className={`text-2xl font-black leading-tight ${
                metrics.lowStockCount > 0 ? "text-red-700" : "text-gray-800"
              }`}>
                {metrics.lowStockCount}
              </h3>
              <p className="text-gray-400 text-[10px] mt-1">
                {metrics.lowStockCount > 0 ? "Productos requieren compra urgente" : "Nivel de stock óptimo"}
              </p>
            </div>
          </div>

          {/* Card 4: Rotation count */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Historial de Operaciones</span>
              <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-800">
                  +{metrics.rotation.entriesCount}
                </h3>
                <p className="text-[9px] text-emerald-600 font-bold uppercase">Entradas</p>
              </div>
              <div className="border-l border-gray-200 h-6 mx-1"></div>
              <div>
                <h3 className="text-lg font-black text-gray-800">
                  -{metrics.rotation.exitsCount}
                </h3>
                <p className="text-[9px] text-rose-500 font-bold uppercase">Salidas</p>
              </div>
            </div>
          </div>
        </div>

        {/* DETAILED ANALYSIS VISUALIZATION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Charts/Viz */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                  {selectedProductId === "ALL"
                    ? "Distribución del Valor de Inventario"
                    : "Historial de Niveles de Stock"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedProductId === "ALL"
                    ? "Comparativa de valoración de productos top"
                    : "Evolución de stock resultante en el Kardex"}
                </p>
              </div>
              <div className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">
                Recharts Live
              </div>
            </div>

            <div className="h-64 w-full">
              {loading ? (
                <div className="h-full w-full bg-gray-50 rounded-2xl flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : selectedProductId === "ALL" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData as any[]} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #f3f4f6", fontSize: "11px" }}
                      formatter={(value) => [`S/ ${Number(value).toFixed(2)}`, "Valoración"]}
                    />
                    <Bar dataKey="valor" fill="url(#colorVal)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData as any[]} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #f3f4f6", fontSize: "11px" }}
                      labelFormatter={(label) => `Fecha: ${label}`}
                    />
                    <Area type="monotone" dataKey="stock" stroke="#0f766e" strokeWidth={2} fillOpacity={1} fill="url(#colorStock)" name="Stock Uds" />
                    <defs>
                      <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Selected Product Card Detail */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-gray-800 uppercase tracking-wider">
              Detalle del Item
            </h2>

            {selectedProductDetail ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 overflow-hidden flex items-center justify-center shadow-sm">
                    {selectedProductDetail.imageUrl ? (
                      <img
                        src={selectedProductDetail.imageUrl}
                        alt="Product"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm leading-snug">
                      {selectedProductDetail.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      SKU: {selectedProductDetail.sku || "Sin SKU asignado"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50/30 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Stock Mínimo</p>
                    <p className="text-sm font-black text-gray-700 mt-1">{selectedProductDetail.minStock} {selectedProductDetail.unit}</p>
                  </div>
                  <div className="p-3 bg-gray-50/30 rounded-xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Stock Actual</p>
                    <p className={`text-sm font-black mt-1 ${
                      selectedProductDetail.stock <= selectedProductDetail.minStock ? "text-red-600" : "text-emerald-600"
                    }`}>
                      {selectedProductDetail.stock} {selectedProductDetail.unit}
                    </p>
                  </div>
                  <div className="p-3 bg-teal-50/30 rounded-xl border border-teal-100/50">
                    <p className="text-[10px] text-teal-600 font-bold uppercase tracking-tight">Costo Promedio (CPP)</p>
                    <p className="text-sm font-black text-teal-800 mt-1">S/ {selectedProductDetail.costPrice.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight">Precio Venta Base</p>
                    <p className="text-sm font-black text-indigo-800 mt-1">S/ {selectedProductDetail.salePrice.toFixed(2)}</p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/50 text-[11px] text-emerald-800 leading-normal flex items-start gap-2">
                  <ProfitIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Margen de Contribución: </span>
                    {selectedProductDetail.salePrice > 0
                      ? `${(((selectedProductDetail.salePrice - selectedProductDetail.costPrice) / selectedProductDetail.salePrice) * 100).toFixed(1)}%`
                      : "0.0%"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 bg-gray-50/40 rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-6">
                <HelpCircle className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs font-bold text-gray-500">Seleccione un Producto</p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Elija un producto de la lista para ver su ficha de inventario valorado completa.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* INTERACTIVE FILTERS BAR */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
            <Filter className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-black text-gray-700 uppercase tracking-widest">
              Panel de Filtros y Búsqueda
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            
            {/* Search query */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Buscar Detalle</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="SKU, descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                />
              </div>
            </div>

            {/* Product Selector */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Producto</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all truncate"
              >
                <option value="ALL">🔍 Todos los Productos</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Filter */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Marca</label>
              <select
                value={filterBrandId}
                onChange={(e) => setFilterBrandId(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all truncate"
              >
                <option value="">Todas las Marcas</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Family Filter */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Familia</label>
              <select
                value={filterFamilyId}
                onChange={(e) => setFilterFamilyId(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all truncate"
              >
                <option value="">Todas las Familias</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            {/* Movement Type Selector */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Operación</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all truncate"
              >
                <option value="ALL">✨ Todas las Op.</option>
                <option value="IN">📥 Todas las Entradas</option>
                <option value="OUT">📤 Todas las Salidas</option>
                <option value="PURCHASE">🛒 Compras de Stock</option>
                <option value="SALE">💰 Ventas POS</option>
                <option value="ADJUSTMENT">🔧 Ajustes Manuales</option>
                <option value="REVERT">🔄 Reversiones / Devolución</option>
              </select>
            </div>

            {/* Date Rangepicker */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-705 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            {/* Date to */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-705 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

          </div>
        </div>

        {/* MAIN KARDEX VALORADO DATA TABLE */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              
              {/* Header Blocks Row 1 */}
              <thead>
                <tr className="bg-teal-700 text-white text-[10px] font-black uppercase tracking-wider text-center border-b border-teal-800">
                  <th colSpan={3} className="px-4 py-3.5 text-left border-r border-teal-800">DOCUMENTACIÓN Y REFERENCIAS</th>
                  <th colSpan={3} className="px-4 py-3.5 border-r border-teal-800 bg-teal-800/40">ENTRADAS (INGRESOS A ALMACÉN)</th>
                  <th colSpan={3} className="px-4 py-3.5 border-r border-teal-800 bg-rose-900/10">SALIDAS (RETIROS DE ALMACÉN)</th>
                  <th colSpan={3} className="px-4 py-3.5 bg-teal-800/20">SALDOS RESULTANTES (VALORACIÓN CPP)</th>
                </tr>
                
                {/* Header Sub-columns Row 2 */}
                <tr className="bg-teal-600/90 text-white text-[9px] font-black uppercase tracking-wider text-center border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left border-r border-teal-700/50">Fecha y Hora</th>
                  <th className="px-4 py-2.5 text-left border-r border-teal-700/50">Producto / Item</th>
                  <th className="px-4 py-2.5 text-left border-r border-teal-700/50">Motivo / Operación</th>
                  
                  {/* Entradas */}
                  <th className="px-4 py-2.5 bg-teal-800/20 border-r border-teal-700/30">Cant.</th>
                  <th className="px-4 py-2.5 bg-teal-800/20 border-r border-teal-700/30">Costo Unit.</th>
                  <th className="px-4 py-2.5 bg-teal-800/20 border-r border-teal-700/50">Total</th>
                  
                  {/* Salidas */}
                  <th className="px-4 py-2.5 bg-rose-950/10 border-r border-teal-700/30">Cant.</th>
                  <th className="px-4 py-2.5 bg-rose-950/10 border-r border-teal-700/30">Costo Unit.</th>
                  <th className="px-4 py-2.5 bg-rose-950/10 border-r border-teal-700/50">Total</th>
                  
                  {/* Saldos */}
                  <th className="px-4 py-2.5 bg-teal-800/10 border-r border-teal-700/30">Cant.</th>
                  <th className="px-4 py-2.5 bg-teal-800/10 border-r border-teal-700/30">CPP Unit.</th>
                  <th className="px-4 py-2.5 bg-teal-800/10">Valor Total</th>
                </tr>
              </thead>

              {/* Table Data Rows */}
              <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                {loading ? (
                  // Skeleton loader
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4"><div className="h-3 w-20 bg-gray-100 rounded"></div></td>
                      <td className="px-4 py-4"><div className="h-3 w-28 bg-gray-100 rounded"></div></td>
                      <td className="px-4 py-4"><div className="h-3.5 w-16 bg-gray-100 rounded-full"></div></td>
                      <td colSpan={9} className="px-4 py-4 bg-gray-50/20"><div className="h-3 w-full bg-gray-100 rounded"></div></td>
                    </tr>
                  ))
                ) : filteredMovements.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan={12} className="py-16 text-center">
                      {movements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto p-6 bg-slate-50/50 rounded-3xl border border-dashed border-gray-200 shadow-sm animate-fade-in">
                          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-full mb-4 animate-bounce">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <h4 className="font-black text-gray-800 text-sm uppercase tracking-wider">Kardex Valorado Vacío</h4>
                          <p className="text-gray-500 text-xs mt-2 leading-relaxed">
                            Aún no se han registrado movimientos de stock. Los movimientos se crean automáticamente cuando realizas compras programadas, ventas en el POS, o cuando usas el botón "Ajustar Stock" arriba.
                          </p>
                          <p className="text-gray-400 text-[10px] mt-1 mb-5">
                            ¿Quieres probar el Kardex de inmediato con datos de prueba automatizados?
                          </p>
                          <button
                            type="button"
                            onClick={handleSeedDemoData}
                            disabled={isSeedingDemo || products.length === 0}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                          >
                            <Sparkles className={`w-4 h-4 ${isSeedingDemo ? "animate-spin" : ""}`} />
                            <span>{isSeedingDemo ? "Generando..." : "Iniciar Carga Demo de Movimientos"}</span>
                          </button>
                          {products.length === 0 && (
                            <p className="text-rose-500 text-[9px] mt-2.5 font-bold">
                              * Primero crea productos en la sección "Almacén y Abastecimiento" para habilitar la carga demo.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <Filter className="w-8 h-8 text-gray-300 mb-3 animate-pulse" />
                          <h4 className="font-bold text-gray-700">Sin Resultados de Filtro</h4>
                          <p className="text-gray-400 text-xs mt-1">
                            No se encontraron transacciones en el Kardex para los filtros aplicados. Intente restablecer o cambiar la selección.
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
                    const isEntry = m.type === "IN";
                    const isPurchase = m.reason === "PURCHASE";
                    const isSale = m.reason === "SALE";
                    const isRevert = m.reason === "REVERT_PURCHASE";
                    
                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedMovementForDetail(m)}
                        className="hover:bg-teal-50/30 active:bg-teal-50/60 transition-all cursor-pointer group text-center"
                        title="Haga clic para ver auditoría detallada"
                      >
                        {/* Timestamp */}
                        <td className="px-4 py-3 text-left border-r border-gray-100 text-gray-500 font-mono text-[10px]">
                          {format(new Date(m.createdAt), "dd/MM/yy HH:mm")}
                        </td>

                        {/* Product Detail */}
                        <td className="px-4 py-3 text-left border-r border-gray-100">
                          <p className="font-bold text-gray-805 leading-snug group-hover:text-teal-700 transition-colors">{m.product?.name || "—"}</p>
                          {m.presentationName && m.presentationQty && m.presentationQty > 1 ? (
                            <span className="text-[10px] font-bold text-teal-650 bg-teal-50 px-1.5 py-0.5 rounded-md mt-0.5 inline-block">
                              {m.presentationQty}x {m.presentationName}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-450 font-mono mt-0.5 inline-block">
                              Unidades base ({m.product?.unit})
                            </span>
                          )}
                        </td>

                        {/* Motivo / Badge */}
                        <td className="px-4 py-3 text-left border-r border-gray-100">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${
                            isPurchase
                              ? "bg-teal-50 text-teal-700 border border-teal-100"
                              : isSale
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : isRevert
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {isPurchase && <ShoppingCart className="w-3 h-3 text-teal-600" />}
                            {isSale && <ProfitIcon className="w-3 h-3 text-blue-600" />}
                            {isRevert && <RotateCcw className="w-3 h-3 text-rose-600" />}
                            {!isPurchase && !isSale && !isRevert && <Sliders className="w-3 h-3 text-amber-600" />}
                            <span>
                              {isPurchase
                                ? "Compra"
                                : isSale
                                ? "Venta"
                                : isRevert
                                ? "Reversión"
                                : m.reason === "ADJUSTMENT"
                                ? "Ajuste"
                                : m.reason || "Ajuste"}
                            </span>
                          </span>
                        </td>

                        {/* ENTRADAS - Cantidad */}
                        <td className="px-4 py-3 bg-teal-50/10 border-r border-gray-100 font-bold text-teal-700">
                          {isEntry ? `+${m.quantity}` : "—"}
                        </td>
                        
                        {/* ENTRADAS - Costo Unitario */}
                        <td className="px-4 py-3 bg-teal-50/10 border-r border-gray-100 text-teal-600 font-mono">
                          {isEntry ? `S/ ${m.computedUnitCost.toFixed(2)}` : "—"}
                        </td>

                        {/* ENTRADAS - Total */}
                        <td className="px-4 py-3 bg-teal-50/10 border-r border-gray-100 text-teal-800 font-bold font-mono">
                          {isEntry ? `S/ ${m.computedTotalCost.toFixed(2)}` : "—"}
                        </td>

                        {/* SALIDAS - Cantidad */}
                        <td className="px-4 py-3 bg-rose-50/10 border-r border-gray-100 font-bold text-rose-600">
                          {!isEntry ? `-${m.quantity}` : "—"}
                        </td>
                        
                        {/* SALIDAS - Costo Unitario */}
                        <td className="px-4 py-3 bg-rose-50/10 border-r border-gray-100 text-rose-500 font-mono">
                          {!isEntry ? `S/ ${m.computedUnitCost.toFixed(2)}` : "—"}
                        </td>

                        {/* SALIDAS - Total */}
                        <td className="px-4 py-3 bg-rose-50/10 border-r border-gray-100 text-rose-700 font-bold font-mono">
                          {!isEntry ? `S/ ${m.computedTotalCost.toFixed(2)}` : "—"}
                        </td>

                        {/* SALDOS - Cantidad */}
                        <td className="px-4 py-3 bg-teal-50/5 border-r border-gray-100 font-bold text-gray-800">
                          {m.computedStockResult}
                        </td>
                        
                        {/* SALDOS - CPP Costo Unitario */}
                        <td className="px-4 py-3 bg-teal-50/5 border-r border-gray-100 text-teal-800 font-bold font-mono">
                          S/ {m.computedRunningCPP.toFixed(2)}
                        </td>

                        {/* SALDOS - Valor Total */}
                        <td className="px-4 py-3 bg-teal-50/5 text-indigo-900 font-black font-mono">
                          S/ {m.computedRunningValue.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

            </table>
          </div>

          {/* Table Footer Summary Stats */}
          {!loading && filteredMovements.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs font-bold text-gray-500 gap-2">
              <span>
                Mostrando {filteredMovements.length} de {enrichedMovementsList.length} movimientos de inventario.
              </span>
              <div className="flex gap-4">
                <span>Total Entradas: <span className="text-teal-700">+{filteredMovements.filter(m => m.type === "IN").reduce((acc, m) => acc + m.quantity, 0)} uds</span></span>
                <span>Total Salidas: <span className="text-rose-600">-{filteredMovements.filter(m => m.type === "OUT").reduce((acc, m) => acc + m.quantity, 0)} uds</span></span>
              </div>
            </div>
          )}

        </div>

        {/* MODAL: STOCK ADJUSTMENT FORM */}
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title="🔧 Ajuste Manual de Inventario"
        >
          <form onSubmit={handleSaveAdjustmentSubmit} className="space-y-4">
            
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-[11px] text-amber-800 leading-normal flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Nota de Control: </span>
                Los ajustes manuales son movimientos correctivos (auditorías físicas, mermas). Alteran el stock resultante y quedan registrados en la bitácora contable.
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase">Seleccionar Producto</label>
              <select
                value={adjustProductId}
                onChange={(e) => setAdjustProductId(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
              >
                <option value="">-- Elija un producto --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock actual: {p.stock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase">Tipo de Ajuste</label>
                <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setAdjustType("IN")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      adjustType === "IN" ? "bg-white text-teal-700 shadow-sm" : "text-gray-500"
                    }`}
                  >
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("OUT")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      adjustType === "OUT" ? "bg-white text-rose-700 shadow-sm" : "text-gray-500"
                    }`}
                  >
                    Salida (-)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase">Cantidad</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={adjustQty || ""}
                  onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                  placeholder="Ej. 10"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>

            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase">Motivo / Justificación</label>
              <textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                required
                rows={2}
                placeholder="Por qué se realiza este ajuste..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingAdjustment}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                Aplicar Ajuste
              </button>
            </div>

          </form>
        </Modal>

        {/* CUSTOM CONFIRMATION MODAL */}
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="⚠️ Confirmar Ajuste de Inventario"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600 leading-normal">
              ¿Está seguro de que desea registrar este ajuste? Esta acción modificará el stock físico y recalculará la valoración total en el Kardex.
            </p>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs font-bold text-gray-700 space-y-1">
              <p>Producto: <span className="text-teal-700">{products.find((p) => p.id === adjustProductId)?.name}</span></p>
              <p>Ajuste: <span className={adjustType === "IN" ? "text-emerald-600" : "text-rose-600"}>
                {adjustType === "IN" ? "Entrada (+)" : "Salida (-)"} de {adjustQty} unidades
              </span></p>
              <p>Motivo: <span className="font-normal text-gray-500 italic">"{adjustReason}"</span></p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeStockAdjustment}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Sí, Registrar Ajuste
              </button>
            </div>
          </div>
        </Modal>

        {/* MODAL: MOVEMENT DETAIL AUDIT */}
        <Modal
          isOpen={!!selectedMovementForDetail}
          onClose={() => setSelectedMovementForDetail(null)}
          title="🔍 Auditoría de Movimiento Kardex"
          maxWidth="max-w-2xl"
        >
          {selectedMovementForDetail && (
            <div className="space-y-6">
              
              {/* Type Header Badge */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                selectedMovementForDetail.type === "IN"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400/30"
                  : "bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-400/30"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-xl">
                    {selectedMovementForDetail.reason === "PURCHASE" ? (
                      <ShoppingCart className="w-5 h-5" />
                    ) : selectedMovementForDetail.reason === "SALE" ? (
                      <ProfitIcon className="w-5 h-5" />
                    ) : selectedMovementForDetail.reason === "REVERT_PURCHASE" ? (
                      <RotateCcw className="w-5 h-5" />
                    ) : (
                      <Sliders className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-75">
                      {selectedMovementForDetail.type === "IN" ? "Entrada a Almacén" : "Salida de Almacén"}
                    </span>
                    <h3 className="text-base font-bold">
                      {selectedMovementForDetail.reason === "PURCHASE"
                        ? "Abastecimiento de Stock (Compra)"
                        : selectedMovementForDetail.reason === "SALE"
                        ? "Venta en Punto de Venta (POS)"
                        : selectedMovementForDetail.reason === "REVERT_PURCHASE"
                        ? "Reversión de Compra / Devolución"
                        : selectedMovementForDetail.reason === "ADJUSTMENT"
                        ? "Ajuste de Inventario"
                        : selectedMovementForDetail.reason || "Ajuste de Inventario"}
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono opacity-80 block">ID Movimiento</span>
                  <span className="text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded-lg select-all">
                    {selectedMovementForDetail.id.substring(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Grid 2 Column details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Item Details */}
                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-2.5">
                  <h4 className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">Detalles del Item</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center shadow-xs flex-shrink-0">
                      {selectedMovementForDetail.product?.imageUrl ? (
                        <img src={selectedMovementForDetail.product.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-gray-808 leading-snug">{selectedMovementForDetail.product?.name || "—"}</p>
                      <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                        SKU: {products.find(p => p.id === selectedMovementForDetail.productId)?.sku || "Sin SKU"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-100/50 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-tight">Unidad de Medida</span>
                      <span className="font-bold text-gray-700">{selectedMovementForDetail.product?.unit || "UNIDAD"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-tight">Código Secuencial</span>
                      <span className="font-bold text-gray-700">
                        #{String(products.find(p => p.id === selectedMovementForDetail.productId)?.customCode || 0).padStart(4, "0")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit & Context */}
                <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-2.5">
                  <h4 className="font-bold text-gray-500 uppercase text-[10px] tracking-wider">Auditoría y Referencias</h4>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fecha Registro:</span>
                      <span className="font-bold text-gray-700">{format(new Date(selectedMovementForDetail.createdAt), "dd/MM/yyyy HH:mm:ss")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Operador / Usuario:</span>
                      <span className="font-bold text-gray-700 font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                        {selectedMovementForDetail.userId.substring(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Documento Ref:</span>
                      {selectedMovementForDetail.documentId ? (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-teal-700 font-mono text-[10px] bg-teal-50 px-1.5 py-0.5 rounded">
                            {selectedMovementForDetail.documentId.substring(0, 8)}...
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedMovementForDetail.documentId || "");
                              toast.success("ID de documento copiado");
                            }}
                            className="text-gray-400 hover:text-teal-600 font-bold active:scale-95 transition-all"
                            title="Copiar ID de documento"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Ninguno (Ajuste Manual)</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Financial Calculation Breakdown */}
              <div className="p-4 bg-teal-50/20 rounded-2xl border border-teal-100/50 space-y-3">
                <h4 className="font-black text-teal-800 uppercase text-[10px] tracking-widest flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-teal-600" />
                  Cálculo de Valoración (CPP)
                </h4>
                
                <div className="grid grid-cols-3 gap-3 text-center">
                  
                  {/* Transaction info */}
                  <div className="bg-white p-2.5 rounded-xl border border-teal-100/30">
                    <span className="text-gray-400 block text-[9px] font-bold uppercase">Impacto Cantidad</span>
                    <span className={`text-base font-black ${
                      selectedMovementForDetail.type === "IN" ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      {selectedMovementForDetail.type === "IN" ? "+" : "-"}{selectedMovementForDetail.quantity}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-teal-100/30">
                    <span className="text-gray-400 block text-[9px] font-bold uppercase">Costo Unitario</span>
                    <span className="text-base font-black text-gray-800">
                      S/ {selectedMovementForDetail.computedUnitCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-teal-100/30">
                    <span className="text-gray-400 block text-[9px] font-bold uppercase">Costo Total</span>
                    <span className="text-base font-black text-gray-800">
                      S/ {selectedMovementForDetail.computedTotalCost.toFixed(2)}
                    </span>
                  </div>

                  {/* Resulting balance */}
                  <div className="bg-white p-2.5 rounded-xl border border-teal-100/30">
                    <span className="text-gray-400 block text-[9px] font-bold uppercase">Stock Resultante</span>
                    <span className="text-base font-black text-teal-700">
                      {selectedMovementForDetail.computedStockResult}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-teal-100/30">
                    <span className="text-gray-400 block text-[9px] font-bold uppercase">CPP Resultante</span>
                    <span className="text-base font-black text-teal-800">
                      S/ {selectedMovementForDetail.computedRunningCPP.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-teal-100/30">
                    <span className="text-gray-400 block text-[9px] font-bold uppercase">Valor total en libros</span>
                    <span className="text-base font-black text-indigo-900">
                      S/ {selectedMovementForDetail.computedRunningValue.toFixed(2)}
                    </span>
                  </div>

                </div>

                {/* Explanatory text */}
                <div className="p-3 bg-white rounded-xl border border-teal-100/30 text-[11px] text-gray-600 leading-relaxed font-semibold">
                  {selectedMovementForDetail.type === "IN" ? (
                    <span>
                      💡 <span className="font-bold text-teal-800">Nota de cálculo:</span> Al ingresar nuevas unidades con un costo total de <span className="text-teal-700 font-bold">S/ {selectedMovementForDetail.computedTotalCost.toFixed(2)}</span>, el Costo Promedio Ponderado (CPP) se recalcula dinámicamente promediando el costo de las existencias anteriores con las nuevas.
                    </span>
                  ) : (
                    <span>
                      💡 <span className="font-bold text-teal-800">Nota de cálculo:</span> Las salidas de inventario (ventas/retiros) no alteran el Costo Promedio Ponderado (CPP). Se retiran existencias al costo actual de <span className="text-teal-700 font-bold">S/ {selectedMovementForDetail.computedRunningCPP.toFixed(2)}</span>, reduciendo el stock y la valoración total de forma proporcional.
                    </span>
                  )}
                </div>

              </div>

              {/* Action Close */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMovementForDetail(null)}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  Cerrar Detalles
                </button>
              </div>

            </div>
          )}
        </Modal>

      </div>
    </Appshell>
  );
}
