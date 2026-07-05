import API from "./axios";

export const listCategoriesRequest = async () => {
    try {
        const res = await API.get("/categories");
        return res.data;
    } catch (error: any) {
        throw new Error(
            error?.response?.data?.message || "Error al listar las categorías"
        );
    }
};
export const getCategoryByIdRequest = async (id: string) => {
    try {
        const res = await API.get(`/categories/${id}`);
        return res.data;
    } catch (error: any) {
        throw new Error(
            error?.response?.data?.message || "Error al obtener la categoría"
        );
    }
};
export const createCategoryRequest = async (data: {
    name: string;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    color?: string;
}) => {
    try {
        const res = await API.post("/categories", data);
        return res.data;
    } catch (error: any) {
        throw new Error(
            error?.response?.data?.message || "Error al crear la categoría"
        );
    }
};
export const deleteCategoryRequest = async (id: string) => {
    try {
        const res = await API.delete(`/categories/${id}`);
        return res.data;
    } catch (error: any) {
        throw new Error(
            error?.response?.data?.message || "Error al eliminar la categoría"
        );
    }
};
export const createSubcategoryRequest = async (data: {
    name: string;
    parentId: string;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    color?: string;
}) => {
    try {
        const res = await API.post("/categories", data);
        return res.data;
    } catch (error: any) {
        throw new Error(
            error?.response?.data?.message || "Error al crear la subcategoría"
        );
    }
};

export const deleteSubcategoryRequest = async (id: string) => {
    try {
        const res = await API.delete(`/categories/${id}`);
        return res.data;
    } catch (error: any) {
        throw new Error(
            error?.response?.data?.message || "Error al eliminar la subcategoría"
        );
    }
};

export const seedDefaultCategoriesRequest = async () => {
    try {
        const res = await API.post("/categories/seed-default");
        return res.data;
    } catch (error: any) {
        throw new Error(
            error?.response?.data?.message || "Error al sembrar categorías por defecto"
        );
    }
};