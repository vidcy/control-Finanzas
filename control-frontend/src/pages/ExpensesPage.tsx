import { useState } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import { Plus, Search, TrendingDown, Edit2, Trash2, Calendar, DollarSign, RefreshCw, Clock, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";

type Expense = {
    id: number; 
    date: string; 
    category: string; 
    subcategory: string;
    description: string; 
    amount: number; 
    currency: "PEN" | "USD"; 
    exchangeRate: number;
    programmed: boolean;
    justified: boolean;
};

const expenseCategories = [
    { name: "Impuestos", subcategories: ["Pago de impuestos", "Renta de 4ta", "Provisión de impuesto de renta", "Provisión de impuesto predial", "Otros impuestos"] },
    { name: "Vivienda", subcategories: ["Pago de alquiler/hipoteca", "Mantenimiento", "Servicio doméstico", "Artículos de Aseo", "Electrodomésticos", "Reparación"] },
    { name: "Servicios", subcategories: ["Agua", "Electricidad", "Internet", "Celular 01", "Celular 02", "Celular Familia", "Luz Casa Madre", "Internet Casa Madre"] },
    { name: "Alimentación", subcategories: ["Carnes", "Verduras", "Mercado General", "Comida para Mascotas", "Salidas a comer familiares", "Delivery", "Snacks y cafés", "Bebidas no alcohólicas", "Gaseosas", "Licores", "Otros"] },
    { name: "Transporte", subcategories: ["Combustible vehículo", "Mantenimiento", "Peaje", "Parqueadero", "Lavado", "SOAT", "Seguros", "Transporte Público", "Taxis", "Pasajes de familia", "Vuelos", "Buses Interprovinciales"] },
    { name: "Gastos Personales", subcategories: ["Ropa", "Zapatillas", "Accesorios", "Peluquería", "Gimnasio", "Masajes", "Medicina", "Productos de Belleza", "Personal Trainer", "Dentista", "Varios"] },
    { name: "Entretenimiento", subcategories: ["Cine", "Teatro", "Libros/revistas", "Fútbol / Deportes", "Suscripción a ligas de fútbol", "Salidas de hijos a fiestas", "Viajes de familia", "Vacaciones familiares", "Conciertos", "Salidas amigos"] },
    { name: "Mascotas", subcategories: ["Alimento", "Veterinaria", "Medicamentos", "Guardería", "Peluquería", "Juguetes y accesorios", "Otros"] },
    { name: "Seguros", subcategories: ["Vida", "Salud", "Hogar", "Seguro médico de viajes", "Otros"] },
    { name: "Educación", subcategories: ["Pago de créditos educativos", "Matrícula / Pensión colegio", "Útiles", "Libros", "Uniformes", "Suscripción revistas / periódicos", "Clubes académicos / tertulias", "Cursos de idiomas", "Otros"] },
    { name: "Ahorro Mensual", subcategories: ["Aporte / AFP / Fondo Mutuo", "Meta de Ahorro Mensual 10%", "Ahorro en cuenta AFP", "Compra de dólares"] },
    { name: "Inversiones", subcategories: ["Fondos mutuos / Acciones", "Mensualidades", "Acciones", "Inversiones Personales", "Inversión en Terceros", "Otros"] },
    { name: "Servicios Profesionales", subcategories: ["Contador", "Abogado", "Mensajero", "Asistente personal", "Ahorro programado", "Otros (suscripciones a revistas)", "Otros"] },
    { name: "Pago de Créditos", subcategories: ["Crédito personal", "Tarjeta de crédito", "Abono a Tarjetas de Crédito", "Penalidades", "Otros"] },
    { name: "Contribución", subcategories: ["Diezmos, ofrendas, iglesia", "Apoyo a fundaciones", "Donaciones varias", "Dadivas en la calle o semáforos", "Apoyo a otro tipo de causas", "Otros"] },
    { name: "Contingencias", subcategories: ["Urgencias médicas no cubiertas", "Emergencias familiares", "Decisiones no programadas", "Otros"] },
    { name: "Suscripciones", subcategories: ["Suscripción de Apple", "Netflix", "Zoom Premium", "Suscripción 1", "Suscripción 2"] },
    { name: "Ocasiones Especiales", subcategories: ["Regalos Amigos", "Regalos Familia", "Aniversario"] }
];


const mockExpenses: Expense[] = [
    { id: 1, date: "2026-01-10", category: "Vivienda", subcategory: "Pago de alquiler/hipoteca", description: "Alquiler Enero", amount: 1500, currency: "PEN", exchangeRate: 1, programmed: true, justified: true },
    { id: 2, date: "2026-01-12", category: "Alimentación", subcategory: "Mercado General", description: "Compras Supermercado", amount: 150, currency: "USD", exchangeRate: 3.82, programmed: false, justified: true },
];

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ 
        date: "", category: "Vivienda", subcategory: "Pago de alquiler/hipoteca", description: "", amount: "", currency: "PEN" as "PEN"|"USD", exchangeRate: "1", programmed: false, justified: false
    });

    const filtered = expenses.filter(exp => 
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        exp.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.subcategory.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenCreate = () => {
        setFormData({ 
            date: new Date().toISOString().split('T')[0], category: "Vivienda", subcategory: "Pago de alquiler/hipoteca", description: "", amount: "", currency: "PEN", exchangeRate: "1", programmed: false, justified: false
        });
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (exp: Expense) => {
        setFormData({ 
            date: exp.date, category: exp.category, subcategory: exp.subcategory, description: exp.description, amount: exp.amount.toString(), currency: exp.currency, exchangeRate: exp.exchangeRate.toString(), programmed: exp.programmed, justified: exp.justified
        });
        setEditingId(exp.id);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if(confirm("¿Estás seguro de eliminar este egreso?")) {
            setExpenses(expenses.filter(exp => exp.id !== id));
            toast.success("Egreso eliminado correctamente.");
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            date: formData.date,
            category: formData.category,
            subcategory: formData.subcategory,
            description: formData.description,
            amount: Number(formData.amount),
            currency: formData.currency,
            exchangeRate: Number(formData.exchangeRate),
            programmed: formData.programmed,
            justified: formData.justified
        };

        if (editingId) {
            setExpenses(expenses.map(exp => exp.id === editingId ? { ...exp, ...payload } : exp));
            toast.success("Egreso actualizado correctamente.");
        } else {
            setExpenses([{ ...payload, id: Date.now() }, ...expenses]);
            toast.success("Egreso registrado correctamente.");
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
                        <div className="p-4 bg-gradient-to-br from-rose-400 to-rose-600 rounded-2xl shadow-lg shadow-rose-200">
                            <TrendingDown className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-red-800">
                                Registro de Egresos
                            </h1>
                            <p className="text-sm text-rose-800/70 mt-1 font-medium">
                                Monitorea tus salidas de dinero al detalle para un control absoluto.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-rose-200 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <Search className="w-5 h-5 text-rose-500 absolute left-4 top-1/2 transform -translate-y-1/2 z-10" />
                            <input 
                                type="text" 
                                placeholder="Buscar egresos..." 
                                className="relative z-10 pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md border border-white rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all shadow-sm w-72 text-gray-700 font-medium placeholder-rose-300"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={handleOpenCreate} className="relative group overflow-hidden flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:shadow-rose-300 transition-all transform hover:-translate-y-0.5">
                            <Plus className="w-5 h-5" /> Nuevo Egreso
                        </button>
                    </div>
                </div>

                {/* TABLE CARD */}
                <div className="bg-white/60 backdrop-blur-2xl rounded-[2rem] border border-white/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-200/30 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-200/20 rounded-full blur-[80px] -z-10 pointer-events-none"></div>
                    
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1400px]">
                            <thead>
                                <tr className="bg-gradient-to-r from-rose-50/50 to-red-50/50 border-b border-rose-100/50 text-[10px] font-bold uppercase tracking-widest text-rose-800">
                                    <th className="p-5 pl-8 rounded-tl-3xl">N°</th>
                                    <th className="p-5">Categoría</th>
                                    <th className="p-5">Subcategoría</th>
                                    <th className="p-5 text-center">Día</th>
                                    <th className="p-5 text-center">Mes</th>
                                    <th className="p-5 text-center">Año</th>
                                    <th className="p-5 w-48">Descripción</th>
                                    <th className="p-5 text-center">Estados</th>
                                    <th className="p-5 text-right">Monto</th>
                                    <th className="p-5 text-center">Moneda</th>
                                    <th className="p-5 text-center">T.C.</th>
                                    <th className="p-5 text-right text-rose-600 bg-rose-50/50">Monto Soles</th>
                                    <th className="p-5 text-center pr-8 rounded-tr-3xl">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-50/50">
                                {filtered.map((exp, index) => {
                                    const { day, month, year } = getDayMonthYear(exp.date);
                                    const montoSoles = exp.currency === "USD" ? exp.amount * exp.exchangeRate : exp.amount;
                                    
                                    return (
                                        <tr key={exp.id} className="hover:bg-white/80 transition-colors group cursor-default">
                                            <td className="p-4 pl-8 text-sm font-bold text-rose-400">{index + 1}</td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-100/50 text-rose-700 text-xs font-bold border border-rose-200/50 shadow-sm">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                {exp.subcategory}
                                            </td>
                                            <td className="p-4 text-center text-sm font-semibold text-gray-500">{day}</td>
                                            <td className="p-4 text-center text-sm font-semibold text-gray-500">{month}</td>
                                            <td className="p-4 text-center text-sm font-semibold text-gray-500">{year}</td>
                                            <td className="p-4 text-sm text-gray-700 font-medium">
                                                {exp.description}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-1 flex-col">
                                                    {exp.programmed && <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md w-full justify-center"><Clock className="w-2.5 h-2.5" /> Prog</span>}
                                                    {exp.justified ? <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md w-full justify-center"><CheckCircle className="w-2.5 h-2.5" /> Just</span> : <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md w-full justify-center">Pend.</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right text-sm font-black text-gray-800">
                                                {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${exp.currency === 'USD' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {exp.currency}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center text-sm font-medium text-gray-500">{exp.currency === 'USD' ? exp.exchangeRate.toFixed(3) : '-'}</td>
                                            <td className="p-4 text-right text-base font-black text-rose-600 bg-rose-50/30">
                                                S/ {montoSoles.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 pr-8 text-center">
                                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                                    <button title="Modificar egreso" onClick={() => handleOpenEdit(exp)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 text-blue-600 hover:bg-blue-500 hover:text-white rounded-xl transition-all shadow-sm text-xs font-bold"><Edit2 className="w-3.5 h-3.5" /> Modificar</button>
                                                    <button title="Eliminar egreso" onClick={() => handleDelete(exp.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50/80 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm text-xs font-bold"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={13} className="p-12 text-center text-gray-400 font-medium">
                                            No se encontraron egresos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL FORMULARIO */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Egreso" : "Registrar Nuevo Egreso"} maxWidth="max-w-4xl">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100/50 grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            <div>
                                <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">Categoría</label>
                                <select className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl focus:ring-4 focus:ring-rose-500/20 outline-none text-gray-700 font-medium shadow-sm transition-all" 
                                    value={formData.category} 
                                    onChange={e => {
                                        const newCat = e.target.value;
                                        const catObj = expenseCategories.find(c => c.name === newCat);
                                        const firstSub = catObj ? catObj.subcategories[0] : "";
                                        setFormData({...formData, category: newCat, subcategory: firstSub});
                                    }}>
                                    {expenseCategories.map(cat => (
                                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">Subcategoría</label>
                                <select className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl focus:ring-4 focus:ring-rose-500/20 outline-none text-gray-700 font-medium shadow-sm transition-all" 
                                    value={formData.subcategory} 
                                    onChange={e => setFormData({...formData, subcategory: e.target.value})}>
                                    {expenseCategories.find(c => c.name === formData.category)?.subcategories.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">Fecha</label>
                                <div className="relative">
                                    <Calendar className="w-5 h-5 text-rose-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                    <input required type="date" className="w-full pl-10 pr-4 py-3 bg-white border border-rose-200 rounded-xl focus:ring-4 focus:ring-rose-500/20 outline-none text-gray-700 font-medium shadow-sm transition-all" 
                                        value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                </div>
                            </div>

                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">Descripción</label>
                                <input required type="text" placeholder="Detalle exacto del egreso..." className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl focus:ring-4 focus:ring-rose-500/20 outline-none text-gray-700 font-medium shadow-sm transition-all" 
                                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                            </div>

                            <div className="md:col-span-3 bg-white p-5 rounded-2xl border border-rose-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-50/30 to-transparent pointer-events-none"></div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Monto</label>
                                    <div className="relative">
                                        <DollarSign className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                        <input required type="number" step="0.01" min="0" placeholder="0.00" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-rose-500/20 outline-none text-gray-800 font-bold transition-all relative z-10" 
                                            value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Moneda</label>
                                    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-rose-500/20 outline-none text-gray-700 font-bold transition-all relative z-10" 
                                        value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value as "PEN"|"USD"})}>
                                        <option value="PEN">Soles (PEN)</option>
                                        <option value="USD">Dólares (USD)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tipo de Cambio</label>
                                    <div className="relative">
                                        <RefreshCw className={`w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 z-20 ${formData.currency === 'USD' ? 'text-blue-500' : 'text-gray-300'}`} />
                                        <input type="number" step="0.001" min="1" className={`w-full pl-10 pr-4 py-3 border rounded-xl outline-none font-bold transition-all relative z-10 ${formData.currency === 'USD' ? 'bg-blue-50 border-blue-200 text-blue-800 focus:ring-4 focus:ring-blue-500/20' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`} 
                                            value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} disabled={formData.currency === 'PEN'} />
                                    </div>
                                </div>
                            </div>
                            
                            {/* LIVE PREVIEW SECTION */}
                            <div className="md:col-span-3 flex flex-col md:flex-row gap-4 mt-2">
                                <div className="flex-1 bg-gradient-to-r from-rose-500 to-red-500 p-4 rounded-2xl shadow-lg flex items-center justify-between text-white">
                                    <div>
                                        <p className="text-xs text-rose-100 font-bold uppercase tracking-wider mb-1">Extracción Automática</p>
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
                                        <div className="text-2xl font-black text-rose-400">
                                            S/ {(Number(formData.amount || 0) * (formData.currency === 'USD' ? Number(formData.exchangeRate || 1) : 1)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </div>
                                    </div>
                                    <DollarSign className="w-10 h-10 text-white/20" />
                                </div>
                            </div>

                            <div className="md:col-span-3 flex gap-6 mt-2">
                                <label className="flex items-center gap-3 cursor-pointer group bg-white/60 px-4 py-2 rounded-xl border border-rose-100 hover:bg-white transition-all">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" className="peer w-5 h-5 text-rose-600 border-gray-300 rounded focus:ring-rose-500 focus:ring-2" checked={formData.programmed} onChange={e => setFormData({...formData, programmed: e.target.checked})} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 group-hover:text-rose-700 transition-colors">Gasto Programado</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group bg-white/60 px-4 py-2 rounded-xl border border-rose-100 hover:bg-white transition-all">
                                    <div className="relative flex items-center justify-center">
                                        <input type="checkbox" className="peer w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2" checked={formData.justified} onChange={e => setFormData({...formData, justified: e.target.checked})} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 group-hover:text-emerald-700 transition-colors">Con Justificante (Boleta/Factura)</span>
                                </label>
                            </div>

                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" className="px-8 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-rose-200 hover:shadow-rose-400 hover:-translate-y-0.5 transition-all">
                                {editingId ? "Actualizar Egreso" : "Guardar Egreso"}
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        </Appshell>
    );
}
