import React, { useState } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import { LayoutDashboard, Wallet, TrendingUp, TrendingDown, ArrowRight, Eye } from "lucide-react";

const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

// Dummy totals for the summary cards
const mockData = {
    income: [5000, 5200, 5100, 5000, 5500, 5000, 6000, 5000, 5000, 5200, 5000, 8000],
    expense: [3000, 3200, 2800, 3500, 3100, 3300, 4000, 3000, 3200, 2900, 3100, 4500]
};

// Full Detailed Categories & Subcategories Data for the Modal
const detailedIncomes = [
    {
        category: "Sueldo y Salarios",
        subcategories: [
            { name: "Sueldo Fijo", values: [2500, 2500, 2500, 2500, 2500, 2500, 3000, 2500, 2500, 2500, 2500, 5000] },
            { name: "Horas Extras", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: "Bonos", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    },
    {
        category: "Negocios",
        subcategories: [
            { name: "Ventas", values: [1500, 1700, 1600, 1500, 2000, 1500, 2000, 1500, 1500, 1700, 1500, 2000] },
            { name: "Servicios Profesionales", values: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500] }
        ]
    },
    {
        category: "Inversiones",
        subcategories: [
            { name: "Dividendos", values: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500] },
            { name: "Intereses", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    }
];

const detailedExpenses = [
    {
        category: "Vivienda",
        subcategories: [
            { name: "Pago de alquiler/hipoteca", values: [800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800, 800] },
            { name: "Mantenimiento", values: [100, 0, 100, 0, 100, 0, 100, 0, 100, 0, 100, 0] },
            { name: "Servicios", values: [100, 200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200] }
        ]
    },
    {
        category: "Alimentación",
        subcategories: [
            { name: "Mercado General", values: [400, 500, 400, 600, 400, 400, 600, 400, 500, 400, 400, 700] },
            { name: "Restaurantes", values: [200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 300] }
        ]
    },
    {
        category: "Transporte",
        subcategories: [
            { name: "Combustible", values: [150, 150, 150, 200, 150, 150, 200, 150, 150, 150, 150, 200] },
            { name: "Pasajes", values: [50, 50, 50, 100, 50, 50, 100, 50, 50, 50, 50, 100] },
            { name: "Mantenimiento Vehicular", values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
        ]
    }
];

export default function DashboardPage() {
    const [isFullViewOpen, setIsFullViewOpen] = useState(false);

    const totalIncome = mockData.income.reduce((a, b) => a + b, 0);
    const totalExpense = mockData.expense.reduce((a, b) => a + b, 0);
    const balance = totalIncome - totalExpense;

    return (
        <Appshell>
            <div className="flex flex-col gap-6">
                
                {/* HEADER */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <LayoutDashboard className="w-7 h-7 text-blue-500" />
                        Resumen General 2026
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Visión global de tus finanzas durante el año.
                    </p>
                </div>

                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* BALANCE */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/30 relative overflow-hidden group">
                        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-blue-100 text-sm font-medium mb-1">Balance Actual</p>
                                <h3 className="text-3xl font-bold">S/. {balance.toLocaleString()}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                <Wallet className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-sm text-blue-100 relative z-10">
                            <span className="bg-white/20 px-2 py-1 rounded-md text-xs font-semibold">+15%</span>
                            vs mes anterior
                        </div>
                    </div>

                    {/* INGRESOS */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:border-emerald-100 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-sm font-medium mb-1">Total Ingresos</p>
                                <h3 className="text-3xl font-bold text-gray-900">S/. {totalIncome.toLocaleString()}</h3>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-2xl">
                                <TrendingUp className="w-6 h-6 text-emerald-500" />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
                            <span className="text-emerald-500 flex items-center text-xs font-semibold">
                                <ArrowRight className="w-3 h-3 rotate-[-45deg] mr-1" /> 8.2%
                            </span>
                            vs año pasado
                        </div>
                    </div>

                    {/* EGRESOS */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:border-rose-100 transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-sm font-medium mb-1">Total Egresos</p>
                                <h3 className="text-3xl font-bold text-gray-900">S/. {totalExpense.toLocaleString()}</h3>
                            </div>
                            <div className="p-3 bg-rose-50 rounded-2xl">
                                <TrendingDown className="w-6 h-6 text-rose-500" />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
                            <span className="text-rose-500 flex items-center text-xs font-semibold">
                                <ArrowRight className="w-3 h-3 rotate-[-45deg] mr-1" /> 3.1%
                            </span>
                            vs año pasado
                        </div>
                    </div>
                </div>

                {/* BASIC SUMMARY TABLE */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 overflow-hidden mt-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            Resumen Rápido por Mes
                        </h3>
                        <button 
                            onClick={() => setIsFullViewOpen(true)}
                            className="flex items-center gap-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl transition-all font-semibold"
                        >
                            <Eye className="w-4 h-4" /> Ver Todo a Detalle
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto custom-scrollbar pb-4">
                        <table className="w-full text-left min-w-[1000px]">
                            <thead>
                                <tr className="text-xs uppercase text-white bg-gradient-to-r from-indigo-800 to-indigo-900">
                                    <th className="p-3 pl-4 rounded-tl-xl w-48 font-semibold">Total Mensual</th>
                                    {months.map(m => (
                                        <th key={m} className="p-3 text-center font-semibold">{m}</th>
                                    ))}
                                    <th className="p-3 text-right pr-4 rounded-tr-xl font-bold">Total</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {/* INGRESOS SECTION */}
                                <tr className="border-b border-gray-100 bg-emerald-50/30">
                                    <td className="p-3 pl-4 font-bold text-emerald-700">Ingresos Totales</td>
                                    {mockData.income.map((val, i) => (
                                        <td key={i} className="p-3 text-center text-emerald-600 font-medium">{val}</td>
                                    ))}
                                    <td className="p-3 pr-4 text-right font-black text-emerald-700">{totalIncome}</td>
                                </tr>
                                {/* EGRESOS SECTION */}
                                <tr className="border-b border-gray-100 bg-rose-50/30">
                                    <td className="p-3 pl-4 font-bold text-rose-700">Egresos Totales</td>
                                    {mockData.expense.map((val, i) => (
                                        <td key={i} className="p-3 text-center text-rose-600 font-medium">{val}</td>
                                    ))}
                                    <td className="p-3 pr-4 text-right font-black text-rose-700">{totalExpense}</td>
                                </tr>
                                {/* SUPERAVIT / DEFICIT */}
                                <tr className="bg-blue-50/50 border-b-2 border-white">
                                    <td className="p-3 pl-4 font-black text-blue-900">SUPERÁVIT/DÉFICIT</td>
                                    {months.map((m, i) => {
                                        const diff = mockData.income[i] - mockData.expense[i];
                                        return (
                                            <td key={m} className={`p-3 text-center font-black ${diff >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                                {diff}
                                            </td>
                                        );
                                    })}
                                    <td className="p-3 pr-4 text-right font-black text-blue-900 text-base">{balance}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL DETALLADO GIGANTE (CATEGORIAS Y SUBCATEGORIAS) */}
                <Modal isOpen={isFullViewOpen} onClose={() => setIsFullViewOpen(false)} title="Detalle Anual Completo (Por Categorías y Subcategorías)" maxWidth="max-w-[95vw]">
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[1300px]">
                                <thead>
                                    <tr className="text-xs uppercase text-white bg-gradient-to-r from-gray-800 to-gray-900">
                                        <th className="p-3 pl-4 w-72 font-semibold">Desglose</th>
                                        {months.map(m => (
                                            <th key={m} className="p-3 text-center font-semibold w-24">{m}</th>
                                        ))}
                                        <th className="p-3 text-right pr-4 font-bold bg-gray-900 w-32">Total Anual</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    
                                    {/* CABECERA GENERAL INGRESOS */}
                                    <tr>
                                        <td colSpan={14} className="p-3 pl-4 bg-emerald-100 text-emerald-800 font-black uppercase text-xs">
                                            INGRESOS
                                        </td>
                                    </tr>

                                    {/* ITERAR CATEGORIAS DE INGRESOS */}
                                    {detailedIncomes.map((cat, i) => (
                                        <React.Fragment key={`inc-${i}`}>
                                            {/* TITULO DE CATEGORIA */}
                                            <tr className="bg-emerald-50/50">
                                                <td colSpan={14} className="p-2.5 pl-4 font-bold text-emerald-900 text-xs uppercase">
                                                    {cat.category}
                                                </td>
                                            </tr>
                                            {/* FILAS DE SUBCATEGORIAS */}
                                            {cat.subcategories.map((sub, j) => {
                                                const rowTotal = sub.values.reduce((a, b) => a + b, 0);
                                                return (
                                                    <tr key={`inc-sub-${j}`} className="border-b border-gray-50 hover:bg-emerald-50/20 transition-colors">
                                                        <td className="p-2.5 pl-8 font-medium text-gray-600 text-sm flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                                            {sub.name}
                                                        </td>
                                                        {sub.values.map((val, k) => (
                                                            <td key={`inc-val-${k}`} className="p-2.5 text-center text-gray-500 text-sm">
                                                                {val === 0 ? '-' : val}
                                                            </td>
                                                        ))}
                                                        <td className="p-2.5 pr-4 text-right font-bold text-emerald-600 bg-emerald-50/30 text-sm">
                                                            {rowTotal === 0 ? '-' : rowTotal}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </React.Fragment>
                                    ))}

                                    {/* ESPACIADOR */}
                                    <tr><td colSpan={14} className="h-6 bg-gray-50/50"></td></tr>

                                    {/* CABECERA GENERAL EGRESOS */}
                                    <tr>
                                        <td colSpan={14} className="p-3 pl-4 bg-rose-100 text-rose-800 font-black uppercase text-xs">
                                            EGRESOS
                                        </td>
                                    </tr>

                                    {/* ITERAR CATEGORIAS DE EGRESOS */}
                                    {detailedExpenses.map((cat, i) => (
                                        <React.Fragment key={`exp-${i}`}>
                                            {/* TITULO DE CATEGORIA */}
                                            <tr className="bg-rose-50/50">
                                                <td colSpan={14} className="p-2.5 pl-4 font-bold text-rose-900 text-xs uppercase">
                                                    {cat.category}
                                                </td>
                                            </tr>
                                            {/* FILAS DE SUBCATEGORIAS */}
                                            {cat.subcategories.map((sub, j) => {
                                                const rowTotal = sub.values.reduce((a, b) => a + b, 0);
                                                return (
                                                    <tr key={`exp-sub-${j}`} className="border-b border-gray-50 hover:bg-rose-50/20 transition-colors">
                                                        <td className="p-2.5 pl-8 font-medium text-gray-600 text-sm flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                                                            {sub.name}
                                                        </td>
                                                        {sub.values.map((val, k) => (
                                                            <td key={`exp-val-${k}`} className="p-2.5 text-center text-gray-500 text-sm">
                                                                {val === 0 ? '-' : val}
                                                            </td>
                                                        ))}
                                                        <td className="p-2.5 pr-4 text-right font-bold text-rose-600 bg-rose-50/30 text-sm">
                                                            {rowTotal === 0 ? '-' : rowTotal}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </React.Fragment>
                                    ))}

                                    {/* ESPACIADOR ANTES DEL RESUMEN FINAL */}
                                    <tr><td colSpan={14} className="h-8 bg-gray-50/50"></td></tr>

                                    {/* ====== BLOQUE FINAL DE RESUMEN ====== */}
                                    <tr>
                                        <td colSpan={14} className="p-3 pl-4 bg-gray-800 text-white font-black uppercase text-xs rounded-t-lg">
                                            RESUMEN FINAL
                                        </td>
                                    </tr>
                                    <tr className="bg-emerald-50/80 border-b border-emerald-100">
                                        <td className="p-3 pl-4 font-bold text-emerald-800 uppercase text-xs">Total General Ingresos</td>
                                        {mockData.income.map((val, i) => (
                                            <td key={`inc-total-end-${i}`} className="p-3 text-center font-bold text-emerald-700">{val}</td>
                                        ))}
                                        <td className="p-3 pr-4 text-right font-black text-emerald-800 bg-emerald-100/50">{totalIncome}</td>
                                    </tr>
                                    <tr className="bg-rose-50/80 border-b border-rose-100">
                                        <td className="p-3 pl-4 font-bold text-rose-800 uppercase text-xs">Total General Egresos</td>
                                        {mockData.expense.map((val, i) => (
                                            <td key={`exp-total-end-${i}`} className="p-3 text-center font-bold text-rose-700">{val}</td>
                                        ))}
                                        <td className="p-3 pr-4 text-right font-black text-rose-800 bg-rose-100/50">{totalExpense}</td>
                                    </tr>
                                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                                        <td className="p-4 pl-4 font-black uppercase tracking-wider text-base">SUPERÁVIT / DÉFICIT ANUAL</td>
                                        {months.map((m, i) => {
                                            const diff = mockData.income[i] - mockData.expense[i];
                                            return (
                                                <td key={`balance-${i}`} className="p-4 text-center font-bold text-base">
                                                    {diff}
                                                </td>
                                            );
                                        })}
                                        <td className="p-4 pr-4 text-right font-black text-xl bg-blue-800/50">{balance}</td>
                                    </tr>

                                </tbody>
                            </table>
                        </div>
                    </div>
                </Modal>

            </div>
        </Appshell>
    );
}