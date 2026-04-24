import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await login(email, password);
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] relative overflow-hidden">

            {/* 🌌 Luces de fondo */}
            <div className="absolute w-[600px] h-[600px] bg-purple-600/30 blur-[140px] rounded-full -top-40 -left-40" />
            <div className="absolute w-[500px] h-[500px] bg-blue-600/30 blur-[140px] rounded-full bottom-0 right-0" />

            {/* 🧊 Card */}
            <div className="relative w-[420px] p-10 rounded-3xl 
                      bg-white/5 backdrop-blur-2xl 
                      border border-white/10 
                      shadow-[0_0_60px_rgba(0,0,0,0.6)]">

                {/* Logo */}
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-bold text-white tracking-tight">
                        FinControl
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Administra tu dinero como un pro 💸
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">

                    {/* EMAIL FLOATING INPUT */}
                    <div className="relative">
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="peer w-full px-4 pt-6 pb-2 rounded-xl bg-white/5 text-white
                         border border-white/10 outline-none
                         focus:border-purple-400 focus:bg-white/10 transition"
                        />
                        <label className="absolute left-4 top-2 text-sm text-gray-400 
                              peer-focus:text-purple-400 transition">
                            Correo electrónico
                        </label>
                    </div>

                    {/* PASSWORD FLOATING INPUT */}
                    <div className="relative">
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="peer w-full px-4 pt-6 pb-2 rounded-xl bg-white/5 text-white
                         border border-white/10 outline-none
                         focus:border-blue-400 focus:bg-white/10 transition"
                        />
                        <label className="absolute left-4 top-2 text-sm text-gray-400 
                              peer-focus:text-blue-400 transition">
                            Contraseña
                        </label>
                    </div>

                    {/* BOTÓN PREMIUM */}
                    <button
                        disabled={loading}
                        className="group relative w-full py-3 rounded-xl font-semibold text-white
                       bg-gradient-to-r from-purple-500 to-blue-500
                       overflow-hidden transition duration-300
                       hover:scale-[1.02] active:scale-95">

                        {/* efecto shine */}
                        <span className="absolute inset-0 bg-white/20 
                             translate-x-[-100%] group-hover:translate-x-[100%]
                             transition duration-700" />

                        <span className="relative">
                            {loading ? "Ingresando..." : "Iniciar sesión"}
                        </span>
                    </button>
                </form>

                <p className="text-center text-gray-500 text-sm mt-8">
                    Sistema de finanzas personales
                </p>
            </div>
        </div>
    );
}