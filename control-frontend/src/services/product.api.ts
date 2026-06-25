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
  costPrice: number;
  salePrice: number;
  stock: number;
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
  createdAt: string;
}

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
  categoryId: string;
  receiptUrl?: string | null;
}) => {
  const res = await API.post("/products/checkout", data);
  return res.data;
};

export const getInventoryMovementsRequest = async (params?: {
  productId?: string;
  type?: string;
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
  status: "ORDERED" | "RECEIVED";
  paymentMethod: string;
  categoryId: string;
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
    paymentMethod: string;
    receiptUrl?: string | null;
  }
): Promise<PurchaseOrder> => {
  const res = await API.patch(`/products/purchase-orders/${id}`, data);
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

