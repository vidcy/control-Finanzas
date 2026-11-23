import { useState, useEffect, useMemo } from "react";
import Appshell from "../components/layout/Appshell";
import { useAuth } from "../auth/AuthContext";
import { getPeruTodayInputStr } from "../utils/date.utils";
import {
  TAX_REGIMES,
  isAmazoniaDepartment,
  validateBoletaCustomerRequirement,
  checkBancarizacionRequirement,
  getValidEmissionDateRange,
  validateIssueDateRange,
  validateRuc,
  validateDni,
  IGV_AFFECTATION_LIST,
  AMAZONIA_DEFAULT_LEGEND,
} from "../utils/fiscalUtils";
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
  Cpu,
  Globe,
  Key,
  Layers,
  Zap,
  Check,
  HelpCircle,
  Edit3,
  Wand2,
  AlertTriangle,
  Calendar,
  CreditCard,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import { SunatAnnulmentModal, type SunatAnnulmentOptions } from "../components/ui/SunatAnnulmentModal";
import { SunatSmartEditModal } from "../components/ui/SunatSmartEditModal";
import { SunatManualNoteModal } from "../components/ui/SunatManualNoteModal";
import { SunatSuccessResultModal } from "../components/ui/SunatSuccessResultModal";
import { SunatNotesListModal } from "../components/ui/SunatNotesListModal";
import SystemErrorModal from "../components/ui/SystemErrorModal";
import { parseSystemError, type SystemErrorInfo } from "../utils/systemErrorHandler";
import {
  getBillingStatsRequest,
  getBillingDocumentsRequest,
  emitBillingDocumentRequest,
  retryBillingDocumentRequest,
  issueBillingNoteRequest,
  testBillingSandboxRequest,
  getBillingConfigRequest,
  updateBillingConfigRequest,
  syncSeriesRequest,
  consultarRucRequest,
  updateBillingDocumentRequest,
  deleteBillingDocumentRequest,
  smartEditBillingDocumentRequest,
  manualNoteBillingDocumentRequest,
  testCcofactConnectionRequest,
  type FiscalDocument,
  type BillingStats,
  type BillingItem,
} from "../services/billing.api";
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
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType, selectedStatus, filterStartDate, filterEndDate, pageSize]);

  // Modals
  const [isEmitModalOpen, setIsEmitModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<FiscalDocument | null>(null);
  const [selectedDocForNote, setSelectedDocForNote] = useState<FiscalDocument | null>(null);
  const [selectedDocForNotesList, setSelectedDocForNotesList] = useState<FiscalDocument | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Amazonia detection
  const isAmazoniaUser = useMemo(() => {
    return (
      isAmazoniaDepartment(user?.department) ||
      user?.taxRegime === "AMAZONIA_EXONERADO" ||
      user?.taxRegime === "AMAZONIA"
    );
  }, [user?.department, user?.taxRegime]);

  // Date constraints (SUNAT R.S. N° 193-2020: Máximo 3 días calendario de retroactividad)
  const { minDate: minEmissionDate, maxDate: maxEmissionDate } = useMemo(() => getValidEmissionDateRange(), []);

  // Emit Form State
  const [emitDocType, setEmitDocType] = useState<"FACTURA" | "BOLETA">("FACTURA");
  const [emitDocTypeNum, setEmitDocTypeNum] = useState<"6" | "1" | "-">("6");
  const [emitCustomerDoc, setEmitCustomerDoc] = useState("");
  const [emitCustomerName, setEmitCustomerName] = useState("");
  const [emitCustomerAddress, setEmitCustomerAddress] = useState("");
  const [emitCustomerEmail, setEmitCustomerEmail] = useState("");
  const [emitCurrency, setEmitCurrency] = useState<"PEN" | "USD">("PEN");
  const [emitPaymentMethod, setEmitPaymentMethod] = useState("CASH");
  const [emitPaymentType, setEmitPaymentType] = useState<"CONTADO" | "CREDITO">("CONTADO");
  const [emitIssueDate, setEmitIssueDate] = useState(() => getPeruTodayInputStr());
  const [emitDueDate, setEmitDueDate] = useState(() => getPeruTodayInputStr());
  const [emitNotes, setEmitNotes] = useState(() => (isAmazoniaDepartment(user?.department) ? AMAZONIA_DEFAULT_LEGEND : ""));
  const [emitItems, setEmitItems] = useState<BillingItem[]>(() => [
    {
      description: "",
      quantity: 1,
      unitPrice: 0,
      unit: "NIU",
      igvType: isAmazoniaDepartment(user?.department) ? 8 : 1,
      igvAffectation: isAmazoniaDepartment(user?.department) ? "20" : "10",
      igvRate: isAmazoniaDepartment(user?.department) ? 0.0 : 18.0,
    },
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
  const [configAddress, setConfigAddress] = useState("");
  const [configDepartment, setConfigDepartment] = useState("");
  const [configProvince, setConfigProvince] = useState("");
  const [configDistrict, setConfigDistrict] = useState("");
  const [configUrl, setConfigUrl] = useState("");
  const [configToken, setConfigToken] = useState("");
  const [configSerieBoleta, setConfigSerieBoleta] = useState("B001");
  const [configSerieFactura, setConfigSerieFactura] = useState("F001");
  const [configInitialBoleta, setConfigInitialBoleta] = useState<number | string>("");
  const [configInitialFactura, setConfigInitialFactura] = useState<number | string>("");
  const [configSerieNcBoleta, setConfigSerieNcBoleta] = useState("BC01");
  const [configSerieNcFactura, setConfigSerieNcFactura] = useState("FC01");
  const [configSerieNdBoleta, setConfigSerieNdBoleta] = useState("BD01");
  const [configSerieNdFactura, setConfigSerieNdFactura] = useState("FD01");
  const [configInitialNcBoleta, setConfigInitialNcBoleta] = useState<number | string>("");
  const [configInitialNcFactura, setConfigInitialNcFactura] = useState<number | string>("");
  const [configInitialNdBoleta, setConfigInitialNdBoleta] = useState<number | string>("");
  const [configInitialNdFactura, setConfigInitialNdFactura] = useState<number | string>("");
  const [isLookingUpSunat, setIsLookingUpSunat] = useState(false);
  const [isSyncingSeries, setIsSyncingSeries] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Edit / Rectify State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<FiscalDocument | null>(null);
  const [editCustomerDoc, setEditCustomerDoc] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerAddress, setEditCustomerAddress] = useState("");
  const [editCustomerEmail, setEditCustomerEmail] = useState("");
  const [editRectifyAccepted, setEditRectifyAccepted] = useState(false);
  const [editRectifyReason, setEditRectifyReason] = useState("ANULACION POR MODIFICACION Y RECTIFICACION DE COMPROBANTE");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Smart Edit (Diff Engine) State
  const [isSmartEditModalOpen, setIsSmartEditModalOpen] = useState(false);
  const [selectedDocForSmartEdit, setSelectedDocForSmartEdit] = useState<FiscalDocument | null>(null);
  const [isSubmittingSmartEdit, setIsSubmittingSmartEdit] = useState(false);

  // Manual Note (Catálogo 09 / 10) State
  const [isManualNoteModalOpen, setIsManualNoteModalOpen] = useState(false);
  const [selectedDocForManualNote, setSelectedDocForManualNote] = useState<FiscalDocument | null>(null);
  const [isSubmittingManualNote, setIsSubmittingManualNote] = useState(false);

  // Success Result Smart Modal State
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState<any>(null);

  // Delete / Annul State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDocForDelete, setSelectedDocForDelete] = useState<FiscalDocument | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState("ANULACION DE LA OPERACION POR EL EMISOR");
  const [deleteRestoreStock, setDeleteRestoreStock] = useState(true);
  const [deleteForce, setDeleteForce] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // CCOFACT Connection test State
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<any>(null);

  // Diagnostic / System Error Modal State
  const [systemError, setSystemError] = useState<SystemErrorInfo | null>(null);
  const [systemErrorRetryAction, setSystemErrorRetryAction] = useState<(() => void) | null>(null);

  const handleShowDiagnostic = (doc: FiscalDocument) => {
    const rawMsg =
      doc.sunatDescription ||
      (doc.status === "REJECTED" ? "Comprobante rechazado u observado por SUNAT." : doc.status);
    const parsed = parseSystemError(
      {
        code: doc.sunatResponseCode,
        message: rawMsg,
        detail: `Comprobante: ${doc.fullNumber} | Tipo: ${doc.docType} | Receptor: ${doc.customerDocNum} - ${doc.customerName}`,
      },
      `Diagnóstico Tributario SUNAT: ${doc.fullNumber}`
    );
    setSystemErrorRetryAction(() => () => handleRetry(doc.id, doc.fullNumber));
    setSystemError(parsed);
  };

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

  // Consultar RUC y autocompletar datos de empresa en modal de configuración
  const handleLookupSunatInBilling = async () => {
    const cleanRuc = configRuc.trim().replace(/\D/g, "").slice(0, 11);
    if (!cleanRuc || cleanRuc.length !== 11) {
      toast.error("Ingresa un RUC válido de 11 dígitos para consultar ante SUNAT.");
      return;
    }
    try {
      setIsLookingUpSunat(true);
      toast.loading("Consultando padrón oficial de SUNAT...", { id: "sunat-billing-ruc" });
      const res = await consultarRucRequest(cleanRuc);
      if (res && res.success) {
        const razon = res.razonSocial || res.nombreComercial || "";
        const comercial = res.nombreComercial || res.razonSocial || "";
        setConfigReason(razon);
        setConfigName(comercial);
        if (res.direccion) setConfigAddress(res.direccion);
        if (res.departamento) setConfigDepartment(res.departamento);
        if (res.provincia) setConfigProvince(res.provincia);
        if (res.distrito) setConfigDistrict(res.distrito);
        toast.success(
          `✓ Datos SUNAT cargados: ${razon} (${res.estado || 'ACTIVO'} - ${res.condicion || 'HABIDO'})`,
          { id: "sunat-billing-ruc", duration: 4000 }
        );
      } else {
        toast.error("No se encontraron datos en SUNAT para este RUC.", { id: "sunat-billing-ruc" });
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Error al consultar RUC en SUNAT",
        { id: "sunat-billing-ruc" }
      );
    } finally {
      setIsLookingUpSunat(false);
    }
  };

  // Open Config
  const handleOpenConfig = async () => {
    try {
      const cfg = await getBillingConfigRequest();
      setConfigHasBilling(cfg.hasElectronicBilling);
      setConfigRuc(cfg.businessRuc || user?.businessRuc || "");
      setConfigName(cfg.businessName || cfg.businessReason || user?.businessName || "");
      setConfigReason(cfg.businessReason || cfg.businessName || user?.businessReason || "");
      setConfigAddress(cfg.businessAddress || (user as any)?.businessAddress || "");
      setConfigDepartment(cfg.businessDepartment || (user as any)?.businessDepartment || "");
      setConfigProvince(cfg.businessProvince || (user as any)?.businessProvince || "");
      setConfigDistrict(cfg.businessDistrict || (user as any)?.businessDistrict || "");
      setConfigUrl(cfg.ccofactUrl || "");
      setConfigToken("");
      setConfigSerieBoleta(cfg.billingSerieBoleta || "B001");
      setConfigSerieFactura(cfg.billingSerieInvoice || "F001");
      setConfigSerieNcBoleta(cfg.serieNotaCreditoBoleta || "BC01");
      setConfigSerieNcFactura(cfg.serieNotaCreditoFactura || "FC01");
      setConfigSerieNdBoleta(cfg.serieNotaDebitoBoleta || "BD01");
      setConfigSerieNdFactura(cfg.serieNotaDebitoFactura || "FD01");
      setConfigInitialBoleta(cfg.initialBoletaNumber !== undefined && cfg.initialBoletaNumber > 0 ? String(cfg.initialBoletaNumber) : "");
      setConfigInitialFactura(cfg.initialFacturaNumber !== undefined && cfg.initialFacturaNumber > 0 ? String(cfg.initialFacturaNumber) : "");
      setConfigInitialNcBoleta(cfg.initialNcBoletaNumber !== undefined && cfg.initialNcBoletaNumber > 0 ? String(cfg.initialNcBoletaNumber) : "");
      setConfigInitialNcFactura(cfg.initialNcFacturaNumber !== undefined && cfg.initialNcFacturaNumber > 0 ? String(cfg.initialNcFacturaNumber) : "");
      setConfigInitialNdBoleta(cfg.initialNdBoletaNumber !== undefined && cfg.initialNdBoletaNumber > 0 ? String(cfg.initialNdBoletaNumber) : "");
      setConfigInitialNdFactura(cfg.initialNdFacturaNumber !== undefined && cfg.initialNdFacturaNumber > 0 ? String(cfg.initialNdFacturaNumber) : "");
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
        businessName: configName || configReason,
        businessReason: configReason || configName,
        businessAddress: configAddress,
        businessDepartment: configDepartment,
        businessProvince: configProvince,
        businessDistrict: configDistrict,
        ccofactUrl: configUrl,
        billingSerieBoleta: configSerieBoleta,
        billingSerieInvoice: configSerieFactura,
        ...(configToken ? { ccofactApiKey: configToken } : {}),
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

  const handleSyncSeries = async () => {
    try {
      setIsSyncingSeries(true);
      toast.loading("Sincronizando series y correlativos con CCOFACT PRO...", { id: "sync-series" });
      const res = await syncSeriesRequest({
        serieBoleta: configSerieBoleta,
        serieFactura: configSerieFactura,
        serieNotaCreditoBoleta: configSerieNcBoleta,
        serieNotaCreditoFactura: configSerieNcFactura,
        serieNotaDebitoBoleta: configSerieNdBoleta,
        serieNotaDebitoFactura: configSerieNdFactura,
        ...(configInitialBoleta !== "" ? { initialBoletaNumber: Number(configInitialBoleta) } : {}),
        ...(configInitialFactura !== "" ? { initialFacturaNumber: Number(configInitialFactura) } : {}),
        ...(configInitialNcBoleta !== "" ? { initialNcBoletaNumber: Number(configInitialNcBoleta) } : {}),
        ...(configInitialNcFactura !== "" ? { initialNcFacturaNumber: Number(configInitialNcFactura) } : {}),
        ...(configInitialNdBoleta !== "" ? { initialNdBoletaNumber: Number(configInitialNdBoleta) } : {}),
        ...(configInitialNdFactura !== "" ? { initialNdFacturaNumber: Number(configInitialNdFactura) } : {}),
      });
      if (res.success) {
        toast.success(res.message || "Series y correlativos sincronizados con éxito", { id: "sync-series" });
      } else {
        toast.error("Error sincronizando series: " + res.message, { id: "sync-series" });
      }
    } catch (err: any) {
      toast.error("Error al sincronizar series: " + err.message, { id: "sync-series" });
    } finally {
      setIsSyncingSeries(false);
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
      toast.loading(`Reintentando transmisión de ${fullNumber}...`, { id: "retry" });
      const res = await retryBillingDocumentRequest(docId);
      if (res.success) {
        toast.success(`Comprobante ${fullNumber} aceptado por SUNAT`, { id: "retry" });
        loadData();
      } else {
        toast.dismiss("retry");
        setSystemErrorRetryAction(() => () => handleRetry(docId, fullNumber));
        setSystemError(
          parseSystemError(
            res.error || res.message || "Rechazado por SUNAT",
            `Diagnóstico de Reintento SUNAT: ${fullNumber}`
          )
        );
      }
    } catch (err: any) {
      toast.dismiss("retry");
      setSystemErrorRetryAction(() => () => handleRetry(docId, fullNumber));
      setSystemError(parseSystemError(err, `Error en Reintento de ${fullNumber}`));
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

  // Smart Edit (Diff Engine SUNAT)
  const handleOpenSmartEditModal = (doc: FiscalDocument) => {
    setSelectedDocForSmartEdit(doc);
    setIsSmartEditModalOpen(true);
  };

  const handleConfirmSmartEdit = async (payload: any) => {
    if (!selectedDocForSmartEdit) return;
    try {
      setIsSubmittingSmartEdit(true);
      const res = await smartEditBillingDocumentRequest(selectedDocForSmartEdit.id, payload);
      toast.success("Edición Inteligente procesada con éxito ante SUNAT");
      setIsSmartEditModalOpen(false);
      loadData();

      setSuccessModalData({
        caso: res.caso,
        message: res.mensaje || res.message,
        originalDoc: {
          fullNumber: selectedDocForSmartEdit.fullNumber,
          totalAmount: Number(selectedDocForSmartEdit.totalAmount),
        },
        creditNote: res.nota_credito
          ? {
              fullNumber: res.nota_credito.full_number || res.nota_credito.numero_completo,
              amount: Number(res.nota_credito.total_amount || res.nota_credito.amount || selectedDocForSmartEdit.totalAmount),
              pdfUrl: res.recursos_nota?.pdf_url,
              xmlUrl: res.recursos_nota?.xml_url,
              cdrUrl: res.recursos_nota?.cdr_url,
            }
          : undefined,
        debitNote: res.nota_debito
          ? {
              fullNumber: res.nota_debito.full_number,
              amount: Number(res.nota_debito.total_amount || res.nota_debito.amount || 0),
              pdfUrl: res.recursos_nota?.pdf_url,
              xmlUrl: res.recursos_nota?.xml_url,
              cdrUrl: res.recursos_nota?.cdr_url,
            }
          : undefined,
        newDoc: res.nuevo_comprobante
          ? {
              fullNumber: res.nuevo_comprobante.full_number || res.nuevo_comprobante.numero_completo,
              totalAmount: Number(res.nuevo_comprobante.total_amount || res.nuevo_comprobante.total || 0),
              pdfUrl: res.recursos_nuevo?.pdf_url,
              xmlUrl: res.recursos_nuevo?.xml_url,
              cdrUrl: res.recursos_nuevo?.cdr_url,
            }
          : undefined,
      });
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      const parsed = parseSystemError(err, "Error al procesar Edición Inteligente SUNAT");
      setSystemError(parsed);
    } finally {
      setIsSubmittingSmartEdit(false);
    }
  };

  // Manual Note (Catálogo 09 / 10 SUNAT)
  const handleOpenManualNoteModal = (doc: FiscalDocument) => {
    setSelectedDocForManualNote(doc);
    setIsManualNoteModalOpen(true);
  };

  const handleConfirmManualNote = async (payload: any) => {
    if (!selectedDocForManualNote) return;
    try {
      setIsSubmittingManualNote(true);
      const res = await manualNoteBillingDocumentRequest(selectedDocForManualNote.id, payload);
      toast.success("Nota oficial emitida con éxito ante SUNAT");
      setIsManualNoteModalOpen(false);
      loadData();

      setSuccessModalData({
        caso: "MANUAL_NOTE",
        message: res.mensaje || res.message || "Nota emitida correctamente ante SUNAT.",
        originalDoc: {
          fullNumber: selectedDocForManualNote.fullNumber,
          totalAmount: Number(selectedDocForManualNote.totalAmount),
        },
        creditNote: payload.note_type === "07" && res.nota
          ? {
              fullNumber: res.nota.full_number,
              amount: Number(res.nota.total_amount || payload.amount || 0),
              pdfUrl: res.recursos?.pdf_url,
              xmlUrl: res.recursos?.xml_url,
              cdrUrl: res.recursos?.cdr_url,
            }
          : undefined,
        debitNote: payload.note_type === "08" && res.nota
          ? {
              fullNumber: res.nota.full_number,
              amount: Number(res.nota.total_amount || payload.amount || 0),
              pdfUrl: res.recursos?.pdf_url,
              xmlUrl: res.recursos?.xml_url,
              cdrUrl: res.recursos?.cdr_url,
            }
          : undefined,
      });
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      const parsed = parseSystemError(err, "Error al Emitir Nota Oficial SUNAT");
      setSystemError(parsed);
    } finally {
      setIsSubmittingManualNote(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (doc: FiscalDocument) => {
    setSelectedDocForEdit(doc);
    setEditCustomerDoc(doc.customerDocNum);
    setEditCustomerName(doc.customerName);
    setEditCustomerAddress(doc.customerAddress || "");
    setEditCustomerEmail("");
    setEditRectifyAccepted(doc.status === "ACCEPTED");
    setEditRectifyReason("ANULACION POR MODIFICACION Y RECTIFICACION DE COMPROBANTE");
    setIsEditModalOpen(true);
  };

  // Save Edit / Rectify
  const handleSaveEdit = async () => {
    if (!selectedDocForEdit) return;
    try {
      setIsSubmittingEdit(true);
      const res = await updateBillingDocumentRequest(selectedDocForEdit.id, {
        customerDocNum: editCustomerDoc,
        customerName: editCustomerName,
        customerAddress: editCustomerAddress,
        customerEmail: editCustomerEmail,
        rectifyAccepted: editRectifyAccepted,
        rectifyReason: editRectifyReason,
      });
      toast.success(res.message || "Comprobante actualizado exitosamente");
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Error al actualizar");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (doc: FiscalDocument) => {
    setSelectedDocForDelete(doc);
    setDeleteMotivo("ANULACION DE LA OPERACION POR EL EMISOR");
    setDeleteRestoreStock(Boolean(doc.saleId));
    setDeleteForce(false);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete / Annul
  const handleConfirmDelete = async (options: SunatAnnulmentOptions) => {
    if (!selectedDocForDelete) return;
    try {
      setIsSubmittingDelete(true);
      const res = await deleteBillingDocumentRequest(selectedDocForDelete.id, {
        motivo: options.motivo,
        restoreStock: options.restoreStock,
        method: options.method,
        deliveredToClient: options.deliveredToClient,
      });
      toast.success(res.message || "Operación completada exitosamente");
      setIsDeleteModalOpen(false);
      setSelectedDocForDelete(null);
      loadData();
    } catch (err: any) {
      setSystemError(
        parseSystemError(
          err.response?.data?.message || err.message || "Error al procesar anulación",
          `Error al Anular Comprobante ${selectedDocForDelete?.fullNumber || ""}`
        )
      );
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Test CCOFACT connection in real time
  const handleTestConnection = async () => {
    try {
      setIsTestingConn(true);
      setConnResult(null);
      const res = await testCcofactConnectionRequest();
      setConnResult(res);
      if (res.connected) {
        toast.success("¡Conexión verificada con CCOFACT PRO Engine!");
      } else {
        setSystemError(parseSystemError(res.message || "No se pudo conectar con el facturador CCOFACT", "Diagnóstico de Conexión CCOFACT"));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setConnResult({ connected: false, message: msg });
      setSystemError(parseSystemError(msg, "Error de Conexión con CCOFACT"));
    } finally {
      setIsTestingConn(false);
    }
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
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        unit: "NIU",
        igvType: isAmazoniaUser ? 8 : 1,
        igvAffectation: isAmazoniaUser ? "20" : "10",
        igvRate: isAmazoniaUser ? 0.0 : 18.0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (emitItems.length <= 1) return;
    setEmitItems(emitItems.filter((_, i) => i !== index));
  };

  const [masterAffectation, setMasterAffectation] = useState<"20" | "10_18" | "10_MYPE" | "30">("20");

  const handleApplyMasterAffectation = (choice: "20" | "10_18" | "10_MYPE" | "30") => {
    setMasterAffectation(choice);
    let aff = "20";
    let type = 8;
    let rate = 0.0;

    if (choice === "20") {
      aff = "20";
      type = 8;
      rate = 0.0;
      setEmitNotes(AMAZONIA_DEFAULT_LEGEND);
    } else if (choice === "10_18") {
      aff = "10";
      type = 1;
      rate = 18.0;
      if (emitNotes === AMAZONIA_DEFAULT_LEGEND) setEmitNotes("");
    } else if (choice === "10_MYPE") {
      aff = "10_MYPE";
      type = 1;
      rate = 10.5;
      if (emitNotes === AMAZONIA_DEFAULT_LEGEND) setEmitNotes("");
    } else if (choice === "30") {
      aff = "30";
      type = 9;
      rate = 0.0;
      if (emitNotes === AMAZONIA_DEFAULT_LEGEND) setEmitNotes("");
    }

    setEmitItems((prev) =>
      prev.map((item) => ({
        ...item,
        igvAffectation: aff,
        igvType: type,
        igvRate: rate,
      }))
    );
  };

  const handleUpdateItem = (index: number, field: keyof BillingItem, value: any) => {
    const updated = [...emitItems];
    let patch: Partial<BillingItem> = { [field]: value };

    // Sincronización automática de afectación e IGV
    if (field === "igvAffectation") {
      if (value === "20") {
        patch = { igvAffectation: "20", igvType: 8, igvRate: 0.0 };
      } else if (value === "30") {
        patch = { igvAffectation: "30", igvType: 9, igvRate: 0.0 };
      } else if (value === "10_MYPE") {
        patch = { igvAffectation: "10_MYPE", igvType: 1, igvRate: 10.0 };
      } else if (value === "40") {
        patch = { igvAffectation: "40", igvType: 9, igvRate: 0.0 };
      } else {
        patch = { igvAffectation: "10", igvType: 1, igvRate: 18.0 };
      }
    }

    updated[index] = { ...updated[index], ...patch };
    setEmitItems(updated);
  };

  // Calculate Subtotals for Emit according to SUNAT Catálogo 07
  const emitCalculations = useMemo(() => {
    let gravada = 0;
    let exonerada = 0;
    let inafecta = 0;
    let igv = 0;
    let total = 0;

    for (const item of emitItems) {
      const line = Number((item.quantity * item.unitPrice).toFixed(2));
      total += line;

      const aff = item.igvAffectation || (item.igvType === 8 ? "20" : item.igvType === 9 ? "30" : "10");

      if (aff === "20") {
        exonerada += line;
      } else if (aff === "30" || aff === "40") {
        inafecta += line;
      } else if (aff === "10_MYPE" || item.igvRate === 10) {
        const base = Number((line / 1.10).toFixed(2));
        gravada += base;
        igv += Number((line - base).toFixed(2));
      } else {
        // Gravado 18%
        const base = Number((line / 1.18).toFixed(2));
        gravada += base;
        igv += Number((line - base).toFixed(2));
      }
    }

    return {
      gravada: Number(gravada.toFixed(2)),
      exonerada: Number(exonerada.toFixed(2)),
      inafecta: Number(inafecta.toFixed(2)),
      igv: Number(igv.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }, [emitItems]);

  // Alerta de Bancarización legal en tiempo real (D.L. 1529 / Ley 28194)
  const bancarizacionAlert = useMemo(() => {
    return checkBancarizacionRequirement(emitCalculations.total, emitCurrency);
  }, [emitCalculations.total, emitCurrency]);

  // Validación Boleta >= S/ 700 en tiempo real
  const boletaValidation = useMemo(() => {
    if (emitDocType !== "BOLETA") return { isValid: true };
    return validateBoletaCustomerRequirement(
      emitCalculations.total,
      emitDocTypeNum,
      emitCustomerDoc,
      emitCustomerName
    );
  }, [emitDocType, emitCalculations.total, emitDocTypeNum, emitCustomerDoc, emitCustomerName]);

  // Submit Emit con validaciones SUNAT enterprise
  const handleSubmitEmit = async () => {
    // 1. Validar rango de fecha de emisión (Máximo 3 días calendario según R.S. N° 193-2020)
    const dateValidation = validateIssueDateRange(emitIssueDate);
    if (!dateValidation.isValid) {
      toast.error(dateValidation.error || "Fecha de emisión inválida.");
      return;
    }

    // 2. Validar Cliente / RUC / DNI
    if (!emitCustomerDoc || !emitCustomerName) {
      toast.error("Por favor ingresa documento y nombre/razón social del cliente.");
      return;
    }

    if (emitDocType === "FACTURA") {
      if (emitCustomerDoc.length !== 11) {
        toast.error("El RUC para Factura debe tener exactamente 11 dígitos.");
        return;
      }
      if (!validateRuc(emitCustomerDoc)) {
        toast.error("El RUC ingresado no es válido según el algoritmo oficial de SUNAT (Módulo 11).");
        return;
      }
      if (emitCustomerName.trim().toUpperCase() === "CLIENTES VARIOS") {
        toast.error("Para Factura electrónica debes ingresar la Razón Social real de la empresa.");
        return;
      }
    }

    if (emitDocType === "BOLETA") {
      if (!boletaValidation.isValid) {
        toast.error(boletaValidation.error || "Datos del cliente incompletos para Boleta >= S/ 700.");
        return;
      }
      if (emitCustomerDoc.length === 8 && !validateDni(emitCustomerDoc)) {
        toast.error("El DNI debe tener exactamente 8 dígitos numéricos.");
        return;
      }
    }

    // 3. Validar líneas de detalle
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
        paymentType: emitPaymentType,
        issueDate: emitIssueDate,
        dueDate: emitPaymentType === "CREDITO" ? emitDueDate : undefined,
        items: emitItems,
        notes: emitNotes,
        observaciones: emitNotes,
      });

      if (res.success) {
        toast.success(`¡Comprobante ${res.document.fullNumber} emitido exitosamente!`, { id: "emit" });
        setIsEmitModalOpen(false);
        // Reset form
        setEmitCustomerDoc("");
        setEmitCustomerName("");
        setEmitCustomerAddress("");
        setEmitCustomerEmail("");
        setEmitNotes(isAmazoniaUser ? AMAZONIA_DEFAULT_LEGEND : "");
        setEmitItems([
          {
            description: "",
            quantity: 1,
            unitPrice: 0,
            unit: "NIU",
            igvType: isAmazoniaUser ? 8 : 1,
            igvAffectation: isAmazoniaUser ? "20" : "10",
            igvRate: isAmazoniaUser ? 0.0 : 18.0,
          },
        ]);
        loadData();
      } else {
        toast.dismiss("emit");
        setSystemError(
          parseSystemError(
            res.message || res.error || "Comprobante rechazado por SUNAT",
            "Atención Tributaria en Emisión de Comprobante"
          )
        );
      }
    } catch (err: any) {
      toast.dismiss("emit");
      setSystemError(parseSystemError(err, "Error al Emitir Comprobante"));
    } finally {
      setIsSubmittingEmit(false);
    }
  };

  // Export to Excel / SIRE
  const handleExportExcel = async () => {
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

    const XLSX = await import("xlsx");
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
      // date filter
      if (filterStartDate) {
        const docDate = new Date(doc.createdAt).toISOString().substring(0, 10);
        if (docDate < filterStartDate) return false;
      }
      if (filterEndDate) {
        const docDate = new Date(doc.createdAt).toISOString().substring(0, 10);
        if (docDate > filterEndDate) return false;
      }
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
  }, [documents, selectedType, selectedStatus, searchTerm, filterStartDate, filterEndDate]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPage, pageSize]);

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

        {/* Live SUNAT Health Status Banner (Luminoso, Pro y Ejecutivo) */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 p-6 shadow-sm relative overflow-hidden border border-blue-200/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                </span>
                <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-emerald-700">
                  {stats?.credentialsConfigured
                    ? "CONEXIÓN OFICIAL: MOTOR SOBERANO CCOFACT PRO (UBL 2.1)"
                    : "SISTEMA TRIBUTARIO SUNAT ACTIVO & SINCRONIZADO"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  RUC Emisor: <span className="font-mono text-indigo-700">{stats?.issuerRuc || user?.businessRuc || "20000000001"}</span> — {stats?.issuerName || user?.businessName || "Empresa Principal"}
                </h2>
                {(() => {
                  const reg = TAX_REGIMES[user?.taxRegime || "RER_18"] || TAX_REGIMES.RER_18;
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-2xs">
                      🏛️ {reg.shortName}
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-slate-600 max-w-2xl font-medium">
                {(() => {
                  const reg = TAX_REGIMES[user?.taxRegime || "RER_18"] || TAX_REGIMES.RER_18;
                  return (
                    <>
                      <strong>Régimen Tributario:</strong> {reg.name}. Comprobantes autorizados: {reg.allowedDocs.join(", ")}. Emisión en formato UBL 2.1 con Código Hash SHA-256.
                    </>
                  );
                })()}
              </p>
            </div>

            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-indigo-200/60 pt-4 md:pt-0 md:pl-6 shrink-0">
              <div className="text-center px-3 bg-white/80 p-2.5 rounded-2xl border border-indigo-100 shadow-2xs">
                <div className="text-2xl font-black text-emerald-600">{stats?.acceptanceRate ?? 100}%</div>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase">Aceptación</div>
              </div>
              <div className="text-center px-3 bg-white/80 p-2.5 rounded-2xl border border-indigo-100 shadow-2xs">
                <div className="text-2xl font-black text-slate-900">{stats?.totalEmitted ?? 0}</div>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase">Emitidos Mes</div>
              </div>
              <div className="text-center px-3 bg-white/80 p-2.5 rounded-2xl border border-indigo-100 shadow-2xs">
                <div className="text-2xl font-black text-indigo-600">1.2s</div>
                <div className="text-[10px] text-slate-500 font-extrabold uppercase">Velocidad CDR</div>
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

            {/* Type & Status Filters and Dates */}
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              {/* Date Filters */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] font-bold text-slate-500">Desde:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="text-xs bg-transparent border-0 outline-none font-bold text-slate-700"
                />
                <span className="text-[11px] font-bold text-slate-500">Hasta:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="text-xs bg-transparent border-0 outline-none font-bold text-slate-700"
                />
                {(filterStartDate || filterEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStartDate("");
                      setFilterEndDate("");
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-800 ml-1 cursor-pointer"
                  >
                    ✕ Limpiar
                  </button>
                )}
              </div>

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
                <option value="CANCELLED">Anulado (Nota Crédito)</option>
              </select>

              {/* Export Button */}
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-all shrink-0 active:scale-95 cursor-pointer"
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
                  <th className="px-6 py-3.5 text-center">Estado Comercial</th>
                  <th className="px-6 py-3.5 text-center">Estado SUNAT</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                      Cargando comprobantes fiscales de la base de datos...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                      No se encontraron comprobantes emitidos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginatedDocuments.map((doc) => {
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
                          {doc.notas && doc.notas.length > 0 && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => setSelectedDocForNotesList(doc)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 cursor-pointer shadow-2xs transition-colors"
                                title="Ver notas oficiales emitidas ante SUNAT"
                              >
                                <Receipt className="w-3 h-3 text-indigo-600" />
                                <span>{doc.notas.length} Nota(s) ({doc.notas[0].fullNumber})</span>
                              </button>
                            </div>
                          )}
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
                          <div>
                            {doc.currency === "USD" ? "$ " : "S/ "}
                            {(doc.saldoDisponible !== undefined ? doc.saldoDisponible : doc.totalAmount).toFixed(2)}
                          </div>
                          {doc.saldoDisponible !== undefined && Number(doc.saldoDisponible) !== Number(doc.totalAmount) && (
                            <span className="block text-[10px] text-slate-400 font-normal line-through">
                              Orig: {doc.currency === "USD" ? "$ " : "S/ "}
                              {doc.totalAmount.toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* ESTADO COMERCIAL */}
                        <td className="px-6 py-4 text-center">
                          {doc.status === "CANCELLED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              Anulado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Vigente
                            </span>
                          )}
                        </td>

                        {/* ESTADO SUNAT */}
                        <td className="px-6 py-4 text-center">
                          {doc.status === "ACCEPTED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Aceptado CDR
                            </span>
                          ) : doc.status === "REJECTED" ? (
                            <button
                              type="button"
                              onClick={() => handleShowDiagnostic(doc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all cursor-pointer shadow-xs group"
                              title="Hacer clic para ver diagnóstico detallado de SUNAT y solución sugerida"
                            >
                              <AlertCircle className="h-3.5 w-3.5 text-rose-600 group-hover:scale-110 transition-transform" />
                              <span>Observado</span>
                            </button>
                          ) : doc.status === "CANCELLED" ? (
                            <button
                              type="button"
                              onClick={() => handleShowDiagnostic(doc)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all cursor-pointer shadow-xs group"
                              title={doc.sunatDescription || "Comprobante anulado formalmente ante SUNAT con Nota de Crédito."}
                            >
                              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                              <span>Anulado (NC)</span>
                            </button>
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

                            {/* Botón Inteligente: Edición con Diff Engine */}
                            {doc.status === "ACCEPTED" && (
                              <button
                                onClick={() => handleOpenSmartEditModal(doc)}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors font-bold"
                                title="Edición Inteligente con Diff Engine (SUNAT UBL 2.1) - Detección automática de Casos A, B, C y D"
                              >
                                <Wand2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* Emisión Manual de Nota de Crédito / Débito */}
                            {doc.status === "ACCEPTED" && doc.docType !== "CREDIT_NOTE" && (
                              <button
                                onClick={() => handleOpenManualNoteModal(doc)}
                                className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Emisión Manual de Nota de Crédito o Débito (Catálogo 09 y 10 Oficial)"
                              >
                                <FileSpreadsheet className="h-4 w-4" />
                              </button>
                            )}

                            {/* Anular ante SUNAT con Nota de Crédito o Eliminar */}
                            {doc.status !== "CANCELLED" && (
                              <button
                                onClick={() => handleOpenDeleteModal(doc)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title={
                                  doc.status === "ACCEPTED"
                                    ? "Anular legalmente ante SUNAT con Nota de Crédito (Catálogo 09 Motivo 01)"
                                    : "Eliminar comprobante"
                                }
                              >
                                <Trash2 className="h-4 w-4" />
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

          {/* Pagination Controls */}
          {filteredDocuments.length > 0 && (
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Mostrando</span>
                <span className="font-bold text-slate-900">
                  {Math.min(filteredDocuments.length, (currentPage - 1) * pageSize + 1)} -{" "}
                  {Math.min(filteredDocuments.length, currentPage * pageSize)}
                </span>
                <span>de</span>
                <span className="font-bold text-slate-900">{filteredDocuments.length}</span>
                <span>comprobantes</span>
                <span className="text-slate-300 mx-1">|</span>
                <div className="flex items-center gap-1.5">
                  <span>Filas por pág:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  &larr; Anterior
                </button>
                <span className="px-3 py-1.5 font-bold text-slate-900 bg-white border border-slate-200 rounded-lg">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Siguiente &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL 1: EMISIÓN DE COMPROBANTE FISCAL */}
        <Modal
          isOpen={isEmitModalOpen}
          onClose={() => setIsEmitModalOpen(false)}
          title="Emisión de Comprobante Electrónico (SUNAT UBL 2.1)"
          maxWidth="max-w-4xl"
        >
          <div className="p-6 space-y-5">
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
                    ? "border-blue-600 bg-blue-50/50 text-blue-900 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm">FACTURA ELECTRÓNICA (01)</span>
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-xs text-slate-500">
                  Para personas jurídicas o naturales con RUC 11 dígitos. Otorga derecho a crédito fiscal.
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
                    ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm">BOLETA DE VENTA (03)</span>
                  <User className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-xs text-slate-500">
                  Para consumidores finales. Si es ≥ S/ 700 requiere identificación obligatoria con DNI.
                </p>
              </button>
            </div>

            {/* Parámetros Legales: Fecha de Emisión, Forma de Pago, Moneda */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    Fecha Emisión *
                  </span>
                  <span className="text-[9px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    Máx 3 días
                  </span>
                </label>
                <input
                  type="date"
                  min={minEmissionDate}
                  max={maxEmissionDate}
                  value={emitIssueDate}
                  onChange={(e) => setEmitIssueDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">R.S. N° 193-2020/SUNAT</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                  Forma de Pago *
                </label>
                <select
                  value={emitPaymentType}
                  onChange={(e) => setEmitPaymentType(e.target.value as "CONTADO" | "CREDITO")}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="CONTADO">Contado (Inmediato)</option>
                  <option value="CREDITO">Crédito (A Plazos)</option>
                </select>
                {emitPaymentType === "CREDITO" && (
                  <div className="mt-1.5">
                    <label className="block text-[10px] font-bold text-indigo-700 uppercase">Vencimiento</label>
                    <input
                      type="date"
                      min={emitIssueDate}
                      value={emitDueDate}
                      onChange={(e) => setEmitDueDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-indigo-200 rounded text-slate-800"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  Moneda
                </label>
                <select
                  value={emitCurrency}
                  onChange={(e) => setEmitCurrency(e.target.value as "PEN" | "USD")}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="PEN">Soles (PEN - S/)</option>
                  <option value="USD">Dólares Americanos (USD - $)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-0.5">T.C. Oficial SUNAT</p>
              </div>
            </div>

            {/* Datos del Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  {emitDocType === "FACTURA" ? "RUC del Cliente (11 dígitos) *" : "DNI del Cliente (8 dígitos)"}
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
                  Razón Social / Nombre Completo *
                </label>
                <input
                  type="text"
                  placeholder={emitDocType === "FACTURA" ? "EMPRESA SAC" : "Juan Pérez"}
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
                  placeholder="Av. Principal 123"
                  value={emitCustomerAddress}
                  onChange={(e) => setEmitCustomerAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Correo Electrónico (Envío Automático)
                </label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={emitCustomerEmail}
                  onChange={(e) => setEmitCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Alerta Legal Boleta >= 700 */}
            {emitDocType === "BOLETA" && emitCalculations.total >= 700 && !boletaValidation.isValid && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Identificación Obligatoria para Boletas ≥ S/ 700 (R.S. N° 193-2020/SUNAT)</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Para montos a partir de S/ 700.00, SUNAT no acepta ventas anónimas o &quot;CLIENTES VARIOS&quot;. Debes registrar obligatoriamente el DNI (8 dígitos) y nombres completos del cliente.
                  </p>
                </div>
              </div>
            )}

            {/* SELECTOR MAESTRO DE AFECTACIÓN AL IGV (SUNAT CATÁLOGO 07) */}
            <div className="bg-gradient-to-r from-emerald-50/60 to-blue-50/40 border border-emerald-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Régimen / Afectación Global de Comprobante *
                  </span>
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    🌿 Por Defecto: Exonerado (0% Amazonía)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-bold">Aplica a todas las líneas</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyMasterAffectation("20")}
                  className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 ${
                    masterAffectation === "20"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/30"
                      : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  <span>🌿 EXONERADO (0%)</span>
                  <span className={`text-[8px] font-bold ${masterAffectation === "20" ? "text-emerald-100" : "text-slate-400"}`}>
                    Amazonía / Ley 27037
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyMasterAffectation("10_18")}
                  className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 ${
                    masterAffectation === "10_18"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <span>💼 GRAVADO (18%)</span>
                  <span className={`text-[8px] font-bold ${masterAffectation === "10_18" ? "text-blue-100" : "text-slate-400"}`}>
                    Tasa General SUNAT
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyMasterAffectation("10_MYPE")}
                  className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 ${
                    masterAffectation === "10_MYPE"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/30"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  <span>🟣 GRAVADO (10.5%)</span>
                  <span className={`text-[8px] font-bold ${masterAffectation === "10_MYPE" ? "text-indigo-100" : "text-slate-400"}`}>
                    Ley 31556 MYPE
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyMasterAffectation("30")}
                  className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 ${
                    masterAffectation === "30"
                      ? "bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400/30"
                      : "bg-white text-slate-600 border-slate-200 hover:border-purple-300"
                  }`}
                >
                  <span>📄 INAFECTO (0%)</span>
                  <span className={`text-[8px] font-bold ${masterAffectation === "30" ? "text-purple-100" : "text-slate-400"}`}>
                    Fuera de Ámbito
                  </span>
                </button>
              </div>
            </div>

            {/* Items / Detalle de Comprobante con selector de Afectación IGV */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    Líneas de Detalle / Productos o Servicios
                  </label>
                  {isAmazoniaUser && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                      🌿 Región Amazonía: Exonerado 0% por defecto
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar Línea
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
                      className="w-16 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center font-bold"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Precio Unit."
                      value={item.unitPrice || ""}
                      onChange={(e) => handleUpdateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-right font-bold"
                    />
                    <select
                      value={item.igvAffectation || (item.igvType === 8 ? "20" : item.igvType === 9 ? "30" : "10")}
                      onChange={(e) => handleUpdateItem(idx, "igvAffectation", e.target.value)}
                      className="w-36 px-2 py-1.5 text-[11px] bg-white border border-slate-200 rounded-lg font-bold text-slate-700"
                    >
                      <option value="20">Exonerado (0% Selva)</option>
                      <option value="10">Gravado (18% General)</option>
                      <option value="10_MYPE">Gravado (10% Ley 31556)</option>
                      <option value="30">Inafecto (0%)</option>
                    </select>
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

            {/* Observaciones / Leyendas SUNAT Obligatorias */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Observaciones / Leyenda Legal SUNAT</span>
                {isAmazoniaUser && (
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Ley N° 27037 predeterminada
                  </span>
                )}
              </label>
              <textarea
                rows={2}
                placeholder="Observaciones legales o leyenda tributaria..."
                value={emitNotes}
                onChange={(e) => setEmitNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Alerta de Bancarización Obligatoria (> S/ 2,000 o USD 500) */}
            {bancarizacionAlert.isRequired && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Alerta de Bancarización Obligatoria (D.L. N° 1529 / Ley N° 28194)</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {bancarizacionAlert.message}
                  </p>
                </div>
              </div>
            )}

            {/* Desglose Tributario Oficial SUNAT */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5 text-right font-mono text-sm">
              {emitCalculations.gravada > 0 && (
                <div className="flex justify-between text-slate-500 text-xs">
                  <span>OP. GRAVADA (BASE):</span>
                  <span>{emitCurrency === "USD" ? "$" : "S/"} {emitCalculations.gravada.toFixed(2)}</span>
                </div>
              )}
              {emitCalculations.exonerada > 0 && (
                <div className="flex justify-between text-emerald-700 text-xs font-semibold">
                  <span>OP. EXONERADA (LEY AMAZONÍA 0%):</span>
                  <span>{emitCurrency === "USD" ? "$" : "S/"} {emitCalculations.exonerada.toFixed(2)}</span>
                </div>
              )}
              {emitCalculations.inafecta > 0 && (
                <div className="flex justify-between text-slate-500 text-xs">
                  <span>OP. INAFECTA:</span>
                  <span>{emitCurrency === "USD" ? "$" : "S/"} {emitCalculations.inafecta.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 text-xs">
                <span>I.G.V. TOTAL:</span>
                <span>{emitCurrency === "USD" ? "$" : "S/"} {emitCalculations.igv.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-1.5">
                <span>IMPORTE TOTAL:</span>
                <span>{emitCurrency === "USD" ? "$" : "S/"} {emitCalculations.total.toFixed(2)}</span>
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
                disabled={isSubmittingEmit || (emitDocType === "BOLETA" && emitCalculations.total >= 700 && !boletaValidation.isValid)}
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
              <div className="bg-white border border-slate-300 rounded-xl p-6 font-mono text-xs text-slate-800 shadow-sm space-y-3 relative overflow-hidden">
                {selectedDocForPreview.status === "CANCELLED" && (
                  <div className="bg-rose-50 border-2 border-rose-300 text-rose-900 p-2.5 rounded-lg text-center font-bold text-xs space-y-1 mb-2">
                    <div className="flex items-center justify-center gap-1.5 text-rose-800 uppercase tracking-wider text-[11px]">
                      <span className="h-2 w-2 rounded-full bg-rose-600"></span>
                      <span>COMPROBANTE ANULADO ANTE SUNAT (SIN VALOR FISCAL)</span>
                    </div>
                    {selectedDocForPreview.sunatDescription && (
                      <div className="text-[10px] font-medium text-rose-700 leading-tight">
                        {selectedDocForPreview.sunatDescription}
                      </div>
                    )}
                  </div>
                )}
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

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-right text-xs">
                  {selectedDocForPreview.totalOpExonerada > 0 ? (
                    <>
                      <div className="flex justify-between">
                        <span>OP. EXONERADA:</span>
                        <span>{selectedDocForPreview.currency} {selectedDocForPreview.totalOpExonerada.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>I.G.V. (0.00%):</span>
                        <span>{selectedDocForPreview.currency} 0.00</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>OP. GRAVADA:</span>
                        <span>{selectedDocForPreview.currency} {selectedDocForPreview.totalOpGravada.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>I.G.V. (18%):</span>
                        <span>{selectedDocForPreview.currency} {selectedDocForPreview.totalIgv.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                    <span>TOTAL A PAGAR:</span>
                    <span>{selectedDocForPreview.currency} {selectedDocForPreview.totalAmount.toFixed(2)}</span>
                  </div>
                  {selectedDocForPreview.totalOpExonerada > 0 && (
                    <div className="text-[8px] text-center font-bold text-emerald-800 pt-1 leading-tight">
                      BIENES TRANSFERIDOS EN LA AMAZONÍA PARA SER CONSUMIDOS EN LA MISMA - LEY N° 27037
                    </div>
                  )}
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

        {/* MODAL 4: CONFIGURACIÓN DE CREDENCIALES SUNAT & MOTOR FISCAL */}
        <Modal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          title="Configuración de Motor Fiscal SUNAT (CCOFACT PRO Enterprise)"
          maxWidth="max-w-2xl"
        >
          <div className="p-6 space-y-5">
            {/* Switch Habilitar Facturación */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/80 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-black text-slate-900 block">Facturación Electrónica SUNAT Activa</span>
                  <p className="text-xs text-slate-600">Habilita la transmisión automática de comprobantes con validez fiscal UBL 2.1</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configHasBilling}
                  onChange={(e) => setConfigHasBilling(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Selector Rápido de Motor / Proveedor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  Seleccionar Motor / Proveedor de Facturación
                </label>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {configUrl.toLowerCase().includes("ccofact") || configUrl.includes("4001")
                    ? "🚀 CCOFACT PRO Enterprise"
                    : "⚙️ Servidor Personalizado"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Opción 1: CCOFACT PRO Local 4001 */}
                <button
                  type="button"
                  onClick={() => setConfigUrl("http://localhost:4001/api/v1/ccofact/emitir")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    configUrl.includes("4001") || configUrl.toLowerCase().includes("ccofact/emitir")
                      ? "bg-indigo-50/80 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20"
                      : "bg-slate-50 hover:bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      CCOFACT PRO (Local :4001)
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    Motor fiscal autónomo UBL 2.1 directo SUNAT. Firma X.509, A4/Ticket 80mm y CDR sin cobro por factura.
                  </p>
                  <div className="mt-2 text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                    http://localhost:4001/api/v1/ccofact/emitir
                  </div>
                </button>

                {/* Opción 2: CCOFACT PRO Nube */}
                <button
                  type="button"
                  onClick={() => setConfigUrl("https://api.ccofact.com/api/v1/ccofact/emitir")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    configUrl === "https://api.ccofact.com/api/v1/ccofact/emitir"
                      ? "bg-indigo-50/80 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20"
                      : "bg-slate-50 hover:bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      CCOFACT Cloud (Producción)
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                      Cloud SLA
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    Servidor en la nube de alta disponibilidad con colas transaccionales y reintentos automáticos.
                  </p>
                  <div className="mt-2 text-[10px] font-mono font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                    api.ccofact.com/api/v1/ccofact/emitir
                  </div>
                </button>
              </div>
            </div>

            {/* Datos Tributarios Principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                  RUC Emisor Oficial (11 dígitos)
                </label>
                <div className="relative flex items-center">
                  <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="20601234567"
                    value={configRuc}
                    onChange={(e) => setConfigRuc(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 11);
                      setConfigRuc(pasted);
                    }}
                    className="w-full pl-9 pr-24 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:border-indigo-500 font-bold"
                  />
                  <button
                    type="button"
                    disabled={isLookingUpSunat || configRuc.trim().replace(/\D/g, "").length !== 11}
                    onClick={handleLookupSunatInBilling}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    title="Consultar padrón oficial de SUNAT y autocompletar automáticamente los datos"
                  >
                    {isLookingUpSunat ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Buscando</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                        <span>SUNAT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                  Razón Social Oficial SUNAT
                </label>
                <input
                  type="text"
                  placeholder="QUISPE AYCA DAVID o MI EMPRESA S.A.C."
                  value={configReason || configName}
                  onChange={(e) => {
                    setConfigReason(e.target.value.toUpperCase());
                    setConfigName(e.target.value.toUpperCase());
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              {/* Domicilio Fiscal */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                  Domicilio Fiscal Oficial
                </label>
                <input
                  type="text"
                  placeholder="Ej. Av. Las Américas 1240, Juliaca"
                  value={configAddress}
                  onChange={(e) => setConfigAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Ubicación: Departamento, Provincia, Distrito */}
              <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                    Departamento
                  </label>
                  <input
                    type="text"
                    placeholder="PUNO"
                    value={configDepartment}
                    onChange={(e) => setConfigDepartment(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                    Provincia
                  </label>
                  <input
                    type="text"
                    placeholder="SAN ROMAN"
                    value={configProvince}
                    onChange={(e) => setConfigProvince(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                    Distrito
                  </label>
                  <input
                    type="text"
                    placeholder="JULIACA"
                    value={configDistrict}
                    onChange={(e) => setConfigDistrict(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Endpoint URL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-black uppercase text-slate-600">
                  URL Endpoint API Fiscal
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-slate-400">Atajos puerto local:</span>
                  <button
                    type="button"
                    onClick={() => setConfigUrl("http://localhost:3000/api/v1/ccofact/emitir")}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono text-slate-700"
                  >
                    :3000
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigUrl("http://localhost:4001/api/v1/ccofact/emitir")}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-mono text-slate-700"
                  >
                    :4001
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="http://localhost:3000/api/v1/ccofact/emitir o https://api.ccofact.com/..."
                value={configUrl}
                onChange={(e) => setConfigUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Token Secreto */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                Clave API Secreta CCOFACT PRO (x-api-key)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  placeholder="Ingresa tu clave de autorización API"
                  value={configToken}
                  onChange={(e) => setConfigToken(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                * La clave se transmite de forma segura como cabecera <code>x-api-key</code> para autenticación directa con el motor fiscal CCOFACT PRO.
              </span>
            </div>

            {/* Gestión de Series y Correlativos SUNAT */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Series y Correlativos de Emisión SUNAT
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configure las series activas y ajuste el correlativo inicial si ya emitió comprobantes en SUNAT.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {/* Boleta */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate">Boletas (03)</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] rounded font-bold shrink-0">
                      Próx: {configSerieBoleta || "B001"}-{String(Number(configInitialBoleta || 0) + 1).padStart(8, '0')}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2 pt-0.5">
                    <div className="col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Serie</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="B001"
                        value={configSerieBoleta}
                        onChange={(e) => setConfigSerieBoleta(e.target.value.toUpperCase().trim())}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-center"
                      />
                    </div>
                    <div className="col-span-7">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Último SUNAT</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={configInitialBoleta}
                        onChange={(e) => setConfigInitialBoleta(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Factura */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <span className="truncate">Facturas (01)</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-[10px] rounded font-bold shrink-0">
                      Próx: {configSerieFactura || "F001"}-{String(Number(configInitialFactura || 0) + 1).padStart(8, '0')}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2 pt-0.5">
                    <div className="col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Serie</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="F001"
                        value={configSerieFactura}
                        onChange={(e) => setConfigSerieFactura(e.target.value.toUpperCase().trim())}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-center"
                      />
                    </div>
                    <div className="col-span-7">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Último SUNAT</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={configInitialFactura}
                        onChange={(e) => setConfigInitialFactura(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Nota de Crédito Boleta */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="truncate">NC Boleta (07)</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 font-mono text-[10px] rounded font-bold shrink-0">
                      Próx: {configSerieNcBoleta || "BC01"}-{String(Number(configInitialNcBoleta || 0) + 1).padStart(8, '0')}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2 pt-0.5">
                    <div className="col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Serie</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="BC01"
                        value={configSerieNcBoleta}
                        onChange={(e) => setConfigSerieNcBoleta(e.target.value.toUpperCase().trim())}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-center"
                      />
                    </div>
                    <div className="col-span-7">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Último SUNAT</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={configInitialNcBoleta}
                        onChange={(e) => setConfigInitialNcBoleta(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Nota de Crédito Factura */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="truncate">NC Factura (07)</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 font-mono text-[10px] rounded font-bold shrink-0">
                      Próx: {configSerieNcFactura || "FC01"}-{String(Number(configInitialNcFactura || 0) + 1).padStart(8, '0')}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2 pt-0.5">
                    <div className="col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Serie</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="FC01"
                        value={configSerieNcFactura}
                        onChange={(e) => setConfigSerieNcFactura(e.target.value.toUpperCase().trim())}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-center"
                      />
                    </div>
                    <div className="col-span-7">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Último SUNAT</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={configInitialNcFactura}
                        onChange={(e) => setConfigInitialNcFactura(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Nota de Débito Boleta */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate">ND Boleta (08)</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-mono text-[10px] rounded font-bold shrink-0">
                      Próx: {configSerieNdBoleta || "BD01"}-{String(Number(configInitialNdBoleta || 0) + 1).padStart(8, '0')}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2 pt-0.5">
                    <div className="col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Serie</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="BD01"
                        value={configSerieNdBoleta}
                        onChange={(e) => setConfigSerieNdBoleta(e.target.value.toUpperCase().trim())}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-center"
                      />
                    </div>
                    <div className="col-span-7">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Último SUNAT</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={configInitialNdBoleta}
                        onChange={(e) => setConfigInitialNdBoleta(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Nota de Débito Factura */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate">ND Factura (08)</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-mono text-[10px] rounded font-bold shrink-0">
                      Próx: {configSerieNdFactura || "FD01"}-{String(Number(configInitialNdFactura || 0) + 1).padStart(8, '0')}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2 pt-0.5">
                    <div className="col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Serie</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="FD01"
                        value={configSerieNdFactura}
                        onChange={(e) => setConfigSerieNdFactura(e.target.value.toUpperCase().trim())}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-center"
                      />
                    </div>
                    <div className="col-span-7">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Último SUNAT</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={configInitialNdFactura}
                        onChange={(e) => setConfigInitialNdFactura(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 text-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-slate-500">
                  💡 Si migró de servidor o SUNAT ya registró números en pruebas locales, cambie la serie a <strong>B002 / F002</strong> o ingrese el último número emitido para continuar sin colisión.
                </span>
                <button
                  type="button"
                  onClick={handleSyncSeries}
                  disabled={isSyncingSeries}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isSyncingSeries ? "Sincronizando..." : "Sincronizar Series con CCOFACT PRO"}
                </button>
              </div>
            </div>

            {/* Info Card de Especificaciones */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-600">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Compatibilidad Garantizada Nivel PRO:
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-600">
                <li>Series automáticas: <strong>F001</strong> (Factura) y <strong>B001</strong> (Boleta) para CCOFACT PRO.</li>
                <li>Firma digital X.509 RSA-SHA256 UBL 2.1 y cálculo de código QR oficial SUNAT.</li>
                <li>Generación instantánea de vistas impresas en <strong>Ticket POS 80mm</strong> y <strong>A4 Ejecutivo</strong>.</li>
                <li>Bloqueo pesimista ACID PostgreSQL con protección contra doble facturación (Zero-Double-Billing).</li>
              </ul>
            </div>

            {/* Prueba de Conexión en Vivo con CCOFACT PRO */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConn}
                className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 text-indigo-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Zap className={`w-4 h-4 ${isTestingConn ? "animate-spin" : "text-indigo-600"}`} />
                {isTestingConn ? "Probando comunicación con CCOFACT..." : "Verificar Conexión en Vivo con CCOFACT PRO Engine"}
              </button>

              {connResult && (
                <div
                  className={`mt-2 p-3 rounded-xl border text-xs ${
                    connResult.connected
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {connResult.connected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    {connResult.message}
                  </div>
                  {connResult.company && (
                    <div className="mt-1.5 text-[11px] space-y-0.5 text-emerald-700">
                      <div>
                        <strong>Empresa:</strong> {connResult.company.razon_social} (RUC: {connResult.company.ruc})
                      </div>
                      <div>
                        <strong>Entorno:</strong> {connResult.company.env_mode} | <strong>Certificado X.509:</strong>{" "}
                        {connResult.company.certificado_valido ? "Configurado" : "Pendiente"}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingConfig}
                onClick={handleSaveConfig}
                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isSavingConfig ? "Guardando..." : "Guardar Configuración Fiscal"}
              </button>
            </div>
          </div>
        </Modal>

        {/* MODAL 4: MODIFICAR / RECTIFICAR COMPROBANTE */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Modificar Comprobante ${selectedDocForEdit?.fullNumber || ""}`}
          maxWidth="max-w-2xl"
        >
          <div className="p-6 space-y-5">
            {selectedDocForEdit?.status === "ACCEPTED" ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  Procedimiento de Rectificación Oficial SUNAT (R.S. N.° 097-2012)
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Este comprobante ya cuenta con <strong>Aceptación Oficial de SUNAT (CDR)</strong>. Conforme a la legislación tributaria peruana, los datos fiscales no pueden ser editados de forma directa en frío.
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Al confirmar la rectificación, el sistema <strong>emitirá automáticamente una Nota de Crédito Electrónica</strong> (Catálogo 09 Motivo 01: Anulación de la operación) ante SUNAT para anular el comprobante anterior y <strong>emitirá de inmediato un nuevo comprobante corregido</strong> con la nueva correlación oficial.
                </p>
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-amber-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRectifyAccepted}
                      onChange={(e) => setEditRectifyAccepted(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    Acepto emitir Nota de Crédito de Anulación ante SUNAT y generar comprobante de reemplazo
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                El comprobante aún no cuenta con aceptación definitiva de SUNAT. Puedes corregir los datos del cliente y reintentar su emisión.
              </div>
            )}

            {/* Datos del Cliente a Modificar */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                    Número de Documento (RUC / DNI)
                  </label>
                  <input
                    type="text"
                    value={editCustomerDoc}
                    onChange={(e) => setEditCustomerDoc(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                    Razón Social / Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                  Dirección Fiscal
                </label>
                <input
                  type="text"
                  value={editCustomerAddress}
                  onChange={(e) => setEditCustomerAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                  Correo Electrónico para Entrega
                </label>
                <input
                  type="email"
                  value={editCustomerEmail}
                  onChange={(e) => setEditCustomerEmail(e.target.value)}
                  placeholder="ejemplo@cliente.pe"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {selectedDocForEdit?.status === "ACCEPTED" && (
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                    Motivo de la Rectificación para Nota de Crédito
                  </label>
                  <input
                    type="text"
                    value={editRectifyReason}
                    onChange={(e) => setEditRectifyReason(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit || (selectedDocForEdit?.status === "ACCEPTED" && !editRectifyAccepted)}
                onClick={handleSaveEdit}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingEdit
                  ? "Procesando..."
                  : selectedDocForEdit?.status === "ACCEPTED"
                  ? "Ejecutar Rectificación SUNAT"
                  : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </Modal>

        {/* MODAL OFICIAL: ANULAR O DAR DE BAJA COMPROBANTE SUNAT */}
        <SunatAnnulmentModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedDocForDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          isSubmitting={isSubmittingDelete}
          documentInfo={
            selectedDocForDelete
              ? {
                  fullNumber: selectedDocForDelete.fullNumber,
                  documentType: selectedDocForDelete.docType,
                  totalAmount: Number(selectedDocForDelete.totalAmount) || 0,
                  clientName: selectedDocForDelete.customerName || "CLIENTES VARIOS",
                  issueDate: selectedDocForDelete.createdAt,
                  isBilled: selectedDocForDelete.status === "ACCEPTED" || Boolean(selectedDocForDelete.fullNumber),
                }
              : null
          }
        />

        {/* MODAL INTELIGENTE: EDICIÓN CON DIFF ENGINE (SUNAT UBL 2.1) */}
        <SunatSmartEditModal
          isOpen={isSmartEditModalOpen}
          onClose={() => {
            setIsSmartEditModalOpen(false);
            setSelectedDocForSmartEdit(null);
          }}
          document={
            selectedDocForSmartEdit
              ? {
                  id: selectedDocForSmartEdit.id,
                  fullNumber: selectedDocForSmartEdit.fullNumber,
                  docType: selectedDocForSmartEdit.docType,
                  serie: selectedDocForSmartEdit.serie,
                  correlative: selectedDocForSmartEdit.correlative,
                  customerName: selectedDocForSmartEdit.customerName,
                  customerDocType: selectedDocForSmartEdit.customerDocType,
                  customerDocNum: selectedDocForSmartEdit.customerDocNum,
                  customerAddress: selectedDocForSmartEdit.customerAddress,
                  totalAmount: Number(selectedDocForSmartEdit.totalAmount),
                  issueDate: selectedDocForSmartEdit.createdAt,
                  items: selectedDocForSmartEdit.sale?.items?.map((it: any) => ({
                    productId: it.productId,
                    name: it.name,
                    quantity: Number(it.quantity) || 1,
                    price: Number(it.price) || 0,
                  })) || [
                    {
                      name: `Servicio / Venta ${selectedDocForSmartEdit.fullNumber}`,
                      quantity: 1,
                      price: Number(selectedDocForSmartEdit.totalAmount),
                    },
                  ],
                }
              : null
          }
          onConfirm={handleConfirmSmartEdit}
          isSubmitting={isSubmittingSmartEdit}
        />

        {/* MODAL AVANZADO: EMISIÓN MANUAL DE NOTAS (CATÁLOGO 09 Y 10 SUNAT) */}
        <SunatManualNoteModal
          isOpen={isManualNoteModalOpen}
          onClose={() => {
            setIsManualNoteModalOpen(false);
            setSelectedDocForManualNote(null);
          }}
          document={
            selectedDocForManualNote
              ? {
                  id: selectedDocForManualNote.id,
                  fullNumber: selectedDocForManualNote.fullNumber,
                  docType: selectedDocForManualNote.docType,
                  serie: selectedDocForManualNote.serie,
                  correlative: selectedDocForManualNote.correlative,
                  customerName: selectedDocForManualNote.customerName,
                  customerDocType: selectedDocForManualNote.customerDocType,
                  customerDocNum: selectedDocForManualNote.customerDocNum,
                  totalAmount: Number(selectedDocForManualNote.totalAmount),
                  issueDate: selectedDocForManualNote.createdAt,
                  items: (selectedDocForManualNote.sale?.items || (selectedDocForManualNote as any).items || []).map((it: any) => ({
                    productId: it.productId,
                    name: it.name || it.description || "Ítem",
                    quantity: Number(it.quantity) || 1,
                    price: Number(it.price || it.unitPrice || it.unit_price) || 0,
                  })),
                }
              : null
          }
          onConfirm={handleConfirmManualNote}
          isSubmitting={isSubmittingManualNote}
        />

        {/* MODAL DE RESULTADO INTELIGENTE (DOCUMENT CARDS CON PDF/XML/CDR) */}
        <SunatSuccessResultModal
          isOpen={isSuccessModalOpen}
          onClose={() => {
            setIsSuccessModalOpen(false);
            setSuccessModalData(null);
          }}
          resultData={successModalData}
        />

        {/* MODAL OFICIAL: HISTORIAL DE NOTAS DE CRÉDITO Y DÉBITO VINCULADAS */}
        {selectedDocForNotesList && (
          <SunatNotesListModal
            isOpen={Boolean(selectedDocForNotesList)}
            onClose={() => setSelectedDocForNotesList(null)}
            documentTitle={`${
              selectedDocForNotesList.docType === "INVOICE"
                ? "Factura"
                : selectedDocForNotesList.docType === "BOLETA"
                ? "Boleta"
                : "Comprobante"
            } ${selectedDocForNotesList.fullNumber}`}
            originalAmount={Number(selectedDocForNotesList.totalAmount || 0)}
            currentBalance={selectedDocForNotesList.saldoDisponible}
            status={selectedDocForNotesList.status}
            notes={selectedDocForNotesList.notas || []}
          />
        )}

        {/* Modal de Diagnóstico y Asistencia Oficial de Errores del Sistema y SUNAT */}
        <SystemErrorModal
          isOpen={Boolean(systemError)}
          onClose={() => {
            setSystemError(null);
            setSystemErrorRetryAction(null);
          }}
          error={systemError}
          onRetry={systemErrorRetryAction ? systemErrorRetryAction : undefined}
        />
      </div>
    </Appshell>
  );
}
