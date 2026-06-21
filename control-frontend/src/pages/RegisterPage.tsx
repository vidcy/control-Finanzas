import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Briefcase,
  Mail,
  Lock,
  ArrowRight,
  UserPlus,
  TrendingUp,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import type { WorkspaceType } from "../auth/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedProfiles, setSelectedProfiles] = useState<WorkspaceType[]>([]);

  const toggleProfile = (profile: WorkspaceType) => {
    setSelectedProfiles((prev) =>
      prev.includes(profile)
        ? prev.filter((p) => p !== profile)
        : [...prev, profile],
    );
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!name || !email || !password) {
        toast.error("Por favor completa todos los campos");
        return;
      }
      if (password.length < 8) {
        toast.error("La contraseña debe tener al menos 8 caracteres");
        return;
      }
      if (!/[A-Z]/.test(password)) {
        toast.error("La contraseña debe incluir al menos una letra mayúscula");
        return;
      }
      if (!/[a-z]/.test(password)) {
        toast.error("La contraseña debe incluir al menos una letra minúscula");
        return;
      }
      if (!/[0-9]/.test(password)) {
        toast.error("La contraseña debe incluir al menos un número");
        return;
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        toast.error(
          "La contraseña debe incluir al menos un carácter especial (ej: !@#$%)",
        );
        return;
      }
      setStep(2);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProfiles.length === 0) {
      toast.error("Debes seleccionar al menos un perfil");
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({
        name,
        email,
        password,
        profiles: selectedProfiles,
      });

      if (res && res.activationRequired) {
        if (res.alreadyExists) {
          // Cuenta ya existe pero inactiva — reenviamos correo
          toast.success(
            "Ya tienes una cuenta. Hemos reenviado el correo de activación.",
            { duration: 6000 },
          );
        } else {
          toast.success(
            "¡Registro completado! Verifica tu correo para activar tu cuenta.",
          );
        }
        setStep(3);
      } else if (res.error) {
        toast.error(res.error);
      } else {
        toast.error("Error al registrar la cuenta");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al registrar la cuenta");
    } finally {
      setIsLoading(false);
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

      <div className="w-full max-w-2xl p-5 sm:p-8 relative z-10">
        {/* BRAND */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl mb-4 transform hover:scale-105 transition-transform duration-300">
            <img
              src="/logo.png"
              alt="THINK Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 tracking-wider">
            Únete a THINK
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-2 tracking-wide text-center">
            El primer paso hacia tu libertad y control financiero.
          </p>
        </div>

        {/* PROGRESS BAR */}
        <div className="flex items-center justify-center mb-8 max-w-xs mx-auto">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-500 ${step >= 1 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-gray-200 text-gray-500"}`}
          >
            1
          </div>
          <div
            className={`flex-1 h-1 transition-colors duration-500 ${step >= 2 ? "bg-indigo-600" : "bg-gray-200"}`}
          ></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-500 ${step >= 2 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-gray-200 text-gray-500"}`}
          >
            2
          </div>
        </div>

        {/* FORM CARD */}
        <div className="bg-white/70 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-white/50 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold text-gray-900">
                    Tus Datos Personales
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Crea tu cuenta de acceso seguro
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre Completo
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <UserPlus className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        required
                        className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-gray-400"
                        placeholder="Juan Pérez"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Contraseña
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      </div>
                      <input
                        type="password"
                        required
                        className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-gray-400"
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNextStep}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 mt-8"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center mb-6">
                  <button
                    onClick={() => setStep(1)}
                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="flex-1 text-center pr-9">
                    <h2 className="text-xl font-bold text-gray-900">
                      ¿Cómo usarás THINK?
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Selecciona uno o ambos perfiles (puedes cambiarlo después)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PERSONAL PROFILE */}
                  <div
                    onClick={() => toggleProfile("PERSONAL")}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${
                      selectedProfiles.includes("PERSONAL")
                        ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10"
                        : "border-gray-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    {selectedProfiles.includes("PERSONAL") && (
                      <div className="absolute top-4 right-4 text-blue-600">
                        <CheckCircle2 className="w-6 h-6 fill-blue-100" />
                      </div>
                    )}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                        selectedProfiles.includes("PERSONAL")
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <User className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">
                      Para mí
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Control de gastos personales, ingresos, ahorros y
                      presupuesto diario.
                    </p>
                  </div>

                  {/* BUSINESS PROFILE */}
                  <div
                    onClick={() => toggleProfile("BUSINESS")}
                    className={`cursor-pointer p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden ${
                      selectedProfiles.includes("BUSINESS")
                        ? "border-purple-500 bg-purple-50 shadow-md shadow-purple-500/10"
                        : "border-gray-200 bg-white hover:border-purple-200 hover:bg-slate-50"
                    }`}
                  >
                    {selectedProfiles.includes("BUSINESS") && (
                      <div className="absolute top-4 right-4 text-purple-600">
                        <CheckCircle2 className="w-6 h-6 fill-purple-100" />
                      </div>
                    )}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                        selectedProfiles.includes("BUSINESS")
                          ? "bg-purple-600 text-white"
                          : "bg-purple-100 text-purple-600"
                      }`}
                    >
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">
                      Para mi Negocio
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Control de ventas, compras de mercadería, inventario y
                      flujo de caja.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRegister}
                  disabled={isLoading || selectedProfiles.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-4 rounded-2xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Comenzar ahora</span>
                      <TrendingUp className="w-5 h-5" />
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-center py-6"
              >
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Mail className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">
                  ¡Verifica tu correo electrónico!
                </h2>
                <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                  Hemos enviado un enlace de activación de cuenta a{" "}
                  <strong className="text-indigo-600">{email}</strong>. Por
                  favor, revisa tu bandeja de entrada (y la carpeta de correo no
                  deseado/spam) y haz clic en el enlace para activar tu cuenta.
                </p>
                <div className="pt-6">
                  <Link
                    to="/login"
                    className="inline-block px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300"
                  >
                    Ir al Inicio de Sesión
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-gray-600 mt-8 font-medium">
          ¿Ya tienes una cuenta?{" "}
          <Link
            to="/login"
            className="text-indigo-600 font-bold hover:underline"
          >
            Inicia Sesión
          </Link>
        </p>
        <p className="text-center text-[11px] text-gray-400 mt-6 font-medium">
          &copy; {new Date().getFullYear()} Think - Global Ccoplex. Todos los
          derechos reservados.
        </p>
      </div>
    </div>
  );
}
