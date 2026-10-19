import React, { useState, useMemo, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import {
  Printer,
  FileText,
  Barcode as BarcodeIcon,
  QrCode,
  Sparkles,
  Package,
  Layers,
  Settings2,
  CheckCircle2,
  Search,
  Check,
  Tag,
  Radio,
  Sliders,
  Maximize2,
  ZoomIn,
  ZoomOut,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  ListPlus,
  X,
  AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";
import type { Product } from "../../services/product.api";
import {
  cleanModelName,
  extractSizeFromProduct,
  extractProductSpecBadge,
  decodeSeriesMetadata,
  isColorString,
  ALL_KNOWN_COLOR_NAMES,
} from "../../utils/seriesUtils";
import { playScannerSound } from "../../utils/hardwareScanner";

export type LabelPaperFormat = "50x30" | "40x25" | "60x40" | "80x50" | "A4-24" | "A4-40";

export interface LabelItemData {
  id: string;
  productId: string;
  modelName: string;
  brandName: string;
  specBadge: string; // Talla, Capacidad, Medida
  codeText: string;
  price: number;
  color?: string;
  unit: string;
}

interface ProfessionalBarcodeCenterProps {
  products: Product[];
  brands: any[];
  families: any[];
  initialBusinessName?: string;
  businessRubro?: string | null;
  initialProductId?: string;
  lastScannedCode?: string;
  onProductSelect?: (product: Product) => void;
}

/**
 * Componente individual de etiqueta que dibuja su propio Canvas de forma instantánea y robusta.
 */
export const SingleLabelSticker: React.FC<{
  item: LabelItemData;
  codeType: "barcode" | "qr";
  format: LabelPaperFormat;
  businessName: string;
  showStoreName: boolean;
  showPrice: boolean;
  showBadge: boolean;
  showCodeText: boolean;
  showBrand: boolean;
  showColor?: boolean;
}> = ({
  item,
  codeType,
  format,
  businessName,
  showStoreName,
  showPrice,
  showBadge,
  showCodeText,
  showBrand,
  showColor = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !item.codeText) return;

    if (codeType === "qr") {
      QRCode.toCanvas(canvasRef.current, item.codeText, {
        width: format === "40x25" ? 60 : format === "80x50" ? 110 : 75,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      }).catch((err) => {
        console.error("QR Code generation error:", err);
      });
    } else {
      try {
        JsBarcode(canvasRef.current, item.codeText, {
          format: "CODE128",
          width: format === "40x25" ? 1.5 : format === "80x50" ? 2.4 : 1.9,
          height: format === "40x25" ? 32 : format === "80x50" ? 52 : 38,
          displayValue: false, // El texto se dibuja en HTML con mejor tipografía
          margin: 1,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch (err) {
        console.error("JsBarcode generation error:", err);
      }
    }
  }, [item.codeText, codeType, format]);

  // Dimensiones proporcionales según formato
  const formatStyles: Record<LabelPaperFormat, { width: string; minHeight: string; padding: string }> = {
    "50x30": { width: "190px", minHeight: "114px", padding: "6px" },
    "40x25": { width: "160px", minHeight: "100px", padding: "4px" },
    "60x40": { width: "230px", minHeight: "153px", padding: "8px" },
    "80x50": { width: "290px", minHeight: "181px", padding: "10px" },
    "A4-24": { width: "185px", minHeight: "115px", padding: "6px" },
    "A4-40": { width: "155px", minHeight: "95px", padding: "4px" },
  };

  const currentStyle = formatStyles[format] || formatStyles["50x30"];

  return (
    <div
      style={{
        width: currentStyle.width,
        minHeight: currentStyle.minHeight,
        padding: currentStyle.padding,
      }}
      className="bg-white border-2 border-black rounded-xl flex flex-col items-center justify-between text-center shadow-xs transition-transform hover:scale-[1.02] text-black select-none overflow-hidden print:border-none print:shadow-none print:m-0 print:p-1"
    >
      {/* 1. Encabezado Tienda / Marca (Negro nítido) */}
      <div className="w-full flex items-center justify-between gap-1 border-b border-black/30 pb-0.5 shrink-0">
        {showStoreName && (
          <span className="text-[10px] font-black tracking-wider uppercase text-black truncate max-w-[120px]">
            {businessName || "TIENDA"}
          </span>
        )}
        {showBrand && item.brandName && (
          <span className="text-[9px] font-black text-black uppercase truncate">
            {item.brandName}
          </span>
        )}
      </div>

      {/* 2. Nombre del Producto / Modelo */}
      <div className="w-full my-0.5 shrink-0">
        <h4 className="text-[12px] font-black text-black leading-tight truncate px-1" title={item.modelName}>
          {item.modelName}
        </h4>
      </div>

      {/* 3. COLOR, BADGE Y PRECIO (Garantía absoluta: Solo 1 color, el color real del producto) */}
      {(() => {
        const finalColor = (item.color || "").trim().toUpperCase();
        const rawSpec = (item.specBadge || "").trim().toUpperCase();
        const finalSpec = (rawSpec && rawSpec !== finalColor && !isColorString(rawSpec)) ? rawSpec : "";

        return (
          <div className="w-full flex items-center justify-center flex-wrap gap-1.5 my-0.5 shrink-0">
            {showColor && finalColor && (
              <div className="bg-black text-white text-[10.5px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase shadow-xs flex items-center gap-1">
                <span>COL:</span>
                <span>{finalColor}</span>
              </div>
            )}
            {showBadge && finalSpec && (
              <div className="border-2 border-black text-black text-[10px] font-black px-2 py-0.5 rounded-md tracking-wider uppercase bg-white">
                {finalSpec}
              </div>
            )}
            {showPrice && (
              <div className="text-[12.5px] font-black text-black tracking-tight border-2 border-black px-2 py-0.5 rounded-md bg-white">
                S/ {Number(item.price).toFixed(2)}
              </div>
            )}
          </div>
        );
      })()}

      {/* 4 y 5. Canvas Código de Barras / QR + SKU Texto (Unidos y negros 100%) */}
      <div className="w-full flex flex-col items-center justify-center my-auto overflow-hidden">
        <div className="flex items-center justify-center w-full overflow-hidden">
          <canvas ref={canvasRef} className="max-w-full h-auto" />
        </div>
        {showCodeText && (
          <div className="text-[10px] font-mono font-black tracking-widest text-black pt-0.5 border-t border-black/30 w-full mt-0.5">
            {item.codeText}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Resuelve y extrae el color del producto para la etiqueta.
 * Prioriza: override manual, campo color, metadata de serie y búsqueda regex inteligente.
 */
export function resolveItemColor(p: Product): string {
  if (!p) return "";
  if (p.color && typeof p.color === "string" && p.color.trim()) {
    return p.color.trim().toUpperCase();
  }
  if ((p as any).colour && typeof (p as any).colour === "string" && String((p as any).colour).trim()) {
    return String((p as any).colour).trim().toUpperCase();
  }

  const meta = decodeSeriesMetadata(p.description);
  if (meta && (meta as any).color && String((meta as any).color).trim()) {
    return String((meta as any).color).trim().toUpperCase();
  }

  const text = `${p.name || ""} ${p.description || ""}`;
  const match = text.match(/\b(?:color|col\.?)\s*[:=\-]?\s*([a-zA-ZáéíóúñÁÉÍÓÚÑ]+(?:\s+[a-zA-ZáéíóúñÁÉÍÓÚÑ]+)?)/i);
  if (match && match[1]) {
    const candidate = match[1].trim().toUpperCase();
    if (ALL_KNOWN_COLOR_NAMES.has(candidate)) {
      return candidate;
    }
  }

  for (const c of ALL_KNOWN_COLOR_NAMES) {
    const rx = new RegExp(`\\b${c}\\b`, "i");
    if (rx.test(text)) {
      return c;
    }
  }

  return "";
}

// Estrategia de rotulado:
// "selective_queue": Cola personalizada de códigos seleccionados (cero desperdicio de papel)
// "custom_selection": Selección manual de un producto / serie
// "showcase_models": 1 etiqueta por cada producto/modelo único
// "all_warehouse_stock": 1 etiqueta por cada unidad de stock real en almacén
export type PrintStrategy = "selective_queue" | "custom_selection" | "showcase_models" | "all_warehouse_stock";

export interface PrintQueueItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  customCode: number | null;
  salePrice: number;
  stock: number;
  unit: string;
  brandName: string;
  color: string;
  specBadge: string;
  imageUrl?: string | null;
  copies: number;
}

export default function ProfessionalBarcodeCenter({
  products,
  brands,
  families,
  initialBusinessName = "TIENDA",
  businessRubro,
  initialProductId,
  lastScannedCode,
  onProductSelect,
}: ProfessionalBarcodeCenterProps) {
  // Detección contextual de rubro
  const rubro = (businessRubro || "").toLowerCase();
  const isFootwearRubro = /calzad|zapato|sandalia|stiletto|tac[oó]n|veaz/i.test(rubro);
  const isClothingRubro = /ropa|boutique|moda|textil|confecc/i.test(rubro);
  const isApparelOrFootwear = isFootwearRubro || isClothingRubro;
  const isElectroRubro = /electro|lectro|refriger|lavador|congelad|cocina|linea blanca|licuador/i.test(rubro);
  const isTechRubro = /tecno|movil|celular|comput|laptop/i.test(rubro);

  const [strategy, setStrategy] = useState<PrintStrategy>(() => {
    // Si viene un producto inicial o hay cola guardada, priorizar cola selectiva
    return "selective_queue";
  });

  // ── COLA DE IMPRESIÓN PERSONALIZADA (Persistente en localStorage) ──

  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem("barcode_print_queue_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("barcode_print_queue_v1", JSON.stringify(printQueue));
    } catch (e) {
      console.error("Error guardando cola de códigos en localStorage:", e);
    }
  }, [printQueue]);

  const totalQueuedStickers = useMemo(() => {
    return printQueue.reduce((acc, item) => acc + (Number(item.copies) || 0), 0);
  }, [printQueue]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");

  // Producto seleccionado para modo "custom_selection"
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || "");
  const [customSelectionMode, setCustomSelectionMode] = useState<"curve" | "stock" | "custom" | "single">("single");
  const [customCopies, setCustomCopies] = useState<number>(1);

  // Parámetros de etiqueta y papel (por defecto 80x50 para electrodomésticos, 50x30 para calzado/general)
  const defaultPaper: LabelPaperFormat = isElectroRubro || isTechRubro ? "80x50" : "50x30";
  const [paperFormat, setPaperFormat] = useState<LabelPaperFormat>(defaultPaper);
  const [codeType, setCodeType] = useState<"barcode" | "qr">("barcode");
  const [businessName, setBusinessName] = useState(initialBusinessName);

  // Opciones de visualización y modo de Badge
  const [showStoreName, setShowStoreName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [showCodeText, setShowCodeText] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [showColor, setShowColor] = useState(true);
  const [customColorOverride, setCustomColorOverride] = useState("");

  // Modo de Badge inteligente o manual
  const [badgeMode, setBadgeMode] = useState<"auto" | "specs" | "unit" | "custom" | "none">("auto");
  const [customBadgeText, setCustomBadgeText] = useState<string>("");

  // Funciones de gestión de la cola de impresión
  const addToQueue = (product: Product, copies = 1, customSpec?: string) => {
    // 1. Color real único del producto
    const isManualForThisProd =
      strategy === "custom_selection" &&
      activeProduct?.id === product.id &&
      Boolean(customColorOverride?.trim());
    const color = isManualForThisProd ? customColorOverride.trim().toUpperCase() : resolveItemColor(product);

    // 2. Especificación técnica real (GARANTÍA: Jamás un color ni duplicado)
    let spec = customSpec !== undefined ? customSpec : resolveItemBadge(product);
    if (isColorString(spec) || spec.toUpperCase() === color.toUpperCase()) {
      spec = "";
    }
    const code = product.barcode || product.sku || String((product as any).customCode || 0).padStart(4, "0");

    setPrintQueue((prev) => {
      const idx = prev.findIndex((q) => q.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          copies: next[idx].copies + copies,
        };
        return next;
      }
      const newItem: PrintQueueItem = {
        id: `q-${product.id}-${Date.now()}`,
        productId: product.id,
        name: cleanModelName(product.name, isApparelOrFootwear),
        sku: code,
        customCode: (product as any).customCode || null,
        salePrice: Number(product.salePrice) || 0,
        stock: Number(product.stock) || 0,
        unit: product.unit || "Unidad",
        brandName: product.brand?.name || "",
        color,
        specBadge: spec,
        imageUrl: product.imageUrl,
        copies: Math.max(1, copies),
      };
      return [newItem, ...prev];
    });

    toast.success(`➕ Código añadido: ${cleanModelName(product.name, isApparelOrFootwear)} (+${copies})`, {
      id: `add-toast-${product.id}`,
      duration: 2000,
    });
  };

  // Reconciliación automática: limpia cualquier color o badge desactualizado/contaminado en localStorage
  useEffect(() => {
    if (products.length === 0 || printQueue.length === 0) return;
    setPrintQueue((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const fresh = products.find((p) => p.id === item.productId);
        if (!fresh) return item;
        const realColor = resolveItemColor(fresh);
        let realSpec = resolveItemBadge(fresh);
        if (isColorString(realSpec) || realSpec.toUpperCase() === realColor.toUpperCase()) {
          realSpec = "";
        }
        const realPrice = Number(fresh.salePrice) || 0;
        const realCode = fresh.barcode || fresh.sku || String((fresh as any).customCode || 0).padStart(4, "0");
        const realStock = Number(fresh.stock) || 0;

        if (
          item.color !== realColor ||
          item.specBadge !== realSpec ||
          item.salePrice !== realPrice ||
          item.sku !== realCode ||
          item.stock !== realStock
        ) {
          changed = true;
          return {
            ...item,
            color: realColor,
            specBadge: realSpec,
            salePrice: realPrice,
            sku: realCode,
            stock: realStock,
          };
        }
        return item;
      });
      return changed ? next : prev;
    });
  }, [products]);

  const updateQueueCopies = (productId: string, copies: number) => {
    if (copies <= 0) {
      removeFromQueue(productId);
      return;
    }
    setPrintQueue((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, copies } : item))
    );
  };

  const removeFromQueue = (productId: string) => {
    setPrintQueue((prev) => prev.filter((item) => item.productId !== productId));
    toast.success("Código retirado de la lista");
  };

  const clearQueue = () => {
    setPrintQueue([]);
    toast.success("Lista de impresión vaciada");
  };

  // Sincronizar initialProductId cuando cambie
  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
      const match = products.find((p) => p.id === initialProductId);
      if (match) {
        addToQueue(match, 1);
        setStrategy("selective_queue");
      }
    }
  }, [initialProductId, products]);

  // Si cambia el código escaneado desde el hardware scanner
  useEffect(() => {
    if (!lastScannedCode) return;
    const clean = lastScannedCode.trim().toLowerCase();
    const match = products.find((p) => {
      const matchSku = p.sku && p.sku.toLowerCase() === clean;
      const matchCode = (p as any).customCode && String((p as any).customCode) === clean;
      const matchPadded = (p as any).customCode && String((p as any).customCode).padStart(4, "0") === clean;
      const matchId = p.id.toLowerCase() === clean;
      return matchSku || matchCode || matchPadded || matchId;
    });

    if (match) {
      addToQueue(match, 1);
      setStrategy("selective_queue");
      setSelectedProductId(match.id);
      playScannerSound("success");
      toast.success(`🎯 Pistola detectó y adicionó a la lista: ${match.name}`);
      if (onProductSelect) onProductSelect(match);
    }
  }, [lastScannedCode]);

  // Productos filtrados según búsqueda y marcas/familias
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const code = String((p as any).customCode || "").toLowerCase();
      const s = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm || name.includes(s) || sku.includes(s) || code.includes(s);
      const matchesBrand = !selectedBrandId || p.brandId === selectedBrandId;
      const matchesFamily = !selectedFamilyId || p.familyId === selectedFamilyId;

      return matchesSearch && matchesBrand && matchesFamily;
    });
  }, [products, searchTerm, selectedBrandId, selectedFamilyId]);

  // Producto seleccionado y sus variantes en serie
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || filteredProducts[0] || null;
  }, [products, selectedProductId, filteredProducts]);

  // Sincronizar el color detectado cuando activeProduct cambie
  useEffect(() => {
    if (activeProduct) {
      setCustomColorOverride(resolveItemColor(activeProduct));
    }
  }, [activeProduct]);

  // Solamente calzados en zapaterías o productos explícitos con curva de serie
  const isSeries = useMemo(() => {
    if (!activeProduct) return false;
    return (
      (activeProduct.unit === "Serie" || Boolean(decodeSeriesMetadata(activeProduct.description))) &&
      isApparelOrFootwear
    );
  }, [activeProduct, isApparelOrFootwear]);

  const seriesSiblings = useMemo(() => {
    if (!activeProduct || !isSeries) return activeProduct ? [activeProduct] : [];
    const targetName = cleanModelName(activeProduct.name, true).toLowerCase();
    return products
      .filter(
        (p) =>
          cleanModelName(p.name, true).toLowerCase() === targetName &&
          (p.brandId || "") === (activeProduct.brandId || "")
      )
      .sort((a, b) => {
        const na = parseFloat(extractSizeFromProduct(a, businessRubro || undefined));
        const nb = parseFloat(extractSizeFromProduct(b, businessRubro || undefined));
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return extractSizeFromProduct(a, businessRubro || undefined).localeCompare(
          extractSizeFromProduct(b, businessRubro || undefined)
        );
      });
  }, [activeProduct, isSeries, products, businessRubro]);

  // RESOLVER BADGE DINÁMICO POR RUBRO
  const resolveItemBadge = (p: Product): string => {
    if (!showBadge || badgeMode === "none") return "";
    if (badgeMode === "custom") return (customBadgeText || "").trim().toUpperCase();
    if (badgeMode === "unit") return p.unit && p.unit !== "Unidad" ? p.unit.toUpperCase() : "";
    return extractProductSpecBadge(p, businessRubro);
  };

  // CONSTRUCCIÓN DE LA LISTA FINAL DE ETIQUETAS A IMPRIMIR
  const labelItems = useMemo<LabelItemData[]>(() => {
    const list: LabelItemData[] = [];

    // ── ESTRATEGIA 0: Cola Personalizada de Códigos Seleccionados (Cero desperdicio) ──
    if (strategy === "selective_queue") {
      printQueue.forEach((qItem) => {
        const copies = Math.max(1, qItem.copies);
        const fresh = products.find((p) => p.id === qItem.productId);
        // Garantizar el color real del producto
        const resolvedColor = (fresh ? resolveItemColor(fresh) : qItem.color || "").trim().toUpperCase();
        // Garantizar que la especificación técnica NUNCA sea un color
        let resolvedSpec = fresh
          ? (showBadge && badgeMode !== "none" ? (badgeMode === "custom" ? (customBadgeText || "").toUpperCase() : resolveItemBadge(fresh)) : "")
          : (showBadge && badgeMode !== "none" ? qItem.specBadge : "");
        if (isColorString(resolvedSpec) || resolvedSpec.toUpperCase() === resolvedColor.toUpperCase()) {
          resolvedSpec = "";
        }

        for (let i = 0; i < copies; i++) {
          list.push({
            id: `queue-${qItem.productId}-${i}-${Date.now()}`,
            productId: qItem.productId,
            modelName: qItem.name,
            brandName: qItem.brandName,
            specBadge: resolvedSpec,
            codeText: qItem.sku,
            price: qItem.salePrice,
            color: showColor ? resolvedColor : "",
            unit: qItem.unit,
          });
        }
      });
      return list;
    }

    // ── ESTRATEGIA 1: Todo el almacén por stock real de cada producto ──
    if (strategy === "all_warehouse_stock") {
      filteredProducts.forEach((p) => {
        const stockUnits = Math.max(0, Math.round(Number(p.stock) || 0));
        const color = resolveItemColor(p);
        for (let i = 0; i < stockUnits; i++) {
          list.push({
            id: `${p.id}-stock-${i}`,
            productId: p.id,
            modelName: cleanModelName(p.name, isApparelOrFootwear),
            brandName: p.brand?.name || "",
            specBadge: resolveItemBadge(p),
            codeText: p.barcode || p.sku || String((p as any).customCode || 0).padStart(4, "0"),
            price: Number(p.salePrice) || 0,
            color,
            unit: p.unit || "Unidad",
          });
        }
      });
      return list;
    }

    // ── ESTRATEGIA 2: Vitrina / Exhibición (1 etiqueta por cada modelo único) ──
    if (strategy === "showcase_models") {
      const seen = new Set<string>();
      filteredProducts.forEach((p) => {
        const key = p.sku || (p as any).customCode || cleanModelName(p.name, isApparelOrFootwear);
        if (!seen.has(key)) {
          seen.add(key);
          const badgeText = resolveItemBadge(p) || (isApparelOrFootwear ? "EXHIBICIÓN" : "MUESTRA");
          list.push({
            id: `showcase-${p.id}`,
            productId: p.id,
            modelName: cleanModelName(p.name, isApparelOrFootwear),
            brandName: p.brand?.name || "",
            specBadge: badgeText,
            codeText: p.barcode || p.sku || String((p as any).customCode || 0).padStart(4, "0"),
            price: Number(p.salePrice) || 0,
            color: resolveItemColor(p),
            unit: p.unit || "Unidad",
          });
        }
      });
      return list;
    }

    // ── ESTRATEGIA 3: Selección Manual de Producto / Serie ──
    if (!activeProduct) return [];

    if (isSeries && customSelectionMode === "curve") {
      // 1 por cada talla de la serie
      seriesSiblings.forEach((sib) => {
        const color = resolveItemColor(sib);
        let spec = resolveItemBadge(sib);
        if (isColorString(spec) || spec.toUpperCase() === color.toUpperCase()) spec = "";

        list.push({
          id: `curve-${sib.id}`,
          productId: sib.id,
          modelName: cleanModelName(sib.name, true),
          brandName: sib.brand?.name || activeProduct.brand?.name || "",
          specBadge: spec,
          codeText: sib.barcode || sib.sku || String((sib as any).customCode || 0).padStart(4, "0"),
          price: Number(sib.salePrice) || 0,
          color,
          unit: sib.unit || "Unidad",
        });
      });
      return list;
    }

    if (isSeries && customSelectionMode === "stock") {
      // Según stock de cada talla de la serie
      seriesSiblings.forEach((sib) => {
        const count = Math.max(1, Math.round(Number(sib.stock) || 0));
        const color = resolveItemColor(sib);
        let spec = resolveItemBadge(sib);
        if (isColorString(spec) || spec.toUpperCase() === color.toUpperCase()) spec = "";

        for (let i = 0; i < count; i++) {
          list.push({
            id: `series-stock-${sib.id}-${i}`,
            productId: sib.id,
            modelName: cleanModelName(sib.name, true),
            brandName: sib.brand?.name || activeProduct.brand?.name || "",
            specBadge: spec,
            codeText: sib.barcode || sib.sku || String((sib as any).customCode || 0).padStart(4, "0"),
            price: Number(sib.salePrice) || 0,
            color,
            unit: sib.unit || "Unidad",
          });
        }
      });
      return list;
    }

    // Single o Custom copies
    const copies = customSelectionMode === "custom" ? Math.max(1, customCopies) : 1;
    const activeColor = customColorOverride?.trim() ? customColorOverride.trim().toUpperCase() : resolveItemColor(activeProduct);
    let activeSpec = resolveItemBadge(activeProduct);
    if (isColorString(activeSpec) || activeSpec.toUpperCase() === activeColor.toUpperCase()) activeSpec = "";

    for (let i = 0; i < copies; i++) {
      list.push({
        id: `custom-prod-${activeProduct.id}-${i}`,
        productId: activeProduct.id,
        modelName: cleanModelName(activeProduct.name, isApparelOrFootwear),
        brandName: activeProduct.brand?.name || "",
        specBadge: activeSpec,
        codeText: activeProduct.barcode || activeProduct.sku || String((activeProduct as any).customCode || 0).padStart(4, "0"),
        price: Number(activeProduct.salePrice) || 0,
        color: activeColor,
        unit: activeProduct.unit || "Unidad",
      });
    }

    return list;
  }, [
    strategy,
    printQueue,
    filteredProducts,
    activeProduct,
    isSeries,
    seriesSiblings,
    customSelectionMode,
    customCopies,
    showBadge,
    showColor,
    customColorOverride,
    badgeMode,
    customBadgeText,
    businessRubro,
    isApparelOrFootwear,
  ]);

  // Exportar a PDF vectorial con jsPDF
  const handleExportPdf = async () => {
    if (labelItems.length === 0) {
      toast.error("No hay etiquetas en la lista para exportar");
      return;
    }

    const toastId = toast.loading(`Generando PDF con ${labelItems.length} etiquetas...`);
    try {
      const { jsPDF } = await import("jspdf");

      // Si el formato es de rollo térmico continuo (ej: 50x30 mm, 80x50 mm, etc.)
      if (paperFormat === "50x30" || paperFormat === "40x25" || paperFormat === "60x40" || paperFormat === "80x50") {
        const dimensions: Record<string, [number, number]> = {
          "50x30": [50, 30],
          "40x25": [40, 25],
          "60x40": [60, 40],
          "80x50": [80, 50],
        };
        const [w, h] = dimensions[paperFormat];

        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: [w, h],
        });

        for (let i = 0; i < labelItems.length; i++) {
          if (i > 0) doc.addPage([w, h], "landscape");
          const item = labelItems[i];

          // Posición Y dinámica para un flujo perfecto sin espacios muertos
          const isLarge = w >= 60;
          let curY = isLarge ? 4.0 : 3.2;

          // 1. Encabezado Tienda / Marca (Negro sólido de alta nitidez térmica)
          if (showStoreName || (showBrand && item.brandName)) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(isLarge ? 8.5 : 7.2);
            doc.setTextColor(0, 0, 0);
            if (showStoreName) {
              const maxStoreLen = isLarge ? 25 : 18;
              const storeStr = (businessName || "TIENDA").toUpperCase();
              doc.text(storeStr.length > maxStoreLen ? storeStr.slice(0, maxStoreLen - 1) + ".." : storeStr, 3, curY);
            }
            if (showBrand && item.brandName) {
              doc.setTextColor(0, 0, 0);
              doc.setFontSize(isLarge ? 8.0 : 6.8);
              const maxBrandLen = isLarge ? 20 : 14;
              const brandStr = item.brandName.toUpperCase();
              doc.text(brandStr.length > maxBrandLen ? brandStr.slice(0, maxBrandLen - 1) + ".." : brandStr, w - 3, curY, { align: "right" });
            }
            curY += isLarge ? 4.2 : 3.4;
          }

          // 2. Nombre de producto / modelo (Negro puro, tipografía fuerte)
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(isLarge ? 10.0 : 8.5);
          doc.setFont("helvetica", "bold");
          const maxNameLen = isLarge ? 30 : 20;
          const truncated = item.modelName.length > maxNameLen ? item.modelName.slice(0, maxNameLen - 1) + "..." : item.modelName;
          doc.text(truncated, w / 2, curY, { align: "center" });
          curY += isLarge ? 4.0 : 3.4;

          // 3. COLOR, BADGE Y PRECIO (Clarísimo y bien pronunciado en papel térmico)
          const finalColor = (item.color || "").trim().toUpperCase();
          const rawSpec = (item.specBadge || "").trim().toUpperCase();
          const finalSpec = (rawSpec && rawSpec !== finalColor && !isColorString(rawSpec)) ? rawSpec : "";
          const hasColor = showColor && Boolean(finalColor);
          const hasBadge = showBadge && Boolean(finalSpec);
          const hasPrice = showPrice && Number(item.price) > 0;
          if (hasColor || hasBadge || hasPrice) {
            if (hasColor) {
              const colorStr = `COL: ${finalColor}`;
              const colorW = Math.min(w * 0.38, 25);
              const colorH = isLarge ? 5.0 : 4.0;
              doc.setFillColor(0, 0, 0);
              doc.roundedRect(3, curY - (isLarge ? 3.5 : 2.9), colorW, colorH, 1, 1, "F");
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(isLarge ? 8.0 : 6.8);
              doc.setFont("helvetica", "bold");
              doc.text(colorStr, 3 + colorW / 2, curY + (isLarge ? 0.3 : 0.2), { align: "center" });
            }

            if (hasBadge) {
              const badgeText = finalSpec.length > 20 ? finalSpec.slice(0, 19) + "." : finalSpec;
              const badgeW = Math.min(w * 0.36, 24);
              const badgeH = isLarge ? 5.0 : 4.0;
              const badgeX = hasColor ? (w / 2 - badgeW / 2 + (hasPrice ? 0 : 3)) : (hasPrice ? 3 : w / 2 - badgeW / 2);
              doc.setDrawColor(0, 0, 0);
              doc.setLineWidth(0.35);
              doc.roundedRect(badgeX, curY - (isLarge ? 3.5 : 2.9), badgeW, badgeH, 1, 1, "S");
              doc.setTextColor(0, 0, 0);
              doc.setFontSize(isLarge ? 7.8 : 6.5);
              doc.setFont("helvetica", "bold");
              doc.text(badgeText, badgeX + badgeW / 2, curY + (isLarge ? 0.3 : 0.2), { align: "center" });
            }

            if (hasPrice) {
              doc.setTextColor(0, 0, 0);
              doc.setFontSize(isLarge ? 10.5 : 9.0);
              doc.setFont("helvetica", "bold");
              doc.text(`S/ ${item.price.toFixed(2)}`, w - 3, curY + (isLarge ? 0.3 : 0.2), { align: "right" });
            }
            curY += isLarge ? 4.6 : 3.8;
          }

          // 4. Código de barras o QR (Líneas gruesas y profundas para cabezal térmico)
          const skuSpace = showCodeText ? (isLarge ? 4.5 : 3.6) : 1.5;
          const availH = Math.max(8, h - curY - skuSpace);

          const tempCanvas = document.createElement("canvas");
          let codeRenderH = 0;
          let codeRenderY = curY + (isLarge ? 0.8 : 0.4);

          if (codeType === "qr") {
            const qrDim = Math.min(availH, w * 0.42, isLarge ? 26 : 14);
            codeRenderH = qrDim;
            await QRCode.toCanvas(tempCanvas, item.codeText, {
              width: 160,
              margin: 1,
              color: { dark: "#000000", light: "#ffffff" },
            });
            const qrImg = tempCanvas.toDataURL("image/png");
            doc.addImage(qrImg, "PNG", w / 2 - qrDim / 2, codeRenderY, qrDim, qrDim);
          } else {
            codeRenderH = Math.min(availH, h * (isLarge ? 0.46 : 0.40));
            JsBarcode(tempCanvas, item.codeText, {
              format: "CODE128",
              width: isLarge ? 2.4 : 1.8,
              height: 55,
              displayValue: false,
              margin: 1,
              background: "#ffffff",
              lineColor: "#000000",
            });
            const bcImg = tempCanvas.toDataURL("image/png");
            const bcMargin = isLarge ? 5 : 3.5;
            doc.addImage(bcImg, "PNG", bcMargin, codeRenderY, w - bcMargin * 2, codeRenderH);
          }

          // 5. SKU text inmediatamente debajo del código (CERO ESPACIO MUERTO, Negro nítido)
          if (showCodeText) {
            const textY = codeRenderY + codeRenderH + (isLarge ? 3.0 : 2.4);
            const safeTextY = Math.min(h - 1.2, textY);
            doc.setFont("courier", "bold");
            doc.setFontSize(isLarge ? 8.2 : 7.0);
            doc.setTextColor(0, 0, 0);
            doc.text(item.codeText, w / 2, safeTextY, { align: "center" });
          }
        }

        doc.save(`Rotulado_${paperFormat}_${Date.now()}.pdf`);
      } else {
        // Formato Hoja A4 con cuadrícula
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const cols = paperFormat === "A4-40" ? 4 : 3;
        const rows = paperFormat === "A4-40" ? 10 : 8;
        const labelsPerPage = cols * rows;
        const marginX = 8;
        const marginY = 10;
        const labelW = (210 - marginX * 2) / cols;
        const labelH = (297 - marginY * 2) / rows;

        for (let i = 0; i < labelItems.length; i++) {
          const indexInPage = i % labelsPerPage;
          if (i > 0 && indexInPage === 0) doc.addPage();

          const col = indexInPage % cols;
          const row = Math.floor(indexInPage / cols);
          const x = marginX + col * labelW;
          const y = marginY + row * labelH;
          const item = labelItems[i];

          // Borde punteado de corte
          doc.setDrawColor(200, 210, 225);
          doc.setLineDashPattern([1.5, 1.5], 0);
          doc.roundedRect(x + 1, y + 1, labelW - 2, labelH - 2, 1.5, 1.5, "S");
          doc.setLineDashPattern([], 0);

          let curY = y + 4.2;

          // 1. Encabezado Tienda / Marca
          if (showStoreName || (showBrand && item.brandName)) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.2);
            doc.setTextColor(0, 0, 0);
            if (showStoreName) {
              const storeStr = businessName.toUpperCase();
              doc.text(storeStr.length > 18 ? storeStr.slice(0, 17) + ".." : storeStr, x + 3, curY);
            }
            if (showBrand && item.brandName) {
              doc.setTextColor(0, 0, 0);
              doc.setFontSize(6.8);
              const brandStr = item.brandName.toUpperCase();
              doc.text(brandStr.length > 14 ? brandStr.slice(0, 13) + ".." : brandStr, x + labelW - 3, curY, { align: "right" });
            }
            curY += 3.5;
          }

          // 2. Nombre del producto
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8.5);
          doc.setFont("helvetica", "bold");
          const truncated = item.modelName.length > 22 ? item.modelName.slice(0, 21) + "..." : item.modelName;
          doc.text(truncated, x + labelW / 2, curY, { align: "center" });
          curY += 3.4;

          // 3. COLOR, BADGE Y PRECIO (Clarísimo)
          const finalColor = (item.color || "").trim().toUpperCase();
          const rawSpec = (item.specBadge || "").trim().toUpperCase();
          const finalSpec = (rawSpec && rawSpec !== finalColor && !isColorString(rawSpec)) ? rawSpec : "";
          const hasColor = showColor && Boolean(finalColor);
          const hasBadge = showBadge && Boolean(finalSpec);
          const hasPrice = showPrice && Number(item.price) > 0;
          if (hasColor || hasBadge || hasPrice) {
            if (hasColor) {
              const colorStr = `COL: ${finalColor}`;
              const colorW = Math.min(labelW * 0.36, 22);
              const colorH = 4.2;
              doc.setFillColor(0, 0, 0);
              doc.roundedRect(x + 3, curY - 2.8, colorW, colorH, 1, 1, "F");
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(6.8);
              doc.setFont("helvetica", "bold");
              doc.text(colorStr, x + 3 + colorW / 2, curY + 0.3, { align: "center" });
            }

            if (hasBadge) {
              const badgeText = finalSpec.length > 18 ? finalSpec.slice(0, 17) + "." : finalSpec;
              const badgeW = Math.min(labelW * 0.36, 22);
              const badgeH = 4.2;
              const badgeX = hasColor ? (x + labelW / 2 - badgeW / 2) : (hasPrice ? x + 3 : x + labelW / 2 - badgeW / 2);
              doc.setDrawColor(0, 0, 0);
              doc.setLineWidth(0.35);
              doc.roundedRect(badgeX, curY - 2.8, badgeW, badgeH, 1, 1, "S");
              doc.setTextColor(0, 0, 0);
              doc.setFontSize(6.8);
              doc.setFont("helvetica", "bold");
              doc.text(badgeText, badgeX + badgeW / 2, curY + 0.3, { align: "center" });
            }

            if (hasPrice) {
              doc.setTextColor(0, 0, 0);
              doc.setFontSize(8.8);
              doc.setFont("helvetica", "bold");
              doc.text(`S/ ${item.price.toFixed(2)}`, x + labelW - 3, curY + 0.3, { align: "right" });
            }
            curY += 3.8;
          }

          // 4. Código de barras o QR dentro de la celda A4
          const skuSpace = showCodeText ? 3.6 : 1.2;
          const availH = Math.max(7, y + labelH - curY - skuSpace);

          const tempCanvas = document.createElement("canvas");
          let codeRenderH = 0;
          let codeRenderY = curY + 0.4;

          if (codeType === "qr") {
            const qrDim = Math.min(availH, labelW * 0.4, 18);
            codeRenderH = qrDim;
            await QRCode.toCanvas(tempCanvas, item.codeText, {
              width: 140,
              margin: 1,
              color: { dark: "#000000", light: "#ffffff" },
            });
            const qrImg = tempCanvas.toDataURL("image/png");
            doc.addImage(qrImg, "PNG", x + labelW / 2 - qrDim / 2, codeRenderY, qrDim, qrDim);
          } else {
            codeRenderH = Math.min(availH, labelH * 0.40);
            JsBarcode(tempCanvas, item.codeText, {
              format: "CODE128",
              width: 1.8,
              height: 48,
              displayValue: false,
              margin: 1,
              background: "#ffffff",
              lineColor: "#000000",
            });
            const bcImg = tempCanvas.toDataURL("image/png");
            doc.addImage(bcImg, "PNG", x + 3.0, codeRenderY, labelW - 6, codeRenderH);
          }

          // 5. SKU text inmediatamente debajo del código (CERO ESPACIO MUERTO)
          if (showCodeText) {
            const textY = codeRenderY + codeRenderH + 2.4;
            const safeTextY = Math.min(y + labelH - 1.2, textY);
            doc.setFont("courier", "bold");
            doc.setFontSize(7.0);
            doc.setTextColor(0, 0, 0);
            doc.text(item.codeText, x + labelW / 2, safeTextY, { align: "center" });
          }
        }

        doc.save(`Rotulado_A4_${Date.now()}.pdf`);
      }

      toast.success("✅ Archivo PDF generado exitosamente", { id: toastId });
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Error al exportar PDF: " + (err.message || ""), { id: toastId });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── 1. HEADER & GLOBAL SCANNER STATUS BAR ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
              <BarcodeIcon className="w-4 h-4 text-indigo-400" />
              Rotulado & Código de Barras Pro
            </span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lector Pistola USB / Bluetooth Activo</span>
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
            Centro de Impresión y Rotulado de Almacén
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mt-1">
            Etiqueta cada artículo de tu inventario para pistolas ópticas y escáneres QR. Imprime rollos térmicos adhesivos o pliegos A4 con recorte perfecto.
          </p>
        </div>

        {/* Botones de acción principales */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={labelItems.length === 0}
            onClick={handleExportPdf}
            className="px-5 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <FileText className="w-4 h-4" />
            <span>Descargar PDF ({labelItems.length})</span>
          </button>
          <button
            type="button"
            disabled={labelItems.length === 0}
            onClick={() => window.print()}
            className="px-6 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Tickets ({labelItems.length})</span>
          </button>
        </div>
      </div>

      {/* ── 2. SELECTOR DE ESTRATEGIA (4 ESTRATEGIAS PRO) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estrategia 0: Escoger y Adicionar Códigos (Cero Desperdicio) */}
        <div
          onClick={() => setStrategy("selective_queue")}
          className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden group ${
            strategy === "selective_queue"
              ? "bg-emerald-50/80 border-emerald-600 shadow-lg ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/30">
              <ListPlus className="w-6 h-6" />
            </div>
            {strategy === "selective_queue" && (
              <span className="bg-emerald-600 text-white p-1 rounded-full">
                <Check className="w-4 h-4 stroke-[3]" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-4">
            <h3 className="text-base font-black text-slate-900">
              Escoger y Adicionar
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
              AHORRO
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Busca y <strong>adiciona únicamente los códigos</strong> que necesitas hoy. Cero hojas desperdiciadas.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-950">
            🎯 {totalQueuedStickers} etiquetas en lista ({printQueue.length} arts.)
          </div>
        </div>

        {/* Estrategia 1: Producto o Serie Específica */}
        <div
          onClick={() => setStrategy("custom_selection")}
          className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden group ${
            strategy === "custom_selection"
              ? "bg-violet-50/70 border-violet-600 shadow-lg ring-2 ring-violet-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-violet-600/30">
              <Tag className="w-6 h-6" />
            </div>
            {strategy === "custom_selection" && (
              <span className="bg-violet-600 text-white p-1 rounded-full">
                <Check className="w-4 h-4 stroke-[3]" />
              </span>
            )}
          </div>
          <h3 className="text-base font-black text-slate-900 mt-4">
            Producto o Serie Única
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Elige un producto específico para imprimir etiquetas por curva de tallas o cantidad deseada.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-violet-100 text-violet-950">
            🏷️ Por Producto / Serie
          </div>
        </div>

        {/* Estrategia 2: Vitrina / Exhibición (1 por modelo) */}
        <div
          onClick={() => setStrategy("showcase_models")}
          className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden group ${
            strategy === "showcase_models"
              ? "bg-amber-50/70 border-amber-500 shadow-lg ring-2 ring-amber-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            {strategy === "showcase_models" && (
              <span className="bg-amber-500 text-white p-1 rounded-full">
                <Check className="w-4 h-4 stroke-[3]" />
              </span>
            )}
          </div>
          <h3 className="text-base font-black text-slate-900 mt-4">
            Rotular Vitrina / Exhibidor
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Genera exactamente <strong>1 etiqueta por cada modelo único</strong> para perchas, mostradores o vitrina.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-950">
            ✨ {filteredProducts.length} modelos listos
          </div>
        </div>

        {/* Estrategia 3: Todo el Almacén por Stock Real */}
        <div
          onClick={() => setStrategy("all_warehouse_stock")}
          className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden group ${
            strategy === "all_warehouse_stock"
              ? "bg-indigo-50/70 border-indigo-600 shadow-lg ring-2 ring-indigo-500/20"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/30">
              <Package className="w-6 h-6" />
            </div>
            {strategy === "all_warehouse_stock" && (
              <span className="bg-indigo-600 text-white p-1 rounded-full">
                <Check className="w-4 h-4 stroke-[3]" />
              </span>
            )}
          </div>
          <h3 className="text-base font-black text-slate-900 mt-4">
            Rotular Todo el Almacén
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Genera 1 etiqueta para <strong>cada unidad física en existencia</strong>. Para lotes de llegada masiva.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-900">
            📦 Stock: {filteredProducts.reduce((acc, p) => acc + (Number(p.stock) || 0), 0)} unidades
          </div>
        </div>
      </div>

      {/* ── 3. PANEL DE CONTROL & CONFIGURACIÓN ── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        {/* Controles de selección y filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda rápida */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
              Buscar en Catálogo
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nombre, SKU o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Filtro por Marca */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
              Filtrar por Marca
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todas las Marcas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Familia */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
              Filtrar por Familia / Categoría
            </label>
            <select
              value={selectedFamilyId}
              onChange={(e) => setSelectedFamilyId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Todas las Familias</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Producto cuando está en modo personalizado */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
              {strategy === "custom_selection" ? "Producto Seleccionado" : "Producto de Muestra"}
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">-- Elige un producto --</option>
              {filteredProducts.map((p) => {
                const pStock = Math.max(0, Math.round(Number(p.stock) || 0));
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku || `Cód #${p.customCode || ""}`}) • Stock: {pStock} {p.unit || "und"}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* ── MODO SELECTIVE QUEUE: PANEL DE BÚSQUEDA Y ADICIÓN DE CÓDIGOS ── */}
        {strategy === "selective_queue" && (
          <div className="space-y-4 p-5 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-slate-50 border-2 border-emerald-300/80 rounded-3xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
                  <ListPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                    Buscar y Adicionar Códigos a la Lista
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Cero Desperdicio de Hojas
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    Busca por nombre, SKU o código y agrega las etiquetas exactas según el stock real que tienes en almacén.
                  </p>
                </div>
              </div>

              {printQueue.length > 0 && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vaciar Lista ({printQueue.length})</span>
                </button>
              )}
            </div>

            {/* Resultados rápidos de búsqueda para adicionar en 1 clic */}
            {filteredProducts.length > 0 ? (
              <div className="bg-white rounded-2xl border border-emerald-200 p-3 shadow-xs">
                <div className="text-[11px] font-black uppercase text-slate-500 mb-2 px-1 flex flex-wrap items-center justify-between gap-2">
                  <span>Productos disponibles para adicionar ({Math.min(filteredProducts.length, 6)} de {filteredProducts.length})</span>
                  {searchTerm && filteredProducts.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          filteredProducts.slice(0, 10).forEach((p) => addToQueue(p, 1));
                          toast.success(`Se adicionaron ${Math.min(filteredProducts.length, 10)} productos a la lista`);
                        }}
                        className="text-[11px] font-black text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar {Math.min(filteredProducts.length, 10)} (1 c/u)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          filteredProducts.slice(0, 10).forEach((p) => {
                            const st = Math.max(1, Math.round(Number(p.stock) || 0));
                            addToQueue(p, st);
                          });
                          toast.success(`Se adicionaron según el stock real de almacén`);
                        }}
                        className="text-[11px] font-black text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        📦 Según stock almacén
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredProducts.slice(0, 12).map((p) => {
                    const inQueue = printQueue.find((q) => q.productId === p.id);
                    const pColor = resolveItemColor(p);
                    const currentStock = Math.max(0, Math.round(Number(p.stock) || 0));
                    const rawPSpec = resolveItemBadge(p);
                    const cleanPSpec = (rawPSpec && rawPSpec !== pColor && !isColorString(rawPSpec)) ? rawPSpec : "";

                    return (
                      <div
                        key={`quick-add-${p.id}`}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                          inQueue
                            ? "bg-emerald-50/80 border-emerald-400 shadow-2xs"
                            : "bg-slate-50/70 hover:bg-slate-100/80 border-slate-200"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-slate-900 truncate" title={p.name}>
                            {cleanModelName(p.name, isApparelOrFootwear)}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-semibold">
                            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">
                              {p.sku || `Cód #${p.customCode || ""}`}
                            </span>
                            {/* Stock destacado para guiar la impresión */}
                            <span
                              className={`px-1.5 py-0.5 rounded font-black border flex items-center gap-1 ${
                                currentStock > 0
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : "bg-rose-100 text-rose-800 border-rose-300"
                              }`}
                              title={`Stock en almacén: ${currentStock} ${p.unit || "und"}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${currentStock > 0 ? "bg-emerald-600" : "bg-rose-600"}`} />
                              Stock: {currentStock} {p.unit || "und"}
                            </span>
                            {cleanPSpec && (
                              <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                                {cleanPSpec}
                              </span>
                            )}
                            {pColor && (
                              <span className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-bold">
                                {pColor}
                              </span>
                            )}
                            <span className="font-black text-emerald-700 bg-white px-1 py-0.5 rounded border border-slate-100">
                              S/ {Number(p.salePrice || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {inQueue && (
                            <span className="px-1.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black">
                              {inQueue.copies} en lista
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => addToQueue(p, 1)}
                            className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Agregar 1 etiqueta a la lista"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{inQueue ? "+1" : "Adicionar"}</span>
                          </button>
                          {currentStock > 1 && (
                            <button
                              type="button"
                              onClick={() => addToQueue(p, currentStock)}
                              className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-black transition-all active:scale-95 flex items-center gap-0.5 shadow-2xs cursor-pointer"
                              title={`Adicionar ${currentStock} etiquetas (igual al stock de almacén)`}
                            >
                              <span>+{currentStock} stock</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                No se encontraron productos con el término de búsqueda "{searchTerm}". Prueba borrando el texto de búsqueda.
              </div>
            )}

            {/* Lista de Códigos ya adicionados a la cola */}
            <div className="bg-white rounded-2xl border border-emerald-300 overflow-hidden shadow-xs">
              <div className="bg-emerald-800 text-white px-4 py-2.5 flex items-center justify-between text-xs font-black">
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-300" />
                  Códigos en Lista para Impresión ({printQueue.length} artículos • {totalQueuedStickers} etiquetas totales)
                </span>
                <span className="text-[11px] text-emerald-200 font-bold">
                  {paperFormat.startsWith("A4")
                    ? `~${Math.ceil(totalQueuedStickers / (paperFormat === "A4-40" ? 40 : 24))} pliego(s) A4`
                    : `${totalQueuedStickers} stickers de rollo`}
                </span>
              </div>

              {printQueue.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <ListPlus className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                  <p className="text-xs font-black text-slate-700">Tu lista de impresión está vacía</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Usa el buscador de arriba o escanea con tu pistola de código de barras para ir adicionando exactamente lo que deseas imprimir.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {printQueue.map((item) => {
                    const cleanColor = (item.color || "").trim().toUpperCase();
                    const rawSpec = (item.specBadge || "").trim().toUpperCase();
                    const cleanSpec = (rawSpec && rawSpec !== cleanColor && !isColorString(rawSpec)) ? rawSpec : "";

                    return (
                      <div
                        key={item.id}
                        className="px-4 py-2.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-slate-900 truncate">
                            {item.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-semibold">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-800">
                              {item.sku}
                            </span>
                            {/* Stock real visible en la cola */}
                            <span
                              className={`px-2 py-0.5 rounded-md font-black border text-[10px] ${
                                item.stock > 0
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                                  : "bg-rose-50 text-rose-800 border-rose-200"
                              }`}
                            >
                              📦 Stock: {item.stock} {item.unit || "und"}
                            </span>
                            {item.brandName && (
                              <span className="text-slate-600 font-bold">{item.brandName}</span>
                            )}
                            {cleanSpec && (
                              <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                                {cleanSpec}
                              </span>
                            )}
                            {cleanColor && (
                              <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                                {cleanColor}
                              </span>
                            )}
                            <span className="font-black text-emerald-700">
                              S/ {item.salePrice.toFixed(2)}
                            </span>
                          </div>
                        </div>

                      {/* Control de copias */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Botón rápido para igualar al stock */}
                        {item.stock > 0 && item.copies !== item.stock && (
                          <button
                            type="button"
                            onClick={() => updateQueueCopies(item.productId, item.stock)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-black transition-all active:scale-95 cursor-pointer"
                            title={`Ajustar copias a la cantidad exacta de stock (${item.stock} etiquetas)`}
                          >
                            = Stock ({item.stock})
                          </button>
                        )}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => updateQueueCopies(item.productId, item.copies - 1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                            title="Disminuir 1 etiqueta"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={item.copies}
                            onChange={(e) => updateQueueCopies(item.productId, Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-12 py-1 text-center font-black text-xs bg-transparent outline-none text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => updateQueueCopies(item.productId, item.copies + 1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-black flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                            title="Aumentar 1 etiqueta"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromQueue(item.productId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar de la lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controles específicos del modo personalizado */}
        {strategy === "custom_selection" && activeProduct && (
          <div className="p-4 bg-violet-50/60 border border-violet-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black">
                {isSeries ? "👟" : isElectroRubro ? "📺" : isTechRubro ? "💻" : "📦"}
              </span>
              <div>
                <h4 className="text-sm font-black text-violet-950">
                  {cleanModelName(activeProduct.name, isApparelOrFootwear)}
                </h4>
                <p className="text-xs text-violet-700 font-medium">
                  {isSeries
                    ? `Serie con ${seriesSiblings.length} variantes/tallas distintas`
                    : `Producto individual • Stock: ${activeProduct.stock} ${activeProduct.unit || "Unidades"}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isSeries ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomSelectionMode("curve")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      customSelectionMode === "curve"
                        ? "bg-violet-600 text-white shadow-xs"
                        : "bg-white text-violet-900 border border-violet-200 hover:bg-violet-100"
                    }`}
                  >
                    📏 1 por cada variante ({seriesSiblings.length} tickets)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomSelectionMode("stock")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      customSelectionMode === "stock"
                        ? "bg-violet-600 text-white shadow-xs"
                        : "bg-white text-violet-900 border border-violet-200 hover:bg-violet-100"
                    }`}
                  >
                    📦 Según stock de cada variante
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      seriesSiblings.forEach((s) => addToQueue(s, 1));
                      setStrategy("selective_queue");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Enviar todas las tallas a la cola de impresión"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span>Adicionar a la Cola</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomSelectionMode("single")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      customSelectionMode === "single"
                        ? "bg-violet-600 text-white shadow-xs"
                        : "bg-white text-violet-900 border border-violet-200 hover:bg-violet-100"
                    }`}
                  >
                    🏷️ 1 etiqueta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomSelectionMode("custom");
                      setCustomCopies(Math.max(1, Math.round(Number(activeProduct.stock) || 1)));
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      customSelectionMode === "custom" && customCopies === Math.max(1, Math.round(Number(activeProduct.stock) || 1))
                        ? "bg-violet-600 text-white shadow-xs"
                        : "bg-white text-violet-900 border border-violet-200 hover:bg-violet-100"
                    }`}
                  >
                    📦 Todo el stock ({activeProduct.stock || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomSelectionMode("custom")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      customSelectionMode === "custom" && customCopies !== Math.max(1, Math.round(Number(activeProduct.stock) || 1))
                        ? "bg-violet-600 text-white shadow-xs"
                        : "bg-white text-violet-900 border border-violet-200 hover:bg-violet-100"
                    }`}
                  >
                    🔢 Cantidad personalizada
                  </button>
                  {customSelectionMode === "custom" && (
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={customCopies}
                      onChange={(e) => setCustomCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 bg-white border border-violet-300 rounded-lg text-xs font-bold text-center"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      addToQueue(activeProduct, customSelectionMode === "custom" ? customCopies : 1);
                      setStrategy("selective_queue");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Adicionar a la cola de impresión"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span>Adicionar a la Cola</span>
                  </button>
                </div>
              )}

              {/* Color editable / visible para la etiqueta */}
              <div className="flex items-center gap-1.5 bg-white border border-violet-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <span className="text-[11px] font-black text-violet-900 flex items-center gap-1">
                  🎨 Color:
                </span>
                <input
                  type="text"
                  value={customColorOverride}
                  onChange={(e) => setCustomColorOverride(e.target.value)}
                  placeholder="Ej: Negro, Blanco, Plata..."
                  className="text-xs font-bold text-slate-800 outline-none w-28 bg-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {/* Configuración de Papel, Código y Diseño */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Formato de Papel */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
              Tamaño de Papel / Rollo
            </label>
            <select
              value={paperFormat}
              onChange={(e) => setPaperFormat(e.target.value as LabelPaperFormat)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <optgroup label="🖨️ Rollo Térmico Continuo (Stickers)">
                <option value="80x50">
                  80 x 50 mm {isElectroRubro ? "⭐ (Recomendado para Electrodomésticos)" : "(Equipos / Cajas Grandes)"}
                </option>
                <option value="60x40">60 x 40 mm (Cajas Medianas / Repisas)</option>
                <option value="50x30">
                  50 x 30 mm {isApparelOrFootwear ? "⭐ (Estándar Calzado & Prendas)" : "(Estándar Etiquetas)"}
                </option>
                <option value="40x25">40 x 25 mm (Accesorios / Compacto)</option>
              </optgroup>
              <optgroup label="📄 Hoja A4 con Cuadrícula">
                <option value="A4-24">A4 (3 x 8 = 24 etiquetas por pliego)</option>
                <option value="A4-40">A4 (4 x 10 = 40 etiquetas por pliego)</option>
              </optgroup>
            </select>
          </div>

          {/* Tipo de Código */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
              Tipo de Simbología Óptica
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCodeType("barcode")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  codeType === "barcode"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <BarcodeIcon className="w-4 h-4" />
                <span>CODE 128</span>
              </button>
              <button
                type="button"
                onClick={() => setCodeType("qr")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  codeType === "qr"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Código QR</span>
              </button>
            </div>
          </div>

          {/* Nombre Comercial en Encabezado */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
              Encabezado Comercial
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ej: MI EMPRESA"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Opciones Visibles Checkboxes */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
              Elementos en el Sticker
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showColor}
                  onChange={(e) => setShowColor(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-slate-700">Color</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-slate-700">Precio S/</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBadge}
                  onChange={(e) => setShowBadge(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-slate-700 truncate" title="Badge / Especificación / Talla">
                  {isApparelOrFootwear ? "Talla / Medida" : isElectroRubro ? "Especificación / Pulg" : "Especificación"}
                </span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBrand}
                  onChange={(e) => setShowBrand(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-slate-700">Marca</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCodeText}
                  onChange={(e) => setShowCodeText(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-slate-700">SKU Texto</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-slate-700">Tienda</span>
              </label>
            </div>
          </div>
        </div>

        {/* Selector avanzado de Badge adaptado al rubro */}
        {showBadge && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-slate-50/80 p-3 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Badge Superior:
              </span>
              <select
                value={badgeMode}
                onChange={(e) => setBadgeMode(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="auto">
                  ⚡ Automático según {isElectroRubro ? "Electrodomésticos (Pulgadas / Capacidad / 4K)" : isApparelOrFootwear ? "Calzado/Moda (Talla)" : "Rubro"}
                </option>
                <option value="specs">📏 Especificación Técnica del Producto</option>
                <option value="unit">📦 Unidad de Medida (Caja / Pack / Unidad)</option>
                <option value="custom">✍️ Texto Personalizado Manual</option>
                <option value="none">❌ Ocultar Badge en Stickers</option>
              </select>
            </div>
            {badgeMode === "custom" && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Ej: GARANTÍA 1 AÑO, 220V, OFERTA..."
                  value={customBadgeText}
                  onChange={(e) => setCustomBadgeText(e.target.value)}
                  className="w-full sm:w-64 px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg font-bold text-xs text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 4. VISTA PREVIA INTERACTIVA EN TIEMPO REAL ── */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                Vista Previa de Impresión
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white">
                {labelItems.length} etiquetas
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Formato seleccionado: <strong className="text-slate-700">{paperFormat}</strong> • Código: <strong className="text-slate-700">{codeType.toUpperCase()}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Listo para enviar a la impresora
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={labelItems.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {labelItems.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <BarcodeIcon className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">No hay etiquetas para mostrar</h4>
            <p className="text-xs text-slate-500 mt-1">
              Prueba cambiando la estrategia, quitando filtros de marca o seleccionando un producto con stock.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-start justify-center max-h-[700px] overflow-y-auto p-4 bg-white/70 rounded-2xl border border-slate-200/60 shadow-inner">
            {labelItems.slice(0, 150).map((item) => (
              <SingleLabelSticker
                key={item.id}
                item={item}
                codeType={codeType}
                format={paperFormat}
                businessName={businessName}
                showStoreName={showStoreName}
                showPrice={showPrice}
                showBadge={showBadge}
                showCodeText={showCodeText}
                showBrand={showBrand}
                showColor={showColor}
              />
            ))}
          </div>
        )}

        {labelItems.length > 150 && (
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl text-xs font-bold text-center">
            ℹ️ Mostrando 150 de {labelItems.length} etiquetas en pantalla para máxima fluidez. Al presionar <strong>"Imprimir"</strong> o <strong>"Descargar PDF"</strong> se procesarán absolutamente todas las {labelItems.length} etiquetas.
          </div>
        )}
      </div>

      {/* ── 5. ESTILOS DE IMPRESIÓN DIRECTA (@media print) ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-label-grid, #printable-label-grid * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000000 !important;
          }
          #printable-label-grid {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 2mm !important;
            justify-content: flex-start !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>

      {/* Contenedor invisible en pantalla que se hace visible al imprimir directamente */}
      <div id="printable-label-grid" className="hidden">
        {labelItems.map((item) => (
          <SingleLabelSticker
            key={`print-${item.id}`}
            item={item}
            codeType={codeType}
            format={paperFormat}
            businessName={businessName}
            showStoreName={showStoreName}
            showPrice={showPrice}
            showBadge={showBadge}
            showCodeText={showCodeText}
            showBrand={showBrand}
            showColor={showColor}
          />
        ))}
      </div>
    </div>
  );
}
