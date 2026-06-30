import React, { useState, useEffect } from "react";
import FinanceAppShell from "../components/layout/Appshell";
import ConfirmModal from "../components/ui/ConfirmModal";
import Modal from "../components/ui/Modal";
import Pagination from "../components/ui/Pagination";
import {
  Users,
  UserPlus,
  Trash2,
  Edit3,
  UserCheck,
  UserX,
  Sparkles,
  Percent,
  Settings,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getUserRequest, updateMyProfileRequest } from "../services/user.api";
import { useAuth } from "../auth/AuthContext";
import {
  getAdvisorsRequest,
  createAdvisorRequest,
  updateAdvisorRequest,
  deleteAdvisorRequest,
} from "../services/advisor.api";
import type { Advisor } from "../services/advisor.api";

export default function BusinessAdvisorsPage() {
  const { user, setUser } = useAuth();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [advisorLabel, setAdvisorLabel] = useState(
    user?.advisorLabel || "Asesor de venta",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingLabel, setIsSavingLabel] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const paginatedAdvisors = advisors.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentAdvisor, setCurrentAdvisor] = useState<Partial<Advisor> | null>(
    null,
  );

  // Confirm Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [advisorToDelete, setAdvisorToDelete] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const u = await getUserRequest();
      if (u?.advisorLabel) {
        setAdvisorLabel(u.advisorLabel);
      }
    } catch (error) {
      console.error("Error al cargar perfil", error);
    }
  };

  const fetchAdvisors = async () => {
    setIsLoading(true);
    try {
      const data = await getAdvisorsRequest();
      setAdvisors(data);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar los asesores");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAdvisors();
  }, []);

  const handleUpdateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorLabel.trim()) {
      toast.error("La denominación no puede estar vacía");
      return;
    }
    setIsSavingLabel(true);
    try {
      const res = await updateMyProfileRequest({
        advisorLabel: advisorLabel.trim(),
      });
      const updatedUser = { ...user, ...res };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Denominación actualizada correctamente");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar la denominación");
    } finally {
      setIsSavingLabel(false);
    }
  };

  const handleOpenEdit = (advisor?: Advisor) => {
    if (advisor) {
      setCurrentAdvisor({
        id: advisor.id,
        name: advisor.name,
        commissionPercentage: advisor.commissionPercentage,
        isActive: advisor.isActive,
      });
    } else {
      setCurrentAdvisor({
        name: "",
        commissionPercentage: 0,
        isActive: true,
      });
    }
    setIsEditModalOpen(true);
  };

  const handleSaveAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdvisor?.name?.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    const commission = Number(currentAdvisor.commissionPercentage);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      toast.error("El porcentaje de comisión debe estar entre 0 y 100");
      return;
    }

    try {
      const payload = {
        name: currentAdvisor.name,
        commissionPercentage: commission,
        isActive: currentAdvisor.isActive,
      };

      if (currentAdvisor.id) {
        await updateAdvisorRequest(currentAdvisor.id, payload);
        toast.success(`${advisorLabel} actualizado correctamente`);
      } else {
        await createAdvisorRequest(payload);
        toast.success(`${advisorLabel} registrado correctamente`);
      }
      setIsEditModalOpen(false);
      fetchAdvisors();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el asesor");
    }
  };

  const handleToggleActiveStatus = async (advisor: Advisor) => {
    try {
      await updateAdvisorRequest(advisor.id, {
        isActive: !advisor.isActive,
      });
      toast.success(
        advisor.isActive
          ? `${advisorLabel} desactivado`
          : `${advisorLabel} activado`,
      );
      fetchAdvisors();
    } catch (error: any) {
      toast.error("Error al cambiar el estado del asesor");
    }
  };

  const handleConfirmDelete = async () => {
    if (!advisorToDelete) return;
    try {
      await deleteAdvisorRequest(advisorToDelete);
      toast.success(`${advisorLabel} eliminado correctamente`);
      fetchAdvisors();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el asesor");
    } finally {
      setAdvisorToDelete(null);
      setIsDeleteModalOpen(false);
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
              <span>Gestión de Ventas y Comisiones</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {advisorLabel}es
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Registra a tus asesores, vendedores o personal de comisión y
              configúrales sus tasas para el cálculo de sus incentivos.
            </p>
          </div>

          <button
            onClick={() => handleOpenEdit()}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-95 self-start md:self-auto"
          >
            <UserPlus className="w-5 h-5" />
            <span>Agregar {advisorLabel}</span>
          </button>
        </div>

        {/* CUSTOMIZE DENOMINATION SECTION */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            <span>Personalizar Denominación</span>
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Cambia cómo el sistema llama a tus asesores en la barra lateral, en
            las facturas y en la pantalla de POS (ej. "Promotora", "Vendedor",
            "Comisionista").
          </p>
          <form onSubmit={handleUpdateLabel} className="flex gap-4 max-w-md">
            <input
              type="text"
              value={advisorLabel}
              onChange={(e) => setAdvisorLabel(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
              placeholder="Ej. Promotora"
              required
            />
            <button
              type="submit"
              disabled={isSavingLabel}
              className="bg-gray-900 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 text-sm"
            >
              {isSavingLabel ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        </div>

        {/* ADVISORS GRID */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold">Cargando la lista de asesores...</p>
          </div>
        ) : advisors.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800">
              No hay asesores registrados
            </h3>
            <p className="text-gray-500 mt-1 mb-6">
              Crea cuentas para tus vendedores para asociar sus comisiones a las
              ventas del POS.
            </p>
            <button
              onClick={() => handleOpenEdit()}
              className="bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-600 transition-all"
            >
              Registrar Primer {advisorLabel}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedAdvisors.map((advisor) => {
                const initials = advisor.name.substring(0, 2).toUpperCase();

                return (
                  <div
                    key={advisor.id}
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
                              {advisor.name}
                            </h3>
                            <span className="text-xs text-gray-400 font-semibold">
                              Registrado el{" "}
                              {new Date(advisor.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleActiveStatus(advisor)}
                          className={`p-1.5 rounded-xl transition-all ${
                            advisor.isActive
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-red-50 text-red-500 hover:bg-red-100"
                          }`}
                          title={
                            advisor.isActive
                              ? "Desactivar asesor"
                              : "Activar asesor"
                          }
                        >
                          {advisor.isActive ? (
                            <UserCheck className="w-4 h-4" />
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Comisión base Badge */}
                      <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <Percent className="w-4 h-4 text-gray-400" />
                        <div className="text-xs font-bold text-gray-500">
                          COMISIÓN BASE:{" "}
                          <span className="text-indigo-600 font-black text-sm">
                            {advisor.commissionPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between gap-4">
                      <button
                        onClick={() => handleOpenEdit(advisor)}
                        className="flex-1 py-2.5 px-4 bg-gray-55 hover:bg-gray-100 text-gray-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-gray-100"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Configurar</span>
                      </button>
                      <button
                        onClick={() => {
                          setAdvisorToDelete(advisor.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                        title="Eliminar asesor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {advisors.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={advisors.length}
                pageSize={pageSize}
                onPageChange={(p) => setCurrentPage(p)}
                className="pt-4"
              />
            )}
          </div>
        )}

        {/* MODAL: CREATE/EDIT ADVISOR */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={
            currentAdvisor?.id
              ? `Configurar ${advisorLabel}`
              : `Registrar Nuevo ${advisorLabel}`
          }
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveAdvisor} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-extrabold mb-1.5 text-sm">
                Nombre Completo
              </label>
              <input
                type="text"
                placeholder="Ej. María Elena Rojas"
                value={currentAdvisor?.name || ""}
                onChange={(e) =>
                  setCurrentAdvisor((prev) =>
                    prev ? { ...prev, name: e.target.value } : null,
                  )
                }
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-extrabold mb-1.5 text-sm flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-gray-400" />
                <span>Porcentaje de Comisión (%)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ej. 5.5"
                value={currentAdvisor?.commissionPercentage ?? 0}
                onChange={(e) =>
                  setCurrentAdvisor((prev) =>
                    prev
                      ? {
                          ...prev,
                          commissionPercentage: parseFloat(e.target.value) || 0,
                        }
                      : null,
                  )
                }
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-sm font-bold text-gray-700">
                Estado Activo
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentAdvisor((prev) =>
                    prev ? { ...prev, isActive: !prev.isActive } : null,
                  )
                }
                className={`w-12 h-6 rounded-full p-1 transition-all ${currentAdvisor?.isActive ? "bg-indigo-600" : "bg-gray-300"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all ${currentAdvisor?.isActive ? "translate-x-6" : "translate-x-0"}`}
                ></div>
              </button>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-4 bg-gray-55 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                {currentAdvisor?.id ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </form>
        </Modal>

        {/* CONFIRM DELETE ADVISOR */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title={`¿Eliminar ${advisorLabel}?`}
          message={`Esta acción es irreversible y revocaría el registro de este asesor del sistema. Las ventas asociadas no se eliminarán pero perderán el vínculo con el asesor.`}
          confirmText="Eliminar Asesor"
          variant="danger"
        />
      </div>
    </FinanceAppShell>
  );
}
