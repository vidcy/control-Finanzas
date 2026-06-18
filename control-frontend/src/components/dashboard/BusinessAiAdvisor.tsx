import { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Package,
  BarChart3,
  Zap,
  ChevronDown,
  ChevronUp,
  Target,
  ShieldCheck,
  Lightbulb,
  Activity,
} from "lucide-react";

interface AiAdvisorProps {
  metrics: {
    revenue: number;
    inventory: number;
    totalOpex?: number;
    lowStockCount?: number;
    productsCount?: number;
  };
}

type InsightType = "danger" | "warning" | "success" | "info" | "tip";

interface Insight {
  type: InsightType;
  icon: any;
  title: string;
  message: string;
  action?: string;
  priority: number;
}

const insightStyles: Record<InsightType, { gradient: string; iconBg: string; border: string; badge: string }> = {
  danger: {
    gradient: "from-rose-50 to-red-50",
    iconBg: "bg-rose-100 text-rose-600",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-700",
  },
  warning: {
    gradient: "from-amber-50 to-orange-50",
    iconBg: "bg-amber-100 text-amber-600",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  success: {
    gradient: "from-emerald-50 to-teal-50",
    iconBg: "bg-emerald-100 text-emerald-600",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  info: {
    gradient: "from-blue-50 to-indigo-50",
    iconBg: "bg-blue-100 text-blue-600",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  tip: {
    gradient: "from-violet-50 to-purple-50",
    iconBg: "bg-violet-100 text-violet-600",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-700",
  },
};

const typeLabels: Record<InsightType, string> = {
  danger: "⚠️ Urgente",
  warning: "🔔 Atención",
  success: "✅ Excelente",
  info: "💡 Información",
  tip: "🚀 Sugerencia",
};

export default function BusinessAiAdvisor({ metrics }: AiAdvisorProps) {
  const [expanded, setExpanded] = useState(true);

  const profit = (metrics.revenue || 0) - (metrics.totalOpex || 0);
  const profitMargin =
    metrics.revenue > 0 ? (profit / metrics.revenue) * 100 : 0;
  const opexRatio =
    metrics.revenue > 0
      ? ((metrics.totalOpex || 0) / metrics.revenue) * 100
      : 0;

  // ── Health Score (0‒100) ─────────────────────────────────────────────────
  const calcScore = () => {
    let score = 70; // Base
    if (profitMargin > 30) score += 20;
    else if (profitMargin > 10) score += 10;
    else if (profitMargin < 0) score -= 30;

    if (metrics.lowStockCount && metrics.lowStockCount > 0) score -= metrics.lowStockCount * 5;
    if (metrics.inventory > metrics.revenue * 3 && metrics.revenue > 0) score -= 10;
    if (opexRatio < 30) score += 10;
    else if (opexRatio > 80) score -= 20;

    return Math.max(0, Math.min(100, score));
  };

  const score = calcScore();
  const scoreColor =
    score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-500" : "text-rose-600";
  const scoreRingColor =
    score >= 80 ? "stroke-emerald-400" : score >= 50 ? "stroke-amber-400" : "stroke-rose-400";
  const scoreLabel =
    score >= 80 ? "Negocio Saludable" : score >= 50 ? "Atención Requerida" : "Riesgo Detectado";

  // ── Heuristics Engine ────────────────────────────────────────────────────
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];

    // 1. Gastos superan ingresos
    if ((metrics.totalOpex || 0) > metrics.revenue && (metrics.totalOpex || 0) > 0 && metrics.revenue > 0) {
      insights.push({
        type: "danger",
        icon: AlertTriangle,
        title: "Gastos Superan Ingresos",
        message: `Tus egresos operativos (S/ ${(metrics.totalOpex || 0).toFixed(2)}) superan tus ingresos por ventas (S/ ${metrics.revenue.toFixed(2)}). El negocio está perdiendo dinero.`,
        action: "Revisa y reduce costos fijos urgentemente",
        priority: 1,
      });
    }

    // 2. Margen negativo / sin ingresos
    if (metrics.revenue === 0) {
      insights.push({
        type: "warning",
        icon: Target,
        title: "Sin Ingresos Registrados",
        message: "Aún no tienes ventas registradas en el sistema. Empieza registrando tus primeras ventas en el POS o en Tesorería.",
        action: "Ir al Punto de Venta (POS)",
        priority: 2,
      });
    }

    // 3. Capital inmovilizado en inventario
    if (metrics.inventory > metrics.revenue * 3 && metrics.revenue > 0) {
      insights.push({
        type: "warning",
        icon: Package,
        title: "Capital Inmovilizado en Stock",
        message: `Tienes S/ ${metrics.inventory.toFixed(2)} en inventario (${(metrics.inventory / metrics.revenue).toFixed(1)}x tus ingresos actuales). Considera liquidar mercadería de baja rotación.`,
        action: "Ver inventario y aplicar descuentos",
        priority: 3,
      });
    }

    // 4. Bajo stock
    if (metrics.lowStockCount && metrics.lowStockCount > 0) {
      insights.push({
        type: "info",
        icon: AlertTriangle,
        title: `${metrics.lowStockCount} Producto(s) con Bajo Stock`,
        message: `Tienes ${metrics.lowStockCount} producto(s) por debajo del mínimo de stock. Reponer a tiempo evita perder ventas potenciales.`,
        action: "Ir a Inventario → Reponer Stock",
        priority: 4,
      });
    }

    // 5. Muy buena rentabilidad
    if (profitMargin > 40 && metrics.revenue > 0) {
      insights.push({
        type: "success",
        icon: TrendingUp,
        title: "Rentabilidad Excepcional",
        message: `Tu margen de ganancia es ${profitMargin.toFixed(1)}%. Estás por encima del promedio del sector. Considera reinvertir parte de la utilidad para crecer.`,
        action: "Analiza oportunidades de expansión",
        priority: 5,
      });
    } else if (profitMargin > 15 && metrics.revenue > 0) {
      insights.push({
        type: "success",
        icon: CheckCircle2,
        title: "Rentabilidad Saludable",
        message: `Tu margen neto es ${profitMargin.toFixed(1)}%, que está dentro de un rango positivo. Mantén el control de tus gastos para seguir creciendo.`,
        priority: 6,
      });
    }

    // 6. OPEX muy alto
    if (opexRatio > 70 && metrics.revenue > 0) {
      insights.push({
        type: "warning",
        icon: TrendingDown,
        title: "Costo Operativo Alto",
        message: `Tus gastos representan el ${opexRatio.toFixed(0)}% de tus ingresos. El objetivo ideal es mantenerlos por debajo del 70% para garantizar rentabilidad.`,
        action: "Identifica gastos a reducir",
        priority: 7,
      });
    }

    // 7. Consejo estratégico de diversificación
    if (metrics.revenue > 0 && profitMargin > 0 && (metrics.lowStockCount || 0) === 0) {
      insights.push({
        type: "tip",
        icon: Lightbulb,
        title: "Consejo de Crecimiento",
        message: "Tu negocio tiene estabilidad. Es el momento ideal para diversificar: agrega nuevos productos o servicios, y considera abrir una segunda línea de ingresos pasivos.",
        priority: 8,
      });
    }

    // Default
    if (insights.length === 0) {
      insights.push({
        type: "info",
        icon: Activity,
        title: "Sin datos suficientes",
        message: "Comienza a registrar tus ventas, gastos e inventario. Con más datos el motor de IA podrá generar análisis precisos de tu negocio.",
        priority: 99,
      });
    }

    return insights.sort((a, b) => a.priority - b.priority);
  };

  const insights = generateInsights();
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="mt-6 rounded-[2rem] overflow-hidden border border-indigo-100 shadow-lg shadow-indigo-50">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-violet-50 via-indigo-50 to-blue-50 p-6 border-b border-indigo-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Title */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-gray-900">FinanzasPro AI Advisor</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full uppercase tracking-widest">BETA</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Motor de análisis inteligente • {insights.length} hallazgo{insights.length !== 1 ? "s" : ""} detectado{insights.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Health Score Ring */}
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="7" />
                  <circle
                    cx="40" cy="40" r="36"
                    fill="none"
                    strokeWidth="7"
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ${scoreRingColor}`}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-xl font-black leading-none ${scoreColor}`}>{score}</span>
                  <span className="text-[8px] text-gray-400 font-bold uppercase">/100</span>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-600 mt-1">{scoreLabel}</span>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-xl bg-white border border-indigo-100 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-white rounded-2xl p-3 border border-indigo-50 shadow-sm text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Margen Neto</p>
            <p className={`text-lg font-black mt-0.5 ${profitMargin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {profitMargin.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-indigo-50 shadow-sm text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Costo/Ingreso</p>
            <p className={`text-lg font-black mt-0.5 ${opexRatio < 70 ? "text-blue-600" : "text-amber-600"}`}>
              {opexRatio.toFixed(0)}%
            </p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-indigo-50 shadow-sm text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Utilidad</p>
            <p className={`text-lg font-black mt-0.5 ${profit >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
              S/ {Math.abs(profit).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Insights Grid ── */}
      {expanded && (
        <div className="bg-white/80 backdrop-blur-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-violet-500" />
            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Análisis y Recomendaciones</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, idx) => {
              const styles = insightStyles[insight.type];
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border bg-gradient-to-br ${styles.gradient} ${styles.border} flex gap-3 items-start group hover:shadow-md transition-all duration-200`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.iconBg} shadow-sm`}>
                    <insight.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${styles.badge}`}>
                        {typeLabels[insight.type]}
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-gray-900 mb-1">{insight.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{insight.message}</p>
                    {insight.action && (
                      <p className="mt-2 text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-300" />
            <p className="text-[10px] text-gray-400 font-medium">
              Análisis basado en tus datos financieros actuales. Actualiza tus registros para obtener insights más precisos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
