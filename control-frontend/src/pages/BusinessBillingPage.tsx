import { useState, useEffect, useMemo } from "react";
import Appshell from "../components/layout/Appshell";
import { useAuth } from "../auth/AuthContext";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Printer,
  FileCode2,
  FileCheck2,
  RotateCcw,
  Sparkles,
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  X,
  Building2,
  User,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import {
  getBillingStatsRequest,
  getBillingDocumentsRequest,
  emitBillingDocumentRequest,
  retryBillingDocumentRequest,
  issueBillingNoteRequest,
  testBillingSandboxRequest,
  getBillingConfigRequest,
  updateBillingConfigRequest,
  type FiscalDocument,
  type BillingStats,
  type BillingItem,
} from "../services/billing.api";
import * as XLSX from "xlsx";
import QRCode from "qrcode";

export default function BusinessBillingPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [documents, setDocuments] = useState<FiscalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Modals
  const [isEmitModalOpen, setIsEmitModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<FiscalDocument | null>(null);
  const [selectedDocForNote, setSelectedDocForNote] = useState<FiscalDocument | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Emit Form State
  const [emitDocType, setEmitDocType] = useState<"FACTURA" | "BOLETA">("FACTURA");
  const [emitDocTypeNum, setEmitDocTypeNum] = useState<"6" | "1" | "-">("6");
  const [emitCustomerDoc, setEmitCustomerDoc] = useState("");
  const [emitCustomerName, setEmitCustomerName] = useState("");
  const [emitCustomerAddress, setEmitCustomerAddress] = useState("");
  const [emitCustomerEmail, setEmitCustomerEmail] = useState("");
  const [emitCurrency, setEmitCurrency] = useState<"PEN" | "USD">("PEN");
  const [emitPaymentMethod, setEmitPaymentMethod] = useState("CASH");
  const [emitNotes, setEmitNotes] = useState("");
  const [emitItems, setEmitItems] = useState<BillingItem[]>([
    { description: "", quantity: 1, unitPrice: 0, unit: "NIU", igvType: 1 },
  ]);
  const [isSubmittingEmit, setIsSubmittingEmit] = useState(false);

  // Note Form State
  const [noteReasonCode, setNoteReasonCode] = useState<number>(1);
  const [noteReasonText, setNoteReasonText] = useState("Anulación de la operación");
  const [noteAmount, setNoteAmount] = useState<number>(0);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Config Form State
  const [configHasBilling, setConfigHasBilling] = useState(false);
  const [configRuc, setConfigRuc] = useState("");
  const [configName, setConfigName] = useState("");
  const [configReason, setConfigReason] = useState("");
  const [configUrl, setConfigUrl] = useState("");
  const [configToken, setConfigToken] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, docsData] = await Promise.all([
        getBillingStatsRequest().catch(() => null),
        getBillingDocumentsRequest().catch(() => []),
      ]);
      setStats(statsData);
      setDocuments(docsData);
    } catch (err: any) {
      toast.error("Error al cargar datos de facturación: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success("Datos sincronizados con SUNAT");
  };

  // Open Config
  const handleOpenConfig = async () => {
    try {
      const cfg = await getBillingConfigRequest();
      setConfigHasBilling(cfg.hasElectronicBilling);
      setConfigRuc(cfg.businessRuc || user?.businessRuc || "");
      setConfigName(cfg.businessName || user?.businessName || "");
      setConfigReason(cfg.businessReason || user?.businessReason || "");
      setConfigUrl(cfg.nubefactUrl || "");
      setConfigToken("");
      setIsConfigModalOpen(true);
    } catch (err: any) {
      toast.error("Error al abrir configuración: " + err.message);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setIsSavingConfig(true);
      await updateBillingConfigRequest({
        hasElectronicBilling: configHasBilling,
        businessRuc: configRuc,
        businessName: configName,
        businessReason: configReason,
        nubefactUrl: configUrl,
        ...(configToken ? { nubefactToken: configToken } : {}),
      });
      toast.success("Configuración fiscal guardada con éxito");
      setIsConfigModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Fast Sandbox Simulation
  const handleSimulateSandbox = async () => {
    try {
      toast.loading("Generando comprobante sandbox con firma UBL 2.1...", { id: "sandbox" });
      const res = await testBillingSandboxRequest();
      if (res.success) {
        toast.success(`¡Comprobante ${res.document.fullNumber} emitido y aceptado en Sandbox!`, { id: "sandbox" });
        loadData();
      } else {
        toast.error("Error en simulación: " + res.message, { id: "sandbox" });
      }
    } catch (err: any) {
      toast.error("Error al simular: " + err.message, { id: "sandbox" });
    }
  };

  // Retry document
  const handleRetry = async (docId: string, fullNumber: string) => {
    try {
      toast.loading(`Reintentando envío a SUNAT de ${fullNumber}...`, { id: "retry" });
      const res = await retryBillingDocumentRequest(docId);
      if (res.success) {
        toast.success(`Comprobante ${fullNumber} aceptado por SUNAT`, { id: "retry" });
        loadData();
      } else {
        toast.error(`Reintento fallido: ${res.error || "Rechazado por SUNAT"}`, { id: "retry" });
      }
    } catch (err: any) {
      toast.error("Error en reintento: " + err.message, { id: "retry" });
    }
  };

  // Open Preview Modal
  const handleOpenPreview = async (doc: FiscalDocument) => {
    setSelectedDocForPreview(doc);
    try {
      const qrPayload = `${doc.issuerRuc}|${doc.docType}|${doc.serie}|${doc.correlative}|${doc.totalIgv}|${doc.totalAmount}|${doc.createdAt.substring(0, 10)}|${doc.customerDocType}|${doc.customerDocNum}|${doc.hash || ""}`;
      const url = await QRCode.toDataURL(qrPayload, { width: 140, margin: 1 });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl("");
    }
    setIsPreviewModalOpen(true);
  };

  // Open Note Modal
  const handleOpenNoteModal = (doc: FiscalDocument) => {
    setSelectedDocForNote(doc);
    setNoteAmount(doc.totalAmount);
    setNoteReasonCode(1);
    setNoteReasonText("Anulación de la operación");
    setIsNoteModalOpen(true);
  };

  // Submit Note
  const handleSubmitNote = async () => {
    if (!selectedDocForNote) return;
    try {
      setIsSubmittingNote(true);
      const res = await issueBillingNoteRequest({
        originalFiscalDocumentId: selectedDocForNote.id,
        noteType: "CREDIT",
        reasonCode: noteReasonCode,
        reasonText: noteReasonText,
        amount: noteAmount,
      });
      if (res.success) {
        toast.success(res.message);
        setIsNoteModalOpen(false);
        loadData();
      } else {
        toast.error("Error al emitir nota");
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Emit Items Management
  const handleAddItem = () => {
    setEmitItems([
      ...emitItems,
      { description: "", quantity: 1, unitPrice: 0, unit: "NIU", igvType: 1 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (emitItems.length <= 1) return;
    setEmitItems(emitItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof BillingItem, value: any) => {
    const updated = [...emitItems];
    updated[index] = { ...updated[index], [field]: value };
    setEmitItems(updated);
  };

  // Calculate Subtotals for Emit
  const emitCalculations = useMemo(() => {
    let subtotal = 0;
    let total = 0;
    for (const item of emitItems) {
      const line = Number((item.quantity * item.unitPrice).toFixed(2));
      total += line;
      if ((item.igvType || 1) === 1) {
        subtotal += Number((line / 1.18).toFixed(2));
      } else {
        subtotal += line;
      }
    }
    const igv = Number((total - subtotal).toFixed(2));
    return {
      subtotal: Number(subtotal.toFixed(2)),
      igv,
      total: Number(total.toFixed(2)),
    };
  }, [emitItems]);

  // Submit Emit
  const handleSubmitEmit = async () => {
    if (!emitCustomerDoc || !emitCustomerName) {
      toast.error("Por favor ingresa documento y nombre/razón social del cliente.");
      return;
    }
    if (emitDocType === "FACTURA" && emitCustomerDoc.length !== 11) {
      toast.error("El RUC para Factura debe tener exactamente 11 dígitos.");
      return;
    }
    if (emitItems.some((it) => !it.description || it.quantity <= 0 || it.unitPrice <= 0)) {
      toast.error("Verifica que todos los ítems tengan descripción, cantidad y precio válido.");
      return;
    }

    try {
      setIsSubmittingEmit(true);
      toast.loading("Transmitiendo comprobante a SUNAT...", { id: "emit" });
      const res = await emitBillingDocumentRequest({
        docType: emitDocType,
        customerDocType: emitDocTypeNum,
        customerDocNum: emitCustomerDoc,
        customerName: emitCustomerName,
        customerAddress: emitCustomerAddress,
        customerEmail: emitCustomerEmail,
        currency: emitCurrency,
        paymentMethod: emitPaymentMethod,
        items: emitItems,
        notes: emitNotes,
      });

      if (res.success) {
        toast.success(`¡Comprobante ${res.document.fullNumber} emitido exitosamente!`, { id: "emit" });
        setIsEmitModalOpen(false);
        // Reset form
        setEmitCustomerDoc("");
        setEmitCustomerName("");
        setEmitCustomerAddress("");
        setEmitCustomerEmail("");
        setEmitNotes("");
        setEmitItems([{ description: "", quantity: 1, unitPrice: 0, unit: "NIU", igvType: 1 }]);
        loadData();
      } else {
        toast.error(`Rechazado: ${res.message}`, { id: "emit" });
      }
    } catch (err: any) {
      toast.error("Error al emitir: " + err.message, { id: "emit" });
    } finally {
      setIsSubmittingEmit(false);
    }
  };

  // Export to Excel / SIRE
  const handleExportExcel = () => {
    if (filteredDocuments.length === 0) {
      toast.error("No hay comprobantes para exportar con los filtros seleccionados");
      return;
    }
    const dataToExport = filteredDocuments.map((doc, idx) => ({
      "N°": idx + 1,
      "Tipo de Comprobante": doc.docType,
      "Serie y Número": doc.fullNumber,
      "Fecha de Emisión": new Date(doc.createdAt).toLocaleDateString("es-PE"),
      "Tipo Doc Cliente": doc.customerDocType === "6" ? "RUC" : doc.customerDocType === "1" ? "DNI" : "OTROS",
      "Número Doc Cliente": doc.customerDocNum,
      "Razón Social / Cliente": doc.customerName,
      "Moneda": doc.currency,
      "Op. Gravada": doc.totalOpGravada,
      "Op. Exonerada": doc.totalOpExonerada,
      "Op. Inafecta": doc.totalOpInafecta,
      "IGV (18%)": doc.totalIgv,
      "Importe Total": doc.totalAmount,
      "Estado SUNAT": doc.status,
      "Código Respuesta": doc.sunatResponseCode || "0",
      "Descripción SUNAT": doc.sunatDescription || "Aceptado",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Libro_Ventas_SUNAT");
    XLSX.writeFile(wb, `Reporte_Facturacion_SUNAT_${new Date().toISOString().substring(0, 10)}.xlsx`);
    toast.success("Libro electrónico de ventas exportado en formato Excel");
  };

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // docType filter
      if (selectedType !== "ALL" && doc.docType !== selectedType) return false;
      // status filter
      if (selectedStatus !== "ALL" && doc.status !== selectedStatus) return false;
      // search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = doc.fullNumber?.toLowerCase().includes(term);
        const matchName = doc.customerName?.toLowerCase().includes(term);
        const matchDoc = doc.customerDocNum?.toLowerCase().includes(term);
        return matchNum || matchName || matchDoc;
      }
      return true;
    });
  }, [documents, selectedType, selectedStatus, searchTerm]);

  return (
    <Appshell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Top Header & Executive Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Facturación Electrónica SUNAT
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    UBL 2.1 Ready
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  Emisión fiscal oficial, validación tributaria de RUC/DNI, cálculo de IGV y conciliación digital.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
              Sincronizar
            </button>

            <button
              onClick={handleSimulateSandbox}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all shadow-sm active:scale-95"
              title="Emite una factura de prueba en Sandbox para verificar la API"
            >
              <Sparkles className="h-4 w-4 text-amber-600" />
              Probar Sandbox
            </button>

            <button
              onClick={handleOpenConfig}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Settings className="h-4 w-4 text-slate-500" />
              Configurar SUNAT
            </button>

            <button
              onClick={() => setIsEmitModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-500/25 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Emitir Comprobante
            </button>
          </div>
        </div>

        {/* Live SUNAT Health Status Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  {stats?.credentialsConfigured ? "CONECTADO CON SUNAT API (NUBEFAC)" : "MODO EMISIÓN BETA / SANDBOX ACTIVO"}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                RUC Emisor: <span className="font-mono text-blue-300">{stats?.issuerRuc || user?.businessRuc || "20000000001"}</span> — {stats?.issuerName || user?.businessName || "Empresa Principal"}
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl">
                Los comprobantes emitidos son firmados digitalmente bajo el estándar OASIS UBL 2.1 con Código Hash SHA-256 y CDR (Constancia de Recepción) oficial de SUNAT.
              </p>
            </div>

            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-700/60 pt-4 md:pt-0 md:pl-6 shrink-0">
              <div className="text-center px-2">
                <div className="text-2xl font-black text-emerald-400">{stats?.acceptanceRate ?? 100}%</div>
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Efectividad CDR</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-center px-2">
                <div className="text-2xl font-black text-white">{stats?.totalEmitted || 0}</div>
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Comprobantes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Executive Fiscal KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Facturado */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Facturado</span>
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              S/ {(stats?.totalInvoicedPen || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            {stats && stats.totalInvoicedUsd > 0 && (
              <div className="text-xs font-semibold text-slate-500 mt-1">
                + ${stats.totalInvoicedUsd.toLocaleString("es-PE", { minimumFractionDigits: 2 })} USD
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 mt-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Total recaudado según comprobantes aceptados
            </div>
          </div>

          {/* IGV Liquidado */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">IGV Fiscal (18%)</span>
              <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-950">
              S/ {(stats?.totalIgvPen || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-2">
              Base Gravada: S/ {(stats?.totalGravadaPen || 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Aceptados con CDR */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Aceptados con CDR</span>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700">
              {stats?.acceptedCount || 0}
            </div>
            <div className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              100% validados por la plataforma SUNAT
            </div>
          </div>

          {/* Pendientes / Observados */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Pendientes / Alertas</span>
              <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-700">
              {(stats?.rejectedCount || 0) + (stats?.pendingCount || 0)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-2">
              {stats?.rejectedCount || 0} con error • {stats?.pendingCount || 0} en cola
            </div>
          </div>
        </div>

        {/* Filter Bar & Document Management Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por RUC, DNI, Razón Social o Serie-Número (ej. F001-00000001)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="INVOICE">Facturas (01)</option>
                <option value="BOLETA">Boletas de Venta (03)</option>
                <option value="CREDIT_NOTE">Notas de Crédito (07)</option>
                <option value="DEBIT_NOTE">Notas de Débito (08)</option>
                <option value="DISPATCH_GUIDE">Guías de Remisión (09)</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACCEPTED">Aceptado (CDR)</option>
                <option value="LOCAL_DRAFT">Borrador Local</option>
                <option value="QUEUED_OUTBOX">En Cola</option>
                <option value="REJECTED">Observado / Rechazado</option>
                <option value="CANCELLED">Anulado (Baja)</option>
              </select>

              {/* Export Button */}
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all shrink-0 active:scale-95"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Exportar SIRE
              </button>
            </div>
          </div>
        </div>

        {/* Live Fiscal Documents Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-blue-600" />
              Comprobantes Electrónicos Emitidos ({filteredDocuments.length})
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              Mostrando registros en tiempo real
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/60">
                <tr>
                  <th className="px-6 py-3.5">Comprobante</th>
                  <th className="px-6 py-3.5">Fecha Emisión</th>
                  <th className="px-6 py-3.5">Receptor / Cliente</th>
                  <th className="px-6 py-3.5 text-right">Base Gravada</th>
                  <th className="px-6 py-3.5 text-right">IGV (18%)</th>
                  <th className="px-6 py-3.5 text-right">Total</th>
                  <th className="px-6 py-3.5 text-center">Estado SUNAT</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Cargando comprobantes fiscales de la base de datos...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No se encontraron comprobantes emitidos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const isInvoice = doc.docType === "INVOICE";
                    const isBoleta = doc.docType === "BOLETA";
                    const isCredit = doc.docType === "CREDIT_NOTE";

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                                isInvoice
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : isBoleta
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : isCredit
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-purple-100 text-purple-800 border border-purple-200"
                              }`}
                            >
                              {isInvoice ? "FAC" : isBoleta ? "BOL" : isCredit ? "N/C" : "N/D"}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              {doc.fullNumber}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(doc.createdAt).toLocaleDateString("es-PE", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">
                            {doc.customerName}
                          </div>
                          <div className="font-mono text-xs text-slate-400">
                            {doc.customerDocType === "6" ? "RUC: " : doc.customerDocType === "1" ? "DNI: " : ""}
                            {doc.customerDocNum}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right font-mono text-slate-600">
                          {doc.currency === "USD" ? "$ " : "S/ "}
                          {doc.totalOpGravada.toFixed(2)}
                        </td>

                        <td className="px-6 py-4 text-right font-mono text-slate-600">
                          {doc.currency === "USD" ? "$ " : "S/ "}
                          {doc.totalIgv.toFixed(2)}
                        </td>

                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                          {doc.currency === "USD" ? "$ " : "S/ "}
                          {doc.totalAmount.toFixed(2)}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {doc.status === "ACCEPTED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Aceptado CDR
                            </span>
                          ) : doc.status === "REJECTED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                              Observado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Clock className="h-3.5 w-3.5 text-slate-500" />
                              {doc.status}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Ver Preview & Imprimir */}
                            <button
                              onClick={() => handleOpenPreview(doc)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Visualizar Comprobante / Imprimir Ticket"
                            >
                              <Printer className="h-4 w-4" />
                            </button>

                            {/* Descargar XML UBL 2.1 */}
                            {doc.xmlUrl && (
                              <a
                                href={doc.xmlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Descargar XML firmado UBL 2.1"
                              >
                                <FileCode2 className="h-4 w-4" />
                              </a>
                            )}

                            {/* Descargar CDR */}
                            {doc.cdrUrl && (
                              <a
                                href={doc.cdrUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Descargar Constancia de Recepción CDR SUNAT"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            )}

                            {/* Emitir Nota de Crédito */}
                            {doc.status === "ACCEPTED" && doc.docType !== "CREDIT_NOTE" && (
                              <button
                                onClick={() => handleOpenNoteModal(doc)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Emitir Nota de Crédito para este comprobante"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}

                            {/* Reintentar si falló */}
                            {doc.status === "REJECTED" && (
                              <button
                                onClick={() => handleRetry(doc.id, doc.fullNumber)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Reintentar transmisión a SUNAT"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL 1: EMISIÓN DE COMPROBANTE FISCAL */}
        <Modal
          isOpen={isEmitModalOpen}
          onClose={() => setIsEmitModalOpen(false)}
          title="Emisión de Comprobante Electrónico (SUNAT UBL 2.1)"
          maxWidth="max-w-3xl"
        >
          <div className="p-6 space-y-6">
            {/* Tipo de Documento */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setEmitDocType("FACTURA");
                  setEmitDocTypeNum("6");
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  emitDocType === "FACTURA"
                    ? "border-blue-600 bg-blue-50/50 text-blue-900"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm">FACTURA ELECTRÓNICA (01)</span>
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-xs text-slate-500">
                  Para personas jurídicas o naturales con RUC 11 dígitos. Da derecho a crédito fiscal.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmitDocType("BOLETA");
                  setEmitDocTypeNum("1");
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  emitDocType === "BOLETA"
                    ? "border-blue-600 bg-blue-50/50 text-blue-900"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm">BOLETA DE VENTA (03)</span>
                  <User className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-500">
                  Para consumidores finales con DNI (8 dígitos) o sin documento (&lt; S/ 700).
                </p>
              </button>
            </div>

            {/* Datos del Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {emitDocType === "FACTURA" ? "RUC del Cliente (11 dígitos)" : "DNI del Cliente (8 dígitos)"}
                </label>
                <input
                  type="text"
                  maxLength={emitDocType === "FACTURA" ? 11 : 8}
                  placeholder={emitDocType === "FACTURA" ? "20601234567" : "70891234"}
                  value={emitCustomerDoc}
                  onChange={(e) => setEmitCustomerDoc(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Razón Social / Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="ACME LOGISTICS S.A.C."
                  value={emitCustomerName}
                  onChange={(e) => setEmitCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Dirección Fiscal (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Av. Las Camelias 450, San Isidro, Lima"
                  value={emitCustomerAddress}
                  onChange={(e) => setEmitCustomerAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Correo Electrónico (Para envío automático)
                </label>
                <input
                  type="email"
                  placeholder="facturacion@cliente.com"
                  value={emitCustomerEmail}
                  onChange={(e) => setEmitCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Items / Detalle de Comprobante */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase text-slate-600">
                  Líneas de Detalle / Productos o Servicios
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar Ítem
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {emitItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    <input
                      type="text"
                      placeholder="Descripción del producto o servicio"
                      value={item.description}
                      onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={item.quantity || ""}
                      onChange={(e) => handleUpdateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Precio Unit."
                      value={item.unitPrice || ""}
                      onChange={(e) => handleUpdateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-right"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={emitItems.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose Tributario */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5 text-right font-mono text-sm">
              <div className="flex justify-between text-slate-500 text-xs">
                <span>OPERACIÓN GRAVADA (BASE):</span>
                <span>S/ {emitCalculations.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-xs">
                <span>I.G.V. (18.00%):</span>
                <span>S/ {emitCalculations.igv.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-1.5">
                <span>IMPORTE TOTAL:</span>
                <span>S/ {emitCalculations.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Botón Emitir */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEmitModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingEmit}
                onClick={handleSubmitEmit}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {isSubmittingEmit ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Firmar y Emitir Comprobante
              </button>
            </div>
          </div>
        </Modal>

        {/* MODAL 2: NOTA DE CRÉDITO */}
        <Modal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          title={`Emitir Nota de Crédito para ${selectedDocForNote?.fullNumber}`}
          maxWidth="max-w-lg"
        >
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Motivo Oficial según Catálogo SUNAT (Tipo 07)
              </label>
              <select
                value={noteReasonCode}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setNoteReasonCode(val);
                  const reasons: Record<number, string> = {
                    1: "Anulación de la operación",
                    2: "Anulación por error en el RUC",
                    3: "Corrección por error en la descripción",
                    4: "Descuento global",
                    6: "Devolución total",
                    7: "Devolución por ítem / parcial",
                  };
                  setNoteReasonText(reasons[val] || "Anulación");
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value={1}>01 - Anulación de la operación</option>
                <option value={2}>02 - Anulación por error en el RUC</option>
                <option value={3}>03 - Corrección por error en la descripción</option>
                <option value={4}>04 - Descuento global</option>
                <option value={6}>06 - Devolución total</option>
                <option value={7}>07 - Devolución por ítem</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Descripción / Sustento del Motivo
              </label>
              <textarea
                rows={2}
                value={noteReasonText}
                onChange={(e) => setNoteReasonText(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Monto de la Nota ({selectedDocForNote?.currency || "PEN"})
              </label>
              <input
                type="number"
                step="0.01"
                value={noteAmount}
                onChange={(e) => setNoteAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingNote}
                onClick={handleSubmitNote}
                className="px-4 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md"
              >
                {isSubmittingNote ? "Emitiendo..." : "Confirmar Nota de Crédito"}
              </button>
            </div>
          </div>
        </Modal>

        {/* MODAL 3: PREVIEW & IMPRESIÓN DE TICKET */}
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title="Vista Previa del Comprobante Fiscal"
          maxWidth="max-w-md"
        >
          {selectedDocForPreview && (
            <div className="p-6 space-y-4">
              {/* Ticket Layout Printable */}
              <div className="bg-white border border-slate-300 rounded-xl p-6 font-mono text-xs text-slate-800 shadow-sm space-y-3">
                <div className="text-center space-y-1">
                  <div className="font-bold text-sm text-slate-900">{stats?.issuerName || "EMPRESA PRINCIPAL"}</div>
                  <div>RUC: {selectedDocForPreview.issuerRuc}</div>
                  <div className="border-t border-dashed border-slate-300 my-2" />
                  <div className="font-bold text-sm text-blue-900">
                    {selectedDocForPreview.docType === "INVOICE"
                      ? "FACTURA ELECTRÓNICA"
                      : selectedDocForPreview.docType === "BOLETA"
                      ? "BOLETA DE VENTA ELECTRÓNICA"
                      : "NOTA ELECTRÓNICA"}
                  </div>
                  <div className="text-base font-black text-slate-900">{selectedDocForPreview.fullNumber}</div>
                  <div className="text-[10px] text-slate-500">
                    Fecha: {new Date(selectedDocForPreview.createdAt).toLocaleString("es-PE")}
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                  <div>CLIENTE: {selectedDocForPreview.customerName}</div>
                  <div>DOC: {selectedDocForPreview.customerDocNum}</div>
                  {selectedDocForPreview.customerAddress && (
                    <div className="text-[10px] text-slate-500">DIR: {selectedDocForPreview.customerAddress}</div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                  <div className="flex justify-between font-bold text-[11px]">
                    <span>DESCRIPCIÓN</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>OPERACIÓN GENERAL</span>
                    <span>{selectedDocForPreview.currency} {selectedDocForPreview.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-right">
                  <div className="flex justify-between">
                    <span>OP. GRAVADA:</span>
                    <span>{selectedDocForPreview.currency} {selectedDocForPreview.totalOpGravada.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>I.G.V. (18%):</span>
                    <span>{selectedDocForPreview.currency} {selectedDocForPreview.totalIgv.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                    <span>TOTAL A PAGAR:</span>
                    <span>{selectedDocForPreview.currency} {selectedDocForPreview.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {qrDataUrl && (
                  <div className="flex flex-col items-center justify-center pt-3 border-t border-dashed border-slate-300">
                    <img src={qrDataUrl} alt="QR SUNAT" className="h-28 w-28" />
                    <span className="text-[9px] text-slate-400 mt-1">Representación impresa autorizada por SUNAT</span>
                    {selectedDocForPreview.hash && (
                      <span className="text-[8px] text-slate-400 font-mono mt-0.5">Hash: {selectedDocForPreview.hash}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Ticket Térmico
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL 4: CONFIGURACIÓN DE CREDENCIALES SUNAT */}
        <Modal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          title="Configuración de Credenciales SUNAT / Facturador"
          maxWidth="max-w-md"
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <span className="text-sm font-bold text-blue-900">Facturación Electrónica Activa</span>
                <p className="text-xs text-blue-700">Habilita la transmisión automática a SUNAT</p>
              </div>
              <input
                type="checkbox"
                checked={configHasBilling}
                onChange={(e) => setConfigHasBilling(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                RUC de la Empresa (11 dígitos)
              </label>
              <input
                type="text"
                maxLength={11}
                placeholder="20601234567"
                value={configRuc}
                onChange={(e) => setConfigRuc(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Razón Social de la Empresa
              </label>
              <input
                type="text"
                placeholder="MI EMPRESA S.A.C."
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                URL Endpoint API (NubeFacT / OSE / PSE)
              </label>
              <input
                type="text"
                placeholder="https://app.nubefact.com/api/v1/..."
                value={configUrl}
                onChange={(e) => setConfigUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Token Secreto de Autorización API
              </label>
              <input
                type="password"
                placeholder="Ingresa tu token secreto"
                value={configToken}
                onChange={(e) => setConfigToken(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Déjalo vacío si ya está configurado y no deseas cambiarlo.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={handleSaveConfig}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50"
              >
                {isSavingConfig ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Appshell>
  );
}
