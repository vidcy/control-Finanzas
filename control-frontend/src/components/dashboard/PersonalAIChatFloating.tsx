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
import { listPendingTransactionsRequest } from '../../services/pending.api';

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

const fitText = (str: string, maxLen = 20) => {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + "...";
};

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

    const getAccountName = (method: string, customAccount?: string | null) => {
      if (customAccount) return customAccount;
      switch (method) {
        case "CASH": return "Efectivo";
        case "TRANSFER": return "Banco";
        case "YAPE": return "Yape";
        case "PLIN": return "Plin";
        case "CARD": return "Tarjeta";
        default: return "Efectivo";
      }
    };

    if (t.type === "INCOME") {
      const dest = getAccountName(t.paymentMethod, t.destinationAccount);
      if (dest?.toLowerCase().includes("chanchito")) {
        chanchito += amt;
      }
    } else if (t.type === "EXPENSE") {
      const orig = getAccountName(t.paymentMethod, t.originAccount);
      if (orig?.toLowerCase().includes("chanchito")) {
        chanchito -= amt;
      }
    } else if (t.type === "TRANSFER") {
      const orig = getAccountName(t.paymentMethod, t.originAccount);
      const dest = getAccountName(t.paymentMethod, t.destinationAccount);
      if (dest?.toLowerCase().includes("chanchito")) {
        chanchito += amt;
      }
      if (orig?.toLowerCase().includes("chanchito")) {
        chanchito -= amt;
      }
    }
  });

  const totalBalance = income - expense - chanchito;
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
      const [allTx, pendingTx] = await Promise.all([
        getTransactionsRequest({ workspace: "PERSONAL" }).catch(() => []),
        listPendingTransactionsRequest("PERSONAL").catch(() => [])
      ]);
      const personalTx = Array.isArray(allTx) ? allTx.filter((t: any) => t.workspace === "PERSONAL") : [];
      const personalPendingTx = Array.isArray(pendingTx) ? pendingTx.filter((t: any) => t.workspace === "PERSONAL") : [];
      
      const combined = [...personalTx, ...personalPendingTx];
      const computed = computeAnalysisEngine(combined);
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
      const now = new Date();
      const avgInc = activeAnalysis.incomeAnalysis.averageMonthly || 0;
      const avgExp = activeAnalysis.expenseAnalysis.averageMonthly || 0;
      const emergencyAmount = activeAnalysis.savingsAnalysis.emergencyFund.amount || 0;
      const emergencyMonths = activeAnalysis.savingsAnalysis.emergencyFund.months || 0;
      const payableDebt = activeAnalysis.debtAnalysis.total || 0;
      const receivableDebt = activeAnalysis.debtAnalysis.totalReceivable || 0;
      const transactions = activeAnalysis.activeTx || [];
      const score = activeAnalysis.score || 50;
      const healthLabel = activeAnalysis.healthLabel || "Estable";
      const totalBalance = activeAnalysis.savingsAnalysis.total || 0;

      // ── Sanitización y normalización de puntuación para comparaciones exactas ──
      const queryClean = query.replace(/[?¿!¡.,]/g, "").trim();

      const greetingWords = ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "saludos", "hi", "hello", "que tal", "qué tal", "como te va", "cómo te va"];
      const howAreYouWords = ["como estas", "cómo estás", "como te encuentras", "cómo te encuentras", "como vas", "cómo vas", "todo bien"];
      const identityWords = ["quien eres", "quién eres", "como te llamas", "cómo te llamas", "quien es thin", "quién es thin", "que eres", "qué eres", "que haces", "qué haces", "quien te creo", "quién te creó"];
      const gratitudeWords = ["gracias", "muchas gracias", "de nada", "perfecto", "excelente", "genial", "increible", "buenisimo", "buenísimo", "buena idea", "super", "chévere", "chevere"];
      const farewellWords = ["chau", "adios", "adiós", "nos vemos", "hasta luego", "bye", "cuidate", "me voy"];

      const isGreeting = greetingWords.some(g => queryClean === g || queryClean.startsWith(g + " ") || queryClean.endsWith(" " + g));
      const isHowAreYou = howAreYouWords.some(h => queryClean.includes(h));
      const isIdentity = identityWords.some(i => queryClean.includes(i));
      const isGratitude = gratitudeWords.some(gr => queryClean === gr || queryClean.startsWith(gr + " ") || queryClean.endsWith(" " + gr));
      const isFarewell = farewellWords.some(f => queryClean === f || queryClean.startsWith(f + " ") || queryClean.endsWith(" " + f));

      if (isHowAreYou) {
        replyText = `### ¿Cómo estoy? ¡Excelente! 🤖✨\n\n` +
          `Estoy con el 100% de mi capacidad de análisis activa, listo para auditar tus finanzas. Como tu Asesor Inteligente del **Módulo Personal**, acabo de re-analizar tus transacciones y cuentas pendientes.\n\n` +
          `Hoy veo que tu saldo neto disponible es de **S/ ${fmt(totalBalance)}** y tienes un score de salud financiera de **${score}/100** (**${healthLabel}**).\n\n` +
          `¿Cómo te va a ti? ¿Qué aspecto de tu presupuesto personal te gustaría que mejoremos hoy?`;
      }
      else if (isGreeting) {
        replyText = `### ¡Hola! Soy Thin, tu Asesor Financiero Personal 🤖✨\n\n` +
          `Estoy aquí para ayudarte a tomar el control absoluto de tus finanzas personales (este espacio es 100% independiente de tu negocio).\n\n` +
          `**Resumen ejecutivo rápido de tu Módulo Personal hoy:**\n` +
          `• **Saldo Neto Disponible:** S/ ${fmt(totalBalance)}\n` +
          `• **Ingresos Promedio:** S/ ${fmt(avgInc)} /mes\n` +
          `• **Gastos Promedio:** S/ ${fmt(avgExp)} /mes\n` +
          `• **Score de Salud:** **${score}/100** (${healthLabel})\n\n` +
          `*¿Qué deseas consultar hoy? Puedes hacerme cualquier tipo de pregunta como a ChatGPT:* "gasto en comida", "deudas por pagar", "cuánto me debe la gente", "cómo ahorrar", o simplemente entablar una conversación financiera general. ¡Te escucho!`;

        actions.push({ label: "Ver Score Completo", onClick: () => handleAction("", "Score") });
        actions.push({ label: "Ver Cuentas Pendientes", onClick: () => handleAction("", "PAYABLES", undefined, "pending") });
      }
      else if (isIdentity) {
        replyText = `### Conoce a Thin, tu Asesor de Inteligencia Financiera 🤖🛡️\n\n` +
          `Soy una Inteligencia Artificial programada para ser tu consejero financiero y de contabilidad personal de cabecera. Fui creado para ser **robusto, inquebrantable e inteligente**.\n\n` +
          `**Mis capacidades principales en tu Módulo Personal incluyen:**\n` +
          `1. 📊 **Diagnóstico del Score de Salud**: Evalúo tu capacidad de ahorro, saldo neto disponible y nivel de endeudamiento.\n` +
          `2. 🔍 **Búsqueda Semántica**: Puedo decirte cuánto has gastado en una categoría ("comida", "pasajes", "alquiler") o con una persona en particular.\n` +
          `3. 🛡️ **Prevención de Riesgos**: Te alerto si tu fondo de emergencia de 6 meses es insuficiente o si tienes cuentas vencidas por pagar.\n` +
          `4. 💬 **Educación Financiera**: Te explico conceptos complejos (SUNAT, impuestos de 4ta/5ta categoría, interés compuesto, inflación, etc.).\n\n` +
          `*Importante:* Toda la información procesada es estrictamente de carácter **personal** y confidencial. No mezclo ni comparto datos con tu módulo de negocio.`;
      }
      else if (isGratitude) {
        replyText = `### ¡Con todo gusto! 🌟💪\n\n` +
          `Es un placer ayudarte a estructurar tus finanzas personales y optimizar cada sol. Mantener el hábito de registro diario es lo que realmente marca la diferencia entre un presupuesto estable y uno fuera de control.\n\n` +
          `¿Tienes alguna otra consulta sobre deudas, ahorros, SUNAT o proyecciones? ¡Aquí sigo atento!`;
      }
      else if (isFarewell) {
        replyText = `### ¡Hasta la próxima! 🚀📈\n\n` +
          `Ha sido un gusto conversar contigo. No olvides seguir registrando tus ingresos y egresos personales en la aplicación para mantener tus estadísticas 100% reales.\n\n` +
          `¡Éxitos con tu presupuesto y que tengas un excelente día financiero! Cierra este chat flotante cuando desees. ¡Hasta pronto!`;
      }
      else if (queryClean.includes("inflacion") || queryClean.includes("inflación")) {
        replyText = `### ¿Qué es la Inflación y cómo te afecta? 💸📈\n\n` +
          `La **inflación** es el incremento generalizado y continuo de los precios de los bienes y servicios en el tiempo. Significa que el valor adquisitivo de tu dinero disminuye: hoy compras menos cosas con S/ 100 de lo que comprabas el año pasado.\n\n` +
          `**Consejos de Thin para ganarle a la inflación:**\n` +
          `• ❌ **No dejes efectivo ocioso**: Guardar dinero bajo el colchón o en cuentas de ahorros tradicionales que pagan 0.1% es perder dinero real día a día.\n` +
          `• 🏦 **Cuentas de Alto Rendimiento**: Pasa tus fondos líquidos a Cuentas de Ahorros reguladas por la SBS con tasas TREA de **5% a 7%** anual.\n` +
          `• 💼 **Inversión**: Diversifica tus excedentes en fondos mutuos o instrumentos de renta fija de acuerdo a tu perfil de riesgo.`;
      }
      else if (queryClean.includes("interes compuesto") || queryClean.includes("interés compuesto")) {
        replyText = `### La Magia del Interés Compuesto ⏳💰\n\n` +
          `El **interés compuesto** es el proceso por el cual los intereses que ganas en una inversión se suman al capital inicial, de modo que en el siguiente periodo los nuevos intereses se calculan sobre ese monto mayor. Es "interés sobre interés".\n\n` +
          `**Un ejemplo práctico:**\n` +
          `Si inviertes **S/ 1,000** al **10% anual**:\n` +
          `• **Año 1**: Ganas S/ 100. Tu saldo es S/ 1,100.\n` +
          `• **Año 2**: El 10% se calcula sobre S/ 1,100, ganando S/ 110. Saldo: S/ 1,210.\n` +
          `• **Año 10**: Tu saldo habrá crecido a **S/ 2,593** sin que hayas depositado un solo sol adicional.\n\n` +
          `*💡 Consejo Think:* ¡El mejor aliado del interés compuesto es el **tiempo**! Empieza a ahorrar e invertir pequeños montos hoy mismo para maximizar tu crecimiento a largo plazo.`;
      }
      else if (queryClean.includes("consejo") || queryClean.includes("tips") || queryClean.includes("sugerencia") || queryClean.includes("recomienda")) {
        replyText = `### Recomendaciones Clave para tu Libertad Financiera 🎯💡\n\n` +
          `Basado en tus datos del **Módulo Personal**, te sugiero implementar estas 3 estrategias hoy:\n\n` +
          `1. 📊 **Estructura 50/30/20**: Tus ingresos promedio son de **S/ ${fmt(avgInc)}**. Deberías destinar el 50% (**S/ ${fmt(avgInc * 0.5)}**) a gastos fijos obligatorios, el 30% (**S/ ${fmt(avgInc * 0.3)}**) a estilo de vida y el 20% (**S/ ${fmt(avgInc * 0.2)}**) al ahorro directo.\n` +
          `2. 🛡️ **Construye Resiliencia**: Tu fondo actual cubre **${emergencyMonths.toFixed(1)} meses** de egresos. Apunta a completar un colchón de **6 meses** para estar 100% blindado ante despidos o emergencias de salud.\n` +
          `3. 🗑️ **Audita Gastos Hormiga**: Pequeños gastos diarios no registrados (snacks, taxis innecesarios, suscripciones olvidadas) suelen fugar entre S/ 150 y S/ 300 mensuales de tu presupuesto personal.`;
      }
      else if (queryClean.includes("tarjeta") || queryClean.includes("credito") || queryClean.includes("crédito")) {
        replyText = `### Guía Think para el Uso Inteligente de Tarjetas de Crédito 💳🛡️\n\n` +
          `Las tarjetas de crédito son herramientas poderosas si se usan con disciplina. Aquí tienes mis reglas de oro:\n\n` +
          `1. 💸 **Paga siempre el Pago Total**: Nunca pagues el "Pago Mínimo" ni el "Pago a Cuenta" si tienes el saldo disponible. Pagar solo el mínimo acumula tasas de interés altísimas (usualmente entre 40% y 80% anual) que consumirán tu capital.\n` +
          `2. 📅 **Domina tus Fechas**: Conoce tu **Fecha de Corte** (cuando cierra tu facturación) y tu **Fecha de Pago** (límite para pagar sin intereses). Si compras un día después de tu fecha de corte, ganas hasta 45 días de financiamiento gratuito.\n3. ⚖️ **Cuida tu Score de Crédito**: Trata de mantener tu consumo por debajo del **30% de tu línea de crédito**. Esto demuestra un comportamiento financiero saludable ante centrales de riesgo como Sentinel o Equifax en Perú.`;
      }
      else if (queryClean.includes("invertir") || queryClean.includes("inversion") || queryClean.includes("inversión") || queryClean.includes("acciones") || queryClean.includes("bolsa")) {
        replyText = `### Guía de Inversiones para Principiantes 📈💼\n\n` +
          `Antes de destinar tu dinero a una inversión, asegúrate de tener cubierto tu fondo de emergencias de al menos 3 meses en el **Módulo Personal**.\n\n` +
          `**Opciones seguras y populares en el mercado peruano:**\n` +
          `1. 🏦 **Depósitos a Plazo Fijo**: Entidades reguladas por la SBS (cajas municipales, financieras) ofrecen tasas TREA de **6% a 7.5%** anual. Están cubiertas por el Fondo de Seguro de Depósitos hasta por S/ 121,500.\n` +
          `2. 💰 **Fondos Mutuos**: Administrados por bancos y sociedades agentes de bolsa (SAB). Tienen distintas categorías de riesgo (conservador, moderado, agresivo) y permiten retirar tu capital con facilidad.\n` +
          `3. 🏢 **Factoring**: Compra de facturas por cobrar con tasas de retorno atractivas (12% a 18% anual) a través de plataformas autorizadas por la Superintendencia del Mercado de Valores (SMV).\n\n` +
          `*Regla de Oro Think:* Diversifica. No coloques todos tus huevos en la misma canasta, y jamás inviertas en negocios o plataformas multinivel que te prometan retornos fijos exorbitantes imposibles de sustentar.`;
      }
      else if (queryClean.includes("prestamo") || queryClean.includes("préstamo") || queryClean.includes("tasa") || queryClean.includes("banco")) {
        replyText = `### Recomendaciones para Préstamos y Financiamiento Bancario 🏦📊\n\n` +
          `Si estás evaluando solicitar un préstamo personal o consolidar deudas en el banco, ten en cuenta esto:\n\n` +
          `1. 🔍 **Compara la TCEA (Tasa Costo Efectiva Anual)**: No te dejes llevar solo por la TEA (Tasa Efectiva Anual). La TCEA incluye el costo real del crédito, sumando comisiones, seguros (como el seguro de desgravamen) y cargos adicionales.\n` +
          `2. ⚖️ **Ratio de Deuda Máximo**: Tus deudas mensuales nunca deben superar el **30% de tus ingresos netos**. Actualmente tus deudas por pagar suman **S/ ${fmt(payableDebt)}**. Superar este límite te coloca en riesgo de sobreendeudamiento.\n` +
          `3. 🛡️ **Compra de Deudas**: Si tienes múltiples deudas con tasas altas, evalúa solicitar una "Compra de Deuda" en otro banco comercial. Consolidarán todo en una sola cuota mensual con una tasa sustancialmente menor.`;
      }
      // ── Mapeo Avanzado de Sinónimos para Categorías Frecuentes ──
      else {
        let isSynonymMatch = false;
        let synonymLabel = "";
        let filterFn = (_t: any) => false;

        const pasajeKeywords = ["pasaje", "pasajes", "transporte", "taxi", "uber", "gasolina", "combustible", "bus", "colectivo", "pasajito", "viaje", "movilidad"];
        const comidaKeywords = ["comida", "alimentacion", "alimento", "alimentos", "restaurante", "desayuno", "almuerzo", "cena", "delivery", "menú", "compras de mercado", "supermercado", "comidas"];
        const serviciosKeywords = ["luz", "agua", "internet", "servicio", "servicios", "telefono", "celular", "movistar", "claro", "entel", "netflix", "spotify", "luz del sur", "enel", "sedapal", "recarga"];
        const alquilerKeywords = ["alquiler", "renta", "depa", "cuarto", "habitación", "vivienda", "casa", "arriendo"];
        const ropaKeywords = ["ropa", "compras", "zapatos", "vestimenta", "mall", "tienda", "prendas"];
        const saludKeywords = ["salud", "medicina", "farmacia", "clinica", "doctor", "dentista", "odontologo", "pastillas", "jarabe", "hospital"];

        if (pasajeKeywords.some(kw => query.includes(kw))) {
          isSynonymMatch = true;
          synonymLabel = "Transporte y Movilidad";
          filterFn = (t: any) => t.type === "EXPENSE" && (
            (t.category?.name || t.category || "").toLowerCase().includes("transp") ||
            (t.category?.name || t.category || "").toLowerCase().includes("pasaje") ||
            pasajeKeywords.some(kw => (t.description || "").toLowerCase().includes(kw)) ||
            pasajeKeywords.some(kw => (t.name || "").toLowerCase().includes(kw))
          );
        } else if (comidaKeywords.some(kw => query.includes(kw))) {
          isSynonymMatch = true;
          synonymLabel = "Alimentación y Comida";
          filterFn = (t: any) => t.type === "EXPENSE" && (
            (t.category?.name || t.category || "").toLowerCase().includes("aliment") ||
            (t.category?.name || t.category || "").toLowerCase().includes("comi") ||
            (t.category?.name || t.category || "").toLowerCase().includes("restauran") ||
            comidaKeywords.some(kw => (t.description || "").toLowerCase().includes(kw)) ||
            comidaKeywords.some(kw => (t.name || "").toLowerCase().includes(kw))
          );
        } else if (serviciosKeywords.some(kw => query.includes(kw))) {
          isSynonymMatch = true;
          synonymLabel = "Servicios y Suscripciones";
          filterFn = (t: any) => t.type === "EXPENSE" && (
            (t.category?.name || t.category || "").toLowerCase().includes("servici") ||
            (t.category?.name || t.category || "").toLowerCase().includes("suscrip") ||
            serviciosKeywords.some(kw => (t.description || "").toLowerCase().includes(kw)) ||
            serviciosKeywords.some(kw => (t.name || "").toLowerCase().includes(kw))
          );
        } else if (alquilerKeywords.some(kw => query.includes(kw))) {
          isSynonymMatch = true;
          synonymLabel = "Alquiler y Vivienda";
          filterFn = (t: any) => t.type === "EXPENSE" && (
            (t.category?.name || t.category || "").toLowerCase().includes("alquiler") ||
            (t.category?.name || t.category || "").toLowerCase().includes("vivienda") ||
            (t.category?.name || t.category || "").toLowerCase().includes("renta") ||
            alquilerKeywords.some(kw => (t.description || "").toLowerCase().includes(kw)) ||
            alquilerKeywords.some(kw => (t.name || "").toLowerCase().includes(kw))
          );
        } else if (ropaKeywords.some(kw => query.includes(kw))) {
          isSynonymMatch = true;
          synonymLabel = "Ropa y Compras Personales";
          filterFn = (t: any) => t.type === "EXPENSE" && (
            (t.category?.name || t.category || "").toLowerCase().includes("ropa") ||
            (t.category?.name || t.category || "").toLowerCase().includes("compra") ||
            ropaKeywords.some(kw => (t.description || "").toLowerCase().includes(kw)) ||
            ropaKeywords.some(kw => (t.name || "").toLowerCase().includes(kw))
          );
        } else if (saludKeywords.some(kw => query.includes(kw))) {
          isSynonymMatch = true;
          synonymLabel = "Salud y Cuidado Médico";
          filterFn = (t: any) => t.type === "EXPENSE" && (
            (t.category?.name || t.category || "").toLowerCase().includes("salud") ||
            (t.category?.name || t.category || "").toLowerCase().includes("medici") ||
            (t.category?.name || t.category || "").toLowerCase().includes("farmac") ||
            saludKeywords.some(kw => (t.description || "").toLowerCase().includes(kw)) ||
            saludKeywords.some(kw => (t.name || "").toLowerCase().includes(kw))
          );
        }

        if (isSynonymMatch) {
          const matchedTxs = transactions.filter(filterFn);
          const totalPaid = matchedTxs.filter((t: any) => t.status === "PAID").reduce((sum: number, t: any) => sum + Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1), 0);
          const totalPending = matchedTxs.filter((t: any) => t.status !== "PAID").reduce((sum: number, t: any) => sum + Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1), 0);

          replyText = `### Reporte de Gastos en ${synonymLabel} 🔍\n\n` +
            `Analicé todos tus registros financieros buscando transacciones y descripciones relacionadas. Encontré **${matchedTxs.length} movimientos**:\n\n` +
            `* **Total Gastado (Pagado):** S/ ${fmt(totalPaid)}\n` +
            `* **Total Comprometido (Pendiente):** S/ ${fmt(totalPending)}\n\n`;

          if (matchedTxs.length > 0) {
            replyText += `**Detalle de tus consumos detectados:**\n\n` +
              `| Fecha | Descripción | Monto | Estado |\n` +
              `| :--- | :--- | :--- | :--- |\n` +
              matchedTxs.slice(0, 6).map((t: any) => {
                const tDate = t.date || t.paidAt || t.dueDate;
                const dateLabel = tDate ? new Date(tDate).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "N/A";
                const amtVal = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
                const statusLabel = t.status === "PAID" ? "✅ Pagado" : "⏳ Pendiente";
                return `| ${dateLabel} | ${fitText(t.description || t.name || "Sin detalle", 22)} | S/ ${fmt(amtVal)} | ${statusLabel} |`;
              }).join("\n") +
              (matchedTxs.length > 6 ? `\n| ... | (+ ${matchedTxs.length - 6} más) | | |` : "") +
              `\n\n**Análisis de Impacto Think:**\n` +
              `Este gasto de **S/ ${fmt(totalPaid + totalPending)}** representa el **${(((totalPaid + totalPending) / Math.max(avgExp, 1)) * 100).toFixed(1)}%** de tus egresos mensuales promedio (S/ ${fmt(avgExp)}). ` +
              ((totalPaid + totalPending) > avgExp * 0.15 
                ? `⚠️ Es un rubro de gasto considerable. Te aconsejo establecer un presupuesto tope semanal para mantener bajo control esta categoría.`
                : `✅ Se encuentra dentro de los márgenes saludables y bajo control en tu presupuesto personal mensual.`);
          } else {
            replyText += `Actualmente **no he encontrado egresos registrados** bajo conceptos de ${synonymLabel.toLowerCase()}. Si has realizado algún consumo, asegúrate de guardarlo para verlo reflejado aquí.`;
          }

          actions.push({
            label: "Ver Todos los Egresos",
            onClick: () => handleAction("", "Egresos")
          });
        } 
        // ── 3. DETECTAR INTENCIONES TRADICIONALES POR PESOS ──
        else {
          const intents = [
            {
              id: "MAX_EXPENSE",
              keywords: ["mayor gasto", "gasto mas alto", "gasto maximo", "mas caro", "gasto mas grande", "gasto mayor", "comprado mas caro", "mayor consumo", "peor gasto"],
              score: 0
            },
            {
              id: "FUGAS",
              keywords: ["en que gasto mas", "donde se va mi dinero", "mis mayores consumos", "mayores gastos", "top de gastos", "top categorias", "fuga", "fugas", "desperdicio", "gastando mas"],
              score: 0
            },
            {
              id: "PLAN_AHORRO",
              keywords: ["como ahorrar", "plan de ahorro", "ahorrar", "meta de ahorro", "chanchito", "guardar dinero", "consejos de ahorro", "ahorros"],
              score: 0
            },
            {
              id: "SCORE",
              keywords: ["mi score", "mi puntaje", "mejorar mi score", "salud financiera", "diagnostico", "como estoy", "mi estado", "resumen financiero"],
              score: 0
            },
            {
              id: "SUNAT",
              keywords: ["sunat", "impuesto", "impuestos", "recibo", "honorarios", "deducir", "planilla", "declarar", "renta", "tributar", "igv"],
              score: 0
            },
            {
              id: "RENTABILIZAR",
              keywords: ["sbs", "ahorros", "plazo fijo", "cts", "rentabilizar", "interes", "intereses", "dolar", "cambio", "banco", "bancos", "invertir", "inversión"],
              score: 0
            },
            {
              id: "RULE_50_30_20",
              keywords: ["50/30/20", "regla 50", "presupuesto", "distribucion", "porcentajes", "regla de ahorro"],
              score: 0
            },
            {
              id: "RATIOS",
              keywords: ["ratio", "solvencia", "resiliencia", "capacidad de pago", "saldo neto", "presupuesto"],
              score: 0
            },
            {
              id: "DEUDAS",
              keywords: ["deuda", "deudas", "pendiente", "pendientes", "pagar", "cobrar", "deudor", "acreedor", "pagos", "cobros", "por pagar", "por cobrar"],
              score: 0
            },
            {
              id: "PROYECCION",
              keywords: ["proyectar", "proyeccion", "proyecciones", "futuro", "pronostico", "siguiente mes", "estimado", "simulacion"],
              score: 0
            },
            {
              id: "FONDO_EMERGENCIA",
              keywords: ["fondo", "emergencia", "colchon", "reserva", "imprevistos", "seguridad"],
              score: 0
            }
          ];

          intents.forEach(intent => {
            intent.keywords.forEach(kw => {
              if (query.includes(kw)) {
                intent.score += 2;
              }
              const words = kw.split(" ");
              if (words.length > 1) {
                let matches = 0;
                words.forEach(w => {
                  if (query.includes(w) && w.length > 3) matches++;
                });
                intent.score += matches / words.length;
              }
            });
          });

          intents.sort((a, b) => b.score - a.score);
          const topIntent = intents[0].score > 0.5 ? intents[0].id : null;

          if (topIntent === "MAX_EXPENSE") {
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
                  : `✅ Se mantiene en una proporción moderada en comparación con tus egresos generales.`);
              
              actions.push({
                label: "Ver Todos los Egresos",
                onClick: () => handleAction("", "Egresos")
              });
            } else {
              replyText = `### Tu Mayor Gasto Registrado 📊🛍️\n\n` +
                `Actualmente **no he encontrado ningún gasto pagado** en tu registro de transacciones. Asegúrate de tener egresos registrados este mes para poder calcular tu gasto máximo.`;
            }
          } 
          else if (topIntent === "FUGAS") {
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
          else if (topIntent === "PLAN_AHORRO") {
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
          else if (topIntent === "SCORE") {
            let adviceText = "";
            if (score >= 80) {
              adviceText = `🏆 **¡Tu salud financiera está en nivel excelente!** Tu puntaje de **${score}/100** indica una gestión de deudas impecable y buena tasa de retención.\n\n` +
                `**Tus siguientes pasos:**\n` +
                `* **Inversión Activa**: No dejes tu dinero ocioso en cuentas corrientes bancarias tradicionales. Evalúa depósitos a plazo fijo digital o fondos de inversión supervisados por la SBS.\n` +
                `* **Maximizar Ahorro**: Proyecta tus excedentes hacia fondos de inversión con mayor rentabilidad histórica.`;
            } else if (score >= 50) {
              adviceText = `⚖️ **Tu salud financiera está en rango estable con riesgos.** Tu puntaje es de **${score}/100**.\n\n` +
                `**Acciones inmediatas para subir a Rango A:**\n` +
                `* **Reduce Deudas**: Tu ratio de deudas sobre ingresos es de **${activeAnalysis.debtAnalysis.debtToIncomeRatio.toFixed(1)}%**. Mantén esta cifra siempre por debajo de 30%.\n` +
                `* **Automatiza el ahorro**: Configura una transferencia automática interbancaria del **10% al 15%** de tus ingresos apenas los recibas.`;
            } else {
              adviceText = `🚨 **Alerta: Tu salud financiera está en nivel crítico/vulnerable.** Tu score es de **${score}/100**.\n\n` +
                `**Plan de contingencia Think:**\n` +
                `* **Construye tu primer escudo**: Enfófate en tener un fondo de emergencia mínimo equivalente a 1 mes de gastos (S/ ${fmt(avgExp)}).\n` +
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
          else if (topIntent === "SUNAT") {
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
          else if (topIntent === "RENTABILIZAR") {
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
          else if (topIntent === "RULE_50_30_20") {
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
                ? `• Tu nivel de gastos fijos está asfixiando tu saldo disponible. Analiza tus facturas de telefonía, luz, plataformas de streaming o evalúa consolidar deudas.\n` 
                : `• Tus gastos fijos están muy equilibrados. Tienes espacio libre para potenciar tus inversiones.\n`) +
              (savingsPct < 20
                ? `• Estás ahorrando menos del 20% recomendado. Adopta el método **"Págate a ti primero"**: transfiere el 10% a 15% de tu sueldo a una cuenta de ahorros separada apenas lo cobres.`
                : `• ¡Excelente ritmo de acumulación! Sigue manteniendo esa disciplina.`);

            actions.push({
              label: "Ver Presupuestos",
              onClick: () => handleAction("", "Presupuestos")
            });
          }
          else if (topIntent === "RATIOS") {
            const liq = activeAnalysis.liquidityRatio;
            const savingsRate = activeAnalysis.savingsAnalysis.savingsRate || 0;
            
            replyText = `### Ratios Avanzados de Capacidad y Solvencia 🔬⚖️\n\n` +
              `He calculado tus indicadores clave de solvencia basados en tu balance actual:\n\n` +
              `1. ⚖️ **Ratio de Capacidad de Pago**: **${liq === Infinity ? 'Sin Deudas' : `${fmt(liq, 2)}`}**\n` +
              `   *Interpretación:* Este indicador mide cuántos soles tienes en tus cuentas de ahorro por cada sol de deuda a pagar. Un ratio de **1.5 a 2.0 es el estándar óptimo**. ` + 
              (liq < 1.2 ? `Tu ratio está por debajo del límite de seguridad, lo que indica vulnerabilidad si te exigen pagar tus deudas de inmediato.` : `Tienes un colchón de solvencia robusto para afrontar imprevistos.`) + `\n` +
              `2. 📈 **Tasa de Ahorro Neto**: **${savingsRate.toFixed(1)}%**\n` +
              `   *Interpretación:* Representa la porción de tus ingresos libres que logras retener cada mes. Si mantienes esta tasa superior al **20%**, acelerarás tu libertad financiera significativamente.\n` +
              `3. 🛡️ **Ratio de Resiliencia (Meses de Fondo)**: **${emergencyMonths.toFixed(1)} meses**\n` +
              `   *Interpretación:* La cantidad de meses que podrías sobrevivir manteniendo tu estilo de vida actual si tus ingresos principales cayeran a cero.`;

            actions.push({
              label: "Ver Simulador de Deuda",
              onClick: () => handleAction("", "Simulador")
            });
          }
          else if (topIntent === "DEUDAS") {
            const pendingTxs = transactions.filter((t: any) => t.status === "PENDING" || t.status !== "PAID");
            const payables = pendingTxs.filter((t: any) => t.type === "EXPENSE");
            const expiredCount = payables.filter((t: any) => t.dueDate && new Date(t.dueDate) < now).length;

            replyText = `### Resumen de Deudas y Pagos Pendientes 💳⚖️\n\n` +
              `Aquí tienes tu balance actual de cuentas pendientes de cobro y pago (calculado en base a tus registros):\n\n` +
              `• 🟥 **Cuentas por Pagar (Deudas):** S/ ${fmt(payableDebt)}\n` +
              `• 🟩 **Cuentas por Cobrar (Que te deben):** S/ ${fmt(receivableDebt)}\n` +
              `* **Saldo Neto Pendiente:** S/ ${fmt(receivableDebt - payableDebt)}\n\n`;

            if (pendingTxs.length > 0) {
              replyText += `**Detalle de tus Cuentas Pendientes Activas:**\n\n` +
                `| Tipo | Nombre | Detalle | Monto | Vencimiento |\n` +
                `| :--- | :--- | :--- | :--- | :--- |\n` +
                pendingTxs.slice(0, 6).map((t: any) => {
                  const typeLabel = t.type === "EXPENSE" ? "🟥 Por Pagar" : "🟩 Por Cobrar";
                  const amtVal = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
                  const dueDateLabel = t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "Sin fecha";
                  return `| ${typeLabel} | ${fitText(t.name || "Varios", 15)} | ${fitText(t.description || "General", 18)} | S/ ${fmt(amtVal)} | ${dueDateLabel} |`;
                }).join("\n") +
                `\n\n**Estrategia recomendada por Think:**\n` +
                (expiredCount > 0 
                  ? `⚠️ Tienes **${expiredCount} cuentas vencidas**! Te sugerimos liquidar primero las vencidas para evitar moras e intereses bancarios.` 
                  : payableDebt > 0 
                  ? `💡 Emplea la **Estrategia Avalancha**: prioriza el pago de la deuda con mayor tasa de interés, o la **Estrategia Bola de Nieve**: paga primero la de menor monto para ganar impulso psicológico rápido.`
                  : `✅ ¡Excelente! No tienes deudas registradas pendientes.`);
              
              actions.push({
                label: "Ver Cuentas por Cobrar",
                onClick: () => handleAction("", "RECEIVABLES", undefined, "pending")
              });
              actions.push({
                label: "Ver Cuentas por Pagar",
                onClick: () => handleAction("", "PAYABLES", undefined, "pending")
              });
            } else {
              replyText += `Actualmente **no tienes ninguna cuenta pendiente (por pagar o cobrar)** registrada. Tus finanzas están al día en este aspecto.`;
            }
          }
          else if (topIntent === "PROYECCION") {
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
          else if (topIntent === "FONDO_EMERGENCIA") {
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
          else {
            const allCategories = Array.from(
              new Set(
                transactions
                  .map((t: any) => t.category?.name || t.category)
                  .filter((c: any) => typeof c === "string" && c.trim().length > 0)
              )
            ) as string[];

            const matchedCategory = allCategories.find(cat => 
              query.includes(cat.toLowerCase()) || 
              cat.toLowerCase().includes(query)
            );

            const allNames = Array.from(
              new Set(
                transactions
                  .map((t: any) => t.name)
                  .filter((n: any) => typeof n === "string" && n.trim().length > 2)
              )
            ) as string[];

            const matchedName = allNames.find(n => 
              query.includes(n.toLowerCase()) || 
              n.toLowerCase().includes(query)
            );

            if (matchedName) {
              const nameTxs = transactions.filter((t: any) => t.name && t.name.toLowerCase().includes(matchedName.toLowerCase()));
              const paidIncome = nameTxs.filter((t: any) => t.status === "PAID" && t.type === "INCOME").reduce((sum: number, t: any) => sum + Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1), 0);
              const paidExpense = nameTxs.filter((t: any) => t.status === "PAID" && t.type === "EXPENSE").reduce((sum: number, t: any) => sum + Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1), 0);
              const pendingCobros = nameTxs.filter((t: any) => t.status !== "PAID" && t.type === "INCOME").reduce((sum: number, t: any) => sum + Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1), 0);
              const pendingPagos = nameTxs.filter((t: any) => t.status !== "PAID" && t.type === "EXPENSE").reduce((sum: number, t: any) => sum + Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1), 0);

              replyText = `### Reporte de Actividad con ${matchedName} 👤📊\n\n` +
                `He consolidado todos los movimientos vinculados a **${matchedName}** en tus registros personales:\n\n` +
                `* **Total Cobrado (Ingresos):** S/ ${fmt(paidIncome)}\n` +
                `* **Total Pagado (Egresos):** S/ ${fmt(paidExpense)}\n` +
                `• 🟩 **Cuentas por Cobrar Pendientes:** S/ ${fmt(pendingCobros)}\n` +
                `• 🟥 **Cuentas por Pagar Pendientes:** S/ ${fmt(pendingPagos)}\n` +
                `* **Saldo Neto Pendiente:** S/ ${fmt(pendingCobros - pendingPagos)}\n\n` +
                `**Historial Reciente de Operaciones:**\n\n` +
                `| Fecha | Operación | Detalle | Monto | Estado |\n` +
                `| :--- | :--- | :--- | :--- | :--- |\n` +
                nameTxs.slice(0, 5).map((t: any) => {
                  const tDate = t.date ? new Date(t.date).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "N/A";
                  const typeLabel = t.type === "INCOME" ? "Cobro/Ingreso" : "Pago/Egreso";
                  const amtVal = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
                  const statusLabel = t.status === "PAID" ? "Pagado" : "Pendiente";
                  return `| ${tDate} | ${typeLabel} | ${fitText(t.description || "General", 20)} | S/ ${fmt(amtVal)} | ${statusLabel} |`;
                }).join("\n") +
                `\n\n**Análisis de Relación Think:**\n` +
                (pendingCobros > pendingPagos
                  ? `⚠️ Tienes un saldo pendiente a tu favor de **S/ ${fmt(pendingCobros - pendingPagos)}**. Te recomiendo enviarle un recordatorio amigable de pago indicando los detalles del vencimiento.`
                  : pendingPagos > pendingCobros
                  ? `⚠️ Tienes un saldo pendiente por pagarle a ${matchedName} de **S/ ${fmt(pendingPagos - pendingCobros)}**. Prioriza liquidar esta deuda para mantener una buena reputación financiera.`
                  : `✅ No tienes balances pendientes activos con ${matchedName} hoy.`);
            }
            else if (matchedCategory) {
              const catTxs = transactions.filter((t: any) => (t.category?.name || t.category || "").toLowerCase().includes(matchedCategory.toLowerCase()));
              const totalPaid = catTxs.filter((t: any) => t.status === "PAID").reduce((sum: number, t: any) => sum + Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1), 0);
              const totalPending = catTxs.filter((t: any) => t.status !== "PAID").reduce((sum: number, t: any) => sum + Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1), 0);

              replyText = `### Análisis en Categoría: ${matchedCategory} 📂📊\n\n` +
                `He consolidado tus movimientos en la categoría **${matchedCategory}**:\n\n` +
                `* **Consumo Realizado (Pagado):** S/ ${fmt(totalPaid)}\n` +
                `* **Compromisos Pendientes:** S/ ${fmt(totalPending)}\n\n` +
                `**Últimas transacciones en ${matchedCategory}:**\n\n` +
                `| Fecha | Descripción | Monto | Estado |\n` +
                `| :--- | :--- | :--- | :--- |\n` +
                catTxs.slice(0, 5).map((t: any) => {
                  const tDate = t.date ? new Date(t.date).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "N/A";
                  const amtVal = Number(t.amount || 0) * (t.currency === "USD" ? Number(t.exchangeRate || 1) : 1);
                  const statusLabel = t.status === "PAID" ? "Pagado" : "Pendiente";
                  return `| ${tDate} | ${fitText(t.description || "Sin descripción", 25)} | S/ ${fmt(amtVal)} | ${statusLabel} |`;
                }).join("\n") +
                `\n\n**Recomendación de Categoría Think:**\n` +
                `Esta categoría representa el **${((totalPaid / Math.max(avgExp, 1)) * 100).toFixed(1)}%** de tus egresos mensuales totales. ` +
                (totalPaid > avgExp * 0.20
                  ? `⚠️ Es uno de tus mayores rubros de consumo. Considera ponerle un tope semanal para liberar más saldo neto disponible.`
                  : `✅ Tu gasto en este rubro está en una proporción saludable.`);
            }
            else {
              // ── FALLBACK TOTALMENTE IA (ChatGPT Style) ──
              replyText = `### Asesoría Financiera Inteligente Think 🤖📊\n\n` +
                `He procesado tu consulta: *"${text}"*.\n\n` +
                `Para brindarte una respuesta precisa y orientada a tu realidad del **Módulo Personal**, he auditado tus transacciones actuales y saldos disponibles:\n\n` +
                `• **Saldo Neto Disponible:** S/ ${fmt(totalBalance)}\n` +
                `• **Ingresos Mensuales Promedio:** S/ ${fmt(avgInc)}\n` +
                `• **Egresos Mensuales Promedio:** S/ ${fmt(avgExp)}\n` +
                `• **Cuentas Pendientes por Pagar (Deudas):** S/ ${fmt(payableDebt)}\n` +
                `• **Cuentas por Cobrar Pendientes (A favor):** S/ ${fmt(receivableDebt)}\n\n` +
                `**Diagnóstico Rápido de Thin:**\n` +
                (totalBalance > payableDebt 
                  ? `✅ Tu saldo neto disponible es suficiente para cubrir todas tus deudas pendientes. Cuentas con un saldo neto favorable de **S/ ${fmt(totalBalance - payableDebt)}**.`
                  : `⚠️ Tu saldo neto disponible actual es menor que tus deudas por pagar. Prioriza recaudar tus cuentas por cobrar o reducir tus gastos variables de ocio para recuperar balance.`) + `\n\n` +
                `**¿Cómo puedo ayudarte más específicamente?**\n` +
                `Como tu asistente financiero personal, puedes consultarme preguntas directas de tu saldo y finanzas como:\n` +
                `• *«¿Cuánto gasté en comida?»*, *«¿Cuánto gasté en pasajes?»* o *«¿Cuánto gasté en servicios?»*\n` +
                `• *«¿Quién me debe dinero?»*, *«¿Qué deudas tengo?»* o *«¿Mejorar mi score?»*\n` +
                `• *«¿Cómo funciona el interés compuesto?»* o *«Consejos para ahorrar hoy»*.\n\n` +
                `*Nota: Este análisis es de carácter estrictamente personal. Los movimientos comerciales o de negocio no están incluidos en esta simulación.*`;
            }
          }
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
