import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,

  Check,
  CheckCircle2,

  Zap,
  TrendingUp as TrendUp,
  Download,

  X,
  Info,
  PiggyBank,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createTransactionRequest, getTransactionsRequest } from "../services/transaction.api";
import { listPendingTransactionsRequest, markAsPaidRequest } from "../services/pending.api";
import { toast } from "react-hot-toast";
import { utcToPeruDate, getDueDateStatus } from "../utils/date.utils";
import { listCategoriesRequest } from "../services/category.api";


// 📌 AGREGA ESTA INTERFAZ AL INICIO DEL ARCHIVO
interface Recommendation {
  type: string;
  message: string;
  action: string;
  category: string;
  subCategory?: string;
  priority: number;
  severity?: 'high' | 'medium' | 'low';
  module?: string;
  params?: {
    tab?: string;
    categoryId?: string;
    subCategoryId?: string;
  };
  potential?: number;
  confidence?: number;
}

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
  } catch (_) { }
  return utcToPeruDate(raw);
};

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
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
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ Ingresos: true });
  const [showConfetti, setShowConfetti] = useState(false);
  const [simulatorSavings, setSimulatorSavings] = useState(0);
  const [payingId, setPayingId] = useState<string | null>(null);

  // 👇 NUEVO: Referencia para la tabla y estado para saber si los módulos deben apilarse
  const tableRef = useRef<HTMLDivElement>(null);
  const [shouldStackModules, setShouldStackModules] = useState(false);

  // Estado para el tab activo del Asesor Financiero PRO
  const [activeAITab, setActiveAITab] = useState<'resumen' | 'analisis' | 'recomendaciones' | 'proyecciones'>('resumen');

  // PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setCanInstall(true); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  // ── Load Data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
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
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
  const safePending = Array.isArray(pendingTransactions) ? pendingTransactions : [];

  // ── Active transactions (Real or Projected) ─────────────────────────────────
  const activeTx = useMemo(() => {
    if (!isProjectedMode) return safeTx;
    const unpaid = safePending
      .filter(p => p.status !== "PAID")
      .map(p => ({
        ...p,
        category: typeof p.category === "object" ? p.category : { name: p.category || "Pendientes" },
        subCategory: typeof p.subCategory === "object" ? p.subCategory : { name: p.subCategory || "General" },
      }));
    return [...safeTx, ...unpaid];
  }, [safeTx, safePending, isProjectedMode]);

  // ── Monthly aggregations ────────────────────────────────────────────────────
  const { incomeRows, expenseRows, mIncome, mExpense } = useMemo(() => {
    const mIncome = Array(12).fill(0);
    const mExpense = Array(12).fill(0);
    const incMapRaw: Record<string, number[]> = {};
    const expMapRaw: Record<string, { name: string; subcategories: Record<string, number[]> }> = {};

    activeTx.forEach(t => {
      const isPending = t.status === "PENDING" || t.status === undefined;
      const raw = isPending ? (t.dueDate || t.date) : (t.paidAt || t.date);
      const d = parseSafeDate(raw);
      if (isNaN(d.getTime())) return;
      const mo = d.getMonth();
      const amount = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);

      if (t.type === "INCOME") {
        mIncome[mo] += amount;
        const cat = t.category?.name ?? (typeof t.category === "string" ? t.category : "Otros Ingresos");
        if (!incMapRaw[cat]) incMapRaw[cat] = Array(12).fill(0);
        incMapRaw[cat][mo] += amount;
      } else {
        mExpense[mo] += amount;
        const cat = t.category?.name ?? (typeof t.category === "string" ? t.category : "Otros Gastos");
        const sub = t.subCategory?.name ?? (typeof t.subCategory === "string" ? t.subCategory : "General");
        if (!expMapRaw[cat]) expMapRaw[cat] = { name: cat, subcategories: {} };
        if (!expMapRaw[cat].subcategories[sub]) expMapRaw[cat].subcategories[sub] = Array(12).fill(0);
        expMapRaw[cat].subcategories[sub][mo] += amount;
      }
    });

    return {
      incomeRows: Object.entries(incMapRaw).map(([name, values]) => ({ name, values })),
      expenseRows: Object.values(expMapRaw).map(c => ({
        category: c.name,
        subcategories: Object.entries(c.subcategories).map(([name, values]) => ({ name, values })),
      })),
      mIncome, mExpense,
      incomeMap: incMapRaw,
      expenseMap: expMapRaw,
    };
  }, [activeTx]);

  const mBalance = mIncome.map((inc, i) => inc - mExpense[i]);
  const totalIncome = mIncome.reduce((a, b) => a + b, 0);
  const totalExpense = mExpense.reduce((a, b) => a + b, 0);
  const totalBalance = totalIncome - totalExpense;
  const maxMonthVal = Math.max(...mIncome, ...mExpense, 1);

  // ── Pending stats ───────────────────────────────────────────────────────────
  const pendingStats = useMemo(() => {
    let receivable = 0, payable = 0;
    const urgent: any[] = [];
    safePending.forEach(p => {
      if (p.status === "PAID") return;
      const amt = Number(p.amount || 0) * (p.currency === "USD" ? Number(p.exchangeRate || 1) : 1);
      if (p.type === "INCOME") receivable += amt; else payable += amt;
      const due = getDueDateStatus(p.dueDate);
      if (["EXPIRED", "TODAY", "TOMORROW"].includes(due.status))
        urgent.push({ ...p, dueInfo: due, amountSoles: amt });
    });
    urgent.sort((a, b) => {
      const o: Record<string, number> = { EXPIRED: 0, TODAY: 1, TOMORROW: 2, FUTURE: 3 };
      return (o[a.dueInfo.status] || 0) - (o[b.dueInfo.status] || 0);
    });
    return { receivable, payable, urgent: urgent.slice(0, 5) };
  }, [safePending]);


  // Dentro del componente DashboardPage (después de los estados):
  const navigate = useNavigate();

  const handleRecommendationClick = useCallback((
    category: string,
    type: string,
    categoryId?: string,    // <-- Opcional
    subCategoryId?: string, // <-- Opcional
    module?: string,        // <-- Opcional
    tab?: string            // <-- Opcional
  ) => {
    const queryParams = new URLSearchParams();
    if (category) queryParams.set('category', category);
    if (categoryId) queryParams.set('categoryId', categoryId);
    if (subCategoryId) queryParams.set('subCategoryId', subCategoryId);
    if (module) queryParams.set('module', module);  // <-- AÑADIDO (faltaba)
    if (tab) queryParams.set('tab', tab);

    // Lógica de navegación (ya la tienes bien)
    if (type.includes("Ahorro") || type.includes("Fondo de Emergencia")) {
      navigate(`/expenses?${queryParams.toString()}`);
    }
    else if (type.includes("Ingresos") || type === "Cobranza") {
      navigate(`/income?${queryParams.toString()}`);
    }
    else if (type.includes("Gastos") || type.includes("Ahorro en") || type === "Pagos para Hoy") {
      navigate(`/expenses?${queryParams.toString()}`);
    }
    else if (type.includes("Deudas") || type === "Falta de Liquidez" || type === "Sobreendeudamiento") {
      navigate(`/pending?tab=PAYABLES&${queryParams.toString()}`);
    }
    else if (type === "Superávit") {
      navigate(`/pending?tab=RECEIVABLES&${queryParams.toString()}`);
    }
    else {
      navigate(`/income?${queryParams.toString()}`);
    }
  }, [navigate]);

  // ── Financial health alerts ─────────────────────────────────────────────────
  // =============================================
  // 🔥 MOTOR DE ANÁLISIS FINANCIERO IA PRO
  // =============================================
  const financialAnalysisEngine = useMemo(() => {
    // ========== 📊 DATOS BASE ==========
    const now = new Date();
    const currentMonth = now.getMonth();

    // Métricas básicas

    const debtRatio = pendingStats.payable > 0 && totalIncome > 0 ? (pendingStats.payable / totalIncome) * 100 : 0;
    const liquidityRatio = totalBalance > 0 ? totalBalance / pendingStats.payable : Infinity;


    // Función para calcular tendencias (últimos 3 meses vs anteriores)
    const calculateTrend = (data: number[]) => {
      const past = data.slice(0, currentMonth + 1 - 3);
      const recent = data.slice(currentMonth + 1 - 3, currentMonth + 1);
      if (past.length === 0 || past.reduce((a, b) => a + b, 0) === 0) return 0;
      return ((recent.reduce((a, b) => a + b, 0) / past.reduce((a, b) => a + b, 0)) - 1) * 100;
    };

    const incomeTrend = calculateTrend(mIncome);
    const expenseTrend = calculateTrend(mExpense);
    const balanceTrend = calculateTrend(mBalance);

    // ========== 💰 ANÁLISIS DE INGRESOS ==========
    const incomeAnalysis = {
      total: totalIncome,
      averageMonthly: totalIncome / 12,
      growthRate: incomeTrend,
      diversification: 0, // 0-100 (0 = todo de una fuente, 100 = diversificado)
      categories: {} as Record<string, { amount: number; percentage: number }>,
      seasonality: [] as { month: string; amount: number; vsAveragePct: number }[],
    };


    // Agrupar ingresos por categoría
    const incomeByCategory: Record<string, number> = {};
    activeTx.forEach(t => {
      if (t.type === 'INCOME') {
        const cat = t.category?.name || t.category || 'Otros';
        const amount = Number(t.amount || 0) * (t.currency === 'USD' ? Number(t.exchangeRate || 1) : 1);
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amount;
      }
    });

    // Calcular diversificación (100 - % de la fuente principal)
    const incomeCategories = Object.entries(incomeByCategory);
    if (incomeCategories.length > 0) {
      const mainSourcePct = (incomeCategories[0][1] / totalIncome) * 100;
      incomeAnalysis.diversification = Math.max(0, 100 - mainSourcePct);
    }

    // Categorías de ingresos
    incomeCategories.forEach(([name, amount]) => {
      incomeAnalysis.categories[name] = {
        amount,
        percentage: (amount / totalIncome) * 100,
      };
    });

    // Estacionalidad (meses fuertes/débiles)
    mIncome.forEach((amount, i) => {
      const avgMonthly = totalIncome / 12;
      const vsAveragePct = avgMonthly > 0 ? ((amount - avgMonthly) / avgMonthly) * 100 : 0;
      incomeAnalysis.seasonality.push({
        month: MONTHS[i],
        amount,
        vsAveragePct,
      });
    });

    // ========== 💸 ANÁLISIS DE GASTOS ==========
    const expenseAnalysis = {
      total: totalExpense,
      averageMonthly: totalExpense / 12,
      growthRate: expenseTrend,
      fixedVsVariable: { fixed: 0, variable: 0, fixedPct: 0 },
      topCategories: [] as { name: string; amount: number; percentage: number; isRecurrent: boolean }[],
      savingsOpportunities: [] as { category: string; amount: number; percentage: number; potentialSavings: number }[],
    };

    // Agrupar gastos por categoría
    const expenseByCategory: Record<string, { amount: number; isRecurrent: boolean }> = {};
    activeTx.forEach(t => {
      if (t.type === 'EXPENSE') {
        const cat = t.category?.name || t.category || 'Otros';
        const amount = Number(t.amount || 0) * (t.currency === 'USD' ? Number(t.exchangeRate || 1) : 1);
        const isRecurrent =
          (t.description?.toLowerCase().includes('pago') ||
            t.description?.toLowerCase().includes('suscripción') ||
            t.description?.toLowerCase().includes('mensual') ||
            t.category?.name?.toLowerCase().includes('servicio') ||
            t.category?.name?.toLowerCase().includes('alquiler'));

        if (!expenseByCategory[cat]) {
          expenseByCategory[cat] = { amount: 0, isRecurrent: false };
        }
        expenseByCategory[cat].amount += amount;
        if (isRecurrent) expenseByCategory[cat].isRecurrent = true;
      }
    });

    // Procesar categorías de gastos
    Object.entries(expenseByCategory).forEach(([name, data]) => {
      const percentage = (data.amount / totalExpense) * 100;
      expenseAnalysis.topCategories.push({ name, amount: data.amount, percentage, isRecurrent: data.isRecurrent });

      // Identificar oportunidades de ahorro (categorías >20% no fijas)
      if (
        percentage > 20 &&
        !['Alquiler', 'Hipoteca', 'Servicios Públicos'].includes(name) &&
        !name.toLowerCase().includes("ahorro") &&
        !name.toLowerCase().includes("saving")
      ) {
        expenseAnalysis.savingsOpportunities.push({
          category: name,
          amount: data.amount,
          percentage,
          potentialSavings: data.amount * 0.15,
        });
      }
    });

    // Ordenar categorías por monto (top 5)
    expenseAnalysis.topCategories.sort((a, b) => b.amount - a.amount).slice(0, 5);

    // Gastos fijos vs variables
    let fixedExpenses = 0;
    let variableExpenses = 0;
    Object.values(expenseByCategory).forEach(cat => {
      if (cat.isRecurrent) fixedExpenses += cat.amount;
      else variableExpenses += cat.amount;
    });
    expenseAnalysis.fixedVsVariable = {
      fixed: fixedExpenses,
      variable: variableExpenses,
      fixedPct: (fixedExpenses / totalExpense) * 100,
    };

    // ========== 💳 ANÁLISIS DE DEUDAS ==========
    const debtAnalysis = {
      total: pendingStats.payable,
      totalReceivable: pendingStats.receivable,
      netDebt: pendingStats.payable - pendingStats.receivable,
      debtToIncomeRatio: debtRatio,
      debtToBalanceRatio: pendingStats.payable > 0 && totalBalance > 0 ? (pendingStats.payable / totalBalance) * 100 : 0,
      byType: { shortTerm: 0, mediumTerm: 0, longTerm: 0 },
      expired: pendingStats.urgent.filter(u => u.dueInfo.status === 'EXPIRED').length,
      dueToday: pendingStats.urgent.filter(u => u.dueInfo.status === 'TODAY').length,
      dueTomorrow: pendingStats.urgent.filter(u => u.dueInfo.status === 'TOMORROW').length,
      dueSoon: pendingStats.urgent.filter(u => u.dueInfo.status === 'FUTURE').length,
      impactOnCashFlow: pendingStats.payable > 0 && totalIncome > 0 ? (pendingStats.payable / totalIncome) * 100 : 0,
    };

    // Clasificar deudas por plazo
    pendingStats.urgent.forEach(debt => {
      const dueDate = new Date(debt.dueDate);
      const daysToDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToDue <= 0) debtAnalysis.byType.shortTerm += debt.amountSoles;
      else if (daysToDue <= 30) debtAnalysis.byType.shortTerm += debt.amountSoles;
      else if (daysToDue <= 90) debtAnalysis.byType.mediumTerm += debt.amountSoles;
      else debtAnalysis.byType.longTerm += debt.amountSoles;
    });

    // ========== 🏦 ANÁLISIS DE AHORROS ==========
    // ========== 🏦 ANÁLISIS DE AHORROS (CORREGIDO) ==========
    // 1. Buscar el monto de la categoría "Ahorro Mensual" (o similar)
    let explicitSavings = 0;
    activeTx.forEach(t => {
      if (t.type === "INCOME" && (t.category?.name?.toLowerCase().includes("ahorro") || t.category?.name?.toLowerCase().includes("saving"))) {
        explicitSavings += Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
      }
    });

    // 2. Ahorro total = Balance neto + Ahorros explícitos
    const totalSavings = totalBalance + explicitSavings;

    const savingsAnalysis = {
      total: totalSavings, // ← Ahora incluye ahorros explícitos
      savingsRate: totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0,
      emergencyFund: {
        months: totalExpense > 0 ? Math.floor(totalSavings / (totalExpense / 12)) : 0,
        amount: totalSavings,
        recommended: totalExpense * 3,
        gap: Math.max(0, (totalExpense * 3) - totalSavings),
      },
      patterns: {
        isConsistent: mBalance.filter(b => b > 0).length >= 9,
        averageMonthlySavings: totalSavings / 12,
      },
      explicitSavings, // ← Ahorros explícitos (para mostrar en el dashboard)
    };

    // ========== 💧 ANÁLISIS DE LIQUIDEZ ==========
    const liquidityAnalysis = {
      currentRatio: liquidityRatio,
      quickRatio: totalBalance > 0 && pendingStats.payable > 0 ?
        (totalBalance - (pendingStats.payable * 0.3)) / pendingStats.payable : Infinity,
      cashFlow: {
        monthly: totalIncome - totalExpense,
        projected3M: totalBalance + ((totalIncome - totalExpense) * 3),
        projected6M: totalBalance + ((totalIncome - totalExpense) * 6),
        projected12M: totalBalance + ((totalIncome - totalExpense) * 12),
      },
      riskLevel: liquidityRatio < 1 ? 'Alto' : liquidityRatio < 1.5 ? 'Moderado' : 'Bajo',
    };

    // ========== ⚠️ ANÁLISIS DE RIESGOS Y OPORTUNIDADES ==========
    const riskAnalysis = {
      critical: [] as Array<{ type: string; severity: 'high' | 'medium'; message: string; action: string; category: string }>,
      warnings: [] as Array<{ type: string; message: string; action: string; category: string }>,
      opportunities: [] as Array<{ type: string; potential: number; message: string; action: string; category: string }>,
    };

    // --- Riesgos críticos ---
    if (debtAnalysis.expired > 0) {
      const expiredAmount = pendingStats.urgent
        .filter(u => u.dueInfo.status === 'EXPIRED')
        .reduce((sum, d) => sum + d.amountSoles, 0);
      riskAnalysis.critical.push({
        type: 'Deudas Vencidas',
        severity: 'high',
        message: `Tienes ${debtAnalysis.expired} deuda(s) vencida(s) por **S/ ${fmt(expiredAmount, 0)}**.`,
        action: 'Paga inmediatamente para evitar penalidades y daño a tu historial.',
        category: 'Deudas',
      });
    }

    if (liquidityAnalysis.currentRatio < 1) {
      riskAnalysis.critical.push({
        type: 'Falta de Liquidez',
        severity: 'high',
        message: `Tu ratio de liquidez es **${liquidityAnalysis.currentRatio.toFixed(2)}**. No puedes cubrir tus deudas con tus ahorros.`,
        action: 'Genera ingresos adicionales o reduce gastos drásticamente.',
        category: 'Liquidez',
      });
    }

    if (debtAnalysis.debtToIncomeRatio > 50) {
      riskAnalysis.critical.push({
        type: 'Sobreendeudamiento',
        severity: 'high',
        message: `Tus deudas representan el **${debtAnalysis.debtToIncomeRatio.toFixed(1)}%** de tus ingresos anuales.`,
        action: 'Prioriza pagar deudas antes de asumir nuevos compromisos.',
        category: 'Deudas',
      });
    }

    if (savingsAnalysis.emergencyFund.months < 1) {
      riskAnalysis.critical.push({
        type: 'Sin Fondo de Emergencia',
        severity: 'high',
        message: `Solo tienes **${savingsAnalysis.emergencyFund.months} mes(es)** de gastos cubiertos.`,
        action: 'Destina al menos el 10% de tus ingresos a construir este fondo.',
        category: 'Ahorro',
      });
    }

    // --- Advertencias ---
    if (debtAnalysis.dueToday > 0) {
      const todayAmount = pendingStats.urgent
        .filter(u => u.dueInfo.status === 'TODAY')
        .reduce((sum, d) => sum + d.amountSoles, 0);
      riskAnalysis.warnings.push({
        type: 'Pagos para Hoy',
        message: `Tienes **${debtAnalysis.dueToday} pago(s)** que vencen hoy por **S/ ${fmt(todayAmount, 0)}**.`,
        action: 'Realiza estos pagos para mantener tu historial limpio.',
        category: 'Deudas',
      });
    }

    if (savingsAnalysis.savingsRate < 10) {
      riskAnalysis.warnings.push({
        type: 'Baja Tasa de Ahorro',
        message: `Solo ahorras el **${savingsAnalysis.savingsRate.toFixed(1)}%** de tus ingresos.`,
        action: 'Intenta aumentar tu tasa de ahorro al menos al 15%.',
        category: 'Ahorro',
      });
    }

    if (incomeAnalysis.diversification < 50) {
      riskAnalysis.warnings.push({
        type: 'Dependencia de Ingresos',
        message: `El **${(100 - incomeAnalysis.diversification).toFixed(0)}%** de tus ingresos proviene de una sola fuente.`,
        action: 'Diversifica tus fuentes de ingresos para reducir el riesgo.',
        category: 'Ingresos',
      });
    }

    if (expenseAnalysis.growthRate > 10) {
      riskAnalysis.warnings.push({
        type: 'Gastos en Crecimiento',
        message: `Tus gastos han crecido un **${expenseAnalysis.growthRate.toFixed(1)}%** en los últimos meses.`,
        action: 'Revisa qué categorías están creciendo y por qué.',
        category: 'Gastos',
      });
    }

    // --- Oportunidades ---
    expenseAnalysis.savingsOpportunities.forEach(opp => {
      riskAnalysis.opportunities.push({
        type: `Ahorro en ${opp.category}`,
        message: `Ahorro en ${opp.category}`,
        potential: opp.potentialSavings,
        action: `Podrías ahorrar **S/ ${fmt(opp.potentialSavings, 0)}** (15%) optimizando ${opp.category}.`,
        category: 'Gastos',
      });
    });

    if (pendingStats.receivable > 0) {
      riskAnalysis.opportunities.push({
        type: 'Cobranza',
        message: 'Cobranza',  // <-- ✅ AÑADIR ESTO
        potential: pendingStats.receivable,
        action: `Tienes **S/ ${fmt(pendingStats.receivable, 0)}** por cobrar. Implementa un proceso de cobranza efectivo.`,
        category: 'Ingresos',
      });
    }

    if (debtAnalysis.netDebt < 0) {
      riskAnalysis.opportunities.push({
        type: 'Superávit',
        message: 'Superávit',  // <-- ✅ AÑADIR ESTO
        potential: Math.abs(debtAnalysis.netDebt),
        action: `Tienes más por cobrar (**S/ ${fmt(pendingStats.receivable, 0)}**) que por pagar (**S/ ${fmt(pendingStats.payable, 0)}**). Usa este superávit para invertir o pagar deudas.`,
        category: 'Balance',
      });
    }

    // ========== 📈 SCORE FINANCIERO (0-100) ==========
    let score = 50; // Base

    // Ahorro (20 puntos)
    if (savingsAnalysis.savingsRate >= 30) score += 20;
    else if (savingsAnalysis.savingsRate >= 20) score += 15;
    else if (savingsAnalysis.savingsRate >= 10) score += 10;
    else if (savingsAnalysis.savingsRate > 0) score += 5;
    else score -= 10;

    // Deuda (20 puntos)
    if (debtAnalysis.total === 0) score += 20;
    else if (debtAnalysis.debtToIncomeRatio <= 20) score += 15;
    else if (debtAnalysis.debtToIncomeRatio <= 40) score += 10;
    else if (debtAnalysis.debtToIncomeRatio <= 60) score += 5;
    else score -= 10;

    // Liquidez (15 puntos)
    if (liquidityAnalysis.currentRatio >= 1.5) score += 15;
    else if (liquidityAnalysis.currentRatio >= 1) score += 10;
    else if (liquidityAnalysis.currentRatio >= 0.5) score += 5;
    else score -= 10;

    // Fondo de emergencia (15 puntos)
    if (savingsAnalysis.emergencyFund.months >= 6) score += 15;
    else if (savingsAnalysis.emergencyFund.months >= 3) score += 10;
    else if (savingsAnalysis.emergencyFund.months >= 1) score += 5;
    else score -= 5;

    // Tendencias (15 puntos) - VERSIÓN OPTIMIZADA CON balanceTrend
    if (balanceTrend > 5) score += 15;          // Balance crece fuerte → Máximo puntaje
    else if (balanceTrend > 0) score += 12;     // Balance crece → Buen puntaje
    else if (balanceTrend > -5) score += 8;    // Balance estable/leve caída → Puntaje medio
    else if (incomeTrend > 0 && expenseTrend < 0) score += 10;  // Ingresos ↑, Gastos ↓ (aunque balance no suba)
    else if (incomeTrend > 0) score += 5;      // Solo ingresos ↑
    else if (expenseTrend < 0) score += 5;     // Solo gastos ↓
    else score -= 5;                           // Balance cae fuerte o ingresos ↓ + gastos ↑

    // Diversificación (10 puntos)
    if (incomeAnalysis.diversification >= 70) score += 10;
    else if (incomeAnalysis.diversification >= 50) score += 7;
    else if (incomeAnalysis.diversification >= 30) score += 5;
    else score -= 5;

    // Gastos recurrentes (5 puntos)
    if (expenseAnalysis.fixedVsVariable.fixedPct < 50) score += 5;
    else if (expenseAnalysis.fixedVsVariable.fixedPct < 70) score += 3;
    else score -= 2;

    score = Math.max(0, Math.min(100, Math.round(score)));

    // ========== 🎯 DIAGNÓSTICO GENERAL ==========
    const getDiagnosis = () => {
      if (score >= 85) return {
        text: '¡Excelente salud financiera! Estás manejando tu dinero como un experto.',
        color: 'emerald',
        icon: <TrendUp className="w-5 h-5" />,
        emoji: '🌟'
      };
      if (score >= 70) return {
        text: balanceTrend > 0
          ? 'Buena salud financiera. Tu balance está creciendo.'
          : 'Buena salud financiera, pero tu balance no está creciendo.',
        color: 'emerald',
        icon: <CheckCircle className="w-5 h-5" />,
        emoji: '✅'
      };
      if (score >= 50) {
        if (balanceTrend < -5) {
          return {
            text: '¡Atención! Tu balance está cayendo rápidamente. Revisa gastos e ingresos urgentemente.',
            color: 'rose',
            icon: <ShieldAlert className="w-5 h-5" />,
            emoji: '🚨'
          };
        }
        return {
          text: 'Salud financiera regular. Necesitas tomar acción en varias áreas para mejorar.',
          color: 'amber',
          icon: <AlertTriangle className="w-5 h-5" />,
          emoji: '⚠️'
        };
      }
      return {
        text: balanceTrend < 0
          ? '¡Peligro! Tu balance está en caída. Necesitas acción inmediata.'
          : 'Tu salud financiera requiere mejora.',
        color: 'rose',
        icon: <ShieldAlert className="w-5 h-5" />,
        emoji: '🚨'
      };
    };

    const diagnosis = getDiagnosis();

    // ========== 📋 RECOMENDACIONES PRIORIZADAS ==========
    // ✅ SOLUCIÓN: Normalización de recomendaciones (línea ~600)
    const recommendations = [
      // Críticos (con params y module definidos)
      ...riskAnalysis.critical.map(r => ({
        ...r,
        priority: 1,
        potential: 0,
        type: r.type,          // ✅ Usar r.type (no r.category)
        params: {},      // ✅ Añadido
        module: undefined,      // ✅ Añadido
      })),
      // Advertencias
      ...riskAnalysis.warnings.map(r => ({
        ...r,
        priority: 2,
        potential: 0,
        type: r.type,          // ✅ Usar r.type
        params: {},      // ✅ Añadido
        module: undefined,      // ✅ Añadido
      })),
      // Ahorro
      {
        type: 'Ahorro',
        message: `Aumenta tu tasa de ahorro al ${Math.min(30, Math.ceil(savingsAnalysis.savingsRate + 5))}%.`,
        action: `Destina un ${Math.min(30, Math.ceil(savingsAnalysis.savingsRate + 5))}% de tus ingresos a ahorro.`,
        category: 'Ahorro',
        priority: 3,
        severity: 'medium',
        potential: 0,
        params: {},      // ✅ Añadido
        module: undefined,      // ✅ Añadido
      },
      // Ingresos
      {
        type: 'Ingresos',
        message: `El ${(100 - incomeAnalysis.diversification).toFixed(0)}% de tus ingresos depende de una fuente.`,
        action: 'Busca fuentes adicionales de ingresos (freelance, inversiones, etc.).',
        category: 'Ingresos',
        priority: 3,
        severity: 'medium',
        potential: 0,
        params: {},      // ✅ Añadido
        module: undefined,      // ✅ Añadido
      },
      // Balance (si aplica)
      ...(balanceTrend < 0 ? [{
        type: 'Balance',
        message: `Tu balance neto ha caído un ${Math.abs(balanceTrend).toFixed(1)}% en los últimos meses.`,
        action: 'Revisa tus gastos recurrentes e identifica qué está causando esta tendencia negativa.',
        category: 'Balance',
        priority: balanceTrend < -5 ? 1 : 2,
        severity: 'high',
        potential: 0,
        params: {},      // ✅ Añadido
        module: undefined,      // ✅ Añadido
      }] : []),
      // Oportunidades
      ...riskAnalysis.opportunities.map(o => ({
        ...o,
        priority: 4,
        severity: 'low',
        type: o.type,            // ✅ Usar o.type (no o.category)
        params: {},      // ✅ Añadido
        module: undefined,      // ✅ Añadido
      })),
    ].sort((a, b) => a.priority - b.priority);
    // ========== 🔮 PROYECCIONES ==========
    const projections = [
      {
        title: 'Balance en 3 meses',
        value: liquidityAnalysis.cashFlow.projected3M,
        type: liquidityAnalysis.cashFlow.projected3M > totalBalance ? 'positive' : 'negative',
        change: liquidityAnalysis.cashFlow.projected3M - totalBalance,
        changePct: ((liquidityAnalysis.cashFlow.projected3M - totalBalance) / totalBalance) * 100,
        unit: "",
      },
      {
        title: 'Balance en 6 meses',
        value: liquidityAnalysis.cashFlow.projected6M,
        type: liquidityAnalysis.cashFlow.projected6M > totalBalance ? 'positive' : 'negative',
        change: liquidityAnalysis.cashFlow.projected6M - totalBalance,
        changePct: ((liquidityAnalysis.cashFlow.projected6M - totalBalance) / totalBalance) * 100,
        unit: "",
      },
      {
        title: 'Balance en 12 meses',
        value: liquidityAnalysis.cashFlow.projected12M,
        type: liquidityAnalysis.cashFlow.projected12M > totalBalance ? 'positive' : 'negative',
        change: liquidityAnalysis.cashFlow.projected12M - totalBalance,
        changePct: ((liquidityAnalysis.cashFlow.projected12M - totalBalance) / totalBalance) * 100,
        unit: "",
      },
    ];

    if (debtAnalysis.total > 0 && liquidityAnalysis.cashFlow.monthly > 0) {
      const monthsToPayDebt = Math.ceil(debtAnalysis.total / liquidityAnalysis.cashFlow.monthly);
      projections.push({
        title: 'Tiempo para pagar deudas',
        value: monthsToPayDebt,
        type: monthsToPayDebt <= 12 ? 'positive' : monthsToPayDebt <= 24 ? 'neutral' : 'negative',
        change: 0,
        changePct: 0,
        unit: 'meses',
      });
    }

    if (savingsAnalysis.emergencyFund.gap > 0) {
      const monthsToSave = Math.ceil(savingsAnalysis.emergencyFund.gap / liquidityAnalysis.cashFlow.monthly);
      projections.push({
        title: 'Tiempo para fondo de emergencia (3 meses)',
        value: monthsToSave,
        type: 'neutral',
        change: 0,
        changePct: 0,
        unit: 'meses',
      });
    }


    // ========== 📊 RESUMEN EJECUTIVO ==========
    return {
      score,
      diagnosis,
      balanceTrend,
      incomeAnalysis,
      expenseAnalysis,
      debtAnalysis,
      savingsAnalysis,
      liquidityAnalysis,
      riskAnalysis,
      recommendations,
      projections,
      // Métricas clave para el dashboard
      keyMetrics: [
        { label: 'Tasa de Ahorro', value: `${savingsAnalysis.savingsRate.toFixed(1)}%`, color: savingsAnalysis.savingsRate >= 20 ? 'emerald' : 'amber' },
        { label: 'Ratio Deuda/Ingresos', value: `${debtAnalysis.debtToIncomeRatio.toFixed(1)}%`, color: debtAnalysis.debtToIncomeRatio <= 20 ? 'emerald' : debtAnalysis.debtToIncomeRatio <= 40 ? 'amber' : 'rose' },
        { label: 'Liquidez', value: liquidityAnalysis.currentRatio.toFixed(2), color: liquidityAnalysis.currentRatio >= 1 ? 'emerald' : 'rose' },
        { label: 'Fondo Emergencia', value: `${savingsAnalysis.emergencyFund.months} meses`, color: savingsAnalysis.emergencyFund.months >= 3 ? 'emerald' : 'amber' },
        { label: 'Tendencia Ingresos', value: `${incomeTrend > 0 ? '+' : ''}${incomeTrend.toFixed(1)}%`, color: incomeTrend > 0 ? 'emerald' : incomeTrend < 0 ? 'rose' : 'amber' },
        { label: 'Tendencia Gastos', value: `${expenseTrend > 0 ? '+' : ''}${expenseTrend.toFixed(1)}%`, color: expenseTrend < 0 ? 'emerald' : expenseTrend > 0 ? 'rose' : 'amber' },
        // ✅ AÑADIR ESTA LÍNEA:
        { label: 'Tendencia Balance', value: `${balanceTrend > 0 ? '+' : ''}${balanceTrend.toFixed(1)}%`, color: balanceTrend > 0 ? 'emerald' : balanceTrend < 0 ? 'rose' : 'amber' },
      ],
      // Datos para el header del componente
      netWorth: totalBalance + pendingStats.receivable - pendingStats.payable,
      totalDebt: debtAnalysis.total,
      totalReceivable: debtAnalysis.totalReceivable,
    };
  }, [activeTx, totalIncome, totalBalance, totalExpense, pendingStats, mIncome, mExpense, mBalance]);

  // ── Month drilldown transactions ────────────────────────────────────────────
  const drillTx = useMemo(() => {
    if (selectedMonth === null) return [];
    return activeTx
      .filter(t => {
        const raw = (t.status === "PENDING" || t.status === undefined) ? (t.dueDate || t.date) : (t.paidAt || t.date);
        const d = parseSafeDate(raw);
        return !isNaN(d.getTime()) && d.getMonth() === selectedMonth;
      })
      .map(t => ({ ...t, amtSoles: Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1) }))
      .sort((a, b) => b.amtSoles - a.amtSoles)
      .slice(0, 8);
  }, [activeTx, selectedMonth]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmtVal = (v: number) => (showValues ? `S/ ${fmt(v)}` : "••••••");
  const toggleCat = (k: string) => setExpandedCats(p => ({ ...p, [k]: !p[k] }));
  const expandAll = () => {
    const s: Record<string, boolean> = { Ingresos: true };
    expenseRows.forEach((_, i) => { s[`exp-${i}`] = true; });
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
            <p className="text-sm text-gray-400 mt-1 font-semibold">Sincronizando datos financieros...</p>
          </div>
        </div>
      </Appshell>
    );
  }


  // Componente para renderizar una recomendación
  const RecommendationItem = ({
    rec,
    idx,
    onClick,
    children
  }: {
    rec: Recommendation;
    idx: number;
    onClick: (category: string, type: string, categoryId?: string, subCategoryId?: string, module?: string, tab?: string) => void;
    children?: React.ReactNode;
  }) => {
    const priorityConfig = {
      1: { bg: 'bg-rose-50/80 border-rose-100', icon: <ShieldAlert className="w-4 h-4 text-rose-500" />, text: 'text-rose-900', label: 'URGENTE' },
      2: { bg: 'bg-amber-50/80 border-amber-100', icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, text: 'text-amber-900', label: 'ALTA' },
      3: { bg: 'bg-indigo-50/80 border-indigo-100', icon: <Info className="w-4 h-4 text-indigo-500" />, text: 'text-indigo-900', label: 'MEDIA' },
      4: { bg: 'bg-emerald-50/80 border-emerald-100', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, text: 'text-emerald-900', label: 'OPORTUNIDAD' },
    };

    const config = priorityConfig[rec.priority as keyof typeof priorityConfig] || priorityConfig[3];
    const borderColor = rec.priority === 1 ? '#f43f5e' : rec.priority === 2 ? '#f59e0b' : rec.priority === 3 ? '#6366f1' : '#10b981';

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.1 }}
        whileHover={{ scale: 1.02, x: 5 }}
        className={`flex gap-3 p-3.5 rounded-2xl border border-l-4 ${config.bg} cursor-pointer`}
        style={{ borderLeftColor: borderColor }}
        onClick={() => onClick(
          rec.category,
          rec.type,
          rec.params?.categoryId,
          rec.params?.subCategoryId,
          rec.module,
          rec.params?.tab
        )}
      >
        {children}
        {/* ⬇️ COPIA ESTO AQUÍ (reemplaza el comentario) ⬇️ */}
        <>
          <motion.div whileHover={{ scale: 1.2 }}>
            {rec.priority === 1 ? <ShieldAlert className="w-4 h-4 text-rose-500" /> :
              rec.priority === 2 ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                rec.priority === 3 ? <Info className="w-4 h-4 text-indigo-500" /> :
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-[10px] font-black ${rec.priority === 1 ? 'text-rose-900' :
                rec.priority === 2 ? 'text-amber-900' :
                  rec.priority === 3 ? 'text-indigo-900' :
                    'text-emerald-900'
                }`}>
                {rec.type}
              </p>
              {rec.priority <= 2 && (
                <span className={`text-[8px] ${rec.priority === 1 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  } px-1.5 py-0.5 rounded font-bold animate-pulse`}>
                  {rec.priority === 1 ? 'URGENTE' : 'ALTA'}
                </span>
              )}
              {rec.priority === 4 && (
                <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold">💰 OPORTUNIDAD</span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed truncate">{rec.message}</p>
            <p className="text-[9px] text-indigo-600 mt-1 font-semibold truncate">→ {rec.action}</p>
            {'potential' in rec && rec.potential > 0 && (
              <p className="text-[9px] text-emerald-600 mt-1 font-bold">
                Potencial: +S/ {fmt(rec.potential, 0)}
              </p>
            )}
            <p className="text-[8px] text-gray-400 mt-1 font-semibold">
              Categoría: <span className="text-indigo-600">{rec.category}</span>
            </p>
          </div>
        </>
        {/* ⬆️ HASTA AQUÍ ⬆️ */}
      </motion.div>
    );
  };
  // AGREGA ESTOS ESTADOS AL INICIO DEL COMPONENTE DashboardPage (después de los estados existentes):




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
                  backgroundColor: ["#10B981", "#6366F1", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#06B6D4"][Math.floor(Math.random() * 7)],
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
                {[{ label: "Real", val: false }, { label: "Proyectado", val: true }].map(opt => (
                  <button
                    key={String(opt.val)}
                    onClick={() => setIsProjectedMode(opt.val)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${isProjectedMode === opt.val
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
                onClick={() => setShowValues(v => !v)}
                className="p-2.5 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                title={showValues ? "Ocultar montos" : "Mostrar montos"}
              >
                {showValues ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>

              {/* Refresh */}
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-2xl font-black hover:bg-indigo-100 transition-all text-sm border border-indigo-100 disabled:opacity-50"
              >
                <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              {/* PWA Install */}
              {canInstall && (
                <button
                  onClick={async () => {
                    deferredPrompt?.prompt();
                    await deferredPrompt?.userChoice;
                    setDeferredPrompt(null); setCanInstall(false);
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Income */}
          <KPICard
            label={isProjectedMode ? "Ingresos Proyectados" : "Ingresos Totales"}
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
            label={isProjectedMode ? "Ahorro Proyectado" : "Ahorro Neto"}
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
                    <h2 className="text-base font-black text-gray-800">Comparativa Mensual</h2>
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
                      ) : isProjectedMode ? "Flujo Proyectado · Reales + Pendientes" : "Flujo Real Acumulado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Legend */}
                  <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" /> Ingresos
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 bg-rose-400 rounded-full" /> Egresos
                    </span>
                  </div>
                  {/* Compact toggle */}
                  <button
                    onClick={() => setCompactChart(c => !c)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-100 transition-all"
                    title={compactChart ? "Expandir gráfico" : "Compactar gráfico"}
                  >
                    {compactChart ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Chart area */}
              <div className="p-6 pt-4">
                <div className="overflow-x-auto scrollbar-hide">
                  <div className={`relative min-w-[560px] transition-all duration-500 ${compactChart ? "h-44" : "h-64"}`}>
                    {/* Y-axis grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      {[1, 0.75, 0.5, 0.25, 0].map(p => (
                        <div key={p} className="flex items-center gap-3">
                          <span className="text-[9px] font-black text-gray-300 w-14 text-right shrink-0">
                            {(maxMonthVal * p).toLocaleString("es-PE", { maximumFractionDigits: 0 })}
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
                              <div className={`text-white p-3 rounded-2xl shadow-2xl border text-xs w-40 ${isSel ? "bg-indigo-900/95 border-indigo-700/40" : "bg-gray-900/95 border-white/10"}`}>
                                <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl ${isPos ? "bg-emerald-400" : "bg-rose-400"}`} />
                                <p className="font-black uppercase tracking-widest text-[9px] text-gray-300 mb-1.5">{mo} {YEAR}</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between"><span className="text-gray-400">Ing:</span><span className="font-black text-emerald-400">S/{mIncome[i].toLocaleString("es-PE", { maximumFractionDigits: 0 })}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-400">Egr:</span><span className="font-black text-rose-400">S/{mExpense[i].toLocaleString("es-PE", { maximumFractionDigits: 0 })}</span></div>
                                  <div className="flex justify-between pt-1 border-t border-white/10 mt-1">
                                    <span className="text-white font-black">Neto:</span>
                                    <span className={`font-black ${isPos ? "text-emerald-400" : "text-rose-400"}`}>S/{mBalance[i].toLocaleString("es-PE", { maximumFractionDigits: 0 })}</span>
                                  </div>
                                </div>
                                <p className="text-[8px] text-center mt-1.5 text-indigo-300 font-bold">{isSel ? "✕ Clic para limpiar" : "Clic para ver detalle"}</p>
                              </div>
                              <div className="w-2.5 h-2.5 bg-gray-900 rotate-45 mx-auto -mt-1.5" />
                            </div>

                            {/* Selection ring */}
                            {isSel && <div className="absolute inset-x-0 top-0 bottom-6 rounded-2xl border-2 border-indigo-400/50 bg-indigo-50/30 glow-ring" />}

                            {/* Bar group */}
                            <div className="flex items-end gap-0.5 w-full h-full">
                              <div
                                className={`flex-1 rounded-t-lg transition-all duration-700 relative overflow-hidden ${isSel ? "bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                                  : hasData ? "bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover/bar:shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                                    : "bg-gray-100"
                                  }`}
                                style={{ height: `${Math.max(iH, hasData ? 3 : 1)}%` }}
                              >
                                <div className="absolute inset-0 shimmer-bar" />
                              </div>
                              <div
                                className={`flex-1 rounded-t-lg transition-all duration-700 delay-75 relative overflow-hidden ${isSel ? "bg-gradient-to-t from-violet-600 to-violet-400"
                                  : hasData ? "bg-gradient-to-t from-rose-500 to-rose-300 group-hover/bar:shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                                    : "bg-gray-50"
                                  }`}
                                style={{ height: `${Math.max(eH, hasData ? 3 : 1)}%` }}
                              >
                                <div className="absolute inset-0 shimmer-bar" />
                              </div>
                            </div>

                            {/* Label */}
                            <div className="h-6 flex flex-col items-center justify-center mt-0.5 shrink-0">
                              <span className={`text-[9px] font-black tracking-tight ${isSel ? "text-indigo-600" : isPos ? "text-emerald-600" : "text-rose-500"}`}>{mo}</span>
                              {isSel && <div className="w-1 h-1 bg-indigo-500 rounded-full mt-0.5" />}
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
                        <span className="text-emerald-600">+S/{mIncome[selectedMonth].toLocaleString("es-PE", { maximumFractionDigits: 0 })}</span>
                        <span className="text-gray-200">|</span>
                        <span className="text-rose-500">-S/{mExpense[selectedMonth].toLocaleString("es-PE", { maximumFractionDigits: 0 })}</span>
                        <span className={`px-2 py-0.5 rounded-lg font-black text-xs ${mBalance[selectedMonth] >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          Neto: S/{Math.abs(mBalance[selectedMonth]).toLocaleString("es-PE", { maximumFractionDigits: 0 })}
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
                            <div key={`drill-${idx}`} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all hover:scale-[1.01] hover:shadow-sm ${isInc ? "bg-emerald-50/60 border-emerald-100" : "bg-rose-50/60 border-rose-100"}`}>
                              <div className={`p-2 rounded-xl shrink-0 ${isInc ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"}`}>
                                {isInc ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-gray-800 truncate">{t.description || t.name || "Transacción"}</p>
                                <p className="text-[9px] text-gray-400 font-semibold truncate">{t.category?.name || t.category || "Otros"}</p>
                              </div>
                              <span className={`text-sm font-black shrink-0 ${isInc ? "text-emerald-600" : "text-rose-500"}`}>
                                S/{t.amtSoles.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
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
              ref={tableRef}  // 👈 Añade esto
              className="bg-white rounded-3xl border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200/40">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-gray-800">Estructura Detallada por Meses</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                      {selectedMonth !== null ? `Mostrando todo el año · Mes activo: ${MONTHS[selectedMonth]}` : "Desliza horizontalmente para navegar"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={expandAll} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all border border-indigo-100">
                    Expandir
                  </button>
                  <button onClick={collapseAll} className="px-3 py-1.5 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-gray-100 transition-all">
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
                          onClick={() => setSelectedMonth(selectedMonth === i ? null : i)}
                          className={`p-3 text-center text-[9px] font-black uppercase tracking-widest border-r border-gray-50 w-20 cursor-pointer transition-all ${selectedMonth === i ? "text-indigo-600 bg-indigo-50/60" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                          {m}
                          {selectedMonth === i && <div className="w-1 h-1 bg-indigo-500 rounded-full mx-auto mt-0.5" />}
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
                        <td key={i} className={`p-3 text-center font-black text-white/90 text-[10px] border-r border-white/10 ${selectedMonth === i ? "bg-black/10" : "hover:bg-black/5"} transition-colors`}>
                          {showValues ? (v > 0 ? v.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "-") : "••"}
                        </td>
                      ))}
                      <td className="p-3 text-right font-black bg-emerald-700 text-white text-xs">
                        {showValues ? `S/${totalIncome.toLocaleString("es-PE", { maximumFractionDigits: 0 })}` : "••••"}
                      </td>
                    </tr>
                    {incomeRows.map((row, i) => {
                      const rowTotal = row.values.reduce((a, b) => a + b, 0);
                      return (
                        <tr key={`ir-${i}`} className="border-b border-gray-50 hover:bg-emerald-50/20 transition-colors group">
                          <td className="sticky left-0 bg-white/95 group-hover:bg-emerald-50/10 z-10 p-2.5 pl-10 border-r border-gray-100 text-gray-600 font-bold text-[10px] shadow-[4px_0_8px_rgba(0,0,0,0.03)] flex items-center gap-2 overflow-hidden">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" />
                            <span className="truncate">{row.name}</span>
                          </td>
                          {row.values.map((v, j) => (
                            <td key={j} className={`p-2.5 text-center text-gray-600 font-semibold text-[10px] border-r border-gray-50 ${selectedMonth === j ? "bg-indigo-50/30 font-black" : ""}`}>
                              {showValues ? (v > 0 ? v.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "-") : "••"}
                            </td>
                          ))}
                          <td className="p-2.5 text-right font-black text-emerald-700 text-[10px] bg-emerald-50/20">
                            {showValues ? rowTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "••"}
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
                        <td key={i} className={`p-3 text-center font-black text-white/90 text-[10px] border-r border-white/10 ${selectedMonth === i ? "bg-black/10" : "hover:bg-black/5"} transition-colors`}>
                          {showValues ? (v > 0 ? v.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "-") : "••"}
                        </td>
                      ))}
                      <td className="p-3 text-right font-black bg-purple-700 text-white text-xs">
                        {showValues ? `S/${totalExpense.toLocaleString("es-PE", { maximumFractionDigits: 0 })}` : "••••"}
                      </td>
                    </tr>
                    {expenseRows.map((cat, i) => {
                      const catTotals = Array(12).fill(0);
                      cat.subcategories.forEach(s => s.values.forEach((v, j) => { catTotals[j] += v; }));
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
                                {isExp ? <ChevronDown className="w-3.5 h-3.5 text-purple-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                                <span className="truncate">{cat.category}</span>
                              </div>
                            </td>
                            {catTotals.map((v, j) => (
                              <td key={j} className={`p-2.5 text-center text-[10px] font-black border-r border-gray-50 ${v > 0 ? "text-gray-800" : "text-gray-300"} ${selectedMonth === j ? "bg-indigo-50/30" : ""}`}>
                                {showValues ? (v > 0 ? v.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "-") : "••"}
                              </td>
                            ))}
                            <td className="p-2.5 text-right font-black text-purple-600 text-[10px] bg-purple-50/10">
                              {showValues ? catTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "••"}
                            </td>
                          </tr>
                          {isExp && cat.subcategories.map((sub, j) => {
                            const subTotal = sub.values.reduce((a, b) => a + b, 0);
                            return (
                              <tr key={`es-${i}-${j}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="sticky left-0 bg-gray-50/80 z-10 p-2 pl-12 border-r border-gray-100 text-gray-500 font-semibold text-[9px] shadow-[4px_0_8px_rgba(0,0,0,0.02)] flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-purple-300 rounded-full shrink-0" />
                                  <span className="truncate">{sub.name}</span>
                                </td>
                                {sub.values.map((v, k) => (
                                  <td key={k} className={`p-2 text-center text-gray-500 text-[9px] font-medium border-r border-gray-50 ${selectedMonth === k ? "bg-indigo-50/30" : ""}`}>
                                    {showValues ? (v > 0 ? v.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "-") : "••"}
                                  </td>
                                ))}
                                <td className="p-2 text-right font-black text-purple-500 text-[9px] bg-purple-50/5">
                                  {showValues ? subTotal.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "••"}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}

                    {/* Net Balance row */}
                    <tr className={`border-t-4 border-white ${totalBalance >= 0 ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600" : "bg-gradient-to-r from-rose-600 via-pink-600 to-orange-600"} text-white`}>
                      <td className={`sticky left-0 z-20 p-4 pl-6 font-black uppercase tracking-widest text-[10px] border-r border-white/20 shadow-[6px_0_20px_rgba(0,0,0,0.3)] ${totalBalance >= 0 ? "bg-emerald-600" : "bg-rose-600"} flex items-center gap-2`}>
                        <Wallet className="w-4 h-4" /> BALANCE NETO
                      </td>
                      {mBalance.map((b, i) => (
                        <td key={i} className={`p-4 text-center font-black text-[10px] border-r border-white/10 ${selectedMonth === i ? "bg-white/20" : b >= 0 ? "bg-white/5" : "bg-black/10"}`}>
                          {showValues ? b.toLocaleString("es-PE", { maximumFractionDigits: 0 }) : "••"}
                        </td>
                      ))}
                      <td className={`p-4 text-right font-black text-base ${totalBalance >= 0 ? "bg-emerald-700/50" : "bg-rose-700/50"}`}>
                        {showValues ? `S/${totalBalance.toLocaleString("es-PE", { minimumFractionDigits: 0 })}` : "••••"}
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
          <div className={shouldStackModules ? "xl:col-span-3" : "xl:col-span-1"}>
            <div className="flex flex-col gap-5">

              {/* Financial Health Advisor */}
              {/* ============================================= */}
              {/* 🔥 ASESOR FINANCIERO IA PRO (NUEVA VERSIÓN) */}
              {/* ============================================= */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl p-5 relative overflow-hidden min-w-[300px] w-full">
                {/* --- Efectos de fondo --- */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400/20 rounded-full blur-3xl" />
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-gradient-to-br from-emerald-400 to-teal-400/20 rounded-full blur-3xl" />

                {/* --- Header con logo y título --- */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between mb-6 relative z-10"
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="p-3 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-xl shadow-indigo-200/50 relative overflow-hidden"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Sparkles className="w-6 h-6 text-white relative z-10" />
                      <div className="absolute inset-0 bg-white/20 rounded-2xl" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-700">
                        Asesor Financiero IA
                      </h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                        Análisis Inteligente en Tiempo Real
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* --- Pestañas con iconos y animación --- */}
                <div className="flex gap-1.5 bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100 mb-5 relative z-10">
                  {[
                    { id: 'resumen' as const, label: 'Resumen', icon: <TrendingUp className="w-4 h-4" /> },
                    { id: 'analisis' as const, label: 'Análisis', icon: <BarChart3 className="w-4 h-4" /> },
                    { id: 'recomendaciones' as const, label: 'Recomend.', icon: <Zap className="w-4 h-4" /> },
                    { id: 'proyecciones' as const, label: 'Proyecc.', icon: <Clock className="w-4 h-4" /> },
                  ].map((tab) => {
                    const isActive = activeAITab === tab.id; // ✅ Ahora tab.id es del tipo correcto
                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => setActiveAITab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all relative overflow-hidden
            ${isActive
                            ? 'bg-white text-indigo-600 shadow-md'
                            : 'text-gray-500 hover:bg-white/50 hover:text-indigo-600'
                          }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-10"
                            initial={{ x: -100 }}
                            animate={{ x: 0 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          />
                        )}
                        <span className="relative z-10">{tab.icon}</span>
                        <span className="relative z-10">{tab.label}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* --- Contenido con animación de transición --- */}
                <div className="relative z-10 h-[350px] overflow-y-auto scrollbar-premium pr-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeAITab}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      className="space-y-3"
                    >
                      {/* ========== 📊 RESUMEN ========== */}
                      {activeAITab === 'resumen' && (
                        <div className="space-y-4">
                          {/* Score con animación */}
                          <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="relative p-1 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100/50 overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/10 to-purple-400/10" />
                            <div className="relative p-5 bg-white/90 backdrop-blur-sm rounded-2xl">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Puntuación Financiera</p>
                                  <div className="flex items-end gap-2 mt-1">
                                    <motion.p
                                      className="text-5xl font-black text-gray-900"
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.2 }}
                                    >
                                      {financialAnalysisEngine.score}
                                    </motion.p>
                                    <span className="text-2xl text-gray-500 mb-1">/100</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <motion.div
                                    className="flex items-center gap-2 justify-end"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 }}
                                  >
                                    <div className={`p-2.5 rounded-xl ${financialAnalysisEngine.diagnosis.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' :
                                      financialAnalysisEngine.diagnosis.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                                        'bg-rose-100 text-rose-600'}`}>
                                      {financialAnalysisEngine.diagnosis.icon}
                                    </div>
                                  </motion.div>
                                  <motion.p
                                    className="text-sm font-black mt-1 text-gray-800"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                  >
                                    {financialAnalysisEngine.diagnosis.emoji} {financialAnalysisEngine.diagnosis.text}
                                  </motion.p>
                                </div>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                  className={`h-full bg-gradient-to-r ${financialAnalysisEngine.score >= 80 ? 'from-emerald-500 to-teal-500' :
                                    financialAnalysisEngine.score >= 60 ? 'from-indigo-500 to-purple-500' :
                                      financialAnalysisEngine.score >= 40 ? 'from-amber-500 to-orange-500' :
                                        'from-rose-500 to-pink-500'} rounded-full`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${financialAnalysisEngine.score}%` }}
                                  transition={{ duration: 1.5, ease: 'easeOut' }}
                                />
                              </div>
                              <p className="text-[9px] text-gray-400 font-bold mt-2 text-center">
                                {financialAnalysisEngine.score >= 80 ? '¡Excelente! Mantén el ritmo.' :
                                  financialAnalysisEngine.score >= 60 ? 'Buen trabajo. Sigue mejorando.' :
                                    financialAnalysisEngine.score >= 40 ? 'Necesitas tomar acción.' : '¡Urgentemente! Revisa tu situación.'}
                              </p>
                            </div>
                          </motion.div>

                          {/* Métricas clave */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="grid grid-cols-3 gap-2"
                          >
                            {financialAnalysisEngine.keyMetrics.map((metric, idx) => {
                              const colors = {
                                emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                                amber: 'bg-amber-50 text-amber-700 border-amber-100',
                                rose: 'bg-rose-50 text-rose-700 border-rose-100',
                              };
                              return (
                                <motion.div
                                  key={idx}
                                  whileHover={{ scale: 1.05, y: -2 }}
                                  className={`p-2.5 rounded-2xl border ${colors[metric.color as keyof typeof colors]} transition-all`}
                                >
                                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{metric.label}</p>
                                  <p className="text-sm font-black text-gray-800 mt-1">{metric.value}</p>
                                </motion.div>
                              );
                            })}
                          </motion.div>

                          {/* Resumen financiero rápido */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100"
                          >
                            <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Deuda Total</p>
                              <p className="text-lg font-black text-rose-600 mt-1">S/ {fmt(financialAnalysisEngine.totalDebt, 0)}</p>
                            </div>
                            <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Por Cobrar</p>
                              <p className="text-lg font-black text-emerald-600 mt-1">S/ {fmt(financialAnalysisEngine.totalReceivable, 0)}</p>
                            </div>
                            <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100 col-span-2">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Patrimonio Neto Estimado</p>
                              <p className="text-lg font-black text-indigo-600 mt-1">
                                S/ {fmt(financialAnalysisEngine.netWorth, 0)}
                              </p>
                            </div>
                          </motion.div>

                          {/* Alertas críticas */}
                          {financialAnalysisEngine.riskAnalysis.critical.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.9 }}
                              className="space-y-2"
                            >
                              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> Alertas Críticas
                              </p>
                              {financialAnalysisEngine.riskAnalysis.critical.map((alert, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 1 + idx * 0.1 }}
                                  whileHover={{ scale: 1.02 }}
                                  className="flex gap-2 p-3 bg-rose-50/80 border border-rose-100 rounded-2xl"
                                >
                                  <div className="p-2 bg-rose-100 rounded-xl text-rose-600 shrink-0">
                                    <ShieldAlert className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-rose-800">{alert.type}</p>
                                    <p className="text-[10px] text-rose-600 mt-0.5">{alert.message}</p>
                                    <p className="text-[9px] text-rose-500 mt-1 font-semibold">→ {alert.action}</p>
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      )}

                      {/* ========== 🔍 ANÁLISIS DETALLADO ========== */}
                      {activeAITab === 'analisis' && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          {/* Análisis de Ingresos */}
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <TrendingUp className="w-5 h-5 text-emerald-600" />
                              <h4 className="text-sm font-black text-emerald-800">Análisis de Ingresos</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white/80 rounded-xl border border-emerald-100/50">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Total Anual</p>
                                <p className="text-lg font-black text-emerald-700">S/ {fmt(financialAnalysisEngine.incomeAnalysis.total, 0)}</p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-emerald-100/50">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Promedio Mensual</p>
                                <p className="text-lg font-black text-emerald-700">S/ {fmt(financialAnalysisEngine.incomeAnalysis.averageMonthly, 0)}</p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-emerald-100/50">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Tendencia (3m)</p>
                                <p className={`text-lg font-black ${financialAnalysisEngine.incomeAnalysis.growthRate > 0 ? 'text-emerald-600' : financialAnalysisEngine.incomeAnalysis.growthRate < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                                  {financialAnalysisEngine.incomeAnalysis.growthRate > 0 ? '+' : ''}{financialAnalysisEngine.incomeAnalysis.growthRate.toFixed(1)}%
                                </p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-emerald-100/50">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Diversificación</p>
                                <p className="text-lg font-black text-emerald-700">{financialAnalysisEngine.incomeAnalysis.diversification.toFixed(0)}%</p>
                              </div>
                            </div>
                            <div className="mt-4 space-y-2">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Top 3 Categorías</p>
                              {Object.entries(financialAnalysisEngine.incomeAnalysis.categories)
                                .sort((a, b) => b[1].amount - a[1].amount)
                                .slice(0, 3)
                                .map(([name, data], idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + idx * 0.1 }}
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center gap-3 p-2 bg-white/80 rounded-xl border border-emerald-100/50"
                                  >
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                    <div className="flex-1">
                                      <p className="text-xs font-black text-gray-700 truncate">{name}</p>
                                    </div>
                                    <p className="text-xs font-black text-emerald-600">S/ {fmt(data.amount, 0)} ({data.percentage.toFixed(1)}%)</p>
                                  </motion.div>
                                ))}
                            </div>
                          </motion.div>

                          {/* Análisis de Gastos */}
                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <TrendingDown className="w-5 h-5 text-rose-600" />
                              <h4 className="text-sm font-black text-rose-800">Análisis de Gastos</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white/80 rounded-xl border border-rose-100/50">
                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Total Anual</p>
                                <p className="text-lg font-black text-rose-700">S/ {fmt(financialAnalysisEngine.expenseAnalysis.total, 0)}</p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-rose-100/50">
                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Promedio Mensual</p>
                                <p className="text-lg font-black text-rose-700">S/ {fmt(financialAnalysisEngine.expenseAnalysis.averageMonthly, 0)}</p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-rose-100/50">
                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Tendencia (3m)</p>
                                <p className={`text-lg font-black ${financialAnalysisEngine.expenseAnalysis.growthRate < 0 ? 'text-emerald-600' : financialAnalysisEngine.expenseAnalysis.growthRate > 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                                  {financialAnalysisEngine.expenseAnalysis.growthRate > 0 ? '+' : ''}{financialAnalysisEngine.expenseAnalysis.growthRate.toFixed(1)}%
                                </p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-rose-100/50">
                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Gastos Fijos</p>
                                <p className="text-lg font-black text-rose-700">{financialAnalysisEngine.expenseAnalysis.fixedVsVariable.fixedPct.toFixed(0)}%</p>
                              </div>
                            </div>
                          </motion.div>

                          {/* Análisis de Deudas */}
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <Clock className="w-5 h-5 text-amber-600" />
                              <h4 className="text-sm font-black text-amber-800">Análisis de Deudas</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white/80 rounded-xl border border-amber-100/50">
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Deuda Total</p>
                                <p className="text-lg font-black text-amber-700">S/ {fmt(financialAnalysisEngine.debtAnalysis.total, 0)}</p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-amber-100/50">
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Ratio Deuda/Ingresos</p>
                                <p className="text-lg font-black text-amber-700">{financialAnalysisEngine.debtAnalysis.debtToIncomeRatio.toFixed(1)}%</p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-amber-100/50">
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Vencidas</p>
                                <p className="text-lg font-black text-rose-600">{financialAnalysisEngine.debtAnalysis.expired}</p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-amber-100/50">
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Para Hoy</p>
                                <p className="text-lg font-black text-orange-600">{financialAnalysisEngine.debtAnalysis.dueToday}</p>
                              </div>
                            </div>
                          </motion.div>

                          {/* Análisis de Ahorros */}
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <Wallet className="w-5 h-5 text-indigo-600" />
                              <h4 className="text-sm font-black text-indigo-800">Análisis de Ahorros</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white/80 rounded-xl border border-indigo-100/50">
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Tasa de Ahorro</p>
                                <p className="text-lg font-black text-indigo-700">{financialAnalysisEngine.savingsAnalysis.savingsRate.toFixed(1)}%</p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-indigo-100/50">
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Fondo Emergencia</p>
                                <p className="text-lg font-black text-indigo-700">{financialAnalysisEngine.savingsAnalysis.emergencyFund.months} meses</p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-indigo-100/50 col-span-2">
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Meta Recomendada (3 meses)</p>
                                <p className="text-sm font-black text-indigo-700 mt-1">S/ {fmt(financialAnalysisEngine.savingsAnalysis.emergencyFund.recommended, 0)}</p>
                                <div className="mt-2 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (financialAnalysisEngine.savingsAnalysis.emergencyFund.amount / financialAnalysisEngine.savingsAnalysis.emergencyFund.recommended) * 100)}%` }}
                                    transition={{ duration: 1.5 }}
                                  />
                                </div>
                                <p className="text-[8px] text-indigo-500 font-bold mt-1 text-right">
                                  {Math.min(100, (financialAnalysisEngine.savingsAnalysis.emergencyFund.amount / financialAnalysisEngine.savingsAnalysis.emergencyFund.recommended) * 100).toFixed(0)}% alcanzado
                                </p>
                              </div>
                            </div>
                          </motion.div>

                          {/* Tendencia de Balance */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <TrendUp className={`w-5 h-5 ${financialAnalysisEngine.balanceTrend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                              <h4 className="text-sm font-black text-indigo-800">Tendencia de Balance Neto</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-white/80 rounded-xl border border-indigo-100/50">
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Tendencia (3m)</p>
                                <p className={`text-lg font-black ${financialAnalysisEngine.balanceTrend > 0 ? 'text-emerald-600' : financialAnalysisEngine.balanceTrend < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                                  {financialAnalysisEngine.balanceTrend > 0 ? '+' : ''}{financialAnalysisEngine.balanceTrend.toFixed(1)}%
                                </p>
                              </div>
                              <div className="p-3 bg-white/80 rounded-xl border border-indigo-100/50">
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Estado</p>
                                <p className={`text-sm font-black ${financialAnalysisEngine.balanceTrend > 5 ? 'text-emerald-600' : financialAnalysisEngine.balanceTrend > 0 ? 'text-indigo-600' : financialAnalysisEngine.balanceTrend < -5 ? 'text-rose-600' : 'text-amber-600'}`}>
                                  {financialAnalysisEngine.balanceTrend > 5 ? '↗ Crecimiento fuerte' :
                                    financialAnalysisEngine.balanceTrend > 0 ? '↗ Crecimiento' :
                                      financialAnalysisEngine.balanceTrend < -5 ? '↘ Caída fuerte' : '➖ Estable'}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}

                      {/* ========== 💡 RECOMENDACIONES ========== */}
                      {activeAITab === 'recomendaciones' && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          {/* Si no hay recomendaciones */}
                          {financialAnalysisEngine.recommendations.length === 0 ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex flex-col items-center p-8 bg-emerald-50/40 rounded-2xl border border-emerald-100 text-center"
                            >
                              <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                              <p className="text-sm font-black text-emerald-700">¡Todo está optimizado!</p>
                              <p className="text-[10px] text-gray-400 mt-1">No hay recomendaciones en este momento.</p>
                            </motion.div>
                          ) : (
                            <>
                              {/* Mostrar las primeras 3 recomendaciones (visibles sin scroll) */}
                              {(financialAnalysisEngine.recommendations as Array<{
                                type: string;
                                message: string;
                                action: string;
                                category: string;
                                priority: number;
                                params?: { categoryId?: string; subCategoryId?: string; tab?: string };
                                module?: string;
                                potential?: number;
                              }>).slice(0, 3).map((rec, idx) => (
                                <RecommendationItem
                                  key={idx}
                                  rec={rec}
                                  idx={idx}
                                  onClick={() =>
                                    handleRecommendationClick(
                                      rec.category,
                                      rec.type,
                                      rec.params?.categoryId,
                                      rec.params?.subCategoryId,
                                      rec.module,
                                      rec.params?.tab
                                    )
                                  }>


                                </RecommendationItem>
                              ))}

                              {/* Si hay más de 3 recomendaciones, mostrar las restantes */}
                              {financialAnalysisEngine.recommendations.length > 3 && (
                                <>
                                  {/* Divisor visual */}
                                  <div className="pt-4 border-t border-gray-100 mt-2" />

                                  {/* Recomendaciones adicionales (con scroll natural) */}
                                  {(financialAnalysisEngine.recommendations as Array<{
                                    type: string;
                                    message: string;
                                    action: string;
                                    category: string;
                                    priority: number;
                                    params?: { categoryId?: string; subCategoryId?: string; tab?: string };
                                    module?: string;
                                    potential?: number;
                                  }>).slice(0, 3).map((rec, idx) => (
                                    <motion.div
                                      key={idx + 3}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: (idx + 3) * 0.1 }}
                                      whileHover={{ scale: 1.02, x: 5 }}
                                      className={`flex gap-3 p-3.5 rounded-2xl border border-l-4 cursor-pointer ${rec.priority === 1 ? 'bg-rose-50/80 border-rose-100' :
                                        rec.priority === 2 ? 'bg-amber-50/80 border-amber-100' :
                                          rec.priority === 3 ? 'bg-indigo-50/80 border-indigo-100' :
                                            'bg-emerald-50/80 border-emerald-100'
                                        }`}
                                      style={{ borderLeftColor: rec.priority === 1 ? '#f43f5e' : rec.priority === 2 ? '#f59e0b' : rec.priority === 3 ? '#6366f1' : '#10b981' }}
                                      onClick={() =>
                                        handleRecommendationClick(
                                          rec.category,
                                          rec.type,
                                          rec.params?.categoryId,
                                          rec.params?.subCategoryId,
                                          rec.module,
                                          rec.params?.tab
                                        )
                                      }
                                    >
                                      <motion.div whileHover={{ scale: 1.2 }}>
                                        {rec.priority === 1 ? <ShieldAlert className="w-4 h-4 text-rose-500" /> :
                                          rec.priority === 2 ? <AlertTriangle className="w-4 h-4 text-amber-500" /> :
                                            rec.priority === 3 ? <Info className="w-4 h-4 text-indigo-500" /> :
                                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                      </motion.div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className={`text-[10px] font-black ${rec.priority === 1 ? 'text-rose-900' :
                                            rec.priority === 2 ? 'text-amber-900' :
                                              rec.priority === 3 ? 'text-indigo-900' :
                                                'text-emerald-900'
                                            }`}>
                                            {rec.type}
                                          </p>
                                          {rec.priority <= 2 && (
                                            <span className={`text-[8px] ${rec.priority === 1 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                              } px-1.5 py-0.5 rounded font-bold animate-pulse`}>
                                              {rec.priority === 1 ? 'URGENTE' : 'ALTA'}
                                            </span>
                                          )}
                                          {rec.priority === 4 && (
                                            <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold">💰 OPORTUNIDAD</span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-gray-500 leading-relaxed truncate">{rec.message}</p>
                                        <p className="text-[9px] text-indigo-600 mt-1 font-semibold truncate">→ {rec.action}</p>
                                        {'potential' in rec && rec.potential > 0 && (
                                          <p className="text-[9px] text-emerald-600 mt-1 font-bold">
                                            Potencial: +S/ {fmt(rec.potential, 0)}
                                          </p>
                                        )}
                                        <p className="text-[8px] text-gray-400 mt-1 font-semibold">
                                          Categoría: <span className="text-indigo-600">{rec.category}</span>
                                        </p>
                                      </div>
                                    </motion.div>
                                  ))}
                                </>
                              )}
                            </>
                          )}
                        </motion.div>
                      )}

                      {/* ========== 🔮 PROYECCIONES ========== */}
                      {activeAITab === 'proyecciones' && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          {financialAnalysisEngine.projections.length === 0 ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex flex-col items-center p-8 bg-slate-50/40 rounded-2xl border border-slate-100 text-center"
                            >
                              <p className="text-sm font-black text-gray-400">No hay proyecciones disponibles</p>
                            </motion.div>
                          ) : (
                            financialAnalysisEngine.projections.map((proj, idx) => {
                              const typeConfig = {
                                positive: { bg: 'bg-emerald-50/80 border-emerald-100', icon: <TrendUp className="w-5 h-5 text-emerald-500" />, text: 'text-emerald-900' },
                                negative: { bg: 'bg-rose-50/80 border-rose-100', icon: <TrendingDown className="w-5 h-5 text-rose-500" />, text: 'text-rose-900' },
                                neutral: { bg: 'bg-indigo-50/80 border-indigo-100', icon: <Clock className="w-5 h-5 text-indigo-500" />, text: 'text-indigo-900' },
                              };
                              const config = typeConfig[proj.type as keyof typeof typeConfig];

                              return (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  whileHover={{ scale: 1.02, y: -2 }}
                                  className={`p-4 rounded-2xl border ${config.bg}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <motion.div whileHover={{ scale: 1.1 }} className="p-2 bg-white rounded-xl border border-gray-100">
                                      {config.icon}
                                    </motion.div>
                                    <div className="flex-1">
                                      <p className="text-sm font-black text-gray-800">{proj.title}</p>
                                      <p className={`text-xl font-black ${config.text} mt-1`}>
                                        {proj.unit === 'meses' ? `${proj.value} ${proj.unit}` : `S/ ${fmt(proj.value, 0)}`}
                                      </p>
                                      {proj.change !== 0 && (
                                        <p className={`text-[10px] mt-1 ${proj.change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {proj.change > 0 ? '+' : ''}S/ {fmt(Math.abs(proj.change), 0)} ({proj.change > 0 ? '+' : ''}{proj.changePct.toFixed(1)}%)
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* --- Footer --- */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest"
                >
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Análisis en tiempo real
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {YEAR}
                  </span>
                </motion.div>
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
                      <h3 className="text-sm font-black text-gray-800">Simulador de Deuda</h3>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Proyección de Amortización</p>
                    </div>
                  </div>

                  {pendingStats.payable > 0 ? (() => {
                    const avgBal = totalBalance / 12;
                    const capacity = Math.max(avgBal + simulatorSavings, 0.01);
                    const months = pendingStats.payable <= 0 ? 0 : Math.ceil(pendingStats.payable / capacity);
                    const isAchievable = months <= 60;
                    const pct = Math.min((simulatorSavings / 5000) * 100, 100);
                    const colorClass = !isAchievable ? "text-rose-600 bg-rose-50 border-rose-100"
                      : months <= 6 ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                        : months <= 18 ? "text-amber-600 bg-amber-50 border-amber-100"
                          : "text-indigo-600 bg-indigo-50 border-indigo-100";

                    return (
                      <>
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ahorro Extra Mensual</label>
                            <span className="text-sm font-black text-emerald-600">S/ {simulatorSavings.toLocaleString()}</span>
                          </div>
                          <input
                            type="range" min={0} max={5000} step={50}
                            value={simulatorSavings}
                            onChange={e => setSimulatorSavings(Number(e.target.value))}
                            className="w-full sim-slider"
                          />
                          <div className="flex justify-between text-[9px] text-gray-300 font-black mt-1">
                            <span>S/ 0</span><span>S/ 5,000</span>
                          </div>
                        </div>

                        <div className={`p-4 rounded-2xl border ${colorClass}`}>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Tiempo para liquidar deuda</p>
                          <p className={`text-3xl font-black ${colorClass.split(" ")[0]}`}>
                            {!isAchievable ? "+60 meses" : months === 0 ? "¡Liquidada!" : `${months} ${months === 1 ? "mes" : "meses"}`}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            Deuda total: S/ {fmt(pendingStats.payable, 0)}
                          </p>
                        </div>

                        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[9px] text-gray-400 text-center mt-2 font-semibold">
                          {simulatorSavings > 0 ? `+S/${simulatorSavings}/mes reduce ${Math.ceil(pendingStats.payable / Math.max(avgBal, 0.01)) - months} meses` : "Mueve el slider para simular"}
                        </p>
                      </>
                    );
                  })() : (
                    <div className="flex flex-col items-center p-6 bg-emerald-50/40 rounded-2xl border border-emerald-100 text-center">
                      <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
                      <p className="text-sm font-black text-emerald-700">¡Sin deudas!</p>
                      <p className="text-[10px] text-gray-400 mt-1">Tu flujo está libre de compromisos por pagar.</p>
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
                      <h3 className="text-sm font-black text-gray-800">Acción Rápida</h3>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Pendientes Urgentes</p>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-slate-50/60 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Por Cobrar</p>
                      <p className="text-sm font-black text-emerald-600">S/ {fmt(pendingStats.receivable, 0)}</p>
                    </div>
                    <div className="border-l border-slate-200 pl-3">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Por Pagar</p>
                      <p className="text-sm font-black text-rose-600">S/ {fmt(pendingStats.payable, 0)}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {pendingStats.urgent.length === 0 ? (
                      <div className="flex flex-col items-center p-6 bg-emerald-50/40 rounded-2xl border border-emerald-100 text-center">
                        <Check className="w-8 h-8 text-emerald-500 mb-1.5" />
                        <p className="text-xs font-black text-emerald-700">¡Al día!</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Sin compromisos urgentes pendientes.</p>
                      </div>
                    ) : pendingStats.urgent.map((item, idx) => {
                      const isInc = item.type === "INCOME";
                      const isExp = item.dueInfo.status === "EXPIRED";
                      const isToday = item.dueInfo.status === "TODAY";
                      let badge = "bg-slate-50 text-slate-500 border-slate-100";
                      if (isExp) badge = "bg-rose-50 text-rose-600 border-rose-200 animate-pulse";
                      else if (isToday) badge = "bg-orange-50 text-orange-600 border-orange-100";
                      else badge = "bg-amber-50 text-amber-600 border-amber-100";
                      const isPaying = payingId === (item.id || item._id);

                      return (
                        <div key={idx} className="group/item flex items-center justify-between p-3 bg-white/80 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:shadow-sm">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-xl shrink-0 ${isInc ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                              {isInc ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-gray-800 truncate">{item.description || item.name || "Sin descripción"}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[8px] text-gray-400 font-semibold">{item.category?.name || item.category || "Otros"}</span>
                                <span className="text-gray-200">·</span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${badge}`}>{item.dueInfo.message}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 pl-2">
                            <span className={`text-xs font-black ${isInc ? "text-emerald-600" : "text-rose-600"}`}>
                              S/{item.amountSoles.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
                            </span>
                            <button
                              onClick={() => handleQuickPay(item.id || item._id)}
                              disabled={isPaying}
                              className={`p-1.5 rounded-xl border transition-all flex items-center justify-center ${isInc
                                ? "bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 border-emerald-100 hover:shadow-lg hover:shadow-emerald-200"
                                : "bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 border-rose-100 hover:shadow-lg hover:shadow-rose-200"
                                } disabled:opacity-50`}
                              title={isInc ? "Registrar cobro" : "Registrar pago"}
                            >
                              {isPaying
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Check className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── FOOTER STATUS BAR ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-black text-gray-300 uppercase tracking-widest py-4">
          <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-300" /> Sincronizado en tiempo real</span>
          <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-300" /> Ciclo {YEAR}</span>
          <span className="flex items-center gap-2"><Wallet className="w-4 h-4 text-indigo-300" /> Control Financiero Activo</span>
          <span className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${totalBalance >= 0 ? "bg-emerald-400" : "bg-rose-400"} animate-pulse`} />
            {totalBalance >= 0 ? "Finanzas Saludables" : "Atención Requerida"}
          </span>
        </div>
      </div>

      {/* ── GLOBAL STYLES ─────────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{
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
      ` }} />
    </Appshell >
  );
}


// 🐷 BOTÓN FLOTANTE + MODAL (FUERA DE Appshell)

export function FloatingSaveButton({ onSaveSuccess }: { onSaveSuccess?: () => void }) {
  // Estados
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveAmount, setSaveAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [ahorroCategoryId, setAhorroCategoryId] = useState<string>('');
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");


  // 🔥 Cargar categorías (IGUAL QUE EN IncomePage)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await listCategoriesRequest();
        setCategories(Array.isArray(data) ? data : []);

        // 🔹 Buscar la categoría "Ahorros" (EXPENSE y sin parentId)
        const ahorroCat = data.find((c: any) =>
          (!c.parentId || c.parentId === null) &&
          c.type === "EXPENSE" &&
          (c.name.toLowerCase().includes('ahorro') || c.name.toLowerCase().includes('saving'))
        );

        if (ahorroCat) {
          setAhorroCategoryId(ahorroCat.id);
        } else {
          // 🔹 Si no existe, crear una por defecto
          setAhorroCategoryId('ahorros');
          setCategories(prev => [
            ...prev,
            { id: 'ahorros', name: 'Ahorros', type: 'EXPENSE', parentId: null },
            { id: 'emergencia', name: 'Fondo de Emergencia', type: 'EXPENSE', parentId: 'ahorros' },
            { id: 'vacaciones', name: 'Vacaciones', type: 'EXPENSE', parentId: 'ahorros' },
            { id: 'educacion', name: 'Educación', type: 'EXPENSE', parentId: 'ahorros' },
          ]);
        }
      } catch (error) {
        console.error('Error cargando categorías:', error);
        // 🔹 Categorías por defecto
        setCategories([
          { id: 'ahorros', name: 'Ahorros', type: 'EXPENSE', parentId: null },
          { id: 'emergencia', name: 'Fondo de Emergencia', type: 'EXPENSE', parentId: 'ahorros' },
          { id: 'vacaciones', name: 'Vacaciones', type: 'EXPENSE', parentId: 'ahorros' },
          { id: 'educacion', name: 'Educación', type: 'EXPENSE', parentId: 'ahorros' },
        ]);
        setAhorroCategoryId('ahorros');
      }
    };
    loadCategories();
  }, []);


  // 🔹 Sub-categorías de "Ahorros" (IGUAL QUE EN IncomePage)
  const ahorroSubCategories = categories.filter(c => c.parentId === ahorroCategoryId);

  // Guardar ahorro
  const handleSaveSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveAmount || parseFloat(saveAmount) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    if (!selectedSubCategoryId) {
      toast.error('Selecciona una sub-categoría');
      return;
    }

    setSaving(true);
    try {
      // ✅ CORRECCIONES:
      const payload = {
        date: new Date(), // or your selected date
        paidAt: new Date(),
        name: "Ahorro Rápido",
        description: `Ahorro rápido de ${saveAmount}`,
        amount: parseFloat(saveAmount),
        exchangeRate: 1, // or your actual exchange rate as number
        type: "EXPENSE",
        currency: "PEN",
        paymentMethod: "CASH", // or your default payment method
        status: "PAID",
        categoryId: ahorroCategoryId,
        subCategoryId: selectedSubCategoryId,
      };

      // ✅ Usar createTransactionRequest (ya lo tienes importado)
      await createTransactionRequest(payload as any);

      toast.success('¡Ahorro registrado! 🎉');
      setShowSaveModal(false);
      setSaveAmount('');
      setSelectedSubCategoryId('');
      onSaveSuccess?.();
      // ✅ AGREGAR PARA ACTUALIZAR AUTOMÁTICAMENTE:
      // ✅ AGREGA ESTA LÍNEA (dispara el evento global)
      window.dispatchEvent(new CustomEvent('transactionCreated'));

    } catch (error: any) {
      // ✅ AGREGADO: Para ver el error real en consola
      console.error('Error detallado:', error.response?.data || error.message || error);
      toast.error(error?.response?.data?.message || error?.message || 'Error al registrar el ahorro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* 🐷 BOTÓN FLOTANTE (FIJO EN INFERIOR DERECHA) */}
      <button
        onClick={() => setShowSaveModal(true)}
        className="fixed bottom-6 right-6 z-[9999] group"
        aria-label="Registrar ahorro rápido"
      >
        <div className="relative">
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Ahorro Rápido
          </span>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-xl shadow-green-200/50 border-4 border-white"
          >
            <PiggyBank className="w-7 h-7 text-white" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              +
            </span>
          </motion.div>
        </div>
      </button>

      {/* MODAL (z-index más alto que el botón) */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-md p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl">
                    <PiggyBank className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-800">Registrar Ahorro</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Ahorro Rápido
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="p-2 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Formulario */}
              <div className="space-y-4">
                {/* Monto */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Monto (S/.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">S/.</span>
                    <input
                      type="number"
                      value={saveAmount}
                      onChange={(e) => setSaveAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 🔥 SUB-CATEGORÍA DE AHORROS (IGUAL QUE EN IncomePage) */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Tipo de Ahorro
                  </label>
                  <div className="relative">
                    <select
                      required
                      className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all text-sm font-black text-gray-700 appearance-none shadow-sm"
                      value={selectedSubCategoryId}
                      onChange={(e) => setSelectedSubCategoryId(e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      {ahorroSubCategories.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-green-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Botón Guardar */}
                <button
                  onClick={handleSaveSavings}
                  disabled={saving || !saveAmount || !selectedSubCategoryId}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black py-4 rounded-2xl hover:shadow-lg hover:shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <PiggyBank className="w-5 h-5" />
                      Guardar Ahorro
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
// ─── KPI CARD COMPONENT ────────────────────────────────────────────────────────
function KPICard({
  label, value, color, icon, sub, subPositive,
}: {
  label: string; value: string; rawValue: number;
  color: "emerald" | "rose" | "indigo" | "red" | "amber";
  icon: React.ReactNode; sub: string; subPositive: boolean;
}) {
  const colors = {
    emerald: { bg: "bg-white border-emerald-50", glow: "bg-emerald-500/5 group-hover:bg-emerald-500/10", icon: "from-emerald-400 to-emerald-600 shadow-emerald-200", label: "text-emerald-600/70", val: "text-gray-900", sub: "bg-emerald-50 text-emerald-700" },
    rose: { bg: "bg-white border-rose-50", glow: "bg-rose-500/5 group-hover:bg-rose-500/10", icon: "from-rose-400 to-rose-600 shadow-rose-200", label: "text-rose-600/70", val: "text-gray-900", sub: "bg-rose-50 text-rose-700" },
    indigo: { bg: "bg-white border-indigo-50", glow: "bg-indigo-500/5 group-hover:bg-indigo-500/10", icon: "from-indigo-500 to-purple-700 shadow-indigo-200", label: "text-indigo-600/70", val: "text-gray-900", sub: "bg-indigo-50 text-indigo-700" },
    red: { bg: "bg-white border-red-50", glow: "bg-red-500/5 group-hover:bg-red-500/10", icon: "from-red-400 to-red-600 shadow-red-200", label: "text-red-600/70", val: "text-red-700", sub: "bg-red-50 text-red-700" },
    amber: { bg: "bg-white border-amber-50", glow: "bg-amber-500/5 group-hover:bg-amber-500/10", icon: "from-amber-400 to-orange-500 shadow-amber-200", label: "text-amber-600/70", val: "text-gray-900", sub: "bg-amber-50 text-amber-700" },
  }[color];

  return (
    <div className={`${colors.bg} rounded-3xl p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all duration-500`}>
      <div className={`absolute -right-8 -top-8 w-40 h-40 ${colors.glow} rounded-full blur-2xl transition-all duration-700`} />
      <div className="flex justify-between items-start relative z-10">
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${colors.label}`}>{label}</p>
          <p className={`text-2xl md:text-3xl font-black ${colors.val} leading-none`}>{value}</p>
          <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${colors.sub}`}>
            {subPositive ? <TrendUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {sub}
          </div>
        </div>
        <div className={`p-3.5 bg-gradient-to-br ${colors.icon} rounded-2xl shadow-lg ml-3 shrink-0`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
    </div>
  );
}
