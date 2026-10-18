/**
 * Utilidades fiscales y cálculo tributario según normativa SUNAT (Perú)
 * Incluye soporte completo para la Ley de Amazonía N° 27037 (Madre de Dios, Loreto, Ucayali, etc.)
 */

export interface TaxRegimeOption {
  code: string;
  name: string;
  shortName: string;
  rate: number;
  sunatCode: number; // 1 = Gravado, 8 = Exonerado, 9 = Inafecto
  legend?: string;
  description: string;
}

export const TAX_REGIMES: Record<string, TaxRegimeOption> = {
  GENERAL_18: {
    code: "GENERAL_18",
    name: "Régimen General (IGV 18%)",
    shortName: "Gravado 18%",
    rate: 18.0,
    sunatCode: 1,
    description: "Operaciones gravadas estándar en territorio nacional con 16% IGV + 2% IPM.",
  },
  AMAZONIA_EXONERADO: {
    code: "AMAZONIA_EXONERADO",
    name: "Régimen Amazonía — Exonerado de IGV (Ley N° 27037)",
    shortName: "Amazonía 0%",
    rate: 0.0,
    sunatCode: 8,
    legend: "BIENES TRANSFERIDOS EN LA AMAZONÍA PARA SER CONSUMIDOS EN LA MISMA - LEY N° 27037",
    description: "Aplicable en Madre de Dios, Loreto, Ucayali, San Martín y zonas amazónicas. Venta de bienes 100% exonerada de IGV.",
  },
  RESTAURANTES_10: {
    code: "RESTAURANTES_10",
    name: "Restaurantes y Hoteles MYPE — Ley N° 31556 (10%)",
    shortName: "Especial 10%",
    rate: 10.0,
    sunatCode: 1,
    description: "Tasa especial temporal del 8% IGV + 2% IPM para MYPES del sector turismo y gastronomía.",
  },
  EXONERADO_0: {
    code: "EXONERADO_0",
    name: "Operaciones Exoneradas (0% IGV)",
    shortName: "Exonerado 0%",
    rate: 0.0,
    sunatCode: 8,
    description: "Productos agrícolas, canasta básica y bienes amparados en el Apéndice I del TUO del IGV.",
  },
  INAFECTO_0: {
    code: "INAFECTO_0",
    name: "Operaciones Inafectas (0% IGV)",
    shortName: "Inafecto 0%",
    rate: 0.0,
    sunatCode: 9,
    description: "Servicios y operaciones que no están en el campo de aplicación del impuesto.",
  },
};

TAX_REGIMES.AMAZONIA_0 = TAX_REGIMES.AMAZONIA_EXONERADO;

export const TAX_REGIMES_LIST: TaxRegimeOption[] = [
  TAX_REGIMES.GENERAL_18,
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
  isExonerated: boolean;
  isAmazonia: boolean;
  isRestaurantes: boolean;
  rate: number;
  baseGravada: number;
  baseExonerada: number;
  baseInafecta: number;
  igv: number;
  total: number;
  legend: string;
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
  }
): FiscalBreakdown {
  const total = Number((Number(totalAmount) || 0).toFixed(2));
  const dept = config?.department || "";
  const autoAmazonia = isAmazoniaDepartment(dept);

  // Si no se especificó régimen pero el departamento es amazónico (ej. Madre de Dios), usar Amazonía
  let regimeCode = config?.taxRegime || (autoAmazonia ? "AMAZONIA_EXONERADO" : "GENERAL_18");

  if (autoAmazonia && regimeCode === "GENERAL_18") {
    regimeCode = "AMAZONIA_EXONERADO";
  }

  const regime = TAX_REGIMES[regimeCode] || TAX_REGIMES.GENERAL_18;

  if (regime.code === "AMAZONIA_EXONERADO") {
    return {
      regimeCode: regime.code,
      regimeName: regime.name,
      isExonerated: true,
      isAmazonia: true,
      isRestaurantes: false,
      rate: 0.0,
      baseGravada: 0,
      baseExonerada: total,
      baseInafecta: 0,
      igv: 0,
      total,
      legend: regime.legend || "BIENES TRANSFERIDOS EN LA AMAZONÍA PARA SER CONSUMIDOS EN LA MISMA - LEY N° 27037",
    };
  }

  if (regime.code === "EXONERADO_0") {
    return {
      regimeCode: regime.code,
      regimeName: regime.name,
      isExonerated: true,
      isAmazonia: false,
      isRestaurantes: false,
      rate: 0.0,
      baseGravada: 0,
      baseExonerada: total,
      baseInafecta: 0,
      igv: 0,
      total,
      legend: "",
    };
  }

  if (regime.code === "INAFECTO_0") {
    return {
      regimeCode: regime.code,
      regimeName: regime.name,
      isExonerated: true,
      isAmazonia: false,
      isRestaurantes: false,
      rate: 0.0,
      baseGravada: 0,
      baseExonerada: 0,
      baseInafecta: total,
      igv: 0,
      total,
      legend: "",
    };
  }

  if (regime.code === "RESTAURANTES_10") {
    const base = Number((total / 1.10).toFixed(2));
    const igv = Number((total - base).toFixed(2));
    return {
      regimeCode: regime.code,
      regimeName: regime.name,
      isExonerated: false,
      isAmazonia: false,
      isRestaurantes: true,
      rate: 10.0,
      baseGravada: base,
      baseExonerada: 0,
      baseInafecta: 0,
      igv,
      total,
      legend: "",
    };
  }

  // Régimen General 18%
  const base = Number((total / 1.18).toFixed(2));
  const igv = Number((total - base).toFixed(2));
  return {
    regimeCode: "GENERAL_18",
    regimeName: "Régimen General (18%)",
    isExonerated: false,
    isAmazonia: false,
    isRestaurantes: false,
    rate: 18.0,
    baseGravada: base,
    baseExonerada: 0,
    baseInafecta: 0,
    igv,
    total,
    legend: "",
  };
}
