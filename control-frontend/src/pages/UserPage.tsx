import { useEffect, useState, useMemo } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import Pagination from "../components/ui/Pagination";
import {
  Users,
  Plus,
  Search,
  Edit2,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Loader2,
  CheckCircle2,
  User as UserIcon,
  Mail,
  ShieldCheck,
  Activity,
  Receipt,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  activeUserRequest,
  inactiveUserRequest,
  listUsersRequest,
  registerRequest,
  updateUserRequest,
} from "../services/user.api";

type User = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  password?: string;
  role: "ADMIN" | "USER";
  status: "TRUE" | "FALSE";
  profiles: string[];
  blockedProfiles: string[];
  parentId?: string | null;
  hasElectronicBilling?: boolean;
};

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    fetchUsers();
  }, []);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form States
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    email: "",
    role: "USER",
    password: "",
    profiles: [] as string[],
  });

  const [isWorker, setIsWorker] = useState(false);
  const [parentId, setParentId] = useState("");
  const [hasElectronicBilling, setHasElectronicBilling] = useState(false);

  const SUB_MODULES = [
    { key: "BUSINESS_DASHBOARD", name: "Dashboard de Negocio" },
    { key: "BUSINESS_POS", name: "Punto de Venta (POS)" },
    { key: "BUSINESS_INVENTORY", name: "Almacén y Abastecimiento" },
    { key: "BUSINESS_FINANCE", name: "Caja / Tesorería" },
    { key: "BUSINESS_CASH_REGISTER", name: "Cierre de Caja" },
    { key: "BUSINESS_PENDING", name: "Cuentas Pendientes" },
    { key: "BUSINESS_REPORTS", name: "Reportes" },
    { key: "BUSINESS_HISTORY", name: "Historial de Ventas" },
    { key: "BUSINESS_CATEGORIES", name: "Categorías" },
    { key: "BUSINESS_WORKERS", name: "Personal / Roles / Comisiones" },
    { key: "BUSINESS_BRANCHES", name: "Sedes / Locales" },
  ];

  const handleOpenCreate = () => {
    setFormData({
      name: "",
      lastName: "",
      email: "",
      role: "USER",
      password: "",
      profiles: ["PERSONAL"], // default
    });
    setIsWorker(false);
    setParentId("");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      password: "",
      profiles: user.profiles || [],
    });
    setIsWorker(!!user.parentId);
    setParentId(user.parentId || "");
    setHasElectronicBilling(user.hasElectronicBilling || false);
    setIsEditOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isWorker && !parentId) {
      toast.error("Debe seleccionar un cliente/dueño vinculado.");
      return;
    }
    setIsSaving(true);
    try {
      await registerRequest(
        formData.name,
        formData.lastName,
        formData.email,
        formData.password,
        formData.role,
        true,
        formData.profiles,
        isWorker ? parentId : null
      );
      toast.success("Usuario creado exitosamente");
      await fetchUsers();
      setIsCreateOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al crear usuario";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (isWorker && !parentId) {
      toast.error("Debe seleccionar un cliente/dueño vinculado.");
      return;
    }
    setIsSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        lastName: formData.lastName,
        role: formData.role,
        profiles: formData.profiles,
        parentId: isWorker ? parentId : null,
        hasElectronicBilling,
      };
      if (formData.password && formData.password.trim() !== "") {
        payload.password = formData.password;
      }
      await updateUserRequest(selectedUser.id, payload);
      toast.success("Usuario actualizado correctamente");
      await fetchUsers();
      setIsEditOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al editar usuario";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (user: User) => {
    try {
      if (user.role === "ADMIN") {
        toast.error("No se puede desactivar un administrador");
        return;
      }
      if (user.status === "TRUE") {
        await inactiveUserRequest(user.id);
        toast.success("Usuario desactivado");
      } else {
        await activeUserRequest(user.id);
        toast.success("Usuario activado");
      }
      await fetchUsers();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al cambiar estado";
      toast.error(message);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await listUsersRequest();
      const formattedUsers: User[] = data.map((u: any) => ({
        id: u.id,
        name: u.name,
        lastName: u.lastName,
        email: u.email,
        role: u.role === "ADMIN" ? "ADMIN" : "USER",
        status: u.isActive ? "TRUE" : "FALSE",
        profiles: Array.isArray(u.profiles) ? u.profiles : [],
        blockedProfiles: Array.isArray(u.blockedProfiles) ? u.blockedProfiles : [],
        parentId: u.parentId || null,
        hasElectronicBilling: u.hasElectronicBilling || false,
      }));
      setUsers(formattedUsers);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al cargar usuarios";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(search) ||
      user.lastName.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)
    );
  });

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <Appshell>
      <div className="flex flex-col gap-8 animate-fade-in-up pb-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-400"></div>
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl shadow-xl shadow-purple-100">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
                Gestión de Usuarios
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                Administración de accesos y roles
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors group-focus-within:text-purple-500" />
              <input
                type="text"
                placeholder="Buscar usuario..."
                className="pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md border border-white rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all shadow-sm w-full md:w-72 text-gray-700 font-bold placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-purple-200 hover:-translate-y-1 transition-all active:scale-95 text-sm"
            >
              <Plus className="w-5 h-5" /> Nuevo Usuario
            </button>
          </div>
        </div>

        {/* TABLE CARD */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.05)] overflow-hidden">
          {/* VISTA ESCRITORIO: TABLA */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <th className="p-6 pl-8">Identidad del Usuario</th>
                  <th className="p-6">Rol de Acceso</th>
                  <th className="p-6">Módulo Personal</th>
                  <th className="p-6">Módulo Negocios</th>
                  <th className="p-6">Estado</th>
                  <th className="p-6 pr-8 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        Sincronizando base de datos...
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-purple-50/30 transition-all group"
                    >
                      <td className="p-6 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-purple-100">
                            {user.name.charAt(0)}
                            {user.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-800">
                              {user.name} {user.lastName}
                            </p>
                            <p className="text-[11px] text-gray-400 font-bold flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </p>
                            {user.parentId && (
                              <p className="text-[10px] text-purple-600 font-extrabold mt-0.5">
                                Trabajador de: {(() => {
                                  const parent = users.find(u => u.id === user.parentId);
                                  return parent ? `${parent.name} ${parent.lastName}` : "Cargando patrón...";
                                })()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${user.role === "ADMIN" ? "bg-indigo-100 text-indigo-700 border border-indigo-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {user.role}
                        </span>
                      </td>
                      <td className="p-6">
                        {user.parentId ? (
                          <span className="text-gray-400 text-xs italic">N/A (Trabajador)</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                              <input
                                type="checkbox"
                                checked={user.profiles.includes("PERSONAL")}
                                onChange={async (e) => {
                                  const newProfiles = e.target.checked
                                    ? [...user.profiles, "PERSONAL"]
                                    : user.profiles.filter((p) => p !== "PERSONAL");
                                  if (newProfiles.length === 0) {
                                    toast.error("El usuario debe tener al menos un módulo");
                                    return;
                                  }
                                  try {
                                    await updateUserRequest(user.id, { profiles: newProfiles });
                                    toast.success("Módulo actualizado");
                                    await fetchUsers();
                                  } catch (err: any) {
                                    toast.error(err.message || "Error al actualizar");
                                  }
                                }}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                              /> Habilitado
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="p-6">
                        {user.parentId ? (
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {user.profiles.map(p => {
                              const labelMap: Record<string, string> = {
                                BUSINESS_DASHBOARD: "Dash",
                                BUSINESS_POS: "POS",
                                BUSINESS_INVENTORY: "Inv",
                                BUSINESS_FINANCE: "Caja",
                                BUSINESS_CASH_REGISTER: "Cierre",
                                BUSINESS_PENDING: "Pend",
                                BUSINESS_REPORTS: "Rep",
                                BUSINESS_HISTORY: "Hist",
                                BUSINESS_CATEGORIES: "Cat",
                              };
                              return (
                                <span key={p} className="px-2 py-0.5 bg-purple-50 border border-purple-100 rounded-md text-[9px] font-black text-purple-600">
                                  {labelMap[p] || p}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                              <input
                                type="checkbox"
                                checked={user.profiles.includes("BUSINESS")}
                                onChange={async (e) => {
                                  const newProfiles = e.target.checked
                                    ? [...user.profiles, "BUSINESS"]
                                    : user.profiles.filter((p) => p !== "BUSINESS");
                                  if (newProfiles.length === 0) {
                                    toast.error("El usuario debe tener al menos un módulo");
                                    return;
                                  }
                                  try {
                                    await updateUserRequest(user.id, { profiles: newProfiles });
                                    toast.success("Módulo actualizado");
                                    await fetchUsers();
                                  } catch (err: any) {
                                    toast.error(err.message || "Error al actualizar");
                                  }
                                }}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                              /> Habilitado
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="p-6">
                        {/* Toggle Facturación Electrónica (solo para dueños de negocio) */}
                        {!user.parentId ? (
                          <button
                            onClick={async () => {
                              const newVal = !user.hasElectronicBilling;
                              try {
                                await updateUserRequest(user.id, { hasElectronicBilling: newVal });
                                toast.success(newVal ? "Facturación electrónica habilitada" : "Facturación electrónica deshabilitada");
                                await fetchUsers();
                              } catch (err: any) {
                                toast.error(err.message || "Error al actualizar");
                              }
                            }}
                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all shadow-sm ${
                              user.hasElectronicBilling
                                ? "bg-emerald-500 text-white shadow-emerald-100 hover:brightness-110"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={user.hasElectronicBilling ? "Deshabilitar facturación electrónica" : "Habilitar facturación electrónica"}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            {user.hasElectronicBilling ? "Activa" : "Sin FE"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-300 font-bold">Heredada</span>
                        )}
                      </td>
                      <td className="p-6">
                        <button
                          onClick={() => toggleStatus(user)}
                          className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-sm ${user.status === "TRUE" ? "bg-emerald-500 text-white shadow-emerald-100 hover:brightness-110" : "bg-rose-100 text-rose-600 hover:bg-rose-200"}`}
                        >
                          {user.status === "TRUE" ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {user.status === "TRUE" ? "Activo" : "Inactivo"}
                        </button>
                      </td>
                      <td className="p-6 pr-8 text-center">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-3 bg-white border border-gray-100 text-purple-600 hover:bg-purple-600 hover:text-white rounded-2xl transition-all shadow-sm"
                            title="Editar Usuario"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* VISTA MÓVIL: CARDS */}
          <div className="md:hidden divide-y divide-gray-100">
            {loading ? (
              <div className="p-20 text-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
              </div>
            ) : (
              paginatedUsers.map((user) => (
                <div key={user.id} className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-purple-100">
                        {user.name.charAt(0)}{user.lastName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-gray-800 text-base">{user.name} {user.lastName}</h3>
                        <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-3 bg-white border border-gray-100 text-purple-600 rounded-xl shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${user.role === "ADMIN" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {user.role}
                    </span>
                    <button
                      onClick={() => toggleStatus(user)}
                      className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${user.status === "TRUE" ? "bg-emerald-500 text-white" : "bg-rose-100 text-rose-600"}`}
                    >
                      {user.status === "TRUE" ? "Activo" : "Inactivo"}
                    </button>
                  </div>

                  {/* CHECKBOXES MÓVILES PARA MÓDULOS */}
                  {user.parentId ? (
                    <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-50/80">
                      <span className="text-[10px] font-bold text-gray-400">TRABAJADOR VINCULADO</span>
                      <span className="text-xs font-bold text-purple-600">
                        Patrón: {(() => {
                          const parent = users.find(u => u.id === user.parentId);
                          return parent ? `${parent.name} ${parent.lastName}` : "Cargando patrón...";
                        })()}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.profiles.map(p => {
                          const labelMap: Record<string, string> = {
                            BUSINESS_DASHBOARD: "Dashboard",
                            BUSINESS_POS: "POS",
                            BUSINESS_INVENTORY: "Almacén y Abastecimiento",
                            BUSINESS_FINANCE: "Caja",
                            BUSINESS_CASH_REGISTER: "Cierre",
                            BUSINESS_PENDING: "Pendientes",
                            BUSINESS_REPORTS: "Reportes",
                            BUSINESS_HISTORY: "Historial",
                            BUSINESS_CATEGORIES: "Categorías",
                          };
                          return (
                            <span key={p} className="px-2 py-0.5 bg-purple-50 border border-purple-100 rounded-md text-[9px] font-black text-purple-600">
                              {labelMap[p] || p}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 pt-3 border-t border-gray-50/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Personal</span>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-gray-500">
                            <input
                              type="checkbox"
                              checked={user.profiles.includes("PERSONAL")}
                              onChange={async (e) => {
                                const newProfiles = e.target.checked
                                  ? [...user.profiles, "PERSONAL"]
                                  : user.profiles.filter((p) => p !== "PERSONAL");
                                if (newProfiles.length === 0) {
                                  toast.error("Debe tener al menos un módulo");
                                  return;
                                }
                                try {
                                  await updateUserRequest(user.id, { profiles: newProfiles });
                                  toast.success("Actualizado");
                                  await fetchUsers();
                                } catch (err: any) {
                                  toast.error(err.message || "Error");
                                }
                              }}
                              className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            /> Habilitado
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">Negocios</span>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-gray-500">
                            <input
                              type="checkbox"
                              checked={user.profiles.includes("BUSINESS")}
                              onChange={async (e) => {
                                const newProfiles = e.target.checked
                                  ? [...user.profiles, "BUSINESS"]
                                  : user.profiles.filter((p) => p !== "BUSINESS");
                                if (newProfiles.length === 0) {
                                  toast.error("Debe tener al menos un módulo");
                                  return;
                                }
                                try {
                                  await updateUserRequest(user.id, { profiles: newProfiles });
                                  toast.success("Actualizado");
                                  await fetchUsers();
                                } catch (err: any) {
                                  toast.error(err.message || "Error");
                                }
                              }}
                              className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            /> Habilitado
                          </label>
                        </div>
                      </div>
                    </div>
                  )}              </div>
              ))
            )}
          </div>
          {!loading && filteredUsers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={(p) => setCurrentPage(p)}
              className="px-6 py-4 border-t border-gray-100 bg-white"
            />
          )}
          {/* EMPTY STATE */}
          {!loading && filteredUsers.length === 0 && (
            <div className="p-20 text-center">
              <Search className="w-12 h-12 text-gray-100 mx-auto mb-4" />
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
                No se encontraron usuarios
              </p>
            </div>
          )}
        </div>

        {/* MODAL CREAR USUARIO */}
        <Modal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Alta de Nuevo Usuario"
        >
          <form onSubmit={handleSaveCreate} className="space-y-8">
            <div className="bg-purple-50/50 p-8 rounded-[2.5rem] border border-purple-100/50 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <UserIcon className="w-3.5 h-3.5 text-purple-500" /> Nombres
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <UserIcon className="w-3.5 h-3.5 text-purple-500" />{" "}
                    Apellidos
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  <Mail className="w-3.5 h-3.5 text-purple-500" /> Correo
                  Electrónico
                </label>
                <input
                  required
                  type="email"
                  className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-500" /> Rol
                    Asignado
                  </label>
                  <select
                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-black text-gray-700 shadow-sm appearance-none"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                  >
                    <option value="USER">Usuario Regular</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                    <Activity className="w-3.5 h-3.5 text-purple-500" />{" "}
                    Contraseña Temporal
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* TIPO DE ACCESO (TRABAJADOR VS REGULAR) */}
              <div className="space-y-3 pt-4 border-t border-purple-100/50">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isWorker}
                    onChange={(e) => {
                      setIsWorker(e.target.checked);
                      if (e.target.checked) {
                        setFormData({ ...formData, profiles: [] });
                      } else {
                        setFormData({ ...formData, profiles: ["PERSONAL"] });
                      }
                    }}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  ¿Es un trabajador / vendedor de un cliente?
                </label>
              </div>

              {isWorker ? (
                <div className="space-y-6 pt-4 border-t border-purple-100/50">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                      Cliente / Dueño de Negocio Vinculado
                    </label>
                    <select
                      required
                      className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                    >
                      <option value="">-- Seleccionar Patrón --</option>
                      {users
                        .filter((u) => u.role === "USER" && !u.parentId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.lastName} ({p.email})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                      Submódulos de Negocio Habilitados
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
                      {SUB_MODULES.map((mod) => (
                        <label key={mod.key} className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.profiles.includes(mod.key)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...formData.profiles, mod.key]
                                : formData.profiles.filter(p => p !== mod.key);
                              setFormData({ ...formData, profiles: updated });
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          {mod.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* MÓDULOS DE ACCESO TRADICIONAL */
                <div className="space-y-6 pt-4 border-t border-purple-100/50">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                      Módulos de Acceso Habilitados
                    </label>
                    <div className="flex gap-8 pl-1">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.profiles.includes("PERSONAL")}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...formData.profiles, "PERSONAL"]
                              : formData.profiles.filter(p => p !== "PERSONAL");
                            setFormData({ ...formData, profiles: updated });
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        Personal
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.profiles.includes("BUSINESS")}
                          onChange={(e) => {
                            let updated = e.target.checked
                              ? [...formData.profiles, "BUSINESS"]
                              : formData.profiles.filter(p => p !== "BUSINESS");
                            
                            // If checked, also activate all business submodules by default except branches
                            if (e.target.checked) {
                              const subs = SUB_MODULES.map(m => m.key).filter(k => k !== "BUSINESS_BRANCHES");
                              updated = Array.from(new Set([...updated, ...subs]));
                            } else {
                              // If unchecked, remove all submodules
                              const subKeys = SUB_MODULES.map(m => m.key);
                              updated = updated.filter(p => !subKeys.includes(p));
                            }
                            setFormData({ ...formData, profiles: updated });
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        Negocios
                      </label>
                    </div>
                  </div>

                  {formData.profiles.includes("BUSINESS") && (
                    <div className="space-y-3 pt-4 border-t border-purple-100/50 animate-fadeIn">
                      <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest ml-1">
                        Submódulos de Negocio Habilitados
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
                        {SUB_MODULES.map((mod) => (
                          <label key={mod.key} className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={formData.profiles.includes(mod.key)}
                              onChange={(e) => {
                                const updated = e.target.checked
                                  ? [...formData.profiles, mod.key]
                                  : formData.profiles.filter(p => p !== mod.key);
                                setFormData({ ...formData, profiles: updated });
                              }}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            {mod.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-8 py-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-10 py-4 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {isSaving ? "Guardando..." : "Crear Usuario"}
              </button>
            </div>
          </form>
        </Modal>

        {/* MODAL EDITAR USUARIO */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Actualizar Datos de Usuario"
        >
          <form onSubmit={handleSaveEdit} className="space-y-8">
            <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50 flex items-start gap-4 mb-4">
              <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-indigo-900 tracking-tight">
                  Estás editando a: {selectedUser?.name}{" "}
                  {selectedUser?.lastName}
                </p>
                <p className="text-xs text-indigo-600/70 font-medium">
                  La contraseña solo se actualizará si ingresas una nueva en el
                  campo correspondiente.
                </p>
              </div>
            </div>

            <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Nombres
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Apellidos
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Rol Asignado
                  </label>
                  <select
                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-black text-gray-700 shadow-sm appearance-none"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                  >
                    <option value="USER">Usuario Regular</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Nueva Contraseña (Opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="Sin cambios"
                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* FACTURACIÓN ELECTRÓNICA */}
              {!isWorker && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500 rounded-xl shadow">
                        <Receipt className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-800">Facturación Electrónica (SUNAT)</p>
                        <p className="text-xs text-gray-500 font-medium">Permite emitir Boletas y Facturas desde el POS</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={hasElectronicBilling}
                        onChange={(e) => setHasElectronicBilling(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                  {hasElectronicBilling && (
                    <p className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                      El usuario configurará sus credenciales NubeFacT desde su panel de negocio.
                    </p>
                  )}
                </div>
              )}

              {/* TIPO DE ACCESO (TRABAJADOR VS REGULAR) */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isWorker}
                    onChange={(e) => {
                      setIsWorker(e.target.checked);
                      if (e.target.checked) {
                        setFormData({ ...formData, profiles: [] });
                      } else {
                        setFormData({ ...formData, profiles: ["PERSONAL"] });
                      }
                    }}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  ¿Es un trabajador / vendedor de un cliente?
                </label>
              </div>

              {isWorker ? (
                <div className="space-y-6 pt-4 border-t border-gray-100">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Cliente / Dueño de Negocio Vinculado
                    </label>
                    <select
                      required
                      className="w-full px-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all text-sm font-bold text-gray-700 shadow-sm"
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                    >
                      <option value="">-- Seleccionar Patrón --</option>
                      {users
                        .filter((u) => u.role === "USER" && u.id !== selectedUser?.id && !u.parentId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.lastName} ({p.email})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Submódulos de Negocio Habilitados
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
                      {SUB_MODULES.map((mod) => (
                        <label key={mod.key} className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={formData.profiles.includes(mod.key)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...formData.profiles, mod.key]
                                : formData.profiles.filter(p => p !== mod.key);
                              setFormData({ ...formData, profiles: updated });
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          {mod.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* MÓDULOS DE ACCESO TRADICIONAL */
                <div className="space-y-6 pt-4 border-t border-gray-100">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                      Módulos de Acceso Habilitados
                    </label>
                    <div className="flex gap-8 pl-1">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.profiles.includes("PERSONAL")}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...formData.profiles, "PERSONAL"]
                              : formData.profiles.filter(p => p !== "PERSONAL");
                            setFormData({ ...formData, profiles: updated });
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        Personal
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.profiles.includes("BUSINESS")}
                          onChange={(e) => {
                            let updated = e.target.checked
                              ? [...formData.profiles, "BUSINESS"]
                              : formData.profiles.filter(p => p !== "BUSINESS");
                            
                            // If checked, also activate all business submodules by default except branches
                            if (e.target.checked) {
                              const subs = SUB_MODULES.map(m => m.key).filter(k => k !== "BUSINESS_BRANCHES");
                              updated = Array.from(new Set([...updated, ...subs]));
                            } else {
                              // If unchecked, remove all submodules
                              const subKeys = SUB_MODULES.map(m => m.key);
                              updated = updated.filter(p => !subKeys.includes(p));
                            }
                            setFormData({ ...formData, profiles: updated });
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        Negocios
                      </label>
                    </div>
                  </div>

                  {formData.profiles.includes("BUSINESS") && (
                    <div className="space-y-3 pt-4 border-t border-gray-100 animate-fadeIn">
                      <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest ml-1">
                        Submódulos de Negocio Habilitados
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
                        {SUB_MODULES.map((mod) => (
                          <label key={mod.key} className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={formData.profiles.includes(mod.key)}
                              onChange={(e) => {
                                const updated = e.target.checked
                                  ? [...formData.profiles, mod.key]
                                  : formData.profiles.filter(p => p !== mod.key);
                                setFormData({ ...formData, profiles: updated });
                              }}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            {mod.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-8 py-4 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-gray-600 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-10 py-4 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
                {isSaving ? "Actualizando..." : "Confirmar Cambios"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Appshell>
  );
}
