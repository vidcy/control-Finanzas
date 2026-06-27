import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import { useAuth } from "../auth/AuthContext";
import { getReceiptAbsoluteUrl } from "../components/ui/ImageUploader";
import { getTransactionsRequest } from "../services/transaction.api";
import { getProductsRequest } from "../services/product.api";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Activity,
  ArrowRight,
  DollarSign,
  Wallet,
  Coins,
  ArrowUpRight,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import BusinessAiAdvisor from "../components/dashboard/BusinessAiAdvisor";
import Modal from "../components/ui/Modal";

export default function BusinessDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    revenue: 0,
    dailySales: 0,
    monthlySales: 0,
    businessLiquidity: 0,
    liquidityByMethod: { CASH: 0, TRANSFER: 0, CARD: 0, YAPE: 0, PLIN: 0 } as Record<string, number>,
    inventory: 0,
    patrimonio: 0,
    totalOpex: 0,
    lowStockCount: 0,
    productsCount: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentSalesList, setRecentSalesList] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txs, prods] = await Promise.all([
        getTransactionsRequest({ workspace: "BUSINESS" }),
        getProductsRequest(),
      ]);

      const safeTx = txs.filter((t: any) => t.status === "PAID");

      // Calculate Liquidity (Total Income - Total Expense)
      const totalIncome = safeTx
        .filter((t: any) => t.type === "INCOME")
        .reduce((acc: number, t: any) => acc + t.amount, 0);
      const totalExpense = safeTx
        .filter((t: any) => t.type === "EXPENSE")
        .reduce((acc: number, t: any) => acc + t.amount, 0);
      const businessLiquidity = totalIncome - totalExpense;

      // Calculate Liquidity breakdown by Payment Method
      const liquidityByMethod = safeTx.reduce((acc: Record<string, number>, t: any) => {
        const sign = t.type === "INCOME" ? 1 : -1;
        const method = t.paymentMethod || "CASH";
        acc[method] = (acc[method] || 0) + (t.amount * sign);
        return acc;
      }, { CASH: 0, TRANSFER: 0, CARD: 0, YAPE: 0, PLIN: 0 });

      // Daily and Monthly Sales
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const dailySales = safeTx
        .filter((t: any) => t.type === "INCOME" && t.name === "Venta en Caja" && new Date(t.date) >= todayStart)
        .reduce((acc: number, t: any) => acc + t.amount, 0);

      const monthlySales = safeTx
        .filter((t: any) => t.type === "INCOME" && t.name === "Venta en Caja" && new Date(t.date) >= monthStart)
        .reduce((acc: number, t: any) => acc + t.amount, 0);

      // Inventory valuation
      const inventoryValuation = prods.reduce(
        (acc, p) => acc + (p.costPrice * p.stock),
        0
      );

      // Patrimonio (Liquidity + Inventory)
      const patrimonio = businessLiquidity + inventoryValuation;

      // Monthly Expenses
      const monthlyExpenses = safeTx
        .filter((t: any) => t.type === "EXPENSE" && new Date(t.date) >= monthStart)
        .reduce((acc: number, t: any) => acc + t.amount, 0);

      const lowStockList = prods.filter(
        (p: any) => p.stock <= p.minStock
      );

      // Chart: Last 14 days of sales
      const last14Days = Array.from({ length: 14 }).map((_, i) =>
        subDays(new Date(), 13 - i),
      );
      const chartDataMapped = last14Days.map((date) => {
        const dayTxs = safeTx.filter(
          (t: any) => t.type === "INCOME" && t.name === "Venta en Caja" && isSameDay(parseISO(t.date), date)
        );
        return {
          date: format(date, "dd MMM", { locale: es }),
          ventas: dayTxs.reduce((acc: number, t: any) => acc + t.amount, 0),
        };
      });

      // Recent Sales List
      const recentSales = safeTx
        .filter((t: any) => t.type === "INCOME" && t.name === "Venta en Caja")
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setLowStockProducts(lowStockList);
      setMetrics({
        revenue: monthlySales,
        dailySales,
        monthlySales,
        businessLiquidity,
        liquidityByMethod,
        inventory: inventoryValuation,
        patrimonio,
        totalOpex: monthlyExpenses,
        lowStockCount: lowStockList.length,
        productsCount: prods.length,
      });
      setChartData(chartDataMapped);
      setRecentSalesList(recentSales);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const profitMargin =
    metrics.monthlySales > 0
      ? ((metrics.monthlySales - metrics.totalOpex) / metrics.monthlySales) * 100
      : 0;

  return (
    <Appshell>
      <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4">
        {/* HEADER / BANNER */}
        {(() => {
          const hasCustomBanner = !!(user?.businessBanner);
          const bannerStyle = hasCustomBanner
            ? {
                backgroundImage: `url(${getReceiptAbsoluteUrl(user.businessBanner)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {};

          // Dynamic colors based on margin
          let gradientClass = "bg-gradient-to-br from-indigo-700 via-purple-800 to-slate-900 border-indigo-500/20";
          let badgeText = "Análisis Operativo";
          let badgeColor = "bg-indigo-500/20 text-indigo-200 border-indigo-400/30";
          
          if (!hasCustomBanner) {
            if (profitMargin >= 30) {
              gradientClass = "bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-950 border-emerald-500/30 shadow-lg shadow-emerald-500/5";
              badgeText = `Rendimiento Sobresaliente 🚀 (${profitMargin.toFixed(1)}% margen)`;
              badgeColor = "bg-emerald-500/20 text-emerald-100 border-emerald-400/30";
            } else if (profitMargin >= 0) {
              gradientClass = "bg-gradient-to-tr from-indigo-600 via-violet-700 to-slate-950 border-indigo-500/30 shadow-lg shadow-indigo-500/5";
              badgeText = `Operación Estable 📈 (${profitMargin.toFixed(1)}% margen)`;
              badgeColor = "bg-indigo-500/20 text-indigo-100 border-indigo-400/30";
            } else {
              gradientClass = "bg-gradient-to-tr from-amber-600 via-rose-600 to-slate-950 border-rose-500/30 shadow-lg shadow-rose-500/5";
              badgeText = `Alerta de Rentabilidad ⚠️ (${profitMargin.toFixed(1)}% margen)`;
              badgeColor = "bg-rose-500/20 text-rose-100 border-rose-400/30";
            }
          }

          return (
            <div
              style={bannerStyle}
              className={`border rounded-3xl p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-700 ${
                hasCustomBanner ? "text-white border-transparent" : gradientClass
              }`}
            >
              {hasCustomBanner ? (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 via-gray-900/60 to-transparent backdrop-blur-[2px] z-0"></div>
              ) : (
                <>
                  <div className="absolute -right-10 -top-10 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                  <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                </>
              )}
              
              <div className="relative z-10 flex items-center gap-6">
                {user?.businessLogo ? (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                    <img
                      src={getReceiptAbsoluteUrl(user.businessLogo) || ""}
                      crossOrigin="anonymous"
                      alt="Logo"
                      className="relative w-20 h-20 rounded-full object-cover border-2 border-white/80 shadow-md bg-white flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-white font-black text-2xl shadow-inner">
                    {user?.businessName ? user.businessName.substring(0, 2).toUpperCase() : "B"}
                  </div>
                )}
                <div className="space-y-2">
                  {!hasCustomBanner && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-tight border ${badgeColor}`}>
                      {badgeText}
                    </span>
                  )}
                  <h1 className="text-4xl font-black tracking-tight drop-shadow-sm uppercase">
                    {user?.businessName ? user.businessName : "Mi Negocio"}
                  </h1>
                  <p className={hasCustomBanner ? "text-gray-200 font-semibold text-sm" : "text-indigo-100/90 font-medium text-sm"}>
                    {user?.businessName
                      ? `${user.businessRubro || "Empresa"} • Resumen de Operación y Liquidez`
                      : "Estado y rentabilidad comercial de tu negocio en tiempo real."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 relative z-10">
                <Link
                  to="/business-pos"
                  className="bg-white text-indigo-950 hover:bg-indigo-50 px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 hover:shadow-xl transition-all duration-300 active:scale-95 border border-white/20"
                >
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  Punto de Venta POS
                </Link>
              </div>
            </div>
          );
        })()}

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* ALERTA DE STOCK CRÍTICO */}
            {metrics.lowStockCount > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-900 text-sm">Alerta de Abastecimiento: {metrics.lowStockCount} {metrics.lowStockCount === 1 ? "producto" : "productos"} con stock crítico</h4>
                    <p className="text-xs text-amber-700/80 font-semibold mt-0.5">
                      Hay productos que se encuentran por debajo del stock mínimo recomendado. ¡Reabastece pronto!
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => setIsLowStockModalOpen(true)}
                    className="flex-1 sm:flex-none bg-amber-100 hover:bg-amber-200 text-amber-800 font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all"
                  >
                    Ver Detalles
                  </button>
                  <Link
                    to="/business-inventory"
                    className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-orange-500/20 text-center"
                  >
                    Planificar Compra
                  </Link>
                </div>
              </div>
            )}

            {/* GRID PRINCIPAL DE MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* LIQUIDEZ / DINERO DISPONIBLE */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full opacity-60 blur-xl transform translate-x-4 -translate-y-4"></div>
                <div>
                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Caja y Bancos (Efectivo)</span>
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-emerald-600" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                    S/ {metrics.businessLiquidity.toFixed(2)}
                  </h3>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-50 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-amber-500" /> Efectivo:</span>
                    <span className="text-gray-800">S/ {(metrics.liquidityByMethod.CASH || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-indigo-500" /> Transferencia/Yape:</span>
                    <span className="text-gray-800">
                      S/ {((metrics.liquidityByMethod.TRANSFER || 0) + (metrics.liquidityByMethod.YAPE || 0) + (metrics.liquidityByMethod.PLIN || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* VENTAS DEL MES Y DEL DÍA */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full opacity-60 blur-xl transform translate-x-4 -translate-y-4"></div>
                <div>
                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ventas del Mes</span>
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                    S/ {metrics.monthlySales.toFixed(2)}
                  </h3>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">Ventas de Hoy:</span>
                  <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    S/ {metrics.dailySales.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* PATRIMONIO VALORADO (ACTIVOS TOTALES) */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full opacity-60 blur-xl transform translate-x-4 -translate-y-4"></div>
                <div>
                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Patrimonio Estimado</span>
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                    S/ {metrics.patrimonio.toFixed(2)}
                  </h3>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-50 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span>Dinero Líquido:</span>
                    <span className="text-gray-800">S/ {metrics.businessLiquidity.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-gray-500">
                    <span>Mercancía (Inventario):</span>
                    <span className="text-gray-800">S/ {metrics.inventory.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* GASTOS OPERATIVOS DEL MES */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full opacity-60 blur-xl transform translate-x-4 -translate-y-4"></div>
                <div>
                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Egresos / Gastos Mes</span>
                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-rose-600" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                    S/ {metrics.totalOpex.toFixed(2)}
                  </h3>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500">Margen Comercial:</span>
                  <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${profitMargin > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>

            </div>

            {/* SECCIÓN GRÁFICO (VENTAS POS) */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    Dinámica de Ventas POS (Últimos 14 Días)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Solo ingresos registrados en la caja del punto de venta (vendedor).
                  </p>
                </div>
                <Link
                  to="/business-reports"
                  className="text-indigo-600 text-xs font-black hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-4 py-2 rounded-xl transition-colors"
                >
                  Ver Reportes de Venta <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: "bold" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: "bold" }}
                      dx={-10}
                      tickFormatter={(val) => `S/ ${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)",
                        padding: "12px 16px",
                      }}
                      formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, "Ventas"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="ventas"
                      stroke="#6366f1"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorVentas)"
                      activeDot={{
                        r: 7,
                        fill: "#6366f1",
                        strokeWidth: 0,
                        stroke: "#fff",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SECCIÓN DIVIDIDA: INTELIGENCIA + ÚLTIMAS VENTAS */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* ADVISOR DE IA (Izquierda) */}
              <div className="lg:col-span-3 flex flex-col justify-between">
                <BusinessAiAdvisor
                  metrics={{
                    revenue: metrics.revenue,
                    inventory: metrics.inventory,
                    totalOpex: metrics.totalOpex,
                    lowStockCount: metrics.lowStockCount,
                    productsCount: metrics.productsCount,
                  }}
                />
              </div>

              {/* TABLA ÚLTIMAS VENTAS (Derecha) */}
              <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-bold text-gray-900">Últimas Ventas POS</h3>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto pr-1">
                    {recentSalesList.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-xs font-semibold">
                        Aún no se registran ventas el día de hoy.
                      </div>
                    ) : (
                      recentSalesList.map((sale) => (
                        <div key={sale.id} className="py-3 flex justify-between items-start text-xs">
                          <div className="space-y-0.5 max-w-[200px]">
                            <span className="font-extrabold text-gray-800 block truncate">
                              {sale.description ? sale.description.replace("Venta en POS: ", "") : "Venta General"}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium block">
                              {new Date(sale.date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-indigo-700 block">S/ {sale.amount.toFixed(2)}</span>
                            <span className="text-[9px] font-bold bg-slate-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">
                              {sale.paymentMethod}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <Link
                  to="/business-history"
                  className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-black text-center rounded-2xl transition-colors block"
                >
                  Ver Historial de Caja
                </Link>
              </div>

            </div>
          </>
        )}
      </div>

      {/* MODAL: PRODUCTOS CON STOCK BAJO */}
      <Modal
        isOpen={isLowStockModalOpen}
        onClose={() => setIsLowStockModalOpen(false)}
        title="⚠️ Alerta de Inventario: Stock Crítico"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-500">
            Los siguientes productos requieren reabastecimiento urgente para evitar quiebres de stock en el Punto de Venta:
          </p>
          <div className="divide-y divide-gray-100 max-h-90 overflow-y-auto pr-1">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-gray-800 block">{p.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">SKU: {p.sku || "—"}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-rose-600 block">Stock: {p.stock} {p.unit || "uds"}</span>
                  <span className="text-[10px] text-gray-400 font-medium block">Mínimo: {p.minStock} {p.unit || "uds"}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4 gap-2 border-t border-gray-50">
            <button
              onClick={() => setIsLowStockModalOpen(false)}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cerrar
            </button>
            <Link
              to="/business-inventory"
              onClick={() => setIsLowStockModalOpen(false)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
            >
              Ir a Planificador de Compras
            </Link>
          </div>
        </div>
      </Modal>
    </Appshell>
  );
}
