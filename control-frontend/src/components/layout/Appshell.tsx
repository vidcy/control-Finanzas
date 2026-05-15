import { type ReactNode, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { LayoutDashboard, TrendingUp, TrendingDown, Tags, ArrowRightLeft, Users, LogOut, Bell, Key, ShieldCheck, CheckCircle2, Settings, Menu, X } from "lucide-react";
import Modal from "../ui/Modal";
import { changePasswordRequest } from "../../services/auth.api";

export default function FinanceAppShell({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const location = useLocation();

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordChanged, setPasswordChanged] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Cerrar menú móvil al cambiar de ruta
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            alert("Las nuevas contraseñas no coinciden");
            return;
        }
        try {
            setIsSavingPassword(true);
            await changePasswordRequest(currentPassword, newPassword);
            setIsSavingPassword(false);
            setPasswordChanged(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setTimeout(() => setPasswordChanged(false), 3000);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            alert(message);
        };
    }

    const menu = [
        { name: "Resumen", path: "/dashboard", icon: LayoutDashboard, color: "from-blue-400 to-blue-600", bgActive: "bg-blue-50 text-blue-700" },
        { name: "Ingresos", path: "/income", icon: TrendingUp, color: "from-emerald-400 to-emerald-600", bgActive: "bg-emerald-50 text-emerald-700" },
        { name: "Egresos", path: "/expenses", icon: TrendingDown, color: "from-rose-400 to-rose-600", bgActive: "bg-rose-50 text-rose-700" },
        { name: "Pendientes", path: "/pending", icon: ArrowRightLeft, color: "from-indigo-400 to-indigo-600", bgActive: "bg-indigo-50 text-indigo-700" },
        { name: "Categorías", path: "/categories", icon: Tags, color: "from-amber-400 to-amber-600", bgActive: "bg-amber-50 text-amber-700" },
        ...(user?.role === "ADMIN" ? [{ name: "Usuarios", path: "/users", icon: Users, color: "from-purple-400 to-purple-600", bgActive: "bg-purple-50 text-purple-700" }] : []),
    ];

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <div className="h-screen flex bg-[#f8fafc] text-gray-800 font-sans overflow-hidden relative">
            {/* BACKGROUND DECORATIVE ELEMENTS */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
                <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                <div className="absolute top-[-10%] right-[20%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            {/* MOBILE OVERLAY */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[90] lg:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside className={`
                fixed inset-y-0 left-0 w-72 bg-white/90 backdrop-blur-2xl border-r border-white/50 flex flex-col shadow-2xl lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-[100] transition-transform duration-300 lg:relative lg:translate-x-0
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                {/* BRAND */}
                <div className="h-20 flex items-center justify-between px-8 border-b border-gray-100/50">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <TrendingUp className="text-white w-6 h-6" />
                        </div>
                        <div className="ml-3">
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                                FinanzasPro
                            </h1>
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Control Total</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden p-2 text-gray-400 hover:text-gray-900"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* NAV */}
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 mt-2 px-4">Menú Principal</p>
                    {menu.map((item) => {
                        const active = location.pathname.startsWith(item.path);
                        const Icon = item.icon;

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ease-out group relative overflow-hidden
                                    ${active
                                        ? `${item.bgActive} shadow-sm font-semibold`
                                        : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-900"
                                    }
                                `}
                            >
                                {active && (
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${item.color} rounded-r-full`}></div>
                                )}
                                <div className={`
                                    p-2 rounded-xl transition-colors
                                    ${active ? 'bg-white shadow-sm' : 'bg-gray-50 group-hover:bg-white'}
                                `}>
                                    <Icon className={`w-5 h-5 ${active ? '' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform'}`} />
                                </div>
                                <span className="text-sm tracking-wide">{item.name}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* PROFILE */}
                <div
                    onClick={() => setIsProfileModalOpen(true)}
                    className="p-4 border-t border-gray-100/50 m-4 bg-white/50 rounded-3xl shadow-sm border border-white cursor-pointer hover:bg-white/80 transition-all hover:shadow-md group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] group-hover:scale-105 transition-transform">
                            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-indigo-600">
                                    {user?.name?.charAt(0) || "U"}{user?.lastName?.charAt(0) || "S"}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 text-sm overflow-hidden">
                            <p className="font-semibold text-gray-900 truncate">{user?.name} {user?.lastName}</p>
                            <p className="text-gray-500 text-xs truncate group-hover:text-indigo-600 transition-colors">{user?.email}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="Cerrar Sesión"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN AREA */}
            <main className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
                {/* TOPBAR */}
                <header className="h-20 bg-white/40 backdrop-blur-xl border-b border-white/50 flex items-center justify-between px-6 lg:px-8 z-20">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2.5 bg-white border border-gray-100 rounded-xl text-gray-600 shadow-sm"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-lg lg:text-2xl font-bold text-gray-800 leading-tight">
                                {menu.find(m => location.pathname.startsWith(m.path))?.name || "Panel de Control"}
                            </h2>
                            <p className="hidden sm:block text-xs lg:text-sm text-gray-500">Bienvenido de nuevo al sistema</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 lg:gap-4">
                        <button className="relative p-2.5 bg-white/80 rounded-full hover:bg-white text-gray-500 hover:text-indigo-600 transition-all shadow-sm border border-gray-100">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                {/* CONTENT */}
                <section className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar relative">
                    <div className="max-w-7xl mx-auto min-h-full flex flex-col">
                        <div className="flex-1 animate-fade-in-up">
                            {children}
                        </div>
                    </div>
                </section>
            </main>

            {/* PROFILE MODAL */}
            <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Mi Perfil" maxWidth="max-w-2xl">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* INFO SIDE */}
                    <div className="md:w-1/3 flex flex-col items-center p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-1 mb-4 shadow-lg shadow-indigo-500/20">
                            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                                <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                                    {user?.name?.charAt(0) || "U"}{user?.lastName?.charAt(0) || "S"}
                                </span>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 text-center">{user?.name} {user?.lastName}</h3>
                        <p className="text-sm text-gray-500 text-center mb-4">{user?.email}</p>
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {user?.role === 'ADMIN' ? 'Administrador' : 'Usuario Estándar'}
                        </span>
                    </div>

                    {/* CHANGE PASSWORD SIDE */}
                    <div className="md:w-2/3 flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-lg font-bold text-gray-800">Cambiar Contraseña</h3>
                        </div>

                        {passwordChanged && (
                            <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-start gap-3 border border-emerald-100 animate-fade-in-up">
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-sm">¡Contraseña actualizada!</p>
                                    <p className="text-xs text-emerald-600/80">Tu contraseña se ha cambiado correctamente.</p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Contraseña Actual
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Key className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-400"
                                        placeholder="••••••••"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Nueva Contraseña
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <ShieldCheck className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-400"
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Confirmar Nueva
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <ShieldCheck className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            required
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-gray-400"
                                            placeholder="••••••••"
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsProfileModalOpen(false)}
                                    className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors text-sm"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-xl transition-all shadow-sm hover:shadow-indigo-500/30 text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSavingPassword ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : "Actualizar Contraseña"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Modal>
        </div>
    );
}