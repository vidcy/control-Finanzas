import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Bot,
  PieChart,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Compass,
  Zap,
  Target,
  PiggyBank,
  Wallet,
  Coins,
  CalendarCheck,
  Flame,
  ArrowUpRight,
  Info
} from 'lucide-react';

interface PersonalAIAdvisorProps {
  analysis: any;
  onActionClick: (
    category: string,
    type: string,
    subCategoryId?: string,
    module?: string,
    tab?: string
  ) => void;
}

const fmt = (n: number, decimals = 2) =>
  (n || 0).toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export default function PersonalAIAdvisor({ analysis, onActionClick }: PersonalAIAdvisorProps) {
  const [activeTab, setActiveTab] = useState<"diagnostico" | "regla503020" | "fugas" | "plan">("diagnostico");

  if (!analysis) return null;

  const {
    score = 50,
    grade = "C",
    healthLabel = "Estable",
    healthColor = "text-amber-600 bg-amber-50 border-amber-200",
    healthDescription = "",
    scoreBreakdown = {},
    rule50_30_20,
    antAnalysis,
    runwayAnalysis,
    monthForecast,
    debtStrategy,
    actionPlan = [],
  } = analysis;

  // Render SVG circular score
  const strokeDasharray = `${score}, 100`;
  let scoreColor = "text-emerald-500";
  let scoreGlow = "from-emerald-400/20 to-teal-400/5";
  let badgeColor = "bg-emerald-500";

  if (score < 40) {
    scoreColor = "text-rose-500";
    scoreGlow = "from-rose-400/20 to-red-400/5";
    badgeColor = "bg-rose-500";
  } else if (score < 70) {
    scoreColor = "text-amber-500";
    scoreGlow = "from-amber-400/20 to-yellow-400/5";
    badgeColor = "bg-amber-500";
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col h-full hover:shadow-xl hover:border-indigo-200/60 transition-all duration-500 relative text-left">
      {/* Glow ambient background */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-100/30 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex items-center justify-between relative z-10 bg-gradient-to-r from-white via-slate-50/50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl text-white flex items-center justify-center shadow-md shadow-indigo-300/40 relative">
            <Bot className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                Asesor Inteligente IA
              </h3>
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-md tracking-wider">
                PRO 3.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Análisis Predictivo en Tiempo Real
            </p>
          </div>
        </div>

        {/* Grade Pill */}
        <div className="flex items-center gap-1.5">
          <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${healthColor}`}>
            <span>{grade}</span>
            <span className="text-[9px] font-bold opacity-80">&bull; {score}/100</span>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="grid grid-cols-4 border-b border-slate-100 p-1.5 bg-slate-50/70 text-center gap-1">
        {[
          { id: "diagnostico", label: "Diagnóstico", icon: <Target className="w-3.5 h-3.5" /> },
          { id: "regla503020", label: "50/30/20", icon: <PieChart className="w-3.5 h-3.5" /> },
          { id: "fugas", label: "Fugas & Runway", icon: <Flame className="w-3.5 h-3.5" /> },
          { id: "plan", label: "Plan Acción", icon: <Zap className="w-3.5 h-3.5" />, badge: actionPlan.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all duration-200 flex flex-col sm:flex-row items-center justify-center gap-1 relative ${
                isActive
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60"
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className={`w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center ${
                  isActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* CONTENT SCROLLABLE AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-premium space-y-4 min-h-[360px]">
        <AnimatePresence mode="wait">
          {/* TAB 1: DIAGNÓSTICO & SCORE MULTIDIMENSIONAL */}
          {activeTab === "diagnostico" && (
            <motion.div
              key="diagnostico"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Score Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-100/60 shadow-sm flex items-center gap-4">
                {/* Circular Chart */}
                <div className="relative w-20 h-20 shrink-0">
                  <div className={`absolute -inset-1 bg-gradient-to-r ${scoreGlow} rounded-full blur-md opacity-80`} />
                  <svg viewBox="0 0 36 36" className="w-full h-full relative z-10">
                    <path
                      className="text-slate-100 stroke-current"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <motion.path
                      initial={{ strokeDasharray: "0, 100" }}
                      animate={{ strokeDasharray }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={`${scoreColor} stroke-current`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <span className="text-2xl font-black text-slate-800 leading-none">{score}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">pts</span>
                  </div>
                  <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full ${badgeColor} flex items-center justify-center border-2 border-white shadow-sm z-30`}>
                    <span className="text-white font-black text-[10px]">{grade}</span>
                  </div>
                </div>

                {/* Score Details */}
                <div className="flex-1 min-w-0">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mb-1 ${healthColor}`}>
                    {healthLabel}
                  </span>
                  <p className="text-xs font-bold text-slate-700 leading-snug">
                    {healthDescription}
                  </p>
                </div>
              </div>

              {/* 5 Pillars Breakdown */}
              <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-2.5">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Desglose de Pilares Evaluados</span>
                  <span className="text-[9px] text-slate-400">Puntaje Máximo: 100</span>
                </h4>

                {Object.entries(scoreBreakdown).map(([key, item]: [string, any]) => {
                  const pct = Math.min(100, Math.round((item.score / item.max) * 100));
                  let barColor = "bg-emerald-500";
                  if (pct < 40) barColor = "bg-rose-500";
                  else if (pct < 70) barColor = "bg-amber-500";

                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-600">{item.label}</span>
                        <span className="font-black text-slate-800">
                          {item.score} / {item.max} pts
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full ${barColor} rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Monthly Forecast Card */}
              {monthForecast && (
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                      monthForecast.status === "SURPLUS" ? "bg-emerald-500" : "bg-rose-500"
                    }`}>
                      {monthForecast.status === "SURPLUS" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Proyección Cierre de Mes
                      </p>
                      <p className="text-xs font-black text-slate-800">
                        {monthForecast.status === "SURPLUS" ? (
                          <span className="text-emerald-600">Superávit Proyectado: + S/ {fmt(monthForecast.projectedNet)}</span>
                        ) : (
                          <span className="text-rose-600">Déficit Proyectado: - S/ {fmt(Math.abs(monthForecast.projectedNet))}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    Quedan {monthForecast.daysRemaining} días
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: REGLA 50/30/20 */}
          {activeTab === "regla503020" && rule50_30_20 && (
            <motion.div
              key="regla503020"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Header explanation */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-900 font-medium leading-relaxed">
                  <strong>Regla de Oro 50/30/20:</strong> Se recomienda destinar máx. <strong>50%</strong> a Necesidades (servicios, comida, vivienda), máx. <strong>30%</strong> a Deseos (estilo de vida) y mín. <strong>20%</strong> a Ahorro/Inversión.
                </p>
              </div>

              {/* Segmented bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <span>Distribución Actual de tus Gastos</span>
                </div>
                <div className="h-4 rounded-xl overflow-hidden flex bg-slate-100 border border-slate-200/80 shadow-inner">
                  <div
                    style={{ width: `${Math.min(100, rule50_30_20.needs.percentage)}%` }}
                    className="bg-blue-500 h-full transition-all"
                    title={`Necesidades: ${rule50_30_20.needs.percentage.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${Math.min(100, rule50_30_20.wants.percentage)}%` }}
                    className="bg-purple-500 h-full transition-all"
                    title={`Deseos: ${rule50_30_20.wants.percentage.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${Math.min(100, rule50_30_20.savings.percentage)}%` }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`Ahorros: ${rule50_30_20.savings.percentage.toFixed(1)}%`}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Necesidades ({rule50_30_20.needs.percentage.toFixed(0)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500" /> Deseos ({rule50_30_20.wants.percentage.toFixed(0)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Ahorros ({rule50_30_20.savings.percentage.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* 3 Pillar Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Needs */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                  <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest block">50% Necesidades</span>
                  <p className="text-sm font-black text-slate-800">S/ {fmt(rule50_30_20.needs.amount, 0)}</p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {rule50_30_20.needs.percentage.toFixed(1)}% del total
                  </p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                    rule50_30_20.needs.status === "HEALTHY" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {rule50_30_20.needs.status === "HEALTHY" ? "✓ En Rango" : "⚠️ Excedido"}
                  </span>
                </div>

                {/* Wants */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                  <span className="text-[9px] font-black text-purple-700 uppercase tracking-widest block">30% Deseos</span>
                  <p className="text-sm font-black text-slate-800">S/ {fmt(rule50_30_20.wants.amount, 0)}</p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {rule50_30_20.wants.percentage.toFixed(1)}% del total
                  </p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                    rule50_30_20.wants.status === "HEALTHY" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}>
                    {rule50_30_20.wants.status === "HEALTHY" ? "✓ En Rango" : "⚠️ Desviado"}
                  </span>
                </div>

                {/* Savings */}
                <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block">20% Ahorro</span>
                  <p className="text-sm font-black text-slate-800">S/ {fmt(rule50_30_20.savings.amount, 0)}</p>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {rule50_30_20.savings.percentage.toFixed(1)}% de ingresos
                  </p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                    rule50_30_20.savings.status === "HEALTHY" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {rule50_30_20.savings.status === "HEALTHY" ? "✓ Óptimo" : "⚠️ Bajo meta"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: FUGAS & RUNWAY */}
          {activeTab === "fugas" && (
            <motion.div
              key="fugas"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Runway Gauge */}
              {runwayAnalysis && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 border border-slate-200/80 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        🛡️
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Runway Financiero</h4>
                        <p className="text-[10px] text-slate-400 font-bold">{runwayAnalysis.label}</p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-indigo-600 font-mono">
                      {runwayAnalysis.months.toFixed(1)} <span className="text-[10px] font-bold text-slate-400">meses</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Progreso hacia Meta de 3 Meses</span>
                      <span className="font-black text-slate-700">{runwayAnalysis.progress3M.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${runwayAnalysis.progress3M}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium">
                    Con tu saldo líquido actual (<strong>S/ {fmt(runwayAnalysis.currentAmount)}</strong>) y tu ritmo de gasto mensual (<strong>S/ {fmt(runwayAnalysis.monthlyBurnRate)}/mes</strong>), podrías cubrir tus necesidades por aprox. <strong>{runwayAnalysis.days} días</strong> si tus ingresos se detuvieran hoy.
                  </p>
                </div>
              )}

              {/* Ant Expenses (Gastos Hormiga) */}
              {antAnalysis && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Fugas por &apos;Gastos Hormiga&apos;</h4>
                        <p className="text-[10px] text-slate-400 font-bold">{antAnalysis.count} compras pequeñas detectadas</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                      S/ {fmt(antAnalysis.total)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-rose-900">Impacto Proyectado al Año:</span>
                    <span className="font-black text-rose-700">S/ {fmt(antAnalysis.annualImpact, 0)} al año</span>
                  </div>

                  {antAnalysis.items && antAnalysis.items.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Últimas fugas registradas:</span>
                      {antAnalysis.items.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] p-2 bg-slate-50 rounded-lg">
                          <span className="font-bold text-slate-700 truncate max-w-[180px]">{item.description}</span>
                          <span className="font-black text-slate-900">S/ {fmt(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: PLAN DE ACCIÓN RECOMENDADO */}
          {activeTab === "plan" && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {actionPlan.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="text-sm font-black text-slate-800">¡Finanzas Impecables!</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    No se han detectado fugas críticas ni deudas en mora. Continúa con este mismo orden presupuestario.
                  </p>
                </div>
              ) : (
                actionPlan.map((action: any) => {
                  let borderClass = "border-slate-200/80 hover:border-indigo-300";
                  let badgeBg = "bg-slate-100 text-slate-700";
                  let icon = <Zap className="w-4 h-4 text-indigo-500 shrink-0" />;

                  if (action.type === "danger") {
                    borderClass = "border-rose-200 bg-rose-50/30 hover:border-rose-300";
                    badgeBg = "bg-rose-100 text-rose-700";
                    icon = <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />;
                  } else if (action.type === "warning") {
                    borderClass = "border-amber-200 bg-amber-50/30 hover:border-amber-300";
                    badgeBg = "bg-amber-100 text-amber-800";
                    icon = <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />;
                  } else if (action.type === "opportunity") {
                    borderClass = "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300";
                    badgeBg = "bg-emerald-100 text-emerald-800";
                    icon = <PiggyBank className="w-4 h-4 text-emerald-600 shrink-0" />;
                  }

                  return (
                    <div
                      key={action.id}
                      className={`p-3.5 rounded-2xl bg-white border ${borderClass} shadow-sm transition-all space-y-2`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {icon}
                          <div>
                            <h5 className="text-xs font-black text-slate-800">{action.title}</h5>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mt-0.5 ${badgeBg}`}>
                              {action.impact}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed pl-6">
                        {action.message}
                      </p>

                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onActionClick(action.actionCategory, action.actionType)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                        >
                          <span>{action.actionText}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER */}
      <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
        <Sparkles className="w-3 h-3 text-indigo-500" />
        Inteligencia Financiera Personal Optimizada
      </div>
    </div>
  );
}
