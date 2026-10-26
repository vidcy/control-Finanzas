import { useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  MessageCircle,
  Image as ImageIcon,
  Plus,
  Trash2,
  Sparkles,
  Store,
  Upload,
  Globe,
  Phone,
  Layers,
  MapPin,
  Megaphone,
  Wand2,
  LayoutGrid,
  Clock,
} from "lucide-react";
import { FaInstagram, FaFacebookF, FaTiktok } from "react-icons/fa6";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/AuthContext";
import { updateMyProfileRequest } from "../../services/user.api";
import { uploadProductImageFile, getReceiptAbsoluteUrl } from "../ui/ImageUploader";
import {
  RUBRO_PRESETS,
  getRubroPreset,
  type CatalogConfig,
  type CatalogBannerItem,
  type CatalogLookItem,
  type CatalogShowcaseRailItem,
} from "../../utils/catalogRubroPresets";

interface CatalogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CatalogManagerModal({ isOpen, onClose }: CatalogManagerModalProps) {
  const { user, setUser } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "rubro" | "banners" | "ticker" | "lookbook" | "rail" | "location" | "contact"
  >("rubro");
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBannerIdx, setIsUploadingBannerIdx] = useState<number | null>(null);
  const [isUploadingLookIdx, setIsUploadingLookIdx] = useState<number | null>(null);
  const [isUploadingLocationImg, setIsUploadingLocationImg] = useState(false);
  const [isUploadingRailIdx, setIsUploadingRailIdx] = useState<number | null>(null);

  // Showcase Rail / Vitrina Inferior
  const [showShowcaseRail, setShowShowcaseRail] = useState<boolean>(true);
  const [showcaseRailTitle, setShowcaseRailTitle] = useState<string>("");
  const [showcaseRailSubtitle, setShowcaseRailSubtitle] = useState<string>("");
  const [showcaseRailItems, setShowcaseRailItems] = useState<CatalogShowcaseRailItem[]>([]);

  // General Identity & Rubro
  const [slug, setSlug] = useState<string>("");
  const [selectedRubroKey, setSelectedRubroKey] = useState<string>("CALZADOS");
  const [variantLabel, setVariantLabel] = useState<string>("Tallas en Serie");
  const [catalogTitle, setCatalogTitle] = useState<string>("");
  const [catalogSubtitle, setCatalogSubtitle] = useState<string>("");
  const [catalogBadge, setCatalogBadge] = useState<string>("");

  // Banners Hero Slider
  const [banners, setBanners] = useState<CatalogBannerItem[]>([]);

  // Ticker / Marquesina & Top Announcement
  const [announcement, setAnnouncement] = useState<string>("");
  const [tickerPhrases, setTickerPhrases] = useState<string[]>([]);

  // Galería Destacada / Lookbook
  const [showLookbook, setShowLookbook] = useState<boolean>(true);
  const [lookbookTitle, setLookbookTitle] = useState<string>("");
  const [lookbookSubtitle, setLookbookSubtitle] = useState<string>("");
  const [lookbookItems, setLookbookItems] = useState<CatalogLookItem[]>([]);

  // Ubicación & Showroom
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [locationCity, setLocationCity] = useState<string>("");
  const [locationAddress, setLocationAddress] = useState<string>("");
  const [locationLandmarks, setLocationLandmarks] = useState<string>("");
  const [locationSchedule, setLocationSchedule] = useState<string>("");
  const [locationMapsUrl, setLocationMapsUrl] = useState<string>("");
  const [locationImage, setLocationImage] = useState<string>("");

  // Contacto & Redes
  const [whatsappPhone, setWhatsappPhone] = useState<string>("");
  const [instagramUrl, setInstagramUrl] = useState<string>("");
  const [facebookUrl, setFacebookUrl] = useState<string>("");
  const [tiktokUrl, setTiktokUrl] = useState<string>("");
  const [footerAbout, setFooterAbout] = useState<string>("");

  // Load user data on open
  useEffect(() => {
    if (!user || !isOpen) return;

    const defaultSlug =
      user.businessSlug ||
      (user.businessName
        ? user.businessName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")
        : user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-"));

    setSlug(defaultSlug);

    const config: CatalogConfig = (user as any).catalogConfig || {};
    const defaultRubro = getRubroPreset(config.rubroKey || user.businessRubro);

    setSelectedRubroKey(config.rubroKey || defaultRubro.key);
    setVariantLabel(config.variantLabel || defaultRubro.variantLabel);
    setCatalogTitle(config.catalogTitle || defaultRubro.catalogTitle);
    setCatalogSubtitle(config.catalogSubtitle || defaultRubro.catalogSubtitle);
    setCatalogBadge(config.catalogBadge || defaultRubro.catalogBadge);

    // Banners
    if (config.banners && Array.isArray(config.banners) && config.banners.length > 0) {
      setBanners(config.banners);
    } else {
      setBanners(defaultRubro.banners);
    }

    // Ticker & Announcement
    setAnnouncement(config.announcement !== undefined ? config.announcement : defaultRubro.announcement);
    if (config.tickerPhrases && Array.isArray(config.tickerPhrases) && config.tickerPhrases.length > 0) {
      setTickerPhrases(config.tickerPhrases);
    } else {
      setTickerPhrases(defaultRubro.tickerPhrases);
    }

    // Lookbook
    setShowLookbook(config.showLookbook !== undefined ? config.showLookbook : true);
    setLookbookTitle(config.lookbookTitle || defaultRubro.lookbookTitle);
    setLookbookSubtitle(config.lookbookSubtitle || defaultRubro.lookbookSubtitle);
    if (config.lookbookItems && Array.isArray(config.lookbookItems) && config.lookbookItems.length > 0) {
      setLookbookItems(config.lookbookItems);
    } else {
      setLookbookItems(defaultRubro.lookbookItems);
    }

    // Showcase Rail (Vitrina Inferior de Marcas/Líneas)
    setShowShowcaseRail(config.showShowcaseRail !== undefined ? config.showShowcaseRail : (defaultRubro.showShowcaseRail ?? true));
    setShowcaseRailTitle(config.showcaseRailTitle || defaultRubro.showcaseRailTitle || "Líneas de Productos & Marcas Oficiales");
    setShowcaseRailSubtitle(config.showcaseRailSubtitle || defaultRubro.showcaseRailSubtitle || "Garantía de fábrica y servicio técnico autorizado.");
    if (config.showcaseRailItems && Array.isArray(config.showcaseRailItems) && config.showcaseRailItems.length > 0) {
      setShowcaseRailItems(config.showcaseRailItems);
    } else {
      setShowcaseRailItems(defaultRubro.showcaseRailItems || []);
    }

    // Location
    setShowLocation(config.showLocation !== undefined ? config.showLocation : true);
    setLocationCity(config.locationCity || "Puerto Maldonado, Madre de Dios");
    setLocationAddress(config.locationAddress || "Av. Madre de Dios, Con Pasaje Fonavi");
    setLocationLandmarks(config.locationLandmarks || "Frente a Proversa / Al costado de Pollería Todo a Leña");
    setLocationSchedule(config.locationSchedule || "Lunes a Domingo: 8:00 am - 9:30 pm");
    setLocationMapsUrl(config.locationMapsUrl || "https://maps.app.goo.gl/p9uX1yW7n2FgFj9bA");
    setLocationImage(
      config.locationImage ||
        "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800&auto=format&fit=crop"
    );

    // Contact
    setWhatsappPhone(config.whatsappPhone || (user as any).phone || "929962458");
    setInstagramUrl(config.instagramUrl || "");
    setFacebookUrl(config.facebookUrl || "");
    setTiktokUrl(config.tiktokUrl || "");
    setFooterAbout(config.footerAbout || defaultRubro.footerAbout);
  }, [user, isOpen]);

  if (!isOpen) return null;

  const currentSlug = slug.trim() || user?.id || "mi-tienda";
  const catalogPublicUrl = `${window.location.origin}/catalogo/${currentSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(catalogPublicUrl);
    setIsCopied(true);
    toast.success("¡Enlace público copiado al portapapeles!");
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const storeName = user?.businessName || `${user?.name || ""} ${user?.lastName || ""}`.trim() || "Nuestra Tienda";
    const text = `¡Hola! Te invito a ver nuestro catálogo digital oficial de *${storeName}*. Descubre nuestros modelos y novedades disponibles en: ${catalogPublicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Apply rubro preset template
  const handleApplyRubroPreset = (rubroKey: string) => {
    const preset = RUBRO_PRESETS[rubroKey] || RUBRO_PRESETS.GENERAL;
    setSelectedRubroKey(rubroKey);
    setVariantLabel(preset.variantLabel);
    setCatalogTitle(preset.catalogTitle);
    setCatalogSubtitle(preset.catalogSubtitle);
    setCatalogBadge(preset.catalogBadge);
    setAnnouncement(preset.announcement);
    setTickerPhrases([...preset.tickerPhrases]);
    setBanners([...preset.banners]);
    setLookbookTitle(preset.lookbookTitle);
    setLookbookSubtitle(preset.lookbookSubtitle);
    setLookbookItems([...preset.lookbookItems]);
    setShowShowcaseRail(preset.showShowcaseRail ?? true);
    setShowcaseRailTitle(preset.showcaseRailTitle || "Líneas de Productos & Marcas Oficiales");
    setShowcaseRailSubtitle(preset.showcaseRailSubtitle || "Garantía de fábrica y servicio técnico autorizado.");
    setShowcaseRailItems(preset.showcaseRailItems ? [...preset.showcaseRailItems] : []);
    setFooterAbout(preset.footerAbout);
    toast.success(`Plantilla cargada para: ${preset.label}`, { icon: preset.icon });
  };

  // Banner handlers
  const handleAddBanner = () => {
    if (banners.length >= 6) {
      toast.error("Puedes tener un máximo de 6 banners en tu carrusel");
      return;
    }
    const newBanner: CatalogBannerItem = {
      id: `banner-${Date.now()}`,
      title: "NUEVA PROMOCIÓN",
      highlight: "OFERTA DE TEMPORADA",
      subtitle: "Descubre artículos seleccionados con precios exclusivos y garantía asegurada.",
      badge: "EXCLUSIVO",
      image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=1800&auto=format&fit=crop",
      ctaText: "Ver Productos",
    };
    setBanners([...banners, newBanner]);
  };

  const handleRemoveBanner = (index: number) => {
    if (banners.length <= 1) {
      toast.error("Debes tener al menos 1 banner en el catálogo");
      return;
    }
    setBanners(banners.filter((_, idx) => idx !== index));
  };

  const handleBannerChange = (index: number, field: keyof CatalogBannerItem, value: string) => {
    const updated = [...banners];
    updated[index] = { ...updated[index], [field]: value };
    setBanners(updated);
  };

  const handleUploadBannerImage = async (index: number, file: File) => {
    try {
      setIsUploadingBannerIdx(index);
      toast.loading("Subiendo imagen de banner...", { id: "upload-banner" });
      const uploadedUrl = await uploadProductImageFile(file);
      handleBannerChange(index, "image", uploadedUrl);
      toast.success("Imagen de banner subida con éxito", { id: "upload-banner" });
    } catch (err: any) {
      toast.error(err.message || "Error al subir imagen de banner", { id: "upload-banner" });
    } finally {
      setIsUploadingBannerIdx(null);
    }
  };

  // Ticker phrases handlers
  const handleAddTickerPhrase = () => {
    if (tickerPhrases.length >= 8) {
      toast.error("Máximo 8 frases en la marquesina");
      return;
    }
    setTickerPhrases([...tickerPhrases, "NUEVA VENTAJA O BENEFICIO DESTACADO"]);
  };

  const handleRemoveTickerPhrase = (index: number) => {
    if (tickerPhrases.length <= 1) {
      toast.error("Debe haber al menos 1 frase en la marquesina");
      return;
    }
    setTickerPhrases(tickerPhrases.filter((_, idx) => idx !== index));
  };

  const handleTickerChange = (index: number, val: string) => {
    const updated = [...tickerPhrases];
    updated[index] = val;
    setTickerPhrases(updated);
  };

  // Lookbook handlers
  const handleAddLookItem = () => {
    if (lookbookItems.length >= 6) {
      toast.error("Máximo 6 elementos en la galería destacada");
      return;
    }
    const newItem: CatalogLookItem = {
      id: `look-${Date.now()}`,
      title: "Nueva Línea Destacada",
      subtitle: "Descripción breve del producto o conjunto.",
      tag: "DESTACADO",
      image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=800&auto=format&fit=crop",
    };
    setLookbookItems([...lookbookItems, newItem]);
  };

  const handleRemoveLookItem = (index: number) => {
    setLookbookItems(lookbookItems.filter((_, idx) => idx !== index));
  };

  const handleLookItemChange = (index: number, field: keyof CatalogLookItem, val: string) => {
    const updated = [...lookbookItems];
    updated[index] = { ...updated[index], [field]: val };
    setLookbookItems(updated);
  };

  const handleUploadLookImage = async (index: number, file: File) => {
    try {
      setIsUploadingLookIdx(index);
      toast.loading("Subiendo imagen para galería...", { id: "upload-look" });
      const uploadedUrl = await uploadProductImageFile(file);
      handleLookItemChange(index, "image", uploadedUrl);
      toast.success("Imagen de galería subida con éxito", { id: "upload-look" });
    } catch (err: any) {
      toast.error(err.message || "Error al subir imagen", { id: "upload-look" });
    } finally {
      setIsUploadingLookIdx(null);
    }
  };

  // Location image upload
  const handleUploadLocationImage = async (file: File) => {
    try {
      setIsUploadingLocationImg(true);
      toast.loading("Subiendo foto de local...", { id: "upload-loc" });
      const uploadedUrl = await uploadProductImageFile(file);
      setLocationImage(uploadedUrl);
      toast.success("Foto de local subida con éxito", { id: "upload-loc" });
    } catch (err: any) {
      toast.error(err.message || "Error al subir imagen", { id: "upload-loc" });
    } finally {
      setIsUploadingLocationImg(false);
    }
  };

  // Showcase Rail Card Handlers
  const handleAddRailItem = () => {
    if (showcaseRailItems.length >= 8) {
      toast.error("Máximo 8 tarjetas en la vitrina inferior");
      return;
    }
    const newItem: CatalogShowcaseRailItem = {
      brand: "MARCA / LÍNEA",
      title: "Nueva Línea Destacada",
      desc: "Descripción y beneficios del producto o categoría",
      img: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=600&auto=format&fit=crop",
    };
    setShowcaseRailItems([...showcaseRailItems, newItem]);
  };

  const handleRemoveRailItem = (index: number) => {
    if (showcaseRailItems.length <= 1) {
      toast.error("Debes tener al menos 1 tarjeta en la vitrina inferior");
      return;
    }
    setShowcaseRailItems(showcaseRailItems.filter((_, idx) => idx !== index));
  };

  const handleRailItemChange = (index: number, field: keyof CatalogShowcaseRailItem, value: string) => {
    const updated = [...showcaseRailItems];
    updated[index] = { ...updated[index], [field]: value };
    setShowcaseRailItems(updated);
  };

  const handleUploadRailItemImage = async (index: number, file: File) => {
    try {
      setIsUploadingRailIdx(index);
      toast.loading("Subiendo imagen de vitrina...", { id: "upload-rail" });
      const uploadedUrl = await uploadProductImageFile(file);
      handleRailItemChange(index, "img", uploadedUrl);
      toast.success("Imagen de vitrina subida con éxito", { id: "upload-rail" });
    } catch (err: any) {
      toast.error(err.message || "Error al subir imagen", { id: "upload-rail" });
    } finally {
      setIsUploadingRailIdx(null);
    }
  };

  const handleResetRailToRubro = () => {
    const preset = RUBRO_PRESETS[selectedRubroKey] || RUBRO_PRESETS.GENERAL;
    if (preset.showcaseRailItems && preset.showcaseRailItems.length > 0) {
      setShowcaseRailItems([...preset.showcaseRailItems]);
      setShowcaseRailTitle(preset.showcaseRailTitle || showcaseRailTitle);
      setShowcaseRailSubtitle(preset.showcaseRailSubtitle || showcaseRailSubtitle);
      toast.success("Tarjetas de vitrina restablecidas a la plantilla del rubro");
    }
  };

  // Save everything
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      const cleanSlug = slug
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const catalogConfig: CatalogConfig = {
        rubroKey: selectedRubroKey,
        rubroLabel: RUBRO_PRESETS[selectedRubroKey]?.label || selectedRubroKey,
        variantLabel: variantLabel.trim() || "Tallas / Medidas",
        catalogTitle: catalogTitle.trim(),
        catalogSubtitle: catalogSubtitle.trim(),
        catalogBadge: catalogBadge.trim(),
        announcement: announcement.trim(),
        tickerPhrases: tickerPhrases.filter((p) => p.trim().length > 0),
        banners,
        showLookbook,
        lookbookTitle: lookbookTitle.trim(),
        lookbookSubtitle: lookbookSubtitle.trim(),
        lookbookItems,
        showShowcaseRail,
        showcaseRailTitle: showcaseRailTitle.trim(),
        showcaseRailSubtitle: showcaseRailSubtitle.trim(),
        showcaseRailItems,
        showLocation,
        locationCity: locationCity.trim(),
        locationAddress: locationAddress.trim(),
        locationLandmarks: locationLandmarks.trim(),
        locationSchedule: locationSchedule.trim(),
        locationMapsUrl: locationMapsUrl.trim(),
        locationImage: locationImage.trim(),
        whatsappPhone: whatsappPhone.trim(),
        instagramUrl: instagramUrl.trim(),
        facebookUrl: facebookUrl.trim(),
        tiktokUrl: tiktokUrl.trim(),
        footerAbout: footerAbout.trim(),
      };

      const res = await updateMyProfileRequest({
        businessSlug: cleanSlug || null,
        catalogConfig,
      });

      const updatedUser = {
        ...user,
        ...res,
        businessSlug: cleanSlug,
        catalogConfig,
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("¡Catálogo digital y todos sus módulos actualizados con éxito!");
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Error al guardar configuración");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-5 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-5xl max-h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-[#131625] to-slate-900 text-white flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Editor Integral del Catálogo Público
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {RUBRO_PRESETS[selectedRubroKey]?.icon} {RUBRO_PRESETS[selectedRubroKey]?.label || "Personalizado"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Personaliza cada módulo, textos, banners y ubicación según el rubro de tu negocio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PUBLIC LINK BANNER */}
        <div className="bg-[#FAF7F2] border-b border-[#EDE2D4] px-5 py-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-700 min-w-0 flex-1">
            <Globe className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-semibold text-slate-500 shrink-0">Enlace Público:</span>
            <a
              href={catalogPublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-800 font-bold hover:underline truncate inline-flex items-center gap-1"
            >
              <span>{catalogPublicUrl}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? "¡Copiado!" : "Copiar"}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Compartir en WhatsApp</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 overflow-x-auto px-5 sm:px-6 pt-3 border-b border-slate-200 bg-slate-50 scrollbar-none shrink-0">
          {[
            { id: "rubro", label: "Rubro & Estilo", icon: Wand2 },
            { id: "banners", label: "Banners Hero", icon: ImageIcon },
            { id: "ticker", label: "Marquesina & Anuncios", icon: Megaphone },
            { id: "lookbook", label: "Galería Destacada", icon: Sparkles },
            { id: "rail", label: "Vitrina Inferior / Pasarela", icon: LayoutGrid },
            { id: "location", label: "Ubicación & Horarios", icon: Clock },
            { id: "contact", label: "Contacto & Redes", icon: Phone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                  isActive
                    ? "bg-white text-amber-900 border-amber-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 border-transparent hover:bg-white/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-700" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* ──────────────────────────────────────────────────────────
              TAB 1: RUBRO & ESTILO GENERAL
          ────────────────────────────────────────────────────────── */}
          {activeTab === "rubro" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                <div className="flex items-center gap-2.5 mb-2">
                  <Wand2 className="w-5 h-5 text-amber-700" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    Selecciona el Rubro de tu Negocio
                  </h4>
                </div>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Al elegir un rubro, puedes aplicar automáticamente títulos sugeridos, textos de botones,
                  marquesina y banners optimizados para tu sector.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {Object.values(RUBRO_PRESETS).map((preset) => {
                    const isSelected = selectedRubroKey === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => handleApplyRubroPreset(preset.key)}
                        className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white border-amber-500 ring-2 ring-amber-400/40 shadow-sm"
                            : "bg-white/80 border-slate-200 hover:border-amber-300 hover:bg-white"
                        }`}
                      >
                        <span className="text-xl">{preset.icon}</span>
                        <span className="text-xs font-bold text-slate-900 leading-tight">
                          {preset.label}
                        </span>
                        <span className="text-[10px] text-amber-800 font-semibold">
                          Variante: {preset.variantLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SLUG & TITLES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Slug del Enlace Público (URL amigable)
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs focus-within:border-amber-500">
                    <span className="bg-slate-100 text-slate-500 text-xs px-3 py-2.5 font-mono border-r border-slate-200">
                      /catalogo/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="nombre-de-tu-tienda"
                      className="w-full px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Solo letras, números y guiones. Ej: mi-tienda-calzados
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Etiqueta de Variantes / Serie de Productos
                  </label>
                  <input
                    type="text"
                    value={variantLabel}
                    onChange={(e) => setVariantLabel(e.target.value)}
                    placeholder="Ej. Tallas en Serie, Tallas / Medidas, Presentaciones..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Determina cómo se nombra el filtro de tallas o medidas en el catálogo.
                  </span>
                </div>
              </div>

              {/* CATALOG HEADER CONTENT */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <Store className="w-4 h-4 text-amber-700" />
                  <span>Cabecera & Textos de la Vitrina</span>
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Insignia Superior (Badge)
                    </label>
                    <input
                      type="text"
                      value={catalogBadge}
                      onChange={(e) => setCatalogBadge(e.target.value)}
                      placeholder="Ej. VITRINA EXCLUSIVA, MODA 2026..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Título Principal de la Vitrina
                    </label>
                    <input
                      type="text"
                      value={catalogTitle}
                      onChange={(e) => setCatalogTitle(e.target.value)}
                      placeholder="Ej. Catálogo Oficial & Novedades"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subtítulo Descriptivo de la Vitrina
                  </label>
                  <textarea
                    rows={2}
                    value={catalogSubtitle}
                    onChange={(e) => setCatalogSubtitle(e.target.value)}
                    placeholder="Describe tus productos, garantías y especialidades..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 2: BANNERS HERO SLIDER
          ────────────────────────────────────────────────────────── */}
          {activeTab === "banners" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Diapositivas del Carrusel Principal (Hero Slider)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configura hasta 6 imágenes de alto impacto con sus textos y botones.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBanner}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Banner</span>
                </button>
              </div>

              <div className="space-y-5">
                {banners.map((banner, index) => (
                  <div
                    key={banner.id || index}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative group"
                  >
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-bold text-xs text-slate-800">
                          Diapositiva #{index + 1}
                        </span>
                      </div>
                      {banners.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBanner(index)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Eliminar este banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Left: Image preview & uploader */}
                      <div className="lg:col-span-4 space-y-2">
                        <div className="w-full aspect-16/9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                          <img
                            src={getReceiptAbsoluteUrl(banner.image) || banner.image}
                            alt="Banner preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).src =
                                "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop";
                            }}
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-bold">
                            {banner.badge || "PROMO"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200">
                            <Upload className="w-3.5 h-3.5 text-amber-700" />
                            <span>
                              {isUploadingBannerIdx === index ? "Subiendo..." : "Subir Foto"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadBannerImage(index, file);
                              }}
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={banner.image}
                          onChange={(e) => handleBannerChange(index, "image", e.target.value)}
                          placeholder="O pega URL de imagen..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>

                      {/* Right: Text Fields */}
                      <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Título Principal del Banner
                          </label>
                          <input
                            type="text"
                            value={banner.title}
                            onChange={(e) => handleBannerChange(index, "title", e.target.value)}
                            placeholder="Ej. COLECCIÓN EXCLUSIVA & ALTA COSTURA"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Línea Destacada / Subtítulo Grande
                          </label>
                          <input
                            type="text"
                            value={banner.highlight}
                            onChange={(e) => handleBannerChange(index, "highlight", e.target.value)}
                            placeholder="Ej. MODELOS DE TEMPORADA 2026"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Insignia / Badge
                          </label>
                          <input
                            type="text"
                            value={banner.badge}
                            onChange={(e) => handleBannerChange(index, "badge", e.target.value)}
                            placeholder="Ej. 100% ORIGINALES, NUEVO..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Descripción / Subtítulo Breve
                          </label>
                          <textarea
                            rows={2}
                            value={banner.subtitle}
                            onChange={(e) => handleBannerChange(index, "subtitle", e.target.value)}
                            placeholder="Detalle atractivo para captar al cliente..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Texto del Botón (CTA)
                          </label>
                          <input
                            type="text"
                            value={banner.ctaText}
                            onChange={(e) => handleBannerChange(index, "ctaText", e.target.value)}
                            placeholder="Ej. Ver Colección, Comprar Ahora..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 3: MARQUESINA & ANUNCIOS
          ────────────────────────────────────────────────────────── */}
          {activeTab === "ticker" && (
            <div className="space-y-6 animate-fadeIn">
              {/* TOP ANNOUNCEMENT */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-700" />
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Barra de Anuncios Superior (Top Banner)
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Aparece fijada en la parte superior del catálogo público destacando promociones urgentes.
                </p>
                <input
                  type="text"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Ej. ¡Envíos gratis por compras mayores a S/ 150! Pedidos directos por WhatsApp."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                />
              </div>

              {/* TICKER MARQUEE */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-700" />
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Frases de la Cinta Marquesina Animada
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTickerPhrase}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Frase</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Estas frases se desplazan continuamente en la marquesina de lujo destacando la confianza y servicios de tu negocio.
                </p>

                <div className="space-y-2.5">
                  {tickerPhrases.map((phrase, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={phrase}
                        onChange={(e) => handleTickerChange(idx, e.target.value)}
                        placeholder="Ej. ENVÍOS SEGUROS A TODO EL PAÍS"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                      />
                      {tickerPhrases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTickerPhrase(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Eliminar frase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 4: GALERÍA DESTACADA / LOOKBOOK
          ────────────────────────────────────────────────────────── */}
          {activeTab === "lookbook" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                    <span>Sección de Galería Editorial / Lookbook</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Muestra tarjetas inspiracionales o líneas destacadas de tu rubro.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLookbook}
                    onChange={(e) => setShowLookbook(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Mostrar en catálogo</span>
                </label>
              </div>

              {showLookbook && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Título de la Galería
                      </label>
                      <input
                        type="text"
                        value={lookbookTitle}
                        onChange={(e) => setLookbookTitle(e.target.value)}
                        placeholder="Ej. Líneas de Colección & Pasarela"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subtítulo
                      </label>
                      <input
                        type="text"
                        value={lookbookSubtitle}
                        onChange={(e) => setLookbookSubtitle(e.target.value)}
                        placeholder="Ej. Diseños exclusivos y tendencias para toda ocasión"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-slate-700">
                      Tarjetas de la Galería ({lookbookItems.length}/6)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddLookItem}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir Tarjeta</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lookbookItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 relative"
                      >
                        <div className="w-full aspect-4/3 rounded-xl overflow-hidden bg-slate-100 relative">
                          <img
                            src={getReceiptAbsoluteUrl(item.image) || item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).src =
                                "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?q=80&w=600&auto=format&fit=crop";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveLookItem(idx)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-rose-600 hover:text-white text-slate-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-bold">
                            {item.tag || "DESTACADO"}
                          </div>
                        </div>

                        <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200">
                          <Upload className="w-3.5 h-3.5 text-amber-700" />
                          <span>{isUploadingLookIdx === idx ? "Subiendo..." : "Subir Foto"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadLookImage(idx, file);
                            }}
                          />
                        </label>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Etiqueta
                          </label>
                          <input
                            type="text"
                            value={item.tag}
                            onChange={(e) => handleLookItemChange(idx, "tag", e.target.value)}
                            placeholder="Ej. TENDENCIA"
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Título
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleLookItemChange(idx, "title", e.target.value)}
                            placeholder="Ej. Calzados de Noche"
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Descripción
                          </label>
                          <input
                            type="text"
                            value={item.subtitle}
                            onChange={(e) => handleLookItemChange(idx, "subtitle", e.target.value)}
                            placeholder="Detalle breve..."
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB: VITRINA INFERIOR / SHOWCASE RAIL
          ────────────────────────────────────────────────────────── */}
          {activeTab === "rail" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-amber-700" />
                    <span>Carrusel Inferior de Marcas & Categorías Destacadas</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Muestra una pasarela horizontal deslizante con tus principales marcas autorizadas, líneas de productos o familias comerciales.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showShowcaseRail}
                    onChange={(e) => setShowShowcaseRail(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded-sm focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Mostrar Sección</span>
                </label>
              </div>

              {showShowcaseRail && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Título de la Vitrina Inferior
                      </label>
                      <input
                        type="text"
                        value={showcaseRailTitle}
                        onChange={(e) => setShowcaseRailTitle(e.target.value)}
                        placeholder="Ej. Marcas Oficiales & Líneas de Colección"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subtítulo / Descripción
                      </label>
                      <input
                        type="text"
                        value={showcaseRailSubtitle}
                        onChange={(e) => setShowcaseRailSubtitle(e.target.value)}
                        placeholder="Ej. Garantía oficial de fábrica y atención personalizada."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <h5 className="font-bold text-xs uppercase text-slate-700 tracking-wider">
                      Tarjetas de Marcas / Líneas ({showcaseRailItems.length}/8)
                    </h5>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetRailToRubro}
                        className="text-xs text-amber-800 hover:text-amber-950 font-bold hover:underline cursor-pointer"
                      >
                        Cargar sugerencias de mi rubro
                      </button>
                      <button
                        type="button"
                        onClick={handleAddRailItem}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Tarjeta</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {showcaseRailItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3 relative group"
                      >
                        <div className="relative h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={getReceiptAbsoluteUrl(item.img) || item.img}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveRailItem(idx)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-rose-600 hover:text-white text-slate-600 transition-colors cursor-pointer"
                            title="Eliminar tarjeta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[9px] font-bold tracking-wider">
                            {item.brand || "MARCA"}
                          </div>
                        </div>

                        <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200">
                          <Upload className="w-3.5 h-3.5 text-amber-700" />
                          <span>{isUploadingRailIdx === idx ? "Subiendo..." : "Subir Foto"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadRailItemImage(idx, file);
                            }}
                          />
                        </label>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Marca o Nombre del Fabricante
                          </label>
                          <input
                            type="text"
                            value={item.brand}
                            onChange={(e) => handleRailItemChange(idx, "brand", e.target.value)}
                            placeholder="Ej. SAMSUNG, LG, MABE"
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Título de la Línea
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleRailItemChange(idx, "title", e.target.value)}
                            placeholder="Ej. Refrigeración Inverter No Frost"
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Descripción Breve
                          </label>
                          <input
                            type="text"
                            value={item.desc}
                            onChange={(e) => handleRailItemChange(idx, "desc", e.target.value)}
                            placeholder="Ej. Máxima durabilidad y ahorro eléctrico"
                            className="w-full px-2.5 py-1 rounded-lg border border-slate-300 text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 6: UBICACIÓN & SHOWROOM
          ────────────────────────────────────────────────────────── */}
          {activeTab === "location" && (
            <div className="space-y-6 animate-fadeIn">

              {/* TARJETA DESTACADA: CONFIGURACIÓN DE HORARIOS DE ATENCIÓN */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 border border-amber-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Horarios de Atención al Cliente & Tienda
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Se muestra en la cabecera, bloque comercial y pie de página de tu catálogo oficial.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                    Sincronizado Oficial
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Horario de Atención Vigente
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500">
                    <span className="bg-slate-100 text-slate-600 px-3 py-2.5 border-r border-slate-200 flex items-center gap-1.5 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Horario</span>
                    </span>
                    <input
                      type="text"
                      value={locationSchedule}
                      onChange={(e) => setLocationSchedule(e.target.value)}
                      placeholder="Ej. Lunes a Sábado: 8:30 am - 8:30 pm / Domingo: 9:00 am - 2:00 pm"
                      className="w-full px-3 py-2 text-xs text-slate-900 focus:outline-none font-medium"
                    />
                  </div>
                  
                  {/* PRESETS RÁPIDOS */}
                  <div className="mt-2.5 flex items-center flex-wrap gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                      Plantillas Rápidas:
                    </span>
                    {[
                      "Lunes a Sábado: 8:30 am - 8:30 pm",
                      "Lunes a Domingo: 8:00 am - 9:30 pm",
                      "Lunes a Viernes: 9:00 am - 7:00 pm | Sáb: 9:00 am - 2:00 pm",
                      "Atención 24/7 por WhatsApp & Despachos Express",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setLocationSchedule(preset)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100/70 border border-slate-200 hover:border-amber-300 text-[10px] font-medium text-slate-700 hover:text-amber-950 transition-all cursor-pointer shadow-2xs"
                      >
                        {preset.length > 32 ? preset.substring(0, 30) + '...' : preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-700" />
                    <span>Módulo de Ubicación Física & Local de Atención</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Permite a tus clientes conocer tu tienda física, dirección, horarios e iniciar navegación GPS.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLocation}
                    onChange={(e) => setShowLocation(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Mostrar en catálogo</span>
                </label>
              </div>

              {showLocation && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ciudad / Región
                      </label>
                      <input
                        type="text"
                        value={locationCity}
                        onChange={(e) => setLocationCity(e.target.value)}
                        placeholder="Ej. Lima, Perú / Puerto Maldonado"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dirección Principal
                      </label>
                      <input
                        type="text"
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        placeholder="Ej. Av. Los Próceres 1234"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Puntos de Referencia
                      </label>
                      <input
                        type="text"
                        value={locationLandmarks}
                        onChange={(e) => setLocationLandmarks(e.target.value)}
                        placeholder="Ej. Frente a la plaza principal / Al costado del banco"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Horario de Atención
                      </label>
                      <input
                        type="text"
                        value={locationSchedule}
                        onChange={(e) => setLocationSchedule(e.target.value)}
                        placeholder="Ej. Lunes a Sábado: 8:30 am - 8:30 pm"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Enlace de Google Maps / GPS
                    </label>
                    <input
                      type="url"
                      value={locationMapsUrl}
                      onChange={(e) => setLocationMapsUrl(e.target.value)}
                      placeholder="https://maps.app.goo.gl/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Foto de Fachada o Interior del Local
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img
                          src={getReceiptAbsoluteUrl(locationImage) || locationImage}
                          alt="Local"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as any).src =
                              "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=400&auto=format&fit=crop";
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors border border-slate-200">
                          <Upload className="w-4 h-4 text-amber-700" />
                          <span>{isUploadingLocationImg ? "Subiendo..." : "Subir Foto del Local"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadLocationImage(file);
                            }}
                          />
                        </label>
                        <input
                          type="text"
                          value={locationImage}
                          onChange={(e) => setLocationImage(e.target.value)}
                          placeholder="O pega URL de imagen..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────
              TAB 6: CONTACTO & REDES
          ────────────────────────────────────────────────────────── */}
          {activeTab === "contact" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-700" />
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    WhatsApp para Pedidos & Atención al Cliente
                  </h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número de WhatsApp (con o sin código 51)
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs focus-within:border-emerald-500">
                    <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-2.5 border-r border-slate-200 flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WA</span>
                    </span>
                    <input
                      type="text"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      placeholder="Ej. 929962458 ó 51929962458"
                      className="w-full px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Todos los botones de pedido del catálogo y el botón flotante abrirán chat directo a este número.
                  </span>
                </div>
              </div>

              {/* HORARIO DE ATENCIÓN DE CLIENTES Y WHATSAPP */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Horario de Atención & Respuestas WhatsApp
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("location")}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-900 underline cursor-pointer"
                  >
                    Ver en módulo de Ubicación
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Horario de Atención
                  </label>
                  <input
                    type="text"
                    value={locationSchedule}
                    onChange={(e) => setLocationSchedule(e.target.value)}
                    placeholder="Ej. Lunes a Sábado: 8:30 am - 8:30 pm"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Informa a tus clientes el rango horario en que respondes cotizaciones y despachos.
                  </span>
                </div>
              </div>

              {/* SOCIAL NETWORKS */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-amber-900">
                  Redes Sociales del Negocio
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <FaInstagram className="w-3.5 h-3.5 text-pink-600" />
                      <span>Instagram</span>
                    </label>
                    <input
                      type="url"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/tu-cuenta"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <FaFacebookF className="w-3.5 h-3.5 text-blue-600" />
                      <span>Facebook</span>
                    </label>
                    <input
                      type="url"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder="https://facebook.com/tu-pagina"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <FaTiktok className="w-3.5 h-3.5 text-slate-900" />
                      <span>TikTok</span>
                    </label>
                    <input
                      type="url"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="https://tiktok.com/@tu-cuenta"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 font-mono shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* FOOTER ABOUT */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Texto "Sobre Nosotros" / Pie de Página
                </label>
                <textarea
                  rows={3}
                  value={footerAbout}
                  onChange={(e) => setFooterAbout(e.target.value)}
                  placeholder="Describe la historia, confianza y compromiso de tu negocio..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar sin guardar
          </button>

          <div className="flex items-center gap-2">
            <a
              href={catalogPublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Catálogo</span>
            </a>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-black tracking-wide shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar y Publicar Todo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
