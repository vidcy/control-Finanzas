import API from "./axios";

export interface Presentation {
  id?: string;
  name: string;
  equivalence: number;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  color?: string;
  costPrice: number;
  salePrice: number;
  adjustedPrice?: number;
  customCode?: number;
  stock: number;
  size?: string;
  minStock: number;
  unit: string;
  imageUrl?: string;
  presentations?: Presentation[];
  brandId?: string;
  brand?: { id: string; name: string };
  familyId?: string;
  family?: { id: string; name: string };
  createdAt?: string;
  updatedAt?: string;
  branchStocks?: any[];
  commissionType?: string;
  commissionValue?: number;
  priceWithAgent?: number;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  product?: { id: string; name: string; unit: string; imageUrl?: string };
  quantity: number;
  type: "IN" | "OUT";
  reason?: string;
  presentationId?: string;
  presentation?: { id: string; name: string };
  presentationName?: string;
  presentationQty?: number;
  unitCost?: number;
  totalCost?: number;
  stockResult?: number;
  documentId?: string;
  userId: string;
  branchId?: string;
  branch?: { id: string; name: string };
  createdAt: string;
}

import type { CatalogConfig, CatalogBannerItem } from "../utils/catalogRubroPresets";
export type { CatalogConfig, CatalogBannerItem };

export interface CatalogStoreInfo {
  id: string;
  name: string;
  lastName: string;
  email: string;
  businessName: string;
  businessReason?: string;
  businessRubro?: string;
  businessLogo?: string | null;
  businessBanner?: string | null;
  businessSlug?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  businessDepartment?: string | null;
  businessProvince?: string | null;
  businessDistrict?: string | null;
  catalogConfig?: CatalogConfig | null;
  isOfficialStore: boolean;
  notFound?: boolean;
}

export interface CatalogQueryOptions {
  identifier?: string;
  email?: string;
  userId?: string;
  slug?: string;
}

export const buildCatalogQueryParams = (query?: string | CatalogQueryOptions): Record<string, string> => {
  if (!query) return {};
  if (typeof query === "object") {
    const params: Record<string, string> = {};
    if (query.identifier) params.identifier = query.identifier.trim();
    if (query.slug) params.slug = query.slug.trim();
    if (query.email && query.email.includes("@")) params.email = query.email.trim();
    if (query.userId) params.userId = query.userId.trim();
    if (!params.identifier) {
      params.identifier = params.slug || params.email || params.userId || "";
    }
    return params;
  }
  let clean = "";
  try {
    clean = decodeURIComponent(query || "").trim();
  } catch {
    clean = String(query || "").trim();
  }
  if (!clean) return {};
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  const isEmail = clean.includes("@");

  if (isEmail) {
    return { email: clean, identifier: clean };
  }
  if (isUuid) {
    return { userId: clean, identifier: clean };
  }
  return { identifier: clean, slug: clean };
};

export const getCatalogStoreInfoRequest = async (query?: string | CatalogQueryOptions): Promise<CatalogStoreInfo> => {
  const params = buildCatalogQueryParams(query);
  const res = await API.get("/catalog/store-info", { params });
  return res.data;
};

export const getCatalogProductsRequest = async (query?: string | CatalogQueryOptions): Promise<Product[]> => {
  const params = buildCatalogQueryParams(query);
  const res = await API.get("/catalog/products", { params });
  return res.data;
};

export const getProductsRequest = async (): Promise<Product[]> => {
  const res = await API.get("/products");
  return res.data;
};

export const createProductRequest = async (
  product: Omit<Product, "id" | "createdAt" | "updatedAt">,
) => {
  const res = await API.post("/products", product);
  return res.data;
};

export const updateProductRequest = async (
  id: string,
  product: Partial<Product>,
) => {
  const res = await API.patch(`/products/${id}`, product);
  return res.data;
};

export const deleteProductRequest = async (id: string) => {
  const res = await API.delete(`/products/${id}`);
  return res.data;
};

export const bulkDeleteProductsRequest = async (ids: string[]): Promise<{ deletedCount: number; deletedIds: string[] }> => {
  const res = await API.post("/products/bulk-delete", { ids });
  return res.data;
};

export const restockProductRequest = async (
  id: string,
  data: {
    quantity: number;
    presentationId?: string;
    totalCost: number;
    categoryId: string;
    paymentMethod: string;
  },
) => {
  const res = await API.post(`/products/${id}/restock`, data);
  return res.data;
};

export const checkoutCartRequest = async (data: {
  items: Array<{
    id: string;
    quantity: number;
    presentationId?: string;
    isCustom?: boolean;
    salePrice?: number;
    name?: string;
  }>;
  paymentMethod: string;
  categoryId?: string;
  subCategoryId?: string;
  cashShiftId: string;
  receiptUrl?: string | null;
  advisorId?: string;
  commissionType?: string;
  commissionValue?: number;
  commissionAmount?: number;
  billingType?: string;
  clientDocumentType?: string;
  clientDocumentNumber?: string;
  clientDenomination?: string;
  clientAddress?: string;
  clientEmail?: string;
}) => {
  const res = await API.post("/products/checkout", data);
  return res.data;
};

export const getInventoryMovementsRequest = async (params?: {
  productId?: string;
  type?: string;
  branchId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<InventoryMovement[]> => {
  const res = await API.get("/inventory-movements", { params });
  return res.data;
};

export const deleteInventoryMovementRequest = async (id: string) => {
  const res = await API.delete(`/inventory-movements/${id}`);
  return res.data;
};

export interface LowStockAnalysisItem extends Product {
  soldQty: number;
  deficit: number;
  pendingOrderQty?: number;
}

export const getLowStockAnalysisRequest = async (
  startDate?: string,
  endDate?: string,
): Promise<LowStockAnalysisItem[]> => {
  const res = await API.get("/products/low-stock-analysis", {
    params: { startDate, endDate },
  });
  return res.data;
};

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  equivalence: number;
  presentationId?: string;
  presentationName?: string;
  costPrice: number;
}

export interface PurchaseOrder {
  id: string;
  totalCost: number;
  /** 
   * Estados del pedido de compra:
   * - PENDING: Pedido creado, sin pago confirmado → NO registra en Tesorería
   * - PAID: Pago confirmado con comprobante → Registra egreso en Tesorería (en tránsito)
   * - RECEIVED: Mercadería ingresada al stock → Tesorería pasa a PAID (finalizado)
   * - CANCELLED: Pedido cancelado → Si había registro en Tesorería, queda CANCELLED también
   */
  status: "PENDING" | "PAID" | "RECEIVED" | "CANCELLED";
  paymentMethod: string;
  categoryId: string;
  subCategoryId?: string;
  receiptUrl?: string;
  createdAt: string;
  items: PurchaseOrderItem[];
}

export const createPurchaseOrderRequest = async (data: {
  items: Array<{
    productId: string;
    quantity: number;
    equivalence: number;
    presentationId?: string;
    presentationName?: string;
    costPrice: number;
  }>;
  totalCost: number;
  categoryId: string;
  subCategoryId?: string | null;
  paymentMethod: string;
  receiptUrl?: string | null;
  receiveImmediately?: boolean;
}): Promise<PurchaseOrder> => {
  const res = await API.post("/products/purchase-orders", data);
  return res.data;
};

export const getPurchaseOrdersRequest = async (status?: string): Promise<PurchaseOrder[]> => {
  const res = await API.get("/products/purchase-orders", { params: { status } });
  return res.data;
};

export const receivePurchaseOrderRequest = async (id: string): Promise<PurchaseOrder> => {
  const res = await API.post(`/products/purchase-orders/${id}/receive`);
  return res.data;
};

export const deletePurchaseOrderRequest = async (id: string): Promise<any> => {
  const res = await API.delete(`/products/purchase-orders/${id}`);
  return res.data;
};

export const revertPurchaseOrderRequest = async (id: string): Promise<PurchaseOrder> => {
  const res = await API.post(`/products/purchase-orders/${id}/revert`);
  return res.data;
};

export const updatePurchaseOrderRequest = async (
  id: string,
  data: {
    items: Array<{
      productId: string;
      quantity: number;
      equivalence: number;
      presentationId?: string | null;
      presentationName?: string | null;
      costPrice: number;
    }>;
    totalCost: number;
    categoryId: string;
    subCategoryId?: string | null;
    paymentMethod: string;
    receiptUrl?: string | null;
  }
): Promise<PurchaseOrder> => {
  const res = await API.patch(`/products/purchase-orders/${id}`, data);
  return res.data;
};

export const getCatalogBrandsRequest = async (query?: string | CatalogQueryOptions): Promise<any[]> => {
  const params = buildCatalogQueryParams(query);
  const res = await API.get("/catalog/brands", { params });
  return res.data;
};

export const getCatalogFamiliesRequest = async (query?: string | CatalogQueryOptions): Promise<any[]> => {
  const params = buildCatalogQueryParams(query);
  const res = await API.get("/catalog/families", { params });
  return res.data;
};

export const getBrandsRequest = async (): Promise<any[]> => {
  const res = await API.get("/products/brands");
  return res.data;
};

export const createBrandRequest = async (data: { name: string }): Promise<any> => {
  const res = await API.post("/products/brands", data);
  return res.data;
};

export const updateBrandRequest = async (id: string, data: { name: string }): Promise<any> => {
  const res = await API.patch(`/products/brands/${id}`, data);
  return res.data;
};

export const deleteBrandRequest = async (id: string): Promise<any> => {
  const res = await API.delete(`/products/brands/${id}`);
  return res.data;
};



export const getFamiliesRequest = async (): Promise<any[]> => {
  const res = await API.get("/products/families");
  return res.data;
};

export const createFamilyRequest = async (data: { name: string }): Promise<any> => {
  const res = await API.post("/products/families", data);
  return res.data;
};

export const updateFamilyRequest = async (id: string, data: { name: string }): Promise<any> => {
  const res = await API.patch(`/products/families/${id}`, data);
  return res.data;
};

export const deleteFamilyRequest = async (id: string): Promise<any> => {
  const res = await API.delete(`/products/families/${id}`);
  return res.data;
};

export const payPurchaseOrderRequest = async (
  id: string,
  data: {
    categoryId: string;
    subCategoryId?: string | null;
    paymentMethod: string;
    receiptUrl?: string | null;
  }
): Promise<PurchaseOrder> => {
  const res = await API.post(`/products/purchase-orders/${id}/pay`, data);
  return res.data;
};

/**
 * Cancelar un pedido de compra.
 * - Si NO tiene registro en Tesorería (status=PENDING): cancela y queda disponible para eliminación
 * - Si tiene registro en Tesorería (status=PAID): cancela el pedido Y anula el registro en Tesorería
 * - Si status=RECEIVED: error → debe revertir el ingreso de stock primero
 */
export const cancelPurchaseOrderRequest = async (id: string): Promise<PurchaseOrder> => {
  const res = await API.patch(`/products/purchase-orders/${id}/cancel`);
  return res.data;
};

export const loadProducts = async (): Promise<any[]> => {
  const res = await API.get("/products/load");
  return res.data;
};

