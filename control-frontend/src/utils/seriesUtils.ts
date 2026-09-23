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
 * Calculates total units in a curve by summing the ratios
 */
export function calculateCurveTotalUnits(curve: SizeRatio[]): number {
  return curve.reduce((acc, item) => acc + (Number(item.ratio) || 0), 0);
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
 * Encodes series metadata into a structured tag stored safely in product description
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
  return `[SERIE:${JSON.stringify(payload)}]`;
}

/**
 * Decodes series metadata from product description
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
  const match = description.match(/\[SERIE:(\{.*?\})\]/);
  if (!match || !match[1]) return null;
  try {
    const data = JSON.parse(match[1]);
    return {
      seriesId: data.sid,
      unitsPerSeries: data.u,
      curve: data.c?.map((x: any) => ({ size: x.s, ratio: x.r })),
      pricePerSeries: data.pps,
      pricePerUnit: data.ppu,
      taco: data.t,
    };
  } catch {
    return null;
  }
}

/**
 * Strips out the internal [SERIE:{...}] and [TACO:...] metadata tags from description for user-facing display
 */
export function cleanDescriptionForDisplay(description?: string): string {
  if (!description) return "";
  let cleaned = description
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
    .replace(/\{[\s\S]*?"curve"[\s\S]*?\}/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // If the result consists only of orphaned punctuation or series tags, return empty string
  if (!cleaned || /^[,\s{}\[\]":;.\-_]+$/.test(cleaned) || cleaned.includes('"pricePerSeries"') || cleaned.includes('"seriesId"')) {
    return "";
  }
  return cleaned;
}

/**
 * Strips out size identifiers to leave a clean model title so series group together.
 * E.g. "Stiletto Charol - Talla 36" -> "Stiletto Charol"
 */
export function cleanModelName(rawName: string): string {
  return (rawName || "")
    .replace(/\s*-\s*talla\s*[0-9]{2}(?:\.[0-9])?/gi, "")
    .replace(/(?:-\s*)?(?:talla|t\.|t-|t:)\s*[0-9]{2}(?:\.[0-9])?/gi, "")
    .replace(/\s*\(\s*talla\s*[0-9]{2}\s*\)/gi, "")
    .replace(/[-_/\s](3[0-9]|4[0-5])$/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Extracts size from name, description, presentations, or sku
 */
export function extractSizeFromProduct(product: any): string {
  const combined = `${product.name || ""} ${product.description || ""} ${product.sku || ""}`;

  // Explicit size
  const explicit = combined.match(/(?:talla|t\.|t-|t:)\s*([0-9]{2}(?:\.[0-9])?)/i);
  if (explicit && explicit[1]) return explicit[1].trim();

  // Trailing SKU
  const skuMatch = (product.sku || "").match(/[-_/\s](3[0-9]|4[0-5])$/i);
  if (skuMatch && skuMatch[1]) return skuMatch[1].trim();

  // Presentations
  if (product.presentations && product.presentations.length > 0) {
    for (const p of product.presentations) {
      const presMatch = p.name.match(/(?:talla|t\.|t-|t:)?\s*([0-9]{2})/i);
      if (presMatch && presMatch[1]) return presMatch[1].trim();
    }
  }

  // Standalone shoe size (30 to 45)
  const standalone = combined.match(/\b(3[0-9]|4[0-5])\b/);
  if (standalone && standalone[1]) return standalone[1].trim();

  return "37"; // default fallback
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