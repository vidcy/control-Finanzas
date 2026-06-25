import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  TrendingUp,
  Image as ImageIcon,
  Copy,
  Barcode as BarcodeIcon,
  Calendar,
  Camera,
  Printer,
  Clipboard,
  Sparkles,
  Loader2,
  FileSpreadsheet,
  FileText,
  Check,
  Truck,
  Eye,
  ShoppingBag,
  RotateCcw,
} from "lucide-react";
import {
  getProductsRequest,
  createProductRequest,
  updateProductRequest,
  deleteProductRequest,
  restockProductRequest,
  getLowStockAnalysisRequest,
  createPurchaseOrderRequest,
  getPurchaseOrdersRequest,
  receivePurchaseOrderRequest,
  deletePurchaseOrderRequest,
  revertPurchaseOrderRequest,
  updatePurchaseOrderRequest,
  getBrandsRequest,
  createBrandRequest,
  deleteBrandRequest,
  getFamiliesRequest,
  createFamilyRequest,
  deleteFamilyRequest,
} from "../services/product.api";
import type { Product, Presentation, LowStockAnalysisItem, PurchaseOrder } from "../services/product.api";
import { listCategoriesRequest } from "../services/category.api";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useAuth } from "../auth/AuthContext";
import {
  getReceiptAbsoluteUrl,
  ProductImageUploader,
} from "../components/ui/ImageUploader";

// Helper dynamically loading CDN scripts to bypass React 19 dependency conflict issues
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

const loadJsBarcode = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).JsBarcode) {
      resolve((window as any).JsBarcode);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js";
    script.onload = () => resolve((window as any).JsBarcode);
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

// Helper to format stock quantities into mixed presentations dynamically
export function formatStock(
  stock: number,
  unit: string,
  presentations?: Presentation[],
) {
  if (!presentations || presentations.length === 0) {
    return `${parseFloat(stock.toFixed(2))} ${unit}`;
  }

  const sorted = [...presentations]
    .filter((p) => p.equivalence > 1)
    .sort((a, b) => b.equivalence - a.equivalence);

  let remaining = stock;
  const parts: string[] = [];

  for (const p of sorted) {
    if (remaining >= p.equivalence) {
      const qty = Math.floor(remaining / p.equivalence);
      remaining = remaining % p.equivalence;
      parts.push(`${qty} ${p.name}`);
    }
  }

  const rounded = parseFloat(remaining.toFixed(2));
  if (rounded > 0 || parts.length === 0) {
    parts.push(`${rounded} ${unit}`);
  }

  return parts.join(" + ");
}

export default function BusinessInventoryPage() {
  const { user } = useAuth();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"products" | "planner" | "labels">("products");

  // Branch context — only used when BUSINESS_BRANCHES is enabled
  const hasBranches = user?.profiles?.includes("BUSINESS_BRANCHES");
  const [branches, setBranches] = useState<any[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>(""); // "" = all branches / no filter

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrandId, setFilterBrandId] = useState("");
  const [filterFamilyId, setFilterFamilyId] = useState("");

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productIdToDelete, setProductIdToDelete] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Generic Confirm Modal States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    variant: "info" as "info" | "danger" | "warning",
    onConfirm: () => {},
  });

  // Subtab for purchase orders: pending (transit) vs received (history)
  const [ordersSubTab, setOrdersSubTab] = useState<"pending" | "received">("pending");

  // Form State - Defaulting Unit to "Unidad"
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    costPrice: 0,
    salePrice: 0,
    stock: 0,
    minStock: 5,
    unit: "Unidad",
    imageUrl: "" as string | File,
    presentations: [] as Presentation[],
    brandId: "",
    familyId: "",
  });

  const [brands, setBrands] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [isManageBrandsModalOpen, setIsManageBrandsModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newFamilyName, setNewFamilyName] = useState("");

  const fetchBrandsAndFamilies = async () => {
    try {
      const [brandsData, familiesData] = await Promise.all([
        getBrandsRequest(),
        getFamiliesRequest(),
      ]);
      setBrands(brandsData);
      setFamilies(familiesData);
    } catch (error) {
      console.error("Error al cargar marcas/familias", error);
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      await createBrandRequest({ name: newBrandName.trim() });
      setNewBrandName("");
      toast.success("Marca creada");
      fetchBrandsAndFamilies();
    } catch (err: any) {
      toast.error(err.message || "Error al crear marca");
    }
  };

  const handleDeleteBrand = async (id: string) => {
    try {
      await deleteBrandRequest(id);
      toast.success("Marca eliminada");
      fetchBrandsAndFamilies();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar marca");
    }
  };

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return;
    try {
      await createFamilyRequest({ name: newFamilyName.trim() });
      setNewFamilyName("");
      toast.success("Familia creada");
      fetchBrandsAndFamilies();
    } catch (err: any) {
      toast.error(err.message || "Error al crear familia");
    }
  };

  const handleDeleteFamily = async (id: string) => {
    try {
      await deleteFamilyRequest(id);
      toast.success("Familia eliminada");
      fetchBrandsAndFamilies();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar familia");
    }
  };

  const [restockData, setRestockData] = useState({
    quantity: 0,
    presentationId: "",
    totalCost: 0,
    categoryId: "",
    paymentMethod: "CASH",
  });

  // Replenishment Planner States
  const [plannerItems, setPlannerItems] = useState<LowStockAnalysisItem[]>([]);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerMonth, setPlannerMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});
  const [customCosts, setCustomCosts] = useState<Record<string, number>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isBulkPurchaseModalOpen, setIsBulkPurchaseModalOpen] = useState(false);
  const [bulkPurchaseData, setBulkPurchaseData] = useState({
    categoryId: "",
    paymentMethod: "CASH",
    receiptUrl: "" as string | File,
    receiveImmediately: false,
  });

  const [singlePurchaseItem, setSinglePurchaseItem] = useState<LowStockAnalysisItem | null>(null);
  const [bulkPurchaseFile, setBulkPurchaseFile] = useState<File | null>(null);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [editOrderData, setEditOrderData] = useState<{
    categoryId: string;
    paymentMethod: string;
    receiptUrl: string;
    items: Array<{
      id: string;
      productId: string;
      name: string;
      quantity: number;
      costPrice: number;
      unit: string;
      equivalence: number;
      presentationId?: string | null;
      presentationName?: string | null;
    }>;
  }>({
    categoryId: "",
    paymentMethod: "CASH",
    receiptUrl: "",
    items: [],
  });
  const [editOrderFile, setEditOrderFile] = useState<File | null>(null);

  // Barcode Printing States
  const [ticketProductId, setTicketProductId] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState(12);
  const [ticketBusinessName, setTicketBusinessName] = useState(user?.businessName || "Think");

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, cats] = await Promise.all([
        getProductsRequest(),
        listCategoriesRequest(),
      ]);
      setProducts(data);
      setCategories(cats.filter((c: any) => c.type === "EXPENSE"));
      await fetchBrandsAndFamilies();
      // Load branches if multi-branch module is enabled
      if (hasBranches) {
        try {
          const { getBranchesRequest } = await import("../services/branch.api");
          const branchData = await getBranchesRequest();
          setBranches(branchData);
        } catch {
          // Not critical — just means no branch data
        }
      }
    } catch (error) {
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const loadPlannerData = async () => {
    if (activeTab !== "planner") return;
    try {
      setPlannerLoading(true);
      const [year, month] = plannerMonth.split("-").map(Number);
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
      
      const [data, orders] = await Promise.all([
        getLowStockAnalysisRequest(start, end),
        getPurchaseOrdersRequest(),
      ]);

      // Extract product IDs of pending orders
      const pendingProductIds = new Set<string>();
      orders
        .filter((order) => order.status === "ORDERED")
        .forEach((order) => {
          order.items.forEach((item) => {
            pendingProductIds.add(item.productId);
          });
        });

      // Filter out low stock analysis items that are already ordered
      const filteredData = data.filter((item) => !pendingProductIds.has(item.id));

      setPlannerItems(filteredData);
      setSelectedItemIds(filteredData.map((item) => item.id));

      // Initialize custom fields if not set
      const qtys: Record<string, number> = {};
      const costs: Record<string, number> = {};
      filteredData.forEach((item) => {
        qtys[item.id] = customQuantities[item.id] !== undefined ? customQuantities[item.id] : item.deficit;
        costs[item.id] = customCosts[item.id] !== undefined ? customCosts[item.id] : item.costPrice;
      });
      setCustomQuantities((prev) => ({ ...qtys, ...prev }));
      setCustomCosts((prev) => ({ ...costs, ...prev }));
    } catch {
      toast.error("Error al cargar planificador de compras");
    } finally {
      setPlannerLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const orders = await getPurchaseOrdersRequest();
      setPurchaseOrders(orders);
    } catch {
      toast.error("Error al cargar pedidos en tránsito");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "products" || activeTab === "labels") {
      loadData();
    } else if (activeTab === "planner") {
      loadPlannerData();
      loadOrders();
    }
  }, [activeTab, plannerMonth]);

  // Render Barcodes in the ticket print preview sheet
  useEffect(() => {
    if (activeTab === "labels" && ticketProductId) {
      loadJsBarcode().then((JsBarcode) => {
        const prod = products.find((p) => p.id === ticketProductId);
        if (prod && prod.sku) {
          const svgs = document.querySelectorAll(".barcode-preview-svg");
          svgs.forEach((svg) => {
            try {
              JsBarcode(svg, prod.sku, {
                format: "CODE128",
                width: 1.5,
                height: 35,
                displayValue: true,
                fontSize: 10,
                margin: 4,
              });
            } catch (err) {
              console.error("JsBarcode error rendering", err);
            }
          });
        }
      });
    }
  }, [activeTab, ticketProductId, ticketQuantity, products]);

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
  }, [isScannerOpen]);

  const handleBarcodeScanned = (code: string) => {
    toast.success(`Código escaneado: ${code}`);
    const match = products.find((p) => p.sku?.toLowerCase() === code.trim().toLowerCase());
    if (match) {
      handleOpenModal(match);
      toast.success(`Producto encontrado: ${match.name}`);
    } else {
      // Create new product with this SKU prefilled
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        sku: code.trim(),
        costPrice: 0,
        salePrice: 0,
        stock: 0,
        minStock: 5,
        unit: "Unidad",
        imageUrl: "",
        presentations: [],
        brandId: "",
        familyId: "",
      });
      setIsModalOpen(true);
      toast("Código de barras nuevo. Rellene los datos para registrarlo.", { icon: "ℹ️" });
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        sku: product.sku || "",
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        stock: product.stock,
        minStock: product.minStock,
        unit: product.unit || "Unidad",
        imageUrl: product.imageUrl || "",
        presentations: product.presentations || [],
        brandId: product.brandId || "",
        familyId: product.familyId || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        sku: "",
        costPrice: 0,
        salePrice: 0,
        stock: 0,
        minStock: 5,
        unit: "Unidad",
        imageUrl: "",
        presentations: [],
        brandId: "",
        familyId: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleClone = (product: Product) => {
    setEditingProduct(null); // Clear editing to create a new product entry
    setFormData({
      name: product.name,
      description: product.description || "",
      sku: "", // Clear SKU/Barcode so they can type or scan the new one
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      stock: 0, // Reset stock for new item
      minStock: product.minStock,
      unit: product.unit || "Unidad",
      imageUrl: product.imageUrl || "",
      presentations: product.presentations || [],
      brandId: product.brandId || "",
      familyId: product.familyId || "",
    });
    setIsModalOpen(true);
    toast.success("Modelo clonado. Ingrese o escanee el nuevo código.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalImageUrl = formData.imageUrl;
      if (formData.imageUrl instanceof File) {
        const uploadToast = toast.loading("Subiendo foto del producto...");
        try {
          const { uploadProductImageFile } =
            await import("../components/ui/ImageUploader");
          finalImageUrl = await uploadProductImageFile(formData.imageUrl);
          toast.dismiss(uploadToast);
        } catch {
          toast.dismiss(uploadToast);
          toast.error("Error al subir la imagen del producto");
          return;
        }
      }

      const payload = {
        ...formData,
        imageUrl: finalImageUrl || undefined,
      };
      if (editingProduct) {
        await updateProductRequest(editingProduct.id, payload as any);
        toast.success("Producto actualizado");
      } else {
        await createProductRequest(payload as any);
        toast.success("Producto creado");
      }
      setIsModalOpen(false);
      loadData();
      if (activeTab === "planner") loadPlannerData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Error al guardar producto",
      );
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    if (!restockData.categoryId) {
      toast.error("Selecciona una categoría para el gasto");
      return;
    }

    try {
      await restockProductRequest(restockProduct.id, {
        quantity: restockData.quantity,
        presentationId: restockData.presentationId || undefined,
        totalCost: restockData.totalCost,
        categoryId: restockData.categoryId,
        paymentMethod: restockData.paymentMethod,
      });

      toast.success("Stock repuesto y egreso registrado contablemente");
      setIsRestockModalOpen(false);
      setRestockData({
        quantity: 0,
        presentationId: "",
        totalCost: 0,
        categoryId: "",
        paymentMethod: "CASH",
      });
      loadData();
      if (activeTab === "planner") loadPlannerData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Error al reponer stock");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProductRequest(id);
      toast.success("Producto eliminado");
      loadData();
      if (activeTab === "planner") loadPlannerData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Error al eliminar");
    }
  };

  const handleBulkPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singlePurchaseItem && selectedItemIds.length === 0) {
      toast.error("No has seleccionado ningún producto para comprar");
      return;
    }
    if (!bulkPurchaseData.categoryId) {
      toast.error("Selecciona una categoría para el egreso");
      return;
    }

    const itemsToBuy = singlePurchaseItem
      ? [
          {
            productId: singlePurchaseItem.id,
            quantity: customQuantities[singlePurchaseItem.id] ?? singlePurchaseItem.deficit,
            equivalence: 1.0,
            costPrice: customCosts[singlePurchaseItem.id] ?? singlePurchaseItem.costPrice,
          },
        ]
      : plannerItems
          .filter(item => selectedItemIds.includes(item.id))
          .map(item => {
            const qty = customQuantities[item.id] ?? item.deficit;
            const cost = customCosts[item.id] ?? item.costPrice;
            return {
              productId: item.id,
              quantity: qty,
              equivalence: 1.0,
              costPrice: cost,
            };
          });

    const totalCost = itemsToBuy.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

    const submitToast = toast.loading("Registrando compra/pedido...");
    try {
      let finalReceiptUrl = "";
      if (bulkPurchaseFile) {
        const { uploadProductImageFile } = await import("../components/ui/ImageUploader");
        finalReceiptUrl = await uploadProductImageFile(bulkPurchaseFile);
      }

      await createPurchaseOrderRequest({
        items: itemsToBuy,
        totalCost,
        categoryId: bulkPurchaseData.categoryId,
        paymentMethod: bulkPurchaseData.paymentMethod,
        receiptUrl: finalReceiptUrl || null,
        receiveImmediately: bulkPurchaseData.receiveImmediately,
      });

      toast.dismiss(submitToast);
      toast.success(
        bulkPurchaseData.receiveImmediately
          ? "Compra registrada e ingresada al stock"
          : "Pedido de compra registrado en tránsito"
      );
      setIsBulkPurchaseModalOpen(false);
      // Reset state
      setSelectedItemIds([]);
      setSinglePurchaseItem(null);
      setBulkPurchaseFile(null);
      setBulkPurchaseData({
        categoryId: "",
        paymentMethod: "CASH",
        receiptUrl: "",
        receiveImmediately: false,
      });
      loadData();
      loadPlannerData();
      loadOrders();
    } catch (err: any) {
      toast.dismiss(submitToast);
      toast.error(err?.response?.data?.message || "Error al registrar la compra");
    }
  };

  const handleEditOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchaseOrder) return;
    if (!editOrderData.categoryId) {
      toast.error("Selecciona una categoría para el egreso");
      return;
    }

    const totalCost = editOrderData.items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
    const submitToast = toast.loading("Actualizando pedido/compra...");
    try {
      let finalReceiptUrl = editOrderData.receiptUrl;
      if (editOrderFile) {
        const { uploadProductImageFile } = await import("../components/ui/ImageUploader");
        finalReceiptUrl = await uploadProductImageFile(editOrderFile);
      }

      await updatePurchaseOrderRequest(editingPurchaseOrder.id, {
        items: editOrderData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          equivalence: item.equivalence || 1.0,
          presentationId: item.presentationId || null,
          presentationName: item.presentationName || null,
          costPrice: item.costPrice,
        })),
        totalCost,
        categoryId: editOrderData.categoryId,
        paymentMethod: editOrderData.paymentMethod,
        receiptUrl: finalReceiptUrl || null,
      });

      toast.dismiss(submitToast);
      toast.success("Pedido/Compra actualizado correctamente");
      setIsEditOrderModalOpen(false);
      setEditingPurchaseOrder(null);
      setEditOrderFile(null);
      
      loadData();
      loadPlannerData();
      loadOrders();
    } catch (err: any) {
      toast.dismiss(submitToast);
      toast.error(err?.response?.data?.message || "Error al actualizar pedido");
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    setConfirmConfig({
      title: "Ingresar Pedido a Stock",
      message: "¿Está seguro de que desea ingresar estos artículos al almacén? Esto incrementará el stock de los productos correspondientes y registrará la compra.",
      confirmText: "Pasar a Stock",
      cancelText: "Cancelar",
      variant: "info",
      onConfirm: async () => {
        const rxToast = toast.loading("Ingresando artículos al almacén...");
        try {
          await receivePurchaseOrderRequest(orderId);
          toast.dismiss(rxToast);
          toast.success("Artículos ingresados al stock correctamente");
          loadData();
          loadPlannerData();
          loadOrders();
        } catch (err: any) {
          toast.dismiss(rxToast);
          toast.error(err?.response?.data?.message || "Error al ingresar al stock");
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    setConfirmConfig({
      title: "Cancelar / Eliminar Pedido",
      message: "¿Estás seguro de que deseas cancelar y eliminar este pedido permanentemente? Esta acción no se puede deshacer.",
      confirmText: "Eliminar Pedido",
      cancelText: "Cancelar",
      variant: "danger",
      onConfirm: async () => {
        try {
          await deletePurchaseOrderRequest(orderId);
          toast.success("Pedido eliminado correctamente");
          loadOrders();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || "Error al eliminar pedido");
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const handleRevertOrder = async (orderId: string) => {
    setConfirmConfig({
      title: "Revertir Ingreso a Stock",
      message: "¿Está seguro de revertir este pedido y devolverlo a estado Pendiente? Se DESCONTARÁ del almacén la cantidad ingresada. Úselo sólo si cometió un error de carga.",
      confirmText: "Revertir Ingreso",
      cancelText: "Cancelar",
      variant: "warning",
      onConfirm: async () => {
        const rxToast = toast.loading("Revirtiendo artículos del almacén...");
        try {
          await revertPurchaseOrderRequest(orderId);
          toast.dismiss(rxToast);
          toast.success("Ingreso revertido y stock descontado correctamente");
          loadData();
          loadPlannerData();
          loadOrders();
        } catch (err: any) {
          toast.dismiss(rxToast);
          toast.error(err?.response?.data?.message || "Error al revertir ingreso");
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const handleExportExcel = async () => {
    const itemsToExport = selectedItemIds.length > 0
      ? plannerItems.filter(item => selectedItemIds.includes(item.id))
      : plannerItems;

    if (itemsToExport.length === 0) {
      toast.error("No hay elementos seleccionados para exportar");
      return;
    }

    const dataToExport = itemsToExport.map(item => {
      const buyQty = customQuantities[item.id] ?? item.deficit;
      const cost = customCosts[item.id] ?? item.costPrice;
      return {
        "Producto": item.name,
        "SKU / Código": item.sku || "Sin SKU",
        "Stock Actual": `${item.stock} ${item.unit}`,
        "Stock Mínimo": `${item.minStock} ${item.unit}`,
        "Vendidos (Mes)": `${item.soldQty} ${item.unit}`,
        "Déficit": `${item.deficit} ${item.unit}`,
        "Costo Unitario (S/)": cost,
        "Cantidad Comprar": buyQty,
        "Subtotal Proyectado (S/)": buyQty * cost
      };
    });

    const totalProyectado = itemsToExport.reduce((acc, item) => {
      const qty = customQuantities[item.id] ?? item.deficit;
      const cost = customCosts[item.id] ?? item.costPrice;
      return acc + (qty * cost);
    }, 0);

    dataToExport.push({
      "Producto": "TOTAL PLANIFICADO",
      "SKU / Código": "",
      "Stock Actual": "",
      "Stock Mínimo": "",
      "Vendidos (Mes)": "",
      "Déficit": "",
      "Costo Unitario (S/)": null as any,
      "Cantidad Comprar": null as any,
      "Subtotal Proyectado (S/)": totalProyectado
    });

    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plan de Compras");
    XLSX.writeFile(workbook, `Plan_Compras_${plannerMonth}.xlsx`);
    toast.success("Plan de compras exportado a Excel");
  };

  const handleExportPDF = async () => {
    const itemsToExport = selectedItemIds.length > 0
      ? plannerItems.filter(item => selectedItemIds.includes(item.id))
      : plannerItems;

    if (itemsToExport.length === 0) {
      toast.error("No hay elementos seleccionados para exportar");
      return;
    }

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const businessName = user?.businessName || "Control Finanzas";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`PLAN DE COMPRAS - ${businessName.toUpperCase()}`, 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo analizado: ${plannerMonth}`, 14, 26);
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 14, 31);

    let y = 42;
    doc.setFillColor(79, 70, 229);
    doc.rect(14, y, 182, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255);
    doc.text("Producto", 16, y + 5);
    doc.text("Stock Act / Min", 85, y + 5);
    doc.text("Déficit", 120, y + 5);
    doc.text("Costo U.", 140, y + 5);
    doc.text("Cant.", 160, y + 5);
    doc.text("Subtotal", 175, y + 5);

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    
    let grandTotal = 0;
    itemsToExport.forEach((item) => {
      y += 8;
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      
      const qty = customQuantities[item.id] ?? item.deficit;
      const cost = customCosts[item.id] ?? item.costPrice;
      const subtotal = qty * cost;
      grandTotal += subtotal;

      doc.setDrawColor(240);
      doc.line(14, y + 6, 196, y + 6);

      const name = item.name.length > 35 ? item.name.substring(0, 32) + "..." : item.name;
      doc.setFont("helvetica", "bold");
      doc.text(name, 16, y + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`SKU: ${item.sku || "Sin SKU"}`, 16, y + 8);
      doc.setFontSize(9);
      doc.setTextColor(0);

      doc.text(`${item.stock} / ${item.minStock} ${item.unit}`, 85, y + 5);
      doc.text(`${item.deficit} ${item.unit}`, 120, y + 5);
      doc.text(`S/ ${cost.toFixed(2)}`, 140, y + 5);
      doc.setFont("helvetica", "bold");
      doc.text(`${qty}`, 160, y + 5);
      doc.text(`S/ ${subtotal.toFixed(2)}`, 175, y + 5);
      doc.setFont("helvetica", "normal");
      y += 2;
    });

    y += 10;
    doc.setDrawColor(150);
    doc.line(14, y, 196, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL PLANIFICADO:", 110, y + 6);
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.text(`S/ ${grandTotal.toFixed(2)}`, 165, y + 6);

    doc.save(`Plan_Compras_${plannerMonth}.pdf`);
    toast.success("Plan de compras exportado a PDF");
  };

  const handleCopyShoppingList = () => {
    if (plannerItems.length === 0) {
      toast.error("No hay elementos en la lista de compras");
      return;
    }
    const lines = [
      `PLAN DE COMPRAS - PERIODO: ${plannerMonth}`,
      "------------------------------------------",
    ];
    let grandTotal = 0;
    plannerItems.forEach((item) => {
      const qty = customQuantities[item.id] || 0;
      const cost = customCosts[item.id] || 0;
      const total = qty * cost;
      grandTotal += total;
      lines.push(
        `- ${item.name} (${item.sku || "Sin SKU"}): Comprar ${qty} ${item.unit} | Costo unitario: S/ ${cost.toFixed(2)} | Subtotal: S/ ${total.toFixed(2)}`
      );
    });
    lines.push("------------------------------------------");
    lines.push(`COSTO TOTAL ESTIMADO: S/ ${grandTotal.toFixed(2)}`);

    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Lista de compras copiada al portapapeles");
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.brand && p.brand.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.family && p.family.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBrand = !filterBrandId || p.brandId === filterBrandId;
    const matchesFamily = !filterFamilyId || p.familyId === filterFamilyId;
    return matchesSearch && matchesBrand && matchesFamily;
  });

  const selectedPres = restockProduct?.presentations?.find(
    (p) => p.id === restockData.presentationId,
  );
  const restockEquivalence = selectedPres ? selectedPres.equivalence : 1;
  const restockEquivalencyText = `${restockData.quantity * restockEquivalence} ${restockProduct?.unit || ""}`;

  return (
    <Appshell>
      <div className="space-y-6">
        {/* PRINT STYLESHEET */}
        {activeTab === "labels" && (
          <style dangerouslySetInnerHTML={{
            __html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #print-area, #print-area * {
                  visibility: visible !important;
                }
                #print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `
          }} />
        )}

        {/* HEADER */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 border border-indigo-500 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500 opacity-20 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/20 shadow-sm">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-black tracking-tight">Inventario de Negocio</h1>
              <p className="text-indigo-100/80 font-medium mt-2 max-w-lg">
                Gestiona mercancías, controla stock bajo, genera etiquetas con códigos de barras y planifica compras de reabastecimiento.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/25 px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg"
              >
                <Camera className="w-5 h-5 text-indigo-200" />
                Escanear Cámara
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="bg-white hover:bg-indigo-50 text-indigo-900 px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-950/20"
              >
                <Plus className="w-5 h-5 text-indigo-700" />
                Nuevo Producto
              </button>
            </div>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex border-b border-gray-100 gap-6">
          {[
            { id: "products", label: "Productos en Stock", icon: Package },
            { id: "planner", label: "Planificador de Compras", icon: TrendingUp },
            { id: "labels", label: "Diseñar Tickets / Etiquetas", icon: BarcodeIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-4 pt-1 px-1 relative text-sm font-black uppercase tracking-wider transition-colors ${
                  isActive ? "text-indigo-600 font-extrabold" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* CONTENT SWITCHER WITH ANIMATIONS */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "products" && (
              <div className="space-y-6">
                {/* SEARCH + FILTER CONTROLS */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  {/* Search input */}
                  <div className="flex-1 flex items-center bg-white px-4 rounded-2xl shadow-sm border border-gray-100">
                    <Search className="w-5 h-5 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, SKU, marca o familia..."
                      className="w-full bg-transparent border-none focus:ring-0 text-sm py-3.5 px-3 outline-none font-medium text-gray-700"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="text-gray-300 hover:text-gray-500 ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Brand filter */}
                  {brands.length > 0 && (
                    <select
                      value={filterBrandId}
                      onChange={(e) => setFilterBrandId(e.target.value)}
                      className="bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-700 outline-none focus:border-indigo-400 min-w-[140px]"
                    >
                      <option value="">Todas las Marcas</option>
                      {brands.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Family filter */}
                  {families.length > 0 && (
                    <select
                      value={filterFamilyId}
                      onChange={(e) => setFilterFamilyId(e.target.value)}
                      className="bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-700 outline-none focus:border-indigo-400 min-w-[140px]"
                    >
                      <option value="">Todas las Familias</option>
                      {families.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Clear all filters */}
                  {(filterBrandId || filterFamilyId) && (
                    <button
                      onClick={() => { setFilterBrandId(""); setFilterFamilyId(""); }}
                      className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-2xl transition-all whitespace-nowrap"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                {/* Active filter chips */}
                {(filterBrandId || filterFamilyId) && (
                  <div className="flex flex-wrap gap-2">
                    {filterBrandId && (
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl border border-blue-100 flex items-center gap-1.5">
                        Marca: {brands.find(b => b.id === filterBrandId)?.name}
                        <button onClick={() => setFilterBrandId("")} className="text-blue-400 hover:text-blue-700 font-black">✕</button>
                      </span>
                    )}
                    {filterFamilyId && (
                      <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl border border-purple-100 flex items-center gap-1.5">
                        Familia: {families.find(f => f.id === filterFamilyId)?.name}
                        <button onClick={() => setFilterFamilyId("")} className="text-purple-400 hover:text-purple-700 font-black">✕</button>
                      </span>
                    )}
                    <span className="px-3 py-1.5 bg-gray-50 text-gray-500 text-xs font-bold rounded-xl border border-gray-100">
                      {filteredProducts.length} resultado{filteredProducts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                {/* PRODUCT GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-3xl p-4 animate-pulse border border-gray-100 shadow-sm"
                      >
                        <div className="w-full h-36 bg-gray-100 rounded-2xl mb-4"></div>
                        <div className="h-4 bg-gray-100 rounded-xl w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-100 rounded-xl w-1/2"></div>
                      </div>
                    ))
                  ) : filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-gray-400">
                      <Package className="w-16 h-16 mx-auto mb-4 opacity-30 text-indigo-500" />
                      <p className="font-extrabold text-lg text-gray-500">
                        No se encontraron productos. ¡Registra uno nuevo!
                      </p>
                    </div>
                  ) : (
                    filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group overflow-hidden flex flex-col relative"
                      >
                        {/* Product Image */}
                        <div className="relative w-full h-36 bg-gradient-to-br from-gray-50 to-indigo-50 overflow-hidden">
                          {p.imageUrl ? (
                            <img
                              src={getReceiptAbsoluteUrl(p.imageUrl) || p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-12 h-12 text-indigo-100" />
                            </div>
                          )}
                          {/* Stock status badge */}
                          <div
                            className={`absolute top-3 right-3 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm ${
                              p.stock <= p.minStock
                                ? "bg-rose-500 text-white"
                                : "bg-emerald-500 text-white"
                            }`}
                          >
                            {p.stock <= p.minStock ? "Stock bajo" : "En Stock"}
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex-1">
                            <h3 className="font-black text-gray-900 text-sm leading-tight mb-1 truncate" title={p.name}>
                              {p.name}
                            </h3>
                            {p.sku ? (
                              <p className="text-[10px] text-gray-400 font-bold font-mono tracking-tight mb-1.5">
                                SKU / BAR: {p.sku}
                              </p>
                            ) : (
                              <p className="text-[10px] text-gray-300 italic mb-1.5">Sin código</p>
                            )}

                            {/* Brand / Family Badges */}
                            {(p.brand || p.family) && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {p.brand && (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black border border-blue-100/70" title="Marca">
                                    {p.brand.name}
                                  </span>
                                )}
                                {p.family && (
                                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-black border border-purple-100/70" title="Familia">
                                    {p.family.name}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-1 mb-3">
                              {p.presentations && p.presentations.length > 0 ? (
                                p.presentations.slice(0, 3).map((pres) => (
                                  <span
                                    key={pres.id}
                                    className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg text-[9px] font-black"
                                    title={`Equivale a ${pres.equivalence} ${p.unit}`}
                                  >
                                    {pres.name}
                                  </span>
                                ))
                              ) : null}
                            </div>

                            <div className="bg-slate-50/80 rounded-2xl p-3 mb-4 border border-slate-100">
                              <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest mb-0.5">
                                Stock disponible
                              </div>
                              <div className="font-black text-gray-900 text-xs flex items-baseline gap-1">
                                <span className="text-sm font-extrabold">{formatStock(p.stock, p.unit, p.presentations)}</span>
                              </div>
                              <div className="text-[9px] text-gray-400 mt-0.5">
                                ({p.stock} {p.unit} base • min: {p.minStock})
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                              <div>
                                <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">
                                  Costo
                                </div>
                                <div className="text-sm font-bold text-gray-700">
                                  S/ {p.costPrice.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">
                                  Venta
                                </div>
                                <div className="text-sm font-black text-indigo-600">
                                  S/ {p.salePrice.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="flex gap-1.5 mt-4 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => {
                                setRestockProduct(p);
                                setRestockData({
                                  quantity: 1,
                                  presentationId: p.presentations?.[0]?.id || "",
                                  totalCost: p.costPrice * (p.presentations?.[0]?.equivalence || 1),
                                  categoryId: "",
                                  paymentMethod: "CASH",
                                });
                                setIsRestockModalOpen(true);
                              }}
                              className="flex-grow py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                              title="Reponer Stock"
                            >
                              <TrendingUp className="w-3.5 h-3.5" /> Comprar
                            </button>
                            <button
                              onClick={() => handleOpenModal(p)}
                              className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors flex items-center justify-center"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleClone(p)}
                              className="px-3 py-2 bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-colors flex items-center justify-center"
                              title="Clonar Modelo (Mismo Modelo / Nuevo Código)"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setProductIdToDelete(p.id);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="px-2.5 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors flex items-center justify-center"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "planner" && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
                  {/* PLANNER CONTROLS */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5">
                    <div className="space-y-1">
                      <h2 className="text-xl font-black text-gray-900">Planificador e Historial de Reabastecimiento</h2>
                      <p className="text-sm text-gray-500 font-medium">
                        Monitorea productos por debajo del stock mínimo y evalúa el ritmo de ventas mensual para calcular la compra.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-700">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span>Analizar ventas del mes:</span>
                        <input
                          type="month"
                          value={plannerMonth}
                          onChange={(e) => setPlannerMonth(e.target.value)}
                          className="bg-transparent border-none outline-none font-bold text-indigo-600 ml-1 cursor-pointer focus:ring-0 p-0 text-xs"
                        />
                      </div>
                      <button
                        onClick={handleCopyShoppingList}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
                      >
                        <Clipboard className="w-4 h-4" />
                        Copiar
                      </button>
                      <button
                        onClick={handleExportExcel}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
                        title="Exportar a Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        Excel
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
                        title="Exportar a PDF"
                      >
                        <FileText className="w-4 h-4" />
                        PDF
                      </button>
                    </div>
                  </div>

                  {/* PLANNER TABLE */}
                  {plannerLoading ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-gray-400">
                      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                      <p className="font-bold text-sm">Calculando análisis de abastecimiento...</p>
                    </div>
                  ) : plannerItems.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 flex flex-col items-center">
                      <Sparkles className="w-12 h-12 text-emerald-500 mb-3 opacity-60" />
                      <p className="font-extrabold text-gray-800 text-lg">¡Stock Óptimo!</p>
                      <p className="text-xs text-gray-500 font-medium mt-1">Ninguno de tus productos se encuentra por debajo del stock mínimo en este momento.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="overflow-x-auto rounded-2xl border border-gray-100">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-500">
                              <th className="py-4 px-4 text-center" style={{ width: "40px" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedItemIds.length === plannerItems.length && plannerItems.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedItemIds(plannerItems.map((item) => item.id));
                                    } else {
                                      setSelectedItemIds([]);
                                    }
                                  }}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                              </th>
                              <th className="py-4 px-5">Producto</th>
                              <th className="py-4 px-4 text-center">Stock Actual</th>
                              <th className="py-4 px-4 text-center">Stock Mínimo</th>
                              <th className="py-4 px-4 text-center text-indigo-600">Vendidos en Mes</th>
                              <th className="py-4 px-4 text-center">Déficit</th>
                              <th className="py-4 px-4 text-right">Costo Unitario (S/)</th>
                              <th className="py-4 px-4 text-center" style={{ width: "130px" }}>Comprar Cant.</th>
                              <th className="py-4 px-4 text-right text-indigo-700">Subtotal Proyectado</th>
                              <th className="py-4 px-4 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-sm">
                            {plannerItems.map((item) => {
                              const buyQty = customQuantities[item.id] ?? item.deficit;
                              const cost = customCosts[item.id] ?? item.costPrice;
                              const subtotal = buyQty * cost;
                              return (
                                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-3.5 px-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedItemIds.includes(item.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedItemIds([...selectedItemIds, item.id]);
                                        } else {
                                          setSelectedItemIds(selectedItemIds.filter((id) => id !== item.id));
                                        }
                                      }}
                                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-3">
                                      {item.imageUrl ? (
                                        <img
                                          src={getReceiptAbsoluteUrl(item.imageUrl) || item.imageUrl}
                                          alt={item.name}
                                          className="w-10 h-10 object-cover rounded-xl border border-gray-100"
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                        />
                                      ) : (
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                          <Package className="w-5 h-5" />
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-extrabold text-gray-900">{item.name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono font-semibold">{item.sku || "Sin SKU"}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-bold text-rose-600">
                                    {item.stock} {item.unit}
                                  </td>
                                  <td className="py-3.5 px-4 text-center text-gray-500 font-bold">
                                    {item.minStock} {item.unit}
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-extrabold text-indigo-600 bg-indigo-50/20">
                                    {item.soldQty} {item.unit}
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                                    {item.deficit} {item.unit}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-medium">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={cost}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setCustomCosts({ ...customCosts, [item.id]: val });
                                      }}
                                      className="w-20 px-2 py-1 border border-gray-200 rounded-lg outline-none text-right focus:ring-1 focus:ring-indigo-500 bg-white text-xs font-bold text-gray-700"
                                    />
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={buyQty}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setCustomQuantities({ ...customQuantities, [item.id]: val });
                                      }}
                                      className="w-20 px-2 py-1 border border-gray-200 rounded-lg outline-none text-center focus:ring-1 focus:ring-indigo-500 bg-white text-xs font-bold text-gray-700"
                                    />
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-black text-indigo-700">
                                    S/ {subtotal.toFixed(2)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => {
                                          setSinglePurchaseItem(item);
                                          setBulkPurchaseFile(null);
                                          setBulkPurchaseData({
                                            categoryId: "",
                                            paymentMethod: "CASH",
                                            receiptUrl: "",
                                            receiveImmediately: false,
                                          });
                                          setIsBulkPurchaseModalOpen(true);
                                        }}
                                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                        title="Registrar pedido de compra en tránsito para este producto"
                                      >
                                        Comprar
                                      </button>
                                      <button
                                        onClick={() => handleOpenModal(item)}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
                                        title="Editar datos de ficha técnica"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {/* TOTALS ROW */}
                            <tr className="bg-slate-50/80 font-black border-t-2 border-slate-200">
                              <td className="py-4 px-4 text-center"></td>
                              <td className="py-4 px-5 text-gray-700">Total Planificado (Todos)</td>
                              <td colSpan={6}></td>
                              <td className="py-4 px-4 text-right text-indigo-900 text-base">
                                S/ {plannerItems.reduce((acc, item) => {
                                  const qty = customQuantities[item.id] ?? item.deficit;
                                  const cost = customCosts[item.id] ?? item.costPrice;
                                  return acc + (qty * cost);
                                }, 0).toFixed(2)}
                              </td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* BULK ACTIONS BANNER */}
                      <div className="flex flex-col sm:flex-row justify-between items-center bg-indigo-50 border border-indigo-100 p-4 rounded-2xl gap-4">
                        <div className="text-xs font-bold text-indigo-900">
                          {selectedItemIds.length === 0 ? (
                            <span>No has seleccionado productos.</span>
                          ) : (
                            <span>
                              Has seleccionado <span className="text-indigo-600 font-extrabold">{selectedItemIds.length}</span> producto(s) para compra masiva. Costo total estimado: <span className="text-indigo-600 font-black text-sm">S/ {plannerItems
                                .filter(item => selectedItemIds.includes(item.id))
                                .reduce((acc, item) => {
                                  const qty = customQuantities[item.id] ?? item.deficit;
                                  const cost = customCosts[item.id] ?? item.costPrice;
                                  return acc + (qty * cost);
                                }, 0).toFixed(2)}</span>
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (selectedItemIds.length === 0) {
                              toast.error("Selecciona al menos un producto para comprar.");
                              return;
                            }
                            setIsBulkPurchaseModalOpen(true);
                          }}
                          disabled={selectedItemIds.length === 0}
                          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          Comprar Seleccionados ({selectedItemIds.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* PEDIDOS EN TRÁNSITO */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-black text-gray-900">Control de Pedidos y Compras</h3>
                    </div>
                    {/* Sub-tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setOrdersSubTab("pending")}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${ordersSubTab === "pending" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                      >
                        En Tránsito
                        {purchaseOrders.filter(o => o.status === "ORDERED").length > 0 && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                            {purchaseOrders.filter(o => o.status === "ORDERED").length}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrdersSubTab("received")}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${ordersSubTab === "received" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                      >
                        Compras Realizadas
                        {purchaseOrders.filter(o => o.status === "RECEIVED").length > 0 && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                            {purchaseOrders.filter(o => o.status === "RECEIVED").length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {ordersLoading ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                      <p className="font-bold text-xs">Cargando pedidos...</p>
                    </div>
                  ) : ordersSubTab === "pending" ? (
                    purchaseOrders.filter(o => o.status === "ORDERED").length === 0 ? (
                      <div className="py-12 bg-slate-50 border border-dashed border-gray-200 rounded-3xl text-center text-gray-400 flex flex-col items-center justify-center">
                        <Truck className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="font-bold text-sm text-gray-700">No hay pedidos en tránsito</p>
                        <p className="text-xs text-gray-500 mt-0.5">Todas tus compras anteriores están ingresadas en stock.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {purchaseOrders.filter(o => o.status === "ORDERED").map((order) => (
                          <div key={order.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] text-gray-400 font-mono font-bold block">ID: {order.id.slice(0, 8).toUpperCase()}</span>
                                <span className="text-xs text-gray-500 font-medium block mt-0.5">
                                  {new Date(order.createdAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                                </span>
                              </div>
                              <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">
                                En Pedido
                              </span>
                            </div>
                            
                            {/* List items */}
                            <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1.5 max-h-40 overflow-y-auto font-medium text-gray-600 font-bold">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between font-medium">
                                  <span>• {item.quantity} x {item.product?.name || "Producto"} ({item.presentationName || item.product?.unit || "Unidad"})</span>
                                  <span className="font-bold text-gray-800">S/ {(item.quantity * item.costPrice).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500 font-semibold">Total Costo:</span>
                              <span className="text-base font-black text-indigo-700">S/ {order.totalCost.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500 font-semibold">Método Pago:</span>
                              <span className="font-bold text-gray-800 bg-slate-100 px-2 py-0.5 rounded-lg">{order.paymentMethod}</span>
                            </div>

                             {order.receiptUrl && (
                              <div className="pt-1">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Comprobante</span>
                                {order.receiptUrl.toLowerCase().endsWith(".pdf") ? (
                                  <a
                                    href={getReceiptAbsoluteUrl(order.receiptUrl) || undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-gray-150 rounded-xl hover:bg-indigo-50/30 hover:border-indigo-200 transition-colors group cursor-pointer"
                                  >
                                    <FileText className="w-4 h-4 text-rose-500" />
                                    <span className="text-xs font-bold text-gray-700 group-hover:text-indigo-700 transition-colors truncate max-w-[120px]">
                                      Comprobante.pdf
                                    </span>
                                    <Eye className="w-3.5 h-3.5 text-indigo-500 ml-auto" />
                                  </a>
                                ) : (
                                  <a
                                    href={getReceiptAbsoluteUrl(order.receiptUrl) || undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="relative block rounded-xl overflow-hidden border border-gray-100 group cursor-pointer max-w-[120px] aspect-[4/3] bg-slate-50"
                                  >
                                    <img
                                      src={getReceiptAbsoluteUrl(order.receiptUrl) || undefined}
                                      alt="Comprobante"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Eye className="w-5 h-5 text-white" />
                                    </div>
                                  </a>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleReceiveOrder(order.id)}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs py-2.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-50 active:scale-95 transition-all"
                              >
                                <Check className="w-4 h-4" />
                                Pasar a Stock
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPurchaseOrder(order);
                                  setEditOrderData({
                                    categoryId: order.categoryId,
                                    paymentMethod: order.paymentMethod,
                                    receiptUrl: order.receiptUrl || "",
                                    items: order.items.map(item => ({
                                      id: item.id,
                                      productId: item.productId,
                                      name: item.product?.name || "Producto",
                                      quantity: item.quantity,
                                      costPrice: item.costPrice,
                                      unit: item.product?.unit || "Unidad",
                                      equivalence: item.equivalence,
                                      presentationId: item.presentationId,
                                      presentationName: item.presentationName,
                                    })),
                                  });
                                  setEditOrderFile(null);
                                  setIsEditOrderModalOpen(true);
                                }}
                                className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl active:scale-95 transition-all flex items-center justify-center"
                                title="Editar Pedido"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl active:scale-95 transition-all flex items-center justify-center"
                                title="Cancelar Pedido"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    purchaseOrders.filter(o => o.status === "RECEIVED").length === 0 ? (
                      <div className="py-12 bg-slate-50 border border-dashed border-gray-200 rounded-3xl text-center text-gray-400 flex flex-col items-center justify-center">
                        <Truck className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="font-bold text-sm text-gray-700">No hay compras ingresadas</p>
                        <p className="text-xs text-gray-500 mt-0.5">Ingresa tus pedidos en tránsito a stock para visualizarlas aquí.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {purchaseOrders.filter(o => o.status === "RECEIVED").map((order) => (
                          <div key={order.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] text-gray-400 font-mono font-bold block">ID: {order.id.slice(0, 8).toUpperCase()}</span>
                                <span className="text-xs text-gray-500 font-medium block mt-0.5">
                                  {new Date(order.createdAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}
                                </span>
                              </div>
                              <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">
                                Ingresado
                              </span>
                            </div>
                            
                            {/* List items */}
                            <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1.5 max-h-40 overflow-y-auto font-medium text-gray-600 font-bold">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between font-medium">
                                  <span>• {item.quantity} x {item.product?.name || "Producto"} ({item.presentationName || item.product?.unit || "Unidad"})</span>
                                  <span className="font-bold text-gray-800">S/ {(item.quantity * item.costPrice).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500 font-semibold">Total Costo:</span>
                              <span className="text-base font-black text-indigo-700">S/ {order.totalCost.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500 font-semibold">Método Pago:</span>
                              <span className="font-bold text-gray-800 bg-slate-100 px-2 py-0.5 rounded-lg">{order.paymentMethod}</span>
                            </div>

                            {order.receiptUrl && (
                              <div className="pt-1">
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Comprobante</span>
                                {order.receiptUrl.toLowerCase().endsWith(".pdf") ? (
                                  <a
                                    href={getReceiptAbsoluteUrl(order.receiptUrl) || undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-gray-150 rounded-xl hover:bg-indigo-50/30 hover:border-indigo-200 transition-colors group cursor-pointer"
                                  >
                                    <FileText className="w-4 h-4 text-rose-500" />
                                    <span className="text-xs font-bold text-gray-700 group-hover:text-indigo-700 transition-colors truncate max-w-[120px]">
                                      Comprobante.pdf
                                    </span>
                                    <Eye className="w-3.5 h-3.5 text-indigo-500 ml-auto" />
                                  </a>
                                ) : (
                                  <a
                                    href={getReceiptAbsoluteUrl(order.receiptUrl) || undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="relative block rounded-xl overflow-hidden border border-gray-100 group cursor-pointer max-w-[120px] aspect-[4/3] bg-slate-50"
                                  >
                                    <img
                                      src={getReceiptAbsoluteUrl(order.receiptUrl) || undefined}
                                      alt="Comprobante"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <Eye className="w-5 h-5 text-white" />
                                    </div>
                                  </a>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleRevertOrder(order.id)}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-2.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-sm shadow-amber-50 active:scale-95 transition-all"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Revertir
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPurchaseOrder(order);
                                  setEditOrderData({
                                    categoryId: order.categoryId,
                                    paymentMethod: order.paymentMethod,
                                    receiptUrl: order.receiptUrl || "",
                                    items: order.items.map(item => ({
                                      id: item.id,
                                      productId: item.productId,
                                      name: item.product?.name || "Producto",
                                      quantity: item.quantity,
                                      costPrice: item.costPrice,
                                      unit: item.product?.unit || "Unidad",
                                      equivalence: item.equivalence,
                                      presentationId: item.presentationId,
                                      presentationName: item.presentationName,
                                    })),
                                  });
                                  setEditOrderFile(null);
                                  setIsEditOrderModalOpen(true);
                                }}
                                className="px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl active:scale-95 transition-all flex items-center justify-center"
                                title="Editar Compra"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {activeTab === "labels" && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-5 no-print">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-gray-900">Impresión de Tickets y Código de Barras</h2>
                    <p className="text-sm text-gray-500 font-medium">
                      Genera boletines de tickets adhesivos para pegar en tus zapatillas, electrodomésticos u otros artículos.
                    </p>
                  </div>
                  <button
                    disabled={!ticketProductId}
                    onClick={() => window.print()}
                    className="bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-indigo-500/20"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Boletín
                  </button>
                </div>

                {/* FORM CONTROLS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-2xl border border-gray-100 no-print">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">Producto a Etiquetar</label>
                    <select
                      value={ticketProductId}
                      onChange={(e) => setTicketProductId(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-gray-700 shadow-sm"
                    >
                      <option value="">-- Selecciona un Producto --</option>
                      {products.filter(p => p.sku).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">Cantidad de Tickets (Copia)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={ticketQuantity}
                      onChange={(e) => setTicketQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-gray-700 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 mb-2">Nombre Comercial del Ticket</label>
                    <input
                      type="text"
                      value={ticketBusinessName}
                      onChange={(e) => setTicketBusinessName(e.target.value)}
                      placeholder="Nombre de tienda"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-gray-700 shadow-sm"
                    />
                  </div>
                </div>

                {/* TICKET SHEET PREVIEW */}
                {!ticketProductId ? (
                  <div className="py-20 text-center text-gray-400 no-print">
                    <BarcodeIcon className="w-16 h-16 mx-auto mb-3 opacity-20 text-indigo-600" />
                    <p className="font-extrabold">Seleccione un producto para generar la vista previa de etiquetas.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest no-print">Vista previa de impresión</h3>
                    <div id="print-area" className="bg-white border border-gray-200 rounded-3xl p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {Array.from({ length: ticketQuantity }).map((_, index) => {
                          const prod = products.find(p => p.id === ticketProductId);
                          return (
                            <div
                              key={index}
                              className="border-2 border-dashed border-gray-300 bg-white p-3 rounded-2xl flex flex-col justify-between items-center text-center w-full aspect-[4/3] min-h-[140px] shadow-sm select-none"
                            >
                              <div className="text-[8px] font-black uppercase text-indigo-600 tracking-wider w-full truncate">
                                {ticketBusinessName}
                              </div>
                              <div className="text-[10px] font-extrabold text-gray-900 leading-tight w-full truncate px-1">
                                {prod?.name}
                              </div>
                              <div className="text-xs font-black text-slate-800 my-0.5">
                                S/ {prod?.salePrice.toFixed(2)}
                              </div>
                              <svg className="barcode-preview-svg w-full max-h-[45px]"></svg>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* MODAL: Crear/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IMAGEN DEL PRODUCTO */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              Foto del Producto (opcional)
            </label>
            <ProductImageUploader
              currentImageUrl={formData.imageUrl}
              onUploadSuccess={(url) =>
                setFormData({ ...formData, imageUrl: url })
              }
              onClear={() => setFormData({ ...formData, imageUrl: "" })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej. Zapatillas Nike Air Max, Licuadora Oster, Smart TV 55&quot;"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej. Talla 41, Color Negro, Motor 800W, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                SKU / Código de Barras
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                placeholder="Ej. 1912509111, NIK-41-NEG"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Unidad Principal
              </label>
              <select
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Unidad">Unidad</option>
                <option value="Kg">Kg</option>
                <option value="Litro">Litro</option>
                <option value="Metro">Metro</option>
                <option value="Par">Par</option>
                <option value="Caja">Caja</option>
                <option value="Rollo">Rollo</option>
                <option value="Saco">Saco</option>
                <option value="Bolsa">Bolsa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Stock Inicial ({formData.unit})
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Stock Mínimo (Alerta)
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={formData.minStock}
                onChange={(e) =>
                  setFormData({ ...formData, minStock: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Marca
                </label>
                <button
                  type="button"
                  onClick={() => setIsManageBrandsModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  + Gestionar
                </button>
              </div>
              <select
                value={formData.brandId}
                onChange={(e) =>
                  setFormData({ ...formData, brandId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">-- Ninguna --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Familia / Grupo
                </label>
                <button
                  type="button"
                  onClick={() => setIsManageBrandsModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  + Gestionar
                </button>
              </div>
              <select
                value={formData.familyId}
                onChange={(e) =>
                  setFormData({ ...formData, familyId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">-- Ninguna --</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                P. Compra (Costo Base) S/
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    costPrice: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                P. Venta (Base) S/
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.salePrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salePrice: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* PRESENTATIONS */}
            <div className="md:col-span-2 border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-700">
                  Presentaciones / Empaques
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      presentations: [
                        ...formData.presentations,
                        { name: "", equivalence: 1, price: formData.salePrice },
                      ],
                    })
                  }
                  className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100"
                >
                  + Agregar Presentación
                </button>
              </div>

              {formData.presentations.length === 0 ? (
                <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-xl">
                  Sin presentaciones adicionales. Se venderá por {formData.unit}
                  .
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.presentations.map((pres, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100"
                    >
                      <input
                        type="text"
                        required
                        placeholder="Ej. Caja, Par, etc."
                        value={pres.name}
                        onChange={(e) => {
                          const newPres = [...formData.presentations];
                          newPres[index] = {
                            ...newPres[index],
                            name: e.target.value,
                          };
                          setFormData({ ...formData, presentations: newPres });
                        }}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-400 text-[10px]">= </span>
                        <input
                          type="number"
                          required
                          min="0.001"
                          step="any"
                          value={pres.equivalence}
                          onChange={(e) => {
                            const newPres = [...formData.presentations];
                            newPres[index] = {
                              ...newPres[index],
                              equivalence: Number(e.target.value),
                            };
                            setFormData({
                              ...formData,
                              presentations: newPres,
                            });
                          }}
                          className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg outline-none text-center focus:ring-1 focus:ring-indigo-500 bg-white text-xs"
                        />
                        <span className="text-gray-500 font-bold text-[10px]">
                          {formData.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-400 text-[10px]">S/</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={pres.price}
                          onChange={(e) => {
                            const newPres = [...formData.presentations];
                            newPres[index] = {
                              ...newPres[index],
                              price: Number(e.target.value),
                            };
                            setFormData({
                              ...formData,
                              presentations: newPres,
                            });
                          }}
                          className="w-18 px-2 py-1.5 border border-gray-200 rounded-lg outline-none text-right focus:ring-1 focus:ring-indigo-500 bg-white text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newPres = formData.presentations.filter(
                            (_, i) => i !== index,
                          );
                          setFormData({ ...formData, presentations: newPres });
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-500/30"
            >
              Guardar Producto
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Reponer Stock / Comprar */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        title="Comprar / Reponer Stock"
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4 flex gap-4 items-center">
            {restockProduct?.imageUrl && (
              <img
                src={
                  getReceiptAbsoluteUrl(restockProduct.imageUrl) ||
                  restockProduct.imageUrl
                }
                alt={restockProduct.name}
                className="w-14 h-14 object-cover rounded-xl border border-indigo-200"
                onError={(e) =>
                  ((e.target as HTMLImageElement).style.display = "none")
                }
              />
            )}
            <div>
              <h4 className="font-bold text-indigo-900">
                {restockProduct?.name}
              </h4>
              <p className="text-sm text-indigo-700 font-medium mt-1">
                Stock Actual:{" "}
                {restockProduct
                  ? formatStock(
                      restockProduct.stock,
                      restockProduct.unit,
                      restockProduct.presentations,
                    )
                  : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Comprar en presentación
              </label>
              <select
                value={restockData.presentationId}
                onChange={(e) => {
                  const presId = e.target.value;
                  const pres = restockProduct?.presentations?.find(
                    (p) => p.id === presId,
                  );
                  const equiv = pres ? pres.equivalence : 1;
                  const qty = restockData.quantity || 1;
                  setRestockData({
                    ...restockData,
                    presentationId: presId,
                    totalCost: qty * (restockProduct?.costPrice || 0) * equiv,
                  });
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">
                  {restockProduct?.unit} (Unidad Principal)
                </option>
                {restockProduct?.presentations?.map((pres) => (
                  <option key={pres.id} value={pres.id}>
                    {pres.name} (Equivale a {pres.equivalence}{" "}
                    {restockProduct.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Cantidad a comprar
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={restockData.quantity}
                onChange={(e) => {
                  const qty = Number(e.target.value);
                  setRestockData({
                    ...restockData,
                    quantity: qty,
                    totalCost:
                      qty *
                      (restockProduct?.costPrice || 0) *
                      restockEquivalence,
                  });
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Costo Total (S/)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={restockData.totalCost}
                onChange={(e) =>
                  setRestockData({
                    ...restockData,
                    totalCost: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="col-span-2 text-xs font-bold text-gray-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 flex justify-between">
              <span>Total a cargar al inventario:</span>
              <span className="text-emerald-600 font-extrabold">
                {restockEquivalencyText}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Categoría del Gasto
              </label>
              <select
                required
                value={restockData.categoryId}
                onChange={(e) =>
                  setRestockData({ ...restockData, categoryId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Seleccione...</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Método de Pago
              </label>
              <select
                value={restockData.paymentMethod}
                onChange={(e) =>
                  setRestockData({
                    ...restockData,
                    paymentMethod: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta</option>
                <option value="YAPE">Yape/Plin</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
            Al guardar, se sumará el stock al inventario y se registrará un{" "}
            <b>Egreso Operativo</b> en tus finanzas por S/{" "}
            {restockData.totalCost.toFixed(2)}.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsRestockModalOpen(false)}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={categories.length === 0}
              className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-500/30 flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" /> Ejecutar Compra
            </button>
          </div>
        </form>
      </Modal>

      {/* BULK PURCHASE MODAL */}
      <Modal
        isOpen={isBulkPurchaseModalOpen}
        onClose={() => {
          setIsBulkPurchaseModalOpen(false);
          setSinglePurchaseItem(null);
          setBulkPurchaseFile(null);
        }}
        title={singlePurchaseItem ? "Registrar Compra / Pedido Individual" : "Registrar Compra / Pedido Grupal"}
      >
        <form onSubmit={handleBulkPurchaseSubmit} className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs space-y-2 text-indigo-950 font-medium">
            <span className="font-extrabold text-sm block mb-1">Resumen del Pedido</span>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
              {singlePurchaseItem ? (
                (() => {
                  const qty = customQuantities[singlePurchaseItem.id] ?? singlePurchaseItem.deficit;
                  const cost = customCosts[singlePurchaseItem.id] ?? singlePurchaseItem.costPrice;
                  return (
                    <div className="flex justify-between">
                      <span>• {qty} x {singlePurchaseItem.name}</span>
                      <span className="font-black">S/ {(qty * cost).toFixed(2)}</span>
                    </div>
                  );
                })()
              ) : (
                plannerItems
                  .filter(item => selectedItemIds.includes(item.id))
                  .map(item => {
                    const qty = customQuantities[item.id] ?? item.deficit;
                    const cost = customCosts[item.id] ?? item.costPrice;
                    return (
                      <div key={item.id} className="flex justify-between">
                        <span>• {qty} x {item.name}</span>
                        <span className="font-black">S/ {(qty * cost).toFixed(2)}</span>
                      </div>
                    );
                  })
              )}
            </div>
            <div className="border-t border-indigo-200/50 pt-2 flex justify-between font-black text-sm">
              <span>Total Estimado:</span>
              <span>
                S/ {singlePurchaseItem ? (
                  (() => {
                    const qty = customQuantities[singlePurchaseItem.id] ?? singlePurchaseItem.deficit;
                    const cost = customCosts[singlePurchaseItem.id] ?? singlePurchaseItem.costPrice;
                    return (qty * cost).toFixed(2);
                  })()
                ) : (
                  plannerItems
                    .filter(item => selectedItemIds.includes(item.id))
                    .reduce((sum, item) => {
                      const qty = customQuantities[item.id] ?? item.deficit;
                      const cost = customCosts[item.id] ?? item.costPrice;
                      return sum + (qty * cost);
                    }, 0)
                    .toFixed(2)
                )}
              </span>
            </div>
          </div>

          {/* COMPROBANTE DE COMPRA */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Comprobante de Pago (Imagen o PDF)
            </label>
            {bulkPurchaseFile ? (
              <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-gray-700 truncate">{bulkPurchaseFile.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium font-mono">{(bulkPurchaseFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkPurchaseFile(null)}
                  className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10 rounded-2xl cursor-pointer transition-all">
                <FileText className="w-7 h-7 text-indigo-400 mb-1.5" />
                <span className="text-xs font-bold text-gray-600">Seleccionar Comprobante</span>
                <span className="text-[9px] text-gray-400 mt-0.5">Formatos aceptados: JPG, PNG, PDF</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setBulkPurchaseFile(file);
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Categoría del Egreso *
              </label>
              <select
                required
                value={bulkPurchaseData.categoryId}
                onChange={(e) =>
                  setBulkPurchaseData({ ...bulkPurchaseData, categoryId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 bg-white text-xs font-bold text-gray-700"
              >
                <option value="">Selecciona categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Método de Pago
              </label>
              <select
                value={bulkPurchaseData.paymentMethod}
                onChange={(e) =>
                  setBulkPurchaseData({ ...bulkPurchaseData, paymentMethod: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 bg-white text-xs font-bold text-gray-700"
              >
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="YAPE">Yape</option>
                <option value="PLIN">Plin</option>
                <option value="CARD">Tarjeta</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="receiveImmediately"
              checked={bulkPurchaseData.receiveImmediately}
              onChange={(e) =>
                setBulkPurchaseData({ ...bulkPurchaseData, receiveImmediately: e.target.checked })
              }
              className="w-4.5 h-4.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="receiveImmediately" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
              Ingresar directamente al almacén (Stock físico)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setIsBulkPurchaseModalOpen(false);
                setSinglePurchaseItem(null);
                setBulkPurchaseFile(null);
              }}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors"
            >
              Confirmar Pedido / Compra
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT PURCHASE ORDER MODAL */}
      <Modal
        isOpen={isEditOrderModalOpen}
        onClose={() => {
          setIsEditOrderModalOpen(false);
          setEditingPurchaseOrder(null);
          setEditOrderFile(null);
        }}
        title="Editar Registro de Compra / Pedido"
      >
        {editingPurchaseOrder && (
          <form onSubmit={handleEditOrderSubmit} className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
              <span className="font-extrabold text-sm text-indigo-950 block">Lista de Artículos</span>
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {editOrderData.items.map((item, index) => {
                  return (
                    <div key={item.id || index} className="bg-white p-3 rounded-xl border border-indigo-100/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-xs text-gray-800 truncate block max-w-[170px]">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.presentationName || item.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (editOrderData.items.length <= 1) {
                                toast.error("El pedido debe tener al menos 1 producto. Si deseas cancelarlo por completo, elimínalo desde el menú principal.");
                                return;
                              }
                              const updatedItems = editOrderData.items.filter((_, idx) => idx !== index);
                              setEditOrderData({ ...editOrderData, items: updatedItems });
                            }}
                            className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Quitar artículo del pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">Cantidad</label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updatedItems = [...editOrderData.items];
                              updatedItems[index].quantity = val;
                              setEditOrderData({ ...editOrderData, items: updatedItems });
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">Costo Unit (S/)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.costPrice}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updatedItems = [...editOrderData.items];
                              updatedItems[index].costPrice = val;
                              setEditOrderData({ ...editOrderData, items: updatedItems });
                            }}
                            className="w-full px-2 py-1 bg-slate-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end text-[10px] font-black text-indigo-600 pt-0.5">
                        Subtotal: S/ {(item.quantity * item.costPrice).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-indigo-200/50 pt-2 flex justify-between font-black text-sm text-indigo-950">
                <span>Total Actualizado:</span>
                <span>
                  S/ {editOrderData.items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* COMPROBANTE DE COMPRA */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                Comprobante de Pago (Imagen o PDF)
              </label>
              {editOrderFile ? (
                <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-gray-700 truncate">{editOrderFile.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium font-mono">{(editOrderFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditOrderFile(null)}
                    className="p-1 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : editOrderData.receiptUrl ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-emerald-800 truncate">Comprobante guardado</p>
                      <a
                        href={getReceiptAbsoluteUrl(editOrderData.receiptUrl) || undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                      >
                        Ver archivo actual
                      </a>
                    </div>
                  </div>
                  <label className="cursor-pointer text-[10px] font-black text-indigo-600 bg-white hover:bg-indigo-50 px-2.5 py-1.5 border border-indigo-200 rounded-lg shadow-sm">
                    Reemplazar
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setEditOrderFile(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10 rounded-2xl cursor-pointer transition-all">
                  <FileText className="w-7 h-7 text-indigo-400 mb-1.5" />
                  <span className="text-xs font-bold text-gray-600">Subir Comprobante</span>
                  <span className="text-[9px] text-gray-400 mt-0.5">JPG, PNG, PDF</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setEditOrderFile(file);
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Categoría del Egreso *
                </label>
                <select
                  required
                  value={editOrderData.categoryId}
                  onChange={(e) =>
                    setEditOrderData({ ...editOrderData, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 bg-white text-xs font-bold text-gray-700"
                >
                  <option value="">Selecciona categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Método de Pago
                </label>
                <select
                  value={editOrderData.paymentMethod}
                  onChange={(e) =>
                    setEditOrderData({ ...editOrderData, paymentMethod: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 bg-white text-xs font-bold text-gray-700"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="YAPE">Yape</option>
                  <option value="PLIN">Plin</option>
                  <option value="CARD">Tarjeta</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsEditOrderModalOpen(false);
                  setEditingPurchaseOrder(null);
                  setEditOrderFile(null);
                }}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Gestionar Marcas y Familias */}
      <Modal
        isOpen={isManageBrandsModalOpen}
        onClose={() => setIsManageBrandsModalOpen(false)}
        title="Gestionar Clasificaciones de Productos"
        maxWidth="max-w-2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
          {/* Brands Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center justify-between">
              <span>Marcas</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                {brands.length}
              </span>
            </h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nueva Marca (Ej. Nike)"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
              />
              <button
                type="button"
                onClick={handleCreateBrand}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
              >
                Agregar
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-gray-150 rounded-xl p-2 bg-gray-50/50">
              {brands.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic text-center py-4">No hay marcas creadas</p>
              ) : (
                brands.map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                    <span className="text-xs font-semibold text-gray-700">{b.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteBrand(b.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar marca"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Families Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center justify-between">
              <span>Familias / Líneas</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                {families.length}
              </span>
            </h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nueva Familia (Ej. Lácteos)"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
              />
              <button
                type="button"
                onClick={handleCreateFamily}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
              >
                Agregar
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-gray-150 rounded-xl p-2 bg-gray-50/50">
              {families.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic text-center py-4">No hay familias creadas</p>
              ) : (
                families.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                    <span className="text-xs font-semibold text-gray-700">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteFamily(f.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar familia"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-100 mt-4">
          <button
            type="button"
            onClick={() => setIsManageBrandsModalOpen(false)}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200"
          >
            Listo / Cerrar
          </button>
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

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setProductIdToDelete(null);
        }}
        onConfirm={() => {
          if (productIdToDelete) {
            handleDelete(productIdToDelete);
          }
        }}
        title="¿Eliminar producto?"
        message="¿Estás seguro de que deseas eliminar este producto permanentemente? Esta acción no se puede deshacer."
        confirmText="Eliminar Producto"
        cancelText="Cancelar"
        variant="danger"
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        variant={confirmConfig.variant}
        buttonIcon={confirmConfig.variant === "danger" ? <Trash2 className="w-5 h-5" /> : <Check className="w-5 h-5" />}
      />
    </Appshell>
  );
}
