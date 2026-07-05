import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Sparkles,
  Send,
  MessageSquare,
  User,
  ArrowRight,
  HelpCircle,
  Minus,
  GripHorizontal,
  X,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactionsRequest } from '../../services/transaction.api';

interface PersonalAIChatFloatingProps {
  analysis?: any;
  onActionClick?: (
    category: string,
    type: string,
    subCategoryId?: string,
    module?: string,
    tab?: string
  ) => void;
}

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

interface Message {
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
  actions?: Array<{ label: string; onClick: () => void }>;
}

const PROMPT_PHRASES = [
  "¡Hola! Soy Think, tu asesor financiero. 🤖 Pregúntame lo que quieras.",
  "¿Quieres saber tus mayores fugas de dinero de este mes? 📉 Haz clic aquí.",
  "¿Cómo se aplica la regla 50/30/20 a tus finanzas? 📊 Pregúntame.",
  "¿Cómo optimizar tus impuestos de SUNAT en Perú? 🇵🇪 Escríbeme.",
  "¿Cuánto gastaste en Comida o Alquiler este mes? 🔍 Consúltame.",
  "¿Quieres calcular tu fondo de emergencia ideal? 🛡️ Pulsa aquí."
];

// Helper to compute analysis locally if not passed as a prop
function computeAnalysisEngine(personalTx: any[]) {
  let income = 0;
  let expense = 0;
  let payable = 0;
  let receivable = 0;
  const urgent: any[] = [];
  const now = new Date();

  // Monthly trends (12 items)
  const mIncome = Array(12).fill(0);
  const mExpense = Array(12).fill(0);
  const mBalance = Array(12).fill(0);

  personalTx.forEach((t: any) => {
    const amt = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
    
    // Parse date for monthly trends
    const dateStr = t.paidAt || t.dueDate || t.date;
    const d = dateStr ? new Date(dateStr) : null;
    const monthIdx = d && !isNaN(d.getTime()) ? d.getMonth() : now.getMonth();

    if (t.status === "PAID") {
      if (t.type === "INCOME") {
        income += amt;
        mIncome[monthIdx] += amt;
      } else if (t.type === "EXPENSE") {
        expense += amt;
        mExpense[monthIdx] += amt;
      }
    } else {
      // pending
      if (t.type === "EXPENSE") {
        payable += amt;
        if (d) {
          const diffTime = d.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          let status = "FUTURE";
          if (diffDays < 0) status = "EXPIRED";
          else if (diffDays === 0) status = "TODAY";
          urgent.push({ ...t, dueInfo: { status, diffDays } });
        }
      } else if (t.type === "INCOME") {
        receivable += amt;
      }
    }
  });

  // Calculate monthly balance
  for (let i = 0; i < 12; i++) {
    mBalance[i] = mIncome[i] - mExpense[i];
  }

  // Calculate Chanchito balance to get accurate total balance
  let chanchito = 0;
  personalTx.forEach((t) => {
    if (t.status !== "PAID") return;
    const amt = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);

    if (t.type === "TRANSFER") {
      if (t.destinationAccount?.toLowerCase().includes("chanchito")) {
        chanchito += amt;
      }
      if (t.originAccount?.toLowerCase().includes("chanchito")) {
        chanchito -= amt;
      }
    }
  });

  const totalBalance = income - expense;
  const pendingStats = { payable, receivable, urgent };

  const currentMonth = now.getMonth();
  const debtRatio = pendingStats.payable > 0 && income > 0 ? (pendingStats.payable / income) * 100 : 0;
  const liquidityRatio = totalBalance > 0 ? totalBalance / pendingStats.payable : Infinity;

  const calculateTrend = (data: number[]) => {
    const past = data.slice(0, Math.max(0, currentMonth + 1 - 3));
    const recent = data.slice(Math.max(0, currentMonth + 1 - 3), currentMonth + 1);
    if (past.length === 0 || past.reduce((a, b) => a + b, 0) === 0) return 0;
    return ((recent.reduce((a, b) => a + b, 0) / past.reduce((a, b) => a + b, 0)) - 1) * 100;
  };

  const incomeTrend = calculateTrend(mIncome);
  const expenseTrend = calculateTrend(mExpense);

  const incomeAnalysis = {
    total: income,
    averageMonthly: income / 12,
    growthRate: incomeTrend,
    diversification: 0,
    categories: {} as Record<string, { amount: number; percentage: number }>,
    seasonality: [] as { month: string; amount: number; vsAveragePct: number }[],
  };

  const incomeByCategory: Record<string, number> = {};
  personalTx.forEach((t) => {
    if (t.type === "INCOME" && t.status === "PAID") {
      const cat = t.category?.name || t.category || "Otros";
      const amount = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amount;
    }
  });

  const incomeCategories = Object.entries(incomeByCategory);
  if (incomeCategories.length > 0) {
    const mainSourcePct = (incomeCategories[0][1] / income) * 100;
    incomeAnalysis.diversification = Math.max(0, 100 - mainSourcePct);
  }

  incomeCategories.forEach(([name, amount]) => {
    incomeAnalysis.categories[name] = { amount, percentage: (amount / income) * 100 };
  });

  mIncome.forEach((amount, i) => {
    const avgMonthly = income / 12;
    const vsAveragePct = avgMonthly > 0 ? ((amount - avgMonthly) / avgMonthly) * 100 : 0;
    incomeAnalysis.seasonality.push({ month: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"][i], amount, vsAveragePct });
  });

  const expenseAnalysis = {
    total: expense,
    averageMonthly: expense / 12,
    growthRate: expenseTrend,
    fixedVsVariable: { fixed: 0, variable: 0, fixedPct: 0 },
    topCategories: [] as { name: string; amount: number; percentage: number; isRecurrent: boolean }[],
    savingsOpportunities: [] as { category: string; amount: number; percentage: number; potentialSavings: number }[],
  };

  const expenseByCategory: Record<string, { amount: number; isRecurrent: boolean }> = {};
  personalTx.forEach((t) => {
    if (t.type === "EXPENSE" && t.status === "PAID") {
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
    const percentage = (data.amount / expense) * 100;
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
  expenseAnalysis.fixedVsVariable = { fixed: fixedExpenses, variable: variableExpenses, fixedPct: (fixedExpenses / expense) * 100 };

  const debtAnalysis = {
    total: pendingStats.payable,
    totalReceivable: pendingStats.receivable,
    netDebt: pendingStats.payable - pendingStats.receivable,
    debtToIncomeRatio: debtRatio,
    debtToBalanceRatio: pendingStats.payable > 0 && totalBalance > 0 ? (pendingStats.payable / totalBalance) * 100 : 0,
    expired: pendingStats.urgent.filter((u) => u.dueInfo.status === "EXPIRED").length,
    dueToday: pendingStats.urgent.filter((u) => u.dueInfo.status === "TODAY").length,
  };

  let explicitSavings = 0;
  personalTx.forEach((t) => {
    if (t.type === "INCOME" && (t.category?.name?.toLowerCase().includes("ahorro") || t.category?.name?.toLowerCase().includes("saving"))) {
      explicitSavings += Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
    }
  });

  const totalSavings = totalBalance + explicitSavings;
  const savingsAnalysis = {
    total: totalSavings,
    savingsRate: income > 0 ? (totalSavings / income) * 100 : 0,
    emergencyFund: {
      months: expense > 0 ? Math.floor(totalSavings / (expense / 12)) : 0,
      amount: totalSavings,
    },
  };

  const riskAnalysis = {
    critical: [] as any[],
    warnings: [] as any[],
    opportunities: [] as any[],
  };

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

  let score = 50;
  if (savingsAnalysis.savingsRate >= 20) score += 20;
  else if (savingsAnalysis.savingsRate > 0) score += 10;
  else score -= 10;

  if (debtAnalysis.total === 0) score += 20;
  else if (debtAnalysis.debtToIncomeRatio <= 30) score += 10;
  else score -= 20;

  if (liquidityRatio >= 1.5) score += 10;

  score = Math.max(0, Math.min(100, score));

  let grade = "C";
  let healthLabel = "Estable";
  if (score >= 90) {
    grade = "A+";
    healthLabel = "Excelente";
  } else if (score >= 80) {
    grade = "A";
    healthLabel = "Muy Buena";
  } else if (score >= 70) {
    grade = "B";
    healthLabel = "Buena/Saludable";
  } else if (score >= 50) {
    grade = "C";
    healthLabel = "Estable con Riesgos";
  } else if (score >= 30) {
    grade = "D";
    healthLabel = "Vulnerable";
  } else {
    grade = "F";
    healthLabel = "Crítica";
  }

  const avgInc = income / 12 || 0;
  const avgExp = expense / 12 || 0;
  const monthlyNetSavings = avgInc - avgExp;
  const projections = [
    { month: "Mes 1", balance: totalBalance + monthlyNetSavings },
    { month: "Mes 2", balance: totalBalance + monthlyNetSavings * 2 },
    { month: "Mes 3", balance: totalBalance + monthlyNetSavings * 3 },
  ];

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
    projections,
    moneyLeaks,
    activeTx: personalTx,
  };
}

export default function PersonalAIChatFloating({ analysis, onActionClick }: PersonalAIChatFloatingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const navigate = useNavigate();

  // Self-loading state if analysis not passed
  const [localAnalysis, setLocalAnalysis] = useState<any>(null);

  const loadLocalData = async () => {
    try {
      const allTx = await getTransactionsRequest();
      const personalTx = Array.isArray(allTx) ? allTx.filter((t: any) => t.workspace === "PERSONAL") : [];
      const computed = computeAnalysisEngine(personalTx);
      setLocalAnalysis(computed);
    } catch (e) {
      console.error("Error loading advisor data:", e);
    }
  };

  useEffect(() => {
    if (!analysis) {
      loadLocalData();
      // Listen to transaction updates
      window.addEventListener("transactionCreated", loadLocalData);
      return () => window.removeEventListener("transactionCreated", loadLocalData);
    }
  }, [analysis]);

  const activeAnalysis = analysis || localAnalysis;

  // Rotador de frases
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [showSpeechBubble, setShowSpeechBubble] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setShowSpeechBubble(false);
      return;
    }

    const interval = setInterval(() => {
      setPhraseIdx(prev => (prev + 1) % PROMPT_PHRASES.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Inicializar mensaje de bienvenida
  useEffect(() => {
    if (activeAnalysis && messages.length === 0) {
      setMessages([
        {
          sender: 'ai',
          text: `¡Hola! Soy tu **Chat Asesor Financiero Think**. 🤖✨\n\nHe completado el escaneo avanzado de tu flujo financiero de este mes. Tu score actual es **${activeAnalysis.score}/100** (**${activeAnalysis.healthLabel}**).\n\n¿En qué puedo asistirte hoy? Escribe tu duda o usa uno de los atajos rápidos de abajo.`,
          timestamp: new Date()
        }
      ]);
    }
  }, [activeAnalysis]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const handleAction = (
    category: string,
    type: string,
    subCategoryId?: string,
    module?: string,
    tab?: string
  ) => {
    if (onActionClick) {
      onActionClick(category, type, subCategoryId, module, tab);
      return;
    }

    // Default route navigation using react-router-dom
    const queryParams = new URLSearchParams();
    if (category) queryParams.set("category", category);
    if (subCategoryId) queryParams.set("subCategoryId", subCategoryId);
    if (module) queryParams.set("module", module);
    if (tab) queryParams.set("tab", tab);

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
      navigate(`/dashboard?${queryParams.toString()}`);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || !activeAnalysis) return;

    // Agregar mensaje del usuario
    const userMsg: Message = {
      sender: 'user',
      text: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Procesamiento cognitivo avanzado ("Nivel Más Alto")
    setTimeout(() => {
      let replyText = "";
      let actions: Array<{ label: string; onClick: () => void }> = [];

      const query = text.toLowerCase().trim();
      const avgInc = activeAnalysis.incomeAnalysis.averageMonthly || 0;
      const avgExp = activeAnalysis.expenseAnalysis.averageMonthly || 0;
      const emergencyAmount = activeAnalysis.savingsAnalysis.emergencyFund.amount || 0;
      const emergencyMonths = activeAnalysis.savingsAnalysis.emergencyFund.months || 0;
      const payableDebt = activeAnalysis.debtAnalysis.total || 0;
      const receivableDebt = activeAnalysis.debtAnalysis.totalReceivable || 0;
      const transactions = activeAnalysis.activeTx || [];
      const score = activeAnalysis.score || 50;
      const healthLabel = activeAnalysis.healthLabel || "Estable";

      // ── 1. DETECTAR MAYOR GASTO REGISTRADO ──
      if (query.includes("mayor gasto") || query.includes("gasto mas alto") || query.includes("gasto maximo") || query.includes("mas caro") || query.includes("gasto mas grande") || query.includes("gasto mayor")) {
        const expenses = transactions.filter((t: any) => t.type === "EXPENSE" && t.status === "PAID");
        let maxExpense: any = null;
        let maxExpenseAmt = 0;
        expenses.forEach((t: any) => {
          const amt = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
          if (amt > maxExpenseAmt) {
            maxExpenseAmt = amt;
            maxExpense = t;
          }
        });

        if (maxExpense) {
          const dateStr = maxExpense.paidAt || maxExpense.date;
          const tDate = dateStr ? new Date(dateStr).toLocaleDateString("es-PE", { day: "2-digit", month: "long" }) : "este mes";
          const pct = activeAnalysis.expenseAnalysis.total > 0 ? (maxExpenseAmt / activeAnalysis.expenseAnalysis.total) * 100 : 0;
          
          replyText = `### Tu Mayor Gasto Registrado este Mes 📊🛍️\n\n` +
            `El mayor gasto de este mes asciende a **S/ ${fmt(maxExpenseAmt)}** y fue registrado el **${tDate}**.\n\n` +
            `* **Descripción:** ${maxExpense.description || "Sin descripción"}\n` +
            `* **Categoría:** ${maxExpense.category?.name || maxExpense.category || "Varios"}\n` +
            `* **Método de Pago/Cuenta:** ${maxExpense.originAccount || "Efectivo/General"}\n\n` +
            `**Análisis de Impacto Think:**\n` +
            `Este único movimiento representa el **${pct.toFixed(1)}%** de tus egresos totales del mes (S/ ${fmt(activeAnalysis.expenseAnalysis.total)}). ` +
            (pct > 25 
              ? `⚠️ Es un gasto sumamente concentrado. Te aconsejo evaluar si se trata de un gasto único excepcional o si es recurrente, ya que ejerce una gran presión en tu balance diario.` 
              : `✅ Se mantiene en una proporción moderada en comparación con tu flujo de caja general.`);
          
          actions.push({
            label: "Ver Todos los Egresos",
            onClick: () => handleAction("", "Egresos")
          });
        } else {
          replyText = `### Tu Mayor Gasto Registrado 📊🛍️\n\n` +
            `Actualmente **no he encontrado ningún gasto pagado** en tu registro de transacciones. Asegúrate de tener egresos registrados este mes para poder calcular tu gasto máximo.`;
        }
      }
      // ── 2. DETECTAR DÓNDE SE VA EL DINERO / EN QUÉ GASTO MÁS ──
      else if (query.includes("en que gasto mas") || query.includes("donde se va mi dinero") || query.includes("mis mayores consumos") || query.includes("mayores gastos") || query.includes("top de gastos") || query.includes("top categorias") || query.includes("peores gastos")) {
        const topCategories = activeAnalysis.expenseAnalysis.topCategories || [];
        if (topCategories.length > 0) {
          replyText = `### Distribución de tus Mayores Gastos 💸📊\n\n` +
            `He consolidado tus consumos de este periodo y aquí están las categorías en las que destinas más capital:\n\n` +
            `| Puesto | Categoría | Total Gastado | Porcentaje |\n` +
            `| :--- | :--- | :--- | :--- |\n` +
            topCategories.slice(0, 4).map((cat: any, idx: number) => {
              const icons = ["🥇 1.", "🥈 2.", "🥉 3.", "🏅 4."];
              return `| ${icons[idx] || `${idx + 1}.`} | **${cat.name}** | S/ ${fmt(cat.amount)} | ${cat.percentage.toFixed(1)}% |`;
            }).join("\n") +
            `\n\n**Diagnóstico Think de Consumo:**\n` +
            `Tu categoría principal de egresos es **${topCategories[0]?.name}** con un **${topCategories[0]?.percentage.toFixed(1)}%** del presupuesto. ` +
            (topCategories[0]?.percentage > 35 
              ? `Existe una sobre-concentración de capital aquí. Si recortas solo un **10%** en consumos dentro de **${topCategories[0]?.name}**, liberarías **S/ ${fmt(topCategories[0]?.amount * 0.1)}** libres de ahorro mensual.`
              : `Tus consumos se encuentran diversificados de manera saludable entre múltiples categorías.`);
          
          actions.push({
            label: "Ver Egresos por Categorías",
            onClick: () => handleAction("", "Egresos")
          });
        } else {
          replyText = `### Distribución de tus Gastos 💸📊\n\n` +
            `No registras egresos este mes. Cuando registres transacciones de egreso, verás aquí un ranking dinámico con porcentajes.`;
        }
      }
      // ── 3. PLAN DE AHORRO PERSONALIZADO ──
      else if (query.includes("como ahorrar") || query.includes("plan de ahorro") || query.includes("ahorrar") || query.includes("meta de ahorro")) {
        const matchNum = query.match(/\d+/);
        const amountToSave = matchNum ? parseInt(matchNum[0]) : 300;

        replyText = `### Plan Estratégico Think: Ahorrar S/ ${fmt(amountToSave, 0)} 🎯💡\n\n` +
          `Para alcanzar tu meta mensual de **S/ ${fmt(amountToSave, 0)}**, te propongo este plan de acción optimizado basado en tus números actuales:\n\n` +
          `1. 💰 **El Método "Págate a ti Primero"**: Apenas recibas tus ingresos, transfiere **S/ ${fmt(amountToSave, 0)}** directamente al **Chanchito** o a una cuenta de ahorros de alto rendimiento separada. Vive solo con la diferencia.\n` +
          `2. ✂️ **Ajuste de Variables (Ocio/Delivery)**: Identificando tus gastos fijos vs variables, te sugiero recortar un **15%** en compras discrecionales. Esto liberaría un estimado de **S/ ${fmt(activeAnalysis.expenseAnalysis.fixedVsVariable.variable * 0.15, 0)}** mensuales.\n` +
          `3. 🔌 **Fugas Hormiga**: Revisa suscripciones que no uses (Netflix, Spotify duplicados) y disminuye el consumo diario de café exterior o comidas rápidas. Esto aporta unos **S/ 70 a S/ 100** mensuales adicionales.\n\n` +
          `**¿Por qué es viable para ti?**\n` +
          `Tus ingresos mensuales de **S/ ${fmt(avgInc)}** te dan el margen para retener esta cifra. Tu tasa de ahorro subiría al **${((amountToSave / Math.max(avgInc, 1)) * 100).toFixed(1)}%**, acercándote al pilar del 20% recomendado en finanzas personales.`;

        actions.push({
          label: "Ir al Chanchito Ahorrador",
          onClick: () => handleAction("", "Chanchito")
        });
      }
      // ── 4. DETECTAR EVALUACIÓN E CONSEJOS DEL SCORE ──
      else if (query.includes("mi score") || query.includes("mi puntaje") || query.includes("mejorar mi score") || query.includes("salud financiera") || query.includes("diagnostico") || query.includes("como estoy")) {
        let adviceText = "";
        if (score >= 80) {
          adviceText = `🏆 **¡Tu salud financiera está en nivel excelente!** Tu puntaje de **${score}/100** indica una gestión de deudas impecable y buena tasa de retención.\n\n` +
            `**Tus siguientes pasos:**\n` +
            `* **Inversión Activa**: No dejes tu dinero ocioso en cuentas corrientes bancarias tradicionales. Evalúa fondos mutuos de renta fija, depósitos a plazo fijo digital o factoring supervisado por la SBS.\n` +
            `* **Maximizar Ahorro**: Proyecta tus excedentes hacia fondos de inversión con mayor rentabilidad histórica.`;
        } else if (score >= 50) {
          adviceText = `⚖️ **Tu salud financiera está en rango estable con riesgos.** Tu puntaje es de **${score}/100**.\n\n` +
            `**Acciones inmediatas para subir a Rango A:**\n` +
            `* **Reduce Deudas**: Tu ratio de deudas sobre ingresos es de **${activeAnalysis.debtAnalysis.debtToIncomeRatio.toFixed(1)}%**. Mantén esta cifra siempre por debajo de 30%.\n` +
            `* **Automatiza el ahorro**: Configura una transferencia automática interbancaria del **10% al 15%** de tus ingresos apenas los recibas.`;
        } else {
          adviceText = `🚨 **Alerta: Tu salud financiera está en nivel crítico/vulnerable.** Tu score es de **${score}/100**.\n\n` +
            `**Plan de contingencia Think:**\n` +
            `* **Construye tu primer escudo**: Enfócate en tener un fondo de emergencia mínimo equivalente a 1 mes de gastos (S/ ${fmt(avgExp)}).\n` +
            `* **Consolida Deudas**: Tienes deudas de tarjetas o préstamos por pagar de **S/ ${fmt(payableDebt)}**. Consolida tus deudas bajo una sola tasa menor en otra entidad financiera.`;
        }

        replyText = `### Diagnóstico Inteligente de tu Score Financiero 🔬🧬\n\n` +
          `Evaluación del Perfil: **${score}/100** - Rango **${healthLabel}** (Grado **${activeAnalysis.grade}**)\n\n` +
          adviceText;
          
        actions.push({
          label: "Ver Simulador de Deuda",
          onClick: () => handleAction("", "Simulador")
        });
      }
      // ── 5. DETECTAR IMPUESTOS, SUNAT, RECIBOS POR HONORARIOS EN PERÚ ──
      else if (query.includes("sunat") || query.includes("impuesto") || query.includes("recibo") || query.includes("honorarios") || query.includes("deducir") || query.includes("planilla") || query.includes("declarar") || query.includes("renta")) {
        replyText = `### Guía de Tributación e Impuestos en Perú 🇵🇪💼\n\n` +
          `Para optimizar legalmente tus impuestos ante la **SUNAT**, ten en cuenta estas directrices del Impuesto a la Renta de Personas Naturales:\n\n` +
          `1. 📄 **Recibos por Honorarios (Cuarta Categoría)**:\n` +
          `   * Si tus ingresos anuales son menores a **S/ 45,063** (monto referencial anual 2024), puedes tramitar la **Suspensión de Retenciones de Cuarta Categoría** para evitar que te retengan el 8% en cada recibo superior a S/ 1,500.\n` +
          `   * Tienes una deducción directa automática del 20% de tus ingresos por gastos de ejercicio.\n\n` +
          `2. 🛡️ **Deducción Adicional de 3 UIT (S/ 15,450)**:\n` +
          `   * Si estás en Planilla (Quinta) o emites Recibos (Cuarta), puedes deducir gastos personales para que la SUNAT te devuelva dinero de tus impuestos anuales.\n` +
          `   * **Consumos en Restaurantes, Bares y Hoteles**: Exige boleta electrónica con tu **número de DNI** para deducir el **15%** del total de la boleta.\n` +
          `   * **Alquiler de Vivienda**: Puedes deducir el **30%** del pago mensual.\n` +
          `   * **Servicios Médicos u Odontológicos**: Exige recibo por honorario electrónico para deducir el **30%** de la consulta.\n\n` +
          `*💡 Recomendación Think:* El proceso de devolución automática de SUNAT ocurre en marzo de cada año. Asegúrate de pedir siempre boletas de venta vinculadas a tu DNI al consumir fuera.`;
      }
      // ── 6. DETECTAR CUENTAS / SALDOS / RENTABILIZAR DINERO EN PERÚ (SBS, PLAZO FIJO, CTS) ──
      else if (query.includes("sbs") || query.includes("caja") || query.includes("plazo fijo") || query.includes("donde ahorrar") || query.includes("cts") || query.includes("rentabilizar") || query.includes("interes") || query.includes("dolar") || query.includes("cambio") || query.includes("banco")) {
        replyText = `### Guía para Rentabilizar tus Ahorros en Perú 🏦📈\n\n` +
          `El dinero guardado en cuentas de ahorros tradicionales de los bancos más conocidos rinde cerca al 0.1% anual. Aquí te muestro alternativas para hacerlo crecer de forma segura:\n\n` +
          `1. 🛡️ **El Fondo de Seguro de Depósitos (FSD)**:\n` +
          `   * Asegúrate de elegir entidades reguladas por la **SBS** (Superintendencia de Banca, Seguros y AFP).\n` +
          `   * El FSD protege tus ahorros y sus intereses acumulados hasta por un monto máximo de **S/ 121,500** (cifra variable actualizada trimestralmente) en caso de que la entidad quiebre.\n\n` +
          `2. 🏦 **Bancos vs. Cajas y Financieras**:\n` +
          `   * Las Cajas Municipales (ej. Arequipa, Piura, Huancayo) y Financieras (ej. Efectiva, Oh, Credinka) pagan tasas de rendimiento efectiva anual (**TREA**) de hasta **6% a 7.5%** por depósitos a plazo fijo o cuentas de ahorro de alto rendimiento.\n` +
          `   * Tienen exactamente el mismo nivel de protección bajo el FSD que los grandes bancos nacionales.\n\n` +
          `3. 💵 **Optimización de Cambio de Divisas**:\n` +
          `   * Evita comprar o vender dólares en la ventanilla de bancos comerciales tradicionales ya que el spread (diferencia entre compra y venta) suele ser excesivamente alto (cercano al 4%).\n` +
          `   * Emplea casas de cambio digitales con registro SBS para ahorrar un promedio de **S/ 35 a S/ 50 por cada $1000** cambiados.`;
      }
      // ── 7. REGLA 50/30/20 ──
      else if (query.includes("50/30/20") || query.includes("regla") || query.includes("distribuci")) {
        const fixed = activeAnalysis.expenseAnalysis.fixedVsVariable.fixed || 0;
        const variable = activeAnalysis.expenseAnalysis.fixedVsVariable.variable || 0;
        const savings = Math.max(0, avgInc - (fixed + variable));
        
        const fixedPct = avgInc > 0 ? (fixed / avgInc) * 100 : 0;
        const variablePct = avgInc > 0 ? (variable / avgInc) * 100 : 0;
        const savingsPct = avgInc > 0 ? (savings / avgInc) * 100 : 0;

        replyText = `### Presupuesto bajo la Regla 50/30/20 📊\n\n` +
          `Basado en tus ingresos promedios mensuales de **S/ ${fmt(avgInc)}**, la distribución matemática recomendada vs tu estado actual es:\n\n` +
          `| Pilar | Recomendado | Tu Estado Real | Diagnóstico |\n` +
          `| :--- | :--- | :--- | :--- |\n` +
          `| **Necesidades (Fijos)** | 50% (S/ ${fmt(avgInc * 0.5, 0)}) | ${fixedPct.toFixed(1)}% (S/ ${fmt(fixed, 0)}) | ${fixedPct > 50 ? '⚠️ Excedido' : '✅ Saludable'} |\n` +
          `| **Deseos (Variables)** | 30% (S/ ${fmt(avgInc * 0.3, 0)}) | ${variablePct.toFixed(1)}% (S/ ${fmt(variable, 0)}) | ${variablePct > 30 ? '⚠️ Elevado' : '✅ Óptimo'} |\n` +
          `| **Ahorro / Inversión** | 20% (S/ ${fmt(avgInc * 0.2, 0)}) | ${savingsPct.toFixed(1)}% (S/ ${fmt(savings, 0)}) | ${savingsPct < 20 ? '🚨 Ajustado' : '🏆 Sobresaliente'} |\n\n` +
          `**Recomendación de Optimización:**\n` +
          (fixedPct > 50 
            ? `• Tu nivel de gastos fijos está asfixiando tu liquidez. Analiza tus facturas de telefonía, luz, plataformas de streaming o evalúa consolidar deudas.\n` 
            : `• Tus gastos fijos están muy equilibrados. Tienes espacio libre para potenciar tus inversiones.\n`) +
          (savingsPct < 20
            ? `• Estás ahorrando menos del 20% recomendado. Adopta el método **"Págate a ti primero"**: transfiere el 10% a 15% de tu sueldo a una cuenta de ahorros separada apenas lo cobres.`
            : `• ¡Excelente ritmo de acumulación! Sigue manteniendo esa disciplina.`);

        actions.push({
          label: "Ver Presupuestos",
          onClick: () => handleAction("", "Presupuestos")
        });
      }
      // ── 8. RATIOS DE SOLVENCIA Y LIQUIDEZ ──
      else if (query.includes("ratio") || query.includes("solvencia") || query.includes("liquidez") || query.includes("salud") || query.includes("endeudamiento")) {
        const liq = activeAnalysis.liquidityRatio;
        const savingsRate = activeAnalysis.savingsAnalysis.savingsRate || 0;
        
        replyText = `### Ratios Avanzados de Liquidez y Solvencia 🔬⚖️\n\n` +
          `He calculado tus indicadores clave de solvencia basados en tu balance actual:\n\n` +
          `1. ⚖️ **Ratio de Liquidez Corriente**: **${liq === Infinity ? 'Sin Deudas' : `${fmt(liq, 2)}`}**\n` +
          `   *Interpretación:* Este indicador mide cuántos soles tienes en activos líquidos por cada sol de deuda a corto plazo. Un ratio de **1.5 a 2.0 es el estándar óptimo**. ` + 
          (liq < 1.2 ? `Tu ratio está por debajo del límite de seguridad, lo que indica vulnerabilidad si te exigen cobrar tus deudas de inmediato.` : `Tienes un colchón de solvencia robusto para afrontar imprevistos.`) + `\n` +
          `2. 📈 **Tasa de Ahorro Neto**: **${savingsRate.toFixed(1)}%**\n` +
          `   *Interpretación:* Representa la porción de tus ingresos libres que logras retener cada mes. Si mantienes esta tasa superior al **20%**, acelerarás tu libertad financiera significativamente.\n` +
          `3. 🛡️ **Ratio de Resiliencia (Meses de Fondo)**: **${emergencyMonths.toFixed(1)} meses**\n` +
          `   *Interpretación:* La cantidad de meses que podrías sobrevivir manteniendo tu estilo de vida actual si tus ingresos principales cayeran a cero.`;

        actions.push({
          label: "Ver Simulador de Deuda",
          onClick: () => handleAction("", "Simulador")
        });
      }
      // ── 9. GESTIÓN DE DEUDAS ──
      else if (query.includes("deuda") || query.includes("pendiente") || query.includes("pagar") || query.includes("cobrar")) {
        replyText = `### Gestión Inteligente de Deudas 💳🛡️\n\n` +
          `Tus obligaciones registradas actualmente son:\n` +
          `• 🟥 **Cuentas por Pagar (Pasivos)**: **S/ ${fmt(payableDebt)}**\n` +
          `• 🟩 **Cuentas por Cobrar (Activos)**: **S/ ${fmt(receivableDebt)}**\n` +
          `• ⚖️ **Balance Neto Pendiente**: **S/ ${fmt(receivableDebt - payableDebt)}**\n\n` +
          (payableDebt > 0
            ? `**Estrategia Bola de Nieve vs Avalancha (Análisis Think):**\n` +
              `• **Bola de Nieve**: Paga las deudas menores primero. Es ideal para motivarte rápidamente al ver acreedores eliminados en pocas semanas.\n` +
              `• **Avalancha**: Paga la deuda con la tasa de interés efectiva anual (TEA) más alta primero. Esta opción es la más eficiente matemáticamente ya que reduce el costo financiero global de tu cartera.`
            : `✅ No posees compromisos por pagar vencidos ni activos de riesgo financiero en mora.`);

        if (payableDebt > 0) {
          actions.push({
            label: "Liquidar Cuentas",
            onClick: () => handleAction("", "PAYABLES", undefined, "pending")
          });
        }
      }
      // ── 10. PROYECCIONES FONDOS Y FUTURO ──
      else if (query.includes("proyectar") || query.includes("proyecci") || query.includes("futuro") || query.includes("pronostico")) {
        const proj = activeAnalysis.projections || [];
        const monthlySavings = avgInc - avgExp;
        
        replyText = `### Proyección de Crecimiento Patrimonial 🔮💰\n\n` +
          `Basado en tus ingresos de **S/ ${fmt(avgInc)}** y egresos de **S/ ${fmt(avgExp)}**, tu capacidad de ahorro neto libre mensual es de **S/ ${fmt(monthlySavings)}**.\n\n` +
          `Aquí tienes la simulación de tu patrimonio neto a 3 meses si mantienes la disciplina:\n\n` +
          `| Periodo | Saldo Proyectado | Incremento Acumulado |\n` +
          `| :--- | :--- | :--- |\n` +
          `| **Mes actual** | S/ ${fmt(activeAnalysis.savingsAnalysis.total || 0)} | (Línea base) |\n` +
          `| **${proj[0]?.month || "Mes 1"}** | S/ ${fmt(proj[0]?.balance || 0)} | +S/ ${fmt(monthlySavings)} |\n` +
          `| **${proj[1]?.month || "Mes 2"}** | S/ ${fmt(proj[1]?.balance || 0)} | +S/ ${fmt(monthlySavings * 2)} |\n` +
          `| **${proj[2]?.month || "Mes 3"}** | S/ ${fmt(proj[2]?.balance || 0)} | +S/ ${fmt(monthlySavings * 3)} |\n\n` +
          `*💡 Tip Avanzado Think:* Si automatizas tus ahorros mediante un débito automático interbancario a un fondo de inversión moderado, podrías acelerar este crecimiento captando intereses compuestos desde el primer día.`;
      }
      // ── 11. DETECTAR FONDO DE EMERGENCIA ──
      else if (query.includes("fondo") || query.includes("emergencia") || query.includes("colchon")) {
        const targetFund = avgExp * 6;
        const remaining = Math.max(0, targetFund - emergencyAmount);
        
        replyText = `### Diagnóstico del Colchón de Emergencia 🛡️\n\n` +
          `Tu fondo líquido actual es de **S/ ${fmt(emergencyAmount)}**, lo que cubre exactamente **${emergencyMonths.toFixed(1)} meses** de tus egresos recurrentes.\n\n` +
          `• **Meta Recomendada (6 meses de gastos)**: **S/ ${fmt(targetFund)}**\n` +
          `• **Brecha restante**: **S/ ${fmt(remaining)}**\n\n` +
          (remaining > 0
            ? `**Plan de Ahorro Proyectado:**\n` +
              `Si destinas el **15%** de tus ingresos mensuales (aprox. **S/ ${fmt(avgInc * 0.15)}**), alcanzarás la meta completa en **${Math.ceil(remaining / Math.max(avgInc * 0.15, 100))} meses**. Mantén este capital en cuentas de ahorro con disponibilidad inmediata de retiro.`
            : `🎉 **¡Felicidades!** Tu resiliencia financiera está completamente cubierta ante despidos o emergencias.`);

        actions.push({
          label: "Ver Mis Saldos",
          onClick: () => handleAction("", "Cuentas")
        });
      }
      // ── 12. BUSCADOR DE TRANSACCIONES & CATEGORÍAS (NLP DE RESPUESTAS A GASTOS) ──
      else {
        const expenseKeywords = ["gasté", "gaste", "gastos", "movimientos", "transacciones", "egresos", "compras", "consulado", "salidas"];
        const categoryKeywords = ["comida", "alimentacion", "alimentos", "alquiler", "renta", "depa", "servicio", "luz", "agua", "internet", "transporte", "taxi", "uber", "gasolina", "ropa", "educacion", "salud"];
        
        const containsExpenseQuery = expenseKeywords.some(kw => query.includes(kw));
        const matchedCategoryWord = categoryKeywords.find(kw => query.includes(kw));

        if (containsExpenseQuery || matchedCategoryWord) {
          let targetCategoryLabel = "";
          let filterFn = (_t: any) => false;

          if (matchedCategoryWord === "comida" || matchedCategoryWord === "alimentacion" || matchedCategoryWord === "alimentos") {
            targetCategoryLabel = "Alimentación";
            filterFn = (t: any) => t.type === "EXPENSE" && (
              (t.category?.name || t.category || "").toLowerCase().includes("aliment") ||
              (t.category?.name || t.category || "").toLowerCase().includes("comi") ||
              (t.description || "").toLowerCase().includes("comida") ||
              (t.description || "").toLowerCase().includes("restaurante")
            );
          } else if (matchedCategoryWord === "servicios" || matchedCategoryWord === "servicio" || matchedCategoryWord === "luz" || matchedCategoryWord === "agua" || matchedCategoryWord === "internet") {
            targetCategoryLabel = "Servicios";
            filterFn = (t: any) => t.type === "EXPENSE" && (
              (t.category?.name || t.category || "").toLowerCase().includes("servici") ||
              (t.description || "").toLowerCase().includes("luz") ||
              (t.description || "").toLowerCase().includes("agua") ||
              (t.description || "").toLowerCase().includes("internet") ||
              (t.description || "").toLowerCase().includes("netflix") ||
              (t.description || "").toLowerCase().includes("spotify")
            );
          } else if (matchedCategoryWord === "alquiler" || matchedCategoryWord === "renta" || matchedCategoryWord === "depa") {
            targetCategoryLabel = "Alquiler";
            filterFn = (t: any) => t.type === "EXPENSE" && (
              (t.category?.name || t.category || "").toLowerCase().includes("alquiler") ||
              (t.category?.name || t.category || "").toLowerCase().includes("renta") ||
              (t.description || "").toLowerCase().includes("alquiler") ||
              (t.description || "").toLowerCase().includes("departamento")
            );
          } else if (matchedCategoryWord === "transporte" || matchedCategoryWord === "taxi" || matchedCategoryWord === "uber" || matchedCategoryWord === "gasolina") {
            targetCategoryLabel = "Transporte";
            filterFn = (t: any) => t.type === "EXPENSE" && (
              (t.category?.name || t.category || "").toLowerCase().includes("transp") ||
              (t.description || "").toLowerCase().includes("taxi") ||
              (t.description || "").toLowerCase().includes("uber") ||
              (t.description || "").toLowerCase().includes("gasolina") ||
              (t.description || "").toLowerCase().includes("pasaje")
            );
          } else {
            targetCategoryLabel = matchedCategoryWord || "Gastos Generales";
            filterFn = (t: any) => t.type === "EXPENSE" && (
              (t.category?.name || t.category || "").toLowerCase().includes(query) ||
              (t.description || "").toLowerCase().includes(query)
            );
          }

          const matchedTxs = transactions.filter(filterFn);
          
          if (matchedTxs.length > 0) {
            const totalSpent = matchedTxs.reduce((sum: number, t: any) => {
              const val = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
              return sum + val;
            }, 0);

            replyText = `### Reporte de Transacciones: ${targetCategoryLabel} 🔍\n\n` +
              `He escaneado tus movimientos y encontré **${matchedTxs.length} transacciones** que coinciden con tu criterio en este mes. El total gastado asciende a **S/ ${fmt(totalSpent)}**.\n\n` +
              `Aquí tienes el detalle de los movimientos detectados:\n\n` +
              `| Fecha | Descripción | Categoría | Monto |\n` +
              `| :--- | :--- | :--- | :--- |\n` +
              matchedTxs.slice(0, 6).map((t: any) => {
                const amountVal = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
                const tDate = t.date ? new Date(t.date).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "N/A";
                return `| ${tDate} | ${t.description || 'Sin descripción'} | ${t.category?.name || t.category || 'Varios'} | S/ ${fmt(amountVal)} |`;
              }).join("\n") +
              (matchedTxs.length > 6 ? `\n| ... | (+ ${matchedTxs.length - 6} más) | | |` : "") +
              `\n\n**Análisis Cognitivo Think:**\n` +
              `Este monto representa aproximadamente el **${((totalSpent / Math.max(avgInc, 1)) * 100).toFixed(1)}%** de tus ingresos promedio mensuales. ` +
              (totalSpent > avgInc * 0.15 
                ? `⚠️ Este es un gasto elevado. Te aconsejo establecer un tope de presupuesto para contenerlo en la siguiente semana.`
                : `✅ Este consumo se mantiene en márgenes estables bajo control.`);

            actions.push({
              label: "Ver Todos los Egresos",
              onClick: () => handleAction("", "Egresos")
            });
          } else {
            replyText = `### Buscador de Gastos Think 🔍\n\n` +
              `Analicé tus transacciones del periodo y **no registras egresos específicos** para el término **"${matchedCategoryWord || query}"**.\n\n` +
              `Tus egresos totales acumulados ascienden a **S/ ${fmt(activeAnalysis.expenseAnalysis.total || 0)}**. Si deseas buscar una categoría específica, asegúrate de escribir palabras clave como "comida", "transporte" o "servicios".`;
          }
        } else {
          // Default fallback
          replyText = `### Diagnóstico Cognitivo Avanzado 🤖⚙\n\n` +
            `Hola, he procesado tu consulta. Aquí tienes la visión consolidada de tu salud financiera hoy:\n\n` +
            `* **Score de Perfil**: **${score}/100** (${healthLabel})\n` +
            `* **Liquidez de Emergencia**: **${emergencyMonths.toFixed(1)} meses** de cobertura\n` +
            `* **Balance de Cuentas**: S/ ${fmt(activeAnalysis.savingsAnalysis.total || 0)}\n\n` +
            `*¿Qué aspecto deseas optimizar hoy? Selecciona uno de los atajos rápidos de abajo o consúltame de manera específica (ej. "¿Cuál fue mi mayor gasto?", "¿Dónde se va mi dinero?", "Calcular regla 50/30/20" o "Tipos de cambio").*`;
        }
      }

      const aiMsg: Message = {
        sender: 'ai',
        text: replyText,
        timestamp: new Date(),
        actions: actions.length > 0 ? actions : undefined
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
  };

  const formatText = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentTableRows: string[][] = [];
    let isInsideTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detección de tablas Markdown
      if (line.startsWith('|') && line.endsWith('|')) {
        isInsideTable = true;
        const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        if (cols.every(c => c.startsWith(':') || c.startsWith('-') || c.endsWith('-'))) {
          continue;
        }
        currentTableRows.push(cols);
        continue;
      } else {
        if (isInsideTable && currentTableRows.length > 0) {
          const tableHeader = currentTableRows[0];
          const tableBody = currentTableRows.slice(1);
          const tableKey = `table-${i}`;
          elements.push(
            <div key={tableKey} className="overflow-x-auto my-2 border border-slate-150 rounded-xl bg-slate-50/50">
              <table className="min-w-full divide-y divide-slate-200 text-[10px] text-left">
                <thead className="bg-slate-100">
                  <tr>
                    {tableHeader.map((h, idx) => (
                      <th key={idx} className="px-2.5 py-1.5 font-black text-slate-700 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 bg-white/70">
                  {tableBody.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/30 transition-colors">
                      {row.map((val, cIdx) => {
                        const isAmount = val.includes("S/ ");
                        const isWarning = val.includes("⚠️") || val.includes("🚨");
                        return (
                          <td key={cIdx} className={`px-2.5 py-1.5 font-bold ${
                            isAmount ? "text-indigo-600 font-extrabold" : isWarning ? "text-rose-600" : "text-slate-650"
                          }`}>
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          currentTableRows = [];
          isInsideTable = false;
        }
      }

      if (line === '') {
        continue;
      }

      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-800">$1</strong>');
      formattedLine = formattedLine.replace(/(S\/\s*\d{1,3}(,\d{3})*(\.\d{2})?)/g, '<span class="text-indigo-650 font-bold bg-indigo-50 px-1 rounded">$1</span>');

      if (line.startsWith('### ')) {
        elements.push(<h4 key={i} className="text-xs font-black text-indigo-950 mt-3 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">{line.replace('### ', '')}</h4>);
      } else if (line.startsWith('• ')) {
        elements.push(<p key={i} className="text-[11px] text-slate-650 font-medium pl-4 py-0.5 relative before:content-[''] before:absolute before:left-1 before:top-2.5 before:w-1 before:h-1 before:bg-indigo-500 before:rounded-full" dangerouslySetInnerHTML={{ __html: formattedLine.substring(2) }} />);
      } else {
        elements.push(<p key={i} className="text-[11px] text-slate-650 font-medium leading-relaxed mb-1.5" dangerouslySetInnerHTML={{ __html: formattedLine }} />);
      }
    }

    if (isInsideTable && currentTableRows.length > 0) {
      const tableHeader = currentTableRows[0];
      const tableBody = currentTableRows.slice(1);
      elements.push(
        <div key="table-end" className="overflow-x-auto my-2 border border-slate-150 rounded-xl bg-slate-50/50">
          <table className="min-w-full divide-y divide-slate-200 text-[10px] text-left">
            <thead className="bg-slate-100">
              <tr>
                {tableHeader.map((h, idx) => (
                  <th key={idx} className="px-2.5 py-1.5 font-black text-slate-700 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 bg-white/70">
              {tableBody.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/30 transition-colors">
                  {row.map((val, cIdx) => {
                    const isAmount = val.includes("S/ ");
                    const isWarning = val.includes("⚠️") || val.includes("🚨");
                    return (
                      <td key={cIdx} className={`px-2.5 py-1.5 font-bold ${
                        isAmount ? "text-indigo-600 font-extrabold" : isWarning ? "text-rose-600" : "text-slate-650"
                      }`}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return elements;
  };

  return (
    <div className="fixed right-6 bottom-28 z-[9999] no-print pointer-events-none flex items-center justify-end">
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        dragControls={dragControls}
        dragListener={false}
        className="pointer-events-auto flex items-center justify-end select-none"
        style={{ touchAction: 'none' }}
      >
        {isOpen ? (
          /* ── VENTANA DE CHAT ABIERTA MÓVIL ── */
          <div className="w-[365px] max-w-[95vw] h-[510px] bg-gradient-to-br from-white/95 via-white/90 to-slate-50/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 shadow-[0_30px_70px_rgba(99,102,241,0.2)] overflow-hidden flex flex-col pointer-events-auto">
            {/* GLOW DECORATIONS */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Cabecera Arrastrable */}
            <div 
              className="p-4 border-b border-slate-100 flex items-center justify-between relative z-10 bg-slate-50/40 cursor-grab active:cursor-grabbing flex-shrink-0"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 rounded-xl text-white shadow-md">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Chat Asesor Think</h3>
                    <span className="px-1 py-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[7px] font-black rounded uppercase tracking-wider">Móvil</span>
                  </div>
                  <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                    En línea
                  </p>
                </div>
              </div>

              {/* Controles de Arrastre e Interfaz */}
              <div className="flex items-center gap-2">
                <div className="text-slate-350 p-1 rounded-lg">
                  <GripHorizontal className="w-4 h-4" />
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-200/80 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                  title="Minimizar"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cuerpo de Mensajes e Inputs */}
            {!activeAnalysis ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-450">Analizando tus finanzas...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0 bg-white/40 justify-between">
                <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-premium min-h-0 max-h-[300px]">
                  {messages.map((msg, i) => {
                    const isAI = msg.sender === 'ai';
                    return (
                      <div key={i} className={`flex items-start gap-2 ${isAI ? '' : 'flex-row-reverse'}`}>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                          isAI ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isAI ? <Sparkles className="w-3 h-3 text-white" /> : <User className="w-3 h-3" />}
                        </div>

                        <div className="flex flex-col max-w-[82%]">
                          <div className={`p-3 rounded-2xl text-[11px] border ${
                            isAI
                              ? 'bg-slate-50/90 border-slate-100 text-slate-700 rounded-tl-sm'
                              : 'bg-indigo-600 text-white border-indigo-700 rounded-tr-sm shadow-sm font-semibold leading-relaxed'
                          }`}>
                            {isAI ? formatText(msg.text) : <p>{msg.text}</p>}
                          </div>

                          {isAI && msg.actions && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {msg.actions.map((act, actIdx) => (
                                <button
                                  key={actIdx}
                                  onClick={act.onClick}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-wider rounded-lg border border-indigo-100 shadow-sm transition-all"
                                >
                                  {act.label} <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-100 text-[11px] rounded-2xl rounded-tl-sm">
                        <div className="flex gap-0.5 items-center justify-center h-3 w-10">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Sugerencias de Consultas */}
                <div className="py-2 flex flex-wrap gap-1 border-t border-slate-100 bg-white/60 sticky bottom-0 z-20 mt-2 select-none">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest w-full mb-1 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> Atajos rápidos
                  </span>
                  {[
                    { label: "💳 Deudas y Pagos", query: "¿Cómo están mis deudas y pagos?" },
                    { label: "📉 Fugas de dinero", query: "¿Cuáles son mis fugas de dinero?" },
                    { label: "🔮 Proyectar mes", query: "Proyectar mis finanzas para los próximos 3 meses" },
                    { label: "🛡️ Fondo Emergencia", query: "¿Cómo armo mi fondo de emergencia?" },
                    { label: "📊 Regla 50/30/20", query: "Analizar mi presupuesto con la regla 50/30/20" },
                    { label: "🇵🇪 Consejos Perú", query: "Dame consejos financieros para Perú y tributación" }
                  ].map((pill, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickQuestion(pill.query)}
                      className="px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 text-slate-650 hover:text-indigo-700 text-[9px] font-bold rounded-full transition-all duration-300"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Área de Entrada de Texto */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-auto select-text">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                    placeholder="Pregúntale al Asesor IA..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/70"
                  />
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center shrink-0"
                  >
                    <Send className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── BOTÓN FLOTANTE CERRADO CON SPEECH BUBBLE COMPARTIDA ── */
          <div className="flex items-center justify-end pointer-events-none select-none">
            {/* Burbuja informativa */}
            <AnimatePresence>
              {showSpeechBubble && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 15, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="mr-3 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-indigo-100 shadow-[0_10px_35px_rgba(99,102,241,0.12)] max-w-[220px] relative pointer-events-auto flex items-start gap-2 cursor-pointer select-none"
                  onClick={() => setIsOpen(true)}
                >
                  <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-r border-t border-indigo-100 rotate-45" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Asesor Think</p>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={phraseIdx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3 }}
                        className="text-[10px] text-slate-700 font-bold leading-normal"
                      >
                        {PROMPT_PHRASES[phraseIdx]}
                      </motion.p>
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSpeechBubble(false);
                    }}
                    className="p-0.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-650 transition-all shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trigger Button con manejador de Arrastre */}
            <button
              onPointerDown={(e) => dragControls.start(e)}
              onClick={() => setIsOpen(true)}
              className="p-4 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-750 to-purple-650 text-white shadow-xl shadow-indigo-650/40 border border-indigo-400/35 flex items-center justify-center group cursor-grab active:cursor-grabbing pointer-events-auto relative shrink-0"
              title="Abrir Chat Asesor IA"
            >
              <span className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-indigo-555 via-purple-500 to-pink-500 opacity-75 blur animate-pulse pointer-events-none" />
              <span className="absolute -inset-3 rounded-full bg-indigo-500/20 blur animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
              
              <Sparkles className="w-6 h-6 text-white relative z-10 animate-pulse" />
              
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 items-center justify-center text-[7px] text-white font-black">1</span>
              </span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
