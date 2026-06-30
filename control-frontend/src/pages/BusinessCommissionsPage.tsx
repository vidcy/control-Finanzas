import { useState, useEffect } from "react";
import FinanceAppShell from "../components/layout/Appshell";
import Pagination from "../components/ui/Pagination";
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp, 
  User, 
  ShoppingBag,
  Briefcase
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getUserRequest } from "../services/user.api";
import { getAdvisorsRequest, getCommissionsReportRequest } from "../services/advisor.api";
import type { Advisor } from "../services/advisor.api";

interface CommissionTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod: string;
  advisor: Advisor;
  commissionPercentage?: number | null;
  commissionAmount?: number | null;
  user: {
    id: string;
    name: string;
    lastName: string;
  };
}

export default function BusinessCommissionsPage() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [advisorLabel, setAdvisorLabel] = useState("Asesor de venta");
  const [transactions, setTransactions] = useState<CommissionTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("");
  const [dateRange, setDateRange] = useState<"today" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const paginatedTransactions = transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Accordion details state
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);

  const fetchProfileAndAdvisors = async () => {
    try {
      const user = await getUserRequest();
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

  useEffect(() => {
    fetchProfileAndAdvisors();
  }, []);

  useEffect(() => {
    fetchCommissions();
    setCurrentPage(1);
    setExpandedTransactionId(null);
  }, [selectedAdvisorId, dateRange, startDate, endDate]);

  // Calculations
  const totalSales = transactions.reduce((acc, t) => acc + t.amount, 0);
  const totalCommissions = transactions.reduce((acc, t) => {
    if (t.commissionAmount !== undefined && t.commissionAmount !== null) {
      return acc + t.commissionAmount;
    }
    const rate = t.commissionPercentage !== undefined && t.commissionPercentage !== null
      ? t.commissionPercentage
      : (t.advisor?.commissionPercentage || 0);
    return acc + (t.amount * rate) / 100;
  }, 0);

  const parseDescription = (desc?: string) => {
    if (!desc) return [];
    const prefix = "Venta en POS: ";
    if (desc.startsWith(prefix)) {
      const itemsStr = desc.substring(prefix.length);
      return itemsStr.split(",").map(i => i.trim());
    }
    return [desc];
  };

  const toggleExpand = (id: string) => {
    setExpandedTransactionId(expandedTransactionId === id ? null : id);
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
              Visualiza el desglose de ventas, comisiones totales y la lista detallada de productos comercializados por cada asesor.
            </p>
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
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
              >
                <option value="">-- Todos los asesores --</option>
                {advisors.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
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
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
              >
                <option value="today">Hoy</option>
                <option value="month">Mes Actual</option>
                <option value="year">Año Actual</option>
                <option value="custom">Rango Personalizado</option>
              </select>
            </div>

            {/* Custom Dates */}
            {dateRange === "custom" && (
              <>
                <div>
                  <label className="block text-gray-700 font-extrabold mb-1.5 text-xs uppercase tracking-wider">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-extrabold mb-1.5 text-xs uppercase tracking-wider">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Card 1: Total Vendido */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-3xl border border-indigo-100/50 p-6 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-sm text-indigo-700/80 font-black uppercase tracking-wider">Total Comercializado</span>
              <h2 className="text-3xl font-black text-indigo-900 mt-1">S/ {totalSales.toFixed(2)}</h2>
              <p className="text-xs text-indigo-500 font-bold mt-1">Suma total de ventas asociadas en POS</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
              <DollarSign className="w-7 h-7" />
            </div>
          </div>

          {/* Card 2: Total Comisiones */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-3xl border border-emerald-100/50 p-6 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-sm text-emerald-700/80 font-black uppercase tracking-wider">Comisiones Acumuladas</span>
              <h2 className="text-3xl font-black text-emerald-900 mt-1">S/ {totalCommissions.toFixed(2)}</h2>
              <p className="text-xs text-emerald-500 font-bold mt-1">Incentivos acumulados listos para pago</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-100">
              <TrendingUp className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* DETAILED TRANSACTIONS TABLE */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-800 text-lg">Detalle de Ventas e Incentivos</h3>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-black rounded-lg">
              {transactions.length} Ventas
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold">Generando reporte de comisiones...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="font-bold text-gray-600">No se encontraron ventas para los filtros seleccionados</p>
              <p className="text-xs text-gray-400 mt-0.5">Intenta expandiendo el rango de fechas o seleccionando otro asesor.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                <div className="col-span-3">Asesor / Vendedor</div>
                <div className="col-span-2">Fecha y Hora</div>
                <div className="col-span-2">Caja / Cajero</div>
                <div className="col-span-2 text-right">Monto Venta</div>
                <div className="col-span-1 text-center">Tasa</div>
                <div className="col-span-2 text-right">Comisión</div>
              </div>

              {paginatedTransactions.map((t) => {
                const isExpanded = expandedTransactionId === t.id;
                const commissionRate = t.commissionPercentage !== undefined && t.commissionPercentage !== null
                  ? t.commissionPercentage
                  : (t.advisor?.commissionPercentage || 0);
                const commissionAmount = t.commissionAmount !== undefined && t.commissionAmount !== null
                  ? t.commissionAmount
                  : (t.amount * commissionRate) / 100;
                const itemsList = parseDescription(t.description);

                return (
                  <div key={t.id} className="transition-all hover:bg-gray-50/50">
                    {/* Main Row */}
                    <div 
                      onClick={() => toggleExpand(t.id)}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-gray-700 items-center cursor-pointer select-none"
                    >
                      {/* Mobile Indicator */}
                      <div className="col-span-3 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-gray-900">{t.advisor?.name || "Desconocido"}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Asesor</div>
                        </div>
                      </div>

                      <div className="col-span-2 text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(t.date).toLocaleString()}
                        </span>
                      </div>

                      <div className="col-span-2 text-xs font-bold text-gray-500">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                          {t.user?.name} {t.user?.lastName}
                        </span>
                      </div>

                      <div className="col-span-2 text-right font-extrabold text-gray-900">
                        S/ {t.amount.toFixed(2)}
                      </div>

                      <div className="col-span-1 text-center font-bold text-indigo-600">
                        {commissionRate}%
                      </div>

                      <div className="col-span-2 text-right font-black text-emerald-600 flex items-center justify-end gap-2">
                        <span>S/ {commissionAmount.toFixed(2)}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {/* Expandable breakdown drawer */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 bg-gray-50/50 border-t border-gray-100/50">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Productos Vendidos</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {itemsList.map((item, idx) => (
                            <div key={idx} className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-2xs text-xs font-extrabold text-gray-700">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {transactions.length > 0 && (
            <div className="p-4 border-t border-gray-50">
              <Pagination
                currentPage={currentPage}
                totalItems={transactions.length}
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
