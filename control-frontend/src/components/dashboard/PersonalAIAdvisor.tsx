import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Zap, ShieldAlert, ChevronRight, TrendingUp as TrendUp, Info } from 'lucide-react';

interface PersonalAIAdvisorProps {
    analysis: any;
    onActionClick: (category: string, type: string, categoryId?: string, subCategoryId?: string, module?: string, tab?: string) => void;
}

const fmt = (n: number, decimals = 2) =>
  n.toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export default function PersonalAIAdvisor({ analysis, onActionClick }: PersonalAIAdvisorProps) {
    const [activeAITab, setActiveAITab] = useState<"resumen" | "analisis" | "recomendaciones" | "proyecciones">("resumen");

    const renderScoreCircle = () => {
        const strokeDasharray = `${analysis.score}, 100`;
        return (
            <div className="relative w-24 h-24 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full circular-chart">
                    <path
                        className="text-gray-200 stroke-current"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                        className={`${analysis.score >= 70 ? 'text-green-500' : analysis.score >= 40 ? 'text-yellow-500' : 'text-red-500'} stroke-current`}
                        strokeWidth="3"
                        strokeDasharray={strokeDasharray}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-gray-900 leading-none">{analysis.score}</span>
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Score</span>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full relative">
            <div className="p-6 pb-0 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Zap className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Asesor IA Pro</h3>
                    <p className="text-sm text-gray-500 font-medium">Análisis en tiempo real</p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex border-b border-gray-100 px-6 pt-4 gap-4 overflow-x-auto scrollbar-hide">
                {(["resumen", "analisis", "recomendaciones"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveAITab(tab)}
                        className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap ${activeAITab === tab ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {activeAITab === tab && (
                            <motion.div layoutId="ai-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                {activeAITab === "resumen" && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/50">
                            {renderScoreCircle()}
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 text-lg mb-1">
                                    {analysis.score >= 80 ? "¡Excelente salud financiera! 🌟" :
                                     analysis.score >= 60 ? "Vas por buen camino 👍" :
                                     analysis.score >= 40 ? "Hay aspectos por mejorar 🤔" :
                                     "Situación crítica ⚠️"}
                                </h4>
                                <p className="text-sm text-gray-600 font-medium">
                                    {analysis.score >= 80 ? "Sigue así, tus hábitos son muy saludables." :
                                     "Revisa las recomendaciones para optimizar tus finanzas y reducir riesgos."}
                                </p>
                            </div>
                        </div>

                        {/* Top Critical / Opportunities Summary */}
                        {analysis.riskAnalysis.critical.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Alertas Urgentes</h4>
                                {analysis.riskAnalysis.critical.slice(0, 2).map((risk: any, i: number) => (
                                    <div key={i} className="flex gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                                        <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-red-900">{risk.type}</p>
                                            <p className="text-xs text-red-700 mt-0.5">{risk.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {analysis.riskAnalysis.critical.length === 0 && analysis.riskAnalysis.opportunities.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Oportunidades Destacadas</h4>
                                {analysis.riskAnalysis.opportunities.slice(0, 2).map((opp: any, i: number) => (
                                    <div key={i} className="flex gap-3 p-4 bg-green-50 border border-green-100 rounded-xl cursor-pointer hover:bg-green-100 transition-colors" onClick={() => onActionClick(opp.category, opp.type)}>
                                        <TrendUp className="w-5 h-5 text-green-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-green-900">{opp.type}</p>
                                            <p className="text-xs text-green-700 mt-0.5">{opp.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeAITab === "analisis" && (
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-500" /> Desglose de Gastos
                            </h4>
                            <div className="space-y-2">
                                {analysis.expenseAnalysis.topCategories.slice(0, 3).map((cat: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 font-medium">{cat.name}</span>
                                        <span className="font-bold text-gray-900">S/ {fmt(cat.amount)} <span className="text-gray-400 font-normal text-xs ml-1">({cat.percentage.toFixed(1)}%)</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Info className="w-4 h-4 text-indigo-500" /> Ahorros y Liquidez
                            </h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Tasa de Ahorro</span>
                                    <span className="font-bold text-gray-900">{analysis.savingsAnalysis.savingsRate.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 font-medium">Fondo Emergencia</span>
                                    <span className="font-bold text-gray-900">{analysis.savingsAnalysis.emergencyFund.months} meses</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeAITab === "recomendaciones" && (
                    <div className="space-y-3">
                        {/* Render Critical */}
                        {analysis.riskAnalysis.critical.map((risk: any, i: number) => (
                            <div key={`crit-${i}`} className="p-4 rounded-xl border border-red-200 bg-white shadow-sm flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">{risk.message}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{risk.action}</p>
                                    </div>
                                </div>
                                <button onClick={() => onActionClick(risk.category, risk.type)} className="w-full py-2 bg-red-50 text-red-700 font-bold text-xs rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                                    Solucionar ahora <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        ))}

                        {/* Render Opportunities */}
                        {analysis.riskAnalysis.opportunities.map((opp: any, i: number) => (
                            <div key={`opp-${i}`} className="p-4 rounded-xl border border-green-200 bg-white shadow-sm flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">{opp.message}</h4>
                                        <p className="text-xs text-gray-500 mt-1">{opp.action}</p>
                                    </div>
                                </div>
                                <button onClick={() => onActionClick(opp.category, opp.type)} className="w-full py-2 bg-green-50 text-green-700 font-bold text-xs rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-1">
                                    Aprovechar <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        ))}

                        {analysis.riskAnalysis.critical.length === 0 && analysis.riskAnalysis.opportunities.length === 0 && (
                            <div className="text-center p-6">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                </div>
                                <p className="text-sm font-bold text-gray-900">Todo en orden</p>
                                <p className="text-xs text-gray-500 mt-1">No hay recomendaciones urgentes.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
