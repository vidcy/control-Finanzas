import React, { useState, useEffect, useMemo } from "react";
import FinanceAppShell from "../components/layout/Appshell";
import ConfirmModal from "../components/ui/ConfirmModal";
import Modal from "../components/ui/Modal";
import Pagination from "../components/ui/Pagination";
import { 
  Building, 
  MapPin, 
  Package, 
  ArrowRightLeft, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Info,
  Layers,
  ArrowRight
} from "lucide-react";
import { toast } from "react-hot-toast";
import { 
  getBranchesRequest, 
  createBranchRequest, 
  updateBranchRequest, 
  deleteBranchRequest, 
  transferStockRequest,
  getBranchStocksRequest
} from "../services/branch.api";
import type { Branch } from "../services/branch.api";
import { getProductsRequest } from "../services/product.api";
import type { Product } from "../services/product.api";

export default function BusinessBranchesPage() {
  const [activeTab, setActiveTab] = useState<"list" | "transfer" | "stocks">("list");
  
  // Pagination states
  const [branchPage, setBranchPage] = useState(1);
  const branchPageSize = 6;

  const [stockPage, setStockPage] = useState(1);
  const stockPageSize = 6;

  // States for branches CRUD
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Partial<Branch> | null>(null);
  
  // Confirm Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);

  // States for Stock Transfer
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [transferQty, setTransferQty] = useState<number | "">("");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // States for Branch Stocks
  const [branchStocks, setBranchStocks] = useState<any[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load branches
  const fetchBranches = async () => {
    setIsLoadingBranches(true);
    try {
      const data = await getBranchesRequest();
      setBranches(data);
      if (data.length > 0) {
        setFromBranchId(data[0].id);
      }
    } catch (error: any) {
      toast.error(error.message || "Error al cargar sedes");
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // Load products (for transfer selection)
  const fetchProducts = async () => {
    try {
      const data = await getProductsRequest();
      setProducts(data);
    } catch (error: any) {
      toast.error("Error al cargar productos");
    }
  };

  // Load stocks per branch
  const fetchStocks = async () => {
    setIsLoadingStocks(true);
    try {
      const data = await getBranchStocksRequest();
      setBranchStocks(data);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar inventario por sedes");
    } finally {
      setIsLoadingStocks(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchProducts();
    if (activeTab === "stocks") {
      fetchStocks();
    }
  }, [activeTab]);

  // Open Create/Edit modal
  const handleOpenEdit = (branch?: Branch) => {
    if (branch) {
      setCurrentBranch(branch);
    } else {
      setCurrentBranch({ name: "", address: "" });
    }
    setIsEditModalOpen(true);
  };

  // Save Sede
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBranch?.name?.trim()) {
      toast.error("El nombre de la sede es requerido");
      return;
    }

    try {
      if (currentBranch.id) {
        await updateBranchRequest(currentBranch.id, {
          name: currentBranch.name,
          address: currentBranch.address,
        });
        toast.success("Sede actualizada correctamente");
      } else {
        await createBranchRequest({
          name: currentBranch.name,
          address: currentBranch.address,
        });
        toast.success("Sede creada correctamente");
      }
      setIsEditModalOpen(false);
      fetchBranches();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar sede");
    }
  };

  // Confirm Delete Sede
  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;
    try {
      await deleteBranchRequest(branchToDelete);
      toast.success("Sede eliminada correctamente");
      fetchBranches();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar sede");
    } finally {
      setBranchToDelete(null);
    }
  };

  // Stock Transfer Lógica
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [selectedProductId, products]);

  const sourceStock = useMemo(() => {
    if (!selectedProduct || !fromBranchId) return 0;
    const branchStockRecord = selectedProduct.branchStocks?.find(
      (bs: any) => bs.branchId === fromBranchId
    );
    return branchStockRecord ? branchStockRecord.stock : selectedProduct.stock;
  }, [selectedProduct, fromBranchId]);

  const handlePreTransfer = () => {
    if (!selectedProductId) {
      toast.error("Seleccione un producto");
      return;
    }
    if (!fromBranchId || !toBranchId) {
      toast.error("Seleccione las sedes de origen y destino");
      return;
    }
    if (fromBranchId === toBranchId) {
      toast.error("La sede de destino debe ser diferente al origen");
      return;
    }
    if (!transferQty || transferQty <= 0) {
      toast.error("Ingrese una cantidad válida mayor a cero");
      return;
    }
    if (transferQty > sourceStock) {
      toast.error(`Stock insuficiente. Disponible: ${sourceStock} ${selectedProduct?.unit || 'unidades'}`);
      return;
    }

    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async () => {
    if (!selectedProductId || !fromBranchId || !toBranchId || !transferQty) return;
    try {
      await transferStockRequest({
        productId: selectedProductId,
        fromBranchId,
        toBranchId,
        quantity: Number(transferQty),
      });
      toast.success("Inventario trasladado exitosamente");
      // Reset form
      setTransferQty("");
      setSelectedProductId("");
      // Refresh products and branches data
      fetchProducts();
      fetchBranches();
    } catch (error: any) {
      toast.error(error.message || "Error al trasladar inventario");
    } finally {
      setIsTransferModalOpen(false);
    }
  };

  // Filter products for stocks report
  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return branchStocks;
    const q = searchQuery.toLowerCase();
    return branchStocks.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.sku?.toLowerCase().includes(q) || 
      p.brand?.name?.toLowerCase().includes(q) || 
      p.family?.name?.toLowerCase().includes(q)
    );
  }, [branchStocks, searchQuery]);

  const paginatedBranches = useMemo(() => {
    return branches.slice((branchPage - 1) * branchPageSize, branchPage * branchPageSize);
  }, [branches, branchPage, branchPageSize]);

  const paginatedStocks = useMemo(() => {
    return filteredStocks.slice((stockPage - 1) * stockPageSize, stockPage * stockPageSize);
  }, [filteredStocks, stockPage, stockPageSize]);

  useEffect(() => {
    setStockPage(1);
  }, [searchQuery]);

  return (
    <FinanceAppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-rose-500 font-bold text-sm uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Multi-Sede Enterprise</span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Sedes y Locales
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Administra el inventario de tus sucursales y gestiona traslados en tiempo real.
            </p>
          </div>
          
          {activeTab === "list" && (
            <button
              onClick={() => handleOpenEdit()}
              className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold px-6 py-3.5 rounded-2xl shadow-lg shadow-rose-100 transition-all active:scale-95 self-start md:self-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Nueva Sede</span>
            </button>
          )}
        </div>

        {/* TABS SELECTOR */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 mb-8 max-w-lg">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === "list"
                ? "bg-white text-rose-600 shadow-md shadow-gray-200/50"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Lista de Sedes</span>
          </button>
          <button
            onClick={() => setActiveTab("transfer")}
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === "transfer"
                ? "bg-white text-rose-600 shadow-md shadow-gray-200/50"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Traslado Stock</span>
          </button>
          <button
            onClick={() => setActiveTab("stocks")}
            className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === "stocks"
                ? "bg-white text-rose-600 shadow-md shadow-gray-200/50"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Inventarios</span>
          </button>
        </div>

        {/* MAIN TABS CONTENT */}

        {/* TAB 1: LIST OF BRANCHES */}
        {activeTab === "list" && (
          <div className="w-full">
            {isLoadingBranches ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold">Cargando sedes de tu negocio...</p>
              </div>
            ) : branches.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800">No hay sedes registradas</h3>
                <p className="text-gray-500 mt-1 mb-6">Empieza registrando una sede para segregar tu inventario y cajas.</p>
                <button
                  onClick={() => handleOpenEdit()}
                  className="bg-rose-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-rose-600 transition-all"
                >
                  Registrar Sede
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedBranches.map((b) => (
                    <div 
                      key={b.id} 
                      className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-rose-100 transition-all p-6 relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-50 to-transparent rounded-bl-full opacity-60 group-hover:scale-110 transition-transform"></div>
                      
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="p-3.5 bg-rose-50 text-rose-500 rounded-2xl">
                          <Building className="w-6 h-6" />
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Editar sede"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          
                          {branches.length > 1 && (
                            <button
                              onClick={() => {
                                setBranchToDelete(b.id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Eliminar sede"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-gray-900 group-hover:text-rose-600 transition-colors">
                        {b.name}
                      </h3>
                      
                      {b.address && (
                        <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold mt-2">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{b.address}</span>
                        </div>
                      )}

                      <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-gray-400">
                        <span>CREADA EL</span>
                        <span className="text-gray-600">{new Date(b.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {branches.length > 0 && (
                  <Pagination
                    currentPage={branchPage}
                    totalItems={branches.length}
                    pageSize={branchPageSize}
                    onPageChange={(p) => setBranchPage(p)}
                    className="pt-4"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVENTORY STOCK TRANSFER */}
        {activeTab === "transfer" && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Traslado de Mercadería</h2>
                <p className="text-gray-500 text-sm">Mueve existencias de productos de forma segura entre tus sucursales.</p>
              </div>
            </div>
            {branches.length < 2 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 text-center flex flex-col items-center justify-center">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                  <ArrowRightLeft className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-gray-800 text-lg">Traslados no disponibles</h3>
                <p className="text-gray-500 text-sm mt-2 max-w-md">
                  Se requiere registrar al menos una sede alterna adicional a la matriz en la pestaña <strong>Sedes / Sucursales</strong> para poder realizar traslados de mercadería entre ellas.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Product Selector */}
                  <div className="col-span-full">
                    <label className="block text-gray-700 font-extrabold mb-2">Producto a trasladar</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-rose-500 focus:bg-white transition-all font-semibold outline-none"
                    >
                      <option value="">-- Seleccione un Producto --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.sku ? `(SKU: ${p.sku})` : ""} - Stock Total: {p.stock} {p.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Source Branch Selector */}
                  <div>
                    <label className="block text-gray-700 font-extrabold mb-2">Sede Origen</label>
                    <select
                      value={fromBranchId}
                      onChange={(e) => setFromBranchId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-rose-500 focus:bg-white transition-all font-semibold outline-none"
                    >
                      <option value="">-- Seleccione Origen --</option>
                      {branches.map((b, index) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {index === 0 ? " (Almacén Central / Matriz)" : ""}
                        </option>
                      ))}
                    </select>
                    {selectedProductId && fromBranchId && (
                      <p className="text-xs font-bold text-gray-500 mt-1.5 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-rose-500" />
                        <span>Stock disponible en origen: <strong className="text-rose-600 font-extrabold">{sourceStock} {selectedProduct?.unit}</strong></span>
                      </p>
                    )}
                  </div>

                  {/* Destination Branch Selector */}
                  <div>
                    <label className="block text-gray-700 font-extrabold mb-2">Sede Destino</label>
                    <select
                      value={toBranchId}
                      onChange={(e) => setToBranchId(e.target.value)}
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-rose-500 focus:bg-white transition-all font-semibold outline-none"
                    >
                      <option value="">-- Seleccione Destino --</option>
                      {branches.filter(b => b.id !== fromBranchId).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {branches[0]?.id === b.id ? " (Almacén Central / Matriz)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transfer Quantity */}
                  <div className="col-span-full">
                    <label className="block text-gray-700 font-extrabold mb-2">Cantidad a Trasladar</label>
                    <input
                      type="number"
                      placeholder="Ej. 15"
                      value={transferQty}
                      onChange={(e) => setTransferQty(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-rose-500 focus:bg-white transition-all font-semibold outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePreTransfer}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold rounded-2xl shadow-lg shadow-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-5 h-5" />
                  <span>Solicitar Traslado de Inventario</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* TAB 3: STOCKS PER BRANCH */}
        {activeTab === "stocks" && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Search and Filters */}
            <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por producto, marca o familia..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-rose-500 focus:bg-white transition-all font-semibold outline-none text-sm"
                />
              </div>
              <div className="text-sm font-bold text-gray-500">
                Total: {filteredStocks.length} productos
              </div>
            </div>

            {/* Table */}
            {isLoadingStocks ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold">Consolidando inventario...</p>
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <Package className="w-16 h-16 mx-auto text-gray-200 mb-3" />
                <p className="font-bold">No se encontraron productos.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                      <th className="py-4 px-6">Producto / SKU</th>
                      <th className="py-4 px-6">Clasificación</th>
                      <th className="py-4 px-6 text-center">Stock Global</th>
                      {branches.map((b, index) => (
                        <th key={b.id} className="py-4 px-6 text-center bg-rose-50/20 text-rose-700 font-extrabold">
                          {b.name} {index === 0 ? " (Almacén Central / Matriz)" : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm font-semibold text-gray-700">
                    {paginatedStocks.map((prod: any) => (
                      <tr key={prod.id} className="hover:bg-gray-50/55 transition-colors">
                        <td className="py-5 px-6">
                          <div className="font-extrabold text-gray-900">{prod.name}</div>
                          {prod.sku && <div className="text-xs font-bold text-gray-400 mt-0.5">SKU: {prod.sku}</div>}
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex flex-wrap gap-1.5">
                            {prod.brand && (
                              <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">
                                M: {prod.brand.name}
                              </span>
                            )}
                            {prod.family && (
                              <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold">
                                F: {prod.family.name}
                              </span>
                            )}
                            {!prod.brand && !prod.family && <span className="text-gray-400 text-xs">-</span>}
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-xl font-bold">
                            {prod.stock} {prod.unit}
                          </span>
                        </td>
                        {branches.map(b => {
                          const branchStockRecord = prod.branchStocks?.find(
                            (bs: any) => bs.branchId === b.id
                          );
                          const currentStock = branchStockRecord ? branchStockRecord.stock : 0;
                          const isLow = currentStock <= prod.minStock;
                          
                          return (
                            <td key={b.id} className="py-5 px-6 text-center font-extrabold">
                              <span className={`px-3 py-1.5 rounded-xl ${
                                isLow 
                                  ? "bg-red-50 text-red-600 border border-red-100" 
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              }`}>
                                {currentStock} {prod.unit}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStocks.length > 0 && (
                  <Pagination
                    currentPage={stockPage}
                    totalItems={filteredStocks.length}
                    pageSize={stockPageSize}
                    onPageChange={(p) => setStockPage(p)}
                    className="border-t border-gray-100 px-6 py-4"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* MODAL: CREATE/EDIT BRANCH */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={currentBranch?.id ? "Editar Sede" : "Registrar Nueva Sede"}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSaveBranch} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-extrabold mb-2">Nombre de la Sede</label>
              <input
                type="text"
                placeholder="Ej. Sede Sur, Almacén Chiclayo"
                value={currentBranch?.name || ""}
                onChange={(e) => setCurrentBranch(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-rose-500 focus:bg-white transition-all font-semibold outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-extrabold mb-2">Dirección (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Av. Larco 456, Miraflores"
                value={currentBranch?.address || ""}
                onChange={(e) => setCurrentBranch(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-rose-500 focus:bg-white transition-all font-semibold outline-none"
              />
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-4 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold rounded-2xl shadow-lg shadow-rose-100 transition-all active:scale-95"
              >
                {currentBranch?.id ? "Actualizar" : "Crear Sede"}
              </button>
            </div>
          </form>
        </Modal>

        {/* CONFIRM DELETE MODAL */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="¿Eliminar Sede?"
          message="Esta acción es irreversible y podría desvincular el inventario asociado a esta sede."
          confirmText="Eliminar Sede"
          variant="danger"
        />

        {/* CONFIRM TRANSFER MODAL */}
        <ConfirmModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          onConfirm={handleExecuteTransfer}
          title="Confirmar Traslado de Inventario"
          message={`¿Está seguro de transferir ${transferQty} ${selectedProduct?.unit} de "${selectedProduct?.name}" desde la sede "${branches.find(b => b.id === fromBranchId)?.name}" hacia la sede "${branches.find(b => b.id === toBranchId)?.name}"?`}
          confirmText="Confirmar Traslado"
          variant="warning"
          buttonIcon={<ArrowRightLeft className="w-5 h-5" />}
        />

      </div>
    </FinanceAppShell>
  );
}
