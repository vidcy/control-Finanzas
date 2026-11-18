import { useMemo } from 'react';

// Interfaces para los inputs
export interface PendingStats {
  payable: number;
  receivable: number;
  urgent: any[];
}

export interface PersonalAIProps {
  activeTx: any[];
  mIncome: number[];
  mExpense: number[];
  mBalance: number[];
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  pendingStats: PendingStats;
  accountBalances?: Record<string, number>;
  selectedMonth?: number | null;
  selectedYear?: number;
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

// Clasificación inteligente para la Regla 50/30/20
const isNeedsCategory = (catName: string, desc: string = ""): boolean => {
  const text = `${catName} ${desc}`.toLowerCase();
  const needsKeywords = [
    "vivienda", "alquiler", "hipoteca", "luz", "agua", "internet", "gas",
    "servicio", "servicios", "supermercado", "mercado", "comida del mes",
    "salud", "farmacia", "medicina", "médico", "medico", "seguro", "eps",
    "transporte", "combustible", "gasolina", "pasaje", "mantenimiento",
    "educación", "educacion", "colegio", "universidad", "pensión", "pension",
    "impuesto", "tributo", "sunat", "alimentos", "compras del hogar"
  ];
  return needsKeywords.some((k) => text.includes(k));
};

const isSavingsCategory = (catName: string, desc: string = ""): boolean => {
  const text = `${catName} ${desc}`.toLowerCase();
  const savingsKeywords = [
    "ahorro", "ahorros", "saving", "inversión", "inversion", "chanchito",
    "piggy", "fondo de emergencia", "depósito a plazo", "plazo fijo",
    "acciones", "fondos mutuos", "amortización", "capital deuda"
  ];
  return savingsKeywords.some((k) => text.includes(k));
};

const isAntExpense = (amount: number, catName: string, desc: string = ""): boolean => {
  if (amount > 45 || amount <= 0) return false;
  const text = `${catName} ${desc}`.toLowerCase();
  const antKeywords = [
    "café", "cafe", "snack", "golosina", "gaseosa", "taxi", "uber", "didi",
    "cabify", "delivery", "rappi", "pedidosya", "antojo", "tienda", "bodega",
    "cigarro", "recarga", "estacionamiento", "propina", "dulce", "helado"
  ];
  return antKeywords.some((k) => text.includes(k)) || (amount <= 25 && !text.includes("servicio"));
};

export function usePersonalAI({
  activeTx,
  mIncome,
  mExpense,
  mBalance,
  totalIncome,
  totalExpense,
  totalBalance,
  pendingStats,
  accountBalances = {},
  selectedMonth = null,
  selectedYear = new Date().getFullYear(),
}: PersonalAIProps) {
  return useMemo(() => {
    const now = new Date();
    const currentCalMonth = now.getMonth();
    const currentCalDay = now.getDate();
    const daysInCurrMonth = new Date(now.getFullYear(), currentCalMonth + 1, 0).getDate();
    const daysRemaining = Math.max(0, daysInCurrMonth - currentCalDay);

    // 1. Filtrar transacciones para el período de análisis
    const filteredTx = selectedMonth !== null
      ? activeTx.filter((t) => {
          const raw = t.paidAt || t.date || t.dueDate;
          if (!raw) return false;
          const d = new Date(raw);
          return !isNaN(d.getTime()) && d.getMonth() === selectedMonth;
        })
      : activeTx;

    // 2. Liquid Wealth Real (Suma de cuentas positivas disponibles)
    const liquidAccountsTotal = Object.values(accountBalances).reduce((sum, b) => sum + Math.max(0, b), 0);
    const effectiveLiquidity = liquidAccountsTotal > 0 ? liquidAccountsTotal : Math.max(0, totalBalance);

    // 3. Meses activos con actividad real (para promedios fidedignos, no dividir siempre entre 12 si van 3 meses)
    const activeMonthsCount = Math.max(1, mExpense.filter((exp, idx) => exp > 0 || mIncome[idx] > 0 || idx <= currentCalMonth).length);
    const avgMonthlyIncome = totalIncome > 0 ? totalIncome / activeMonthsCount : 0;
    const avgMonthlyExpense = totalExpense > 0 ? totalExpense / activeMonthsCount : 0;

    // 4. ANÁLISIS DE LA REGLA DE ORO 50/30/20
    let needsTotal = 0;
    let wantsTotal = 0;
    let savingsTotal = 0;
    const expenseByCategory: Record<string, { amount: number; count: number; isRecurrent: boolean }> = {};
    const antExpensesList: any[] = [];

    filteredTx.forEach((t) => {
      const amt = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
      const cat = t.category?.name || t.category || "Otros Gastos";
      const desc = t.description || "";

      if (t.type === "EXPENSE") {
        // Categorizar según 50/30/20
        if (isSavingsCategory(cat, desc)) {
          savingsTotal += amt;
        } else if (isNeedsCategory(cat, desc)) {
          needsTotal += amt;
        } else {
          wantsTotal += amt;
        }

        // Fugas / Gastos Hormiga
        if (isAntExpense(amt, cat, desc)) {
          antExpensesList.push({
            id: t.id,
            description: desc || cat,
            category: cat,
            amount: amt,
            date: t.paidAt || t.date,
          });
        }

        // Agrupación por categoría
        if (!expenseByCategory[cat]) {
          expenseByCategory[cat] = { amount: 0, count: 0, isRecurrent: false };
        }
        expenseByCategory[cat].amount += amt;
        expenseByCategory[cat].count += 1;
        const isRecurrent = desc.toLowerCase().includes("mensual") ||
          desc.toLowerCase().includes("suscrip") ||
          desc.toLowerCase().includes("fijo") ||
          cat.toLowerCase().includes("servicio") ||
          cat.toLowerCase().includes("alquiler");
        if (isRecurrent) expenseByCategory[cat].isRecurrent = true;
      } else if (t.type === "TRANSFER" && isSavingsCategory(cat, desc)) {
        savingsTotal += amt;
      }
    });

    // Añadir ahorro del chanchito si no se contó en transacciones directas
    const piggyBalance = Math.max(0, accountBalances["Chanchito"] || 0);
    const calculatedTotalSavings = savingsTotal > 0 ? savingsTotal : Math.max(0, totalBalance > 0 ? totalBalance * 0.2 : 0) + piggyBalance;

    const analyzedExpenseBase = totalExpense > 0 ? totalExpense : 1;
    const rule50_30_20 = {
      needs: {
        amount: needsTotal,
        percentage: (needsTotal / analyzedExpenseBase) * 100,
        idealPercentage: 50,
        status: (needsTotal / analyzedExpenseBase) * 100 <= 55 ? "HEALTHY" : "OVER_BUDGET",
        diffAmount: needsTotal - (analyzedExpenseBase * 0.5),
      },
      wants: {
        amount: wantsTotal,
        percentage: (wantsTotal / analyzedExpenseBase) * 100,
        idealPercentage: 30,
        status: (wantsTotal / analyzedExpenseBase) * 100 <= 35 ? "HEALTHY" : "OVER_BUDGET",
        diffAmount: wantsTotal - (analyzedExpenseBase * 0.3),
      },
      savings: {
        amount: calculatedTotalSavings,
        percentage: totalIncome > 0 ? (calculatedTotalSavings / totalIncome) * 100 : 0,
        idealPercentage: 20,
        status: (totalIncome > 0 && (calculatedTotalSavings / totalIncome) * 100 >= 18) ? "HEALTHY" : "UNDER_BUDGET",
        targetAmount: totalIncome * 0.20,
      },
    };

    // 5. DETECCIÓN DE GASTOS HORMIGA & FUGAS
    const antTotal = antExpensesList.reduce((acc, curr) => acc + curr.amount, 0);
    const antPercentage = totalExpense > 0 ? (antTotal / totalExpense) * 100 : 0;
    const antAnnualLeakage = (antTotal / Math.max(1, activeMonthsCount)) * 12;

    const antAnalysis = {
      count: antExpensesList.length,
      total: antTotal,
      percentage: antPercentage,
      annualImpact: antAnnualLeakage,
      items: antExpensesList.slice(0, 6),
    };

    // 6. RUNWAY & FONDO DE EMERGENCIA
    const emergencyMonths = avgMonthlyExpense > 0 ? effectiveLiquidity / avgMonthlyExpense : 0;
    const emergencyTarget3M = avgMonthlyExpense * 3;
    const emergencyTarget6M = avgMonthlyExpense * 6;
    const emergencyFundProgress = emergencyTarget3M > 0 ? Math.min(100, (effectiveLiquidity / emergencyTarget3M) * 100) : 0;

    let emergencyLevel: "CRITICAL" | "BASIC" | "OPTIMAL" | "FORTRESS" = "CRITICAL";
    let emergencyLabel = "Fondo Inexistente (< 1 mes)";
    if (emergencyMonths >= 6) {
      emergencyLevel = "FORTRESS";
      emergencyLabel = "Fortaleza Financiera (> 6 meses)";
    } else if (emergencyMonths >= 3) {
      emergencyLevel = "OPTIMAL";
      emergencyLabel = "Óptimo (3 a 6 meses)";
    } else if (emergencyMonths >= 1) {
      emergencyLevel = "BASIC";
      emergencyLabel = "Básico (1 a 3 meses)";
    }

    const runwayAnalysis = {
      months: emergencyMonths,
      days: Math.round(emergencyMonths * 30),
      currentAmount: effectiveLiquidity,
      target3M: emergencyTarget3M,
      target6M: emergencyTarget6M,
      progress3M: emergencyFundProgress,
      level: emergencyLevel,
      label: emergencyLabel,
      monthlyBurnRate: avgMonthlyExpense,
    };

    // 7. PREDICTIVE FORECAST (CIERRE DE MES)
    const currentMonthExpenses = mExpense[currentCalMonth] || 0;
    const currentMonthIncome = mIncome[currentCalMonth] || 0;
    const dailyBurnRateCurrentMonth = currentMonthExpenses / Math.max(1, currentCalDay);
    const projectedMonthEndExpense = currentMonthExpenses + (dailyBurnRateCurrentMonth * daysRemaining);
    const projectedMonthEndNet = currentMonthIncome - projectedMonthEndExpense;

    const monthForecast = {
      currentIncome: currentMonthIncome,
      currentExpense: currentMonthExpenses,
      dailyBurnRate: dailyBurnRateCurrentMonth,
      daysRemaining,
      projectedExpense: projectedMonthEndExpense,
      projectedNet: projectedMonthEndNet,
      status: projectedMonthEndNet >= 0 ? "SURPLUS" : "DEFICIT",
    };

    // 8. ESTRATEGIA DE DEUDAS (DTI & URGENCIA)
    const debtRatio = totalIncome > 0 ? (pendingStats.payable / totalIncome) * 100 : 0;
    const expiredDebts = pendingStats.urgent.filter((u) => u.dueInfo?.status === "EXPIRED");
    const todayDebts = pendingStats.urgent.filter((u) => u.dueInfo?.status === "TODAY");
    const liquidityRatio = pendingStats.payable > 0 ? effectiveLiquidity / pendingStats.payable : 99;

    let debtHealth: "SAFE" | "MODERATE" | "HIGH_RISK" | "CRITICAL" = "SAFE";
    if (expiredDebts.length > 0 || debtRatio > 50 || liquidityRatio < 0.8) {
      debtHealth = "CRITICAL";
    } else if (debtRatio > 35) {
      debtHealth = "HIGH_RISK";
    } else if (debtRatio > 20) {
      debtHealth = "MODERATE";
    }

    const debtStrategy = {
      totalPayable: pendingStats.payable,
      totalReceivable: pendingStats.receivable,
      netDebt: pendingStats.payable - pendingStats.receivable,
      debtRatio,
      debtHealth,
      expiredCount: expiredDebts.length,
      todayCount: todayDebts.length,
      liquidityRatio,
      urgentList: pendingStats.urgent,
    };

    // 9. TOP CATEGORÍAS & CONCENTRACIÓN DE RIESGO
    const topCategories = Object.entries(expenseByCategory)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        percentage: (data.amount / analyzedExpenseBase) * 100,
        count: data.count,
        isRecurrent: data.isRecurrent,
      }))
      .sort((a, b) => b.amount - a.amount);

    const concentrationAlerts: any[] = [];
    topCategories.forEach((cat) => {
      if (cat.percentage > 35 && !cat.name.toLowerCase().includes("alquiler") && !cat.name.toLowerCase().includes("vivienda")) {
        concentrationAlerts.push({
          category: cat.name,
          amount: cat.amount,
          percentage: cat.percentage,
          recommendedReduction: cat.amount * 0.15,
        });
      }
    });

    // 10. SCORING MULTIDIMENSIONAL (0 a 100)
    let scoreSavings = 0;
    const savingsRate = rule50_30_20.savings.percentage;
    if (savingsRate >= 20) scoreSavings = 25;
    else if (savingsRate >= 10) scoreSavings = 18;
    else if (savingsRate > 0) scoreSavings = 10;
    else scoreSavings = 2;

    let scoreDebt = 0;
    if (pendingStats.payable === 0) scoreDebt = 25;
    else if (debtRatio <= 20 && expiredDebts.length === 0) scoreDebt = 20;
    else if (debtRatio <= 35 && expiredDebts.length === 0) scoreDebt = 14;
    else if (debtRatio <= 50) scoreDebt = 7;
    else scoreDebt = 0;
    if (expiredDebts.length > 0) scoreDebt = Math.max(0, scoreDebt - 8);

    let scoreBudget = 0;
    if (rule50_30_20.wants.percentage <= 30 && antPercentage <= 10) scoreBudget = 20;
    else if (rule50_30_20.wants.percentage <= 40) scoreBudget = 14;
    else if (rule50_30_20.wants.percentage <= 50) scoreBudget = 8;
    else scoreBudget = 3;

    let scoreRunway = 0;
    if (emergencyMonths >= 6) scoreRunway = 15;
    else if (emergencyMonths >= 3) scoreRunway = 12;
    else if (emergencyMonths >= 1) scoreRunway = 7;
    else scoreRunway = 2;

    let scoreCashFlow = 0;
    const positiveMonths = mBalance.filter((b, idx) => b > 0 && (mIncome[idx] > 0 || mExpense[idx] > 0)).length;
    const recordedMonths = Math.max(1, mBalance.filter((_, idx) => mIncome[idx] > 0 || mExpense[idx] > 0).length);
    const flowRatio = positiveMonths / recordedMonths;
    if (totalBalance > 0 && flowRatio >= 0.75) scoreCashFlow = 15;
    else if (totalBalance >= 0 && flowRatio >= 0.5) scoreCashFlow = 10;
    else if (flowRatio >= 0.3) scoreCashFlow = 5;
    else scoreCashFlow = 1;

    const rawScore = scoreSavings + scoreDebt + scoreBudget + scoreRunway + scoreCashFlow;
    const score = Math.max(5, Math.min(100, Math.round(rawScore)));

    let grade = "C";
    let healthLabel = "Estable con Puntos de Mejora";
    let healthColor = "text-amber-600 bg-amber-50 border-amber-200";
    let healthDescription = "Tus finanzas se mantienen a flote, pero existen vulnerabilidades en el control de gastos o fondo de reserva.";

    if (score >= 90) {
      grade = "A+";
      healthLabel = "Fortaleza Financiera Total";
      healthColor = "text-emerald-750 bg-emerald-50 border-emerald-300";
      healthDescription = "Excelente gestión patrimonial. Cumples la regla 50/30/20, tienes fondo de reserva blindado y nula morosidad.";
    } else if (score >= 80) {
      grade = "A";
      healthLabel = "Salud Financiera Sobresaliente";
      healthColor = "text-emerald-650 bg-emerald-50 border-emerald-200";
      healthDescription = "Perfil muy sólido con buen ahorro y liquidez. Mantén el ritmo para pasar a fase de inversión patrimonial.";
    } else if (score >= 70) {
      grade = "B";
      healthLabel = "Saludable y en Crecimiento";
      healthColor = "text-indigo-650 bg-indigo-50 border-indigo-200";
      healthDescription = "Buen control general. Reduciendo pequeños gastos hormiga podrás acelerar tu fondo de emergencia.";
    } else if (score >= 50) {
      grade = "C";
      healthLabel = "Estable con Puntos de Mejora";
      healthColor = "text-amber-600 bg-amber-50 border-amber-200";
      healthDescription = "Estás en equilibrio justo. Si ocurre un imprevisto podrías requerir endeudamiento; urge reforzar ahorros.";
    } else if (score >= 35) {
      grade = "D";
      healthLabel = "Vulnerable / Alto Riesgo";
      healthColor = "text-rose-600 bg-rose-50 border-rose-200";
      healthDescription = "Gastos por encima de lo recomendado o deudas apremiantes. Es necesario aplicar un plan de choque.";
    } else {
      grade = "F";
      healthLabel = "Alerta Crítica";
      healthColor = "text-red-700 bg-red-50 border-red-300";
      healthDescription = "Situación financiera de emergencia. Los egresos superan los ingresos o existen deudas en mora.";
    }

    // 11. PLAN DE ACCIÓN Y RECOMENDACIONES TÉCNICAS PROFESIONALES
    const actionPlan: any[] = [];

    // Prioridad 1: Deudas vencidas
    if (expiredDebts.length > 0) {
      actionPlan.push({
        id: "act-expired-debts",
        priority: 1,
        type: "danger",
        title: "Pagar Deudas Vencidas en Mora",
        impact: `Regularizar ${expiredDebts.length} pendiente(s)`,
        message: `Tienes S/ ${fmt(expiredDebts.reduce((sum, d) => sum + d.amountSoles, 0))} en deudas vencidas que pueden generar intereses moratorios o afectar tu historial crediticio.`,
        actionText: "Ver pendientes vencidos",
        actionCategory: "Deudas",
        actionType: "Deudas Vencidas",
        targetRoute: "/pending?tab=PAYABLES",
      });
    }

    // Prioridad 2: Deudas para hoy
    if (todayDebts.length > 0) {
      actionPlan.push({
        id: "act-today-debts",
        priority: 2,
        type: "warning",
        title: "Compromisos con Vencimiento Hoy",
        impact: `S/ ${fmt(todayDebts.reduce((sum, d) => sum + d.amountSoles, 0))}`,
        message: `Tienes ${todayDebts.length} pago(s) programados para hoy. Abónalos antes del cierre bancario.`,
        actionText: "Pagar ahora",
        actionCategory: "Deudas",
        actionType: "Pagos Hoy",
        targetRoute: "/pending?tab=PAYABLES",
      });
    }

    // Prioridad 3: Desvío en Deseos (Regla 50/30/20)
    if (rule50_30_20.wants.status === "OVER_BUDGET" && rule50_30_20.wants.diffAmount > 0) {
      actionPlan.push({
        id: "act-wants-overbudget",
        priority: 3,
        type: "warning",
        title: "Ajustar Gastos en Deseos y Estilo de Vida",
        impact: `Ahorro potencial: S/ ${fmt(rule50_30_20.wants.diffAmount)}`,
        message: `Tus gastos no esenciales representan el ${rule50_30_20.wants.percentage.toFixed(1)}% de tus egresos (ideal: máx 30%). Moderar restaurantes y compras libres liberará liquidez inmediata.`,
        actionText: "Revisar egresos",
        actionCategory: "Gastos",
        actionType: "Ajuste Deseos",
        targetRoute: "/expenses",
      });
    }

    // Prioridad 4: Gastos hormiga detectados
    if (antAnalysis.total > 60) {
      actionPlan.push({
        id: "act-ant-expenses",
        priority: 4,
        type: "tip",
        title: "Frenar Fugas por 'Gastos Hormiga'",
        impact: `Ahorro anual: S/ ${fmt(antAnalysis.annualImpact, 0)}`,
        message: `Detectamos ${antAnalysis.count} micro-compras (cafés, taxis, delivery, snacks) sumando S/ ${fmt(antAnalysis.total)}. Reduciéndolos a la mitad sumarías S/ ${fmt(antAnalysis.annualImpact / 2, 0)} a tu patrimonio este año.`,
        actionText: "Ver detalle de gastos",
        actionCategory: "Gastos",
        actionType: "Gastos Hormiga",
        targetRoute: "/expenses",
      });
    }

    // Prioridad 5: Fondo de Emergencia
    if (emergencyMonths < 3 && avgMonthlyExpense > 0) {
      const neededFor3M = Math.max(0, emergencyTarget3M - effectiveLiquidity);
      actionPlan.push({
        id: "act-emergency-fund",
        priority: 5,
        type: "opportunity",
        title: "Construir tu Fondo de Reserva (3 Meses)",
        impact: `Meta: S/ ${fmt(neededFor3M)} restantes`,
        message: `Tu saldo cubre ${emergencyMonths.toFixed(1)} meses de gastos. Lo prudente ante emergencias laborales o de salud es acumular al menos 3 meses (S/ ${fmt(emergencyTarget3M)}).`,
        actionText: "Transferir al Chanchito",
        actionCategory: "Ahorro",
        actionType: "Fondo Emergencia",
        targetRoute: "/pigg",
      });
    }

    // Prioridad 6: Cobranzas pendientes por cobrar
    if (pendingStats.receivable > 0) {
      actionPlan.push({
        id: "act-receivables",
        priority: 6,
        type: "success",
        title: "Cobrar Dinero a Tu Favor",
        impact: `Recuperar: S/ ${fmt(pendingStats.receivable)}`,
        message: `Tienes S/ ${fmt(pendingStats.receivable)} registrados como cuentas por cobrar. Gestionar su cobro inyectará liquidez directa a tu flujo de caja.`,
        actionText: "Ver cobranzas",
        actionCategory: "Ingresos",
        actionType: "Cobranza",
        targetRoute: "/pending?tab=RECEIVABLES",
      });
    }

    // Proyecciones a 3 meses
    const monthlyNetSavings = avgMonthlyIncome - avgMonthlyExpense;
    const projections = [
      { month: "En 1 Mes", balance: totalBalance + monthlyNetSavings },
      { month: "En 2 Meses", balance: totalBalance + monthlyNetSavings * 2 },
      { month: "En 3 Meses", balance: totalBalance + monthlyNetSavings * 3 },
    ];

    return {
      score,
      grade,
      healthLabel,
      healthColor,
      healthDescription,
      scoreBreakdown: {
        savings: { score: scoreSavings, max: 25, label: "Tasa de Ahorro" },
        debt: { score: scoreDebt, max: 25, label: "Control de Deudas" },
        budget: { score: scoreBudget, max: 20, label: "Regla 50/30/20 & Fugas" },
        runway: { score: scoreRunway, max: 15, label: "Fondo de Emergencia" },
        cashFlow: { score: scoreCashFlow, max: 15, label: "Flujo de Caja Neto" },
      },
      rule50_30_20,
      antAnalysis,
      runwayAnalysis,
      monthForecast,
      debtStrategy,
      topCategories,
      concentrationAlerts,
      actionPlan,
      projections,
      activeTx: filteredTx,
      avgMonthlyIncome,
      avgMonthlyExpense,
      effectiveLiquidity,
    };
  }, [
    activeTx,
    mIncome,
    mExpense,
    mBalance,
    totalIncome,
    totalExpense,
    totalBalance,
    pendingStats,
    accountBalances,
    selectedMonth,
    selectedYear,
  ]);
}
