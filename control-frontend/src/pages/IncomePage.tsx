import { useState } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import { Plus, Search, TrendingUp, Edit2, Trash2, Calendar, DollarSign, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";

type Income = {
    id: number; 
    date: string; 
    category: string; 
    description: string; 
    amount: number; 
    currency: "PEN" | "USD"; 
    exchangeRate: number;
};

const incomeCategories = [
    "Sueldo", "Capacitaciones Terceros", "Rendimientos Inversiones", "Asesorías", 
    "Beneficios de Tarjeta de Crédito", "Comisiones", "Ingreso Adicional 1", "Ingreso Adicional 2"
];

const initialIncomes: Income[] = [
    { id: 1, date: "2026-01-15", category: "Sueldo", description: "Quincena Enero", amount: 2500, currency: "PEN", exchangeRate: 1 },
    { id: 2, date: "2026-01-20", category: "Asesorías", description: "Asesoría Financiera", amount: 500, currency: "USD", exchangeRate: 3.80 },
];

export default function IncomePage() {
    const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ 
        date: "", category: "Sueldo", description: "", amount: "", currency: "PEN" as "PEN"|"USD", exchangeRate: "1" 
    });

    const filtered = incomes.filter(inc => 
        inc.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        inc.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenCreate = () => {
        setFormData({ 
            date: new Date().toISOString().split('T')[0], category: "Sueldo", description: "", amount: "", currency: "PEN", exchangeRate: "1" 
        });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (inc: Income) => {
        setFormData({ 
            date: inc.date, category: inc.category, description: inc.description, amount: inc.amount.toString(), currency: inc.currency, exchangeRate: inc.exchangeRate.toString() 
        });
        setEditingId(inc.id);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if(confirm("¿Estás seguro de eliminar este ingreso?")) {
            setIncomes(incomes.filter(inc => inc.id !== id));
            toast.success("Ingreso eliminado correctamente.");
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            date: formData.date,
            category: formData.category,
            description: formData.description,
            amount: Number(formData.amount),
            currency: formData.currency,
            exchangeRate: Number(formData.exchangeRate)
        };

        if (editingId) {
            setIncomes(incomes.map(inc => inc.id === editingId ? { ...inc, ...payload } : inc));
            toast.success("Ingreso actualizado correctamente.");
        } else {
            setIncomes([{ ...payload, id: Date.now() }, ...incomes]);
            toast.success("Ingreso registrado correctamente.");
        }
        setIsModalOpen(false);
    };

    const getDayMonthYear = (dateString: string) => {
        if(!dateString) return { day: "-", month: "-", year: "-" };
        const d = new Date(dateString + "T00:00:00");
        return {
            day: d.getDate().toString().padStart(2, '0'),
            month: (d.getMonth() + 1).toString().padStart(2, '0'),
            year: d.getFullYear().toString()
        };
    };

    return (
        <Appshell>
            <div className="flex flex-col gap-8 animate-fade-in-up pb-10">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-200">
                            <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-800">
                                Registro de Ingresos
                            </h1>
                            <p className="text-sm text-emerald-800/70 mt-1 font-medium">
                                Visualiza y administra tus flujos de entrada con precisión total.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-emerald-200 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <Search className="w-5 h-5 text-emerald-500 absolute left-4 top-1/2 transform -translate-y-1/2 z-10" />
                            <input 
                                type="text" 
                                placeholder="Buscar ingresos..." 
                                className="relative z-10 pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md border border-white rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-sm w-72 text-gray-700 font-medium placeholder-emerald-300"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={handleOpenCreate} className="relative group overflow-hidden flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all transform hover:-translate-y-0.5">
                            <Plus className="w-5 h-5" /> Nuevo Ingreso
                        </button>
                    </div>
                </div>

                {/* TABLE CARD */}
                <div className="bg-white/60 backdrop-blur-2xl rounded-[2rem] border border-white/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200/30 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-200/20 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
                    
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead>
                                <tr className="bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border-b border-emerald-100/50 text-[10px] font-bold uppercase tracking-widest text-emerald-800">
                                    <th className="p-5 pl-8 rounded-tl-3xl">N°</th>
                                    <th className="p-5">Tipo (Categoría)</th>
                                    <th className="p-5">Fecha</th>
                                    <th className="p-5 text-center">Día</th>
                                    <th className="p-5 text-center">Mes</th>
                                    <th className="p-5 text-center">Año</th>
                                    <th className="p-5">Descripción</th>
                                    <th className="p-5 text-right">Monto</th>
                                    <th className="p-5 text-center">Moneda</th>
                                    <th className="p-5 text-center">T.C.</th>
                                    <th className="p-5 text-right text-emerald-600 bg-emerald-50/50">Monto Soles</th>
                                    <th className="p-5 text-center pr-8 rounded-tr-3xl">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-50/50">
                                {filtered.map((inc, index) => {
                                    const { day, month, year } = getDayMonthYear(inc.date);
                                    const montoSoles = inc.currency === "USD" ? inc.amount * inc.exchangeRate : inc.amount;
                                    
                                    return (
                                        <tr key={inc.id} className="hover:bg-white/80 transition-colors group cursor-default">
                                            <td className="p-4 pl-8 text-sm font-bold text-emerald-400">{index + 1}</td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100/50 text-emerald-700 text-xs font-bold border border-emerald-200/50 shadow-sm">
                                                    {inc.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-gray-600 flex items-center gap-2 mt-1.5">
                                                <Calendar className="w-4 h-4 text-emerald-400" /> {inc.date}
                                            </td>
                                            <td className="p-4 text-center text-sm font-semibold text-gray-500">{day}</td>
                                            <td className="p-4 text-center text-sm font-semibold text-gray-500">{month}</td>
                                            <td className="p-4 text-center text-sm font-semibold text-gray-500">{year}</td>
                                            <td className="p-4 text-sm text-gray-700 font-medium">{inc.description}</td>
                                            <td className="p-4 text-right text-sm font-black text-gray-800">
                                                {inc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${inc.currency === 'USD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {inc.currency}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center text-sm font-medium text-gray-500">{inc.currency === 'USD' ? inc.exchangeRate.toFixed(3) : '-'}</td>
                                            <td className="p-4 text-right text-base font-black text-emerald-600 bg-emerald-50/30">
                                                S/ {montoSoles.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 pr-8 text-center">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                                    <button title="Modificar ingreso" onClick={() => handleOpenEdit(inc)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 text-blue-600 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm text-xs font-bold"><Edit2 className="w-3.5 h-3.5" /> Modificar</button>
                                                    <button title="Eliminar ingreso" onClick={() => handleDelete(inc.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50/80 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm text-xs font-bold"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={12} className="p-12 text-center text-gray-400 font-medium">
                                            No se encontraron ingresos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL FORMULARIO */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Ingreso" : "Registrar Nuevo Ingreso"} maxWidth="max-w-3xl">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/50 grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            <div>
                                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Categoría (Tipo)</label>
                                <select className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 outline-none text-gray-700 font-medium shadow-sm transition-all" 
                                    value={formData.category} 
                                    onChange={e => setFormData({...formData, category: e.target.value})}>
                                    {incomeCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Fecha</label>
                                <div className="relative">
                                    <Calendar className="w-5 h-5 text-emerald-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                    <input required type="date" className="w-full pl-10 pr-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 outline-none text-gray-700 font-medium shadow-sm transition-all" 
                                        value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Descripción</label>
                                <input required type="text" placeholder="Detalle exacto del ingreso..." className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 outline-none text-gray-700 font-medium shadow-sm transition-all" 
                                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>

                            <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Monto</label>
                                    <div className="relative">
                                        <DollarSign className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                        <input required type="number" step="0.01" min="0" placeholder="0.00" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 outline-none text-gray-800 font-bold transition-all" 
                                            value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Moneda</label>
                                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 outline-none text-gray-700 font-bold transition-all" 
                                        value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value as "PEN"|"USD"})}>
                                        <option value="PEN">Soles (PEN)</option>
                                        <option value="USD">Dólares (USD)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tipo de Cambio</label>
                                    <div className="relative">
                                        <RefreshCw className={`w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${formData.currency === 'USD' ? 'text-blue-500' : 'text-gray-300'}`} />
                                        <input type="number" step="0.001" min="1" className={`w-full pl-10 pr-4 py-3 border rounded-xl outline-none font-bold transition-all ${formData.currency === 'USD' ? 'bg-blue-50 border-blue-200 text-blue-800 focus:ring-4 focus:ring-blue-500/20' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`} 
                                            value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} disabled={formData.currency === 'PEN'} />
                                    </div>
                                </div>
                            </div>

                            {/* LIVE PREVIEW SECTION */}
                            <div className="md:col-span-2 flex flex-col md:flex-row gap-4 mt-2">
                                <div className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 p-4 rounded-2xl shadow-lg flex items-center justify-between text-white">
                                    <div>
                                        <p className="text-xs text-emerald-100 font-bold uppercase tracking-wider mb-1">Extracción Automática</p>
                                        <div className="flex gap-4 font-black text-lg">
                                            <div className="bg-black/20 px-3 py-1 rounded-lg">Día: {formData.date ? formData.date.split('-')[2] : '-'}</div>
                                            <div className="bg-black/20 px-3 py-1 rounded-lg">Mes: {formData.date ? formData.date.split('-')[1] : '-'}</div>
                                            <div className="bg-black/20 px-3 py-1 rounded-lg">Año: {formData.date ? formData.date.split('-')[0] : '-'}</div>
                                        </div>
                                    </div>
                                    <Calendar className="w-10 h-10 text-white/30" />
                                </div>
                                
                                <div className="flex-1 bg-gradient-to-r from-gray-900 to-indigo-900 p-4 rounded-2xl shadow-lg flex items-center justify-between text-white">
                                    <div>
                                        <p className="text-xs text-indigo-200 font-bold uppercase tracking-wider mb-1">Monto Convertido a Soles</p>
                                        <div className="text-2xl font-black text-emerald-400">
                                            S/ {(Number(formData.amount || 0) * (formData.currency === 'USD' ? Number(formData.exchangeRate || 1) : 1)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </div>
                                    </div>
                                    <DollarSign className="w-10 h-10 text-white/20" />
                                </div>
                            </div>

                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:shadow-emerald-400 hover:-translate-y-0.5 transition-all">
                                {editingId ? "Actualizar Ingreso" : "Guardar Ingreso"}
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        </Appshell>
    );
}
