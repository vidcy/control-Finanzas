import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { activateRequest } from "../services/auth.api";

export default function LoginPage() {
    const { login } = useAuth(); // función login global
    const navigate = useNavigate(); // navegación entre páginas
    const [searchParams, setSearchParams] = useSearchParams();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isActivating, setIsActivating] = useState(false);

    useEffect(() => {
        const token = searchParams.get("activate_token");
        if (token) {
            const activateAccount = async () => {
                setIsActivating(true);
                toast.loading("Activando tu cuenta...", { id: "activation" });
                try {
                    await activateRequest(token);
                    toast.success("¡Cuenta activada con éxito! Ya puedes iniciar sesión.", { id: "activation" });
                } catch (err: any) {
                    toast.error(err.message || "Error al activar la cuenta.", { id: "activation" });
                    setError(err.message || "Error al activar la cuenta.");
                } finally {
                    setIsActivating(false);
                    // Remove the query parameter from URL
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete("activate_token");
                    setSearchParams(newParams);
                }
            };
            activateAccount();
        }
    }, [searchParams, setSearchParams]);

    // submit del formulario
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const res = await login(email, password);
        setIsLoading(false);

        if (res.success) {
            toast.success("¡Bienvenido de vuelta!");

            const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
            const role = storedUser.role;
            const profiles: string[] = Array.isArray(storedUser.profiles)
                ? storedUser.profiles
                : [];

            // ADMIN siempre va al panel de administración
            if (role === "ADMIN") {
                navigate("/users");
                return;
            }

            const profileToPathMap: Record<string, string> = {
                BUSINESS_DASHBOARD: "/business-dashboard",
                BUSINESS_POS: "/business-pos",
                BUSINESS_INVENTORY: "/business-inventory",
                BUSINESS_FINANCE: "/business-finance",
                BUSINESS_CASH_REGISTER: "/business-cash-register",
                BUSINESS_PENDING: "/business-pending",
                BUSINESS_REPORTS: "/business-reports",
                BUSINESS_HISTORY: "/business-history",
                BUSINESS_CATEGORIES: "/categories",
            };

            if (storedUser.parentId) {
                const firstProfile = profiles.find(p => profileToPathMap[p]);
                const targetPath = firstProfile ? profileToPathMap[firstProfile] : "/business-pos";
                navigate(targetPath);
                return;
            }

            if (profiles.length > 1) {
                navigate("/workspace-selection");
            } else if (profiles[0] === "BUSINESS") {
                navigate("/business-dashboard");
            } else {
                navigate("/dashboard");
            }
        } else {
            setError(res.error || "Credenciales incorrectas");
            toast.error(res.error || "Credenciales incorrectas");
        }
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] font-sans relative overflow-hidden">
            {/* BACKGROUND DECORATIVE ELEMENTS */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob"></div>
                <div className="absolute top-[20%] right-[-10%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-indigo-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-4000"></div>
            </div>

            <div className="w-full max-w-md p-5 sm:p-8 relative z-10 animate-fade-in-up">
                {/* BRAND */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl mb-4 transform hover:scale-105 transition-transform duration-300">
                        <img src="/logo.png" alt="THINK Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 tracking-wider">
                        THINK
                    </h1>
                    <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-black mt-1">
                        Plataforma Financiera
                    </p>
                    <p className="text-sm font-medium text-gray-500 mt-2 tracking-wide">
                        Bienvenido de nuevo, controla tus finanzas.
                    </p>
                </div>

                {/* LOGIN CARD */}
                <div className="bg-white/70 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-white/50 relative">
                    {isActivating && (
                        <div className="absolute inset-0 bg-white/80 rounded-3xl z-20 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                            <p className="text-sm font-bold text-gray-800">Activando tu cuenta...</p>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100 animate-shake">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Correo Electrónico
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-gray-400"
                                        placeholder="tu@correo.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Contraseña
                                    </label>
                                    <Link
                                        to="/forgot-password"
                                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-gray-400"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Iniciar Sesión</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-600 font-medium">
                            ¿No tienes cuenta?{' '}
                            <Link 
                                to="/register" 
                                className="text-indigo-600 hover:text-indigo-700 font-bold hover:underline transition-all"
                            >
                                Regístrate aquí
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-500 mt-8 font-medium">
                    &copy; {new Date().getFullYear()} Think - Global Ccoplex. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}