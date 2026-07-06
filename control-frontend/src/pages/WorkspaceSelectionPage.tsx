import { useEffect } from "react";
import { motion, type Variants } from "framer-motion";
import { useAuth, type WorkspaceType } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Briefcase, ChevronRight, LogOut, Sparkles, XCircle } from "lucide-react";

export default function WorkspaceSelectionPage() {
  const { user, setActiveWorkspace, logout } = useAuth();
  const navigate = useNavigate();

  const rawProfiles = user?.profiles || [];
  const blocked = user?.blockedProfiles || [];
  const profiles = rawProfiles.filter(p => !blocked.includes(p));

  const hasPersonal = profiles.includes("PERSONAL");
  const businessSubmodules = [
    "BUSINESS_DASHBOARD", "BUSINESS_POS", "BUSINESS_CASH_REGISTER", "BUSINESS_INVENTORY",
    "BUSINESS_FINANCE", "BUSINESS_PENDING", "BUSINESS_REPORTS", "BUSINESS_HISTORY",
    "BUSINESS_CATEGORIES", "BUSINESS_WORKERS", "BUSINESS_BRANCHES"
  ];
  const hasBusiness = profiles.includes("BUSINESS") && businessSubmodules.some(sub => profiles.includes(sub));

  const activeWorkspaces: WorkspaceType[] = [];
  if (hasPersonal) activeWorkspaces.push("PERSONAL");
  if (hasBusiness) activeWorkspaces.push("BUSINESS");

  const hasNoModules = activeWorkspaces.length === 0;

  useEffect(() => {
    if (!user) return;

    if (activeWorkspaces.length === 1 && !hasNoModules) {
      const single = activeWorkspaces[0];
      setActiveWorkspace(single);
      if (single === "PERSONAL") {
        navigate("/dashboard");
      } else {
        const firstSub = businessSubmodules.find(sub => profiles.includes(sub));

        if (firstSub) {
          const subPaths: Record<string, string> = {
            BUSINESS_DASHBOARD: "/business-dashboard",
            BUSINESS_POS: "/business-pos",
            BUSINESS_CASH_REGISTER: "/business-cash-register",
            BUSINESS_INVENTORY: "/business-inventory",
            BUSINESS_FINANCE: "/business-finance",
            BUSINESS_PENDING: "/business-pending",
            BUSINESS_REPORTS: "/business-reports",
            BUSINESS_HISTORY: "/business-history",
            BUSINESS_CATEGORIES: "/categories",
            BUSINESS_WORKERS: "/business-workers",
            BUSINESS_BRANCHES: "/business-branches",
          };
          navigate(subPaths[firstSub]);
        } else {
          navigate("/business-dashboard");
        }
      }
    }
  }, [user, navigate, setActiveWorkspace, activeWorkspaces.length, hasNoModules]);

  const handleSelect = (workspace: WorkspaceType) => {
    setActiveWorkspace(workspace);
    if (workspace === "PERSONAL") {
      navigate("/dashboard");
    } else {
      const firstSub = businessSubmodules.find(sub => profiles.includes(sub));
      if (firstSub) {
        const subPaths: Record<string, string> = {
          BUSINESS_DASHBOARD: "/business-dashboard",
          BUSINESS_POS: "/business-pos",
          BUSINESS_CASH_REGISTER: "/business-cash-register",
          BUSINESS_INVENTORY: "/business-inventory",
          BUSINESS_FINANCE: "/business-finance",
          BUSINESS_PENDING: "/business-pending",
          BUSINESS_REPORTS: "/business-reports",
          BUSINESS_HISTORY: "/business-history",
          BUSINESS_CATEGORIES: "/categories",
          BUSINESS_WORKERS: "/business-workers",
          BUSINESS_BRANCHES: "/business-branches",
        };
        navigate(subPaths[firstSub]);
      } else {
        navigate("/business-dashboard");
      }
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
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (hasNoModules) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-40 -left-40 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="relative z-10 max-w-md w-full bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/50 text-center"
        >
          <div className="w-20 h-20 bg-rose-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-200 rotate-12">
            <XCircle className="w-10 h-10 text-rose-600 -rotate-12" />
          </div>
          
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-3">Módulos Desactivados</h2>
          <p className="text-gray-500 font-medium mb-8 text-sm leading-relaxed">
            Tu cuenta no cuenta con ningún módulo activo en este momento. Por favor, comunícate con <span className="text-indigo-600 font-bold border-b border-indigo-200 pb-0.5">soporte-think@ccoplex.com</span> o al <span className="text-indigo-600 font-bold border-b border-indigo-200 pb-0.5">912509111</span> para activar tu suscripción.
          </p>

          <button
            onClick={handleLogout}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-xl shadow-gray-900/20 group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Cerrar Sesión
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-indigo-300/40 to-purple-300/40 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-emerald-300/30 to-teal-300/30 blur-[100px] pointer-events-none"></div>

      <motion.div
        className="w-full max-w-xl relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="text-center mb-10 relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[1.5rem] bg-white shadow-xl shadow-indigo-500/10 mb-6 border border-slate-100 relative">
            <div className="absolute -inset-2 bg-indigo-500 rounded-[2rem] opacity-20 blur-xl animate-pulse"></div>
            <Sparkles className="w-8 h-8 text-indigo-600 relative z-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">
            ¿A dónde vamos hoy?
          </h1>
          <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">
            Selecciona el entorno en el que deseas trabajar
          </p>
        </motion.div>

        <div className="space-y-4">
          {hasPersonal && (
            <motion.button
              variants={itemVariants}
              onClick={() => handleSelect("PERSONAL")}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full group relative overflow-hidden rounded-[2rem] p-1 bg-white border border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-6 sm:p-8 flex items-center gap-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-shrink-0 items-center justify-center shadow-inner group-hover:rotate-6 transition-transform duration-300">
                  <User className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1">Entorno Personal</h3>
                  <p className="text-sm sm:text-base text-slate-500 font-medium truncate">Controla tus finanzas diarias</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </motion.button>
          )}

          {hasBusiness && (
            <motion.button
              variants={itemVariants}
              onClick={() => handleSelect("BUSINESS")}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full group relative overflow-hidden rounded-[2rem] p-1 bg-white border border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-6 sm:p-8 flex items-center gap-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex flex-shrink-0 items-center justify-center shadow-inner group-hover:-rotate-6 transition-transform duration-300">
                  <Briefcase className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1">Entorno Negocio</h3>
                  <p className="text-sm sm:text-base text-slate-500 font-medium truncate">Gestiona tus ventas y empresa</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-purple-50 group-hover:border-purple-100 transition-colors">
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </motion.button>
          )}
        </div>

        <motion.div
          variants={itemVariants}
          className="mt-12 flex flex-col items-center justify-center gap-4"
        >
          <div className="bg-white/60 backdrop-blur-md px-6 py-3 rounded-full border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 flex items-center justify-center overflow-hidden border border-slate-300">
              <User className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-sm font-bold text-slate-700">
              {user.name} {user.lastName}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-rose-500 transition-colors px-4 py-2 rounded-xl hover:bg-rose-50"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
