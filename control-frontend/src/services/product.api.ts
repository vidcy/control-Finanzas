import API from "./axios";

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  createdAt?: string;
  updatedAt?: string;
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
