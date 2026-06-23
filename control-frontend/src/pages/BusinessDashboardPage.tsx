import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import { useAuth } from "../auth/AuthContext";
import { getReceiptAbsoluteUrl } from "../components/ui/ImageUploader";
import { getTransactionsRequest } from "../services/transaction.api";
import { getProductsRequest } from "../services/product.api";
import {
  TrendingUp,
  Package,
  Activity,
  ArrowRight,
  DollarSign,
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

export default function BusinessDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    revenue: 0,
    inventory: 0,
    productsCount: 0,
    totalOpex: 0,
    lowStockCount: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txs, prods] = await Promise.all([
        getTransactionsRequest("BUSINESS"),
        getProductsRequest(),
      ]);

      const revenue = txs
        .filter((t: any) => t.type === "INCOME")
        .reduce((acc: number, t: any) => acc + t.amount, 0);
      const inventory = prods.reduce(
        (acc, p) => acc + p.costPrice * p.stock,
        0,
      );

      const totalOpex = txs
        .filter((t: any) => t.type === "EXPENSE")
        .reduce((acc: number, t: any) => acc + t.amount, 0);

      const lowStockCount = prods.filter(
        (p: any) => p.stock <= p.minStock,
      ).length;

      setMetrics({
        revenue,
        inventory,
        productsCount: prods.length,
        totalOpex,
        lowStockCount,
      });

      const last14Days = Array.from({ length: 14 }).map((_, i) =>
        subDays(new Date(), 13 - i),
      );
      const data = last14Days.map((date) => {
        const dayTxs = txs.filter(
          (t: any) => t.type === "INCOME" && isSameDay(parseISO(t.date), date),
        );
        return {
          date: format(date, "dd MMM", { locale: es }),
          ingresos: dayTxs.reduce((acc: number, t: any) => acc + t.amount, 0),
        };
      });
      setChartData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const profitMargin =
    metrics.revenue > 0
      ? ((metrics.revenue - metrics.totalOpex) / metrics.revenue) * 100
      : 0;

  return (
    <Appshell>
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        {/* HEADER */}
        {(() => {
          const hasCustomBanner = !!(user?.businessBanner);
          const bannerStyle = hasCustomBanner
            ? {
                backgroundImage: `url(${getReceiptAbsoluteUrl(user.businessBanner)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {};
          return (
            <div
              style={bannerStyle}
              className={`border border-indigo-100 rounded-3xl p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                hasCustomBanner ? "text-white" : "bg-gradient-to-br from-indigo-50 to-blue-50 text-gray-900"
              }`}
            >
              {hasCustomBanner ? (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-950/80 via-gray-900/60 to-transparent backdrop-blur-[2px] z-0"></div>
              ) : (
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-200 opacity-20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
              )}
              
              <div className="relative z-10 flex items-center gap-4">
                {user?.businessLogo && (
                  <img
                    src={getReceiptAbsoluteUrl(user.businessLogo) || ""}
                    crossOrigin="anonymous"
                    alt="Logo"
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow-md bg-white flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div>
                  <h1 className="text-3xl font-black mb-1 tracking-tight">
                    {user?.businessName ? user.businessName.toUpperCase() : "Dashboard Ejecutivo"}
                  </h1>
                  <p className={hasCustomBanner ? "text-gray-200 font-semibold text-sm" : "text-gray-500 font-medium"}>
                    {user?.businessName
                      ? `${user.businessRubro || "Empresa"} • Panel Ejecutivo`
                      : "Estado de salud financiera y rentabilidad en tiempo real."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 relative z-10">
                <Link
                  to="/business-pos"
                  className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/30"
                >
                  <DollarSign className="w-5 h-5" />
                  Nueva Venta
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* KPI 1: Ingresos */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-8">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Total Ingresos
                </p>
                <p className="text-4xl font-black text-gray-900 tracking-tight">
                  S/ {metrics.revenue.toFixed(2)}
                </p>
              </div>
            </div>

            {/* KPI 2: Inventario */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-8">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Package className="w-7 h-7 text-blue-600" />
                </div>
                <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full">
                  {metrics.productsCount} items
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Capital en Inventario
                </p>
                <p className="text-4xl font-black text-gray-900 tracking-tight">
                  S/ {metrics.inventory.toFixed(2)}
                </p>
              </div>
            </div>

            {/* KPI 3: Margen */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase">
                    Margen de Rentabilidad
                  </p>
                  <h3 className="text-2xl font-black text-gray-900">
                    {profitMargin.toFixed(1)}%
                  </h3>
                </div>
                <div
                  className={`p-3 rounded-2xl ${profitMargin > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}
                >
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* CHART WIDGET */}
            <div className="lg:col-span-3 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    Dinámica de Ingresos (14 Días)
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Ingresos brutos generados por ventas y otros servicios.
                  </p>
                </div>
                <Link
                  to="/business-reports"
                  className="text-indigo-600 text-sm font-semibold hover:text-indigo-800 flex items-center gap-1"
                >
                  Ver Reporte Completo <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorIngresos"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366f1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      dx={-10}
                      tickFormatter={(val) => `S/ ${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow:
                          "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                        padding: "12px 16px",
                      }}
                      formatter={(value: any) => [
                        `S/ ${Number(value).toFixed(2)}`,
                        "Ingresos",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="ingresos"
                      stroke="#6366f1"
                      strokeWidth={4}
                      fillOpacity={1}
                      fill="url(#colorIngresos)"
                      activeDot={{
                        r: 8,
                        fill: "#6366f1",
                        strokeWidth: 0,
                        stroke: "#fff",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <BusinessAiAdvisor
            metrics={{
              revenue: metrics.revenue,
              inventory: metrics.inventory,
              totalOpex: metrics.totalOpex,
              lowStockCount: metrics.lowStockCount,
              productsCount: metrics.productsCount,
            }}
          />
        )}
      </div>
    </Appshell>
  );
}
