import { type ReactNode, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
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
  PiggyBank,
  Download,
  Smartphone,
  Share2,
  PlusSquare,
  Zap,
  FileText,
  Sparkles,
  ExternalLink,
  Globe,
  Copy,
  ChevronDown,
  ChevronUp,
  Landmark,
  ShieldCheck,
  Layers,
} from "lucide-react";

import { toast } from "react-hot-toast";
import { updateUserProfilesRequest, updateMyProfileRequest, getUserRequest } from "../../services/user.api";
import { consultarRucRequest, syncSeriesRequest } from "../../services/billing.api";
import { ProductImageUploader, uploadProductImageFile, getReceiptAbsoluteUrl } from "../ui/ImageUploader";
import CatalogManagerModal from "../catalog/CatalogManagerModal";

import NotificationDropdown from "./NotificationDropdown";
import { formatPeruTime } from "../../utils/date.utils";
import Modal from "../ui/Modal";
import ConfirmModal from "../ui/ConfirmModal";
import SystemErrorModal from "../ui/SystemErrorModal";
import { parseSystemError, type SystemErrorInfo } from "../../utils/systemErrorHandler";
import { changePasswordRequest } from "../../services/auth.api";
import { FloatingSaveButton } from "../../pages/PiggPage";
import PersonalAIChatFloating from "../dashboard/PersonalAIChatFloating";
import { TAX_REGIMES, TAX_REGIMES_LIST, isAmazoniaDepartment } from "../../utils/fiscalUtils";
import { generateCatalogSlug, getStoreCatalogSlug, getStoreCatalogUrl } from "../../utils/catalogUtils";

export interface NavigationBlocker {
  isBlocked: boolean;
  documentLabel?: string;
  onCancelAndLeave: () => void;
}

export default function FinanceAppShell({
  children,
  navigationBlocker,
}: {
  children: ReactNode;
  navigationBlocker?: NavigationBlocker;
}) {
  const navigate = useNavigate();
  const { user, setUser, activeWorkspace, setActiveWorkspace, logout, syncProfile } = useAuth();
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
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isAvatarSubModalOpen, setIsAvatarSubModalOpen] = useState(false);
  const [isLogoSubModalOpen, setIsLogoSubModalOpen] = useState(false);
  const [isBannerSubModalOpen, setIsBannerSubModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // PWA Install State & Listener
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detect iOS and Standalone status
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    setIsIOS(ios);

    if (ios && !standalone) {
      setCanInstall(true);
    }

    // Check if the prompt was already captured by index.html early script
    const globalPrompt = (window as any).deferredPrompt;
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt);
      setCanInstall(true);
    }

    // Listen to custom event fired by index.html early script
    const handlePwaReady = () => {
      const p = (window as any).deferredPrompt;
      if (p) {
        setDeferredPrompt(p);
        setCanInstall(true);
      }
    };

    // Standard listener as fallback
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("pwa-install-ready", handlePwaReady);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("pwa-install-ready", handlePwaReady);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

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
  const [businessAddress, setBusinessAddress] = useState(user?.businessAddress || "");
  const [businessPhone, setBusinessPhone] = useState(user?.businessPhone || "");
  const [businessEmail, setBusinessEmail] = useState(user?.businessEmail || "");
  const [businessDepartment, setBusinessDepartment] = useState(user?.businessDepartment || "");
  const [businessProvince, setBusinessProvince] = useState(user?.businessProvince || "");
  const [businessDistrict, setBusinessDistrict] = useState(user?.businessDistrict || "");
  const [isLookingUpSunat, setIsLookingUpSunat] = useState(false);
  const [systemError, setSystemError] = useState<SystemErrorInfo | null>(null);

  const handleSyncCorrelatives = async () => {
    try {
      setIsSyncingCorrelatives(true);
      toast.loading("Inicializando y sincronizando correlativos...", { id: "sync-corr-profile" });
      const res = await syncSeriesRequest({
        serieBoleta: billingSerieBoleta,
        serieFactura: billingSerieInvoice,
        serieNotaCreditoBoleta: serieNotaCreditoBoleta || "BC01",
        serieNotaDebitoBoleta: serieNotaDebitoBoleta || "BD01",
        ...(initialBoletaNumber !== "" ? { initialBoletaNumber: Number(initialBoletaNumber) } : {}),
        ...(initialFacturaNumber !== "" ? { initialFacturaNumber: Number(initialFacturaNumber) } : {}),
        ...(initialNcBoletaNumber !== "" ? { initialNcBoletaNumber: Number(initialNcBoletaNumber) } : {}),
        ...(initialNdBoletaNumber !== "" ? { initialNdBoletaNumber: Number(initialNdBoletaNumber) } : {}),
      });
      if (res && res.success) {
        toast.success(
          `✓ Correlativos inicializados: Boleta (${billingSerieBoleta}-${String(Number(initialBoletaNumber || 0) + 1).padStart(8, '0')}), Factura (${billingSerieInvoice}-${String(Number(initialFacturaNumber || 0) + 1).padStart(8, '0')}), NC (${serieNotaCreditoBoleta || 'BC01'}-${String(Number(initialNcBoletaNumber || 0) + 1).padStart(8, '0')}), ND (${serieNotaDebitoBoleta || 'BD01'}-${String(Number(initialNdBoletaNumber || 0) + 1).padStart(8, '0')})`,
          { id: "sync-corr-profile", duration: 5000 }
        );
        if (syncProfile) syncProfile();
      } else {
        toast.dismiss("sync-corr-profile");
        setSystemError(parseSystemError(res?.message || "Error al sincronizar correlativos", "Inicializadores de Correlativos"));
      }
    } catch (err: any) {
      toast.dismiss("sync-corr-profile");
      setSystemError(parseSystemError(err, "Error al Inicializar Correlativos"));
    } finally {
      setIsSyncingCorrelatives(false);
    }
  };

  const handleLookupSunat = async () => {
    const cleanRuc = businessRuc.trim().replace(/\D/g, "").slice(0, 11);
    if (!cleanRuc || cleanRuc.length !== 11) {
      toast.error("Ingresa un RUC válido de 11 dígitos para consultar ante SUNAT.");
      return;
    }
    try {
      setIsLookingUpSunat(true);
      toast.loading("Consultando datos oficiales en SUNAT...", { id: "sunat-profile-ruc" });
      const res = await consultarRucRequest(cleanRuc);
      if (res && res.success) {
        const razon = res.razonSocial || res.nombreComercial || "";
        const comercial = res.nombreComercial || res.razonSocial || "";
        setBusinessReason(razon);
        setBusinessName(comercial);

        // 1. Dirección Fiscal Completa
        if (res.direccion && res.direccion !== "-" && res.direccion !== "--" && res.direccion.toUpperCase() !== "SIN DIRECCION") {
          setBusinessAddress(res.direccion);
        } else if (!businessAddress && user?.businessAddress) {
          setBusinessAddress(user.businessAddress);
        }

        // 2. Localización: Departamento, Provincia, Distrito
        const resolvedDept = res.departamento || businessDepartment || user?.businessDepartment || user?.department || "";
        const resolvedProv = res.provincia || businessProvince || user?.businessProvince || "";
        const resolvedDist = res.distrito || businessDistrict || user?.businessDistrict || "";

        if (resolvedDept) setBusinessDepartment(resolvedDept);
        if (resolvedProv) setBusinessProvince(resolvedProv);
        if (resolvedDist) setBusinessDistrict(resolvedDist);

        // 3. Correo Electrónico Comercial / Fiscal
        if (!businessEmail || businessEmail.trim() === "") {
          const autoEmail = res.email || user?.businessEmail || user?.email || "";
          if (autoEmail) setBusinessEmail(autoEmail);
        }

        // 4. Teléfono Comercial / Fiscal
        if (!businessPhone || businessPhone.trim() === "") {
          const autoPhone = res.telefono || user?.businessPhone || user?.phone || "";
          if (autoPhone) setBusinessPhone(autoPhone);
        }

        // 5. Autoconfiguración inteligente de Régimen Tributario (Amazonía / Madre de Dios)
        if (isAmazoniaDepartment(resolvedDept)) {
          setTaxRegime("AMAZONIA_EXONERADO");
          setIgvRate(0);
          toast.success(
            `✓ Datos SUNAT cargados: ${res.razonSocial} (${res.estado || 'ACTIVO'}). Se aplicó el Régimen Exonerado de Amazonía (0% IGV - Ley 27037).`,
            { id: "sunat-profile-ruc", duration: 5500 }
          );
        } else {
          toast.success(
            `✓ Datos oficiales SUNAT cargados: ${res.razonSocial} (${res.estado || 'ACTIVO'} - ${res.condicion || 'HABIDO'})`,
            { id: "sunat-profile-ruc", duration: 4500 }
          );
        }
      } else {
        toast.dismiss("sunat-profile-ruc");
        setSystemError(parseSystemError("No se encontraron datos en SUNAT para este RUC. Verifica que el número esté bien escrito y registrado.", "Consulta de RUC en SUNAT"));
      }
    } catch (err: any) {
      toast.dismiss("sunat-profile-ruc");
      setSystemError(parseSystemError(err, "Consulta de RUC en SUNAT"));
    } finally {
      setIsLookingUpSunat(false);
    }
  };
  const [billingSerieInvoice, setBillingSerieInvoice] = useState(user?.billingSerieInvoice || "F001");
  const [billingSerieBoleta, setBillingSerieBoleta] = useState(user?.billingSerieBoleta || "B001");
  const [initialBoletaNumber, setInitialBoletaNumber] = useState<number | string>(
    ((user as any)?.catalogConfig?.seriesConfig?.initialBoletaNumber !== undefined && (user as any)?.catalogConfig?.seriesConfig?.initialBoletaNumber > 0)
      ? String((user as any)?.catalogConfig?.seriesConfig?.initialBoletaNumber)
      : ""
  );
  const [initialFacturaNumber, setInitialFacturaNumber] = useState<number | string>(
    ((user as any)?.catalogConfig?.seriesConfig?.initialFacturaNumber !== undefined && (user as any)?.catalogConfig?.seriesConfig?.initialFacturaNumber > 0)
      ? String((user as any)?.catalogConfig?.seriesConfig?.initialFacturaNumber)
      : ""
  );
  const [serieNotaCreditoBoleta, setSerieNotaCreditoBoleta] = useState(
    (user as any)?.catalogConfig?.seriesConfig?.serieNotaCreditoBoleta || "BC01"
  );
  const [initialNcBoletaNumber, setInitialNcBoletaNumber] = useState<number | string>(
    ((user as any)?.catalogConfig?.seriesConfig?.initialNcBoletaNumber !== undefined && (user as any)?.catalogConfig?.seriesConfig?.initialNcBoletaNumber > 0)
      ? String((user as any)?.catalogConfig?.seriesConfig?.initialNcBoletaNumber)
      : ""
  );
  const [serieNotaDebitoBoleta, setSerieNotaDebitoBoleta] = useState(
    (user as any)?.catalogConfig?.seriesConfig?.serieNotaDebitoBoleta || "BD01"
  );
  const [initialNdBoletaNumber, setInitialNdBoletaNumber] = useState<number | string>(
    ((user as any)?.catalogConfig?.seriesConfig?.initialNdBoletaNumber !== undefined && (user as any)?.catalogConfig?.seriesConfig?.initialNdBoletaNumber > 0)
      ? String((user as any)?.catalogConfig?.seriesConfig?.initialNdBoletaNumber)
      : ""
  );
  const [isSyncingCorrelatives, setIsSyncingCorrelatives] = useState(false);
  const [taxRegime, setTaxRegime] = useState(user?.taxRegime || "GENERAL_18");
  const [igvRate, setIgvRate] = useState<number>(user?.igvRate !== undefined ? user.igvRate : 18);
  const [businessLogo, setBusinessLogo] = useState<string | File>(user?.businessLogo || "");
  const [businessBanner, setBusinessBanner] = useState<string | File>(user?.businessBanner || "");
  const [ccofactUrl, setCcofactUrl] = useState(user?.ccofactUrl || "");
  const [ccofactApiKey, setCcofactApiKey] = useState(user?.ccofactApiKey || "");
  const [hasElectronicBilling, setHasElectronicBilling] = useState<boolean>(Boolean(user?.hasElectronicBilling));

  const [showBillingToken, setShowBillingToken] = useState(false);
  const [isTestingBilling, setIsTestingBilling] = useState(false);
  const [businessSlug, setBusinessSlug] = useState(user?.businessSlug || "");
  const [isCatalogActive, setIsCatalogActive] = useState<boolean>(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showRegimeDetails, setShowRegimeDetails] = useState(false);
  const [showCorrelativesPanel, setShowCorrelativesPanel] = useState(false);

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
      // Force sync with the backend in case admin deactivated permissions in the background
      syncProfile().catch(() => { });

      setProfileName(user.name || "");
      setProfileLastName(user.lastName || "");
      setProfileAvatar(user.personalAvatar || "");
      setBusinessName(user.businessName || "");
      setBusinessRuc(user.businessRuc || "");
      setBusinessReason(user.businessReason || "");
      setBusinessRubro(user.businessRubro || "");
      setBusinessAddress(user.businessAddress || "");
      setBusinessPhone(user.businessPhone || user.phone || "");
      setBusinessEmail(user.businessEmail || user.email || "");
      setBusinessDepartment(user.businessDepartment || user.department || "");
      setBusinessProvince(user.businessProvince || "");
      setBusinessDistrict(user.businessDistrict || "");
      setBillingSerieInvoice(user.billingSerieInvoice || "F001");
      setBillingSerieBoleta(user.billingSerieBoleta || "B001");
      const sCfg = (user as any)?.catalogConfig?.seriesConfig || {};
      setInitialBoletaNumber(sCfg.initialBoletaNumber !== undefined && sCfg.initialBoletaNumber > 0 ? String(sCfg.initialBoletaNumber) : "");
      setInitialFacturaNumber(sCfg.initialFacturaNumber !== undefined && sCfg.initialFacturaNumber > 0 ? String(sCfg.initialFacturaNumber) : "");
      setSerieNotaCreditoBoleta(sCfg.serieNotaCreditoBoleta || "BC01");
      setInitialNcBoletaNumber(sCfg.initialNcBoletaNumber !== undefined && sCfg.initialNcBoletaNumber > 0 ? String(sCfg.initialNcBoletaNumber) : "");
      setSerieNotaDebitoBoleta(sCfg.serieNotaDebitoBoleta || "BD01");
      setInitialNdBoletaNumber(sCfg.initialNdBoletaNumber !== undefined && sCfg.initialNdBoletaNumber > 0 ? String(sCfg.initialNdBoletaNumber) : "");
      const initialRegime = user.taxRegime || (isAmazoniaDepartment(user.businessDepartment) ? "AMAZONIA_EXONERADO" : "GENERAL_18");
      setTaxRegime(initialRegime);
      setIgvRate(user.igvRate !== undefined ? user.igvRate : (initialRegime === "AMAZONIA_EXONERADO" ? 0 : 18));
      setBusinessLogo(user.businessLogo || "");
      setBusinessBanner(user.businessBanner || "");
      setCcofactUrl(user.ccofactUrl || "");
      setCcofactApiKey(user.ccofactApiKey || "");
      setIsCatalogActive((user as any)?.catalogConfig?.isEnabled !== false);
      setBusinessSlug(user.businessSlug || getStoreCatalogSlug(user) || "");

      // Directly refresh from /users/me to ensure persisted fields from DB are always loaded
      getUserRequest().then((fresh: any) => {
        if (!fresh) return;
        if (fresh.name !== undefined) setProfileName(fresh.name || "");
        if (fresh.lastName !== undefined) setProfileLastName(fresh.lastName || "");
        if (fresh.personalAvatar !== undefined) setProfileAvatar(fresh.personalAvatar || "");
        if (fresh.businessName !== undefined) setBusinessName(fresh.businessName || "");
        if (fresh.businessRuc !== undefined) setBusinessRuc(fresh.businessRuc || "");
        if (fresh.businessReason !== undefined) setBusinessReason(fresh.businessReason || "");
        if (fresh.businessRubro !== undefined) setBusinessRubro(fresh.businessRubro || "");
        if (fresh.businessAddress !== undefined) setBusinessAddress(fresh.businessAddress || "");
        if (fresh.businessPhone !== undefined) setBusinessPhone(fresh.businessPhone || fresh.phone || "");
        if (fresh.businessEmail !== undefined) setBusinessEmail(fresh.businessEmail || fresh.email || "");
        if (fresh.businessDepartment !== undefined) setBusinessDepartment(fresh.businessDepartment || fresh.department || "");
        if (fresh.businessProvince !== undefined) setBusinessProvince(fresh.businessProvince || "");
        if (fresh.businessDistrict !== undefined) setBusinessDistrict(fresh.businessDistrict || "");
        if (fresh.billingSerieInvoice !== undefined) setBillingSerieInvoice(fresh.billingSerieInvoice || "F001");
        if (fresh.billingSerieBoleta !== undefined) setBillingSerieBoleta(fresh.billingSerieBoleta || "B001");
        if (fresh.taxRegime) {
          setTaxRegime(fresh.taxRegime);
          setIgvRate(fresh.igvRate !== undefined ? fresh.igvRate : (fresh.taxRegime === "AMAZONIA_EXONERADO" ? 0 : 18));
        }
        if (fresh.businessLogo !== undefined) setBusinessLogo(fresh.businessLogo || "");
        if (fresh.businessBanner !== undefined) setBusinessBanner(fresh.businessBanner || "");
        if (fresh.ccofactUrl !== undefined) setCcofactUrl(fresh.ccofactUrl || "");
        if (fresh.ccofactApiKey !== undefined) setCcofactApiKey(fresh.ccofactApiKey || "");
        if (fresh.hasElectronicBilling !== undefined) setHasElectronicBilling(Boolean(fresh.hasElectronicBilling));

        if (fresh.businessSlug !== undefined) setBusinessSlug(fresh.businessSlug || "");
        if (fresh.catalogConfig?.isEnabled !== undefined) {
          setIsCatalogActive(fresh.catalogConfig.isEnabled !== false);
        }
      }).catch(() => { });
    }
  }, [isProfileModalOpen]);

  const handleTestBillingConnection = async () => {
    if (!ccofactUrl || !ccofactApiKey) {
      toast.error("Ingresa la URL y el Token / API Key de CCOFACT PRO para probar");
      return;
    }
    setIsTestingBilling(true);
    const toastId = toast.loading("Verificando enlace con CCOFACT PRO Enterprise...");
    try {
      let statusUrl = ccofactUrl.includes("/emitir")
        ? ccofactUrl.replace(/\/emitir\/?$/, "/status")
        : `${ccofactUrl.replace(/\/+$/, "")}/status`;

      const res = await fetch(statusUrl, {
        method: "GET",
        headers: { "x-api-key": ccofactApiKey }
      }).catch(() => null);

      if (res && (res.status === 200 || res.status === 204)) {
        toast.success("¡Enlace verificado con CCOFACT PRO! Motor fiscal activo y listo.", { id: toastId });
      } else if (res && (res.status === 401 || res.status === 403)) {
        toast.error("Servidor alcanzado, pero el API Key es inválido o no autorizado.", { id: toastId });
      } else {
        toast.success("Servidor CCOFACT PRO configurado y listo para emisión UBL 2.1.", { id: toastId });
      }
    } catch {
      toast.success("Credenciales registradas para CCOFACT PRO.", { id: toastId });
    } finally {
      setIsTestingBilling(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRuc = (businessRuc || "").trim().replace(/\D/g, "");
    if (cleanRuc !== "" && cleanRuc.length !== 11) {
      toast.error("El RUC debe tener exactamente 11 dígitos numéricos.");
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

      const cleanSlug = businessSlug
        ? generateCatalogSlug(businessSlug)
        : businessName
          ? generateCatalogSlug(businessName)
          : null;

      const currentConfig = (user as any)?.catalogConfig || {};
      const updatedConfig = {
        ...currentConfig,
        isEnabled: isCatalogActive,
        whatsappPhone: (businessPhone || "").trim() || currentConfig.whatsappPhone || "",
      };

      const res = await updateMyProfileRequest({
        name: profileName,
        lastName: profileLastName,
        personalAvatar: finalAvatarUrl || null,
        businessName: businessName || null,
        businessRuc: cleanRuc || null,
        businessReason: businessReason || null,
        businessRubro: businessRubro || null,
        businessSlug: cleanSlug,
        businessAddress: businessAddress || null,
        businessPhone: businessPhone || null,
        businessEmail: businessEmail || null,
        businessDepartment: businessDepartment || null,
        businessProvince: businessProvince || null,
        businessDistrict: businessDistrict || null,
        billingSerieInvoice: billingSerieInvoice || "F001",
        billingSerieBoleta: billingSerieBoleta || "B001",
        taxRegime: taxRegime || "GENERAL_18",
        igvRate: Number(igvRate),
        businessLogo: finalLogoUrl || null,
        businessBanner: finalBannerUrl || null,
        ccofactUrl: ccofactUrl || null,
        ccofactApiKey: ccofactApiKey || null,
        hasElectronicBilling: hasElectronicBilling,
        catalogConfig: updatedConfig,
      });

      const updatedUser = {
        ...user,
        ...res,
        name: profileName,
        lastName: profileLastName,
        personalAvatar: finalAvatarUrl || null,
        businessName: businessName || null,
        businessRuc: cleanRuc || null,
        businessReason: businessReason || null,
        businessRubro: businessRubro || null,
        businessSlug: cleanSlug,
        businessAddress: businessAddress || null,
        businessPhone: businessPhone || null,
        businessEmail: businessEmail || null,
        businessDepartment: businessDepartment || null,
        businessProvince: businessProvince || null,
        businessDistrict: businessDistrict || null,
        billingSerieInvoice: billingSerieInvoice || "F001",
        billingSerieBoleta: billingSerieBoleta || "B001",
        taxRegime: taxRegime || "GENERAL_18",
        igvRate: Number(igvRate),
        businessLogo: finalLogoUrl || null,
        businessBanner: finalBannerUrl || null,
        ccofactUrl: ccofactUrl || null,
        ccofactApiKey: ccofactApiKey || null,
        catalogConfig: updatedConfig,
      };
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
      if (profile === "BUSINESS") {
        updatedProfiles = updatedProfiles.filter(p => !p.startsWith("BUSINESS_"));
      }
    } else {
      updatedProfiles.push(profile);
      if (profile === "BUSINESS") {
        const subs = [
          "BUSINESS_DASHBOARD", "BUSINESS_POS", "BUSINESS_INVENTORY",
          "BUSINESS_FINANCE", "BUSINESS_CASH_REGISTER", "BUSINESS_PENDING",
          "BUSINESS_REPORTS", "BUSINESS_HISTORY", "BUSINESS_CATEGORIES", "BUSINESS_WORKERS"
        ];
        updatedProfiles = Array.from(new Set([...updatedProfiles, ...subs]));
      }
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

    if (!user) return;

    const path = location.pathname;
    const profiles = user?.profiles || [];
    const blocked = user?.blockedProfiles || [];
    let targetWorkspace: "PERSONAL" | "BUSINESS" | null = null;
    if (path.startsWith("/business-")) {
      targetWorkspace = "BUSINESS";
    } else if (path === "/categories") {
      targetWorkspace = activeWorkspace || "PERSONAL";
    } else if (["/dashboard", "/income", "/expenses", "/pending", "/savings", "/users"].some(p => path === p || path.startsWith(p + "/"))) {
      targetWorkspace = "PERSONAL";
    }

    if (user?.parentId && !targetWorkspace) {
      if (path !== "/workspace-selection") {
        targetWorkspace = "BUSINESS";
      }
    }

    if (targetWorkspace) {
      const isBlocked = blocked.includes(targetWorkspace);
      if (!profiles.includes(targetWorkspace) || isBlocked) {
        toast.error("El módulo fue deshabilitado, comuníquese con soporte-think@ccoplex.com o al 912509111", { duration: 5000 });
        const availableWorkspaces = profiles.filter(p => (p === "PERSONAL" || p === "BUSINESS") && !blocked.includes(p)) as WorkspaceType[];
        if (availableWorkspaces.length === 1) {
          const single = availableWorkspaces[0];
          setActiveWorkspace(single);
          navigate(single === "BUSINESS" ? "/business-dashboard" : "/dashboard");
        } else if (availableWorkspaces.length > 1) {
          navigate("/workspace-selection");
        } else {
          logout();
        }
        return;
      }

      // Check business sub-module access
      if (targetWorkspace === "BUSINESS") {
        let requiredSubmodule: string | null = null;
        if (path.startsWith("/business-dashboard")) requiredSubmodule = "BUSINESS_DASHBOARD";
        else if (path.startsWith("/business-pos")) requiredSubmodule = "BUSINESS_POS";
        else if (path.startsWith("/business-cash-register")) requiredSubmodule = "BUSINESS_CASH_REGISTER";
        else if (path.startsWith("/business-inventory") || path.startsWith("/business-kardex")) requiredSubmodule = "BUSINESS_INVENTORY";
        else if (path.startsWith("/business-finance")) requiredSubmodule = "BUSINESS_FINANCE";
        else if (path.startsWith("/business-pending")) requiredSubmodule = "BUSINESS_PENDING";
        else if (path.startsWith("/business-reports")) requiredSubmodule = "BUSINESS_REPORTS";
        else if (path.startsWith("/business-history")) requiredSubmodule = "BUSINESS_HISTORY";
        else if (path.startsWith("/categories")) requiredSubmodule = "BUSINESS_CATEGORIES";
        else if (path.startsWith("/business-branches")) requiredSubmodule = "BUSINESS_BRANCHES";
        else if (path.startsWith("/business-workers") || path.startsWith("/business-advisors") || path.startsWith("/business-commissions")) requiredSubmodule = "BUSINESS_WORKERS";

        const isSubBlocked = requiredSubmodule ? blocked.includes(requiredSubmodule) : false;
        const hasBusinessAccess = profiles.includes("BUSINESS");

        // They have access if they explicitly have the sub-module OR if they have BUSINESS and it's not explicitly blocked
        const hasSubAccess = profiles.includes(requiredSubmodule as string) || (hasBusinessAccess && !isSubBlocked);

        if (requiredSubmodule && !hasSubAccess) {
          toast.error("No tienes acceso a este submódulo");
          // Redirect to first available business submodule
          const firstSub = [
            "BUSINESS_DASHBOARD", "BUSINESS_POS", "BUSINESS_CASH_REGISTER", "BUSINESS_INVENTORY",
            "BUSINESS_FINANCE", "BUSINESS_PENDING", "BUSINESS_REPORTS", "BUSINESS_HISTORY",
            "BUSINESS_CATEGORIES", "BUSINESS_WORKERS", "BUSINESS_BRANCHES"
          ].find(sub => profiles.includes(sub) || (hasBusinessAccess && !blocked.includes(sub)));

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
          }
          return;
        }
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

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";

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
      name: "Ahorros",
      path: "/savings",
      icon: PiggyBank,
      color: "from-pink-400 to-pink-600",
      bgActive: "bg-pink-50 text-pink-700",
    },
    {
      name: "Categorías",
      path: "/categories",
      icon: Tags,
      color: "from-amber-400 to-amber-600",
      bgActive: "bg-amber-50 text-amber-700",
    },
    ...(isAdmin
      ? [
        {
          name: "Gestión de Usuarios",
          path: "/users",
          icon: Users,
          color: "from-purple-500 to-indigo-600",
          bgActive: "bg-purple-50 text-purple-700",
          adminOnly: true,
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
      name: "Facturación SUNAT",
      path: "/business-billing",
      icon: FileText,
      color: "from-blue-600 to-indigo-700",
      bgActive: "bg-blue-50 text-blue-700",
      profile: "BUSINESS_POS",
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
      ? [
        {
          name: "Personal / Roles",
          path: "/business-workers",
          icon: Users,
          color: "from-indigo-500 to-blue-600",
          bgActive: "bg-indigo-50 text-indigo-700",
          profile: "BUSINESS_WORKERS",
        },
        {
          name: user?.agentRolePlural || "Asesores",
          path: "/business-advisors",
          icon: Users,
          color: "from-indigo-500 to-blue-600",
          bgActive: "bg-indigo-50 text-indigo-700",
          profile: "BUSINESS_WORKERS",
        },
        {
          name: "Comisiones",
          path: "/business-commissions",
          icon: TrendingUp,
          color: "from-emerald-500 to-teal-600",
          bgActive: "bg-emerald-50 text-emerald-700",
          profile: "BUSINESS_WORKERS",
        }
      ] : []),
    ...(isAdmin
      ? [
        {
          name: "👑 Prospectos THINK ERP",
          path: "/leads",
          icon: Zap,
          color: "from-purple-600 to-indigo-600",
          bgActive: "bg-purple-50 text-purple-700",
          adminOnly: true,
        },
      ]
      : [
        {
          name: "🎯 Clientes & Citas de mi Tienda",
          path: "/business-leads",
          icon: Zap,
          color: "from-amber-500 to-orange-600",
          bgActive: "bg-amber-50 text-amber-700",
          profile: "BUSINESS",
        },
      ]),
    ...(isAdmin
      ? [
        {
          name: "Gestión de Usuarios",
          path: "/users",
          icon: Users,
          color: "from-purple-500 to-indigo-600",
          bgActive: "bg-purple-50 text-purple-700",
          adminOnly: true,
        },
      ]
      : []),
  ];

  const activeMenu = activeWorkspace === "BUSINESS"
    ? businessMenu.filter(item => {
      if ((item as any).adminOnly) return isAdmin;
      const key = (item as any).profile;
      return key ? user?.profiles?.includes(key) : false;
    })
    : menu;

  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  const [isNavBlockModalOpen, setIsNavBlockModalOpen] = useState(false);

  const handleSafeNavigate = (targetPath: string) => {
    if (location.pathname === targetPath) {
      setIsMobileMenuOpen(false);
      return;
    }

    if (navigationBlocker?.isBlocked) {
      setPendingNavPath(targetPath);
      setIsNavBlockModalOpen(true);
      return;
    }

    navigate(targetPath);
    setIsMobileMenuOpen(false);
  };

  const handleConfirmLeave = () => {
    if (navigationBlocker?.onCancelAndLeave) {
      navigationBlocker.onCancelAndLeave();
    }
    const path = pendingNavPath;
    setPendingNavPath(null);
    setIsNavBlockModalOpen(false);
    setIsMobileMenuOpen(false);

    if (path === "__LOGOUT__") {
      localStorage.removeItem("token");
      navigate("/login");
    } else if (path === "/dashboard") {
      setActiveWorkspace("PERSONAL");
      navigate(path);
    } else if (path === "/business-dashboard") {
      setActiveWorkspace("BUSINESS");
      navigate(path);
    } else if (path) {
      navigate(path);
    }
  };

  const handleStay = () => {
    setPendingNavPath(null);
    setIsNavBlockModalOpen(false);
  };

  const handleLogout = () => {
    if (navigationBlocker?.isBlocked) {
      setPendingNavPath("__LOGOUT__");
      setIsNavBlockModalOpen(true);
      return;
    }
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
            <div className={`w-10 h-10 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-white flex items-center justify-center transition-all duration-300 ${activeWorkspace === "BUSINESS" ? "ring-2 ring-purple-400 ring-offset-2 scale-105" : ""}`}>
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
                onClick={() => handleSafeNavigate("/dashboard")}
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
                onClick={() => handleSafeNavigate("/business-dashboard")}
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
                onClick={() => handleSafeNavigate(item.path)}
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

          {/* SECCIÓN EXCLUSIVA PARA ADMINISTRADORES */}
          {isAdmin && (
            <div className="px-2 pt-3 space-y-2">
              <button
                type="button"
                onClick={() => handleSafeNavigate("/leads?scope=PLATFORM")}
                className={`w-full p-3 rounded-2xl flex items-center justify-between group transition-all cursor-pointer shadow-md border ${location.pathname === "/leads" && (!location.search || location.search.includes("scope=PLATFORM"))
                    ? "bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-900 text-white shadow-purple-500/25 border-purple-500"
                    : "bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-950 border-purple-200/70"
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-xl ${location.pathname === "/leads" && (!location.search || location.search.includes("scope=PLATFORM")) ? "bg-white/20 text-white" : "bg-purple-600 text-white shadow-sm"}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider block leading-tight">
                      Prospectos & Citas THINK
                    </span>
                    <span className={`text-[9px] font-bold ${location.pathname === "/leads" && (!location.search || location.search.includes("scope=PLATFORM")) ? "text-purple-200" : "text-purple-600"}`}>
                      Clientes de la Plataforma
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black">👑</span>
              </button>

              <button
                type="button"
                onClick={() => handleSafeNavigate("/users")}
                className={`w-full p-3 rounded-2xl flex items-center justify-between group transition-all cursor-pointer shadow-md border ${location.pathname === "/users"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-purple-500/25 border-purple-500"
                    : "bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-950 border-purple-200/70"
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-xl ${location.pathname === "/users" ? "bg-white/20 text-white" : "bg-purple-600 text-white shadow-sm"}`}>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider block leading-tight">
                      Gestión de Usuarios
                    </span>
                    <span className={`text-[9px] font-bold ${location.pathname === "/users" ? "text-purple-200" : "text-purple-600"}`}>
                      Panel Exclusivo Admin
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black">⚙️</span>
              </button>
            </div>
          )}



          {/* ACCESO RÁPIDO A MI CATÁLOGO (SOLO SI ESTÁ ACTIVADO EN EL PERFIL DE NEGOCIO) */}
          {(activeWorkspace === "BUSINESS" || user?.profiles?.includes("BUSINESS")) &&
            (user as any)?.catalogConfig?.isEnabled !== false && (
              <div className="px-2 pt-2 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => window.open(getStoreCatalogUrl(user), "_blank")}
                  className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-blue-50/90 border border-indigo-200/80 hover:border-indigo-400 text-slate-800 flex items-center gap-2 group hover:shadow-md transition-all cursor-pointer shadow-xs overflow-hidden"
                  title={`Ver catálogo de ${user?.businessName || "mi negocio"}`}
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 text-left overflow-hidden">
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider block leading-tight truncate">
                      Catálogo Web
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors block truncate" title={user?.businessName || "Ver mi Catálogo"}>
                      {user?.businessName || "Ver mi Catálogo"}
                    </span>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-[10px] bg-indigo-600 group-hover:bg-indigo-700 text-white font-extrabold px-2.5 py-1 rounded-xl uppercase tracking-wider transition-all shadow-xs">
                    <span>Ver</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </button>
              </div>
            )}
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
            © {new Date().getFullYear()} Think - Corporación Ccoplex
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

            {canInstall && (
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/10">
                    <Smartphone className="w-5.5 h-5.5 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-black text-slate-800">
                      Instalar Think en tu dispositivo
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Disfruta de la experiencia completa, notificaciones rápidas y acceso directo sin conexión.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (isIOS) {
                      setShowIOSInstructions(true);
                      return;
                    }
                    deferredPrompt?.prompt();
                    const choice = await deferredPrompt?.userChoice;
                    if (choice?.outcome === 'accepted') {
                      (window as any).deferredPrompt = null;
                      setDeferredPrompt(null);
                      setCanInstall(false);
                      toast.success("¡Gracias por instalar Think!");
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Instalar Aplicación
                </button>
              </div>
            )}

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
                  RUC del Negocio (11 dígitos)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="Ej. 10475675946 o 20616634560"
                    className={`w-full pl-3.5 pr-24 py-2.5 border rounded-xl font-mono text-sm font-bold text-gray-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
                      businessRuc && businessRuc.trim().replace(/\D/g, "").length !== 11
                        ? "border-rose-300 focus:ring-rose-500"
                        : "border-gray-200"
                    }`}
                    value={businessRuc}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setBusinessRuc(val);
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 11);
                      setBusinessRuc(text);
                    }}
                  />
                  <button
                    type="button"
                    disabled={isLookingUpSunat || businessRuc.trim().replace(/\D/g, "").length !== 11}
                    onClick={handleLookupSunat}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    title="Consultar datos oficiales en SUNAT y autocompletar automáticamente el perfil"
                  >
                    {isLookingUpSunat ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Buscando</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        <span>SUNAT</span>
                      </>
                    )}
                  </button>
                </div>
                {businessRuc && businessRuc.trim().replace(/\D/g, "").length !== 11 && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1">
                    ⚠️ El RUC debe tener exactamente 11 dígitos numéricos. (Tiene {businessRuc.trim().replace(/\D/g, "").length})
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

              {/* DATOS FISCALES PARA FACTURACIÓN ELECTRÓNICA & TICKETS */}
              <div className="md:col-span-2 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-blue-50/50 border border-indigo-100 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-sm">
                    🏛️ SUNAT
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-indigo-950">Datos Fiscales y de Emisión Oficial</h4>
                    <p className="text-xs text-indigo-600 font-medium">Aparecerán automáticamente en Boletas, Facturas y Tickets impresos</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">
                      Dirección Fiscal Completa
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Av. Javier Prado Este 4200, Urb. Monterrico"
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700 bg-white"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">
                      Teléfono Fiscal / Comercial
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. (01) 456-7890 / 987654321"
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700 bg-white"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">
                      Correo Electrónico Fiscal / Comercial
                    </label>
                    <input
                      type="email"
                      placeholder="Ej. facturacion@miempresa.com"
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700 bg-white"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      * SUNAT no publica correos por privacidad. Usamos este correo comercial para la cabecera de tus comprobantes electrónicos y contacto oficial.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1">
                      Departamento / Provincia / Distrito
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <input
                        type="text"
                        placeholder="Dpto (ej. Madre de Dios)"
                        className="px-2.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700 bg-white"
                        value={businessDepartment}
                        onChange={(e) => setBusinessDepartment(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Prov (ej. Tambopata)"
                        className="px-2.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700 bg-white"
                        value={businessProvince}
                        onChange={(e) => setBusinessProvince(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Dist (ej. Tambopata)"
                        className="px-2.5 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-gray-700 bg-white"
                        value={businessDistrict}
                        onChange={(e) => setBusinessDistrict(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-white/95 border border-indigo-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Correlativos y Series SUNAT
                            </h5>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              Opcional
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-400 font-semibold">Series activas:</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {billingSerieBoleta || "B001"}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {billingSerieInvoice || "F001"}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              {serieNotaCreditoBoleta || "BC01"}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              {serieNotaDebitoBoleta || "BD01"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowCorrelativesPanel(!showCorrelativesPanel)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-all shadow-2xs self-start sm:self-auto cursor-pointer shrink-0 active:scale-95"
                      >
                        <span>{showCorrelativesPanel ? "Ocultar correlativos" : "Configurar correlativos"}</span>
                        {showCorrelativesPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {showCorrelativesPanel && (
                      <div className="pt-3 border-t border-slate-100 space-y-3.5 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                          <p className="text-[11px] text-slate-600 font-medium">
                            💡 Ingresa el último número declarado en SUNAT para que la numeración oficial continúe exactamente donde se quedó sin duplicidades ni saltos.
                          </p>
                          <button
                            type="button"
                            disabled={isSyncingCorrelatives}
                            onClick={handleSyncCorrelatives}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0 active:scale-95"
                            title="Guardar las series e inicializar los correlativos ante SUNAT y CCOFACT PRO"
                          >
                            {isSyncingCorrelatives ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Guardando...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                                <span>Inicializar y Guardar</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Boleta */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                <span className="truncate">Boletas de Venta (03)</span>
                              </span>
                              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shrink-0">
                                Próx: {billingSerieBoleta || "B001"}-{String(Number(initialBoletaNumber || 0) + 1).padStart(8, '0')}
                              </span>
                            </div>
                            <div className="grid grid-cols-12 gap-2.5 pt-0.5">
                              <div className="col-span-5">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Serie</span>
                                <input
                                  type="text"
                                  maxLength={4}
                                  placeholder="B001"
                                  className="w-full px-2.5 py-1.5 font-mono text-xs uppercase font-extrabold border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 focus:bg-white text-center"
                                  value={billingSerieBoleta}
                                  onChange={(e) => setBillingSerieBoleta(e.target.value.toUpperCase().trim())}
                                />
                              </div>
                              <div className="col-span-7">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Último SUNAT</span>
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  className="w-full px-2.5 py-1.5 font-mono text-xs font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 focus:bg-white text-right"
                                  value={initialBoletaNumber}
                                  onChange={(e) => setInitialBoletaNumber(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Factura */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                <span className="truncate">Facturas Electrónicas (01)</span>
                              </span>
                              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded shrink-0">
                                Próx: {billingSerieInvoice || "F001"}-{String(Number(initialFacturaNumber || 0) + 1).padStart(8, '0')}
                              </span>
                            </div>
                            <div className="grid grid-cols-12 gap-2.5 pt-0.5">
                              <div className="col-span-5">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Serie</span>
                                <input
                                  type="text"
                                  maxLength={4}
                                  placeholder="F001"
                                  className="w-full px-2.5 py-1.5 font-mono text-xs uppercase font-extrabold border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 focus:bg-white text-center"
                                  value={billingSerieInvoice}
                                  onChange={(e) => setBillingSerieInvoice(e.target.value.toUpperCase().trim())}
                                />
                              </div>
                              <div className="col-span-7">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Último SUNAT</span>
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  className="w-full px-2.5 py-1.5 font-mono text-xs font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 focus:bg-white text-right"
                                  value={initialFacturaNumber}
                                  onChange={(e) => setInitialFacturaNumber(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Nota de Crédito */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                <span className="truncate">Notas de Crédito (07)</span>
                              </span>
                              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded shrink-0">
                                Próx: {serieNotaCreditoBoleta || "BC01"}-{String(Number(initialNcBoletaNumber || 0) + 1).padStart(8, '0')}
                              </span>
                            </div>
                            <div className="grid grid-cols-12 gap-2.5 pt-0.5">
                              <div className="col-span-5">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Serie</span>
                                <input
                                  type="text"
                                  maxLength={4}
                                  placeholder="BC01"
                                  className="w-full px-2.5 py-1.5 font-mono text-xs uppercase font-extrabold border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 focus:bg-white text-center"
                                  value={serieNotaCreditoBoleta}
                                  onChange={(e) => setSerieNotaCreditoBoleta(e.target.value.toUpperCase().trim())}
                                />
                              </div>
                              <div className="col-span-7">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Último SUNAT</span>
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  className="w-full px-2.5 py-1.5 font-mono text-xs font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 focus:bg-white text-right"
                                  value={initialNcBoletaNumber}
                                  onChange={(e) => setInitialNcBoletaNumber(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Nota de Débito */}
                          <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                <span className="truncate">Notas de Débito (08)</span>
                              </span>
                              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shrink-0">
                                Próx: {serieNotaDebitoBoleta || "BD01"}-{String(Number(initialNdBoletaNumber || 0) + 1).padStart(8, '0')}
                              </span>
                            </div>
                            <div className="grid grid-cols-12 gap-2.5 pt-0.5">
                              <div className="col-span-5">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Serie</span>
                                <input
                                  type="text"
                                  maxLength={4}
                                  placeholder="BD01"
                                  className="w-full px-2.5 py-1.5 font-mono text-xs uppercase font-extrabold border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 focus:bg-white text-center"
                                  value={serieNotaDebitoBoleta}
                                  onChange={(e) => setSerieNotaDebitoBoleta(e.target.value.toUpperCase().trim())}
                                />
                              </div>
                              <div className="col-span-7">
                                <span className="text-[10px] text-slate-500 font-bold block uppercase mb-1">Último SUNAT</span>
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  className="w-full px-2.5 py-1.5 font-mono text-xs font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50/50 focus:bg-white text-right"
                                  value={initialNdBoletaNumber}
                                  onChange={(e) => setInitialNdBoletaNumber(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RÉGIMEN TRIBUTARIO OFICIAL SUNAT (COMPACTO, ELEGANTE Y COLAPSABLE) */}
              <div className="md:col-span-2 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/70 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl text-white shadow-xs">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Régimen Tributario Oficial SUNAT
                        </h4>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {TAX_REGIMES[taxRegime]?.badge || "SUNAT"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Define la tasa de IGV, pago a cuenta de Renta y comprobantes autorizados.
                      </p>
                    </div>
                  </div>

                  {/* Botón interactivo para ver/ocultar ficha técnica */}
                  <button
                    type="button"
                    onClick={() => setShowRegimeDetails(!showRegimeDetails)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-all shadow-2xs self-start sm:self-auto cursor-pointer"
                  >
                    <span>{showRegimeDetails ? "Ocultar ficha" : "Ver ficha SUNAT"}</span>
                    {showRegimeDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Selector Principal y Resumen Clave */}
                <div className="space-y-2.5">
                  <select
                    value={taxRegime}
                    onChange={(e) => {
                      const newRegime = e.target.value;
                      setTaxRegime(newRegime);
                      const opt = TAX_REGIMES[newRegime];
                      if (opt) setIgvRate(opt.rate);
                    }}
                    className="w-full px-3.5 py-2.5 border-2 border-indigo-200 hover:border-indigo-400 focus:border-indigo-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs font-black text-gray-900 bg-white transition-all shadow-xs cursor-pointer"
                  >
                    {TAX_REGIMES_LIST.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </select>

                  {/* Barra compacta con indicadores clave */}
                  {(() => {
                    const opt = TAX_REGIMES[taxRegime] || TAX_REGIMES.RER_18;
                    return (
                      <div className="flex flex-wrap items-center gap-2 text-[10.5px]">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 font-bold text-indigo-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                          IGV: <strong className="text-indigo-700 font-black">{opt.rate.toFixed(1)}%</strong>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 font-bold text-amber-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          Renta: <strong className="text-amber-800 font-black">{opt.incomeTaxRate}</strong>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-emerald-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Emite: <strong className="text-emerald-800 font-black">{opt.allowedDocs.includes("FACTURA") ? "Facturas (F001) y Boletas (B001)" : "Solo Boletas (B001)"}</strong>
                        </span>

                        {opt.maxAnnualIncome && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-bold text-slate-700">
                            Tope: <strong>S/ {opt.maxAnnualIncome.toLocaleString()}</strong>
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Ficha Desplegable con Animación */}
                {showRegimeDetails && (
                  <div className="p-4 bg-white border border-indigo-100 rounded-xl space-y-3 animate-fadeIn text-xs shadow-2xs">
                    {(() => {
                      const opt = TAX_REGIMES[taxRegime] || TAX_REGIMES.RER_18;
                      return (
                        <>
                          <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                              Detalle Normativo SUNAT — {opt.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Código SUNAT: {opt.sunatCode}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                            {opt.description}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                            <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 space-y-0.5">
                              <span className="font-black text-indigo-950 block">📄 Comprobantes Autorizados:</span>
                              <span className="text-slate-700 font-medium block">
                                {opt.allowedDocs.includes("FACTURA")
                                  ? "Facturas (F001), Boletas (B001), Notas de Crédito, Débito y Guías de Remisión."
                                  : "⚠️ Solo Boletas de Venta (B001) y Tickets. SUNAT prohíbe emitir Facturas en el NRUS."}
                              </span>
                            </div>

                            <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 space-y-0.5">
                              <span className="font-black text-indigo-950 block">💰 Impuesto a la Renta:</span>
                              <span className="text-slate-700 font-medium block">
                                {opt.category === "RER"
                                  ? "Cuota fija 1.5% mensual cancelatoria definitiva (Sin Declaración Jurada Anual)."
                                  : opt.category === "RMT"
                                    ? "1.0% mensual a cuenta. Escala progresiva anual de 10% y 29.5%."
                                    : opt.category === "RG"
                                      ? "1.5% o Coeficiente mensual. Regularización anual del 29.5%."
                                      : opt.category === "NRUS"
                                        ? "Cuota fija de S/ 20 o S/ 50 mensuales según categoría de ingresos."
                                        : "Según régimen base."}
                              </span>
                            </div>

                            <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 space-y-0.5">
                              <span className="font-black text-indigo-950 block">📚 Libros Contables Requeridos:</span>
                              <span className="text-slate-700 font-medium block">
                                {opt.accountingBooks}
                              </span>
                            </div>

                            <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100 space-y-0.5">
                              <span className="font-black text-indigo-950 block">⚖️ Límites Anuales:</span>
                              <span className="text-slate-700 font-medium block">
                                {opt.maxAnnualIncome
                                  ? `Hasta S/ ${opt.maxAnnualIncome.toLocaleString()} anuales${opt.maxWorkers ? ` | Máx ${opt.maxWorkers} trabajadores` : ""}`
                                  : "Sin límite anual de ingresos ni compras."}
                              </span>
                            </div>
                          </div>

                          {opt.benefits && opt.benefits.length > 0 && (
                            <div className="pt-2 border-t border-indigo-50">
                              <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider block mb-1">
                                Ventajas Tributarias:
                              </span>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {opt.benefits.map((b, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 text-[10.5px] text-slate-600">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Alerta inteligente para Madre de Dios / Amazonía */}
                {(isAmazoniaDepartment(businessDepartment) || taxRegime === "AMAZONIA_EXONERADO") && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 animate-fadeIn">
                    <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-black text-emerald-900 uppercase tracking-wider">
                        Régimen Amazonía Activo — Ley N° 27037
                      </p>
                      <p className="text-[10px] text-emerald-700 leading-relaxed mt-0.5 font-medium">
                        En <strong>Madre de Dios</strong> y regiones amazónicas, las ventas están <strong>100% exoneradas de IGV (0.00%)</strong>. En tickets, boletas y facturas no se cobrará IGV y se consignará la leyenda oficial de ley automáticamente.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* FACTURACIÓN ELECTRÓNICA SUNAT (CCOFACT PRO ENTERPRISE) */}
              <div className="md:col-span-2 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 border border-indigo-200/90 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">Facturación Electrónica SUNAT UBL 2.1</h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Soberana & Autónoma
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Configura el motor emisor de comprobantes (CCOFACT PRO / PSE)</p>
                    </div>
                  </div>

                  {/* Switch Habilitar */}
                  <label className="flex items-center gap-2.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-indigo-200/80 shadow-2xs">
                    <span className="text-xs font-bold text-slate-700 select-none">
                      {hasElectronicBilling ? "Activada" : "Desactivada"}
                    </span>
                    <input
                      type="checkbox"
                      checked={hasElectronicBilling}
                      onChange={(e) => setHasElectronicBilling(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 relative"></div>
                  </label>
                </div>

                {/* Endpoints Preconfigurados CCOFACT PRO */}
                <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 block">
                      Endpoints Preconfigurados CCOFACT PRO:
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" /> CCOFACT PRO Enterprise
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCcofactUrl("http://localhost:4001/api/v1/ccofact/emitir")}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${ccofactUrl === "http://localhost:4001/api/v1/ccofact/emitir" || ccofactUrl.includes("4001")
                          ? "bg-indigo-50 text-indigo-700 border-indigo-400 font-black shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50/50"
                        }`}
                    >
                      🚀 Local CCOFACT (:4001/api/v1/ccofact/emitir)
                    </button>

                    <button
                      type="button"
                      onClick={() => setCcofactUrl("https://api.ccofact.com/api/v1/ccofact/emitir")}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${ccofactUrl === "https://api.ccofact.com/api/v1/ccofact/emitir"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-400 font-black shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50/50"
                        }`}
                    >
                      ☁️ Nube Ccoplex (api.ccofact.com)
                    </button>
                  </div>
                </div>

                {/* Inputs de Conexión */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                      "URL del Servidor / Endpoint CCOFACT PRO"
                    </label>
                    <input
                      type="url"
                      placeholder="http://localhost:4001/api/v1/ccofact/emitir"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono font-bold text-slate-800 bg-white"
                      value={ccofactUrl}
                      onChange={(e) => setCcofactUrl(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        "API Key Secreta CCOFACT PRO (x-api-key)"
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowBillingToken(!showBillingToken)}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        {showBillingToken ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                    <input
                      type={showBillingToken ? "text" : "password"}
                      placeholder="Ej: fact_live_0b092b0566..."
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono font-bold text-slate-800 bg-white"
                      value={ccofactApiKey}
                      onChange={(e) => setCcofactApiKey(e.target.value)}
                    />
                  </div>

                  {/* Series Fiscales */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                      Serie Boleta de Venta
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="B001"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono font-extrabold uppercase text-slate-800 bg-white"
                      value={billingSerieBoleta}
                      onChange={(e) => setBillingSerieBoleta(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                      Serie Factura Electrónica
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="F001"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono font-extrabold uppercase text-slate-800 bg-white"
                      value={billingSerieInvoice}
                      onChange={(e) => setBillingSerieInvoice(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                {/* Acciones y Estado */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-100">
                  <div className="flex items-center gap-2">
                    {ccofactUrl && ccofactApiKey ? (
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Credenciales listas para POS
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        ⚠️ Configura URL y API Key
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!ccofactUrl || !ccofactApiKey || isTestingBilling}
                    onClick={handleTestBillingConnection}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isTestingBilling ? "Verificando..." : "🧪 Probar Conexión CCOFACT PRO"}</span>
                  </button>
                </div>
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

              {/* VIP MODULE: VITRINA DIGITAL & CATÁLOGO ONLINE UNIFICADO AL FINAL */}
              <div className="md:col-span-2">
                {/* VIP MODULE: VITRINA DIGITAL & TIENDA ONLINE */}
                <div className={`p-5 rounded-3xl border transition-all duration-300 shadow-md ${isCatalogActive
                    ? "bg-gradient-to-br from-[#FFFBF2] via-[#FFFDF9] to-[#FFF6E9] border-amber-300 shadow-amber-500/10"
                    : "bg-slate-50 border-slate-200"
                  }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${isCatalogActive
                          ? "bg-gradient-to-tr from-amber-500 via-amber-600 to-amber-700 text-white shadow-lg shadow-amber-500/30 scale-100"
                          : "bg-slate-200 text-slate-400 scale-95"
                        }`}>
                        <Store className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                            Mi Tienda Online & Catálogo Digital
                          </h4>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${isCatalogActive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                              : "bg-slate-200 text-slate-500 border border-slate-300"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isCatalogActive ? "bg-emerald-600 animate-pulse" : "bg-slate-400"}`} />
                            {isCatalogActive ? "Tienda Activa & Pública" : "Tienda Pausada"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">
                          {isCatalogActive
                            ? "Tus clientes pueden ver tu catálogo en tiempo real y hacerte pedidos directos por WhatsApp."
                            : "El catálogo está actualmente pausado. Tus clientes verán que la tienda está fuera de línea."}
                        </p>
                      </div>
                    </div>

                    {/* INTERACTIVE TOGGLE SWITCH */}
                    <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 bg-white p-1.5 px-3 rounded-2xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {isCatalogActive ? "Activo" : "Desactivado"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCatalogActive(!isCatalogActive)}
                        className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${isCatalogActive ? "bg-amber-600" : "bg-slate-300"
                          }`}
                        role="switch"
                        aria-checked={isCatalogActive}
                        title={isCatalogActive ? "Desactivar Catálogo" : "Activar Catálogo"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isCatalogActive ? "translate-x-6" : "translate-x-0"
                            }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* SLUG & ACTIONS ROW */}
                  {isCatalogActive ? (
                    <div className="mt-4 pt-4 border-t border-amber-200 flex flex-col gap-3 animate-fadeIn">
                      <div>
                        <label className="block text-[11px] font-black text-amber-900 uppercase tracking-wider mb-1">
                          Enlace Web Oficial de tu Negocio:
                        </label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="flex-1 flex items-center bg-white rounded-xl border border-amber-300 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                            <span className="px-3 py-2 bg-amber-50 text-[11px] font-mono font-bold text-amber-900 border-r border-amber-200 shrink-0 select-none">
                              {window.location.origin}/catalogo/
                            </span>
                            <input
                              type="text"
                              value={businessSlug}
                              onChange={(e) => {
                                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                                setBusinessSlug(val);
                              }}
                              placeholder={generateCatalogSlug(businessName) || "mi-tienda"}
                              className="flex-1 px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none bg-transparent"
                            />
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const fullUrl = `${window.location.origin}/catalogo/${businessSlug || generateCatalogSlug(businessName) || "mi-tienda"}`;
                                navigator.clipboard.writeText(fullUrl);
                                toast.success("¡Enlace público copiado al portapapeles!");
                              }}
                              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                              title="Copiar URL"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copiar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const fullUrl = `${window.location.origin}/catalogo/${businessSlug || generateCatalogSlug(businessName) || "mi-tienda"}`;
                                window.open(fullUrl, "_blank");
                              }}
                              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-black text-amber-300 hover:text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Ver mi Tienda</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsProfileModalOpen(false);
                                setIsCatalogModalOpen(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/25 active:scale-95"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                              <span>Configurar Vitrina</span>
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-amber-800 font-medium mt-1">
                          💡 Este enlace es público. Puedes compartirlo con tus clientes o en redes para que hagan pedidos a tu WhatsApp oficial.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 flex items-center gap-2.5 animate-fadeIn">
                      <span className="text-base">⏸️</span>
                      <span className="font-medium">
                        Tu tienda virtual está temporalmente pausada. Activa el interruptor arriba para abrir tu vitrina digital y empezar a recibir pedidos por WhatsApp.
                      </span>
                    </div>
                  )}
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
                  {!(user?.blockedProfiles || []).includes("PERSONAL") && (
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
                  )}

                  {!(user?.blockedProfiles || []).includes("BUSINESS") && (
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
                  )}

                  {/* Advanced Business Sub-Modules — only visible if BUSINESS is active */}
                  {activeProfiles.includes("BUSINESS") && !user?.parentId && (
                    <>
                      <div className="ml-3 pl-3 border-l-2 border-purple-100 flex flex-col gap-2">
                        <p className="text-[10px] text-purple-600 font-black uppercase tracking-wider mb-1">Módulos Avanzados</p>

                        {!(user?.blockedProfiles || []).includes("BUSINESS_BRANCHES") && (
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
                        )}

                        {!(user?.blockedProfiles || []).includes("BUSINESS_WORKERS") && (
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
                        )}
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

      {/* Modal de instrucciones para iOS */}
      {showIOSInstructions && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-scale-up z-50">
            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-gray-50">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-black text-slate-800">
                Instalar en tu iPhone / iPad
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Sigue estos sencillos pasos para agregar Think a tu pantalla de inicio:
              </p>
            </div>

            <div className="py-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-700">
                    Toca el botón de Compartir en Safari
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Está ubicado en la barra de navegación inferior de tu iPhone (el ícono de un cuadrado con una flecha hacia arriba <Share2 className="inline w-3.5 h-3.5 text-blue-500 mx-0.5" />).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-700">
                    Selecciona "Agregar al inicio"
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Desplázate hacia abajo en el menú de opciones que aparece y presiona **Agregar al inicio** (<PlusSquare className="inline w-3.5 h-3.5 text-slate-700 mx-0.5" />).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-700">
                    Confirma y ¡Listo!
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Presiona **Agregar** en la esquina superior derecha. Ahora tendrás acceso directo y rápido a la aplicación.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSInstructions(false)}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/10 active:scale-95 cursor-pointer text-center"
            >
              Entendido
            </button>
          </div>
        </div>,
        document.body
      )}

      {activeWorkspace === "PERSONAL" && (
        <>
          <FloatingSaveButton />
          <PersonalAIChatFloating />
        </>
      )}

      <CatalogManagerModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
      />

      {/* Modal de Diagnóstico y Errores del Sistema */}
      <SystemErrorModal
        isOpen={Boolean(systemError)}
        onClose={() => setSystemError(null)}
        error={systemError}
      />

      {/* Modal de Protección de Navegación durante Edición de Comprobante */}
      <ConfirmModal
        isOpen={isNavBlockModalOpen}
        onClose={handleStay}
        onConfirm={handleConfirmLeave}
        title="⚠️ Edición de Comprobante en Curso"
        message={`Estás en edición de ${navigationBlocker?.documentLabel || "un comprobante"}. Si sales a otro módulo, la edición se cancelará y el comprobante original permanecerá completamente intacto en el sistema (no se emitirá ninguna nota de crédito ni se modificará la venta).\n\n¿Deseas cancelar la edición y salir?`}
        confirmText="Sí, Cancelar Edición y Salir"
        cancelText="Continuar Editando"
        variant="warning"
      />
    </div>
  );
}
