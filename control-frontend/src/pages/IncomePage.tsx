import { useState } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import { Plus, Search, TrendingUp, Filter, Edit2, Trash2, CheckCircle, Clock } from "lucide-react";

type Income = {
    id: number; date: string; category: string; subcategory: string; description: string; amount: number; currency: string; programmed: boolean; justified: boolean;
};

const incomeCategories = [
    { name: "Sueldo y Salarios", subcategories: ["Sueldo Fijo", "Horas Extras", "Bonos"] },
    { name: "Negocios", subcategories: ["Ventas", "Servicios Profesionales"] },
    { name: "Inversiones", subcategories: ["Dividendos", "Intereses"] }
];

const initialIncomes: Income[] = [
    { id: 1, date: "2026-01-15", category: "Sueldo y Salarios", subcategory: "Sueldo Fijo", description: "Quincena Enero", amount: 2500, currency: "PEN", programmed: true, justified: true },
    { id: 2, date: "2026-01-20", category: "Negocios", subcategory: "Ventas", description: "Venta de Laptop", amount: 1200, currency: "PEN", programmed: false, justified: true },
];

export default function IncomePage() {
    const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ date: "", category: "Sueldo y Salarios", subcategory: "Sueldo Fijo", description: "", amount: "", currency: "PEN", programmed: false, justified: false });

    const filtered = incomes.filter(inc => 
        inc.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        inc.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenCreate = () => {
        setFormData({ date: new Date().toISOString().split('T')[0], category: "Sueldo y Salarios", subcategory: "Sueldo Fijo", description: "", amount: "", currency: "PEN", programmed: false, justified: false });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (inc: Income) => {
        setFormData({ ...inc, amount: inc.amount.toString() });
        setEditingId(inc.id);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if(confirm("¿Estás seguro de eliminar este ingreso?")) {
            setIncomes(incomes.filter(inc => inc.id !== id));
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            setIncomes(incomes.map(inc => inc.id === editingId ? { ...inc, ...formData, amount: Number(formData.amount) } : inc));
        } else {
            setIncomes([{ ...formData, id: Date.now(), amount: Number(formData.amount) }, ...incomes]);
        }
        setIsModalOpen(false);
    };

    return (
        <Appshell>
            <div className="flex flex-col gap-6">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="w-7 h-7 text-emerald-500" />
                            Registro de Ingresos
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Administra y visualiza todo el dinero que entra a tus cuentas.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input 
                                type="text" 
                                placeholder="Buscar ingreso..." 
                                className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm w-64"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={handleOpenCreate} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-emerald-200 transition-all transform hover:scale-[1.02]">
                            <Plus className="w-5 h-5" /> Nuevo Ingreso
                        </button>
                    </div>
                </div>

                {/* TABLE CARD */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                    <th className="p-4 pl-6">Fecha</th>
                                    <th className="p-4">Categoría</th>
                                    <th className="p-4">Descripción</th>
                                    <th className="p-4 text-right">Monto</th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-center pr-6">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((inc) => (
                                    <tr key={inc.id} className="hover:bg-emerald-50/30 transition-colors group">
                                        <td className="p-4 pl-6 text-sm font-medium text-gray-900">{inc.date}</td>
                                        <td className="p-4">
                                            <p className="text-sm font-semibold text-gray-800">{inc.category}</p>
                                            <p className="text-xs text-gray-500">{inc.subcategory}</p>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">{inc.description}</td>
                                        <td className="p-4 text-right text-sm font-bold text-emerald-600">
                                            {inc.currency === "USD" ? "$" : "S/."} {inc.amount.toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {inc.programmed && <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-2 py-1 rounded-md"><Clock className="w-3 h-3" /> Prog</span>}
                                                {inc.justified ? <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md"><CheckCircle className="w-3 h-3" /> Just.</span> : <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-1 rounded-md">Pendiente</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 pr-6 text-center">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenEdit(inc)} className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(inc.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL FORMULARIO */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Ingreso" : "Registrar Nuevo Ingreso"} maxWidth="max-w-2xl">
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                <input required type="date" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                                <div className="flex gap-2">
                                    <select className="px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none bg-gray-50" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                                        <option value="PEN">S/.</option>
                                        <option value="USD">$</option>
                                    </select>
                                    <input required type="number" step="0.01" min="0" placeholder="0.00" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white" 
                                    value={formData.category} 
                                    onChange={e => {
                                        const newCat = e.target.value;
                                        const catObj = incomeCategories.find(c => c.name === newCat);
                                        const firstSub = catObj ? catObj.subcategories[0] : "";
                                        setFormData({...formData, category: newCat, subcategory: firstSub});
                                    }}>
                                    {incomeCategories.map(cat => (
                                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoría</label>
                                <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white" 
                                    value={formData.subcategory} 
                                    onChange={e => setFormData({...formData, subcategory: e.target.value})}>
                                    {incomeCategories.find(c => c.name === formData.category)?.subcategories.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <textarea required rows={2} placeholder="Detalles del ingreso..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                        </div>

                        <div className="flex gap-6 pt-2 pb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" checked={formData.programmed} onChange={e => setFormData({...formData, programmed: e.target.checked})} />
                                <span className="text-sm font-medium text-gray-700">Programado</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" checked={formData.justified} onChange={e => setFormData({...formData, justified: e.target.checked})} />
                                <span className="text-sm font-medium text-gray-700">Justificado</span>
                            </label>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" className="px-5 py-2.5 bg-emerald-500 text-white font-medium hover:bg-emerald-600 rounded-xl transition-colors shadow-sm">
                                {editingId ? "Actualizar Ingreso" : "Guardar Ingreso"}
                            </button>
                        </div>
                    </form>
                </Modal>

            </div>
        </Appshell>
    );
}
