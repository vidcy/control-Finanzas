import { type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Props = {
    children: ReactNode;
};

export default function DashboardLayout({ children }: Props) {
    const navigate = useNavigate();
    const location = useLocation();

    const menu = [
        { name: "Dashboard", path: "/dashboard" },
        { name: "Usuarios", path: "/users" },
    ];

    return (
        <div className="min-h-screen bg-[#F5F7FB] flex text-gray-800">

            {/* 🌫 BACKGROUND DECOR (muy suave, estilo Google moderno) */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute w-[500px] h-[500px] bg-blue-100 rounded-full blur-[120px] top-[-150px] left-[-150px]" />
                <div className="absolute w-[400px] h-[400px] bg-indigo-100 rounded-full blur-[120px] bottom-[-120px] right-[-120px]" />
            </div>

            {/* 📌 SIDEBAR */}
            <aside className="w-64 z-10 bg-white/80 backdrop-blur-xl border-r border-gray-200 flex flex-col">

                {/* LOGO */}
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-semibold tracking-tight">
                        Admin System
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Control panel
                    </p>
                </div>

                {/* MENU */}
                <nav className="flex-1 p-3 space-y-1">
                    {menu.map((item) => {
                        const active = location.pathname === item.path;

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`
                  w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all
                  ${active
                                        ? "bg-blue-50 text-blue-600 font-medium shadow-sm"
                                        : "text-gray-600 hover:bg-gray-100"
                                    }
                `}
                            >
                                {item.name}
                            </button>
                        );
                    })}
                </nav>

                {/* FOOTER */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => {
                            localStorage.removeItem("token");
                            navigate("/");
                        }}
                        className="w-full text-sm bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl transition shadow-sm"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* 📌 MAIN AREA */}
            <main className="flex-1 z-10 flex flex-col">

                {/* TOP BAR */}
                <header className="h-14 bg-white/70 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-6">

                    <div className="text-sm text-gray-600 font-medium">
                        {menu.find(m => m.path === location.pathname)?.name || "Panel"}
                    </div>

                    <div className="flex items-center gap-2">

                        {/* indicador usuario */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 shadow-sm" />

                    </div>

                </header>

                {/* CONTENT AREA */}
                <section className="flex-1 p-6">

                    {/* WORKSPACE CARD */}
                    <div className="max-w-6xl mx-auto">

                        <div className="
              bg-white/70
              backdrop-blur-xl
              border border-gray-200
              shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)]
              rounded-3xl
              p-6
              transition-all
              hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.2)]
            ">
                            {children}
                        </div>

                    </div>

                </section>

            </main>
        </div>
    );
}