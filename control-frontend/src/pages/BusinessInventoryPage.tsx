import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  TrendingUp,
  Image,
  X,
} from "lucide-react";
import {
  getProductsRequest,
  createProductRequest,
  updateProductRequest,
  deleteProductRequest,
  restockProductRequest,
} from "../services/product.api";
import type { Product, Presentation } from "../services/product.api";
import { listCategoriesRequest } from "../services/category.api";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import { getReceiptAbsoluteUrl, ProductImageUploader } from "../components/ui/ImageUploader";



// Helper to format stock quantities into mixed presentations dynamically
export function formatStock(stock: number, unit: string, presentations?: Presentation[]) {
  if (!presentations || presentations.length === 0) {
    return `${parseFloat(stock.toFixed(2))} ${unit}`;
  }

  // Sort presentations by equivalence descending, excluding equivalence = 1 to prevent loops
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
    unit: "Kg",
    imageUrl: "",
    presentations: [] as Presentation[],
  });

  const [restockData, setRestockData] = useState({
    quantity: 0,
    presentationId: "",
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
        unit: product.unit || "Kg",
        imageUrl: product.imageUrl || "",
        presentations: product.presentations || [],
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
        unit: "Kg",
        imageUrl: "",
        presentations: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        imageUrl: formData.imageUrl || null,
      };
      if (editingProduct) {
        await updateProductRequest(editingProduct.id, payload);
        toast.success("Producto actualizado");
      } else {
        await createProductRequest(payload);
        toast.success("Producto creado");
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Error al guardar producto");
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
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Error al reponer stock");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Eliminar este producto permanentemente?")) {
      try {
        await deleteProductRequest(id);
        toast.success("Producto eliminado");
        loadData();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Error al eliminar");
      }
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedPres = restockProduct?.presentations?.find((p) => p.id === restockData.presentationId);
  const restockEquivalence = selectedPres ? selectedPres.equivalence : 1;
  const restockEquivalencyText = `${restockData.quantity * restockEquivalence} ${restockProduct?.unit || ""}`;

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
              <h1 className="text-4xl font-black tracking-tight">Inventario</h1>
              <p className="text-gray-500 font-medium mt-2 max-w-lg">
                Mantén el control exacto de tus productos, presentaciones y stock de forma intuitiva.
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

        {/* CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-gray-100">
                <div className="w-full h-32 bg-gray-100 rounded-xl mb-3"></div>
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            ))
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-bold text-lg">No hay productos. ¡Agrega uno nuevo!</p>
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col"
              >
                {/* Product Image */}
                <div className="relative w-full h-36 bg-gradient-to-br from-gray-50 to-indigo-50 overflow-hidden">
                  {p.imageUrl ? (
                    <img
                      src={getReceiptAbsoluteUrl(p.imageUrl) || p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-indigo-200" />
                    </div>
                  )}
                  {/* Stock badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-black shadow-sm ${p.stock <= p.minStock ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}`}>
                    {p.stock <= p.minStock ? "⚠ Stock bajo" : "✓ En stock"}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h3 className="font-black text-gray-900 text-sm leading-tight mb-1">{p.name}</h3>
                    {p.sku && <p className="text-[10px] text-gray-400 font-mono mb-1">SKU: {p.sku}</p>}

                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.presentations && p.presentations.length > 0 ? (
                        p.presentations.slice(0, 2).map((pres) => (
                          <span
                            key={pres.id}
                            className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                            title={`Equivale a ${pres.equivalence} ${p.unit}`}
                          >
                            {pres.name}
                          </span>
                        ))
                      ) : null}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-2 mb-3">
                      <div className="text-[10px] text-gray-500 font-semibold mb-0.5">Stock actual</div>
                      <div className="font-black text-gray-900 text-xs">
                        {formatStock(p.stock, p.unit, p.presentations)}
                      </div>
                      <div className="text-[9px] text-gray-400">{p.stock} {p.unit} base</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] text-gray-400 font-medium">Costo</div>
                        <div className="text-sm font-bold text-gray-700">S/ {p.costPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 font-medium">Venta</div>
                        <div className="text-sm font-black text-indigo-600">S/ {p.salePrice.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100">
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
                      className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                      title="Reponer Stock"
                    >
                      <TrendingUp className="w-3 h-3" /> Comprar
                    </button>
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="flex-1 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="px-2 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
              <Image className="w-4 h-4 text-indigo-500" />
              Foto del Producto (opcional)
            </label>
            {formData.imageUrl ? (
              <div className="relative">
                <img
                  src={getReceiptAbsoluteUrl(formData.imageUrl) || formData.imageUrl}
                  alt="Producto"
                  className="w-full h-40 object-cover rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageUrl: "" })}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <ProductImageUploader
                currentImageUrl={null}
                onUploadSuccess={(url) => setFormData({ ...formData, imageUrl: url })}
                onClear={() => setFormData({ ...formData, imageUrl: "" })}
              />

            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej. Arroz Extra"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">SKU / Código</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ej. ARR-001"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Unidad Principal</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="Kg">Kg</option>
                <option value="Litro">Litro</option>
                <option value="Metro">Metro</option>
                <option value="Unidad">Unidad</option>
                <option value="Par">Par</option>
                <option value="Caja">Caja</option>
                <option value="Rollo">Rollo</option>
                <option value="Saco">Saco</option>
                <option value="Bolsa">Bolsa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Inicial ({formData.unit})</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Mínimo (Alerta)</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">P. Compra (Costo Base) S/</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">P. Venta (Base) S/</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* PRESENTATIONS */}
            <div className="md:col-span-2 border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-700">Presentaciones / Empaques</h3>
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
                  Sin presentaciones adicionales. Se venderá por {formData.unit}.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.presentations.map((pres, index) => (
                    <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <input
                        type="text"
                        required
                        placeholder="Ej. Saco, Medio Saco"
                        value={pres.name}
                        onChange={(e) => {
                          const newPres = [...formData.presentations];
                          newPres[index] = { ...newPres[index], name: e.target.value };
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
                            newPres[index] = { ...newPres[index], equivalence: Number(e.target.value) };
                            setFormData({ ...formData, presentations: newPres });
                          }}
                          className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg outline-none text-center focus:ring-1 focus:ring-indigo-500 bg-white text-xs"
                        />
                        <span className="text-gray-500 font-bold text-[10px]">{formData.unit}</span>
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
                            newPres[index] = { ...newPres[index], price: Number(e.target.value) };
                            setFormData({ ...formData, presentations: newPres });
                          }}
                          className="w-18 px-2 py-1.5 border border-gray-200 rounded-lg outline-none text-right focus:ring-1 focus:ring-indigo-500 bg-white text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newPres = formData.presentations.filter((_, i) => i !== index);
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

      {/* MODAL: Reponer Stock */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        title="Comprar / Reponer Stock"
      >
        <form onSubmit={handleRestockSubmit} className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4 flex gap-4 items-center">
            {restockProduct?.imageUrl && (
              <img
                src={getReceiptAbsoluteUrl(restockProduct.imageUrl) || restockProduct.imageUrl}
                alt={restockProduct.name}
                className="w-14 h-14 object-cover rounded-xl border border-indigo-200"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            )}
            <div>
              <h4 className="font-bold text-indigo-900">{restockProduct?.name}</h4>
              <p className="text-sm text-indigo-700 font-medium mt-1">
                Stock Actual: {restockProduct ? formatStock(restockProduct.stock, restockProduct.unit, restockProduct.presentations) : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Comprar en presentación</label>
              <select
                value={restockData.presentationId}
                onChange={(e) => {
                  const presId = e.target.value;
                  const pres = restockProduct?.presentations?.find((p) => p.id === presId);
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
                <option value="">{restockProduct?.unit} (Unidad Principal)</option>
                {restockProduct?.presentations?.map((pres) => (
                  <option key={pres.id} value={pres.id}>
                    {pres.name} (Equivale a {pres.equivalence} {restockProduct.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cantidad a comprar</label>
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
                    totalCost: qty * (restockProduct?.costPrice || 0) * restockEquivalence,
                  });
                }}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Costo Total (S/)</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={restockData.totalCost}
                onChange={(e) =>
                  setRestockData({ ...restockData, totalCost: Number(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="col-span-2 text-xs font-bold text-gray-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 flex justify-between">
              <span>Total a cargar al inventario:</span>
              <span className="text-emerald-600 font-extrabold">{restockEquivalencyText}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría del Gasto</label>
              <select
                required
                value={restockData.categoryId}
                onChange={(e) => setRestockData({ ...restockData, categoryId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Seleccione...</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Método de Pago</label>
              <select
                value={restockData.paymentMethod}
                onChange={(e) => setRestockData({ ...restockData, paymentMethod: e.target.value })}
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
    </Appshell>
  );
}
