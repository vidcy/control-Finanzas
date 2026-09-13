import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  X,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  MessageCircle,
  MapPin,
  Clock,
  Layers,
  Award,
  LayoutDashboard,
  FileDown,
  Flame,
  ChevronLeft,
  ChevronRight,
  Check,
  Navigation,
  Compass,
  ExternalLink,
} from "lucide-react";
import { FaInstagram, FaFacebookF, FaTiktok } from "react-icons/fa6";
import VeazLogo, { VeazCrownIcon } from "../components/veaz/VeazLogo";
import { VeazBrandLogo } from "../components/veaz/VeazBrandLogo";
import VeazHeroSlider from "../components/veaz/VeazHeroSlider";
import VeazModelGallery from "../components/veaz/VeazModelGallery";
import VeazShoeCard from "../components/veaz/VeazShoeCard";
import VeazImageLightbox from "../components/veaz/VeazImageLightbox";
import { exportCatalogToPdf } from "../utils/veazPdfExport";
import {
  groupProductsBySku,
  type GroupedShoeModel,
} from "../components/veaz/veazTypes";
import {
  getCatalogProductsRequest,
  getCatalogBrandsRequest,
  getCatalogFamiliesRequest,
  type Product,
} from "../services/product.api";

export default function VeazEstilezaPage() {
  const catalogRef = useRef<HTMLDivElement>(null);
  const brandRailRef = useRef<HTMLDivElement>(null);
  const footerRailRef = useRef<HTMLDivElement>(null);

  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("TODAS");
  const [selectedFamily, setSelectedFamily] = useState<string>("TODAS");
  const [selectedSize, setSelectedSize] = useState<string>("TODAS");
  const [onlyOffers, setOnlyOffers] = useState<boolean>(false);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "stock">("featured");
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Lightbox state
  const [activeLightboxShoe, setActiveLightboxShoe] = useState<GroupedShoeModel | null>(null);

  // Brands and families purely from DB
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableFamilies, setAvailableFamilies] = useState<string[]>([]);

  // Page title
  useEffect(() => {
    document.title = "VEAZ ESTILEZA | Alta Costura en Calzados Femeninos, Tacos & Stilettos";
    window.scrollTo(0, 0);
  }, []);

  // Fetch real products, brands and families from backend
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [prodsData, brandsData, familiesData] = await Promise.all([
          getCatalogProductsRequest().catch(() => []),
          getCatalogBrandsRequest().catch(() => []),
          getCatalogFamiliesRequest().catch(() => []),
        ]);

        if (!isMounted) return;

        if (Array.isArray(prodsData)) {
          setProducts(prodsData);
        }

        // Collect brand names directly from DB data
        const brandNames = new Set<string>();
        if (Array.isArray(brandsData) && brandsData.length > 0) {
          brandsData.forEach((b: any) => b?.name && brandNames.add(b.name.trim()));
        }
        if (Array.isArray(prodsData) && prodsData.length > 0) {
          prodsData.forEach((p) => p.brand?.name && brandNames.add(p.brand.name.trim()));
        }
        setAvailableBrands(Array.from(brandNames).sort());

        // Collect family / grupo names directly from DB data
        const famNames = new Set<string>();
        if (Array.isArray(familiesData) && familiesData.length > 0) {
          familiesData.forEach((f: any) => f?.name && famNames.add(f.name.trim()));
        }
        if (Array.isArray(prodsData) && prodsData.length > 0) {
          prodsData.forEach((p) => p.family?.name && famNames.add(p.family.name.trim()));
        }
        setAvailableFamilies(Array.from(famNames).sort());
      } catch (err) {
        console.error("Error loading VEAZ catalog products:", err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Consolidate and group products by model name and series
  const groupedShoeModels = useMemo(() => {
    if (products.length > 0) {
      return groupProductsBySku(products);
    }
    return [];
  }, [products]);

  // Model counts per brand
  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    groupedShoeModels.forEach((s) => {
      const b = s.brandName.toUpperCase();
      counts[b] = (counts[b] || 0) + 1;
    });
    return counts;
  }, [groupedShoeModels]);

  // Model counts per family
  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    groupedShoeModels.forEach((s) => {
      const f = s.familyName.toUpperCase();
      counts[f] = (counts[f] || 0) + 1;
    });
    return counts;
  }, [groupedShoeModels]);

  // Extract all distinct shoe sizes present in current grouped models with counts
  const allSizesWithCounts = useMemo(() => {
    const sizeMap = new Map<string, number>();
    groupedShoeModels.forEach((m) => {
      m.availableSizes.forEach((s) => {
        sizeMap.set(s, (sizeMap.get(s) || 0) + 1);
      });
    });
    const sizes = Array.from(sizeMap.keys()).sort((a, b) => parseFloat(a) - parseFloat(b));
    return sizes.map((sz) => ({ size: sz, count: sizeMap.get(sz) || 0 }));
  }, [groupedShoeModels]);

  // Count active offers
  const totalOffersCount = useMemo(() => {
    return groupedShoeModels.filter((s) => s.hasOffer).length;
  }, [groupedShoeModels]);

  // Filtered and sorted shoes
  const filteredShoes = useMemo(() => {
    return groupedShoeModels
      .filter((shoe) => {
        // Search term (name, sku, color, family, brand, heel)
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          const matchesName = shoe.name.toLowerCase().includes(query);
          const matchesSku = shoe.sku.toLowerCase().includes(query);
          const matchesColor = shoe.color.toLowerCase().includes(query);
          const matchesBrand = shoe.brandName.toLowerCase().includes(query);
          const matchesFamily = shoe.familyName.toLowerCase().includes(query);
          const matchesHeel = shoe.heelHeight?.toLowerCase().includes(query);
          if (!matchesName && !matchesSku && !matchesColor && !matchesBrand && !matchesFamily && !matchesHeel) {
            return false;
          }
        }

        // Only offers toggle
        if (onlyOffers && !shoe.hasOffer) {
          return false;
        }

        // Only in-stock toggle
        if (onlyInStock && shoe.totalStock <= 0) {
          return false;
        }

        // Brand filter
        if (selectedBrand !== "TODAS") {
          if (shoe.brandName.toLowerCase() !== selectedBrand.toLowerCase()) {
            return false;
          }
        }

        // Family filter
        if (selectedFamily !== "TODAS") {
          if (shoe.familyName.toLowerCase() !== selectedFamily.toLowerCase()) {
            return false;
          }
        }

        // Size filter
        if (selectedSize !== "TODAS") {
          if (!shoe.availableSizes.includes(selectedSize)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.minPrice - b.minPrice;
        if (sortBy === "price-desc") return b.minPrice - a.minPrice;
        if (sortBy === "stock") return b.totalStock - a.totalStock;
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [groupedShoeModels, searchTerm, selectedBrand, selectedFamily, selectedSize, onlyOffers, onlyInStock, sortBy]);

  const scrollToCatalog = () => {
    if (catalogRef.current) {
      catalogRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectBrand = (brand: string) => {
    setSelectedBrand(brand);
    scrollToCatalog();
  };

  const handleSelectCategoryFromHeroOrModel = (cat: string) => {
    setSelectedFamily(cat);
    scrollToCatalog();
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportCatalogToPdf(filteredShoes, {
        brandFilter: selectedBrand !== "TODAS" ? selectedBrand : undefined,
        familyFilter: selectedFamily !== "TODAS" ? selectedFamily : undefined,
      });
    } catch (err) {
      console.error("Error exporting catalog to PDF:", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  // DYNAMIC CURSOR HOVER SCROLL LOGIC FOR FOOTER SHOWCASE RAIL
  // ──────────────────────────────────────────────────────────
  const isHoveringFooterRail = useRef<boolean>(false);
  const railVelocity = useRef<number>(0);

  useEffect(() => {
    let animId: number;
    const step = () => {
      if (footerRailRef.current && isHoveringFooterRail.current && Math.abs(railVelocity.current) > 0.05) {
        footerRailRef.current.scrollLeft += railVelocity.current;
      }
      animId = requestAnimationFrame(step);
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleFooterRailMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = footerRailRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const rightZone = width * 0.70;
    const leftZone = width * 0.30;

    if (x > rightZone) {
      railVelocity.current = ((x - rightZone) / (width - rightZone)) * 14;
    } else if (x < leftZone) {
      railVelocity.current = -((leftZone - x) / leftZone) * 14;
    } else {
      railVelocity.current = 0;
    }
  };

  const handleFooterRailMouseEnter = () => {
    isHoveringFooterRail.current = true;
  };

  const handleFooterRailMouseLeave = () => {
    isHoveringFooterRail.current = false;
    railVelocity.current = 0;
  };

  const scrollFooterRail = (direction: "left" | "right") => {
    if (!footerRailRef.current) return;
    const distance = 320;
    footerRailRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  const scrollBrandRail = (direction: "left" | "right") => {
    if (!brandRailRef.current) return;
    const distance = 240;
    brandRailRef.current.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  const hasActiveFilters =
    selectedBrand !== "TODAS" ||
    selectedFamily !== "TODAS" ||
    selectedSize !== "TODAS" ||
    onlyOffers ||
    onlyInStock ||
    searchTerm.trim() !== "";

  const clearAllFilters = () => {
    setSelectedBrand("TODAS");
    setSelectedFamily("TODAS");
    setSelectedSize("TODAS");
    setOnlyOffers(false);
    setOnlyInStock(false);
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 font-sans selection:bg-amber-200 selection:text-amber-950 overflow-x-hidden">
      {/* ──────────────────────────────────────────────────────────
          1. LUXURY LIGHT GLASS NAVBAR (FULL SCREEN WIDTH)
      ────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#EDE2D4] shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all">
        <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-16 h-20 md:h-24 flex items-center justify-between gap-4">
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="cursor-pointer group flex items-center"
          >
            <VeazLogo size="md" showSubtitle={true} />
          </div>

          <nav className="hidden xl:flex items-center gap-8 font-cinzel text-xs font-bold tracking-[0.2em] text-slate-700 uppercase">
            <button
              onClick={scrollToCatalog}
              className="hover:text-amber-800 transition-colors cursor-pointer"
            >
              Colección Calzados
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("pasarela-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-amber-800 transition-colors cursor-pointer"
            >
              Pasarela Editorial
            </button>
            <button
              onClick={() => {
                const el = document.getElementById("ubicacion-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-amber-800 transition-colors cursor-pointer"
            >
              Ubicación Boutique
            </button>
            <button
              onClick={() => {
                setSelectedBrand("TODAS");
                setOnlyOffers(true);
                scrollToCatalog();
              }}
              className="text-rose-600 hover:text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Ofertas VIP</span>
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-48 lg:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-700" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar modelo, SKU, taco..."
                className="w-full pl-9 pr-8 py-2 rounded-full bg-[#FAF7F2] border border-[#E8DCBE] text-xs text-slate-900 placeholder:text-slate-400 font-outfit focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <a
              href="https://wa.me/51929962458?text=Hola%20VEAZ%20ESTILEZA,%20deseo%20asesor%C3%ADa%20personalizada%20de%20calzados"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-cinzel text-xs font-bold tracking-wider shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
              <span>WhatsApp</span>
            </a>

            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 font-outfit text-xs font-semibold transition-all shadow-xs"
              title="Ir al sistema financiero THINK"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Panel THINK</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────
          2. HORIZONTAL HERO SLIDER
      ────────────────────────────────────────────────────────── */}
      <div className="pt-20 md:pt-24 w-full">
        <VeazHeroSlider
          onSelectCategory={handleSelectCategoryFromHeroOrModel}
          onExploreCatalog={scrollToCatalog}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────
          3. LUXURY VALUE TICKER / MARQUEE
      ────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#FAF6F0] via-[#FFFDF9] to-[#F5EFEB] border-y border-[#EDE2D4] py-4 overflow-hidden select-none">
        <div className="animate-marquee flex items-center gap-12 whitespace-nowrap">
          {[1, 2].map((iter) => (
            <React.Fragment key={iter}>
              <div className="inline-flex items-center gap-3 text-xs font-cinzel tracking-[0.25em] text-amber-900 font-bold uppercase">
                <VeazCrownIcon size={15} />
                <span>100% ALTA COSTURA EN CALZADOS DE DAMA</span>
              </div>
              <span className="text-amber-400 font-bold">•</span>
              <div className="inline-flex items-center gap-2 text-xs font-cinzel tracking-[0.25em] text-slate-700 font-semibold uppercase">
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>SERIES DE TALLAS CONSOLIDADAS POR SKU</span>
              </div>
              <span className="text-amber-400 font-bold">•</span>
              <div className="inline-flex items-center gap-2 text-xs font-cinzel tracking-[0.25em] text-amber-900 font-bold uppercase">
                <Award className="w-3.5 h-3.5 text-amber-700" />
                <span>DISTRIBUIDOR AUTORIZADO OFICIAL</span>
              </div>
              <span className="text-amber-400 font-bold">•</span>
              <div className="inline-flex items-center gap-2 text-xs font-cinzel tracking-[0.25em] text-slate-700 font-semibold uppercase">
                <Truck className="w-3.5 h-3.5 text-amber-700" />
                <span>ENVÍOS SEGUROS A TODO EL PERÚ</span>
              </div>
              <span className="text-amber-400 font-bold">•</span>
              <div className="inline-flex items-center gap-2 text-xs font-cinzel tracking-[0.25em] text-amber-900 font-bold uppercase">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>COLECCIÓN PASARELA 2026</span>
              </div>
              <span className="text-amber-400 font-bold">•</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          4. MAIN CATALOG
      ────────────────────────────────────────────────────────── */}
      <section ref={catalogRef} className="py-16 sm:py-20 w-full px-4 sm:px-8 lg:px-12 2xl:px-16">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-amber-300 text-amber-900 text-xs font-cinzel font-bold tracking-[0.25em] uppercase mb-4 shadow-xs">
            <VeazCrownIcon size={14} />
            <span>VITRINA EXCLUSIVA DE CALZADOS ORIGINALES</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>

          <h2 className="font-playfair text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Colección <span className="bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent">VEAZ ESTILEZA</span>
          </h2>

          <p className="font-outfit text-base sm:text-lg text-slate-600 font-normal mt-3 leading-relaxed">
            Stilettos, tacos aguja, modelos calados troquelados y TACONES de gala. Cada modelo agrupa su serie completa de tallas y stock en tiempo real.
          </p>
        </div>

        {/* CURADURÍA & FILTER STUDIO */}
        <div className="bg-white border border-[#EDE2D4] rounded-3xl p-5 sm:p-8 mb-10 shadow-[0_4px_35px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="relative w-full lg:w-[420px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-800" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por modelo, SKU, taco (ej. Taco 12), color..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[#FAF7F2] border border-[#E8DCBE] text-xs text-slate-900 placeholder:text-slate-400 font-outfit focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 justify-end">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 hover:from-amber-700 hover:to-amber-950 text-white text-xs font-cinzel font-bold flex items-center gap-2.5 transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 tracking-wider"
              >
                <FileDown className="w-4 h-4" />
                <span>{isExportingPdf ? "Generando Lookbook PDF..." : "Descargar Catálogo PDF"}</span>
              </button>

              <div className="flex items-center gap-2 bg-[#FAF7F2] px-4 py-2.5 rounded-2xl border border-[#E8DCBE]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-800" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs text-slate-900 font-outfit font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="featured">Más Destacados</option>
                  <option value="price-asc">Precio: Menor a Mayor</option>
                  <option value="price-desc">Precio: Mayor a Menor</option>
                  <option value="stock">Mayor Stock en Serie</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-outfit font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpiar Todo</span>
                </button>
              )}
            </div>
          </div>

          <div className="py-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-cinzel font-bold tracking-widest text-slate-500 uppercase mr-1">
              Filtro Rápido:
            </span>

            <button
              onClick={() => setOnlyOffers(!onlyOffers)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-outfit font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${onlyOffers
                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Solo Ofertas ({totalOffersCount})</span>
              {onlyOffers && <Check className="w-3 h-3" />}
            </button>

            <button
              onClick={() => setOnlyInStock(!onlyInStock)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-outfit font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${onlyInStock
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>En Stock Disponible</span>
            </button>

            {availableFamilies.map((fam) => {
              const isSelected = selectedFamily.toLowerCase() === fam.toLowerCase();
              return (
                <button
                  key={fam}
                  onClick={() => setSelectedFamily(isSelected ? "TODAS" : fam)}
                  className={`px-3 py-1.5 rounded-full text-xs font-outfit font-medium transition-all cursor-pointer border ${isSelected
                    ? "bg-amber-800 text-white border-amber-800 shadow-xs"
                    : "bg-[#FAF8F5] text-slate-700 border-[#EDE2D4] hover:border-amber-400 hover:bg-amber-50"
                    }`}
                >
                  <span>{fam}</span>
                  {familyCounts[fam.toUpperCase()] ? (
                    <span className="ml-1 text-[10px] opacity-75">({familyCounts[fam.toUpperCase()]})</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="py-4 border-b border-slate-100 relative">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-cinzel font-bold tracking-widest text-slate-700 uppercase flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-amber-700" />
                <span>Marcas Autorizadas en Vitrina:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollBrandRail("left")}
                  className="w-7 h-7 rounded-full bg-[#FAF7F2] border border-[#E8DCBE] text-slate-700 hover:bg-amber-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => scrollBrandRail("right")}
                  className="w-7 h-7 rounded-full bg-[#FAF7F2] border border-[#E8DCBE] text-slate-700 hover:bg-amber-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div
              ref={brandRailRef}
              className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none scroll-smooth"
            >
              <button
                type="button"
                onClick={() => setSelectedBrand("TODAS")}
                className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-cinzel font-bold tracking-wider uppercase transition-all cursor-pointer border flex items-center gap-2 ${selectedBrand === "TODAS"
                  ? "bg-slate-900 text-white border-slate-900 shadow-md scale-102"
                  : "bg-[#FAF8F5] text-slate-700 border-slate-200 hover:border-amber-500 hover:bg-amber-50"
                  }`}
              >
                <span>Todas</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">
                  {groupedShoeModels.length}
                </span>
              </button>

              {availableBrands.map((brand) => {
                const isSelected = selectedBrand.toLowerCase() === brand.toLowerCase();
                const count = brandCounts[brand.toUpperCase()] || 0;
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    className={`shrink-0 px-4 py-2 rounded-2xl transition-all cursor-pointer border flex items-center gap-2.5 ${isSelected
                      ? "bg-amber-50 border-amber-500 ring-2 ring-amber-400/50 shadow-md scale-102"
                      : "bg-[#FAF8F5] border-slate-200 hover:border-amber-300 hover:bg-white"
                      }`}
                  >
                    <VeazBrandLogo brandName={brand} size="sm" showTagline={false} />
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-cinzel font-bold tracking-widest text-slate-700 uppercase mr-1">
                Tallas en Serie:
              </span>
              <button
                onClick={() => setSelectedSize("TODAS")}
                className={`h-8 px-3.5 rounded-xl text-xs font-cinzel font-bold tracking-wider transition-all cursor-pointer border ${selectedSize === "TODAS"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-[#FAF8F5] text-slate-700 border-slate-200 hover:border-amber-500"
                  }`}
              >
                Todas
              </button>
              {allSizesWithCounts.map(({ size, count }) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`h-8 min-w-[46px] px-2.5 rounded-xl text-xs font-cinzel font-bold tracking-wider transition-all cursor-pointer border flex items-center justify-center gap-1 ${selectedSize === size
                    ? "bg-amber-700 text-white border-amber-700 shadow-sm scale-105"
                    : "bg-[#FAF8F5] text-slate-800 border-[#E8DCBE] hover:border-amber-500 hover:bg-amber-50"
                    }`}
                  title={`${count} modelos disponibles en talla ${size}`}
                >
                  <span>T{size}</span>
                  <span className="text-[9px] opacity-75 font-normal">({count})</span>
                </button>
              ))}
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-cinzel uppercase tracking-widest text-slate-600 font-bold">
                Mostrando <span className="text-amber-800 font-black">{filteredShoes.length}</span> modelos
              </span>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-8 px-2">
            <span className="text-xs text-slate-500 font-outfit">Filtros aplicados:</span>
            {selectedBrand !== "TODAS" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-outfit font-bold">
                Marca: {selectedBrand}
                <button onClick={() => setSelectedBrand("TODAS")} className="cursor-pointer hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedFamily !== "TODAS" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-outfit font-bold">
                Línea: {selectedFamily}
                <button onClick={() => setSelectedFamily("TODAS")} className="cursor-pointer hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSize !== "TODAS" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-outfit font-bold">
                Talla: {selectedSize}
                <button onClick={() => setSelectedSize("TODAS")} className="cursor-pointer hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {onlyOffers && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-outfit font-bold">
                🔥 Solo Ofertas
                <button onClick={() => setOnlyOffers(false)} className="cursor-pointer hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {onlyInStock && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-outfit font-bold">
                ✓ En Stock
                <button onClick={() => setOnlyInStock(false)} className="cursor-pointer hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-outfit font-bold">
                Búsqueda: &ldquo;{searchTerm}&rdquo;
                <button onClick={() => setSearchTerm("")} className="cursor-pointer hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-amber-800 hover:underline font-outfit font-bold ml-2 cursor-pointer"
            >
              Restablecer todo
            </button>
          </div>
        )}

        {filteredShoes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-6">
            {filteredShoes.map((shoe) => (
              <VeazShoeCard
                key={shoe.key}
                shoe={shoe}
                onOpenLightbox={(selected) => setActiveLightboxShoe(selected)}
              />
            ))}
          </div>
        ) : (
          <div className="py-24 text-center bg-white border border-[#EDE2D4] rounded-3xl p-8 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 mx-auto mb-4">
              <VeazCrownIcon size={28} />
            </div>
            <h3 className="font-playfair text-2xl font-bold text-slate-900 mb-2">
              No encontramos modelos con estos filtros
            </h3>
            <p className="text-sm text-slate-600 font-outfit max-w-md mx-auto mb-6">
              Prueba cambiando la marca, el estilo o restableciendo los filtros para ver todos los calzados disponibles.
            </p>
            <button
              onClick={clearAllFilters}
              className="px-6 py-3 rounded-full bg-slate-900 text-white font-cinzel font-bold text-xs tracking-wider uppercase hover:bg-amber-700 transition-all cursor-pointer shadow-md"
            >
              Ver Toda la Colección
            </button>
          </div>
        )}
      </section>

      {/* ──────────────────────────────────────────────────────────
          5. PASARELA EDITORIAL DE ALTA MODA
      ────────────────────────────────────────────────────────── */}
      <div id="pasarela-section">
        <VeazModelGallery
          onSelectBrand={handleSelectBrand}
          onSelectCategory={handleSelectCategoryFromHeroOrModel}
        />
      </div>

      {/* ──────────────────────────────────────────────────────────
          6. NUEVA SECCIÓN MODERNA E INTERACTIVA DE DIRECCIÓN Y SHOWROOM
      ────────────────────────────────────────────────────────── */}
      <section id="ubicacion-section" className="py-20 w-full px-4 sm:px-8 lg:px-12 2xl:px-16 bg-gradient-to-b from-[#FAF8F5] via-[#F4EDE2] to-[#FAF8F5] border-y border-[#EDE2D4] relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-amber-300 text-amber-900 text-xs font-cinzel font-bold tracking-[0.25em] uppercase mb-4 shadow-xs">
              <Compass className="w-3.5 h-3.5 text-amber-700 animate-spin" style={{ animationDuration: "12s" }} />
              <span>SHOWROOM & BOUTIQUE EXCLUSIVA</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h2 className="font-playfair text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Visita Nuestro <span className="bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent">Salón de Exhibición</span>
            </h2>
            <p className="font-outfit text-sm sm:text-base text-slate-600 mt-3">
              Vive la experiencia de alta costura en persona. Te esperamos en nuestro local principal en Puerto Maldonado.
            </p>
          </div>

          {/* Grid Layout: Address Card + Interactive Map Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Left Box: Detailed Address & Landmarks (7 Cols) */}
            <div className="lg:col-span-7 bg-white/90 backdrop-blur-md border border-[#E8DCBE] rounded-3xl p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center shadow-md">
                  <MapPin className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <span className="text-[10px] font-cinzel font-bold tracking-[0.25em] text-amber-800 uppercase block">
                    Ubicación Oficial
                  </span>
                  <h3 className="font-playfair text-xl sm:text-2xl font-bold text-slate-900">
                    Puerto Maldonado, Madre de Dios
                  </h3>
                </div>
              </div>

              {/* Main Address Highlight */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] border border-[#E8DCBE] mb-6">
                <p className="font-playfair text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  Av. Madre de Dios, Con Pasaje Fonavi
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-amber-200/60">
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-outfit text-xs font-semibold">
                    📍 Frente a Proversa
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-outfit text-xs font-semibold">
                    🔥 Al costado de Pollería Todo a Leña
                  </span>
                </div>
              </div>

              {/* Horarios & Atencion details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-cinzel text-xs font-bold text-slate-900 uppercase">Horario de Atención</h4>
                    <p className="font-outfit text-xs text-slate-600 mt-0.5">Domingo a Viernes: 8:00 am - 9:30 pm</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-cinzel text-xs font-bold text-slate-900 uppercase">Asesoría Personalizada</h4>
                    <p className="font-outfit text-xs text-slate-600 mt-0.5">Prueba de tallas y series completas</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="https://maps.app.goo.gl/p9uX1yW7n2FgFj9bA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[200px] px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white font-cinzel text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                >
                  <Navigation className="w-4 h-4 text-amber-300 group-hover:rotate-45 transition-transform" />
                  <span>Abrir en Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>

                <a
                  href="https://wa.me/51929962458?text=Hola%20VEAZ%20ESTILEZA,%20deseo%20coordinar%20una%20visita%20a%20su%20showroom%20en%20Av.%20Madre%20de%20Dios"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-cinzel text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                  <span>Coordinar Visita</span>
                </a>
              </div>
            </div>

            {/* Right Box: Visual Map / Interactive Card (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border-2 border-amber-300/60 shadow-2xl bg-slate-900 group aspect-4/3 sm:aspect-square flex items-center justify-center">
                {/* Background image mockup simulating Puerto Maldonado boutique location */}
                <img
                  src="https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800&auto=format&fit=crop"
                  alt="Showroom VEAZ ESTILEZA"
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

                {/* Floating Map Badge */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-cinzel font-bold tracking-widest text-slate-900 uppercase shadow-md flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                    <span>Madre de Dios, Perú</span>
                  </span>
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-lg">
                    <VeazCrownIcon size={16} />
                  </div>
                </div>

                {/* Center Content / Quick Interactive Trigger */}
                <div className="absolute inset-x-6 bottom-6 text-center text-white">
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 shadow-2xl">
                    <h4 className="font-playfair text-lg font-bold mb-1">
                      ¿Cómo llegar al Showroom?
                    </h4>
                    <p className="font-outfit text-xs text-slate-200 mb-4">
                      Toca el botón para trazar tu ruta exacta desde tu ubicación actual.
                    </p>
                    <a
                      href="https://maps.app.goo.gl/p9uX1yW7n2FgFj9bA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-cinzel text-xs font-bold tracking-wider uppercase shadow-md transition-all cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Iniciar Navegación GPS</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          7. LIGHTBOX MODAL FOR HIGH-RES ZOOM
      ────────────────────────────────────────────────────────── */}
      <VeazImageLightbox
        shoe={activeLightboxShoe}
        isOpen={!!activeLightboxShoe}
        onClose={() => setActiveLightboxShoe(null)}
      />

      {/* ──────────────────────────────────────────────────────────
          8. FLOATING WHATSAPP VIP BUTTON
      ────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <a
          href="https://wa.me/51929962458?text=Hola%20VEAZ%20ESTILEZA,%20deseo%20consultar%20disponibilidad%20de%20calzados"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-cinzel text-xs font-bold tracking-wider shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          title="Atención inmediata por WhatsApp"
        >
          <MessageCircle className="w-5 h-5 fill-white text-emerald-600 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">Escribenos</span>
        </a>
      </div>

      {/* ──────────────────────────────────────────────────────────
          9. HAUTE COUTURE LUXURY LIGHT FOOTER WITH DYNAMIC HOVER RAIL
      ────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-[#EDE2D4] pt-16 pb-12 px-4 sm:px-8 lg:px-12 2xl:px-16 relative">
        <div className="mb-16 pb-12 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-cinzel tracking-[0.25em] text-amber-900 font-bold uppercase mb-1">
                <VeazCrownIcon size={13} />
                <span>UNIVERSO VEAZ ESTILEZA</span>
              </div>
              <h3 className="font-playfair text-2xl font-black text-slate-900">
                Marcas Oficiales & Líneas de Colección
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-outfit hidden md:inline">
                Acerca el cursor a los bordes para deslizar
              </span>
              <button
                onClick={() => scrollFooterRail("left")}
                className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#E8DCBE] text-slate-700 hover:bg-amber-100 flex items-center justify-center transition-all cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollFooterRail("right")}
                className="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#E8DCBE] text-slate-700 hover:bg-amber-100 flex items-center justify-center transition-all cursor-pointer shadow-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={footerRailRef}
            onMouseMove={handleFooterRailMouseMove}
            onMouseEnter={handleFooterRailMouseEnter}
            onMouseLeave={handleFooterRailMouseLeave}
            className="flex items-center gap-5 overflow-x-auto pb-4 scrollbar-none scroll-smooth select-none cursor-grab active:cursor-grabbing"
          >
            {[
              {
                brand: "VIZZANO",
                title: "Stilettos & Glamour",
                desc: "Tacos aguja de alta costura",
                img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=600&auto=format&fit=crop",
              },
              {
                brand: "MODARE",
                title: "Ultra Confort",
                desc: "Plantillas anatómicas acolchadas",
                img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=600&auto=format&fit=crop",
              },
              {
                brand: "MARIMENA",
                title: "Gala & Strass",
                desc: "Diseños de fiesta y alfombra roja",
                img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=600&auto=format&fit=crop",
              },
              {
                brand: "EDWIN",
                title: "Línea Varones",
                desc: "Cueros selectos de vestir",
                img: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=600&auto=format&fit=crop",
              },
              {
                brand: "XIOMARA",
                title: "Tendencia Chic",
                desc: "Tacones confort y TACONES modernas",
                img: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop",
              },
              {
                brand: "TRIKCS",
                title: "Urbano Premium",
                desc: "Calzados anatómicos resistentes",
                img: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=600&auto=format&fit=crop",
              },
            ].map((item) => (
              <div
                key={item.brand}
                onClick={() => handleSelectBrand(item.brand)}
                className="shrink-0 w-72 h-44 rounded-3xl relative overflow-hidden group cursor-pointer border border-[#EDE2D4] shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                <div className="absolute top-3.5 left-3.5">
                  <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-cinzel font-bold tracking-widest text-slate-900 uppercase shadow-sm">
                    {item.brand}
                  </span>
                </div>
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                  <h4 className="font-playfair text-base font-bold tracking-wide">
                    {item.title}
                  </h4>
                  <p className="font-outfit text-xs text-slate-300">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className="flex flex-col gap-4">
            <VeazLogo size="md" showSubtitle={true} />
            <p className="text-xs sm:text-sm text-slate-600 font-outfit font-normal leading-relaxed mt-2">
              VEAZ ESTILEZA representa la máxima expresión del calzado femenino de lujo. Curaduría impecable, series por tallas y diseños que coronan tu elegancia en cada pisada.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-slate-200 hover:border-amber-500 hover:text-amber-800 flex items-center justify-center transition-all text-slate-700"
                aria-label="Instagram"
              >
                <FaInstagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-slate-200 hover:border-amber-500 hover:text-amber-800 flex items-center justify-center transition-all text-slate-700"
                aria-label="Facebook"
              >
                <FaFacebookF className="w-4 h-4" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-slate-200 hover:border-amber-500 hover:text-amber-800 flex items-center justify-center transition-all text-slate-700"
                aria-label="TikTok"
              >
                <FaTiktok className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/51929962458"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-cinzel text-xs uppercase tracking-[0.25em] text-amber-900 font-bold mb-5">
              Líneas Exclusivas
            </h4>
            <ul className="space-y-3 text-xs text-slate-600 font-outfit">
              <li>
                <button
                  onClick={() => handleSelectCategoryFromHeroOrModel("Stilettos")}
                  className="hover:text-amber-800 transition-colors cursor-pointer"
                >
                  Stilettos Haute Couture
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleSelectCategoryFromHeroOrModel("Tacos")}
                  className="hover:text-amber-800 transition-colors cursor-pointer"
                >
                  Tacos Aguja & Pasarela
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleSelectCategoryFromHeroOrModel("Calados")}
                  className="hover:text-amber-800 transition-colors cursor-pointer"
                >
                  Calados Láser Anatómicos
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleSelectCategoryFromHeroOrModel("TACONES")}
                  className="hover:text-amber-800 transition-colors cursor-pointer"
                >
                  TACONES Red Carpet & Strass
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleSelectCategoryFromHeroOrModel("Plataformas")}
                  className="hover:text-amber-800 transition-colors cursor-pointer"
                >
                  Plataformas Empress Confort
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-cinzel text-xs uppercase tracking-[0.25em] text-amber-900 font-bold mb-5">
              Atención Personalizada
            </h4>
            <ul className="space-y-3 text-xs text-slate-600 font-outfit">
              <li className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Envíos express a todo el Perú</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Garantía de confort y autenticidad</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Atención: Lun - Sáb: 9:00 am - 8:30 pm</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Av. Madre de Dios, Pasaje Fonavi</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-cinzel text-xs uppercase tracking-[0.25em] text-amber-900 font-bold mb-5">
              Conexión THINK ERP
            </h4>
            <p className="text-xs text-slate-600 font-outfit leading-relaxed mb-4">
              Este catálogo sincroniza directamente las series de tallas y el inventario en tiempo real con el panel financiero THINK.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FAF7F2] border border-[#E8DCBE] text-slate-900 hover:bg-slate-900 hover:text-white font-cinzel text-xs font-bold tracking-wider uppercase transition-all shadow-xs"
            >
              <span>Acceder al Panel THINK</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="w-full pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-xs text-slate-500 font-outfit">
            © {new Date().getFullYear()} VEAZ ESTILEZA. Todos los derechos reservados.
          </p>
          <p className="text-xs text-slate-500 font-outfit flex items-center gap-1.5 justify-center">
            Confección con <Sparkles className="w-3.5 h-3.5 text-amber-600" /> para damas distinguidas.
          </p>
        </div>
      </footer>
    </div>
  );
}
