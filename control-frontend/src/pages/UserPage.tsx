import { useEffect, useState } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
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
};

export default function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleOpenCreate = () => {
    setFormData({
      name: "",
      lastName: "",
      email: "",
      role: "USER",
      password: "",
      profiles: ["PERSONAL"], // default
    });
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
    setIsEditOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await registerRequest(
        formData.name,
        formData.lastName,
        formData.email,
        formData.password,
        formData.role,
        true,
        formData.profiles
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
    setIsSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        lastName: formData.lastName,
        role: formData.role,
        profiles: formData.profiles,
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
      }));
      setUsers(formattedUsers);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al cargar usuarios";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
                  <th className="p-6">Estado</th>
                  <th className="p-6 pr-8 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center">
                      <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                        Sincronizando base de datos...
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
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
              filteredUsers.map((user) => (
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
                </div>
              ))
            )}
          </div>
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
