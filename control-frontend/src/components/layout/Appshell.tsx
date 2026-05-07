import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, TrendingUp, TrendingDown, Tags, ArrowRightLeft, Users, LogOut, Bell } from "lucide-react";

export default function FinanceAppShell({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();

    const menu = [
        { name: "Resumen", path: "/dashboard", icon: LayoutDashboard, color: "from-blue-400 to-blue-600", bgActive: "bg-blue-50 text-blue-700" },
        { name: "Ingresos", path: "/income", icon: TrendingUp, color: "from-emerald-400 to-emerald-600", bgActive: "bg-emerald-50 text-emerald-700" },
        { name: "Egresos", path: "/expenses", icon: TrendingDown, color: "from-rose-400 to-rose-600", bgActive: "bg-rose-50 text-rose-700" },
        { name: "Categorías", path: "/categories", icon: Tags, color: "from-amber-400 to-amber-600", bgActive: "bg-amber-50 text-amber-700" },
        { name: "Cuentas Pendientes", path: "/pending", icon: ArrowRightLeft, color: "from-indigo-400 to-indigo-600", bgActive: "bg-indigo-50 text-indigo-700" },
        { name: "Usuarios", path: "/users", icon: Users, color: "from-purple-400 to-purple-600", bgActive: "bg-purple-50 text-purple-700" },
    ];

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <div className="h-screen flex bg-[#f8fafc] text-gray-800 font-sans overflow-hidden">
            {/* BACKGROUND DECORATIVE ELEMENTS */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
                <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                <div className="absolute top-[-10%] right-[20%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            {/* SIDEBAR */}
            <aside className="w-72 bg-white/70 backdrop-blur-2xl border-r border-white/50 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
                {/* BRAND */}
                <div className="h-20 flex items-center px-8 border-b border-gray-100/50">
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
                <div className="p-4 border-t border-gray-100/50 m-4 bg-white/50 rounded-3xl shadow-sm border border-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px]">
                            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-indigo-600">AD</span>
                            </div>
                        </div>
                        <div className="flex-1 text-sm overflow-hidden">
                            <p className="font-semibold text-gray-900 truncate">Administrador</p>
                            <p className="text-gray-500 text-xs truncate">admin@finanzas.com</p>
                        </div>
                        <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN AREA */}
            <main className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
                {/* TOPBAR */}
                <header className="h-20 bg-white/40 backdrop-blur-xl border-b border-white/50 flex items-center justify-between px-8 z-20">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-bold text-gray-800">
                            {menu.find(m => location.pathname.startsWith(m.path))?.name || "Panel de Control"}
                        </h2>
                        <p className="text-sm text-gray-500">Bienvenido de nuevo al sistema</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2.5 bg-white/80 rounded-full hover:bg-white text-gray-500 hover:text-indigo-600 transition-all shadow-sm border border-gray-100">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                {/* CONTENT */}
                <section className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                    <div className="max-w-7xl mx-auto min-h-full flex flex-col">
                        <div className="flex-1 animate-fade-in-up">
                            {children}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}