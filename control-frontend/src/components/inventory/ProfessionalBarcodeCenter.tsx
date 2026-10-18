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
  ScanLine
} from "lucide-react";
import { toast } from "react-hot-toast";
import type { Product } from "../../services/product.api";
import {
  cleanModelName,
  extractSizeFromProduct,
  extractProductSpecBadge,
  decodeSeriesMetadata,
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !item.codeText) return;

    if (codeType === "qr") {
      QRCode.toCanvas(canvasRef.current, item.codeText, {
        width: format === "40x25" ? 48 : format === "80x50" ? 85 : 62,
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
          width: format === "40x25" ? 1.0 : format === "80x50" ? 1.6 : 1.2,
          height: format === "40x25" ? 22 : format === "80x50" ? 42 : 28,
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
      className="bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-between text-center shadow-xs transition-transform hover:scale-[1.02] text-slate-900 select-none overflow-hidden print:border-none print:shadow-none print:m-0 print:p-1"
    >
      {/* 1. Encabezado Tienda / Marca */}
      <div className="w-full flex items-center justify-between gap-1 border-b border-slate-100 pb-1 shrink-0">
        {showStoreName && (
          <span className="text-[9px] font-black tracking-wider uppercase text-indigo-700 truncate max-w-[110px]">
            {businessName || "TIENDA"}
          </span>
        )}
        {showBrand && item.brandName && (
          <span className="text-[8px] font-bold text-slate-500 uppercase truncate">
            {item.brandName}
          </span>
        )}
      </div>

      {/* 2. Nombre del Producto / Modelo */}
      <div className="w-full my-0.5 shrink-0">
        <h4 className="text-[11px] font-extrabold text-slate-900 leading-tight truncate px-1" title={item.modelName}>
          {item.modelName}
        </h4>
        {item.color && (
          <span className="text-[9px] font-semibold text-slate-500 block leading-none">
            {item.color}
          </span>
        )}
      </div>

      {/* 3. Badge de Talla / Especificación + Precio */}
      <div className="w-full flex items-center justify-center gap-2 my-0.5 shrink-0">
        {showBadge && item.specBadge && (
          <div className="bg-slate-950 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md tracking-wider uppercase shadow-xs">
            {item.specBadge}
          </div>
        )}
        {showPrice && (
          <div className="text-xs font-black text-amber-600 tracking-tight">
            S/ {Number(item.price).toFixed(2)}
          </div>
        )}
      </div>

      {/* 4 y 5. Canvas Código de Barras / QR + SKU Texto (Unidos sin espacio muerto) */}
      <div className="w-full flex flex-col items-center justify-center my-auto overflow-hidden">
        <div className="flex items-center justify-center w-full overflow-hidden">
          <canvas ref={canvasRef} className="max-w-full h-auto" />
        </div>
        {showCodeText && (
          <div className="text-[9px] font-mono font-bold tracking-widest text-slate-700 pt-0.5 border-t border-slate-100 w-full mt-0.5">
            {item.codeText}
          </div>
        )}
      </div>
    </div>
  );
};

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

  // Estrategia de rotulado:
  // "all_warehouse_stock": 1 etiqueta por cada unidad de stock real en almacén
  // "showcase_models": 1 etiqueta por cada producto/modelo único
  // "custom_selection": Selección manual de un producto / serie
  const [strategy, setStrategy] = useState<"all_warehouse_stock" | "showcase_models" | "custom_selection">(
    initialProductId ? "custom_selection" : "all_warehouse_stock"
  );

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

  // Modo de Badge inteligente o manual
  const [badgeMode, setBadgeMode] = useState<"auto" | "specs" | "unit" | "custom" | "none">("auto");
  const [customBadgeText, setCustomBadgeText] = useState<string>("");

  // Sincronizar initialProductId cuando cambie
  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
      setStrategy("custom_selection");
      setCustomSelectionMode("single");
    }
  }, [initialProductId]);

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
      setStrategy("custom_selection");
      setSelectedProductId(match.id);
      playScannerSound("success");
      toast.success(`🎯 Pistola detectó: ${match.name}`);
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

    // ── ESTRATEGIA 1: Todo el almacén por stock real de cada producto ──
    if (strategy === "all_warehouse_stock") {
      filteredProducts.forEach((p) => {
        const stockUnits = Math.max(0, Math.round(Number(p.stock) || 0));
        for (let i = 0; i < stockUnits; i++) {
          list.push({
            id: `${p.id}-stock-${i}`,
            productId: p.id,
            modelName: cleanModelName(p.name, isApparelOrFootwear),
            brandName: p.brand?.name || "",
            specBadge: resolveItemBadge(p),
            codeText: p.sku || String((p as any).customCode || 0).padStart(4, "0"),
            price: Number(p.salePrice) || 0,
            color: p.color || "",
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
            codeText: p.sku || String((p as any).customCode || 0).padStart(4, "0"),
            price: Number(p.salePrice) || 0,
            color: p.color || "",
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
        list.push({
          id: `curve-${sib.id}`,
          productId: sib.id,
          modelName: cleanModelName(sib.name, true),
          brandName: sib.brand?.name || activeProduct.brand?.name || "",
          specBadge: resolveItemBadge(sib),
          codeText: sib.sku || String((sib as any).customCode || 0).padStart(4, "0"),
          price: Number(sib.salePrice) || 0,
          color: sib.color || "",
          unit: sib.unit || "Unidad",
        });
      });
      return list;
    }

    if (isSeries && customSelectionMode === "stock") {
      // Según stock de cada talla de la serie
      seriesSiblings.forEach((sib) => {
        const count = Math.max(1, Math.round(Number(sib.stock) || 0));
        for (let i = 0; i < count; i++) {
          list.push({
            id: `series-stock-${sib.id}-${i}`,
            productId: sib.id,
            modelName: cleanModelName(sib.name, true),
            brandName: sib.brand?.name || activeProduct.brand?.name || "",
            specBadge: resolveItemBadge(sib),
            codeText: sib.sku || String((sib as any).customCode || 0).padStart(4, "0"),
            price: Number(sib.salePrice) || 0,
            color: sib.color || "",
            unit: sib.unit || "Unidad",
          });
        }
      });
      return list;
    }

    // Single o Custom copies
    const copies = customSelectionMode === "custom" ? Math.max(1, customCopies) : 1;
    for (let i = 0; i < copies; i++) {
      list.push({
        id: `custom-prod-${activeProduct.id}-${i}`,
        productId: activeProduct.id,
        modelName: cleanModelName(activeProduct.name, isApparelOrFootwear),
        brandName: activeProduct.brand?.name || "",
        specBadge: resolveItemBadge(activeProduct),
        codeText: activeProduct.sku || String((activeProduct as any).customCode || 0).padStart(4, "0"),
        price: Number(activeProduct.salePrice) || 0,
        color: activeProduct.color || "",
        unit: activeProduct.unit || "Unidad",
      });
    }

    return list;
  }, [
    strategy,
    filteredProducts,
    activeProduct,
    isSeries,
    seriesSiblings,
    customSelectionMode,
    customCopies,
    showBadge,
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

          // 1. Encabezado Tienda / Marca
          if (showStoreName || (showBrand && item.brandName)) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(isLarge ? 7.2 : 6.2);
            doc.setTextColor(79, 70, 229);
            if (showStoreName) {
              const maxStoreLen = isLarge ? 25 : 18;
              const storeStr = (businessName || "TIENDA").toUpperCase();
              doc.text(storeStr.length > maxStoreLen ? storeStr.slice(0, maxStoreLen - 1) + ".." : storeStr, 3, curY);
            }
            if (showBrand && item.brandName) {
              doc.setTextColor(100, 116, 139);
              doc.setFontSize(isLarge ? 6.5 : 5.8);
              const maxBrandLen = isLarge ? 20 : 14;
              const brandStr = item.brandName.toUpperCase();
              doc.text(brandStr.length > maxBrandLen ? brandStr.slice(0, maxBrandLen - 1) + ".." : brandStr, w - 3, curY, { align: "right" });
            }
            curY += isLarge ? 4.2 : 3.4;
          }

          // 2. Nombre de producto / modelo
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(isLarge ? 8.5 : 7.2);
          doc.setFont("helvetica", "bold");
          const maxNameLen = isLarge ? 32 : 22;
          const truncated = item.modelName.length > maxNameLen ? item.modelName.slice(0, maxNameLen - 1) + "..." : item.modelName;
          doc.text(truncated, w / 2, curY, { align: "center" });
          curY += isLarge ? 3.8 : 3.2;

          // 3. Badge y Precio
          const hasBadge = showBadge && Boolean(item.specBadge);
          const hasPrice = showPrice && Number(item.price) > 0;
          if (hasBadge || hasPrice) {
            if (hasBadge) {
              const badgeText = item.specBadge.length > 22 ? item.specBadge.slice(0, 21) + "." : item.specBadge;
              const badgeW = Math.min(w * 0.45, 30);
              const badgeH = isLarge ? 4.8 : 4.0;
              doc.setFillColor(15, 23, 42);
              doc.roundedRect(w / 2 - badgeW / 2, curY - (isLarge ? 3.4 : 2.9), badgeW, badgeH, 1, 1, "F");
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(isLarge ? 7.2 : 6.2);
              doc.text(badgeText, w / 2, curY + (isLarge ? 0.3 : 0.2), { align: "center" });
            }

            if (hasPrice) {
              doc.setTextColor(217, 119, 6);
              doc.setFontSize(isLarge ? 8.2 : 7.2);
              doc.setFont("helvetica", "bold");
              doc.text(`S/ ${item.price.toFixed(2)}`, w - 3, curY + (isLarge ? 0.3 : 0.2), { align: "right" });
            }
            curY += isLarge ? 4.5 : 3.6;
          }

          // 4. Código de barras o QR
          // Altura disponible hasta el final de la etiqueta
          const skuSpace = showCodeText ? (isLarge ? 4.5 : 3.6) : 1.5;
          const availH = Math.max(8, h - curY - skuSpace);

          const tempCanvas = document.createElement("canvas");
          let codeRenderH = 0;
          let codeRenderY = curY + (isLarge ? 0.8 : 0.4);

          if (codeType === "qr") {
            const qrDim = Math.min(availH, w * 0.42, isLarge ? 26 : 14);
            codeRenderH = qrDim;
            await QRCode.toCanvas(tempCanvas, item.codeText, { width: 120, margin: 1 });
            const qrImg = tempCanvas.toDataURL("image/png");
            doc.addImage(qrImg, "PNG", w / 2 - qrDim / 2, codeRenderY, qrDim, qrDim);
          } else {
            // El código de barras aprovecha la proporción real del papel sin dejar vacíos
            codeRenderH = Math.min(availH, h * (isLarge ? 0.46 : 0.40));
            JsBarcode(tempCanvas, item.codeText, {
              format: "CODE128",
              width: isLarge ? 1.8 : 1.3,
              height: 48,
              displayValue: false,
              margin: 1,
            });
            const bcImg = tempCanvas.toDataURL("image/png");
            const bcMargin = isLarge ? 6 : 4;
            doc.addImage(bcImg, "PNG", bcMargin, codeRenderY, w - bcMargin * 2, codeRenderH);
          }

          // 5. SKU text inmediatamente debajo del código (CERO ESPACIO MUERTO)
          if (showCodeText) {
            const textY = codeRenderY + codeRenderH + (isLarge ? 3.0 : 2.4);
            const safeTextY = Math.min(h - 1.2, textY);
            doc.setFont("courier", "bold");
            doc.setFontSize(isLarge ? 7.2 : 6.0);
            doc.setTextColor(71, 85, 105);
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
            doc.setFontSize(6.2);
            doc.setTextColor(79, 70, 229);
            if (showStoreName) {
              const storeStr = businessName.toUpperCase();
              doc.text(storeStr.length > 18 ? storeStr.slice(0, 17) + ".." : storeStr, x + 3, curY);
            }
            if (showBrand && item.brandName) {
              doc.setTextColor(100, 116, 139);
              doc.setFontSize(5.8);
              const brandStr = item.brandName.toUpperCase();
              doc.text(brandStr.length > 14 ? brandStr.slice(0, 13) + ".." : brandStr, x + labelW - 3, curY, { align: "right" });
            }
            curY += 3.5;
          }

          // 2. Nombre del producto
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(7.2);
          doc.setFont("helvetica", "bold");
          const truncated = item.modelName.length > 22 ? item.modelName.slice(0, 21) + "..." : item.modelName;
          doc.text(truncated, x + labelW / 2, curY, { align: "center" });
          curY += 3.2;

          // 3. Badge y Precio
          const hasBadge = showBadge && Boolean(item.specBadge);
          const hasPrice = showPrice && Number(item.price) > 0;
          if (hasBadge || hasPrice) {
            if (hasBadge) {
              const badgeText = item.specBadge.length > 18 ? item.specBadge.slice(0, 17) + "." : item.specBadge;
              const badgeW = Math.min(labelW * 0.45, 26);
              const badgeH = 4.0;
              doc.setFillColor(15, 23, 42);
              doc.roundedRect(x + labelW / 2 - badgeW / 2, curY - 2.8, badgeW, badgeH, 1, 1, "F");
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(6.2);
              doc.text(badgeText, x + labelW / 2, curY + 0.2, { align: "center" });
            }

            if (hasPrice) {
              doc.setTextColor(217, 119, 6);
              doc.setFontSize(7.2);
              doc.setFont("helvetica", "bold");
              doc.text(`S/ ${item.price.toFixed(2)}`, x + labelW - 3, curY + 0.2, { align: "right" });
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
            await QRCode.toCanvas(tempCanvas, item.codeText, { width: 100, margin: 1 });
            const qrImg = tempCanvas.toDataURL("image/png");
            doc.addImage(qrImg, "PNG", x + labelW / 2 - qrDim / 2, codeRenderY, qrDim, qrDim);
          } else {
            codeRenderH = Math.min(availH, labelH * 0.40);
            JsBarcode(tempCanvas, item.codeText, {
              format: "CODE128",
              width: 1.2,
              height: 40,
              displayValue: false,
              margin: 1,
            });
            const bcImg = tempCanvas.toDataURL("image/png");
            doc.addImage(bcImg, "PNG", x + 3.5, codeRenderY, labelW - 7, codeRenderH);
          }

          // 5. SKU text inmediatamente debajo del código (CERO ESPACIO MUERTO)
          if (showCodeText) {
            const textY = codeRenderY + codeRenderH + 2.4;
            const safeTextY = Math.min(y + labelH - 1.2, textY);
            doc.setFont("courier", "bold");
            doc.setFontSize(6);
            doc.setTextColor(71, 85, 105);
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

      {/* ── 2. SELECTOR DE ESTRATEGIA (3 BOTONES PRO) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estrategia 1: Todo el Almacén por Stock Real */}
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
            Genera 1 etiqueta para <strong>cada unidad física en existencia</strong>. Ideal para inventariar y etiquetar cada caja, prenda o equipo que entra a tienda.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-900">
            📦 Stock Total: {filteredProducts.reduce((acc, p) => acc + (Number(p.stock) || 0), 0)} unidades
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
            Genera exactamente <strong>1 etiqueta por cada modelo único</strong> del catálogo para perchas, mostradores, repisas o calzados de exhibición.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-950">
            ✨ {filteredProducts.length} modelos listos para vitrina
          </div>
        </div>

        {/* Estrategia 3: Selección Manual de Producto / Serie */}
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
            Producto o Serie Específica
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Elige un producto específico o <strong>escanea su código con la pistola</strong> para imprimir etiquetas por curva de tallas o cantidad deseada.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-violet-100 text-violet-950">
            🎯 Personalizado / Por Lote
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
              {filteredProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku || `Cód #${p.customCode || ""}`})
                </option>
              ))}
            </select>
          </div>
        </div>

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
                    onClick={() => setCustomSelectionMode("custom")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      customSelectionMode === "custom"
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
                </div>
              )}
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
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
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
          />
        ))}
      </div>
    </div>
  );
}
