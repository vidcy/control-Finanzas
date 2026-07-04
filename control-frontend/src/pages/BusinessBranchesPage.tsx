import React, { useState, useEffect, useMemo } from "react";
import FinanceAppShell from "../components/layout/Appshell";
import ConfirmModal from "../components/ui/ConfirmModal";
import Modal from "../components/ui/Modal";
import Pagination from "../components/ui/Pagination";
import { 
  Building, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  getBranchesRequest, 
  createBranchRequest, 
  updateBranchRequest, 
  deleteBranchRequest
} from "../services/branch.api";
import type { Branch } from "../services/branch.api";

export default function BusinessBranchesPage() {
  // Pagination states
  const [branchPage, setBranchPage] = useState(1);
  const branchPageSize = 6;

  // States for branches CRUD
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Partial<Branch> | null>(null);
  
  // Confirm Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);

  // Load branches
  const fetchBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const data = await getBranchesRequest();
      setBranches(data);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar sedes");
    } finally {
      setIsLoadingBranches(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // Open Create/Edit modal
  const handleOpenEdit = (branch?: Branch) => {
    if (branch) {
      setCurrentBranch(branch);
    } else {
      setCurrentBranch({ name: "", address: "" });
    }
    setIsEditModalOpen(true);
  };

  // Save Sede
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch?.name?.trim()) {
      toast.error("El nombre de la sede es requerido");
      return;
    }

    try {
      if (currentBranch.id) {
        await updateBranchRequest(currentBranch.id, {
          name: currentBranch.name,
          address: currentBranch.address,
        });
        toast.success("Sede actualizada correctamente");
      } else {
        await createBranchRequest({
          name: currentBranch.name,
          address: currentBranch.address,
        });
        toast.success("Sede creada correctamente");
      }
      setIsEditModalOpen(false);
      fetchBranches();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar sede");
    }
  };

  // Confirm Delete Sede
  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;
    try {
      await deleteBranchRequest(branchToDelete);
      toast.success("Sede eliminada correctamente");
      fetchBranches();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar sede");
    } finally {
      setBranchToDelete(null);
    }
  };

  const paginatedBranches = useMemo(() => {
    return branches.slice((branchPage - 1) * branchPageSize, branchPage * branchPageSize);
  }, [branches, branchPage, branchPageSize]);

  return (
    <FinanceAppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-rose-500 font-bold text-sm uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Multi-Sede Enterprise</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Sedes y Locales
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Administra las sucursales y ubicaciones físicas de tu negocio.
            </p>
          </div>
          
          <button
            onClick={() => handleOpenEdit()}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-rose-100 transition-all active:scale-95 self-start md:self-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Crear Nueva Sede</span>
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className="w-full">
          {isLoadingBranches ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-bold">Cargando sedes de tu negocio...</p>
            </div>
          ) : branches.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
              <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800">No hay sedes registradas</h3>
              <p className="text-gray-500 mt-1 mb-6">Empieza registrando una sede para segregar tu inventario y cajas.</p>
              <button
                onClick={() => handleOpenEdit()}
                className="bg-rose-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-rose-600 transition-all"
              >
                Registrar Sede
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedBranches.map((b) => (
                  <div 
                    key={b.id} 
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-rose-100 transition-all p-6 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-50 to-transparent rounded-bl-full opacity-60 group-hover:scale-110 transition-transform"></div>
                    
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="p-3.5 bg-rose-50 text-rose-500 rounded-2xl">
                        <Building className="w-6 h-6" />
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          title="Editar sede"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        
                        {branches.length > 1 && (
                          <button
                            onClick={() => {
                              setBranchToDelete(b.id);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Eliminar sede"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 group-hover:text-rose-600 transition-colors">
                      {b.name}
                    </h3>
                    
                    {b.address && (
                      <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold mt-2">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">{b.address}</span>
                      </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-gray-400">
                      <span>CREADA EL</span>
                      <span className="text-gray-600">{new Date(b.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              {branches.length > 0 && (
                <Pagination
                  currentPage={branchPage}
                  totalItems={branches.length}
                  pageSize={branchPageSize}
                  onPageChange={(p) => setBranchPage(p)}
                  className="pt-4"
                />
              )}
            </div>
          )}
        </div>

        {/* MODAL: CREATE/EDIT BRANCH */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={currentBranch?.id ? "Editar Sede" : "Registrar Nueva Sede"}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSaveBranch} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-extrabold mb-2">Nombre de la Sede</label>
              <input
                type="text"
                placeholder="Ej. Sede Sur, Almacén Chiclayo"
                value={currentBranch?.name || ""}
                onChange={(e) => setCurrentBranch(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-rose-500 focus:bg-white transition-all font-semibold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-extrabold mb-2">Dirección (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Av. Larco 456, Miraflores"
                value={currentBranch?.address || ""}
                onChange={(e) => setCurrentBranch(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-rose-500 focus:bg-white transition-all font-semibold outline-none"
              />
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold rounded-2xl shadow-lg shadow-rose-100 transition-all active:scale-95"
              >
                {currentBranch?.id ? "Actualizar" : "Crear Sede"}
              </button>
            </div>
          </form>
        </Modal>

        {/* CONFIRM DELETE MODAL */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="¿Eliminar Sede?"
          message="Esta acción es irreversible y podría desvincular el inventario asociado a esta sede."
          confirmText="Eliminar Sede"
          variant="danger"
        />

      </div>
    </FinanceAppShell>
  );
}
