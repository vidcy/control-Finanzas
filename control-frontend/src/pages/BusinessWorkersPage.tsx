import React, { useState, useEffect } from "react";
import FinanceAppShell from "../components/layout/Appshell";
import ConfirmModal from "../components/ui/ConfirmModal";
import Modal from "../components/ui/Modal";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Lock, 
  Building, 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  UserCheck, 
  UserX,
  Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  getWorkersRequest, 
  createWorkerRequest, 
  updateWorkerRequest, 
  deleteWorkerRequest 
} from "../services/user.api";
import { getBranchesRequest } from "../services/branch.api";
import type { Branch } from "../services/branch.api";

interface Worker {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  profiles: string[];
  branchId?: string | null;
  branch?: {
    id: string;
    name: string;
  } | null;
}

const AVAILABLE_MODULES = [
  { key: "BUSINESS_DASHBOARD", name: "Resumen Negocio", desc: "Ver estadísticas y salud del negocio" },
  { key: "BUSINESS_POS", name: "Punto de Venta (POS)", desc: "Vender productos y emitir recibos" },
  { key: "BUSINESS_INVENTORY", name: "Almacén & Abastecimiento", desc: "Control de stock, compras, planificador y kardex" },
  { key: "BUSINESS_CASH_REGISTER", name: "Control de Caja", desc: "Abrir, cerrar turnos y arqueos" },
  { key: "BUSINESS_FINANCE", name: "Tesorería", desc: "Movimientos, caja chica e inversiones" },
  { key: "BUSINESS_PENDING", name: "Cuentas Pendientes", desc: "Créditos, deudas y cobranzas" },
  { key: "BUSINESS_REPORTS", name: "Reportes", desc: "Exportar reportes de ventas y compras" },
  { key: "BUSINESS_HISTORY", name: "Historial", desc: "Historial general de transacciones" },
  { key: "BUSINESS_CATEGORIES", name: "Categorías", desc: "Administración de categorías del negocio" },
];

export default function BusinessWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentWorker, setCurrentWorker] = useState<Partial<Worker> & { password?: string } | null>(null);
  
  // Confirm Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<string | null>(null);

  const fetchWorkers = async () => {
    setIsLoading(true);
    try {
      const data = await getWorkersRequest();
      setWorkers(data);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar trabajadores");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const data = await getBranchesRequest();
      setBranches(data);
    } catch (error: any) {
      console.error("Error al cargar sedes", error);
    }
  };

  useEffect(() => {
    fetchWorkers();
    fetchBranches();
  }, []);

  const handleOpenEdit = (worker?: Worker) => {
    if (worker) {
      setCurrentWorker({
        id: worker.id,
        name: worker.name,
        lastName: worker.lastName,
        email: worker.email,
        branchId: worker.branchId || "",
        profiles: worker.profiles || [],
        isActive: worker.isActive,
        password: "",
      });
    } else {
      setCurrentWorker({
        name: "",
        lastName: "",
        email: "",
        branchId: branches[0]?.id || "",
        profiles: ["BUSINESS_POS"], // Default module
        isActive: true,
        password: "",
      });
    }
    setIsEditModalOpen(true);
  };

  const handleToggleModule = (moduleKey: string) => {
    if (!currentWorker) return;
    const currentProfiles = currentWorker.profiles || [];
    let updatedProfiles = [...currentProfiles];
    
    if (updatedProfiles.includes(moduleKey)) {
      updatedProfiles = updatedProfiles.filter(k => k !== moduleKey);
    } else {
      updatedProfiles.push(moduleKey);
    }
    
    setCurrentWorker(prev => prev ? { ...prev, profiles: updatedProfiles } : null);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorker?.name?.trim() || !currentWorker?.email?.trim()) {
      toast.error("El nombre y correo electrónico son requeridos");
      return;
    }
    if (!currentWorker.id && !currentWorker.password?.trim()) {
      toast.error("La contraseña es requerida para nuevos trabajadores");
      return;
    }

    try {
      const payload = {
        name: currentWorker.name,
        lastName: currentWorker.lastName,
        email: currentWorker.email,
        branchId: currentWorker.branchId || null,
        profiles: currentWorker.profiles,
        isActive: currentWorker.isActive,
        password: currentWorker.password || undefined,
      };

      if (currentWorker.id) {
        await updateWorkerRequest(currentWorker.id, payload);
        toast.success("Trabajador actualizado correctamente");
      } else {
        await createWorkerRequest(payload);
        toast.success("Trabajador registrado correctamente");
      }
      setIsEditModalOpen(false);
      fetchWorkers();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar trabajador");
    }
  };

  const handleToggleActiveStatus = async (worker: Worker) => {
    try {
      await updateWorkerRequest(worker.id, {
        isActive: !worker.isActive
      });
      toast.success(worker.isActive ? "Trabajador desactivado" : "Trabajador activado");
      fetchWorkers();
    } catch (error: any) {
      toast.error("Error al cambiar estado del trabajador");
    }
  };

  const handleConfirmDelete = async () => {
    if (!workerToDelete) return;
    try {
      await deleteWorkerRequest(workerToDelete);
      toast.success("Trabajador eliminado correctamente");
      fetchWorkers();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar trabajador");
    } finally {
      setWorkerToDelete(null);
    }
  };

  return (
    <FinanceAppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Gestión de Roles y Permisos</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Personal / Trabajadores
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Crea usuarios para tus vendedores, asígnalos a sucursales y restringe su acceso a los módulos.
            </p>
          </div>
          
          <button
            onClick={() => handleOpenEdit()}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-95 self-start md:self-auto"
          >
            <UserPlus className="w-5 h-5" />
            <span>Agregar Trabajador</span>
          </button>
        </div>

        {/* WORKERS GRID */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold">Cargando personal de tu negocio...</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800">No hay personal registrado</h3>
            <p className="text-gray-500 mt-1 mb-6">Agrega cuentas para tus empleados para que puedan vender o gestionar tu negocio.</p>
            <button
              onClick={() => handleOpenEdit()}
              className="bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-600 transition-all"
            >
              Registrar Primer Trabajador
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workers.map((worker) => {
              const initials = `${worker.name?.[0] || ""}${worker.lastName?.[0] || ""}`.toUpperCase();
              
              return (
                <div 
                  key={worker.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Avatar, Name and Status */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-indigo-100">
                          {initials || <Users className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-gray-900 leading-tight">
                            {worker.name} {worker.lastName}
                          </h3>
                          <span className="text-xs text-gray-400 font-semibold">{worker.email}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleActiveStatus(worker)}
                        className={`p-1.5 rounded-xl transition-all ${
                          worker.isActive 
                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                            : "bg-red-50 text-red-500 hover:bg-red-100"
                        }`}
                        title={worker.isActive ? "Desactivar trabajador" : "Activar trabajador"}
                      >
                        {worker.isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Sede / Sucursal Badge */}
                    <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <Building className="w-4 h-4 text-gray-400" />
                      <div className="text-xs font-bold text-gray-500">
                        SEDE ASIGNADA: <span className="text-gray-900 font-black uppercase">{worker.branch?.name || "Sin sede asignada"}</span>
                      </div>
                    </div>

                    {/* Modules Access List */}
                    <div className="mb-6">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Módulos Autorizados</span>
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {worker.profiles && worker.profiles.length > 0 ? (
                          worker.profiles.map(pKey => {
                            const mod = AVAILABLE_MODULES.find(m => m.key === pKey);
                            return (
                              <span 
                                key={pKey} 
                                className="px-2.5 py-1 bg-indigo-50/50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100/50"
                              >
                                {mod?.name || pKey}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-gray-400 text-xs italic font-semibold">Sin accesos configurados</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between gap-4">
                    <button
                      onClick={() => handleOpenEdit(worker)}
                      className="flex-1 py-2.5 px-4 bg-gray-55 hover:bg-gray-100 text-gray-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-gray-100"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Configurar</span>
                    </button>
                    <button
                      onClick={() => {
                        setWorkerToDelete(worker.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                      title="Eliminar trabajador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL: CREATE/EDIT WORKER */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={currentWorker?.id ? "Configurar Trabajador" : "Registrar Nuevo Trabajador"}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSaveWorker} className="space-y-6">
            
            {/* Basic Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-extrabold mb-1.5 text-sm">Nombres</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Carlos"
                  value={currentWorker?.name || ""}
                  onChange={(e) => setCurrentWorker(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-extrabold mb-1.5 text-sm">Apellidos</label>
                <input
                  type="text"
                  placeholder="Ej. Pérez"
                  value={currentWorker?.lastName || ""}
                  onChange={(e) => setCurrentWorker(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                />
              </div>
            </div>

            {/* Email and Password Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-extrabold mb-1.5 text-sm flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>Correo Electrónico</span>
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@negocio.com"
                  value={currentWorker?.email || ""}
                  onChange={(e) => setCurrentWorker(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                  required
                  disabled={!!currentWorker?.id}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-extrabold mb-1.5 text-sm flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-gray-400" />
                  <span>Contraseña</span>
                </label>
                <input
                  type="password"
                  placeholder={currentWorker?.id ? "•••••••• (Dejar en blanco)" : "Mínimo 6 caracteres"}
                  value={currentWorker?.password || ""}
                  onChange={(e) => setCurrentWorker(prev => prev ? { ...prev, password: e.target.value } : null)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                  required={!currentWorker?.id}
                />
              </div>
            </div>

            {/* Branch Assignment */}
            <div>
              <label className="block text-gray-700 font-extrabold mb-1.5 text-sm flex items-center gap-1.5">
                <Building className="w-4 h-4 text-gray-400" />
                <span>Asignar Sede / Sucursal</span>
              </label>
              <select
                value={currentWorker?.branchId || ""}
                onChange={(e) => setCurrentWorker(prev => prev ? { ...prev, branchId: e.target.value } : null)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
              >
                <option value="">-- Sin sede asignada --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Modules Grid Checklist */}
            <div>
              <label className="block text-gray-700 font-black mb-3 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                <span>Accesos y Permisos del Sistema</span>
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 border border-gray-100 rounded-2xl">
                {AVAILABLE_MODULES.map((mod) => {
                  const isChecked = currentWorker?.profiles?.includes(mod.key) || false;
                  
                  return (
                    <div
                      key={mod.key}
                      onClick={() => handleToggleModule(mod.key)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isChecked 
                          ? "border-indigo-500 bg-indigo-50/20" 
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by div onClick
                        className="mt-1 accent-indigo-600 rounded"
                      />
                      <div>
                        <div className="text-xs font-black text-gray-900">{mod.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold mt-0.5 leading-snug">{mod.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                {currentWorker?.id ? "Actualizar Permisos" : "Registrar Trabajador"}
              </button>
            </div>

          </form>
        </Modal>

        {/* CONFIRM DELETE WORKER */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="¿Eliminar Trabajador?"
          message="Esta acción es irreversible y revocaría por completo el acceso del empleado al sistema ERP."
          confirmText="Eliminar Trabajador"
          variant="danger"
        />

      </div>
    </FinanceAppShell>
  );
}
