import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  PieChart,
  Bot
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
  n.toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export default function PersonalAIAdvisor({ analysis, onActionClick }: PersonalAIAdvisorProps) {
  const [activeAITab, setActiveAITab] = useState<"resumen" | "analisis" | "recomendaciones">("resumen");

  const renderScoreCircle = () => {
    const strokeDasharray = `${analysis.score}, 100`;
    let colorClasses = {
      circle: "text-emerald-500",
      bgGlow: "from-emerald-400/20 to-teal-400/5",
      badge: "bg-emerald-500",
      text: "text-emerald-600"
    };

    if (analysis.score < 40) {
      colorClasses = {
        circle: "text-rose-500",
        bgGlow: "from-rose-400/20 to-red-400/5",
        badge: "bg-rose-500",
        text: "text-rose-600"
      };
    } else if (analysis.score < 70) {
      colorClasses = {
        circle: "text-amber-500",
        bgGlow: "from-amber-400/20 to-yellow-400/5",
        badge: "bg-amber-500",
        text: "text-amber-600"
      };
    }

    return (
      <div className="relative w-24 h-24 flex-shrink-0 group cursor-pointer">
        <div className={`absolute -inset-2 bg-gradient-to-r ${colorClasses.bgGlow} rounded-full blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-500`} />
        
        <svg viewBox="0 0 36 36" className="w-full h-full circular-chart relative z-10 transform group-hover:scale-105 transition-transform duration-500">
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
            className={`${colorClasses.circle} stroke-current`}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col z-20">
          <span className="text-3xl font-black text-slate-800 leading-none tracking-tight">{analysis.score}</span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Score</span>
        </div>

        <div className={`absolute -top-1 -right-1 w-7 h-7 rounded-full ${colorClasses.badge} flex items-center justify-center border-2 border-white shadow-md z-30 transform group-hover:rotate-12 transition-transform`}>
          <span className="text-white font-black text-xs leading-none">{analysis.grade}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-white/95 via-white/80 to-slate-50/50 backdrop-blur-2xl rounded-[2rem] border border-white shadow-[0_30px_60px_rgba(99,102,241,0.06)] overflow-hidden flex flex-col h-full hover:shadow-2xl hover:border-indigo-100/50 transition-all duration-500">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <div className="p-5 pb-4 border-b border-slate-100/80 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30 animate-pulse relative overflow-hidden group">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Analista Financiero IA</h3>
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[8px] font-black rounded-md uppercase tracking-wider">PRO</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Diagnóstico en tiempo real
            </p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-150/50 px-5 pt-3 gap-2 overflow-x-auto scrollbar-hide bg-slate-50/50">
        {[
          { id: "resumen", label: "Resumen", icon: <Bot className="w-3.5 h-3.5" /> },
          { id: "analisis", label: "Análisis", icon: <PieChart className="w-3.5 h-3.5" /> },
          { id: "recomendaciones", label: "Recomendaciones", icon: <CheckCircle className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAITab(tab.id as any)}
            className={`flex items-center gap-1.5 pb-2.5 px-1.5 text-xs font-black uppercase tracking-wider transition-all duration-300 relative whitespace-nowrap ${
              activeAITab === tab.id
                ? 'text-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeAITab === tab.id && (
              <motion.div
                layoutId="ai-tab-indicator-premium-sidebar"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* CONTENT SCROLL CONTAINER */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-premium flex flex-col relative min-h-[350px]">
        <AnimatePresence mode="wait">
          {activeAITab === "resumen" && (
            <motion.div
              key="resumen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Score card */}
              <div className="flex items-center gap-5 p-5 bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-white border border-indigo-100/50 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />
                {renderScoreCircle()}
                <div className="flex-1">
                  <div className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-1.5 border ${analysis.healthColor}`}>
                    Salud: {analysis.healthLabel}
                  </div>
                  <h4 className="font-black text-slate-800 text-base leading-snug">
                    {analysis.score >= 80 ? "¡Salud financiera en nivel TOP! 🏆" :
                     analysis.score >= 60 ? "¡Vas por buen camino! 👍" :
                     analysis.score >= 40 ? "Hay vulnerabilidades críticas ⚠️" :
                     "¡Atención: Alerta roja! 🚨"}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-bold mt-1">
                    {analysis.score >= 80 ? "Tus indicadores muestran un excelente balance. Sigue con esta misma disciplina." :
                     "Te recomiendo ejecutar las recomendaciones prioritarias para blindar tu patrimonio."}
                  </p>
                </div>
              </div>

              {/* Critical Alerts / Opportunities */}
              <div className="space-y-2.5">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas IA Prioritarias</h5>
                {analysis.riskAnalysis.critical.length > 0 ? (
                  analysis.riskAnalysis.critical.slice(0, 2).map((risk: any, i: number) => (
                    <div key={i} className="flex gap-3 p-4 bg-rose-50/60 hover:bg-rose-50 border border-rose-100 rounded-2xl transition-colors hover:shadow-sm">
                      <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-rose-900 uppercase tracking-tight">{risk.type}</p>
                        <p className="text-[11px] text-rose-700 mt-0.5 font-bold">{risk.message}</p>
                      </div>
                    </div>
                  ))
                ) : analysis.riskAnalysis.opportunities.length > 0 ? (
                  analysis.riskAnalysis.opportunities.slice(0, 2).map((opp: any, i: number) => (
                    <div
                      key={i}
                      className="flex gap-3 p-4 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 rounded-2xl cursor-pointer transition-all hover:shadow-sm hover:scale-[1.01]"
                      onClick={() => onActionClick(opp.category, opp.type)}
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-emerald-900 uppercase tracking-tight">{opp.type}</p>
                        <p className="text-[11px] text-emerald-700 mt-0.5 font-bold">{opp.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-5 text-center bg-emerald-50/30 border border-emerald-100 rounded-2xl text-emerald-700 font-bold text-xs">
                    🌟 ¡Todos los sistemas en verde! Sigue manteniendo este buen ritmo.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeAITab === "analisis" && (
            <motion.div
              key="analisis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Category Breakdown */}
              <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2.5xl">
                <h4 className="text-xs font-black text-slate-800 mb-3.5 flex items-center gap-2 uppercase tracking-wider">
                  <PieChart className="w-4 h-4 text-indigo-500" /> Top Categorías de Gastos
                </h4>
                {analysis.expenseAnalysis.topCategories.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 font-bold">Sin transacciones registradas</p>
                ) : (
                  <div className="space-y-3">
                    {analysis.expenseAnalysis.topCategories.slice(0, 3).map((cat: any, i: number) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400" />
                            {cat.name}
                          </span>
                          <span className="font-black text-slate-800">
                            S/ {fmt(cat.amount, 0)}{' '}
                            <span className="text-slate-400 font-bold text-[10px] ml-1">({cat.percentage.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-650 rounded-full"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fixed vs Variable */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gastos Fijos</p>
                  <p className="text-sm font-black text-indigo-650 mt-1">S/ {fmt(analysis.expenseAnalysis.fixedVsVariable.fixed, 0)}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{analysis.expenseAnalysis.fixedVsVariable.fixedPct.toFixed(0)}% del total</p>
                </div>
                <div className="p-3.5 bg-purple-50/40 border border-purple-100/50 rounded-2xl text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gastos Variables</p>
                  <p className="text-sm font-black text-purple-650 mt-1">S/ {fmt(analysis.expenseAnalysis.fixedVsVariable.variable, 0)}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{(100 - analysis.expenseAnalysis.fixedVsVariable.fixedPct).toFixed(0)}% del total</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeAITab === "recomendaciones" && (
            <motion.div
              key="recomendaciones"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {/* Critical */}
              {analysis.riskAnalysis.critical.map((risk: any, i: number) => (
                <div key={`crit-${i}`} className="p-4 rounded-2xl border border-rose-100 bg-white hover:border-rose-200 transition-colors shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500" />
                  <div className="flex items-start gap-3 pl-1">
                    <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-slate-800 leading-snug">{risk.message}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">{risk.action}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onActionClick(risk.category, risk.type)}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-650 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    Solucionar ahora <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Opportunities */}
              {analysis.riskAnalysis.opportunities.map((opp: any, i: number) => (
                <div key={`opp-${i}`} className="p-4 rounded-2xl border border-emerald-100 bg-white hover:border-emerald-200 transition-colors shadow-sm flex flex-col gap-3 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
                  <div className="flex items-start gap-3 pl-1">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-slate-800 leading-snug">{opp.message}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">{opp.action}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onActionClick(opp.category, opp.type)}
                    className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-650 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    Aprovechar oportunidad <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {analysis.riskAnalysis.critical.length === 0 && analysis.riskAnalysis.opportunities.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3" />
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Cero Problemas Detectados</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">Tu perfil financiero se encuentra impecable hoy.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
