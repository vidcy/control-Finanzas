import React, { useState, useEffect, useMemo } from "react";
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
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { getTransactionsRequest } from "../services/transaction.api";
import { listCategoriesRequest } from "../services/category.api";
import { toast } from "react-hot-toast";

const months = [
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

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    Ingresos: true,
  });
  const [showValues, setShowValues] = useState(true);
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, cData] = await Promise.all([
        getTransactionsRequest(),
        listCategoriesRequest(),
      ]);
      console.log("🔥 RAW tData:", tData);
      console.log("🔥 TYPEOF tData:", typeof tData);
      console.log("🔥 IS ARRAY:", Array.isArray(tData));

      setTransactions(tData);
      setCategories(cData);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al cargar datos del dashboard";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const newState: Record<string, boolean> = { Ingresos: true };
    expenseRows.forEach((_, i) => {
      newState[`exp-${i}`] = true;
    });
    setExpandedCats(newState);
  };

  const collapseAll = () => {
    setExpandedCats({ Ingresos: false });
  };

  const { incomeRows, expenseRows, monthlyIncomeTotals, monthlyExpenseTotals } =
    useMemo(() => {
      const mIncome = Array(12).fill(0);
      const mExpense = Array(12).fill(0);
      const incomeMap: Record<string, number[]> = {};
      const expenseMap: Record<
        string,
        { name: string; subcategories: Record<string, number[]> }
      > = {};

      safeTransactions.forEach((t) => {
        const date = new Date(t.date);
        const month = isNaN(date.getTime()) ? 0 : date.getUTCMonth();
        const amount =
          Number(t.amount || 0) *
          (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);

        if (t.type === "INCOME") {
          mIncome[month] += amount;
          const catName =
            t.category?.name ||
            (typeof t.category === "string" ? t.category : "Otros Ingresos");
          if (!incomeMap[catName]) incomeMap[catName] = Array(12).fill(0);
          incomeMap[catName][month] += amount;
        } else {
          mExpense[month] += amount;
          const catName =
            t.category?.name ||
            (typeof t.category === "string" ? t.category : "Otros Gastos");
          const subName =
            t.subCategory?.name ||
            (typeof t.subCategory === "string" ? t.subCategory : "General");

          if (!expenseMap[catName]) {
            expenseMap[catName] = { name: catName, subcategories: {} };
          }
          if (!expenseMap[catName].subcategories[subName]) {
            expenseMap[catName].subcategories[subName] = Array(12).fill(0);
          }
          expenseMap[catName].subcategories[subName][month] += amount;
        }
      });

      const iRows = Object.entries(incomeMap).map(([name, values]) => ({
        name,
        values,
      }));
      const eRows = Object.values(expenseMap).map((cat) => ({
        category: cat.name,
        subcategories: Object.entries(cat.subcategories).map(
          ([name, values]) => ({ name, values }),
        ),
      }));

      return {
        incomeRows: iRows,
        expenseRows: eRows,
        monthlyIncomeTotals: mIncome,
        monthlyExpenseTotals: mExpense,
      };
    }, [transactions]);

  const monthlyBalances = monthlyIncomeTotals.map(
    (inc, i) => inc - monthlyExpenseTotals[i],
  );
  const grandTotalIncome = monthlyIncomeTotals.reduce((a, b) => a + b, 0);
  const grandTotalExpense = monthlyExpenseTotals.reduce((a, b) => a + b, 0);
  const grandTotalBalance = grandTotalIncome - grandTotalExpense;
  const maxMonthlyValue = Math.max(
    ...monthlyIncomeTotals,
    ...monthlyExpenseTotals,
    1,
  );

  const formatSoles = (val: number) => {
    if (!showValues) return "••••••";
    if (val === 0) return "-";
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <Appshell>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-gray-400 font-black uppercase tracking-widest animate-pulse">
            Sincronizando Resumen...
          </p>
        </div>
      </Appshell>
    );
  }

  return (
    <Appshell>
      <div className="flex flex-col gap-10 animate-fade-in-up pb-20">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] md:rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-xl shadow-indigo-100 relative group overflow-hidden">
              <LayoutDashboard className="w-8 h-8 text-white relative z-10" />
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                Resumen Financiero
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Análisis estructural de ingresos y gastos{" "}
                {new Date().getFullYear()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowValues(!showValues)}
              className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
              title={showValues ? "Ocultar montos" : "Mostrar montos"}
            >
              {showValues ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-6 py-3.5 rounded-2xl font-black hover:bg-indigo-100 transition-all text-sm"
            >
              <RefreshCcw className="w-4 h-4" /> Actualizar
            </button>
          </div>
        </div>

        {/* TARJETAS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Tarjeta Ingresos */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-emerald-50 flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all duration-500">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-xs font-black text-emerald-600/60 uppercase tracking-[0.2em] mb-2">
                  Ingresos Anuales
                </p>
                <h3 className="text-4xl font-black text-gray-900">
                  <span className="text-emerald-500 text-2xl mr-1">S/</span>
                  {showValues
                    ? grandTotalIncome.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })
                    : "••••••"}
                </h3>
                <div className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full w-fit">
                  <TrendingUp className="w-4 h-4" /> +
                  {(
                    (grandTotalIncome / (grandTotalExpense || 1)) *
                    100
                  ).toFixed(0)}
                  % vs Gastos
                </div>
              </div>
              <div className="p-5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[1.5rem] shadow-lg shadow-emerald-200">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* Tarjeta Egresos */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-rose-50 flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all duration-500">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-all duration-700"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-xs font-black text-rose-600/60 uppercase tracking-[0.2em] mb-2">
                  Gastos Totales
                </p>
                <h3 className="text-4xl font-black text-gray-900">
                  <span className="text-rose-500 text-2xl mr-1">S/</span>
                  {showValues
                    ? grandTotalExpense.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })
                    : "••••••"}
                </h3>
                <div className="mt-4 flex items-center gap-2 text-rose-600 font-bold text-sm bg-rose-50 px-3 py-1 rounded-full w-fit">
                  <TrendingDown className="w-4 h-4" />{" "}
                  {(
                    (grandTotalExpense / (grandTotalIncome || 1)) *
                    100
                  ).toFixed(0)}
                  % del Ingreso
                </div>
              </div>
              <div className="p-5 bg-gradient-to-br from-rose-400 to-rose-600 rounded-[1.5rem] shadow-lg shadow-rose-200">
                <TrendingDown className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          {/* Tarjeta Saldo */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-indigo-50 flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all duration-500">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-700"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-xs font-black text-indigo-600/60 uppercase tracking-[0.2em] mb-2">
                  Ahorro Neto
                </p>
                <h3 className="text-4xl font-black text-gray-900">
                  <span className="text-indigo-500 text-2xl mr-1">S/</span>
                  {showValues
                    ? grandTotalBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })
                    : "••••••"}
                </h3>
                <div
                  className={`mt-4 flex items-center gap-2 font-bold text-sm px-3 py-1 rounded-full w-fit ${grandTotalBalance >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-red-50 text-red-600"}`}
                >
                  <Wallet className="w-4 h-4" />{" "}
                  {grandTotalBalance >= 0
                    ? "Saldo Positivo"
                    : "Déficit Acumulado"}
                </div>
              </div>
              <div className="p-5 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-[1.5rem] shadow-lg shadow-indigo-200">
                <Wallet className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* CHART SECTION */}
        <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-12 shadow-[0_30px_70px_rgba(0,0,0,0.03)] border border-gray-50 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-50/20 rounded-full blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                  Comparativa de Rendimiento Mensual
                </h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                  Análisis de flujo mensual acumulado
                </p>
              </div>
            </div>
            <div className="flex bg-gray-50 p-2 rounded-2xl border border-gray-100 shadow-inner">
              <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                  Ingresos
                </span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Egresos
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar-premium pb-4 -mx-2 px-2 md:mx-0 md:px-0">
            <div className="relative h-80 min-w-[700px] md:min-w-full w-full group">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-4">
                {[1, 0.75, 0.5, 0.25, 0].map((p) => (
                  <div key={p} className="w-full flex items-center gap-4">
                    <span className="text-[9px] font-black text-gray-400 w-16 text-right sticky left-0 z-10 bg-white/90 backdrop-blur-sm py-1 pr-2 rounded-r-lg">
                      S/ {(maxMonthlyValue * p).toLocaleString()}
                    </span>
                    <div className="flex-1 border-t border-gray-100/80 border-dashed"></div>
                  </div>
                ))}
              </div>

              <div className="absolute inset-0 left-20 flex justify-between items-end gap-3 md:gap-6 pb-2">
                {months.map((m, i) => {
                  const incHeight =
                    (monthlyIncomeTotals[i] / maxMonthlyValue) * 100;
                  const expHeight =
                    (monthlyExpenseTotals[i] / maxMonthlyValue) * 100;
                  const isPositive = monthlyBalances[i] >= 0;

                  return (
                    <div
                      key={`chart-v2-${m}`}
                      className="flex flex-col items-center flex-1 h-full group/bar relative"
                    >
                      <div className="flex items-end justify-center w-full gap-1.5 md:gap-3 h-full relative group-hover/bar:z-20">
                        <div className="absolute bottom-full mb-6 opacity-0 group-hover/bar:opacity-100 transition-all duration-500 transform translate-y-4 group-hover/bar:translate-y-0 pointer-events-none z-30">
                          <div className="bg-gray-900/95 backdrop-blur-md text-white p-5 rounded-3xl shadow-2xl border border-white/10 w-48 overflow-hidden relative">
                            <div
                              className={`absolute top-0 left-0 w-full h-1 ${isPositive ? "bg-emerald-500" : "bg-rose-500"}`}
                            ></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">
                              {m} {new Date().getFullYear()}
                            </p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-400 font-bold">
                                  Ingresos:
                                </span>
                                <span className="text-xs font-black text-emerald-400">
                                  S/ {monthlyIncomeTotals[i].toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-400 font-bold">
                                  Egresos:
                                </span>
                                <span className="text-xs font-black text-rose-400">
                                  S/ {monthlyExpenseTotals[i].toLocaleString()}
                                </span>
                              </div>
                              <div className="pt-2 border-t border-white/10 mt-2 flex justify-between items-center">
                                <span className="text-[10px] text-gray-200 font-black">
                                  Neto:
                                </span>
                                <span
                                  className={`text-sm font-black ${isPositive ? "text-emerald-400" : "text-rose-400"}`}
                                >
                                  S/ {monthlyBalances[i].toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="w-4 h-4 bg-gray-900 rotate-45 mx-auto -mt-2 shadow-2xl"></div>
                        </div>

                        <div
                          className="w-full max-w-[14px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-emerald-200/40 relative overflow-hidden group-hover/bar:scale-x-125"
                          style={{ height: `${Math.max(incHeight, 2)}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent translate-y-full animate-[shimmer_3s_infinite]"></div>
                        </div>
                        <div
                          className="w-full max-w-[14px] bg-gradient-to-t from-rose-600 to-rose-400 rounded-full transition-all duration-1000 ease-out delay-100 shadow-lg shadow-rose-200/40 relative overflow-hidden group-hover/bar:scale-x-125"
                          style={{ height: `${Math.max(expHeight, 2)}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent translate-y-full animate-[shimmer_3s_infinite_0.5s]"></div>
                        </div>
                      </div>
                      <div className="h-14 flex items-center">
                        <span
                          className={`text-[11px] font-black tracking-tighter transition-colors ${monthlyBalances[i] >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                        >
                          {m}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* DESGLOSE ESTRUCTURAL */}
        <div className="bg-white rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-b from-gray-50/50 to-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 animate-bounce-slow">
                <Maximize2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">
                  Estructura Detallada por Meses
                </h2>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                  <ArrowRight className="w-3 h-3 animate-pulse" /> Desliza para
                  navegar
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={expandAll}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
              >
                Expandir Todo
              </button>
              <button
                onClick={collapseAll}
                className="px-4 py-2 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
              >
                Contraer
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-x-auto custom-scrollbar-premium">
              <table className="w-full text-left border-collapse min-w-[1400px]">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <th className="sticky left-0 bg-white/95 backdrop-blur-md z-40 p-3 md:p-4 pl-4 md:pl-8 text-[9px] md:text-[11px] font-black uppercase tracking-wider md:tracking-[0.2em] w-32 md:w-64 border-r border-gray-100 shadow-[10px_0_20px_-10px_rgba(0,0,0,0.1)] text-gray-500">
                      Clasificación
                    </th>
                    {months.map((m) => (
                      <th
                        key={m}
                        className="p-3 md:p-4 text-center text-[10px] md:text-xs font-black uppercase tracking-widest border-r border-gray-50 text-gray-400 w-20 md:w-28"
                      >
                        {m}
                      </th>
                    ))}
                    <th className="p-3 md:p-4 text-right text-[10px] md:text-xs font-black uppercase tracking-widest w-28 md:w-36 bg-indigo-50/50 text-indigo-600">
                      Total Anual
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {/* SECCIÓN INGRESOS */}
                  <tr className="bg-gradient-to-r from-emerald-400 to-teal-500 group">
                    <td className="sticky left-0 bg-gradient-to-r from-emerald-400 to-teal-500 z-30 p-3 md:p-4 pl-4 md:pl-8 border-r border-emerald-300 text-white font-black uppercase text-[10px] md:text-xs tracking-[0.1em] shadow-[10px_0_20px_-5px_rgba(16,185,129,0.3)] flex items-center gap-2 overflow-hidden">
                      <TrendingUp className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />{" "}
                      <span className="truncate">INGRESOS</span>
                    </td>
                    {monthlyIncomeTotals.map((tot, i) => (
                      <td
                        key={`inc-tot-${i}`}
                        className="p-3 md:p-4 text-center font-black text-white/90 text-[10px] md:text-sm border-r border-white/10 group-hover:bg-black/5 transition-colors"
                      >
                        {formatSoles(tot)}
                      </td>
                    ))}
                    <td className="p-3 md:p-4 text-right font-black bg-emerald-700 text-white text-xs md:text-base">
                      S/ {formatSoles(grandTotalIncome)}
                    </td>
                  </tr>

                  {incomeRows.map((inc, i) => {
                    const rowTotal = inc.values.reduce((a, b) => a + b, 0);
                    return (
                      <tr
                        key={`inc-row-${i}`}
                        className="border-b border-gray-50 hover:bg-emerald-50/30 transition-colors group"
                      >
                        <td className="sticky left-0 bg-white/95 backdrop-blur-md group-hover:bg-emerald-50/20 z-20 p-2 md:p-3 pl-6 md:pl-12 border-r border-gray-100 text-gray-700 font-bold text-[10px] md:text-xs shadow-[8px_0_15px_-5px_rgba(0,0,0,0.05)] flex items-center gap-2 overflow-hidden">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-100 flex-shrink-0"></div>
                          <span className="truncate" title={inc.name}>
                            {inc.name}
                          </span>
                        </td>
                        {inc.values.map((v, j) => (
                          <td
                            key={`inc-v-${j}`}
                            className="p-2 md:p-3 text-center text-gray-600 font-bold text-[10px] md:text-[11px] border-r border-gray-100/50"
                          >
                            {formatSoles(v)}
                          </td>
                        ))}
                        <td className="p-2 md:p-3 text-right font-black text-emerald-700 text-[10px] md:text-[11px] bg-emerald-50/20">
                          {formatSoles(rowTotal)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* SECCIÓN EGRESOS */}
                  <tr className="bg-gradient-to-r from-purple-400 to-pink-500 group">
                    <td className="sticky left-0 bg-gradient-to-r from-purple-400 to-pink-500 z-30 p-3 md:p-4 pl-4 md:pl-8 border-r border-purple-300 text-white font-black uppercase text-[10px] md:text-xs tracking-[0.1em] shadow-[10px_0_20px_-5px_rgba(168,85,247,0.3)] flex items-center gap-2 overflow-hidden">
                      <TrendingDown className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />{" "}
                      <span className="truncate">EGRESOS</span>
                    </td>
                    {monthlyExpenseTotals.map((tot, i) => (
                      <td
                        key={`exp-tot-${i}`}
                        className="p-3 md:p-4 text-center font-black text-white/90 text-[10px] md:text-sm border-r border-white/10 group-hover:bg-black/5 transition-colors"
                      >
                        {formatSoles(tot)}
                      </td>
                    ))}
                    <td className="p-3 md:p-4 text-right font-black bg-purple-700 text-white text-xs md:text-base">
                      S/ {formatSoles(grandTotalExpense)}
                    </td>
                  </tr>

                  {expenseRows.map((cat, i) => {
                    const catMonthlyTotals = Array(12).fill(0);
                    cat.subcategories.forEach((sub) => {
                      sub.values.forEach((v, monthIdx) => {
                        catMonthlyTotals[monthIdx] += v;
                      });
                    });
                    const catGrandTotal = catMonthlyTotals.reduce(
                      (a, b) => a + b,
                      0,
                    );
                    const isExpanded = expandedCats[`exp-${i}`];

                    return (
                      <React.Fragment key={`exp-cat-f2-${i}`}>
                        <tr
                          className="border-b border-gray-100 hover:bg-purple-50/10 transition-colors cursor-pointer group"
                          onClick={() => toggleCat(`exp-${i}`)}
                        >
                          <td className="sticky left-0 bg-white/95 backdrop-blur-md group-hover:bg-purple-50/5 z-20 p-2 md:p-3 pl-4 md:pl-8 font-black text-gray-800 text-[10px] md:text-xs uppercase border-r border-gray-100 shadow-[8px_0_15px_-5px_rgba(0,0,0,0.05)] flex items-center justify-between transition-colors pr-2 md:pr-4">
                            <div className="flex items-center gap-2 overflow-hidden">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                              )}
                              <span className="truncate" title={cat.category}>
                                {cat.category}
                              </span>
                            </div>
                          </td>
                          {catMonthlyTotals.map((tot, j) => (
                            <td
                              key={`cat-tot-v2-${j}`}
                              className={`p-2 md:p-3 text-center text-[10px] md:text-[11px] font-black border-r border-gray-100/50 ${tot > 0 ? "text-gray-800" : "text-gray-400"}`}
                            >
                              {formatSoles(tot)}
                            </td>
                          ))}
                          <td className="p-2 md:p-3 text-right font-black text-purple-600 text-[10px] md:text-xs bg-purple-50/10">
                            {formatSoles(catGrandTotal)}
                          </td>
                        </tr>

                        {isExpanded &&
                          cat.subcategories.map((sub, j) => {
                            const rowTotal = sub.values.reduce(
                              (a, b) => a + b,
                              0,
                            );
                            return (
                              <tr
                                key={`exp-sub-v2-${j}`}
                                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                              >
                                <td className="sticky left-0 bg-gray-50/90 backdrop-blur-md z-10 p-1.5 md:p-2 pl-8 md:pl-14 border-r border-gray-100 text-gray-600 font-bold text-[9px] md:text-[10px] shadow-[8px_0_15px_-5px_rgba(0,0,0,0.02)] flex items-center gap-2 overflow-hidden">
                                  <div className="w-1.5 h-1.5 rounded-full bg-purple-300 shadow-sm flex-shrink-0"></div>
                                  <span className="truncate" title={sub.name}>
                                    {sub.name}
                                  </span>
                                </td>
                                {sub.values.map((v, k) => (
                                  <td
                                    key={`exp-v-v2-${k}`}
                                    className="p-1.5 md:p-2 text-center text-gray-500 font-medium text-[9px] md:text-[10px] border-r border-gray-50/50"
                                  >
                                    {formatSoles(v)}
                                  </td>
                                ))}
                                <td className="p-1.5 md:p-2 text-right font-black text-purple-500 text-[9px] md:text-[10px] bg-purple-50/5">
                                  {formatSoles(rowTotal)}
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}

                  {/* BALANCE NETO FINAL */}
                  <tr
                    className={`border-t-4 border-white text-white shadow-[0_-20px_60px_rgba(0,0,0,0.2)] ${grandTotalBalance >= 0 ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600" : "bg-gradient-to-r from-rose-600 via-pink-600 to-orange-600"}`}
                  >
                    <td
                      className={`sticky left-0 z-40 p-4 md:p-6 pl-4 md:pl-8 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-[10px] md:text-sm border-r border-white/20 shadow-[15px_0_35px_rgba(0,0,0,0.4)] ${grandTotalBalance >= 0 ? "bg-emerald-600" : "bg-rose-600"} flex items-center overflow-hidden`}
                    >
                      <span className="truncate">BALANCE NETO</span>
                    </td>
                    {monthlyBalances.map((bal, i) => (
                      <td
                        key={`bal-f2-${i}`}
                        className={`p-4 md:p-6 text-center font-black text-[11px] md:text-sm border-r border-white/10 ${bal >= 0 ? "bg-white/10" : "bg-black/10 text-white/70"}`}
                      >
                        {formatSoles(bal)}
                      </td>
                    ))}
                    <td
                      className={`p-4 md:p-6 text-right font-black text-sm md:text-xl ${grandTotalBalance >= 0 ? "bg-emerald-900/50" : "bg-rose-900/50"}`}
                    >
                      S/ {formatSoles(grandTotalBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-12 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] pb-10 mt-6 opacity-50 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-indigo-400" /> Sincronizado en
            tiempo real
          </div>
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-indigo-400" /> Control Financiero
            Activo
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-400" /> Ciclo{" "}
            {new Date().getFullYear()}
          </div>
          {canInstall && (
            <button
              onClick={async () => {
                deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;

                if (choice.outcome === "accepted") {
                  console.log("App instalada");
                }

                setDeferredPrompt(null);
                setCanInstall(false);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold"
            >
              Instalar app
            </button>
          )}
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
                @keyframes shimmer { 0% { transform: translateY(100%); } 100% { transform: translateY(-100%); } }
                .custom-scrollbar-premium::-webkit-scrollbar { height: 16px; width: 16px; }
                .custom-scrollbar-premium::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 20px; }
                .custom-scrollbar-premium::-webkit-scrollbar-thumb { 
                    background: linear-gradient(to bottom, #cbd5e1, #94a3b8); 
                    border-radius: 20px; 
                    border: 4px solid #f1f5f9;
                    box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
                }
                .custom-scrollbar-premium::-webkit-scrollbar-thumb:hover { background: linear-gradient(to bottom, #94a3b8, #64748b); }
                .animate-bounce-slow { animation: bounce 3s infinite; }
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
            `,
        }}
      />
    </Appshell>
  );
}
