import type { Product } from "../../services/product.api";
import { getReceiptAbsoluteUrl } from "../ui/ImageUploader";
import { cleanDescriptionForDisplay, extractProductSpecBadge } from "../../utils/seriesUtils";

export interface ColorInfo {
  name: string;
  hex: string;
  border?: boolean;
}

export const SHOE_COLOR_MAP: Record<string, { hex: string; border?: boolean }> = {
  // Metálicos, Inox & Electrodomésticos
  inox: { hex: "#8E9CA3" },
  "acero inoxidable": { hex: "#8E9CA3" },
  "acero inox": { hex: "#8E9CA3" },
  acero: { hex: "#9EABB3" },
  steel: { hex: "#9EABB3" },
  "stainless steel": { hex: "#8E9CA3" },
  titanio: { hex: "#706E6B" },
  titanium: { hex: "#706E6B" },
  "gris titanio": { hex: "#706E6B" },
  grafito: { hex: "#41424C" },
  graphite: { hex: "#41424C" },
  "gris grafito": { hex: "#41424C" },
  cromo: { hex: "#D8D8D8", border: true },
  cromado: { hex: "#D8D8D8", border: true },
  chrome: { hex: "#D8D8D8", border: true },
  aluminio: { hex: "#C0C0C0", border: true },
  aluminum: { hex: "#C0C0C0", border: true },
  carbón: { hex: "#333333" },
  carbon: { hex: "#333333" },
  charcoal: { hex: "#333333" },
  plata: { hex: "#C0C0C0", border: true },
  silver: { hex: "#C0C0C0", border: true },
  plateado: { hex: "#C0C0C0", border: true },
  plateada: { hex: "#C0C0C0", border: true },
  bronce: { hex: "#CD7F32" },
  cobre: { hex: "#B87333" },
  cobrizo: { hex: "#B87333" },
  dorado: { hex: "#D4AF37" },
  dorada: { hex: "#D4AF37" },
  oro: { hex: "#D4AF37" },
  gold: { hex: "#D4AF37" },
  "oro rosa": { hex: "#B76E79" },
  "rose gold": { hex: "#B76E79" },
  champagne: { hex: "#F7E7CE" },

  // Neutros, Blancos y Negros
  negro: { hex: "#1A1A1A" },
  negra: { hex: "#1A1A1A" },
  black: { hex: "#1A1A1A" },
  noir: { hex: "#1A1A1A" },
  azabache: { hex: "#111111" },
  "negro mate": { hex: "#1A1A1A" },
  "matte black": { hex: "#1A1A1A" },
  blanco: { hex: "#FFFFFF", border: true },
  blanca: { hex: "#FFFFFF", border: true },
  white: { hex: "#FFFFFF", border: true },
  "blanco mate": { hex: "#FFFFFF", border: true },
  "blanco perla": { hex: "#F8F9FA", border: true },
  marfil: { hex: "#FFFFF0", border: true },
  ivory: { hex: "#FFFFF0", border: true },
  perla: { hex: "#F5F2EB", border: true },
  hueso: { hex: "#F7F4EB", border: true },
  crema: { hex: "#FFFDD0", border: true },
  cream: { hex: "#FFFDD0", border: true },
  beige: { hex: "#E8D8C8", border: true },
  arena: { hex: "#D8C5A8" },
  nude: { hex: "#E3BC9A" },
  almendra: { hex: "#EFDECD", border: true },
  almond: { hex: "#EFDECD", border: true },

  // Grises
  gris: { hex: "#808080" },
  gray: { hex: "#808080" },
  grey: { hex: "#808080" },
  "gris oscuro": { hex: "#374151" },
  "gris claro": { hex: "#D1D5DB", border: true },
  "dark grey": { hex: "#374151" },
  "light grey": { hex: "#D1D5DB", border: true },
  plomo: { hex: "#5A5A5A" },

  // Rojos, Vinos & Rosas
  rojo: { hex: "#C41E3A" },
  roja: { hex: "#C41E3A" },
  red: { hex: "#C41E3A" },
  carmesí: { hex: "#A51C30" },
  carmesi: { hex: "#A51C30" },
  carmín: { hex: "#960018" },
  carmin: { hex: "#960018" },
  rosso: { hex: "#C41E3A" },
  vino: { hex: "#722F37" },
  "vino tinto": { hex: "#581845" },
  guinda: { hex: "#5B0E2D" },
  borgoña: { hex: "#800020" },
  burgundy: { hex: "#800020" },
  marsala: { hex: "#955251" },
  coral: { hex: "#FF6F61" },
  terracota: { hex: "#CC4E33" },
  rosa: { hex: "#E8A598" },
  "palo rosa": { hex: "#D9A0A0" },
  rose: { hex: "#E8A598" },
  rosado: { hex: "#F4C2C2" },
  rosada: { hex: "#F4C2C2" },
  pink: { hex: "#FFC0CB" },
  fucsia: { hex: "#D9027D" },
  magenta: { hex: "#C2185B" },

  // Azules
  azul: { hex: "#1B365D" },
  blue: { hex: "#1B365D" },
  "azul marino": { hex: "#001F3F" },
  "azul noche": { hex: "#0F172A" },
  "azul rey": { hex: "#1D4ED8" },
  marino: { hex: "#001F3F" },
  cobalto: { hex: "#0047AB" },
  navy: { hex: "#001F3F" },
  celeste: { hex: "#87CEEB" },
  turquesa: { hex: "#40E0D0" },

  // Verdes
  verde: { hex: "#2E5A44" },
  green: { hex: "#2E5A44" },
  "verde militar": { hex: "#4D5D53" },
  oliva: { hex: "#556B2F" },
  esmeralda: { hex: "#50C878" },
  menta: { hex: "#6EE7B7", border: true },

  // Marrones y Maderas
  camel: { hex: "#C19A6B" },
  marrón: { hex: "#6E473B" },
  marron: { hex: "#6E473B" },
  café: { hex: "#4B3621" },
  cafe: { hex: "#4B3621" },
  caramelo: { hex: "#A05A2C" },
  chocolate: { hex: "#3D2314" },
  tan: { hex: "#D2B48C" },
  cuero: { hex: "#8B5A2B" },

  // Amarillos y Naranjas
  amarillo: { hex: "#FFD700" },
  amarilla: { hex: "#FFD700" },
  mostaza: { hex: "#E1AD01" },
  naranja: { hex: "#EA580C" },
  ámbar: { hex: "#D97706" },
  ambar: { hex: "#D97706" },

  // Morados
  morado: { hex: "#6A1B9A" },
  morada: { hex: "#6A1B9A" },
  lila: { hex: "#C8A2C8" },
  violeta: { hex: "#8F00FF" },
  lavanda: { hex: "#C4B5FD" },

  // Varios
  transparente: { hex: "#E2E8F0", border: true },
};

/**
 * Extrae y valida con máxima precisión el Color o Tono de un producto.
 * GARANTÍA PRO: Jamás toma modelos de equipos (e.g. 'RT38', 'Inverter', 'Smart', 'POGM', '4K') como si fueran colores.
 */
export function extractShoeColor(name?: string, fallbackColor?: string): ColorInfo {
  // 1. Validar color explícito en inventario (product.color) si existe
  if (fallbackColor && fallbackColor.trim()) {
    const rawFb = fallbackColor.trim();
    // Descartar si parece código de modelo, serial o texto numérico
    const isModelCode = /[0-9]/.test(rawFb) || /^[A-Z0-9_\-]{4,}$/.test(rawFb);
    const isGenericWord = [
      "elegance", "color", "todos", "todas", "unidad", "par", "serie",
      "default", "ninguno", "modelo", "general", "estándar", "standard"
    ].includes(rawFb.toLowerCase());

    if (!isModelCode && !isGenericWord && rawFb.length <= 30) {
      const fbLower = rawFb.toLowerCase();
      // Búsqueda directa en diccionario de colores
      if (SHOE_COLOR_MAP[fbLower]) {
        const entry = SHOE_COLOR_MAP[fbLower];
        const capitalized = rawFb.charAt(0).toUpperCase() + rawFb.slice(1);
        return { name: capitalized, hex: entry.hex, border: !!entry.border };
      }
      // Coincidencia de frases compuestas en el diccionario
      for (const [colKey, colVal] of Object.entries(SHOE_COLOR_MAP)) {
        if (fbLower === colKey || fbLower.includes(colKey)) {
          const capitalized = rawFb.charAt(0).toUpperCase() + rawFb.slice(1);
          return { name: capitalized, hex: colVal.hex, border: !!colVal.border };
        }
      }
      // Si son palabras puramente alfabéticas válidas ingresadas por el usuario (e.g. "Azul Zafiro", "Gris Espacial")
      if (/^[a-záéíóúñ\s]{3,25}$/i.test(rawFb)) {
        const capitalized = rawFb
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        return { name: capitalized, hex: "#8E9CA3", border: false };
      }
    }
  }

  if (!name || !name.trim()) return { name: "", hex: "" };

  // 2. Limpieza de tallas, series y dimensiones comunes en el nombre
  const clean = name
    .replace(/\s*-\s*talla\s*[0-9]{2}(?:\.[0-9])?/gi, "")
    .replace(/(?:-\s*)?(?:talla|t\.|t-|t:)\s*[0-9]{2}(?:\.[0-9])?/gi, "")
    .replace(/[-_/\s](3[0-9]|4[0-5])$/gi, "")
    .trim();

  const lower = clean.toLowerCase();

  // 3. Revisar colores compuestos (2 palabras) de mayor a menor longitud
  const compoundColors = [
    "acero inoxidable",
    "acero inox",
    "stainless steel",
    "azul marino",
    "azul noche",
    "azul rey",
    "palo rosa",
    "blanco marfil",
    "blanco perla",
    "blanco mate",
    "oro rosa",
    "rose gold",
    "negro mate",
    "matte black",
    "gris oscuro",
    "gris claro",
    "dark grey",
    "light grey",
    "gris titanio",
    "gris grafito",
    "verde militar",
  ];

  for (const compound of compoundColors) {
    const regex = new RegExp(`(?:^|[\\s,/-])${compound}(?:$|[\\s,/-])`, "i");
    if (regex.test(lower)) {
      const entry = SHOE_COLOR_MAP[compound] || { hex: "#8E9CA3" };
      const capitalized = compound.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return { name: capitalized, hex: entry.hex, border: !!entry.border };
    }
  }

  // 4. Revisar palabras individuales del nombre contra el diccionario SHOE_COLOR_MAP
  const words = clean.split(/[\s,/\-_]+/);
  for (let i = words.length - 1; i >= 0; i--) {
    const rawWord = words[i].toLowerCase().replace(/[^a-záéíóúñ]/gi, "");
    if (!rawWord || rawWord.length < 3) continue;

    if (SHOE_COLOR_MAP[rawWord]) {
      const entry = SHOE_COLOR_MAP[rawWord];
      const capitalized = rawWord.charAt(0).toUpperCase() + rawWord.slice(1);
      return { name: capitalized, hex: entry.hex, border: !!entry.border };
    }
  }

  // 5. NUNCA inventar un color a partir del modelo del equipo o de la última palabra.
  // Si el producto no tiene color definido o en su nombre, se devuelve vacío.
  return { name: "", hex: "" };
}

/**
 * Extracts heel height (taco) from product description or name.
 * E.g. "TALLA 37, TACo7" -> "Taco 7"
 * E.g. "Talla 33, Taco 12" -> "Taco 12"
 */
export function extractShoeHeel(description?: string, name?: string): string {
  const combined = `${description || ""} ${name || ""}`;

  // 0. Check [TACO:...] tag from new shoe model
  const tagMatch = combined.match(/\[TACO:([\s\S]*?)\]/i);
  if (tagMatch && tagMatch[1]) {
    const val = tagMatch[1].trim();
    if (val) return val;
  }

  // 1. Check after comma: e.g. "Talla 37, Taco 7" or "Talla 33, Taco 12"
  const commaMatch = combined.match(/,\s*(?:taco\s*[:\s#]?\s*([0-9]+(?:\.[0-9]+)?(?:\s*cm)?))/i);
  if (commaMatch && commaMatch[1]) {
    const val = commaMatch[1].trim();
    return val.toLowerCase().includes("cm") ? `Taco ${val}` : `Taco ${val}`;
  }

  // 2. Check general "Taco X" or "Taco: X"
  const generalMatch = combined.match(/(?:taco\s*[:\s#]?\s*([0-9]+(?:\.[0-9]+)?(?:\s*cm)?))/i);
  if (generalMatch && generalMatch[1]) {
    const val = generalMatch[1].trim();
    return `Taco ${val}`;
  }

  // 3. Standalone cm: e.g. "9cm", "7.5 cm"
  const cmMatch = combined.match(/([0-9]+(?:\.[0-9]+)?)\s*cm/i);
  if (cmMatch && cmMatch[1]) {
    return `Taco ${cmMatch[1]} cm`;
  }

  return "Taco Confort";
}

export interface ShoeVariant {
  id: string;
  size: string;
  stock: number;
  salePrice: number;
  adjustedPrice?: number | null;
  costPrice?: number;
  rawProduct: Product;
}

export interface GroupedShoeModel {
  key: string;
  sku: string;
  name: string;
  cleanName?: string;
  brandName: string;
  brand?: string;
  familyName: string;
  color: string;
  colorName?: string;
  colorHex: string;
  colorBorder?: boolean;
  description: string;
  imageUrl: string;
  minPrice: number;
  maxPrice: number;
  adjustedPrice?: number | null;
  hasOffer: boolean;
  discountPercent: number;
  totalStock: number;
  availableSizes: string[];
  variants: ShoeVariant[];
  heelHeight: string;
  material?: string;
  isNewSeason?: boolean;
  isFeatured?: boolean;
  specBadge?: string;
  unit?: string;
  isShoeContext?: boolean;
}

/**
 * Extracts shoe size from product description, name, sku, or unit.
 */
export function extractShoeSize(product: Product): string {
  const combined = `${product.name || ""} ${product.description || ""} ${product.unit !== "Unidad" ? product.unit || "" : ""}`;

  // 1. Explicit size pattern: e.g. "Talla 31", "Talla: 36", "T.37", "T-38"
  const explicitMatch = combined.match(/(?:talla|t\.|t-|t:)\s*([0-9]{2}(?:\.[0-9])?)/i);
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1].trim();
  }

  // 2. Trailing SKU size like "-36", "_37", "/38" at the end of the SKU
  const skuMatch = (product.sku || "").match(/[-_/\s](3[0-9]|4[0-5])$/i);
  if (skuMatch && skuMatch[1]) {
    return skuMatch[1].trim();
  }

  // 3. Presentations
  if (product.presentations && product.presentations.length > 0) {
    for (const p of product.presentations) {
      const presMatch = p.name.match(/(?:talla|t\.|t-|t:)?\s*([0-9]{2})/i);
      if (presMatch && presMatch[1]) {
        return presMatch[1].trim();
      }
    }
  }

  // 4. Standalone shoe size (30 to 45) in name, description or unit
  const standaloneMatch = combined.match(/\b(3[0-9]|4[0-5])\b/);
  if (standaloneMatch && standaloneMatch[1]) {
    return standaloneMatch[1].trim();
  }

  return "Única";
}

/**
 * Strips out size identifiers to leave a clean model title so series group together.
 */
export function cleanShoeModelName(rawName: string): string {
  return rawName
    .replace(/\s*-\s*talla\s*[0-9]{2}(?:\.[0-9])?/gi, "")
    .replace(/(?:-\s*)?(?:talla|t\.|t-|t:)\s*[0-9]{2}(?:\.[0-9])?/gi, "")
    .replace(/\s*\(\s*talla\s*[0-9]{2}\s*\)/gi, "")
    .replace(/[-_/\s](3[0-9]|4[0-5])$/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Strips out size suffix from SKU (e.g. VZ-101-36 -> VZ-101)
 */
export function cleanBaseSku(rawSku?: string): string {
  if (!rawSku) return "";
  return rawSku
    .replace(/[-_/\s](3[0-9]|4[0-5])$/i, "")
    .trim()
    .toUpperCase();
}

/**
 * Groups inventory products by Model Name and Brand.
 * Merges size series so 6-8 entries of the same shoe registered individually
 * become 1 beautiful model card displaying all available sizes and their exact stock.
 */
export function groupProductsBySku(
  products: Product[],
  isShoeStore: boolean = true,
  businessRubro?: string
): GroupedShoeModel[] {
  if (!products || products.length === 0) return [];

  const map = new Map<string, GroupedShoeModel>();

  products.forEach((prod) => {
    const rawSku = (prod.sku || "").trim();
    const baseSku = cleanBaseSku(rawSku);

    // Detect if product is part of a size series, footwear, or curve:
    const hasSizePattern =
      /(?:talla|t\.|t-|t:)\s*[0-9]{2}(?:\.[0-9])?/i.test(prod.name || "") ||
      /(?:talla|t\.|t-|t:)\s*[0-9]{2}(?:\.[0-9])?/i.test(prod.description || "") ||
      /[-_/\s](3[0-9]|4[0-5])$/i.test(rawSku) ||
      /[-_/\s](3[0-9]|4[0-5])$/i.test(prod.name || "");

    const isSeriesOrFootwear =
      isShoeStore ||
      prod.unit === "Serie" ||
      prod.unit === "Par" ||
      hasSizePattern ||
      /(?:calzad|zapato|sandalia|stiletto|tac[oó]n|zapatilla|botin|bota)/i.test(prod.name || "");

    const isShoeItem = isSeriesOrFootwear;

    // En calzado y productos por serie se limpia la talla para agrupar la curva en una sola vitrina.
    // En electrodomésticos y otros rubros unitarios, se respeta el nombre completo original.
    const cleanName = isShoeItem
      ? cleanShoeModelName(prod.name || "Calzado")
      : (prod.name || "Artículo Comercial").trim();

    const brandName = prod.brand?.name?.trim() || "Oficial";
    const familyName = prod.family?.name?.trim() || (isShoeItem ? "Calzado" : "Equipamiento & Hogar");

    // Para calzados y series se agrupa por Marca + Nombre Limpio (para consolidar tallas en 1 sola tarjeta).
    // Para electrodomésticos o productos independientes sin serie, cada producto conserva su vitrina individual
    const groupKey = isShoeItem
      ? `${brandName.toUpperCase()}__${cleanName.toUpperCase()}`
      : `${brandName.toUpperCase()}__${cleanName.toUpperCase()}__${prod.id}`;

    const specBadge = isShoeItem
      ? ""
      : extractProductSpecBadge(prod, businessRubro || "electrodomesticos");

    const size = isShoeItem
      ? extractShoeSize(prod)
      : (specBadge || (prod.unit && prod.unit !== "Unidad" ? prod.unit : "Disponible"));

    const stock = Number(prod.stock) || 0;
    const price = Number(prod.salePrice) || 0;
    const adjPrice =
      prod.adjustedPrice && prod.adjustedPrice > 0 && prod.adjustedPrice < price
        ? Number(prod.adjustedPrice)
        : null;

    const resolvedImage = prod.imageUrl
      ? getReceiptAbsoluteUrl(prod.imageUrl) || ""
      : "";

    const colorInfo = extractShoeColor(prod.name, prod.color);
    const heel = isShoeItem ? extractShoeHeel(prod.description, prod.name) : "";

    const variant: ShoeVariant = {
      id: prod.id,
      size,
      stock,
      salePrice: price,
      adjustedPrice: adjPrice,
      costPrice: Number(prod.costPrice) || 0,
      rawProduct: prod,
    };

    if (!map.has(groupKey)) {
      const hasOffer = adjPrice !== null && adjPrice > 0;
      const discountPercent = hasOffer ? Math.round(((price - adjPrice) / price) * 100) : 0;

      const fallbackDesc = isShoeStore
        ? "Calzado femenino de alta calidad con acabados finos y diseño anatómico."
        : "Producto garantizado con respaldo oficial, eficiencia y servicio de atención inmediata.";

      const material = isShoeStore
        ? "Acabado Fino & Confort"
        : (specBadge ? `Especificación: ${specBadge}` : "Garantía de Fábrica Original");

      map.set(groupKey, {
        key: groupKey,
        sku: baseSku || rawSku || `PR-${String(prod.customCode || 1).padStart(4, "0")}`,
        name: cleanName,
        cleanName,
        brandName,
        familyName,
        color: colorInfo.name,
        colorName: colorInfo.name,
        colorHex: colorInfo.hex,
        colorBorder: colorInfo.border,
        description: cleanDescriptionForDisplay(prod.description) || fallbackDesc,
        imageUrl: resolvedImage,
        minPrice: price,
        maxPrice: price,
        adjustedPrice: adjPrice,
        hasOffer,
        discountPercent,
        totalStock: stock,
        availableSizes: isShoeItem && size && size !== "Única"
          ? [size]
          : (prod.presentations && prod.presentations.length > 0
              ? prod.presentations.map((p) => p.name)
              : (size && size !== "Única" ? [size] : [])),
        variants: [variant],
        heelHeight: heel,
        material,
        isNewSeason: true,
        isFeatured: stock > 0,
        specBadge: specBadge || undefined,
        unit: prod.unit || "Unidad",
        isShoeContext: isShoeItem,
      });
    } else {
      const existing = map.get(groupKey)!;
      existing.variants.push(variant);
      existing.totalStock += stock;

      if (price > 0 && (existing.minPrice === 0 || price < existing.minPrice)) {
        existing.minPrice = price;
      }
      if (price > existing.maxPrice) {
        existing.maxPrice = price;
      }

      if (adjPrice !== null && adjPrice > 0) {
        if (!existing.adjustedPrice || adjPrice < existing.adjustedPrice) {
          existing.adjustedPrice = adjPrice;
          existing.hasOffer = true;
          existing.discountPercent = Math.round(((existing.minPrice - adjPrice) / existing.minPrice) * 100);
        }
      }

      if (isShoeItem && size && size !== "Única" && !existing.availableSizes.includes(size)) {
        existing.availableSizes.push(size);
        existing.availableSizes.sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
          return numA - numB;
        });
      }

      if (isShoeItem) {
        existing.isShoeContext = true;
      }

      if (!existing.imageUrl && resolvedImage) {
        existing.imageUrl = resolvedImage;
      }

      if (isShoeStore && existing.heelHeight === "Taco Confort" && heel !== "Taco Confort") {
        existing.heelHeight = heel;
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Empty fallback - catalog strictly consumes real data from DB
 */
export const FALLBACK_LUXURY_CATALOG: GroupedShoeModel[] = [];
