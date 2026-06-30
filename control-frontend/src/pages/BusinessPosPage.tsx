import { useState, useEffect, useRef } from "react";
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
  getTransactionsRequest,
  updateTransactionRequest,
  deleteTransactionRequest,
} from "../services/transaction.api";
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
  Edit2,
  Trash2,
  Loader2,
  Camera,
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
import ConfirmModal from "../components/ui/ConfirmModal";
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
}

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

  // Editar Venta POS
  const [editSale, setEditSale] = useState<any>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editDesc, setEditDesc] = useState("");
  const [editPayment, setEditPayment] = useState("CASH");
  const [editReceiptUrl, setEditReceiptUrl] = useState<string | File | null>(
    null,
  );

  // Modal confirm delete states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [saleIdToDelete, setSaleIdToDelete] = useState<string | null>(null);

  const loadSales = async () => {
    setLoadingSales(true);
    try {
      const data = await getTransactionsRequest({
        workspace: "BUSINESS",
        isPosSale: true,
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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`REGISTRO DE VENTAS POS - ${businessName.toUpperCase()}`, 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 14, 26);

    let y = 35;
    doc.setFillColor(79, 70, 229);
    doc.rect(14, y, 182, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255);
    doc.text("Fecha/Hora", 16, y + 5);
    doc.text("Vendedor", 50, y + 5);
    doc.text("Detalle de Venta", 90, y + 5);
    doc.text("Método", 155, y + 5);
    doc.text("Total", 175, y + 5);

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    sales.forEach((sale) => {
      y += 8;
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFillColor(79, 70, 229);
        doc.rect(14, y, 182, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255);
        doc.text("Fecha/Hora", 16, y + 5);
        doc.text("Vendedor", 50, y + 5);
        doc.text("Detalle de Venta", 90, y + 5);
        doc.text("Método", 155, y + 5);
        doc.text("Total", 175, y + 5);

        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        y += 8;
      }

      const fecha = format(new Date(sale.date), "dd/MM HH:mm");
      const vendedor = sale.user ? `${sale.user.name} ${sale.user.lastName || ""}`.substring(0, 18).trim() : "N/A";
      const desc = (sale.description || "").replace("Venta en POS: ", "").substring(0, 30);
      const total = sale.amountSoles || sale.amount || 0;

      doc.text(fecha, 16, y + 5);
      doc.text(vendedor, 50, y + 5);
      doc.text(desc, 90, y + 5);
      doc.text(sale.paymentMethod || "CASH", 155, y + 5);
      doc.text(`S/ ${total.toFixed(2)}`, 175, y + 5);
    });

    doc.save("Ventas_POS.pdf");
    toast.success("Ventas exportadas a PDF");
  };

  const handleSaveEdit = async () => {
    if (!editSale) return;
    try {
      let finalReceiptUrl = editReceiptUrl;
      if (editReceiptUrl instanceof File) {
        const uploadToast = toast.loading("Subiendo comprobante...");
        try {
          finalReceiptUrl = await uploadReceiptFile(editReceiptUrl);
          toast.dismiss(uploadToast);
        } catch (error: any) {
          toast.dismiss(uploadToast);
          toast.error(error.message || "Error al subir el comprobante");
          return;
        }
      }

      await updateTransactionRequest(editSale.id, {
        categoryId: editSale.categoryId,
        subCategoryId: editSale.subCategoryId || null,
        amount: editAmount,
        date: new Date(editSale.date),
        currency: editSale.currency,
        paymentMethod: editPayment,
        description: editDesc,
        name: editSale.name,
        receiptUrl: finalReceiptUrl as string | null,
      });
      toast.success("Venta actualizada correctamente");
      setEditSale(null);
      loadSales();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar la venta");
    }
  };

  const handleDeleteSale = async (id: string) => {
    try {
      await deleteTransactionRequest(id);
      toast.success("Venta eliminada correctamente");
      loadSales();
      loadData();
    } catch {
      toast.error("Error al eliminar la venta");
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
    });
    setShowTicket(true);
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
      setCart(
        cart.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: newQty } : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        { ...product, quantity: 1, originalSalePrice: product.salePrice },
      ]);
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
        // Caso A: El usuario seleccionó un archivo nuevo -> Subimos a Cloudinary
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
        subCategoryId: selectedSubCategory || null,
        receiptUrl: finalReceiptUrl,
        advisorId: selectedAdvisorId || null,
        commissionPercentage: selectedAdvisorId ? (commissionPercentage !== "" ? Number(commissionPercentage) : 0) : null,
        commissionAmount: selectedAdvisorId ? parseFloat(((total * (commissionPercentage !== "" ? Number(commissionPercentage) : 0)) / 100).toFixed(2)) : null,
      });

      toast.success("¡Venta completada con éxito!");

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
      });

      // 5. Limpieza de estados
      setCart([]);
      setReceiptUrl(null);
      setSelectedAdvisorId("");
      setCommissionPercentage("");
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
              <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                Ticket de Venta
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
                <span>Ticket #:</span>
                <span>{lastSale.txId?.slice(0, 8).toUpperCase()}</span>
              </div>
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
              <div style={{ fontSize: "5px", color: "#999", marginTop: "4px" }}>
                Solicita tu Boleta o Factura
              </div>
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
              <FileText className="w-4 h-4" /> Ver Ventas Recientes
              (Editar/Eliminar)
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
                <div className="text-[10px] text-gray-500 mt-1">
                  Ticket de Venta
                </div>
                <div className="border-b border-dashed border-gray-300 my-3"></div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span>Fecha:</span>
                  <span>{format(lastSale.date, "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span>Ticket #:</span>
                  <span>{lastSale.txId.slice(0, 8).toUpperCase()}</span>
                </div>
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
                <div className="text-[5px] text-gray-400 mt-0.5">
                  Solicita tu Boleta o Factura
                </div>
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
          {advisors.length > 0 && (
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
                }}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white transition-all font-semibold outline-none text-sm"
              >
                <option value="">-- Sin asesor (Venta directa) --</option>
                {advisors.filter(a => a.isActive).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              {selectedAdvisorId && (
                <div className="grid grid-cols-2 gap-4 mt-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 animate-fadeIn">
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
                      <span>S/ {((total * (Number(commissionPercentage) || 0)) / 100).toFixed(2)}</span>
                    </div>
                  </div>
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
                        <td className="px-4 py-3 text-right">
                          <span className="font-black text-emerald-600 text-xs">
                            S/ {Number(sale.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleDownloadPastTicket(sale)}
                              className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                              title="Reconstruir y Descargar Ticket"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditSale(sale);
                                setEditAmount(sale.amount);
                                setEditDesc(sale.description || "");
                                setEditPayment(sale.paymentMethod);
                                setEditReceiptUrl(sale.receiptUrl || null);
                              }}
                              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Editar Monto/Método"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSaleIdToDelete(sale.id);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* MODAL: EDITAR VENTA POS */}
      <Modal
        isOpen={!!editSale}
        onClose={() => setEditSale(null)}
        title="✏️ Editar Venta Registrada"
      >
        {editSale && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-700 font-medium">
              ⚠ Recuerda: Esto modificará el registro contable de la caja. El
              stock de inventario no se revertirá automáticamente.
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Monto Total de Venta (S/)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Método de Pago
              </label>
              <select
                value={editPayment}
                onChange={(e) => setEditPayment(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold bg-white"
              >
                <option value="CASH">Efectivo</option>
                <option value="YAPE">Yape</option>
                <option value="PLIN">Plin</option>
                <option value="CARD">Tarjeta</option>
                <option value="TRANSFER">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Descripción / Nota
              </label>
              <textarea
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Comprobante de Pago (Yape/Plin/Boucher)
              </label>
              <ReceiptUploader
                currentImageUrl={editReceiptUrl}
                onUploadSuccess={(url) => setEditReceiptUrl(url)}
                onClear={() => setEditReceiptUrl(null)}
                label="Subir voucher/comprobante"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setEditSale(null)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 shadow-sm transition-all"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setSaleIdToDelete(null);
        }}
        onConfirm={() => {
          if (saleIdToDelete) {
            handleDeleteSale(saleIdToDelete);
          }
        }}
        title="¿Eliminar registro de venta?"
        message="¿Estás seguro de que deseas eliminar este registro de venta? El stock de los productos afectados se restaurará automáticamente en el inventario."
        confirmText="Eliminar Venta"
        cancelText="Cancelar"
        variant="danger"
      />

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
      <div className="fixed bottom-6 right-6 z-[999] no-print">
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
          <div className="absolute bottom-16 right-0 w-80 bg-white/95 backdrop-blur-md rounded-3xl border border-gray-150 p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
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
      </div>
    </Appshell>
  );
}
