import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { getTransactionsRequest } from "../services/transaction.api";
import { getProductsRequest } from "../services/product.api";
import { TrendingUp, Package, DollarSign, Activity } from "lucide-react";
import { format, subDays, isSameDay, parseISO } from "date-fns";

export default function BusinessReportsPage() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ revenue: 0, inventoryValue: 0, profitMargin: 0 });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("7DAYS"); // TODAY, 7DAYS, MONTH, YEAR

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txs, prods] = await Promise.all([
        getTransactionsRequest("BUSINESS"),
        getProductsRequest()
      ]);

      const now = new Date();
      let filteredTxs = txs;

      if (dateFilter === "TODAY") {
        filteredTxs = txs.filter((t: any) => isSameDay(parseISO(t.date), now));
      } else if (dateFilter === "7DAYS") {
        filteredTxs = txs.filter((t: any) => parseISO(t.date) >= subDays(now, 7));
      } else if (dateFilter === "MONTH") {
        filteredTxs = txs.filter((t: any) => parseISO(t.date).getMonth() === now.getMonth() && parseISO(t.date).getFullYear() === now.getFullYear());
      } else if (dateFilter === "YEAR") {
        filteredTxs = txs.filter((t: any) => parseISO(t.date).getFullYear() === now.getFullYear());
      }

      // Métricas Básicas (Calculadas basadas en el filtro)
      const revenue = filteredTxs.filter((t: any) => t.type === "INCOME").reduce((acc: number, t: any) => acc + t.amount, 0);
      const expenses = filteredTxs.filter((t: any) => t.type === "EXPENSE").reduce((acc: number, t: any) => acc + t.amount, 0);
      const profitMargin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;
      
      const inventoryValue = prods.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);

      setMetrics({ revenue, inventoryValue, profitMargin });

      // Gráfico de Ventas (Últimos 7 días)
      const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
      const salesChart = last7Days.map(date => {
        const dayTxs = txs.filter((t: any) => t.type === "INCOME" && isSameDay(parseISO(t.date), date));
        return {
          date: format(date, 'dd MMM'),
          ventas: dayTxs.reduce((acc: number, t: any) => acc + t.amount, 0)
        };
      });
      setSalesData(salesChart);

      // Gráfico de Inventario (Top 5 con más stock)
      const topProducts = [...prods].sort((a, b) => b.stock - a.stock).slice(0, 5).map(p => ({
        name: p.name,
        stock: p.stock
      }));
      setProductData(topProducts);

    } catch (error) {
      console.error("Error cargando reportes", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

  return (
    <Appshell>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-8 text-gray-900 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-200 opacity-20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-black mb-2 tracking-tight">Reportes del Negocio</h1>
            <p className="text-gray-500 font-medium">Analiza el rendimiento, ventas y estado de tu inventario.</p>
          </div>
          <div className="relative z-10">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-700 shadow-sm"
            >
              <option value="TODAY">Hoy</option>
              <option value="7DAYS">Últimos 7 Días</option>
              <option value="MONTH">Este Mes</option>
              <option value="YEAR">Este Año</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase">Ingresos Totales</p>
                  <p className="text-2xl font-black text-gray-900">S/ {metrics.revenue.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase">Valor Inventario</p>
                  <p className="text-2xl font-black text-gray-900">S/ {metrics.inventoryValue.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase">Margen Ganancia</p>
                  <p className="text-2xl font-black text-gray-900">{metrics.profitMargin.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" /> Tendencia de Ventas (7 Días)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dx={-10} tickFormatter={(val) => `S/ ${val}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`S/ ${Number(value).toFixed(2)}`, 'Ventas']}
                      />
                      <Line type="monotone" dataKey="ventas" stroke="#6366f1" strokeWidth={4} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-500" /> Productos con más Stock
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} width={100} />
                      <Tooltip 
                        cursor={{fill: '#f3f4f6'}}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="stock" radius={[0, 4, 4, 0]}>
                        {productData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Appshell>
  );
}
