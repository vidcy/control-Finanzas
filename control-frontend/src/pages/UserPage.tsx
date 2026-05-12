import { useEffect, useState } from "react";
import Appshell from "../components/layout/Appshell";
import Modal from "../components/ui/Modal";
import { Users, Plus, Search, Edit2, ShieldAlert, CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { activeUserRequest, inactiveUserRequest, listUsersRequest, registerRequest, updateUserRequest } from "../services/user.api";

type User = {
    id: string;
    name: string;
    lastName: string;
    email: string;
    password?: string;
    role: "ADMIN" | "USER";
    status: "TRUE" | "FALSE";
};


export default function UserPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetchUsers();
    }, []);


    // Modal States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form States
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({ name: "", lastName: "", email: "", role: "USER|ADMIN", isActive: "ACTIVE|INACTIVE", password: "" });

    const handleOpenCreate = () => {
        setFormData({ name: "", lastName: "", email: "", role: "USER", isActive: "ACTIVE", password: "" });
        setIsCreateOpen(true);
    };

    const handleOpenEdit = (user: User) => {
        setSelectedUser(user);
        setFormData({ ...user, isActive: "ACTIVE|INACTIVE", password: "" });
        setIsEditOpen(true);
    };

    const handleSaveCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                name: formData.name,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            }
            console.log("CREANDO USAURIO", payload);
            await registerRequest(payload.name,
                payload.lastName,
                payload.email,
                payload.password,
                payload.role,
                true
            );
            toast.success("Usuario creado exitosamente");
            await fetchUsers();
            setIsCreateOpen(false);
        } catch (err: any) {
            console.error("ERROR CREANDO USUARIO", err);
            toast.error(err.message || "Error al crear usuario");
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
                role: formData.role
            }
            if (formData.password && formData.password.trim() !== "") {
                payload.password = formData.password;
            }
            console.log("EDITANDO USUARIO", payload);
            await updateUserRequest(selectedUser.id, payload);
            toast.success("Usuario actualizado correctamente");
            await fetchUsers();
            setIsEditOpen(false);
        } catch (error: any) {
            console.error("ERROR EDITANDO USUARIO", error);
            toast.error(error.message || "Error al editar usuario");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = async (user: User) => {
        try {
            if (user.role === "ADMIN") {
                toast.error("No se puede desactivar un usuario administrador");
                return;
            }
            if (user.status == "TRUE") {
                await inactiveUserRequest(user.id);
                toast.success("Usuario desactivado");
            } else {
                await activeUserRequest(user.id);
                toast.success("Usuario activado");
            }

            await fetchUsers();
        } catch (error: any) {
            console.error("ERROR CAMBIANDO ESTADO", error);
            toast.error(error.message || "Error al cambiar estado");
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    const fetchUsers = async () => {
        try {
            const data = await listUsersRequest();
            //console.log("USUARIOS BACKEND:", data);
            const formattedUsers: User[] = data.map((u: any) => ({
                id: u.id,
                name: u.name,
                lastName: u.lastName,
                email: u.email,
                role: u.role === "ADMIN" ? "ADMIN" : "USER",
                status: u.isActive ? "TRUE" : "FALSE",
            }));
            setUsers(formattedUsers);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // console.log("USERS 👉", users)
    return (
        <Appshell>
            <div className="flex flex-col gap-6">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-7 h-7 text-purple-500" />
                            Gestión de Usuarios
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Administra los accesos y roles del sistema.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Buscar usuario..."
                                className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-purple-200 transition-all transform hover:scale-[1.02]"
                        >
                            <Plus className="w-5 h-5" /> Nuevo Usuario
                        </button>
                    </div>
                </div>

                {/* TABLE CARD */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                    <th className="p-4 pl-6">Usuario</th>
                                    <th className="p-4">Rol</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-purple-50/30 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold shadow-sm">
                                                    {user.name.charAt(0)}{user.lastName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{user.name} {user.lastName}</p>
                                                    <p className="text-xs text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleStatus(user)}
                                                className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${user.status === 'TRUE' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                                    }`}
                                            >
                                                {user.status === 'TRUE' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                {user.status}
                                            </button>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenEdit(user)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">
                                            No se encontraron usuarios.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL CREAR USUARIO */}
                <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Crear Nuevo Usuario">
                    <form onSubmit={handleSaveCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                                <input required type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                                <input required type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                            <input required type="email" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white"
                                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="USER">Usuario</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña temporal</label>
                                <input required type="password" placeholder="••••••••" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                            <button type="button" onClick={() => setIsCreateOpen(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-purple-600 text-white font-medium hover:bg-purple-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : null}
                                Guardar Usuario
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* MODAL EDITAR USUARIO */}
                <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modificar Usuario">
                    <form onSubmit={handleSaveEdit} className="space-y-4">
                        <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-xl flex items-start gap-2 mb-4 border border-blue-100">
                            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                            <p>Estás editando los datos de <b>{selectedUser?.name} {selectedUser?.lastName}</b>. La contraseña solo se actualizará si escribes una nueva.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
                                <input required type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                                <input required type="text" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white"
                                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="USER">Usuario</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (Opcional)</label>
                                <input type="password" placeholder="Dejar en blanco para no cambiar" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                            <button type="button" onClick={() => setIsEditOpen(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : null}
                                Actualizar Datos
                            </button>
                        </div>
                    </form>
                </Modal>

            </div>
        </Appshell>
    );
}