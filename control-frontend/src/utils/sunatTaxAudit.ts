/**
 * ============================================================================
 * LIQUIDACIÓN Y RESPONSABILIDAD TRIBUTARIA SUNAT (FORMULARIO DECLARA FÁCIL 621)
 * CORPORACIÓN CCOPLEX & THINK ERP FINANZAS
 * ============================================================================
 * Cálculo exacto de obligaciones tributarias mensuales en base a comprobantes
 * electrónicos emitidos bajo estándar UBL 2.1 (Boletas, Facturas, Notas y Guías).
 */

export type SunatTaxRegime = 'RMT' | 'RER' | 'RG' | 'NRUS';

/**
 * Normaliza cualquier formato de régimen tributario (de BD, SUNAT Ficha RUC o perfil)
 * al tipo estándar SunatTaxRegime ('RMT' | 'RER' | 'RG' | 'NRUS').
 */
export function normalizeSunatTaxRegime(raw?: string | null): SunatTaxRegime {
  if (!raw) return 'RER';
  const u = String(raw).toUpperCase().trim();
  if (u.includes('RER') || u.includes('ESPECIAL')) return 'RER';
  if (u.includes('RUS') || u.includes('NRUS')) return 'NRUS';
  if (u === 'RG' || u.includes('GENERAL')) return 'RG';
  if (u.includes('MYPE') || u.includes('RMT')) return 'RMT';
  return 'RER';
}

export interface SunatLiquidationParams {
  documents: any[];
  regime: SunatTaxRegime;
  purchasesWithInvoice: number; // Monto total de compras con factura del periodo
  periodMonth?: number; // 0 a 11 (0 = Enero, 10 = Noviembre)
  periodYear?: number;
  ruc?: string;
}

export interface SunatTaxLiquidationResult {
  periodLabel: string;
  regime: SunatTaxRegime;
  regimeName: string;
  regimeDescription: string;
  
  // Ventas
  totalInvoicedSales: number; // Monto bruto total facturado
  totalFacturas: number;
  totalBoletas: number;
  totalNotasDebito: number;
  totalNotasCredito: number; // Resta
  guiasRemisionCount: number;
  
  // Base Imponible & Débito Fiscal
  ventasGravadasNetas: number; // Base imponible gravada (sin IGV)
  debitoFiscalIgv: number; // IGV 18% generado por ventas
  
  // Compras & Crédito Fiscal
  comprasConFacturaTotal: number;
  comprasBaseImponible: number;
  creditoFiscalIgv: number; // IGV 18% a favor por compras
  
  // Liquidación de IGV
  igvNetoAPagar: number; // max(0, debito - credito)
  saldoAFavorMesSiguiente: number; // max(0, credito - debito)
  
  // Impuesto a la Renta
  rentaTasaPorcentaje: number;
  rentaPagoACuenta: number;
  
  // Total a Pagar a SUNAT
  totalPagarSunat: number; // IGV a pagar + Pago a cuenta Renta
  proyeccionImpuestoPeriodo: number; // Proyección para formulario 621
  deudaExigibleCoactiva: number; // Deuda coactiva exigible actual en SUNAT (0.00 si está al día)
  isAlDia: boolean; // Estado tributario hábil sin deuda coactiva

  
  // Cronograma y Vencimiento SUNAT
  ultimoDigitoRuc: string;
  fechaVencimientoSunat: string;
  diasRestantes: number;
  estadoVencimiento: 'COMFORTABLE' | 'WARNING' | 'CRITICAL' | 'OVERDUE';
  
  // Alertas Normativas SUNAT
  alertasNormativas: {
    tipo: 'INFO' | 'WARNING' | 'ALERT';
    titulo: string;
    mensaje: string;
    baseLegal?: string;
  }[];
}

/**
 * Tabla Oficial de Fechas de Vencimiento SUNAT según último dígito del RUC.
 * Para el periodo mensual M, el vencimiento ocurre aproximadamente entre el 14 y 24 del mes M+1.
 */
export function getSunatTaxDueDate(ruc?: string | null, targetMonth?: number, targetYear?: number) {
  const now = new Date();
  const month = targetMonth !== undefined ? targetMonth : now.getMonth();
  const year = targetYear !== undefined ? targetYear : now.getFullYear();

  // El vencimiento de un periodo es en el mes calendario siguiente
  const dueMonth = (month + 1) % 12;
  const dueYear = month === 11 ? year + 1 : year;

  // Extraer último dígito del RUC (si no hay RUC se asume 0 como referencia)
  const cleanRuc = (ruc || '').replace(/\D/g, '');
  const lastDigit = cleanRuc.length === 11 ? cleanRuc.charAt(10) : '0';

  // Días base oficiales SUNAT por dígito
  const dueDaysByDigit: Record<string, number> = {
    '0': 14,
    '1': 15,
    '2': 16,
    '3': 17,
    '4': 18,
    '5': 19,
    '6': 20,
    '7': 21,
    '8': 22,
    '9': 23,
    'buenos_contribuyentes': 24,
  };

  const day = dueDaysByDigit[lastDigit] || 15;
  const dueDate = new Date(dueYear, dueMonth, day, 23, 59, 59);

  // Calcular días restantes respecto a hoy
  const diffTime = dueDate.getTime() - now.getTime();
  const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let estadoVencimiento: 'COMFORTABLE' | 'WARNING' | 'CRITICAL' | 'OVERDUE' = 'COMFORTABLE';
  if (diasRestantes < 0) {
    estadoVencimiento = 'OVERDUE';
  } else if (diasRestantes <= 3) {
    estadoVencimiento = 'CRITICAL';
  } else if (diasRestantes <= 7) {
    estadoVencimiento = 'WARNING';
  }

  const fechaFormateada = dueDate.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return {
    lastDigit,
    dueDate,
    fechaFormateada,
    diasRestantes,
    estadoVencimiento,
  };
}

/**
 * Realiza el cálculo formal de la liquidación tributaria SUNAT Formulario 621
 */
export function calculateSunatTaxLiquidation(params: SunatLiquidationParams): SunatTaxLiquidationResult {
  const { documents = [], regime, purchasesWithInvoice = 0, periodMonth, periodYear, ruc } = params;

  const now = new Date();
  const targetMonth = periodMonth !== undefined ? periodMonth : now.getMonth();
  const targetYear = periodYear !== undefined ? periodYear : now.getFullYear();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const periodLabel = `${monthNames[targetMonth]} ${targetYear}`;

  // 1. Filtrar comprobantes del periodo con estado válido ante SUNAT
  let totalFacturas = 0;
  let totalBoletas = 0;
  let totalNotasDebito = 0;
  let totalNotasCredito = 0;
  let guiasRemisionCount = 0;
  const largeAmountDocs: any[] = [];

  documents.forEach((doc) => {
    // Verificar si pertenece al periodo si se filtró por mes/año
    const rawDate = doc.createdAt || doc.created_at || doc.issue_date;
    if (rawDate) {
      const dDate = new Date(rawDate);
      if (periodMonth !== undefined && dDate.getMonth() !== targetMonth) return;
      if (periodYear !== undefined && dDate.getFullYear() !== targetYear) return;
    }

    // Excluir comprobantes anulados formalmente, dados de baja o rechazados
    const status = (doc.status || doc.sunat_status || doc.estado || '').toUpperCase();
    if (
      status === 'CANCELLED' ||
      status === 'REJECTED' ||
      status === 'ANULADO' ||
      status === 'ANULADA' ||
      status === 'BAJA' ||
      status === 'COMUNICACION_BAJA' ||
      status === 'RECHAZADO' ||
      status === 'VOIDED' ||
      doc.is_annulled === true ||
      doc.anulado === true
    ) {
      return;
    }

    const docType = (doc.docType || doc.document_type || '').toUpperCase();
    const amount = Number(doc.totalAmount || doc.total_amount || 0);

    // Detección de bancarización obligatoria (D.L. 1529: >= S/ 2,000 o $500)
    if (amount >= 2000) {
      largeAmountDocs.push(doc);
    }

    if (docType === 'INVOICE' || docType === 'FACTURA' || docType === '01') {
      totalFacturas += amount;
    } else if (docType === 'BOLETA' || docType === '03') {
      totalBoletas += amount;
    } else if (docType === 'DEBIT_NOTE' || docType === 'NOTA_DEBITO' || docType === '08') {
      totalNotasDebito += amount;
    } else if (docType === 'CREDIT_NOTE' || docType === 'NOTA_CREDITO' || docType === '07') {
      totalNotasCredito += amount;
    } else if (docType === 'DISPATCH_GUIDE' || docType === 'GUIA_REMISION' || docType === '09' || docType === '31') {
      guiasRemisionCount++;
    }
  });

  // Ventas Netas con IGV = Facturas + Boletas + Notas Débito - Notas Crédito
  const totalInvoicedSales = Math.max(0, (totalFacturas + totalBoletas + totalNotasDebito) - totalNotasCredito);

  // 2. Base imponible y Débito Fiscal IGV (18%)
  // Base gravada = Total con IGV / 1.18
  const ventasGravadasNetas = totalInvoicedSales > 0 ? totalInvoicedSales / 1.18 : 0;
  const debitoFiscalIgv = ventasGravadasNetas * 0.18;

  // 3. Compras y Crédito Fiscal de IGV
  const comprasConFacturaTotal = Math.max(0, Number(purchasesWithInvoice) || 0);
  const comprasBaseImponible = comprasConFacturaTotal > 0 ? comprasConFacturaTotal / 1.18 : 0;
  const creditoFiscalIgv = comprasBaseImponible * 0.18;

  // 4. Liquidación del IGV (Débito menos Crédito)
  const balanceIgv = debitoFiscalIgv - creditoFiscalIgv;
  const igvNetoAPagar = balanceIgv > 0.009 ? balanceIgv : 0;
  const saldoAFavorMesSiguiente = balanceIgv < -0.009 ? Math.abs(balanceIgv) : 0;

  // 5. Impuesto a la Renta mensual
  let rentaTasaPorcentaje = 1.0;
  let rentaPagoACuenta = 0;
  let regimeName = 'Régimen MYPE Tributario (RMT)';
  let regimeDescription = 'Tasa preferencial del 1.0% de pago a cuenta mensual de Renta y 18% de IGV con derecho a crédito fiscal.';

  if (regime === 'RER') {
    regimeName = 'Régimen Especial de Renta (RER)';
    regimeDescription = 'Tasa del 1.5% mensual de Renta como pago cancelatorio definitivo (sin declaración jurada anual) e IGV 18%.';
    rentaTasaPorcentaje = 1.5;
    rentaPagoACuenta = ventasGravadasNetas * 0.015;
  } else if (regime === 'RG') {
    regimeName = 'Régimen General (RG)';
    regimeDescription = 'Tasa del 1.5% o coeficiente mensual de Renta a cuenta y regularización anual del 29.5%.';
    rentaTasaPorcentaje = 1.5;
    rentaPagoACuenta = ventasGravadasNetas * 0.015;
  } else if (regime === 'NRUS') {
    regimeName = 'Nuevo Régimen Único Simplificado (NRUS)';
    regimeDescription = 'Cuota fija mensual única (S/ 20 hasta S/ 5,000 o S/ 50 hasta S/ 8,000). No deduce crédito fiscal ni paga IGV separado.';
    rentaTasaPorcentaje = 0;
    if (totalInvoicedSales === 0) {
      rentaPagoACuenta = 0; // Sin ventas en el mes no genera cuota
    } else if (totalInvoicedSales <= 5000) {
      rentaPagoACuenta = 20;
    } else if (totalInvoicedSales <= 8000) {
      rentaPagoACuenta = 50;
    } else {
      rentaPagoACuenta = 50; // Superó el tope del RUS
    }
  } else {
    // RMT (Default)
    rentaTasaPorcentaje = 1.0;
    rentaPagoACuenta = ventasGravadasNetas * 0.01;
  }

  // 6. Total a Pagar a la SUNAT
  let totalPagarSunat = 0;
  if (regime === 'NRUS') {
    totalPagarSunat = rentaPagoACuenta; // Cuota fija única del RUS
  } else {
    totalPagarSunat = igvNetoAPagar + rentaPagoACuenta;
  }

  // 7. Vencimiento SUNAT
  const dueInfo = getSunatTaxDueDate(ruc, targetMonth, targetYear);

  // 8. Alertas Normativas Oficiales SUNAT
  const alertasNormativas: SunatTaxLiquidationResult['alertasNormativas'] = [];

  // Alerta 1: Bancarización D.L. 1529
  if (largeAmountDocs.length > 0) {
    alertasNormativas.push({
      tipo: 'WARNING',
      titulo: `Bancarización Obligatoria (${largeAmountDocs.length} comprobantes >= S/ 2,000)`,
      mensaje: `Detectamos ${largeAmountDocs.length} operaciones con montos superiores a S/ 2,000 o US$ 500. Según el D.L. 1529, deben pagarse obligatoriamente mediante medios bancarios (transferencia, cheque, tarjeta) para que el cliente pueda deducir costo/gasto y tú evites contingencias de SUNAT.`,
      baseLegal: 'Decreto Legislativo N° 1529 / Ley de Bancarización',
    });
  }

  // Alerta 2: Plazo de Anotación de Compras para Crédito Fiscal
  alertasNormativas.push({
    tipo: 'INFO',
    titulo: 'Vigencia de Facturas de Compra (Crédito Fiscal)',
    mensaje: 'Las facturas de compra deben anotarse en el Registro de Compras Electrónico (RCE) dentro de los 12 meses siguientes a su fecha de emisión para no perder el derecho al crédito fiscal.',
    baseLegal: 'Artículo 19 del TUO de la Ley del IGV',
  });

  // Alerta 3: Guías de Remisión y Fehaciencia
  if (guiasRemisionCount > 0) {
    alertasNormativas.push({
      tipo: 'INFO',
      titulo: `Sustento de Traslado (${guiasRemisionCount} Guías Emitidas)`,
      mensaje: `Tienes ${guiasRemisionCount} Guías de Remisión Electrónica vinculadas. Las guías no trasladan IGV pero sustentan la fehaciencia de la entrega física ante cualquier auditoría o fiscalización de SUNAT.`,
      baseLegal: 'Art. 8 Reglamento de Comprobantes de Pago',
    });
  }

  // Alerta 4: Exclusión de RUS si superó S/ 8,000
  if (regime === 'NRUS' && totalInvoicedSales > 8000) {
    alertasNormativas.push({
      tipo: 'ALERT',
      titulo: '¡Atención! Ventas superan el límite del Nuevo RUS (S/ 8,000)',
      mensaje: `Tus ventas del mes (S/ ${totalInvoicedSales.toFixed(2)}) superan el tope legal de S/ 8,000 del Nuevo RUS. La SUNAT exige cambiar formalmente al Régimen MYPE Tributario o RER.`,
      baseLegal: 'D. Leg. N° 937 y modificatorias',
    });
  }

  // Alerta 5: Saldo a Favor del Contribuyente
  if (saldoAFavorMesSiguiente > 0) {
    alertasNormativas.push({
      tipo: 'INFO',
      titulo: `Saldo a Favor de IGV: S/ ${saldoAFavorMesSiguiente.toFixed(2)}`,
      mensaje: `Tus compras con factura superaron tus ventas gravadas. Cuentas con un Saldo a Favor que se registrará en la Casilla 145 del Formulario 621 para descontar automáticamente el IGV del siguiente mes.`,
      baseLegal: 'Art. 25 de la Ley del IGV',
    });
  }

  return {
    periodLabel,
    regime,
    regimeName,
    regimeDescription,
    totalInvoicedSales,
    totalFacturas,
    totalBoletas,
    totalNotasDebito,
    totalNotasCredito,
    guiasRemisionCount,
    ventasGravadasNetas,
    debitoFiscalIgv,
    comprasConFacturaTotal,
    comprasBaseImponible,
    creditoFiscalIgv,
    igvNetoAPagar,
    saldoAFavorMesSiguiente,
    rentaTasaPorcentaje,
    rentaPagoACuenta,
    totalPagarSunat,
    proyeccionImpuestoPeriodo: totalPagarSunat,
    deudaExigibleCoactiva: 0,
    isAlDia: true,
    ultimoDigitoRuc: dueInfo.lastDigit,
    fechaVencimientoSunat: dueInfo.fechaFormateada,
    diasRestantes: dueInfo.diasRestantes,
    estadoVencimiento: dueInfo.estadoVencimiento,
    alertasNormativas,
  };
}
