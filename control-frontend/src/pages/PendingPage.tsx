import { useState } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import { Plus, ArrowRightLeft, Check, X, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";

type PendingItem = {
    id: number; person: string; reason: string; amount: number; date: string; paid: boolean; type: "receivable" | "payable";
};

const initialItems: PendingItem[] = [
    { id: 1, person: "Juan Pérez", reason: "Préstamo personal", amount: 500, date: "2026-02-01", paid: false, type: "receivable" },
    { id: 2, person: "Empresa XYZ", reason: "Factura 001", amount: 1200, date: "2026-01-20", paid: true, type: "receivable" },
    { id: 3, person: "Banco Central", reason: "Tarjeta de Crédito", amount: 850, date: "2026-02-05", paid: false, type: "payable" },
    { id: 4, person: "María López", reason: "Préstamo rápido", amount: 200, date: "2026-01-15", paid: true, type: "payable" },
];

export default function PendingPage() {
    const [items, setItems] = useState<PendingItem[]>(initialItems);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeType, setActiveType] = useState<"receivable" | "payable">("receivable");
    
    // Form state
    const [formData, setFormData] = useState({ person: "", reason: "", amount: "", date: "" });

    const receivables = items.filter(i => i.type === "receivable");
    const payables = items.filter(i => i.type === "payable");

    const togglePaid = (id: number) => {
        setItems(items.map(item => item.id === id ? { ...item, paid: !item.paid } : item));
    };

    const handleDelete = (id: number) => {
        if(confirm("¿Seguro que deseas eliminar este registro?")) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleOpenModal = (type: "receivable" | "payable") => {
        setActiveType(type);
        setFormData({ person: "", reason: "", amount: "", date: new Date().toISOString().split('T')[0] });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const newItem: PendingItem = {
            id: Date.now(),
            person: formData.person,
            reason: formData.reason,
            amount: Number(formData.amount),
            date: formData.date,
            paid: false,
            type: activeType
        };
        setItems([newItem, ...items]);
        setIsModalOpen(false);
    };

    return (
        <Appshell>
            <div className="flex flex-col gap-6">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ArrowRightLeft className="w-7 h-7 text-indigo-500" />
                            Cuentas por Cobrar y Pagar
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Control de deudas pendientes y préstamos realizados.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    
                    {/* RECEIVABLES (CUENTAS POR COBRAR) */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm">
                                    <ArrowUpRight className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-emerald-800">Por Cobrar</h2>
                                    <p className="text-xs text-emerald-600 font-medium">Dinero que te deben</p>
                                </div>
                            </div>
                            <button onClick={() => handleOpenModal("receivable")} className="flex items-center gap-1 text-sm bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg border border-emerald-200 transition-all font-semibold shadow-sm">
                                <Plus className="w-4 h-4" /> Nuevo
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/80 text-xs uppercase text-gray-500">
                                        <th className="p-3 pl-4">Deudor</th>
                                        <th className="p-3">Motivo</th>
                                        <th className="p-3 text-right">Monto</th>
                                        <th className="p-3 text-center">Pagó</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {receivables.map(item => (
                                        <tr key={item.id} className={`transition-colors group ${item.paid ? "bg-gray-50/50 opacity-60" : "hover:bg-gray-50"}`}>
                                            <td className="p-3 pl-4 font-medium text-gray-800 text-sm">
                                                {item.person}
                                                <div className="text-xs text-gray-400 font-normal">{item.date}</div>
                                            </td>
                                            <td className="p-3 text-sm text-gray-600">{item.reason}</td>
                                            <td className="p-3 font-semibold text-emerald-600 text-sm text-right">S/. {item.amount}</td>
                                            <td className="p-3 text-center">
                                                <button 
                                                    onClick={() => togglePaid(item.id)}
                                                    className={`w-7 h-7 mx-auto rounded-md flex items-center justify-center transition-all ${
                                                        item.paid ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200 border border-gray-200"
                                                    }`}
                                                >
                                                    {item.paid ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 opacity-50" />}
                                                </button>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {receivables.length === 0 && (
                                <div className="p-8 text-center text-gray-400 text-sm">No hay cuentas por cobrar pendientes.</div>
                            )}
                        </div>
                    </div>

                    {/* PAYABLES (CUENTAS POR PAGAR) */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between bg-rose-50 p-4 rounded-2xl border border-rose-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-500 text-white rounded-xl shadow-sm">
                                    <ArrowDownRight className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-rose-800">Por Pagar</h2>
                                    <p className="text-xs text-rose-600 font-medium">Dinero que debes</p>
                                </div>
                            </div>
                            <button onClick={() => handleOpenModal("payable")} className="flex items-center gap-1 text-sm bg-white text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-1.5 rounded-lg border border-rose-200 transition-all font-semibold shadow-sm">
                                <Plus className="w-4 h-4" /> Nuevo
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/80 text-xs uppercase text-gray-500">
                                        <th className="p-3 pl-4">Acreedor</th>
                                        <th className="p-3">Motivo</th>
                                        <th className="p-3 text-right">Monto</th>
                                        <th className="p-3 text-center">Pagó</th>
                                        <th className="p-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {payables.map(item => (
                                        <tr key={item.id} className={`transition-colors group ${item.paid ? "bg-gray-50/50 opacity-60" : "hover:bg-gray-50"}`}>
                                            <td className="p-3 pl-4 font-medium text-gray-800 text-sm">
                                                {item.person}
                                                <div className="text-xs text-gray-400 font-normal">{item.date}</div>
                                            </td>
                                            <td className="p-3 text-sm text-gray-600">{item.reason}</td>
                                            <td className="p-3 font-semibold text-rose-600 text-sm text-right">S/. {item.amount}</td>
                                            <td className="p-3 text-center">
                                                <button 
                                                    onClick={() => togglePaid(item.id)}
                                                    className={`w-7 h-7 mx-auto rounded-md flex items-center justify-center transition-all ${
                                                        item.paid ? "bg-rose-500 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200 border border-gray-200"
                                                    }`}
                                                >
                                                    {item.paid ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 opacity-50" />}
                                                </button>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {payables.length === 0 && (
                                <div className="p-8 text-center text-gray-400 text-sm">No hay cuentas por pagar pendientes.</div>
                            )}
                        </div>
                    </div>

                </div>

                {/* MODAL CREAR DEUDA */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={activeType === "receivable" ? "Nueva Cuenta por Cobrar" : "Nueva Cuenta por Pagar"}>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {activeType === "receivable" ? "Deudor (Quién te debe)" : "Acreedor (A quién le debes)"}
                            </label>
                            <input required type="text" className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ${activeType === 'receivable' ? 'focus:ring-emerald-500/20 focus:border-emerald-500' : 'focus:ring-rose-500/20 focus:border-rose-500'}`} 
                                value={formData.person} onChange={e => setFormData({...formData, person: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo / Descripción</label>
                            <input required type="text" className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ${activeType === 'receivable' ? 'focus:ring-emerald-500/20 focus:border-emerald-500' : 'focus:ring-rose-500/20 focus:border-rose-500'}`} 
                                value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto (S/.)</label>
                                <input required type="number" min="0" step="0.01" className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ${activeType === 'receivable' ? 'focus:ring-emerald-500/20 focus:border-emerald-500' : 'focus:ring-rose-500/20 focus:border-rose-500'}`} 
                                    value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                <input required type="date" className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 ${activeType === 'receivable' ? 'focus:ring-emerald-500/20 focus:border-emerald-500' : 'focus:ring-rose-500/20 focus:border-rose-500'}`} 
                                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" className={`px-5 py-2.5 text-white font-medium rounded-xl transition-colors shadow-sm ${activeType === 'receivable' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}>
                                Guardar Registro
                            </button>
                        </div>
                    </form>
                </Modal>

            </div>
        </Appshell>
    );
}
