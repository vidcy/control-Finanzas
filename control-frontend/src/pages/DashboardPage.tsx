import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import Appshell from "../components/layout/Appshell";
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Calendar,
  BarChart3,
  Activity,
  Loader2,
  RefreshCcw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Zap,
  TrendingUp as TrendUp,
  Download,
  X,
  PiggyBank,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getTransactionsRequest } from "../services/transaction.api";
import {
  listPendingTransactionsRequest,
  markAsPaidRequest,
} from "../services/pending.api";
import { toast } from "react-hot-toast";
import { utcToPeruDate, getDueDateStatus } from "../utils/date.utils";
import { usePersonalAI } from "../hooks/usePersonalAI";
import PersonalAIAdvisor from "../components/dashboard/PersonalAIAdvisor";



// ─── SAFE DATE PARSER (fixes April 1st UTC-midnight timezone rollback) ─────────
const parseSafeDate = (raw: string | Date | undefined | null): Date => {
  if (!raw) return new Date(NaN);
  if (raw instanceof Date) return raw;
  try {
    if (typeof raw === "string") {
      const isDateOnlyOrMidnight =
        !raw.includes("T") || raw.includes("T00:00:00");
      if (isDateOnlyOrMidnight) {
        const [y, m, d] = raw.split("T")[0].split("-").map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d))
          return new Date(y, m - 1, d, 12, 0, 0);
      }
    }
  } catch (_) {}
  return utcToPeruDate(raw);
};

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Oct",
  "Nov",
  "Dic",
];
const YEAR = new Date().getFullYear();

// ─── COMPONENT ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  // Data
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI States
  const [showValues, setShowValues] = useState(true);
  const [isProjectedMode, setIsProjectedMode] = useState(false);
  const [compactChart, setCompactChart] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    Ingresos: true,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [simulatorSavings, setSimulatorSavings] = useState(0);
  const [payingId, setPayingId] = useState<string | null>(null);

  // 👇 NUEVO: Referencia para la tabla y estado para saber si los módulos deben apilarse
  const tableRef = useRef<HTMLDivElement>(null);
  const [shouldStackModules, setShouldStackModules] = useState(false);


  // PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const h = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  // ── Load Data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [tData, pData] = await Promise.all([
        getTransactionsRequest(),
        listPendingTransactionsRequest().catch(() => []),
      ]);
      setTransactions(Array.isArray(tData) ? tData : []);
      setPendingTransactions(Array.isArray(pData) ? pData : []);
    } catch (e: any) {
      toast.error(e?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 👇 NUEVO: Efecto para medir la altura de la tabla y decidir si apilar los módulos
  useEffect(() => {
    if (!tableRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const height = entry.contentRect.height;
        // Si la tabla mide menos de 400px de altura, apilamos los módulos debajo
        setShouldStackModules(height < 400);
      }
    });

    observer.observe(tableRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Quick Pay ───────────────────────────────────────────────────────────────
  const handleQuickPay = async (id: string) => {
    setPayingId(id);
    try {
      await markAsPaidRequest(id, { status: "PAID" });
      toast.success("¡Deuda saldada! 🎉");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
      await loadData(true);
    } catch (e: any) {
      toast.error(e?.message || "Error al registrar pago");
    } finally {
      setPayingId(null);
    }
  };

  // ── Safe array ──────────────────────────────────────────────────────────────
  const safeTx = Array.isArray(transactions) ? transactions : [];
  const safePending = Array.isArray(pendingTransactions)
    ? pendingTransactions
    : [];

  // ── Active transactions (Real or Projected) ─────────────────────────────────
  const activeTx = useMemo(() => {
    if (!isProjectedMode) return safeTx;
    const unpaid = safePending
      .filter((p) => p.status !== "PAID")
      .map((p) => ({
        ...p,
        category:
          typeof p.category === "object"
            ? p.category
            : { name: p.category || "Pendientes" },
        subCategory:
          typeof p.subCategory === "object"
            ? p.subCategory
            : { name: p.subCategory || "General" },
      }));
    return [...safeTx, ...unpaid];
  }, [safeTx, safePending, isProjectedMode]);

  // ── Monthly aggregations ────────────────────────────────────────────────────
  const { incomeRows, expenseRows, mIncome, mExpense } = useMemo(() => {
    const mIncome = Array(12).fill(0);
    const mExpense = Array(12).fill(0);
    const incMapRaw: Record<string, number[]> = {};
    const expMapRaw: Record<
      string,
      { name: string; subcategories: Record<string, number[]> }
    > = {};

    activeTx.forEach((t) => {
      const isPending = t.status === "PENDING" || t.status === undefined;
      const raw = isPending ? t.dueDate || t.date : t.paidAt || t.date;
      const d = parseSafeDate(raw);
      if (isNaN(d.getTime())) return;
      const mo = d.getMonth();
      const amount =
        Number(t.amount || 0) *
        (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);

      if (t.type === "INCOME") {
        mIncome[mo] += amount;
        const cat =
          t.category?.name ??
          (typeof t.category === "string" ? t.category : "Otros Ingresos");
        if (!incMapRaw[cat]) incMapRaw[cat] = Array(12).fill(0);
        incMapRaw[cat][mo] += amount;
      } else {
        mExpense[mo] += amount;
        const cat =
          t.category?.name ??
          (typeof t.category === "string" ? t.category : "Otros Gastos");
        const sub =
          t.subCategory?.name ??
          (typeof t.subCategory === "string" ? t.subCategory : "General");
        if (!expMapRaw[cat]) expMapRaw[cat] = { name: cat, subcategories: {} };
        if (!expMapRaw[cat].subcategories[sub])
          expMapRaw[cat].subcategories[sub] = Array(12).fill(0);
        expMapRaw[cat].subcategories[sub][mo] += amount;
      }
    });

    return {
      incomeRows: Object.entries(incMapRaw).map(([name, values]) => ({
        name,
        values,
      })),
      expenseRows: Object.values(expMapRaw).map((c) => ({
        category: c.name,
        subcategories: Object.entries(c.subcategories).map(
          ([name, values]) => ({ name, values }),
        ),
      })),
      mIncome,
      mExpense,
      incomeMap: incMapRaw,
      expenseMap: expMapRaw,
    };
  }, [activeTx]);

  const mBalance = mIncome.map((inc, i) => inc - mExpense[i]);
  const totalIncome = mIncome.reduce((a, b) => a + b, 0);
  const totalExpense = mExpense.reduce((a, b) => a + b, 0);
  const totalBalance = totalIncome - totalExpense;
  const maxMonthVal = Math.max(...mIncome, ...mExpense, 1);

  // ── Piggy Bank Savings (Chancho) ────────────────────────────────────────────
  const totalAhorrosPiggy = useMemo(() => {
    return safeTx
      .filter(
        (t) =>
          t.type === "EXPENSE" &&
          (t.category?.name?.toLowerCase().includes("ahorro") ||
            t.category?.name?.toLowerCase().includes("saving"))
      )
      .reduce(
        (acc, t) =>
          acc +
          Number(t.amount || 0) *
            (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1),
        0
      );
  }, [safeTx]);

  // ── Pending stats ───────────────────────────────────────────────────────────
  const pendingStats = useMemo(() => {
    let receivable = 0,
      payable = 0;
    const urgent: any[] = [];
    safePending.forEach((p) => {
      if (p.status === "PAID") return;
      const amt =
        Number(p.amount || 0) *
        (p.currency === "USD" ? Number(p.exchangeRate || 1) : 1);
      if (p.type === "INCOME") receivable += amt;
      else payable += amt;
      const due = getDueDateStatus(p.dueDate);
      if (["EXPIRED", "TODAY", "TOMORROW"].includes(due.status))
        urgent.push({ ...p, dueInfo: due, amountSoles: amt });
    });
    urgent.sort((a, b) => {
      const o: Record<string, number> = {
        EXPIRED: 0,
        TODAY: 1,
        TOMORROW: 2,
        FUTURE: 3,
      };
      return (o[a.dueInfo.status] || 0) - (o[b.dueInfo.status] || 0);
    });
    return { receivable, payable, urgent: urgent.slice(0, 5) };
  }, [safePending]);

  // Dentro del componente DashboardPage (después de los estados):
  const navigate = useNavigate();

  const handleRecommendationClick = useCallback(
    (
      category: string,
      type: string,
      categoryId?: string, // <-- Opcional
      subCategoryId?: string, // <-- Opcional
      module?: string, // <-- Opcional
      tab?: string, // <-- Opcional
    ) => {
      const queryParams = new URLSearchParams();
      if (category) queryParams.set("category", category);
      if (categoryId) queryParams.set("categoryId", categoryId);
      if (subCategoryId) queryParams.set("subCategoryId", subCategoryId);
      if (module) queryParams.set("module", module); // <-- AÑADIDO (faltaba)
      if (tab) queryParams.set("tab", tab);

      // Lógica de navegación (ya la tienes bien)
      if (type.includes("Ahorro") || type.includes("Fondo de Emergencia")) {
        navigate(`/expenses?${queryParams.toString()}`);
      } else if (type.includes("Ingresos") || type === "Cobranza") {
        navigate(`/income?${queryParams.toString()}`);
      } else if (
        type.includes("Gastos") ||
        type.includes("Ahorro en") ||
        type === "Pagos para Hoy"
      ) {
        navigate(`/expenses?${queryParams.toString()}`);
      } else if (
        type.includes("Deudas") ||
        type === "Falta de Liquidez" ||
        type === "Sobreendeudamiento"
      ) {
        navigate(`/pending?tab=PAYABLES&${queryParams.toString()}`);
      } else if (type === "Superávit") {
        navigate(`/pending?tab=RECEIVABLES&${queryParams.toString()}`);
      } else {
        navigate(`/income?${queryParams.toString()}`);
      }
    },
    [navigate],
  );

  // ── Financial health alerts ─────────────────────────────────────────────────
  // ── Financial health alerts ─────────────────────────────────────────────────
  // =============================================
  // 🔥 MOTOR DE ANÁLISIS FINANCIERO IA PRO
  // =============================================
  const financialAnalysisEngine = usePersonalAI({
    activeTx,
    mIncome,
    mExpense,
    mBalance,
    totalIncome,
    totalExpense,
    totalBalance,
    pendingStats,
  });

  // ── Month drilldown transactions ────────────────────────────────────────────
  const drillTx = useMemo(() => {
    if (selectedMonth === null) return [];
    return activeTx
      .filter((t) => {
        const raw =
          t.status === "PENDING" || t.status === undefined
            ? t.dueDate || t.date
            : t.paidAt || t.date;
        const d = parseSafeDate(raw);
        return !isNaN(d.getTime()) && d.getMonth() === selectedMonth;
      })
      .map((t) => ({
        ...t,
        amtSoles:
          Number(t.amount || 0) *
          (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1),
      }))
      .sort((a, b) => b.amtSoles - a.amtSoles)
      .slice(0, 8);
  }, [activeTx, selectedMonth]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmtVal = (v: number) => (showValues ? `S/ ${fmt(v)}` : "••••••");
  const toggleCat = (k: string) =>
    setExpandedCats((p) => ({ ...p, [k]: !p[k] }));
  const expandAll = () => {
    const s: Record<string, boolean> = { Ingresos: true };
    expenseRows.forEach((_, i) => {
      s[`exp-${i}`] = true;
    });
    setExpandedCats(s);
  };
  const collapseAll = () => setExpandedCats({ Ingresos: false });

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Appshell>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LayoutDashboard className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-gray-700">Cargando Resumen</p>
            <p className="text-sm text-gray-400 mt-1 font-semibold">
              Sincronizando datos financieros...
            </p>
          </div>
        </div>
      </Appshell>
    );
  }



  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Appshell>
      <div className="flex flex-col gap-6 pb-20 animate-fade-in">
        {/* ── CONFETTI ──────────────────────────────────────────────────────── */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-sm confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: "-20px",
                  width: `${5 + Math.random() * 8}px`,
                  height: `${5 + Math.random() * 8}px`,
                  backgroundColor: [
                    "#10B981",
                    "#6366F1",
                    "#F59E0B",
                    "#EF4444",
                    "#EC4899",
                    "#8B5CF6",
                    "#06B6D4",
                  ][Math.floor(Math.random() * 7)],
                  animationDelay: `${Math.random() * 1.5}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>
        )}

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div className="relative bg-white/50 backdrop-blur-2xl border border-white/70 rounded-3xl p-5 md:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-3xl" />
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-400/5 rounded-full blur-3xl" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-xl shadow-indigo-200/50 relative overflow-hidden group">
                <LayoutDashboard className="w-7 h-7 text-white relative z-10" />
                <div className="absolute inset-0 bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-2xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-indigo-900 to-gray-700 tracking-tight">
                  Resumen Financiero
                </h1>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
                  Análisis en tiempo real · {YEAR}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Real / Projected toggle */}
              <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
                {[
                  { label: "Real", val: false },
                  { label: "Proyectado", val: true },
                ].map((opt) => (
                  <button
                    key={String(opt.val)}
                    onClick={() => setIsProjectedMode(opt.val)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                      isProjectedMode === opt.val
                        ? opt.val
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                          : "bg-white text-slate-800 shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Hide values */}
              <button
                onClick={() => setShowValues((v) => !v)}
                className="p-2.5 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                title={showValues ? "Ocultar montos" : "Mostrar montos"}
              >
                {showValues ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>

              {/* Refresh */}
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-2xl font-black hover:bg-indigo-100 transition-all text-sm border border-indigo-100 disabled:opacity-50"
              >
                <RefreshCcw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              {/* PWA Install */}
              {canInstall && (
                <button
                  onClick={async () => {
                    deferredPrompt?.prompt();
                    await deferredPrompt?.userChoice;
                    setDeferredPrompt(null);
                    setCanInstall(false);
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-2 rounded-2xl font-black text-sm shadow-lg shadow-emerald-200"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Instalar App</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Income */}
          <KPICard
            label={
              isProjectedMode ? "Ingresos Proyectados" : "Ingresos Totales"
            }
            value={fmtVal(totalIncome)}
            rawValue={totalIncome}
            color="emerald"
            icon={<TrendingUp className="w-5 h-5" />}
            sub={`${((totalIncome / (totalExpense || 1)) * 100).toFixed(0)}% vs gastos`}
            subPositive
          />
          {/* Expenses */}
          <KPICard
            label={isProjectedMode ? "Gastos Proyectados" : "Gastos Totales"}
            value={fmtVal(totalExpense)}
            rawValue={totalExpense}
            color="rose"
            icon={<TrendingDown className="w-5 h-5" />}
            sub={`${((totalExpense / (totalIncome || 1)) * 100).toFixed(0)}% del ingreso`}
            subPositive={false}
          />
          {/* Net */}
          <KPICard
            label={isProjectedMode ? "Ahorro Proyectado" : "Saldo Neto"}
            value={fmtVal(totalBalance)}
            rawValue={totalBalance}
            color={totalBalance >= 0 ? "indigo" : "red"}
            icon={<Wallet className="w-5 h-5" />}
            sub={totalBalance >= 0 ? "Saldo positivo ✓" : "Déficit acumulado"}
            subPositive={totalBalance >= 0}
          />
          {/* Pending */}
          <KPICard
            label="Por Pagar (Pendientes)"
            value={fmtVal(pendingStats.payable)}
            rawValue={pendingStats.payable}
            color="amber"
            icon={<Clock className="w-5 h-5" />}
            sub={`${pendingStats.urgent.length} urgentes`}
            subPositive={pendingStats.payable === 0}
          />
          {/* Piggy Bank */}
          <KPICard
            label="Ahorros del Chancho"
            value={fmtVal(totalAhorrosPiggy)}
            rawValue={totalAhorrosPiggy}
            color="teal"
            icon={<PiggyBank className="w-5 h-5" />}
            sub="Fondos reservados"
            subPositive={true}
          />
        </div>

        {/* ── MAIN GRID: CHART + SIDEBAR ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* ── CHART COLUMN ─────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 flex flex-col gap-5">
            {/* Bar Chart */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.04)] overflow-hidden">
              {/* Chart header */}
              <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-200/50">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-gray-800">
                      Comparativa Mensual
                    </h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      {selectedMonth !== null ? (
                        <span className="text-indigo-500 flex items-center gap-1">
                          Filtrando {MONTHS[selectedMonth]}
                          <button
                            onClick={() => setSelectedMonth(null)}
                            className="ml-1 hover:text-indigo-700 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : isProjectedMode ? (
                        "Flujo Proyectado · Reales + Pendientes"
                      ) : (
                        "Flujo Real Acumulado"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Legend */}
                  <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />{" "}
                      Ingresos
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 bg-rose-400 rounded-full" />{" "}
                      Egresos
                    </span>
                  </div>
                  {/* Compact toggle */}
                  <button
                    onClick={() => setCompactChart((c) => !c)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-100 transition-all"
                    title={
                      compactChart ? "Expandir gráfico" : "Compactar gráfico"
                    }
                  >
                    {compactChart ? (
                      <Maximize2 className="w-4 h-4" />
                    ) : (
                      <Minimize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Chart area */}
              <div className="p-6 pt-4">
                <div className="overflow-x-auto scrollbar-hide">
                  <div
                    className={`relative min-w-[560px] transition-all duration-500 ${compactChart ? "h-44" : "h-64"}`}
                  >
                    {/* Y-axis grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      {[1, 0.75, 0.5, 0.25, 0].map((p) => (
                        <div key={p} className="flex items-center gap-3">
                          <span className="text-[9px] font-black text-gray-300 w-14 text-right shrink-0">
                            {(maxMonthVal * p).toLocaleString("es-PE", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          <div className="flex-1 border-t border-gray-100 border-dashed" />
                        </div>
                      ))}
                    </div>

                    {/* Bars */}
                    <div className="absolute inset-0 left-[4.5rem] flex justify-between items-end pb-6 gap-1">
                      {MONTHS.map((mo, i) => {
                        const iH = (mIncome[i] / maxMonthVal) * 100;
                        const eH = (mExpense[i] / maxMonthVal) * 100;
                        const isPos = mBalance[i] >= 0;
                        const isSel = selectedMonth === i;
                        const hasData = mIncome[i] > 0 || mExpense[i] > 0;

                        return (
                          <div
                            key={mo}
                            className={`flex flex-col items-center flex-1 h-full group/bar cursor-pointer transition-all duration-200 ${isSel ? "scale-105" : "hover:scale-[1.03]"}`}
                            onClick={() => setSelectedMonth(isSel ? null : i)}
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover/bar:opacity-100 pointer-events-none z-40 transition-all duration-200 translate-y-1 group-hover/bar:translate-y-0">
                              <div
                                className={`text-white p-3 rounded-2xl shadow-2xl border text-xs w-40 ${isSel ? "bg-indigo-900/95 border-indigo-700/40" : "bg-gray-900/95 border-white/10"}`}
                              >
                                <div
                                  className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl ${isPos ? "bg-emerald-400" : "bg-rose-400"}`}
                                />
                                <p className="font-black uppercase tracking-widest text-[9px] text-gray-300 mb-1.5">
                                  {mo} {YEAR}
                                </p>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Ing:</span>
                                    <span className="font-black text-emerald-400">
                                      S/
                                      {mIncome[i].toLocaleString("es-PE", {
                                        maximumFractionDigits: 0,
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Egr:</span>
                                    <span className="font-black text-rose-400">
                                      S/
                                      {mExpense[i].toLocaleString("es-PE", {
                                        maximumFractionDigits: 0,
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t border-white/10 mt-1">
                                    <span className="text-white font-black">
                                      Neto:
                                    </span>
                                    <span
                                      className={`font-black ${isPos ? "text-emerald-400" : "text-rose-400"}`}
                                    >
                                      S/
                                      {mBalance[i].toLocaleString("es-PE", {
                                        maximumFractionDigits: 0,
                                      })}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[8px] text-center mt-1.5 text-indigo-300 font-bold">
                                  {isSel
                                    ? "✕ Clic para limpiar"
                                    : "Clic para ver detalle"}
                                </p>
                              </div>
                              <div className="w-2.5 h-2.5 bg-gray-900 rotate-45 mx-auto -mt-1.5" />
                            </div>

                            {/* Selection ring */}
                            {isSel && (
                              <div className="absolute inset-x-0 top-0 bottom-6 rounded-2xl border-2 border-indigo-400/50 bg-indigo-50/30 glow-ring" />
                            )}

                            {/* Bar group */}
                            <div className="flex items-end gap-0.5 w-full h-full">
                              <div
                                className={`flex-1 rounded-t-lg transition-all duration-700 relative overflow-hidden ${
                                  isSel
                                    ? "bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                                    : hasData
                                      ? "bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover/bar:shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                                      : "bg-gray-100"
                                }`}
                                style={{
                                  height: `${Math.max(iH, hasData ? 3 : 1)}%`,
                                }}
                              >
                                <div className="absolute inset-0 shimmer-bar" />
                              </div>
                              <div
                                className={`flex-1 rounded-t-lg transition-all duration-700 delay-75 relative overflow-hidden ${
                                  isSel
                                    ? "bg-gradient-to-t from-violet-600 to-violet-400"
                                    : hasData
                                      ? "bg-gradient-to-t from-rose-500 to-rose-300 group-hover/bar:shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                                      : "bg-gray-50"
                                }`}
                                style={{
                                  height: `${Math.max(eH, hasData ? 3 : 1)}%`,
                                }}
                              >
                                <div className="absolute inset-0 shimmer-bar" />
                              </div>
                            </div>

                            {/* Label */}
                            <div className="h-6 flex flex-col items-center justify-center mt-0.5 shrink-0">
                              <span
                                className={`text-[9px] font-black tracking-tight ${isSel ? "text-indigo-600" : isPos ? "text-emerald-600" : "text-rose-500"}`}
                              >
                                {mo}
                              </span>
                              {isSel && (
                                <div className="w-1 h-1 bg-indigo-500 rounded-full mt-0.5" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Monthly Drilldown */}
                {selectedMonth !== null && (
                  <div className="mt-5 border-t border-gray-100 pt-5 drilldown-enter">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                        <h3 className="text-sm font-black text-gray-800">
                          Movimientos en {MONTHS[selectedMonth]}
                        </h3>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">
                          {drillTx.length} registros
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-black">
                        <span className="text-emerald-600">
                          +S/
                          {mIncome[selectedMonth].toLocaleString("es-PE", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        <span className="text-gray-200">|</span>
                        <span className="text-rose-500">
                          -S/
                          {mExpense[selectedMonth].toLocaleString("es-PE", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg font-black text-xs ${mBalance[selectedMonth] >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                        >
                          Neto: S/
                          {Math.abs(mBalance[selectedMonth]).toLocaleString(
                            "es-PE",
                            { maximumFractionDigits: 0 },
                          )}
                        </span>
                      </div>
                    </div>
                    {drillTx.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-xs font-bold bg-gray-50 rounded-2xl">
                        Sin movimientos en {MONTHS[selectedMonth]}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {drillTx.map((t: any, idx: number) => {
                          const isInc = t.type === "INCOME";
                          return (
                            <div
                              key={`drill-${idx}`}
                              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-sm ${isInc ? "bg-emerald-50/60 border-emerald-100" : "bg-rose-50/60 border-rose-100"}`}
                            >
                              <div
                                className={`p-2 rounded-xl shrink-0 ${isInc ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"}`}
                              >
                                {isInc ? (
                                  <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                  <ArrowDownRight className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-gray-800 truncate">
                                  {t.description || t.name || "Transacción"}
                                </p>
                                <p className="text-[9px] text-gray-400 font-semibold truncate">
                                  {t.category?.name || t.category || "Otros"}
                                </p>
                              </div>
                              <span
                                className={`text-sm font-black shrink-0 ${isInc ? "text-emerald-600" : "text-rose-500"}`}
                              >
                                S/
                                {t.amtSoles.toLocaleString("es-PE", {
                                  maximumFractionDigits: 0,
                                })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── DESGLOSE ESTRUCTURAL TABLE ──────────────────────────────── */}
            <div
              ref={tableRef} // 👈 Añade esto
              className="bg-white rounded-3xl border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200/40">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-gray-800">
                      Estructura Detallada por Meses
                    </h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                      {selectedMonth !== null
                        ? `Mostrando todo el año · Mes activo: ${MONTHS[selectedMonth]}`
                        : "Desliza horizontalmente para navegar"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all border border-indigo-100"
                  >
                    Expandir
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-3 py-1.5 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-gray-100 transition-all"
                  >
                    Contraer
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-premium">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                      <th className="sticky left-0 bg-white/95 backdrop-blur-md z-30 p-3 pl-6 text-[10px] font-black uppercase tracking-widest w-52 border-r border-gray-100 text-gray-500 shadow-[4px_0_10px_rgba(0,0,0,0.04)]">
                        Clasificación
                      </th>
                      {MONTHS.map((m, i) => (
                        <th
                          key={m}
                          onClick={() =>
                            setSelectedMonth(selectedMonth === i ? null : i)
                          }
                          className={`p-3 text-center text-[9px] font-black uppercase tracking-widest border-r border-gray-50 w-20 cursor-pointer transition-all ${
                            selectedMonth === i
                              ? "text-indigo-600 bg-indigo-50/60"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {m}
                          {selectedMonth === i && (
                            <div className="w-1 h-1 bg-indigo-500 rounded-full mx-auto mt-0.5" />
                          )}
                        </th>
                      ))}
                      <th className="p-3 text-right text-[9px] font-black uppercase tracking-widest w-28 bg-indigo-50/50 text-indigo-600">
                        Total Anual
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {/* Income header row */}
                    <tr className="bg-gradient-to-r from-emerald-500 to-teal-500">
                      <td className="sticky left-0 bg-gradient-to-r from-emerald-500 to-teal-500 z-20 p-3 pl-6 border-r border-emerald-400 text-white font-black uppercase text-[10px] tracking-widest shadow-[4px_0_15px_rgba(16,185,129,0.2)] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 shrink-0" /> INGRESOS
                      </td>
                      {mIncome.map((v, i) => (
                        <td
                          key={i}
                          className={`p-3 text-center font-black text-white/90 text-[10px] border-r border-white/10 ${selectedMonth === i ? "bg-black/10" : "hover:bg-black/5"} transition-colors`}
                        >
                          {showValues
                            ? v > 0
                              ? v.toLocaleString("es-PE", {
                                  maximumFractionDigits: 0,
                                })
                              : "-"
                            : "••"}
                        </td>
                      ))}
                      <td className="p-3 text-right font-black bg-emerald-700 text-white text-xs">
                        {showValues
                          ? `S/${totalIncome.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`
                          : "••••"}
                      </td>
                    </tr>
                    {incomeRows.map((row, i) => {
                      const rowTotal = row.values.reduce((a, b) => a + b, 0);
                      return (
                        <tr
                          key={`ir-${i}`}
                          className="border-b border-gray-50 hover:bg-emerald-50/20 transition-colors group"
                        >
                          <td className="sticky left-0 bg-white/95 group-hover:bg-emerald-50/10 z-10 p-2.5 pl-10 border-r border-gray-100 text-gray-600 font-bold text-[10px] shadow-[4px_0_8px_rgba(0,0,0,0.03)] flex items-center gap-2 overflow-hidden">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" />
                            <span className="truncate">{row.name}</span>
                          </td>
                          {row.values.map((v, j) => (
                            <td
                              key={j}
                              className={`p-2.5 text-center text-gray-600 font-semibold text-[10px] border-r border-gray-50 ${selectedMonth === j ? "bg-indigo-50/30 font-black" : ""}`}
                            >
                              {showValues
                                ? v > 0
                                  ? v.toLocaleString("es-PE", {
                                      maximumFractionDigits: 0,
                                    })
                                  : "-"
                                : "••"}
                            </td>
                          ))}
                          <td className="p-2.5 text-right font-black text-emerald-700 text-[10px] bg-emerald-50/20">
                            {showValues
                              ? rowTotal.toLocaleString("es-PE", {
                                  maximumFractionDigits: 0,
                                })
                              : "••"}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Expense header row */}
                    <tr className="bg-gradient-to-r from-purple-500 to-pink-500">
                      <td className="sticky left-0 bg-gradient-to-r from-purple-500 to-pink-500 z-20 p-3 pl-6 border-r border-purple-400 text-white font-black uppercase text-[10px] tracking-widest shadow-[4px_0_15px_rgba(168,85,247,0.2)] flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 shrink-0" /> EGRESOS
                      </td>
                      {mExpense.map((v, i) => (
                        <td
                          key={i}
                          className={`p-3 text-center font-black text-white/90 text-[10px] border-r border-white/10 ${selectedMonth === i ? "bg-black/10" : "hover:bg-black/5"} transition-colors`}
                        >
                          {showValues
                            ? v > 0
                              ? v.toLocaleString("es-PE", {
                                  maximumFractionDigits: 0,
                                })
                              : "-"
                            : "••"}
                        </td>
                      ))}
                      <td className="p-3 text-right font-black bg-purple-700 text-white text-xs">
                        {showValues
                          ? `S/${totalExpense.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`
                          : "••••"}
                      </td>
                    </tr>
                    {expenseRows.map((cat, i) => {
                      const catTotals = Array(12).fill(0);
                      cat.subcategories.forEach((s) =>
                        s.values.forEach((v, j) => {
                          catTotals[j] += v;
                        }),
                      );
                      const catTotal = catTotals.reduce((a, b) => a + b, 0);
                      const isExp = !!expandedCats[`exp-${i}`];
                      return (
                        <React.Fragment key={`ec-${i}`}>
                          <tr
                            className="border-b border-gray-100 hover:bg-purple-50/10 cursor-pointer group transition-colors"
                            onClick={() => toggleCat(`exp-${i}`)}
                          >
                            <td className="sticky left-0 bg-white/95 group-hover:bg-purple-50/5 z-10 p-2.5 pl-6 font-black text-gray-800 text-[10px] uppercase border-r border-gray-100 shadow-[4px_0_8px_rgba(0,0,0,0.03)] flex items-center justify-between pr-4">
                              <div className="flex items-center gap-2 min-w-0">
                                {isExp ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                )}
                                <span className="truncate">{cat.category}</span>
                              </div>
                            </td>
                            {catTotals.map((v, j) => (
                              <td
                                key={j}
                                className={`p-2.5 text-center text-[10px] font-black border-r border-gray-50 ${v > 0 ? "text-gray-800" : "text-gray-300"} ${selectedMonth === j ? "bg-indigo-50/30" : ""}`}
                              >
                                {showValues
                                  ? v > 0
                                    ? v.toLocaleString("es-PE", {
                                        maximumFractionDigits: 0,
                                      })
                                    : "-"
                                  : "••"}
                              </td>
                            ))}
                            <td className="p-2.5 text-right font-black text-purple-600 text-[10px] bg-purple-50/10">
                              {showValues
                                ? catTotal.toLocaleString("es-PE", {
                                    maximumFractionDigits: 0,
                                  })
                                : "••"}
                            </td>
                          </tr>
                          {isExp &&
                            cat.subcategories.map((sub, j) => {
                              const subTotal = sub.values.reduce(
                                (a, b) => a + b,
                                0,
                              );
                              return (
                                <tr
                                  key={`es-${i}-${j}`}
                                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                >
                                  <td className="sticky left-0 bg-gray-50/80 z-10 p-2 pl-12 border-r border-gray-100 text-gray-500 font-semibold text-[9px] shadow-[4px_0_8px_rgba(0,0,0,0.02)] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-purple-300 rounded-full shrink-0" />
                                    <span className="truncate">{sub.name}</span>
                                  </td>
                                  {sub.values.map((v, k) => (
                                    <td
                                      key={k}
                                      className={`p-2 text-center text-gray-500 text-[9px] font-medium border-r border-gray-50 ${selectedMonth === k ? "bg-indigo-50/30" : ""}`}
                                    >
                                      {showValues
                                        ? v > 0
                                          ? v.toLocaleString("es-PE", {
                                              maximumFractionDigits: 0,
                                            })
                                          : "-"
                                        : "••"}
                                    </td>
                                  ))}
                                  <td className="p-2 text-right font-black text-purple-500 text-[9px] bg-purple-50/5">
                                    {showValues
                                      ? subTotal.toLocaleString("es-PE", {
                                          maximumFractionDigits: 0,
                                        })
                                      : "••"}
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}

                    {/* Net Balance row */}
                    <tr
                      className={`border-t-4 border-white ${totalBalance >= 0 ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600" : "bg-gradient-to-r from-rose-600 via-pink-600 to-orange-600"} text-white`}
                    >
                      <td
                        className={`sticky left-0 z-20 p-4 pl-6 font-black uppercase tracking-widest text-[10px] border-r border-white/20 shadow-[6px_0_20px_rgba(0,0,0,0.3)] ${totalBalance >= 0 ? "bg-emerald-600" : "bg-rose-600"} flex items-center gap-2`}
                      >
                        <Wallet className="w-4 h-4" /> BALANCE NETO
                      </td>
                      {mBalance.map((b, i) => (
                        <td
                          key={i}
                          className={`p-4 text-center font-black text-[10px] border-r border-white/10 ${selectedMonth === i ? "bg-white/20" : b >= 0 ? "bg-white/5" : "bg-black/10"}`}
                        >
                          {showValues
                            ? b.toLocaleString("es-PE", {
                                maximumFractionDigits: 0,
                              })
                            : "••"}
                        </td>
                      ))}
                      <td
                        className={`p-4 text-right font-black text-base ${totalBalance >= 0 ? "bg-emerald-700/50" : "bg-rose-700/50"}`}
                      >
                        {showValues
                          ? `S/${totalBalance.toLocaleString("es-PE", { minimumFractionDigits: 0 })}`
                          : "••••"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────────── */}
          {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────────── */}
          {/* 👇 Si shouldStackModules es true, el sidebar ocupará todo el ancho en pantallas grandes */}
          <div
            className={shouldStackModules ? "xl:col-span-3" : "xl:col-span-1"}
          >
            <div className="flex flex-col gap-5">
              {/* Financial Health Advisor */}
              <div className="min-w-[300px] w-full h-[550px]">
                <PersonalAIAdvisor 
                  analysis={financialAnalysisEngine} 
                  onActionClick={handleRecommendationClick} 
                />
              </div>

              {/* Debt Payoff Simulator */}
              {/* Contenedor para Simulador + Acción Rápida */}
              {/* 👇 Si shouldStackModules es true, estos módulos se pondrán DEBAJO de la tabla */}
              <div className={shouldStackModules ? "xl:col-span-2" : ""}>
                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-5 relative overflow-hidden">
                  <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-emerald-400/5 rounded-full blur-xl" />
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-md shadow-emerald-200/50">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-800">
                        Simulador de Deuda
                      </h3>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                        Proyección de Amortización
                      </p>
                    </div>
                  </div>

                  {pendingStats.payable > 0 ? (
                    (() => {
                      const avgBal = totalBalance / 12;
                      const capacity = Math.max(
                        avgBal + simulatorSavings,
                        0.01,
                      );
                      const months =
                        pendingStats.payable <= 0
                          ? 0
                          : Math.ceil(pendingStats.payable / capacity);
                      const isAchievable = months <= 60;
                      const pct = Math.min(
                        (simulatorSavings / 5000) * 100,
                        100,
                      );
                      const colorClass = !isAchievable
                        ? "text-rose-600 bg-rose-50 border-rose-100"
                        : months <= 6
                          ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                          : months <= 18
                            ? "text-amber-600 bg-amber-50 border-amber-100"
                            : "text-indigo-600 bg-indigo-50 border-indigo-100";

                      return (
                        <>
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                Ahorro Extra Mensual
                              </label>
                              <span className="text-sm font-black text-emerald-600">
                                S/ {simulatorSavings.toLocaleString()}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={5000}
                              step={50}
                              value={simulatorSavings}
                              onChange={(e) =>
                                setSimulatorSavings(Number(e.target.value))
                              }
                              className="w-full sim-slider"
                            />
                            <div className="flex justify-between text-[9px] text-gray-300 font-black mt-1">
                              <span>S/ 0</span>
                              <span>S/ 5,000</span>
                            </div>
                          </div>

                          <div
                            className={`p-4 rounded-2xl border ${colorClass}`}
                          >
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
                              Tiempo para liquidar deuda
                            </p>
                            <p
                              className={`text-3xl font-black ${colorClass.split(" ")[0]}`}
                            >
                              {!isAchievable
                                ? "+60 meses"
                                : months === 0
                                  ? "¡Liquidada!"
                                  : `${months} ${months === 1 ? "mes" : "meses"}`}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              Deuda total: S/ {fmt(pendingStats.payable, 0)}
                            </p>
                          </div>

                          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-gray-400 text-center mt-2 font-semibold">
                            {simulatorSavings > 0
                              ? `+S/${simulatorSavings}/mes reduce ${Math.ceil(pendingStats.payable / Math.max(avgBal, 0.01)) - months} meses`
                              : "Mueve el slider para simular"}
                          </p>
                        </>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center p-6 bg-emerald-50/40 rounded-2xl border border-emerald-100 text-center">
                      <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                      <p className="text-sm font-black text-emerald-700">
                        ¡Sin deudas!
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Tu flujo está libre de compromisos por pagar.
                      </p>
                    </div>
                  )}
                </div>
                {/* Urgent Pending Actions */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-5 relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-400/5 rounded-full blur-xl" />

                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl text-white shadow-md shadow-rose-200/50">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-800">
                        Acción Rápida
                      </h3>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                        Pendientes Urgentes
                      </p>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-slate-50/60 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Por Cobrar
                      </p>
                      <p className="text-sm font-black text-emerald-600">
                        S/ {fmt(pendingStats.receivable, 0)}
                      </p>
                    </div>
                    <div className="border-l border-slate-200 pl-3">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Por Pagar
                      </p>
                      <p className="text-sm font-black text-rose-600">
                        S/ {fmt(pendingStats.payable, 0)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {pendingStats.urgent.length === 0 ? (
                      <div className="flex flex-col items-center p-6 bg-emerald-50/40 rounded-2xl border border-emerald-100 text-center">
                        <Check className="w-8 h-8 text-emerald-500 mb-1.5" />
                        <p className="text-xs font-black text-emerald-700">
                          ¡Al día!
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Sin compromisos urgentes pendientes.
                        </p>
                      </div>
                    ) : (
                      pendingStats.urgent.map((item, idx) => {
                        const isInc = item.type === "INCOME";
                        const isExp = item.dueInfo.status === "EXPIRED";
                        const isToday = item.dueInfo.status === "TODAY";
                        let badge =
                          "bg-slate-50 text-slate-500 border-slate-100";
                        if (isExp)
                          badge =
                            "bg-rose-50 text-rose-600 border-rose-200 animate-pulse";
                        else if (isToday)
                          badge =
                            "bg-orange-50 text-orange-600 border-orange-100";
                        else
                          badge = "bg-amber-50 text-amber-600 border-amber-100";
                        const isPaying = payingId === (item.id || item._id);

                        return (
                          <div
                            key={idx}
                            className="group/item flex items-center justify-between p-3 bg-white/80 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`p-1.5 rounded-xl shrink-0 ${isInc ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}
                              >
                                {isInc ? (
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowDownRight className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-gray-800 truncate">
                                  {item.description ||
                                    item.name ||
                                    "Sin descripción"}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[8px] text-gray-400 font-semibold">
                                    {item.category?.name ||
                                      item.category ||
                                      "Otros"}
                                  </span>
                                  <span className="text-gray-200">·</span>
                                  <span
                                    className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${badge}`}
                                  >
                                    {item.dueInfo.message}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 pl-2">
                              <span
                                className={`text-xs font-black ${isInc ? "text-emerald-600" : "text-rose-600"}`}
                              >
                                S/
                                {item.amountSoles.toLocaleString("es-PE", {
                                  maximumFractionDigits: 0,
                                })}
                              </span>
                              <button
                                onClick={() =>
                                  handleQuickPay(item.id || item._id)
                                }
                                disabled={isPaying}
                                className={`p-1.5 rounded-xl border transition-all flex items-center justify-center ${
                                  isInc
                                    ? "bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 border-emerald-100 hover:shadow-lg hover:shadow-emerald-200"
                                    : "bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 border-rose-100 hover:shadow-lg hover:shadow-rose-200"
                                } disabled:opacity-50`}
                                title={
                                  isInc ? "Registrar cobro" : "Registrar pago"
                                }
                              >
                                {isPaying ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FOOTER STATUS BAR ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-black text-gray-300 uppercase tracking-widest py-4">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-300" /> Sincronizado en
            tiempo real
          </span>
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-300" /> Ciclo {YEAR}
          </span>
          <span className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-300" /> Control Financiero
            Activo
          </span>
          <span className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${totalBalance >= 0 ? "bg-emerald-400" : "bg-rose-400"} animate-pulse`}
            />
            {totalBalance >= 0 ? "Finanzas Saludables" : "Atención Requerida"}
          </span>
        </div>
      </div>

      {/* ── GLOBAL STYLES ─────────────────────────────────────────────────────── */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes confettiFall { 0% { transform:translateY(0) rotate(0deg); opacity:1; } 100% { transform:translateY(100vh) rotate(720deg); opacity:0; } }
        @keyframes shimBar { 0%,100% { opacity:0; } 50% { opacity:0.15; } }
        @keyframes drillIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glowRing { 0%,100% { box-shadow:0 0 0 0 rgba(99,102,241,0); } 50% { box-shadow:0 0 0 6px rgba(99,102,241,0.15); } }

        .animate-fade-in { animation: fadeIn 0.5s ease-out both; }
        .confetti-piece { animation: confettiFall linear forwards; }
        .shimmer-bar { animation: shimBar 3s ease-in-out infinite; background: linear-gradient(to top, transparent, white, transparent); }
        .drilldown-enter { animation: drillIn 0.3s ease-out both; }
        .glow-ring { animation: glowRing 2s ease-in-out infinite; }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        .scrollbar-premium::-webkit-scrollbar { height: 6px; width: 6px; }
        .scrollbar-premium::-webkit-scrollbar-track { background: #f8fafc; border-radius: 99px; }
        .scrollbar-premium::-webkit-scrollbar-thumb { background: linear-gradient(to right, #cbd5e1, #94a3b8); border-radius: 99px; }
        .scrollbar-premium::-webkit-scrollbar-thumb:hover { background: #64748b; }

        .sim-slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 99px; background: linear-gradient(to right, #10b981, #0d9488); cursor: pointer; width: 100%; outline: none; }
        .sim-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: white; border: 3px solid #10b981; box-shadow: 0 2px 8px rgba(16,185,129,0.4); cursor: pointer; transition: transform 0.15s; }
        .sim-slider::-webkit-slider-thumb:hover { transform: scale(1.25); box-shadow: 0 4px 16px rgba(16,185,129,0.5); }
        .sim-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: white; border: 3px solid #10b981; box-shadow: 0 2px 8px rgba(16,185,129,0.4); cursor: pointer; }
      `,
        }}
      />
    </Appshell>
  );
}

// 🐷 BOTÓN FLOTANTE + MODAL (FUERA DE Appshell)

// ─── KPI CARD COMPONENT ────────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  color,
  icon,
  sub,
  subPositive,
}: {
  label: string;
  value: string;
  rawValue: number;
  color: "emerald" | "rose" | "indigo" | "red" | "amber" | "teal";
  icon: React.ReactNode;
  sub: string;
  subPositive: boolean;
}) {
  const colors = {
    emerald: {
      bg: "bg-white border-emerald-50",
      glow: "bg-emerald-500/5 group-hover:bg-emerald-500/10",
      icon: "from-emerald-400 to-emerald-600 shadow-emerald-200",
      label: "text-emerald-600/70",
      val: "text-gray-900",
      sub: "bg-emerald-50 text-emerald-700",
    },
    rose: {
      bg: "bg-white border-rose-50",
      glow: "bg-rose-500/5 group-hover:bg-rose-500/10",
      icon: "from-rose-400 to-rose-600 shadow-rose-200",
      label: "text-rose-600/70",
      val: "text-gray-900",
      sub: "bg-rose-50 text-rose-700",
    },
    indigo: {
      bg: "bg-white border-indigo-50",
      glow: "bg-indigo-500/5 group-hover:bg-indigo-500/10",
      icon: "from-indigo-500 to-purple-700 shadow-indigo-200",
      label: "text-indigo-600/70",
      val: "text-gray-900",
      sub: "bg-indigo-50 text-indigo-700",
    },
    red: {
      bg: "bg-white border-red-50",
      glow: "bg-red-500/5 group-hover:bg-red-500/10",
      icon: "from-red-400 to-red-600 shadow-red-200",
      label: "text-red-600/70",
      val: "text-red-700",
      sub: "bg-red-50 text-red-700",
    },
    amber: {
      bg: "bg-white border-amber-50",
      glow: "bg-amber-500/5 group-hover:bg-amber-500/10",
      icon: "from-amber-400 to-orange-500 shadow-amber-200",
      label: "text-amber-600/70",
      val: "text-gray-900",
      sub: "bg-amber-50 text-amber-700",
    },
    teal: {
      bg: "bg-white border-teal-50",
      glow: "bg-teal-500/5 group-hover:bg-teal-500/10",
      icon: "from-teal-400 to-emerald-500 shadow-teal-200",
      label: "text-teal-600/70",
      val: "text-gray-900",
      sub: "bg-teal-50 text-teal-700",
    },
  }[color];

  return (
    <div
      className={`${colors.bg} rounded-3xl p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all duration-500`}
    >
      <div
        className={`absolute -right-8 -top-8 w-40 h-40 ${colors.glow} rounded-full blur-2xl transition-all duration-700`}
      />
      <div className="flex justify-between items-start relative z-10">
        <div className="flex-1 min-w-0">
          <p
            className={`text-[10px] font-black uppercase tracking-widest mb-2 ${colors.label}`}
          >
            {label}
          </p>
          <p
            className={`text-2xl md:text-3xl font-black ${colors.val} leading-none`}
          >
            {value}
          </p>
          <div
            className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${colors.sub}`}
          >
            {subPositive ? (
              <TrendUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {sub}
          </div>
        </div>
        <div
          className={`p-3.5 bg-gradient-to-br ${colors.icon} rounded-2xl shadow-lg ml-3 shrink-0`}
        >
          <div className="text-white">{icon}</div>
        </div>
      </div>
    </div>
  );
}
