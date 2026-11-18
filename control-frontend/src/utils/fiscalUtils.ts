/**
 * Utilidades fiscales y cálculo tributario según normativa oficial de la SUNAT (Perú).
 * Soporta los 4 Regímenes Tributarios Oficiales:
 * - RER (Régimen Especial de Renta - 1.5% Renta cancelatoria + 18% IGV)
 * - RMT (Régimen MYPE Tributario - 1.0% Renta mensual + 18% IGV)
 * - RG (Régimen General - 1.5% / Coeficiente + 18% IGV)
 * - NRUS (Nuevo Régimen Único Simplificado - Cuota fija mensual, solo Boletas)
 * Además de regímenes especiales: Ley de Amazonía N° 27037 (0% IGV), Restaurantes MYPE Ley N° 31556 (10% IGV), etc.
 */

export interface TaxRegimeOption {
  code: string;
  name: string;
  shortName: string;
  rate: number; // Tasa IGV (18.0, 10.0, 0.0)
  incomeTaxRate: number; // Tasa de Renta mensual (1.5%, 1.0%, 0%)
  sunatCode: number; // 1 = Gravado, 8 = Exonerado, 9 = Inafecto, 2 = No sujeto
  category: "RER" | "RMT" | "RG" | "NRUS" | "AMAZONIA" | "ESPECIAL";
  badge: string;
  allowedDocs: ("FACTURA" | "BOLETA" | "NOTA_CREDITO" | "GUIA_REMISION")[];
  maxAnnualIncome?: number; // Límite anual en soles
  maxWorkers?: number; // Límite de trabajadores por turno si aplica
  description: string;
  benefits: string[];
  accountingBooks: string;
  legend?: string;
}

export const TAX_REGIMES: Record<string, TaxRegimeOption> = {
  // 1. RER — RÉGIMEN ESPECIAL DE RENTA (¡El más popular para comercio y calzado!)
  RER_18: {
    code: "RER_18",
    name: "RER — Régimen Especial de Renta (18% IGV + 1.5% Renta Cancelatoria)",
    shortName: "RER (1.5% Renta)",
    rate: 18.0,
    incomeTaxRate: 1.5,
    sunatCode: 1,
    category: "RER",
    badge: "RER (SUNAT)",
    allowedDocs: ["FACTURA", "BOLETA", "NOTA_CREDITO", "GUIA_REMISION"],
    maxAnnualIncome: 525000,
    maxWorkers: 10,
    description:
      "Ideal para personas naturales con negocio y personas jurídicas (SAC, EIRL, SRL) de comercio e industria con ingresos anuales de hasta S/ 525,000. Paga una cuota fija de Renta del 1.5% mensual definitiva y cancelatoria (¡NO requiere Declaración Jurada Anual de Renta!). Emite Facturas (F001) y Boletas (B001) con 18% de IGV.",
    benefits: [
      "Cuota fija del 1.5% de Renta mensual definitiva y cancelatoria",
      "No está obligado a presentar Declaración Jurada Anual de Renta",
      "Emite Facturas electrónicas con derecho a Crédito Fiscal y Boletas de Venta",
      "Solo requiere 2 libros contables: Registro de Compras y Registro de Ventas",
      "Límite de ingresos y compras de hasta S/ 525,000 anuales",
    ],
    accountingBooks: "Solo Registro de Ventas e Ingresos y Registro de Compras",
  },

  // 2. RMT — RÉGIMEN MYPE TRIBUTARIO
  MYPE_18: {
    code: "MYPE_18",
    name: "RMT — Régimen MYPE Tributario (18% IGV + 1.0% Pago a Cuenta Renta)",
    shortName: "RMT MYPE (1.0% Renta)",
    rate: 18.0,
    incomeTaxRate: 1.0,
    sunatCode: 1,
    category: "RMT",
    badge: "MYPE (SUNAT)",
    allowedDocs: ["FACTURA", "BOLETA", "NOTA_CREDITO", "GUIA_REMISION"],
    maxAnnualIncome: 8755000, // 1700 UIT
    description:
      "Para micro y pequeñas empresas con ingresos netos de hasta 1,700 UIT (S/ 8.7M aprox). Pago a cuenta mensual del 1.0% de Renta (hasta 300 UIT de ventas acumuladas) y regularización anual progresiva (10% sobre las primeras 15 UIT de utilidad y 29.5% por el exceso). Emite Facturas y Boletas con 18% de IGV.",
    benefits: [
      "Tasa reducida del 1.0% de pago a cuenta mensual de Renta",
      "Tasa anual preferencial de solo 10% sobre las primeras 15 UIT de utilidad neta",
      "Emite Facturas (F001) y Boletas (B001) electrónicas sin restricción de actividad",
      "Permite deducir todos los gastos propios del giro del negocio y depreciación",
    ],
    accountingBooks: "Hasta 300 UIT: Registro de Ventas, Registro de Compras y Libro Diario Simplificado",
  },

  // 3. RG — RÉGIMEN GENERAL
  GENERAL_18: {
    code: "GENERAL_18",
    name: "Régimen General — RG (18% IGV + Coeficiente / 1.5% Renta)",
    shortName: "R. General 18%",
    rate: 18.0,
    incomeTaxRate: 1.5,
    sunatCode: 1,
    category: "RG",
    badge: "R. General (SUNAT)",
    allowedDocs: ["FACTURA", "BOLETA", "NOTA_CREDITO", "GUIA_REMISION"],
    description:
      "Para medianas y grandes empresas o cualquier negocio sin límites de ingresos ni compras. Pago a cuenta mensual de Renta del 1.5% o Coeficiente oficial de SUNAT, y regularización anual con tasa del 29.5% sobre la utilidad neta. Emite todo tipo de comprobantes autorizados.",
    benefits: [
      "Sin límites de ingresos anuales ni compras",
      "Permite cualquier actividad económica y contratos con el Estado sin topes",
      "Arrastre de pérdidas tributarias a ejercicios futuros",
    ],
    accountingBooks: "Según tramo de ingresos brutos anuales (Contabilidad Simplificada o Completa)",
  },

  // 4. NRUS — NUEVO RÉGIMEN ÚNICO SIMPLIFICADO
  NRUS: {
    code: "NRUS",
    name: "NRUS — Nuevo Régimen Único Simplificado (Cuota fija mensual — Solo Boletas)",
    shortName: "Nuevo RUS",
    rate: 0.0,
    incomeTaxRate: 0.0,
    sunatCode: 2,
    category: "NRUS",
    badge: "NRUS (Solo Boletas)",
    allowedDocs: ["BOLETA"],
    maxAnnualIncome: 96000, // S/ 8,000 mensual
    description:
      "Exclusivo para personas naturales con pequeños negocios (bodegas, puestos de mercado, peluquerías, bazar menor) con ingresos de hasta S/ 8,000 mensuales (S/ 96,000 al año). Paga una cuota fija mensual de S/ 20 (hasta S/ 5,000) o S/ 50 (hasta S/ 8,000). Emite ÚNICAMENTE Boletas de Venta y Tickets (NO emite Facturas ni traslada crédito fiscal).",
    benefits: [
      "No paga IGV ni Renta porcentual: cuota fija de solo S/ 20 o S/ 50 al mes",
      "No está obligado a llevar libros contables ni presentar declaraciones anuales",
      "Emite Boletas de Venta electrónicas (B001) para consumidores finales",
    ],
    accountingBooks: "No obligado a llevar libros ni registros contables",
  },

  // 5. AMAZONÍA — LEY N° 27037 (0% IGV)
  AMAZONIA_EXONERADO: {
    code: "AMAZONIA_EXONERADO",
    name: "Régimen Amazonía — Exonerado de IGV 0% (Ley N° 27037)",
    shortName: "Amazonía 0%",
    rate: 0.0,
    incomeTaxRate: 1.5,
    sunatCode: 8,
    category: "AMAZONIA",
    badge: "Ley Amazonía 0%",
    allowedDocs: ["FACTURA", "BOLETA", "NOTA_CREDITO", "GUIA_REMISION"],
    legend: "BIENES TRANSFERIDOS EN LA AMAZONÍA PARA SER CONSUMIDOS EN LA MISMA - LEY N° 27037",
    description:
      "Aplicable en Madre de Dios, Loreto, Ucayali, San Martín y Amazonas. La venta de bienes para consumo local está 100% exonerada de IGV (0.00%). En tickets, boletas y facturas se imprime automáticamente la leyenda legal obligatoria.",
    benefits: [
      "Exoneración del 100% de IGV (0.00%) en venta de bienes dentro de la región",
      "Leyenda oficial obligatoria impresa automáticamente en facturas y boletas",
      "Tasa preferencial reducida de Impuesto a la Renta regional (5% o 10%)",
    ],
    accountingBooks: "Según régimen base de la empresa (RER, RMT o General)",
  },

  // 6. RESTAURANTES Y HOTELES — LEY N° 31556 (10% IGV)
  RESTAURANTES_10: {
    code: "RESTAURANTES_10",
    name: "Restaurantes y Hoteles MYPE — Ley N° 31556 (Tasa Especial 10%)",
    shortName: "Restaurantes 10%",
    rate: 10.0,
    incomeTaxRate: 1.0,
    sunatCode: 1,
    category: "ESPECIAL",
    badge: "Turismo/Gastro 10%",
    allowedDocs: ["FACTURA", "BOLETA", "NOTA_CREDITO", "GUIA_REMISION"],
    description:
      "Tasa especial reducida de IGV al 10% (8% IGV + 2% IPM) para micro y pequeñas empresas del rubro restaurantes, cafeterías, hoteles y servicios de hospedaje turístico.",
    benefits: [
      "Ahorro de 8 puntos porcentuales en IGV (paga 10% en lugar de 18%)",
      "Emite Facturas y Boletas electrónicas calculadas con la tasa especial del 10%",
    ],
    accountingBooks: "Según régimen base de la empresa (MYPE o General)",
  },

  // 7. OPERACIONES EXONERADAS (0% IGV)
  EXONERADO_0: {
    code: "EXONERADO_0",
    name: "Operaciones Exoneradas (0% IGV — Apéndice I TUO del IGV)",
    shortName: "Exonerado 0%",
    rate: 0.0,
    incomeTaxRate: 1.5,
    sunatCode: 8,
    category: "ESPECIAL",
    badge: "Exonerado 0%",
    allowedDocs: ["FACTURA", "BOLETA", "NOTA_CREDITO", "GUIA_REMISION"],
    description:
      "Productos agrícolas no procesados, libros educativos, canasta básica y bienes amparados expresamente en el Apéndice I del TUO del IGV.",
    benefits: ["Venta libre de IGV (0.00%)"],
    accountingBooks: "Registro de Ventas e Ingresos",
  },

  // 8. OPERACIONES INAFECTAS (0% IGV)
  INAFECTO_0: {
    code: "INAFECTO_0",
    name: "Operaciones Inafectas (0% IGV)",
    shortName: "Inafecto 0%",
    rate: 0.0,
    incomeTaxRate: 1.5,
    sunatCode: 9,
    category: "ESPECIAL",
    badge: "Inafecto 0%",
    allowedDocs: ["FACTURA", "BOLETA", "NOTA_CREDITO", "GUIA_REMISION"],
    description:
      "Servicios y operaciones que no están comprendidos en el campo de aplicación del IGV según el artículo 2 del TUO del IGV.",
    benefits: ["Operación no sujeta a imposición de IGV"],
    accountingBooks: "Registro de Ventas e Ingresos",
  },
};

// Aliases para máxima compatibilidad con bases de datos existentes
TAX_REGIMES.RER = TAX_REGIMES.RER_18;
TAX_REGIMES.RMT = TAX_REGIMES.MYPE_18;
TAX_REGIMES.MYPE = TAX_REGIMES.MYPE_18;
TAX_REGIMES.RG = TAX_REGIMES.GENERAL_18;
TAX_REGIMES.GENERAL = TAX_REGIMES.GENERAL_18;
TAX_REGIMES.RUS = TAX_REGIMES.NRUS;
TAX_REGIMES.AMAZONIA_0 = TAX_REGIMES.AMAZONIA_EXONERADO;
TAX_REGIMES.AMAZONIA = TAX_REGIMES.AMAZONIA_EXONERADO;
TAX_REGIMES.RESTAURANTE_10 = TAX_REGIMES.RESTAURANTES_10;

export const TAX_REGIMES_LIST: TaxRegimeOption[] = [
  TAX_REGIMES.RER_18,
  TAX_REGIMES.MYPE_18,
  TAX_REGIMES.GENERAL_18,
  TAX_REGIMES.NRUS,
  TAX_REGIMES.AMAZONIA_EXONERADO,
  TAX_REGIMES.RESTAURANTES_10,
  TAX_REGIMES.EXONERADO_0,
  TAX_REGIMES.INAFECTO_0,
];

/**
 * Departamentos comprendidos en la Ley de Promoción de la Inversión en la Amazonía (Ley N° 27037)
 */
export const AMAZONIA_DEPARTMENTS = [
  "madre de dios",
  "loreto",
  "ucayali",
  "san martín",
  "san martin",
  "amazonas",
];

export function isAmazoniaDepartment(department?: string | null): boolean {
  if (!department) return false;
  const clean = department.trim().toLowerCase();
  return AMAZONIA_DEPARTMENTS.some((d) => clean.includes(d));
}

export interface FiscalBreakdown {
  regimeCode: string;
  regimeName: string;
  shortName: string;
  category: "RER" | "RMT" | "RG" | "NRUS" | "AMAZONIA" | "ESPECIAL";
  isExonerated: boolean;
  isAmazonia: boolean;
  isRestaurantes: boolean;
  isNrus: boolean;
  rate: number;
  incomeTaxRate: number;
  estimatedIncomeTax: number; // Pago a cuenta / cuota estimada de Renta
  baseGravada: number;
  baseExonerada: number;
  baseInafecta: number;
  igv: number;
  total: number;
  legend: string;
  allowedDocs: ("FACTURA" | "BOLETA" | "NOTA_CREDITO" | "GUIA_REMISION")[];
}

/**
 * Calcula el desglose tributario exacto en función del régimen configurado o departamento
 */
export function calculateFiscalBreakdown(
  totalAmount: number,
  config?: {
    taxRegime?: string | null;
    department?: string | null;
    igvRate?: number | null;
    igvAffectation?: string | null;
  }
): FiscalBreakdown {
  const total = Number((Number(totalAmount) || 0).toFixed(2));
  const dept = config?.department || "";
  const autoAmazonia = isAmazoniaDepartment(dept);

  // Si se pasa una afectación explícita (ej. desde el modal POS o Facturación)
  if (config?.igvAffectation === "20") {
    return {
      regimeCode: "AMAZONIA_EXONERADO",
      regimeName: "Régimen Amazonía — Exonerado de IGV 0% (Ley N° 27037)",
      shortName: "Exonerado 0%",
      category: "AMAZONIA",
      isExonerated: true,
      isAmazonia: true,
      isRestaurantes: false,
      isNrus: false,
      rate: 0.0,
      incomeTaxRate: 1.5,
      estimatedIncomeTax: Number((total * 0.015).toFixed(2)),
      baseGravada: 0,
      baseExonerada: total,
      baseInafecta: 0,
      igv: 0,
      total,
      legend: "BIENES TRANSFERIDOS EN LA AMAZONÍA PARA SER CONSUMIDOS EN LA MISMA - LEY N° 27037",
      allowedDocs: ["FACTURA", "BOLETA", "NOTA_CREDITO", "GUIA_REMISION"],
    };
  }

  if (config?.igvAffectation === "30") {
    return {
      regimeCode: "INAFECTO_0",
      regimeName: "Operaciones Inafectas (0% IGV)",
      shortName: "Inafecto 0%",
      category: "ESPECIAL",
      isExonerated: true,
      isAmazonia: false,
      isRestaurantes: false,
      isNrus: false,
      rate: 0.0,
      incomeTaxRate: 1.5,
      estimatedIncomeTax: Number((total * 0.015).toFixed(2)),
      baseGravada: 0,
      baseExonerada: 0,
      baseInafecta: total,
      igv: 0,
      total,
      legend: "",
      allowedDocs: ["FACTURA", "BOLETA", "NOTA_CREDITO", "GUIA_REMISION"],
    };
  }

  if (config?.igvAffectation === "10") {
    const rate = config.igvRate ? Number(config.igvRate) : 18.0;
    const isSpecialMype = rate <= 10.5;
    const divisor = 1 + rate / 100;
    const base = Number((total / divisor).toFixed(2));
    const igv = Number((total - base).toFixed(2));
    return {
      regimeCode: isSpecialMype ? "RESTAURANTES_10" : "GENERAL_18",
      regimeName: isSpecialMype
        ? `Gravado ${rate}% Especial (Ley N° 31556)`
        : `Gravado ${rate}% General (SUNAT)`,
      shortName: `Gravado ${rate}%`,
      category: isSpecialMype ? "ESPECIAL" : "RG",
      isExonerated: false,
      isAmazonia: false,
      isRestaurantes: isSpecialMype,
      isNrus: false,
      rate,
      incomeTaxRate: 1.0,
      estimatedIncomeTax: Number((base * 0.01).toFixed(2)),
      baseGravada: base,
      baseExonerada: 0,
      baseInafecta: 0,
      igv,
      total,
      legend: "",
      allowedDocs: ["FACTURA", "BOLETA", "NOTA_CREDITO", "GUIA_REMISION"],
    };
  }

  // Si no se especificó régimen pero el departamento es amazónico (ej. Madre de Dios), usar Amazonía
  let rawRegimeCode = config?.taxRegime || (autoAmazonia ? "AMAZONIA_EXONERADO" : "RER_18");

  if (autoAmazonia && (rawRegimeCode === "GENERAL_18" || rawRegimeCode === "RER_18")) {
    rawRegimeCode = "AMAZONIA_EXONERADO";
  }

  const regime = TAX_REGIMES[rawRegimeCode] || TAX_REGIMES.RER_18;

  // 1. Amazonía (Ley N° 27037 - 0% IGV)
  if (regime.category === "AMAZONIA" || regime.code === "AMAZONIA_EXONERADO") {
    return {
      regimeCode: regime.code,
      regimeName: regime.name,
      shortName: regime.shortName,
      category: "AMAZONIA",
      isExonerated: true,
      isAmazonia: true,
      isRestaurantes: false,
      isNrus: false,
      rate: 0.0,
      incomeTaxRate: regime.incomeTaxRate || 1.5,
      estimatedIncomeTax: Number((total * 0.015).toFixed(2)),
      baseGravada: 0,
      baseExonerada: total,
      baseInafecta: 0,
      igv: 0,
      total,
      legend: regime.legend || "BIENES TRANSFERIDOS EN LA AMAZONÍA PARA SER CONSUMIDOS EN LA MISMA - LEY N° 27037",
      allowedDocs: regime.allowedDocs,
    };
  }

  // 2. Nuevo RUS (Cuota fija, no desglosa IGV)
  if (regime.code === "NRUS" || regime.category === "NRUS") {
    return {
      regimeCode: regime.code,
      regimeName: regime.name,
      shortName: regime.shortName,
      category: "NRUS",
      isExonerated: false,
      isAmazonia: false,
      isRestaurantes: false,
      isNrus: true,
      rate: 0.0,
      incomeTaxRate: 0.0,
      estimatedIncomeTax: 0, // Cuota fija mensual
      baseGravada: 0,
      baseExonerada: 0,
      baseInafecta: total,
      igv: 0,
      total,
      legend: "RÉGIMEN ÚNICO SIMPLIFICADO - NRUS (NO EMITE FACTURAS)",
      allowedDocs: ["BOLETA"],
    };
  }

  // 3. Exoneradas (Apéndice I)
  if (regime.code === "EXONERADO_0") {
    return {
      regimeCode: regime.code,
      regimeName: regime.name,
      shortName: regime.shortName,
      category: "ESPECIAL",
      isExonerated: true,
      isAmazonia: false,
      isRestaurantes: false,
      isNrus: false,
      rate: 0.0,
      incomeTaxRate: regime.incomeTaxRate || 1.5,
      estimatedIncomeTax: Number((total * 0.015).toFixed(2)),
      baseGravada: 0,
      baseExonerada: total,
      baseInafecta: 0,
      igv: 0,
      total,
      legend: "",
      allowedDocs: regime.allowedDocs,
    };
  }

  // 4. Inafectas
  if (regime.code === "INAFECTO_0") {
    return {
      regimeCode: regime.code,
      regimeName: regime.name,
      shortName: regime.shortName,
      category: "ESPECIAL",
      isExonerated: true,
      isAmazonia: false,
      isRestaurantes: false,
      isNrus: false,
      rate: 0.0,
      incomeTaxRate: regime.incomeTaxRate || 1.5,
      estimatedIncomeTax: Number((total * 0.015).toFixed(2)),
      baseGravada: 0,
      baseExonerada: 0,
      baseInafecta: total,
      igv: 0,
      total,
      legend: "",
      allowedDocs: regime.allowedDocs,
    };
  }

  // 5. Restaurantes 10% (Ley N° 31556)
  if (regime.code === "RESTAURANTES_10") {
    const base = Number((total / 1.10).toFixed(2));
    const igv = Number((total - base).toFixed(2));
    return {
      regimeCode: regime.code,
      regimeName: regime.name,
      shortName: regime.shortName,
      category: "ESPECIAL",
      isExonerated: false,
      isAmazonia: false,
      isRestaurantes: true,
      isNrus: false,
      rate: 10.0,
      incomeTaxRate: 1.0,
      estimatedIncomeTax: Number((base * 0.01).toFixed(2)),
      baseGravada: base,
      baseExonerada: 0,
      baseInafecta: 0,
      igv,
      total,
      legend: "",
      allowedDocs: regime.allowedDocs,
    };
  }

  // 6. RER, RMT o General (18% IGV estándar)
  const base = Number((total / 1.18).toFixed(2));
  const igv = Number((total - base).toFixed(2));
  const taxRate = regime.incomeTaxRate ?? 1.5;
  const estimatedRenta = Number((base * (taxRate / 100)).toFixed(2));

  return {
    regimeCode: regime.code,
    regimeName: regime.name,
    shortName: regime.shortName,
    category: regime.category,
    isExonerated: false,
    isAmazonia: false,
    isRestaurantes: false,
    isNrus: false,
    rate: 18.0,
    incomeTaxRate: taxRate,
    estimatedIncomeTax: estimatedRenta,
    baseGravada: base,
    baseExonerada: 0,
    baseInafecta: 0,
    igv,
    total,
    legend: "",
    allowedDocs: regime.allowedDocs,
  };
}

// ============================================================================
// TIPOS DE AFECTACIÓN AL IGV (CATÁLOGO N° 07 SUNAT)
// ============================================================================
export interface IgvAffectationOption {
  code: string; // "10", "10_MYPE", "20", "30", "40"
  name: string;
  shortName: string;
  rate: number; // 18, 10, 0
  sunatCode: number; // 1 = Gravado, 8 = Exonerado, 9 = Inafecto
  taxSchemeCode: string; // "1000" = IGV, "9997" = EXONERADO, "9998" = INAFECTO
  taxSchemeName: string;
  description: string;
  defaultLegend?: string;
}

export const AMAZONIA_DEFAULT_LEGEND =
  "BIENES TRANSFERIDOS EN LA AMAZONÍA PARA SER CONSUMIDOS EN LA MISMA - LEY N° 27037";

export const IGV_AFFECTATION_OPTIONS: Record<string, IgvAffectationOption> = {
  EXONERADO_20: {
    code: "20",
    name: "Exonerado 0% — Amazonía / Apéndice I Ley IGV",
    shortName: "Exonerado (0%)",
    rate: 0.0,
    sunatCode: 8,
    taxSchemeCode: "9997",
    taxSchemeName: "EXONERADO",
    description: "Venta de bienes en Amazonía (Ley 27037) o productos de primera necesidad Apéndice I",
    defaultLegend: AMAZONIA_DEFAULT_LEGEND,
  },
  GRAVADO_18: {
    code: "10",
    name: "Gravado 18% — Operación Onerosa Estándar",
    shortName: "Gravado (18%)",
    rate: 18.0,
    sunatCode: 1,
    taxSchemeCode: "1000",
    taxSchemeName: "IGV",
    description: "Tasa general nacional del 18% (16% IGV + 2% Impuesto de Promoción Municipal)",
  },
  GRAVADO_10: {
    code: "10_MYPE",
    name: "Gravado 10% — Tasa Especial MYPE Restaurantes y Hoteles (Ley N° 31556)",
    shortName: "MYPE Gastro/Hotel (10%)",
    rate: 10.0,
    sunatCode: 1,
    taxSchemeCode: "1000",
    taxSchemeName: "IGV",
    description: "Tasa preferencial del 10% (8% IGV + 2% IPM) para restaurantes y hospedajes MYPE",
  },
  INAFECTO_30: {
    code: "30",
    name: "Inafecto 0% — Fuera del Ámbito del Impuesto",
    shortName: "Inafecto (0%)",
    rate: 0.0,
    sunatCode: 9,
    taxSchemeCode: "9998",
    taxSchemeName: "INAFECTO",
    description: "Operaciones no gravadas por no constituir hecho imponible según el art. 2 de la Ley del IGV",
  },
  EXPORTACION_40: {
    code: "40",
    name: "Exportación 0%",
    shortName: "Exportación (0%)",
    rate: 0.0,
    sunatCode: 9,
    taxSchemeCode: "9995",
    taxSchemeName: "EXP",
    description: "Exportación de bienes y servicios al exterior",
  },
};

export const IGV_AFFECTATION_LIST: IgvAffectationOption[] = [
  IGV_AFFECTATION_OPTIONS.EXONERADO_20,
  IGV_AFFECTATION_OPTIONS.GRAVADO_18,
  IGV_AFFECTATION_OPTIONS.GRAVADO_10,
  IGV_AFFECTATION_OPTIONS.INAFECTO_30,
  IGV_AFFECTATION_OPTIONS.EXPORTACION_40,
];

// ============================================================================
// VALIDACIÓN BOLETA DE VENTA > S/ 700.00 (R.S. 193-2020/SUNAT)
// ============================================================================
export const BOLETA_MAX_ANONYMOUS_AMOUNT = 700.0;

export function validateBoletaCustomerRequirement(
  total: number,
  clientDocType?: string,
  clientDocNum?: string,
  clientDenom?: string,
): { isValid: boolean; error?: string } {
  if (total < BOLETA_MAX_ANONYMOUS_AMOUNT) {
    return { isValid: true };
  }

  const cleanDoc = (clientDocNum || "").trim().replace(/\D/g, "");
  const cleanName = (clientDenom || "").trim().toUpperCase();

  if (
    !cleanDoc ||
    cleanDoc === "00000000" ||
    cleanDoc === "0" ||
    cleanDoc.length < 8 ||
    !cleanName ||
    cleanName === "CLIENTES VARIOS" ||
    cleanName === "CLIENTE VARIOS" ||
    clientDocType === "-" ||
    clientDocType === "0"
  ) {
    return {
      isValid: false,
      error: `Por normativa legal de SUNAT (R.S. N° 193-2020), toda Boleta de Venta igual o mayor a S/ 700.00 requiere la identificación obligatoria del cliente con DNI (8 dígitos) o RUC (11 dígitos) y nombres completos. Total actual: S/ ${total.toFixed(
        2,
      )}.`,
    };
  }

  return { isValid: true };
}

// ============================================================================
// ALERTA DE BANCARIZACIÓN OBLIGATORIA (> S/ 2,000 o USD 500 — D.L. 1529 / LEY 28194)
// ============================================================================
export const BANCARIZACION_MIN_PEN = 2000.0;
export const BANCARIZACION_MIN_USD = 500.0;

export function checkBancarizacionRequirement(
  amount: number,
  currency: "PEN" | "USD" = "PEN",
): {
  isRequired: boolean;
  threshold: number;
  message?: string;
} {
  const threshold = currency === "USD" ? BANCARIZACION_MIN_USD : BANCARIZACION_MIN_PEN;
  const isRequired = amount >= threshold;

  if (!isRequired) {
    return { isRequired: false, threshold };
  }

  const symbol = currency === "USD" ? "$" : "S/";
  return {
    isRequired: true,
    threshold,
    message: `⚠️ Operación sujeta a Bancarización Obligatoria (D.L. N° 1529 / Ley N° 28194): Por montos iguales o mayores a ${symbol} ${threshold.toLocaleString(
      "es-PE",
    )}, el pago debe efectuarse mediante medios bancarizados (depósito en cuenta, transferencia, tarjeta de débito/crédito, o cheque con cláusula 'no negociable') para sustentar costo, gasto o crédito fiscal ante SUNAT.`,
  };
}

// ============================================================================
// VALIDACIÓN LEGAL DE FECHA DE EMISIÓN (R.S. N° 193-2020 / MÁXIMO 3 DÍAS CALENDARIO)
// ============================================================================
export function getValidEmissionDateRange(): {
  minDate: string; // YYYY-MM-DD (hace 3 días calendario)
  maxDate: string; // YYYY-MM-DD (hoy)
} {
  const today = new Date();
  const maxDate = today.toISOString().split("T")[0];

  const minDateObj = new Date(today);
  minDateObj.setDate(minDateObj.getDate() - 3);
  const minDate = minDateObj.toISOString().split("T")[0];

  return { minDate, maxDate };
}

export function validateIssueDateRange(dateString?: string): {
  isValid: boolean;
  minDate: string;
  maxDate: string;
  error?: string;
} {
  const { minDate, maxDate } = getValidEmissionDateRange();
  if (!dateString) return { isValid: true, minDate, maxDate };

  const selected = dateString.split("T")[0];
  if (selected > maxDate) {
    return {
      isValid: false,
      minDate,
      maxDate,
      error: `SUNAT no permite emitir comprobantes con fecha futura posterior a hoy (${maxDate}).`,
    };
  }

  if (selected < minDate) {
    return {
      isValid: false,
      minDate,
      maxDate,
      error: `Según la R.S. N° 193-2020/SUNAT, la fecha de emisión electrónica solo puede retroceder hasta 3 días calendario anteriores (${minDate}). La fecha seleccionada (${selected}) excede el plazo legal permitido.`,
    };
  }

  return { isValid: true, minDate, maxDate };
}

// ============================================================================
// VALIDADOR MÓDULO 11 DE RUC Y DNI SUNAT
// ============================================================================
export function validateRuc(ruc: string): boolean {
  if (!ruc || typeof ruc !== "string") return false;
  const clean = ruc.trim().replace(/\D/g, "");
  if (clean.length !== 11) return false;

  const validPrefixes = ["10", "15", "17", "20"];
  if (!validPrefixes.some((p) => clean.startsWith(p))) return false;

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights[i];
  }

  const remainder = sum % 11;
  let checkDigit = 11 - remainder;
  if (checkDigit === 10) checkDigit = 0;
  else if (checkDigit === 11) checkDigit = 1;

  return parseInt(clean.charAt(10), 10) === checkDigit;
}

export function validateDni(dni: string): boolean {
  if (!dni || typeof dni !== "string") return false;
  const clean = dni.trim().replace(/\D/g, "");
  return clean.length === 8;
}
