import { useEffect, useState } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import { Plus, ArrowRightLeft, Check, X, ArrowUpRight, ArrowDownRight, Trash2, Search, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import { listPendingTransactionsRequest, createPendingTransactionRequest, deletePendingTransactionRequest, updatePendingTransactionRequest } from "../services/pending.api";
import { listCategoriesRequest } from "../services/category.api";
import ConfirmModal from "../components/ui/ConfirmModal";

type PendingItem = {
    id: string;
    description?: string;
    amount: number;
    date: string;
    dueDate?: string;
    status: "PENDING" | "PAID";
    type: "INCOME" | "EXPENSE";
    category?: { name: string };
    subCategory?: { name: string };
};

/*const initialItems: PendingItem[] = [
    { id: 1, person: "Juan Pérez", reason: "Préstamo personal", amount: 500, date: "2026-02-01", paid: false, type: "receivable" },
    { id: 2, person: "Empresa XYZ", reason: "Factura 001", amount: 1200, date: "2026-01-20", paid: true, type: "receivable" },
    { id: 3, person: "Banco Central", reason: "Tarjeta de Crédito", amount: 850, date: "2026-02-05", paid: false, type: "payable" },
    { id: 4, person: "María López", reason: "Préstamo rápido", amount: 200, date: "2026-01-15", paid: true, type: "payable" },
];*/

export default function PendingPage() {
    const [items, setItems] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categories, setCategories] = useState<any[]>([]);

    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("");

    useEffect(() => {
        setLoading(true);
        Promise.all([
            listPendingTransactionsRequest(),
            listCategoriesRequest()
        ])
            .then(([transactionsData, categoriesData]) => {
                setItems(
                    transactionsData.map((t: any) => ({
                        id: t.id,
                        description: t.description ?? "",
                        amount: t.amount,
                        date: t.date,
                        dueDate: t.dueDate ?? undefined,
                        status: t.status,
                        type: t.type,
                        category: t.category,
                        subCategory: t.subCategory,
                    }))
                );
                setCategories(categoriesData);
            })
            .catch((error) => {
                toast.error(error.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<"INCOME" | "EXPENSE">("INCOME");

    // Form state
    const [formData, setFormData] = useState({
        amount: "",
        description: "",
        person: "",
        date: new Date().toISOString().split('T')[0]
    });

    const receivables = Array.isArray(items) ? items.filter(i =>
        i.type === "INCOME" &&
        ((i.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (i.amount?.toString() || "").includes(searchTerm))
    ) : [];
    const payables = Array.isArray(items) ? items.filter(i =>
        i.type === "EXPENSE" &&
        ((i.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (i.amount?.toString() || "").includes(searchTerm))
    ) : [];

    const togglePaid = async (id: string, currentStatus: "PENDING" | "PAID") => {
        const newStatus: "PENDING" | "PAID" =
            currentStatus === "PENDING" ? "PAID" : "PENDING";

        await updatePendingTransactionRequest(id, { status: newStatus });

        setItems(prev =>
            prev.map(item =>
                item.id === id
                    ? { ...item, status: newStatus }
                    : item
            )
        );

        toast.success(
            newStatus === "PAID"
                ? "Marcado como pagado"
                : "Marcado como pendiente"
        );
    };
    const handleOpenModal = (type: "INCOME" | "EXPENSE") => {
        setActiveType(type);
        setFormData({
            amount: "",
            description: "",
            person: "",
            date: new Date().toISOString().split('T')[0]
        });
        setSelectedCategoryId("");
        setSelectedSubCategoryId("");
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const filteredCategories = (Array.isArray(categories) ? categories : []).filter(c => c.type === activeType && !c.parentId);
    const filteredSubCategories = (Array.isArray(categories) ? categories : []).filter(c => c.parentId === selectedCategoryId);
    const categoryHasSubcategories = filteredSubCategories.length > 0;


    const handleDelete = (id: string) => {
        setIdToDelete(id);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!idToDelete) return;
        try {
            await deletePendingTransactionRequest(idToDelete);
            setItems(prev => prev.filter(item => item.id !== idToDelete));
            toast.success("Transacción eliminada correctamente");
            setIdToDelete(null);
        } catch (error) {
            toast.error("Error al eliminar la transacción");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCategoryId) {
            toast.error("Selecciona una categoría");
            return;
        }

        if (categoryHasSubcategories && !selectedSubCategoryId) {
            toast.error("Selecciona una subcategoría");
            return;
        }

        const payload = {
            name: formData.description || formData.person,
            type: activeType,
            categoryId: selectedCategoryId,
            subCategoryId: selectedSubCategoryId || null,
            amount: Number(formData.amount),
            date: formData.date,
            dueDate: formData.date,
            status: "PENDING" as const,
            currency: "PEN" as const,
            paymentMethod: "CASH",
            description: `${formData.person} - ${formData.description}`,
        };

        try {
            const result = await createPendingTransactionRequest(payload);
            setItems(prev => [...prev, result]);
            toast.success("Creado correctamente");
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error(error?.message || "Error al crear");
        }
    };

    return (
        <Appshell>
            <div className="flex flex-col gap-8 animate-fade-in-up pb-10">

                {/* HEADER CON GLASSMORPHISM */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-rose-400"></div>
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200">
                            <ArrowRightLeft className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                                Cuentas Pendientes
                            </h1>
                            <p className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Gestión de deudas y préstamos con clasificación por categorías.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-indigo-500" />
                            <input
                                type="text"
                                placeholder="Buscar transacción..."
                                className="pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm w-72 text-gray-700 font-medium placeholder-gray-400"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">

                    {/* RECEIVABLES (CUENTAS POR COBRAR) */}
                    <div className="flex flex-col gap-5">
                        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50/80 to-transparent p-6 rounded-[2rem] border-l-4 border-emerald-500 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-100 ring-4 ring-emerald-50">
                                    <ArrowUpRight className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-emerald-900">Por Cobrar</h2>
                                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Dinero a tu favor</p>
                                </div>
                            </div>
                            <button onClick={() => handleOpenModal("INCOME")} className="flex items-center gap-2 text-sm bg-emerald-500 text-white hover:bg-emerald-600 px-6 py-3 rounded-2xl transition-all font-bold shadow-lg shadow-emerald-200 hover:-translate-y-0.5">
                                <Plus className="w-5 h-5" /> Nuevo Registro
                            </button>
                        </div>

                        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                                            <th className="p-5 pl-8">Deudor / Detalle</th>
                                            <th className="p-5">Categoría</th>
                                            <th className="p-5 text-right">Monto</th>
                                            <th className="p-5 text-center">Estado</th>
                                            <th className="p-5 pr-8 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50/50">
                                        {receivables.map(item => (
                                            <tr key={item.id} className={`transition-all group ${item.status === "PAID" ? "bg-gray-50/30 opacity-60" : "hover:bg-white/80"}`}>
                                                <td className="p-5 pl-8">
                                                    <div className="font-bold text-gray-800 text-sm">{item.description}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-tighter">{item.date}</div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase border border-indigo-100">
                                                            {item.category?.name || 'General'}
                                                        </span>
                                                        {item.subCategory?.name && (
                                                            <span className="text-[9px] text-gray-400 font-bold ml-1">
                                                                {item.subCategory.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-5 font-black text-emerald-600 text-base text-right">S/. {item.amount.toLocaleString()}</td>
                                                <td className="p-5 text-center">
                                                    <button
                                                        onClick={() => togglePaid(item.id, item.status)}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 mx-auto ${item.status === "PAID"
                                                            ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-50"
                                                            : "bg-amber-100 text-amber-700 ring-2 ring-amber-50 hover:bg-amber-200"
                                                            }`}
                                                    >
                                                        {item.status === "PAID" ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                        {item.status === "PAID" ? "Pagado" : "Pendiente"}
                                                    </button>
                                                </td>
                                                <td className="p-5 pr-8 text-center">
                                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {receivables.length === 0 && (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                                        <ArrowUpRight className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-400 font-medium">No hay cuentas por cobrar pendientes.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PAYABLES (CUENTAS POR PAGAR) */}
                    <div className="flex flex-col gap-5">
                        <div className="flex items-center justify-between bg-gradient-to-r from-rose-50/80 to-transparent p-6 rounded-[2rem] border-l-4 border-rose-500 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-100 ring-4 ring-rose-50">
                                    <ArrowDownRight className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-rose-900">Por Pagar</h2>
                                    <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">Dinero que debes</p>
                                </div>
                            </div>
                            <button onClick={() => handleOpenModal("EXPENSE")} className="flex items-center gap-2 text-sm bg-rose-500 text-white hover:bg-rose-600 px-6 py-3 rounded-2xl transition-all font-bold shadow-lg shadow-rose-200 hover:-translate-y-0.5">
                                <Plus className="w-5 h-5" /> Nuevo Registro
                            </button>
                        </div>

                        <div className="bg-white/70 backdrop-blur-md rounded-[2rem] border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                                            <th className="p-5 pl-8">Acreedor / Detalle</th>
                                            <th className="p-5">Categoría</th>
                                            <th className="p-5 text-right">Monto</th>
                                            <th className="p-5 text-center">Estado</th>
                                            <th className="p-5 pr-8 text-center">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50/50">
                                        {payables.map(item => (
                                            <tr key={item.id} className={`transition-all group ${item.status === "PAID" ? "bg-gray-50/30 opacity-60" : "hover:bg-white/80"}`}>
                                                <td className="p-5 pl-8">
                                                    <div className="font-bold text-gray-800 text-sm">{item.description}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-tighter">{item.date}</div>
                                                </td>
                                                <td className="p-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase border border-indigo-100">
                                                            {item.category?.name || 'General'}
                                                        </span>
                                                        {item.subCategory?.name && (
                                                            <span className="text-[9px] text-gray-400 font-bold ml-1">
                                                                {item.subCategory.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-5 font-black text-rose-600 text-base text-right">S/. {item.amount.toLocaleString()}</td>
                                                <td className="p-5 text-center">
                                                    <button
                                                        onClick={() => togglePaid(item.id, item.status)}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-1 mx-auto ${item.status === "PAID"
                                                            ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-50"
                                                            : "bg-amber-100 text-amber-700 ring-2 ring-amber-50 hover:bg-amber-200"
                                                            }`}
                                                    >
                                                        {item.status === "PAID" ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                        {item.status === "PAID" ? "Pagado" : "Pendiente"}
                                                    </button>
                                                </td>
                                                <td className="p-5 pr-8 text-center">
                                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {payables.length === 0 && (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                                        <ArrowDownRight className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-400 font-medium">No hay cuentas por pagar pendientes.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* MODAL CREAR REGISTRO - PREMIUM DESIGN */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={activeType === "INCOME" ? "Nueva Cuenta por Cobrar" : "Nueva Cuenta por Pagar"}>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className={`p-6 rounded-[2rem] border ${activeType === 'INCOME' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'} space-y-5`}>

                            <div className={`grid grid-cols-1 ${categoryHasSubcategories ? 'md:grid-cols-2' : ''} gap-5`}>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoría</label>
                                    <select
                                        required
                                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 shadow-sm appearance-none"
                                        value={selectedCategoryId}
                                        onChange={e => {
                                            setSelectedCategoryId(e.target.value);
                                            setSelectedSubCategoryId("");
                                        }}
                                    >
                                        <option value="">Seleccionar Categoría</option>
                                        {filteredCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {categoryHasSubcategories && (
                                    <div className="animate-fade-in-up">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                            Subcategoría
                                        </label>

                                        <select
                                            required
                                            className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 shadow-sm appearance-none"
                                            value={selectedSubCategoryId}
                                            onChange={e => setSelectedSubCategoryId(e.target.value)}
                                        >
                                            <option value="">Seleccionar Subcategoría</option>

                                            {filteredSubCategories.map(sub => (
                                                <option key={sub.id} value={sub.id}>
                                                    {sub.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                    {activeType === "INCOME" ? "Deudor (Quién te debe)" : "Acreedor (A quién le debes)"}
                                </label>
                                <input required type="text" placeholder="Ej. Juan Pérez" className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                                    value={formData.person} onChange={e => setFormData({ ...formData, person: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Motivo / Descripción</label>
                                <input required type="text" placeholder="Ej. Préstamo para materiales" className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                                    value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Monto (S/.)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">S/</span>
                                        <input required type="number" min="0" step="0.01" placeholder="0.00" className="w-full pl-10 pr-5 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-black text-gray-700 shadow-sm"
                                            value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Fecha de Registro</label>
                                    <input required type="date" className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                                        value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-8">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-all">Cancelar</button>
                            <button type="submit" className={`px-8 py-3.5 text-white font-black rounded-2xl transition-all shadow-lg hover:-translate-y-1 active:scale-95 ${activeType === 'INCOME' ? 'bg-emerald-500 shadow-emerald-200 hover:shadow-emerald-300' : 'bg-rose-500 shadow-rose-200 hover:shadow-rose-300'}`}>
                                Confirmar Registro
                            </button>
                        </div>
                    </form>
                </Modal>

                <ConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={confirmDelete}
                    title="Eliminar Cuenta Pendiente"
                    message="¿Estás seguro de que deseas eliminar este registro? Esta acción es irreversible."
                />
            </div >
        </Appshell >
    );
}
