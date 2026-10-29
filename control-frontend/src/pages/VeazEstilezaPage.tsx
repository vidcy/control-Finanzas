import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Search,
  Sparkles,
  X,
  Phone,
  ShieldCheck,
  Truck,
  Store,
  Layers,
  Flame,
  Clock,
  Eye,
  Package,
  Check,
  ChevronRight,
  ChevronLeft,
  ShoppingBag,
  Plus,
  Minus,
  Settings,
  ArrowRight,
  SlidersHorizontal,
  Building,
  CheckCircle2,
  Tag,
  Star,
  RefreshCw,
  Award,
  CreditCard,
  MessageCircle,
  Zap,
  MapPin,
  Calendar,
  Mail,
  ExternalLink,
  Navigation,
  HeartHandshake,
  Share2,
  Palette,
} from "lucide-react";
import { FaWhatsapp, FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa6";
import { toast } from "react-hot-toast";
import {
  getCatalogProductsRequest,
  getCatalogBrandsRequest,
  getCatalogFamiliesRequest,
  getCatalogStoreInfoRequest,
  getProductsRequest,
  type CatalogStoreInfo,
  type Product,
} from "../services/product.api";
import { getReceiptAbsoluteUrl } from "../components/ui/ImageUploader";
import { getStoreCatalogSlug } from "../utils/catalogUtils";
import {
  groupProductsBySku,
  type GroupedShoeModel,
} from "../components/veaz/veazTypes";
import {
  getRubroPreset,
  type CatalogConfig,
  type CatalogBannerItem,
} from "../utils/catalogRubroPresets";
import StoreVirtualChatWidget from "../components/catalog/StoreVirtualChatWidget";

// ─────────────────────────────────────────────────────────────
// BRAND STYLING ENGINE (DIFERENCIACIÓN VISUAL DE MARCAS)
// ─────────────────────────────────────────────────────────────
export interface BrandStyle {
  name: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  accentBg: string;
  accentBorder: string;
}

export function getBrandStyle(brandName?: string): BrandStyle {
  const norm = (brandName || "").trim().toUpperCase();

  // Vizzano (Black & Pure Gold Luxury - Icon of Brazilian Footwear)
  if (norm.includes("VIZZANO")) {
    return {
      name: "VIZZANO",
      badgeBg: "bg-gradient-to-r from-black via-zinc-950 to-slate-900",
      badgeText: "text-amber-300 font-black tracking-widest",
      badgeBorder: "border-amber-400 shadow-md shadow-amber-500/25",
      dotColor: "#d4af37",
      accentBg: "bg-amber-50/60",
      accentBorder: "border-amber-400 text-amber-950",
    };
  }

  // Modare (Ultra Confort - Soft Blush Rose & Nude)
  if (norm.includes("MODARE")) {
    return {
      name: "MODARE",
      badgeBg: "bg-gradient-to-r from-rose-500 via-pink-600 to-rose-600",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-rose-300 shadow-md shadow-rose-500/20",
      dotColor: "#f43f5e",
      accentBg: "bg-rose-50",
      accentBorder: "border-rose-300 text-rose-900",
    };
  }

  // Beira Rio (Conforto - Radiant Fuchsia / Magenta)
  if (norm.includes("BEIRA RIO") || norm.includes("BEIRARIO")) {
    return {
      name: "BEIRA RIO",
      badgeBg: "bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-700",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-fuchsia-300 shadow-md shadow-fuchsia-500/20",
      dotColor: "#d946ef",
      accentBg: "bg-fuchsia-50",
      accentBorder: "border-fuchsia-300 text-fuchsia-900",
    };
  }

  // Moleca (Youthful Casual - Mint Emerald & Fresh Coral)
  if (norm.includes("MOLECA")) {
    return {
      name: "MOLECA",
      badgeBg: "bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-teal-300 shadow-md shadow-teal-500/20",
      dotColor: "#14b8a6",
      accentBg: "bg-teal-50",
      accentBorder: "border-teal-300 text-teal-900",
    };
  }

  // Tricks (Urban Athletic - Carbon Black & Electric Gold)
  if (norm.includes("TRICKS") || norm.includes("TRIKCS")) {
    return {
      name: brandName || "TRICKS",
      badgeBg: "bg-gradient-to-r from-slate-950 via-zinc-900 to-slate-900",
      badgeText: "text-amber-400 font-black tracking-wider",
      badgeBorder: "border-amber-400 shadow-md shadow-amber-500/25",
      dotColor: "#f59e0b",
      accentBg: "bg-amber-50",
      accentBorder: "border-amber-400 text-amber-900",
    };
  }

  // Veaz / Veaz Estileza (Royal Purple & Deep Imperial Indigo)
  if (norm.includes("VEAZ")) {
    return {
      name: brandName || "VEAZ",
      badgeBg: "bg-gradient-to-r from-purple-800 via-indigo-700 to-indigo-950",
      badgeText: "text-amber-300 font-black tracking-widest",
      badgeBorder: "border-purple-300 shadow-md shadow-purple-500/25",
      dotColor: "#8b5cf6",
      accentBg: "bg-purple-50",
      accentBorder: "border-purple-300 text-purple-900",
    };
  }

  // CCOplex (Sport Casual - Crimson & Slate)
  if (norm.includes("CCOPLEX")) {
    return {
      name: brandName || "CCOPLEX",
      badgeBg: "bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-rose-300 shadow-md shadow-rose-500/20",
      dotColor: "#e11d48",
      accentBg: "bg-rose-50",
      accentBorder: "border-rose-300 text-rose-900",
    };
  }

  // Madona (Warm Amber & Terracotta)
  if (norm.includes("MADONA")) {
    return {
      name: brandName || "MADONA",
      badgeBg: "bg-gradient-to-r from-orange-500 via-amber-600 to-yellow-600",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-orange-300 shadow-md shadow-orange-500/20",
      dotColor: "#ea580c",
      accentBg: "bg-orange-50",
      accentBorder: "border-orange-300 text-orange-900",
    };
  }

  // Isabella (Romantic Fuchsia)
  if (norm.includes("ISABELLA")) {
    return {
      name: brandName || "ISABELLA",
      badgeBg: "bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600",
      badgeText: "text-white font-black tracking-widest",
      badgeBorder: "border-pink-300 shadow-md shadow-pink-500/20",
      dotColor: "#db2777",
      accentBg: "bg-pink-50",
      accentBorder: "border-pink-300 text-pink-900",
    };
  }

  // Edwin (Classic Leather Men - Cognac & Oak)
  if (norm.includes("EDWIN")) {
    return {
      name: "EDWIN",
      badgeBg: "bg-gradient-to-r from-amber-950 via-stone-900 to-stone-950",
      badgeText: "text-amber-300 font-black tracking-wider",
      badgeBorder: "border-amber-700 shadow-md shadow-amber-900/30",
      dotColor: "#78350f",
      accentBg: "bg-amber-50",
      accentBorder: "border-amber-700 text-amber-950",
    };
  }

  // Xiomara (Chic Lilac & Violet)
  if (norm.includes("XIOMARA")) {
    return {
      name: "XIOMARA",
      badgeBg: "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-violet-300 shadow-md shadow-violet-500/20",
      dotColor: "#7c3aed",
      accentBg: "bg-violet-50",
      accentBorder: "border-violet-300 text-violet-900",
    };
  }

  // Marimena (Gala Ruby Red)
  if (norm.includes("MARIMENA")) {
    return {
      name: "MARIMENA",
      badgeBg: "bg-gradient-to-r from-rose-800 via-red-700 to-rose-900",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-rose-400 shadow-md shadow-rose-600/20",
      dotColor: "#be123c",
      accentBg: "bg-rose-50",
      accentBorder: "border-rose-400 text-rose-900",
    };
  }

  // Samsung (Official Samsung Corporate Blue)
  if (norm.includes("SAMSUNG")) {
    return {
      name: "SAMSUNG",
      badgeBg: "bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-blue-400 shadow-md shadow-blue-600/25",
      dotColor: "#034ea2",
      accentBg: "bg-blue-50",
      accentBorder: "border-blue-400 text-blue-900",
    };
  }

  // LG (Official Life's Good Burgundy Crimson)
  if (norm.includes("LG")) {
    return {
      name: "LG",
      badgeBg: "bg-gradient-to-r from-rose-700 via-red-800 to-pink-900",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-rose-300 shadow-md shadow-rose-600/20",
      dotColor: "#a50034",
      accentBg: "bg-rose-50",
      accentBorder: "border-rose-300 text-rose-950",
    };
  }

  // Indurama (Official Indurama Navy & Cyan)
  if (norm.includes("INDURAMA")) {
    return {
      name: "INDURAMA",
      badgeBg: "bg-gradient-to-r from-sky-700 via-blue-800 to-slate-900",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-sky-300 shadow-md shadow-sky-500/20",
      dotColor: "#0080c8",
      accentBg: "bg-sky-50",
      accentBorder: "border-sky-300 text-sky-900",
    };
  }

  // Mabe (Official Mabe Cobalt & Blue)
  if (norm.includes("MABE")) {
    return {
      name: "MABE",
      badgeBg: "bg-gradient-to-r from-blue-700 via-indigo-800 to-blue-900",
      badgeText: "text-white font-black tracking-widest",
      badgeBorder: "border-blue-300 shadow-md shadow-blue-500/20",
      dotColor: "#0055b8",
      accentBg: "bg-blue-50",
      accentBorder: "border-blue-300 text-blue-900",
    };
  }

  // Electrolux (Official Swedish Midnight Blue)
  if (norm.includes("ELECTROLUX")) {
    return {
      name: "ELECTROLUX",
      badgeBg: "bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900",
      badgeText: "text-sky-300 font-black tracking-wider",
      badgeBorder: "border-sky-400 shadow-md shadow-sky-600/20",
      dotColor: "#011e41",
      accentBg: "bg-sky-50",
      accentBorder: "border-sky-400 text-sky-950",
    };
  }

  // Oster (Official Oster Classic Ruby Red & Steel)
  if (norm.includes("OSTER")) {
    return {
      name: "OSTER",
      badgeBg: "bg-gradient-to-r from-red-700 via-rose-800 to-red-900",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-red-300 shadow-md shadow-red-600/20",
      dotColor: "#c41230",
      accentBg: "bg-red-50",
      accentBorder: "border-red-300 text-red-900",
    };
  }

  // Hisense (Official Hisense Signature Sea Teal / Cyan)
  if (norm.includes("HISENSE")) {
    return {
      name: "HISENSE",
      badgeBg: "bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-teal-300 shadow-md shadow-teal-500/20",
      dotColor: "#009999",
      accentBg: "bg-teal-50",
      accentBorder: "border-teal-300 text-teal-900",
    };
  }

  // JBL (Official High-Energy Flame Orange)
  if (norm.includes("JBL")) {
    return {
      name: "JBL",
      badgeBg: "bg-gradient-to-r from-orange-600 via-red-600 to-amber-500",
      badgeText: "text-white font-black tracking-widest",
      badgeBorder: "border-orange-300 shadow-md shadow-orange-500/20",
      dotColor: "#ff3300",
      accentBg: "bg-orange-50",
      accentBorder: "border-orange-300 text-orange-900",
    };
  }

  // Sony (Official Titanium Black & Silver)
  if (norm.includes("SONY")) {
    return {
      name: "SONY",
      badgeBg: "bg-gradient-to-r from-slate-950 via-zinc-900 to-neutral-950",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-slate-500 shadow-md",
      dotColor: "#000000",
      accentBg: "bg-slate-100",
      accentBorder: "border-slate-400 text-slate-900",
    };
  }

  // Philips (Official Philips Royal Shield Blue)
  if (norm.includes("PHILIPS")) {
    return {
      name: "PHILIPS",
      badgeBg: "bg-gradient-to-r from-blue-700 to-cyan-800",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-blue-300 shadow-md shadow-blue-500/20",
      dotColor: "#0066a1",
      accentBg: "bg-blue-50",
      accentBorder: "border-blue-300 text-blue-900",
    };
  }

  // Coolbox / Colbox (Official Vivid Orange & Navy)
  if (norm.includes("COOLBOX") || norm.includes("COLBOX")) {
    return {
      name: brandName || "COOLBOX",
      badgeBg: "bg-gradient-to-r from-orange-600 via-amber-600 to-blue-900",
      badgeText: "text-white font-black tracking-wider",
      badgeBorder: "border-orange-400 shadow-md",
      dotColor: "#f26522",
      accentBg: "bg-orange-50",
      accentBorder: "border-orange-400 text-orange-950",
    };
  }

  // Deterministic generator based on name hash
  const PALETTES = [
    { badgeBg: "bg-gradient-to-r from-indigo-600 to-purple-600", badgeText: "text-white font-black", badgeBorder: "border-indigo-300 shadow-xs", dotColor: "#6366f1", accentBg: "bg-indigo-50", accentBorder: "border-indigo-300 text-indigo-900" },
    { badgeBg: "bg-gradient-to-r from-emerald-600 to-teal-600", badgeText: "text-white font-black", badgeBorder: "border-emerald-300 shadow-xs", dotColor: "#10b981", accentBg: "bg-emerald-50", accentBorder: "border-emerald-300 text-emerald-900" },
    { badgeBg: "bg-gradient-to-r from-rose-600 to-pink-600", badgeText: "text-white font-black", badgeBorder: "border-rose-300 shadow-xs", dotColor: "#f43f5e", accentBg: "bg-rose-50", accentBorder: "border-rose-300 text-rose-900" },
    { badgeBg: "bg-gradient-to-r from-amber-500 to-orange-600", badgeText: "text-white font-black", badgeBorder: "border-amber-300 shadow-xs", dotColor: "#f59e0b", accentBg: "bg-amber-50", accentBorder: "border-amber-300 text-amber-900" },
    { badgeBg: "bg-gradient-to-r from-cyan-600 to-blue-600", badgeText: "text-white font-black", badgeBorder: "border-cyan-300 shadow-xs", dotColor: "#06b6d4", accentBg: "bg-cyan-50", accentBorder: "border-cyan-300 text-cyan-900" },
    { badgeBg: "bg-gradient-to-r from-violet-600 to-fuchsia-600", badgeText: "text-white font-black", badgeBorder: "border-violet-300 shadow-xs", dotColor: "#8b5cf6", accentBg: "bg-violet-50", accentBorder: "border-violet-300 text-violet-900" },
  ];

  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PALETTES.length;
  const p = PALETTES[idx];

  return {
    name: brandName || "OFICIAL",
    ...p,
  };
}

// Fallback Calzados Demo
const SHOWCASE_DEMO_PRODUCTS: Product[] = [
  {
    id: "demo-shoe-1-35",
    name: "Stiletto Charol Tacón Aguja Red Carpet - Talla 35",
    sku: "VZ-101-35",
    salePrice: 159,
    adjustedPrice: 139,
    stock: 2,
    unit: "Par",
    description: "Acabado en charol brillante de primera calidad, plantilla confort acolchada y tacón aguja de 9 cm con tapilla antideslizante.",
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=700&auto=format&fit=crop",
    brand: { id: "b1", name: "TRICKS" },
    family: { id: "f1", name: "Stilettos & Gala" },
  } as any,
  {
    id: "demo-shoe-1-36",
    name: "Stiletto Charol Tacón Aguja Red Carpet - Talla 36",
    sku: "VZ-101-36",
    salePrice: 159,
    adjustedPrice: 139,
    stock: 4,
    unit: "Par",
    description: "Acabado en charol brillante de primera calidad, plantilla confort acolchada y tacón aguja de 9 cm.",
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=700&auto=format&fit=crop",
    brand: { id: "b1", name: "TRICKS" },
    family: { id: "f1", name: "Stilettos & Gala" },
  } as any,
  {
    id: "demo-shoe-1-37",
    name: "Stiletto Charol Tacón Aguja Red Carpet - Talla 37",
    sku: "VZ-101-37",
    salePrice: 159,
    adjustedPrice: 139,
    stock: 3,
    unit: "Par",
    description: "Acabado en charol brillante de primera calidad, plantilla confort acolchada y tacón aguja de 9 cm.",
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=700&auto=format&fit=crop",
    brand: { id: "b1", name: "TRICKS" },
    family: { id: "f1", name: "Stilettos & Gala" },
  } as any,
  {
    id: "demo-shoe-2-36",
    name: "Sandalia Plataforma Empress Velvet - Talla 36",
    sku: "VZ-205-36",
    salePrice: 145,
    adjustedPrice: 125,
    stock: 3,
    unit: "Par",
    description: "Textura aterciopelada premium con pulsera ajustable al tobillo y suela anatómica ligera de alto confort.",
    imageUrl: "https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?q=80&w=700&auto=format&fit=crop",
    brand: { id: "b2", name: "VEAZ" },
    family: { id: "f2", name: "Sandalias & Fiesta" },
  } as any,
  {
    id: "demo-shoe-2-37",
    name: "Sandalia Plataforma Empress Velvet - Talla 37",
    sku: "VZ-205-37",
    salePrice: 145,
    adjustedPrice: 125,
    stock: 5,
    unit: "Par",
    description: "Textura aterciopelada premium con pulsera ajustable al tobillo.",
    imageUrl: "https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?q=80&w=700&auto=format&fit=crop",
    brand: { id: "b2", name: "VEAZ" },
    family: { id: "f2", name: "Sandalias & Fiesta" },
  } as any,
  {
    id: "demo-shoe-3-36",
    name: "Zapatilla Urbana Chunky Leather Air - Talla 36",
    sku: "VZ-330-36",
    salePrice: 175,
    adjustedPrice: 149,
    stock: 4,
    unit: "Par",
    description: "Suela de amortiguación deportiva con cámara de aire oculta, cuero legítimo blanco perla e insertos reflectivos.",
    imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=700&auto=format&fit=crop",
    brand: { id: "b3", name: "CCOPLEX" },
    family: { id: "f3", name: "Zapatillas & Casual" },
  } as any,
  {
    id: "demo-shoe-4-39",
    name: "Mocasín Clásico Cuero Confort Hombre - Talla 39",
    sku: "VZ-410-39",
    salePrice: 189,
    adjustedPrice: 165,
    stock: 3,
    unit: "Par",
    description: "Confeccionado en 100% cuero vacuno genuino con costura reforzada a mano y plantilla ortopédica antitranspirante.",
    imageUrl: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=700&auto=format&fit=crop",
    brand: { id: "b3", name: "CCOPLEX" },
    family: { id: "f4", name: "Calzado Ejecutivo Hombre" },
  } as any,
];

interface CartItem {
  modelKey: string;
  modelName: string;
  size: string;
  price: number;
  qty: number;
  sku: string;
  imageUrl?: string;
  brandName?: string;
}

export default function VeazEstilezaPage() {
  const params = useParams<{ identifier?: string }>();
  const catalogRef = useRef<HTMLDivElement>(null);

  // Target Identifier Resolution (Default to official store 'veaz-estileza' -> beaz.estileza@gmail.com)
  const targetIdentifier = useMemo(() => {
    let raw = "";
    try {
      raw = decodeURIComponent(params.identifier || "").trim();
    } catch {
      raw = (params.identifier || "").trim();
    }

    const lower = raw.toLowerCase();
    if (lower && lower !== "catalogo" && lower !== "mi-tienda" && lower !== "tienda-oficial") {
      return raw;
    }

    // Default official showcase account requested by user
    return "veaz-estileza";
  }, [params.identifier]);

  // Main States
  const [storeInfo, setStoreInfo] = useState<CatalogStoreInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableFamilies, setAvailableFamilies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Banner Carousel Active Slide
  const [currentBannerSlide, setCurrentBannerSlide] = useState(0);

  // Selected Sizes per Model (Key: modelKey -> size)
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [isOmniOpen, setIsOmniOpen] = useState<boolean>(false);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState<boolean>(false);
  const omniRef = useRef<HTMLDivElement>(null);
  const [brandSearch, setBrandSearch] = useState<string>("");
  const [familySearch, setFamilySearch] = useState<string>("");
  const [colorSearch, setColorSearch] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("TODAS");
  const [selectedFamily, setSelectedFamily] = useState<string>("TODAS");
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>("TODAS");
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>("TODOS");
  const [priceRange, setPriceRange] = useState<"ALL" | "UNDER_70" | "70_100" | "100_150" | "OVER_150">("ALL");
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [onlyOffers, setOnlyOffers] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "stock">("featured");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Quick View Modal
  const [activeModelModal, setActiveModelModal] = useState<GroupedShoeModel | null>(null);

  // WhatsApp Shopping Cart Drawer
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartTotalItems = cart.reduce((acc, it) => acc + it.qty, 0);
  const cartTotalPrice = cart.reduce((acc, it) => acc + it.price * it.qty, 0);

  // Store Display Name
  const storeDisplayName = useMemo(() => {
    if (storeInfo?.businessName && storeInfo.businessName !== "Catálogo Digital" && !storeInfo.notFound) {
      return storeInfo.businessName;
    }
    return "Veaz Estileza";
  }, [storeInfo]);

  // Is Footwear / Shoes rubro?
  const isFootwearRubro = useMemo(() => {
    const r = (storeInfo?.businessRubro || storeInfo?.catalogConfig?.rubroKey || "CALZADOS").toLowerCase();
    return r.includes("calzado") || r.includes("zapato") || r.includes("zapatilla");
  }, [storeInfo]);

  // Clean WhatsApp Phone
  const storeWhatsAppPhone = useMemo(() => {
    let raw = (storeInfo as any)?.businessPhone || storeInfo?.catalogConfig?.whatsappPhone;
    if (!raw && storeInfo?.email === "beaz.estileza@gmail.com") {
      raw = "+51 929 962 458";
    }
    const clean = raw ? String(raw).replace(/\D/g, "") : "51929962458";
    if (clean.length === 9 && clean.startsWith("9")) return `51${clean}`;
    if (clean.startsWith("51")) return clean;
    return `51${clean}`;
  }, [storeInfo]);

  // Rubro Presets & Config
  const rubroConfig = useMemo(() => {
    const rawKey = storeInfo?.catalogConfig?.rubroKey || storeInfo?.businessRubro || "CALZADOS";
    return getRubroPreset(rawKey);
  }, [storeInfo]);

  // Resolved 3 High-Impact Banners (Tailored by Rubro or Custom Profile)
  const activeBanners: CatalogBannerItem[] = useMemo(() => {
    if (storeInfo?.catalogConfig?.banners && storeInfo.catalogConfig.banners.length >= 3) {
      return storeInfo.catalogConfig.banners.slice(0, 3);
    }

    if (!isFootwearRubro) {
      // Electrodomésticos Banners
      return [
        {
          id: "b-elec-1",
          title: "Línea Blanca & Refrigeración 2026",
          subtitle: "Refrigeradoras No Frost, Congeladoras y Conservadoras con Garantía Oficial de Fábrica",
          highlight: "TECNOLOGÍA INVERTER & AHORRO",
          badge: "GARANTÍA 1 AÑO",
          image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?q=80&w=1800&auto=format&fit=crop",
          ctaText: "Ver Refrigeradoras",
        },
        {
          id: "b-elec-2",
          title: "Cocinas, Hornos & Campanas",
          subtitle: "Cocinas Mabe e Indurama a Precios de Distribuidor Directo para tu Hogar",
          highlight: "MÁXIMA DURABILIDAD",
          badge: "PRECIOS DE FÁBRICA",
          image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1800&auto=format&fit=crop",
          ctaText: "Ver Cocinas",
        },
        {
          id: "b-elec-3",
          title: "Lavado, Audio & Electro Menor",
          subtitle: "Lavadoras automáticas de alta capacidad y parlantes JBL con despacho inmediato",
          highlight: "DESPACHO RÁPIDO",
          badge: "NUEVOS INGRESOS",
          image: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=1800&auto=format&fit=crop",
          ctaText: "Consultar Stock",
        },
      ];
    }

    // Footwear Banners (Veaz Estileza)
    return [
      {
        id: "b-shoe-1",
        title: "Colección Stilettos & Gala 2026",
        subtitle: "Tacones aguja, acabados en charol brillante, perla y terciopelo con curvas completas de serie",
        highlight: "ALTA ELEGANCIA & CONFORT",
        badge: "NUEVA COLECCIÓN",
        image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Explorar Colección",
      },
      {
        id: "b-shoe-2",
        title: "Sandalias de Fiesta & Calzado Confort",
        subtitle: "Modelos anatómicos ligeros y mocasines 100% cuero legítimo de alta resistencia",
        highlight: "CALIDAD Y ACABADOS PRO",
        badge: "STOCK EN SERIE",
        image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Ver Sandalias",
      },
      {
        id: "b-shoe-3",
        title: "Envíos Diarios a Todo el Perú",
        subtitle: "Despachos express con Shalom, Olva y verificación de tallas directa por WhatsApp",
        highlight: "ATENCIÓN PERSONALIZADA",
        badge: "COMPRA SEGURA",
        image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1800&auto=format&fit=crop",
        ctaText: "Pedir por WhatsApp",
      },
    ];
  }, [storeInfo, isFootwearRubro]);

  // Auto-advance banner carousel
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerSlide((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  // Load Store & Products with prioritized beaz.estileza@gmail.com resolution
  useEffect(() => {
    let isMounted = true;
    window.scrollTo(0, 0);
    setIsLoading(true);

    async function loadStore() {
      try {
        let storeData: CatalogStoreInfo | null = null;

        // 1. Try target identifier
        storeData = await getCatalogStoreInfoRequest(targetIdentifier).catch(() => null);

        // 2. If not found or default, fallback directly to official account beaz.estileza@gmail.com
        if (!storeData || storeData.notFound) {
          storeData = await getCatalogStoreInfoRequest("beaz.estileza@gmail.com").catch(() => null);
        }

        if (!isMounted) return;

        let rawProducts: Product[] = [];
        let brandsData: any[] = [];
        let familiesData: any[] = [];

        if (storeData && !storeData.notFound && storeData.id) {
          setStoreInfo(storeData);
          document.title = `${storeData.businessName} | Catálogo Web Oficial 2026`;

          const [pData, bData, fData] = await Promise.all([
            getCatalogProductsRequest(storeData.id).catch(() => []),
            getCatalogBrandsRequest(storeData.id).catch(() => []),
            getCatalogFamiliesRequest(storeData.id).catch(() => []),
          ]);

          rawProducts = Array.isArray(pData) ? pData : [];
          brandsData = Array.isArray(bData) ? bData : [];
          familiesData = Array.isArray(fData) ? fData : [];
        }

        if (rawProducts.length === 0) {
          try {
            const token = localStorage.getItem("token");
            if (token) {
              const myProds = await getProductsRequest().catch(() => []);
              if (Array.isArray(myProds) && myProds.length > 0) {
                rawProducts = myProds;
              }
            }
          } catch {}
        }

        if (rawProducts.length === 0) {
          setIsDemoMode(true);
          rawProducts = SHOWCASE_DEMO_PRODUCTS;
        } else {
          setIsDemoMode(false);
        }

        if (!isMounted) return;
        setProducts(rawProducts);

        // Derive brands
        const brandNames = new Set<string>();
        brandsData.forEach((b: any) => b?.name && brandNames.add(b.name.trim()));
        rawProducts.forEach((p) => p.brand?.name && brandNames.add(p.brand.name.trim()));
        setAvailableBrands(Array.from(brandNames).sort());

        // Derive families
        const famNames = new Set<string>();
        familiesData.forEach((f: any) => f?.name && famNames.add(f.name.trim()));
        rawProducts.forEach((p) => p.family?.name && famNames.add(p.family.name.trim()));
        setAvailableFamilies(Array.from(famNames).sort());
      } catch (err) {
        console.error("Error loading store catalog:", err);
        setProducts(SHOWCASE_DEMO_PRODUCTS);
        setIsDemoMode(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStore();
    return () => {
      isMounted = false;
    };
  }, [targetIdentifier]);

  // Group Footwear or Products
  const groupedModels = useMemo<GroupedShoeModel[]>(() => {
    return groupProductsBySku(products, isFootwearRubro, storeInfo?.businessRubro || rubroConfig.label);
  }, [products, isFootwearRubro, storeInfo, rubroConfig]);

  // Extract all distinct shoe sizes available in inventory
  const availableShoeSizes = useMemo<string[]>(() => {
    const sizeSet = new Set<string>();
    groupedModels.forEach((m) => {
      if (m.availableSizes && m.availableSizes.length > 0) {
        m.availableSizes.forEach((sz) => {
          if (sz && sz !== "Única" && sz.length <= 4) sizeSet.add(sz.trim());
        });
      }
    });
    return Array.from(sizeSet).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [groupedModels]);

  // Extract all distinct genuine product colors or tones available
  const availableColors = useMemo<{ name: string; hex: string; border?: boolean }[]>(() => {
    const map = new Map<string, { hex: string; border?: boolean }>();
    groupedModels.forEach((m) => {
      const c = (m.colorName || m.color || "").trim();
      if (c && c !== "Elegance" && c !== "Color" && c !== "Todos") {
        if (!map.has(c)) {
          map.set(c, { hex: m.colorHex || "#8E9CA3", border: m.colorBorder });
        }
      }
    });
    return Array.from(map.entries())
      .map(([name, meta]) => ({ name, hex: meta.hex, border: meta.border }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groupedModels]);

  // Filtered colors by search term ("buscadoricito")
  const filteredAvailableColors = useMemo(() => {
    if (!colorSearch.trim()) return availableColors;
    const q = colorSearch.toLowerCase().trim();
    return availableColors.filter((c) => c.name.toLowerCase().includes(q));
  }, [availableColors, colorSearch]);

  // Filter & Sort Engine
  const filteredModels = useMemo(() => {
    return groupedModels
      .filter((model) => {
        // Dedicated In-Grid Catalog Search or Top Search term
        const effectiveSearch = (catalogSearch || searchTerm).trim().toLowerCase();
        if (effectiveSearch) {
          const matchName = (model.name || "").toLowerCase().includes(effectiveSearch);
          const matchCleanName = (model.cleanName || "").toLowerCase().includes(effectiveSearch);
          const matchSku = (model.sku || "").toLowerCase().includes(effectiveSearch);
          const matchColor = (model.colorName || model.color || "").toLowerCase().includes(effectiveSearch);
          const matchBrand = (model.brandName || "").toLowerCase().includes(effectiveSearch);
          const matchFamily = (model.familyName || "").toLowerCase().includes(effectiveSearch);
          const matchDesc = (model.description || "").toLowerCase().includes(effectiveSearch);
          const matchSize = model.availableSizes?.some((sz) => (sz || "").toLowerCase().includes(effectiveSearch));
          if (!matchName && !matchCleanName && !matchSku && !matchColor && !matchBrand && !matchFamily && !matchDesc && !matchSize) {
            return false;
          }
        }

        // Brand filter
        if (selectedBrand !== "TODAS") {
          if ((model.brandName || "").trim().toLowerCase() !== selectedBrand.trim().toLowerCase()) {
            return false;
          }
        }

        // Family / Category filter
        if (selectedFamily !== "TODAS") {
          if ((model.familyName || "").trim().toLowerCase() !== selectedFamily.trim().toLowerCase()) {
            return false;
          }
        }

        // Size filter
        if (selectedSizeFilter !== "TODAS") {
          const hasSize = model.variants.some((v) => v.size === selectedSizeFilter && v.stock > 0);
          if (!hasSize) return false;
        }

        // Color filter
        if (selectedColorFilter !== "TODOS") {
          const modelColor = (model.colorName || model.color || "").toLowerCase();
          if (modelColor !== selectedColorFilter.toLowerCase()) {
            return false;
          }
        }

        // Price range filter
        const effPrice = model.adjustedPrice || model.minPrice;
        if (priceRange === "UNDER_70" && effPrice > 70) return false;
        if (priceRange === "70_100" && (effPrice < 70 || effPrice > 100)) return false;
        if (priceRange === "100_150" && (effPrice < 100 || effPrice > 150)) return false;
        if (priceRange === "OVER_150" && effPrice < 150) return false;

        // In Stock only
        if (onlyInStock && model.totalStock <= 0) return false;

        // Offers only
        if (onlyOffers && !model.hasOffer) return false;

        return true;
      })
      .sort((a, b) => {
        const priceA = a.adjustedPrice || a.minPrice;
        const priceB = b.adjustedPrice || b.minPrice;

        if (sortBy === "price-asc") return priceA - priceB;
        if (sortBy === "price-desc") return priceB - priceA;
        if (sortBy === "stock") return b.totalStock - a.totalStock;
        // Default: featured (in-stock first, then offers)
        if (a.totalStock > 0 && b.totalStock <= 0) return -1;
        if (b.totalStock > 0 && a.totalStock <= 0) return 1;
        if (a.hasOffer && !b.hasOffer) return -1;
        if (b.hasOffer && !a.hasOffer) return 1;
        return 0;
      });
  }, [
    groupedModels,
    searchTerm,
    catalogSearch,
    selectedBrand,
    selectedFamily,
    selectedSizeFilter,
    selectedColorFilter,
    priceRange,
    onlyInStock,
    onlyOffers,
    sortBy,
  ]);

  // Global Omnisearch (Command Palette) Results Engine
  const omniResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();

    // 1. Secciones del Sistema y Tienda Oficial
    const systemSections = [
      {
        id: "conocenos",
        title: "Conócenos / Quiénes Somos",
        subtitle: "Misión, visión, trayectoria y estándares de calidad",
        category: "Sección Web",
        icon: Sparkles,
        action: () => {
          document.getElementById("conocenos")?.scrollIntoView({ behavior: "smooth" });
          setIsOmniOpen(false);
        },
        keywords: ["conocenos", "quienes somos", "historia", "mision", "vision", "empresa", "nosotros", "calidad"],
      },
      {
        id: "ubicanos",
        title: "Ubícanos / Showroom & Tiendas Físicas",
        subtitle: storeInfo?.businessAddress || storeInfo?.catalogConfig?.locationAddress || "Dirección comercial, showroom presencial y mapa de llegada",
        category: "Ubicación",
        icon: MapPin,
        action: () => {
          document.getElementById("ubicanos")?.scrollIntoView({ behavior: "smooth" });
          setIsOmniOpen(false);
        },
        keywords: ["ubicanos", "direccion", "tienda", "local", "showroom", "mapa", "llegar", "donde", "ciudad", "sede"],
      },
      {
        id: "horarios",
        title: "Horarios de Atención Oficial",
        subtitle: storeInfo?.catalogConfig?.locationSchedule || "Días y horarios de apertura presencial y atención remota",
        category: "Atención",
        icon: Clock,
        action: () => {
          document.getElementById("horarios")?.scrollIntoView({ behavior: "smooth" });
          setIsOmniOpen(false);
        },
        keywords: ["horarios", "horario", "atencion", "abierto", "domingo", "sabado", "apertura", "cierre"],
      },
      {
        id: "envios",
        title: "Políticas de Envíos & Delivery Nacional",
        subtitle: "Despacho a todo el país vía agencias certificadas y entrega express",
        category: "Logística",
        icon: Truck,
        action: () => {
          document.getElementById("conocenos")?.scrollIntoView({ behavior: "smooth" });
          setIsOmniOpen(false);
        },
        keywords: ["envios", "envio", "delivery", "flete", "agencia", "despacho", "shalom", "marvisur", "olva", "lima", "provincias"],
      },
      {
        id: "pagos",
        title: "Medios de Pago & Facturación SUNAT",
        subtitle: "Yape, Plin, Transferencias BCP/BBVA, Factura y Boleta electrónica oficial",
        category: "Pagos & SUNAT",
        icon: CreditCard,
        action: () => {
          document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" });
          setIsOmniOpen(false);
        },
        keywords: ["pagos", "pago", "yape", "plin", "bcp", "bbva", "transferencia", "factura", "boleta", "ruc", "sunat", "tarjeta"],
      },
      {
        id: "chat-ia",
        title: "Asistente Virtual IA & Asesor en Vivo",
        subtitle: "Resuelve dudas del catálogo al instante o agenda una cita comercial",
        category: "Asistente en Vivo",
        icon: MessageCircle,
        action: () => {
          setIsLiveChatOpen(true);
          setIsOmniOpen(false);
        },
        keywords: ["chat", "asistente", "ia", "robot", "asesor", "consulta", "duda", "ayuda", "cita", "prospecto", "atencion virtual"],
      },
      {
        id: "whatsapp",
        title: "Contacto Directo Asesor WhatsApp",
        subtitle: `Chatear al +${storeWhatsAppPhone} con un asesor comercial`,
        category: "WhatsApp",
        icon: Phone,
        action: () => {
          window.open(
            `https://wa.me/${storeWhatsAppPhone}?text=${encodeURIComponent(
              `¡Hola ${storeDisplayName}! Deseo realizar una consulta comercial sobre sus productos.`
            )}`,
            "_blank"
          );
          setIsOmniOpen(false);
        },
        keywords: ["whatsapp", "asesor", "telefono", "celular", "llamar", "contacto", "vendedor"],
      },
      {
        id: "bolsa",
        title: "Bolsa de Compras / Carrito",
        subtitle: `Ver tus ${cartTotalItems} productos seleccionados`,
        category: "Bolsa",
        icon: ShoppingBag,
        action: () => {
          setIsCartOpen(true);
          setIsOmniOpen(false);
        },
        keywords: ["carrito", "bolsa", "pedido", "compra", "orden", "checkout"],
      },
      {
        id: "login",
        title: "Acceso al Sistema / Panel ERP POS",
        subtitle: "Ingreso exclusivo para administradores, cajeros y personal de tienda",
        category: "Sistema ERP",
        icon: ShieldCheck,
        action: () => {
          window.location.href = "/login";
        },
        keywords: ["login", "sistema", "erp", "pos", "admin", "caja", "facturacion", "ingreso", "clave", "usuario", "panel"],
      },
    ];

    const matchedSections = !q
      ? systemSections.slice(0, 6)
      : systemSections.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.subtitle.toLowerCase().includes(q) ||
            s.keywords.some((k) => k.includes(q))
        );

    // 2. Categorías coincidentes
    const matchedCategories = availableFamilies
      .filter((f) => !q || f.toLowerCase().includes(q))
      .slice(0, 4)
      .map((catName) => ({
        name: catName,
        count: groupedModels.filter((m) => (m.familyName || "").toLowerCase() === catName.toLowerCase()).length,
      }));

    // 3. Marcas coincidentes
    const matchedBrands = availableBrands
      .filter((b) => !q || b.toLowerCase().includes(q))
      .slice(0, 4)
      .map((brandName) => ({
        name: brandName,
        count: groupedModels.filter((m) => (m.brandName || "").toLowerCase() === brandName.toLowerCase()).length,
      }));

    // 4. Productos coincidentes
    const matchedProducts = !q
      ? []
      : groupedModels
          .filter((p) => {
            const name = (p.name || "").toLowerCase();
            const clean = (p.cleanName || "").toLowerCase();
            const sku = (p.sku || "").toLowerCase();
            const brand = (p.brandName || "").toLowerCase();
            const fam = (p.familyName || "").toLowerCase();
            return (
              name.includes(q) ||
              clean.includes(q) ||
              sku.includes(q) ||
              brand.includes(q) ||
              fam.includes(q)
            );
          })
          .slice(0, 5);

    return {
      sections: matchedSections,
      categories: matchedCategories,
      brands: matchedBrands,
      products: matchedProducts,
      totalCount: matchedSections.length + matchedCategories.length + matchedBrands.length + matchedProducts.length,
    };
  }, [globalSearch, groupedModels, availableFamilies, availableBrands, storeInfo, storeWhatsAppPhone, storeDisplayName, cartTotalItems]);

  // Click outside and keydown listeners for Global Omnisearch
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (omniRef.current && !omniRef.current.contains(e.target as Node)) {
        setIsOmniOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOmniOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOmniOpen(true);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Active Size per Model
  const getActiveSizeForModel = (model: GroupedShoeModel): string => {
    if (selectedSizes[model.key]) return selectedSizes[model.key];
    if (selectedSizeFilter !== "TODAS") {
      const matchFilter = model.variants.find((x) => x.size === selectedSizeFilter && x.stock > 0);
      if (matchFilter) return selectedSizeFilter;
    }
    if (model.availableSizes && model.availableSizes.length > 0) {
      for (const sz of model.availableSizes) {
        const v = model.variants.find((x) => x.size === sz);
        if (v && v.stock > 0) return sz;
      }
      return model.availableSizes[0];
    }
    return "Única";
  };

  const handleSelectSize = (modelKey: string, size: string) => {
    setSelectedSizes((prev) => ({ ...prev, [modelKey]: size }));
  };

  // Direct WhatsApp Order Handler
  const handleWhatsAppOrder = (model: GroupedShoeModel, customSize?: string) => {
    const size = customSize || getActiveSizeForModel(model);
    const activeVariant = model.variants.find((v) => v.size === size) || model.variants[0];
    const finalPrice = activeVariant?.adjustedPrice || activeVariant?.salePrice || model.adjustedPrice || model.minPrice;

    const details: string[] = [];
    if (model.brandName) details.push(`Marca: ${model.brandName}`);
    if (size && size !== "Única") details.push(`Talla/Variante: ${size}`);
    if (model.colorName && model.colorName !== "Elegance") details.push(`Color: ${model.colorName}`);
    if (model.sku) details.push(`Código: ${model.sku}`);

    const detailText = details.length > 0 ? `\n• Detalle: ${details.join(" | ")}` : "";
    const msg = `¡Hola *${storeDisplayName}*! 👋\n\nDeseo consultar el modelo *${model.name}* a *S/ ${finalPrice.toFixed(2)}*.${detailText}\n\n¿Tienen disponibilidad en tienda para entrega o envío?`;

    const url = `https://wa.me/${storeWhatsAppPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Add to Shopping Bag Drawer
  const handleAddToCart = (model: GroupedShoeModel, customSize?: string) => {
    const size = customSize || getActiveSizeForModel(model);
    const activeVariant = model.variants.find((v) => v.size === size) || model.variants[0];
    const finalPrice = activeVariant?.adjustedPrice || activeVariant?.salePrice || model.adjustedPrice || model.minPrice;

    setCart((prev) => {
      const existing = prev.find((it) => it.modelKey === model.key && it.size === size);
      if (existing) {
        return prev.map((it) =>
          it.modelKey === model.key && it.size === size ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [
        ...prev,
        {
          modelKey: model.key,
          modelName: model.name,
          size,
          price: finalPrice,
          qty: 1,
          sku: model.sku,
          imageUrl: model.imageUrl,
          brandName: model.brandName,
        },
      ];
    });

    toast.success(`Agregado: ${model.name} (${size !== "Única" ? `Talla ${size}` : "1 unidad"})`, { icon: "🛍️" });
  };

  const handleUpdateCartQty = (modelKey: string, size: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.modelKey === modelKey && it.size === size) {
            const newQty = it.qty + delta;
            return newQty > 0 ? { ...it, qty: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSendFullCartWhatsApp = () => {
    if (cart.length === 0) return;

    const total = cart.reduce((acc, it) => acc + it.price * it.qty, 0);
    const itemsList = cart
      .map(
        (it, idx) =>
          `${idx + 1}. *${it.modelName}* (${it.size !== "Única" ? `Talla: ${it.size}` : "Unidad"}) x${it.qty} = S/ ${(it.price * it.qty).toFixed(2)}`
      )
      .join("\n");

    const msg = `🛒 *NUEVO PEDIDO DE COMPRA*\nTienda: *${storeDisplayName}*\n\n${itemsList}\n\n*TOTAL A PAGAR: S/ ${total.toFixed(2)}*\n\nHola, deseo confirmar este pedido. ¿Me indican el número de cuenta o Yape para realizar el pago?`;

    const url = `https://wa.me/${storeWhatsAppPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setBrandSearch("");
    setCatalogSearch("");
    setFamilySearch("");
    setColorSearch("");
    setSelectedBrand("TODAS");
    setSelectedFamily("TODAS");
    setSelectedSizeFilter("TODAS");
    setSelectedColorFilter("TODOS");
    setPriceRange("ALL");
    setOnlyInStock(false);
    setOnlyOffers(false);
    setSortBy("featured");
  };

  const activeFilterCount =
    (searchTerm || catalogSearch ? 1 : 0) +
    (selectedBrand !== "TODAS" ? 1 : 0) +
    (selectedFamily !== "TODAS" ? 1 : 0) +
    (selectedSizeFilter !== "TODAS" ? 1 : 0) +
    (selectedColorFilter !== "TODOS" ? 1 : 0) +
    (priceRange !== "ALL" ? 1 : 0) +
    (onlyInStock ? 1 : 0) +
    (onlyOffers ? 1 : 0);

  // Resolved Store Logo from Business Profile
  const storeLogoUrl = useMemo(() => {
    if (storeInfo?.businessLogo) {
      return getReceiptAbsoluteUrl(storeInfo.businessLogo) || storeInfo.businessLogo;
    }
    if (storeInfo?.email === "beaz.estileza@gmail.com") {
      return "/veaz-logo.png";
    }
    return null;
  }, [storeInfo]);

  // Filtered available brands based on quick search
  const filteredAvailableBrands = useMemo(() => {
    if (!brandSearch.trim()) return availableBrands;
    const q = brandSearch.toLowerCase();
    return availableBrands.filter((b) => b.toLowerCase().includes(q));
  }, [availableBrands, brandSearch]);

  // Filtered available families / categories based on quick search
  const filteredAvailableFamilies = useMemo(() => {
    if (!familySearch.trim()) return availableFamilies;
    const q = familySearch.toLowerCase();
    return availableFamilies.filter((f) => f.toLowerCase().includes(q));
  }, [availableFamilies, familySearch]);

  // Live Store Schedule Status Indicator (Abierto Ahora / Cerrado)
  const storeOpenStatus = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1..6 = Monday..Saturday
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentDecimal = hours + minutes / 60;

    const isSunday = day === 0;
    const openTime = isSunday ? 10.0 : 8.5; // 8:30 AM or 10:00 AM
    const closeTime = isSunday ? 17.0 : 20.5; // 8:30 PM or 5:00 PM

    const isOpen = currentDecimal >= openTime && currentDecimal <= closeTime;
    return {
      isOpen,
      badgeText: isOpen ? "Abierto Ahora • Atención en Tienda y WhatsApp" : "Cerrado por el Momento • Deja tu Mensaje",
      badgeColor: isOpen ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-amber-50 text-amber-800 border-amber-300",
      dotColor: isOpen ? "bg-emerald-500" : "bg-amber-500",
      nextAction: isOpen ? "Respuesta inmediata en minutos" : "Te atenderemos a primera hora",
    };
  }, []);

  // Resolved Real Business Information with Intelligent Fallbacks
  const resolvedAddress = useMemo(() => {
    return (
      storeInfo?.catalogConfig?.locationAddress ||
      storeInfo?.businessAddress ||
      (isFootwearRubro
        ? "Av. Los Héroes 845, Galería Comercial El Sol - Stand 204, Lima"
        : "Av. Las Américas 1240, Frente a Plaza Bolognesi, Juliaca")
    );
  }, [storeInfo, isFootwearRubro]);

  const resolvedCity = useMemo(() => {
    return (
      storeInfo?.catalogConfig?.locationCity ||
      (storeInfo?.businessDepartment
        ? `${storeInfo.businessDistrict ? storeInfo.businessDistrict + ", " : ""}${storeInfo.businessProvince || storeInfo.businessDepartment}`
        : isFootwearRubro
        ? "Lima, Perú"
        : "Juliaca - Puno, Perú")
    );
  }, [storeInfo, isFootwearRubro]);

  const resolvedSchedule = useMemo(() => {
    return (
      storeInfo?.catalogConfig?.locationSchedule ||
      (isFootwearRubro
        ? "Lunes a Sábado: 9:00 AM - 8:30 PM • Domingos: 10:00 AM - 5:00 PM"
        : "Lunes a Sábado: 8:00 AM - 8:00 PM • Domingos: 9:00 AM - 3:00 PM")
    );
  }, [storeInfo, isFootwearRubro]);

  const resolvedLandmarks = useMemo(() => {
    return (
      storeInfo?.catalogConfig?.locationLandmarks ||
      (isFootwearRubro
        ? "A 2 cuadras de la estación del tren eléctrico. Estacionamiento privado y vigilancia permanente."
        : "A media cuadra del Centro Comercial. Fácil descarga de artefactos pesados y estacionamiento para clientes.")
    );
  }, [storeInfo, isFootwearRubro]);

  const resolvedMapsUrl = useMemo(() => {
    if (storeInfo?.catalogConfig?.locationMapsUrl) {
      return storeInfo.catalogConfig.locationMapsUrl;
    }
    const q = encodeURIComponent(`${resolvedAddress}, ${resolvedCity}`);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }, [storeInfo, resolvedAddress, resolvedCity]);

  const resolvedEmail = useMemo(() => {
    return storeInfo?.email || "contacto@tiendaoficial.pe";
  }, [storeInfo]);

  const resolvedInstagram = useMemo(() => {
    return storeInfo?.catalogConfig?.instagramUrl || (isFootwearRubro ? "https://instagram.com/veaz.estileza" : "");
  }, [storeInfo, isFootwearRubro]);

  const resolvedFacebook = useMemo(() => {
    return storeInfo?.catalogConfig?.facebookUrl || (isFootwearRubro ? "https://facebook.com/veazestileza" : "");
  }, [storeInfo, isFootwearRubro]);

  const resolvedTiktok = useMemo(() => {
    return storeInfo?.catalogConfig?.tiktokUrl || (isFootwearRubro ? "https://tiktok.com/@veazestileza" : "");
  }, [storeInfo, isFootwearRubro]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-14 h-14 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-black text-slate-800 tracking-tight">
          Cargando Catálogo Oficial...
        </h3>
        <p className="text-xs text-slate-500 mt-1">Conectando inventario, marcas y series en tiempo real</p>
      </div>
    );
  }

  const currentBanner = activeBanners[currentBannerSlide] || activeBanners[0];

  // Render Helper for Global Omnisearch Dropdown Palette
  const renderOmniDropdown = () => {
    if (!isOmniOpen) return null;
    return (
      <div
        ref={omniRef}
        className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[80vh] flex flex-col text-slate-800"
      >
        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-1.5 text-indigo-600 font-black">
            <Sparkles className="w-3.5 h-3.5" />
            BÚSQUEDA GLOBAL & COMANDOS
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-200/70 text-[10px] font-mono">
              ESC para cerrar
            </span>
            <button
              type="button"
              onClick={() => setIsOmniOpen(false)}
              className="p-1 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {/* 1. SECCIONES DEL SISTEMA Y WEB */}
          {omniResults.sections.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <Store className="w-3 h-3 text-indigo-500" />
                Secciones de la Tienda & Servicios
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {omniResults.sections.map((sec) => {
                  const IconComp = sec.icon;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={sec.action}
                      className="p-2.5 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 flex items-start gap-2.5 text-left transition-all cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-600 shrink-0 transition-colors">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 truncate block">
                            {sec.title}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0 ml-1">
                            {sec.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                          {sec.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. CATEGORÍAS COINCIDENTES */}
          {omniResults.categories.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-purple-500" />
                Categorías en Catálogo
              </div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {omniResults.categories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      setSelectedFamily(cat.name);
                      setCatalogSearch("");
                      catalogRef.current?.scrollIntoView({ behavior: "smooth" });
                      setIsOmniOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-200/70 text-purple-800">
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. MARCAS DISPONIBLES */}
          {omniResults.brands.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-amber-500" />
                Marcas en Catálogo
              </div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {omniResults.brands.map((br) => (
                  <button
                    key={br.name}
                    type="button"
                    onClick={() => {
                      setSelectedBrand(br.name);
                      setCatalogSearch("");
                      catalogRef.current?.scrollIntoView({ behavior: "smooth" });
                      setIsOmniOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>{br.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200/70 text-amber-800">
                      {br.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. PRODUCTOS COINCIDENTES (CON IMAGEN Y MODAL) */}
          {omniResults.products.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 mb-1.5 flex items-center gap-1.5">
                <Package className="w-3 h-3 text-emerald-500" />
                Productos Encontrados
              </div>
              <div className="space-y-1.5">
                {omniResults.products.map((prod) => (
                  <div
                    key={prod.key}
                    onClick={() => {
                      setActiveModelModal(prod);
                      setIsOmniOpen(false);
                    }}
                    className="p-2 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-slate-200 flex items-center gap-3 cursor-pointer transition-all group"
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-12 h-12 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-100"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 truncate">
                          {prod.cleanName || prod.name}
                        </span>
                        {prod.brandName && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 shrink-0">
                            {prod.brandName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                        <span>{prod.familyName}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">SKU: {prod.sku}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-indigo-700 block">
                        S/ {(prod.adjustedPrice || prod.minPrice).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 justify-end">
                        <Eye className="w-3 h-3" /> Ver detalle
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sin resultados */}
          {omniResults.totalCount === 0 && (
            <div className="py-8 text-center px-4 space-y-2">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                No encontramos coincidencias para "{globalSearch}"
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Intenta buscar por marcas (LG, Samsung), categorías (Refrigeradoras, Cocinas), o secciones como Ubícanos, Horarios, Envíos o Asistente.
              </p>
            </div>
          )}
        </div>

        {/* Footer con botón para ver en catálogo */}
        {globalSearch.trim() && (
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">
              Mostrando resultados sugeridos
            </span>
            <button
              type="button"
              onClick={() => {
                setCatalogSearch(globalSearch);
                catalogRef.current?.scrollIntoView({ behavior: "smooth" });
                setIsOmniOpen(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <span>Filtrar catálogo con "{globalSearch}"</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col w-full antialiased relative">
      {/* ──────────────────────────────────────────────────────────
          1. TOP ANNOUNCEMENT TICKER (LUMINOUS GRADIENT)
      ────────────────────────────────────────────────────────── */}
      <div className="w-full bg-gradient-to-r from-indigo-700 via-purple-700 to-sky-600 text-white text-[11px] py-2 px-4 shadow-xs">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 mx-auto sm:mx-0 font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
            <span className="truncate">
              {storeInfo?.catalogConfig?.announcement ||
                rubroConfig.announcement ||
                `Vitrina Oficial de ${storeDisplayName} • Pedidos directos a WhatsApp: ${storeWhatsAppPhone}`}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-5 text-[11px] font-semibold text-white/90">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-sky-200" /> Envíos a todo el Perú
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Garantía de Calidad
            </span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          2. HEADER NAVBAR (CON LOGO OFICIAL DEL NEGOCIO)
      ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4 lg:gap-8">
          {/* Brand Logo & Name */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3.5 cursor-pointer group select-none shrink-0"
          >
            {storeLogoUrl ? (
              <img
                src={storeLogoUrl}
                alt={storeDisplayName}
                className="h-12 w-auto max-w-[170px] object-contain rounded-xl border border-slate-200 p-1 bg-white shadow-2xs hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform shrink-0">
                {storeDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                  {storeDisplayName}
                </h1>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase tracking-wider hidden sm:inline-flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Oficial
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium truncate">
                {storeInfo?.businessRubro || rubroConfig.label}
              </span>
            </div>
          </div>

          {/* Search Bar (Global Omnisearch & Command Center) */}
          <div className="flex-1 max-w-xl hidden md:block relative">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setIsOmniOpen(true);
                }}
                onFocus={() => setIsOmniOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCatalogSearch(globalSearch);
                    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
                    setIsOmniOpen(false);
                  }
                  if (e.key === "Escape") {
                    setIsOmniOpen(false);
                  }
                }}
                placeholder="Búsqueda global: productos, marcas, categorías, tiendas, horarios..."
                className="w-full pl-11 pr-20 py-2.5 rounded-full bg-slate-100 hover:bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {globalSearch && (
                  <button
                    type="button"
                    onClick={() => setGlobalSearch("")}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                    title="Limpiar búsqueda global"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-mono font-bold text-slate-600">
                  Ctrl K
                </span>
              </div>
            </div>
            {renderOmniDropdown()}
          </div>

          {/* Quick Nav Anchors for Desktop & Tablet */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-black text-slate-600">
            <button
              type="button"
              onClick={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("conocenos")?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Conócenos
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("ubicanos")?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Ubícanos
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("horarios")?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Horarios
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1.5 rounded-xl hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Contacto
            </button>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Direct WhatsApp Concierge */}
            <a
              href={`https://wa.me/${storeWhatsAppPhone}?text=${encodeURIComponent(
                `¡Hola *${storeDisplayName}*! Estoy viendo su catálogo web y deseo consultar sobre una compra.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all shadow-2xs active:scale-95"
              title="Chatear con un asesor por WhatsApp"
            >
              <FaWhatsapp className="w-4 h-4 text-emerald-600" />
              <span className="hidden xl:inline">Asesor WhatsApp</span>
            </a>

            {/* Shopping Cart Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
              title="Ver mi bolsa de pedidos"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Bolsa</span>
              {cartTotalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 sm:static w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-xs animate-bounce">
                  {cartTotalItems}
                </span>
              )}
              {cartTotalPrice > 0 && (
                <span className="hidden md:inline font-black border-l border-white/20 pl-2">
                  S/ {cartTotalPrice.toFixed(0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar & Fast Nav Bar (Omnisearch Global) */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 md:hidden space-y-2 relative">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setIsOmniOpen(true);
              }}
              onFocus={() => setIsOmniOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCatalogSearch(globalSearch);
                  catalogRef.current?.scrollIntoView({ behavior: "smooth" });
                  setIsOmniOpen(false);
                }
              }}
              placeholder="Buscar productos, tiendas, horarios..."
              className="w-full pl-10 pr-9 py-2 rounded-full bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 font-medium focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {renderOmniDropdown()}

          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-[11px] font-bold text-slate-700">
            <button
              type="button"
              onClick={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 active:bg-slate-100"
            >
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("conocenos")?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 active:bg-slate-100"
            >
              Conócenos
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("ubicanos")?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 active:bg-slate-100"
            >
              Ubícanos
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("horarios")?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 active:bg-slate-100"
            >
              Horarios
            </button>
            <button
              type="button"
              onClick={() => document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" })}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs shrink-0 active:bg-slate-100"
            >
              Contacto
            </button>
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────
          3. HERO BANNER CAROUSEL (3 IMÁGENES DE ALTO IMPACTO - TAMAÑO ESTABLE)
      ────────────────────────────────────────────────────────── */}
      {/* ──────────────────────────────────────────────────────────
          3. HERO BANNER CAROUSEL (3 IMÁGENES DE ALTO IMPACTO - EXHIBICIÓN CLARA & PRO)
      ────────────────────────────────────────────────────────── */}
      {activeBanners.length > 0 && (
        <section className="relative w-full overflow-hidden bg-slate-950 text-white h-[420px] sm:h-[460px] lg:h-[500px] flex items-center select-none">
          <div className="absolute inset-0 z-0">
            <img
              src={currentBanner.image || (currentBanner as any).imageUrl}
              alt={currentBanner.title}
              className="w-full h-full object-cover object-center brightness-[0.92] contrast-[1.05] transition-all duration-700 transform scale-100"
            />
            {/* Gradiente cinematográfico sutil: asegura legibilidad del texto sin oscurecer ni tapar la fotografía */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent sm:bg-gradient-to-r sm:from-slate-950/80 sm:via-slate-950/30 sm:to-transparent" />
          </div>

          <div className="relative z-10 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
            {/* Tarjeta flotante glassmórfica compacta (No invade la fotografía del producto) */}
            <div className="bg-slate-950/45 backdrop-blur-md p-5 sm:p-8 rounded-3xl border border-white/20 max-w-lg shadow-2xl space-y-3.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-amber-300 text-xs font-black uppercase tracking-widest backdrop-blur-md shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {currentBanner.badge || currentBanner.highlight || "DESTACADO OFICIAL"}
              </span>

              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] text-white drop-shadow-md">
                {currentBanner.title}
              </h2>

              <p className="text-xs sm:text-sm lg:text-base text-slate-100 font-medium leading-relaxed max-w-md drop-shadow-sm">
                {currentBanner.subtitle}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })}
                  className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-xl flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>{currentBanner.ctaText || "Ver Colección"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href={`https://wa.me/${storeWhatsAppPhone}?text=${encodeURIComponent(
                    `Hola *${storeDisplayName}*, deseo consultar sobre la promoción de ${currentBanner.title}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-xl flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <FaWhatsapp className="w-4 h-4" />
                  <span>Pedir WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Botones de Navegación Glassmórficos */}
          {activeBanners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setCurrentBannerSlide((prev) => (prev > 0 ? prev - 1 : activeBanners.length - 1))
                }
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950/40 hover:bg-slate-950/80 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-20 border border-white/30 shadow-xl hover:scale-105 active:scale-95"
                aria-label="Banner anterior"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentBannerSlide((prev) => (prev + 1) % activeBanners.length)}
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950/40 hover:bg-slate-950/80 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-20 border border-white/30 shadow-xl hover:scale-105 active:scale-95"
                aria-label="Siguiente banner"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Indicadores Modernos Tipo Cápsula (Sin numeración, diseño pro) */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-slate-950/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/25 shadow-xl">
                {activeBanners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentBannerSlide(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      idx === currentBannerSlide
                        ? "w-8 h-2.5 bg-white shadow-md shadow-white/50"
                        : "w-2.5 h-2.5 bg-white/40 hover:bg-white/80"
                    }`}
                    aria-label={`Banner ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ──────────────────────────────────────────────────────────
          4. MAIN MULTI-COLUMN STORE LAYOUT (NO EMPTY SIDES)
      ────────────────────────────────────────────────────────── */}
      <main ref={catalogRef} className="flex-1 max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Layout Row with Left Filters, Central Grid & Right Confidence */}
        <div className="flex items-start gap-8">
          {/* ────────────────────────────────────────────────────────
              COLUMNA 1: FILTROS LATERALES PRO (STICKY DESKTOP)
          ──────────────────────────────────────────────────────── */}
          <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-28 self-start space-y-5 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 custom-scrollbar">
            {/* Header Filtros */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Filtros de Búsqueda</span>
              </div>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Limpiar ({activeFilterCount})</span>
                </button>
              )}
            </div>

            {/* 🏷️ FILTRO: DIFERENCIACIÓN DE MARCAS CON IDENTIDAD VISUAL & BUSCADOR COMPACTO */}
            {availableBrands.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span>Marcas ({availableBrands.length})</span>
                  </h4>
                  {selectedBrand !== "TODAS" && (
                    <button
                      type="button"
                      onClick={() => setSelectedBrand("TODAS")}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Ver todas
                    </button>
                  )}
                </div>

                {/* Buscador Rápido de Marca */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Filtrar marcas..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:bg-white focus:border-indigo-500 font-medium transition-all"
                  />
                  {brandSearch && (
                    <button
                      type="button"
                      onClick={() => setBrandSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Contenedor Compacto con Scroll Moderno (Evita que se extienda indefinidamente) */}
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedBrand("TODAS")}
                    className={`w-full text-left p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                      selectedBrand === "TODAS"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Todas las marcas</span>
                    <span className="text-[10px] opacity-70">{groupedModels.length}</span>
                  </button>

                  {filteredAvailableBrands.map((bName) => {
                    const bStyle = getBrandStyle(bName);
                    const isSelected = selectedBrand.toLowerCase() === bName.toLowerCase();
                    const count = groupedModels.filter((m) => (m.brandName || "").toLowerCase() === bName.toLowerCase()).length;

                    return (
                      <button
                        key={bName}
                        type="button"
                        onClick={() => setSelectedBrand(bName)}
                        className={`w-full text-left p-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer border ${
                          isSelected
                            ? `${bStyle.accentBg} ${bStyle.accentBorder} shadow-xs ring-2 ring-indigo-400`
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                            style={{ backgroundColor: bStyle.dotColor }}
                          />
                          <span className="truncate">{bName}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold ml-2">
                          {count}
                        </span>
                      </button>
                    );
                  })}

                  {filteredAvailableBrands.length === 0 && (
                    <div className="py-4 text-center text-slate-400 text-[11px]">
                      No se encontraron marcas con "{brandSearch}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 📁 FILTRO: CATEGORÍAS & FAMILIAS (CON SCROLL MODERNO & BUSCADOR) */}
            {availableFamilies.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Categorías ({availableFamilies.length})</span>
                  </h4>
                  {selectedFamily !== "TODAS" && (
                    <button
                      type="button"
                      onClick={() => setSelectedFamily("TODAS")}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Ver todas
                    </button>
                  )}
                </div>

                {/* Buscador Rápido de Categorías */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={familySearch}
                    onChange={(e) => setFamilySearch(e.target.value)}
                    placeholder="Filtrar categorías..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:bg-white focus:border-indigo-500 font-medium transition-all"
                  />
                  {familySearch && (
                    <button
                      type="button"
                      onClick={() => setFamilySearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Contenedor Compacto con Scroll */}
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedFamily("TODAS")}
                    className={`w-full text-left p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                      selectedFamily === "TODAS"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Todas las categorías</span>
                    <span className="text-[10px] opacity-70">{groupedModels.length}</span>
                  </button>

                  {filteredAvailableFamilies.map((fam) => {
                    const isSelected = selectedFamily.toLowerCase() === fam.toLowerCase();
                    const count = groupedModels.filter((m) => (m.familyName || "").toLowerCase() === fam.toLowerCase()).length;
                    return (
                      <button
                        key={fam}
                        type="button"
                        onClick={() => setSelectedFamily(fam)}
                        className={`w-full text-left p-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-300"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isSelected ? "bg-white" : "bg-indigo-500"
                            }`}
                          />
                          <span className="truncate">{fam}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 ${
                          isSelected ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}

                  {filteredAvailableFamilies.length === 0 && (
                    <div className="py-4 text-center text-slate-400 text-[11px]">
                      No se encontraron categorías con "{familySearch}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🎨 FILTRO: COLOR / TONO (CON SWATCHES, BUSCADOR COMPACTO & SCROLL PRO) */}
            {availableColors.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-indigo-600" />
                    <span>Color / Tono ({availableColors.length})</span>
                  </h4>
                  {selectedColorFilter !== "TODOS" && (
                    <button
                      type="button"
                      onClick={() => setSelectedColorFilter("TODOS")}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Ver todos
                    </button>
                  )}
                </div>

                {/* Buscador Rápido de Color */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={colorSearch}
                    onChange={(e) => setColorSearch(e.target.value)}
                    placeholder="Filtrar colores / tonos..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:bg-white focus:border-indigo-500 font-medium transition-all"
                  />
                  {colorSearch && (
                    <button
                      type="button"
                      onClick={() => setColorSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Contenedor Compacto con Scroll Moderno (Evita que se extienda y arruine el diseño) */}
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedColorFilter("TODOS")}
                    className={`w-full text-left p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                      selectedColorFilter === "TODOS"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Todos los colores / tonos</span>
                    <span className="text-[10px] opacity-70">{groupedModels.length}</span>
                  </button>

                  {filteredAvailableColors.map((c) => {
                    const isSelected = selectedColorFilter.toLowerCase() === c.name.toLowerCase();
                    const count = groupedModels.filter(
                      (m) => (m.colorName || m.color || "").toLowerCase() === c.name.toLowerCase()
                    ).length;

                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColorFilter(c.name)}
                        className={`w-full text-left p-2 rounded-xl text-xs font-black transition-all flex items-center justify-between cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-50 text-indigo-900 border-indigo-400 shadow-xs ring-2 ring-indigo-400"
                            : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs ${
                              c.border ? "border border-slate-300 ring-1 ring-black/10" : "border border-black/20"
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="truncate">{c.name}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold ml-2">
                          {count}
                        </span>
                      </button>
                    );
                  })}

                  {filteredAvailableColors.length === 0 && (
                    <div className="py-4 text-center text-slate-400 text-[11px]">
                      No se encontraron colores con "{colorSearch}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filtro: Rango de Precios */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-between">
                <span>Rango de Precio</span>
                <Tag className="w-3.5 h-3.5 text-slate-400" />
              </h4>
              <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                {[
                  { key: "ALL", label: "Todos los precios" },
                  { key: "UNDER_70", label: "Hasta S/ 70" },
                  { key: "70_100", label: "S/ 70 - S/ 100" },
                  { key: "100_150", label: "S/ 100 - S/ 150" },
                  { key: "OVER_150", label: "Más de S/ 150" },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    onClick={() => setPriceRange(opt.key as any)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      priceRange === opt.key
                        ? "bg-indigo-50 text-indigo-900 font-black border border-indigo-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <input
                      type="radio"
                      name="priceRange"
                      checked={priceRange === opt.key}
                      onChange={() => {}}
                      className="text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro: Tallas de Calzado (Solo si es rubro calzado) */}
            {isFootwearRubro && availableShoeSizes.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Tallas Disponibles
                  </h4>
                  {selectedSizeFilter !== "TODAS" && (
                    <button
                      type="button"
                      onClick={() => setSelectedSizeFilter("TODAS")}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      Ver todas
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSizeFilter("TODAS")}
                    className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      selectedSizeFilter === "TODAS"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Todas
                  </button>
                  {availableShoeSizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSizeFilter(sz)}
                      className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        selectedSizeFilter === sz
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-indigo-300"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro: Disponibilidad */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
              <label
                onClick={() => setOnlyInStock(!onlyInStock)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${onlyInStock ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="text-xs font-bold text-slate-700">Solo con Stock Inmediato</span>
                </div>
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={() => {}}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
              </label>

              <label
                onClick={() => setOnlyOffers(!onlyOffers)}
                className="flex items-center justify-between cursor-pointer select-none pt-2 border-t border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <Flame className={`w-4 h-4 ${onlyOffers ? "text-rose-600" : "text-slate-400"}`} />
                  <span className="text-xs font-bold text-slate-700">Solo Ofertas Especiales</span>
                </div>
                <input
                  type="checkbox"
                  checked={onlyOffers}
                  onChange={() => {}}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
              </label>
            </div>
          </aside>

          {/* ────────────────────────────────────────────────────────
              COLUMNA 2: ÁREA CENTRAL DE PRODUCTOS (GRILLA AMPLIA)
          ──────────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Top Toolbar con Buscador Exclusivo de Catálogo */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(true)}
                  className="lg:hidden px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>Filtros {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}</span>
                </button>

                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                    Catálogo de Artículos
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Mostrando <strong className="text-indigo-600">{filteredModels.length}</strong> de{" "}
                    {groupedModels.length} productos disponibles
                  </p>
                </div>
              </div>

              {/* BUSCADOR EXCLUSIVO DE CATÁLOGO (Direct In-Grid Search) */}
              <div className="flex-1 max-w-md w-full">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder={
                      isFootwearRubro
                        ? "Buscar en catálogo por modelo, talla o color..."
                        : "Buscar en catálogo por modelo, marca o código..."
                    }
                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-50 hover:bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-2xs"
                  />
                  {catalogSearch && (
                    <button
                      type="button"
                      onClick={() => setCatalogSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      title="Limpiar búsqueda del catálogo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Sorter Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="featured">✨ Más Recomendados</option>
                  <option value="price-asc">📉 Menor a Mayor Precio</option>
                  <option value="price-desc">📈 Mayor a Menor Precio</option>
                  <option value="stock">📦 Mayor Stock en Tienda</option>
                </select>
              </div>
            </div>

            {/* Active Filters Chips Bar */}
            {activeFilterCount > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Filtros activos:
                </span>
                {(catalogSearch || searchTerm) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    Búsqueda: "{catalogSearch || searchTerm}"
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => {
                        setCatalogSearch("");
                        setSearchTerm("");
                      }}
                    />
                  </span>
                )}
                {selectedBrand !== "TODAS" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    Marca: {selectedBrand}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBrand("TODAS")} />
                  </span>
                )}
                {selectedFamily !== "TODAS" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    Categoría: {selectedFamily}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedFamily("TODAS")} />
                  </span>
                )}
                {selectedSizeFilter !== "TODAS" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    Talla: {selectedSizeFilter}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedSizeFilter("TODAS")} />
                  </span>
                )}
                {selectedColorFilter !== "TODOS" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    Color: {selectedColorFilter}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedColorFilter("TODOS")} />
                  </span>
                )}
                {priceRange !== "ALL" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    Precio Filtrado
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setPriceRange("ALL")} />
                  </span>
                )}
                {onlyInStock && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    Solo en stock
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setOnlyInStock(false)} />
                  </span>
                )}
                {onlyOffers && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                    Solo ofertas
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setOnlyOffers(false)} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-bold text-rose-600 hover:underline ml-1"
                >
                  Borrar todos
                </button>
              </div>
            )}

            {/* ────────────────────────────────────────────────────────
                PRODUCT GRID (CON IDENTIDAD DE MARCA Y CURVAS)
            ──────────────────────────────────────────────────────── */}
            {filteredModels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredModels.map((model) => {
                  const activeSize = getActiveSizeForModel(model);
                  const activeVariant = model.variants.find((v) => v.size === activeSize) || model.variants[0];
                  const price = activeVariant?.salePrice || model.minPrice;
                  const adjPrice = activeVariant?.adjustedPrice || model.adjustedPrice;
                  const hasOffer = adjPrice !== null && adjPrice !== undefined && adjPrice > 0 && adjPrice < price;
                  const finalPrice = hasOffer ? (adjPrice as number) : price;
                  const discount = hasOffer ? Math.round(((price - (adjPrice as number)) / price) * 100) : 0;
                  const inStock = model.totalStock > 0;
                  const activeStock = activeVariant?.stock || 0;
                  const brandStyle = getBrandStyle(model.brandName);

                  return (
                    <div
                      key={model.key}
                      className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-xl hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between group"
                    >
                      {/* Top Image Showcase */}
                      <div
                        onClick={() => setActiveModelModal(model)}
                        className="relative w-full aspect-square bg-slate-50 overflow-hidden flex items-center justify-center p-4 cursor-pointer"
                      >
                        {model.imageUrl ? (
                          <img
                            src={model.imageUrl}
                            alt={model.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="w-16 h-16 text-slate-300" />
                        )}

                        {/* Distinct Brand Badge (IDENTIDAD DE MARCA) */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                          {model.brandName && (
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] uppercase border ${brandStyle.badgeBg} ${brandStyle.badgeText} ${brandStyle.badgeBorder}`}
                            >
                              {model.brandName}
                            </span>
                          )}
                          {model.specBadge && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider">
                              {model.specBadge}
                            </span>
                          )}
                        </div>

                        {/* Discount Badge */}
                        {hasOffer && (
                          <div className="absolute top-3 right-3 z-10">
                            <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md animate-pulse">
                              -{discount}%
                            </span>
                          </div>
                        )}

                        {/* Quick View Button on Hover */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveModelModal(model);
                          }}
                          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/95 text-slate-700 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-600 hover:text-white"
                          title="Vista rápida del producto"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Card Content & Interactive Specs/Curves */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          {/* Color Swatch & Category */}
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            {model.colorName && model.colorName !== "Elegance" ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                                  style={{ backgroundColor: model.colorHex }}
                                />
                                <span className="font-bold text-slate-600">{model.colorName}</span>
                              </div>
                            ) : (
                              <span className="font-bold text-indigo-600 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Original
                              </span>
                            )}
                            <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[120px]">
                              {model.familyName || "General"}
                            </span>
                          </div>

                          {/* Model Title */}
                          <h4
                            onClick={() => setActiveModelModal(model)}
                            className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 cursor-pointer"
                            title={model.name}
                          >
                            {model.cleanName || model.name}
                          </h4>

                          {/* 👠 FOOTWEAR SIZE CURVES OR SPECS */}
                          {isFootwearRubro && model.availableSizes && model.availableSizes.length > 0 ? (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                  Curva de Tallas:
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600">
                                  {activeStock > 0 ? `${activeStock} pares en T.${activeSize}` : `Agotado en T.${activeSize}`}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {model.availableSizes.map((sizeStr) => {
                                  const variant = model.variants.find((v) => v.size === sizeStr);
                                  const isCurrent = activeSize === sizeStr;
                                  const isAvailable = (variant?.stock || 0) > 0;

                                  return (
                                    <button
                                      key={sizeStr}
                                      type="button"
                                      onClick={() => handleSelectSize(model.key, sizeStr)}
                                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                        isCurrent
                                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs scale-105"
                                          : isAvailable
                                          ? "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-indigo-400"
                                          : "bg-slate-100 text-slate-400 border-dashed border-slate-200 line-through opacity-60"
                                      }`}
                                      title={`Talla ${sizeStr} - ${variant?.stock || 0} pares disponibles`}
                                    >
                                      {sizeStr}
                                      {isAvailable && (
                                        <span className="ml-1 text-[9px] font-bold opacity-80">
                                          ({variant?.stock})
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="text-[11px] text-slate-500 font-bold">
                                Garantía & Despacho:
                              </span>
                              <span className="text-[11px] text-emerald-600 font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Stock Inmediato
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Pricing & Order Actions */}
                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-black text-slate-900">
                                S/ {finalPrice.toFixed(2)}
                              </span>
                              {hasOffer && (
                                <span className="text-xs font-bold text-slate-400 line-through">
                                  S/ {price.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {inStock ? "Disponible" : "Bajo Pedido"}
                            </span>
                          </div>

                          {/* Dual Action Buttons */}
                          <div className="grid grid-cols-2 gap-2">
                            {/* Add to Shopping Bag */}
                            <button
                              type="button"
                              onClick={() => handleAddToCart(model, activeSize)}
                              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-800 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 active:scale-95"
                              title="Añadir a mi bolsa"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Añadir</span>
                            </button>

                            {/* WhatsApp Direct Order */}
                            <button
                              type="button"
                              onClick={() => handleWhatsAppOrder(model, activeSize)}
                              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
                              title="Pedir directo a WhatsApp"
                            >
                              <FaWhatsapp className="w-3.5 h-3.5" />
                              <span>{isFootwearRubro && activeSize !== "Única" ? `Pedir T.${activeSize}` : "Pedir WhatsApp"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
                <Package className="w-16 h-16 mx-auto text-slate-300" />
                <h4 className="text-lg font-black text-slate-800">
                  {searchTerm.trim()
                    ? `No se encontraron resultados para "${searchTerm}"`
                    : "No encontramos artículos con esos filtros"}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {searchTerm.trim()
                    ? "Intenta buscando por otra palabra clave, modelo, talla o categoría, o limpia el buscador."
                    : "Prueba cambiando la marca, el rango de precio o limpia los filtros activos para ver todo el inventario disponible."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {searchTerm.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-md cursor-pointer"
                    >
                      Limpiar Búsqueda
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-md cursor-pointer"
                  >
                    Restablecer Filtros
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ────────────────────────────────────────────────────────
              COLUMNA 3: LATERAL DE CONFIANZA & TOP VENTAS (2XL DESKTOP)
          ──────────────────────────────────────────────────────── */}
          <aside className="hidden 2xl:block w-72 shrink-0 space-y-5 sticky top-28 self-start">
            {/* Widget Asesoría WhatsApp en Vivo */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-3xl p-5 text-white shadow-lg shadow-emerald-600/15 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                    En Línea
                  </span>
                  <h4 className="text-sm font-black mt-1">Asesoría Directa</h4>
                </div>
              </div>

              <p className="text-xs text-emerald-100 font-medium leading-relaxed">
                ¿Dudas con modelos, garantía o envío a tu ciudad? Escríbenos directamente:
              </p>

              <a
                href={`https://wa.me/${storeWhatsAppPhone}?text=${encodeURIComponent(
                  `Hola *${storeDisplayName}*, solicito asistencia para realizar una compra.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-white text-emerald-900 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all shadow-md active:scale-95"
              >
                <FaWhatsapp className="w-4 h-4 text-emerald-600" />
                <span>Contactar Asesor</span>
              </a>
            </div>

            {/* Widget: Top Artículos Más Pedidos */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Más Pedidos esta Semana
                </h4>
              </div>

              <div className="space-y-3 pt-2">
                {groupedModels.slice(0, 3).map((item, idx) => {
                  const itemPrice = item.adjustedPrice || item.minPrice;
                  return (
                    <div
                      key={item.key}
                      onClick={() => setActiveModelModal(item)}
                      className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-100 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black text-indigo-600 block">
                          Top #{idx + 1}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                          {item.name}
                        </h5>
                        <span className="text-xs font-black text-slate-900">
                          S/ {itemPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Beneficios & Garantía de Tienda */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3.5 text-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Garantía & Compras
              </h4>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Truck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block">Envíos a Nivel Nacional</strong>
                    <span className="text-slate-500 text-[11px]">Agencias Olva, Shalom y Marvisur.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block">Garantía Certificada</strong>
                    <span className="text-slate-500 text-[11px]">Productos nuevos con respaldo directo.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CreditCard className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 block">Medios de Pago</strong>
                    <span className="text-slate-500 text-[11px]">Yape, Plin, BCP, BBVA y Efectivo.</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ──────────────────────────────────────────────────────────
          SECTION: CONÓCENOS & NUESTRA TRAYECTORIA
      ────────────────────────────────────────────────────────── */}
      <section id="conocenos" className="w-full bg-white border-y border-slate-200 py-16 lg:py-24 relative overflow-hidden">
        {/* Subtle Decorative Background Light */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black uppercase tracking-wider shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Nuestra Identidad & Calidad
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Conoce a <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{storeDisplayName}</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
              {storeInfo?.catalogConfig?.footerAbout ||
                (isFootwearRubro
                  ? "Especialistas en calzado femenino y masculino de alta costura, confort anatómico y series completas para toda ocasión. Pasión, estilo y durabilidad en cada par."
                  : "Distribuidor oficial de electrodomésticos, línea blanca y tecnología para el hogar. Garantía oficial de fábrica, marcas internacionales líderes y despacho seguro a todo el país.")}
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-b from-indigo-50/50 to-white rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-2xs hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">100% Calidad Garantizada</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {isFootwearRubro
                  ? "Selección rigurosa de cueros legítimos, acabados en charol de lujo y plantillas confort probadas para máxima durabilidad."
                  : "Equipos nuevos sellados de fábrica con garantía técnica oficial y respaldo directo de las marcas fabricantes."}
              </p>
            </div>

            <div className="bg-gradient-to-b from-purple-50/50 to-white rounded-3xl p-6 sm:p-8 border border-purple-100 shadow-2xs hover:shadow-xl hover:border-purple-300 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-purple-600/30 group-hover:scale-110 transition-transform">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Series & Curvas en Stock</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {isFootwearRubro
                  ? "Disponibilidad de curvas completas de tallas (35 al 40) en cada modelo. Verificación de stock en tiempo real antes de cada compra."
                  : "Modelos en múltiples capacidades, colores y especificaciones técnicas para adaptarse a tu espacio y presupuesto."}
              </p>
            </div>

            <div className="bg-gradient-to-b from-sky-50/50 to-white rounded-3xl p-6 sm:p-8 border border-sky-100 shadow-2xs hover:shadow-xl hover:border-sky-300 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-sky-600/30 group-hover:scale-110 transition-transform">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Envíos Diarios a Todo el Perú</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Despachos express y seguros mediante Olva Courier, Shalom Empresarial y agencias de carga directa con código de seguimiento en tiempo real.
              </p>
            </div>

            <div className="bg-gradient-to-b from-emerald-50/50 to-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-2xs hover:shadow-xl hover:border-emerald-300 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-emerald-600/30 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Atención & Asesoría Humana</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Te asesoramos personalmente por WhatsApp con fotos reales, guía de tallas y asistencia en compras al por mayor y menor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION: UBÍCANOS & DÓNDE ENCONTRARNOS (SHOWROOM & MAPA)
      ────────────────────────────────────────────────────────── */}
      <section id="ubicanos" className="w-full bg-[#f8fafc] py-16 lg:py-24 border-b border-slate-200">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Showroom & Puntos de Atención
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              ¿Dónde nos encuentras?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              Visita nuestra tienda física para probarte los modelos o retirar tus pedidos web directamente con total comodidad y seguridad.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Col 1: Card de Detalles de la Sede (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">{storeDisplayName}</h3>
                    <span className="text-xs font-bold text-slate-500">Sede Oficial & Showroom Autorizado</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase">
                      <MapPin className="w-4 h-4" />
                      <span>Dirección Física</span>
                    </div>
                    <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                      {resolvedAddress}
                    </p>
                    <span className="text-[11px] text-slate-500 block font-medium">
                      {resolvedCity}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase">
                      <Navigation className="w-4 h-4" />
                      <span>Referencias de Llegada</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 font-medium leading-snug">
                      {resolvedLandmarks}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-black uppercase">
                    <Clock className="w-4 h-4" />
                    <span>Horario de Atención en Sede</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    {resolvedSchedule}
                  </p>
                </div>

                {/* Facilidades */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="text-center p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                    <span className="text-base block mb-0.5">🚗</span>
                    <strong className="text-[11px] text-slate-800 block">Estacionamiento</strong>
                    <span className="text-[10px] text-slate-500">Vigilancia 24h</span>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                    <span className="text-base block mb-0.5">🛍️</span>
                    <strong className="text-[11px] text-slate-800 block">Retiro en Tienda</strong>
                    <span className="text-[10px] text-slate-500">Sin costo extra</span>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                    <span className="text-base block mb-0.5">💳</span>
                    <strong className="text-[11px] text-slate-800 block">Todos los Pagos</strong>
                    <span className="text-[10px] text-slate-500">Yape, POS y BCP</span>
                  </div>
                </div>
              </div>

              {/* Botones de Acción de Ubicación */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                <a
                  href={resolvedMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Abrir en Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
                </a>

                <a
                  href={`https://wa.me/${storeWhatsAppPhone}?text=${encodeURIComponent(
                    `¡Hola *${storeDisplayName}*! Quisiera saber cómo llegar a su tienda física.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                  <FaWhatsapp className="w-4 h-4" />
                  <span>Pedir Ubicación GPS</span>
                </a>
              </div>
            </div>

            {/* Col 2: Stylized Visual Map Card (5 cols) */}
            <div className="lg:col-span-5 relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-8 flex flex-col justify-between text-white min-h-[380px]">
              {/* Stylized Grid Overlay */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-amber-300 border border-white/20">
                  GPS & Navegación
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-white/90">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  Showroom Activo
                </span>
              </div>

              {/* Pin Centered Graphic */}
              <div className="relative z-10 my-auto text-center py-8">
                <div className="relative inline-flex items-center justify-center">
                  <span className="absolute w-24 h-24 rounded-full bg-indigo-500/30 animate-ping" />
                  <span className="absolute w-16 h-16 rounded-full bg-purple-500/40 animate-pulse" />
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl border-2 border-white/40">
                    <MapPin className="w-7 h-7 text-white" />
                  </div>
                </div>
                <h4 className="text-xl font-black mt-4 tracking-tight">{storeDisplayName}</h4>
                <p className="text-xs text-slate-300 max-w-xs mx-auto mt-1 line-clamp-2">
                  {resolvedAddress}
                </p>
              </div>

              <div className="relative z-10 pt-4 border-t border-white/10">
                <a
                  href={resolvedMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95"
                >
                  <Navigation className="w-4 h-4 text-indigo-600" />
                  <span>Iniciar Ruta GPS</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION: HORARIOS DE ATENCIÓN & ESTADO EN VIVO
      ────────────────────────────────────────────────────────── */}
      <section id="horarios" className="w-full bg-white py-16 lg:py-24 border-b border-slate-200">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Disponibilidad & Turnos
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Horarios de Atención
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              Conoce nuestros horarios de apertura y el estado de atención en tiempo real.
            </p>

            {/* Live Indicator Status Badge */}
            <div className="pt-2 flex justify-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs sm:text-sm font-black shadow-xs ${storeOpenStatus.badgeColor}`}>
                <span className={`w-3 h-3 rounded-full ${storeOpenStatus.dotColor} animate-pulse`} />
                <span>{storeOpenStatus.badgeText}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Lunes a Sábado */}
            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs hover:shadow-lg transition-all text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto font-black">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Lunes a Sábado</h3>
              <div className="text-xl font-black text-indigo-600">
                {isFootwearRubro ? "9:00 AM – 8:30 PM" : "8:00 AM – 8:00 PM"}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Horario corrido. Atención completa en tienda, prueba de modelos y despacho continuo de encomiendas.
              </p>
            </div>

            {/* Domingos y Feriados */}
            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs hover:shadow-lg transition-all text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto font-black">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Domingos y Feriados</h3>
              <div className="text-xl font-black text-purple-600">
                {isFootwearRubro ? "10:00 AM – 5:00 PM" : "9:00 AM – 3:00 PM"}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Atención especial para clientes y visitas familiares en showroom y consultas vía WhatsApp.
              </p>
            </div>

            {/* Canal WhatsApp 24/7 */}
            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs hover:shadow-lg transition-all text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto font-black">
                <FaWhatsapp className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Canal WhatsApp</h3>
              <div className="text-xl font-black text-emerald-600">
                24 Horas / 7 Días
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Recepción continua de pedidos, cotizaciones y mensajes. Respondemos con prioridad a primera hora.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          SECTION: CONTÁCTANOS & CANALES DIRECTOS DE COMUNICACIÓN
      ────────────────────────────────────────────────────────── */}
      <section id="contacto" className="w-full bg-[#f8fafc] py-16 lg:py-24 border-b border-slate-200">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-wider shadow-2xs">
              <MessageCircle className="w-3.5 h-3.5 text-rose-600" />
              Canales de Comunicación Directa
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Contáctanos Directamente
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              Estamos a tu disposición a través de nuestros canales oficiales. Haz clic en cualquiera de ellos para comunicarte al instante.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. WhatsApp */}
            <a
              href={`https://wa.me/${storeWhatsAppPhone}?text=${encodeURIComponent(
                `¡Hola *${storeDisplayName}*! Quisiera realizar una consulta sobre sus productos.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs hover:shadow-xl hover:border-emerald-400 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FaWhatsapp className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-1">WhatsApp Asesor</h3>
                <p className="text-xs text-slate-500 mb-3">Atención inmediata para consultas y pedidos</p>
                <span className="text-sm font-black text-emerald-600 block">+{storeWhatsAppPhone}</span>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-emerald-600">
                <span>Chatear ahora</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* 2. Llamada Telefónica */}
            <a
              href={`tel:+${storeWhatsAppPhone}`}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs hover:shadow-xl hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-1">Llamada Directa</h3>
                <p className="text-xs text-slate-500 mb-3">Comunícate con nuestra central telefónica</p>
                <span className="text-sm font-black text-indigo-600 block">+{storeWhatsAppPhone}</span>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-indigo-600">
                <span>Llamar a tienda</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* 3. Correo Electrónico */}
            <a
              href={`mailto:${resolvedEmail}`}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs hover:shadow-xl hover:border-sky-400 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-1">Correo Electrónico</h3>
                <p className="text-xs text-slate-500 mb-3">Cotizaciones formales y atención empresarial</p>
                <span className="text-sm font-black text-sky-600 block truncate" title={resolvedEmail}>
                  {resolvedEmail}
                </span>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-sky-600">
                <span>Enviar correo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </a>

            {/* 4. Redes Sociales */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Share2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-1">Redes Sociales</h3>
                <p className="text-xs text-slate-500 mb-4">Síguenos y descubre novedades diarias</p>

                <div className="flex flex-wrap gap-2">
                  {resolvedInstagram ? (
                    <a
                      href={resolvedInstagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold border border-pink-200 flex items-center gap-1.5 transition-colors"
                    >
                      <FaInstagram className="w-3.5 h-3.5" />
                      <span>Instagram</span>
                    </a>
                  ) : null}
                  {resolvedFacebook ? (
                    <a
                      href={resolvedFacebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1.5 transition-colors"
                    >
                      <FaFacebookF className="w-3.5 h-3.5" />
                      <span>Facebook</span>
                    </a>
                  ) : null}
                  {resolvedTiktok ? (
                    <a
                      href={resolvedTiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <FaTiktok className="w-3.5 h-3.5" />
                      <span>TikTok</span>
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-bold">
                Comunidad Oficial 2026
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          5. MOBILE FILTERS DRAWER
      ────────────────────────────────────────────────────────── */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm lg:hidden animate-fadeIn">
          <div className="w-full max-w-xs bg-white h-full p-5 overflow-y-auto space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>Filtros de Búsqueda</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Marcas en Móvil Compacto */}
              {availableBrands.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-800">Marcas ({availableBrands.length})</h4>
                    {selectedBrand !== "TODAS" && (
                      <button
                        type="button"
                        onClick={() => setSelectedBrand("TODAS")}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Ver todas
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      placeholder="Buscar marca..."
                      className="w-full pl-8 pr-6 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:bg-white"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedBrand("TODAS")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-between ${
                        selectedBrand === "TODAS"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>Todas las marcas</span>
                      <span className="text-[10px] opacity-70">{groupedModels.length}</span>
                    </button>
                    {filteredAvailableBrands.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBrand(b)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-between ${
                          selectedBrand === b
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span className="truncate">{b}</span>
                        <span className="text-[10px] opacity-70">
                          {groupedModels.filter((m) => (m.brandName || "").toLowerCase() === b.toLowerCase()).length}
                        </span>
                      </button>
                    ))}
                    {filteredAvailableBrands.length === 0 && (
                      <div className="py-2 text-center text-slate-400 text-[11px]">
                        No hay marcas con "{brandSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Categorías en Móvil Compacto con Scroll */}
              {availableFamilies.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-800">Categorías ({availableFamilies.length})</h4>
                    {selectedFamily !== "TODAS" && (
                      <button
                        type="button"
                        onClick={() => setSelectedFamily("TODAS")}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Ver todas
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={familySearch}
                      onChange={(e) => setFamilySearch(e.target.value)}
                      placeholder="Buscar categoría..."
                      className="w-full pl-8 pr-6 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:bg-white"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedFamily("TODAS")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-between ${
                        selectedFamily === "TODAS"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>Todas las categorías</span>
                      <span className="text-[10px] opacity-70">{groupedModels.length}</span>
                    </button>
                    {filteredAvailableFamilies.map((fam) => (
                      <button
                        key={fam}
                        type="button"
                        onClick={() => setSelectedFamily(fam)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-between ${
                          selectedFamily === fam
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span className="truncate">{fam}</span>
                        <span className="text-[10px] opacity-70">
                          {groupedModels.filter((m) => (m.familyName || "").toLowerCase() === fam.toLowerCase()).length}
                        </span>
                      </button>
                    ))}
                    {filteredAvailableFamilies.length === 0 && (
                      <div className="py-2 text-center text-slate-400 text-[11px]">
                        No hay categorías con "{familySearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Color / Tono en Móvil Compacto con Scroll */}
              {availableColors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Color / Tono ({availableColors.length})</span>
                    </h4>
                    {selectedColorFilter !== "TODOS" && (
                      <button
                        type="button"
                        onClick={() => setSelectedColorFilter("TODOS")}
                        className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Ver todos
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={colorSearch}
                      onChange={(e) => setColorSearch(e.target.value)}
                      placeholder="Buscar color..."
                      className="w-full pl-8 pr-6 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:bg-white"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedColorFilter("TODOS")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-between ${
                        selectedColorFilter === "TODOS"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>Todos los colores / tonos</span>
                      <span className="text-[10px] opacity-70">{groupedModels.length}</span>
                    </button>
                    {filteredAvailableColors.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColorFilter(c.name)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center justify-between ${
                          selectedColorFilter.toLowerCase() === c.name.toLowerCase()
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-3 h-3 rounded-full shrink-0 ${
                              c.border ? "border border-slate-300" : "border border-black/20"
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="truncate">{c.name}</span>
                        </div>
                        <span className="text-[10px] opacity-70">
                          {groupedModels.filter((m) => (m.colorName || m.color || "").toLowerCase() === c.name.toLowerCase()).length}
                        </span>
                      </button>
                    ))}
                    {filteredAvailableColors.length === 0 && (
                      <div className="py-2 text-center text-slate-400 text-[11px]">
                        No hay colores con "{colorSearch}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rango de Precios */}
              <div className="space-y-1 text-xs">
                <h4 className="text-xs font-black uppercase text-slate-800 mb-2">Precio</h4>
                {[
                  { key: "ALL", label: "Todos los precios" },
                  { key: "UNDER_70", label: "Hasta S/ 70" },
                  { key: "70_100", label: "S/ 70 - S/ 100" },
                  { key: "100_150", label: "S/ 100 - S/ 150" },
                  { key: "OVER_150", label: "Más de S/ 150" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPriceRange(opt.key as any)}
                    className={`w-full text-left p-2 rounded-xl font-semibold transition-colors ${
                      priceRange === opt.key ? "bg-indigo-50 text-indigo-900 font-black" : "hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Ver Resultados ({filteredModels.length})
              </button>
              <button
                type="button"
                onClick={clearAllFilters}
                className="w-full py-2 text-rose-600 text-xs font-bold hover:underline"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          6. QUICK VIEW MODEL MODAL (PRO, EXPANDIDO & ESTRUCTURADO)
      ────────────────────────────────────────────────────────── */}
      {activeModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl sm:rounded-[2.5rem] max-w-4xl xl:max-w-5xl w-full max-h-[92vh] relative shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col">
            {/* Botón flotante para cerrar */}
            <button
              type="button"
              onClick={() => setActiveModelModal(null)}
              className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-500 hover:text-slate-900 shadow-md backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border border-slate-200/80 hover:scale-105 active:scale-95"
              title="Cerrar vista rápida"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto custom-scrollbar flex-1">
              {/* 📷 COLUMNA IZQUIERDA: GRAN VITRINA VISUAL DEL PRODUCTO */}
              <div className="lg:col-span-6 bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-100 p-6 sm:p-10 flex flex-col justify-between items-center relative border-b lg:border-b-0 lg:border-r border-slate-200/80">
                {/* Badges superiores flotantes */}
                <div className="w-full flex items-center justify-between gap-2 z-10">
                  {activeModelModal.brandName ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase font-black border shadow-xs ${getBrandStyle(activeModelModal.brandName).badgeBg} ${getBrandStyle(activeModelModal.brandName).badgeText} ${getBrandStyle(activeModelModal.brandName).badgeBorder}`}
                    >
                      <Award className="w-3 h-3" />
                      <span>{activeModelModal.brandName}</span>
                    </span>
                  ) : <span />}

                  <div className="flex items-center gap-2">
                    {activeModelModal.hasOffer && (
                      <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-[11px] font-black shadow-md flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        <span>-{activeModelModal.discountPercent}% OFF</span>
                      </span>
                    )}
                    {activeModelModal.totalStock > 0 ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Stock Inmediato</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                        Agotado
                      </span>
                    )}
                  </div>
                </div>

                {/* Gran Imagen Principal */}
                <div className="w-full flex-1 flex items-center justify-center py-6 sm:py-8 my-auto min-h-[300px] sm:min-h-[400px]">
                  {activeModelModal.imageUrl ? (
                    <img
                      src={activeModelModal.imageUrl}
                      alt={activeModelModal.name}
                      className="max-h-[340px] sm:max-h-[440px] w-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500 select-none"
                    />
                  ) : (
                    <div className="w-36 h-36 rounded-3xl bg-slate-200/70 flex items-center justify-center text-slate-400">
                      <Package className="w-16 h-16" />
                    </div>
                  )}
                </div>

                {/* Sellos de Confianza al Pie de la Imagen */}
                <div className="w-full pt-4 border-t border-slate-200/80 flex items-center justify-around gap-2 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Garantía Oficial</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Envíos a Provincia</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Revisión Previa</span>
                  </span>
                </div>
              </div>

              {/* 📑 COLUMNA DERECHA: DATOS ESTRUCTURADOS, SPECS Y PEDIDO */}
              <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-5 bg-white">
                <div className="space-y-4">
                  {/* Taxonomía & SKU */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-indigo-600 font-black">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{activeModelModal.familyName}</span>
                    </span>
                    <span className="font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg text-[10px]">
                      SKU: {activeModelModal.sku}
                    </span>
                  </div>

                  {/* Título Principal */}
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {activeModelModal.name}
                  </h3>

                  {/* Bloque de Precios con Ahorro */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/80 flex items-baseline justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                        Precio Oficial en Vitrina
                      </span>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          S/ {(activeModelModal.adjustedPrice || activeModelModal.minPrice).toFixed(2)}
                        </span>
                        {activeModelModal.hasOffer && activeModelModal.adjustedPrice && (
                          <span className="text-sm font-bold text-slate-400 line-through">
                            S/ {activeModelModal.minPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    {activeModelModal.hasOffer && activeModelModal.adjustedPrice && (
                      <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200">
                        Ahorras S/ {(activeModelModal.minPrice - activeModelModal.adjustedPrice).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Ficha Técnica / Datos Estructurados */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {activeModelModal.colorName && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Color / Tono</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs ${
                              activeModelModal.colorBorder ? "border border-slate-300 ring-1 ring-black/10" : "border border-black/20"
                            }`}
                            style={{ backgroundColor: activeModelModal.colorHex || "#8A7D71" }}
                          />
                          <span className="font-black text-slate-800 truncate">{activeModelModal.colorName}</span>
                        </div>
                      </div>
                    )}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Stock Disponible</span>
                      <span className="font-black text-slate-800">
                        {activeModelModal.totalStock > 0 ? `${activeModelModal.totalStock} unidades` : "Consultar"}
                      </span>
                    </div>
                    {activeModelModal.specBadge && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Especificación</span>
                        <span className="font-black text-indigo-700 truncate block">{activeModelModal.specBadge}</span>
                      </div>
                    )}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Comprobante</span>
                      <span className="font-black text-slate-800 truncate block">Boleta o Factura</span>
                    </div>
                  </div>

                  {/* Variantes de Tallas (Solo si es rubro calzado) */}
                  {isFootwearRubro && activeModelModal.availableSizes && activeModelModal.availableSizes.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                        <span>Selecciona tu Talla en Serie:</span>
                        <span className="text-[11px] font-bold text-indigo-600">
                          Talla elegida: {getActiveSizeForModel(activeModelModal)}
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {activeModelModal.availableSizes.map((sz) => {
                          const v = activeModelModal.variants.find((x) => x.size === sz);
                          const isSelected = getActiveSizeForModel(activeModelModal) === sz;
                          const hasStock = (v?.stock || 0) > 0;
                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => handleSelectSize(activeModelModal.key, sz)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300"
                                  : hasStock
                                  ? "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                                  : "bg-slate-100 text-slate-400 border-dashed line-through"
                              }`}
                            >
                              Talla {sz} ({v?.stock || 0})
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Descripción Detallada */}
                  {activeModelModal.description && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Detalles del Producto
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 max-h-28 overflow-y-auto custom-scrollbar whitespace-pre-line">
                        {activeModelModal.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Acciones de Pedido y Contacto */}
                <div className="pt-4 border-t border-slate-100 space-y-2.5">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        handleWhatsAppOrder(activeModelModal);
                        setActiveModelModal(null);
                      }}
                      className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <FaWhatsapp className="w-4 h-4" />
                      <span>Pedir por WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddToCart(activeModelModal);
                        setActiveModelModal(null);
                      }}
                      className="py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
                      title="Añadir a la bolsa de compras"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span className="hidden sm:inline">Añadir a Bolsa</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          7. SHOPPING CART DRAWER (BOLSA DE PEDIDOS WHATSAPP)
      ────────────────────────────────────────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white h-full p-6 shadow-2xl flex flex-col justify-between">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Bolsa de Pedidos</h3>
                    <span className="text-xs text-slate-500">
                      {cartTotalItems} {cartTotalItems === 1 ? "artículo" : "artículos"} seleccionados
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="py-4 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)]">
                {cart.length > 0 ? (
                  cart.map((it) => (
                    <div
                      key={`${it.modelKey}-${it.size}`}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-100 shrink-0 flex items-center justify-center">
                        {it.imageUrl ? (
                          <img
                            src={it.imageUrl}
                            alt={it.modelName}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{it.modelName}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          {it.size !== "Única" && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold">
                              Talla: {it.size}
                            </span>
                          )}
                          <span>S/ {it.price.toFixed(2)} c/u</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(it.modelKey, it.size, -1)}
                          className="w-7 h-7 rounded-lg bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer border border-slate-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black text-slate-900">{it.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(it.modelKey, it.size, 1)}
                          className="w-7 h-7 rounded-lg bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer border border-slate-200"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">Tu bolsa está vacía</p>
                    <p className="text-xs">Selecciona un modelo y haz clic en "Añadir".</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cart Footer */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Total del Pedido
                </span>
                <span className="text-2xl font-black text-slate-900">
                  S/ {cartTotalPrice.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleSendFullCartWhatsApp}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <FaWhatsapp className="w-4 h-4" />
                <span>Enviar Pedido a WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          8. CHAT AUTOMÁTICO DE PROSPECTOS Y CITAS (CONCIERGE)
      ────────────────────────────────────────────────────────── */}
      <StoreVirtualChatWidget
        storeName={storeDisplayName}
        storeId={storeInfo?.id}
        storeSlug={storeInfo?.businessSlug || targetIdentifier}
        whatsappPhone={storeWhatsAppPhone}
        rubro={storeInfo?.businessRubro || rubroConfig.label}
        products={groupedModels}
        onOpenProductModal={(product) => setActiveModelModal(product)}
        externalIsOpen={isLiveChatOpen}
        onExternalOpenChange={(open) => setIsLiveChatOpen(open)}
      />

      {/* ──────────────────────────────────────────────────────────
          9. FOOTER (CLEAN, COMPLETE & PROFESSIONAL)
      ────────────────────────────────────────────────────────── */}
      <footer className="w-full bg-slate-900 text-slate-400 py-12 text-xs border-t border-slate-800">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            {/* Col 1: Store Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {storeLogoUrl ? (
                  <img
                    src={storeLogoUrl}
                    alt={storeDisplayName}
                    className="h-10 w-auto object-contain rounded-xl p-1 bg-white"
                  />
                ) : (
                  <span className="text-white font-black text-xl">{storeDisplayName}</span>
                )}
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Vitrina oficial de {storeDisplayName}. Atención personalizada, verificación de stock en tiempo real y garantía certificada.
              </p>
              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <a href={`tel:+${storeWhatsAppPhone}`} className="hover:text-emerald-300">
                    +{storeWhatsAppPhone}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{resolvedAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">{resolvedSchedule}</span>
                </div>
              </div>
            </div>

            {/* Col 2: Navigation & Anchors */}
            <div className="space-y-2.5">
              <h5 className="text-white font-black text-xs uppercase tracking-wider">Explorar Vitrina</h5>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    • Catálogo y Modelos
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => document.getElementById("conocenos")?.scrollIntoView({ behavior: "smooth" })}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    • Conócenos y Calidad
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => document.getElementById("ubicanos")?.scrollIntoView({ behavior: "smooth" })}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    • Ubícanos (Showroom y Sede)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => document.getElementById("horarios")?.scrollIntoView({ behavior: "smooth" })}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    • Horarios de Atención
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => document.getElementById("contacto")?.scrollIntoView({ behavior: "smooth" })}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    • Contáctanos Directo
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Envíos & Garantías */}
            <div className="space-y-2.5">
              <h5 className="text-white font-black text-xs uppercase tracking-wider">Envíos & Seguridad</h5>
              <ul className="space-y-2">
                <li>• Envíos diarios a Lima y todas las provincias</li>
                <li>• Despachos por Olva Courier, Shalom y agencias</li>
                <li>• Verificación de stock antes de despachar</li>
                <li>• Emisión de Boletas y Facturas electrónicas</li>
                <li>• Retiro presencial en tienda sin recargo</li>
              </ul>
            </div>

            {/* Col 4: Métodos de Pago & Redes */}
            <div className="space-y-2.5">
              <h5 className="text-white font-black text-xs uppercase tracking-wider">Medios de Pago</h5>
              <p className="text-slate-400 text-xs">
                Aceptamos transferencias BCP, BBVA, Interbank, Yape, Plin y pagos en tienda.
              </p>
              <div className="pt-1 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">Yape</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">Plin</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">BCP</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">Interbank</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">BBVA</span>
              </div>

              {(resolvedInstagram || resolvedFacebook || resolvedTiktok) && (
                <div className="pt-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Redes Oficiales:
                  </span>
                  <div className="flex items-center gap-2">
                    {resolvedInstagram && (
                      <a
                        href={resolvedInstagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-pink-600 text-white flex items-center justify-center transition-colors"
                      >
                        <FaInstagram className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {resolvedFacebook && (
                      <a
                        href={resolvedFacebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-colors"
                      >
                        <FaFacebookF className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {resolvedTiktok && (
                      <a
                        href={resolvedTiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
                      >
                        <FaTiktok className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <span>&copy; {new Date().getFullYear()} {storeDisplayName}. Todos los derechos reservados.</span>
            <span>Impulsado por <strong>THINK Sistema de Gestión ERP & Catálogo Digital</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
