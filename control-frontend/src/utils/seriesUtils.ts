/**
 * Utility functions and types for Footwear "Serie" (Size Curves & Quantities)
 */

export interface SizeRatio {
  size: string;
  ratio: number; // How many units of this size in 1 series (e.g. 1 or 2)
  stock?: number; // Current real-time stock for this size
  costPrice?: number;
  salePrice?: number;
  sku?: string;
  productId?: string;
}

export interface SeriesConfig {
  unitsPerSeries: number;
  curve: SizeRatio[];
  seriesStock: number;
  costPricePerSeries: number;
  salePricePerSeries: number;
  costPricePerUnit: number;
  salePricePerUnit: number;
  taco?: string;
}

export interface SeriesStockSummary {
  isSeries: boolean;
  completeSeries: number;
  looseUnits: number;
  totalUnits: number;
  unitsPerSeries: number;
  sizes: Array<{
    size: string;
    stock: number;
    ratio: number;
    maxSeriesForSize: number;
    isLimiting: boolean;
    productId?: string;
    salePrice?: number;
    costPrice?: number;
  }>;
}

export interface SeriesPreset {
  id: string;
  name: string;
  description: string;
  units: number;
  curve: Array<{ size: string; ratio: number }>;
}

export const STANDARD_SERIES_PRESETS: SeriesPreset[] = [
  {
    id: "preset_6_34_39",
    name: "Curva 34 - 39 (6 pares)",
    description: "1 par por cada talla del 34 al 39",
    units: 6,
    curve: [
      { size: "34", ratio: 1 },
      { size: "35", ratio: 1 },
      { size: "36", ratio: 1 },
      { size: "37", ratio: 1 },
      { size: "38", ratio: 1 },
      { size: "39", ratio: 1 },
    ],
  },
  {
    id: "preset_6_35_40",
    name: "Curva 35 - 40 (6 pares)",
    description: "1 par por cada talla del 35 al 40",
    units: 6,
    curve: [
      { size: "35", ratio: 1 },
      { size: "36", ratio: 1 },
      { size: "37", ratio: 1 },
      { size: "38", ratio: 1 },
      { size: "39", ratio: 1 },
      { size: "40", ratio: 1 },
    ],
  },
  {
    id: "preset_6_35_39_rep35",
    name: "Curva 35 - 39 con Repetición en 35 (6 pares)",
    description: "2 pares en Talla 35, 1 par en 36, 37, 38 y 39",
    units: 6,
    curve: [
      { size: "35", ratio: 2 },
      { size: "36", ratio: 1 },
      { size: "37", ratio: 1 },
      { size: "38", ratio: 1 },
      { size: "39", ratio: 1 },
    ],
  },
  {
    id: "preset_6_35_39_rep36_37",
    name: "Curva 35 - 38 con Repetición 36 y 37 (6 pares)",
    description: "2 pares en 36 y 37, 1 par en 35 y 38",
    units: 6,
    curve: [
      { size: "35", ratio: 1 },
      { size: "36", ratio: 2 },
      { size: "37", ratio: 2 },
      { size: "38", ratio: 1 },
    ],
  },
  {
    id: "preset_8_32_40",
    name: "Curva Amplia 32 - 40 (8 pares)",
    description: "1 par por cada talla del 32 al 40",
    units: 8,
    curve: [
      { size: "32", ratio: 1 },
      { size: "34", ratio: 1 },
      { size: "35", ratio: 1 },
      { size: "36", ratio: 1 },
      { size: "37", ratio: 1 },
      { size: "38", ratio: 1 },
      { size: "39", ratio: 1 },
      { size: "40", ratio: 1 },
    ],
  },
  {
    id: "preset_8_34_40_rep36_37",
    name: "Curva 34 - 40 con Repetición 36 y 37 (8 pares)",
    description: "2 pares en 36 y 37, 1 par en 34, 35, 38, 39 y 40",
    units: 8,
    curve: [
      { size: "34", ratio: 1 },
      { size: "35", ratio: 1 },
      { size: "36", ratio: 2 },
      { size: "37", ratio: 2 },
      { size: "38", ratio: 1 },
      { size: "39", ratio: 1 },
      { size: "40", ratio: 1 },
    ],
  },
];

export const POPULAR_SHOE_SIZES = [
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
];

/**
 * Calculates total units in a curve by summing the ratios/pairs
 */
export function calculateCurveTotalUnits(curve: SizeRatio[]): number {
  if (!Array.isArray(curve)) return 0;
  return curve.reduce((acc, item) => {
    const r = Number(item.ratio);
    if (!isNaN(r) && r > 0) return acc + r;
    const s = Number(item.stock);
    if (!isNaN(s) && s > 0) return acc + s;
    return acc + 1;
  }, 0);
}

/**
 * Sorts sizes in numeric/logical order (e.g. 34, 35, 36...)
 */
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });
}

/**
 * Reconstruye la Serie al EDITAR agregando y acumulando las cantidades reales.
 * Si Talla 37 tiene 2 variantes o stock=2 en BD, asignará ratio: 2 y total: 6 pares.
 */
/**
 * Reconstruye la configuración de Serie al EDITAR, conservando fielmente
 * el stock físico real de cada talla en BD y los ratios de la curva.
 */
export function buildEditSeriesConfig(
  mainProduct: any,
  siblings: any[] = []
): SeriesConfig {
  const allVariants = siblings.length > 0 ? siblings : (mainProduct ? [mainProduct] : []);
  const meta = decodeSeriesMetadata(mainProduct?.description);

  // Mapear cada talla con su stock físico real acumulado y ratio definido
  const sizeMap = new Map<string, SizeRatio>();

  allVariants.forEach((variant) => {
    if (!variant) return;
    const size = extractSizeFromProduct(variant);
    if (!size) return;

    const realStock = Math.max(0, Number(variant.stock ?? 0));
    const metaRatio = meta?.curve?.find((c) => c.size === size)?.ratio || 1;

    if (sizeMap.has(size)) {
      const existing = sizeMap.get(size)!;
      existing.stock = (existing.stock || 0) + realStock;
    } else {
      sizeMap.set(size, {
        size,
        ratio: metaRatio,
        stock: realStock, // Pares reales en almacén
        productId: variant.id,
        sku: variant.sku,
        costPrice: Number(variant.costPrice) || Number(mainProduct?.costPrice) || 0,
        salePrice: Number(variant.salePrice) || Number(mainProduct?.salePrice) || 0,
      });
    }
  });

  // Si meta.curve contiene tallas adicionales que no tenían variantes aún
  if (meta?.curve && meta.curve.length > 0) {
    meta.curve.forEach((item) => {
      if (!sizeMap.has(item.size)) {
        sizeMap.set(item.size, {
          size: item.size,
          ratio: item.ratio || 1,
          stock: 0,
          costPrice: Number(mainProduct?.costPrice) || 0,
          salePrice: Number(mainProduct?.salePrice) || 0,
        });
      }
    });
  }

  const rawCurve: SizeRatio[] = Array.from(sizeMap.values());
  const sortedSizes = sortSizes(rawCurve.map((c) => c.size));
  const finalCurve = sortedSizes.map((sz) => rawCurve.find((c) => c.size === sz)!);

  // Calcula pares por serie sumando los ratios de la curva
  const totalUnits = calculateCurveTotalUnits(finalCurve) || 6;

  const costUnit = Number(mainProduct?.costPrice) || 0;
  const saleUnit = Number(mainProduct?.salePrice || mainProduct?.price) || 0;

  const costSeries = meta?.pricePerSeries
    ? Number(meta.pricePerSeries)
    : Number((costUnit * totalUnits).toFixed(2));

  const saleSeries = meta?.pricePerSeries
    ? Number(meta.pricePerSeries)
    : Number((saleUnit * totalUnits).toFixed(2));

  const summary = computeSeriesStockSummary(
    finalCurve.map((c) => ({
      size: c.size,
      stock: c.stock || 0,
      ratio: c.ratio || 1,
    })),
    finalCurve
  );

  return {
    curve: finalCurve,
    unitsPerSeries: totalUnits,
    seriesStock: summary.completeSeries > 0 ? summary.completeSeries : 1,
    taco: meta?.taco || extractTacoFromProduct(mainProduct),
    costPricePerSeries: costSeries,
    salePricePerSeries: saleSeries,
    costPricePerUnit: costUnit,
    salePricePerUnit: saleUnit,
  };
}

/**
 * Computes how many full series can be assembled and how many loose pairs remain
 * based on current stocks and the series curve.
 */
export function computeSeriesStockSummary(
  sizesData: Array<{
    size: string;
    stock: number;
    ratio?: number;
    productId?: string;
    salePrice?: number;
    costPrice?: number;
  }>,
  curve?: SizeRatio[]
): SeriesStockSummary {
  const curveMap = new Map<string, number>();
  if (curve && curve.length > 0) {
    curve.forEach((c) => curveMap.set(c.size, c.ratio || 1));
  }

  const sizes = sizesData.map((item) => {
    const ratio = item.ratio || curveMap.get(item.size) || 1;
    const stock = Math.max(0, item.stock || 0);
    const maxSeriesForSize = ratio > 0 ? Math.floor(stock / ratio) : 0;
    return {
      size: item.size,
      stock,
      ratio,
      maxSeriesForSize,
      isLimiting: false,
      productId: item.productId,
      salePrice: item.salePrice,
      costPrice: item.costPrice,
    };
  });

  sizes.sort((a, b) => {
    const numA = parseFloat(a.size);
    const numB = parseFloat(b.size);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.size.localeCompare(b.size);
  });

  if (sizes.length === 0) {
    return {
      isSeries: false,
      completeSeries: 0,
      looseUnits: 0,
      totalUnits: 0,
      unitsPerSeries: 0,
      sizes: [],
    };
  }

  const unitsPerSeries = sizes.reduce((acc, s) => acc + s.ratio, 0);
  const totalUnits = sizes.reduce((acc, s) => acc + s.stock, 0);

  const completeSeries = Math.min(...sizes.map((s) => s.maxSeriesForSize));

  sizes.forEach((s) => {
    if (s.maxSeriesForSize === completeSeries && completeSeries >= 0) {
      s.isLimiting = true;
    }
  });

  const usedInCompleteSeries = completeSeries * unitsPerSeries;
  const looseUnits = Math.max(0, totalUnits - usedInCompleteSeries);

  return {
    isSeries: unitsPerSeries > 0,
    completeSeries: Math.max(0, completeSeries),
    looseUnits,
    totalUnits,
    unitsPerSeries,
    sizes,
  };
}

/**
 * Encodes series metadata into a structured tag stored safely in product description.
 * Uses unambiguous [SERIE_START] ... [SERIE_END] delimiters to completely avoid
 * premature termination from inner JSON array brackets like c:[{"s":"35","r":1}].
 */
export function encodeSeriesMetadata(config: {
  seriesId: string;
  unitsPerSeries: number;
  curve: Array<{ size: string; ratio: number }>;
  pricePerSeries?: number;
  pricePerUnit?: number;
  taco?: string;
}): string {
  const payload = {
    sid: config.seriesId,
    u: config.unitsPerSeries,
    c: config.curve.map((x) => ({ s: x.size, r: x.ratio })),
    pps: config.pricePerSeries,
    ppu: config.pricePerUnit,
    t: config.taco,
  };
  return `[SERIE_START]${JSON.stringify(payload)}[SERIE_END]`;
}

/**
 * Decodes series metadata from product description safely,
 * supporting both modern [SERIE_START]...[SERIE_END] and legacy [SERIE:{...}].
 */
export function decodeSeriesMetadata(
  description?: string
): {
  seriesId?: string;
  unitsPerSeries?: number;
  curve?: Array<{ size: string; ratio: number }>;
  pricePerSeries?: number;
  pricePerUnit?: number;
  taco?: string;
} | null {
  if (!description) return null;

  // 1. Modern safe delimiter: [SERIE_START]...[SERIE_END]
  const modernMatch = description.match(/\[SERIE_START\]([\s\S]*?)\[SERIE_END\]/);
  if (modernMatch && modernMatch[1]) {
    try {
      const data = JSON.parse(modernMatch[1]);
      return {
        seriesId: data.sid,
        unitsPerSeries: data.u,
        curve: data.c?.map((x: any) => ({ size: x.s, ratio: x.r })),
        pricePerSeries: data.pps,
        pricePerUnit: data.ppu,
        taco: data.t,
      };
    } catch {
      // Fall through to legacy
    }
  }

  // 2. Legacy delimiter [SERIE:{...}] with balanced brace counting
  const tagIdx = description.indexOf("[SERIE:");
  if (tagIdx !== -1) {
    const startBrace = description.indexOf("{", tagIdx);
    if (startBrace !== -1) {
      let depth = 0;
      let jsonStr = "";
      for (let i = startBrace; i < description.length; i++) {
        if (description[i] === "{") depth++;
        else if (description[i] === "}") {
          depth--;
          if (depth === 0) {
            jsonStr = description.substring(startBrace, i + 1);
            break;
          }
        }
      }
      if (jsonStr) {
        try {
          const data = JSON.parse(jsonStr);
          return {
            seriesId: data.sid,
            unitsPerSeries: data.u,
            curve: data.c?.map((x: any) => ({ size: x.s, ratio: x.r })),
            pricePerSeries: data.pps,
            pricePerUnit: data.ppu,
            taco: data.t,
          };
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  return null;
}

/**
 * Strips out internal metadata tags, balanced series JSON, and any orphaned JSON fragments
 * so the user only sees clean, human-written text.
 */
export function cleanDescriptionForDisplay(description?: string): string {
  if (!description) return "";
  let cleaned = description;

  // 1. Remove modern [SERIE_START]...[SERIE_END] tags
  cleaned = cleaned.replace(/\[SERIE_START\][\s\S]*?\[SERIE_END\]/gi, "");

  // 2. Remove balanced legacy [SERIE:{...}] tags safely (does not get confused by inner arrays)
  while (true) {
    const tagIdx = cleaned.indexOf("[SERIE:");
    if (tagIdx === -1) break;
    const startBrace = cleaned.indexOf("{", tagIdx);
    if (startBrace === -1) {
      cleaned = cleaned.replace(/\[SERIE:[\s\S]*?\]/gi, "").replace(/\[SERIE:[\s\S]*/gi, "");
      break;
    }
    let depth = 0;
    let endIdx = -1;
    for (let i = startBrace; i < cleaned.length; i++) {
      if (cleaned[i] === "{") depth++;
      else if (cleaned[i] === "}") {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx !== -1) {
      const closeBracket = cleaned.indexOf("]", endIdx);
      const cutEnd = closeBracket !== -1 && closeBracket - endIdx <= 4 ? closeBracket + 1 : endIdx + 1;
      cleaned = cleaned.substring(0, tagIdx) + cleaned.substring(cutEnd);
    } else {
      cleaned = cleaned.substring(0, tagIdx);
      break;
    }
  }

  // 3. Remove any orphaned fragments leftover from previous buggy regex cuts:
  // e.g. ,"pps":1235,"ppu":247,"t":"Taco 5"}]
  cleaned = cleaned
    .replace(/,?\s*"pps"\s*:\s*[0-9.]+(?:,\s*"ppu"\s*:\s*[0-9.]+)?(?:,\s*"t"\s*:\s*"[^"]*")?\s*\}?\s*\]?/gi, "")
    .replace(/,?\s*"ppu"\s*:\s*[0-9.]+(?:,\s*"t"\s*:\s*"[^"]*")?\s*\}?\s*\]?/gi, "")
    .replace(/,?\s*"t"\s*:\s*"[^"]*"\s*\}?\s*\]?/gi, "")
    .replace(/,?\s*"sid"\s*:\s*"[^"]*"/gi, "")
    .replace(/,?\s*"u"\s*:\s*[0-9.]+/gi, "")
    .replace(/,?\s*"c"\s*:\s*\[[\s\S]*?\]/gi, "")
    .replace(/\[SERIE:[\s\S]*?\]/gi, "")
    .replace(/\[SERIE:[\s\S]*/gi, "")
    .replace(/\[TACO:[\s\S]*?\]/gi, "")
    .replace(/\[TACO:[\s\S]*/gi, "")
    .replace(/\[CURVE:[\s\S]*?\]/gi, "")
    .replace(/\[CURVE:[\s\S]*/gi, "")
    .replace(/\[METADATA:[\s\S]*?\]/gi, "")
    .replace(/\{"seriesId":[\s\S]*?\}/gi, "")
    .replace(/\{"seriesId":[\s\S]*/gi, "")
    .replace(/\{[\s\S]*?"pricePerSeries"[\s\S]*?\}/gi, "")
    .replace(/,?[\s\S]*?"pricePerSeries"[\s\S]*?\]/gi, "")
    .replace(/\{[\s\S]*?"curve"[\s\S]*?\}/gi, "");

  // 4. Remove dangling JSON/punctuation marks at end or beginning
  cleaned = cleaned
    .replace(/[,\s{}\[\]":;.\-_]+$/g, "")
    .replace(/^[,\s{}\[\]":;.\-_]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // If only punctuation/orphaned characters remained, return empty
  if (
    !cleaned ||
    /^[,\s{}\[\]":;.\-_]+$/.test(cleaned) ||
    cleaned.includes('"pricePerSeries"') ||
    cleaned.includes('"seriesId"') ||
    cleaned.includes('"pps"') ||
    cleaned.includes('"sid"')
  ) {
    return "";
  }
  return cleaned;
}

/**
 * Strips out size identifiers to leave a clean model title so series group together.
 * E.g. "Stiletto Charol - Talla 36" -> "Stiletto Charol"
 */
export function cleanModelName(rawName: string, isShoeContext: boolean = false): string {
  if (!rawName) return "";
  let cleaned = rawName
    .replace(/\s*-\s*talla\s*[0-9]{2}(?:\.[0-9])?/gi, "")
    .replace(/(?:-\s*)?(?:talla|t:)\s*[0-9]{2}(?:\.[0-9])?/gi, "")
    .replace(/\s*\(\s*talla\s*[0-9]{2}\s*\)/gi, "");

  if (isShoeContext) {
    cleaned = cleaned.replace(/[-_/\s](3[0-9]|4[0-5])$/gi, "");
  }
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

/**
 * Extracts size from name, description, presentations, or sku
 * Solamente cuando el contexto o producto corresponde a Calzado o Ropa/Moda.
 * Evita estrictamente falsos positivos en rubros como Electrodomésticos, Tecnología, Ferretería o Farmacia.
 */
export function extractSizeFromProduct(product: any, userRubro?: string): string {
  if (!product) return "";

  const rubro = (userRubro || "").toLowerCase();
  const isNonApparelRubro =
    rubro.includes("electro") ||
    rubro.includes("lectro") ||
    rubro.includes("refriger") ||
    rubro.includes("lavador") ||
    rubro.includes("congelad") ||
    rubro.includes("linea blanca") ||
    rubro.includes("cocina") ||
    rubro.includes("tecno") ||
    rubro.includes("comput") ||
    rubro.includes("laptop") ||
    rubro.includes("celular") ||
    rubro.includes("ferret") ||
    rubro.includes("farma") ||
    rubro.includes("botic") ||
    rubro.includes("abarrot") ||
    rubro.includes("minimarket") ||
    rubro.includes("bodeg") ||
    rubro.includes("restauran") ||
    rubro.includes("comida");

  const combined = `${product.name || ""} ${product.description || ""} ${product.sku || ""}`.toLowerCase();

  const isExplicitShoeProduct =
    product.unit === "Serie" ||
    product.unit === "Par" ||
    product.unit === "Talla" ||
    decodeSeriesMetadata(product.description) !== null ||
    /(?:calzad|zapato|sandalia|bota|botin|stiletto|tac[oó]n|sneaker|pantufl)/i.test(combined);

  // Si el rubro NO es calzado/moda y el producto NO tiene indicios explícitos de calzado, JAMÁS extraer talla
  if (isNonApparelRubro && !isExplicitShoeProduct) {
    return "";
  }

  // If size is explicitly present in product object
  if (product.size && String(product.size).trim()) {
    if (!isNonApparelRubro || isExplicitShoeProduct) {
      return String(product.size).trim();
    }
  }
  if (product.talla && String(product.talla).trim()) {
    return String(product.talla).trim();
  }

  // Explicit size prefix: e.g. "Talla 37", "Talla: 38"
  const explicit = `${product.name || ""} ${product.description || ""}`.match(/\b(?:talla|t:)\s*([0-9]{2}(?:\.[0-9])?|[SMLX|XL|XXL]+)\b/i);
  if (explicit && explicit[1]) return explicit[1].trim();

  // Trailing SKU like -37 or _38 SOLO si es calzado o confección/moda
  const isApparelProduct =
    isExplicitShoeProduct ||
    rubro.includes("calzad") ||
    rubro.includes("ropa") ||
    rubro.includes("moda") ||
    rubro.includes("boutique") ||
    rubro.includes("textil") ||
    rubro.includes("confecc");

  if (isApparelProduct) {
    const skuMatch = (product.sku || "").match(/[-_/\s](3[0-9]|4[0-5])$/i);
    if (skuMatch && skuMatch[1]) return skuMatch[1].trim();

    // Presentations
    if (product.presentations && product.presentations.length > 0) {
      for (const p of product.presentations) {
        const presMatch = p.name.match(/\b(?:talla|t:)?\s*([0-9]{2})\b/i);
        if (presMatch && presMatch[1]) return presMatch[1].trim();
      }
    }
  }

  // Standalone numbers 30-45 ONLY for footwear context
  if (isExplicitShoeProduct) {
    const standalone = combined.match(/\b(3[0-9]|4[0-5])\b/);
    if (standalone && standalone[1]) return standalone[1].trim();
  }

  return "";
}

export const ALL_KNOWN_COLOR_NAMES = new Set([
  "NEGRO", "BLANCO", "GRIS", "PLATA", "PLATEADO", "DORADO", "ORO", "BRONCE",
  "BEIGE", "CREMA", "MARRON", "MARRÓN", "CAMEL", "NUDE", "ROSA", "ROSADO",
  "FUCSIA", "GUINDA", "VINO", "LILA", "MORADO", "PURPLE", "NARANJA", "ROJO",
  "AZUL", "VERDE", "AMARILLO", "INOX", "ACERO", "ACERO INOXIDABLE", "TURQUESA",
  "CELESTE", "CAFE", "CAFÉ", "CHAMPAGNE", "TRANSPARENTE", "VIOLETA", "CORAL",
  "MOSTAZA", "OLIVA", "MILITAR", "VERDE MILITAR", "AZUL MARINO", "AZUL REY"
]);

export function isColorString(str?: string | null): boolean {
  if (!str) return false;
  const clean = str.trim().toUpperCase().replace(/^COL(?:OR)?\.?\s*[:=\-]?\s*/i, "").trim();
  if (ALL_KNOWN_COLOR_NAMES.has(clean)) return true;
  for (const c of ALL_KNOWN_COLOR_NAMES) {
    if (clean === c || clean.startsWith(`${c} `) || clean.endsWith(` ${c}`)) return true;
  }
  return false;
}

/**
 * Extrae de manera inteligente la especificación, medida, capacidad o badge
 * para el código de barras y etiquetas de impresión según el rubro comercial real.
 * GARANTÍA ABSOLUTA: Jamás retorna un color para evitar duplicados en stickers.
 */
export function extractProductSpecBadge(product: any, businessRubro?: string | null): string {
  const badge = internalExtractProductSpecBadge(product, businessRubro);
  if (isColorString(badge)) return "";
  return badge;
}

function internalExtractProductSpecBadge(product: any, businessRubro?: string | null): string {
  if (!product) return "";
  
  const rubro = (businessRubro || "").toLowerCase();

  // 1. Calzado o Ropa / Moda
  const isFootwearOrApparel =
    rubro.includes("calzad") ||
    rubro.includes("zapato") ||
    rubro.includes("veaz") ||
    rubro.includes("stiletto") ||
    rubro.includes("ropa") ||
    rubro.includes("moda") ||
    rubro.includes("boutique") ||
    product.unit === "Serie" ||
    product.unit === "Par" ||
    product.unit === "Talla" ||
    decodeSeriesMetadata(product.description) !== null;

  if (isFootwearOrApparel) {
    const size = extractSizeFromProduct(product, businessRubro || undefined);
    if (size) return `TALLA: ${size}`;
    if (product.unit === "Serie") return "SERIE";
    if (product.unit && product.unit !== "Unidad" && product.unit !== "UNIDAD") return product.unit.toUpperCase();
    return "";
  }

  // 2. Electrodomésticos / Línea Blanca / Tecnología
  const isElectroOrTech =
    rubro.includes("electro") ||
    rubro.includes("lectro") ||
    rubro.includes("refriger") ||
    rubro.includes("lavador") ||
    rubro.includes("congelad") ||
    rubro.includes("cocina") ||
    rubro.includes("linea blanca") ||
    rubro.includes("licuador") ||
    rubro.includes("tecno") ||
    rubro.includes("comput") ||
    rubro.includes("laptop") ||
    rubro.includes("celular");

  if (isElectroOrTech) {
    const desc = `${product.description || ""} ${product.name || ""}`;
    
    // Pulgadas ej: 65", 55", 43" o 65 pulgadas
    const inchesMatch = desc.match(/(\d{2}(?:\.\d)?\s*(?:["”']|pulgadas?|inch))/i);
    if (inchesMatch) return inchesMatch[1].toUpperCase().replace("PULGADAS", "PULG").trim();

    // Capacidad ej: 500L, 12kg, 20L, 220V, 1500W
    const capMatch = desc.match(/\b(\d+(?:\.\d)?\s*(?:l|litros?|kg|kilos?|watts?|w|btu|v|voltios?|gb|tb|mah))\b/i);
    if (capMatch) return capMatch[1].toUpperCase();

    // Hornillas / quemadores para cocinas
    const burnerMatch = desc.match(/\b(\d+\s*(?:hornillas?|quemadores?|platos?))\b/i);
    if (burnerMatch) return burnerMatch[1].toUpperCase();

    // Tipo de combustible / energía
    const gasMatch = desc.match(/\b(glp|gnv|a gas|gas natural|inducción|eléctrica|electrica)\b/i);
    if (gasMatch) return gasMatch[1].toUpperCase();

    // Tecnologías clave
    const techMatch = desc.match(/\b(4k\s*uhd|4k|uhd|fhd|oled|qled|smart\s*tv|inverter|no\s*frost)\b/i);
    if (techMatch) return techMatch[1].toUpperCase();

    if (product.unit && product.unit !== "Unidad" && product.unit !== "UNIDAD") {
      return product.unit.toUpperCase();
    }
    return "";
  }

  // 3. Farmacia
  if (rubro.includes("farma") || rubro.includes("botic") || rubro.includes("salud") || rubro.includes("medic")) {
    const desc = `${product.name || ""} ${product.description || ""}`;
    const doseMatch = desc.match(/\b(\d+(?:\.\d)?\s*(?:mg|ml|g|mcg|gr))\b/i);
    if (doseMatch) return doseMatch[1].toUpperCase();
    if (product.unit && product.unit !== "Unidad" && product.unit !== "UNIDAD") return product.unit.toUpperCase();
    return "FARMACÉUTICO";
  }

  // 4. Ferretería
  if (rubro.includes("ferret") || rubro.includes("construc") || rubro.includes("herramient")) {
    const desc = `${product.name || ""} ${product.description || ""}`;
    const measureMatch = desc.match(/(\d+\/\d+["”']|\d+(?:\.\d)?\s*(?:mm|cm|mts?|metros?|pulgadas?))/i);
    if (measureMatch) return measureMatch[1].toUpperCase();
    if (product.unit && product.unit !== "Unidad" && product.unit !== "UNIDAD") return product.unit.toUpperCase();
    return "ESTÁNDAR";
  }

  // 5. Abarrotes / Alimentos
  if (rubro.includes("abarrot") || rubro.includes("minimarket") || rubro.includes("bodeg") || rubro.includes("alimento")) {
    const desc = `${product.name || ""} ${product.description || ""}`;
    const weightMatch = desc.match(/\b(\d+(?:\.\d)?\s*(?:kg|g|gr|l|ml|litros?|kilos?|paquete|sixpack|pack))\b/i);
    if (weightMatch) return weightMatch[1].toUpperCase();
    if (product.unit && product.unit !== "Unidad" && product.unit !== "UNIDAD") return product.unit.toUpperCase();
    return "PREMIUM";
  }

  // Si el producto tiene talla explícita (e.g. moda)
  const fallbackSize = extractSizeFromProduct(product, businessRubro || undefined);
  if (fallbackSize) return `TALLA: ${fallbackSize}`;

  // Default unit si no es la genérica
  if (product.unit && product.unit !== "Unidad" && product.unit !== "UNIDAD") {
    return product.unit.toUpperCase();
  }

  return "";
}

/**
 * Extracts taco/heel attribute from product metadata or text description
 */
export function extractTacoFromProduct(product: any): string {
  if (!product) return "";
  const meta = decodeSeriesMetadata(product.description);
  if (meta?.taco) return meta.taco;
  const tagMatch = (product.description || "").match(/\[TACO:(.*?)\]/i);
  if (tagMatch && tagMatch[1]) return tagMatch[1].trim();
  const desc = `${product.description || ""} ${product.name || ""}`.toLowerCase();
  const match = desc.match(/\btaco\s*:?\s*([0-9]+|flat|plano|plataforma|cuña|wedge|aguja|stiletto)\b/i);
  if (match) {
    const val = match[1].trim();
    return isNaN(Number(val)) ? val.charAt(0).toUpperCase() + val.slice(1) : `Taco ${val}`;
  }
  return "";
}

export interface GroupedSeriesProduct {
  groupKey: string;
  modelName: string;
  brandName: string;
  familyName?: string;
  color?: string;
  taco?: string;
  imageUrl?: string;
  sku?: string;
  customCode?: number;
  description?: string;
  isSeries: boolean;
  unitsPerSeries: number;
  curve: SizeRatio[];
  summary: SeriesStockSummary;
  variants: any[];
  primaryProduct: any;
  salePricePerSeries: number;
  salePricePerUnit: number;
  costPricePerSeries: number;
  costPricePerUnit: number;
  adjustedPrice?: number;
  hasOffer?: boolean;
}

/**
 * Groups a list of products by Serie/Model.
 * Preserves non-series products as standalone single items, and merges series products
 * into a single unified model item with complete real-time stock breakdowns.
 */
export function groupProductsBySeries(products: any[], activeBranchId?: string): GroupedSeriesProduct[] {
  if (!products || products.length === 0) return [];

  const map = new Map<string, GroupedSeriesProduct>();

  products.forEach((prod) => {
    const meta = decodeSeriesMetadata(prod.description);
    const isSeriesUnit = prod.unit === "Serie" || !!meta;
    const cleanName = cleanModelName(prod.name || "Producto");
    const brandName = prod.brand?.name?.trim() || "Sin Marca";

    const colorKey = (prod.color || "").trim().toUpperCase();
    const groupKey = isSeriesUnit
      ? (meta?.seriesId || `SERIE__${brandName.toUpperCase()}__${cleanName.toUpperCase()}__${colorKey}`)
      : `STANDALONE__${prod.id}`;

    const size = extractSizeFromProduct(prod);
    const branchStock = activeBranchId
      ? (prod.branchStocks?.find((bs: any) => bs.branchId === activeBranchId)?.stock ?? 0)
      : prod.stock;
    const stockVal = Number(branchStock) || 0;

    const ratioInCurve = meta?.curve?.find((c: any) => c.size === size)?.ratio || 1;

    if (!map.has(groupKey)) {
      const unitsPerSeries = meta?.unitsPerSeries || 6;
      const initialCurve = meta?.curve || [{ size, ratio: ratioInCurve }];
      const priceSeries = meta?.pricePerSeries || Number(prod.salePrice) * unitsPerSeries;
      const priceUnit = meta?.pricePerUnit || Number(prod.salePrice);
      const costUnit = Number(prod.costPrice) || 0;
      const costSeries = costUnit * unitsPerSeries;
      const taco = meta?.taco || extractTacoFromProduct(prod);
      const hasOffer = Boolean(
        prod.adjustedPrice &&
        Number(prod.adjustedPrice) > 0 &&
        Number(prod.adjustedPrice) < Number(prod.salePrice)
      );
      const adjustedPrice = hasOffer ? Number(prod.adjustedPrice) : undefined;

      map.set(groupKey, {
        groupKey,
        modelName: cleanName,
        brandName,
        familyName: prod.family?.name,
        color: prod.color,
        taco,
        imageUrl: prod.imageUrl,
        sku: prod.sku?.replace(/[-_/\s](3[0-9]|4[0-5])$/i, "") || prod.sku,
        customCode: prod.customCode,
        description: cleanDescriptionForDisplay(prod.description),
        isSeries: isSeriesUnit,
        unitsPerSeries,
        curve: initialCurve,
        summary: computeSeriesStockSummary(
          [{ size, stock: stockVal, ratio: ratioInCurve, productId: prod.id, salePrice: prod.salePrice, costPrice: prod.costPrice }],
          initialCurve
        ),
        variants: [prod],
        primaryProduct: prod,
        salePricePerSeries: priceSeries,
        salePricePerUnit: priceUnit,
        costPricePerSeries: costSeries,
        costPricePerUnit: costUnit,
        adjustedPrice,
        hasOffer,
      });
    } else {
      const group = map.get(groupKey)!;
      group.variants.push(prod);

      if (!group.customCode && prod.customCode) {
        group.customCode = prod.customCode;
      } else if (prod.customCode && group.customCode && prod.customCode < group.customCode) {
        group.customCode = prod.customCode;
      }

      if (!group.color && prod.color) group.color = prod.color;
      if (!group.taco) {
        const variantTaco = meta?.taco || extractTacoFromProduct(prod);
        if (variantTaco) group.taco = variantTaco;
      }

      const variantHasOffer = Boolean(
        prod.adjustedPrice &&
        Number(prod.adjustedPrice) > 0 &&
        Number(prod.adjustedPrice) < Number(prod.salePrice)
      );
      if (variantHasOffer && !group.hasOffer) {
        group.hasOffer = true;
        group.adjustedPrice = Number(prod.adjustedPrice);
      }

      if (!group.curve.some((c) => c.size === size)) {
        group.curve.push({ size, ratio: ratioInCurve });
      }

      const sizesData = group.variants.map((v) => {
        const vSize = extractSizeFromProduct(v);
        const vBranchStock = activeBranchId
          ? (v.branchStocks?.find((bs: any) => bs.branchId === activeBranchId)?.stock ?? 0)
          : v.stock;
        const vRatio = group.curve.find((c) => c.size === vSize)?.ratio || 1;
        return {
          size: vSize,
          stock: Number(vBranchStock) || 0,
          ratio: vRatio,
          productId: v.id,
          salePrice: v.salePrice,
          costPrice: v.costPrice,
        };
      });

      group.summary = computeSeriesStockSummary(sizesData, group.curve);

      if (!group.imageUrl && prod.imageUrl) {
        group.imageUrl = prod.imageUrl;
      }
    }
  });

  return Array.from(map.values());
}