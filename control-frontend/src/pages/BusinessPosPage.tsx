import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Appshell from "../components/layout/Appshell";
import { useAuth } from "../auth/AuthContext";
import {
  getProductsRequest,
  checkoutCartRequest,
} from "../services/product.api";
import type { Product } from "../services/product.api";
import { listCategoriesRequest } from "../services/category.api";
import { getActiveCashShiftRequest } from "../services/cash-shift.api";
import { getAdvisorsRequest } from "../services/advisor.api";
import type { Advisor } from "../services/advisor.api";
import {
  getSalesRequest,
  retrySaleBillingRequest,
  issueSaleCreditNoteRequest,
  issueSaleDebitNoteRequest,
  deleteSaleRequest,
} from "../services/sale.api";
import { queryDocumentRequest } from "../services/user.api";
import ReceiptUploader, {
  getReceiptAbsoluteUrl,
  uploadReceiptFile,
} from "../components/ui/ImageUploader";
import Pagination from "../components/ui/Pagination";

import { formatStock, playScannerBeep } from "./BusinessInventoryPage";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Landmark,
  Smartphone,
  Printer,
  Download,
  X,
  Package,
  FileText,
  Loader2,
  Camera,
  FileCode,
  FileCheck,
  RefreshCw,
  MinusCircle,
  PlusCircle,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "react-hot-toast";

const loadHtml5Qrcode = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Html5Qrcode) {
      resolve((window as any).Html5Qrcode);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js";
    script.onload = () => resolve((window as any).Html5Qrcode);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};
import Modal from "../components/ui/Modal";
import { format } from "date-fns";

const parseDescription = (desc: string) => {
  if (!desc) return [];
  const prefix = "Venta en POS: ";
  if (desc.startsWith(prefix)) {
    const itemsStr = desc.substring(prefix.length);
    return itemsStr.split(", ").map((item) => {
      // Matches: "1x Arroz Extra [Kg] (S/ 5.00 c/u)" or "2x Delivery (Libre) (S/ 10.00 c/u)" or "1x Arroz Extra [Kg]"
      const regex =
        /^(\d+(?:\.\d+)?)x\s+(.*?)(?:\s+\[(.*?)\]|\s+\(Libre\))?(?:\s+\(S\/\s*(\d+(?:\.\d+)?)\s*c\/u\))?$/;
      const match = item.match(regex);
      if (match) {
        const qty = parseFloat(match[1]);
        const name = match[2];
        const presName = match[3] || (item.includes("(Libre)") ? "Libre" : "");
        const price = match[4] ? parseFloat(match[4]) : 0;
        return {
          quantity: qty,
          name,
          unit: presName || "UNIDAD",
          salePrice: price,
          presentationId: presName ? "dummy" : undefined,
          presentations: presName
            ? [{ id: "dummy", name: presName, price }]
            : [],
        };
      }
      return {
        quantity: 1,
        name: item,
        unit: "UNIDAD",
        salePrice: 0,
        presentations: [],
      };
    });
  }
  return [
    {
      quantity: 1,
      name: desc,
      unit: "UNIDAD",
      salePrice: 0,
      presentations: [],
    },
  ];
};

interface CartItem extends Product {
  quantity: number;
  presentationId?: string;
  isCustom?: boolean;
  originalSalePrice: number;
  advisorId?: string;
  commissionType?: string;
  commissionValue?: number;
  allowManualEdit?: boolean;
}

interface FrontendEngineInput {
  type: string;
  value: number;
  applyTo?: string;
  isAdditional: boolean;
  basePrice: number;
  costPrice: number;
  minCommission?: number;
  maxCommission?: number | null;
}

const calculateFrontendCommission = (input: FrontendEngineInput) => {
  let normalizedType = input.type;
  const value = input.value;

  if (normalizedType === 'PERCENT') {
    if (input.applyTo === 'PROFIT') {
      normalizedType = 'PERCENT_OF_MARGIN';
    } else {
      normalizedType = 'PERCENT_OF_SALE';
    }
  } else if (normalizedType === 'FIXED' || normalizedType === 'SPLIT') {
    normalizedType = 'FIXED_PER_UNIT';
  }

  let commissionUnit = 0;
  switch (normalizedType) {
    case 'FIXED_PER_UNIT': {
      commissionUnit = value;
      break;
    }
    case 'PERCENT_OF_MARGIN': {
      const profit = Math.max(0, input.basePrice - input.costPrice);
      const marginFactor = value > 1 ? value / 100 : value;
      commissionUnit = profit * marginFactor;
      break;
    }
    case 'PERCENT_OF_SALE': {
      const saleFactor = value > 1 ? value / 100 : value;
      commissionUnit = input.basePrice * saleFactor;
      break;
    }
    default: {
      commissionUnit = 0;
    }
  }

  const minComm = input.minCommission ?? 0;
  if (commissionUnit < minComm) {
    commissionUnit = minComm;
  }
  if (input.maxCommission !== undefined && input.maxCommission !== null && commissionUnit > input.maxCommission) {
    commissionUnit = input.maxCommission;
  }

  let chargedPriceUnit = input.basePrice;
  if (input.isAdditional || input.type === 'SPLIT') {
    chargedPriceUnit = input.basePrice + commissionUnit;
  }

  return {
    commissionUnit,
    chargedPriceUnit
  };
};

export default function BusinessPosPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | File | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Hover Product Tooltip
  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Physical Barcode Scanner Configurations
  const [isScannerConfigOpen, setIsScannerConfigOpen] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("barcodeScannerEnabled");
    return saved !== null ? saved === "true" : true;
  });
  const [scannerSensitivity, setScannerSensitivity] = useState<number>(() => {
    const saved = localStorage.getItem("barcodeScannerSensitivity");
    return saved !== null ? Number(saved) : 40;
  });
  const [scanTestResult, setScanTestResult] = useState("");

  // Persist configurations
  useEffect(() => {
    localStorage.setItem("barcodeScannerEnabled", String(scannerEnabled));
  }, [scannerEnabled]);

  useEffect(() => {
    localStorage.setItem("barcodeScannerSensitivity", String(scannerSensitivity));
  }, [scannerSensitivity]);

  // Mobile responsive view tab state
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");
  
  // Sales list pagination state
  const [salesPage, setSalesPage] = useState(1);

  // Price adjustment modal state
  const [adjustingCartIndex, setAdjustingCartIndex] = useState<number | null>(null);
  const [customAdjustedPrice, setCustomAdjustedPrice] = useState<number>(0);

  // Checkout payment states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>("");
  const [commissionPercentage, setCommissionPercentage] = useState<number | "">("");

  // Facturación electrónica
  const [billingType, setBillingType] = useState<"TICKET_VENTA" | "BOLETA" | "FACTURA">("TICKET_VENTA");
  const [clientDocumentType, setClientDocumentType] = useState("1"); // 1=DNI, 6=RUC
  const [clientDocumentNumber, setClientDocumentNumber] = useState("");
  const [clientDenomination, setClientDenomination] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // Reniec/SUNAT lookup state
  const [isQueryingDocument, setIsQueryingDocument] = useState(false);

  // Notes Modal state
  const [selectedSaleForNote, setSelectedSaleForNote] = useState<any>(null);
  const [noteType, setNoteType] = useState<"CREDIT" | "DEBIT" | null>(null);
  const [noteReasonCode, setNoteReasonCode] = useState<number>(1);
  const [noteReasonText, setNoteReasonText] = useState<string>("");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const handleQueryDocument = async () => {
    if (!clientDocumentNumber.trim()) {
      toast.error("Por favor, ingresa el número de documento");
      return;
    }
    const len = clientDocumentNumber.trim().length;
    if (len !== 8 && len !== 11) {
      toast.error("El DNI debe tener 8 dígitos y el RUC 11 dígitos");
      return;
    }
    const type = len === 8 ? "DNI" : "RUC";
    setIsQueryingDocument(true);
    const loadingToast = toast.loading(`Consultando ${type} en SUNAT/Reniec...`);
    try {
      const data = await queryDocumentRequest(type, clientDocumentNumber.trim());
      toast.dismiss(loadingToast);
      if (data.success) {
        setClientDenomination(data.nombre || "");
        if (data.direccion) {
          setClientAddress(data.direccion);
        }
        setClientDocumentType(type === "DNI" ? "1" : "6");
        toast.success("Documento encontrado con éxito");
      } else {
        toast.error("No se encontraron resultados para el documento");
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Error al consultar documento");
    } finally {
      setIsQueryingDocument(false);
    }
  };

  const applyAdvisorToCart = (advId: string, currentCart?: any[]) => {
    const targetCart = currentCart || cart;
    const adv = advId ? advisors.find(a => a.id === advId) : null;
    
    const newCart = targetCart.map((item) => {
      if (item.isCustom) return item;
      const pres = item.presentationId
        ? item.presentations?.find((p: any) => p.id === item.presentationId)
        : null;
      const basePrice = pres ? pres.price : item.originalSalePrice;

      if (!adv) {
        return {
          ...item,
          advisorId: undefined,
          salePrice: basePrice,
          commissionType: undefined,
          commissionValue: undefined,
          allowManualEdit: true,
        };
      }

      let newPrice = basePrice;
      let comType = undefined;
      let comVal = undefined;
      let allowManual = true;
      let isAdditional = false;
      let minComm = 0;
      let maxComm = null;
      let applyTo = "SALE";

      if (adv.commissionModel) {
        comType = adv.commissionModel.type;
        comVal = adv.commissionModel.value;
        allowManual = adv.commissionModel.allowManualEdit;
        isAdditional = adv.commissionModel.isAdditional === true || adv.commissionModel.type === "SPLIT";
        minComm = adv.commissionModel.minCommission || 0;
        maxComm = adv.commissionModel.maxCommission ?? null;
        applyTo = adv.commissionModel.applyTo || "SALE";
      } else {
        comType = adv.commissionType || "PERCENT";
        comVal = adv.commissionValue || 0;
        allowManual = true;
        if (comType === "SPLIT") {
          isAdditional = true;
        }
      }

      const result = calculateFrontendCommission({
        type: comType || "PERCENT",
        value: comVal || 0,
        applyTo,
        isAdditional,
        basePrice,
        costPrice: item.costPrice || 0,
        minCommission: minComm,
        maxCommission: maxComm,
      });
      newPrice = result.chargedPriceUnit;

      return {
        ...item,
        advisorId: adv.id,
        salePrice: newPrice,
        commissionType: comType,
        commissionValue: comVal,
        allowManualEdit: allowManual,
      };
    });

    setCart(newCart);
  };

  // Venta Libre Modal
  const [isCustomSaleOpen, setIsCustomSaleOpen] = useState(false);
  const [customSaleData, setCustomSaleData] = useState({
    name: "",
    price: 0,
    quantity: 1,
  });

  // Ticket
  const [showTicket, setShowTicket] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  // Historial de Ventas POS
  const [isSalesListOpen, setIsSalesListOpen] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Date filters for sales history
  const [salesStartDate, setSalesStartDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return today;
  });
  const [salesEndDate, setSalesEndDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return today;
  });



  const loadSales = async () => {
    setLoadingSales(true);
    try {
      const data = await getSalesRequest({
        workspace: "BUSINESS",
        startDate: salesStartDate ? `${salesStartDate}T00:00:00.000Z` : undefined,
        endDate: salesEndDate ? `${salesEndDate}T23:59:59.999Z` : undefined,
        userId: user?.role === "USER" ? user.id : undefined,
      });
      setSales(
        data.sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );
    } catch {
      toast.error("Error al cargar ventas");
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    if (isSalesListOpen) {
      loadSales();
    }
  }, [isSalesListOpen, salesStartDate, salesEndDate]);

  useEffect(() => {
    setSalesPage(1);
  }, [salesStartDate, salesEndDate, isSalesListOpen]);

  const exportPosSalesExcel = async () => {
    if (sales.length === 0) {
      toast.error("No hay ventas para exportar");
      return;
    }
    const XLSX = await import("xlsx");
    const dataToExport = sales.map(sale => ({
      "Fecha/Hora": format(new Date(sale.date), "yyyy-MM-dd HH:mm"),
      "Vendedor": sale.user ? `${sale.user.name} ${sale.user.lastName || ""}`.trim() : "N/A",
      "Detalle": sale.description || "",
      "Método de Pago": sale.paymentMethod || "CASH",
      "Total (S/)": sale.amountSoles || sale.amount || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
    XLSX.writeFile(workbook, "Ventas_POS.xlsx");
    toast.success("Ventas exportadas a Excel");
  };

  const exportPosSalesPdf = async () => {
    if (sales.length === 0) {
      toast.error("No hay ventas para exportar");
      return;
    }
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF("p", "mm", "a4");
    const businessName = user?.businessName || "Control Finanzas";

    // Header banner
    doc.setFillColor(49, 46, 129);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("REGISTRO DE VENTAS POS", 14, 11);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(businessName, 14, 17);
    doc.text(`Rango: ${salesStartDate || "Inicio"} al ${salesEndDate || "Hoy"}  |  Total: ${sales.length} ventas  |  Exportado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);
    const totalAmount = sales.reduce((sum: number, s: any) => sum + (s.amountSoles || s.amount || 0), 0);
    doc.text(`Monto Total Recaudado: S/ ${totalAmount.toFixed(2)}`, 14, 27);

    const drawHeader = (startY: number) => {
      doc.setFillColor(79, 70, 229);
      doc.rect(14, startY, 182, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("Fecha/Hora", 16, startY + 5.5);
      doc.text("Vendedor", 50, startY + 5.5);
      doc.text("Detalle de Venta", 88, startY + 5.5);
      doc.text("Método", 156, startY + 5.5);
      doc.text("Total (S/)", 174, startY + 5.5);
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
    };

    let y = 40;
    drawHeader(y);
    y += 8;

    sales.forEach((sale: any, idx: number) => {
      const rawDesc = (sale.description || "").replace("Venta en POS: ", "");
      const descLines = doc.splitTextToSize(rawDesc, 64); // 64mm column width
      const rowHeight = Math.max(8, descLines.length * 4.5);

      if (y + rowHeight > 278) {
        doc.addPage();
        y = 15;
        drawHeader(y);
        y += 8;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(14, y, 182, rowHeight, "F");
      }
      doc.setDrawColor(230, 230, 230);
      doc.line(14, y + rowHeight, 196, y + rowHeight);

      const fecha = format(new Date(sale.date), "dd/MM/yy HH:mm");
      const vendedor = sale.user ? `${sale.user.name} ${sale.user.lastName || ""}`.trim() : "N/A";
      const total = sale.amountSoles || sale.amount || 0;

      doc.setTextColor(100, 116, 139);
      doc.text(fecha, 16, y + 5.5);

      const vendedorLines = doc.splitTextToSize(vendedor, 36);
      doc.setTextColor(30, 41, 59);
      doc.text(vendedorLines[0], 50, y + 5.5);

      doc.setTextColor(55, 65, 81);
      doc.text(descLines, 88, y + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(sale.paymentMethod || "CASH", 156, y + 5.5);

      doc.setTextColor(5, 150, 105);
      doc.text(`S/ ${total.toFixed(2)}`, 174, y + 5.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      y += rowHeight;
    });

    // Page numbers and footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("Control Finanzas ERP — Registro de Ventas POS", 14, 291);
      doc.text(`Página ${i} de ${totalPages}`, 185, 291);
    }

    doc.save(`Ventas_POS_${format(new Date(), "yyyyMMdd")}.pdf`);
    toast.success("Ventas exportadas a PDF");
  };

  const handleSubmitNote = async () => {
    if (!selectedSaleForNote) return;
    if (noteReasonCode <= 0) {
      toast.error("Por favor, selecciona un motivo válido");
      return;
    }
    setIsSubmittingNote(true);
    const loadingToast = toast.loading(`Generando Nota de ${noteType === "CREDIT" ? "Crédito" : "Débito"}...`);
    try {
      const payload = {
        reasonCode: noteReasonCode,
        reasonText: noteReasonText.trim() || undefined
      };
      if (noteType === "CREDIT") {
        await issueSaleCreditNoteRequest(selectedSaleForNote.id, payload);
      } else {
        await issueSaleDebitNoteRequest(selectedSaleForNote.id, payload);
      }
      toast.dismiss(loadingToast);
      toast.success(`Nota de ${noteType === "CREDIT" ? "Crédito" : "Débito"} emitida con éxito`);
      setIsNoteModalOpen(false);
      setSelectedSaleForNote(null);
      loadData();
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message || "Error al emitir la nota");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDownloadPastTicket = (sale: any) => {
    setIsSalesListOpen(false); // Close history list modal first
    setLastSale({
      items: parseDescription(sale.description || ""),
      total: sale.amount,
      paymentMethod: sale.paymentMethod,
      date: new Date(sale.date),
      txId: sale.id,
      receiptUrl: sale.receiptUrl,
      billingType: sale.billingType,
      billingStatus: sale.billingStatus,
      billingSerie: sale.billingSerie,
      billingNumber: sale.billingNumber,
      billingPdfUrl: sale.billingPdfUrl,
      clientDocumentType: sale.clientDocumentType,
      clientDocumentNumber: sale.clientDocumentNumber,
      clientDenomination: sale.clientDenomination,
      clientAddress: sale.clientAddress,
    });
    setShowTicket(true);
  };

  const handleDeleteSale = async (sale: any) => {
    const confirm = window.confirm(
      "¿Estás seguro de que deseas eliminar esta venta? Esto restablecerá el stock de los productos y cancelará las comisiones asociadas de forma permanente."
    );
    if (!confirm) return;

    try {
      await deleteSaleRequest(sale.id);
      toast.success("Venta eliminada con éxito y stock restablecido");
      loadSales();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar la venta");
    }
  };

  const handleEditSale = async (sale: any) => {
    const confirm = window.confirm(
      "¿Deseas editar esta venta? Los productos se cargarán en el carrito actual para que puedas modificarlos, y se eliminará la venta anterior restableciendo su stock."
    );
    if (!confirm) return;

    try {
      await deleteSaleRequest(sale.id);
      setCart([]);

      const newCartItems: CartItem[] = [];
      for (const item of sale.items || []) {
        if (item.productId) {
          const prod = products.find((p) => p.id === item.productId);
          if (prod) {
            const matchingPres = prod.presentations?.find((p) => p.price === item.price);
            newCartItems.push({
              ...prod,
              quantity: item.quantity,
              salePrice: item.price,
              originalSalePrice: prod.salePrice,
              presentationId: matchingPres?.id || undefined,
              isCustom: false,
            });
            continue;
          }
        }
        newCartItems.push({
          id: item.productId || `custom-${Date.now()}-${Math.random()}`,
          name: item.name,
          salePrice: item.price,
          originalSalePrice: item.price,
          quantity: item.quantity,
          isCustom: true,
          code: "",
          stock: 99999,
          unit: "UNIDAD",
          presentations: [],
        } as any);
      }

      setCart(newCartItems);
      setPaymentMethod(sale.paymentMethod || "CASH");
      setSelectedAdvisorId(sale.advisorId || "");

      if (sale.billingType === "BOLETA" || sale.billingType === "FACTURA") {
        setBillingType(sale.billingType);
        setClientDocumentType(sale.clientDocumentType || "DNI");
        setClientDocumentNumber(sale.clientDocumentNumber || "");
        setClientDenomination(sale.clientDenomination || "");
        setClientAddress(sale.clientAddress || "");
        setClientEmail(sale.clientEmail || "");
      } else {
        setBillingType("TICKET_VENTA");
      }

      setIsSalesListOpen(false);
      toast.success("Venta cargada en el carrito. Modifica lo que necesites y procesa el pago.");
      loadData();
      loadSales();
    } catch (error: any) {
      toast.error(error.message || "Error al editar la venta");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, cats, shiftRes, advisorsList] = await Promise.all([
        getProductsRequest(),
        listCategoriesRequest(),
        getActiveCashShiftRequest().catch(() => null),
        getAdvisorsRequest({ isActive: true }).catch(() => []),
      ]);
      setProducts(prods);
      setAdvisors(advisorsList);

      const allIncomeCats = cats.filter(
        (c: any) => c.type === "INCOME" && !c.parentId,
      );
      setCategories(allIncomeCats);

      if (allIncomeCats.length > 0) {
        const priority = allIncomeCats.find(
          (c: any) =>
            c.name.toLowerCase().includes("negocio") &&
            c.name.toLowerCase().includes("ingreso")
        ) || allIncomeCats.find(
          (c: any) =>
            c.name.toLowerCase().includes("negocio") ||
            c.name.toLowerCase().includes("venta")
        ) || allIncomeCats[0];
        
        setSelectedCategory(priority.id);
        const subCaja = priority.children?.find((s: any) =>
          s.name.toLowerCase().includes("caja")
        );
        setSelectedSubCategory(subCaja ? subCaja.id : (priority.children?.[0]?.id || ""));
      }

      setActiveShift(shiftRes);
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addToCart = (product: Product) => {
    const availableStock = activeShift?.branchId
      ? (product.branchStocks?.find((bs: any) => bs.branchId === activeShift.branchId)?.stock || 0)
      : product.stock;

    if (availableStock <= 0) {
      toast.error("Sin stock disponible en esta sede");
      return;
    }

    // Check if already in cart (same product, same presentation = no presentation)
    const existingIndex = cart.findIndex(
      (item) =>
        item.id === product.id && !item.isCustom && !item.presentationId,
    );
    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      const newQty = existing.quantity + 1;
      if (newQty > availableStock) {
        toast.error("Stock máximo alcanzado en esta sede");
        return;
      }
      const updatedCart = cart.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: newQty } : item,
      );
      if (selectedAdvisorId) {
        applyAdvisorToCart(selectedAdvisorId, updatedCart);
      } else {
        setCart(updatedCart);
      }
    } else {
      const newItem = { ...product, quantity: 1, originalSalePrice: product.salePrice };
      const updatedCart = [...cart, newItem];
      if (selectedAdvisorId) {
        applyAdvisorToCart(selectedAdvisorId, updatedCart);
      } else {
        setCart(updatedCart);
      }
    }
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.value = 850;
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08);
    } catch (err) {
      console.warn("Audio beep error", err);
    }
  };

  const handleBarcodeScanned = (code: string) => {
    const cleanCode = code.trim().toLowerCase();
    setScanTestResult(code);
    const match = products.find((p) => {
      const matchesSku = p.sku && p.sku.toLowerCase() === cleanCode;
      const matchesCodeRaw = (p as any).customCode && String((p as any).customCode) === cleanCode;
      const matchesCodePadded = (p as any).customCode && String((p as any).customCode).padStart(4, "0") === cleanCode;
      return matchesSku || matchesCodeRaw || matchesCodePadded;
    });

    if (match) {
      addToCart(match);
      setSearchTerm(match.name); // Auto-filter POS list for this product
      playBeep();
      toast.success(`Agregado: ${match.name}`);
    } else {
      toast.error(`Producto no encontrado: "${cleanCode}"`);
    }
  };

  // Keyboard/USB Scanner listener
  useEffect(() => {
    if (!scannerEnabled) return;

    let buffer = "";
    let lastKeyTime = Date.now();
    let isFastTyping = false;
    let firstCharLogged = "";

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Ignore standard helper keys
      if (e.key.length > 1 && e.key !== "Enter") {
        return;
      }

      const isFast = timeDiff <= scannerSensitivity;
      if (isFast) {
        isFastTyping = true;
      } else {
        isFastTyping = false;
      }

      if (isFastTyping) {
        e.preventDefault();

        // Anti-pollution cleanup for the first character that might have been typed slowly
        if (buffer.length === 1 && firstCharLogged) {
          const activeEl = document.activeElement;
          if (
            activeEl instanceof HTMLInputElement ||
            activeEl instanceof HTMLTextAreaElement
          ) {
            const val = activeEl.value;
            if (val.endsWith(firstCharLogged)) {
              activeEl.value = val.slice(0, -1);
              const ev = new Event("input", { bubbles: true });
              activeEl.dispatchEvent(ev);
            }
          }
          firstCharLogged = "";
        }

        if (e.key === "Enter") {
          if (buffer.length >= 3) {
            playScannerBeep(850, 0.08);
            handleBarcodeScanned(buffer);
          }
          buffer = "";
          isFastTyping = false;
        } else {
          buffer += e.key;
        }
      } else {
        // Slow key press
        if (e.key === "Enter") {
          if (buffer.length >= 3) {
            e.preventDefault();
            playScannerBeep(850, 0.08);
            handleBarcodeScanned(buffer);
            buffer = "";
          }
        } else {
          buffer = e.key;
          firstCharLogged = e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [products, cart, activeShift, scannerEnabled, scannerSensitivity]);

  // Webcam Scanner Effect
  useEffect(() => {
    let html5QrcodeScanner: any = null;
    if (isScannerOpen) {
      loadHtml5Qrcode().then((Html5Qrcode) => {
        html5QrcodeScanner = new Html5Qrcode("scanner-reader");
        html5QrcodeScanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 130 } },
          (decodedText: string) => {
            handleBarcodeScanned(decodedText);
            html5QrcodeScanner.stop().then(() => {
              setIsScannerOpen(false);
            });
          },
          () => {
            // Keep scan silent
          }
        ).catch(() => {
          toast.error("No se pudo iniciar la cámara");
          setIsScannerOpen(false);
        });
      });
    }
    return () => {
      if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        html5QrcodeScanner.stop().catch((e: any) => console.error(e));
      }
    };
  }, [isScannerOpen, products]);

  const addCustomSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !customSaleData.name ||
      customSaleData.price <= 0 ||
      customSaleData.quantity <= 0
    ) {
      toast.error("Datos inválidos para venta libre");
      return;
    }

    const customItem: CartItem = {
      id: `custom-${Date.now()}`,
      name: customSaleData.name,
      description: "Venta Libre",
      sku: "MANUAL",
      costPrice: 0,
      salePrice: customSaleData.price,
      originalSalePrice: customSaleData.price,
      stock: 9999,
      minStock: 0,
      unit: "UNIDAD",
      quantity: customSaleData.quantity,
      isCustom: true,
    };

    setCart([...cart, customItem]);
    setIsCustomSaleOpen(false);
    setCustomSaleData({ name: "", price: 0, quantity: 1 });
    toast.success("Añadido al carrito");
  };

  const updateQuantity = (cartIndex: number, delta: number) => {
    const item = cart[cartIndex];
    const newQ = item.quantity + delta;
    if (newQ < 1) return;

    if (!item.isCustom) {
      const pres = item.presentations?.find(
        (p: any) => p.id === item.presentationId,
      );
      const equivalence = pres ? pres.equivalence : 1;
      const availableStock = activeShift?.branchId
        ? (item.branchStocks?.find((bs: any) => bs.branchId === activeShift.branchId)?.stock || 0)
        : item.stock;

      if (newQ * equivalence > availableStock) {
        toast.error("Supera el stock disponible en esta sede");
        return;
      }
    }

    setCart(
      cart.map((c, idx) => (idx === cartIndex ? { ...c, quantity: newQ } : c)),
    );
  };

  const removeFromCart = (cartIndex: number) => {
    setCart(cart.filter((_, idx) => idx !== cartIndex));
  };

  const total = cart.reduce(
    (acc, item) => acc + item.salePrice * item.quantity,
    0,
  );

  const handleOpenCheckoutModal = () => {
    if (!activeShift) {
      toast.error("Debes ABRIR CAJA antes de poder registrar ventas.");
      return;
    }
    if (cart.length === 0) return;
    if (!selectedCategory) {
      toast.error("Selecciona una Categoría de Ingreso");
      return;
    }
    setAmountPaid(total.toString());
    setIsCheckoutOpen(true);
  };

  const handleCheckout = async () => {
    // 1. Validaciones iniciales de negocio
    if (!activeShift) {
      toast.error("Debes ABRIR CAJA antes de poder registrar ventas.");
      return;
    }
    if (cart.length === 0) return;
    if (!selectedCategory) {
      toast.error("Selecciona una Categoría de Ingreso");
      return;
    }

    // Validar abono si es efectivo
    const parsedPaid = paymentMethod === "CASH" ? Number(amountPaid) : total;
    if (paymentMethod === "CASH" && parsedPaid < total) {
      toast.error("El monto recibido no es suficiente para cubrir el total.");
      return;
    }

    setIsProcessing(true);

    try {
      // 2. Normalización de la URL del comprobante
      // finalReceiptUrl siempre será un string (URL) o undefined (si no hay nada)
      let finalReceiptUrl: string | undefined = undefined;

      if (receiptUrl instanceof File) {
        // Caso A: El usuario seleccionó un archivo nuevo -> Subimos a DigitalOcean Spaces
        const uploadToast = toast.loading("Subiendo comprobante...");
        try {
          finalReceiptUrl = await uploadReceiptFile(receiptUrl);
          toast.dismiss(uploadToast);
        } catch (err: any) {
          toast.dismiss(uploadToast);
          toast.error(err.message || "Error al subir el comprobante");
          setIsProcessing(false);
          return; // Detenemos el proceso si la subida falla
        }
      } else if (typeof receiptUrl === "string" && receiptUrl.length > 0) {
        // Caso B: Ya teníamos una URL (string) válida
        finalReceiptUrl = receiptUrl;
      }

      // 3. Ejecución de la petición a la API
      const txResult = await checkoutCartRequest({
        items: cart.map((c) => ({
          id: c.id,
          quantity: c.quantity,
          presentationId: c.presentationId || undefined,
          isCustom: c.isCustom,
          salePrice: c.salePrice,
          name: c.name,
        })),
        paymentMethod,
        categoryId: selectedCategory,
        subCategoryId: selectedSubCategory || undefined,
        receiptUrl: finalReceiptUrl,
        cashShiftId: activeShift.id,
        advisorId: selectedAdvisorId || undefined,
        commissionType: selectedAdvisorId ? advisors.find(a => a.id === selectedAdvisorId)?.commissionType || undefined : undefined,
        commissionAmount: selectedAdvisorId ? parseFloat(((total * (commissionPercentage !== "" ? Number(commissionPercentage) : 0)) / 100).toFixed(2)) : undefined,
        billingType,
        clientDocumentType: (billingType === 'BOLETA' || billingType === 'FACTURA') ? clientDocumentType : undefined,
        clientDocumentNumber: (billingType === 'BOLETA' || billingType === 'FACTURA') ? clientDocumentNumber : undefined,
        clientDenomination: (billingType === 'BOLETA' || billingType === 'FACTURA') ? clientDenomination : undefined,
        clientAddress: (billingType === 'BOLETA' || billingType === 'FACTURA') ? clientAddress : undefined,
        clientEmail: (billingType === 'BOLETA' || billingType === 'FACTURA') ? clientEmail : undefined,
      });

      // Mostrar resultado de facturación si aplica
      if (txResult?.billing) {
        if (txResult.billing.success) {
          toast.success(
            `✅ Comprobante ${txResult.billing.serie}-${txResult.billing.number} emitido con éxito`,
            { duration: 5000 }
          );
        } else {
          toast(
            `⚠️ Venta guardada, pero el comprobante electrónico falló: ${txResult.billing.error}. Puedes reintentarlo desde el historial.`,
            { duration: 8000, icon: '⚠️' }
          );
        }
      } else {
        toast.success("¡Venta completada con éxito!");
      }

      // 4. Actualización del estado para el ticket
      const changeDue = parsedPaid - total;
      setLastSale({
        items: [...cart],
        total,
        paymentMethod,
        date: new Date(),
        txId: txResult?.transactionId || `TX-${Date.now()}`,
        receiptUrl: finalReceiptUrl,
        amountPaid: parsedPaid,
        changeDue: changeDue > 0 ? changeDue : 0,
        billingType,
        billingStatus: txResult?.billing?.success ? 'SUCCESS' : (billingType === 'TICKET_VENTA' ? null : 'ERROR'),
        billingSerie: txResult?.billing?.serie,
        billingNumber: txResult?.billing?.number,
        billingPdfUrl: txResult?.billing?.pdfUrl,
        clientDocumentType: (billingType === 'BOLETA' || billingType === 'FACTURA') ? clientDocumentType : undefined,
        clientDocumentNumber: (billingType === 'BOLETA' || billingType === 'FACTURA') ? clientDocumentNumber : undefined,
        clientDenomination: (billingType === 'BOLETA' || billingType === 'FACTURA') ? clientDenomination : undefined,
        clientAddress: (billingType === 'BOLETA' || billingType === 'FACTURA') ? clientAddress : undefined,
      });

      // 5. Limpieza de estados
      setCart([]);
      setReceiptUrl(null);
      setSelectedAdvisorId("");
      setAmountPaid("");
      setBillingType("TICKET_VENTA");
      setClientDocumentType("1");
      setClientDocumentNumber("");
      setClientDenomination("");
      setClientAddress("");
      setClientEmail("");
      setIsCheckoutOpen(false);
      setShowTicket(true);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al procesar la venta");
    } finally {
      setIsProcessing(false);
    }
  };

  const printTicket = () => {
    window.print();
  };

  const downloadTicketImage = async () => {
    const element = ticketRef.current;
    if (!element || !lastSale) return;

    try {
      const { toPng } = await import("html-to-image");
      // Ensure element is fully visible with no clipping
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        style: {
          overflow: "visible",
          maxHeight: "none",
          height: "auto",
        },
      });
      const link = document.createElement("a");
      link.download = `Ticket_${lastSale.txId?.slice(0, 8) || Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagen descargada");
    } catch (err) {
      console.error(err);
      toast.error("Error al descargar imagen");
    }
  };

  const downloadTicketPdf = async () => {
    const element = ticketRef.current;
    if (!element || !lastSale) return;

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        style: {
          overflow: "visible",
          maxHeight: "none",
          height: "auto",
        },
      });

      const { jsPDF } = await import("jspdf");
      const img = new Image();
      img.src = dataUrl;
      await new Promise((r) => (img.onload = r));

      const pdfW = 80; // 80mm thermal printer width
      const pdfH = (img.naturalHeight / img.naturalWidth) * pdfW;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfW, pdfH],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`Ticket_${lastSale.txId?.slice(0, 8) || Date.now()}.pdf`);
      toast.success("PDF descargado");
    } catch (err) {
      console.error(err);
      downloadTicketImage();
    }
  };

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const matchesName = p.name.toLowerCase().includes(term);
    const matchesSku = p.sku && p.sku.toLowerCase().includes(term);
    const matchesCodeRaw = (p as any).customCode && String((p as any).customCode) === term;
    const matchesCodePadded = (p as any).customCode && String((p as any).customCode).padStart(4, "0") === term;
    return matchesName || matchesSku || matchesCodeRaw || matchesCodePadded;
  });

  const paymentLabel: Record<string, string> = {
    CASH: "Efectivo",
    YAPE: "Yape",
    PLIN: "Plin",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
  };

  return (
    <Appshell>
      {/* Print styles — applied globally during window.print() */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-ticket-container {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 80mm !important;
            background: white !important;
            z-index: 99999 !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          #printable-ticket {
            width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          #printable-ticket img {
            display: block !important;
            max-width: 100% !important;
            height: auto !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* HIDDEN TICKET for printing/export — lives outside the modal */}
      {lastSale && (
        <div
          id="printable-ticket-wrapper"
          className="print-ticket-container"
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            opacity: 0,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          <div
            id="printable-ticket"
            ref={ticketRef}
            style={{
              backgroundColor: "#ffffff",
              padding: "16px",
              width: "300px",
              fontFamily: "'Courier New', monospace",
              fontSize: "12px",
              color: "#111111",
              overflow: "visible",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              {user?.businessLogo && (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
                  <img
                    src={getReceiptAbsoluteUrl(user.businessLogo) || ""}
                    crossOrigin="anonymous"
                    alt="Logo"
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                      borderRadius: "50%",
                      border: "1px solid #eee",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <div
                style={{
                  fontWeight: 900,
                  fontSize: "16px",
                  letterSpacing: "1px",
                }}
              >
                {user?.businessName ? user.businessName.toUpperCase() : "THINK"}
              </div>
              {user?.businessReason && (
                <div style={{ fontSize: "10px", color: "#333", marginTop: "2px" }}>
                  Razón Social: {user.businessReason}
                </div>
              )}
              {user?.businessRuc && (
                <div style={{ fontSize: "10px", color: "#333", marginTop: "2px" }}>
                  RUC: {user.businessRuc}
                </div>
              )}
              {user?.businessRubro && (
                <div style={{ fontSize: "10px", color: "#555", marginTop: "2px", fontStyle: "italic" }}>
                  Giro: {user.businessRubro}
                </div>
              )}
              <div style={{ fontSize: "10px", color: "#333", marginTop: "4px", fontWeight: "bold" }}>
                {lastSale.billingType === "BOLETA"
                  ? "BOLETA DE VENTA ELECTRÓNICA"
                  : lastSale.billingType === "FACTURA"
                  ? "FACTURA ELECTRÓNICA"
                  : lastSale.billingType === "NOTA_CREDITO"
                  ? "NOTA DE CRÉDITO ELECTRÓNICA"
                  : lastSale.billingType === "NOTA_DEBITO"
                  ? "NOTA DE DÉBITO ELECTRÓNICA"
                  : "TICKET DE VENTA"}
              </div>
              <div
                style={{ borderBottom: "1px dashed #ccc", margin: "8px 0" }}
              ></div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                }}
              >
                <span>Fecha:</span>
                <span>{format(lastSale.date, "dd/MM/yyyy HH:mm")}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                }}
              >
                <span>{lastSale.billingType && lastSale.billingType !== "TICKET_VENTA" ? "Comprobante:" : "Ticket #:"}</span>
                <span>
                  {lastSale.billingSerie && lastSale.billingNumber
                    ? `${lastSale.billingSerie}-${lastSale.billingNumber}`
                    : lastSale.txId?.slice(0, 8).toUpperCase()}
                </span>
              </div>
              {lastSale.clientDocumentNumber && (
                <div style={{ fontSize: "9px", color: "#555", marginTop: "4px", textAlign: "left", lineHeight: "1.2" }}>
                  <div style={{ borderBottom: "1px dashed #ccc", margin: "4px 0" }}></div>
                  <div><strong>Cliente:</strong> {lastSale.clientDenomination}</div>
                  <div><strong>{lastSale.clientDocumentType === "6" ? "RUC" : "DNI"}:</strong> {lastSale.clientDocumentNumber}</div>
                  {lastSale.clientAddress && <div><strong>Dirección:</strong> {lastSale.clientAddress}</div>}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                }}
              >
                <span>Pago:</span>
                <span>
                  {paymentLabel[lastSale.paymentMethod] ||
                    lastSale.paymentMethod}
                </span>
              </div>
            </div>

            <div
              style={{ borderBottom: "1px dashed #ccc", margin: "8px 0" }}
            ></div>

            <div style={{ marginBottom: "8px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: "10px",
                  marginBottom: "4px",
                }}
              >
                <span>CANT. DESCRIPCION</span>
                <span>IMPORTE</span>
              </div>
              {lastSale.items.map((item: any, i: number) => {
                const pres = item.presentations?.find(
                  (p: any) => p.id === item.presentationId,
                );
                const presName = pres ? pres.name : item.unit;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "10px",
                      marginBottom: "2px",
                    }}
                  >
                    <span style={{ flex: 1, paddingRight: "8px" }}>
                      {item.quantity}x {item.name} [{presName}]
                      {item.advisorId && item.salePrice > (item.originalSalePrice || 0) && (
                        <div style={{ fontSize: "8px", color: "#666", fontWeight: "bold" }}>
                          (S/ {(item.originalSalePrice || 0).toFixed(2)} + S/ {(item.salePrice - (item.originalSalePrice || 0)).toFixed(2)} Com. de {advisors.find(a => a.id === item.advisorId)?.name})
                        </div>
                      )}
                    </span>
                    <span>
                      {item.salePrice > 0
                        ? `S/ ${(item.quantity * item.salePrice).toFixed(2)}`
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              style={{ borderBottom: "1px dashed #ccc", margin: "8px 0" }}
            ></div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 900,
                fontSize: "16px",
                marginBottom: "4px"
              }}
            >
              <span>TOTAL</span>
              <span>S/ {lastSale.total.toFixed(2)}</span>
            </div>

            {lastSale.paymentMethod === "CASH" && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "10px",
                    color: "#555"
                  }}
                >
                  <span>EFECTIVO RECIBIDO</span>
                  <span>S/ {(lastSale.amountPaid || lastSale.total).toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#111",
                    marginTop: "2px"
                  }}
                >
                  <span>VUELTO</span>
                  <span>S/ {(lastSale.changeDue || 0).toFixed(2)}</span>
                </div>
              </>
            )}

            <div
              style={{
                textAlign: "center",
                marginTop: "16px",
                fontSize: "10px",
                color: "#666",
              }}
            >
              <div>¡Gracias por tu preferencia!</div>
              {(!lastSale?.billingType || lastSale.billingType === "TICKET_VENTA" || lastSale.billingType === "TICKET") && (
                <div style={{ fontSize: "5px", color: "#999", marginTop: "4px" }}>
                  Solicita tu Boleta o Factura
                </div>
              )}
              <div
                style={{
                  fontSize: "8px",
                  fontWeight: 700,
                  marginTop: "10px",
                  color: "#333",
                }}
              >
                Global Ccoplex
              </div>
              <div style={{ fontSize: "7px", color: "#999" }}>
                &copy; Todos los derechos reservados
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile view selector */}
      <div className="lg:hidden flex bg-white/85 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200 shadow-sm mb-3">
        <button
          onClick={() => setMobileTab("catalog")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${mobileTab === "catalog" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-indigo-600"}`}
        >
          <Package className="w-4 h-4" /> Catálogo
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${mobileTab === "cart" ? "bg-indigo-600 text-white shadow-md" : "text-gray-500 hover:text-indigo-600"}`}
        >
          <ShoppingCart className="w-4 h-4" /> Carrito
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black animate-pulse">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-13rem)] lg:h-[calc(100vh-11.5rem)] gap-4">
        {/* LEFT: CATALOG */}
        <div className={`flex-1 flex flex-col min-h-0 bg-gray-50/50 relative ${mobileTab === "catalog" ? "flex" : "hidden lg:flex"}`}>
          {!activeShift && !loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-rose-100 text-center max-w-sm mx-4">
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Landmark className="w-10 h-10 text-rose-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">
                  Caja Cerrada
                </h3>
                <p className="text-gray-500 font-medium mb-6">
                  Para vender, abre la caja primero desde el módulo de Finanzas.
                </p>
                <a
                  href="/business-cash-register"
                  className="inline-block w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                >
                  Ir a Abrir Caja →
                </a>
              </div>
            </div>
          )}

          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full flex gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-gray-700 shadow-sm"
                />
              </div>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
                title="Escanear Código con Cámara"
              >
                <Camera className="w-5 h-5 text-indigo-500" />
              </button>
            </div>
            <button
              onClick={() => setIsCustomSaleOpen(true)}
              className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all text-sm whitespace-nowrap shadow-md"
            >
              <Plus className="w-4 h-4" /> Venta Libre
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center text-gray-500 py-10 font-medium">
                No hay productos que coincidan.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((p) => {
                  const availableStock = activeShift?.branchId
                    ? (p.branchStocks?.find((bs: any) => bs.branchId === activeShift.branchId)?.stock || 0)
                    : p.stock;
                  return (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      onMouseEnter={(e) => {
                        setHoveredProduct(p);
                        const x = Math.min(e.clientX + 15, window.innerWidth - 300);
                        const y = Math.min(e.clientY + 15, window.innerHeight - 250);
                        setTooltipCoords({ x, y });
                      }}
                      onMouseMove={(e) => {
                        const x = Math.min(e.clientX + 15, window.innerWidth - 300);
                        const y = Math.min(e.clientY + 15, window.innerHeight - 250);
                        setTooltipCoords({ x, y });
                      }}
                      onMouseLeave={() => {
                        setHoveredProduct(null);
                      }}
                      className={`bg-white rounded-2xl border hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group flex flex-col overflow-hidden shadow-sm relative ${availableStock <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {/* Product image */}
                      <div className="w-full h-24 bg-gradient-to-br from-gray-50 to-indigo-50 overflow-hidden relative">
                        {p.color && (
                          <div
                            className="absolute top-2 right-2 w-4 h-4 rounded-full border border-white shadow-sm z-10 animate-pulse"
                            style={{ backgroundColor: p.color }}
                            title={`Color del producto`}
                          />
                        )}
                        {p.imageUrl ? (
                          <img
                            src={getReceiptAbsoluteUrl(p.imageUrl) || p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-indigo-200" />
                          </div>
                        )}
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2 text-sm">
                            {p.name}
                          </h3>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full inline-block mt-1 ${availableStock > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                          >
                            {activeShift?.branchId ? "Sede: " : ""}
                            {formatStock(availableStock, p.unit, p.presentations)}
                          </span>
                        </div>
                        <p className="text-base font-black text-gray-900 mt-2">
                          S/ {p.salePrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CART */}
        <div className={`w-full lg:w-[400px] flex flex-col bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden ${mobileTab === "cart" ? "flex" : "hidden lg:flex"}`}>
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Ticket Actual
            </h2>
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-bold">
              {cart.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-400">
                <ShoppingCart className="w-12 h-12 mb-3 text-gray-300" />
                <p className="font-bold">No hay productos en el ticket</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 relative group"
                >
                  {item.imageUrl && (
                    <img
                      src={
                        getReceiptAbsoluteUrl(item.imageUrl) || item.imageUrl
                      }
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).style.display = "none")
                      }
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-gray-800 leading-tight pr-6 truncate">
                      {item.name}
                    </h4>

                    {!item.isCustom &&
                      item.presentations &&
                      item.presentations.length > 0 ? (
                      <select
                        value={item.presentationId || ""}
                        onChange={(e) => {
                          const presId = e.target.value;
                          const pres = item.presentations?.find(
                            (p: any) => p.id === presId,
                          );
                          const equivalence = pres ? pres.equivalence : 1;
                          const availableStock = activeShift?.branchId
                            ? (item.branchStocks?.find((bs: any) => bs.branchId === activeShift.branchId)?.stock || 0)
                            : item.stock;

                          if (item.quantity * equivalence > availableStock) {
                            const maxQty = Math.floor(availableStock / equivalence);
                            if (maxQty < 1) {
                              toast.error("No hay stock suficiente en esta sede para esta presentación.");
                              return;
                            }
                            toast.error(`La cantidad supera el stock de la sede. Ajustando cantidad a ${maxQty}.`);
                            const newPrice = pres ? pres.price : item.originalSalePrice;
                            setCart(
                              cart.map((c, i) =>
                                i === index
                                  ? {
                                    ...c,
                                    presentationId: presId || undefined,
                                    salePrice: newPrice,
                                    quantity: maxQty
                                  }
                                  : c,
                              ),
                            );
                            return;
                          }

                          const newPrice = pres
                            ? pres.price
                            : item.originalSalePrice;
                          setCart(
                            cart.map((c, i) =>
                              i === index
                                ? {
                                  ...c,
                                  presentationId: presId || undefined,
                                  salePrice: newPrice,
                                }
                                : c,
                            ),
                          );
                        }}
                        className="mt-1 text-[10px] border border-gray-200 rounded-lg px-2 py-1 outline-none font-bold text-gray-700 bg-white w-full"
                      >
                        <option value="">
                          {item.unit} (S/ {item.originalSalePrice.toFixed(2)})
                        </option>
                        {item.presentations.map((pres: any) => (
                          <option key={pres.id} value={pres.id}>
                            {pres.name} (S/ {pres.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[10px] text-gray-500 font-bold block mt-1">
                        {item.unit}
                      </span>
                    )}

                    <p className="text-indigo-600 font-black text-sm mt-1">
                      S/ {item.salePrice.toFixed(2)} c/u
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {!item.isCustom && (
                        <button
                          onClick={() => {
                            setAdjustingCartIndex(index);
                            setCustomAdjustedPrice(item.salePrice);
                          }}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold transition-all"
                          title="Ajustar precio de este ítem"
                        >
                          💸 Ajustar
                        </button>
                      )}
                      <button
                        onClick={() => removeFromCart(index)}
                        className="text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1 mt-2">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black w-6 text-center text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-5 border-t border-gray-100 bg-gray-50 space-y-4">
            {/* Payment Method */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                1. Método de Pago
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: "CASH", icon: Banknote, label: "Efectivo" },
                  { id: "YAPE", icon: Smartphone, label: "Yape" },
                  { id: "PLIN", icon: Smartphone, label: "Plin" },
                  { id: "CARD", icon: CreditCard, label: "Tarjeta" },
                  { id: "TRANSFER", icon: Landmark, label: "Transf." },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${paymentMethod === method.id ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"}`}
                  >
                    <method.icon className="w-4 h-4" />
                    <span className="text-[8px] font-black uppercase">
                      {method.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                2. Categoría Contable
              </p>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const catId = e.target.value;
                  setSelectedCategory(catId);
                  const catObj = categories.find(c => c.id === catId);
                  const firstSub = catObj?.children?.[0]?.id || "";
                  setSelectedSubCategory(firstSub);
                }}
                className="w-full p-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm font-medium bg-white"
              >
                <option value="">Seleccionar Categoría...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            {(() => {
              const selectedCategoryObj = categories.find(c => c.id === selectedCategory);
              const subcategories = selectedCategoryObj?.children || [];
              if (subcategories.length === 0) return null;
              return (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                    Subcategoría Contable
                  </p>
                  <select
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm font-medium bg-white"
                  >
                    <option value="">Seleccionar Subcategoría...</option>
                    {subcategories.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

            {/* Total */}
            <div className="flex justify-between items-end pt-3 border-t border-gray-200 border-dashed">
              <span className="text-gray-500 font-medium">Total a cobrar:</span>
              <span className="text-3xl font-black text-gray-900">
                S/ {total.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleOpenCheckoutModal}
              disabled={cart.length === 0 || !activeShift}
              className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all ${cart.length === 0 || !activeShift
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 hover:-translate-y-1"
                }`}
            >
              Cobrar Venta
            </button>

            <button
              onClick={() => setIsSalesListOpen(true)}
              className="w-full mt-3 py-3 border border-indigo-200 text-indigo-600 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all shadow-sm"
            >
              <FileText className="w-4 h-4" /> Ver Ventas Recientes (Editar/Anular/Notas F.E.)
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: FREE SALE */}
      <Modal
        isOpen={isCustomSaleOpen}
        onClose={() => setIsCustomSaleOpen(false)}
        title="Venta Libre / Manual"
      >
        <form onSubmit={addCustomSale} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Concepto / Producto
            </label>
            <input
              type="text"
              autoFocus
              required
              value={customSaleData.name}
              onChange={(e) =>
                setCustomSaleData({ ...customSaleData, name: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Ej: Servicio de Delivery..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Precio Unitario (S/)
              </label>
              <input
                type="number"
                required
                min="0.1"
                step="0.01"
                value={customSaleData.price || ""}
                onChange={(e) =>
                  setCustomSaleData({
                    ...customSaleData,
                    price: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                required
                min="1"
                value={customSaleData.quantity}
                onChange={(e) =>
                  setCustomSaleData({
                    ...customSaleData,
                    quantity: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCustomSaleOpen(false)}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700"
            >
              Añadir al Carrito
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: TICKET */}
      <Modal
        isOpen={showTicket}
        onClose={() => setShowTicket(false)}
        title="✅ Venta Completada"
      >
        {lastSale && (
          <div className="flex flex-col items-center">
            {/* Preview ticket (decorative, not used for export) */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl w-full max-w-xs mx-auto shadow-sm font-mono text-xs text-gray-800 mb-4">
              <div className="text-center mb-4">
                {user?.businessLogo && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={getReceiptAbsoluteUrl(user.businessLogo) || ""}
                      crossOrigin="anonymous"
                      alt="Logo"
                      className="w-12 h-12 rounded-full object-cover border border-gray-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="font-black text-base">
                  {user?.businessName ? user.businessName.toUpperCase() : "THINK"}
                </div>
                {user?.businessReason && (
                  <div className="text-[10px] text-gray-700 mt-0.5">
                    {user.businessReason}
                  </div>
                )}
                {user?.businessRuc && (
                  <div className="text-[10px] text-gray-700 mt-0.5">
                    RUC: {user.businessRuc}
                  </div>
                )}
                {user?.businessRubro && (
                  <div className="text-[10px] text-gray-500 mt-0.5 italic">
                    Giro: {user.businessRubro}
                  </div>
                )}
                <div className="text-[10px] text-gray-800 mt-1 font-bold">
                  {lastSale.billingType === "BOLETA"
                    ? "BOLETA DE VENTA ELECTRÓNICA"
                    : lastSale.billingType === "FACTURA"
                    ? "FACTURA ELECTRÓNICA"
                    : lastSale.billingType === "NOTA_CREDITO"
                    ? "NOTA DE CRÉDITO ELECTRÓNICA"
                    : lastSale.billingType === "NOTA_DEBITO"
                    ? "NOTA DE DÉBITO ELECTRÓNICA"
                    : "TICKET DE VENTA"}
                </div>
                <div className="border-b border-dashed border-gray-300 my-3"></div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span>Fecha:</span>
                  <span>{format(lastSale.date, "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span>{lastSale.billingType && lastSale.billingType !== "TICKET_VENTA" ? "Comprobante:" : "Ticket #:"}</span>
                  <span>
                    {lastSale.billingSerie && lastSale.billingNumber
                      ? `${lastSale.billingSerie}-${lastSale.billingNumber}`
                      : lastSale.txId.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                {lastSale.clientDocumentNumber && (
                  <div className="text-[9px] text-gray-600 mt-2 text-left leading-normal border-t border-dashed border-gray-300 pt-2">
                    <div><strong>Cliente:</strong> {lastSale.clientDenomination}</div>
                    <div><strong>{lastSale.clientDocumentType === "6" ? "RUC" : "DNI"}:</strong> {lastSale.clientDocumentNumber}</div>
                    {lastSale.clientAddress && <div><strong>Dirección:</strong> {lastSale.clientAddress}</div>}
                  </div>
                )}
                <div className="flex justify-between text-[10px]">
                  <span>Pago:</span>
                  <span>
                    {paymentLabel[lastSale.paymentMethod] ||
                      lastSale.paymentMethod}
                  </span>
                </div>
              </div>

              <div className="border-b border-dashed border-gray-300 my-3"></div>

              <div className="space-y-1 mb-3">
                {lastSale.items.map((item: any, i: number) => {
                  const pres = item.presentations?.find(
                    (p: any) => p.id === item.presentationId,
                  );
                  const presName = pres ? pres.name : item.unit;
                  return (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span className="flex-1 pr-2 truncate">
                        {item.quantity}x {item.name} [{presName}]
                      </span>
                      <span>
                        S/ {(item.quantity * item.salePrice).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-b border-dashed border-gray-300 my-3"></div>

              <div className="flex justify-between font-black text-sm mb-2">
                <span>TOTAL</span>
                <span>S/ {lastSale.total.toFixed(2)}</span>
              </div>

              {lastSale.paymentMethod === "CASH" && (
                <div className="space-y-1 text-[10px] text-gray-600 border-t border-dashed border-gray-200 pt-2 mb-2">
                  <div className="flex justify-between">
                    <span>Efectivo Recibido:</span>
                    <span className="font-bold">S/ {(lastSale.amountPaid || lastSale.total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 font-bold">
                    <span>Vuelto:</span>
                    <span className="font-black text-xs text-emerald-600">S/ {(lastSale.changeDue || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="text-center text-gray-500 pt-2 border-t border-dashed border-gray-200">
                <div className="text-[10px]">¡Gracias por tu preferencia!</div>
                {(!lastSale?.billingType || lastSale.billingType === "TICKET_VENTA" || lastSale.billingType === "TICKET") && (
                  <div className="text-[5px] text-gray-400 mt-0.5">
                    Solicita tu Boleta o Factura
                  </div>
                )}
                <div className="text-[8px] font-bold text-gray-700 mt-2">
                  Global Ccoplex
                </div>
                <div className="text-[7px] text-gray-400">
                  &copy; Todos los derechos reservados
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                onClick={() => setShowTicket(false)}
                className="py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 text-sm"
              >
                Cerrar
              </button>
              <button
                onClick={downloadTicketImage}
                className="py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 flex items-center justify-center gap-1.5 text-sm"
              >
                <Download className="w-4 h-4" /> Imagen
              </button>
              <button
                onClick={downloadTicketPdf}
                className="py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 text-sm"
              >
                <FileText className="w-4 h-4" /> PDF
              </button>
              <button
                onClick={printTicket}
                className="py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-1.5 text-sm"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: CHECKOUT & CALCULADORA DE VUELTO */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => {
          if (!isProcessing) {
            setIsCheckoutOpen(false);
          }
        }}
        title="💰 Confirmación de Pago y Vuelto"
      >
        <div className="space-y-6 mt-2">
          {/* TOTAL CARD */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-[1.5rem] p-6 text-center shadow-inner relative overflow-hidden">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Total a Pagar</p>
            <h3 className="text-4xl font-black text-indigo-900 tracking-tight">S/ {total.toFixed(2)}</h3>
          </div>

          {/* PAYMENT METHOD SELECTOR INSIDE MODAL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Método de Pago</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: "CASH", icon: Banknote, label: "Efectivo" },
                { id: "YAPE", icon: Smartphone, label: "Yape" },
                { id: "PLIN", icon: Smartphone, label: "Plin" },
                { id: "CARD", icon: CreditCard, label: "Tarjeta" },
                { id: "TRANSFER", icon: Landmark, label: "Transf." },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.id);
                    if (method.id === "CASH") {
                      setAmountPaid(total.toString());
                    }
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${paymentMethod === method.id ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"}`}
                >
                  <method.icon className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DYNAMIC VIEW FOR CASH (WITH CHANGE CALCULATOR) */}
          {paymentMethod === "CASH" ? (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Paga Con (Monto Recibido)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 outline-none text-2xl font-black text-gray-800 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* QUICK CASH OPTIONS */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Atajos de efectivo rápido</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAmountPaid(total.toString())}
                    className={`px-4 py-2 border rounded-xl text-xs font-black transition-all ${Number(amountPaid) === total ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  >
                    Exacto
                  </button>
                  {(() => {
                    const options = [10, 20, 50, 100, 200];
                    const nextTen = Math.ceil(total / 10) * 10;
                    const items: number[] = [];
                    if (nextTen > total) items.push(nextTen);
                    options.forEach(o => {
                      if (o > total && !items.includes(o)) items.push(o);
                    });
                    return items.sort((a,b)=>a-b).slice(0, 4).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAmountPaid(opt.toString())}
                        className={`px-4 py-2 border rounded-xl text-xs font-black transition-all ${Number(amountPaid) === opt ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold" : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
                      >
                        S/ {opt}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* VUELTO DISPLAY */}
              {(() => {
                const paidNum = Number(amountPaid) || 0;
                const change = paidNum - total;
                if (paidNum >= total) {
                  return (
                    <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Vuelto a entregar</p>
                        <p className="text-xs font-bold text-emerald-700/80">Pago completo</p>
                      </div>
                      <p className="text-3xl font-black text-emerald-600 tracking-tight">S/ {change.toFixed(2)}</p>
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                      <div>
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-0.5">Monto Insuficiente</p>
                        <p className="text-xs font-bold text-rose-700/80">Por favor completa el pago</p>
                      </div>
                      <p className="text-xl font-black text-rose-600 tracking-tight">Falta S/ {(total - paidNum).toFixed(2)}</p>
                    </div>
                  );
                }
              })()}
            </div>
          ) : (
            /* PAYMENT RECEIPT FOR ELECTRONIC PAYMENTS */
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 text-blue-800 text-xs font-medium flex flex-col gap-1.5 shadow-sm">
                <p className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-blue-700">
                  <Smartphone className="w-3.5 h-3.5" /> Pago Digital ({paymentLabel[paymentMethod] || paymentMethod})
                </p>
                <p className="text-blue-600">Se asume el cobro del monto exacto de **S/ {total.toFixed(2)}** en las cuentas de la empresa.</p>
              </div>

              <div>
                <ReceiptUploader
                  currentImageUrl={receiptUrl}
                  onUploadSuccess={(url) => setReceiptUrl(url)}
                  onClear={() => setReceiptUrl(null)}
                  label="Voucher de Pago (Opcional)"
                />
              </div>
            </div>
          )}

          {/* ADVISOR SELECTOR */}
          {user?.profiles?.includes("BUSINESS_WORKERS") && advisors.length > 0 && (
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                Asignar {user?.advisorLabel || "Asesor de venta"}
              </label>
              <select
                value={selectedAdvisorId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedAdvisorId(val);
                  if (val) {
                    const adv = advisors.find((a) => a.id === val);
                    setCommissionPercentage(adv ? adv.commissionPercentage : 0);
                  } else {
                    setCommissionPercentage("");
                  }
                  applyAdvisorToCart(val);
                }}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
              >
                <option value="">-- Sin asesor (Venta directa) --</option>
                {advisors.filter(a => a.isActive).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              {selectedAdvisorId && (() => {
                const adv = advisors.find(a => a.id === selectedAdvisorId);
                const isManualAllowed = adv?.commissionModel ? adv.commissionModel.allowManualEdit : true;

                const totalCartCommission = cart.reduce((sum, item) => {
                  if (!item.advisorId) return sum;
                  const pres = item.presentationId
                    ? item.presentations?.find((p: any) => p.id === item.presentationId)
                    : null;
                  const basePrice = pres ? pres.price : item.originalSalePrice;

                  let calcVal = 0;
                  if (item.commissionType === "SPLIT") {
                    calcVal = Math.max(0, item.salePrice - basePrice);
                  } else if (item.commissionType === "FIXED") {
                    calcVal = item.commissionValue || 0;
                  } else {
                    calcVal = ((item.commissionValue || 0) / 100) * item.salePrice;
                  }
                  return sum + (calcVal * item.quantity);
                }, 0);

                if (!isManualAllowed) {
                  return (
                    <div className="mt-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 animate-fadeIn space-y-2 text-left">
                      <div className="flex justify-between items-center text-xs font-bold text-indigo-800">
                        <span>Modelo:</span>
                        <span className="font-extrabold text-indigo-950">{adv?.commissionModel?.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-indigo-800">
                        <span>Comisión Acumulada:</span>
                        <span className="text-sm font-black text-indigo-600">S/ {totalCartCommission.toFixed(2)}</span>
                      </div>
                      <span className="text-[9px] text-indigo-400 font-bold block text-center">
                        (Edición manual deshabilitada por el modelo de comisión)
                      </span>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-4 mt-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 animate-fadeIn text-left">
                    <div>
                      <label className="block text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-1">
                        % Comisión de Venta
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={commissionPercentage}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : Number(e.target.value);
                            setCommissionPercentage(val);
                            // Update cart items commissionValue if they want to override manually
                            const updatedCart = cart.map(item => ({
                              ...item,
                              commissionType: "PERCENT",
                              commissionValue: val === "" ? 0 : val
                            }));
                            setCart(updatedCart);
                          }}
                          className="w-full pl-4 pr-8 py-2.5 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-extrabold text-sm outline-none text-indigo-900"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-400">%</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="block text-[10px] font-black text-indigo-700 uppercase tracking-wider mb-1">
                        Monto en Soles
                      </span>
                      <div className="text-lg font-black text-indigo-600 bg-white border border-indigo-200 px-4 py-2 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400">Total:</span>
                        <span>S/ {totalCartCommission.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* FACTURACIÓN ELECTRÓNICA - solo si el negocio lo tiene habilitado */}
          {user?.hasElectronicBilling && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo de Comprobante</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "TICKET_VENTA", label: "Ticket de Venta" },
                  { id: "BOLETA", label: "Boleta" },
                  { id: "FACTURA", label: "Factura" },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setBillingType(opt.id);
                      setClientDocumentType(opt.id === "FACTURA" ? "6" : "1");
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase transition-all ${
                      billingType === opt.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-white text-gray-500 border-gray-200 hover:border-emerald-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {(billingType === "BOLETA" || billingType === "FACTURA") && (
                <div className="space-y-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Tipo Doc.</label>
                      <select
                        value={clientDocumentType}
                        onChange={(e) => setClientDocumentType(e.target.value)}
                        disabled={billingType === "FACTURA"}
                        className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
                      >
                        <option value="1">DNI</option>
                        <option value="6">RUC</option>
                        <option value="-">Varios</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">
                        {billingType === "FACTURA" ? "RUC *" : "Número Doc."}
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder={clientDocumentType === "6" ? "11 dígitos" : "8 dígitos"}
                          maxLength={clientDocumentType === "6" ? 11 : 8}
                          value={clientDocumentNumber}
                          onChange={(e) => setClientDocumentNumber(e.target.value.replace(/\D/g, ""))}
                          className="flex-1 min-w-0 px-3 py-2 border border-emerald-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <button
                          type="button"
                          onClick={handleQueryDocument}
                          disabled={isQueryingDocument || (clientDocumentNumber.length !== 8 && clientDocumentNumber.length !== 11)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-750 disabled:bg-gray-200 disabled:text-gray-400 disabled:opacity-70 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm"
                          title="Buscar en Reniec/SUNAT"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">
                      {billingType === "FACTURA" ? "Razón Social *" : "Nombre del Cliente"}
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre o Razón Social"
                      value={clientDenomination}
                      onChange={(e) => setClientDenomination(e.target.value)}
                      className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Dirección (Opc.)</label>
                      <input
                        type="text"
                        placeholder="Av. Los Árboles 123"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Correo (Opc.)</label>
                      <input
                        type="email"
                        placeholder="cliente@email.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                  {billingType === "BOLETA" && total >= 700 && !clientDocumentNumber && (
                    <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      ⚠️ Por montos ≥ S/. 700 SUNAT exige identificar al cliente con DNI.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setIsCheckoutOpen(false)}
              className="px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isProcessing || (paymentMethod === "CASH" && (Number(amountPaid) || 0) < total)}
              className={`px-6 py-3 text-white font-black rounded-xl transition-all text-sm flex items-center gap-2 shadow-lg ${
                paymentMethod === "CASH" && (Number(amountPaid) || 0) < total
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:-translate-y-0.5 active:scale-95"
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" /> Finalizar Venta
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: HISTORIAL DE VENTAS POS */}
      <Modal
        isOpen={isSalesListOpen}
        onClose={() => setIsSalesListOpen(false)}
        title="📋 Registro de Ventas POS (Turno Actual)"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Desde:</span>
                <input
                  type="date"
                  value={salesStartDate}
                  onChange={(e) => setSalesStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Hasta:</span>
                <input
                  type="date"
                  value={salesEndDate}
                  onChange={(e) => setSalesEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSales}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                🔄 Actualizar
              </button>
              <button
                onClick={exportPosSalesExcel}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                Exportar Excel
              </button>
              <button
                onClick={exportPosSalesPdf}
                className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                Exportar PDF
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {loadingSales ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="font-bold">
                  Cargando ventas del sistema...
                </span>
              </div>
            ) : sales.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-bold">
                  No hay ventas registradas en este período.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto max-h-[50vh] custom-scrollbar">
                  <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Fecha/Hora</th>
                      {user?.role === "ADMIN" && <th className="px-4 py-3 text-left">Vendedor</th>}
                      <th className="px-4 py-3 text-left">
                        Detalle de Productos
                      </th>
                      <th className="px-4 py-3 text-center">Método</th>
                      <th className="px-4 py-3 text-right">Monto</th>
                      {user?.hasElectronicBilling && <th className="px-4 py-3 text-left">Comprobante SUNAT</th>}
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sales.slice((salesPage - 1) * 6, salesPage * 6).map((sale) => (
                      <tr
                        key={sale.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs font-medium">
                          {format(new Date(sale.date), "dd/MM/yyyy HH:mm")}
                        </td>
                        {user?.role === "ADMIN" && (
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs font-bold">
                            {sale.user ? `${sale.user.name} ${sale.user.lastName || ""}`.trim() : "N/A"}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <p
                            className="font-semibold text-gray-800 text-xs truncate max-w-xs"
                            title={sale.description}
                          >
                            {sale.description?.replace("Venta en POS: ", "") ||
                              "Venta Manual"}
                          </p>
                          {sale.receiptUrl && (
                            <a
                              href={
                                getReceiptAbsoluteUrl(sale.receiptUrl) || "#"
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-500 text-[10px] font-bold block mt-0.5 hover:underline"
                            >
                              📎 Ver comprobante adjunto
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                            {paymentLabel[sale.paymentMethod] ||
                              sale.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-600 text-xs">
                          S/ {Number(sale.amount).toFixed(2)}
                        </td>
                        {user?.hasElectronicBilling && (
                          <td className="px-4 py-3 text-xs">
                            {sale.billingType === "TICKET_VENTA" ? (
                              <span className="text-gray-400 font-bold">Ticket de Venta</span>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-gray-800">
                                    {sale.billingType === "BOLETA" ? "Boleta" : sale.billingType === "FACTURA" ? "Factura" : sale.billingType === "NOTA_CREDITO" ? "N. Crédito" : "N. Débito"}
                                  </span>
                                  {sale.billingSerie && sale.billingNumber && (
                                    <span className="font-mono text-gray-500 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                                      {sale.billingSerie}-{sale.billingNumber}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {sale.billingStatus === "SUCCESS" && (
                                    <>
                                      <span className="text-[9px] bg-emerald-50 text-emerald-700 font-black border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                                        Aceptado
                                      </span>
                                      {sale.billingPdfUrl && (
                                        <a href={sale.billingPdfUrl} target="_blank" rel="noreferrer" className="text-indigo-650 hover:text-indigo-850" title="Ver PDF">
                                          <FileText className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                      {sale.billingXmlUrl && (
                                        <a href={sale.billingXmlUrl} target="_blank" rel="noreferrer" className="text-amber-650 hover:text-amber-850" title="Ver XML">
                                          <FileCode className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                      {sale.billingCdrUrl && (
                                        <a href={sale.billingCdrUrl} target="_blank" rel="noreferrer" className="text-teal-650 hover:text-teal-850" title="Ver CDR">
                                          <FileCheck className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                    </>
                                  )}
                                  {sale.billingStatus === "ERROR" && (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] bg-red-50 text-red-700 font-black border border-red-200 px-1.5 py-0.5 rounded uppercase" title={sale.billingError}>
                                          Error SUNAT
                                        </span>
                                        <button
                                          onClick={async () => {
                                            const loading = toast.loading("Reintentando envío a SUNAT...");
                                            try {
                                              await retrySaleBillingRequest(sale.id);
                                              toast.dismiss(loading);
                                              toast.success("Envío completado");
                                              loadData();
                                            } catch (err: any) {
                                              toast.dismiss(loading);
                                              toast.error(err.message || "Error al reintentar");
                                            }
                                          }}
                                          className="p-0.5 bg-gray-50 hover:bg-gray-150 border border-gray-200 rounded text-gray-650 hover:text-gray-950 transition-colors animate-pulse"
                                          title="Reintentar Facturación"
                                        >
                                          <RefreshCw className="w-3 h-3" />
                                        </button>
                                      </div>
                                      <p className="text-[9px] text-red-500 font-medium max-w-[150px] truncate" title={sale.billingError}>
                                        {sale.billingError}
                                      </p>
                                    </div>
                                  )}
                                  {sale.billingStatus === "PENDING" && (
                                    <span className="text-[9px] bg-amber-50 text-amber-700 font-black border border-amber-200 px-1.5 py-0.5 rounded uppercase">
                                      Enviando...
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleDownloadPastTicket(sale)}
                              className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                              title="Reconstruir y Descargar Ticket"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {user?.hasElectronicBilling && sale.billingStatus === "SUCCESS" && (sale.billingType === "BOLETA" || sale.billingType === "FACTURA") && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedSaleForNote(sale);
                                    setNoteType("CREDIT");
                                    setNoteReasonCode(1);
                                    setNoteReasonText("");
                                    setIsNoteModalOpen(true);
                                  }}
                                  className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                                  title="Emitir Nota de Crédito (Anular/Descontar)"
                                >
                                  <MinusCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedSaleForNote(sale);
                                    setNoteType("DEBIT");
                                    setNoteReasonCode(1);
                                    setNoteReasonText("");
                                    setIsNoteModalOpen(true);
                                  }}
                                  className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Emitir Nota de Débito (Aumento de valor)"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {(sale.billingType === "TICKET_VENTA" || !sale.billingStatus || sale.billingStatus === "ERROR") && (
                              <>
                                <button
                                  onClick={() => handleEditSale(sale)}
                                  className="p-1.5 bg-amber-50 text-amber-705 hover:bg-amber-100 rounded-lg transition-colors"
                                  title="Editar Venta (Cargar al Carrito)"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSale(sale)}
                                  className="p-1.5 bg-red-50 text-red-650 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Eliminar / Anular Venta"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sales.length > 0 && (
                <Pagination
                  currentPage={salesPage}
                  totalItems={sales.length}
                  pageSize={6}
                  onPageChange={(page) => setSalesPage(page)}
                  className="border-t border-gray-100 bg-gray-50 px-4 py-3"
                />
              )}
            </>
          )}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsSalesListOpen(false)}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>



      {/* MODAL: Cámara Escáner */}
      <Modal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        title="Escanear Código de Barras / QR"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 font-medium text-center">
            Apunta la cámara de tu dispositivo hacia el código de barras o código QR.
          </p>
          <div
            id="scanner-reader"
            className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl border border-gray-200 bg-black aspect-video flex items-center justify-center text-white text-xs font-bold"
          >
            Iniciando cámara...
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsScannerOpen(false)}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Emitir Nota de Crédito / Débito */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => {
          if (!isSubmittingNote) {
            setIsNoteModalOpen(false);
            setSelectedSaleForNote(null);
          }
        }}
        title={`Emitir Nota de ${noteType === "CREDIT" ? "Crédito" : "Débito"}`}
      >
        {selectedSaleForNote && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-150 text-xs space-y-2">
              <p className="font-extrabold text-gray-800">
                Documento de Referencia:{" "}
                <span className="font-mono bg-white px-2 py-0.5 border border-gray-200 rounded">
                  {selectedSaleForNote.billingSerie}-{selectedSaleForNote.billingNumber}
                </span>
              </p>
              <p className="font-semibold text-gray-600">
                Cliente: <span className="text-gray-950 font-bold">{selectedSaleForNote.description?.split(" - ")[1] || "Cliente general"}</span>
              </p>
              <p className="font-semibold text-gray-655">
                Monto Original: <span className="text-emerald-600 font-extrabold">S/ {Number(selectedSaleForNote.amount).toFixed(2)}</span>
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Motivo / Código de Operación
              </label>
              <select
                value={noteReasonCode}
                onChange={(e) => setNoteReasonCode(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {noteType === "CREDIT" ? (
                  <>
                    <option value="1">1 - Anulación de la operación</option>
                    <option value="2">2 - Anulación por error en el RUC</option>
                    <option value="3">3 - Corrección por error en la descripción</option>
                    <option value="4">4 - Descuento global</option>
                    <option value="5">5 - Descuento por ítem</option>
                    <option value="6">6 - Devolución total</option>
                    <option value="7">7 - Devolución por ítem</option>
                    <option value="8">8 - Bonificación</option>
                    <option value="9">9 - Disminución en el valor</option>
                    <option value="10">10 - Otros conceptos</option>
                  </>
                ) : (
                  <>
                    <option value="1">1 - Intereses por mora</option>
                    <option value="2">2 - Aumento en el valor</option>
                    <option value="3">3 - Penalidades / otros conceptos</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                Sustento / Comentarios (Obligatorio)
              </label>
              <textarea
                placeholder="Indique detalladamente la razón de emisión..."
                rows={3}
                value={noteReasonText}
                onChange={(e) => setNoteReasonText(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={isSubmittingNote}
                onClick={() => {
                  setIsNoteModalOpen(false);
                  setSelectedSaleForNote(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmittingNote || !noteReasonText.trim()}
                onClick={handleSubmitNote}
                className={`px-4 py-2 text-white rounded-xl font-black text-xs shadow-sm transition-all flex items-center gap-1.5 ${
                  noteType === "CREDIT" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                } disabled:opacity-50`}
              >
                {isSubmittingNote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Emitir Nota</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* MODAL: Ajustar Precio Ítem */}
      <Modal
        isOpen={adjustingCartIndex !== null}
        onClose={() => setAdjustingCartIndex(null)}
        title="💸 Ajustar Precio de Venta"
      >
        {adjustingCartIndex !== null && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-gray-800">
                {cart[adjustingCartIndex].name}
              </p>
              <p className="text-xs text-gray-500 font-medium">
                {cart[adjustingCartIndex].presentationId
                  ? `Presentación seleccionada: ${
                      cart[adjustingCartIndex].presentations?.find(
                        (p: any) => p.id === cart[adjustingCartIndex].presentationId
                      )?.name || "N/A"
                    }`
                  : `Presentación por defecto: ${cart[adjustingCartIndex].unit}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
              <div>
                <span className="text-gray-500 block font-medium">Precio Base:</span>
                <span className="font-bold text-gray-800">
                  S/ {(cart[adjustingCartIndex].presentationId
                    ? (cart[adjustingCartIndex].presentations?.find(
                        (p: any) => p.id === cart[adjustingCartIndex].presentationId
                      )?.price || cart[adjustingCartIndex].originalSalePrice)
                    : cart[adjustingCartIndex].originalSalePrice
                  ).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block font-medium">Precio Ajustado Registrado:</span>
                <span className="font-bold text-gray-800">
                  {cart[adjustingCartIndex].adjustedPrice && cart[adjustingCartIndex].adjustedPrice > 0
                    ? `S/ ${Number(cart[adjustingCartIndex].adjustedPrice).toFixed(2)}`
                    : "No registrado"}
                </span>
              </div>
              <div className="col-span-2 border-t border-gray-200 pt-2 mt-1">
                <span className="text-gray-500 block font-medium">Precio de Costo Base:</span>
                <span className="font-bold text-rose-600">
                  S/ {Number(cart[adjustingCartIndex].costPrice || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs space-y-2">
              <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                💡 Recomendaciones de Rentabilidad
              </p>
              <div className="space-y-1 text-[11px] text-indigo-700">
                <p>
                  • Para **no perder dinero**, el precio debe ser al menos el costo:{" "}
                  <strong className="text-indigo-900">
                    S/ {Number(cart[adjustingCartIndex].costPrice || 0).toFixed(2)}
                  </strong>
                </p>
                <p>
                  • Para mantener un **10% de margen de ganancia**:{" "}
                  <strong className="text-indigo-900">
                    S/ {((cart[adjustingCartIndex].costPrice || 0) / 0.9).toFixed(2)}
                  </strong>
                </p>
              </div>
            </div>

            {/* Quick shortcuts */}
            <div className="flex flex-wrap gap-2">
              {cart[adjustingCartIndex].adjustedPrice && cart[adjustingCartIndex].adjustedPrice > 0 && (
                <button
                  type="button"
                  onClick={() => setCustomAdjustedPrice(Number(cart[adjustingCartIndex].adjustedPrice))}
                  className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-bold transition-all"
                >
                  Usar Ajustado (S/ {Number(cart[adjustingCartIndex].adjustedPrice).toFixed(2)})
                </button>
              )}
              <button
                type="button"
                onClick={() => setCustomAdjustedPrice(parseFloat(((cart[adjustingCartIndex].costPrice || 0) / 0.9).toFixed(2)))}
                className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-[10px] font-bold transition-all"
              >
                Usar Margen 10% (S/ {((cart[adjustingCartIndex].costPrice || 0) / 0.9).toFixed(2)})
              </button>
            </div>

            {/* Input field */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Precio de Venta Deseado (S/)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={customAdjustedPrice || ""}
                  onChange={(e) => setCustomAdjustedPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm font-bold bg-white"
                />
                {customAdjustedPrice > 0 && customAdjustedPrice <= (cart[adjustingCartIndex].costPrice || 0) && (
                  <p className="text-[10px] text-rose-500 font-bold mt-1">
                    ⚠️ Alerta: El precio es menor o igual al costo de adquisición (S/ {Number(cart[adjustingCartIndex].costPrice || 0).toFixed(2)}). ¡Pérdida inminente!
                  </p>
                )}
                {customAdjustedPrice > (cart[adjustingCartIndex].costPrice || 0) &&
                  customAdjustedPrice < ((cart[adjustingCartIndex].costPrice || 0) / 0.9) && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1">
                      ⚠️ Alerta: Margen de rentabilidad bajo (menor al 10%).
                    </p>
                  )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setAdjustingCartIndex(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customAdjustedPrice <= 0) {
                    toast.error("El precio debe ser mayor a 0");
                    return;
                  }
                  setCart(
                    cart.map((c, i) =>
                      i === adjustingCartIndex ? { ...c, salePrice: customAdjustedPrice } : c
                    )
                  );
                  setAdjustingCartIndex(null);
                  toast.success("Precio del ítem ajustado");
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-sm transition-all"
              >
                Guardar Ajuste
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* FLOATING HOVER TOOLTIP POP OVER */}
      {hoveredProduct && (
        <div
          className="fixed z-[1000] w-64 bg-slate-900/95 text-white rounded-2xl shadow-2xl p-4 border border-slate-700 pointer-events-none text-xs space-y-2 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-sm"
          style={{
            left: `${tooltipCoords.x}px`,
            top: `${tooltipCoords.y}px`,
          }}
        >
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <h4 className="font-extrabold text-sm text-indigo-400 truncate max-w-[70%]">
              {hoveredProduct.name}
            </h4>
            {hoveredProduct.color && (
              <span
                className="w-3.5 h-3.5 rounded-full border border-white"
                style={{ backgroundColor: hoveredProduct.color }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
            <div>
              <span className="block text-[9px] uppercase font-black text-slate-400">Código</span>
              <span className="font-bold font-mono">
                {hoveredProduct.sku || `Cód: #${String(hoveredProduct.customCode || 0).padStart(4, "0")}`}
              </span>
            </div>

            <div>
              <span className="block text-[9px] uppercase font-black text-slate-400">Unidad</span>
              <span className="font-bold">{hoveredProduct.unit}</span>
            </div>

            {user?.profiles?.includes("BUSINESS_BRANCHES") ? (
              <>
                <div>
                  <span className="block text-[9px] uppercase font-black text-slate-400">Stock Sede</span>
                  <span className="font-bold text-emerald-400">
                    {(() => {
                      const bsStock = activeShift?.branchId
                        ? (hoveredProduct.branchStocks?.find((bs: any) => bs.branchId === activeShift.branchId)?.stock || 0)
                        : hoveredProduct.stock;
                      return bsStock;
                    })()}
                  </span>
                </div>

                <div>
                  <span className="block text-[9px] uppercase font-black text-slate-400">Stock Global</span>
                  <span className="font-bold text-cyan-400">{hoveredProduct.stock}</span>
                </div>
              </>
            ) : (
              <div>
                <span className="block text-[9px] uppercase font-black text-slate-400">Stock</span>
                <span className="font-bold text-emerald-400">{hoveredProduct.stock}</span>
              </div>
            )}

            <div>
              <span className="block text-[9px] uppercase font-black text-slate-400">Precio Costo</span>
              <span className="font-bold text-rose-300">S/ {hoveredProduct.costPrice.toFixed(2)}</span>
            </div>

            <div>
              <span className="block text-[9px] uppercase font-black text-slate-400">Precio Venta</span>
              <span className="font-bold text-emerald-300 font-extrabold">S/ {hoveredProduct.salePrice.toFixed(2)}</span>
            </div>

            <div className="col-span-2">
              <span className="block text-[9px] uppercase font-black text-slate-400">Marca / Familia</span>
              <span className="font-semibold text-slate-300">
                {hoveredProduct.brand?.name || "Sin marca"} / {hoveredProduct.family?.name || "Sin familia"}
              </span>
            </div>

            {hoveredProduct.description && (
              <div className="col-span-2 border-t border-slate-800 pt-1.5 mt-0.5">
                <span className="block text-[9px] uppercase font-black text-slate-400">Descripción</span>
                <p className="text-slate-300 leading-snug line-clamp-2">{hoveredProduct.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL FLOTANTE: CONFIGURACIÓN LECTOR CÓDIGO DE BARRAS FÍSICO */}
      <motion.div drag dragMomentum={false} className="fixed bottom-6 right-6 z-[999] no-print">
        {/* Floating Trigger Button */}
        <button
          type="button"
          onClick={() => setIsScannerConfigOpen(!isScannerConfigOpen)}
          className={`flex items-center gap-2 px-4 py-3 rounded-full text-white font-bold text-xs shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer ${isScannerConfigOpen ? "bg-red-500" : "bg-indigo-600 hover:bg-indigo-750"}`}
        >
          <span>{isScannerConfigOpen ? "Cerrar Panel ✖" : "Configurar Lector 🔌"}</span>
          {scannerEnabled && !isScannerConfigOpen && (
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
          )}
        </button>

        {/* Floating Config Card */}
        {isScannerConfigOpen && (
          <div className="absolute bottom-16 right-0 w-80 bg-white/95 backdrop-blur-md rounded-3xl border border-gray-150 p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-200" onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5">
                <span>Lector Físico (Teclado)</span>
              </h4>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${scannerEnabled ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                {scannerEnabled ? "ACTIVO" : "APAGADO"}
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Toggle Enable */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-semibold text-gray-600">Escuchar teclado global</span>
                <input
                  type="checkbox"
                  checked={scannerEnabled}
                  onChange={(e) => {
                    setScannerEnabled(e.target.checked);
                    playBeep();
                  }}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
              </label>

              {/* Sensitivity Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-655">Sensibilidad (Max entre teclas)</span>
                  <span className="text-xs font-black text-indigo-600">{scannerSensitivity}ms</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="5"
                  value={scannerSensitivity}
                  onChange={(e) => setScannerSensitivity(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-[10px] text-gray-400 leading-tight">
                  Valores más bajos (ej. 40ms) evitan que la escritura manual sea detectada como escaneo.
                </p>
              </div>

              {/* Scan Test Box */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100 text-center space-y-1.5">
                <span className="block text-[10px] font-black uppercase text-gray-450">Prueba de Lectura</span>
                {scanTestResult ? (
                  <div className="space-y-1">
                    <span className="block text-xs font-bold text-gray-800 break-all bg-white px-2 py-1 rounded-lg border border-gray-200 font-mono">
                      {scanTestResult}
                    </span>
                    <span className="block text-[9px] text-emerald-600 font-bold">
                      Beep! Lectura Exitosa ✓
                    </span>
                  </div>
                ) : (
                  <span className="block text-[10px] text-gray-450 italic leading-snug">
                    Escanea un código con el lector físico para probar el pitido y ver el resultado.
                  </span>
                )}
                {scanTestResult && (
                  <button
                    type="button"
                    onClick={() => setScanTestResult("")}
                    className="text-[10px] text-gray-400 underline hover:text-gray-600 cursor-pointer"
                  >
                    Limpiar prueba
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </Appshell>
  );
}
