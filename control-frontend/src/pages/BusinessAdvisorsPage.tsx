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
  Layers,
  Tag,
  ShoppingBag,
  Check,
  Plus,
  Sliders,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getUserRequest, updateMyProfileRequest } from "../services/user.api";
import { useAuth } from "../auth/AuthContext";
import {
  getAdvisorsRequest,
  createAdvisorRequest,
  updateAdvisorRequest,
  deleteAdvisorRequest,
  getCommissionModelsRequest,
  createCommissionModelRequest,
  updateCommissionModelRequest,
  deleteCommissionModelRequest,
} from "../services/advisor.api";
import type { Advisor, CommissionModel } from "../services/advisor.api";
import { listCategoriesRequest } from "../services/category.api";
import { getProductsRequest, getBrandsRequest } from "../services/product.api";
import type { Product } from "../services/product.api";

export default function BusinessAdvisorsPage() {
  const { user, setUser } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<"advisors" | "models">("advisors");

  // Core States
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [commissionModels, setCommissionModels] = useState<CommissionModel[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [advisorLabel, setAdvisorLabel] = useState(
    user?.agentRoleSingular || user?.advisorLabel || "Asesor de venta",
  );
  const [agentRoleSingular, setAgentRoleSingular] = useState(
    user?.agentRoleSingular || user?.advisorLabel || "Asesor de venta",
  );
  const [agentRolePlural, setAgentRolePlural] = useState(
    user?.agentRolePlural || "Asesores",
  );
  const [defaultCommissionModel, setDefaultCommissionModel] = useState(
    user?.defaultCommissionModel || "PERCENTAGE",
  );
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingLabel, setIsSavingLabel] = useState(false);

  // Pagination for Advisors
  const [currentAdvisorPage, setCurrentAdvisorPage] = useState(1);
  const pageAdvisorSize = 6;
  const paginatedAdvisors = advisors.slice(
    (currentAdvisorPage - 1) * pageAdvisorSize,
    currentAdvisorPage * pageAdvisorSize,
  );

  // Pagination for Models
  const [currentModelPage, setCurrentModelPage] = useState(1);
  const pageModelSize = 6;
  const paginatedModels = commissionModels.slice(
    (currentModelPage - 1) * pageModelSize,
    currentModelPage * pageModelSize,
  );

  // Modals for Advisors
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);
  const [currentAdvisor, setCurrentAdvisor] = useState<Partial<Advisor> | null>(null);
  const [isAdvisorDeleteModalOpen, setIsAdvisorDeleteModalOpen] = useState(false);
  const [advisorToDelete, setAdvisorToDelete] = useState<string | null>(null);

  // Modals for Commission Models
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<Partial<CommissionModel> | null>(null);
  const [isModelDeleteModalOpen, setIsModelDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);

  // Loaders
  const fetchProfile = async () => {
    try {
      const u = await getUserRequest();
      if (u) {
        setAdvisorLabel(u.agentRoleSingular || u.advisorLabel || "Asesor de venta");
        setAgentRoleSingular(u.agentRoleSingular || u.advisorLabel || "Asesor de venta");
        setAgentRolePlural(u.agentRolePlural || "Asesores");
        setDefaultCommissionModel(u.defaultCommissionModel || "PERCENTAGE");
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

  const fetchCommissionModels = async () => {
    try {
      const data = await getCommissionModelsRequest();
      setCommissionModels(data);
    } catch (error: any) {
      console.error("Error al cargar modelos de comisión", error);
    }
  };

  const fetchFiltersData = async () => {
    try {
      const [cats, brs, prds] = await Promise.all([
        listCategoriesRequest(),
        getBrandsRequest(),
        getProductsRequest(),
      ]);
      setCategories(cats.filter((c: any) => c.type === "INCOME"));
      setBrands(brs);
      setProducts(prds);
    } catch (error) {
      console.error("Error al cargar filtros del modelo de comisión", error);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAdvisors();
    fetchCommissionModels();
    fetchFiltersData();
  }, []);

  const handleUpdateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentRoleSingular.trim() || !agentRolePlural.trim()) {
      toast.error("Las etiquetas no pueden estar vacías");
      return;
    }
    setIsSavingLabel(true);
    try {
      const res = await updateMyProfileRequest({
        advisorLabel: agentRoleSingular.trim(),
        agentRoleSingular: agentRoleSingular.trim(),
        agentRolePlural: agentRolePlural.trim(),
        defaultCommissionModel,
      });
      const updatedUser = { ...user, ...res };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setAdvisorLabel(res.agentRoleSingular || res.advisorLabel || advisorLabel);
      setAgentRoleSingular(res.agentRoleSingular || res.advisorLabel || agentRoleSingular);
      setAgentRolePlural(res.agentRolePlural || agentRolePlural);
      setDefaultCommissionModel(res.defaultCommissionModel || defaultCommissionModel);
      toast.success("Configuración de denominación y comisiones actualizada");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar la denominación");
    } finally {
      setIsSavingLabel(false);
    }
  };

  // Advisor handlers
  const handleOpenEditAdvisor = (advisor?: Advisor) => {
    if (advisor) {
      setCurrentAdvisor({
        id: advisor.id,
        name: advisor.name,
        commissionPercentage: advisor.commissionPercentage,
        commissionType: advisor.commissionType || "PERCENT",
        commissionValue: advisor.commissionValue || 0,
        commissionModelId: advisor.commissionModelId || "",
        isActive: advisor.isActive,
      });
    } else {
      setCurrentAdvisor({
        name: "",
        commissionPercentage: 0,
        commissionType: "PERCENT",
        commissionValue: 0,
        commissionModelId: "",
        isActive: true,
      });
    }
    setIsAdvisorModalOpen(true);
  };

  const handleSaveAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdvisor?.name?.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    let payload: any = {
      name: currentAdvisor.name,
      isActive: currentAdvisor.isActive,
      commissionModelId: currentAdvisor.commissionModelId || null,
    };

    // If no model, enforce direct values
    if (!currentAdvisor.commissionModelId) {
      const commissionVal = Number(currentAdvisor.commissionValue || 0);
      if (isNaN(commissionVal) || commissionVal < 0) {
        toast.error("El valor de comisión debe ser mayor o igual a 0");
        return;
      }
      if (currentAdvisor.commissionType === "PERCENT" && commissionVal > 100) {
        toast.error("El porcentaje de comisión no puede superar el 100%");
        return;
      }
      payload.commissionType = currentAdvisor.commissionType || "PERCENT";
      payload.commissionValue = commissionVal;
      payload.commissionPercentage = currentAdvisor.commissionType === "PERCENT" ? commissionVal : 0;
    }

    try {
      if (currentAdvisor.id) {
        await updateAdvisorRequest(currentAdvisor.id, payload);
        toast.success(`${advisorLabel} actualizado correctamente`);
      } else {
        await createAdvisorRequest(payload);
        toast.success(`${advisorLabel} registrado correctamente`);
      }
      setIsAdvisorModalOpen(false);
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

  const handleConfirmDeleteAdvisor = async () => {
    if (!advisorToDelete) return;
    try {
      await deleteAdvisorRequest(advisorToDelete);
      toast.success(`${advisorLabel} eliminado correctamente`);
      fetchAdvisors();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el asesor");
    } finally {
      setAdvisorToDelete(null);
      setIsAdvisorDeleteModalOpen(false);
    }
  };

  const getDropdownValue = (type: string, applyTo?: string, isAdditional?: boolean): string => {
    if (type === "PERCENT" || type === "PERCENT_OF_SALE" || type === "PERCENT_OF_MARGIN") {
      if (applyTo === "PROFIT" || type === "PERCENT_OF_MARGIN") {
        return "PERCENT_MARGIN";
      }
      return isAdditional ? "PERCENT_ADDITIONAL" : "PERCENT_DEDUCTED";
    }
    if (type === "FIXED" || type === "FIXED_PER_UNIT") {
      return isAdditional ? "SPLIT_ADDITIONAL" : "FIXED_DEDUCTED";
    }
    if (type === "SPLIT") {
      return "SPLIT_ADDITIONAL";
    }
    return "PERCENT_DEDUCTED";
  };

  // Commission Model handlers
  const handleOpenEditModel = (model?: CommissionModel) => {
    if (model) {
      setCurrentModel({
        id: model.id,
        name: model.name,
        type: getDropdownValue(model.type, model.applyTo, model.isAdditional),
        value: model.value,
        applyTo: model.applyTo || "SALE",
        minCommission: model.minCommission || 0,
        maxCommission: model.maxCommission || null,
        allowDiscounts: model.allowDiscounts ?? true,
        allowManualEdit: model.allowManualEdit ?? true,
        isAdditional: model.isAdditional ?? false,
        categoryIds: model.categoryIds || [],
        brandIds: model.brandIds || [],
        productIds: model.productIds || [],
      });
    } else {
      setCurrentModel({
        name: "",
        type: "PERCENT_DEDUCTED",
        value: 0,
        applyTo: "SALE",
        minCommission: 0,
        maxCommission: null,
        allowDiscounts: true,
        allowManualEdit: true,
        isAdditional: false,
        categoryIds: [],
        brandIds: [],
        productIds: [],
      });
    }
    setIsModelModalOpen(true);
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentModel?.name?.trim()) {
      toast.error("El nombre del modelo es requerido");
      return;
    }
    const val = Number(currentModel.value || 0);
    if (isNaN(val) || val < 0) {
      toast.error("El valor base de comisión debe ser mayor o igual a 0");
      return;
    }
    
    const dropdownVal = currentModel.type || "PERCENT_DEDUCTED";
    let type = "PERCENT";
    let applyTo = "SALE";
    let isAdditional = false;

    if (dropdownVal === "PERCENT_DEDUCTED") {
      type = "PERCENT";
      applyTo = "SALE";
      isAdditional = false;
    } else if (dropdownVal === "PERCENT_ADDITIONAL") {
      type = "PERCENT";
      applyTo = "SALE";
      isAdditional = true;
    } else if (dropdownVal === "PERCENT_MARGIN") {
      type = "PERCENT";
      applyTo = "PROFIT";
      isAdditional = false;
    } else if (dropdownVal === "FIXED_DEDUCTED") {
      type = "FIXED";
      applyTo = "SALE";
      isAdditional = false;
    } else if (dropdownVal === "SPLIT_ADDITIONAL") {
      type = "SPLIT";
      applyTo = "SALE";
      isAdditional = true;
    }

    if (type === "PERCENT" && val > 1000) {
      toast.error("El porcentaje no puede superar el 1000%");
      return;
    }

    const payload = {
      ...currentModel,
      type,
      applyTo,
      isAdditional,
    };

    try {
      if (currentModel.id) {
        await updateCommissionModelRequest(currentModel.id, payload);
        toast.success("Modelo de comisión actualizado correctamente");
      } else {
        await createCommissionModelRequest(payload);
        toast.success("Modelo de comisión registrado correctamente");
      }
      setIsModelModalOpen(false);
      fetchCommissionModels();
      fetchAdvisors(); // Refresh assigned model data
    } catch (error: any) {
      toast.error(error.message || "Error al guardar el modelo de comisión");
    }
  };

  const handleConfirmDeleteModel = async () => {
    if (!modelToDelete) return;
    try {
      await deleteCommissionModelRequest(modelToDelete);
      toast.success("Modelo de comisión eliminado correctamente");
      fetchCommissionModels();
      fetchAdvisors(); // Refresh advisor mappings
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar el modelo de comisión");
    } finally {
      setModelToDelete(null);
      setIsModelDeleteModalOpen(false);
    }
  };

  const toggleArrayItem = (field: "categoryIds" | "brandIds" | "productIds", itemId: string) => {
    if (!currentModel) return;
    const currentList: string[] = (currentModel[field] as string[]) || [];
    let updated: string[];
    if (currentList.includes(itemId)) {
      updated = currentList.filter(id => id !== itemId);
    } else {
      updated = [...currentList, itemId];
    }
    setCurrentModel({
      ...currentModel,
      [field]: updated,
    });
  };

  return (
    <FinanceAppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Configuración de Compensaciones</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {activeTab === "advisors" ? agentRolePlural : "Modelos de Comisión"}
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              {activeTab === "advisors" 
                ? `Registra y supervisa las comisiones de tus ${agentRolePlural.toLowerCase()} o colaboradores.`
                : "Configura esquemas de incentivos reutilizables con reglas y exclusiones de categorías, marcas o productos."
              }
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {activeTab === "advisors" ? (
              <button
                onClick={() => handleOpenEditAdvisor()}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                <UserPlus className="w-5 h-5" />
                <span>Agregar {agentRoleSingular}</span>
              </button>
            ) : (
              <button
                onClick={() => handleOpenEditModel()}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span>Crear Modelo</span>
              </button>
            )}
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex items-center gap-2 border-b border-gray-100 mb-8">
          <button
            onClick={() => setActiveTab("advisors")}
            className={`px-5 py-3.5 font-bold text-sm transition-all border-b-2 -mb-[2px] flex items-center gap-2 ${
              activeTab === "advisors"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Colaboradores ({advisors.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("models")}
            className={`px-5 py-3.5 font-bold text-sm transition-all border-b-2 -mb-[2px] flex items-center gap-2 ${
              activeTab === "models"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Modelos de Comisión ({commissionModels.length})</span>
          </button>
        </div>

        {activeTab === "advisors" ? (
          <>
            {/* CUSTOMIZE DENOMINATION SECTION */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                <span>Personalizar Denominación y Comisiones</span>
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Cambia cómo el sistema llama a tus agentes en la barra lateral y en
                las facturas (ej. "Promotora", "Asesor"). También define el modelo de comisión por defecto.
              </p>
              <form onSubmit={handleUpdateLabel} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Denominación Singular
                    </label>
                    <input
                      type="text"
                      value={agentRoleSingular}
                      onChange={(e) => setAgentRoleSingular(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-55 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
                      placeholder="Ej. Promotora"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Denominación Plural
                    </label>
                    <input
                      type="text"
                      value={agentRolePlural}
                      onChange={(e) => setAgentRolePlural(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-55 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
                      placeholder="Ej. Promotoras"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Modelo por Defecto
                    </label>
                    <select
                      value={defaultCommissionModel}
                      onChange={(e) => setDefaultCommissionModel(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-55 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
                    >
                      <option value="PERCENTAGE">Porcentaje (%)</option>
                      <option value="FIXED_AMOUNT">Monto Fijo (S/)</option>
                      <option value="PRICE_SPLIT">Split de Precio</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSavingLabel}
                  className="bg-gray-900 text-white font-extrabold px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 text-sm"
                >
                  {isSavingLabel ? "Guardando..." : "Guardar Configuración"}
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
                  No hay colaboradores registrados
                </h3>
                <p className="text-gray-500 mt-1 mb-6">
                  Crea cuentas para tus vendedores para asociar sus comisiones a las
                  ventas del POS.
                </p>
                <button
                  onClick={() => handleOpenEditAdvisor()}
                  className="bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-600 transition-all"
                >
                  Registrar Primer {agentRoleSingular}
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
                              title={advisor.isActive ? "Desactivar" : "Activar"}
                            >
                              {advisor.isActive ? (
                                <UserCheck className="w-4 h-4" />
                              ) : (
                                <UserX className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {/* Mode Config display */}
                          {advisor.commissionModel ? (
                            <div className="mb-4 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-3.5 rounded-2xl border border-indigo-100/50">
                              <div className="text-[10px] text-indigo-500 font-black uppercase tracking-wider mb-1">
                                Modelo Asociado
                              </div>
                              <div className="font-extrabold text-gray-800 text-sm">
                                {advisor.commissionModel.name}
                              </div>
                              <div className="text-xs text-gray-500 font-bold mt-0.5 flex items-center gap-1">
                                <Percent className="w-3.5 h-3.5 text-indigo-500" />
                                <span>
                                  {(advisor.commissionModel.type === "PERCENT" || advisor.commissionModel.type?.includes("PERCENT"))
                                     ? `${advisor.commissionModel.value}% (${advisor.commissionModel.applyTo === "PROFIT" ? "Utilidad" : "Venta"}${advisor.commissionModel.isAdditional ? " + Adicionado" : ""})`
                                     : (advisor.commissionModel.type === "FIXED" || advisor.commissionModel.type?.includes("FIXED"))
                                     ? `S/ ${advisor.commissionModel.value.toFixed(2)} por unidad (${advisor.commissionModel.isAdditional ? "Adicionado" : "Deducido"})`
                                     : `S/ ${advisor.commissionModel.value.toFixed(2)} Split/Fichera`}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                              <Percent className="w-4 h-4 text-gray-400" />
                              <div className="text-xs font-bold text-gray-500">
                                VALOR DIRECTO:{" "}
                                <span className="text-indigo-600 font-black text-sm">
                                  {advisor.commissionType === "PERCENT"
                                    ? `${advisor.commissionValue || 0}%`
                                    : advisor.commissionType === "FIXED"
                                    ? `S/ ${(advisor.commissionValue || 0).toFixed(2)} (Fijo)`
                                    : `S/ ${(advisor.commissionValue || 0).toFixed(2)} (Split)`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions footer */}
                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between gap-4">
                          <button
                            onClick={() => handleOpenEditAdvisor(advisor)}
                            className="flex-1 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-gray-100"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Configurar</span>
                          </button>
                          <button
                            onClick={() => {
                              setAdvisorToDelete(advisor.id);
                              setIsAdvisorDeleteModalOpen(true);
                            }}
                            className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                            title="Eliminar"
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
                    currentPage={currentAdvisorPage}
                    totalItems={advisors.length}
                    pageSize={pageAdvisorSize}
                    onPageChange={(p) => setCurrentAdvisorPage(p)}
                    className="pt-4"
                  />
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* COMMISSION MODELS GRID */}
            {commissionModels.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800">
                  No hay modelos de comisión creados
                </h3>
                <p className="text-gray-500 mt-1 mb-6">
                  Crea esquemas de comisión y asígnalos a múltiples colaboradores para simplificar la gestión.
                </p>
                <button
                  onClick={() => handleOpenEditModel()}
                  className="bg-emerald-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-600 transition-all"
                >
                  Registrar Primer Modelo
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedModels.map((model) => {
                    const matchedCatsCount = Array.isArray(model.categoryIds) ? model.categoryIds.length : 0;
                    const matchedBrsCount = Array.isArray(model.brandIds) ? model.brandIds.length : 0;
                    const matchedPrdsCount = Array.isArray(model.productIds) ? model.productIds.length : 0;

                    return (
                      <div
                        key={model.id}
                        className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all p-6 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg ${
                              (model.type === "PERCENT" || model.type?.includes("PERCENT")) 
                                ? "bg-indigo-50 text-indigo-600" 
                                : (model.type === "FIXED" || model.type?.includes("FIXED"))
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-purple-50 text-purple-600"
                            }`}>
                              {
                                (model.type === "PERCENT" || model.type?.includes("PERCENT"))
                                  ? (model.isAdditional ? "Porcentaje (Adicionado)" : "Porcentaje (Deducido)")
                                  : (model.type === "FIXED" || model.type?.includes("FIXED"))
                                  ? (model.isAdditional ? "Split/Fichera (Adicionado)" : "Fijo (Deducido)")
                                  : (model.type === "SPLIT" ? "Split/Fichera (Adicionado)" : "Split/Fichera")
                              }
                            </span>
                            <span className="text-xs text-gray-400 font-bold">
                              {model._count?.advisors ?? 0} Asignados
                            </span>
                          </div>

                          <h3 className="font-extrabold text-gray-900 text-lg mb-1 leading-tight">
                            {model.name}
                          </h3>

                          {/* Value display */}
                          <div className="text-2xl font-black text-gray-800 mb-4">
                            {(model.type === "PERCENT" || model.type?.includes("PERCENT")) 
                              ? `${model.value}%` 
                              : `S/ ${model.value.toFixed(2)}`
                            }
                            {(model.type === "PERCENT" || model.type?.includes("PERCENT")) && (
                              <span className="text-xs text-gray-500 font-bold ml-1.5">
                                sobre {model.applyTo === "PROFIT" ? "Utilidad" : "Venta"}
                              </span>
                            )}
                          </div>

                          {/* Filters detail list */}
                          <div className="space-y-1.5 mb-5 pt-3 border-t border-gray-50">
                            <div className="text-[10px] text-gray-450 font-black uppercase tracking-wider">
                              Restricción de Alcance
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs font-extrabold text-gray-600">
                              <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${matchedCatsCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-400'}`}>
                                <Layers className="w-3.5 h-3.5" />
                                {matchedCatsCount > 0 ? `${matchedCatsCount} Categorías` : 'Todas'}
                              </span>
                              <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${matchedBrsCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
                                <Tag className="w-3.5 h-3.5" />
                                {matchedBrsCount > 0 ? `${matchedBrsCount} Marcas` : 'Todas'}
                              </span>
                              <span className={`px-2 py-1 rounded-md flex items-center gap-1 ${matchedPrdsCount > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-400'}`}>
                                <ShoppingBag className="w-3.5 h-3.5" />
                                {matchedPrdsCount > 0 ? `${matchedPrdsCount} Productos` : 'Todos'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between gap-4">
                          <button
                            onClick={() => handleOpenEditModel(model)}
                            className="flex-1 py-2.5 px-4 bg-gray-55 hover:bg-gray-100 text-gray-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-gray-100"
                          >
                            <Sliders className="w-4 h-4" />
                            <span>Editar Modelo</span>
                          </button>
                          <button
                            onClick={() => {
                              setModelToDelete(model.id);
                              setIsModelDeleteModalOpen(true);
                            }}
                            className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {commissionModels.length > 0 && (
                  <Pagination
                    currentPage={currentModelPage}
                    totalItems={commissionModels.length}
                    pageSize={pageModelSize}
                    onPageChange={(p) => setCurrentModelPage(p)}
                    className="pt-4"
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* MODAL: CREATE/EDIT ADVISOR */}
        <Modal
          isOpen={isAdvisorModalOpen}
          onClose={() => setIsAdvisorModalOpen(false)}
          title={
            currentAdvisor?.id
              ? `Configurar ${advisorLabel}`
              : `Registrar Nuevo ${advisorLabel}`
          }
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveAdvisor} className="space-y-5">
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
                className="w-full px-4 py-3 bg-gray-55 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-extrabold mb-1.5 text-sm">
                Modelo de Comisión
              </label>
              <select
                value={currentAdvisor?.commissionModelId || ""}
                onChange={(e) =>
                  setCurrentAdvisor((prev) =>
                    prev ? { ...prev, commissionModelId: e.target.value || "" } : null,
                  )
                }
                className="w-full px-4 py-3 bg-gray-55 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
              >
                <option value="">-- Sin Modelo Reutilizable (Asignar comisión directa) --</option>
                {commissionModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.type === "PERCENT" ? `${model.value}%` : `S/ ${model.value}`})
                  </option>
                ))}
              </select>
            </div>

            {/* Direct commission overrides fields - only shown if no model is selected */}
            {!currentAdvisor?.commissionModelId && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-fadeIn">
                <div className="text-[10px] text-gray-450 font-black uppercase tracking-wider">
                  Configuración de Comisión Directa
                </div>
                <div>
                  <label className="block text-gray-700 font-extrabold mb-1.5 text-xs uppercase">
                    Esquema de Comisión
                  </label>
                  <select
                    value={currentAdvisor?.commissionType || "PERCENT"}
                    onChange={(e) =>
                      setCurrentAdvisor((prev) =>
                        prev ? { ...prev, commissionType: e.target.value } : null,
                      )
                    }
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 transition-all font-semibold outline-none text-sm"
                  >
                    <option value="PERCENT">Asesor de Venta - Porcentaje (%)</option>
                    <option value="FIXED">Asesor de Venta - Monto Fijo (S/)</option>
                    <option value="SPLIT">Fichera - Incremento de Precio / Split (S/)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-extrabold mb-1.5 text-xs uppercase flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      {currentAdvisor?.commissionType === "PERCENT"
                        ? "Porcentaje de Comisión (%)"
                        : currentAdvisor?.commissionType === "FIXED"
                        ? "Monto Fijo de Comisión (S/)"
                        : "Monto de Incremento de Precio (S/)"}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej. 10"
                    value={currentAdvisor?.commissionValue ?? 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCurrentAdvisor((prev) =>
                        prev
                          ? {
                              ...prev,
                              commissionValue: val,
                              commissionPercentage: prev.commissionType === "PERCENT" ? val : prev.commissionPercentage,
                            }
                          : null,
                      );
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 transition-all font-semibold outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {currentAdvisor?.commissionModelId && (
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs font-semibold text-emerald-800 leading-relaxed">
                Este colaborador calculará sus comisiones automáticamente usando las reglas heredadas del modelo seleccionado. No se requiere configurar valores directos.
              </div>
            )}

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
                onClick={() => setIsAdvisorModalOpen(false)}
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

        {/* MODAL: CREATE/EDIT COMMISSION MODEL */}
        <Modal
          isOpen={isModelModalOpen}
          onClose={() => setIsModelModalOpen(false)}
          title={currentModel?.id ? "Editar Modelo de Comisión" : "Crear Nuevo Modelo de Comisión"}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSaveModel} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-gray-700 font-extrabold mb-1.5 text-sm">
                  Nombre del Modelo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Asesor Estándar 10%"
                  value={currentModel?.name || ""}
                  onChange={(e) =>
                    setCurrentModel((prev) =>
                      prev ? { ...prev, name: e.target.value } : null,
                    )
                  }
                  className="w-full px-4 py-3 bg-gray-55 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-gray-700 font-extrabold mb-1.5 text-sm">
                  Tipo de Comisión
                </label>
                <select
                  value={currentModel?.type || "PERCENT_DEDUCTED"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCurrentModel((prev) => {
                      if (!prev) return null;
                      return { ...prev, type: val };
                    });
                  }}
                  className="w-full px-4 py-3 bg-gray-55 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm text-gray-800"
                >
                  <option value="PERCENT_DEDUCTED">Porcentaje sobre Venta (Deducido de la venta - Asesores)</option>
                  <option value="PERCENT_ADDITIONAL">Porcentaje sobre Venta (Adicionado al precio del producto - Ficheras)</option>
                  <option value="PERCENT_MARGIN">Porcentaje sobre Utilidad / Ganancia (Precio Venta - Costo)</option>
                  <option value="FIXED_DEDUCTED">Monto Fijo por Unidad / Copa (Deducido de la venta)</option>
                  <option value="SPLIT_ADDITIONAL">Split de Precio / Fichera (Monto Fijo Adicionado al precio del producto)</option>
                </select>
                <p className="text-[10px] text-gray-500 font-bold mt-1.5 leading-tight">
                  {currentModel?.type === "PERCENT_DEDUCTED" && "Calcula la comisión como un porcentaje directo del precio total vendido y se descuenta del ingreso de la empresa."}
                  {currentModel?.type === "PERCENT_ADDITIONAL" && "Calcula la comisión como un porcentaje del precio del producto, pero se le suma al precio final cobrado al cliente."}
                  {currentModel?.type === "PERCENT_MARGIN" && "Calcula la comisión aplicando el porcentaje sobre la utilidad (precio de venta - costo)."}
                  {currentModel?.type === "FIXED_DEDUCTED" && "Asigna un monto fijo (en soles) por cada unidad de producto vendida y se descuenta de la venta."}
                  {currentModel?.type === "SPLIT_ADDITIONAL" && "Incrementa el precio del producto al cliente en el monto configurado, y esa diferencia completa se le paga al colaborador."}
                </p>
              </div>

              {/* Value */}
              <div>
                <label className="block text-gray-700 font-extrabold mb-1.5 text-sm">
                  {currentModel?.type?.includes("PERCENT")
                    ? "Porcentaje base (%)"
                    : "Monto base (S/)"
                  }
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 10"
                  value={currentModel?.value ?? 0}
                  onChange={(e) =>
                    setCurrentModel((prev) =>
                      prev ? { ...prev, value: parseFloat(e.target.value) || 0 } : null,
                    )
                  }
                  className="w-full px-4 py-3 bg-gray-55 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                  required
                />
              </div>
            </div>

            {/* Min and Max limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-extrabold mb-1.5 text-sm">
                  Comisión Mínima (S/ por unidad)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 0"
                  value={currentModel?.minCommission ?? 0}
                  onChange={(e) =>
                    setCurrentModel((prev) =>
                      prev ? { ...prev, minCommission: parseFloat(e.target.value) || 0 } : null,
                    )
                  }
                  className="w-full px-4 py-3 bg-gray-55 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-extrabold mb-1.5 text-sm">
                  Comisión Máxima Limite (S/ por unidad)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Sin límite"
                  value={currentModel?.maxCommission ?? ""}
                  onChange={(e) =>
                    setCurrentModel((prev) =>
                      prev ? { ...prev, maxCommission: e.target.value ? parseFloat(e.target.value) : null } : null,
                    )
                  }
                  className="w-full px-4 py-3 bg-gray-55 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none"
                />
              </div>
            </div>

            {/* Manual Edit, Discounts & Additional toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs font-bold text-gray-700 uppercase">Edición Manual POS</span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentModel((prev) =>
                      prev ? { ...prev, allowManualEdit: !prev.allowManualEdit } : null,
                    )
                  }
                  className={`w-10 h-6 rounded-full p-1 transition-all ${currentModel?.allowManualEdit ? "bg-indigo-600" : "bg-gray-300"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all ${currentModel?.allowManualEdit ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs font-bold text-gray-700 uppercase">Comisión en Descuento</span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentModel((prev) =>
                      prev ? { ...prev, allowDiscounts: !prev.allowDiscounts } : null,
                    )
                  }
                  className={`w-10 h-6 rounded-full p-1 transition-all ${currentModel?.allowDiscounts ? "bg-indigo-600" : "bg-gray-300"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all ${currentModel?.allowDiscounts ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-xs font-bold text-gray-700 uppercase block">Comisión Adicional</span>
                  <span className="text-[9px] text-gray-500 font-semibold block leading-none">Incrementa precio</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentModel((prev) =>
                      prev ? { ...prev, isAdditional: !prev.isAdditional } : null,
                    )
                  }
                  className={`w-10 h-6 rounded-full p-1 transition-all ${currentModel?.isAdditional ? "bg-indigo-600" : "bg-gray-300"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all ${currentModel?.isAdditional ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            {/* Advanced Scope Filters (Exclusions) */}
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div className="text-sm font-black text-gray-900">Alcance y Filtros del Modelo</div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Define a qué elementos se aplica esta comisión. Si no seleccionas ningún elemento en una sección, se aplicará a **todos** los elementos por defecto.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category filters */}
                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Categorías</span>
                  </label>
                  <div className="h-44 border border-gray-100 rounded-2xl p-3 overflow-y-auto space-y-2 bg-gray-50/50">
                    {categories.map((cat) => {
                      const isChecked = currentModel?.categoryIds?.includes(cat.id);
                      return (
                        <div
                          key={cat.id}
                          onClick={() => toggleArrayItem("categoryIds", cat.id)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer select-none transition-all"
                        >
                          <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${
                            isChecked ? "bg-indigo-500 border-indigo-500 text-white" : "border-gray-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-bold text-gray-700 truncate">{cat.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Brand filters */}
                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Marcas</span>
                  </label>
                  <div className="h-44 border border-gray-100 rounded-2xl p-3 overflow-y-auto space-y-2 bg-gray-50/50">
                    {brands.map((br) => {
                      const isChecked = currentModel?.brandIds?.includes(br.id);
                      return (
                        <div
                          key={br.id}
                          onClick={() => toggleArrayItem("brandIds", br.id)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer select-none transition-all"
                        >
                          <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${
                            isChecked ? "bg-indigo-500 border-indigo-500 text-white" : "border-gray-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-bold text-gray-700 truncate">{br.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Product filters */}
                <div>
                  <label className="block text-xs font-black text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Productos</span>
                  </label>
                  <div className="h-44 border border-gray-100 rounded-2xl p-3 overflow-y-auto space-y-2 bg-gray-50/50">
                    {products.map((p) => {
                      const isChecked = currentModel?.productIds?.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleArrayItem("productIds", p.id)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer select-none transition-all"
                        >
                          <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${
                            isChecked ? "bg-indigo-500 border-indigo-500 text-white" : "border-gray-300 bg-white"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-bold text-gray-700 truncate">{p.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModelModalOpen(false)}
                className="flex-1 py-4 bg-gray-55 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95"
              >
                {currentModel?.id ? "Guardar Cambios" : "Crear Modelo"}
              </button>
            </div>
          </form>
        </Modal>

        {/* CONFIRM DELETE COLLABORATOR */}
        <ConfirmModal
          isOpen={isAdvisorDeleteModalOpen}
          onClose={() => setIsAdvisorDeleteModalOpen(false)}
          onConfirm={handleConfirmDeleteAdvisor}
          title={`¿Eliminar ${advisorLabel}?`}
          message={`Esta acción es irreversible y revocaría el registro de este asesor del sistema. Las ventas asociadas no se eliminarán pero perderán el vínculo.`}
          confirmText="Eliminar Colaborador"
          variant="danger"
        />

        {/* CONFIRM DELETE COMMISSION MODEL */}
        <ConfirmModal
          isOpen={isModelDeleteModalOpen}
          onClose={() => setIsModelDeleteModalOpen(false)}
          onConfirm={handleConfirmDeleteModel}
          title="¿Eliminar Modelo de Comisión?"
          message="Esta acción desvinculará a todos los colaboradores asignados a este modelo. Dichos colaboradores volverán a usar comisiones directas."
          confirmText="Eliminar Modelo"
          variant="danger"
        />

      </div>
    </FinanceAppShell>
  );
}
