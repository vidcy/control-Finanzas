import { type ReactNode, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth, type WorkspaceType } from "../../auth/AuthContext";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Tags,
  ArrowRightLeft,
  Users,
  LogOut,
  CheckCircle2,
  Settings,
  Menu,
  X,
  Clock,
  Briefcase,
  Store,
  PackageSearch,
  PieChart,
  Vault,
  DollarSign,
  Target,
  History,
  Loader2,
  Camera,
  MapPin,
} from "lucide-react";

import { toast } from "react-hot-toast";
import { updateUserProfilesRequest, updateMyProfileRequest } from "../../services/user.api";
import { ProductImageUploader, uploadProductImageFile, getReceiptAbsoluteUrl } from "../ui/ImageUploader";

import NotificationDropdown from "./NotificationDropdown";
import { formatPeruTime } from "../../utils/date.utils";
import Modal from "../ui/Modal";
import { changePasswordRequest } from "../../services/auth.api";
import { FloatingSaveButton } from "../../pages/PiggPage";

export default function FinanceAppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, setUser, activeWorkspace, setActiveWorkspace, logout } = useAuth();
  const location = useLocation();

  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    setCurrentTime(formatPeruTime(new Date()));
    const timer = setInterval(() => {
      setCurrentTime(formatPeruTime(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAvatarSubModalOpen, setIsAvatarSubModalOpen] = useState(false);
  const [isLogoSubModalOpen, setIsLogoSubModalOpen] = useState(false);
  const [isBannerSubModalOpen, setIsBannerSubModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile module toggles
  const [activeProfiles, setActiveProfiles] = useState<string[]>(
    user?.profiles || [],
  );
  const [isSavingProfiles, setIsSavingProfiles] = useState(false);

  const [profileError, setProfileError] = useState<string | null>(null);

  // Profile forms state variables
  const [activeTab, setActiveTab] = useState<"personal" | "business" | "security">("personal");
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileLastName, setProfileLastName] = useState(user?.lastName || "");
  const [profileAvatar, setProfileAvatar] = useState<string | File>(user?.personalAvatar || "");
  const [businessName, setBusinessName] = useState(user?.businessName || "");
  const [businessRuc, setBusinessRuc] = useState(user?.businessRuc || "");
  const [businessReason, setBusinessReason] = useState(user?.businessReason || "");
  const [businessRubro, setBusinessRubro] = useState(user?.businessRubro || "");
  const [businessLogo, setBusinessLogo] = useState<string | File>(user?.businessLogo || "");
  const [businessBanner, setBusinessBanner] = useState<string | File>(user?.businessBanner || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Temporary states for sub-modal staging
  const [tempAvatar, setTempAvatar] = useState<string | File>("");
  const [tempLogo, setTempLogo] = useState<string | File>("");
  const [tempBanner, setTempBanner] = useState<string | File>("");

  const openAvatarSubModal = () => {
    setTempAvatar(profileAvatar);
    setIsAvatarSubModalOpen(true);
  };

  const openLogoSubModal = () => {
    setTempLogo(businessLogo);
    setIsLogoSubModalOpen(true);
  };

  const openBannerSubModal = () => {
    setTempBanner(businessBanner);
    setIsBannerSubModalOpen(true);
  };

  useEffect(() => {
    if (isProfileModalOpen && user) {
      setProfileName(user.name || "");
      setProfileLastName(user.lastName || "");
      setProfileAvatar(user.personalAvatar || "");
      setBusinessName(user.businessName || "");
      setBusinessRuc(user.businessRuc || "");
      setBusinessReason(user.businessReason || "");
      setBusinessRubro(user.businessRubro || "");
      setBusinessLogo(user.businessLogo || "");
      setBusinessBanner(user.businessBanner || "");
    }
  }, [isProfileModalOpen, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (businessRuc && businessRuc.trim() !== "" && businessRuc.length !== 11) {
      toast.error("El RUC debe tener exactamente 11 dígitos.");
      return;
    }
    setIsSavingProfile(true);
    try {
      let finalAvatarUrl = profileAvatar;
      if (profileAvatar instanceof File) {
        finalAvatarUrl = await uploadProductImageFile(profileAvatar);
      }

      let finalLogoUrl = businessLogo;
      if (businessLogo instanceof File) {
        finalLogoUrl = await uploadProductImageFile(businessLogo);
      }

      let finalBannerUrl = businessBanner;
      if (businessBanner instanceof File) {
        finalBannerUrl = await uploadProductImageFile(businessBanner);
      }

      const res = await updateMyProfileRequest({
        name: profileName,
        lastName: profileLastName,
        personalAvatar: finalAvatarUrl || null,
        businessName: businessName || null,
        businessRuc: businessRuc || null,
        businessReason: businessReason || null,
        businessRubro: businessRubro || null,
        businessLogo: finalLogoUrl || null,
        businessBanner: finalBannerUrl || null,
      });

      const updatedUser = { ...user, ...res };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Perfil actualizado con éxito");
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Error al guardar el perfil";
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleProfile = async (profile: string) => {
    setProfileError(null);
    let updatedProfiles = [...activeProfiles];

    const isWorkspaceProfile = profile === "PERSONAL" || profile === "BUSINESS";

    if (updatedProfiles.includes(profile)) {
      // Only enforce min-1 for top-level workspace profiles
      if (isWorkspaceProfile) {
        const workspaceProfiles = updatedProfiles.filter(p => p === "PERSONAL" || p === "BUSINESS");
        if (workspaceProfiles.length === 1) {
          toast.error("Debes tener al menos un módulo activado");
          return;
        }
        if (activeWorkspace === profile) {
          toast.error(`No puedes desactivar el módulo en el que te encuentras (${profile === "BUSINESS" ? "Negocio" : "Personal"}).`);
          return;
        }
      }
      updatedProfiles = updatedProfiles.filter(p => p !== profile);
    } else {
      updatedProfiles.push(profile);
    }

    setIsSavingProfiles(true);
    setActiveProfiles(updatedProfiles);

    try {
      await updateUserProfilesRequest(updatedProfiles);
      const updatedUser = { ...user, profiles: updatedProfiles };
      setUser(updatedUser as any);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Módulos actualizados correctamente");
    } catch (error: any) {
      const errorMsg = error.message && error.message !== "Error al actualizar módulos"
        ? error.message
        : error?.response?.data?.message || "El módulo fue desabilitado, comuníquese con soporte-think@ccoplex.com o al 912509111";
      setProfileError(errorMsg);
      toast.error("No se puede actualizar este módulo", { duration: 6000 });
      setActiveProfiles(activeProfiles); // revert
    } finally {
      setIsSavingProfiles(false);
    }
  };

  // Synchronize profiles state when user.profiles changes
  useEffect(() => {
    if (user?.profiles) {
      setActiveProfiles(user.profiles);
    }
  }, [user?.profiles]);

  // Cerrar menú móvil y sincronizar workspace al cambiar de ruta + control de accesos
  useEffect(() => {
    setIsMobileMenuOpen(false);

    if (user?.parentId) {
      if (activeWorkspace !== "BUSINESS") {
        setActiveWorkspace("BUSINESS");
      }
      return;
    }

    const path = location.pathname;
    const profiles = user?.profiles || [];
    let targetWorkspace: "PERSONAL" | "BUSINESS" | null = null;
    if (path.startsWith("/business-")) {
      targetWorkspace = "BUSINESS";
    } else if (["/dashboard", "/income", "/expenses", "/pending", "/users"].some(p => path === p || path.startsWith(p + "/"))) {
      targetWorkspace = "PERSONAL";
    }

    if (targetWorkspace) {
      if (user?.blockedProfiles?.includes(targetWorkspace)) {
        toast.error("El módulo fue deshabilitado, comuníquese con soporte-think@ccoplex.com o al 912509111", { duration: 5000 });
        if (profiles.length === 1) {
          const single = profiles[0] as WorkspaceType;
          setActiveWorkspace(single);
          navigate(single === "BUSINESS" ? "/business-dashboard" : "/dashboard");
        } else if (profiles.length > 1) {
          navigate("/workspace-selection");
        } else {
          logout();
        }
        return;
      }

      if (!profiles.includes(targetWorkspace)) {
        // Acceso denegado: Redirigir
        toast.error("No tienes acceso a este módulo");
        if (profiles.length === 1) {
          const single = profiles[0] as WorkspaceType;
          setActiveWorkspace(single);
          navigate(single === "BUSINESS" ? "/business-dashboard" : "/dashboard");
        } else if (profiles.length > 1) {
          navigate("/workspace-selection");
        } else {
          logout();
        }
        return;
      }

      if (activeWorkspace !== targetWorkspace) {
        setActiveWorkspace(targetWorkspace);
      }
    }
  }, [location.pathname, user?.profiles, user?.blockedProfiles, activeWorkspace, navigate, setActiveWorkspace, setUser, logout]);
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error("Las nuevas contraseñas no coinciden");
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
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(message);
    }
  };

  const menu = [
    {
      name: "Resumen",
      path: "/dashboard",
      icon: LayoutDashboard,
      color: "from-blue-400 to-blue-600",
      bgActive: "bg-blue-50 text-blue-700",
    },
    {
      name: "Ingresos",
      path: "/income",
      icon: TrendingUp,
      color: "from-emerald-400 to-emerald-600",
      bgActive: "bg-emerald-50 text-emerald-700",
    },
    {
      name: "Egresos",
      path: "/expenses",
      icon: TrendingDown,
      color: "from-rose-400 to-rose-600",
      bgActive: "bg-rose-50 text-rose-700",
    },
    {
      name: "Pendientes",
      path: "/pending",
      icon: ArrowRightLeft,
      color: "from-indigo-400 to-indigo-600",
      bgActive: "bg-indigo-50 text-indigo-700",
    },
    {
      name: "Categorías",
      path: "/categories",
      icon: Tags,
      color: "from-amber-400 to-amber-600",
      bgActive: "bg-amber-50 text-amber-700",
    },
    ...(user?.role === "ADMIN"
      ? [
        {
          name: "Usuarios",
          path: "/users",
          icon: Users,
          color: "from-purple-400 to-purple-600",
          bgActive: "bg-purple-50 text-purple-700",
        },
      ]
      : []),
  ];

  const businessMenu = [
    {
      name: "Resumen Negocio",
      path: "/business-dashboard",
      icon: Store,
      color: "from-purple-500 to-indigo-600",
      bgActive: "bg-purple-50 text-purple-700",
      profile: "BUSINESS_DASHBOARD",
    },
    {
      name: "Punto de Venta",
      path: "/business-pos",
      icon: Briefcase,
      color: "from-blue-500 to-indigo-600",
      bgActive: "bg-blue-50 text-blue-700",
      profile: "BUSINESS_POS",
    },
    {
      name: "Control de Caja",
      path: "/business-cash-register",
      icon: DollarSign,
      color: "from-blue-400 to-blue-600",
      bgActive: "bg-blue-50 text-blue-700",
      profile: "BUSINESS_CASH_REGISTER",
    },
    {
      name: "Almacén y Abastecimiento",
      path: "/business-inventory",
      icon: PackageSearch,
      color: "from-emerald-500 to-teal-600",
      bgActive: "bg-emerald-50 text-emerald-700",
      profile: "BUSINESS_INVENTORY",
    },
    {
      name: "Kardex Valorado",
      path: "/business-kardex",
      icon: ArrowRightLeft,
      color: "from-teal-500 to-emerald-600",
      bgActive: "bg-teal-50 text-teal-700",
      profile: "BUSINESS_INVENTORY",
    },
    {
      name: "Tesorería",
      path: "/business-finance",
      icon: Vault,
      color: "from-amber-400 to-amber-600",
      bgActive: "bg-amber-50 text-amber-700",
      profile: "BUSINESS_FINANCE",
    },
    {
      name: "Cuentas Pendientes",
      path: "/business-pending",
      icon: Clock,
      color: "from-cyan-400 to-cyan-600",
      bgActive: "bg-cyan-50 text-cyan-700",
      profile: "BUSINESS_PENDING",
    },
    {
      name: "Reportes",
      path: "/business-reports",
      icon: PieChart,
      color: "from-orange-400 to-rose-500",
      bgActive: "bg-orange-50 text-orange-700",
      profile: "BUSINESS_REPORTS",
    },
    {
      name: "Historial",
      path: "/business-history",
      icon: History,
      color: "from-violet-400 to-purple-600",
      bgActive: "bg-violet-50 text-violet-700",
      profile: "BUSINESS_HISTORY",
    },
    {
      name: "Categorías",
      path: "/categories",
      icon: Tags,
      color: "from-amber-400 to-amber-600",
      bgActive: "bg-amber-50 text-amber-700",
      profile: "BUSINESS_CATEGORIES",
    },
    // --- Conditional modules (owner can enable/disable) ---
    ...((!user?.parentId && user?.profiles?.includes("BUSINESS_BRANCHES")) ||
      (user?.parentId && user?.profiles?.includes("BUSINESS_BRANCHES"))
      ? [{
        name: "Sedes / Locales",
        path: "/business-branches",
        icon: MapPin,
        color: "from-rose-500 to-red-600",
        bgActive: "bg-rose-50 text-rose-700",
        profile: "BUSINESS_BRANCHES",
      }] : []),
    ...((!user?.parentId && user?.profiles?.includes("BUSINESS_WORKERS")) ||
      (user?.parentId && user?.profiles?.includes("BUSINESS_WORKERS"))
      ? [{
        name: "Personal / Roles",
        path: "/business-workers",
        icon: Users,
        color: "from-indigo-500 to-blue-600",
        bgActive: "bg-indigo-50 text-indigo-700",
        profile: "BUSINESS_WORKERS",
      }] : []),
  ];

  const activeMenu = activeWorkspace === "BUSINESS"
    ? (user?.parentId
      // Workers: only show items their profiles allow
      ? businessMenu.filter(item => {
        const key = (item as any).profile;
        return key ? user?.profiles?.includes(key) : false;
      })
      // Owners: show all items already included in businessMenu (branches/workers already conditional)
      : businessMenu)
    : menu;

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
      <aside
        className={`
                fixed inset-y-0 left-0 w-72 bg-white/90 backdrop-blur-2xl border-r border-white/50 flex flex-col shadow-2xl lg:shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-[100] transition-transform duration-300 lg:relative lg:translate-x-0
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            `}
      >
        {/* BRAND */}
        <div className="h-20 flex items-center justify-between px-8 border-b border-gray-100/50">
          <div className="flex items-center min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-white flex items-center justify-center">
              <img
                src={
                  activeWorkspace === "BUSINESS" && user?.businessLogo
                    ? getReceiptAbsoluteUrl(user.businessLogo) || ""
                    : "/logo.png"
                }
                alt="Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/logo.png";
                }}
              />
            </div>
            <div className="ml-3 min-w-0">
              {activeWorkspace === "BUSINESS" && user?.businessName ? (
                <h1 className="text-sm font-black tracking-wider truncate business-name-animated">
                  {user.businessName.toUpperCase()}
                </h1>
              ) : (
                <h1 className="text-sm font-black tracking-wider truncate think-name-animated">
                  THINK
                </h1>
              )}
              <p className="text-[9px] uppercase tracking-widest text-indigo-500 font-bold truncate">
                {activeWorkspace === "BUSINESS" && user?.businessRubro
                  ? user.businessRubro
                  : "App Financiera"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-900"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* WORKSPACE SWITCHER (Only visible if user has both modules active) */}
        {user?.profiles?.includes("PERSONAL") && user?.profiles?.includes("BUSINESS") && (
          <div className="px-6 py-3 border-b border-gray-100/50 bg-gray-50/30">
            <div className="bg-gray-100/80 p-1 rounded-2xl flex gap-1 border border-gray-200/50 relative">
              <button
                type="button"
                onClick={() => {
                  setActiveWorkspace("PERSONAL");
                  navigate("/dashboard");
                }}
                className={`flex-grow flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all relative z-10 ${activeWorkspace === "PERSONAL"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Personal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveWorkspace("BUSINESS");
                  navigate("/business-dashboard");
                }}
                className={`flex-grow flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all relative z-10 ${activeWorkspace === "BUSINESS"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Negocio</span>
              </button>
            </div>
          </div>
        )}

        {/* NAV */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 mt-2 px-4">
            Menú Principal
          </p>
          {activeMenu.map((item) => {
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
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${item.color} rounded-r-full`}
                  ></div>
                )}
                <div
                  className={`
                                    p-2 rounded-xl transition-colors
                                    ${active ? "bg-white shadow-sm" : "bg-gray-50 group-hover:bg-white"}
                                `}
                >
                  <Icon
                    className={`w-5 h-5 ${active ? "" : "opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform"}`}
                  />
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] group-hover:scale-105 transition-transform overflow-hidden flex-shrink-0">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                {user?.personalAvatar ? (
                  <img
                    src={getReceiptAbsoluteUrl(user.personalAvatar) || ""}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-sm font-bold text-indigo-600">
                    {user?.name?.charAt(0) || "U"}
                    {user?.lastName?.charAt(0) || "S"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 text-sm overflow-hidden">
              <p className="font-semibold text-gray-900 truncate">
                {user?.name} {user?.lastName}
              </p>
              <p className="text-gray-500 text-xs truncate group-hover:text-indigo-600 transition-colors">
                {user?.email}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* COPYRIGHT INFO */}
        <div className="px-6 pb-4 text-center mt-auto">
          <p className="text-[10px] text-gray-400 font-medium tracking-wide">
            © {new Date().getFullYear()} Think - Global Ccoplex
          </p>
          <p className="text-[9px] text-gray-400/80">
            Todos los derechos reservados.
          </p>
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
                {activeMenu.find((m) => location.pathname.startsWith(m.path))?.name ||
                  "Panel de Control"}
              </h2>
              <p className="hidden sm:block text-xs lg:text-sm text-gray-500">
                Bienvenido de nuevo al sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md border border-white/80 rounded-2xl py-2 px-3 shadow-sm text-gray-700 select-none">
              <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span className="text-xs font-black tracking-tight font-mono whitespace-nowrap">
                {currentTime || "--:--:-- --"}
              </span>
            </div>
            <NotificationDropdown />
          </div>
        </header>

        {/* CONTENT */}
        <section className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-7xl mx-auto min-h-full flex flex-col">
            <div className="flex-1 animate-fade-in-up">{children}</div>
          </div>
        </section>
      </main>

      {/* PROFILE MODAL */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="Mi Perfil"
        maxWidth="max-w-2xl"
      >
        {/* TABS HEADER */}
        <div className="flex border-b border-gray-100 mb-6 gap-2">
          <button
            onClick={() => setActiveTab("personal")}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === "personal"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
          >
            Personal
          </button>
          {activeProfiles.includes("BUSINESS") && (
            <button
              onClick={() => setActiveTab("business")}
              className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === "business"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
            >
              Negocio
            </button>
          )}
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === "security"
              ? "border-gray-800 text-gray-800"
              : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
          >
            Módulos y Seguridad
          </button>
        </div>

        {/* TAB 1: PERSONAL */}
        {activeTab === "personal" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3 flex flex-col items-center p-6 bg-gray-50/30 rounded-2xl border border-gray-100/50 shadow-sm">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4 text-center">
                  Foto de Perfil
                </label>

                {/* Interactive Avatar Container with Hover camera icon */}
                <div
                  onClick={openAvatarSubModal}
                  className="w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-1 mb-4 shadow-xl shadow-indigo-500/10 relative overflow-hidden flex items-center justify-center group cursor-pointer active:scale-95 transition-transform"
                  title="Gestionar foto de perfil"
                >
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden relative">
                    {profileAvatar ? (
                      <img
                        src={
                          profileAvatar instanceof File
                            ? URL.createObjectURL(profileAvatar)
                            : getReceiptAbsoluteUrl(profileAvatar) || ""
                        }
                        alt="Avatar"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        {(profileName.charAt(0) || "U").toUpperCase()}
                        {(profileLastName.charAt(0) || "S").toUpperCase()}
                      </span>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Camera className="w-6 h-6 mb-1 text-white" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Editar</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openAvatarSubModal}
                  className="px-4 py-2 border border-gray-200 hover:border-indigo-500 text-gray-600 hover:text-indigo-600 bg-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Gestionar Foto
                </button>
              </div>

              <div className="md:w-2/3 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Nombres
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-700 bg-white"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-700 bg-white"
                    value={profileLastName}
                    onChange={(e) => setProfileLastName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-1">
                    Correo Electrónico (No editable)
                  </label>
                  <input
                    type="email"
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-100 rounded-xl text-sm font-bold text-gray-400 bg-gray-50 cursor-not-allowed outline-none"
                    value={user?.email || ""}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-5 py-2.5 text-gray-500 font-medium hover:bg-gray-100 rounded-xl text-sm"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm flex items-center gap-2"
              >
                {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar Cambios
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: BUSINESS */}
        {activeTab === "business" && activeProfiles.includes("BUSINESS") && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre Comercial del Negocio
                </label>
                <input
                  type="text"
                  placeholder="Ej. Mi Tiendita"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold text-gray-700 bg-white"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  RUC (11 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={11}
                  placeholder="Ej. 10203040506"
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold text-gray-700 bg-white ${
                    businessRuc && businessRuc.length !== 11 ? "border-rose-300 focus:ring-rose-500" : "border-gray-200"
                  }`}
                  value={businessRuc}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setBusinessRuc(val);
                  }}
                />
                {businessRuc && businessRuc.length !== 11 && (
                  <p className="text-[11px] text-rose-500 font-extrabold mt-1 animate-pulse">
                    ⚠️ El RUC debe tener exactamente 11 dígitos numéricos. (Tiene {businessRuc.length})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Razón Social
                </label>
                <input
                  type="text"
                  placeholder="Ej. Inversiones SAC"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold text-gray-700 bg-white"
                  value={businessReason}
                  onChange={(e) => setBusinessReason(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Rubro / Giro comercial
                </label>
                <input
                  type="text"
                  placeholder="Ej. Minimarket, Ferretería"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold text-gray-700 bg-white"
                  value={businessRubro}
                  onChange={(e) => setBusinessRubro(e.target.value)}
                />
              </div>

              <div className="border-t border-gray-100 pt-6 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LOGO GESTION */}
                <div className="flex flex-col items-center p-4 bg-gray-50/30 rounded-2xl border border-gray-100/50 shadow-sm">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                    Logo del Negocio
                  </label>
                  <div
                    onClick={openLogoSubModal}
                    className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-0.5 mb-3 shadow-md relative overflow-hidden flex items-center justify-center group cursor-pointer active:scale-95 transition-transform"
                    title="Gestionar Logo del Negocio"
                  >
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden relative">
                      {businessLogo ? (
                        <img
                          src={
                            businessLogo instanceof File
                              ? URL.createObjectURL(businessLogo)
                              : getReceiptAbsoluteUrl(businessLogo) || ""
                          }
                          alt="Logo"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                          {businessName.charAt(0).toUpperCase() || "N"}
                        </span>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Camera className="w-5 h-5 mb-0.5 text-white" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Editar</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openLogoSubModal}
                    className="px-3 py-1.5 border border-gray-200 hover:border-purple-500 text-gray-600 hover:text-purple-600 bg-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                  >
                    <Settings className="w-3 h-3" />
                    Gestionar Logo
                  </button>
                </div>

                {/* BANNER GESTION */}
                <div className="flex flex-col items-center p-4 bg-gray-50/30 rounded-2xl border border-gray-100/50 shadow-sm">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                    Banner del Negocio
                  </label>
                  <div
                    onClick={openBannerSubModal}
                    className="w-full h-20 rounded-xl bg-gray-100 border border-gray-200 shadow-sm mb-3 relative overflow-hidden flex items-center justify-center group cursor-pointer active:scale-[0.98] transition-transform"
                    title="Gestionar Banner del Negocio"
                  >
                    {businessBanner ? (
                      <img
                        src={
                          businessBanner instanceof File
                            ? URL.createObjectURL(businessBanner)
                            : getReceiptAbsoluteUrl(businessBanner) || ""
                        }
                        alt="Banner"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <span className="text-xs font-bold">Sin banner configurado</span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Camera className="w-6 h-6 mb-1 text-white" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Editar Banner</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openBannerSubModal}
                    className="px-3 py-1.5 border border-gray-200 hover:border-purple-500 text-gray-600 hover:text-purple-600 bg-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                  >
                    <Settings className="w-3 h-3" />
                    Gestionar Banner
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-5 py-2.5 text-gray-500 font-medium hover:bg-gray-100 rounded-xl text-sm"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all text-sm flex items-center gap-2"
              >
                {isSavingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar Configuración
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: ACCESS & SECURITY */}
        {activeTab === "security" && (
          <div className="space-y-8">
            {/* MODULE SWITCHERS */}
            {!user?.parentId && (
              <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-2">
                  Módulos Habilitados
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Activa o desactiva los módulos a los que tienes acceso.
                </p>

                {profileError && (
                  <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-start gap-2 text-xs">
                    <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Target className="w-4 h-4 text-blue-500" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-800">
                          Módulo Personal
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          Control de tus finanzas personales
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeProfiles.includes("PERSONAL")}
                      onChange={() => handleToggleProfile("PERSONAL")}
                      disabled={isSavingProfiles}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="w-4 h-4 text-purple-500" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-800">
                          Módulo Negocio PRO
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          Gestión comercial ERP y POS
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={activeProfiles.includes("BUSINESS")}
                      onChange={() => handleToggleProfile("BUSINESS")}
                      disabled={isSavingProfiles}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>

                  {/* Advanced Business Sub-Modules — only visible if BUSINESS is active */}
                  {activeProfiles.includes("BUSINESS") && !user?.parentId && (
                    <>
                      <div className="ml-3 pl-3 border-l-2 border-purple-100 flex flex-col gap-2">
                        <p className="text-[10px] text-purple-600 font-black uppercase tracking-wider mb-1">Módulos Avanzados</p>
                        <label className="flex items-center justify-between p-2.5 rounded-xl border border-purple-50 bg-purple-50/30 hover:bg-purple-50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-rose-500" />
                            <div>
                              <h4 className="text-xs font-bold text-gray-800">Sedes / Locales</h4>
                              <p className="text-[10px] text-gray-400">Multi-sede, traslado de stock</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={activeProfiles.includes("BUSINESS_BRANCHES")}
                            onChange={() => handleToggleProfile("BUSINESS_BRANCHES")}
                            disabled={isSavingProfiles}
                            className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500"
                          />
                        </label>
                        <label className="flex items-center justify-between p-2.5 rounded-xl border border-purple-50 bg-purple-50/30 hover:bg-purple-50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-500" />
                            <div>
                              <h4 className="text-xs font-bold text-gray-800">Personal / Roles</h4>
                              <p className="text-[10px] text-gray-400">Trabajadores con permisos por módulo</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={activeProfiles.includes("BUSINESS_WORKERS")}
                            onChange={() => handleToggleProfile("BUSINESS_WORKERS")}
                            disabled={isSavingProfiles}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* PASSWORD FORM */}
            <div>
              <div className="flex items-center gap-2 mb-4 border-t border-gray-100 pt-6">
                <Settings className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-gray-800">
                  Actualizar Contraseña
                </h3>
              </div>

              {passwordChanged && (
                <div className="mb-4 bg-emerald-50 text-emerald-700 p-3 rounded-xl flex items-start gap-2 border border-emerald-100 text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>¡Contraseña actualizada con éxito!</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-700 bg-white"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Mín. 8 caracteres"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-700 bg-white"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-700 bg-white"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-5 py-2.5 text-gray-500 font-medium hover:bg-gray-100 rounded-xl text-sm"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm flex items-center gap-2"
                  >
                    {isSavingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                    Cambiar Contraseña
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* PROFILE AVATAR SUB-MODAL */}
      <Modal
        isOpen={isAvatarSubModalOpen}
        onClose={() => setIsAvatarSubModalOpen(false)}
        title="Gestionar Foto de Perfil"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center p-4">
          <p className="text-xs text-gray-500 mb-6 text-center">
            Sube una nueva foto, captúrala con tu cámara o elimina tu foto de perfil actual.
          </p>

          <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-1 mb-6 shadow-xl relative overflow-hidden flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
              {tempAvatar ? (
                <img
                  src={
                    tempAvatar instanceof File
                      ? URL.createObjectURL(tempAvatar)
                      : getReceiptAbsoluteUrl(tempAvatar) || ""
                  }
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                  {(profileName.charAt(0) || "U").toUpperCase()}
                  {(profileLastName.charAt(0) || "S").toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="w-full border-t border-gray-100 pt-6">
            <ProductImageUploader
              currentImageUrl={tempAvatar}
              onUploadSuccess={(fileOrUrl) => {
                setTempAvatar(fileOrUrl);
              }}
              onClear={() => {
                setTempAvatar("");
              }}
              label="Sube una foto de perfil"
              buttonLabel="Tomar foto de perfil con cámara"
            />
          </div>

          <div className="flex justify-end gap-3 w-full mt-6 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={() => {
                setProfileAvatar(tempAvatar);
                setIsAvatarSubModalOpen(false);
                toast.success("Foto de perfil cargada. Recuerda guardar cambios.");
              }}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-sm active:scale-95 shadow-lg shadow-indigo-600/10 text-center"
            >
              Listo
            </button>
          </div>
        </div>
      </Modal>

      {/* BUSINESS LOGO SUB-MODAL */}
      <Modal
        isOpen={isLogoSubModalOpen}
        onClose={() => setIsLogoSubModalOpen(false)}
        title="Gestionar Logo del Negocio"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center p-4">
          <p className="text-xs text-gray-500 mb-6 text-center">
            Sube el logotipo de tu negocio. Se mostrará en los tickets del POS y en la barra lateral.
          </p>

          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-1 mb-6 shadow-xl relative overflow-hidden flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
              {tempLogo ? (
                <img
                  src={
                    tempLogo instanceof File
                      ? URL.createObjectURL(tempLogo)
                      : getReceiptAbsoluteUrl(tempLogo) || ""
                  }
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                  {businessName.charAt(0).toUpperCase() || "N"}
                </span>
              )}
            </div>
          </div>

          <div className="w-full border-t border-gray-100 pt-6">
            <ProductImageUploader
              currentImageUrl={tempLogo}
              onUploadSuccess={(fileOrUrl) => {
                setTempLogo(fileOrUrl);
              }}
              onClear={() => {
                setTempLogo("");
              }}
              label="Sube el logo de tu negocio"
              buttonLabel="Tomar foto del logo con cámara"
            />
          </div>

          <div className="flex justify-end gap-3 w-full mt-6 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={() => {
                setBusinessLogo(tempLogo);
                setIsLogoSubModalOpen(false);
                toast.success("Logo cargado. Recuerda guardar cambios.");
              }}
              className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all text-sm active:scale-95 shadow-lg shadow-purple-600/10 text-center"
            >
              Listo
            </button>
          </div>
        </div>
      </Modal>

      {/* BUSINESS BANNER SUB-MODAL */}
      <Modal
        isOpen={isBannerSubModalOpen}
        onClose={() => setIsBannerSubModalOpen(false)}
        title="Gestionar Banner del Negocio"
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col items-center p-4">
          <p className="text-xs text-gray-500 mb-6 text-center">
            Sube una imagen de banner para tu panel de control de negocio. Se recomienda un formato panorámico.
          </p>

          <div className="w-full h-32 rounded-xl bg-gray-100 border border-gray-200 shadow-md mb-6 relative overflow-hidden flex items-center justify-center">
            {tempBanner ? (
              <img
                src={
                  tempBanner instanceof File
                    ? URL.createObjectURL(tempBanner)
                    : getReceiptAbsoluteUrl(tempBanner) || ""
                }
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400 text-sm font-bold">Sin banner configurado</span>
            )}
          </div>

          <div className="w-full border-t border-gray-100 pt-6">
            <ProductImageUploader
              currentImageUrl={tempBanner}
              onUploadSuccess={(fileOrUrl) => {
                setTempBanner(fileOrUrl);
              }}
              onClear={() => {
                setTempBanner("");
              }}
              label="Sube el banner de tu negocio"
              buttonLabel="Tomar foto del banner con cámara"
            />
          </div>

          <div className="flex justify-end gap-3 w-full mt-6 pt-4 border-t border-gray-50">
            <button
              type="button"
              onClick={() => {
                setBusinessBanner(tempBanner);
                setIsBannerSubModalOpen(false);
                toast.success("Banner cargado. Recuerda guardar cambios.");
              }}
              className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all text-sm active:scale-95 shadow-lg shadow-purple-600/10 text-center"
            >
              Listo
            </button>
          </div>
        </div>
      </Modal>

      {activeWorkspace === "PERSONAL" && <FloatingSaveButton />}
    </div>
  );
}
