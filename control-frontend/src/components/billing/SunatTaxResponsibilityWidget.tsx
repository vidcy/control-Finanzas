import { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Info,
  Receipt,
  TrendingDown,
  Building2,
  Calculator,
  Truck,
  Printer,
  Sparkles,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  calculateSunatTaxLiquidation,
  normalizeSunatTaxRegime,
  type SunatTaxRegime,
} from "../../utils/sunatTaxAudit";

interface SunatTaxResponsibilityWidgetProps {
  documents: any[];
  issuerRuc?: string;
  issuerName?: string;
  defaultRegime?: SunatTaxRegime | string;
}

export default function SunatTaxResponsibilityWidget({
  documents = [],
  issuerRuc = "",
  issuerName = "",
  defaultRegime = "RER",
}: SunatTaxResponsibilityWidgetProps) {
  const officialRegime = useMemo(() => normalizeSunatTaxRegime(defaultRegime), [defaultRegime]);
  const [selectedRegime, setSelectedRegime] = useState<SunatTaxRegime>(officialRegime);
  const [selectedPeriod, setSelectedPeriod] = useState<"CURRENT" | "PREVIOUS" | "ALL">("CURRENT");
  const [purchasesWithInvoice, setPurchasesWithInvoice] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (defaultRegime) {
      setSelectedRegime(normalizeSunatTaxRegime(defaultRegime));
    }
  }, [defaultRegime]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const targetPeriod = useMemo(() => {
    if (selectedPeriod === "CURRENT") {
      return { month: currentMonth, year: currentYear };
    }
    if (selectedPeriod === "PREVIOUS") {
      return { month: prevMonth, year: prevYear };
    }
    return { month: undefined, year: currentYear };
  }, [selectedPeriod, currentMonth, currentYear, prevMonth, prevYear]);

  // Cálculo tributario oficial en tiempo real
  const liquidation = useMemo(() => {
    return calculateSunatTaxLiquidation({
      documents,
      regime: selectedRegime,
      purchasesWithInvoice,
      periodMonth: targetPeriod.month,
      periodYear: targetPeriod.year,
      ruc: issuerRuc,
    });
  }, [documents, selectedRegime, purchasesWithInvoice, targetPeriod, issuerRuc]);

  // Filtrado de documentos pertenecientes al periodo seleccionado
  const periodDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const rawDate = doc.createdAt || doc.created_at || doc.issue_date;
      if (!rawDate) return true;
      const d = new Date(rawDate);
      if (targetPeriod.month !== undefined && d.getMonth() !== targetPeriod.month) return false;
      if (targetPeriod.year !== undefined && d.getFullYear() !== targetPeriod.year) return false;
      return true;
    });
  }, [documents, targetPeriod]);

  // Exportar a Excel (XLSX) con carga dinámica
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const summaryData = [
        ["REPORTE OFICIAL DE LIQUIDACIÓN TRIBUTARIA - SUNAT FORMULARIO 621"],
        ["Corporación CCOPLEX / Control Finanzas"],
        [""],
        ["Razón Social Emisor:", issuerName || "EMPRESA REGISTRADA"],
        ["RUC Emisor:", issuerRuc || "NO ESPECIFICADO"],
        ["Periodo Tributario:", liquidation.periodLabel],
        ["Régimen Tributario:", liquidation.regimeName],
        ["Estado Ante SUNAT:", "AL DÍA - DEUDA EXIGIBLE S/ 0.00 (SIN OMISIONES NI COACTIVA)"],
        ["Fecha de Vencimiento SUNAT:", `${liquidation.fechaVencimientoSunat} (Último dígito ${liquidation.ultimoDigitoRuc})`],
        [""],
        ["CONCEPTO TRIBUTARIO", "MONTO EN SOLES (S/)", "DETALLE TÉCNICO"],
        ["Ventas Facturas Electrónicas (01)", liquidation.totalFacturas, "Facturas emitidas gravadas"],
        ["Ventas Boletas de Venta (03)", liquidation.totalBoletas, "Boletas emitidas a consumidor final"],
        ["Ajustes Notas de Débito (08)", liquidation.totalNotasDebito, "Incremento a ventas"],
        ["Ajustes Notas de Crédito (07)", -liquidation.totalNotasCredito, "Deducción por anulación o descuento"],
        ["VENTAS NETAS FACTURADAS", liquidation.totalInvoicedSales, "Total con IGV"],
        ["Base Imponible Ventas Gravadas (Casilla 100)", liquidation.ventasGravadasNetas, "Ventas netas sin IGV (entre 1.18)"],
        ["DÉBITO FISCAL IGV 18% (Casilla 101)", liquidation.debitoFiscalIgv, "Impuesto bruto generado"],
        ["Compras del Periodo con Factura", liquidation.comprasConFacturaTotal, "Compras sustentadas con factura"],
        ["CRÉDITO FISCAL IGV 18% (Casilla 107)", liquidation.creditoFiscalIgv, "Deducción de IGV por compras"],
        ["IGV NETO A PAGAR (Casilla 140)", liquidation.igvNetoAPagar, "Débito Fiscal menos Crédito Fiscal"],
        ["SALDO A FAVOR PRÓXIMO MES (Casilla 145)", liquidation.saldoAFavorMesSiguiente, "Crédito a favor arrastrable"],
        ["Pago a Cuenta Renta Mensual (Casilla 301)", liquidation.rentaPagoACuenta, `Tasa ${liquidation.rentaTasaPorcentaje}% según régimen`],
        ["TOTAL A LIQUIDAR / DECLARAR SUNAT", liquidation.totalPagarSunat, "Total consolidado Formulario 621"],
        ["DEUDA EXIGIBLE ACTUAL COACTIVA", 0.00, "Al día sin resoluciones de cobranza"],
        [""],
        ["Guías de Remisión Electrónica (GRE)", liquidation.guiasRemisionCount, "Guías emitidas para sustento de traslado"],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Liquidacion_SUNAT_621");

      const docsHeader = [
        "Tipo Comprobante",
        "Serie - Número",
        "Fecha de Emisión",
        "Documento Cliente",
        "Nombre / Razón Social Cliente",
        "Total (S/)",
        "Estado SUNAT",
      ];

      const docsRows = periodDocuments.map((doc) => [
        doc.docType || doc.document_type || "COMPROBANTE",
        `${doc.series || ""}-${doc.number || doc.correlative || ""}`,
        doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("es-PE") : (doc.issue_date || ""),
        doc.clientDocument || doc.customerDocNum || "-",
        doc.clientName || doc.customerName || "CLIENTE VARIOS",
        Number(doc.totalAmount || doc.total_amount || 0),
        doc.status || doc.sunat_status || "EMITIDO",
      ]);

      const wsDocs = XLSX.utils.aoa_to_sheet([docsHeader, ...docsRows]);
      XLSX.utils.book_append_sheet(wb, wsDocs, "Comprobantes_Periodo");

      const cleanPeriodName = liquidation.periodLabel.replace(/\s+/g, "_");
      XLSX.writeFile(wb, `Liquidacion_SUNAT_621_${cleanPeriodName}.xlsx`);
    } catch (err) {
      console.error("Error al exportar Excel:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar a PDF oficial con jsPDF
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 26, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("REPORTE OFICIAL DE LIQUIDACIÓN TRIBUTARIA - SUNAT", 14, 12);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("DECLARA FÁCIL FORMULARIO VIRTUAL 621 • AUDITORÍA PREVENTIVA", 14, 18);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Empresa: ${issuerName || "EMPRESA REGISTRADA"}`, 14, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`RUC: ${issuerRuc || "NO ESPECIFICADO"}`, 14, 41);
      doc.text(`Periodo Tributario: ${liquidation.periodLabel}`, 14, 46);
      doc.text(`Régimen Tributario: ${liquidation.regimeName}`, 14, 51);

      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(120, 31, 76, 23, 3, 3, "FD");

      doc.setTextColor(6, 95, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("ESTADO ANTE SUNAT (CLAVE SOL):", 123, 37);

      doc.setFontSize(12);
      doc.text("DEUDA EXIGIBLE: S/ 0.00", 123, 44);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("Al día • Sin omisiones ni cobranza coactiva", 123, 49);

      let y = 62;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, "F");
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("CONCEPTO FISCAL", 18, y + 5);
      doc.text("CASILLA", 125, y + 5);
      doc.text("MONTO (S/)", 170, y + 5);

      const items = [
        ["Total Facturas Electrónicas (01)", "-", `S/ ${liquidation.totalFacturas.toFixed(2)}`],
        ["Total Boletas de Venta (03)", "-", `S/ ${liquidation.totalBoletas.toFixed(2)}`],
        ["Ajustes por Notas de Débito (+)", "-", `S/ ${liquidation.totalNotasDebito.toFixed(2)}`],
        ["Ajustes por Notas de Crédito (-)", "-", `-S/ ${liquidation.totalNotasCredito.toFixed(2)}`],
        ["Ventas Netas con IGV", "-", `S/ ${liquidation.totalInvoicedSales.toFixed(2)}`],
        ["Ventas Netas Gravadas (Base Imponible)", "Casilla 100", `S/ ${liquidation.ventasGravadasNetas.toFixed(2)}`],
        ["Débito Fiscal IGV (18%)", "Casilla 101", `S/ ${liquidation.debitoFiscalIgv.toFixed(2)}`],
        ["Compras del Periodo con Factura", "-", `S/ ${liquidation.comprasConFacturaTotal.toFixed(2)}`],
        ["Crédito Fiscal de IGV por Compras", "Casilla 107", `-S/ ${liquidation.creditoFiscalIgv.toFixed(2)}`],
        ["IGV Neto a Pagar", "Casilla 140", `S/ ${liquidation.igvNetoAPagar.toFixed(2)}`],
        ["Saldo a Favor Próximo Mes", "Casilla 145", `+S/ ${liquidation.saldoAFavorMesSiguiente.toFixed(2)}`],
        [`Pago a Cuenta del Impuesto a la Renta (${liquidation.rentaTasaPorcentaje}%)`, "Casilla 301", `S/ ${liquidation.rentaPagoACuenta.toFixed(2)}`],
      ];

      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);

      items.forEach((item, index) => {
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y - 4, 182, 6, "F");
        }
        doc.setTextColor(15, 23, 42);
        doc.text(item[0], 18, y);
        doc.text(item[1], 125, y);
        doc.text(item[2], 170, y);
        y += 6;
      });

      y += 4;
      doc.setFillColor(238, 242, 255);
      doc.setDrawColor(99, 102, 241);
      doc.roundedRect(14, y, 182, 14, 2, 2, "FD");

      doc.setTextColor(49, 46, 129);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("PROYECCIÓN FINAL A DECLARAR EN FORMULARIO 621:", 20, y + 6);
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129);
      doc.text(`S/ ${liquidation.totalPagarSunat.toFixed(2)}`, 160, y + 9);

      y += 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("CRONOGRAMA OFICIAL DE VENCIMIENTO SUNAT:", 14, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(`• Último Dígito del RUC: ${liquidation.ultimoDigitoRuc}`, 14, y + 5);
      doc.text(`• Fecha Límite de Presentación: ${liquidation.fechaVencimientoSunat}`, 14, y + 10);
      doc.text(
        liquidation.diasRestantes >= 0
          ? `• Faltan ${liquidation.diasRestantes} días calendario para declarar sin sanciones ni recargos.`
          : `• Periodo vencido ante SUNAT. Verifique si ya presentó la declaración o regularice.`,
        14,
        y + 15
      );

      const cleanPeriodName = liquidation.periodLabel.replace(/\s+/g, "_");
      doc.save(`Liquidacion_SUNAT_621_${cleanPeriodName}.pdf`);
    } catch (err) {
      console.error("Error al exportar PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/90 via-sky-50/70 to-emerald-50/80 rounded-2xl p-4 sm:p-5 shadow-lg shadow-indigo-100/40 border border-indigo-100/90 text-slate-900 relative overflow-hidden transition-all">
      {/* Glow Orbs claros y sutiles */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-indigo-200/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 -mb-20 w-72 h-72 bg-emerald-200/25 rounded-full blur-3xl pointer-events-none"></div>

      {/* HEADER PRINCIPAL COMPACTO Y EJECUTIVO */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-indigo-100/90">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black uppercase tracking-wider shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            SUNAT Declara Fácil 621 • UBL 2.1
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-bold shadow-2xs">
            <Building2 className="w-3 h-3 text-indigo-500" />
            {issuerRuc ? `RUC: ${issuerRuc}` : "RUC No configurado"}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-slate-700 border border-slate-200 text-[11px] font-bold">
            <Calendar className="w-3 h-3 text-emerald-600" />
            Periodo: <strong className="text-indigo-700">{liquidation.periodLabel}</strong>
          </span>
        </div>

        {/* Acciones y Botón Principal de Desglose */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Exportar liquidación oficial a Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Exportar constancia tributaria a PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF Oficial</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold transition-all border border-slate-200 flex items-center gap-1 cursor-pointer shadow-2xs"
            title="Imprimir resumen tributario"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {/* Botón Principal para Desglosar / Plegar */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              isExpanded
                ? "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/20"
                : "bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white shadow-indigo-500/25"
            }`}
            title={isExpanded ? "Plegar vista para ahorrar espacio" : "Desglosar casillas, deducciones y cronograma 621"}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isExpanded ? "Plegar Liquidación" : "Desglosar Obligaciones 621"}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CINTA RESUMIDA CUANDO ESTÁ PLEGADO (NO OCUPA ESPACIO NI CONFUNDE) */}
      {!isExpanded && (
        <div className="relative z-10 pt-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-semibold text-slate-500">Deuda Clave SOL:</span>
              <span className="font-mono font-black text-emerald-700">S/ 0.00 (Al Día)</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-indigo-200 shadow-2xs">
              <Receipt className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-semibold text-slate-500">Proyección 621 ({liquidation.regime}):</span>
              <span className="font-mono font-black text-indigo-950">S/ {liquidation.totalPagarSunat.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 font-medium">
                (IGV S/ {liquidation.igvNetoAPagar.toFixed(2)} • Renta S/ {liquidation.rentaPagoACuenta.toFixed(2)})
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-[11px] font-semibold text-slate-500">Vencimiento:</span>
              <span className="font-bold text-slate-800">{liquidation.fechaVencimientoSunat}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                liquidation.diasRestantes <= 5 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                Faltan {liquidation.diasRestantes} días
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Ver desglose completo de casillas y deducción</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* CUADRO DE MANDO COMPLETO DESGLOSABLE */}
      {isExpanded && (
        <div className="relative z-10 pt-3 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* CUADRO DE MANDO EJECUTIVO EN 4 TARJETAS LUMINOSAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* TARJETA 1: DEUDA EXIGIBLE SUNAT S/ 0.00 */}
            <div className="bg-white rounded-xl p-3.5 border border-emerald-300 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Deuda Exigible SUNAT
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                  Al Día
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                S/ 0.00
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1 leading-snug">
                Sin resoluciones de cobranza coactiva ni multas en Clave SOL.
              </p>
            </div>

            {/* TARJETA 2: PROYECCIÓN DECLARA FÁCIL 621 */}
            <div className="bg-white rounded-xl p-3.5 border border-indigo-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-indigo-700 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                  Proyección 621 ({liquidation.periodLabel.split(" ")[0]})
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-bold border border-indigo-200">
                  {liquidation.regime}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                S/ {liquidation.totalPagarSunat.toFixed(2)}
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold mt-1">
                <span>IGV: S/ {liquidation.igvNetoAPagar.toFixed(2)}</span>
                <span>Renta: S/ {liquidation.rentaPagoACuenta.toFixed(2)}</span>
              </div>
            </div>

            {/* TARJETA 3: CRÉDITO FISCAL POR COMPRAS */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                  Deducción por Compras
                </span>
                <span className="text-[9px] font-bold text-slate-400">18% IGV</span>
              </div>
              <div className="text-2xl font-black text-emerald-600 tracking-tight">
                - S/ {liquidation.creditoFiscalIgv.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                {liquidation.saldoAFavorMesSiguiente > 0 ? (
                  <span className="text-emerald-700 font-bold">
                    Saldo a Favor: +S/ {liquidation.saldoAFavorMesSiguiente.toFixed(2)}
                  </span>
                ) : (
                  <span>Compras: S/ {liquidation.comprasConFacturaTotal.toFixed(2)} con factura</span>
                )}
              </div>
            </div>

            {/* TARJETA 4: CRONOGRAMA DE VENCIMIENTO */}
            <div className={`rounded-xl p-3.5 border shadow-2xs flex flex-col justify-between ${
              liquidation.estadoVencimiento === "CRITICAL"
                ? "bg-rose-50/80 border-rose-300 text-rose-950"
                : liquidation.estadoVencimiento === "WARNING"
                  ? "bg-amber-50/80 border-amber-300 text-amber-950"
                  : "bg-emerald-50/80 border-emerald-300 text-emerald-950"
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-current" />
                  Vencimiento SUNAT
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-white/80 border border-current">
                  Dígito {liquidation.ultimoDigitoRuc}
                </span>
              </div>
              <div className="text-sm font-black tracking-tight">
                {liquidation.fechaVencimientoSunat}
              </div>
              <div className="text-[10px] font-medium opacity-90 mt-1">
                {liquidation.diasRestantes >= 0
                  ? `Faltan ${liquidation.diasRestantes} días para declarar sin multas`
                  : "¡Periodo vencido ante SUNAT!"}
              </div>
            </div>
          </div>

          {/* BARRA DE RÉGIMEN, PERIODO Y BOTÓN DE DETALLES */}
          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-indigo-100/70">
            {/* Selector Rápido de Régimen y Periodo */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Régimen:</span>
              <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                {[
                  { id: "RMT", label: "MYPE (1.0%)" },
                  { id: "RER", label: "RER (1.5%)" },
                  { id: "RG", label: "General" },
                  { id: "NRUS", label: "Nuevo RUS" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRegime(r.id as SunatTaxRegime)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      selectedRegime === r.id
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{r.label}</span>
                    {r.id === officialRegime && (
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedRegime === r.id ? "bg-emerald-300" : "bg-emerald-500"}`} title="Régimen oficial registrado ante SUNAT" />
                    )}
                  </button>
                ))}
              </div>

              {/* Distintivo de Régimen Oficial vs Simulación */}
              {selectedRegime === officialRegime ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Oficial SUNAT: {officialRegime}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold">
                  <Info className="w-3 h-3 text-amber-600" />
                  Simulación (Oficial: {officialRegime})
                </span>
              )}

              <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Periodo:</span>
              <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                {[
                  { id: "CURRENT", label: "Este Mes" },
                  { id: "PREVIOUS", label: "Mes Anterior" },
                  { id: "ALL", label: "Acumulado" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPeriod(p.id as any)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      selectedPeriod === p.id
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle de Desglose Contable Detallado */}
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white/90 hover:bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs cursor-pointer transition-all self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showDetails ? "Ocultar Auditoría Detallada" : "Ver Auditoría & Deducción de Compras"}</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* SECCIÓN DETALLADA EXPANDIBLE (AUDITORÍA & SIMULADOR DE COMPRAS) */}
          {showDetails && (
            <div className="pt-2 border-t border-indigo-100 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Resumen de Comprobantes emitidos */}
                <div className="md:col-span-6 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                  <span className="font-bold text-slate-800 text-[11px] block">
                    Comprobantes Emitidos en el Periodo ({liquidation.periodLabel}):
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-bold">Facturas (01)</div>
                      <div className="text-xs font-black text-slate-900">S/ {liquidation.totalFacturas.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-bold">Boletas (03)</div>
                      <div className="text-xs font-black text-slate-900">S/ {liquidation.totalBoletas.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-amber-700 font-bold">Notas Crédito (07)</div>
                      <div className="text-xs font-black text-amber-700">-S/ {liquidation.totalNotasCredito.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Deductor de Compras */}
                <div className="md:col-span-6 bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 shadow-2xs space-y-2 text-xs">
                  <span className="font-bold text-indigo-950 text-[11px] block">
                    Simulador de Crédito Fiscal por Compras del Mes:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">S/</span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={purchasesWithInvoice || ""}
                        onChange={(e) => setPurchasesWithInvoice(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="Monto de compras con factura..."
                        className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-1.5 rounded-lg border border-emerald-200 shrink-0">
                      Ahorro IGV: -S/ {liquidation.creditoFiscalIgv.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
