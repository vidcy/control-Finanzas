import { useMemo } from 'react';

// Interfaces para los inputs
interface PendingStats {
  payable: number;
  receivable: number;
  urgent: any[];
}

interface PersonalAIProps {
  activeTx: any[];
  mIncome: number[];
  mExpense: number[];
  mBalance: number[];
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  pendingStats: PendingStats;
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export function usePersonalAI({
  activeTx,
  mIncome,
  mExpense,
  mBalance,
  totalIncome,
  totalExpense,
  totalBalance,
  pendingStats,
}: PersonalAIProps) {
  
  return useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();

    const debtRatio = pendingStats.payable > 0 && totalIncome > 0 ? (pendingStats.payable / totalIncome) * 100 : 0;
    const liquidityRatio = totalBalance > 0 ? totalBalance / pendingStats.payable : Infinity;

    const calculateTrend = (data: number[]) => {
      const past = data.slice(0, Math.max(0, currentMonth + 1 - 3));
      const recent = data.slice(Math.max(0, currentMonth + 1 - 3), currentMonth + 1);
      if (past.length === 0 || past.reduce((a, b) => a + b, 0) === 0) return 0;
      return ((recent.reduce((a, b) => a + b, 0) / past.reduce((a, b) => a + b, 0)) - 1) * 100;
    };

    const incomeTrend = calculateTrend(mIncome);
    const expenseTrend = calculateTrend(mExpense);

    // ========== 💰 INGRESOS ==========
    const incomeAnalysis = {
      total: totalIncome,
      averageMonthly: totalIncome / 12,
      growthRate: incomeTrend,
      diversification: 0,
      categories: {} as Record<string, { amount: number; percentage: number }>,
      seasonality: [] as { month: string; amount: number; vsAveragePct: number }[],
    };

    const incomeByCategory: Record<string, number> = {};
    activeTx.forEach((t) => {
      if (t.type === "INCOME") {
        const cat = t.category?.name || t.category || "Otros";
        const amount = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amount;
      }
    });

    const incomeCategories = Object.entries(incomeByCategory);
    if (incomeCategories.length > 0) {
      const mainSourcePct = (incomeCategories[0][1] / totalIncome) * 100;
      incomeAnalysis.diversification = Math.max(0, 100 - mainSourcePct);
    }

    incomeCategories.forEach(([name, amount]) => {
      incomeAnalysis.categories[name] = { amount, percentage: (amount / totalIncome) * 100 };
    });

    mIncome.forEach((amount, i) => {
      const avgMonthly = totalIncome / 12;
      const vsAveragePct = avgMonthly > 0 ? ((amount - avgMonthly) / avgMonthly) * 100 : 0;
      incomeAnalysis.seasonality.push({ month: MONTHS[i], amount, vsAveragePct });
    });

    // ========== 💸 GASTOS ==========
    const expenseAnalysis = {
      total: totalExpense,
      averageMonthly: totalExpense / 12,
      growthRate: expenseTrend,
      fixedVsVariable: { fixed: 0, variable: 0, fixedPct: 0 },
      topCategories: [] as { name: string; amount: number; percentage: number; isRecurrent: boolean }[],
      savingsOpportunities: [] as { category: string; amount: number; percentage: number; potentialSavings: number }[],
    };

    const expenseByCategory: Record<string, { amount: number; isRecurrent: boolean }> = {};
    activeTx.forEach((t) => {
      if (t.type === "EXPENSE") {
        const cat = t.category?.name || t.category || "Otros";
        const amount = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
        const isRecurrent = t.description?.toLowerCase().includes("pago") ||
          t.description?.toLowerCase().includes("suscripción") ||
          t.description?.toLowerCase().includes("mensual") ||
          cat.toLowerCase().includes("servicio") ||
          cat.toLowerCase().includes("alquiler");

        if (!expenseByCategory[cat]) expenseByCategory[cat] = { amount: 0, isRecurrent: false };
        expenseByCategory[cat].amount += amount;
        if (isRecurrent) expenseByCategory[cat].isRecurrent = true;
      }
    });

    Object.entries(expenseByCategory).forEach(([name, data]) => {
      const percentage = (data.amount / totalExpense) * 100;
      expenseAnalysis.topCategories.push({ name, amount: data.amount, percentage, isRecurrent: data.isRecurrent });

      if (percentage > 20 && !["Alquiler", "Hipoteca", "Servicios Públicos"].includes(name) && !name.toLowerCase().includes("ahorro")) {
        expenseAnalysis.savingsOpportunities.push({
          category: name, amount: data.amount, percentage, potentialSavings: data.amount * 0.15,
        });
      }
    });

    expenseAnalysis.topCategories.sort((a, b) => b.amount - a.amount);

    let fixedExpenses = 0, variableExpenses = 0;
    Object.values(expenseByCategory).forEach((cat) => {
      if (cat.isRecurrent) fixedExpenses += cat.amount;
      else variableExpenses += cat.amount;
    });
    expenseAnalysis.fixedVsVariable = { fixed: fixedExpenses, variable: variableExpenses, fixedPct: (fixedExpenses / totalExpense) * 100 };

    // ========== 💳 DEUDAS ==========
    const debtAnalysis = {
      total: pendingStats.payable,
      totalReceivable: pendingStats.receivable,
      netDebt: pendingStats.payable - pendingStats.receivable,
      debtToIncomeRatio: debtRatio,
      debtToBalanceRatio: pendingStats.payable > 0 && totalBalance > 0 ? (pendingStats.payable / totalBalance) * 100 : 0,
      expired: pendingStats.urgent.filter((u) => u.dueInfo.status === "EXPIRED").length,
      dueToday: pendingStats.urgent.filter((u) => u.dueInfo.status === "TODAY").length,
    };

    // ========== 🏦 AHORROS ==========
    let explicitSavings = 0;
    activeTx.forEach((t) => {
      if (t.type === "INCOME" && (t.category?.name?.toLowerCase().includes("ahorro") || t.category?.name?.toLowerCase().includes("saving"))) {
        explicitSavings += Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
      }
    });

    const totalSavings = totalBalance + explicitSavings;
    const savingsAnalysis = {
      total: totalSavings,
      savingsRate: totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0,
      emergencyFund: {
        months: totalExpense > 0 ? Math.floor(totalSavings / (totalExpense / 12)) : 0,
        amount: totalSavings,
      },
    };

    // ========== ⚠️ RIESGOS Y OPORTUNIDADES (CLEAN) ==========
    const riskAnalysis = {
      critical: [] as any[],
      warnings: [] as any[],
      opportunities: [] as any[],
    };

    // Agregar lógicas limpias sin redundancias
    if (debtAnalysis.expired > 0) {
      riskAnalysis.critical.push({ type: "Deudas Vencidas", severity: "high", message: "Tienes deudas vencidas.", action: "Paga inmediatamente.", category: "Deudas" });
    }
    if (liquidityRatio < 1) {
      riskAnalysis.critical.push({ type: "Falta de Liquidez", severity: "high", message: `Tu ratio de liquidez es bajo (${liquidityRatio.toFixed(2)}).`, action: "Genera ingresos adicionales.", category: "Liquidez" });
    }
    if (debtAnalysis.debtToIncomeRatio > 50) {
      riskAnalysis.critical.push({ type: "Sobreendeudamiento", severity: "high", message: `Tus deudas son el ${debtAnalysis.debtToIncomeRatio.toFixed(1)}% de tus ingresos.`, action: "Prioriza pagar deudas.", category: "Deudas" });
    }
    if (savingsAnalysis.emergencyFund.months < 1) {
      riskAnalysis.critical.push({ type: "Sin Fondo", severity: "high", message: "Tienes menos de 1 mes de fondo de emergencia.", action: "Ahorra el 10% de ingresos.", category: "Ahorro" });
    }

    if (debtAnalysis.dueToday > 0) {
      riskAnalysis.warnings.push({ type: "Pagos Hoy", message: `Tienes ${debtAnalysis.dueToday} pagos para hoy.`, action: "Realiza estos pagos hoy.", category: "Deudas" });
    }

    expenseAnalysis.savingsOpportunities.forEach((opp) => {
      riskAnalysis.opportunities.push({ type: `Ahorro en ${opp.category}`, message: `Podrías ahorrar S/ ${fmt(opp.potentialSavings)} en ${opp.category}.`, potential: opp.potentialSavings, action: `Reduce gastos en ${opp.category}.`, category: "Gastos" });
    });

    if (pendingStats.receivable > 0) {
      riskAnalysis.opportunities.push({ type: "Cobranza", message: `Tienes S/ ${fmt(pendingStats.receivable)} por cobrar.`, potential: pendingStats.receivable, action: "Gestiona tu cobranza.", category: "Ingresos" });
    }

    // SCORE
    let score = 50;
    if (savingsAnalysis.savingsRate >= 20) score += 20;
    else if (savingsAnalysis.savingsRate > 0) score += 10;
    else score -= 10;

    if (debtAnalysis.total === 0) score += 20;
    else if (debtAnalysis.debtToIncomeRatio <= 30) score += 10;
    else score -= 20;

    if (liquidityRatio >= 1.5) score += 10;

    score = Math.max(0, Math.min(100, score));

    // Calculate Grade and Label
    let grade = "C";
    let healthLabel = "Estable";
    let healthColor = "text-amber-500 bg-amber-50 border-amber-200";
    if (score >= 90) {
      grade = "A+";
      healthLabel = "Excelente";
      healthColor = "text-emerald-500 bg-emerald-50 border-emerald-200";
    } else if (score >= 80) {
      grade = "A";
      healthLabel = "Muy Buena";
      healthColor = "text-emerald-500 bg-emerald-50 border-emerald-200";
    } else if (score >= 70) {
      grade = "B";
      healthLabel = "Buena/Saludable";
      healthColor = "text-indigo-500 bg-indigo-50 border-indigo-200";
    } else if (score >= 50) {
      grade = "C";
      healthLabel = "Estable con Riesgos";
      healthColor = "text-amber-500 bg-amber-50 border-amber-200";
    } else if (score >= 30) {
      grade = "D";
      healthLabel = "Vulnerable";
      healthColor = "text-rose-500 bg-rose-50 border-rose-200";
    } else {
      grade = "F";
      healthLabel = "Crítica";
      healthColor = "text-red-500 bg-red-50 border-red-200";
    }

    // 3-Month Projections
    const avgInc = totalIncome / 12 || 0;
    const avgExp = totalExpense / 12 || 0;
    const monthlyNetSavings = avgInc - avgExp;
    const projections = [
      { month: "Mes 1", balance: totalBalance + monthlyNetSavings },
      { month: "Mes 2", balance: totalBalance + monthlyNetSavings * 2 },
      { month: "Mes 3", balance: totalBalance + monthlyNetSavings * 3 },
    ];

    // Money leaks (Fugas de dinero)
    const moneyLeaks = [] as string[];
    if ((100 - expenseAnalysis.fixedVsVariable.fixedPct) > 60) {
      moneyLeaks.push("Tus gastos variables representan más del 60% de tus egresos. Intenta reducirlos.");
    }
    expenseAnalysis.topCategories.slice(0, 2).forEach(cat => {
      if (cat.percentage > 35 && cat.name !== "Alquiler" && cat.name !== "Otros Gastos") {
        moneyLeaks.push(`El gasto en ${cat.name} es muy alto (S/ ${fmt(cat.amount)}), representando el ${cat.percentage.toFixed(1)}% de tus egresos.`);
      }
    });

    return {
      incomeAnalysis,
      expenseAnalysis,
      debtAnalysis,
      savingsAnalysis,
      liquidityRatio,
      riskAnalysis,
      score,
      grade,
      healthLabel,
      healthColor,
      projections,
      moneyLeaks,
      activeTx,
    };
  }, [activeTx, mIncome, mExpense, mBalance, totalIncome, totalExpense, totalBalance, pendingStats]);
}
