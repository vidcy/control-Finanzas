import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import {
  getProductsRequest,
  createProductRequest,
  updateProductRequest,
  deleteProductRequest,
} from "../services/product.api";
import type { Product } from "../services/product.api";
import { createTransactionRequest } from "../services/transaction.api";
import { listCategoriesRequest } from "../services/category.api";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";

export default function BusinessInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    costPrice: 0,
    salePrice: 0,
    stock: 0,
    minStock: 5,
  });

  const [restockData, setRestockData] = useState({
    quantity: 0,
    totalCost: 0,
    categoryId: "",
    paymentMethod: "CASH",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, cats] = await Promise.all([
        getProductsRequest(),
        listCategoriesRequest(),
      ]);
      setProducts(data);
      setCategories(cats.filter((c: any) => c.type === "EXPENSE"));
    } catch (error) {
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateProductRequest(editingProduct.id, formData);
        toast.success("Producto actualizado");
      } else {
        await createProductRequest(formData);
        toast.success("Producto creado");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error("Error al guardar producto");
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
      // 1. Aumentar Stock
      await updateProductRequest(restockProduct.id, {
        stock: restockProduct.stock + restockData.quantity,
      });

      // 2. Crear Transacción Automática
      await createTransactionRequest({
        name: `Compra de Mercadería: ${restockProduct.name} (+${restockData.quantity})`,
        type: "EXPENSE",
        amount: restockData.totalCost,
        categoryId: restockData.categoryId,
        subCategoryId: "",
        date: new Date().toISOString(),
        status: "PAID",
        currency: "PEN",
        paymentMethod: restockData.paymentMethod,
        description: `Reposición de stock generada automáticamente desde el inventario.`,
        workspace: "BUSINESS",
      });

      toast.success("Stock repuesto y gasto registrado contablemente");
      setIsRestockModalOpen(false);
      setRestockData({
        quantity: 0,
        totalCost: 0,
        categoryId: "",
        paymentMethod: "CASH",
      });
      loadData();
    } catch (error) {
      toast.error("Error al reponer stock");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Eliminar este producto permanentemente?")) {
      try {
        await deleteProductRequest(id);
        toast.success("Producto eliminado");
        loadData();
      } catch (error) {
        toast.error("Error al eliminar");
      }
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Appshell>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-[2rem] p-8 text-gray-900 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-purple-200 opacity-30 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl mb-4 border border-indigo-100 shadow-sm">
                <Package className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-4xl font-black tracking-tight">
                Inventario
              </h1>
              <p className="text-gray-500 font-medium mt-2 max-w-lg">
                Mantén el control exacto de tus productos, costos y precios de venta.
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-indigo-500/30"
            >
              <Plus className="w-5 h-5" />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex-1 flex items-center px-4">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              className="w-full bg-transparent border-none focus:ring-0 text-sm py-3 px-3 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Producto</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4 text-right">Costo</th>
                  <th className="px-6 py-4 text-right">P. Venta</th>
                  <th className="px-6 py-4 text-right">Stock</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Cargando inventario...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay productos. ¡Agrega uno nuevo!
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {p.name}
                        </div>
                        {p.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                        {p.sku || "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-600">
                        S/ {p.costPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        S/ {p.salePrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-xs ${p.stock <= p.minStock ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                        >
                          {p.stock}
                          {p.stock <= p.minStock && (
                            <AlertCircle className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setRestockProduct(p);
                              setRestockData({
                                ...restockData,
                                totalCost: p.costPrice,
                              });
                              setIsRestockModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Reponer Stock (Compra)"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(p)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: Crear/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Ej. Zapatillas Nike"
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
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                SKU / Código
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Ej. NK-001"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Stock Actual
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Precio de Compra (Costo)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">
                  S/
                </span>
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
                  className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Precio de Venta
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">
                  S/
                </span>
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
                  className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Stock Mínimo (Alerta)
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.minStock}
                onChange={(e) =>
                  setFormData({ ...formData, minStock: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">
                Te avisaremos si el stock cae por debajo de este número.
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/30"
            >
              Guardar Producto
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Reponer Stock */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        title="Comprar / Reponer Stock"
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4">
            <h4 className="font-bold text-indigo-900">
              {restockProduct?.name}
            </h4>
            <p className="text-sm text-indigo-700">
              Stock Actual: {restockProduct?.stock}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Cantidad a Agregar
              </label>
              <input
                type="number"
                required
                min="1"
                value={restockData.quantity}
                onChange={(e) => {
                  const qty = Number(e.target.value);
                  setRestockData({
                    ...restockData,
                    quantity: qty,
                    totalCost: qty * (restockProduct?.costPrice || 0),
                  });
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Costo Total del Lote (S/)
              </label>
              <input
                type="number"
                required
                min="0.1"
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
              className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={categories.length === 0}
              className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-500/30 flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" /> Ejecutar Compra
            </button>
          </div>
        </form>
      </Modal>
    </Appshell>
  );
}
