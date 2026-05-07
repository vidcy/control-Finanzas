import { useState } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import { Tags, Plus, Search, Layers, CircleDollarSign, TrendingDown, Trash2 } from "lucide-react";

type Subcategory = { id: number; name: string };
type Category = { id: number; name: string; type: "income" | "expense"; color: string; subcategories: Subcategory[] };

const mockCategories: Category[] = [
    { id: 1, name: "Sueldo y Salarios", type: "income", color: "bg-emerald-500", subcategories: [{ id: 101, name: "Sueldo Fijo" }, { id: 102, name: "Horas Extras" }] },
    { id: 2, name: "Negocios", type: "income", color: "bg-blue-500", subcategories: [{ id: 201, name: "Ventas" }] },
    { id: 3, name: "Vivienda", type: "expense", color: "bg-rose-500", subcategories: [{ id: 301, name: "Alquiler" }, { id: 302, name: "Servicios" }] },
];

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>(mockCategories);
    const [activeTab, setActiveTab] = useState<"income" | "expense">("income");
    const [searchTerm, setSearchTerm] = useState("");

    // Modal States
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    
    // Form States
    const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
    const [catForm, setCatForm] = useState({ name: "", color: "bg-indigo-500" });
    const [subForm, setSubForm] = useState({ name: "" });

    const filtered = categories.filter(c => c.type === activeTab && c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleOpenCatModal = () => {
        setCatForm({ name: "", color: "bg-indigo-500" });
        setIsCatModalOpen(true);
    };

    const handleSaveCat = (e: React.FormEvent) => {
        e.preventDefault();
        const newCat: Category = { id: Date.now(), name: catForm.name, type: activeTab, color: catForm.color, subcategories: [] };
        setCategories([...categories, newCat]);
        setIsCatModalOpen(false);
    };

    const handleDeleteCat = (id: number) => {
        if(confirm("¿Eliminar categoría y todas sus subcategorías?")) {
            setCategories(categories.filter(c => c.id !== id));
        }
    };

    const handleOpenSubModal = (catId: number) => {
        setSelectedCatId(catId);
        setSubForm({ name: "" });
        setIsSubModalOpen(true);
    };

    const handleSaveSub = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCatId) return;
        setCategories(categories.map(c => {
            if (c.id === selectedCatId) {
                return { ...c, subcategories: [...c.subcategories, { id: Date.now(), name: subForm.name }] };
            }
            return c;
        }));
        setIsSubModalOpen(false);
    };

    const handleDeleteSub = (catId: number, subId: number) => {
        setCategories(categories.map(c => {
            if (c.id === catId) {
                return { ...c, subcategories: c.subcategories.filter(s => s.id !== subId) };
            }
            return c;
        }));
    };

    return (
        <Appshell>
            <div className="flex flex-col gap-6">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Tags className="w-7 h-7 text-indigo-500" />
                            Gestión de Categorías
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Organiza cómo se clasifica tu dinero.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input 
                                type="text" 
                                placeholder="Buscar categoría..." 
                                className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm w-64"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={handleOpenCatModal} className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-indigo-200 transition-all transform hover:scale-[1.02]">
                            <Plus className="w-5 h-5" /> Nueva Categoría
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div className="bg-white p-1.5 rounded-2xl inline-flex shadow-sm border border-gray-100 self-start">
                    <button 
                        onClick={() => setActiveTab("income")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === "income" ? "bg-emerald-50 text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <CircleDollarSign className="w-4 h-4" /> Ingresos
                    </button>
                    <button 
                        onClick={() => setActiveTab("expense")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === "expense" ? "bg-rose-50 text-rose-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <TrendingDown className="w-4 h-4" /> Egresos
                    </button>
                </div>

                {/* CATEGORY GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map(category => (
                        <div key={category.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-2xl ${category.color} flex items-center justify-center text-white shadow-md`}>
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{category.name}</h3>
                                        <p className="text-xs text-gray-500">{category.subcategories.length} subcategorías</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteCat(category.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-2 mb-6">
                                {category.subcategories.map(sub => (
                                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100/50 group/sub hover:bg-gray-100 transition-colors">
                                        <span className="text-sm font-medium text-gray-700">{sub.name}</span>
                                        <button onClick={() => handleDeleteSub(category.id, sub.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {category.subcategories.length === 0 && (
                                    <div className="text-center p-3 text-sm text-gray-400 italic">No hay subcategorías</div>
                                )}
                            </div>

                            <button onClick={() => handleOpenSubModal(category.id)} className={`w-full py-2.5 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                                activeTab === "income" ? "border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200" : "border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                            }`}>
                                <Plus className="w-4 h-4" /> Agregar Subcategoría
                            </button>
                        </div>
                    ))}
                </div>

                {/* MODAL CREAR CATEGORIA */}
                <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title="Nueva Categoría">
                    <form onSubmit={handleSaveCat} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Categoría</label>
                            <input required type="text" placeholder="Ej. Alimentación" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Color Representativo</label>
                            <div className="flex gap-2">
                                {["bg-emerald-500", "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-teal-500"].map(color => (
                                    <button type="button" key={color} onClick={() => setCatForm({...catForm, color})} className={`w-8 h-8 rounded-full ${color} ${catForm.color === color ? 'ring-4 ring-offset-2 ring-indigo-200' : ''}`}></button>
                                ))}
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                            <button type="button" onClick={() => setIsCatModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-xl transition-colors shadow-sm">
                                Guardar Categoría
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* MODAL CREAR SUBCATEGORIA */}
                <Modal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} title="Nueva Subcategoría">
                    <form onSubmit={handleSaveSub} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Subcategoría</label>
                            <input required type="text" placeholder="Ej. Restaurantes" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} />
                        </div>
                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                            <button type="button" onClick={() => setIsSubModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-xl transition-colors shadow-sm">
                                Guardar Subcategoría
                            </button>
                        </div>
                    </form>
                </Modal>

            </div>
        </Appshell>
    );
}
