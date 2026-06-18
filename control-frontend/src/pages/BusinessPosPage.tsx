import { useState, useEffect } from "react";
import Appshell from "../components/layout/Appshell";
import { getProductsRequest, updateProductRequest } from "../services/product.api";
import type { Product } from "../services/product.api";
import { createTransactionRequest } from "../services/transaction.api";
import { listCategoriesRequest } from "../services/category.api";
import { getActiveCashShiftRequest } from "../services/cash-shift.api";
import ImageUploader, { getReceiptAbsoluteUrl } from "../components/ui/ImageUploader";
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
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../components/ui/Modal";
import { format } from "date-fns";

interface CartItem extends Product {
  quantity: number;
  isCustom?: boolean; // Para "Venta Libre"
}

export default function BusinessPosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Venta Libre Modal
  const [isCustomSaleOpen, setIsCustomSaleOpen] = useState(false);
  const [customSaleData, setCustomSaleData] = useState({ name: "", price: 0, quantity: 1 });

  // Ticket / Proforma
  const [showTicket, setShowTicket] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [prods, cats, shiftRes] = await Promise.all([
          getProductsRequest(),
          listCategoriesRequest(),
          getActiveCashShiftRequest().catch(() => null)
        ]);
        setProducts(prods);
        
        // All INCOME categories (personal + business) for POS
        const allIncomeCats = cats.filter((c: any) => c.type === "INCOME" && !c.parentId);
        setCategories(allIncomeCats);
        
        if (allIncomeCats.length > 0) {
          // Priority: "Mi negocio" > "Ventas" > first available
          const priority = allIncomeCats.find((c: any) => 
            c.name.toLowerCase().includes("negocio") || 
            c.name.toLowerCase().includes("venta")
          );
          setSelectedCategory(priority ? priority.id : allIncomeCats[0].id);
        }
        
        setActiveShift(shiftRes);
      } catch (error) {
        toast.error("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error("Sin stock disponible");
      return;
    }
    const existing = cart.find((item) => item.id === product.id && !item.isCustom);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error("Stock máximo alcanzado");
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id && !item.isCustom
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const addCustomSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSaleData.name || customSaleData.price <= 0 || customSaleData.quantity <= 0) {
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
      stock: 9999, // Stock infinito simulado
      minStock: 0,
      quantity: customSaleData.quantity,
      isCustom: true
    };

    setCart([...cart, customItem]);
    setIsCustomSaleOpen(false);
    setCustomSaleData({ name: "", price: 0, quantity: 1 });
    toast.success("Añadido al carrito");
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.id === id) {
          const newQ = item.quantity + delta;
          if (!item.isCustom && newQ > item.stock) {
            toast.error("Supera el stock");
            return item;
          }
          return { ...item, quantity: Math.max(1, newQ) };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const total = cart.reduce(
    (acc, item) => acc + item.salePrice * item.quantity,
    0,
  );

  const handleCheckout = async () => {
    if (!activeShift) {
      toast.error("Debes ABRIR CAJA antes de poder registrar ventas.");
      return;
    }
    if (cart.length === 0) return;
    if (!selectedCategory) {
      toast.error("Debes seleccionar una Categoría de Ingreso (Ej: Ventas)");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Descontar Stock solo de productos reales
      for (const item of cart) {
        if (!item.isCustom) {
          await updateProductRequest(item.id, {
            stock: item.stock - item.quantity,
          });
        }
      }

      // 2. Registrar Ingreso (Venta)
      const desc = `Venta en POS: ${cart.map((c) => `${c.quantity}x ${c.name}`).join(", ")}`;
      const transactionData = {
        name: "Venta en Caja",
        type: "INCOME",
        amount: total,
        categoryId: selectedCategory,
        subCategoryId: "",
        date: new Date().toISOString(),
        paymentMethod: paymentMethod,
        description: desc,
        workspace: "BUSINESS",
        status: "PAID",
        receiptUrl: receiptUrl
      } as any;

      const txResult = await createTransactionRequest(transactionData);

      toast.success("Venta completada con éxito");
      
      // Guardar info para el ticket
      setLastSale({
        items: [...cart],
        total,
        paymentMethod,
        date: new Date(),
        txId: txResult?.id || `TX-${Date.now()}`,
        receiptUrl: receiptUrl,
      });
      
      setCart([]);
      setReceiptUrl(null);
      setShowTicket(true);
      
    } catch (error) {
      toast.error("Error al procesar la venta");
    } finally {
      setIsProcessing(false);
    }
  };

  const printTicket = () => {
    // Usar setTimeout para que el modal se renderice antes de imprimir
    setTimeout(() => window.print(), 300);
  };

  const downloadTicketPng = async () => {
    const element = document.getElementById("printable-ticket");
    if (!element || !lastSale) return;
    
    try {
      const { toPng } = await import("html-to-image");
      // Snapshot actual size to prevent clipping
      const width = element.scrollWidth;
      const height = element.scrollHeight;
      const dataUrl = await toPng(element, { 
        quality: 0.98, 
        pixelRatio: 2,
        width,
        height,
        style: { overflow: "visible" },
        canvasWidth: width * 2,
        canvasHeight: height * 2,
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
    const element = document.getElementById("printable-ticket");
    if (!element || !lastSale) return;

    try {
      const { toPng } = await import("html-to-image");
      const width = element.scrollWidth;
      const height = element.scrollHeight;
      const dataUrl = await toPng(element, { 
        quality: 0.98, 
        pixelRatio: 2,
        width,
        height,
        style: { overflow: "visible" },
        canvasWidth: width * 2,
        canvasHeight: height * 2,
      });

      const { jsPDF } = await import("jspdf");
      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => img.onload = r);

      // 80mm wide ticket, auto height
      const pdfW = 80;
      const pdfH = (img.naturalHeight / img.naturalWidth) * pdfW;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [pdfW, pdfH] });
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`Ticket_${lastSale.txId?.slice(0, 8) || Date.now()}.pdf`);
      toast.success("PDF descargado");
    } catch (err) {
      console.error(err);
      downloadTicketPng(); // Fallback a PNG
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Appshell>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] gap-4">
        {/* LADO IZQUIERDO: PRODUCTOS */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 relative">
          {/* Overlay si la caja está cerrada */}
          {!activeShift && !loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-rose-100 text-center max-w-sm mx-4 transform transition-all">
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Landmark className="w-10 h-10 text-rose-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Caja Cerrada</h3>
                <p className="text-gray-500 font-medium mb-6">
                  Para poder vender, necesitas abrir la caja primero desde el módulo de Finanzas o Control de Caja.
                </p>
                <a href="/business-cash-register" className="inline-block w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                  Ir a Abrir Caja →
                </a>
              </div>
            </div>
          )}

          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-blue-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="relative w-full">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-gray-700 shadow-sm"
              />
            </div>
            <button
              onClick={() => setIsCustomSaleOpen(true)}
              className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all text-sm whitespace-nowrap shadow-md shadow-indigo-200"
            >
              <Plus className="w-4 h-4" /> Venta Libre
            </button>
          </div>

          <div className="flex-1 p-6 bg-gray-50/30 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center text-gray-500 py-10 font-medium">
                No hay productos que coincidan.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between h-full shadow-sm"
                  >
                    <div>
                      <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2">{p.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.stock > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        Stock: {p.stock}
                      </span>
                    </div>
                    <p className="text-lg font-black text-gray-900 mt-2">S/ {p.salePrice.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: CART / TICKET */}
        <div className="w-full lg:w-[400px] flex flex-col bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Ticket Actual
            </h2>
            <span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">
              {cart.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-3">
            {cart.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-400">
                <ShoppingCart className="w-12 h-12 mb-3 text-gray-300" />
                <p className="font-bold">No hay productos disponibles</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-gray-800 leading-tight pr-6">{item.name}</h4>
                    <p className="text-indigo-600 font-black text-sm mt-1">S/ {item.salePrice.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-rose-500 transition-colors absolute top-3 right-3"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1 mt-6">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black w-4 text-center text-gray-800">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-5">
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">1. Método de Pago</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "CASH", icon: Banknote, label: "Efectivo" },
                  { id: "YAPE", icon: Smartphone, label: "Yape" },
                  { id: "PLIN", icon: Smartphone, label: "Plin" },
                  { id: "CARD", icon: CreditCard, label: "Tarjeta" },
                  { id: "TRANSFER", icon: Landmark, label: "Transf." },
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${paymentMethod === method.id ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200" : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"}`}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">2. Categoría Contable</p>
              <select 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-indigo-500 outline-none text-sm font-medium bg-white"
              >
                <option value="">Seleccionar Categoría...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {categories.length === 0 && <p className="text-xs text-red-500 mt-1">Crea una categoría de Ingreso primero.</p>}
            </div>

            <div className="flex justify-between items-end pt-3 border-t border-gray-200 border-dashed">
              <span className="text-gray-500 font-medium">Total a cobrar:</span>
              <span className="text-4xl font-black text-gray-900 tracking-tight">
                S/ {total.toFixed(2)}
              </span>
            </div>
            
            {/* Comprobante (Voucher) si no es Efectivo */}
            {paymentMethod !== "CASH" && (
              <div className="mb-4">
                <ImageUploader
                  currentImageUrl={receiptUrl}
                  onUploadSuccess={(url) => setReceiptUrl(url)}
                  onClear={() => setReceiptUrl(null)}
                />
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing || !activeShift}
              className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all ${
                cart.length === 0 || !activeShift
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 hover:-translate-y-1"
              }`}
            >
              {isProcessing ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Cobrar Venta"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: VENTA LIBRE */}
      <Modal isOpen={isCustomSaleOpen} onClose={() => setIsCustomSaleOpen(false)} title="Venta Libre / Manual">
        <form onSubmit={addCustomSale} className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Concepto / Producto</label>
            <input type="text" autoFocus required value={customSaleData.name} onChange={e => setCustomSaleData({...customSaleData, name: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Ej: Bolsa extra, Servicio de Delivery..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Precio Unitario (S/)</label>
              <input type="number" required min="0.1" step="0.01" value={customSaleData.price || ''} onChange={e => setCustomSaleData({...customSaleData, price: Number(e.target.value)})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
              <input type="number" required min="1" value={customSaleData.quantity} onChange={e => setCustomSaleData({...customSaleData, quantity: Number(e.target.value)})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsCustomSaleOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
            <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors">Añadir al Carrito</button>
          </div>
        </form>
      </Modal>

      {/* MODAL: TICKET / PROFORMA (VISIBLE ON PRINT) */}
      <Modal isOpen={showTicket} onClose={() => setShowTicket(false)} title="Venta Completada">
        {lastSale && (
          <div className="flex flex-col items-center">
            {/* Ticket Contenedor (Lo que se imprime) */}
            <div id="printable-ticket" className="bg-white border border-gray-200 p-6 rounded-lg w-full max-w-sm mx-auto shadow-sm font-mono text-sm text-gray-800">
              <div className="text-center mb-6">
                <h2 className="text-xl font-black mb-1">FINANZAS PRO</h2>
                <p className="text-xs text-gray-500">Ticket de Venta (Proforma)</p>
                <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Fecha:</span>
                  <span>{format(lastSale.date, "dd/MM/yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Ticket #:</span>
                  <span>{lastSale.txId.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Pago:</span>
                  <span>{lastSale.paymentMethod}</span>
                </div>
              </div>
              
              <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>CANT. DESCRIPCION</span>
                  <span>IMPORTE</span>
                </div>
                {lastSale.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="flex-1 pr-2 truncate">{item.quantity}x {item.name}</span>
                    <span>S/ {(item.quantity * item.salePrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-b-2 border-dashed border-gray-300 my-4"></div>
              
              <div className="flex justify-between font-black text-lg">
                <span>TOTAL</span>
                <span>S/ {lastSale.total.toFixed(2)}</span>
              </div>
              
              <div className="text-center mt-8 text-xs text-gray-500">
                <p>¡Gracias por tu preferencia!</p>
                <p className="mt-1">Documento no válido como factura</p>
              </div>

              {/* Comprobante adjunto si existe */}
              {lastSale.receiptUrl && (
                <div className="mt-4 pt-4 border-t border-dashed border-gray-300">
                  <p className="text-[10px] text-gray-400 text-center mb-2 font-bold uppercase">Comprobante de pago adjunto</p>
                  <img 
                    src={getReceiptAbsoluteUrl(lastSale.receiptUrl) || ''} 
                    alt="Comprobante" 
                    className="w-full rounded-lg object-cover max-h-48"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                </div>
              )}
            </div>

            <style>
              {`
                @media print {
                  body * { visibility: hidden; }
                  #printable-ticket, #printable-ticket * { visibility: visible; }
                  #printable-ticket { position: fixed; left: 50%; top: 0; transform: translateX(-50%); width: 80mm; border: none; box-shadow: none; padding: 5mm; }
                }
              `}
            </style>

            <div className="mt-5 flex w-full gap-2 print:hidden flex-wrap">
              <button onClick={() => setShowTicket(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-center text-sm">
                Cerrar
              </button>
              <button onClick={downloadTicketPng} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors flex items-center justify-center gap-1.5 text-sm">
                <Download className="w-4 h-4" /> Imagen
              </button>
              <button onClick={downloadTicketPdf} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 text-sm">
                <Download className="w-4 h-4" /> PDF
              </button>
              <button onClick={printTicket} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 text-sm">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>
        )}
      </Modal>

    </Appshell>
  );
}
