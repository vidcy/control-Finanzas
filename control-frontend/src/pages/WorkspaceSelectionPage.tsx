import { useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { useAuth, type WorkspaceType } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Briefcase, ChevronRight, LogOut, Sparkles } from "lucide-react";

export default function WorkspaceSelectionPage() {
  const { user, setActiveWorkspace, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const profiles = user?.profiles || [];
    if (profiles.length === 1) {
      const single = profiles[0];
      setActiveWorkspace(single);
      if (single === "PERSONAL") {
        navigate("/dashboard");
      } else {
        navigate("/business-dashboard");
      }
    } else if (profiles.length === 0) {
      logout();
      navigate("/login");
    }
  }, [user, navigate, setActiveWorkspace, logout]);

  const handleSelect = (workspace: WorkspaceType) => {
    setActiveWorkspace(workspace);
    if (workspace === "PERSONAL") {
      navigate("/dashboard");
    } else {
      navigate("/business-dashboard");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans relative overflow-hidden">
      {/* Background Animations */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-blue-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[400px] h-[400px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[600px] h-[600px] bg-indigo-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="z-10 w-full max-w-4xl px-6 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-6">
            <Sparkles className="w-6 h-6 text-indigo-500 mr-2" />
            <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 tracking-wide uppercase">
              Bienvenido, {user?.name?.split(" ")[0] || "Usuario"}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            ¿A dónde vamos hoy?
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-lg mx-auto">
            Selecciona el espacio de trabajo al que deseas ingresar. Puedes
            cambiarlo más tarde desde tu perfil.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl"
        >
          {/* PERSONAL CARD */}
          {(user?.profiles || []).includes("PERSONAL") && (
            <motion.button
              variants={itemVariants}
              onClick={() => handleSelect("PERSONAL")}
              className="group relative bg-white rounded-3xl p-8 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:border-blue-200 hover:shadow-[0_20px_40px_rgb(59,130,246,0.1)] transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <User className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Mi Dinero
                </h2>
                <p className="text-slate-500 font-medium mb-8 flex-grow">
                  Controla tus finanzas personales, ingresos, gastos y ahorros.
                </p>
                <div className="flex items-center text-blue-600 font-semibold mt-auto">
                  <span>Entrar al espacio personal</span>
                  <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.button>
          )}

          {/* BUSINESS CARD */}
          {(user?.profiles || []).includes("BUSINESS") && (
            <motion.button
              variants={itemVariants}
              onClick={() => handleSelect("BUSINESS")}
              className="group relative bg-white rounded-3xl p-8 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:border-purple-200 hover:shadow-[0_20px_40px_rgb(168,85,247,0.1)] transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Briefcase className="w-7 h-7 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Mi Negocio
                </h2>
                <p className="text-slate-500 font-medium mb-8 flex-grow">
                  Gestiona ventas, inventario, caja y flujo de tu negocio.
                </p>
                <div className="flex items-center text-purple-600 font-semibold mt-auto">
                  <span>Entrar al espacio de negocio</span>
                  <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <button
            onClick={handleLogout}
            className="flex items-center text-slate-400 hover:text-slate-600 font-medium transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </button>
        </motion.div>
      </div>
    </div>
  );
}
