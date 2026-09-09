import type { Product } from "../../services/product.api";
import { getReceiptAbsoluteUrl } from "../ui/ImageUploader";

export interface ColorInfo {
  name: string;
  hex: string;
  border?: boolean;
}

export const SHOE_COLOR_MAP: Record<string, { hex: string; border?: boolean }> = {
  vino: { hex: "#722F37" },
  guinda: { hex: "#5B0E2D" },
  borgoña: { hex: "#800020" },
  burgundy: { hex: "#800020" },
  marsala: { hex: "#955251" },
  negro: { hex: "#1A1A1A" },
  black: { hex: "#1A1A1A" },
  noir: { hex: "#1A1A1A" },
  azabache: { hex: "#111111" },
  rojo: { hex: "#C41E3A" },
  red: { hex: "#C41E3A" },
  carmesí: { hex: "#A51C30" },
  carmesi: { hex: "#A51C30" },
  carmín: { hex: "#960018" },
  carmin: { hex: "#960018" },
  rosso: { hex: "#C41E3A" },
  nude: { hex: "#E3BC9A" },
  beige: { hex: "#E8D8C8" },
  arena: { hex: "#D8C5A8" },
  blanco: { hex: "#FFFFFF", border: true },
  white: { hex: "#FFFFFF", border: true },
  marfil: { hex: "#FFFFF0", border: true },
  ivory: { hex: "#FFFFF0", border: true },
  perla: { hex: "#F5F2EB", border: true },
  dorado: { hex: "#D4AF37" },
  oro: { hex: "#D4AF37" },
  gold: { hex: "#D4AF37" },
  champagne: { hex: "#F7E7CE" },
  plata: { hex: "#C0C0C0" },
  silver: { hex: "#C0C0C0" },
  plateado: { hex: "#C0C0C0" },
  rosa: { hex: "#E8A598" },
  "palo rosa": { hex: "#D9A0A0" },
  rose: { hex: "#E8A598" },
  rosado: { hex: "#F4C2C2" },
  pink: { hex: "#FFC0CB" },
  fucsia: { hex: "#D9027D" },
  magenta: { hex: "#C2185B" },
  camel: { hex: "#C19A6B" },
  marrón: { hex: "#6E473B" },
  marron: { hex: "#6E473B" },
  café: { hex: "#4B3621" },
  cafe: { hex: "#4B3621" },
  caramelo: { hex: "#A05A2C" },
  chocolate: { hex: "#3D2314" },
  tan: { hex: "#D2B48C" },
  cuero: { hex: "#8B5A2B" },
  azul: { hex: "#1B365D" },
  "azul marino": { hex: "#001F3F" },
  marino: { hex: "#001F3F" },
  cobalto: { hex: "#0047AB" },
  navy: { hex: "#001F3F" },
  celeste: { hex: "#87CEEB" },
  verde: { hex: "#2E5A44" },
  oliva: { hex: "#556B2F" },
  esmeralda: { hex: "#50C878" },
  morado: { hex: "#6A1B9A" },
  lila: { hex: "#C8A2C8" },
  violeta: { hex: "#8F00FF" },
  amarillo: { hex: "#FFD700" },
  mostaza: { hex: "#E1AD01" },
  gris: { hex: "#808080" },
  plomo: { hex: "#5A5A5A" },
  bronce: { hex: "#CD7F32" },
  cobre: { hex: "#B87333" },
  terracota: { hex: "#CC4E33" },
  coral: { hex: "#FF6F61" },
  turquesa: { hex: "#40E0D0" },
};

/**
 * Extracts shoe color from the end of the product name.
 * E.g. "Charol Vino" -> "Vino" (Hex: #722F37)
 * E.g. "EBOOK SILDE ROJO" -> "Rojo" (Hex: #C41E3A)
 */
export function extractShoeColor(name?: string, fallbackColor?: string): ColorInfo {
  if (!name && !fallbackColor) return { name: "Elegance", hex: "#8A7D71" };

  // 1. Clean out sizes from name
  const clean = (name || "")
    .replace(/\s*-\s*talla\s*[0-9]{2}(?:\.[0-9])?/gi, "")
    .replace(/(?:-\s*)?(?:talla|t\.|t-|t:)\s*[0-9]{2}(?:\.[0-9])?/gi, "")
    .replace(/[-_/\s](3[0-9]|4[0-5])$/gi, "")
    .trim();

  const lower = clean.toLowerCase();

  // 2. Check compound colors (2 words)
  for (const compound of ["palo rosa", "azul marino", "blanco marfil", "oro rosa"]) {
    if (lower.endsWith(compound) || lower.includes(compound)) {
      const entry = SHOE_COLOR_MAP[compound] || { hex: "#D9A0A0" };
      const capitalized = compound.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return { name: capitalized, hex: entry.hex, border: !!entry.border };
    }
  }

  // 3. Check the LAST word of the clean name (al final del nombre está el color)
  const words = clean.split(/\s+/);
  const lastWord = (words[words.length - 1] || "").toLowerCase().replace(/[^a-záéíóúñ]/gi, "");
  if (lastWord && SHOE_COLOR_MAP[lastWord]) {
    const entry = SHOE_COLOR_MAP[lastWord];
    const capitalized = lastWord.charAt(0).toUpperCase() + lastWord.slice(1);
    return { name: capitalized, hex: entry.hex, border: !!entry.border };
  }

  // 4. Check if any word in the name matches a known color dictionary
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i].toLowerCase().replace(/[^a-záéíóúñ]/gi, "");
    if (w && SHOE_COLOR_MAP[w]) {
      const entry = SHOE_COLOR_MAP[w];
      const capitalized = w.charAt(0).toUpperCase() + w.slice(1);
      return { name: capitalized, hex: entry.hex, border: !!entry.border };
    }
  }

  // 5. Fallback to valid word at the end if alphabetic and not generic
  if (lastWord && lastWord.length >= 3 && !["zapato", "taco", "sandalia", "calzado", "stiletto"].includes(lastWord)) {
    return {
      name: lastWord.charAt(0).toUpperCase() + lastWord.slice(1),
      hex: "#8A7D71",
      border: false,
    };
  }

  // 6. Fallback to product.color if provided
  if (fallbackColor && fallbackColor.trim()) {
    const fb = fallbackColor.trim();
    const fbLower = fb.toLowerCase();
    const entry = SHOE_COLOR_MAP[fbLower] || { hex: "#8A7D71" };
    return { name: fb, hex: entry.hex, border: !!entry.border };
  }

  return { name: "Elegance", hex: "#8A7D71" };
}

/**
 * Extracts heel height (taco) from product description or name.
 * E.g. "TALLA 37, TACo7" -> "Taco 7"
 * E.g. "Talla 33, Taco 12" -> "Taco 12"
 */
export function extractShoeHeel(description?: string, name?: string): string {
  const combined = `${description || ""} ${name || ""}`;

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
  brandName: string;
  familyName: string;
  color: string;
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
export function groupProductsBySku(products: Product[]): GroupedShoeModel[] {
  if (!products || products.length === 0) return [];

  const map = new Map<string, GroupedShoeModel>();

  products.forEach((prod) => {
    const rawSku = (prod.sku || "").trim();
    const baseSku = cleanBaseSku(rawSku);
    const cleanName = cleanShoeModelName(prod.name || "Calzado Femenino");
    const brandName = prod.brand?.name?.trim() || "Sin Marca";
    const familyName = prod.family?.name?.trim() || "Calzado Femenino";

    // Grouping key: Brand + Model Name (so same model with multiple sizes aggregates together)
    const groupKey = `${brandName.toUpperCase()}__${cleanName.toUpperCase()}`;

    const size = extractShoeSize(prod);
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
    const heel = extractShoeHeel(prod.description, prod.name);

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

      map.set(groupKey, {
        key: groupKey,
        sku: baseSku || rawSku || `VZ-${String(prod.customCode || 1).padStart(4, "0")}`,
        name: cleanName,
        brandName,
        familyName,
        color: colorInfo.name,
        colorHex: colorInfo.hex,
        colorBorder: colorInfo.border,
        description: prod.description || "Calzado femenino de alta calidad con acabados finos y diseño anatómico.",
        imageUrl: resolvedImage,
        minPrice: price,
        maxPrice: price,
        adjustedPrice: adjPrice,
        hasOffer,
        discountPercent,
        totalStock: stock,
        availableSizes: [size],
        variants: [variant],
        heelHeight: heel,
        material: "Acabado Fino & Confort",
        isNewSeason: true,
        isFeatured: stock > 0,
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

      // Track best adjusted offer price
      if (adjPrice !== null && adjPrice > 0) {
        if (!existing.adjustedPrice || adjPrice < existing.adjustedPrice) {
          existing.adjustedPrice = adjPrice;
          existing.hasOffer = true;
          existing.discountPercent = Math.round(((existing.minPrice - adjPrice) / existing.minPrice) * 100);
        }
      }

      if (!existing.availableSizes.includes(size)) {
        existing.availableSizes.push(size);
        existing.availableSizes.sort((a, b) => {
          const numA = parseFloat(a);
          const numB = parseFloat(b);
          if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
          return numA - numB;
        });
      }

      if (!existing.imageUrl && resolvedImage) {
        existing.imageUrl = resolvedImage;
      }

      if (existing.heelHeight === "Taco Confort" && heel !== "Taco Confort") {
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
