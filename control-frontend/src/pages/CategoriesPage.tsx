import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";

import {
  listCategoriesRequest,
  createCategoryRequest,
  deleteCategoryRequest,
  createSubcategoryRequest,
  deleteSubcategoryRequest,
} from "../services/category.api";
import {
  Tags,
  Plus,
  Search,
  Layers,
  CircleDollarSign,
  TrendingDown,
  Trash2,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Activity,
} from "lucide-react";
import { toast } from "react-hot-toast";
import ConfirmModal from "../components/ui/ConfirmModal";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Confirm Modal States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const buildTree = (data: any[]) => {
    const map = new Map();
    data.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });
    const roots: any[] = [];
    data.forEach((item) => {
      if (item.parentId) {
        map.get(item.parentId)?.children.push(map.get(item.id));
      } else {
        roots.push(map.get(item.id));
      }
    });
    return roots;
  };

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await listCategoriesRequest();
      const raw = Array.isArray(response) ? response : [];
      const tree = buildTree(raw);
      setCategories(tree);
    } catch (error) {
      toast.error(error.message || "Error al cargar categorías");
    } finally {
      setIsLoading(false);
    }
  };

  // Form States
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: "", color: "bg-indigo-500" });
  const [subForm, setSubForm] = useState({ name: "" });

  const filtered = (categories ?? []).filter(
    (c) =>
      c.type === activeTab &&
      c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleOpenCatModal = () => {
    setCatForm({ name: "", color: "bg-indigo-500" });
    setIsCatModalOpen(true);
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await createCategoryRequest({
        name: catForm.name,
        type: activeTab,
        color: catForm.color,
      });
      toast.success("Categoría creada exitosamente");
      await loadCategories();
      setIsCatModalOpen(false);
    } catch (error) {
      toast.error(error.message || "Error al crear categoría");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCat = (id: string) => {
    setConfirmConfig({
      title: "Eliminar Categoría",
      message:
        "¿Está seguro de que desea eliminar la categoría y todas sus subcategorías? Esta acción es irreversible.",
      onConfirm: async () => {
        try {
          await deleteCategoryRequest(id);
          toast.success("Categoría eliminada correctamente");
          await loadCategories();
        } catch (error) {
          toast.error(error.message || "Error al eliminar categoría");
        }
      },
    });
    setIsConfirmOpen(true);
  };

  const handleOpenSubModal = (catId: string) => {
    setSelectedCatId(catId);
    setSubForm({ name: "" });
    setIsSubModalOpen(true);
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId) return;
    setIsSaving(true);
    try {
      await createSubcategoryRequest({
        name: subForm.name,
        parentId: selectedCatId,
        type: activeTab,
        color: "bg-indigo-500",
      });
      toast.success("Subcategoría creada correctamente");
      await loadCategories();
      setIsSubModalOpen(false);
    } catch (error) {
      toast.error(error.message || "Error al crear subcategoría");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSub = (subId: string) => {
    setConfirmConfig({
      title: "Eliminar Subcategoría",
      message: "¿Está seguro de que desea eliminar esta subcategoría?",
      onConfirm: async () => {
        try {
          await deleteSubcategoryRequest(subId);
          toast.success("Subcategoría eliminada correctamente");
          await loadCategories();
        } catch (error) {
          toast.error(error.message || "Error al eliminar subcategoría");
        }
      },
    });
    setIsConfirmOpen(true);
  };

  return (
    <Appshell>
      <div className="flex flex-col gap-8 animate-fade-in-up pb-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-400"></div>
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-xl shadow-indigo-100">
              <Tags className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                Gestión de Categorías
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Organiza tu estructura financiera
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-indigo-500" />
              <input
                type="text"
                placeholder="Buscar categoría..."
                className="pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm w-72 text-gray-700 font-bold placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleOpenCatModal}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:-translate-y-1 transition-all active:scale-95 text-sm"
            >
              <Plus className="w-5 h-5" /> Nueva Categoría
            </button>
          </div>
        </div>

        {/* TABS VIBRANTES */}
        <div className="flex gap-4 self-start bg-white/50 backdrop-blur-md p-2 rounded-[2rem] border border-white shadow-sm">
          <button
            onClick={() => setActiveTab("INCOME")}
            className={`flex items-center gap-3 px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === "INCOME" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-105" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"}`}
          >
            <CircleDollarSign className="w-4 h-4" /> Ingresos
          </button>
          <button
            onClick={() => setActiveTab("EXPENSE")}
            className={`flex items-center gap-3 px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === "EXPENSE" ? "bg-rose-500 text-white shadow-lg shadow-rose-200 scale-105" : "text-gray-400 hover:text-rose-600 hover:bg-rose-50"}`}
          >
            <TrendingDown className="w-4 h-4" /> Egresos
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
              Sincronizando categorías...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filtered.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-[2.5rem] p-8 border border-white shadow-[0_20px_60px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] transition-all group flex flex-col min-h-[420px] relative overflow-hidden"
              >
                <div
                  className={`absolute top-0 right-0 w-32 h-32 ${category.color} opacity-[0.03] rounded-bl-[5rem] transition-all group-hover:scale-110`}
                ></div>

                {/* CARD HEADER */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl ${category.color} flex items-center justify-center text-white shadow-xl shadow-current/20`}
                    >
                      <Layers className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black text-gray-800 text-xl tracking-tight">
                        {category.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                          {category.children?.length ?? 0} Sub-ítems
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCat(category.id)}
                    className="p-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* SCROLLABLE SUBCATEGORIES LIST - FIXED HEIGHT FOR CONSISTENCY */}
                <div className="space-y-3 mb-6 h-64 overflow-y-auto custom-scrollbar pr-3">
                  {category.children?.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-gray-100/50 group/sub hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all cursor-default"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight className="w-3 h-3 text-indigo-400" />
                        <span className="text-sm font-bold text-gray-600">
                          {sub.name}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSub(sub.id)}
                        className="text-gray-300 hover:text-rose-500 opacity-0 group-hover/sub:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!category.children || category.children.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-center opacity-40">
                      <Activity className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Sin subcategorías
                      </p>
                    </div>
                  )}
                </div>

                {/* CARD FOOTER */}
                <button
                  onClick={() => handleOpenSubModal(category.id)}
                  className={`w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.15em] transition-all mt-auto shrink-0 ${activeTab === "INCOME" ? "border-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500" : "border-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500"}`}
                >
                  <Plus className="w-4 h-4" /> Nuevo Sub-ítem
                </button>
              </div>
            ))}
          </div>
        )}

        {/* MODAL CREAR CATEGORIA */}
        <Modal
          isOpen={isCatModalOpen}
          onClose={() => setIsCatModalOpen(false)}
          title="Nueva Categoría Estructural"
        >
          <form onSubmit={handleSaveCat} className="space-y-8">
            <div className="bg-indigo-50/30 p-8 rounded-[2.5rem] border border-indigo-100/50 space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  <Activity className="w-4 h-4 text-indigo-500" /> Nombre de
                  Categoría
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Gastos de Vivienda"
                  className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm({ ...catForm, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  <Layers className="w-4 h-4 text-indigo-500" /> Identidad
                  Visual
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 bg-white p-4 rounded-3xl border border-gray-50 shadow-inner">
                  {[
                    "bg-emerald-500",
                    "bg-blue-500",
                    "bg-indigo-500",
                    "bg-purple-500",
                    "bg-rose-500",
                    "bg-orange-500",
                    "bg-amber-500",
                    "bg-teal-500",
                  ].map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setCatForm({ ...catForm, color })}
                      className={`w-full aspect-square rounded-2xl ${color} transition-all transform hover:scale-110 flex items-center justify-center ${catForm.color === color ? "ring-4 ring-offset-4 ring-indigo-500 shadow-xl" : "opacity-60 hover:opacity-100"}`}
                    >
                      {catForm.color === color && (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsCatModalOpen(false)}
                className="px-8 py-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {isSaving ? "Guardando..." : "Crear Categoría"}
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL CREAR SUBCATEGORIA */}
        <Modal
          isOpen={isSubModalOpen}
          onClose={() => setIsSubModalOpen(false)}
          title="Nueva Subcategoría Detallada"
        >
          <form onSubmit={handleSaveSub} className="space-y-8">
            <div className="bg-indigo-50/30 p-8 rounded-[2.5rem] border border-indigo-100/50 space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  <Activity className="w-4 h-4 text-indigo-500" /> Nombre de
                  Subcategoría
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Pago de Alquiler"
                  className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                  value={subForm.name}
                  onChange={(e) =>
                    setSubForm({ ...subForm, name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                className="px-8 py-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {isSaving ? "Guardando..." : "Crear Sub-ítem"}
              </button>
            </div>
          </form>
        </Modal>

        <ConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
        />
      </div>
    </Appshell>
  );
}
