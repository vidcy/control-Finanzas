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
